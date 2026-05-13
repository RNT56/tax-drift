const CACHE_VERSION = 'taxswitch-v21';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/symbol-catalog.js',
  '/tax-germany.js',
  '/app-ledger.js',
  '/app-workspace.js',
  '/app-core.js',
  '/app-decision.js',
  '/app-research.js',
  '/app-ui.js',
  '/app.js',
  '/styles.css',
  '/site.webmanifest',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png'
];
const PUBLIC_API_CACHE = new Set([
  'api-status',
  'search-symbols',
  'get-price',
  'get-history',
  'get-fx-rate'
]);
const IMMUTABLE_ASSET_RE = /\/(?:apple-touch-icon|icon-\d+|icon-maskable-\d+)\.png$/;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(SHELL_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k.startsWith('taxswitch-') && k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

function noStoreResponse() {
  return new Response(
    JSON.stringify({ error: 'offline', message: 'This request is unavailable offline.' }),
    { status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
  );
}

function functionName(pathname) {
  const match = pathname.match(/^\/\.netlify\/functions\/([^/?#]+)/);
  return match ? match[1] : '';
}

function cacheablePublicApi(request, url) {
  if (request.headers.has('authorization') || request.headers.has('x-api-key')) return false;
  return PUBLIC_API_CACHE.has(functionName(url.pathname));
}

function shouldCacheResponse(response) {
  const cacheControl = response.headers.get('Cache-Control') || '';
  return response.ok && !/\bno-store\b/i.test(cacheControl);
}

async function networkFirst(request, cacheKey = request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(request);
    if (shouldCacheResponse(response)) cache.put(cacheKey, response.clone());
    return response;
  } catch {
    const cached = await cache.match(cacheKey);
    return cached || noStoreResponse();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (shouldCacheResponse(response)) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/.netlify/functions/')) {
    event.respondWith(
      cacheablePublicApi(event.request, url)
        ? networkFirst(event.request)
        : fetch(event.request).catch(noStoreResponse)
    );
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request, '/index.html'));
    return;
  }

  if (IMMUTABLE_ASSET_RE.test(url.pathname)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  if (['script', 'style', 'worker', 'manifest'].includes(event.request.destination) || url.pathname.endsWith('.html')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});
