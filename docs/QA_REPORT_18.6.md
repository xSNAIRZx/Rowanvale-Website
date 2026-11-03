# Executed verification — Rowanvale 18.6.0 RC

Verified on 25 October 2026 in Windows using Node v26.12.1, desktop Chrome and Playwright 1.62.1. Screenshots are from the running app with synthetic QA users/media, not product mockups or a personal workspace.

## Actual results

- **93 Node tests passed**, zero failed/skipped. The complete browser-suite run passed 92 Node tests; a final Node-only run passed all 93 after adding and fixing the anime-film milestone label. Both executed outputs are retained in test-run.json.
- **103 browser workflows passed:** 20 shared-library, 7 migration/legacy/offline, 7 artwork/concurrency/accessibility, 17 profile, 13 connection/actual-SDK, and 39 whole-app/18.6 workflows.
- Existing book catalog regression: **7 assertions passed**.
- npm run check: **47 application modules** parse, **79 HTML assets** and the complete versioned offline shell resolve; bundled SDK hash/license verified.
- npm run format:check: passed for every file listed by the script, including all new modules, styles and maintained tests.
- npm run catalog:audit: **6,304 entries** structurally scanned; no invalid titles or spacing/length warnings. Remakes/editions are not automatically merged. Full authority verification is explicitly limited.
- npm run build produces a complete distribution with a per-file manifest. This plain-JavaScript app has no separate transpilation step.

There is no configured TypeScript or ESLint pipeline; those successes are not claimed. No unexpected page exceptions occurred in the final successful browser workflows.

## Artwork timing and page stability

The final controlled browser startup measured the first eligible visible-item metadata request at **413 ms** after the connection coordinator started. Its local provider probe was intentionally delayed six seconds, and its separate bulk budget was already exhausted. The current top shelf item was requested first. This proves scheduling is no longer held behind those gates; it does not promise that a real provider completes a request or sends every cover in that time.

The same workflow asserts the original media-page DOM root remains the same when the image arrives. Viewport priorities retain current shelf order, promote quota-deferred interactive jobs and never bypass Retry-After/review states. Other regression flows verify reconnect deduplication, offline pending work, all five formats, ambiguity, negative cache, custom-image/manual-text protection and rate-limit recovery.

## Whole-app, profile and Reset evidence

All twenty routes were opened and their canonical titles/sidebar labels asserted. Every destination was checked at 320, 768 and 1440 pixels without document overflow. Profile/editor tests additionally cover 390/1920 widths, six presets, independent profile and app modes, actual edits/reload/uploads, selected sections/order, failed saves, privacy allowlists, prepared shared HTML and a 2,000-item paged collection.

The sign-in presentation fits a phone. A complete three-step named onboarding/reload succeeds. Reset tests exercise all six areas, draft preservation across sections, existing private save records, skipped grounding senses and one-time save, phone dialog overflow, keyboard focus containment/Escape, reduced motion, timestamp-driven pause/resume/completion, a failed-save retry and paused screen-rest recovery after closing/reload. Discovery trails open a real reviewable title without silently saving it, and the three new books appear through the actual directory search. Light/dark/system profile and Reset views render without overflow.

Native dialog focus containment was explicitly corrected after a keyboard test found the last control could lead back to the page. Mobile tab sizing and pre-sign-in resize/scroll callbacks were also corrected after real-browser failures. These failures are not counted as passes; final successful evidence replaces the failed run results. Failure screenshots are excluded from the distribution.

The original complete offline shell installs and reloads with the local server unreachable; existing media tabs, new profile and bundled SDK remain available. Legacy migration preserves 2,501 event IDs, XP, theme, achievements and book progress. Books Directory and Watch Room progress/undo and corrupt-workspace protection still pass.

## External services and limits

Live Open Library search returned twelve results, a work synopsis loaded, and a selected **35,195-byte** cover passed fetch/signature validation. Actual reachability reported Open Library ready and unconfigured TMDB/IGDB/Steam as setup needed. See live-provider-results.json.

The actual bundled Supabase SDK uses controlled HTTP auth/table/RPC endpoints in browser tests, with verified sessions, receipts, offline resumption, conflicts and permission errors. Pure tests cover account binding/switching, refresh and an editor deferring automatic remote restoration. Spotify expiry/rotation/revocation/rate limits are controlled tests. TMDB film/TV identities, game mappings and failures are controlled provider tests. No real TMDB/IGDB/Spotify/Supabase credentials or live backend project were supplied, so deployed SQL/RLS/email/consent/account permissions remain unverified.

Shared-profile HTML and the explicit copy fallback are tested. Actual OS-level browser download delivery remains unverified because this environment previously canceled control downloads too. The release archive is created and verified directly on disk, with an identical extracted fallback.

Physical devices, Safari/Firefox, screen readers, audio hardware audibility and formal WCAG certification were not tested. Not every legacy action was exhaustively certified. No production-ready or clinical-effectiveness claim is made. SETUP_AND_LIMITS_18.6.md lists concrete prerequisites and unresolved external limits.

## Delivery and provenance

The supplied 18.5 archive remains unchanged. Development continues its Git history on development/18.6-whole-world, preserving 18.3/18.4/18.5 commits. The current bundle provides recovery history; BUILD_MANIFEST.json lists delivered SHA-256 values. External SHA256SUMS_18.6.txt and Verification_18.6.json record ZIP CRC, paths, file counts, every manifest comparison and the delivered-folder launch smoke result. Personal workspace data, .env, node_modules, .git, private artwork cache and failure captures are excluded.

The unchanged Supabase JS 2.118.0 UMD SHA-256 is ee3be8de192b97cb1d73d1e95d6b82bb1f6b658c0f97c4ef757fc331996ed3d3, with its MIT license included. No new runtime dependency was added.
