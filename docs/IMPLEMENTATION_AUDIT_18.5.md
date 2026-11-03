# Architecture and implementation audit — 18.5

The target was clarified by the user: apply the Looksa brief to Rowanvale and retain Rowanvale's name. The working application is the supplied 18.3 Games, Media & Books beta, continued through the preserved 18.4 Living World branch. Source was inspected before replacing profile behavior; existing routes, local schema, themes, media tracking and XP were retained.

## Findings and plan executed

1. The profile was a games-oriented view mixed into the large legacy app module, with empty badge placeholders and a whole-workspace HTML export. Replace the rendered profile with isolated components while retaining established storage fields and handlers.
2. Profile appearance and global theme were entangled in the old editor. Add a profile-only draft/preview/commit flow and retain access to the global editor. Correct the global palette's ignored light/system setting.
3. Online metadata required per-item manual operations. Reuse the existing server/providers and introduce persistent jobs, deterministic matching, conservative review, request deduplication and safe recovery.
4. Cloud storage used an optional CDN SDK and blind upserts. Bundle the SDK, verify account sessions, compare hashes and server versions, bind accounts explicitly and supply a private RLS/RPC migration. No backend was deployed without a project.
5. Retain the existing Spotify PKCE integration and improve refresh, rate limits, callback state and origin handling. Keep unsupported platform integrations honestly labeled as local shortcuts.
6. Expand automated tests around the new behavior; rerun the existing 18.4 regressions, inspect real screenshots, then package a new release without overwriting 18.3/18.4.

## Boundaries retained

The app is plain JavaScript, CSS and a Node built-in server, with localStorage workspace key mindforge.momentum.data. New profile settings live under settings.profile185; online preferences under settings.online185. Operational queue/sync state has separate browser keys. The five library formats are Game, Book, Movie, Show and Anime. Existing music functionality is anthem/local audio and optional Spotify playback; there was no album/artist collection schema, so no fictitious album metadata service was added.

The Friends roster, guestbook/pinboard and platform handles are local. This build does not invent follower counts, real-time presence, remote comments, hosted public profiles, remote avatar storage or an unavailable community backend. Public viewing is a deliberately exported allowlisted static snapshot. Optional Supabase storage is a private whole-workspace backup/sync service, not public social hosting.

## Maintainability and security

Pure profile, matching and connection logic have separate Node-testable modules. DOM controllers reuse host data callbacks. Scoped CSS avoids resetting unrelated routes. Profile commits merge only owned profile/settings fields; background metadata checks the current item fingerprint before saving. Failed persistence does not falsely acknowledge success.

Provider hosts/paths and image types/sizes remain constrained by the existing server. New reachability probes use fixed provider endpoints. Direct secret/service-role browser keys are rejected. Cloud writes require a verified actor ID and compare-and-save version. Supplied SQL pins search_path, restricts table permissions and RLS, and retains five prior versions. SQL deployment and real-account authorization remain external verification tasks.

No live credentials, personal collections or test fixture records are shipped as production defaults. QA screenshots contain synthetic users and clearly labeled test artwork; the live Open Library smoke test is reported separately.
