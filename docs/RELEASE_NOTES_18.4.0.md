# Release notes — Rowanvale 18.4.0 RC

Built on the verified 18.3 Games & Media & Books package. The update adds shared functionality without replacing the original application modules.

## Living World

Unified shelves and search span five media formats. Consistent cards lead to descriptions, ratings, notes, author/creator/cast details, sources, progress, journal entries and sessions. Original full game, book, Watch Room and Fan Lounge views remain linked from the hub.

Optional metadata lookup includes Open Library, credential-based IGDB and TMDB, and an opt-in Steam fallback. The add flow searches as you type, previews selected details, and requires match confirmation. Custom uploads are decoded and resized before saving. A separate checkbox is required to replace protected custom artwork/manual descriptions through a provider match.

Artwork maintenance finds missing fields, checks images, reports duplicates, refreshes provider metadata, previews changes and supports cancellation and retry. Batches do not replace manually edited descriptions, custom artwork or a user's selected edition page count.

For You combines unfinished stories, favorites, open quests and optional restorative activities. Voluntary mood use has separate consent, local preferences, dismissal, show-less and surprise controls. Suggestions explain their shared tags and distinguish thematic similarity from sourced franchise links. A publisher-sourced Witcher cross-format relationship is included as a verified example.

Sessions track gaming, watching and reading with persistent start times, editable actual minutes, reflections and optional in-panel reminders. Pairing suggestions avoid screens during activities requiring balance or attention.

## Shared progression

All original award paths now write through one persistent ledger. Its event IDs are retained beyond the old 2,000-record cap. A permanent key registry prevents repeat awards. New reading, episode, film, game, review, session, voluntary check-in, wellness, creative quest and discovery quest activity can contribute. Existing focus, movement, personal and productivity rewards use the same ledger.

Future milestone values are configurable. Resting never removes XP. Corrections, deletion and undo reconcile newly linked activity rewards; restoring the action restores its original award. Original imported XP remains historical. Eight optional specialization tracks augment the existing overall level. Achievement definitions depend on recorded events.

## Confirmed fixes

- Removed lifetime-ledger truncation that weakened duplicate protection.
- Fixed page-two-and-later book actions selecting the wrong directory entry.
- Preserved new artwork references in portable ZIP backups and both cleanup interfaces.
- Added validated Open Library → Internet Archive cover redirects; live cover download now succeeds.
- Added browser-offline fallback for explicitly selected private artwork, with a bounded 80-image cache.
- Fixed same-tab background saves being mistaken for another-tab conflicts.
- Protected open forms from silently overwriting another tab's newer story record.
- Applied migration on both fresh-save and corrupt-save recovery paths.
- Aligned visible version labels, manifest and service worker with 18.4.
- Improved light-palette control, tab and toast legibility.

See QA_REPORT_18.4.0.md for evidence and KNOWN_ISSUES_18.4.md for limits. This release candidate does not claim that every historical integration or external service has been certified.
