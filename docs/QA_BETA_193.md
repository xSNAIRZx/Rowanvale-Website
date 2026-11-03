# Rowanvale 19.3.0 Beta — validation and scope

This release combines the three requested phases: trust repairs, movement/wellbeing, and media depth. It remains a **pre-release**. Earlier builds and their reports are retained separately.

## Changes

- Journal saves select only journal records, preventing collisions with same-day reset plans. Legacy attached text is visible in private history. Reflection, care, play, fitness, food, water, routine and recipe writes no longer silently remove older entries at the former limits.
- Fitness Repeat follows the displayed record ID and remains available after filtering. Structured workouts save recoverable drafts, preserve canonical weights across kg/lb display, support sets and reusable routines, and show recorded prior values. Unknown nutrition stays distinct from zero and food entries can be edited.
- Private history supports combined search/date/type filters, editing, deletion/undo, and selected JSON/CSV export. Quiet Room accepts custom durations, pauses on normal closure, recovers a durable session, and can record actual elapsed time without awarding completion XP.
- Global search includes all twenty routes and correctly identifies and opens saved media records.
- Reviewed JSON/CSV imports preserve status, expose ambiguous duplicates, retain separate editions, save atomically and offer conservative last-batch undo.
- Media identities distinguish provider-qualified records and editions while preserving old reward keys. Diaries support real dates, episode ledgers include specials and rewatches, and books support editions, copies and rereads. Series-wide episode totals are no longer treated as one season's count.
- Group candidates record guest access, platform, audio and subtitles. Explicitly inaccessible candidates are excluded; unknown access is visible, and requiring confirmed access is optional.

## Evidence

The completed combined run passed **163 Node tests, 7 book-catalog assertions and all 23 browser suites** (25 successful runner commands). Source checks passed for 60 application modules and 96 HTML asset references, the full offline shell, and the bundled SDK. Maintained-file formatting and the directory audit passed: 3,996 games, 110 books and 2,198 film/TV/anime titles, with no invalid entries. Same-title directory groups remain intentionally distinct.

A separate three-run synthetic 2,000-record check observed median cold-shell 254 ms, reload 614 ms, navigation 98 ms and search 34 ms on this Windows PC in headless Chrome. These are unthrottled local observations, not device-independent guarantees or a claimed speedup. See `performance-baseline.json` for the actual samples.

`tests/run-tests.cjs --browser` runs all existing regression suites plus import/search, training, wellbeing, media history and group compatibility suites. `docs/evidence/19.3.0/test-run.json` records actual commands and outcomes after a successful full run. Individual result files and screenshots sit in the same evidence folder. Tests use fresh synthetic workspaces and a temporary local server, not the user's live browser data.

Important scenarios include reload/offline recovery, blocked external network, duplicate completion, concurrent tabs, quota-failure rollback and retry, same-name editions, unchanged XP on historical import, retained old records past former limits, and narrow viewport layouts. Source/asset checks verify the complete service-worker shell and bundled SDK integrity.

## Limits

- These are recorded regression results, not certification of every legacy control, physical phone, accessibility device, or live third-party service.
- Core saved-data features work locally. First-time online metadata/artwork, hosted accounts and live syncing require their configured services. Group access is entered manually; it is not verified streaming availability. There is no synchronized playback or hosted social feed.
- No automatic coaching, medical interpretation, wearable integration, completed-set editor, or background rest alarm. History is a searchable list, not a full calendar grid; a care-routine composer is still future work.
- Forced browser termination may bypass pause-on-close. Recovery does not automatically award a newly opened tab a completed session. Full workspace backups remain the portable recovery route.
- Imports are additive and reviewed. They do not overwrite existing fields or implement continuous external-library syncing. Last-batch undo refuses to remove records changed since import.

## Launch

Export a backup in the old app, stop its server, retain the old folder, and launch the new extracted folder with `START_ROWANVALE_WINDOWS.bat`. Use the same browser profile and `http://localhost:8080/api/launch`; verify **19.3.0 / Beta**. Do not open `index.html` directly or clear browser storage.
