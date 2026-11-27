/* ============================================================
   پارسیس — Service Worker
   مسیر: sw.js
   نسخه: v49

   استراتژی کش:
     • HTML       → Network-First (فوری به‌روز، آفلاین fallback)
     • JS / CSS   → ✅ v2.3.0 Stale-While-Revalidate (پاسخ فوری از کش + به‌روزرسانی پس‌زمینه)
                    ✅ v2.3.3 — همهٔ ماژول‌های JS از index.html با پسوند ?v=نسخه لود می‌شوند؛
                    با هر انتشار جدید آدرس‌ها عوض می‌شوند و کش قدیمی به‌صورت خودکار بی‌اثر می‌شود
                    (دیگر لازم نیست کاربر دو بار رفرش کند تا نسخهٔ جدید JS را ببیند).
     • تصاویر/فونت → Cache-First (با پس‌زمینه-update)
     • API سینک    → همیشه شبکه (بدون کش)
     • CDN خارجی   → Network-First با کش
     • آفلاین      → offline.html

   هر بار که نسخه اپ را آپدیت کردید، CACHE_VERSION را +1 کنید
   تا کاربران نسخه جدید را ببینند.
   ============================================================ */
'use strict';

const CACHE_VERSION = 'v53';
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
    './css/calendar.css',
    './css/theme-v3.css',
    './fonts/vazirmatn-arabic.woff2',
    './fonts/vazirmatn-latin.woff2',
    './js/app.js',
    './js/core/calendar-popup.js',
    './js/core/constants.js',
    './js/core/db.js',
    './js/core/hide.js',
    './js/core/lookups.js',
    './js/core/lan-sync.js',
    './js/core/cloud-sync.js',
    './js/core/permissions.js',
    './js/core/password.js',
    './js/core/router.js',
    './js/core/state.js',
    './js/core/utils.js',
    './js/modules/accounts/banks.js',
    './js/modules/accounts/cashboxes.js',
    './js/modules/accounts/chart.js',
    './js/modules/accounts/companies.js',
    './js/modules/accounts/fiscal.js',
    './js/modules/accounts/projects.js',
    './js/modules/accounts/templates.js',
    './js/modules/ai.js',
    './js/modules/auth.js',
    './js/modules/backup.js',
    './js/modules/calendar.js',
    './js/modules/calendar-events.js',
    './js/modules/calendar-notifications.js',
    './js/modules/calculator.js',
    './js/modules/dashboard.js',
    './js/modules/fix-sidebar.js',
    './js/modules/native-widgets.js',
    './js/modules/notes.js',
    './js/modules/reminders.js',
    './js/modules/voucher-photos.js',
    './js/modules/persons.js',
    './js/modules/phonebook.js',
    './js/modules/purchase-invoices.js',
    './js/modules/purchase-reports.js',
    './js/modules/purchase.js',
    './js/modules/stock.js',
    './js/modules/reports/account.js',
    './js/modules/reports/cashflow.js',
    './js/modules/reports/facility.js',
    './js/modules/reports/ledger.js',
    './js/modules/reports/rates.js',
    './js/modules/reports/trial.js',
    './js/modules/scan.js',
    './js/modules/sms.js',
    './js/modules/users.js',
    './js/modules/user-perms.js',
    './js/modules/vouchers/estimates.js',
    './js/modules/vouchers/facilities.js',
    './js/modules/vouchers/form.js',
    './js/modules/vouchers/list.js',
    './js/modules/vouchers/sources.js',
    './js/modules/welcome.js',
    './js/modules/widgets.js',
    './js/ui/form.js',
    './js/ui/nav.js',
    './js/ui/nav-menu.js',
    './js/ui/observers.js',
    './js/ui/share.js',
    './js/ui/table.js',
    './js/ui/theme.js',
    './js/ui/time-picker.js',
    './js/ui/toast.js',
    './icons/icon-128x128.png',
    './icons/icon-144x144.png',
    './icons/icon-152x152.png',
    './icons/icon-192x192.png',
    './icons/icon-384x384.png',
    './icons/icon-512x512.png',
    './icons/icon-72x72.png',
    './icons/icon-96x96.png',
    './vendor/xlsx.full.min.js',
    './icon-192.png',
    './icon-512.png'
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

    /* ✅ v2.2.0 — API رله همیشه مستقیم از شبکه — هرگز کش نشود (داده زنده بماند) */
    if (url.pathname.indexOf('/api/') === 0) {
        event.respondWith(fetch(req));
        return;
    }

    /* ✅ v2.0.6 — API سینک شبکه (سرور گوشی) همیشه مستقیم از شبکه — بدون کش */
    if (url.pathname.indexOf('/parsis-api/') === 0) {
        event.respondWith(fetch(req));
        return;
    }

    /* فایل‌های خارج از مبدأ (CDN مثل sheetjs) → Network-First با کش */
    if (url.origin !== self.location.origin) {
        event.respondWith(networkFirstWithCache(req));
        return;
    }

    /* فایل‌های JS و CSS → ✅ v2.3.0 Stale-While-Revalidate:
       پاسخ «فوری» از کش می‌آید (سرعت لود بالا روی رله) و همزمان نسخه تازه در پس‌زمینه
       گرفته و کش می‌شود؛ رفرش بعدی صفحه نسخه جدید را می‌بیند */
    if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
        event.respondWith(staleWhileRevalidate(req));
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
   استراتژی ۲: Stale-While-Revalidate (کش اول فوری + تازه‌سازی پس‌زمینه)
   ✅ v2.3.0 — برای JS/CSS
   ============================================================ */
function staleWhileRevalidate(req) {
    return caches.open(CACHE_NAME).then((cache) => {
        return cache.match(req).then((cached) => {
            const fetchPromise = fetch(req)
                .then((res) => {
                    if (res && res.status === 200) {
                        cache.put(req, res.clone());
                    }
                    return res;
                })
                .catch(() => cached);
            return cached || fetchPromise;
        });
    });
}

/* ============================================================
   استراتژی ۳: Cache-First با پس‌زمینه-revalidate
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

console.log('[SW] ✅ service worker ' + CACHE_VERSION + ' بارگذاری شد');
