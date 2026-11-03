# Verification report — Rowanvale 18.4.0 RC

Verified on 25 October 2026 in Windows using Node v26.12.1 and installed desktop Chrome via Playwright 1.62.1. Evidence is recorded under docs/evidence/18.4/. Browser fixture data is deliberately synthetic; screenshots are captured from the running application, not design mockups.

## Automated results

- **40 Node tests passed**: domain logic, migration, lifetime event IDs, duplicate protection, XP rollback/reactivation, reviews, game/film/book/episode progress, daily limits, voluntary moods, preference privacy, metadata protection and validation, provider request mapping, missing credentials, outage/rate/size/corrupt-response handling, server boundaries, safe image redirects, portable backups, restore checksums and unsafe archive rejection.
- **34 browser workflows passed**: 20 shared-library workflows, 7 migration/legacy/offline workflows and 7 artwork/keyboard/concurrency/theme workflows.
- The existing Open Library catalog regression script passed its 7 assertions.
- All application JavaScript files passed Node syntax checks.

The browser flows verify saved values in browser storage, not only button response. They include all five media types, selected edition pages, journals, persistent XP, corrections, failed storage writes, record conflicts between tabs, real reloads, session XP/idempotency, short-session behavior, custom artwork decoding, broken-image fallback, bulk confirmation/cancellation, recommendation controls, all eight specialization tracks, and the original navigation/views.

## Migration and offline evidence

A fixture with **2,501 legacy XP events**, 2,550 XP, a custom theme, prior achievement and book progress was loaded through the real app. Its original balance, all event IDs and progress survived. Existing Books Directory page actions and Watch Room awards/undo were exercised. A corrupt stored workspace resisted overwriting.

The full service-worker shell installed, then the browser was put offline and reloaded with its local server unreachable. All five new hub tabs remained usable. Explicitly selected artwork was fetched online and then successfully read from the browser's bounded offline cache with the server unreachable.

## External services

A live Open Library query returned 12 results. A selected work synopsis loaded. A selected cover download passed MIME/signature/size validation after the provider's validated Internet Archive redirects. See live-provider-results.json.

TMDB and IGDB live credentials were not supplied. Their requests, mapping, authorization handling and failure states were verified with controlled responses; live credentials and account-specific rights remain untested. Steam and unrelated legacy external services were not live-certified. No credentials, private user workspace or third-party library artwork were bundled into the release.

## Visual and accessibility checks

The shared shelves, recommendations, maintenance, sessions and journey views were checked at **390, 768 and 1440 pixels** without document overflow. Actual mobile/desktop, recommendation, journey, offline-startup and light-theme screenshots are included. Keyboard Enter/Tab/Escape, native dialog containment, labeled controls, status/error announcements and reduced-motion CSS were exercised or inspected. No unexpected page exceptions occurred in the successful browser runs. Physical devices, screen readers, Safari and a full WCAG audit remain outside this evidence.

## Baseline and source provenance

The supplied 18.3 ZIP contained **154 files**, all readable. All **81 checksums** listed in its app-file manifest matched. Its complete Games, Media and Books application, sources, tests and historical documentation were preserved before starting the development branch. The recovery ZIP is a byte-for-byte copy of that supplied archive; its SHA-256 is:

436875a63e8b9b0229b9bc36193a26d871f7d0931a273ed6b395045858bb1497

Development branch: **development/18.4-living-world**. The included history bundle contains both the preserved 18.3 baseline and 18.4 development commit. Final distribution ZIP checksums are supplied beside the downloads, avoiding self-referential archive hashes.

Read KNOWN_ISSUES_18.4.md for practical limits. Historical 18.3 reports are retained as history and do not substitute for this release's evidence.
