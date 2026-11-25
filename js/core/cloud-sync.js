/* ============================================================
   پارسیس — همگام‌سازی ابری دوطرفه و رایگان (✅ v2.3.5)
   مسیر: js/core/cloud-sync.js

   معماری:
     • یک «رله ابری» کوچک روی Cloudflare Workers + D1 (رایگان، بدون وی‌پی‌ان)
       هم اپ را سرو می‌کند و هم داده رمزشده را بین همه نگه می‌دارد.
     • صاحب داده (اپ اندروید یا هر کپی دیگر) هر تغییر را — پس از فشرده‌سازی
       gzip و رمزنگاری AES-GCM با کد دسترسی — به رله می‌فرستد و هر ۳ ثانیه
       تغییرات دیگران را می‌گیرد. دوطرفه، لحظه‌ای و آفلاین‌پذیر.
     • هیچ داده‌ای رمزنگاری‌نشده به رله نمی‌رود؛ رله فقط متن رمز ذخیره می‌کند.

   ✅ v2.3.4 — ریشه‌کنی «سینک یک‌طرفهٔ همیشگی»:
     ۱) storeهای بزرگ قبلاً از سقف ۸ مگابایتی ردیف D1 رد می‌شدند → پوش همیشه
        شکست می‌خورد → گاردِ «اگر پوش نشد اسنپ‌شات نگیر» دریافت مرورگر را برای
        همیشه مسدود می‌کرد. حالا: فشرده‌سازی gzip + تکه‌بندی (chunk) خودکار +
        پوشِ ایزولهٔ هر بخش — شکستِ یک بخش، بقیه را نمی‌بندد.
     ۲) دریافت دیگر هیچ‌وقت مسدود نمی‌شود؛ تعارضِ «هر دو دستگاه همان بخش را
        تغییر داده‌اند» با ادغام هوشمند حل می‌شود (آرایه‌ها: اجتماع بدون تکرار).
     ۳) پول ۶ثانیه‌ای ← ۳ ثانیه‌ای + پوش ۳۰۰ms بعد از هر ثبت = سینک در کسری از ثانیه.
     ۴) پیام خطا دقیق نام بخش و علت را می‌گوید؛ دیگر پیام مبهمِ همیشگی نیست.

   ✅ v2.3.5 — ریشه‌کنی «سینک فقط روی مرورگرِ دستگاه خودم»:
     ۱) فرمت رمز سازگار‌با همه: فقط داده‌های خیلی بزرگ (≥۱۲MB) فشرده می‌شوند؛
        همهٔ داده‌های معمولی با قالب قدیمی penc1 رمز می‌شوند تا هر مرورگری —
        حتی Safari/iOS قدیمی بدون DecompressionStream — بتواند بخواند.
     ۲) مهاجرت خودکار فرمت: اگر داده‌ای از نسخهٔ قبل به‌صورت فشرده روی رله باشد،
        اولین دستگاهی که آن را می‌خواند همان را با قالب سازگار دوباره می‌فرستد.
     ۳) به‌روزرسانی خودکار صفحه‌های قدیمی: اگر اپ روی رله جدیدتر از همین صفحه
        باشد، بنر «به‌روزرسانی خودکار تا ۱۰ ثانیه دیگر» می‌آید (با لغو) و کش‌ها
        پاک و صفحه رفرش می‌شود — مرورگر قدیمی دیگر هرگز گیر نمی‌کند.
     ۴) خط وضعیت اثر انگشت فضا و نسخه را نشان می‌دهد تا دو دستگاه قابل مقایسه باشند.

   ✅ v2.3.8 — پایانِ «همش پیغام اینترنت در دسترس نیست میاد»:
     ۱) شکستِ یک‌باره و گذرا دیگر پیام نمی‌دهد؛ پیام فقط از سومین شکستِ پیاپی و
        حداکثر هر ۵–۱۵ دقیقه یک‌بار (هر نوع خطا) نمایش داده می‌شود.
     ۲) قبل از پیام، تستِ واقعیِ ارتباط می‌گیرد: اینترنتِ دستگاه خاموش است، یا
        اینترنت وصل است ولی راهِ سرور باز نمی‌شود (اختلال/فیلترینگ)، یا فقط
        یک لحنِ گذرا بوده — پیام حالا علتِ واقعی را می‌گوید، نه جملهٔ مبهم.
     ۳) مهلتِ ارسال متناسب با حجم داده (۶۰ تا ۲۴۰ ثانیه) — اینترنتِ کند با
        دادهٔ بزرگ دیگر تایم‌اوتِ چرخشی نمی‌شود؛ مهلتِ دریافت هم ۱۲۰ ثانیه.
     ۴) وقتی ارتباط برگشت، پیامِ «✅ برقرار شد» می‌آید تا کاربر مطمئن شود سینک
        دوباره فعال است.

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

    /* ✅ v2.2.2 — نرمال‌سازی ورودی کاربر: ارقام فارسی/عربی → انگلیسی، حذف کاراکترهای نامرئی و فاصله‌ها.
       علت: کاربر ایرانی کد ۶ رقمی را با صفحه‌کلید فارسی تایپ می‌کند (۱۲۳۴۵۶) و هشِ آن با 123456 فرق دارد
       → رله به‌اشتباه bad-key می‌دهد. */
    function _normCode(s) {
        s = String(s || '');
        s = s.replace(/[\u200B\u200C\u200D\u200E\u200F\uFEFF\u00A0]/g, '');
        s = s.replace(/[۰-۹]/g, function (d) { return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)); });
        s = s.replace(/[٠-٩]/g, function (d) { return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)); });
        return s.trim();
    }

    /* ✅ v2.2.2 — ترجمه خطاهای خام رله به پیام قابل‌فهم فارسی */
    function _friendlyErr(err) {
        var m = String((err && err.message) || err || '');
        var s = (err && err.status) || 0;
        if (m.indexOf('bad-key') !== -1) return 'BAD_KEY';
        if (m.indexOf('key-missing') !== -1 || m.indexOf('space-missing') !== -1) return 'CONFIG';
        if (m.indexOf('not-found') !== -1 || s === 404) return 'WORKER';
        if (m.indexOf('Failed to fetch') !== -1 || m.indexOf('NetworkError') !== -1 ||
            m.indexOf('timeout') !== -1 || m.indexOf('aborted') !== -1 || m.indexOf('load failed') !== -1) return 'NET';
        return 'OTHER';
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

    /* ✅ v2.3.4 — فشرده‌سازی gzip قبل از رمزنگاری:
       JSON حسابداری معمولاً ۵ تا ۱۰ برابر کوچک می‌شود؛ دیگر دادهٔ بزرگ به سقف
       ۸ مگابایتی ردیف D1 نمی‌خورد (علیت واقعی «خطای دائمی پوش» و مسدودشدنِ
       همیشگیِ دریافت روی اپ اندروید). اگر مرورگر/وب‌ویو پشتیبانی نکرد، همان متن
       خام رمز می‌شود (prefix قدیمی penc1). */
    function _gzip(str) {
        try {
            if (typeof CompressionStream !== 'function') return Promise.resolve(null);
            var pipe = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'));
            return new Response(pipe).arrayBuffer().then(function (buf) {
                return _b64enc(new Uint8Array(buf));
            });
        } catch (e) { return Promise.resolve(null); }
    }

    function _gunzip(b64) {
        try {
            if (typeof DecompressionStream !== 'function') return Promise.resolve(null);
            var pipe = new Blob([_b64dec(b64)]).stream().pipeThrough(new DecompressionStream('gzip'));
            return new Response(pipe).arrayBuffer().then(function (buf) {
                return new TextDecoder().decode(new Uint8Array(buf));
            });
        } catch (e) { return Promise.resolve(null); }
    }

    function _encrypt(space, key, obj) {
        return _deriveKey(space, key).then(function (k) {
            var plain = JSON.stringify(obj);
            return _gzip(plain).then(function (gz) {
                var data, prefix;
                /* ✅ v2.3.5 — فقط داده‌های خیلی بزرگ فشرده می‌شوند (همان‌هایی که
                   بدون فشرده‌سازی مجبور به تکه‌شدن هستند). داده‌های معمولی با قالب
                   قدیمی penc1 می‌روند تا هر مرورگری — حتی Safari/iOS قدیمی بدون
                   DecompressionStream — بتواند آن‌ها را بخواند. قبلاً همه‌چیز
                   فشرده می‌شد و مرورگرِ بدون DecompressionStream «بی‌صدا» هیچ
                   داده‌ای دریافت نمی‌کرد — علتِ «فقط مرورگر خودم سینک می‌شود». */
                if (gz !== null && plain.length >= GZIP_THRESHOLD && gz.length < plain.length) {
                    data = _b64dec(gz); prefix = 'penc1z.';
                } else {
                    data = new TextEncoder().encode(plain); prefix = 'penc1.';
                }
                var iv = crypto.getRandomValues(new Uint8Array(12));
                return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, k, data)
                    .then(function (ct) { return prefix + _b64enc(iv) + '.' + _b64enc(new Uint8Array(ct)); });
            });
        });
    }

    function _decrypt(space, key, cipher) {
        var s = String(cipher || '');
        var z = (s.indexOf('penc1z.') === 0);
        if (!z && s.indexOf('penc1.') !== 0) return Promise.reject(new Error('bad-cipher'));
        var parts = s.split('.');
        if (parts.length !== 3) return Promise.reject(new Error('bad-cipher'));
        var iv = _b64dec(parts[1]);
        var ct = _b64dec(parts[2]);
        return _deriveKey(space, key).then(function (k) {
            return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, k, ct);
        }).then(function (plain) {
            var bytes = new Uint8Array(plain);
            if (z) {
                return _gunzip(_b64enc(bytes)).then(function (txt) {
                    if (txt === null) throw new Error('no-gunzip');
                    return JSON.parse(txt);
                });
            }
            return JSON.parse(new TextDecoder().decode(bytes));
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
    var _pushRetryTimer = null;     /* ✅ v2.3.0 — تلاش دوباره بعد از آزاد شدن پوش قبلی */
    var _wizardBusy = false;        /* ✅ v2.3.3 — حین ویزارد، وضعیت توسط پول/پوش بازنویسی نشود */
    var _bootApplyDone = false;     /* ✅ v2.3.3 — اولین دریافتِ شروع صفحه اعلان نمی‌گیرد */
    var _lastRemoteToastAt = 0;
    var _verWarned = false;
    var _relayAppVer = null;   /* ✅ v2.3.5 — آخرین نسخهٔ اپِ گزارش‌شده از رله */

    /* ✅ v2.3.4 — تکه‌بندی storeهای بزرگ (chunk):
       سقف اندازهٔ هر ردیف D1 حدود ۸ مگابایت است (تست زندهٔ رله: ۸MB پاس، ۹MB خطای
       SQLITE_TOOBIG). هر تکه ≤۵ مگابایت؛ یک manifest کوچک تعداد تکه‌ها را نگه
       می‌دارد. تکه‌های کهنه با «deletes» پارامتر جدید ورکر پاک می‌شوند. */
    var CHUNK_LIMIT = 5 * 1024 * 1024;
    /* ✅ v2.3.5 — آستانهٔ فشرده‌سازی: دادهٔ رمزشدهٔ بزرگ‌تر از این فقط وقتی gzip
       می‌شود که وگرنه تکه‌تکه خواهد شد؛ داده‌های کوچک‌تر با قالب سازگار penc1
       می‌روند تا همهٔ مرورگرها (ازجمله Safari/iOS قدیمی) بتوانند بخوانند */
    var GZIP_THRESHOLD = 12 * 1024 * 1024;
    var CHUNK_SEP = '#c';
    var MANIFEST_SEP = '#m';
    var PCHK = 'pchk:';
    var _chunkMeta = (function () {
        try { return JSON.parse(localStorage.getItem('parsis.cloudChunks') || '{}') || {}; } catch (e) { return {}; }
    })();
    function _saveChunkMeta() {
        try { localStorage.setItem('parsis.cloudChunks', JSON.stringify(_chunkMeta)); } catch (e) {}
    }

    /* ✅ v2.3.4 — آخرین مقداری که هر store با رله هم‌تراز شده بود (برای تشخیص
       تعارض واقعی) و storeهایی که ارسالشان ممکن نشد (دیگر بی‌وقفه تلاش نمی‌شوند) */
    var _lastSyncVals = {};
    var _sizeBlocked = {};

    /* ✅ v2.3.4 — کش‌های «دستگاه‌محلی»: اصلاً سینک نمی‌شوند؛ قبلاً هر تازه‌سازی
       نرخ‌ها rev را بالا می‌برد و اعلان «داده اضافه شد» بدون تغییر واقعی می‌ساخت */
    var NO_SYNC = {
        'liveRatesCache': 1, 'tgjuRatesCache': 1, 'tgjuRates': 1, 'ratesCache': 1
    };

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

    /* ✅ v2.3.3 — ساعت جاری (برای خط وضعیت) */
    function _clock() {
        var d = new Date();
        function p2(x) { return (x < 10 ? '0' : '') + x; }
        var s = p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds());
        try { return toFa(s); } catch (e) { return s; }
    }

    /* ✅ v2.3.5 — اثر انگشت فضا: هر دو دستگاه که با یک کد دسترسی راه‌اندازی شده
       باشند همین اثر انگشت را می‌بینند؛ متفاوت بودنِ آن یعنی دستگاه دوم در فضای
       دیگری است (کد اشتباه) — نه اینکه سینک خراب است. */
    function _spaceFp(s) {
        try {
            var h = 5381, str = String(s || '');
            for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
            var hex = (h >>> 0).toString(16).toUpperCase();
            return ('00000' + hex).slice(-6);
        } catch (e) { return '??????'; }
    }

    /* ✅ v2.3.3 — خط وضعیت زنده در تنظیمات: کاربر می‌بیند سینک زنده است،
       بدون نیاز به بستن و باز کردن اپ. حین ویزارد بازنویسی نمی‌شود.
       ✅ v2.3.5 — فضا + نسخه هم نمایش داده می‌شوند تا دو دستگاه قابل مقایسه باشند. */
    function _liveStatus(ok, txt) {
        if (_wizardBusy) return;
        if (!ok) return;
        /* ✅ v2.3.4 — اگر بخشی در صف ارسال مانده، کاربر می‌بیند */
        var pend = 0;
        try {
            Object.keys(_pendingPush).forEach(function (n) { if (!_sizeBlocked[n]) pend++; });
        } catch (e) {}
        _setStatus('<span style="color:#059669">✅ همگام‌سازی دوطرفه فعال — ' + txt + ' ' + _clock()
            + ' · فضا: ' + _spaceFp(_space)
            + ' · نسخهٔ این دستگاه: ' + (typeof toFa === 'function' ? toFa(APP_VERSION) : APP_VERSION)
            + (_relayAppVer ? ' · اپ روی رله: ' + (typeof toFa === 'function' ? toFa(_relayAppVer) : _relayAppVer) : '')
            + (pend > 0 ? ' <span style="color:#b45309">(⏳ ' + (typeof toFa === 'function' ? toFa(pend) : pend) + ' بخش در صف ارسال)</span>' : '')
            + '</span>');
    }

    /* ---------- تماس با رله ----------
       ✅ v2.2.2 — تایم‌اوت پیش‌فرض ۲۰ ثانیه؛ ✅ v2.3.4 — هر تماس می‌تواند تایم‌اوت
       خودش را بدهد (پوش تکه‌های بزرگ و اسنپ‌شات حجیم تا ۶۰ ثانیه فرصت دارند) */
    function _api(path, opts) {
        opts = opts || {};
        opts.headers = opts.headers || { 'Content-Type': 'application/json' };
        var ctrl = (typeof AbortController === 'function') ? new AbortController() : null;
        var timer = null;
        if (ctrl && !opts.signal) {
            opts.signal = ctrl.signal;
            timer = setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, (opts.timeout || 20000));
        }
        return fetch(_base + path, opts).then(function (r) {
            if (timer) clearTimeout(timer);
            if (!r.ok) {
                return r.text().then(function (t) {
                    var msg = 'HTTP ' + r.status;
                    try { var j = JSON.parse(t); if (j && j.error) msg = j.error; } catch (e) {}
                    var err = new Error(msg); err.status = r.status;
                    throw err;
                });
            }
            return r.json();
        }).catch(function (e) {
            if (timer) clearTimeout(timer);
            if (e && e.name === 'AbortError') throw new Error('timeout');
            throw e;
        });
    }

    /* ============================================================
       پوش تغییرات محلی به رله
       ============================================================ */
    function _queuePush(vals) {
        var keys = Object.keys(vals || {});
        var queued = false;
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            if (k === CFG_KEY || NO_SYNC[k]) continue; /* تنظیمات سینک و کش‌های محلی سینک نمی‌شوند */
            try { JSON.stringify(vals[k]); _pendingPush[k] = vals[k]; queued = true; } catch (e) {}
        }
        /* ✅ v2.3.4 — ثبتِ فوریِ نام‌های صف در localStorage:
           قبلاً فقط بعد از پوش موفق ذخیره می‌شد؛ اگر پوش شکست می‌خورد و صفحه
           بسته/رفرش می‌شد، نامِ تغییر از صف می‌افتد (dirtyNames هم توسط flush پاک
           شده) و دیگر هرگز فرستاده نمی‌شد — یکی از علت‌های «تغییرات گاه‌به‌گاه گم می‌شود». */
        if (queued) _savePendingNames();
        if (_pushTimer) clearTimeout(_pushTimer);
        _pushTimer = setTimeout(_drainPush, 300);
    }

    /* ✅ v2.3.2 — نامِ storeهای پوش‌نشده در localStorage هم ثبت می‌شود تا
       با بستن/رفرش صفحه از بین نرود و در شروع بعدی دوباره فرستاده شود. */
    function _savePendingNames() {
        try { localStorage.setItem('parsis.cloudPendingNames', JSON.stringify(Object.keys(_pendingPush))); } catch (e) {}
    }

    function _restorePending() {
        var names = [];
        try { names = JSON.parse(localStorage.getItem('parsis.cloudPendingNames') || '[]') || []; } catch (e) { names = []; }
        /* ✅ v2.3.3 — نام‌های «تغییرکردهٔ ماندگار» از db.js هم اضافه می‌شود؛
           حتی اگر تغییر در آخرین لحظهٔ بستن صفحه ثبت شده باشد و فرصتِ ورود
           به صف پوش را نداشته باشد، جلسهٔ بعد قبل از هر دریافتِ رله فرستاده می‌شود */
        try {
            if (typeof DB.pendingNames === 'function') {
                DB.pendingNames().forEach(function (k) {
                    if (names.indexOf(k) === -1) names.push(k);
                });
            }
        } catch (e) {}
        if (!names.length) return 0;
        var n = 0;
        names.forEach(function (k) {
            if (k === CFG_KEY || NO_SYNC[k]) return; /* ✅ v2.3.4 — کش‌های محلی نه */
            try {
                var v = (typeof DB.load === 'function') ? DB.load(k, undefined) : undefined;
                if (v !== undefined) { _pendingPush[k] = v; n++; }
            } catch (e) {}
        });
        if (n) _savePendingNames();
        return n;
    }

    /* ✅ v2.3.4 — طبقه‌بندی دقیق خطا + هشدار نام‌دار:
       قبلاً یک پیام مبهم برای همهٔ خطاها می‌آمد و کاربر نمی‌فهمید مشکل چیست */
    /* ✅ v2.3.8 — تفکیک «کندی/تایم‌اوت» از «قطعِ کاملِ مسیر»:
       قبلاً هر دو یک پیام می‌گرفتند و کاربر فکر می‌کرد اینترنتش کلاً قطع است */
    function _errKind(err) {
        var m = String((err && err.message) || err || '');
        if (m.indexOf('store-too-large') !== -1 || m.indexOf('SQLITE_TOOBIG') !== -1 || (err && err.status === 413)) return 'SIZE';
        if (m.indexOf('bad-key') !== -1 || (err && err.status === 401)) return 'KEY';
        if (m.indexOf('timeout') !== -1 || m.indexOf('aborted') !== -1) return 'TIMEOUT';
        if (m.indexOf('Failed to fetch') !== -1 || m.indexOf('NetworkError') !== -1 ||
            m.indexOf('load failed') !== -1) return 'NET';
        return 'HTTP';
    }

    /* ✅ v2.3.8 — تشخیصِ واقعیِ وضعیتِ ارتباط قبل از نمایش هر پیام:
       OFFLINE = اینترنت دستگاه خاموش است | RELAY_BLOCKED = اینترنت وصل است ولی راهِ رله باز نمی‌شود
       RELAY_OK = مسیر باز است (پس شکست، گذرا بوده). نتیجه ۳۰ ثانیه کش می‌شود تا شبکه شلوغ نشود */
    var _probeAt = 0, _probeVal = '';
    function _connProbe() {
        var st = '';
        try { if (navigator.onLine === false) st = 'OFFLINE'; } catch (e0) {}
        if (st) { _probeAt = Date.now(); _probeVal = st; return Promise.resolve(st); }
        if (_probeVal && Date.now() - _probeAt < 30000) return Promise.resolve(_probeVal);
        return new Promise(function (res) {
            var done = false;
            var fin = function (v) { if (!done) { done = true; _probeAt = Date.now(); _probeVal = v; res(v); } };
            try {
                var ctrl = (typeof AbortController === 'function') ? new AbortController() : null;
                var tm = ctrl ? setTimeout(function () { try { ctrl.abort(); } catch (e1) {} fin('RELAY_BLOCKED'); }, 8000) : null;
                fetch((_base || '') + '/api/ping', { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
                    .then(function (r) { if (tm) clearTimeout(tm); fin(r && r.ok ? 'RELAY_OK' : 'RELAY_BLOCKED'); })
                    .catch(function () { if (tm) clearTimeout(tm); fin('RELAY_BLOCKED'); });
            } catch (e2) { fin('RELAY_BLOCKED'); }
        });
    }

    /* ✅ v2.3.8 — سیاستِ ساکت‌سازی پیام‌های ارسال (پاسخ به «همش پیغام اینترنت در دسترس نیست میاد»):
       • شکستِ یک‌باره و گذرا = هیچ پیامی؛ فقط در کنسول ثبت می‌شود
       • پیام فقط از سومین شکستِ پیاپی به بعد نمایش داده می‌شود (قطعیِ واقعی، نه لرزشِ شبکه)
       • هر نوع خطا حداکثر یک‌بار در ۵ تا ۱۵ دقیقه — دیگر هر دقیقه تکرار نمی‌شود
       • قبل از پیامِ «قطع»، تستِ واقعیِ ارتباط گرفته می‌شود تا علتِ درست اعلام شود
       • به‌محض برقراریِ دوباره، یک پیامِ «✅ برقرار شد» می‌آید و شمارنده‌ها ریست می‌شوند */
    var _netFailStreak = 0, _netWasDown = false;
    var _kindDedupe = {};
    var _DEDUPE_MS = { KEY: 600000, TIMEOUT: 600000, NET: 900000, HTTP: 300000, SIZE: 60000 };
    function _pushFailToast(storeName, err) {
        _netFailStreak++;
        var kind = _errKind(err);
        try { console.warn('[cloud-sync] ارسال ناموفق (' + kind + ') — تلاشِ پیاپیِ شمارهٔ ' + _netFailStreak + ':', (err && err.message) || err); } catch (eL) {}
        var now = Date.now();
        if (now - (_kindDedupe[kind] || 0) < (_DEDUPE_MS[kind] || 300000)) return;
        if (_netFailStreak < 3 && kind !== 'KEY') return;
        try { if (document.visibilityState === 'hidden') return; } catch (eH) {}
        _kindDedupe[kind] = now;
        if (kind === 'KEY') {
            _netWasDown = true;
            try { showToast('⛔ ارسال به ابر ناموفق: کد دسترسی با رله نمی‌خواند (bad-key) — کد را در تنظیمات چک کنید', 6000); } catch (eT1) {}
            return;
        }
        if (kind === 'NET') {
            _connProbe().then(function (st) {
                _netWasDown = true;
                var msg = st === 'OFFLINE'
                    ? '📶 اینترنت دستگاه در دسترس نیست — تغییرات روی همین دستگاه محفوظ است و به‌محض وصل‌شدن خودکار به ابر می‌رود'
                    : st === 'RELAY_BLOCKED'
                    ? '🌐 اینترنت دستگاه وصل است ولی راهِ پایگاه ابری باز نمی‌شود (اختلال یا فیلترینگِ مسیر سرور روی این اپراتور) — وای‌فای یا اپراتورِ دیگر را امتحان کنید؛ داده‌ها محفوظ است و خودکار تلاش می‌شود'
                    : '⚠️ ارتباط با پایگاه ابری لحظه‌ای ناتمام ماند — داده‌ها محفوظ است و تلاش خودکار ادامه دارد';
                try { showToast(msg, 7000); } catch (eT2) {}
            }).catch(function () {});
            return;
        }
        _netWasDown = true;
        var msg2 = kind === 'TIMEOUT'
            ? '🐢 ارسال به‌خاطر کندی اینترنت یا حجمِ زیادِ داده ناتمام ماند — داده‌ها محفوظ است؛ تلاش خودکار با فرصتِ بیشتر ادامه دارد'
            : kind === 'SIZE'
            ? '⛔ ارسال بخش «' + storeName + '» ممکن نشد — حجم بیش از حد مجاز ابر (بقیهٔ بخش‌ها سینک می‌شوند)'
            : '⚠️ سرور ابری موقتاً خطا داد — داده‌ها محفوظ است و تلاش خودکار ادامه دارد';
        try { showToast(msg2, 6000); } catch (eT3) {}
    }

    /* ✅ v2.3.2 — flush دیتابیس + پوش فوری صف (برای شروع صفحه و ترک صفحه) */
    function _flushAndPush() {
        var f = (typeof DB.flush === 'function') ? DB.flush() : Promise.resolve();
        return Promise.resolve(f).then(function () {
            _restorePending();
            return _drainPush();
        }).catch(function () {});
    }

    /* ============================================================
       ✅ v2.3.4 — بسته‌بندی هر store برای ارسال: رمز + فشرده + تکه‌تکه
       خروجی: تکه‌های ≤۵MB + manifest + فهرست تکه‌های کهنه که باید پاک شوند
       ============================================================ */
    function _packStore(name, val) {
        return _encrypt(_space, _apiKey, val).then(function (cipher) {
            var stores = {}, deletes = [];
            var prevCount = _chunkMeta[name] || 0;
            if (cipher.length > CHUNK_LIMIT) {
                var n = Math.ceil(cipher.length / CHUNK_LIMIT);
                for (var i = 0; i < n; i++) stores[name + CHUNK_SEP + i] = cipher.substr(i * CHUNK_LIMIT, CHUNK_LIMIT);
                stores[name + MANIFEST_SEP] = PCHK + n;
                deletes.push(name); /* نسخهٔ خام قدیمی پاک شود */
                for (var j = n; j < prevCount; j++) deletes.push(name + CHUNK_SEP + j);
                _chunkMeta[name] = n;
            } else {
                stores[name] = cipher;
                /* ✅ v2.3.4 — بی‌اثرکردن تکه‌های کهنه روی «هر دو» ورکر:
                   • ورکر جدید: deletes تکه‌ها و manifest را پاک می‌کند.
                   • ورکر قدیمی (deletes را نمی‌شناسد): manifest با pchk:0 بازنویسی
                     می‌شود تا تکه‌های کهنه دیگر «مرجع» نباشند و مقدار خام بُرد کند.
                     (حذفِ نام‌ناموجود بی‌ضرر است) */
                deletes.push(name + MANIFEST_SEP);
                stores[name + MANIFEST_SEP] = PCHK + '0';
                for (var j2 = 0; j2 < prevCount; j2++) deletes.push(name + CHUNK_SEP + j2);
                if (prevCount > 0) delete _chunkMeta[name];
            }
            _saveChunkMeta();
            var bytes = 0;
            Object.keys(stores).forEach(function (k) { bytes += stores[k].length; });
            return { name: name, val: val, stores: stores, deletes: deletes, bytes: bytes };
        });
    }

    /* بازکردن تکه‌ها در اسنپ‌شات دریافتی — هر store تکه‌شده دوباره یک‌پارچه می‌شود
       خروجی: { stores: یک‌پارچه‌شده‌ها, chunks: { نام‌پایه: تعدادتکه } } برای یادگیری متا */
    function _expandSnapshot(stores) {
        var out = {}, parts = {}, manifests = {}, chunkCounts = {};
        Object.keys(stores || {}).forEach(function (k) {
            if (k.length > 2 && k.charAt(k.length - 2) === '#' && k.charAt(k.length - 1) === 'm') {
                manifests[k.slice(0, -2)] = stores[k];
                return;
            }
            var idx = k.lastIndexOf(CHUNK_SEP);
            if (idx !== -1 && /^\d+$/.test(k.slice(idx + 2))) {
                var base = k.slice(0, idx);
                (parts[base] = parts[base] || [])[parseInt(k.slice(idx + 2), 10)] = stores[k];
                return;
            }
            out[k] = stores[k];
        });
        Object.keys(parts).forEach(function (base) {
            var n = null;
            if (manifests[base] && String(manifests[base]).indexOf(PCHK) === 0) {
                n = parseInt(String(manifests[base]).slice(PCHK.length), 10);
            }
            if (n === null || isNaN(n)) {
                /* بدون manifest (ورکر قدیمی): تا اولین تکهٔ موجود شمردن */
                n = 0;
                while (parts[base][n] !== undefined) n++;
            }
            chunkCounts[base] = n;
            if (n <= 0 || parts[base][n - 1] === undefined) return; /* ناقص — دور بعد */
            var full = '';
            for (var i = 0; i < n; i++) { if (parts[base][i] === undefined) return; full += parts[base][i]; }
            /* با manifest، نسخهٔ تکه‌شده مرجع است؛ بدون manifest، نسخهٔ خام (اگر هست) بُرد می‌کند */
            if (manifests[base] || !(base in out)) out[base] = full;
        });
        return { stores: out, chunks: chunkCounts };
    }

    /* گروه‌بندی بسته‌های آماده: بزرگ‌ها تنها، کوچک‌ها دسته‌های ≤۳ و ≤۱.۵MB */
    function _groupPacked(packed) {
        var BIG = 1.5 * 1024 * 1024, MAXN = 3;
        var groups = [], cur = [];
        packed.sort(function (a, b) { return a.bytes - b.bytes; });
        packed.forEach(function (pr) {
            if (pr.bytes > BIG) {
                if (cur.length) { groups.push(cur); cur = []; }
                groups.push([pr]);
                return;
            }
            cur.push(pr);
            if (cur.length >= MAXN) { groups.push(cur); cur = []; }
        });
        if (cur.length) groups.push(cur);
        return groups;
    }

    /* ارسال ترتیبی گروه‌ها — شکستِ یک گروه، بقیه را نمی‌بندد؛ خروجی: فهرست شکست‌ها */
    function _sendGroups(groups) {
        var gi = 0;
        var failed = [];
        function next() {
            if (gi >= groups.length) return Promise.resolve();
            var g = groups[gi]; gi++;
            var stores = {}, deletes = [];
            g.forEach(function (pr) {
                Object.keys(pr.stores).forEach(function (k) { stores[k] = pr.stores[k]; });
                deletes = deletes.concat(pr.deletes);
            });
            var body = JSON.stringify(deletes.length ? { stores: stores, deletes: deletes } : { stores: stores });
            /* ✅ v2.3.8 — مهلتِ ارسال متناسب با حجم بدنه (۶۰ تا ۲۴۰ ثانیه):
               قبلاً ۶۰ ثانیهٔ ثابت بود؛ آپلود تکهٔ ۵MB روی اینترنتِ ضعیف همین را تایم‌اوت
               می‌کرد و پیام «اینترنت در دسترس نیست» به‌صورت چرخشی تکرار می‌شد */
            var tmo = Math.max(60000, Math.min(240000, Math.round(body.length / 30)));
            return _api('/api/sync?space=' + encodeURIComponent(_space) + '&key=' + encodeURIComponent(_apiKey), {
                method: 'POST',
                body: body,
                timeout: tmo
            }).then(function (res) {
                g.forEach(function (pr) {
                    _lastSyncVals[pr.name] = pr.val;
                    /* ✅ v2.3.4 — فقط اگر مقدارِ صف هنوز همان مقدارِ ارسال‌شده است پاک شود.
                       اگر حین ارسال (پوش چندثانیه‌ای روی اینترنت موبایل) ادغامِ تعارض یا
                       ذخیرهٔ تازه مقدار جدیدی در صف گذاشته باشد، باید بماند تا پوش بعدی
                       برود — قبلاً delete-by-name مقدارِ تازه را می‌کشت و داده گم می‌شد! */
                    if (_pendingPush[pr.name] === pr.val) delete _pendingPush[pr.name];
                });
                _savePendingNames();
                _pushBackoff = 0;
                if (res && typeof res.rev === 'number') {
                    _lastRev = res.rev;
                    var c = _cfg(); c.lastRev = _lastRev; _saveCfg(c);
                }
                try { console.log('[cloud-sync] ⬆ پوش شد — ' + g.map(function (p) { return p.name; }).join(', ')); } catch (e0) {}
                _liveStatus(true, 'آخرین ارسال');
                /* اگر حین این پوش مقدار تازه‌ای صف شده، همین حالا بفرست */
                if (Object.keys(_pendingPush).length > 0) {
                    var still = Object.keys(_pendingPush).filter(function (n) { return !_sizeBlocked[n]; });
                    if (still.length) _drainPush();
                }
            }).catch(function (err) {
                /* ✅ v2.3.4 — ایزوله‌سازی: فقط این گروه علامت می‌خورد */
                var kind = _errKind(err);
                try { console.warn('[cloud-sync] پوش گروه ناموفق:', g.map(function (p) { return p.name; }).join(', '), '-', (err && err.message) || err); } catch (e1) {}
                g.forEach(function (pr) { failed.push({ name: pr.name, err: err }); });
                if (kind === 'SIZE') {
                    /* این بخش واقعاً جا نمی‌شود — از صف خارج می‌شود تا بقیه مسدود نشوند */
                    g.forEach(function (pr) { delete _pendingPush[pr.name]; });
                    _savePendingNames();
                    try { showToast('⛔ بخش «' + g.map(function (p) { return p.name; }).join('، ') + '» به‌خاطر حجم زیاد ارسال نشد — بقیهٔ داده‌ها سینک می‌شود'); } catch (e2) {}
                }
            }).then(next);
        }
        return next().then(function () { return failed; });
    }

    function _drainPush() {
        _pushTimer = null;
        if (_pushRetryTimer) { clearTimeout(_pushRetryTimer); _pushRetryTimer = null; }
        if (_pushInFlight) {
            _pushRetryTimer = setTimeout(_drainPush, 2500);
            return Promise.resolve();
        }
        var names = Object.keys(_pendingPush).filter(function (n) { return !_sizeBlocked[n]; });
        if (!names.length) return Promise.resolve();
        if (MODE === 'off' || !_space || !_apiKey) return Promise.resolve();

        _pushInFlight = true;
        return Promise.all(names.map(function (n) {
            return _packStore(n, _pendingPush[n]);
        })).then(function (packed) {
            return _sendGroups(_groupPacked(packed));
        }).then(function (failed) {
            _pushInFlight = false;
            var retryable = failed.filter(function (f) { return !_sizeBlocked[f.name]; });
            if (retryable.length) {
                _pushBackoff = Math.min((_pushBackoff || 0) + 1, 10);
                _pushFailToast(retryable[0].name, retryable[0].err);
                _pushRetryTimer = setTimeout(_drainPush, 5000 * _pushBackoff);
            } else if (_netWasDown && _netFailStreak >= 3) {
                /* ✅ v2.3.8 — پیامِ آشتی: بعد از یک دورهٔ قطعیِ واقعی، برقراریِ دوباره اعلام می‌شود */
                _netFailStreak = 0; _netWasDown = false;
                try { showToast('✅ ارتباط با پایگاه دادهٔ ابری دوباره برقرار شد — داده‌های در صف ارسال شد', 4000); } catch (eR) {}
            } else {
                _netFailStreak = 0;
            }
            /* ✅ v2.3.3 — بلافاصله بعد از پوش، یک دریافت هم بزن */
            setTimeout(_pollOnce, 150);
        }).catch(function (err) {
            _pushInFlight = false;
            _pushBackoff = Math.min((_pushBackoff || 0) + 1, 10);
            _pushFailToast('داده‌ها', err);
            _pushRetryTimer = setTimeout(_drainPush, 5000 * _pushBackoff);
        });
    }

    /* ============================================================
       گرفتن تغییرات دور
       ============================================================ */
    /* ✅ v2.3.3 — اعلان «تغییرات از دستگاه دیگر رسید» (حداقل هر ۱۰ ثانیه یک‌بار،
       و برای اولین دریافتِ شروع صفحه بی‌صدا) */
    function _toastRemoteApplied(n) {
        if (!_bootApplyDone) return;
        var now = Date.now();
        if (now - _lastRemoteToastAt < 10000) return;
        _lastRemoteToastAt = now;
        try { showToast('⬇ ' + toFa(n) + ' بخش داده از دستگاه دیگر به‌روزرسانی شد'); } catch (e) {}
    }

    /* ✅ v2.3.4 — ادغامِ تعارض: هر دو دستگاه همان بخش را تغییر داده‌اند.
       آرایه‌ها: اجتماع بدون تکرار — اضافهٔ هیچ دستگاهی پاک نمی‌شود
       آبجکت‌ها: کلیدهای محلی بُرد + کلیدهای فقط-رله اضافه می‌شوند
       بقیه: مقدار محلی می‌ماند و پوش می‌شود */
    function _mergeStore(localVal, remoteVal) {
        try {
            if (Array.isArray(localVal) && Array.isArray(remoteVal)) {
                var seen = {}, out = [];
                function keep(x) {
                    var k2 = JSON.stringify(x);
                    if (!seen[k2]) { seen[k2] = 1; out.push(x); }
                }
                localVal.forEach(keep);
                remoteVal.forEach(keep);
                return out;
            }
            if (localVal && remoteVal && typeof localVal === 'object' && typeof remoteVal === 'object') {
                var out2 = {};
                Object.keys(remoteVal).forEach(function (k2) { out2[k2] = remoteVal[k2]; });
                Object.keys(localVal).forEach(function (k2) { out2[k2] = localVal[k2]; });
                return out2;
            }
        } catch (e) {}
        return undefined;
    }

    function _applySnapshot(snap) {
        if (!snap) return 0;
        _lastRev = (typeof snap.rev === 'number') ? snap.rev : _lastRev;
        var c = _cfg(); c.lastRev = _lastRev; _saveCfg(c);
        /* ✅ v2.3.4 — تکه‌ها دوباره یک‌پارچه می‌شوند و کش‌های محلی فیلتر می‌شوند؛
           همچنین هر دستگاه «می‌آموزد» کدام storeها تکه‌بندی شده‌اند تا پوش بعدی
           تکه‌های کهنه را پاک کند (حتی اگر تکه را دستگاه دیگری ساخته باشد) */
        var ex = _expandSnapshot(snap.stores || {});
        var raw = ex.stores;
        var learned = 0;
        Object.keys(ex.chunks).forEach(function (b) {
            if (_chunkMeta[b] !== ex.chunks[b]) { _chunkMeta[b] = ex.chunks[b]; learned++; }
        });
        if (learned) _saveChunkMeta();
        var names = Object.keys(raw).filter(function (n) { return n !== CFG_KEY && !NO_SYNC[n]; });
        if (!names.length) { _bootApplyDone = true; return 0; }

        /* ✅ v2.3.5 — خطای نام‌دار برای مرورگر قدیمی: قبلاً هر بخشی که رمزگشایی
           نشد بی‌صدا کنار گذاشته می‌شد و کاربر فکر می‌کرد «داده‌ای نیست». */
        var _lastNoGunzipAt = 0;
        var jobs = names.map(function (n) {
            var wasZ = String(raw[n]).indexOf('penc1z.') === 0;
            return _decrypt(_space, _apiKey, raw[n])
                .then(function (val) { return [n, val, wasZ]; })
                .catch(function (err) {
                    if (err && (err.message === 'no-gunzip') && Date.now() - _lastNoGunzipAt > 60000) {
                        _lastNoGunzipAt = Date.now();
                        try { showToast('⚠ مرورگر این دستگاه دادهٔ فشردهٔ بخش «' + n + '» را نمی‌خواند — مرورگر (یا WebView) را به‌روزرسانی کنید'); } catch (e2) {}
                        try { console.warn('[cloud-sync] DecompressionStream در دسترس نیست — بخش ' + n + ' قابل دریافت نیست'); } catch (e3) {}
                    }
                    return null;
                });
        });

        return Promise.all(jobs).then(function (pairs) {
            /* ✅ v2.3.4 — قلبِ ریشه‌کنی «سینک یک‌طرفهٔ همیشگی»:
               • store که در صف پوشِ همین دستگاه نیست: فقط اگر واقعاً فرق کرده بنویس.
               • store که هم تغییر محلی دارد هم رله عوض شده: به‌جای مسدودکردنِ کل دریافت
                 (رفتار 2.3.2 و 2.3.3 — علتِ «مرورگر→اندروید هیچ‌وقت نمی‌رسد»)، ادغام
                 هوشمند می‌شود و نتیجه فوراً به رله می‌رود؛ هیچ دستگاهی می‌باخت ندارد. */
            var apply = {}, merged = {};
            var changed = 0, migrZ = 0;
            pairs.forEach(function (p) {
                if (!p) return;
                var nm = p[0], remote = p[1], wasZ = p[2];
                if (_pendingPush.hasOwnProperty(nm)) {
                    var base = _lastSyncVals.hasOwnProperty(nm) ? _lastSyncVals[nm] : undefined;
                    var remoteChanged = true;
                    if (base !== undefined) {
                        try { remoteChanged = (JSON.stringify(base) !== JSON.stringify(remote)); } catch (e0) { remoteChanged = true; }
                    }
                    if (remoteChanged) {
                        var m = _mergeStore(_pendingPush[nm], remote);
                        if (m !== undefined) merged[nm] = m;
                    }
                    return;
                }
                /* ✅ v2.3.5 — مهاجرت فرمت: بخشی که از نسخهٔ قبل به‌صورت فشرده (penc1z)
                   روی رله است و حجمش زیر آستانه است، همان‌جا با قالب سازگار penc1
                   دوباره فرستاده می‌شود تا مرورگرهای بدون DecompressionStream هم
                   از این بعد بتوانند بخوانند. یک‌بار برای هر تغییر — بدون حلقه. */
                if (wasZ) {
                    var sz = 0;
                    try { sz = JSON.stringify(remote).length; } catch (eM) { sz = Infinity; }
                    if (sz < GZIP_THRESHOLD && !_chunkMeta[nm]) {
                        _pendingPush[nm] = remote;
                        _lastSyncVals[nm] = remote;
                        migrZ++;
                    }
                }
                try {
                    var cur = (typeof DB.load === 'function') ? DB.load(nm, undefined) : undefined;
                    if (JSON.stringify(cur) !== JSON.stringify(remote)) { apply[nm] = remote; changed++; }
                } catch (e) { apply[nm] = remote; changed++; }
            });
            var n = changed ? DB._applyRemote(apply) : 0;
            Object.keys(apply).forEach(function (k) { _lastSyncVals[k] = apply[k]; });
            if (n > 0) {
                _refreshUI();
                _toastRemoteApplied(n);
                _liveStatus(true, 'آخرین دریافت');
                try { console.log('[cloud-sync] ⬇ تغییرات دور اعمال شد — ' + n + ' store'); } catch (e) {}
            }
            if (Object.keys(merged).length) {
                Object.keys(merged).forEach(function (k) {
                    _pendingPush[k] = merged[k];
                    _lastSyncVals[k] = merged[k];
                    try { DB.save(k, merged[k]); } catch (e2) {}
                });
                _savePendingNames();
                _refreshUI();
                try { console.log('[cloud-sync] ⚡ ادغام تعارض و پوش فوری — ' + Object.keys(merged).length + ' store'); } catch (e3) {}
                _drainPush();
            }
            /* ✅ v2.3.5 — پوشِ مهاجرت فرمت (penc1z ← penc1) برای بخش‌های کوچک */
            else if (migrZ > 0) {
                _savePendingNames();
                try { console.log('[cloud-sync] ♻ مهاجرت فرمت — ' + migrZ + ' store با قالب سازگار دوباره فرستاده می‌شود'); } catch (e4) {}
                _drainPush();
            }
            _bootApplyDone = true;
            return n;
        });
    }

    function _pollOnce() {
        if (MODE === 'off' || !_space || !_apiKey) return Promise.resolve();
        return _api('/api/rev?space=' + encodeURIComponent(_space) + '&key=' + encodeURIComponent(_apiKey), { timeout: 12000 })
            .then(function (j) {
                var srvRev = (j && j.rev) || 0;
                if (srvRev === _lastRev) return null;
                /* اول پوش صف خودمان، بعد دریافت — تا داده محلی گم نشود */
                return Promise.resolve(_drainPushAndFlush()).then(function () {
                    /* ✅ v2.3.4 — دیگر «گاردِ کلیِ صفِ پوش» وجود ندارد؛ حتی اگر پوش شکست
                       بخورد دریافت ادامه دارد و تعارض در _applySnapshot با ادغام حل
                       می‌شود، نه با مسدودکردنِ کل مسیر مرورگر→اندروید. */
                    return _api('/api/snapshot?space=' + encodeURIComponent(_space) + '&key=' + encodeURIComponent(_apiKey), { timeout: 120000 })
                        .then(function (snap) { return _applySnapshot(snap); });
                });
            })
            .catch(function (err) {
                try { console.warn('[cloud-sync] دریافت ناموفق:', (err && err.message) || err); } catch (e) {}
            });
    }

    function _drainPushAndFlush() {
        /* ✅ v2.3.2 — flush ← بازگرداندن صف پوش‌نشدهٔ جلسهٔ قبل ← پوش */
        try { if (typeof DB.flush === 'function') return DB.flush().then(function () { _restorePending(); return _drainPush(); }); } catch (e) {}
        _restorePending();
        return _drainPush();
    }

    function _startPolling() {
        _bootApplyDone = true; /* ✅ v2.3.3 — از این‌جا به بعد دریافت‌ها «تغییر دور» حساب می‌شوند */
        if (_pollTimer) clearInterval(_pollTimer);
        _pollTimer = setInterval(function () {
            try { if (document.visibilityState === 'hidden') return; } catch (e) {}
            _pollOnce();
        }, 3000); /* ✅ v2.3.4 — ۶ثانیه ← ۳ثانیه: رسیدن تغییرات طرف مقابل در کسری از ثانیه */
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'visible') _pollOnce();
        });
        /* ✅ v2.3.3 — برگشت از پس‌زمینه (بازیابی bfcache) و اتصال مجدد اینترنت:
           فوراً هم پوش، هم دریافت — بدون نیاز به بستن و باز کردن اپ */
        window.addEventListener('pageshow', function (e) {
            try { if (e && e.persisted) { _flushAndPush(); _pollOnce(); } } catch (e2) {}
        });
        window.addEventListener('online', function () {
            _flushAndPush();
            _pollOnce();
        });
        /* ✅ v2.3.3 → v2.3.5 — نگهبان نسخهٔ فعال:
           قبلاً فقط یک toast منفعلِ «رفرش کنید» می‌آمد (هر ۹۰ ثانیه، فقط یک‌بار) و
           مرورگرِ دستگاه دیگر روی نسخهٔ قدیمیِ کش‌شده می‌ماند و داده تازه نمی‌دید —
           «فقط مرورگرِ خودم سینک می‌شود». حالا: چکِ فوریِ شروع صفحه + بنر با
           به‌روزرسانی خودکار (پاک‌سازی کش + رفرش) که فقط با دکمهٔ لغو متوقف می‌شود. */
        setTimeout(_checkRelayVer, 1500);
        setInterval(_checkRelayVer, 60000);
    }

    /* ✅ v2.3.5 — مقایسهٔ نسخهٔ عددی: 2.3.10 > 2.3.9 */
    function _verCmp(a, b) {
        var pa = String(a || '').split('.'), pb = String(b || '').split('.');
        for (var i = 0; i < 4; i++) {
            var x = parseInt(pa[i] || '0', 10) || 0;
            var y = parseInt(pb[i] || '0', 10) || 0;
            if (x !== y) return x < y ? -1 : 1;
        }
        return 0;
    }

    function _checkRelayVer() {
        try {
            if (document.visibilityState === 'hidden') return;
            if (_wizardBusy || _verWarned) return;
            fetch((_base || '') + '/api/ping', { cache: 'no-store' })
                .then(function (r) { return r.ok ? r.json() : null; })
                .then(function (j) {
                    if (j && j.ok && typeof j.appVer === 'string' && j.appVer && j.appVer !== APP_VERSION) {
                        _verWarned = true;
                        _relayAppVer = j.appVer;
                        /* فقط وقتی نسخهٔ رله «جدیدتر» است به‌روزرسانی خودکار؛
                           اگر قدیمی‌تر بود یعنی انتشار وارونه شده — فقط بنر */
                        if (_verCmp(j.appVer, APP_VERSION) > 0) _showUpdateBanner(j.appVer);
                        else {
                            try { showToast('ℹ اپ روی رله نسخهٔ ' + toFa(j.appVer) + ' است و این صفحه ' + toFa(APP_VERSION) + ' — داده‌ها سینک می‌شوند؛ برای انتشار نسخهٔ جدید، در اپ اصلی «انتشار اپ روی رله» را بزنید'); } catch (e3) {}
                        }
                    }
                })
                .catch(function () {});
        } catch (eV) {}
    }

    /* ✅ v2.3.5 — بنر به‌روزرسانی خودکار: ۱۰ ثانیه شمارش، دکمهٔ لغو، بعد پاک‌سازی
       کامل کش + رفرش. محافظ حلقه: هر ۹۰ ثانیه فقط یک‌بار رفرش خودکار. */
    function _showUpdateBanner(relayVer) {
        try {
            window.__parsisVerBanner = true;
            var old = document.getElementById('parsis-ver-banner');
            if (old) old.remove();
            var bar = document.createElement('div');
            bar.id = 'parsis-ver-banner';
            bar.dir = 'rtl';
            bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#1d4ed8;color:#fff;padding:12px 16px;font-size:14px;line-height:1.9;box-shadow:0 2px 10px rgba(0,0,0,.3);text-align:center';
            bar.innerHTML = '🔄 نسخهٔ جدید اپ (' + (typeof toFa === 'function' ? toFa(relayVer) : relayVer) + ') روی رله منتشر شده است. '
                + '<span id="parsis-ver-count">به‌روزرسانی خودکار تا ۱۰ ثانیه دیگر…</span> '
                + '<button id="parsis-ver-now" style="background:#fff;color:#1d4ed8;border:0;border-radius:8px;padding:6px 14px;margin:0 6px;font-weight:bold;cursor:pointer">به‌روزرسانی الآن</button> '
                + '<button id="parsis-ver-no" style="background:transparent;color:#fff;border:1px solid #fff;border-radius:8px;padding:6px 14px;margin:0 4px;cursor:pointer">لغو</button>';
            document.body.appendChild(bar);
            var cancelled = false;
            document.getElementById('parsis-ver-no').onclick = function () {
                cancelled = true;
                var c = document.getElementById('parsis-ver-count');
                if (c) c.textContent = 'به‌روزرسانی خودکار لغو شد — هر وقت خواستی دکمهٔ «به‌روزرسانی الآن» را بزن';
            };
            document.getElementById('parsis-ver-now').onclick = function () { cancelled = true; _hardUpdate(); };
            var left = 10;
            var t = setInterval(function () {
                if (cancelled) { clearInterval(t); return; }
                /* وسط تایپ چیزی رفرش نشود — فقط صبر */
                try {
                    var ae = document.activeElement;
                    if (ae && /INPUT|TEXTAREA|SELECT/.test(String(ae.tagName || ''))) return;
                } catch (e5) {}
                left--;
                var c2 = document.getElementById('parsis-ver-count');
                if (c2) c2.textContent = 'به‌روزرسانی خودکار تا ' + (typeof toFa === 'function' ? toFa(left) : left) + ' ثانیه دیگر…';
                if (left <= 0) { clearInterval(t); _hardUpdate(); }
            }, 1000);
        } catch (eB) {
            /* حتی اگر DOM نبود، یک بار رفرش سخت */
            _hardUpdate();
        }
    }

    function _hardUpdate() {
        try {
            var last = 0;
            try { last = parseInt(sessionStorage.getItem('parsis.verReload') || '0', 10) || 0; } catch (e6) {}
            if (last && Date.now() - last < 90000) return; /* محافظ حلقهٔ رفرش */
            try { sessionStorage.setItem('parsis.verReload', String(Date.now())); } catch (e7) {}
            var finish = function () { try { location.reload(); } catch (e8) {} };
            if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
                navigator.serviceWorker.getRegistrations()
                    .then(function (rs) { return Promise.all((rs || []).map(function (r) { try { return r.update(); } catch (e9) { return null; } })); })
                    .catch(function () {})
                    .then(function () {
                        if (window.caches && caches.keys) {
                            caches.keys().then(function (ks) { return Promise.all((ks || []).map(function (k) { return caches.delete(k); })); })
                                .catch(function () {}).then(finish);
                        } else finish();
                    });
            } else finish();
        } catch (eH) {
            try { location.reload(); } catch (e10) {}
        }
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
        /* ✅ v2.3.2 — پوش هنگام ترک صفحه (رفرش/بستن/سوییچ اپ):
           قبلاً اگر کاربر بلافاصله بعد از ثبت، صفحه را رفرش می‌کرد، پوش هرگز
           فرستاده نمی‌شد و تغییراتش روی ابر نمی‌رفت — «سینک یک‌طرفه». */
        if (!window.__parsisUnloadHooked) {
            window.__parsisUnloadHooked = true;
            var _pushOnLeave = function () {
                try {
                    if (MODE === 'off' || !_space || !_apiKey) return;
                    var names = Object.keys(_pendingPush);
                    if (!names.length) return;
                    /* ✅ v2.3.4 — همان بسته‌بندی اصلی (رمز + فشرده + تکه)؛
                       فقط بدنهٔ کوچک keepalive می‌شود تا هنگام بستن صفحه زنده بماند؛
                       بقیه در صف ماندگار می‌مانند و شروع بعدی قبل از هر دریافت می‌روند */
                    names.forEach(function (n) {
                        _packStore(n, _pendingPush[n]).then(function (pr) {
                            var body = JSON.stringify(pr.deletes.length
                                ? { stores: pr.stores, deletes: pr.deletes }
                                : { stores: pr.stores });
                            var opt = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body };
                            if (body.length < 50000) opt.keepalive = true;
                            return fetch(_base + '/api/sync?space=' + encodeURIComponent(_space) + '&key=' + encodeURIComponent(_apiKey), opt);
                        }).catch(function () {});
                    });
                } catch (e) {}
            };
            window.addEventListener('pagehide', _pushOnLeave);
            document.addEventListener('visibilitychange', function () {
                if (document.visibilityState === 'hidden') _pushOnLeave();
            });
        }
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

        /* ✅ v2.3.2 — اول flush + پوشِ تغییراتِ پوش‌نشدهٔ قبلی، بعد چک رله؛
           وگرنه دریافت اولیهٔ رله روی تغییرات محلیِ هنوز نفرستاده می‌نویست. */
        return _flushAndPush().then(function () {
            return _api('/api/rev?space=' + encodeURIComponent(_space) + '&key=' + encodeURIComponent(_apiKey));
        }).then(function (j) {
                var srvRev = (j && j.rev) || 0;
                if (srvRev === 0) {
                    /* رله خالی است — کل داده محلی را پوش کن
                       ✅ v2.3.4 — per-store و تکه‌بندی‌شده؛ کش‌های محلی نه؛
                       شکستِ یک بخش، بقیه را نمی‌بندد */
                    var all = {};
                    DB.keys().forEach(function (k) {
                        if (k === CFG_KEY || NO_SYNC[k]) return;
                        var v = DB.load(k, undefined);
                        if (v !== undefined) { try { JSON.stringify(v); all[k] = v; } catch (e) {} }
                    });
                    return Promise.all(Object.keys(all).map(function (n) {
                        return _packStore(n, all[n]);
                    })).then(function (packed) {
                        return _sendGroups(_groupPacked(packed));
                    }).then(function (failed) {
                        var c2 = _cfg(); c2.lastRev = _lastRev; _saveCfg(c2);
                        if (!silent && !failed.length) showToast('☁️ همه داده‌ها روی رله ابری بارگذاری شد');
                    });
                }
                /* ✅ v2.3.7 — «پایگاه دادهٔ اصلی = کلادفلر»:
                   هر بار باز شدن اپ، مستقل از rev، اسنپ‌شات کامل رله خوانده و ادغام می‌شود
                   تا همهٔ دستگاه‌ها همیشه از حقیقتِ ابری شروع کنند؛ دادهٔ محلی فقط کش است.
                   اسنپ‌شات فقط بخش‌های واقعاً متفاوت را می‌نویسد و صف پوش هم با ادغام
                   محافظت می‌شود، پس هیچ دادهٔ محلیِ پوش‌نشده‌ای از بین نمی‌رود. */
                return _api('/api/snapshot?space=' + encodeURIComponent(_space) + '&key=' + encodeURIComponent(_apiKey), { timeout: 120000 })
                    .then(function (snap) { return _applySnapshot(snap); });
            })
            .then(function () {
                _startPolling();
                if (!silent) _setStatus('<span style="color:#059669">✅ همگام‌سازی ابری فعال — پایگاه دادهٔ اصلی: کلادفلر (rev=' + _lastRev + ')</span>');
            })
            .catch(function (err) {
                var raw = String((err && err.message) || err || '');
                var kind = _friendlyErr(err);
                if (kind === 'BAD_KEY') {
                    /* ✅ v2.2.2 — راهنمای کامل بازیابی به‌جای «Bad Key» بی‌معنی */
                    _setStatus(
                        '<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:10px;color:#7f1d1d;line-height:2">'
                        + '<b>⛔ این «فضای کاری» روی رله با کد دسترسی دیگری ثبت شده است.</b><br>'
                        + 'فضای کاری فعلی: <b dir="ltr">' + _space + '</b>'
                        + ' — کد دسترسی فعلی: <b dir="ltr">' + _apiKey + '</b><br>'
                        + '<b>راه ۱)</b> اگر «لینک دوستان» قدیمی را جایی ذخیره کرده‌ای (واتساپ/تلگرام/یادداشت)، '
                        + '«فضای کاری» و «کد دسترسی» داخل آن لینک را در کادرهای همین صفحه وارد کن و دوباره ⚡ را بزن — داده‌های قبلی برمی‌گردد.<br>'
                        + '<b>راه ۲)</b> اگر کد دسترسی قدیمی را نداری، دکمه «🆕 فضای کاری جدید» را بزن تا با داده‌های همین گوشی شروع تازه بسازد.<br>'
                        + '💡 کد دسترسی فقط عدد انگلیسی است؛ اعداد فارسی خودکار به انگلیسی تبدیل می‌شوند.'
                        + '</div>'
                    );
                } else if (kind === 'NET') {
                    _setStatus('<span style="color:#dc2626">⛔ اتصال به رله ناموفق: اینترنت یا آدرس رله در دسترس نیست.<br>وای‌فای/دیتا را بررسی کن، آدرس Worker را چک کن و دوباره تلاش کن.</span>');
                } else if (kind === 'WORKER') {
                    _setStatus('<span style="color:#dc2626">⛔ رله جواب استاندارد نداد (' + raw + ') — کد Worker روی Cloudflare قدیمی است؛ آخرین فایل parsis-relay-worker.js را دوباره Deploy کن.</span>');
                } else if (kind === 'CONFIG') {
                    _setStatus('<span style="color:#dc2626">⛔ تنظیمات ناقص است (' + raw + ') — فضای کاری و کد دسترسی را کامل کن.</span>');
                } else {
                    _setStatus('<span style="color:#dc2626">⛔ اتصال به رله ناموفق: ' + raw + '</span>');
                }
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

        /* ✅ v2.3.2 — اول flush + پوشِ تغییراتِ پوش‌نشدهٔ جلسهٔ قبل، بعد دریافت رله؛
           قبلاً در هر بار بازشدن صفحه، اسنپ‌شاتِ رله «بدون قید و شرط» روی دادهٔ محلی
           نوشته می‌شد و هر تغییری که هنوز پوش نشده بود از بین می‌رفت —
           علت اصلی «ویرایشِ مرورگر بعد از رفرش پاک می‌شود و دادهٔ گوشی برمی‌گردد». */
        _flushAndPush()
            .then(function () {
                /* ✅ v2.3.4 — دریافت همیشه انجام می‌شود؛ صف پوش با ادغام محافظت می‌شود،
                   نه با مسدودکردنِ دریافت (قبلاً علتِ «ویرایش مرورگر گم می‌شد») */
                return _api('/api/snapshot?space=' + encodeURIComponent(_space) + '&key=' + encodeURIComponent(_apiKey), { timeout: 120000 })
                    .then(function (snap) { return _applySnapshot(snap); });
            })
            .then(function () {
                _refreshUI();
                _startPolling();
                try { showToast('☁️ متصل به پایگاه دادهٔ کلادفلر — همه دستگاه‌ها با یک دیتا کار می‌کنند'); } catch (e) {}
            })
            .catch(function (err) {
                var t = (_friendlyErr(err) === 'BAD_KEY')
                    ? '⛔ اتصال ابری ناموفق: این فضا با کد دسترسی دیگری ثبت شده — کد دسترسی درست را از صاحب لینک بگیرید.'
                    : '⛔ اتصال ابری ناموفق: ' + ((err && err.message) || err);
                try { showToast(t); } catch (e2) {}
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

    function publishApp(onProgress, opts) {
        opts = opts || {};
        var cfg = _cfg();
        var base = _normUrl(cfg.url), space = cfg.space, key = cfg.key;
        if (!base || !space || !key) return Promise.reject(new Error('ابتدا آدرس رله، فضای کاری و کد دسترسی را کامل کنید'));
        _base = base; _space = space; _apiKey = key; /* مستقل از صفحه تنظیمات هم درست کار کند */
        var pubUrl = '/api/publish?space=' + encodeURIComponent(space) + '&key=' + encodeURIComponent(key);
        /* ✅ v2.3.6 — ریشهٔ واقعیِ «انتشار ناقص: ۶۷ از ۷۷ فایل رفت»: تایم‌اوت ۲۰ ثانیه‌ایِ _api.
           فایل‌های بزرگ (xlsx ~۱.۳MB، icon-512، index.html، cloud-sync.js و…) روی اینترنت موبایلِ
           کند در ۲۰ ثانیه کامل نمی‌شدند و هر ۴ تلاش هم می‌مرد — دقیقاً بزرگ‌ترین ۱۰ فایل جا می‌افتاد.
           حالا: تایم‌اوت ۲۴۰ ثانیه + دسته‌بندی حجمی + بازبینی هوشمند + تأیید پایانی. */
        var PUB_TIMEOUT = 240000, PUB_ATTEMPTS = 3;

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
            var got = [];          /* {path, mime, b64, size, bytes} */
            var failedFetch = [];
            var failedPost = [];
            var upToDate = [];     /* ✅ v2.3.6 — از قبل روی رله همان نسخه است */
            var compared = false;  /* ✅ v2.3.6 — آیا مقایسه با رله ممکن شد؟ */
            var okCount = 0;
            var fi = 0;
            var PAR = 4;           /* دریافت همزمان ۴ فایل */

            function b64ToBytes(b64) {
                try {
                    var bin = atob(b64), out = new Uint8Array(bin.length);
                    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
                    return out;
                } catch (e) { return null; }
            }
            function bytesEqual(a, b) {
                if (!a || !b || a.length !== b.length) return false;
                for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
                return true;
            }
            function relayPath(p) { return base + '/' + String(p).replace(/^\.\//, '').replace(/^\/+/, ''); }

            /* فاز الف — خواندن همه فایل‌ها از مبدا (شکست هر فایل بقیه را نمی‌بندد) */
            function fetchNext() {
                var batch = [];
                while (batch.length < PAR && fi < total) { batch.push(files[fi]); fi++; }
                if (!batch.length) return Promise.resolve();
                return Promise.all(batch.map(function (p) {
                    return fetch(p, { cache: 'no-store' }).then(function (r) {
                        if (!r.ok) throw new Error('fetch ' + p + ' -> ' + r.status);
                        /* ✅ v2.3.6.1 — mime همیشه از پسوند فایل؛ هدرِ پاسخ نادیده گرفته می‌شود.
                           علت واقعی خرابی: انتشار از اندروید (Capacitor) برای فایل‌های محلی هدر
                           application/octet-stream می‌داد و همین هدرِ غلط روی رله ذخیره می‌شد؛
                           نتیجه: مرورگر به‌جای باز کردن اپ، فایل‌ها را دانلود می‌کرد. */
                        var mime = _fileMime(p);
                        return r.blob().then(function (b) {
                            return _blobToB64(b).then(function (b64) {
                                got.push({ path: p, mime: mime, b64: b64, size: b.size, bytes: b64ToBytes(b64) });
                            });
                        });
                    }).catch(function () { failedFetch.push(p); });
                })).then(fetchNext);
            }

            /* ✅ v2.3.6 — فاز بِ — بازبینی هوشمند: مقایسهٔ بایت‌به‌بایت هر فایل با نسخهٔ روی رله؛
               فقط فایل‌های واقعاً ناقص/کهنه آپلود می‌شوند — تکرارِ انتشار چند ثانیه طول می‌کشد
               و همان فایل‌های جاافتادهٔ دفعات قبل خودکار ترمیم می‌شوند. */
            function compareAll() {
                if (opts.forceFull) return Promise.resolve();
                return fetch(relayPath('./index.html'), { cache: 'no-store' })
                    .then(function () { compared = true; }, function () { compared = false; })
                    .then(function () {
                        if (!compared) return;
                        var ci = 0, CPAR = 6;
                        function cnext() {
                            var batch = [];
                            while (batch.length < CPAR && ci < got.length) { batch.push(got[ci]); ci++; }
                            if (!batch.length) return Promise.resolve();
                            return Promise.all(batch.map(function (f) {
                                return fetch(relayPath(f.path), { cache: 'no-store' })
                                    .then(function (r) {
                                        if (!r.ok) return; /* روی رله نیست → آپلود */
                                        return r.arrayBuffer().then(function (buf) {
                                            if (bytesEqual(f.bytes, new Uint8Array(buf))) upToDate.push(f.path);
                                        });
                                    })
                                    .catch(function () { /* خطای شبکه → سمت امن: دوباره آپلود */ });
                            })).then(cnext);
                        }
                        return cnext();
                    });
            }

            /* ✅ v2.3.6 — فاز پ — تأیید پایانی: هر فایل ارسالی دوباره از رله خوانده و
               بایت‌به‌بایت چک می‌شود؛ دیگر هیچ‌وقت «رفت» ولی «نرسیده بود» نداریم. */
            function verifyGroup(group) {
                return Promise.all(group.map(function (f) {
                    return fetch(relayPath(f.path), { cache: 'no-store' })
                        .then(function (r) { return r.ok ? r.arrayBuffer() : null; })
                        .then(function (buf) {
                            if (!buf || !bytesEqual(f.bytes, new Uint8Array(buf))) return f;
                            return null;
                        })
                        .catch(function () { return f; });
                })).then(function (arr) { return arr.filter(Boolean); });
            }

            function report() {
                if (typeof onProgress === 'function') {
                    var done = Math.min(upToDate.length + okCount + failedPost.length + failedFetch.length, total);
                    try { onProgress(done, total); } catch (e) {}
                }
            }

            /* فاز ت — آپلود فقطِ فایل‌های ناقص (شکست یک دسته زنجیره را نمی‌بندد) */
            function uploadGroup(group, attempt) {
                attempt = attempt || 1;
                var payload = {};
                group.forEach(function (f) { payload[f.path] = { mime: f.mime, b64: f.b64 }; });
                return _api(pubUrl, { method: 'POST', body: JSON.stringify({ files: payload }), timeout: PUB_TIMEOUT })
                    .then(function () {
                        if (!compared) { okCount += group.length; report(); return; }
                        return verifyGroup(group).then(function (bad) {
                            if (!bad.length) { okCount += group.length; report(); return; }
                            bad.forEach(function (f) { failedPost.push(f.path); });
                            report();
                        });
                    })
                    .catch(function () {
                        if (attempt < PUB_ATTEMPTS) {
                            return new Promise(function (res) { setTimeout(res, 1200 * attempt); })
                                .then(function () { return uploadGroup(group, attempt + 1); });
                        }
                        group.forEach(function (f) { failedPost.push(f.path); });
                        report();
                    });
            }

            function uploadAll() {
                /* ✅ v2.3.6 — دسته‌بندی بر اساس حجمِ واقعی (نه تعداد فایل):
                   هر درخواست ≤ ~۲۰۰KB متن b64 تا روی کندترین اینترنت‌ها هم کامل شود؛
                   فایل‌های بزرگ‌تر همچنان تنها می‌روند تا شکستشان بقیه را نیندازد */
                var MAXB = 200 * 1024;
                var need = got.filter(function (f) { return upToDate.indexOf(f.path) === -1; });
                need.sort(function (a, b) { return a.size - b.size; });
                var groups = [], cur = [], curB = 0;
                need.forEach(function (f) {
                    if (f.b64.length > MAXB) {
                        /* فایل بزرگ‌تر از سقف — همیشه تنها */
                        if (cur.length) { groups.push(cur); cur = []; curB = 0; }
                        groups.push([f]);
                    } else {
                        /* ✅ قبل از افزودن چک می‌شود تا هر دسته «قطعاً» زیر سقف بماند */
                        if (cur.length && (curB + f.b64.length > MAXB || cur.length >= 8)) {
                            groups.push(cur); cur = []; curB = 0;
                        }
                        cur.push(f); curB += f.b64.length;
                    }
                });
                if (cur.length) groups.push(cur);

                var gi = 0;
                function gnext() {
                    if (gi >= groups.length) return Promise.resolve();
                    var g = groups[gi]; gi++;
                    /* v2.2.1 — مکث کوتاه بین دسته‌ها؛ فشار روی وای‌فای موبایل کمتر می‌شود */
                    return uploadGroup(g).then(function () {
                        return new Promise(function (res) { setTimeout(res, 250); }).then(gnext);
                    });
                }
                return gnext();
            }

            return fetchNext().then(compareAll).then(function () {
                report();
                if (opts.skipWhenUnverifiable && !compared) {
                    /* برای ویزارد: وقتی نسخهٔ اپ روی رله یکسان است ولی مقایسه ممکن نیست
                       (CORS/ورکر قدیمی)، کورکورانه ~۶MB آپلود نکن — مثل قبل رد شود */
                    return { ok: 0, failed: 0, total: total, failedList: [], upToDate: 0, compared: false, allUpToDate: false, skippedCompare: true };
                }
                if (compared && !failedFetch.length && upToDate.length === total) {
                    return { ok: 0, failed: 0, total: total, failedList: [], upToDate: upToDate.length, compared: true, allUpToDate: true };
                }
                return uploadAll().then(function () {
                    return {
                        ok: okCount,
                        failed: failedFetch.length + failedPost.length,
                        total: total,
                        failedList: failedFetch.concat(failedPost),
                        upToDate: upToDate.length,
                        compared: compared,
                        allUpToDate: compared && okCount === 0 && !failedFetch.length && !failedPost.length && upToDate.length === total
                    };
                });
            });
        });
    }

    /* انتشار کمکی برای ویزارد — همان publishApp با تنظیم _base قبلی */
    function _apiPub(url, c, opts) {
        return publishApp(function (done, total) {
            var pct = total ? Math.round(done * 100 / total) : 0;
            _setStatus('<span style="color:#059669">✅ ۱/۳ متصل شد</span> <span style="color:#b45309">— ⏳ ۲/۳ انتشار اپ… ' + toFa(pct) + '٪ (صفحه را باز نگه دار)</span>');
        }, opts);
    }

    /* ============================================================
       رابط تنظیمات — «☁️ همگام‌سازی ابری رایگان»
       ============================================================ */
    function _setVal(id, v) { var el = document.getElementById(id); if (el) el.value = v || ''; }

    function _getVal(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }

    /* ============================================================
       ✅ v2.2.2 — ویزارد مشترک (⚡ راه‌اندازی خودکار و 🆕 فضای جدید هر دو از این استفاده می‌کنند)
       مهم‌ترین اصلاح: اگر کاربر در کادر «فضای کاری» یا «کد دسترسی» چیزی تایپ کرده باشد،
       دقیقاً همان استفاده می‌شود (قبلاً نادیده گرفته می‌شد و کد قدیمی/خودکار برمی‌گشت —
       علت اصلی خطای bad-key برای کاربر). ارقام فارسی هم خودکار به انگلیسی تبدیل می‌شوند.
       ============================================================ */
    function _runWizardFlow() {
        var url = _normUrl(_normCode(_getVal('set-cloud-url')));
        if (!url) {
            showToast('⚠️ اول آدرس رله را در «تنظیمات دستی» وارد کنید');
            _setStatus('<span style="color:#dc2626">⛔ قدم ۱ ناقص: آدرس رله خالی است</span>');
            return;
        }
        _wizardBusy = true; /* ✅ v2.3.3 */
        var btnWizard = document.getElementById('set-cloud-wizard');
        if (btnWizard) btnWizard.disabled = true;
        var fSpace = _normCode(_getVal('set-cloud-space'));
        var fKey = _normCode(_getVal('set-cloud-key'));
        var c = _cfg();
        c.url = url;
        if (fSpace) c.space = fSpace; else if (!c.space) c.space = 'p' + _rand(7);
        if (fKey) c.key = fKey; else if (!c.key) c.key = _rand(6, true);
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
                   همین مرحله روی اینترنت موبایل اغلب می‌شکست، در حالی که رله از قبل اپ کامل را دارد.
                   ✅ v2.3.1 — اما فقط وقتی «نسخه اپ روی رله» با نسخه همین اپ یکی باشد رد می‌شود.
                   قبلاً همیشه رد می‌شد و مرورگرِ دیگران روی نسخه قدیمی (مثلاً 2.1.1) می‌ماند
                   و داده‌های جدید را نمی‌دید — علت اصلی «سینک ظاهراً کامل ولی داده قدیمی». */
                var relayVer = (typeof j.appVer === 'string' && j.appVer) ? j.appVer : null;
                if (j.app === true && relayVer === APP_VERSION) {
                    /* ✅ v2.2.1/v2.3.1 — وقتی نسخهٔ اپ روی رله با همین اپ یکی است، انتشار کامل لازم نیست.
                       ✅ v2.3.6 — اما ردِ کورکورانه کافی نیست: همان «انتشار ناقص ۶۷ از ۷۷» یعنی نسخه
                       درست است ولی چند فایل واقعاً جا افتاده‌اند! پس «بازبینی هوشمند»:
                       مقایسهٔ بایت‌به‌بایت؛ فقط فایل‌های ناقص می‌روند (معمولاً هیچ).
                       اگر مقایسه ممکن نباشد (CORS/ورکر قدیمی) مثل قبل کلاً رد می‌شود. */
                    _setStatus('<span style="color:#059669">✅ ۱/۳ متصل شد</span> <span style="color:#b45309">— ⏳ ۲/۳ بازبینی هوشمند اپ روی رله (نسخهٔ ' + toFa(APP_VERSION) + ')… چند ثانیه</span>');
                    try { showToast('💡 اگر قبلاً داده روی رله داشته‌ای، همان «کد فضا» و «کد دسترسی» قبلی را در کادرها وارد کن تا داده قدیمی برگردد'); } catch (e0) {}
                    return _apiPub(url, c, { skipWhenUnverifiable: true });
                }
                if (j.app === true) {
                    /* اپ روی رله هست ولی قدیمی/نامشخص است — به‌روزرسانی */
                    _setStatus('<span style="color:#059669">✅ ۱/۳ متصل شد</span> <span style="color:#b45309">— ⏳ ۲/۳ اپ روی رله قدیمی است (نسخه ' + toFa(relayVer || 'نامشخص') + ' ← ' + toFa(APP_VERSION) + ') در حال به‌روزرسانی… (صفحه را باز نگه دار)</span>');
                } else {
                    _setStatus('<span style="color:#059669">✅ ۱/۳ متصل شد</span> <span style="color:#b45309">— ⏳ ۲/۳ انتشار اپ روی رله… (چند دقیقه؛ صفحه را باز نگه دار)</span>');
                }
                return _apiPub(url, c);
            })
            .then(function (r) {
                _wizardBusy = false; /* ✅ v2.3.3 */
                if (r && r.skipped) { if (btnWizard) btnWizard.disabled = false; return null; }
                if (r && r.skippedCompare) {
                    /* ✅ v2.3.6 — مقایسه ممکن نشد (CORS/ورکر قدیمی) — مثل قبل رد و فعال‌سازی */
                    _setStatus('<span style="color:#059669">✅ ۱/۳ متصل شد — ✅ ۲/۳ اپ روی رله از قبل آماده است (نسخه ' + toFa(APP_VERSION) + '؛ انتشار دوباره لازم نبود، رد شد)</span> <span style="color:#b45309">— ⏳ ۳/۳ فعال‌سازی و هم‌ترازسازی داده‌ها…</span>');
                    c.enabled = true;
                    _saveCfg(c);
                    var cbxS = document.getElementById('set-cloud-enabled');
                    if (cbxS) cbxS.checked = true;
                    return _startPeer(c, false).then(function () { if (btnWizard) btnWizard.disabled = false; }, function () { if (btnWizard) btnWizard.disabled = false; });
                }
                if (r && r.allUpToDate) {
                    /* ✅ v2.3.6 — بازبینی کامل شد: هر فایل اپ روی رله بایت‌به‌بایت به‌روز است */
                    _setStatus('<span style="color:#059669">✅ ۲/۳ بازبینی شد: هر ' + toFa(r.total) + ' فایل اپ روی رله به‌روز است — نیازی به ارسال نبود</span> <span style="color:#b45309">— ⏳ ۳/۳ فعال‌سازی و هم‌ترازسازی داده‌ها…</span>');
                    c.enabled = true;
                    _saveCfg(c);
                    var cbxU = document.getElementById('set-cloud-enabled');
                    if (cbxU) cbxU.checked = true;
                    return _startPeer(c, false).then(function () { if (btnWizard) btnWizard.disabled = false; }, function () { if (btnWizard) btnWizard.disabled = false; });
                }
                if (!r || r.failed > 0) {
                    var msg = (r && (r.ok > 0 || r.upToDate > 0))
                        ? ('انتشار ناقص بود: ' + (r.ok || 0) + ' فایل رفت' + (r.upToDate ? ' و ' + r.upToDate + ' فایل از قبل به‌روز بود' : '') + ' — جا افتاده: ' + (r.failedList || []).slice(0, 3).join(' ، '))
                        : 'هیچ فایلی آپلود نشد';
                    if (btnWizard) btnWizard.disabled = false;
                    _setStatus('<span style="color:#dc2626">⚠️ ۲/۳ ' + msg + '. دوباره ⚡ را بزن — این‌بار فقط فایل‌های جاافتاده می‌روند (تکرار بی‌خطر است).</span>');
                    return null;
                }
                _setStatus('<span style="color:#059669">✅ ۲/۳ اپ کامل منتشر شد (' + toFa(r.ok) + ' فایل' + (r.upToDate ? ' + ' + toFa(r.upToDate) + ' فایل از قبل به‌روز' : '') + (r.compared ? ' — روی رله تأیید شد' : '') + ')</span> <span style="color:#b45309">— ⏳ ۳/۳ فعال‌سازی و ارسال داده‌ها…</span>');
                c.enabled = true;
                _saveCfg(c);
                var cbx = document.getElementById('set-cloud-enabled');
                if (cbx) cbx.checked = true;
                return _startPeer(c, false).then(function () { if (btnWizard) btnWizard.disabled = false; }, function () { if (btnWizard) btnWizard.disabled = false; });
            })
            .catch(function (err) {
                _wizardBusy = false; /* ✅ v2.3.3 */
                if (btnWizard) btnWizard.disabled = false;
                var raw = String((err && err.message) || err || '');
                var kind = _friendlyErr(err);
                if (kind === 'BAD_KEY') {
                    _setStatus('<span style="color:#dc2626">⛔ این فضای کاری قبلاً با کد دسترسی دیگری ثبت شده است.<br>کد درست را از «لینک دوستان» قدیمی وارد کن و دوباره ⚡ را بزن — یا دکمه «🆕 فضای کاری جدید» را بزن.</span>');
                } else if (kind === 'NET') {
                    _setStatus('<span style="color:#dc2626">⛔ اتصال به رله ناموفق — اینترنت یا آدرس Worker را بررسی کن و دوباره ⚡ را بزن.</span>');
                } else {
                    _setStatus('<span style="color:#dc2626">⛔ راه‌اندازی خودکار متوقف شد: ' + raw + '<br>آدرس رله و اینترنت را بررسی کنید و دوباره ⚡ را بزنید.</span>');
                }
            });
    }

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

        /* ⚡ v2.2.0 — ویزارد خودکار: ۱ اتصال ← ۲ انتشار ← ۳ فعال‌سازی، همه با یک دکمه
           ✅ v2.2.2 — مقادیر تایپ‌شده کاربر محترم شمرده می‌شود؛ فقط وقتی کادرها خالی باشند کد خودکار ساخته می‌شود */
        var btnWizard = document.getElementById('set-cloud-wizard');
        if (btnWizard && !btnWizard.dataset.bound) {
            btnWizard.dataset.bound = '1';
            btnWizard.onclick = _runWizardFlow;
        }


        var btnConnect = document.getElementById('set-cloud-connect');
        if (btnConnect) btnConnect.onclick = function () {
            var url = _normUrl(_normCode(_getVal('set-cloud-url')));
            if (!url) { showToast('⚠️ آدرس رله را وارد کنید'); return; }
            var c = _cfg();
            c.url = url;
            /* ✅ v2.2.2 — کدهای تایپ‌شده اولویت دارند؛ فقط کادرِ خالی خودکار ساخته می‌شود */
            var fSpace = _normCode(_getVal('set-cloud-space'));
            var fKey = _normCode(_getVal('set-cloud-key'));
            if (fSpace) c.space = fSpace; else if (!c.space) c.space = 'p' + _rand(7);
            if (fKey) c.key = fKey; else if (!c.key) c.key = _rand(6, true);
            _saveCfg(c);
            _setVal('set-cloud-space', c.space);
            _setVal('set-cloud-key', c.key);
            _setVal('set-cloud-link', url + '/?space=' + c.space + '&key=' + c.key);
            _setStatus('<span style="color:#b45309">⏳ در حال تست اتصال…</span>');
            fetch(url + '/api/ping', { cache: 'no-store' })
                .then(function (r) { return r.json(); })
                .then(function (j) {
                    if (j && j.ok) {
                        _setStatus('<span style="color:#059669">✅ رله در دسترس است' + (j.app ? ' — اپ روی رله منتشر شده' : ' — هنوز اپ را منتشر کنید') + '</span>'
                            + '<br><span style="font-size:.7rem;color:#475569">فضای کاری: <b dir="ltr">' + c.space + '</b> — کد دسترسی: <b dir="ltr">' + c.key + '</b></span>');
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
            c.url = _normUrl(_normCode(_getVal('set-cloud-url')));
            /* ✅ v2.2.2 — کد تایپ‌شده اولویت دارد + ارقام فارسی نرمال می‌شوند */
            var fSpace = _normCode(_getVal('set-cloud-space'));
            var fKey = _normCode(_getVal('set-cloud-key'));
            if (fSpace) c.space = fSpace;
            if (fKey) c.key = fKey;
            _saveCfg(c);
            _setVal('set-cloud-space', c.space);
            _setVal('set-cloud-key', c.key);
            if (!c.url || !c.space || !c.key) { showToast('⚠️ اول اتصال را کامل کنید'); return; }
            _base = c.url; _space = c.space; _apiKey = c.key;
            _setStatus('<span style="color:#b45309">⏳ انتشار اپ روی رله… ۰٪</span>');
            btnPublish.disabled = true;
            publishApp(function (done, total) {
                var pct = total ? Math.round(done * 100 / total) : 0;
                _setStatus('<span style="color:#b45309">⏳ انتشار اپ روی رله… ' + toFa(pct) + '٪</span>');
            }).then(function (r) {
                btnPublish.disabled = false;
                if (r && r.allUpToDate) {
                    _setStatus('<span style="color:#059669">✅ بازبینی هوشمند: هر ' + toFa(r.total) + ' فایل اپ از قبل روی رله به‌روز بود — نیازی به ارسال نبود.<br>لینک دوستان آماده است.</span>');
                    showToast('✅ اپ روی رله از قبل کامل و به‌روز است');
                } else if (r && r.ok > 0 && r.failed === 0) {
                    _setStatus('<span style="color:#059669">✅ اپ کامل منتشر شد: ' + toFa(r.ok) + ' فایل رفت' + (r.upToDate ? ' ، ' + toFa(r.upToDate) + ' فایل از قبل به‌روز بود' : '') + (r.compared ? ' و روی رله تأیید شد.' : '.<br>لینک دوستان آماده است.') + '</span>');
                    showToast('☁️ اپ روی رله منتشر شد');
                } else if (r && (r.ok > 0 || r.upToDate > 0)) {
                    _setStatus('<span style="color:#dc2626">⚠️ انتشار ناقص بود: ' + toFa(r.ok) + ' فایل رفت' + (r.upToDate ? ' ، ' + toFa(r.upToDate) + ' فایل از قبل به‌روز بود' : '') + '.<br>' + toFa(r.failed) + ' فایل جا افتاد: ' + (r.failedList || []).slice(0, 4).join(' ، ') + '…<br>دکمه انتشار را دوباره بزنید — این‌بار فقط فایل‌های جاافتاده می‌روند و چند ثانیه بیشتر طول نمی‌کشد (تکرار بی‌خطر است).</span>');
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
                c.url = _normUrl(_normCode(_getVal('set-cloud-url')));
                c.space = _normCode(_getVal('set-cloud-space')) || c.space;
                c.key = _normCode(_getVal('set-cloud-key')) || c.key;
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
        if (btnNewKey && !btnNewKey.dataset.bound) {
            btnNewKey.dataset.bound = '1';
            btnNewKey.onclick = function () {
                var c = _cfg();
                /* ✅ v2.2.2 — هشدار جدی: رله فقط کدِ اولین اتصال را می‌شناسد؛ تغییر کد بعد از فعال‌سازی = bad-key */
                if (c.enabled && MODE === 'peer') {
                    if (!window.confirm('⚠️ همگام‌سازی فعلاً فعال است.\n\nتغییر کد دسترسی بعد از فعال‌سازی باعث خطای bad-key می‌شود\n(رله فقط کدِ اولین اتصال را می‌شناسد و آن را عوض نمی‌کند).\n\nمطمئنی می‌خواهی کد جدید بسازی؟')) return;
                }
                c.key = _rand(6, true);
                c.lastRev = 0;
                _saveCfg(c);
                _setVal('set-cloud-key', c.key);
                _setVal('set-cloud-link', (_normUrl(c.url)) + '/?space=' + c.space + '&key=' + c.key);
                showToast('🔑 کد دسترسی جدید ساخته شد — دوستان باید با لینک/کد جدید وارد شوند');
            };
        }

        /* ✅ v2.2.2 — خروج یک‌ضربه از بن‌بست bad-key: شروع تازه با فضای جدید */
        var btnNewSpace = document.getElementById('set-cloud-newspace');
        if (btnNewSpace && !btnNewSpace.dataset.bound) {
            btnNewSpace.dataset.bound = '1';
            btnNewSpace.onclick = function () {
                if (!window.confirm('🆕 یک «فضای کاری» و «کد دسترسی» جدید ساخته می‌شود و داده‌های همین گوشی به آن منتشر می‌شود.\n\n• داده‌های فضای قدیمی روی رله می‌ماند؛ اگر بعداً کد دسترسی قدیمی را پیدا کردی، با همان برمی‌گردی.\n• دوستانی که با لینک قدیمی کار می‌کردند باید لینک جدید را بگیرند.\n\nادامه می‌دهم؟')) return;
                var c = _cfg();
                c.space = '';
                c.key = '';
                c.lastRev = 0;
                c.enabled = false;
                _saveCfg(c);
                _setVal('set-cloud-space', '');
                _setVal('set-cloud-key', '');
                var cbx = document.getElementById('set-cloud-enabled');
                if (cbx) cbx.checked = false;
                _runWizardFlow();
            };
        }
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

    console.log('✅ [core/cloud-sync.js] loaded — v2.3.7');

})();
