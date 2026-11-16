/* ============================================================
   پارسیس — Service Worker
   مسیر: sw.js
   نسخه: v18

   استراتژی کش:
     • HTML       → Network-First (فوری به‌روز، آفلاین fallback)
     • JS / CSS   → Network-First (تغییرات فوری دیده می‌شوند)
     • تصاویر/فونت → Cache-First (با پس‌زمینه-update)
     • CDN خارجی   → Network-First با کش
     • آفلاین      → offline.html

   هر بار که نسخه اپ را آپدیت کردید، CACHE_VERSION را +1 کنید
   تا کاربران نسخه جدید را ببینند.
   ============================================================ */
'use strict';

const CACHE_VERSION = 'v18';
const CACHE_NAME    = 'parsis-' + CACHE_VERSION;
const OFFLINE_URL   = './offline.html';

/* فایل‌هایی که در نصب اولیه کش می‌شوند (فقط app shell) */
const PRECACHE_ASSETS = [
    './',
    './index.html',
    './offline.html',
    './manifest.json',
    './css/base.css',
    './css/layout.css',
    './css/components.css',
    './css/calendar.css'
];

/* ============================================================
   INSTALL — نصب و precache
   ============================================================ */
self.addEventListener('install', (event) => {
    console.log('[SW] 📥 نصب نسخه:', CACHE_VERSION);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return Promise.all(
                    PRECACHE_ASSETS.map((url) => {
                        return cache.add(new Request(url, { cache: 'reload' }))
                            .catch((err) => {
                                console.warn('[SW] ⚠️ precache failed:', url, err);
                            });
                    })
                );
            })
            .then(() => {
                console.log('[SW] ✅ precache انجام شد — فعال‌سازی فوری');
                return self.skipWaiting();
            })
    );
});

/* ============================================================
   ACTIVATE — پاک‌سازی کش‌های قدیمی و کنترل کلاینت‌ها
   ============================================================ */
self.addEventListener('activate', (event) => {
    console.log('[SW] 🚀 فعال‌سازی نسخه:', CACHE_VERSION);
    event.waitUntil(
        caches.keys()
            .then((keys) => {
                return Promise.all(
                    keys
                        .filter((key) => key !== CACHE_NAME)
                        .map((key) => {
                            console.log('[SW] 🗑 حذف کش قدیمی:', key);
                            return caches.delete(key);
                        })
                );
            })
            .then(() => {
                console.log('[SW] ✅ کش‌های قدیمی پاک شدند');
                return self.clients.claim();
            })
    );
});

/* ============================================================
   FETCH — استراتژی‌های کش
   ============================================================ */
self.addEventListener('fetch', (event) => {
    const req = event.request;

    /* فقط GET */
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    /* فایل‌های خارج از مبدأ (CDN مثل sheetjs) → Network-First با کش */
    if (url.origin !== self.location.origin) {
        event.respondWith(networkFirstWithCache(req));
        return;
    }

    /* فایل‌های JS و CSS → Network-First (تغییرات فوری) */
    if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
        event.respondWith(networkFirstWithCache(req));
        return;
    }

    /* HTML Navigation → Network-First با fallback به offline */
    if (req.mode === 'navigate' ||
        (req.headers.get('accept') || '').includes('text/html')) {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then((c) => c.put(req, clone));
                    return res;
                })
                .catch(() => {
                    return caches.match(req)
                        .then((cached) => cached || caches.match(OFFLINE_URL))
                        .then((fallback) => fallback || caches.match('./index.html'));
                })
        );
        return;
    }

    /* بقیه (تصاویر، فونت، ...) → Cache-First با پس‌زمینه-revalidate */
    event.respondWith(cacheFirstWithUpdate(req));
});

/* ============================================================
   استراتژی ۱: Network-First (شبکه اول، کش fallback)
   ============================================================ */
function networkFirstWithCache(req) {
    return fetch(req)
        .then((res) => {
            if (res && res.status === 200) {
                const clone = res.clone();
                caches.open(CACHE_NAME).then((c) => c.put(req, clone));
            }
            return res;
        })
        .catch(() => {
            return caches.match(req).then((cached) => {
                if (cached) return cached;
                /* برای JS از دست رفته، بگذار خطا بدهد بهتر از HTML جایگزین */
                return new Response('', { status: 504, statusText: 'Offline' });
            });
        });
}

/* ============================================================
   استراتژی ۲: Cache-First با پس‌زمینه-revalidate
   ============================================================ */
function cacheFirstWithUpdate(req) {
    return caches.match(req).then((cached) => {
        const fetchPromise = fetch(req)
            .then((res) => {
                if (res && res.status === 200) {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then((c) => c.put(req, clone));
                }
                return res;
            })
            .catch(() => cached);
        return cached || fetchPromise;
    });
}

/* ============================================================
   MESSAGE — کنترل از سمت کلاینت
   ============================================================ */
self.addEventListener('message', (event) => {
    if (!event.data) return;

    const type = event.data.type;

    if (type === 'SKIP_WAITING') {
        console.log('[SW] ⏭ SKIP_WAITING دستی');
        self.skipWaiting();
    }

    if (type === 'CLEAR_CACHE') {
        console.log('[SW] 🗑 پاک‌سازی کامل کش');
        caches.keys()
            .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
            .then(() => {
                if (event.source) {
                    event.source.postMessage({ type: 'CACHE_CLEARED' });
                }
            });
    }

    if (type === 'GET_VERSION') {
        if (event.source) {
            event.source.postMessage({
                type: 'VERSION',
                version: CACHE_VERSION,
                cacheName: CACHE_NAME
            });
        }
    }
});

console.log('[SW] ✅ service worker v16 بارگذاری شد');
