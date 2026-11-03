# Rowanvale 18.6.1 artwork correction

## Confirmed causes

The 18.6 priority queue enriched saved records, but unsaved directory cards and several older renderers did not participate. Artwork was read through inconsistent fields. The central image validator also lacked the exact new public image hosts, so even successful matches could render blank. Finally, a cache-first old service worker could keep serving an old shell after replacing files.

## Implementation

app/covers1861.js registers media cards during rendering, observes page/category/search changes, prioritizes visible cards and resolves batches automatically. It paints existing nodes instead of replacing the whole page. Saved records receive URLs and credits; unsaved catalog results remain operational cache entries. Writes wait while editing forms/dialogs to avoid discarding work. Custom artwork and manual removal are checked before lookup or replacement.

The adapter is wired into app.js, living184.js, rowanvale17.js, rowanvale172.js, media183.js, watch181.js, fan182.js, profile-core.js and profile185.js. living-core.js accepts only the exact additional image hosts and preserves source/credit fields. covers1861.css supplies shared image/status styling. connectivity185.js exposes the separate persistent preference and retry control. Existing descriptions/metadata enrichment remains available.

app/cover-service1861.js resolves fixed-host Wikipedia/Wikidata work identities, validates media type/year/entity and filters unsuitable lead images. Shared/redirect article images use bounded filename-specific imageinfo lookups. Exact TVmaze show matching and configured existing providers can fill misses. Ambiguous candidates remain review/unavailable. Results carry a source URL and credit. The same-origin POST /api/artwork/resolve endpoint accepts only bounded media descriptors and an explicit intent header; server modules are not exposed as static JavaScript.

Positive server results last 30 days, unavailable results 24 hours and transient failures briefly. Batches are limited to 16, pending work is bounded and host requests are paced. Fast successful primary results do not wait behind all secondary misses; pending secondary results are polled. The browser retains up to 700 result entries and pauses offline, then resumes. The server stores at most 2,500 result entries in its private data directory. New public results store URLs/credits, not image binaries. Existing eligible explicit offline caching remains separate.

The new settings.coverArtwork1861.enabled defaults true independently of the older metadata backfill preference. Explicit new opt-outs persist. Only format/title/year/author/platform/edition/public identifiers reach artwork services. Private notes, health records, authentication and profile content are excluded by descriptor construction.

app/server.js serves a network-only /api/launch bootstrap. It unregisters this origin's /sw.js worker, preserves localStorage and unrelated caches, and opens the versioned index. The Windows launcher uses this endpoint. The new service-worker shell includes both new client assets. No new runtime dependency is required; the bundled Supabase SDK hash is unchanged.

## Sources and limits

- MediaWiki PageImages: https://www.mediawiki.org/wiki/Extension:PageImages
- API parameters: https://www.mediawiki.org/wiki/API:Pageimages
- Page properties: https://www.mediawiki.org/wiki/API:Pageprops
- Request etiquette: https://www.mediawiki.org/wiki/API:Etiquette
- TVmaze API: https://www.tvmaze.com/api

PageImages pilicense=any can return free or nonfree work images. Source links and copyright notices remain attached; availability through an API does not transfer image rights. These public covers are hotlinked, credited and not bundled as poster binaries. TVmaze metadata attribution does not relicense the original artwork. Optional provider credentials and their caching permissions remain governed by the existing setup guide.

This fixes automatic attempts across all media surfaces. It does not establish 100% cover availability or validate every catalog edition against a public image. Rare works, ambiguous editions, provider outages, blocked image hosts and rate limits remain real limits. Generated placeholders are never described as official artwork. Five genuine formats were verified with actual image pixels, alongside controlled deterministic coverage tests; see the QA report.
