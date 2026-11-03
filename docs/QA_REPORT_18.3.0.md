# Rowanvale 18.3.0 · QA and Regression Report

## Verified passes

- **32/32 JavaScript files:** `node --check` succeeded.
- **16/16 browser interaction checks:** loaded actual Rowanvale HTML, CSS, and JS in a deterministic Chromium document; authenticated via guest mode; entered the new Books page; added a book with a page count; logged 75 pages and received +15 XP; re-logged the same page and saw **no new XP**; finished a 300-page book and reached 100 combined reading XP; re-finished without repeat XP; deliberately blocked `localStorage.setItem` and verified that the prior serialized workspace stayed intact while the editor reported failure; added/completed a film and confirmed +20 XP once with no rewatch XP; logged two TV episodes and a completed season with +4/+20 XP; confirmed books appear in Fan Lounge discovery; performed a deterministic book search; rendered eight old and new destinations; checked 390/768/1280px without horizontal overflow; and checked page errors (**0**).
- **Book search module:** seven successful assertions for result normalization, author, year/length, Open Library work ID, cover ID, cached repeated request, short-query rejection.
- **Local HTTP server:** 11 successful checks including health, HTML, new CSS/JS, starter directory, metadata version, invalid book searches, and blocked hidden files.
- **Offline shell:** all 73 declared resources exist and are included in the versioned service-worker manifest.
- Actual desktop/mobile screenshots are in this ZIP under `docs/`.

## Test environment and caveats

- Chromium was blocked by the test environment from opening localhost or other URLs directly. The browser test assembled the **real application HTML/CSS/JS** into one deterministic document and used an in-memory substitute for localStorage with mocked catalog results. The local Node HTTP server was tested separately. This is a strong frontend smoke/regression pass, but **not** a full Chromium-through-server end-to-end test.
- **Open Library live networking: NOT TESTED.** The server is implemented against the documented Search API, while the test environment has no external DNS connectivity. Rate limits, API errors, and local fallback messaging are handled.
- **Real Windows launch, Edge/Firefox, OS display scaling, screen readers, 10k-book stress, and installation on a second machine: NOT TESTED.**
- No claim that all legacy Rowanvale controls received individual click testing or that all external providers are currently available.

## Known issues / remaining work

- The old Games and Watch Room feature code remains large and has other legacy UI patterns. The new hub unifies **navigation and saved-data integration** without rewriting every Games editor.
- The offline book index contains 107 curated examples, not a complete book archive. Any wider live search is governed by Open Library rate limits and its terms.
- Open Library covers shown from remote IDs do not automatically become offline, and page totals from metadata are edition-dependent. Users may edit the actual page count for their edition.
- Other existing Rowanvale modules retain their prior test coverage and previously documented limitations.

## Safety

- No destructive workspace migration: books are appended to the existing `backlog` and XP events to existing `xpEvents`.
- Save failures roll back to last committed state. XP is awarded inside the same save transaction, so blocked storage does not produce phantom rewards.
- Source inputs and metadata are sanitized, capped and escaped before display. User-initiated upstream search, per-IP rate limit and response-length limits are present. No Open Library credentials are bundled.
