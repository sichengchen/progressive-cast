// Service Worker for Progressive Cast PWA
// This SW handles offline functionality and caching for the podcast app

const isDev =
    self.location.hostname === "localhost" ||
    self.location.hostname === "127.0.0.1";
// In production, this will be replaced by build script with actual version+commit
const VERSION = isDev ? `dev-${Date.now()}` : "__VERSION_PLACEHOLDER__";
const CACHE_NAME = `progressive-cast-v${VERSION}`;
const STATIC_CACHE = `static-${CACHE_NAME}`;
const AUDIO_CACHE = `audio-${CACHE_NAME}`;
const API_CACHE = `api-${CACHE_NAME}`;

// Resources to cache on install
const STATIC_RESOURCES = ["/", "/manifest.json", "/offline.html"];

// Install event - cache static resources
self.addEventListener("install", (event) => {
    console.log("SW: Installing service worker", VERSION);

    event.waitUntil(
        Promise.all([
            // Cache static resources
            caches.open(STATIC_CACHE).then((cache) => {
                console.log("SW: Caching static resources");
                return cache.addAll(STATIC_RESOURCES).catch((error) => {
                    console.warn("SW: Some resources failed to cache:", error);
                    // Try to cache individually
                    return Promise.allSettled(
                        STATIC_RESOURCES.map((url) =>
                            cache
                                .add(url)
                                .catch((e) =>
                                    console.warn("Failed to cache:", url, e)
                                )
                        )
                    );
                });
            }),
            // Cache offline page separately
            fetch("/offline.html")
                .then((response) => {
                    if (response.ok) {
                        return caches
                            .open(STATIC_CACHE)
                            .then((cache) =>
                                cache.put("/offline.html", response)
                            );
                    }
                })
                .catch(() => console.warn("Offline page not found")),
        ])
            .then(() => {
                console.log("SW: Static resources cached");
                // Force activation of new SW in dev mode
                if (isDev) {
                    return self.skipWaiting();
                }
            })
            .catch((error) => {
                console.error("SW: Failed to cache static resources:", error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
    console.log("SW: Activating service worker", VERSION);

    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) => {
                const deletePromises = cacheNames
                    .filter((cacheName) => {
                        // Keep current version caches
                        return (
                            !cacheName.includes(VERSION) &&
                            (cacheName.includes("progressive-cast") ||
                                cacheName.includes("static-") ||
                                cacheName.includes("audio-") ||
                                cacheName.includes("api-"))
                        );
                    })
                    .map((cacheName) => {
                        console.log("SW: Deleting old cache:", cacheName);
                        return caches.delete(cacheName);
                    });

                return Promise.all(deletePromises);
            })
            .then(() => {
                console.log("SW: Old caches cleaned up");
                // Take control of all pages immediately in dev mode
                if (isDev) {
                    return self.clients.claim();
                }
            })
    );
});

// Fetch event - handle network requests
self.addEventListener("fetch", (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Skip non-HTTP requests
    if (!request.url.startsWith("http")) {
        return;
    }

    // Skip requests to other domains
    if (url.origin !== self.location.origin) {
        return;
    }

    // Handle different types of requests
    if (request.url.includes("/api/download")) {
        // Handle download API requests
        event.respondWith(handleDownloadRequest(request));
    } else if (isAudioRequest(request)) {
        // Handle audio file requests
        event.respondWith(handleAudioRequest(request));
    } else if (isAPIRequest(request)) {
        // Handle other API requests
        event.respondWith(handleAPIRequest(request));
    } else if (isStaticResource(request)) {
        // Handle static resources
        event.respondWith(handleStaticRequest(request));
    } else if (isNavigationRequest(request)) {
        // Handle navigation requests (HTML pages)
        event.respondWith(handleNavigationRequest(request));
    }
});

// Handle download API requests
async function handleDownloadRequest(request) {
    try {
        // Always try network first for download requests
        const response = await fetch(request);
        return response;
    } catch (error) {
        console.log("SW: Download request failed:", error);
        return new Response("Offline", { status: 503 });
    }
}

// Handle audio file requests
async function handleAudioRequest(request) {
    const cache = await caches.open(AUDIO_CACHE);

    try {
        // Check cache first for audio files
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            console.log("SW: Serving audio from cache:", request.url);
            return cachedResponse;
        }

        // If not in cache, try network
        const response = await fetch(request);
        if (response.ok) {
            // Cache successful audio responses
            await cache.put(request, response.clone());
            console.log("SW: Audio cached:", request.url);
        }
        return response;
    } catch (error) {
        console.log("SW: Audio request failed:", error);
        return new Response("Audio not available offline", { status: 503 });
    }
}

