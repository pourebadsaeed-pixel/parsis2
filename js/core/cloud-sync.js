/* ============================================================
   پارسیس — همگام‌سازی ابری دوطرفه و رایگان (✅ v2.1.0)
   مسیر: js/core/cloud-sync.js

   معماری:
     • یک «رله ابری» کوچک روی Cloudflare Workers + D1 (رایگان، بدون وی‌پی‌ان)
       هم اپ را سرو می‌کند و هم داده رمزشده را بین همه نگه می‌دارد.
     • صاحب داده (اپ اندروید یا هر کپی دیگر) هر تغییر را — پس از رمزنگاری
       AES-GCM با کد دسترسی — به رله می‌فرستد و هر ۶ ثانیه تغییرات دیگران
       را می‌گیرد. دوطرفه، لحظه‌ای و آفلاین‌پذیر.
     • هیچ داده‌ای رمزنگاری‌نشده به رله نمی‌رود؛ رله فقط متن رمز ذخیره می‌کند.

   آدرس برای دوستان:
     https://نام-ورکر.sub.workers.dev/?space=XXXX&key=YYYY
   ============================================================ */
'use strict';

(function () {

    var CFG_KEY = 'parsisCloudSync';

    /* ---------- ابزار پایه ---------- */
    function _isNative() {
        try {
            return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
        } catch (e) { return false; }
    }

    function _cfg() {
        var c = DB.load(CFG_KEY, null);
        if (!c || typeof c !== 'object') c = { url: '', space: '', key: '', enabled: false, lastRev: 0 };
        if (typeof c.lastRev !== 'number') c.lastRev = 0;
        return c;
    }

    function _saveCfg(c) { DB.save(CFG_KEY, c); }

    function _normUrl(u) {
        u = String(u || '').trim();
        if (!u) return '';
        if (u.indexOf('http') !== 0) u = 'https://' + u;
        return u.replace(/\/+$/, '');
    }

    function _rand(n, digits) {
        var chars = digits ? '0123456789' : 'abcdefghjkmnpqrstuvwxyz23456789';
        var s = '';
        for (var i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)];
        return s;
    }

    /* ---------- رمزنگاری AES-GCM (کلاینت‌محور) ---------- */
    var _keyCache = { sig: '', key: null };

    function _b64enc(bytes) {
        var bin = '';
        for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        return btoa(bin);
    }
    function _b64dec(str) {
        var bin = atob(str);
        var out = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out;
    }

    function _deriveKey(space, key) {
        var sig = space + '::' + key;
        if (_keyCache.sig === sig && _keyCache.key) return Promise.resolve(_keyCache.key);
        var enc = new TextEncoder();
        var material = enc.encode(key + '@' + space + '#parsis');
        var salt = enc.encode('parsis-relay-v1');
        return crypto.subtle.importKey('raw', material, 'PBKDF2', false, ['deriveKey'])
            .then(function (base) {
                return crypto.subtle.deriveKey(
                    { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
                    base,
                    { name: 'AES-GCM', length: 256 },
                    false,
                    ['encrypt', 'decrypt']
                );
            })
            .then(function (k) { _keyCache.sig = sig; _keyCache.key = k; return k; });
    }

    function _encrypt(space, key, obj) {
        return _deriveKey(space, key).then(function (k) {
            var iv = crypto.getRandomValues(new Uint8Array(12));
            var data = new TextEncoder().encode(JSON.stringify(obj));
            return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, k, data)
                .then(function (ct) { return 'penc1.' + _b64enc(iv) + '.' + _b64enc(new Uint8Array(ct)); });
        });
    }

    function _decrypt(space, key, cipher) {
        if (!cipher || String(cipher).indexOf('penc1.') !== 0) return Promise.reject(new Error('bad-cipher'));
        var parts = String(cipher).split('.');
        if (parts.length !== 3) return Promise.reject(new Error('bad-cipher'));
        var iv = _b64dec(parts[1]);
        var ct = _b64dec(parts[2]);
        return _deriveKey(space, key).then(function (k) {
            return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, k, ct);
        }).then(function (plain) {
            return JSON.parse(new TextDecoder().decode(plain));
        });
    }

    /* ---------- وضعیت موتور ---------- */
    var MODE = 'off';               /* off | peer | relay-client */
    window.__parsisCloudMode = MODE;

    var _lastRev = 0;
    var _space = '', _apiKey = '', _base = '';
    var _pollTimer = null;
    var _pushTimer = null;
    var _pendingPush = {};          /* store -> value */
    var _pushInFlight = false;
    var _pushBackoff = 0;

    var _readyResolve = null;
    var _readyPromise = new Promise(function (r) { _readyResolve = r; });
    window.__parsisCloudClientGet = function () { return _readyPromise; };

    function _setStatus(html) {
        var el = document.getElementById('set-cloud-status');
        if (el) el.innerHTML = html;
        try { console.log('[cloud-sync]', html.replace(/<[^>]+>/g, '')); } catch (e) {}
    }

    function _refreshUI() {
        setTimeout(function () {
            try { if (typeof rerenderCurrentPage === 'function') rerenderCurrentPage(); } catch (e) {}
            try { if (typeof updateHomeWidgets === 'function') updateHomeWidgets(); } catch (e) {}
        }, 80);
        setTimeout(function () {
            try { if (typeof rerenderCurrentPage === 'function') rerenderCurrentPage(); } catch (e) {}
        }, 500);
    }

    /* ---------- تماس با رله ---------- */
    function _api(path, opts) {
        opts = opts || {};
        opts.headers = opts.headers || { 'Content-Type': 'application/json' };
        return fetch(_base + path, opts).then(function (r) {
            if (!r.ok) {
                return r.text().then(function (t) {
                    var msg = 'HTTP ' + r.status;
                    try { var j = JSON.parse(t); if (j && j.error) msg = j.error; } catch (e) {}
                    var err = new Error(msg); err.status = r.status;
                    throw err;
                });
            }
            return r.json();
        });
    }

    /* ============================================================
       پوش تغییرات محلی به رله
       ============================================================ */
    function _queuePush(vals) {
        var keys = Object.keys(vals || {});
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            if (k === CFG_KEY) continue; /* خودِ تنظیمات سینک، سینک نمی‌شود */
            try { JSON.stringify(vals[k]); _pendingPush[k] = vals[k]; } catch (e) {}
        }
        if (_pushTimer) clearTimeout(_pushTimer);
        _pushTimer = setTimeout(_drainPush, 1200);
    }

    function _drainPush() {
        _pushTimer = null;
        if (_pushInFlight) return;
        var names = Object.keys(_pendingPush);
        if (!names.length) return;
        if (MODE === 'off' || !_space || !_apiKey) return;

        _pushInFlight = true;
        var batch = {};
        names.forEach(function (n) { batch[n] = _pendingPush[n]; });

        var encJobs = names.map(function (n) {
            return _encrypt(_space, _apiKey, batch[n]).then(function (c) { return [n, c]; });
        });

        Promise.all(encJobs)
            .then(function (pairs) {
                var stores = {};
                pairs.forEach(function (p) { stores[p[0]] = p[1]; });
                return _api('/api/sync?space=' + encodeURIComponent(_space) + '&key=' + encodeURIComponent(_apiKey), {
                    method: 'POST',
                    body: JSON.stringify({ stores: stores })
                });
            })
            .then(function (res) {
                names.forEach(function (n) { delete _pendingPush[n]; });
                if (res && typeof res.rev === 'number') _lastRev = res.rev;
                _pushBackoff = 0;
                _pushInFlight = false;
                var c = _cfg(); c.lastRev = _lastRev; _saveCfg(c);
                try { console.log('[cloud-sync] ⬆ پوش شد — ' + names.length + ' store, rev=' + _lastRev); } catch (e) {}
            })
            .catch(function (err) {
                _pushInFlight = false;
                _pushBackoff = Math.min((_pushBackoff || 0) + 1, 10);
                try { console.warn('[cloud-sync] پوش ناموفق:', (err && err.message) || err); } catch (e) {}
                /* تلاش دوباره با تاخیر */
                setTimeout(_drainPush, 5000 * _pushBackoff);
            });
    }

    /* ============================================================
       گرفتن تغییرات دور
       ============================================================ */
    function _applySnapshot(snap) {
        if (!snap) return 0;
        _lastRev = (typeof snap.rev === 'number') ? snap.rev : _lastRev;
        var c = _cfg(); c.lastRev = _lastRev; _saveCfg(c);
        var stores = snap.stores || {};
        var names = Object.keys(stores);
        if (!names.length) return 0;

        var jobs = names.map(function (n) {
            return _decrypt(_space, _apiKey, stores[n])
                .then(function (val) { return [n, val]; })
                .catch(function () { return null; });
        });

        return Promise.all(jobs).then(function (pairs) {
            var apply = {};
            pairs.forEach(function (p) { if (p) apply[p[0]] = p[1]; });
            var n = DB._applyRemote(apply);
            if (n > 0) {
                _refreshUI();
                try { console.log('[cloud-sync] ⬇ تغییرات دور اعمال شد — ' + n + ' store'); } catch (e) {}
            }
            return n;
        });
    }

    function _pollOnce() {
        if (MODE === 'off' || !_space || !_apiKey) return Promise.resolve();
        return _api('/api/rev?space=' + encodeURIComponent(_space) + '&key=' + encodeURIComponent(_apiKey))
            .then(function (j) {
                var srvRev = (j && j.rev) || 0;
                if (srvRev === _lastRev) return null;
                /* اول پوش صف خودمان، بعد دریافت — تا داده محلی گم نشود */
                return Promise.resolve(_drainPushAndFlush()).then(function () {
                    return _api('/api/snapshot?space=' + encodeURIComponent(_space) + '&key=' + encodeURIComponent(_apiKey))
                        .then(function (snap) { return _applySnapshot(snap); });
                });
            })
            .catch(function (err) {
                try { console.warn('[cloud-sync] دریافت ناموفق:', (err && err.message) || err); } catch (e) {}
            });
    }

    function _drainPushAndFlush() {
        try { if (typeof DB.flush === 'function') return DB.flush().then(function () { _drainPush(); }); } catch (e) {}
        _drainPush();
        return Promise.resolve();
    }

    function _startPolling() {
        if (_pollTimer) clearInterval(_pollTimer);
        _pollTimer = setInterval(function () {
            try { if (document.visibilityState === 'hidden') return; } catch (e) {}
            _pollOnce();
        }, 6000);
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'visible') _pollOnce();
        });
    }

    /* ============================================================
       قلاب flush دیتابیس — هر ذخیره محلی → صف پوش ابری
       ============================================================ */
    function _installFlushHook() {
        var prev = window.__parsisAfterFlush;
        window.__parsisAfterFlush = function (vals) {
            try {
                if (MODE !== 'off') _queuePush(vals);
            } catch (e) {}
            if (typeof prev === 'function') { try { prev(vals); } catch (e2) {} }
        };
    }

    /* ============================================================
       راه‌اندازی موتور (اپ اندروید / هر کپی محلی با تنظیمات فعال)
       ============================================================ */
    function _startPeer(cfg, silent) {
        _base = _normUrl(cfg.url);
        _space = cfg.space;
        _apiKey = cfg.key;
        _lastRev = cfg.lastRev || 0;
        MODE = 'peer';
        window.__parsisCloudMode = MODE;
        _installFlushHook();

        return _api('/api/rev?space=' + encodeURIComponent(_space) + '&key=' + encodeURIComponent(_apiKey))
            .then(function (j) {
                var srvRev = (j && j.rev) || 0;
                if (srvRev === 0) {
                    /* رله خالی است — کل داده محلی را پوش کن */
                    var all = {};
                    DB.keys().forEach(function (k) {
                        if (k === CFG_KEY) return;
                        var v = DB.load(k, undefined);
                        if (v !== undefined) { try { JSON.stringify(v); all[k] = v; } catch (e) {} }
                    });
                    return Promise.all(Object.keys(all).map(function (n) {
                        return _encrypt(_space, _apiKey, all[n]).then(function (c2) { return [n, c2]; });
                    })).then(function (pairs) {
                        var stores = {};
                        pairs.forEach(function (p) { stores[p[0]] = p[1]; });
                        return _api('/api/sync?space=' + encodeURIComponent(_space) + '&key=' + encodeURIComponent(_apiKey), {
                            method: 'POST',
                            body: JSON.stringify({ stores: stores })
                        });
                    }).then(function (res) {
                        if (res && typeof res.rev === 'number') _lastRev = res.rev;
                        var c2 = _cfg(); c2.lastRev = _lastRev; _saveCfg(c2);
                        if (!silent) showToast('☁️ همه داده‌ها روی رله ابری بارگذاری شد');
                    });
                }
                if (srvRev > _lastRev) {
                    return _api('/api/snapshot?space=' + encodeURIComponent(_space) + '&key=' + encodeURIComponent(_apiKey))
                        .then(function (snap) { return _applySnapshot(snap); });
                }
                return null;
            })
            .then(function () {
                _startPolling();
                if (!silent) _setStatus('<span style="color:#059669">✅ همگام‌سازی ابری فعال است (rev=' + _lastRev + ')</span>');
            })
            .catch(function (err) {
                _setStatus('<span style="color:#dc2626">⛔ اتصال به رله ناموفق: ' + ((err && err.message) || err) + '</span>');
            });
    }

    /* ============================================================
       حالت کلاینت رله — مرورگری که اپ را از خود رله باز کرده
       ============================================================ */
    function _detectRelay() {
        return fetch('/api/ping', { cache: 'no-store' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (j) { return !!(j && j.ok && j.app); })
            .catch(function () { return false; });
    }

    function _getUrlParams() {
        try {
            var sp = (location.search || '').match(/[?&]space=([^&]+)/);
            var ky = (location.search || '').match(/[?&]key=([^&]+)/);
            if (sp) sessionStorage.setItem('parsis.cloudSpace', decodeURIComponent(sp[1]));
            if (ky) sessionStorage.setItem('parsis.cloudKey', decodeURIComponent(ky[1]));
            return {
                space: sessionStorage.getItem('parsis.cloudSpace') || '',
                key: sessionStorage.getItem('parsis.cloudKey') || ''
            };
        } catch (e) { return { space: '', key: '' }; }
    }

    function _startRelayClient() {
        var p = _getUrlParams();
        var space = p.space, key = p.key;
        if (!space) {
            try { alert('⚠️ لینک ناقص است؛ پارامتر space در آدرس نیست. آدرس کامل را از صاحب نرم‌افزار بگیرید.'); } catch (e) {}
            _readyResolve(true);
            return;
        }
        if (!key) {
            try { key = window.prompt('🔑 کد دسترسی همگام‌سازی ابری را وارد کنید:', '') || ''; } catch (e) { key = ''; }
        }
        if (!key) { _readyResolve(true); return; }

        _base = ''; /* همان origin جاری */
        _space = space;
        _apiKey = key;
        MODE = 'relay-client';
        window.__parsisCloudMode = MODE;
        _installFlushHook();

        _api('/api/snapshot?space=' + encodeURIComponent(_space) + '&key=' + encodeURIComponent(_apiKey))
            .then(function (snap) { return _applySnapshot(snap); })
            .then(function () {
                _refreshUI();
                _startPolling();
                try { showToast('☁️ متصل به همگام‌سازی ابری — داده‌ها زنده دوطرفه سینک می‌شود'); } catch (e) {}
            })
            .catch(function (err) {
                try { showToast('⛔ اتصال ابری ناموفق: ' + ((err && err.message) || err)); } catch (e2) {}
            })
            .then(function () { _readyResolve(true); });
    }

    /* ============================================================
       انتشار اپ روی رله (دکمه در تنظیمات)
       ============================================================ */
    var APP_FILES_STATIC = [
        './index.html', './offline.html', './manifest.json', './sw.js',
        './vendor/xlsx.full.min.js',
        './css/base.css', './css/layout.css', './css/components.css', './css/calendar.css',
        './icon-192.png', './icon-512.png',
        './icons/icon-72x72.png', './icons/icon-96x96.png', './icons/icon-128x128.png', './icons/icon-144x144.png',
        './icons/icon-152x152.png', './icons/icon-192x192.png', './icons/icon-384x384.png', './icons/icon-512x512.png'
    ];

    /* فایل‌های js — از ماژول‌های ثبت‌شده + فهرست ثابت */
    var APP_JS_FILES = [
        './js/app.js',
        './js/core/calendar-popup.js', './js/core/constants.js', './js/core/db.js', './js/core/hide.js',
        './js/core/lan-sync.js', './js/core/cloud-sync.js', './js/core/permissions.js',
        './js/core/lookups.js', './js/core/native-bridge.js', './js/core/password.js',
        './js/core/router.js', './js/core/state.js', './js/core/utils.js',
        './js/ui/toast.js', './js/ui/nav.js', './js/ui/theme.js', './js/ui/table.js',
        './js/ui/form.js', './js/ui/time-picker.js', './js/ui/share.js', './js/ui/observers.js',
        './js/modules/accounts/fiscal.js', './js/modules/accounts/chart.js', './js/modules/persons.js',
        './js/modules/accounts/companies.js', './js/modules/accounts/banks.js', './js/modules/accounts/cashboxes.js',
        './js/modules/accounts/projects.js', './js/modules/accounts/templates.js',
        './js/modules/vouchers/form.js', './js/modules/vouchers/list.js', './js/modules/vouchers/estimates.js',
        './js/modules/vouchers/sources.js', './js/modules/vouchers/facilities.js', './js/modules/voucher-photos.js',
        './js/modules/reports/cashflow.js', './js/modules/reports/account.js', './js/modules/reports/ledger.js',
        './js/modules/reports/trial.js', './js/modules/reports/facility.js', './js/modules/reports/rates.js',
        './js/modules/dashboard.js', './js/modules/widgets.js', './js/modules/reminders.js',
        './js/modules/native-widgets.js', './js/modules/calendar.js',
        './js/modules/notes.js', './js/modules/sms.js', './js/modules/phonebook.js', './js/modules/ai.js',
        './js/modules/welcome.js', './js/modules/backup.js', './js/modules/fix-sidebar.js',
        './js/modules/scan.js', './js/modules/users.js', './js/modules/user-perms.js', './js/modules/auth.js'
    ];

    function _fileMime(path) {
        var p = path.toLowerCase();
        if (p.endsWith('.html') || p.endsWith('.htm')) return 'text/html; charset=utf-8';
        if (p.endsWith('.js')) return 'application/javascript; charset=utf-8';
        if (p.endsWith('.css')) return 'text/css; charset=utf-8';
        if (p.endsWith('.json') || p.endsWith('.webmanifest')) return 'application/json; charset=utf-8';
        if (p.endsWith('.png')) return 'image/png';
        if (p.endsWith('.jpg') || p.endsWith('.jpeg')) return 'image/jpeg';
        if (p.endsWith('.svg')) return 'image/svg+xml';
        if (p.endsWith('.woff2')) return 'font/woff2';
        if (p.endsWith('.woff')) return 'font/woff';
        if (p.endsWith('.ttf')) return 'font/ttf';
        if (p.endsWith('.ico')) return 'image/x-icon';
        return 'application/octet-stream';
    }

    function _blobToB64(blob) {
        return new Promise(function (resolve, reject) {
            var fr = new FileReader();
            fr.onloadend = function () {
                var s = String(fr.result || '');
                resolve(s.indexOf(',') !== -1 ? s.split(',')[1] : s);
            };
            fr.onerror = reject;
            fr.readAsDataURL(blob);
        });
    }

    function publishApp(onProgress) {
        var cfg = _cfg();
        var base = _normUrl(cfg.url), space = cfg.space, key = cfg.key;
        if (!base || !space || !key) return Promise.reject(new Error('ابتدا آدرس رله، فضای کاری و کد دسترسی را کامل کنید'));
        _base = base; _space = space; _apiKey = key; /* مستقل از صفحه تنظیمات هم درست کار کند */
        var pubUrl = '/api/publish?space=' + encodeURIComponent(space) + '&key=' + encodeURIComponent(key);

        var files = APP_FILES_STATIC.concat(APP_JS_FILES);
        /* افزودن فایل‌های داخل PRECACHE سرویس‌ورکر که در فهرست بالا نیستند */
        return fetch('./sw.js', { cache: 'no-store' }).then(function (r) { return r.text(); }).then(function (txt) {
            try {
                var m = txt.match(/PRECACHE_ASSETS\s*=\s*\[([\s\S]*?)\]/);
                if (m) {
                    var arr = m[1].match(/'[^']+'|"[^"]+"/g) || [];
                    arr.forEach(function (q) {
                        var p = q.slice(1, -1);
                        if (p && p !== './' && files.indexOf(p) === -1) files.push(p);
                    });
                }
            } catch (e) {}

            var total = files.length;
            var got = [];          /* {path, mime, b64, size} */
            var failedFetch = [];
            var failedPost = [];
            var okCount = 0;
            var fi = 0;
            var PAR = 4;           /* دریافت همزمان ۴ فایل */

            /* فاز الف — خواندن همه فایل‌ها از مبدا (شکست هر فایل بقیه را نمی‌بندد) */
            function fetchNext() {
                var batch = [];
                while (batch.length < PAR && fi < total) { batch.push(files[fi]); fi++; }
                if (!batch.length) return Promise.resolve();
                return Promise.all(batch.map(function (p) {
                    return fetch(p, { cache: 'no-store' }).then(function (r) {
                        if (!r.ok) throw new Error('fetch ' + p + ' -> ' + r.status);
                        var mime = r.headers.get('content-type') || _fileMime(p);
                        return r.blob().then(function (b) {
                            return _blobToB64(b).then(function (b64) {
                                got.push({ path: p, mime: mime, b64: b64, size: b.size });
                            });
                        });
                    }).catch(function () { failedFetch.push(p); });
                })).then(fetchNext);
            }

            /* فاز ب — آپلود با تلاش مجدد (شکست یک دسته زنجیره را نمی‌بندد) */
            function uploadGroup(group, attempt) {
                attempt = attempt || 1;
                var payload = {};
                group.forEach(function (f) { payload[f.path] = { mime: f.mime, b64: f.b64 }; });
                return _api(pubUrl, { method: 'POST', body: JSON.stringify({ files: payload }) }).then(function () {
                    okCount += group.length;
                }).catch(function () {
                    if (attempt < 4) {
                        return new Promise(function (res) { setTimeout(res, 900 * attempt); })
                            .then(function () { return uploadGroup(group, attempt + 1); });
                    }
                    group.forEach(function (f) { failedPost.push(f.path); });
                });
            }

            function report() {
                if (typeof onProgress === 'function') {
                    var done = Math.min(okCount + failedPost.length + failedFetch.length, total);
                    try { onProgress(done, total); } catch (e) {}
                }
            }

            /* فاز ج — گروه‌بندی: فایل‌های بزرگ (بیش از ~۳۵۰ کیلوبایت) تنها می‌روند
               تا شکستشان بقیه را متوقف نکند؛ بقیه دسته‌های ۳تایی، کوچک‌ها اول */
            function uploadAll() {
                var BIG = 350 * 1024, CHUNK = 3;
                var groups = [], cur = [];
                got.sort(function (a, b) { return a.size - b.size; });
                got.forEach(function (f) {
                    if (f.size > BIG) {
                        if (cur.length) { groups.push(cur); cur = []; }
                        groups.push([f]);
                    } else {
                        cur.push(f);
                        if (cur.length >= CHUNK) { groups.push(cur); cur = []; }
                    }
                });
                if (cur.length) groups.push(cur);

                var gi = 0;
                function gnext() {
                    if (gi >= groups.length) return Promise.resolve();
                    var g = groups[gi]; gi++;
                    /* v2.2.1 — مکث کوتاه بین دسته‌ها؛ فشار روی وای‌فای موبایل کمتر می‌شود */
                    return uploadGroup(g).then(function () {
                        report();
                        return new Promise(function (res) { setTimeout(res, 250); }).then(gnext);
                    });
                }
                return gnext();
            }

            return fetchNext().then(uploadAll).then(function () {
                return {
                    ok: okCount,
                    failed: failedFetch.length + failedPost.length,
                    total: total,
                    failedList: failedFetch.concat(failedPost)
                };
            });
        });
    }

    /* انتشار کمکی برای ویزارد — همان publishApp با تنظیم _base قبلی */
    function _apiPub(url, c) {
        return publishApp(function (done, total) {
            var pct = total ? Math.round(done * 100 / total) : 0;
            _setStatus('<span style="color:#059669">✅ ۱/۳ متصل شد</span> <span style="color:#b45309">— ⏳ ۲/۳ انتشار اپ… ' + toFa(pct) + '٪ (صفحه را باز نگه دار)</span>');
        });
    }

    /* ============================================================
       رابط تنظیمات — «☁️ همگام‌سازی ابری رایگان»
       ============================================================ */
    function _setVal(id, v) { var el = document.getElementById(id); if (el) el.value = v || ''; }

    function _getVal(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }

    function _wireSettings() {
        var cfg = _cfg();
        _setVal('set-cloud-url', cfg.url);
        _setVal('set-cloud-space', cfg.space);
        _setVal('set-cloud-key', cfg.key);
        _setVal('set-cloud-link', (cfg.url && cfg.space && cfg.key)
            ? (_normUrl(cfg.url) + '/?space=' + cfg.space + '&key=' + cfg.key) : '');
        var cb = document.getElementById('set-cloud-enabled');
        if (cb) cb.checked = cfg.enabled === true;
        if (cfg.enabled && MODE === 'peer') {
            _setStatus('<span style="color:#059669">✅ فعال است — rev=' + _lastRev + '</span>');
        }

        /* ⚡ v2.2.0 — ویزارد خودکار: ۱ اتصال ← ۲ انتشار ← ۳ فعال‌سازی، همه با یک دکمه */
        var btnWizard = document.getElementById('set-cloud-wizard');
        if (btnWizard && !btnWizard.dataset.bound) {
            btnWizard.dataset.bound = '1';
            btnWizard.onclick = function () {
                var url = _normUrl(_getVal('set-cloud-url'));
                if (!url) {
                    showToast('⚠️ اول آدرس رله را در «تنظیمات دستی» وارد کنید');
                    _setStatus('<span style="color:#dc2626">⛔ قدم ۱ ناقص: آدرس رله خالی است</span>');
                    return;
                }
                btnWizard.disabled = true;
                var c = _cfg();
                c.url = url;
                if (!c.space) c.space = 'p' + _rand(7);
                if (!c.key) c.key = _rand(6, true);
                _saveCfg(c);
                _setVal('set-cloud-space', c.space);
                _setVal('set-cloud-key', c.key);
                _setVal('set-cloud-link', url + '/?space=' + c.space + '&key=' + c.key);
                _base = url; _space = c.space; _apiKey = c.key;

                _setStatus('<span style="color:#b45309">⏳ ۱/۳ — اتصال به رله و ساخت کد…</span>');
                fetch(url + '/api/ping', { cache: 'no-store' })
                    .then(function (r) { return r.json(); })
                    .then(function (j) {
                        if (!j || !j.ok) throw new Error('پاسخ رله معتبر نیست');
                        /* ⚡ v2.2.1 — اگر اپ از قبل روی رله منتشر شده، از انتشار دوباره می‌پریم.
                           همین مرحله روی اینترنت موبایل اغلب می‌شکست، در حالی که رله از قبل اپ کامل را دارد. */
                        if (j.app === true) {
                            _setStatus('<span style="color:#059669">✅ ۱/۳ متصل شد — ✅ ۲/۳ اپ روی رله از قبل آماده است (انتشار دوباره لازم نبود، رد شد)</span> <span style="color:#b45309">— ⏳ ۳/۳ فعال‌سازی و هم‌ترازسازی داده‌ها…</span>');
                            try { showToast('💡 اگر قبلاً داده روی رله داشته‌ای، همان «کد فضا» و «کد دسترسی» قبلی را در کادرها وارد کن تا داده قدیمی برگردد'); } catch (e0) {}
                            c.enabled = true;
                            _saveCfg(c);
                            var cbx0 = document.getElementById('set-cloud-enabled');
                            if (cbx0) cbx0.checked = true;
                            return _startPeer(c, false).then(function () { return { skipped: true }; });
                        }
                        _setStatus('<span style="color:#059669">✅ ۱/۳ متصل شد</span> <span style="color:#b45309">— ⏳ ۲/۳ انتشار اپ روی رله… (چند دقیقه؛ صفحه را باز نگه دار)</span>');
                        return _apiPub(url, c);
                    })
                    .then(function (r) {
                        if (r && r.skipped) return null;
                        if (!r || r.ok === 0 || r.failed > 0) {
                            var msg = (r && r.ok > 0)
                                ? ('انتشار ناقص بود: ' + r.ok + ' از ' + r.total + ' فایل رفت')
                                : 'هیچ فایلی آپلود نشد';
                            btnWizard.disabled = false;
                            _setStatus('<span style="color:#dc2626">⚠️ ۲/۳ ' + msg + '. اینترنت (وای‌فای) را بررسی و دوباره ⚡ را بزن — تکرار بی‌خطر است.<br>💡 اگر اپ قبلاً یک‌بار روی رله منتشر شده، لازم نیست دوباره منتشر شود؛ از دکمه «اتصال و ساخت کد» و بعد تیک «فعال‌سازی همگام‌سازی» استفاده کن.</span>');
                            return null;
                        }
                        _setStatus('<span style="color:#059669">✅ ۲/۳ اپ کامل منتشر شد (' + r.ok + ' فایل)</span> <span style="color:#b45309">— ⏳ ۳/۳ فعال‌سازی و ارسال داده‌ها…</span>');
                        c.enabled = true;
                        _saveCfg(c);
                        var cbx = document.getElementById('set-cloud-enabled');
                        if (cbx) cbx.checked = true;
                        return _startPeer(c, false);
                    })
                    .then(function () {
                        btnWizard.disabled = false;
                    })
                    .catch(function (err) {
                        btnWizard.disabled = false;
                        _setStatus('<span style="color:#dc2626">⛔ راه‌اندازی خودکار متوقف شد: ' + ((err && err.message) || err) + '<br>آدرس رله و اینترنت را بررسی کنید و دوباره ⚡ را بزنید.</span>');
                    });
            };
        }


        var btnConnect = document.getElementById('set-cloud-connect');
        if (btnConnect) btnConnect.onclick = function () {
            var url = _normUrl(_getVal('set-cloud-url'));
            if (!url) { showToast('⚠️ آدرس رله را وارد کنید'); return; }
            var c = _cfg();
            c.url = url;
            if (!_getVal('set-cloud-space')) c.space = 'p' + _rand(7);
            if (!_getVal('set-cloud-key')) c.key = _rand(6, true);
            _saveCfg(c);
            _setVal('set-cloud-space', c.space);
            _setVal('set-cloud-key', c.key);
            _setVal('set-cloud-link', url + '/?space=' + c.space + '&key=' + c.key);
            _setStatus('<span style="color:#b45309">⏳ در حال تست اتصال…</span>');
            fetch(url + '/api/ping', { cache: 'no-store' })
                .then(function (r) { return r.json(); })
                .then(function (j) {
                    if (j && j.ok) {
                        _setStatus('<span style="color:#059669">✅ رله در دسترس است' + (j.app ? ' — اپ روی رله منتشر شده' : ' — هنوز اپ را منتشر کنید') + '</span>');
                        showToast('✅ اتصال به رله برقرار شد');
                    } else {
                        _setStatus('<span style="color:#dc2626">⛔ پاسخ رله معتبر نیست — کد Worker را درست منتشر کرده‌اید؟</span>');
                    }
                })
                .catch(function (err) {
                    _setStatus('<span style="color:#dc2626">⛔ رله در دسترس نیست: ' + ((err && err.message) || err) + '<br>آدرس و انتشار Worker را بررسی کنید.</span>');
                });
        };

        var btnPublish = document.getElementById('set-cloud-publish');
        if (btnPublish) btnPublish.onclick = function () {
            var c = _cfg();
            c.url = _normUrl(_getVal('set-cloud-url'));
            c.space = _getVal('set-cloud-space') || c.space;
            c.key = _getVal('set-cloud-key') || c.key;
            _saveCfg(c);
            if (!c.url || !c.space || !c.key) { showToast('⚠️ اول اتصال را کامل کنید'); return; }
            _base = c.url; _space = c.space; _apiKey = c.key;
            _setStatus('<span style="color:#b45309">⏳ انتشار اپ روی رله… ۰٪</span>');
            btnPublish.disabled = true;
            publishApp(function (done, total) {
                var pct = total ? Math.round(done * 100 / total) : 0;
                _setStatus('<span style="color:#b45309">⏳ انتشار اپ روی رله… ' + toFa(pct) + '٪</span>');
            }).then(function (r) {
                btnPublish.disabled = false;
                if (r && r.ok > 0 && r.failed === 0) {
                    _setStatus('<span style="color:#059669">✅ اپ کامل منتشر شد (' + toFa(r.ok) + ' فایل از ' + toFa(r.total) + ').<br>لینک دوستان آماده است.</span>');
                    showToast('☁️ اپ روی رله منتشر شد');
                } else if (r && r.ok > 0) {
                    _setStatus('<span style="color:#dc2626">⚠️ انتشار ناقص بود: ' + toFa(r.ok) + ' از ' + toFa(r.total) + ' فایل رفت.<br>' + toFa(r.failed) + ' فایل جا افتاد: ' + (r.failedList || []).slice(0, 4).join(' ، ') + '…<br>اینترنت را یک‌بار تازه کنید و دکمه انتشار را دوباره بزنید (تکرار بی‌خطر است).</span>');
                    showToast('⚠️ انتشار ناقص — دوباره تلاش کنید');
                } else {
                    _setStatus('<span style="color:#dc2626">⛔ انتشار ناموفق بود — اتصال و کد دسترسی را بررسی کنید</span>');
                }
            }).catch(function (err) {
                btnPublish.disabled = false;
                _setStatus('<span style="color:#dc2626">⛔ خطای انتشار: ' + ((err && err.message) || err) + '</span>');
            });
        };

        var cbEnabled = document.getElementById('set-cloud-enabled');
        if (cbEnabled && !cbEnabled.dataset.bound) {
            cbEnabled.dataset.bound = '1';
            cbEnabled.onchange = function () {
                var c = _cfg();
                c.url = _normUrl(_getVal('set-cloud-url'));
                c.space = _getVal('set-cloud-space');
                c.key = _getVal('set-cloud-key');
                c.enabled = cbEnabled.checked;
                _saveCfg(c);
                if (c.enabled) {
                    if (!c.url || !c.space || !c.key) {
                        showToast('⚠️ اول اتصال را کامل و اپ را منتشر کنید');
                        cbEnabled.checked = false;
                        c.enabled = false; _saveCfg(c);
                        return;
                    }
                    showToast('☁️ همگام‌سازی ابری فعال شد');
                    _startPeer(c, false);
                } else {
                    MODE = 'off';
                    window.__parsisCloudMode = MODE;
                    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
                    _setStatus('<span style="color:#64748b">خاموش</span>');
                    showToast('⏸ همگام‌سازی ابری خاموش شد');
                }
            };
        }

        var btnCopy = document.getElementById('set-cloud-copy');
        if (btnCopy) btnCopy.onclick = function () {
            var inp = document.getElementById('set-cloud-link');
            var text = inp ? inp.value : '';
            if (!text) { showToast('لینکی ساخته نشده — اول اتصال را کامل کنید'); return; }
            function done() { showToast('📋 لینک دوستان کپی شد'); }
            try {
                var P = (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Parsis) || null;
                if (P && typeof P.writeClipboard === 'function') P.writeClipboard({ text: text }).then(done, function () {});
                else if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () {});
            } catch (e) {}
        };

        var btnNewKey = document.getElementById('set-cloud-newkey');
        if (btnNewKey) btnNewKey.onclick = function () {
            var c = _cfg();
            c.key = _rand(6, true);
            c.lastRev = 0;
            _saveCfg(c);
            _setVal('set-cloud-key', c.key);
            _setVal('set-cloud-link', (_normUrl(c.url)) + '/?space=' + c.space + '&key=' + c.key);
            showToast('🔑 کد دسترسی جدید ساخته شد — دوستان باید با لینک/کد جدید وارد شوند');
        };
    }

    /* ============================================================
       شروع
       ============================================================ */
    function main() {
        if (_isNative()) {
            /* اپ اندروید — اگر فعال باشد موتور peer روشن می‌شود */
            var cfg = _cfg();
            if (cfg.enabled && cfg.url && cfg.space && cfg.key) {
                _startPeer(cfg, true);
            }
            _readyResolve(true);
            setTimeout(_wireSettings, 800);
            return;
        }

        /* مرورگر — آیا این اپ از خود رله سرو شده؟ */
        _detectRelay().then(function (isRelay) {
            if (isRelay) {
                _startRelayClient();
                return;
            }
            /* مرورگر معمولی (کپی محلی) — اگر سینک فعال باشد، موتور peer روشن شود */
            var cfg = _cfg();
            if (cfg.enabled && cfg.url && cfg.space && cfg.key) {
                _startPeer(cfg, true);
            } else {
                _setStatus('<span style="color:#64748b">خاموش</span>');
            }
            _readyResolve(true);
            setTimeout(_wireSettings, 800);
        });
    }

    main();

    window.ParsisCloudSync = {
        publishApp: publishApp,
        status: function () { return { mode: MODE, rev: _lastRev, space: _space }; },
        pollNow: _pollOnce
    };

    console.log('✅ [core/cloud-sync.js] loaded — v2.2.1');

})();
