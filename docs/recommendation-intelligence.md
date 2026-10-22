# Afterlogue — recommendation intelligence, editorial v1

Updated October 20, 2026

## Goal

Recommend a **viewing experience**, not merely a movie that happens to contain
an associated word. Relevance is personal and contextual: a party in a bleak
family tragedy is not interchangeable with an energetic party-game horror-comedy.

## What the research supports

- **Mood management:** energy/arousal, emotional valence, absorption and how
  connected media content feels to the viewer's current state are distinguishable
  dimensions (Reinecke, “Mood Management Theory”; Zillmann, “Mood Management in
  the Context of Selective Exposure Theory”).
- **Meaningful vs pleasurable:** some viewers deliberately choose bittersweet
  and emotionally challenging works; melancholy is not an error for *yearning*
  (Oliver & Hartmann, 2010; Luong & Knobloch-Westerwick, 2021).
- **Content beyond genre:** GroupLens' MovieLens Tag Genome research shows the
  value of movie properties such as atmospheric, realistic, reflective, and
  quirky rather than relying solely on broad genres.
- **Existing emotion-aware systems:** a systematic scoping review found
  categorical and dimensional approaches; simple emotion labels do not
  establish reliable individual preference without evaluation.

Primary references:
- https://onlinelibrary.wiley.com/doi/10.1002/9781118783764.wbieme0085
- https://academic.oup.com/anncom/article-abstract/23/1/103/7850326
- https://academic.oup.com/edited-volume/34268/chapter-abstract/290537332
- https://doi.org/10.3167/proj.2010.040208
- https://doi.org/10.1155/2022/7831013
- https://grouplens.org/datasets/movielens/tag-genome/
- https://files.grouplens.org/datasets/tag-genome/README.html

Critical evaluation examples consulted (editorial learning, no imported review text):
- https://www.rogerebert.com/reviews/the-ice-storm-1997
- https://www.rogerebert.com/reviews/call-me-by-your-name-2017
- https://www.rogerebert.com/reviews/bodies-bodies-bodies-movie-review-2022

## Implemented now

1. Keep the user's country, language, decade, genre and classification as **hard filters**.
2. Identify documentary evidence from plot descriptions and TMDB story
   keywords. Movie genre alone is not a mood.
3. Estimate the experience with editorially constructed rules for emotional
   tension, narrative energy, social atmosphere, and negative mismatch signals.
4. Reject strong mismatches, rank the surviving candidates by fit, and
   diversify reasons only among comparably relevant titles.
5. Show a **reason grounded in a narrative/theme cue**, not “this story
   contains romance”.
6. Track versions and editorial scores internally for auditing, not as a
   scientific psychological measurement.
7. Preserve five verified recommendations per set; if fewer qualify, search
   further rather than inserting irrelevant titles.

### Benchmark cases

- **Yearning:** *Call Me by Your Name*, *Her*, *20th Century Girl*, and *Romeo
  and Juliet* are plausible because of uncertainty, separation, absence or
  difficult attachment. Generic happy romance is not sufficient.
- **Friday:** *Bodies Bodies Bodies* and *Girls Trip* are defensible;
  *The Ice Storm* should fail because its party is embedded in a bleak,
  distressing family drama.
- **Holidays:** a direct holiday premise differs from an incidental Christmas
  mention (*Scent of a Woman*) or a loosely related Irish setting.
- **Winding down:** gentle/reflective content should outrank distressing,
  violent or frantic viewing when alternatives exist.

These are *editorial acceptance criteria*, not universal user preferences.

## Important limitations and safeguards

- The current system uses **hand-authored, deterministic rules**; it is **not a
  trained AI film critic** and does not claim to measure anyone's psychology.
- Movie plot descriptions, genre tags and TMDB keywords are often sparse,
  vague or mislabeled. Reviewer assessments guide our rule design but are
  **not copied into film records**. No reviews are scraped for training.
- Individual response varies: give users an explicit way to narrow the desired
  tone, and collect optional feedback rather than assuming all viewers want
  the same experience.
- TMDB's terms may require additional rights for commercial use and restrict
  API content in AI/ML applications. Resolve those rights before attempting
  embeddings, training, or model inference over TMDB content:
  https://www.themoviedb.org/api-terms-of-use
- Testing needs to track precision@5 by mood, diversity, non-repetition,
  median search latency, reason-grounding, and how frequently strict filters
  produce fewer than five titles.
- Never quietly relax selected hard filters to meet a recommendation quota.

## Next validation phase

