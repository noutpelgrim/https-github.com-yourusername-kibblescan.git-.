const CACHE_NAME = 'kibblescan-v8.18';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/scan.html',
    '/registry.html',
    '/access.html',
    '/protocol.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    '/logo.svg'
];

// 1. INSTALL: Cache Core Assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing New Version:', CACHE_NAME);
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching App Shell');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting(); // Activate immediately
});

// 2. ACTIVATE: Cleanup Old Caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[SW] Removing old cache:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim();
});

// 3. FETCH: Intercept Network Requests
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // A. API Requests: Network First, Fallback to Offline JSON
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    // Return a standardized offline JSON response for API calls
                    return new Response(JSON.stringify({
                        error: "Network User Offline",
                        offline: true
                    }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                })
        );
        return;
    }

    // B. Static Assets: Stale-While-Revalidate
    // Serve from cache immediately, then update cache in background
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                // Update cache with new version
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            });

            // Return cached response if available, otherwise wait for network
            return cachedResponse || fetchPromise;
        })
    );
});
