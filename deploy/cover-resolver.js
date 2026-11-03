/* Edge-side cover lookup for the public build.
 *
 * The desktop app resolves artwork in app/cover-service1861.js, which needs node:fs for
 * its disk cache and node:crypto for its keys. The browser only consumes the result
 * positionally (results[i] belongs to items[i]) and validates the URL itself, so the
 * hosted build only has to answer one question per title: is there a usable cover image?
 *
 * Source is the same keyless public one the desktop build falls back to - Wikipedia's
 * page image via the MediaWiki API. No key, no account, no storage.
 *
 * Correctness rules, learned the hard way:
 *  - The API only reports free media unless pilicense=any is passed. Box art for
 *    commercial games and films is non-free, so the default silently returned no
 *    thumbnail at all and every card fell back to a placeholder.
 *  - piprop=name is required for pageimage; without it the filename is unknown and the
 *    packaging check has nothing to read.
 *  - Titles must match exactly, hints included, or a redirect from one of our exact
 *    candidates. Comparing stripped titles let "Hades (video game)" accept the article
 *    about the Greek god.
 *  - The image filename must read like packaging, unless the article we matched is the
 *    disambiguated one for this exact work ("Hades (video game)"), whose lead image is
 *    the cover even when the file is just named after the game.
 *  - Lookups run one at a time with backoff, because a 24-item batch tripped 429s.
 *  - A throttled lookup returns state:"error" (the client retries) rather than
 *    state:"missing" (the client caches forever).
 */

const TYPE_HINTS = {
  Game: ['(video game)', ''],
  Movie: ['(film)', ''],
  Show: ['(TV series)', '(television series)', ''],
  Anime: ['(TV series)', '(anime)'],
  Book: ['(novel)', '(book)'],
};

// Images that are legitimately on a page but are not the cover.
const NOT_ART = /logo|wordmark|screenshot|screencap|icon|sprite|banner|cast|premiere|cosplay|map_of|diagram|\.svg$/i;
// ...and the filenames that do look like packaging. "Artwork", steam headers and key art
// are what Wikipedia actually names most game covers.
const ART_NAME =
  /cover|box.?art|key.?art|key.?visual|poster|artwork|steam|game.?art|first.?edition|dust.?jacket|sleeve|title.?page/i;

const norm = (value) =>
  String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    // "Baldur’s Gate 3" and "Baldur's Gate 3" are the same work; the catalogue stores
    // the typographic apostrophe the API never returns.
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[_\s]+/g, ' ')
    .trim();

