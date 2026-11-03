# Release report — Rowanvale 18.6.0 RC

## What changed

The profile is structurally rebuilt: the previous horizontal banner/identity/tab stack is replaced by a tall passport rail and a separate editorial canvas. Identity, collection tally and numbered navigation live in the rail. The canvas has chapter typography, an asymmetric defining collection, rotation, gallery, personal text and the existing selected content. Narrow layouts reorganize into a compact identity header and mobile shelves. Profile Studio previews and safe shared HTML use the new visual structure. Existing presets, visibility/order, uploads, privacy and global appearance remain connected to their original fields.

Reset Studio moves from a long page into six purposeful areas. New breathing and screen-rest sessions use timestamp-based state, controlled start/pause/resume/restart/duration, explicit completion logging, paused recovery, optional chimes and keyboard containment. New sensory grounding supports skipping and adapting steps. Existing check-ins, body scan, reflections, soft-landing plan, thought tool, post-game notes, care menu and game-care plan remain available. Reflection drafts survive section changes. No new clinical claims or diagnostic behavior was introduced.

Artwork startup now separates immediate local rendering, interactive visible/featured/nearby work and capped background maintenance. Queues start once local source configuration is available, before slower provider probes/cloud initialization finish. Items promoted from an old quota pause become eligible on screen. Current shelf order breaks priority ties. Provider spacing, Retry-After, request deduplication, ambiguous-match review and manual protection remain. Cover updates patch the existing DOM instead of resetting the route, filters or scroll. Broken library images now notify the repair pipeline.

Anime metadata searches both film and television endpoints. Movie-prefixed anime IDs reach film details and completion, while existing numeric IDs remain TV-compatible. This fixes a real coverage gap in the supplied directory rather than attaching a TV poster to an anime film.

The whole-app pass aligns twenty route names, cleans old release/source/export labels, consolidates fourteen repeated bundled game cards without touching saved collections, adds three sourced books and three small discovery trails, and supplies quick continuation links for in-progress media.

## Actual components changed

New modules:
- app/profile-layout186.js — passport/editorial profile composition, reused by the editor.
- app/experience186.css — new profile/reset layouts and shared finishing details.
- app/reset-core186.js — pure timestamp-based session/recovery state.
- app/reset186.js — Reset Studio areas, guided experiences, draft preservation and controls.
- app/artwork-queue186.js — visible/featured/nearby priority and separate bulk eligibility.
- app/experience186.js — route registry, viewport observation, image patching, source-backed discovery and book additions.
- app/title-index186.js — conservative bundled-index deduplication.

Integrated changes:
- app/app.js — module bindings, Reset view composition, image patch callbacks, canonical copy, export filenames and bundled game cleanup.
- app/profile185.js — new view renderer, safe shared composition and export styles, retained editor/save controls.
- app/connectivity185.js — early queue startup, priority/promotion, measurements, partial DOM updates and active-editor cloud restore guard.
- app/connection-core.js — deferrable automatic remote replacement and 18.6 cloud payload version.
- app/living-core.js / app/living184.js — anime-film handling, broken-cover fallback, discovery trail tab and reviewable seeded story forms.
- app/metadata-service.js — typed anime film/TV searches and details, retaining fixed hosts and provider request controls.
- app/navigation1740.js, media183.js, catalog-extra.js and rowanvale172.js — visible naming, source labels and backup filenames.
- index.html, sw.js, version.json, manifest.webmanifest, header1741.js, polish1730.js, launcher, package/lock — new version and complete offline assets.
- Existing regression harnesses plus new experience186.test.cjs, experience186_browser.cjs and catalog-audit186.cjs — evidence and validation.

CHANGED_FILES_18.6.txt lists the exact changed paths, including documentation and evidence. No new runtime dependency was added. The pinned MIT Supabase SDK remains unchanged.

## Bugs found and resolved

Slow probes and a shared hourly quota delayed visible art; full-page artwork refresh disturbed the current view; anime film requests used TV identities; repeated base catalog cards survived extension deduplication; old names/filenames conflicted across routes; automatic cloud replacement could land during an open profile draft; startup scroll/resize events could run before the new coordinator was bound; mobile Reset tabs compressed; guided-dialog keyboard focus could escape at the last control. These issues have implementation fixes and targeted checks.

The cloud concurrency browser scenario now opens the local editor before changing its controlled remote fixture, making the intended conflict deterministic. The previous test could legitimately receive clean remote changes before editing began; that is different from losing an active draft. Pure and actual-SDK tests now cover the active-editor protection.

## Preserved and externally dependent behavior

Saved profile/library/XP fields, old routes and original tools remain. The upgrade keeps explicit online opt-outs and makes no silent personal-title changes. Backend SQL is unchanged from 18.5; an already migrated project needs no new migration. Optional Supabase/Spotify/TMDB/IGDB still require the user's configuration. Their live account permissions/consent were not fabricated or certified. See SETUP_AND_LIMITS_18.6.md and QA_REPORT_18.6.md.

The output is a release candidate with actual validation, a verified archive, an extracted fallback and recovery history. It is not a blanket claim that every old feature or third-party account is production-certified.
