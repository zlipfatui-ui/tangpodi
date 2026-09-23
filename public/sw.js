const CACHE_NAME = 'tang-phor-dee-v2'
const APP_ROOT = new URL('.', self.registration.scope).href
const SHELL = [APP_ROOT, new URL('manifest.webmanifest', APP_ROOT).href, new URL('favicon.svg', APP_ROOT).href]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('tang-phor-dee-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          void caches.open(CACHE_NAME).then((cache) => cache.put(APP_ROOT, copy))
          return response
        })
        .catch(async () => (await caches.match(request)) ?? (await caches.match(APP_ROOT))),
    )
    return
  }

  event.respondWith(
    caches.match(request).then(async (cached) => {
      if (cached) return cached
      const response = await fetch(request)
      if (response.ok) {
        const copy = response.clone()
        void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
      }
      return response
    }),
  )
})
