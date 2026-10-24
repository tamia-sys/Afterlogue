# Afterlogue — Community Film Qualities

Status: Implemented for signed-in members inside Log -> Watched -> Movies. No film-detail sections or live recommendation scoring changes.

## The experience

When a member saves their first film impression in Log, they may optionally add observations. They can skip the prompt without affecting the original impression. The same editor is available later using Film qualities on a watched movie card.

1. Members choose 1–5 observations from an 18-tag, spoiler-light vocabulary. Community counts are not shown.
2. Members optionally select which of their observations they personally enjoyed. Recognizing measured pacing does not imply that a person enjoys it.
3. Only after an authenticated, successful submission does the server provide aggregate counts for the selected qualities and up to three additional frequently selected qualities. The moment of curiosity and independent judgment is preserved.

Personal enjoyment flags remain private. Contributors can revise their choices; a new submission replaces, rather than duplicates, their old rows.

For privacy, fewer than three contributors selecting a given quality is shown as "One of the first observations", rather than publishing a tiny count. When three or more distinct members have chosen a quality, the interface displays that aggregate number.

## Database and access rules

- Public schema table: film_quality_observations. Row-level security allows a signed-in member to select only their own rows.
- Direct user insert, delete and update are denied. The authenticated RPC submit_film_qualities is the only write path and also returns post-submit totals.
- The RPC requires a valid signed-in user and an existing watched movie in seen_entries, and validates every submitted tag against a controlled list of allowed qualities.
- It rejects more than five tags, duplicate tags and enjoyed qualities not in the observed set.
- For concurrent submissions by one account for one film, a transaction-level lock protects the replacement.
- Anonymous/public callers cannot execute the function or read the table.
- An authenticated SECURITY DEFINER function intentionally performs the narrowly scoped cross-member aggregate. Its access is explicitly restricted and inputs validated, though Supabase correctly flags such functions for additional security review. Do not generalize it to wider user-data access.

The recorded Supabase migration is film_quality_observations_post_submit_reveal. Its SQL is stored in sql/film-quality-observations.sql in the Afterlogue repository.

## Product limits

The first version supports films, not TV shows. Community-quality lists do not appear on film detail pages. There is no leaderboarding, social voting on each person's tags or rewards for submitting popular tags.

Most importantly, none of these new fields are used in production recommendation scores yet. This is real user-authored metadata collection for future validation of stability and whether descriptive film observations correspond to actual viewing interest. It does not authorize training on restricted third-party metadata.

## Verification

Automated test: node --test tests/film-qualities.test.cjs

Test manually with a dedicated signed-in test account before encouraging members:
- Log a watched film with a new impression and confirm the optional prompt opens.
- Observe that counts are absent on the first two steps.
- Skip and verify the original Log impression remains saved.
- Choose observations and optional private enjoyed qualities and submit.
- Check that totals appear only after a successful server confirmation.
- Reopen from Watched, edit observations, submit and confirm the member is counted once.
- Check that TV cards and film-detail pages do not expose community charts.
- Test a second member account cannot read the first member's raw contributions.

The $149 commercial TMDB upgrade has not been purchased or required for this voluntary user-authored tagging feature.
