-- Afterlogue / film quality observations; private member contributions and post-submit aggregate reveal.
-- Read community counts only via the authenticated, submission-gated function below.
-- No guest writes, no free-text tags, no cross-member reading of individual answers.
create table if not exists public.film_quality_observations (
  user_id uuid not null references auth.users(id) on delete cascade,
  title_key text not null check (char_length(title_key) between 1 and 160),
  tag_key text not null check (tag_key in (
    'observational-filmmaking','everyday-rituals','measured-pacing','intimate-character-study',
    'reflective-atmosphere','expressive-cinematography','nonlinear-storytelling',
    'minimal-dialogue','dialogue-driven','ensemble-dynamics','quiet-tension',
    'playful-humor','family-relationships','sense-of-place','emotional-restraint',
    'immersive-sound','brisk-pacing','visual-symbolism'
  )),
  personally_enjoyed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(user_id,title_key,tag_key)
);
create index if not exists film_quality_title_tag_idx
 on public.film_quality_observations(title_key,tag_key);
alter table public.film_quality_observations enable row level security;
revoke all on public.film_quality_observations from public,anon,authenticated;
grant select on public.film_quality_observations to authenticated;
drop policy if exists film_quality_select_own on public.film_quality_observations;
create policy film_quality_select_own
 on public.film_quality_observations for select to authenticated
 using (user_id = (select auth.uid()));

create or replace function public.submit_film_qualities(
 p_title_key text, p_tag_keys text[], p_enjoyed_tag_keys text[] default array[]::text[]
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
 v_user uuid := auth.uid();
 v_tag text;
 v_tags text[] := array[]::text[];
 v_enjoyed text[] := array[]::text[];
 v_results jsonb;
begin
 if v_user is null then raise exception 'Please sign in to contribute.' using errcode='42501'; end if;
 if p_title_key is null or char_length(p_title_key) not between 1 and 160
   then raise exception 'Invalid film.' using errcode='22023'; end if;
 if not exists(select 1 from public.seen_entries s where s.user_id=v_user and s.title_key=p_title_key and s.category='movies')
   then raise exception 'Mark this film Watched first.' using errcode='42501'; end if;
 if p_tag_keys is null or cardinality(p_tag_keys) not between 1 and 5
   or p_enjoyed_tag_keys is null or cardinality(p_enjoyed_tag_keys)>5
   then raise exception 'Choose between one and five observed qualities.' using errcode='22023'; end if;
 if exists(
   select 1 from unnest(p_tag_keys) k where k is null or k not in (
    'observational-filmmaking','everyday-rituals','measured-pacing','intimate-character-study',
    'reflective-atmosphere','expressive-cinematography','nonlinear-storytelling',
    'minimal-dialogue','dialogue-driven','ensemble-dynamics','quiet-tension',
    'playful-humor','family-relationships','sense-of-place','emotional-restraint',
    'immersive-sound','brisk-pacing','visual-symbolism'
   )
 ) then raise exception 'Unknown film quality.' using errcode='22023'; end if;
 select coalesce(array_agg(distinct t),array[]::text[]) into v_tags from unnest(p_tag_keys) t;
 if cardinality(v_tags)<>cardinality(p_tag_keys)
   then raise exception 'Duplicate film quality.' using errcode='22023'; end if;
 select coalesce(array_agg(distinct t),array[]::text[]) into v_enjoyed from unnest(p_enjoyed_tag_keys) t;
 if cardinality(v_enjoyed)<>cardinality(p_enjoyed_tag_keys)
    or exists(select 1 from unnest(v_enjoyed) e where e is null or not (e=any(v_tags)))
   then raise exception 'Enjoyed qualities must be among those you noticed.' using errcode='22023'; end if;

 -- Serialize concurrent submissions by this user for this particular film.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text || ':' || p_title_key, 0));
 delete from public.film_quality_observations where user_id=v_user and title_key=p_title_key;
 insert into public.film_quality_observations(user_id,title_key,tag_key,personally_enjoyed)
 select v_user,p_title_key,k,(k=any(v_enjoyed)) from unnest(v_tags) k;

 -- Do not expose direct rows or a list of contributors. Results appear only
 -- in this authenticated call after the member submitted their own choices.
 -- Very small counts are suppressed to prevent identifying early contributors.
 select coalesce(jsonb_agg(jsonb_build_object(
   'tag_key',v.k,'people',case when count_rows.n>=3 then count_rows.n else null end,
   'growing',count_rows.n<3
 ) order by v.ordinal), '[]'::jsonb)
 into v_results
 from (values
   (1,'observational-filmmaking'),(2,'everyday-rituals'),(3,'measured-pacing'),
   (4,'intimate-character-study'),(5,'reflective-atmosphere'),
   (6,'expressive-cinematography'),(7,'nonlinear-storytelling'),
   (8,'minimal-dialogue'),(9,'dialogue-driven'),(10,'ensemble-dynamics'),
   (11,'quiet-tension'),(12,'playful-humor'),(13,'family-relationships'),
   (14,'sense-of-place'),(15,'emotional-restraint'),(16,'immersive-sound'),
   (17,'brisk-pacing'),(18,'visual-symbolism')
 ) as v(ordinal,k)
 cross join lateral (
   select count(*)::integer as n
   from public.film_quality_observations q where q.title_key=p_title_key and q.tag_key=v.k
 ) count_rows;
 return jsonb_build_object('results',v_results,'submitted',true);
end $$;
revoke all on function public.submit_film_qualities(text,text[],text[]) from public,anon,authenticated;
grant execute on function public.submit_film_qualities(text,text[],text[]) to authenticated;
comment on function public.submit_film_qualities(text,text[],text[]) is
 'Authenticated watched-film observations, atomic replacement, post-submission aggregate-only counts. Qualities do not affect recommendation scores.';
