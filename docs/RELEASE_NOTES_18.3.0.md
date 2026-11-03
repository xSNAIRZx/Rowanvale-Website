# Rowanvale 18.3.0 · Games & Media Universe

**Status:** Local Windows desktop **beta**, not a signed installer or public streaming/catalog service.

## Implemented

- **Games & Media Hub** combines games, movies, TV, anime and books in one entry point. It shows cross-category counts, recently saved media, links to progress, and clear paths to existing specialist tools.
- **Book Directory** ships with **107 curated offline starter titles** and a real, user-initiated **Open Library** search using `/api/books/search` through Rowanvale's included local Node server. Search results include titles, authors, year, optional edition-length estimate, source IDs and optional cover IDs. Unknown values remain unknown. This is **not** a complete offline dump of Open Library.
- Books store in the existing workspace `backlog` as `type: "Book"`, with optional author, pages, genre, publication year, rating, private notes, reading progress, session journal and completion status. Existing JSON/ZIP workspace backups continue to include the records and XP ledger; the original storage key is unchanged.
- Book statuses: **Want to read**, **Reading**, **Finished**, **Paused**, **DNF**. Manual entry and saved local reading histories work offline.
- **Reading XP:** +5 XP once per new 25-page milestone, capped at 20 milestones per unique title/author, plus +40 once for finishing. Edits, repeats, and toggling status do not award XP. The existing `Learning` lane and achievement checks are reused.
- **Watching XP:** a completed film grants +20 once per work; a new TV/anime episode grants +4 once per season/episode; a known completed season grants +20 once. Rewatches earn no additional completion XP. Reuses existing XP ledger and rollback on failed saves.
- **Fan Lounge:** offline book starters and saved books join the cross-media directory. Books can join curated shelves and personal evening plans, with a Book Club preset.
- **Retained original features:** game discovery, 4k+ game index, game collection, game artwork/workshop, comparisons, Watch Room, Fan Lounge voting, personal profiles, fitness, quests, settings, backups, etc. Their existing underlying feature implementations were not replaced or reset.
- UI: responsive book gallery, search/filter/sort, profile-neutral fallbacks for unavailable covers, accessible dialogs, reading progress, shared cross-media sub-navigation, consistent Rowanvale colors.
- Versioned offline cache, Windows launcher label, manifest, version checker metadata and source files updated to 18.3.0.

## Important limitations

- The 107 starter books are **title/author discovery records**, not bundled cover files. Search the wider book catalog online using the included Node server. Open Library may return incomplete edition information and has API usage limits.
- External Open Library covers are **online-only**, unless the user provides local artwork through supported existing capabilities. The app does not redistribute third-party covers in its installer.
- No new cloud account, public book club hosting, ebook reader, streaming service, or import of external social-tracker accounts is claimed.
- XP tracks progress reported by the user; it cannot independently verify reading/viewing in a local-only app.
- Tests were performed in a controlled Chromium document with actual frontend JS/CSS and a separately running local HTTP server. Direct Chromium-to-localhost browsing is restricted in the test environment. Windows + real upstream Open Library requests remain **NOT TESTED** here.

## Upgrade

1. Launch the existing build normally and export a backup in **Data & Beta**.
2. Keep the entire old ZIP and extracted directory untouched.
3. Extract the new ZIP into its own folder; run `START_ROWANVALE_WINDOWS.bat` (Node.js 18+).
4. Use the **same browser profile and `http://localhost:8080` origin** as before to retain locally saved data. Do not open `index.html` directly via `file:///`.
5. Test your game, film and fitness records, then visit **Games & Media → Books Directory**.
