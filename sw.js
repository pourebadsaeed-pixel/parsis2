/* پارسیس — Service Worker (نسخه بهبودیافته برای بروزرسانی خودکار) */
var CACHE_NAME = 'parsis-v12-2025'; // ← تاریخ یا نسخه را هر بار که فایل جدید دادیم، تغییر می‌دهم

var ASSETS = [
  './index.html',
  './manifest.json',
  './offline.html',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/calendar.css',
  './js/core/db.js',
  './js/core/constants.js',
  './js/core/utils.js',
  './js/core/state.js',
  './js/core/router.js',
  './js/core/calendar-popup.js',
  './js/core/hide.js',
  './js/core/lookups.js',
  './js/ui/toast.js',
  './js/ui/nav.js',
  './js/ui/theme.js',
  './js/ui/table.js',
  './js/ui/form.js',
  './js/ui/time-picker.js',
  './js/ui/share.js',
  './js/ui/observers.js',
  './js/modules/accounts/fiscal.js',
  './js/modules/accounts/chart.js',
  './js/modules/persons.js',
  './js/modules/accounts/companies.js',
  './js/modules/accounts/banks.js',
  './js/modules/accounts/cashboxes.js',
  './js/modules/accounts/projects.js',
  './js/modules/accounts/templates.js',
  './js/modules/vouchers/form.js',
  './js/modules/vouchers/list.js',
  './js/modules/vouchers/estimates.js',
  './js/modules/vouchers/sources.js',
  './js/modules/vouchers/facilities.js',
  './js/modules/reports/cashflow.js',
  './js/modules/reports/account.js',
  './js/modules/reports/trial.js',
  './js/modules/reports/facility.js',
  './js/modules/reports/rates.js',
  './js/modules/dashboard.js',
  './js/modules/widgets.js',
  './js/modules/calendar.js',
  './js/modules/notes.js',
  './js/modules/sms.js',
  './js/modules/ai.js',
  './js/modules/scan.js',
  './js/modules/welcome.js',
  './js/modules/backup.js',
  './js/modules/fix-sidebar.js',
  './js/modules/users.js',
  './js/modules/auth.js',
  './js/app.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // ✅ fetch با cache:'reload' = نادیده گرفتن HTTP cache و دریافت تازه از سرور
      return Promise.all(
        ASSETS.map(function (url) {
          return fetch(url, { cache: 'reload' })
            .then(function (res) {
              if (res && res.ok) return cache.put(url, res);
            })
            .catch(function (e) {
              console.warn('[SW] fetch failed for:', url, e);
            });
        })
      );
    }).then(function () {
      return self.skipWaiting(); // فعال‌سازی فوری SW جدید
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (n) { return n !== CACHE_NAME; })
             .map(function (n) {
               console.log('[SW] deleting old cache:', n);
               return caches.delete(n);
             })
      );
    }).then(function () {
      return self.clients.claim(); // کنترل فوری همه تب‌های باز
    })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  var isHTML = event.request.mode === 'navigate'
            || (event.request.headers.get('accept') || '').indexOf('text/html') !== -1
            || url.pathname.endsWith('.html')
            || url.pathname === '/'
            || url.pathname.endsWith('/');

  // HTML: همیشه از شبکه بگیر، کش فقط fallback
  if (isHTML) {
    event.respondWith(
      fetch(event.request).then(function (response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function () {
        return caches.match(event.request).then(function (cached) {
          return cached || caches.match('./offline.html') || caches.match('./index.html');
        });
      })
    );
    return;
  }

  // سایر فایل‌ها: Cache First (برای سرعت)، اما با بررسی دوره‌ای در پس‌زمینه
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      var fetchPromise = fetch(event.request).then(function (response) {
        if (response && response.status === 200 && response.type === 'basic') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function () {
        return cached;
      });
      return cached || fetchPromise;
    })
  );
});

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

console.log('✅ [SW] Registered with CACHE_NAME =', CACHE_NAME);
