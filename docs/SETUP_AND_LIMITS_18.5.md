# Setup, dependencies and explicit limits — 18.5

## Local runtime

Install a supported Node.js release; technical minimum 18. Run START_ROWANVALE_WINDOWS.bat or npm start from the release folder. No runtime npm modules are required. Keep localhost:8080 and the same browser profile for existing data. For tests only, npm ci installs pinned Playwright 1.62.1 and Prettier 3.9.10. Install a Playwright Chromium browser or set ROWANVALE_BROWSER to installed Chrome. No TypeScript or ESLint project is configured.

## Metadata providers

Copy app/.env.example to app/.env and restart the local server after changing server configuration. Never put provider secrets in HTML, client JavaScript or a shared-profile file.

| Variable | Purpose |
| --- | --- |
| PORT / HOST | Default 8080 / loopback; preserve the browser origin |
| TMDB_READ_TOKEN | Your TMDB API Read Access Token for Movie, Show and Anime |
| IGDB_CLIENT_ID / IGDB_CLIENT_SECRET | Your Twitch application credentials for IGDB games |
| ROWANVALE_CONTACT | Your contact for provider identification |
| ROWANVALE_DATA_DIR | Optional private local artwork directory |
| ROWANVALE_TMDB_CACHE / ROWANVALE_IGDB_CACHE | Set to 1 only when your applicable terms permit offline image copies |
| STEAM_CATALOG_ENABLED | Set to 1 to opt into the existing optional undocumented Steam store endpoint |
| RAWG_API_KEY | Optional legacy game-directory source; not required by the new matcher |

Open Library needs no API key. Source attribution/rights guidance in PROVIDERS_18.4.md remains applicable, but its statement that every new maintenance match needs approval is historical: 18.5 adds automatic high-confidence matching when enabled. The new worker does not automatically refresh complete records solely by age. Missing descriptions/cover images and flagged broken provider covers are eligible; reviewed manual tools handle intentional refreshes.

Title-only entries can legitimately wait for review rather than receive an incorrect poster. Add author/year/platform or a provider ID/ISBN to improve confidence. No guaranteed cover exists for every title/edition. Correct edition page counts need user confirmation. The queue needs the app open; it does not run after the browser closes. Large libraries are intentionally spread across hourly limits.

## Optional Supabase private sync

1. Create or use your own Supabase project. Back up any existing mindforge_saves data/schema before migration.
2. Review backend/supabase-private-sync.sql and run it in that project's SQL editor. It upgrades mindforge_saves, adds private history, replaces policies only on these two Rowanvale tables, revokes direct authenticated writes and grants the authenticated compare-and-save RPC. Existing 18.4 clients using blind upserts must upgrade; do not mix versions after migration.
3. Enable email/magic-link authentication and register the exact local app return URL in Supabase Auth URL Configuration, normally http://localhost:8080/. Use the same browser/device when opening a PKCE email link.
4. In Connections → Account & connectivity, save the project URL and its **publishable or legacy anon key**. Never use a secret key or service_role key in a browser. The app rejects recognized privileged formats.
5. Send a sign-in link and complete authentication. Choose Save private cloud copy or Restore once to bind this workspace deliberately to that account. Enable automatic private sync only if desired.

The browser checks getSession/getUser, renews expired sessions and sends the verified account ID. The RPC checks auth.uid(), expected version and payload shape/size, serializes an account's writes and retains five previous versions. These historical snapshots are accessible to their owner through the project; no history-browser UI was invented. A local/cloud conflict never silently chooses a winner. Export a backup before explicitly choosing a resolution. Cloud backup is the whole private workspace, including notes/wellness records, and is separate from public sharing. There is a 12 MiB SQL payload ceiling; use portable backups for larger inline uploads. Server-cached image bytes are not part of JSON cloud sync: preserve portable artwork ZIP backups and your private cache directory.

**External verification still required:** no live Supabase project or credentials were supplied. The actual bundled SDK was exercised against realistic HTTP auth/table/RPC endpoints, but the SQL migration was not executed on a real database and its deployed grants/RLS, email delivery and multi-device authorization remain unverified. Apply and test the migration on your project before relying on cloud sync.

Official references checked 25 October 2026: [browser/API key choices](https://supabase.com/docs/guides/getting-started/api-keys), [auth redirect allowlist](https://supabase.com/docs/guides/auth/redirect-urls), [database functions](https://supabase.com/docs/guides/database/functions).

## Spotify and other connections

The existing Spotify PKCE/current-playback integration needs your own developer Client ID and an exactly registered redirect URI. The local redirect must use an explicit loopback IP, such as http://127.0.0.1:8080/index.html. Open Rowanvale on that same origin before connecting. First export/import a backup if moving from localhost; these origins have separate browser storage. The app now rejects an origin mismatch instead of losing its verifier. Developer account restrictions, scopes, live consent and actual playback were not tested without credentials. Token renewal, rotation, revocation, transient failures and Retry-After were tested with controlled responses. [Spotify redirect rules](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri).

Steam, Xbox, PlayStation and Discord profile cards are local saved handles/links. They do not claim account verification or import remote friends. Existing music is anthem/local audio and optional Spotify playback; no album/artist library existed and no new album matching was added. No hosted public profiles, followers, remote guestbook, remote image upload or social synchronization service is supplied. Avatar/banner uploads remain local browser data.

## Delivery and accessibility limits

A verified ZIP and identical extracted folder are provided locally. No connected Drive/Dropbox/Box destination was available for upload and no ChatGPT Library write tool was available; the delivery does not claim a cloud upload. If an attachment click fails, run the extracted folder directly or copy the ZIP using File Explorer. SHA256SUMS_18.5.txt verifies the ZIP; Verification_18.5.json records archive/file checks.

In automated Chrome, every tested download (including control text/ZIP blobs) was canceled by the environment. The prepared shared HTML and its copy fallback were verified. Actual OS-level shared-profile download delivery remains unverified; use the prepared HTML fallback if affected.

Keyboard, native dialog focus, visible labels/focus styles, reduced motion, contrast helpers and layouts at 320/390/768/1440/1920 pixels were checked. Physical devices, screen readers, Safari/Firefox and a formal WCAG 2.2 AA audit were not run. The target is accessible behavior, not a certification. No known failing automated checks remain in the delivered release.