Have real testers review 10–20 sets for each mood, rate emotional fit 1–5,
mark misleading “why” claims, and note which picks they actually watch.
Use anonymized *opt-in* feedback to tune the editorial rules. Measure whether
the updated engine improves **mood fit** without hurting diversity and coverage.


## Winding Down: broadened editorial definition (October 22, 2026)

Winding down is not synonymous with *slow*, *unhappy indie drama*, or *gentle anime*. At least three genuinely different experiences can suit the mood:

- **Easygoing connection:** neighborhood, friendship, family, relationship comedy and low-effort social warmth (e.g. *Beauty Shop*, *Just Wright*, *The Switch*).
- **Playful escape:** lively but enjoyable adventure, comedy, music and occasionally comic horror when the viewer wants momentum (e.g. *Roll Bounce*, *Bruce Almighty*, *Zombieland*). Horror violence is not universally soothing.
- **Reflective immersion:** ordinary routines, open landscapes, character observation, philosophy and even emotional seriousness (*Nomadland*, *Perfect Days*, *Boyhood*, *Into the Wild*). *Hamlet* is a valid user example of thoughtful unwinding but is intentionally not forced as one specific film adaptation.

Pace remains a preference, not a definition of the mood. Reflective cinema may be sad; easygoing entertainment may be brisk. Use the viewer's Log in a later development phase to personalize which interpretations lead, rather than claiming the same five work for every person.

Implementation adds independently verifiable title/year anchors, expands candidate search strands, reduces the power of unspecific *slice of life* tags, and improves evidence-backed explanations and soft stylistic diversity. Anchors are illustrative starting points, **not fixed or paid recommendations**; explicit filters, actual release metadata, and fit threshold remain requirements. Avoid scraping reviews or assuming an emotional experience from genre alone.

### Release acceptance tests

- Two consecutive unfiltered sets of five for Winding Down Movies and TV should not each cluster in one style just because of TMDB keyword coverage.
- Test the *Take your time*, *Somewhere between*, and *Keep me on my toes* options separately.
- Verify comedy, contemplative, anime, international drama and film/adventure examples against both true and misleading matches; check *Why this story* for unsupported or generic explanations.
- Verify production-country/genre/decade/rating filter integrity, duplicate exclusion, and actual candidate counts. If the catalog really cannot provide five, do not fill with irrelevant titles.
- Inspect actual server performance and provider requests before deploying: editorial search adds up to 12 title-search requests per affected mood selection. Cache verified candidate metadata in a later performance iteration.


## Personalization 2.0 — Phase 2: evolving taste profile (October 22, 2026)

Home combines existing title-to-title recommendation evidence with a compact,
deterministic **per-account taste profile** constructed on demand. There is no
external AI model, persistent tracking profile, private-note analysis, or model
training.

- Member impressions and Favorites form signed signals across **genres, themes,
  tones and (when editorially known) pace**. Loved/Liked are positive; Not for me
  is negative; Okay is neutral; Favorites modestly strengthen positive evidence,
  but cannot reverse a negative/neutral rating.
- Recent impressions carry slightly more weight. Older tastes retain substantial
  influence, and diminishing returns prevent a high-volume single genre from
  completely suppressing other interests. Strong individual-title matches remain
  important for explanation and candidate eligibility.
- The 54 curated titles already have human-authored theme/tone tags. Previously
  saved dynamically logged TMDB titles usually lacked any feature information.
  A bounded **taste-features** catalog operation resolves dynamic public
  TMDB IDs to official genre names and only narrow, explicitly mapped keyword
  labels. Source lookup carries *only public title IDs*; it never sends users,
  ratings, emails or private Log notes.
- Up to 108 dynamic Log titles can be enriched on a Home visit, plus up to 24
  matched candidate titles per media type. Missing metadata is ignored instead
  of hallucinated. Home snapshots remain account-bound and short-lived.
- The current candidate generator is still TMDB-based, with selected positive
  titles seeding the discovery pool and full-profile evidence affecting ranking.
  Coverage for long Logs beyond 108 dynamic titles and subtle films with limited
  TMDB keywords is still imperfect. This is a **rule-based recommendation
  system**, not a learned machine-learning user embedding.
- Mood Explore currently uses the Log to exclude already-known works. Individual
  taste-sensitive Explore ordering remains **Phase 3**, not part of Phase 2.
- Test effectiveness empirically: preference changes should reorder candidates,
  negative signals must not ban an entire genre, and a 5/20/50/100-title Log
  should produce measurably more relevant recommendations. Automated unit and
  browser tests verify behavior, **not actual viewer satisfaction**.

Note: descriptive keyword mapping is a heuristic and never evidence of a user's
mental state. Never treat an incidental generic genre tag as proof of a
subtle emotional theme.
