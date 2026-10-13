const CACHE = 'parsis2-v1.0.0';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './css/style.css',
    './css/components.css',
    './js/utils.js',
    './js/db.js',
    './js/app.js',
    './js/pages/dashboard.js',
    './js/pages/persons.js',
    './js/pages/products.js',
    './js/pages/accounts.js',
    './js/pages/vouchers.js',
    './js/pages/invoices.js',
    './js/pages/receipts.js',
    './js/pages/reports.js',
    './js/pages/settings.js'
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;
    e.respondWith(
        caches.match(e.request).then(cached => {
            if (cached) return cached;
            return fetch(e.request).then(res => {
                if (res.ok && res.type === 'basic') {
                    const clone = res.clone();
                    caches.open(CACHE).then(c => c.put(e.request, clone));
                }
                return res;
            }).catch(() => {
                if (e.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
