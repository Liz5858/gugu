const CACHE_NAME = "gugumon-v3"
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./style.css",
  "./utils.js",
  "./main.js",
  "./addition-levels.js",
  "./addition-problems.js",
  "./addition-game.js",
  "./pwa.js",
  "./manifest.json"
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  )
})
