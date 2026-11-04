## Unreleased — Lamplight polish pass

- Custom theme palettes now define the Lamplight ground, surface, ink and lamp tokens themselves, so Light and Dark actually change a saved custom theme instead of both resolving to the default Forest Dusk ground.
- The phone Games & Media hero is compact at 320–400px: the supporting sentence moves to the accessibility layer and the title, lamp and every action stay, bringing the library search above the bottom navigation.
- Library search now precedes the shelf tiles, so the primary control is the first thing reached on a phone while desktop keeps all four shelves.
- The workspace-import regression check waits for the asynchronous status it asserts rather than reading the previous message; the shipped message is unchanged.

## Unreleased — reproducible public and private builds

- Include public Worker deployment source and the asset builder in the complete source package.
- Add documented public build/check commands and a regression covering missing assets, backend exclusion and preservation of earlier output on validation failure.
- Build public assets from the HTML/offline-shell references rather than copying Node backend modules.
- Update README and AI handoff context for the existing 1.1.0 Lamplight release.
- Verification: 164 automated tests and 7 book catalog assertions passed; source package and public asset builds passed. This update does not change the running app version or deploy a new live site.

# Rowanvale 1.1.0 — A shell that keeps working offline

Release 3 November 2026

- Navigation resolves the cached shell from the scope root, so an installed copy still opens with the network offline instead of falling through to a failed request.
- The service worker no longer tries to cache /index.html, which the host redirects; a stale cached redirect can no longer trap the app on "this site can't be reached".
- Install caching is per file and tolerant, so one slow or unavailable asset cannot abort the whole offline shell.
- Artwork lookups accept non-free Wikimedia leads, stride page lookups in batches of twenty, and reject logos and wordmarks in favour of the designed placeholder.

See version.json for the in-app release notes.

# Rowanvale 18.2.0 — The Fan Lounge

- Offline film, TV and anime directory joins existing games.
- Cross-media comparison and themed shelves.
- Movie/game-night planning, guest ballots, budgets, breaks and running order.
- Reviewable invitation and editable-plan downloads, validated copy import.
- Full workspace backups retain the new local planning data.

See FAN_LOUNGE.md, OFFLINE_DIRECTORY.md and VERIFICATION.md.

# Rowanvale 18.1.0

- Added a local Movies, Anime & TV Watch Room with optional online discovery.
- Repaired preview sizing and draft theme rendering.
- Added mobile edit/preview tabs and reachable save controls.
- Preserved existing backlog records and JSON backup compatibility.

See WATCH_ROOM.md and VERIFICATION.md.

# Rowanvale 18.0 — The Your World Update

Release candidate • 25 October 2026

A single Settings studio replaces the stacked Studio, Design Lab and older customization panels. Six categories cover Appearance, My Space, Profile & Identity, Comfort & Accessibility, Data/Privacy/Backups, and Advanced. Search spans settings across categories, including advanced controls.

- Ten original color/typography themes, classic theme compatibility, custom palettes, saved looks and validated JSON theme export/import.
- Read-only live previews use the actual workspace/profile renderers. Desktop and mobile are 1000px and 390px viewports scaled to fit the preview. Editing does not save until Save changes.
- Discard, per-category reset, one-step undo and an unsaved-change leave warning. A concurrent storage edit blocks saving; Discard reloads the newer data.
- Profile name, username, avatar, banner, bio, pronouns, status, links, section ordering/visibility, gallery, Top 8, typography and existing profile templates.
- Decoded local MP3/WAV/OGG audio with native play/pause/volume controls. No autoplay or fabricated public activity.
- Independent app and profile backgrounds; solid, gradient, bundled wallpaper and safe uploaded images. Optional stars, rain and snow; at most 16 elements, with reduced-motion and low-stimulation suppression.
- My Day greeting, starting page, widgets, widths and arrangements; Overview card visibility, Collection preferences and existing page-specific styling.
- The sidebar remains the navigation destination. The coordinated header retains contextual View options and a single visible global search.

Confirmed repairs include new saved looks being dropped by the old loader, light themes inheriting a dark canvas, stale theme tokens after returning to a classic theme, and background/profile media limits disagreeing with reload validation. The existing Calm View repair remains intact.

No existing browser data was edited during development. Testing used separate browser profiles and synthetic records. See REMAINING_ISSUES.md for scope and limitations.
