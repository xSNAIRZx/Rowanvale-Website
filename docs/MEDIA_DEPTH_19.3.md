# Media history, editions and group setup

The existing library, Watch Room and Books Directory now open the same **Diary, episodes & editions** history workspace. Titles display a compact detailed-history summary when records exist. Every operation uses the application's existing local save boundary and workspace backup.

## What works

- Stable local work and release IDs, with provider-qualified external aliases. Book ISBNs identify editions; provider IDs no longer share an unqualified namespace for matching. Conservative comparison returns exact, another release, possible match or distinct; title-only similarity does not prove an exact match.
- Dated or explicitly undated diary records for watching, playing, reading, rewatches, rereads and notes. Entries can be edited or removed, with optional ratings.
- Episode-level TV/anime history with out-of-order watches, missing-episode detection, season 0 specials, rewatches, dates and corrections. User-confirmed released/total episode counts distinguish caught up, season completed and series completed. Series completion also requires the series-ended flag and an explicit regular-season count.
- Multiple book editions with ISBN/format/page count, owned/borrowed/wishlisted copies, and independent reading/rereading records. Dates and page limits are validated against the chosen edition; changing edition metadata cannot silently reduce the page count below recorded progress.
- Books Directory manual entry now accepts ISBN and edition fields and permits different editions of the same title/author. The unified history workspace is the preferred place to manage several copies of one work.
- Group-night setup records the platform/shared device, audio/language and subtitle/accessibility setup, plus each guest's confirmed, unknown or blocked participation. An explicit block excludes a candidate from suggestions. Hosts may require confirmed access for every guest; otherwise unknown access remains visibly unconfirmed in the review. Existing votes, budgets, calendar export and manual lineup choices remain available.

## Migration and XP

Existing reward keys remain frozen. New work identities distinguish same-name remakes, while matching editions can share a work reward identity and keep separate release IDs. Small identity records are retained in `living184.media193Archive` so deleting and readding an identified work does not award the same milestone again. These contain title/identity metadata, not diary text. Existing XP evidence remains valid if any retained edition still substantiates that work's milestone.

Earlier page/season/episode summaries are retained as summaries. Migration does not invent individual watch dates or pretend old counters identify particular watched episodes. The detailed history screen makes this distinction explicit. Archival diary, reread and episode records do not grant additional XP; existing quick progress controls retain their established rewards and correction behavior.

TMDB's series-wide `number_of_episodes` is now stored as `seriesTotalEpisodes`, not mislabeled as a season total. Unconfirmed old TMDB metadata totals are no longer used as the fallback season limit in unified progress. Manually entered season totals remain available. This release does not fetch a complete live episode schedule: release counts are explicitly confirmed by the user.

## Verification

- Eleven new media core tests cover stable migration, provider collisions, Unicode/Japanese title identity, remakes, old and new reward identity preservation, delete/readd, cross-edition reward evidence, episode gaps/specials/rewatches, dated corrections, independent book progress and invalid imported history.
- The 29 existing living-core tests pass, including XP reconciliation and metadata-provider fixtures. The TMDB fixture now asserts the correct separation of series and season totals.
- Ten new media browser workflows cover actual forms and saved outcomes, storage refusal with the draft retained, reload persistence, all three UI entry points, and dialog widths 390/768/1440.
- Three new compatibility core tests plus a browser workflow verify blocked and unknown access, optional strict confirmation, guest changes, reload and portable-plan export. The six existing night-planner core tests and five existing night-planner browser workflows pass.
- The 20 existing unified-media browser workflows pass. Screenshots and machine-readable new results are in `docs/evidence/19.3.0`.

Tests use synthetic local workspaces and blocked external requests. No authenticated provider, streaming subscription, real device accessibility setup, screen reader, Firefox or Safari was verified. Group access is a manual planning record, not a subscription or compatibility guarantee. JSON plans include guest access checks; the sharing dialog discloses this. Calendar export does not add these guest records.

## Integration API

`RVMedia193Core` / `require('./media193-core')`: `ensure(item)`, `validate(history)`, `aliases(item)`, `compare(a,b)`, `saveDiary`, `saveEpisode`, `saveSeason`, `progress`, `saveEdition`, `saveCopy`, `saveReading`, `remove`. Comparison is read-only; the save helpers mutate their supplied record and should be called inside the application's transaction boundary.

`RVLiving.openHistory(id)` opens the shared UI; `RVMedia193.summary(item)` returns the brief card summary. Existing `RVLiving.openStory(id)` still opens title details.
