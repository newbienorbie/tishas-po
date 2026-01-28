// Service Worker for Tisha's PO Extractor
// Enables background processing when app is in background on mobile

const CACHE_NAME = 'tishas-po-v1';
const urlsToCache = [
    '/',
    '/manifest.json'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache if available, otherwise network
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests and API calls
    if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            })
    );
});

// Background Sync for uploads (when back online)
self.addEventListener('sync', (event) => {
    if (event.tag === 'po-upload-sync') {
        event.waitUntil(handleBackgroundSync());
    }
});

async function handleBackgroundSync() {
    // Get pending uploads from IndexedDB if any
    console.log('[SW] Background sync triggered');
}

// Keep-alive for long running operations
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'KEEP_ALIVE') {
        // Respond to keep the service worker active during processing
        event.ports[0].postMessage({ status: 'alive' });
    }

    if (event.data && event.data.type === 'PROCESSING_START') {
        // Track that processing has started
        console.log('[SW] Processing started, staying active');
    }

    if (event.data && event.data.type === 'PROCESSING_END') {
        console.log('[SW] Processing ended');
    }
});
