/* OPCG Tracker service worker — cache version injected at build time */
const CACHE_VERSION = '__CACHE_VERSION__'
const CACHE_NAME = `opcg-tracker-${CACHE_VERSION}`
const SHELL_CACHE = `opcg-tracker-shell-${CACHE_VERSION}`

const SHELL_ASSETS = ['/manifest.webmanifest', '/favicon.svg', '/pwa-icon.svg']

function isAssetRequest(url) {
  return url.pathname.startsWith('/assets/')
}

function isHtmlRequest(request) {
  return (
    request.mode === 'navigate' ||
    request.headers.get('accept')?.includes('text/html')
  )
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request)
    if (response.ok && cacheName) {
      const cache = await caches.open(cacheName)
      await cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    if (isHtmlRequest(request)) {
      const shell = await caches.match('/index.html')
      if (shell) return shell
    }
    throw new Error('offline')
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await caches.match(request)
  const network = fetch(request)
    .then(async (response) => {
      if (response.ok) await cache.put(request, response.clone())
      return response
    })
    .catch(() => null)

  return cached ?? network ?? fetch(request)
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key !== SHELL_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  if (isHtmlRequest(event.request) || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(networkFirst(event.request, CACHE_NAME))
    return
  }

  if (isAssetRequest(url) || event.request.destination === 'script' || event.request.destination === 'style') {
    event.respondWith(networkFirst(event.request, CACHE_NAME))
    return
  }

  const cacheableDestinations = new Set(['image', 'manifest', 'font'])
  if (cacheableDestinations.has(event.request.destination)) {
    event.respondWith(staleWhileRevalidate(event.request, SHELL_CACHE))
  }
})
