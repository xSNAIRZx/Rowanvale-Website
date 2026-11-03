# Beta 19: what to add, improve and change

The strongest direction for Rowanvale is a personal, offline-capable home for leisure and daily life, with coherent navigation and trustworthy saves. This update builds on the latest 18.6.2; it does not restart the version-17 code or remove working features.

## Delivered now

| Area | Improvement | Why it matters |
| --- | --- | --- |
| Customization | Coordinated workspaces combining appearance, comfort and widget arrangement | A useful setup is more than a color choice |
| Preview | Saved/draft comparison and a pending-change summary | Users can see what they are about to keep |
| Sharing styles | Whitelist-validated versioned preset files | Reuse a look without sharing a profile, media upload or private journal |
| Media organization | Smart Shelves from saved search/type/status/sort | Repeated browsing becomes one reusable choice |
| Presentation | Persistent grid, detailed list and compact list | Large collections need different browsing densities |
| Group decisions | Reviewable lineup suggestions with known durations, breaks and vote explanations | Move from a pile of nominations to a plan while preserving guest choice |
| Planning outside Rowanvale | Locally generated calendar export | A plan can enter a real calendar without a hosted account |
| Data confidence | Read-only workspace, storage, backup and offline-installation checks | Show what is actually known rather than equating online with safe/offline-ready |

The media design adapts useful concepts from [Steam's dynamic collections and custom shelves](https://store.steampowered.com/libraryupdate/?l=english), while retaining the distinction between an intended watchlist and curated lists described by [Letterboxd](https://letterboxd.zendesk.com/hc/en-us/articles/15179261056143-What-s-the-difference-between-my-lists-and-my-watchlist). [Plex's unified discovery and watchlist](https://www.plex.tv/discover/) is useful inspiration for connecting formats and people; no Plex integration, streaming service or live community was added.

Calendar files use the [iCalendar specification](https://www.rfc-editor.org/rfc/rfc5545) with UTC event instants, escaped text, folded lines and no automatically invited attendees. The plan's date/time is interpreted on the exporting device; users must review plans imported from another timezone. Unknown durations block calendar export rather than inventing an ending. Suggestions are a simple vote-ranked fit, not a globally optimal combination or unanimous group agreement.

## Changes to make permanent

1. Keep local use independent of accounts, subscriptions and live providers. Online features should clearly state what leaves the device and how they fail.
2. Keep one editor per underlying preference, with contextual shortcuts rather than parallel save systems. Legacy profile controls still need staged consolidation.
3. Prefer useful summaries and saved views over repeated hero panels and duplicate toolbars. Preserve keyboard and mobile access to advanced tools.
4. Never show successful saving, backup safety or offline readiness without evidence. Recoverable errors should keep edits available.
5. Keep performance measurable. Pagination already bounds media rendering to 24 cards. Measure representative operations before changing architecture.
6. Treat beta status as a real quality boundary: track remaining tests and failure cases rather than claiming every button works because it renders.

## What is still missing — recommended next order

| Priority | Next investment | Required foundation / boundary |
| --- | --- | --- |
| 1 | Native-feeling Windows install, app window, updates and an understandable launcher | Package the existing local app; verify signed updates and rollback. Current delivery still needs Node and a local server |
| 1 | More durable local storage and recovery history | Design a safe IndexedDB/local-database migration with atomic writes, readback verification and rollback; don't silently migrate all users during this beta |
| 1 | Complete profile customization consolidation | Bring newer Profile Studio and legacy profile fields into one staged editor without losing existing effects/exports |
| 1 | Real device and accessibility certification | Physical phones, Edge/Firefox/Safari, keyboard zoom, NVDA/VoiceOver, contrast and long-running resource use |
| 2 | Hosted friends and private groups | Identity, authorization, privacy defaults, invitations, deletion/export and conflict-safe offline syncing; optional accounts must not block local use |
| 2 | Season/episode-aware planning and richer media provenance | Verified episode identities, rewatch history, edition handling and clear provider/source timestamps |
| 2 | Portable collection import previews | User-approved duplicate handling for CSV and supported exports, with rollback and preserved notes/ratings |
| 2 | Shared taste and availability tools | Explicit consent, understandable recommendations and timezone-aware invitations; no fabricated friend activity |
| 3 | Workout playback and richer routine progress | Verify exercise/session editing, interruptions and historical comparisons before expanding recommendations |
| 3 | Optional local reminder scheduling | Permission-aware notifications, quiet hours, restart behavior and honest desktop-background limits |

These are recommendations, not capabilities claimed as shipped in Beta 19. Hosted social and account deployment remain future work.

## Customization boundaries

Workspace presets include selected appearance/comfort/layout preferences and widget ordering. They exclude uploaded backgrounds/avatar/audio, identity, personal greetings, account settings and records. Existing individual theme files keep their original format. Full workspace backups retain personal content separately. Twelve named workspace presets and twenty Smart Shelves are bounded local preferences, not an unlimited asset library.

## Optimization observations

Three measured runs on this Windows PC with 2,000 synthetic records returned median cold-shell load262ms, reload471ms, library navigation86ms and search17ms. External requests were blocked, service workers disabled, no CPU/network throttling. A separate3,000-record library scenario retained24 initial cards and returned the correct last-title search. These are development observations, not a promise on mobile hardware, slower disks or live-provider networks. No broad performance rewrite was justified by this evidence.
