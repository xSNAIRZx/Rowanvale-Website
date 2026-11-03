# Executed verification — Rowanvale 18.5.0 RC

Verified on 25 October 2026 on Windows, Node v26.12.1, desktop Chrome through Playwright 1.62.1. Evidence is under docs/evidence/18.5/. Screenshots are from the running application with synthetic QA users/media; clearly labeled procedural test artwork is not shipped as default library content. The scenic banner is the app's bundled artwork.

## Results

- **75 Node tests passed**, zero failed/skipped: original 40 regression tests plus 35 profile, privacy, enrichment, account/session, concurrency and OAuth tests.
- **64 browser workflows passed**: 20 shared-library, 7 migration/legacy/offline, 7 artwork/concurrency/accessibility, 17 new profile and 13 connection/actual-SDK integration workflows.
- Existing book catalog regression: **7 assertions passed**.
- npm run check: 41 application modules parse; 72 HTML references, offline shell assets, version consistency and local SDK SHA/license verified.
- npm run format:check: passed for all new modules, styles and tests listed in package.json.
- npm run build: created the complete distribution and SHA-256 file manifest. This plain-JavaScript app has no separate transpilation step.

There is no configured ESLint or TypeScript project, so no lint/typecheck success is claimed. Node syntax checks and browser execution validate the supplied JavaScript. No unexpected page exceptions occurred in successful browser workflows.

## Critical behavior exercised

New and populated profiles, all six presets, actual edit/save/reload, isolated previews, Cancel/reset, uploads, section order/visibility, featured mixed-media, light/dark/system profiles and global custom-theme modes; failed storage saves; private pinboard preservation; safe shared snapshot allowlists and prepared HTML; 2,000-item paged/searchable collection; keyboard dialog focus and reduced motion; mobile/tablet/desktop widths and modal/document overflow.

The existing service worker installed with all assets, then the local server became unreachable and the browser reloaded offline. All five media tabs, the new profile and bundled SDK remained available. Migration preserved 2,501 event IDs, XP, theme, achievements and book progress. Books Directory and Watch Room progress/undo still work. Corrupt workspaces resist overwrite.

Connection tests exercised all five formats' automatic enrichment; pending offline additions; repeated reconnect deduplication; ambiguous matches held for review; unavailable-result negative cache; Retry-After/backoff; manual image/text protection; actual reachability failure with navigator online; persisted preferences and privileged-key rejection. Auth tests use the actual bundled Supabase SDK against controlled HTTP auth/table/RPC endpoints, checking headers, verified sessions and receipts. Offline cloud edits resume in one write; conflicting versions and permission errors retain local data. Pure tests additionally cover first-account binding, session expiry, account switching, clean remote restores and concurrent changes. Spotify refresh rotation/revocation/outages/rate cooldown are controlled integration tests, not live account certification.

## Live provider evidence

A current Open Library request returned twelve results; work details supplied a synopsis; a selected cover downloaded as 35,195 bytes and passed image signature validation. Actual service probe reported Open Library reachable and unconfigured TMDB/IGDB/Steam as setup needed. See live-provider-results.json. TMDB/IGDB, Supabase and Spotify live credentials were absent. Their controlled tests do not prove deployed account permissions or a real provider account's availability.

## Visual review and limits

Actual default, populated desktop/mobile, Profile Studio desktop/mobile, connectivity, light theme, offline and legacy media screenshots are included. The final review corrected duplicate mobile quick actions and ensured scoped heading typography/contrast. QA media images are deliberately labeled; they are not claimed as matched official posters. No personal workspace data was opened or included.

A Chrome download control showed the same environment-level cancellation for plain text, ZIP and profile HTML. Tests verify the complete prepared HTML and its clipboard/select fallback, save a QA copy and assert private values are absent. They do not claim OS-level file delivery works. The release ZIP itself is created on disk, independently verified and supplied beside an extracted copy.

No real SQL database migration, email delivery, physical device, assistive screen reader, Safari/Firefox or full WCAG audit was available. No hosted social backend exists. Read SETUP_AND_LIMITS_18.5.md for exact remaining dependencies. This is a release candidate with explicit verification boundaries, not an unsupported production-ready claim.

## Source and package provenance

Source branch development/profile-connectivity-polish continues the preserved 18.4 commit b8bf889359611d270db58d4388daae61e5aca044 and original 18.3 baseline. Historical reports remain unchanged. The fresh release excludes .git, node_modules, .env, private cache data, previous bundles and failure captures. The included current Git bundle retains recovery history. BUILD_MANIFEST.json records every distribution file; the external verification record checks ZIP CRCs and SHA-256 against extracted files. Original 18.3 and 18.4 outputs are retained separately.

The local SDK is Supabase JS 2.118.0 from its published UMD distribution, MIT license included. SHA-256: ee3be8de192b97cb1d73d1e95d6b82bb1f6b658c0f97c4ef757fc331996ed3d3. Development tools are pinned in package-lock.json.
