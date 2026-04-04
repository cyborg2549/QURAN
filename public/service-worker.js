const CACHE_NAME = 'quran-app-v4';
const AUDIO_CACHE = 'quran-audio-v2';
const DATA_CACHE = 'quran-data-v2';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Noto+Nastaliq+Urdu:wght@400;700&family=Inter:wght@400;500;600&display=swap',
  'https://upload.wikimedia.org/wikipedia/commons/2/27/Basmala.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME && key !== AUDIO_CACHE && key !== DATA_CACHE) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Helper to handle range requests for cached audio
async function handleRangeRequest(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (!cachedResponse) {
    try {
      // For audio files, we want to fetch the full file to cache it properly
      // even if the initial request was a range request.
      const fetchRequest = new Request(request.url, {
        method: 'GET',
        headers: new Headers(request.headers)
      });
      fetchRequest.headers.delete('Range'); // Ensure we get the full file

      const response = await fetch(fetchRequest);
      if (response.ok && response.status === 200) {
        const cloned = response.clone();
        cache.put(request, cloned);
      }
      
      // If the original request was a range request, we need to return a partial response
      const rangeHeader = request.headers.get('Range');
      if (rangeHeader && response.ok && response.status === 200) {
        const arrayBuffer = await response.arrayBuffer();
        const bytes = /^bytes=(\d+)-(\d+)?$/g.exec(rangeHeader);
        if (bytes) {
          const start = parseInt(bytes[1], 10);
          const end = bytes[2] ? parseInt(bytes[2], 10) : arrayBuffer.byteLength - 1;
          return new Response(arrayBuffer.slice(start, end + 1), {
            status: 206,
            statusText: 'Partial Content',
            headers: [
              ['Content-Type', response.headers.get('Content-Type') || 'audio/mpeg'],
              ['Content-Range', `bytes ${start}-${end}/${arrayBuffer.byteLength}`],
            ],
          });
        }
      }
      
      return response;
    } catch (error) {
      console.error("SW Fetch Error:", error);
      return new Response('Offline', { status: 503 });
    }
  }

  const rangeHeader = request.headers.get('Range');
  if (!rangeHeader) return cachedResponse;

  const arrayBuffer = await cachedResponse.arrayBuffer();
  const bytes = /^bytes=(\d+)-(\d+)?$/g.exec(rangeHeader);
  if (bytes) {
    const start = parseInt(bytes[1], 10);
    const end = bytes[2] ? parseInt(bytes[2], 10) : arrayBuffer.byteLength - 1;
    return new Response(arrayBuffer.slice(start, end + 1), {
      status: 206,
      statusText: 'Partial Content',
      headers: [
        ['Content-Type', cachedResponse.headers.get('Content-Type') || 'audio/mpeg'],
        ['Content-Range', `bytes ${start}-${end}/${arrayBuffer.byteLength}`],
      ],
    });
  }

  return cachedResponse;
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Handle Audio Files (Optimized for range requests)
  if (url.pathname.endsWith('.mp3') || url.hostname.includes('cdn.islamic.network') || url.hostname.includes('everyayah.com')) {
    event.respondWith(handleRangeRequest(event.request, AUDIO_CACHE));
    return;
  }

  // 2. Handle API Calls (Stale-While-Revalidate with full offline fallback)
  if (url.hostname.includes('api.alquran.cloud')) {
    event.respondWith(
      caches.open(DATA_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        const networkFetch = fetch(event.request).then((networkResponse) => {
          if (networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => null);

        // If offline, return cached, else try network then fallback to cached
        return cachedResponse || networkFetch;
      })
    );
    return;
  }

  // 3. Static Assets (Cache First)
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});