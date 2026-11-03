# Games, media and Fan Lounge audit

Audit date: 2026-11-01. Applied to the development copy of 18.6.1.

## Repairs and improvements

- Library searches that matched nothing incorrectly offered “Add your first story,” even with a populated library. They now explain that the filters have no matches and provide Clear filters, restoring all formats and statuses without changing saved data.
- Added distinct In progress, For later and Paused filters. Existing Active retains its broader unfinished-library meaning. Four count-bearing shelf shortcuts make returning to current stories, future plans and favorites easier across games, movies, TV, anime and books.
- Night-planner voting identity previously reset to the first guest when changing a lineup or duration. The selected guest is now retained per plan during the session, with a safe fallback when that guest is removed. A regression checks the actual saved vote belongs to the selected guest after a lineup change.
- The private issue report identified every build as version 16.0.0. It now reads the running release version, verified by downloading and inspecting a real report in the browser test.

No library schema change, new account requirement or online dependency was introduced.

## Product research

Steam's library emphasizes quick access to current activity and collections: [The New Steam Library](https://store.steampowered.com/libraryupdate/?l=english). Letterboxd distinguishes an intended-to-watch watchlist from curated lists: [Lists and watchlists](https://letterboxd.zendesk.com/hc/en-us/articles/15179261056143-What-s-the-difference-between-my-lists-and-my-watchlist). Rowanvale's added shelf shortcuts adapt those discovery principles to its existing local, mixed-format collection. They are not integrations or copies of either product's interface.

## Evidence

- `tests/media_polish_browser.cjs`: passed with external requests blocked. Checks status shelf membership, zero-result recovery, favorite removal surviving reload, viewport widths 390/768/1440, correct guest vote ownership and preserved guest selection after duration changes; no page errors.
- `tests/living_browser.cjs`: all 20 existing browser workflows passed after the library changes, including manual five-format entry, XP reconciliation, storage failure, reload persistence, sessions, metadata confirmation and responsive layouts.
- Genuine fixture screenshots: `docs/evidence/audit-polish/media-before.png`, `media-after.png`, `media-mobile-after.png`. Artwork sources are blocked in these deterministic fixtures; these show real app fallback covers, not generated mockups.
- `tests/control_inventory_browser.cjs`: read-only inventory across all 20 routes, 1,175 controls including 1,046 visible in a fresh desktop workspace. Zero unnamed visible-control candidates and zero page errors. Full details and action attributes are recorded in `docs/evidence/audit-polish/control-inventory.json`.

## Coverage boundaries

The control inventory does not certify every button. It lists rendered controls without blindly activating destructive operations. Modal-only, populated-state and authenticated-provider controls require their separate workflow tests. Accessible names are approximated from labels and attributes, not a screen-reader audit. Delegated event listeners cannot be proven by DOM inspection; the review candidates were traced to existing delegated Calm View and issue-report handlers, and the recipe pagination listener. No Firefox, Safari, physical phone, hosted friend account or live provider availability was tested in this media pass.

The offline title directory remains a partial catalog. Guest labels are local identities; sharing plans creates independent copies rather than live synchronized invitations. The guest choice is intentionally session-only and is not restored after a full page reload.