// Handle API requests (non-download)
async function handleAPIRequest(request) {
    const cache = await caches.open(API_CACHE);

    try {
        // Try network first for API requests
        const response = await fetch(request);
        if (response.ok && request.method === "GET") {
            // Cache successful GET responses
            await cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        // Fallback to cache for GET requests
        if (request.method === "GET") {
            const cachedResponse = await cache.match(request);
            if (cachedResponse) {
                console.log(
                    "SW: Serving API response from cache:",
                    request.url
                );
                return cachedResponse;
            }
        }
        console.log("SW: API request failed:", error);
        return new Response("API not available offline", { status: 503 });
    }
}

// Handle static resource requests
async function handleStaticRequest(request) {
    const cache = await caches.open(STATIC_CACHE);

    try {
        // Check cache first for static resources
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // If not in cache, try network and cache
        const response = await fetch(request);
        if (response.ok) {
            await cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        // Fallback to cache
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        console.log("SW: Static resource failed:", error);
        return new Response("Resource not available offline", { status: 503 });
    }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
    const cache = await caches.open(STATIC_CACHE);

    try {
        // Try network first
        const response = await fetch(request);
        if (response.ok) {
            // Cache successful navigation responses for SPA routes
            await cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.log("SW: Navigation request failed, trying cache:", error);

        // Try to match the exact request first
        let cachedResponse = await cache.match(request);
        if (cachedResponse) {
            console.log("SW: Serving cached navigation:", request.url);
            return cachedResponse;
        }

        // Fallback to root page for SPA routing
        cachedResponse = await cache.match("/");
        if (cachedResponse) {
            console.log("SW: Serving cached root for SPA routing");
            return cachedResponse;
        }

        // Final fallback to offline page
        cachedResponse = await cache.match("/offline.html");
        if (cachedResponse) {
            console.log("SW: Serving offline page");
            return cachedResponse;
        }

        console.error("SW: No cached fallback available");
        return new Response(
            "<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>You are offline</h1><p>This page is not available offline.</p></body></html>",
            {
                status: 200,
                headers: { "Content-Type": "text/html" },
            }
        );
    }
}

// Helper functions
function isAudioRequest(request) {
    const url = request.url.toLowerCase();
    return (
        url.includes(".mp3") ||
        url.includes(".m4a") ||
        url.includes(".ogg") ||
        url.includes(".wav") ||
        url.includes("audio/") ||
        request.headers.get("accept")?.includes("audio/")
    );
}

function isAPIRequest(request) {
    return request.url.includes("/api/");
}

function isStaticResource(request) {
    const url = request.url.toLowerCase();
    return (
        url.includes("/_next/") ||
        url.includes("/static/") ||
        url.includes(".css") ||
        url.includes(".js") ||
        url.includes(".ico") ||
        url.includes(".png") ||
        url.includes(".jpg") ||
        url.includes(".svg") ||
        url.includes("/manifest.json")
    );
}

function isNavigationRequest(request) {
    return (
        request.mode === "navigate" ||
        (request.method === "GET" &&
            request.headers.get("accept")?.includes("text/html"))
    );
}

// Message handling for version updates and cache management
self.addEventListener("message", (event) => {
    const { type, payload } = event.data;

    switch (type) {
        case "SKIP_WAITING":
            self.skipWaiting();
            break;
        case "GET_VERSION":
            event.ports[0].postMessage({ version: VERSION });
            break;
        case "CLEAR_CACHE":
            clearAllCaches().then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;
        case "CACHE_AUDIO":
            cacheAudioFile(payload.url).then((success) => {
                event.ports[0].postMessage({ success });
            });
            break;
        default:
            console.log("SW: Unknown message type:", type);
    }
});

// Clear all caches (useful for dev)
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    const deletePromises = cacheNames.map((name) => caches.delete(name));
    await Promise.all(deletePromises);
    console.log("SW: All caches cleared");
}

// Manually cache an audio file
async function cacheAudioFile(url) {
    try {
        const cache = await caches.open(AUDIO_CACHE);
        const response = await fetch(url);
        if (response.ok) {
            await cache.put(url, response);
            console.log("SW: Audio file cached manually:", url);
            return true;
        }
        return false;
    } catch (error) {
        console.error("SW: Failed to cache audio file:", error);
        return false;
    }
}

console.log("SW: Service Worker script loaded", VERSION);
