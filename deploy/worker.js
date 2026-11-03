/* Rowanvale public entry point.
 *
 * The desktop build runs on app/server.js (node:http + node:fs). That process cannot
 * run on Workers, but almost everything it serves is a static file, so this Worker
 * hands those straight to the asset binding and covers only the small differences:
 *
 *  - /api/artwork/resolve  served for real, from a keyless Wikipedia lookup. Without it
 *            every catalogue card fell back to a placeholder, which is what "the art
 *            doesn't load" looked like on the hosted build.
 *  - /api/*  everything else (RAWG metadata, Open Food Facts, local artwork storage)
 *            needs a desktop process with a disk and API keys, so it answers 503 in
 *            the shape the client already handles. Collections, journals and profiles
 *            stay in the browser.
 *  - /sw.js and /version.json must never be served from an HTTP cache, otherwise a
 *    fleet of browsers can pin an old service worker to a new deployment.
 */

import { resolveItems } from './cover-resolver.js';

const NO_STORE_PATHS = new Set(['/sw.js', '/version.json']);

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

function withNoStore(response) {
  const headers = new Headers(response.headers);
  headers.set('cache-control', 'no-store, must-revalidate');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function handleResolve(request) {
  if (request.method !== 'POST') return json(405, { error: 'Use POST for artwork resolution.' });
  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Send a JSON body with an items array.' });
  }
  if (!Array.isArray(body?.items)) return json(400, { error: 'Send a JSON body with an items array.' });
  const results = await resolveItems(body.items);
  return json(200, { results });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/artwork/resolve') return handleResolve(request);

    if (url.pathname.startsWith('/api/')) {
      return json(503, {
        error:
          'Live data services are not part of this public build. Your games, journals and profile stay in this browser.',
        offline: true,
      });
    }

    const response = await env.ASSETS.fetch(request);

    if (NO_STORE_PATHS.has(url.pathname) && response.ok) {
      return withNoStore(response);
    }

    return response;
  },
};
