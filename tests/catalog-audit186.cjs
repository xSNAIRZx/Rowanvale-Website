"use strict";
const fs = require("fs"),
  path = require("path"),
  vm = require("vm");
const root = path.resolve(__dirname, ".."),
  read = (f) => fs.readFileSync(path.join(root, "app", f), "utf8"),
  box = { window: {}, RVTitleIndex: require("../app/title-index186") };
for (const file of [
  "catalog-extra.js",
  "offline-directory182.js",
  "book-starters.js",
])
  vm.runInNewContext(read(file), box, { timeout: 3000 });
const app = read("app.js"),
  start = app.indexOf("const GAMES=["),
  end = app.indexOf("// Merge the bundled offline index", start);
vm.runInNewContext(
  app.slice(start, end) + ";globalThis.baseGames=GAMES;",
  box,
  { timeout: 3000 },
);
const source = read("experience186.js").match(
  /const extraBooks = (\[[\s\S]+?\n  \]);/,
);
if (source) box.window.RV_BOOK_STARTERS.push(...vm.runInNewContext(source[1]));
const norm = (s) =>
  String(s || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
function audit(rows, name) {
  const names = new Map(),
    warnings = [],
    errors = [];
  rows.forEach((x, i) => {
    const title = x.title || x.name || "",
      key = norm(title);
    if (!key || /[\u0000-\u001f]/.test(title))
      errors.push({ index: i, title, reason: "Blank or control characters" });
    if (title !== title.trim() || /\s{2,}/.test(title))
      warnings.push({ index: i, title, reason: "Spacing needs review" });
    if (title.length > 150)
      warnings.push({
        index: i,
        title,
        reason:
          "Title exceeds the shared-library editor limit; do not silently truncate",
      });
    if (!names.has(key)) names.set(key, []);
    names.get(key).push({
      title,
      type: x.type || "",
      year: x.year || 0,
      sourceId: x.sourceId || "",
      author: x.author || "",
    });
  });
  return {
    name,
    count: rows.length,
    uniqueNormalizedTitles: names.size,
    errors,
    warnings,
    sameTitleGroups: [...names.values()].filter((a) => a.length > 1),
    verification:
      "Structural scan of every supplied title. A shared title is not proof of a duplicate: remakes, formats, translations and editions remain distinct. Individual authority checks are limited to sourced additions and the documented sample.",
  };
}
const base = box.baseGames,
  extra = box.window.VYTRON_LOCAL_CATALOG,
  seen = new Set(base.map((x) => String(x.name || "").toLocaleLowerCase())),
  merged = [...base];
for (const x of extra) {
  const key = String(x.name || "")
    .trim()
    .toLocaleLowerCase();
  if (key && !seen.has(key)) {
    merged.push(x);
    seen.add(key);
  }
}
const result = {
  date: new Date().toISOString(),
  catalogs: [
    audit(merged, "Merged games shown by the application"),
    audit(
      box.window.RV_BOOK_STARTERS,
      "Books including three sourced additions",
    ),
    audit(
      box.window.RV_OFFLINE_TITLES,
      "Film, TV and anime structured directory",
    ),
  ],
  rawExtension: {
    count: extra.length,
    alreadyDeduplicatedByExistingMerge:
      extra.length - (merged.length - base.length),
  },
  userData: "No user media records were opened or renamed.",
};
const dest = path.join(require("./evidence-path.cjs").dir, "catalog-title-audit.json");
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(result, null, 2));
for (const c of result.catalogs)
  console.log(
    c.name +
      ": " +
      c.count +
      " titles, " +
      c.errors.length +
      " invalid, " +
      c.warnings.length +
      " review warnings, " +
      c.sameTitleGroups.length +
      " shared-title groups retained.",
  );
if (result.catalogs.some((c) => c.errors.length)) process.exitCode = 1;
