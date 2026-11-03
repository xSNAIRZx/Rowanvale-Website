# Rowanvale 18.5.0 RC — Your Orbit, Connected

## Design and personalization

Your Orbit now has a landscape hero, strong identity area, distinct editorial sections and media shelves across all five supported formats. Empty profiles use bundled Rowanvale artwork and useful onboarding. Empty optional sections and unearned badges no longer appear as decorative content. The collection tab uses bounded 24-item pages with search, filters and sorting; it was tested with 2,000 records.

Profile Studio replaces the primary edit journey with categories, six presets, independent light/dark/system lighting, accent/background, fonts, radius, spacing, card/media styles, motion, uploads, featured selection and section visibility/order. Live desktop/mobile preview stays isolated until Apply. Cancel, reset style, validation, storage failure and concurrent-edit handling are functional. Existing bio, links, gallery, anthem, selected friends, progress and private pinboard remain connected.

Global appearance keeps Light, Dark, System, saved themes and the previous settings editor. The global palette now respects color mode even for a saved custom theme. Profile accents choose readable text colors; reduced motion and keyboard/native dialog behavior are preserved. The duplicate legacy quick-action strip is hidden on the new profile, including mobile.

## Connection and media behavior

Actual source reachability is separate from browser online state and from credential configuration. Startup, reconnect, returning focus, library edits/imports and restored data trigger safe queue recovery. Metadata requests share in-flight work; operational state survives reload. Twelve-story hourly background limits, provider spacing, bounded retry/backoff, Retry-After and negative caching prevent storms.

Known IDs/ISBNs take priority; exact title plus supporting author/year/platform/creator evidence may auto-match. Ties and conflicts wait for review. Manual descriptions and artwork are protected, broken provider artwork has a usable fallback and repair action, and job fingerprints prevent stale results overwriting edits. New local profiles enable this behavior; existing online opt-outs survive migration. Healthy complete records are not automatically replaced merely by age.

The Supabase client is bundled locally so offline startup no longer waits on a CDN. Private sync verifies authentication, renews sessions, binds first accounts explicitly, deduplicates concurrent work and uses a versioned compare-and-save RPC. Diverging copies stop for review. Server SQL preserves five earlier private snapshots. Automatic private sync stays off until enabled. Spotify token renewal is deduplicated, handles rotation/revocation/rate limits, and its PKCE callback checks state, age and the originating storage origin.

## Bugs found and fixed during verification

- Profile previews containing a pinboard form accidentally nested forms; preview now excludes the private input form and Apply targets the editor's actual footer.
- Global settings navigation from a profile reopened the legacy profile category; explicit global Appearance navigation is corrected.
- Pending cloud edits left a stale synced message during offline recovery; pending state now emits immediately.
- Background queue scans could replace active job records; rescan is deferred until the worker finishes.
- Metadata games could score a supplied platform without a positive match; actual evidence is now required.
- Device-only artwork cache paths could escape into a share payload; filtering now occurs at the snapshot source.
- Failed queue-state writes could misreport a successful workspace save; operational persistence is handled independently.
- Automated downloads were canceled by the browser environment, including control text/ZIP files. Export now prepares an explicit HTML copy fallback and never falsely reports a completed download.

## Changed files and components

- app/profile-core.js — config/presets, media stats, sharing allowlist and validation.
- app/profile185.js and app/profile185.css — profile, studio, safe shared preview/export and scoped responsive styling.
- app/enrichment-core.js — identities, matching, persistent job states and retries.
- app/connection-core.js — account/session validation, versioned sync, single-flight and Spotify renewal.
- app/connectivity185.js and app/connectivity185.css — lifecycle worker, reachability, settings, account actions and review UI.
- app/app.js — version, migration, profile/connection bindings, scoped save integration, safe refresh, cloud delegation and Spotify fixes.
- app/yourworld18.js — settings entry points and corrected global color-mode palettes.
- app/living-core.js and app/living184.js — broken-cover state, detail/artwork entry points and game platform metadata.
- app/metadata-service.js and app/server.js — deduplicated requests and fixed-source connectivity endpoint.
- app/index.html, app/sw.js, app/version.json, app/manifest.webmanifest, app/header1741.js, app/polish1730.js and START_ROWANVALE_WINDOWS.bat — 18.5 shell/assets/version/offline setup.
- app/vendor/supabase-2.118.0.js and SUPABASE_LICENSE.txt — pinned local MIT SDK.
- backend/supabase-private-sync.sql — optional private schema, RLS, versioned RPC and history.
- package.json, package-lock.json and .gitignore — pinned development tools, commands and clean packaging.
- tests/profile_connectivity.test.cjs, tests/profile_browser.cjs, tests/connectivity_browser.cjs and tests/check-source.cjs — new validation. tests/run-tests.cjs and the four Living World browser/server harness files were updated for this release and evidence location.
- README.md, docs/18.5 guides, docs/CHANGED_FILES_18.5.txt and docs/evidence/18.5/ — usage, exact source-change inventory and executed evidence.

All earlier 18.3/18.4 outputs remain separate. This is a locally validated release candidate, not a declaration that credential-dependent services have been certified in production.
