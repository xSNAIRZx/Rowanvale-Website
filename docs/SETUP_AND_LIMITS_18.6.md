# Setup and explicit limits — 18.6

## Local use

Use a supported Node.js release (technical minimum 18). The Windows launcher starts the loopback server at http://localhost:8080; the runtime needs no npm modules. Preserve this origin and browser profile to retain saved data. Export a portable backup before upgrading. Copy your private .env configuration into the new app folder if you used provider keys. Never include that file in a shared release.

The service worker is versioned. If the browser briefly shows an older build after switching folders, wait for the new-shell notice and refresh once when your edits are saved. Confirm 18.6.0 · RC. Do not clear browser storage to solve an update; that can erase the local workspace.

## Artwork setup

Copy app/.env.example to app/.env and restart the server. Relevant variables:

| Variable | Purpose |
| --- | --- |
| TMDB_READ_TOKEN | Your TMDB API Read Access Token for films, TV and anime |
| IGDB_CLIENT_ID / IGDB_CLIENT_SECRET | Your Twitch/IGDB application credentials for broad game lookup |
| ROWANVALE_CONTACT | Provider identification contact |
| ROWANVALE_DATA_DIR | Private artwork-cache directory |
| ROWANVALE_TMDB_CACHE / ROWANVALE_IGDB_CACHE | Optional offline copying, only where your terms permit it |
| STEAM_CATALOG_ENABLED | Set to 1 to opt into the existing undocumented Steam fallback |
| RAWG_API_KEY | Optional legacy game-directory source |
| PORT / HOST | Normally 8080 / loopback; changing origin changes browser storage |

Open Library needs no key. Provider rights/attribution guidance in PROVIDERS_18.4.md remains relevant, but its old manual-only workflow and the 18.5 blanket hourly-limit description are historical. In 18.6 visible, featured and nearby library work has priority; only additional bulk work uses the twelve-story hourly budget. Actual provider limits always apply.

A cached URL can render immediately, but an uncached authenticated poster cannot appear without working credentials and a successful network response. Strong identities may auto-resolve; title-only/ambiguous records wait for confirmation. Existing manual art/text and opt-outs are preserved. The worker needs the app open. Complete metadata is not periodically replaced merely by age; reviewed manual refresh remains available. Discovery directory records are not bulk-downloaded in their thousands. The automatic queue enriches saved library records; existing discovery artwork/provider tools remain separate.

Anime film identity is recognized through a typed TMDB movie ID; untyped legacy anime entries keep their previous episode behavior until a correct film match is chosen. This avoids guessing a format from a title alone.

## Private cloud and Spotify

The existing backend/supabase-private-sync.sql is included unchanged. If it was applied for 18.5, no new SQL migration is required. Otherwise back up your project, review/apply it in your own Supabase project, enable email/magic-link auth and register the exact return URL. Configure only the browser publishable/legacy anon key and project URL in Account & connectivity. Secret/service-role keys do not belong in browser settings. First-account binding, compare-and-save versions, five historical copies and explicit conflict decisions remain.

No live Supabase project/credentials were supplied. The real bundled SDK was tested against controlled auth/table/RPC HTTP endpoints; the actual database migration, deployed RLS/grants, email delivery and multi-device permissions were not executed or certified here. The SQL's 12 MiB payload ceiling remains. Private sync covers the whole workspace, including care notes, and is distinct from shared-profile exports. Server-cached cover bytes require portable artwork ZIP backups rather than JSON cloud sync alone.

Spotify still needs the user's developer Client ID, scopes and an exactly registered redirect. Use HTTPS or an explicit loopback IP as required by Spotify, and open Rowanvale on the same origin before starting PKCE. localhost and 127.0.0.1 have separate storage: export/import a backup when intentionally moving. Live consent/playback remains unverified without credentials; token rotation, expiry/revocation, rate limits and transient failures have controlled tests. Existing 18.5 setup guidance remains applicable.

## Scope and verification limits

Twenty routes were inspected; the substantial visual rebuild focuses on Personal Atlas and Reset Studio, with targeted media/startup/navigation improvements elsewhere. Not every legacy screen was rewritten. Existing albums/artists, hosted public profiles, remote followers, real-time presence and social sync do not exist in the supplied architecture and were not invented. Friends/platform links remain local; music remains anthem/local audio/optional Spotify playback.

The 6,304 bundled catalog entries passed structural title checks. That does not mean every title/author/year was independently live-verified. Same-title adaptations/editions are retained when identity differs. Only the sourced additions and documented selections received direct source checks. Saved user titles are never automatically renamed by the index cleanup.

Browser checks use desktop Chrome and synthetic QA users/media. Physical devices, Safari/Firefox, assistive screen readers and a formal WCAG certification were not available. Optional audio activation is implemented; hardware audibility was not manually certified. No clinical effectiveness claims are made for Reset tools.

The automated browser environment previously canceled all file-download controls, including plain text/ZIP. Shared HTML payload/privacy and its copy fallback are tested; actual OS-level browser-download delivery remains unverified. The release ZIP is created on disk, checked independently and provided beside an identical extracted folder. No upload to ChatGPT Library/Drive/Dropbox is claimed; no supported file destination was connected for that purpose.

Development tools remain pinned Playwright 1.62.1 and Prettier 3.9.10. There is no TypeScript/ESLint project. No new runtime dependency or framework was introduced. Full limits from the prior provider/rights guides continue where they do not conflict with this current workflow.
