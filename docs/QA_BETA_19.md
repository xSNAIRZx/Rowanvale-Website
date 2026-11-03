# Beta 19 verification and boundaries

Rowanvale 19.0.0, channel beta, 1 November 2026. Built from the verified18.6.2 source in a separate development folder. The earlier release and real user workspace were not modified. Three agents handled customization, library tools and offline/data health; root handled night planning, integration and delivery.

## New behavior checked

- Studio: coordinated presets, named local presets, saved/draft comparison, real reload persistence, staged removal/undo, invalid imports rejected atomically, private-data exclusion, old theme compatibility, unsaved-navigation cancellation and narrow layouts.
- Library: saved searches include query/type/status/sort; newly added matching records appear after reload; duplicate names and bounds; rename/delete without deleting titles; real JSON export/import restores shelves and density; quota failures preserve committed state; three densities and3,000-record bounded rendering.
- Night planning: no automatic changes before acceptance; chosen vote-ranked order fits known durations plus breaks; No votes and missing duration excluded; missing votes remain visible; actual saved votes survive reorder; quota failure leaves preview open for retry; real calendar download excludes guest identities and individual votes.
- Calendar core: UTC event instants, between-item breaks only, invalid-date and missing-duration rejection, removed guests ignored, deterministic ties, escaped fields and Unicode line folding. No calendar-provider account was accessed, no invitation sent, and no third-party calendar import was manually verified.
- Data Health: online status alone never means offline-ready; no worker/timeout/missing cache states; actual worker cache-file verification; offline reload; storage estimates absent/blocked; read-only refresh; corrupt saved bytes preserved; existing recovery control receives focus; phone layout.
- Shell: duplicate phone category strip removed while More preserves every sidebar destination; visible navigation tested; real section links retain keyboard focus; media cards and hidden panels excluded; hero actions remain44px;320px layout and desktop sidebar retained.

## Regression coverage

The existing full suite includes five-format library/progress/session flows, migration, XP reconciliation, artwork decoding and protection, inaccessible storage, concurrent edits, offline startup with server unreachable, profile import/export and personalization, guided Reset sessions, account SDK controlled responses, stale service-worker upgrades, Quiet Room retry, daily quests/movement/nutrition/hydration/undo and responsive routes.

Public provider calls are isolated in deterministic tests. Controlled SDK tests do not prove a user's live cloud configuration works. Current tests use synthetic browser profiles and temporary server data. New screens are genuine captures of those fixtures, often with artwork deliberately blocked.

## Important investigation during integration

An earlier priority-queue regression expected a card below the old1,000px viewport to be treated as visible after adding the library toolbar. The production queue correctly prioritized a featured title over an offscreen nearby title. The test now uses a1,600px viewport and explicitly verifies the intended card intersects it before asserting request priority. No queue behavior was weakened. A transient route-heading mismatch during concurrent source edits did not reproduce after sources were frozen; the expected route label was preserved.

## Final execution

The final frozen-source run passed all20 suite commands on Windows with Node26.12.1 and installed Chrome through Playwright:

| Check | Passed | Failed / skipped |
| --- | ---: | ---: |
| Node tests |125|0 /0|
| Book catalog assertions |7|0|
| Existing18.6.2 browser checks |151|0|
| New workspace preset checks |7|0|
| New Smart Shelf / density checks |12|0|
| New Data Health checks |9|0|
| New night-planning checks |5|0|
| New mobile shell checks |6|0|
| Total browser checks |190|0|
| Source and bundled assets |52 JavaScript modules,85 HTML references|0|
| Maintained-file formatting |Passed|0|
| Catalog structure |3,996 games;110 books;2,198 film/TV/anime titles|0 invalid|

Evidence: `evidence/19.0.0/test-run.json` contains every suite command, exit status and output. Individual feature result files provide named checks. Live public cover service availability was not rerun; previous-release live evidence remains historical.

## Screenshots

- Studio presets and mobile draft comparison: evidence/19.0.0/studio/.
- Mobile shell before/after: evidence/19.0.0/shell/mobile-library-before.png and mobile-library-after.png.
- Library views: evidence/19.0.0/library-mobile-viewport.png and library-tools-mobile.png.
- Offline Data Health: evidence/19.0.0/health19-desktop-offline.png.
- Night planner: evidence/19.0.0/night-planner19.png.

Some historical full-page captures can stitch fixed chrome incorrectly; use the supplied viewport/element captures to judge mobile controls.

## Remaining risks and NOT TESTED

- **Medium:** exhaustive combinations of every legacy control and populated form are not certified. New feature tests assert outcomes, not just successful clicks.
- **Medium:** physical phones, Edge-specific execution, Firefox, Safari and manual screen-reader/contrast certification remain untested. Viewport emulation is not a device lab.
- **Medium:** live authenticated Spotify/Steam/cloud accounts, hosted friends and real multi-device sync were not exercised. Hosted friend/invitation systems are not shipped.
- **Medium:** localStorage quota, browser eviction and tab/browser loss remain underlying storage constraints. Data Health reports limits honestly; it is not a database migration or a recovery guarantee.
- **Medium:** Quiet Room pending retry still uses same-tab session storage; save before closing the tab. Long-run memory/battery soak and forced interruption mid-write were not performed.
- **Medium:** calendar times use the exporting device's interpretation of plan local time. Imported plans need timezone review. No live invitation delivery or synchronization exists.
- **Low:** offline readiness verifies bundled app files in the active worker's cache, not all remote covers or account services. Backup timestamps record a requested download, not proof a file was saved/restored.
- **Low:** lineup suggestions use a clear greedy vote ranking, not a mathematically optimal selection. No votes are excluded, but absent votes are not treated as consent.
- **Low:** workspace presets intentionally omit personal uploads and identity; full backups retain those records separately. Legacy profile editors still require consolidation.

## Safe upgrade and rollback

Export JSON and optional artwork backups, stop the old server, extract the complete19.0.0 folder, and run START_ROWANVALE_WINDOWS.bat. Keep the same browser profile and localhost:8080 origin. Open /api/launch and verify19.0.0 Beta. Never clear browser data or open index.html directly to upgrade. Existing18.6.2 remains available; stop the new server before returning to it, and export any new work first. No schema reset or personal-record deletion was introduced.
