# Rowanvale 18.6.2 — audit, polish and verification

**Pre-release / release candidate.** Audit date: 1 November 2026. Starting point: the latest 18.6.1 release, carrying forward the original version-17 functional audit and version-18 personalization requests. Three agents investigated independent areas, with the main agent integrating fixes and release checks. The original release folder and real user workspace were preserved.

## Significant repairs and verification

| Problem | Repair | Evidence |
| --- | --- | --- |
| Calm View suppressed old decoration but left newer rain/stars/snow active | Extend the same saved preference to modern effects; expose it in Comfort settings | Reproduced before repair; browser checks toggle, reload, settings and preview |
| Mobile Settings tabs scrolled behind the header | Offset the sticky tabs below the shared mobile header | Before/after viewport captures; actual bounding-box non-overlap assertion |
| Modern media destinations were absent from start-page choices | Add Games & Media and Books Directory to the existing selector | Save/reload and actual destination checks |
| Empty filtered library said to add a first story despite existing saved items | Distinguish an empty library from zero matches and offer Clear filters | Five-format fixture; assert restored records and cleared controls |
| Broad Active filter mixed planned, current and paused stories | Add precise In progress, For later and Paused filters plus count-bearing shelf shortcuts | Shelf membership and favorite persistence assertions |
| Editing night plans reset the voting dropdown to the first guest | Retain the selected guest per plan during the session | Edit lineup/duration, cast a vote, inspect actual saved guest ID |
| Another tab's saved data was not made the rollback baseline | Refresh committed data and appearance after storage events; unlock only after valid corruption recovery | Reproduced actual data loss before repair; quota failure/retry preserves other-tab story and settings |
| Damaged artwork could export an archive its own restore rejected | Validate supported image signatures before export, preserving files and explaining JSON recovery | New failing-before/passing-after Node regression; five backup tests |
| Quiet Room duration disappeared on reload and zero remaining time was treated as missing | Persist duration selection and preserve a numeric zero on restore | Duration, pause and completed-state reload assertions |
| Completed focus session was lost when storage refused its save | Keep a pending session in same-tab session storage; show Retry saving session, guard reset, reconcile its ID on retry | Simulated quota failure, reload, successful retry, one log and no duplicate XP |
| Private issue report hardcoded version 16.0.0 | Use the running app version | Download and inspect the real report |

No user records were renamed or deleted. No new online dependency, artwork generation, schema reset or account requirement was introduced. The original public cover resolver and local image cache remain available.

## Product decisions

