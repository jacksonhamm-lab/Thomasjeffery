/**
 * Site-wide middleware. Two jobs, both for AI agents and crawlers:
 *
 *  1. Markdown negotiation — a client that asks for `Accept: text/markdown`
 *     gets the plain-text version of the page instead of the styled HTML.
 *     The same file is also reachable directly at `/<page>.md`.
 *  2. Link headers — every HTML page advertises the sitemap, llms.txt, and
 *     its own Markdown alternate, so a crawler finds the structured content
 *     without parsing the page first.
 *
 * The Markdown files live at the repo root next to the HTML (office.html /
 * office.md). Adding a page means adding the .md file and listing the path in
 * MD_PAGES below.
 */

const MD_PAGES = new Set([
  '/',
  '/about',
  '/office',
  '/wedding',
  '/casual',
  '/fall-2026',
  '/outerwear',
  '/brands',
  '/contact',
  '/book',
  '/subscribe',
]);

const SITE = 'https://thomasjeffery.ca';

/** Normalise a request path to the canonical page path used in MD_PAGES. */
function pagePath(pathname) {
  let p = pathname.replace(/\/+$/, '') || '/';
  if (p.endsWith('.html')) p = p.slice(0, -5);
  if (p === '/index') p = '/';
  return p;
}

function mdPathFor(page) {
  return page === '/' ? '/index.md' : `${page}.md`;
}

/**
 * True when the client would rather have Markdown than HTML.
 * Compares q-values so a browser's "text/html,...,*​/*;q=0.8" still gets HTML.
 */
function prefersMarkdown(accept) {
  if (!accept) return false;
  let md = -1;
  let html = -1;
  for (const part of accept.split(',')) {
    const [typeRaw, ...params] = part.trim().split(';');
    const type = typeRaw.trim().toLowerCase();
    let q = 1;
    for (const param of params) {
      const m = /^\s*q=([0-9.]+)\s*$/i.exec(param);
      if (m) q = parseFloat(m[1]);
    }
    if (type === 'text/markdown' || type === 'text/x-markdown') md = Math.max(md, q);
    if (type === 'text/html' || type === 'application/xhtml+xml') html = Math.max(html, q);
  }
  return md > 0 && md >= html;
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) return next();

  const page = pagePath(url.pathname);
  const hasMarkdown = MD_PAGES.has(page);
  const md = mdPathFor(page);

  // 1. Serve Markdown when it's what was asked for.
  if (hasMarkdown && request.method === 'GET' && prefersMarkdown(request.headers.get('Accept'))) {
    const res = await env.ASSETS.fetch(new Request(new URL(md, url.origin), request));
    if (res.ok) {
      const headers = new Headers();
      headers.set('Content-Type', 'text/markdown; charset=utf-8');
      headers.set('Cache-Control', 'public, max-age=3600');
      headers.set('Vary', 'Accept');
      headers.append('Link', `<${SITE}${page}>; rel="canonical"; type="text/html"`);
      headers.append('Link', `<${SITE}/llms.txt>; rel="alternate"; type="text/plain"; title="llms.txt"`);
      return new Response(res.body, { status: 200, headers });
    }
  }

  const response = await next();

  // 2. Advertise the machine-readable versions on every HTML page.
  const type = response.headers.get('Content-Type') || '';
  if (!type.includes('text/html')) return response;

  const out = new Response(response.body, response);
  out.headers.append('Link', `<${SITE}/sitemap.xml>; rel="sitemap"; type="application/xml"`);
  out.headers.append('Link', `<${SITE}/llms.txt>; rel="alternate"; type="text/plain"; title="llms.txt"`);
  if (hasMarkdown) {
    out.headers.append('Link', `<${SITE}${md}>; rel="alternate"; type="text/markdown"; title="Markdown version"`);
    out.headers.set('Vary', 'Accept');
  }
  return out;
}
