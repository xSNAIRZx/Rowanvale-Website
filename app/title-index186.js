/* Used only for the bundled game index, never for a person's saved collection. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.RVTitleIndex = factory();
})(globalThis, () => {
  "use strict";
  const norm = (s) =>
    String(s || "")
      .normalize("NFKC")
      .toLocaleLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  function dedupe(input) {
    const out = [],
      groups = new Map();
    for (const raw of input) {
      const x = { ...raw },
        key = (x.type || "Game") + "|" + norm(x.title || x.name),
        candidates = groups.get(key) || [],
        found = candidates.find((i) => {
          const a = out[i];
          return (
            !(a.year && x.year && a.year !== x.year) &&
            !(a.sourceId && x.sourceId && a.sourceId !== x.sourceId) &&
            !(a.edition && x.edition && a.edition !== x.edition)
          );
        });
      if (found !== undefined) {
        const existing = out[found];
        out[found] = {
          ...x,
          ...existing,
          tags: [...new Set([...(existing.tags || []), ...(x.tags || [])])],
        };
      } else {
        candidates.push(out.length);
        groups.set(key, candidates);
        out.push(x);
      }
    }
    return out;
  }
  return { norm, dedupe };
});