The media shelf changes adapt the useful separation between current activity, intended viewing and curated collections described by [Steam](https://store.steampowered.com/libraryupdate/?l=english) and [Letterboxd](https://letterboxd.zendesk.com/hc/en-us/articles/15179261056143-What-s-the-difference-between-my-lists-and-my-watchlist). This is original Rowanvale UI, not a new service integration. More detail is in MEDIA_POLISH_AUDIT.md.

Calm View uses its existing saved setting rather than adding a second independent preference. Desktop and mobile preview continue to edit a draft until Save. The original forest palette, media artwork, profile layouts and local-first operation are retained.

## Scope and coverage

A read-only DOM inventory visited all 20 routes: My Day, Overview, Games & Media, Discover Games, Game Collection, Books Directory, Watch Room, Fan Lounge, Quests, Movement, Quiet Room, Reset Studio, Offline Guides, Clubhouse, Friends, Connections, Your Orbit, Settings, Backups & Data, and Help & Updates. It recorded 1,175 controls, including 1,046 visible controls in the fresh desktop fixture, with zero missing-name candidates or page errors.

**That count is an inventory, not certification that every control and state works.** Modal/populated controls are exercised by separate workflow tests. Handler-review candidates were traced to existing delegated event listeners. All 20 destinations also retain responsive route checks at 320, 768 and 1440 pixels.

The regression suite checks real saved outcomes: five-format creation/progress/favorites, ledger idempotency, old-workspace migration, corrupt data protection, unavailable storage, concurrent edits, metadata review, offline shell startup with the server unreachable, cached artwork, profile uploads/layouts/export, appearance previews, guided Reset sessions, account SDK success/failure fixtures, and stale service-worker upgrades. External providers are controlled in deterministic browser tests; this is not a claim of live service availability.

## Final executed results

Windows, Node 26.12.1 and installed Chrome through Playwright. Final full run completed successfully on 1 November 2026.

| Check | Passed | Failed / skipped |
| --- | ---: | ---: |
| Node tests | 114 | 0 / 0 |
| Book catalog assertions | 7 | 0 |
| Existing browser workflows | 118 | 0 |
| New controls / customization workflows | 7 | 0 |
| New media, voting and report checks | 11 | 0 |
| New cross-tab recovery workflows | 2 | 0 |
| New Quiet Room recovery workflows | 4 | 0 |
| Additional daily-life outcome workflows | 9 | 0 |
| Total browser workflows / checks | 151 | 0 |
| Source/assets/vendor integrity | 49 modules, 81 referenced assets | 0 |
| Maintained-file formatting | Passed | 0 |
| Catalog structure | 3,996 games; 110 books; 2,198 film/TV/anime entries | 0 invalid |

All 15 commands in the full test runner completed with exit status zero. The initial version-bump run exposed two tests with old literal version expectations; those expectations were updated and the entire runner passed afterward. A standalone check also initially lacked the browser path and an old temporary server served its loaded previous-version launch route; final verification used the installed Chrome path and a newly started isolated server. These setup attempts are not counted as passes. Live public cover availability was not rerun in this release; prior-release live evidence remains explicitly historical.

 Machine-readable results are in evidence/18.6.2/test-run.json and evidence/audit-controls, evidence/audit-polish.

## Genuine before/after screenshots

- Calm effects: evidence/audit-controls/calm-before.png and calm-after.png.
- Mobile sticky Settings: evidence/audit-controls/mobile-tabs-before.png and settings-mobile-preview.png.
- Games & Media: evidence/audit-polish/media-before.png and media-after.png; media-mobile-after.png shows the phone layout.

These are screenshots of the real app with synthetic local records. Cover requests are blocked in these fixtures, so fallback covers are intentional; no generated mockup is presented as evidence.

## Installation, data preservation and rollback

Export JSON from the old app first; optionally export artwork. Stop the old server, extract the complete new folder, run START_ROWANVALE_WINDOWS.bat, then use the same browser profile at http://localhost:8080/api/launch. Confirm 18.6.2. Do not open index.html directly or clear browser storage. No npm install is needed to run the delivered app. The launcher requires Node.js.

The new service-worker cache name prevents stale shell reuse. The launch route bypasses Rowanvale's old worker while preserving localStorage and unrelated caches. Data remains in the same browser origin. The prior release is retained for rollback; stop the new server before launching it. If reverting after edits, export those edits first. Browser profile changes or moving computers require importing your backup.

## Remaining risk register

| Severity | Remaining risk | Recommended next step |
| --- | --- | --- |
| Medium | Exhaustive state-by-state certification of every legacy control is not complete | Expand the recorded inventory into outcome-based scenarios, especially specialized populated forms |
| Medium | No physical mobile-device, Firefox, Edge-specific or Safari execution | Run a browser/device compatibility matrix before stable release |
| Medium | Keyboard and name checks are not a complete screen-reader or contrast certification | Manual NVDA/VoiceOver and theme contrast audit |
| Medium | Public metadata/artwork providers may be missing, ambiguous, blocked or rate-limited | Preserve manual artwork and offline fallbacks; monitor provider-specific matches |
| Medium | Hosted accounts, credentials and real cloud synchronization were not exercised against a user's live account | Dedicated staging accounts and multi-device conflict testing before hosted social rollout |
| Medium | Long-running performance/memory/battery soak and forced mid-write process termination were not tested | Add timed soak and interruption scenarios; existing tests include a 2,000-item collection |
| Medium | Pending Quiet Room retry uses session storage; closing the tab/browser can discard it, and simultaneous session-storage failure cannot retain it | Retry saving before closing; consider a durable recovery journal in a later storage redesign |
| Low | Backup image checks validate supported signatures, not full decoder validity | Add decoded-image validation where compatible with bounded local backup costs |
| Low | Local guest choice is session-only; exported night plans are independent copies | Keep scope explicit until hosted friends/live invitations are implemented |
| Low | Some historical modules/styles remain layered and old reports remain in docs | Gradually consolidate behind current regressions rather than remove working features |

NOT TESTED: live authenticated Steam/Spotify/cloud accounts, hosted friend accounts/invitations, physical phone touch behavior, Firefox/Safari/macOS/Linux, complete assistive-technology certification, long-duration battery/memory soak. No promise that every possible button state or external integration has been certified.
