# Rowanvale 18.6.1 verification

Executed 26 October 2026 with Node v26.12.1, Playwright and installed Google Chrome on Windows. All commands below passed on the final application code. Machine-readable results are in evidence/18.6.1/test-run.json and the individual result files.

| Check | Actual result |
| --- | --- |
| npm run test:browser — Node suites | 113 passed, 0 failed/skipped |
| Book catalog regression | 7 assertions passed |
| Original media browser workflows | 20 passed |
| Migration, legacy and offline workflows | 7 passed |
| Artwork, concurrent edits and accessibility workflows | 7 passed |
| Profile workflows | 17 passed |
| Connectivity / actual bundled SDK integration workflows | 13 passed |
| Whole-app, responsive layouts and 18.6 workflows | 39 passed |
| New automatic-cover workflows | 14 passed |
| Stale service-worker upgrade workflow | 1 passed |
| Total browser workflows | 118 passed |
| npm run test:live-covers | 5 actual media formats passed |
| npm run check | 49 app modules parse; 81 referenced HTML assets present; complete offline shell, vendor hash/license verified |
| npm run format:check | All maintained files passed |
| npm run catalog:audit | 3,996 merged games, 110 books, 2,198 film/TV/anime entries; zero structurally invalid titles |

## New coverage

Sixteen cover service/core tests check entity/type/year/author matching, disambiguation, unsuitable screenshots/logos, exact image hosts, canonical work identity, credit preservation, bounded input, descriptor privacy, deduplication, batch order, persistent cache reuse and failure states. Four additional real local-server checks exercise origin/intent enforcement, malformed/bounded requests, hidden server modules and the launch bootstrap.

Fourteen browser workflows verify opening unsaved game/book directories and each Fan Lounge category, all five saved media formats, profiles and older Watch Room/game galleries, persisted URL reuse, disabling/re-enabling covers, protected uploads/removals, pending secondary polling, reconnect without duplicate entries, and automatic recovery from broken pre-existing saved/unsaved cover URLs. These tests use controlled provider/image responses and assert real decoded image elements, not only URL fields.

Legacy regression fixtures isolate the new external resolver through tests/browser-runtime.cjs, so unrelated providers do not alter historical deterministic scenarios. This isolation is not offered as proof of public artwork availability. The dedicated new tests and separate genuine live check provide that evidence.

The service-worker upgrade test installs an old 18.6 worker and deliberately seeds a stale cached HTML shell. A reload first confirms that old shell is actually served. /api/launch then opens 18.6.1, exposes the new cover adapter and preserves both saved profile text and an unrelated user cache. It does not clear localStorage.

## Genuine live image check

No provider/image mocks, private TMDB/IGDB credentials, manual artwork search or metadata backfill were used. After opening the page, each image completed with naturalWidth greater than zero and persisted source credit. Normal runtime URL caches may be reused.

| Format | Title | Actual decoded size | Source |
| --- | --- | --- | --- |
| Game | Celeste | 960 × 1539 | Wikipedia/Wikimedia box art |
| Film | Spirited Away | 265 × 376 | Wikipedia/Wikimedia Japanese poster |
| Anime | Cowboy Bebop | 256 × 389 | Wikipedia/Wikimedia key visual |
| TV | Breaking Bad | 1250 × 1800 | TVmaze poster |
| Book | Pride and Prejudice | 960 × 1551 | Wikimedia historical first-edition title page |

See live-covers-results.json for exact URLs and source links, and live-five-format-artwork.png for the real app capture. The screenshot was visually checked. The historical title page is not represented as a modern edition's dust jacket.

## Limits of this verification

This confirms automatic initiation across the app's media renderers and genuine images for five representative formats. It is not an exhaustive live cover audit of all 6,304 bundled directory entries or every edition. The title audit is structural; its 28 retained shared-title groups represent distinct media identities, not asserted artwork matches. Providers can have no appropriate image, ambiguous records, blocked hosts, outages or rate limits. New matches require real network time; cached URLs can display immediately. Keyboard/responsive checks are automated, not a complete manual assistive-technology certification.

No new runtime package was added. The bundled Supabase 2.118.0 SHA-256 remains ee3be8de192b97cb1d73d1e95d6b82bb1f6b658c0f97c4ef757fc331996ed3d3. No cloud deployment, Library upload or online account operation is claimed. The outer Verification_18.6.1.json records release ZIP CRC, manifest checksums, preserved prior releases and the delivered-folder startup check.
