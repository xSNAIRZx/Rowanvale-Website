/* Saved query shelves: no network, title copies or separate storage. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RVLibrary19 = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";
  const DENSITIES = ["grid", "list", "compact"],
    KINDS = ["All", "Game", "Movie", "Show", "Anime", "Book"],
    FILTERS = [
      "All",
      "In progress",
      "For later",
      "Paused",
      "Active",
      "Finished",
      "Favorites",
    ],
    SORTS = ["recent", "title", "rating"];
  const text = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : "");
  const criteria = (v) => ({
    query: text(v?.query, 200),
    kind: KINDS.includes(v?.kind) ? v.kind : "All",
    filter: FILTERS.includes(v?.filter) ? v.filter : "All",
    sort: SORTS.includes(v?.sort) ? v.sort : "recent",
  });
  function normalize(v) {
    const seen = new Set(),
      names = new Set(),
      smartShelves = [];
    for (const s of Array.isArray(v?.smartShelves) ? v.smartShelves : []) {
      if (smartShelves.length === 20) break;
      const id = text(s?.id, 80),
        name = text(s?.name, 60);
      if (!id || !name || seen.has(id) || names.has(name.toLocaleLowerCase()))
        continue;
      seen.add(id);
      names.add(name.toLocaleLowerCase());
      smartShelves.push({ id, name, ...criteria(s) });
    }
    return {
      density: DENSITIES.includes(v?.density) ? v.density : "grid",
      smartShelves,
    };
  }
  function save(v, { id, name, ...filters }) {
    const state = normalize(v),
      label = text(name, 60);
    if (!label) throw Error("Give this Smart Shelf a name.");
    if (
      state.smartShelves.some(
        (s) =>
          s.id !== id &&
          s.name.toLocaleLowerCase() === label.toLocaleLowerCase(),
      )
    )
      throw Error("A Smart Shelf already uses that name. Choose another.");
    const existing = state.smartShelves.find((s) => s.id === id);
    if (!existing && state.smartShelves.length >= 20)
      throw Error(
        "You can keep 20 Smart Shelves. Remove one before adding another.",
      );
    if (!text(id, 80)) throw Error("This shelf needs an identifier.");
    const next = { id: text(id, 80), name: label, ...criteria(filters) };
    if (existing)
      state.smartShelves = state.smartShelves.map((s) =>
        s.id === id ? next : s,
      );
    else state.smartShelves.push(next);
    return state;
  }
  return { normalize, criteria, save, DENSITIES };
});
