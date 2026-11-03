# Beta 19: a library that remembers how you browse

Smart Shelves save the current search, format, status and sort. They re-evaluate the current local library every time they are opened, so newly saved matching titles appear automatically. Up to 20 named shelves are supported, with rename and removal controls. Removing a shelf does not delete any media.

This complements the Fan Lounge's existing hand-picked shelves: those hold explicitly chosen titles; Smart Shelves hold a reusable query. This distinction is explained next to the controls.

Cover grid, Detailed list and Compact list share the same title actions. The chosen view survives a reload and is included in workspace backups. The hero uses less vertical space while keeping Rowanvale's existing visual direction.

The audit also found a cross-format status inconsistency: game records become Wishlist or Backlog during normal loading, while the library's For later filter only recognized Want to Try. For later now includes all three, so games do not disappear from this shelf after reopening the app.

## Data and failure behavior

State is nested under the existing `living184.library19` workspace object. It has `density` and a `smartShelves` array of `{id,name,query,kind,filter,sort}`. Existing workspaces default to the cover grid with no saved queries. No title schema or XP changes are introduced. The module normalizes imported values, bounds lengths/counts and rejects duplicate names on save. Browser quota failures keep the form open and committed shelves unchanged.

The existing full-workspace JSON export/import preserves this nested state. The new browser regression downloads a real JSON backup, clears only the synthetic fixture's library preferences, imports the backup through the actual file input, and verifies that shelves and density return.

## Research

[Valve's official library overview](https://store.steampowered.com/libraryupdate/?l=english) describes dynamic collections that organize titles using saved filters. Rowanvale adapts that useful principle across five formats, entirely on the user's device. No Steam account, connection or network request is required for this feature.

## Verification

- Five Node tests cover defaults, bounds, invalid input, duplicate names/IDs, shelf capacity, JSON round trips and safe rename.
- Twelve browser checks cover creation, reopening after reload, matching new additions, duplicate prevention, rename, storage failures, empty queries, nondestructive removal, actual backup export/import, 3,000-title search, all three densities at 390/768/1440 pixels, and page errors.
- Large-library rendering remains capped at 24 cards until Show more is chosen. Search returned the correct last title in a 3,000-title fixture in roughly 76–117 ms across local runs. This is a local observation, not a cross-device performance guarantee.
- Real screenshots and machine-readable results live under `docs/evidence/19.0.0`. External artwork requests were blocked and automatic covers disabled in the deterministic fixture; screenshots show genuine fallback artwork.

No physical mobile device, screen reader, Safari or Firefox was tested in this feature pass. Full-page browser stitching can misplace fixed chrome; viewport and element screenshots should be used to judge controls.