const compact = (value) => norm(value).replace(/[^\p{L}\p{N}]/gu, '');
const stripQualifier = (value) => String(value || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function candidatesFor(item) {
  const title = String(item?.title || '')
    // Send the straight apostrophe the API recognises; the catalogue stores ’.
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
  if (!title) return [];
  const hints = TYPE_HINTS[item?.type] || [''];
  const year = Number(item?.year) > 1800 ? ` (${Number(item.year)})` : '';
  return [...new Set([...hints.map((h) => (h ? `${title} ${h}` : title)), `${title}${year}`, title])]
    .filter(Boolean)
    .slice(0, 4)
    .map((value) => ({ value, base: title, qualified: value !== title }));
}

function fileStem(name) {
  const file = String(name || '').split('?')[0].split('/').pop() || '';
  return compact(file.replace(/^\d+px-/, '').replace(/\.[a-z0-9]+$/i, ''));
}

function acceptable(page, image, candidate) {
  if (!image?.source) return false;
  const ratio = (image.width || 0) / (image.height || 1);
  if (ratio < 0.4) return false;
  const name = String(page.pageimage || image.source);
  if (NOT_ART.test(name)) return false;
  // Packaging names can be landscape - a Steam header is 2:1 - so a named cover only has
  // to be a sane shape. Anything far wider is a banner or a still.
  if (ART_NAME.test(name)) return ratio <= 2.2;
  if (ratio > 1.3) return false;
  // A file named exactly after the work on that work's own article is its lead art
  // ("Risk_of_Rain_2.jpg"). Equality, not containment: "Persephone_Hades_Vase.jpg" must
  // not pass as artwork for Hades.
  const stem = fileStem(name);
  if (stem.length >= 4 && stem === compact(candidate.base)) return true;
  // A disambiguated article leads with the cover/poster even when the file is simply
  // named after the work.
  if (!candidate.qualified) return false;
  const base = compact(stripQualifier(page.title));
  const wanted = compact(candidate.base);
  return base.length >= 4 && wanted.length >= 2 && (base === wanted || base.startsWith(wanted));
}

// The API accepts many titles per request, and one request per item is what turned a
// 48-card grid into dozens of sequential lookups that tripped the rate limiter.
const CHUNK = 20;

async function lookupMany(values, doFetch, signal) {
  const url =
    'https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1' +
    '&prop=pageimages&piprop=name|thumbnail|original&pithumbsize=640&pilicense=any&titles=' +
    encodeURIComponent(values.join('|'));
  const response = await doFetch(url, {
    signal,
    headers: { 'user-agent': 'Rowanvale/1.0.0 (public web build; artwork lookup)' },
  });
  if (!response.ok) {
    const error = new Error(`Artwork source responded ${response.status}.`);
    error.retryable = response.status === 429 || response.status >= 500;
    const retryAfter = Number(response.headers?.get?.('retry-after'));
    if (Number.isFinite(retryAfter) && retryAfter > 0) error.retryAfter = Math.min(retryAfter * 1000, 3000);
    throw error;
  }
  const body = await response.json();
  const pages = (Array.isArray(body?.query?.pages) ? body.query.pages : []).filter((page) => !page?.missing);
  const redirects = new Map();
  // Title normalization (underscores, case, apostrophes) arrives separately from
  // redirects, and the candidate we asked for is the key we look up by.
  for (const redirect of [...(body?.query?.normalized || []), ...(body?.query?.redirects || [])]) {
    const from = norm(redirect?.from),
      to = norm(redirect?.to);
    if (!from || !to) continue;
    if (!redirects.has(from)) redirects.set(from, new Set());
    redirects.get(from).add(to);
  }
  return { pages, redirects };
}

function ready(page, image) {
  const source = image.source.startsWith('//') ? `https:${image.source}` : image.source;
  const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(String(page.title).replace(/ /g, '_'))}`;
  return {
    state: 'ready',
    artwork: source,
    provider: 'Wikipedia cover/poster',
    sourceUrl: pageUrl,
    fileUrl: pageUrl,
    attribution: 'Cover or poster via Wikipedia. Verify rights before reuse.',
  };
}

export async function resolveItems(items, { doFetch = fetch, signal } = {}) {
  const list = Array.isArray(items) ? items.slice(0, 24) : [];
  const prepared = list.map((item) => ({ candidates: candidatesFor(item) }));
  const titles = [...new Set(prepared.flatMap((row) => row.candidates.map((candidate) => candidate.value)))];
  const pages = new Map();
  const redirects = new Map();
  const throttled = new Set();

  for (let start = 0; start < titles.length; start += CHUNK) {
    const chunk = titles.slice(start, start + CHUNK);
    let attempt = 0;
    let wait = 400;
    for (;;) {
      try {
        const found = await lookupMany(chunk, doFetch, signal);
        for (const page of found.pages) pages.set(norm(page.title), page);
        for (const [from, to] of found.redirects) redirects.set(from, to);
        break;
      } catch (error) {
        if (error?.name === 'AbortError') {
          return list.map(() => ({ state: 'error', reason: 'Lookup cancelled.' }));
        }
        if (!error?.retryable || attempt >= 1) {
          for (const title of chunk) throttled.add(title);
          break;
        }
        attempt += 1;
        await sleep(error.retryAfter || wait);
        wait = Math.min(wait * 2, 2000);
      }
    }
    // Space the chunks out a little so a large catalogue cannot burst the limiter.
    if (start + CHUNK < titles.length) await sleep(120);
  }

  return prepared.map(({ candidates }) => {
    if (!candidates.length) return { state: 'missing', reason: 'No usable title.' };
    let blocked = false;
    for (const candidate of candidates) {
      const wanted = norm(candidate.value);
      const page =
        pages.get(wanted) ||
        [...(redirects.get(wanted) || [])].map((title) => pages.get(title)).find(Boolean);
      if (!page) {
        if (throttled.has(candidate.value)) blocked = true;
        continue;
      }
      const image = page.thumbnail || page.original;
      if (acceptable(page, image, candidate)) return ready(page, image);
    }
    // A throttled candidate may well have had art; report it as retryable so the client
    // does not cache "missing" for it.
    if (blocked) return { state: 'error', reason: 'Artwork source was rate limited.' };
    return { state: 'missing', reason: 'No matching cover found.' };
  });
}
