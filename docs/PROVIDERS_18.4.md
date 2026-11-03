# Provider integration and rights — Rowanvale 18.4

Reviewed against official provider documentation on 25 October 2026. Provider access does not transfer ownership of descriptions, posters or covers. This is a private local release candidate, not a certification for commercial redistribution.

## Open Library — books

No key is required. Searches use the fixed openlibrary.org JSON API, request only a small result set, cache responses in a bounded in-memory cache, and space requests at least 1.1 seconds apart. Set ROWANVALE_CONTACT to identify your application contact for regular use. Selected work details provide descriptions; search metadata supplies authors, years, subjects, ISBNs and cover IDs. A median page count is labeled as a suggestion; confirm your actual edition before tracking pages.

Covers are initially requested from covers.openlibrary.org. Selected private offline downloads support its specific Internet Archive cover-archive redirects, validating each host, path and query. Other redirect routes are refused. Public-facing reuse should follow Open Library's cover hotlinking guidance. The release contains the integration, not downloaded third-party library posters.

Sources: https://openlibrary.org/developers/api and https://openlibrary.org/dev/docs/api/covers

## TMDB — movies, TV and anime

Obtain an API Read Access Token from your own TMDB developer account and put TMDB_READ_TOKEN in app/.env. It stays on the local server. The integration supports title searches, selected details, descriptions, release dates, cast, creators, genres, episode/show totals and poster alternatives. Anime lookup is restricted to animated television results; it is not a complete anime/manga ontology. Season episode counts are confirmed by the user rather than silently taking a show's lifetime total.

The app includes TMDB's official logo unchanged in its provider credits and the required endorsement notice. Offline copying is disabled by default. Set ROWANVALE_TMDB_CACHE=1 only after confirming that your applicable terms permit the intended private caching. Commercial use needs its appropriate licensing arrangement.

Sources: https://developer.themoviedb.org/docs/getting-started, https://developer.themoviedb.org/docs/faq and https://developer.themoviedb.org/docs/image-basics

Official logo file retrieved unchanged from: https://www.themoviedb.org/assets/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg

## IGDB — games

Configure IGDB_CLIENT_ID and IGDB_CLIENT_SECRET for your Twitch developer application. Server-side client-credentials authentication obtains a temporary token. Requests include descriptions, covers, genres, platforms, companies and alternate titles. Search input is escaped before constructing the fixed provider query. Cover URLs are derived from validated image IDs.

Private offline copying in the new shared tools is disabled until ROWANVALE_IGDB_CACHE=1 is explicitly configured under your permitted use. Existing standalone game-workshop functionality is preserved. Follow IGDB/Twitch rules and obtain any required commercial permission before distribution.

Source: https://api-docs.igdb.com/

## Optional Steam fallback and existing sources

STEAM_CATALOG_ENABLED=1 enables the optional public store endpoint for title previews and selected app details. This endpoint is undocumented and can change. It was not live-certified for this release. It does not provide general console or retro coverage. RAWG remains an optional credential-based source in the original game directory. Neither option is required for local tracking.

AniList is intentionally disabled for new API calls because its current terms restrict competing list/tracker products. Existing saved anime records are retained. Use TMDB or manual entry in this build. Optional Google Books, RAWG in the new shared matcher, and SteamGridDB integrations are not included; manual uploads cover custom-artwork selection.

Source for the AniList restriction: https://docs.anilist.co/guide/terms-of-use

## Privacy and request handling

The metadata service receives only title, category and selected provider record IDs. It never receives personal moods, notes, ratings, private recommendation preferences, XP or your full library as an external request. Maintenance sends individual titles after opt-in, with a twelve-story batch limit and explicit confirmation before changes. API requests have timeouts, redirect rejection, fixed hosts, response size limits, bounded caches and rate limits. Provider Retry-After cooldowns are retained and shown as retryable errors. The user chooses when to retry failed jobs.

Artwork is checked for MIME type, signature and a 3 MB limit. Private cache/backup mutations require the local app's origin and intent header. Server implementation modules and .env files are not static web assets. Host validation rejects DNS rebinding. The server binds to loopback by default.
