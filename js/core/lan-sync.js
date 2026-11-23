/* ============================================================
   پارسیس — سینک شبکه محلی (LAN) — ✅ v2.0.6
   مسیر: js/core/lan-sync.js

   گوشی صاحب داده = سرور:
     • در اپ اندروید، با زدن «اشتراک‌گذاری در شبکه» یک وب‌سرور کوچک
       روی همان وای‌فای بالا می‌آید و لینکی به شکل http://IP:PORT/?key=XXXX می‌دهد.
     • هر تغییر در اپ صاحب گوشی به‌صورت خودکار به سرور پوش می‌شود.

   مرورگر دیگران (مثلاً همسر) = کلاینت زنده:
     • لینک را باز می‌کند؛ کل اپ از روی گوشیِ صاحب داده لود می‌شود.
     • داده اولیه از سرور گرفته می‌شود، تغییراتش فوراً POST می‌شود
       و هر ۳ ثانیه تغییرات طرف مقابل را می‌گیرد.

   امنیت: کد دسترسی ۴ رقمی (PIN) — بدون آن هیچ داده‌ای داده نمی‌شود.
   همه‌چیز روی همان وای‌فای می‌ماند و هیچ داده‌ای به اینترنت نمی‌رود.
   ============================================================ */
'use strict';

(function () {

    function _isNative() {
        try {
            return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
        } catch (e) { return false; }
    }

    function _plugin() {
        try {
            return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Parsis) || null;
        } catch (e) { return null; }
    }

    var MODE = 'standalone';           /* standalone | owner | client */
    window.__parsisSyncMode = MODE;

    var _clientKey = '';
    var _lastRev = 0;
    var _pushQueue = [];
    var _pushing = false;
    var _pollTimer = null;
    var _clientReadyResolve = null;

    /* وعده‌ای که لودر اصلی (index.html) بعد از بارگذاری ماژول‌ها روی آن منتظر می‌ماند */
    var _clientReadyPromise = new Promise(function (r) { _clientReadyResolve = r; });
    window.__parsisLanClientGet = function () { return _clientReadyPromise; };

    /* ---------- هوک flush دیتابیس ---------- */
    /* بعد از هر ذخیره در IndexedDB صاحب گوشی، تغییرات به سرور نیتیو پوش می‌شود */
    window.__parsisAfterFlush = function (vals) {
        try {
            if (MODE !== 'owner') return;
            var P = _plugin();
            if (!P || typeof P.pushServerData !== 'function') return;
            var json = JSON.stringify(vals);
            if (json && json.length > 2) {
                P.pushServerData({ json: json }).catch(function () {});
            }
        } catch (e) { /* سینک غیرفعال */ }
    };

    /* ---------- به‌روزرسانی رابط کاربری بعد از دریافت تغییر دور ---------- */
    function _refreshUI() {
        setTimeout(function () {
            try { if (typeof rerenderCurrentPage === 'function') rerenderCurrentPage(); } catch (e) {}
            try { if (typeof updateHomeWidgets === 'function') updateHomeWidgets(); } catch (e) {}
            try { if (typeof updateSmsBadge === 'function') updateSmsBadge(); } catch (e) {}
        }, 60);
        setTimeout(function () {
            try { if (typeof rerenderCurrentPage === 'function') rerenderCurrentPage(); } catch (e) {}
        }, 500);
    }

    /* ============================================================
       حالت کلاینت — مرورگری که لینک گوشی را باز کرده
       ============================================================ */

    function _detectServer() {
        return fetch('/parsis-api/rev', { cache: 'no-store' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (j) {
                if (j && typeof j.rev === 'number') { _lastRev = j.rev; return true; }
                return false;
            })
            .catch(function () { return false; });
    }

    function _getKeyFromUrl() {
        try {
            var m = (location.search || '').match(/[?&]key=([^&]+)/);
            if (m) {
                var k = decodeURIComponent(m[1]);
                sessionStorage.setItem('parsis.lanKey', k);
                return k;
            }
            return sessionStorage.getItem('parsis.lanKey') || '';
        } catch (e) { return ''; }
    }

    function _askKey() {
        try {
            return window.prompt('🔑 کد دسترسی ۴ رقمی که در اپ پارسیس روی گوشی (تنظیمات ← اندروید ← اشتراک‌گذاری در شبکه) نمایش داده شده را وارد کنید:', '') || '';
        } catch (e) { return ''; }
    }

    function _hydrateFromServer(key, tryCount) {
        tryCount = tryCount || 0;
        return fetch('/parsis-api/snapshot?key=' + encodeURIComponent(key), { cache: 'no-store' })
            .then(function (res) {
                if (!res.ok) {
                    if (res.status === 401 && tryCount < 3) {
                        var k2 = _askKey();
                        if (!k2) throw new Error('no-key');
                        sessionStorage.setItem('parsis.lanKey', k2);
                        return _hydrateFromServer(k2, tryCount + 1);
                    }
                    throw new Error('snapshot-failed-' + res.status);
                }
                return res.json();
            })
            .then(function (j) {
                _clientKey = key;
                _lastRev = (j && j.rev) || 0;
                var n = DB._applyRemote((j && j.stores) || {});
                try { console.log('[lan-sync] 📥 snapshot applied — ' + n + ' store(s), rev=' + _lastRev); } catch (e) {}
            });
    }

    function _postChanges(list) {
        if (!list || !list.length) return Promise.resolve();
        return fetch('/parsis-api/changes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: _clientKey, stores: list })
        }).catch(function () { /* در تیک بعدی دوباره تلاش می‌شود */ });
    }

    var _pendingPush = {};
    function _queuePush(store, data) {
        _pendingPush[store] = data;
    }

    function _drainPush() {
        var keys = Object.keys(_pendingPush);
        if (keys.length === 0) return;
        var list = {};
        keys.forEach(function (k) { list[k] = _pendingPush[k]; });
        _pendingPush = {};
        _postChanges(Object.keys(list).map(function (k) { return { store: k, data: list[k] }; }));
    }

    /* در حالت کلاینت، بعد از flush محلی، تغییرها به سرور گوشی پشت می‌شوند */
    var _clientFlushHookInstalled = false;
    function _installClientFlushHook() {
        if (_clientFlushHookInstalled) return;
        _clientFlushHookInstalled = true;
        var prev = window.__parsisAfterFlush;
        window.__parsisAfterFlush = function (vals) {
            try {
                if (MODE === 'client') {
                    Object.keys(vals || {}).forEach(function (k) { _queuePush(k, vals[k]); });
                    setTimeout(_drainPush, 250);
                }
            } catch (e) {}
            if (typeof prev === 'function') { try { prev(vals); } catch (e2) {} }
        };
    }

    function _pollOnce() {
        return fetch('/parsis-api/rev', { cache: 'no-store' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (j) {
                if (!j) return;
                var srvRev = j.rev || 0;
                if (srvRev === _lastRev) return;
                return fetch('/parsis-api/snapshot?key=' + encodeURIComponent(_clientKey), { cache: 'no-store' })
                    .then(function (s) {
                        if (!s.ok) return;
                        return s.json().then(function (sj) {
                            _lastRev = (sj && sj.rev) || srvRev;
                            var n = DB._applyRemote((sj && sj.stores) || {});
                            if (n > 0) _refreshUI();
                        });
                    });
            })
            .catch(function () { /* گوشی در دسترس نیست — تیک بعدی */ });
    }

    /* ============================================================
       حالت صاحب گوشی (اپ اندروید) — سرور
       ============================================================ */

    function _ownerBoot() {
        var P = _plugin();
        if (!P || typeof P.serverStatus !== 'function') return Promise.resolve();
        return P.serverStatus().then(function (st) {
            if (!st || !st.running) return null;
            MODE = 'owner';
            window.__parsisSyncMode = MODE;
            _lastRev = (typeof st.rev === 'number') ? st.rev : 0;
            /* اگر تغییرها وقتی وب بسته بود از مرورگر دیگری رسیده باشد، اینجا می‌گیریم */
            if (typeof P.serverState === 'function') {
                return P.serverState().then(function (snap) {
                    if (snap && snap.stores) {
                        var n = DB._applyRemote(snap.stores);
                        if (n > 0) _refreshUI();
                    }
                    return null;
                }).catch(function () { return null; });
            }
            return null;
        }).catch(function () { return null; });
    }

    /* پوش کامل داده به سرور (بعد از استارت یا وقتی وب تازه باز شده) */
    function _ownerPushAll() {
        var P = _plugin();
        if (!P || typeof P.pushServerData !== 'function') return;
        try {
            var all = {};
            DB.keys().forEach(function (k) {
                var v = DB.load(k, undefined);
                if (v !== undefined) {
                    try { JSON.stringify(v); all[k] = v; } catch (e) { /* non-serializable skip */ }
                }
            });
            if (Object.keys(all).length > 0) {
                P.pushServerData({ json: JSON.stringify(all) }).catch(function () {});
            }
        } catch (e) {}
    }

    /* رویداد تغییر دور از سرور (نوشته‌ی مرورگر دیگری) → اپ صاحب گوشی */
    window.addEventListener('parsisRemoteChange', function (e) {
        try {
            var d = (e && e.detail) ? e.detail : {};
            var stores = {};
            if (d && d.store !== undefined) stores[d.store] = d.data;
            else if (d && d.stores) stores = d.stores;
            if (!Object.keys(stores).length) return;
            DB._applyRemote(stores);
            _refreshUI();
        } catch (e2) { /* غیرفعال */ }
    });

    /* ---------- رابط تنظیمات سرور ---------- */
    var PIN_KEY = 'parsisLanPin';

    function _genPin() {
        var p = '';
        for (var i = 0; i < 4; i++) p += String(Math.floor(Math.random() * 10));
        return p;
    }

    function _getPin() {
        try {
            var p = localStorage.getItem(PIN_KEY);
            if (!p || !/^\d{4}$/.test(p)) { p = _genPin(); localStorage.setItem(PIN_KEY, p); }
            return p;
        } catch (e) { return _genPin(); }
    }

    function _setLanStatus(html) {
        var el = document.getElementById('set-lan-status');
        if (el) el.innerHTML = html;
    }

    function _showLanLink(ip, port, pin) {
        var wrap = document.getElementById('set-lan-link-wrap');
        var inp = document.getElementById('set-lan-link-input');
        var pinInp = document.getElementById('set-lan-pin-input');
        if (wrap) wrap.style.display = 'block';
        if (inp) inp.value = 'http://' + ip + ':' + port + '/?key=' + pin;
        if (pinInp) pinInp.value = pin;
    }

    function _wireOwnerUI() {
        var P = _plugin();
        if (!P) return;

        var startBtn = document.getElementById('set-lan-start-btn');
        var stopBtn = document.getElementById('set-lan-stop-btn');
        var copyBtn = document.getElementById('set-lan-copy-btn');
        var newPinBtn = document.getElementById('set-lan-newpin-btn');
        var filesBtn = document.getElementById('set-lan-files-btn');
        var filesStatus = document.getElementById('set-lan-files-status');

        function setButtons(running) {
            if (startBtn) startBtn.style.display = running ? 'none' : '';
            if (stopBtn) stopBtn.style.display = running ? '' : 'none';
        }

        P.serverStatus().then(function (st) {
            st = st || {};
            if (st.running) {
                setButtons(true);
                _showLanLink(st.ip || '?', st.port || 8080, _getPin());
                _setLanStatus('<span style="color:#059669">✅ سرور فعال است — http://' + (st.ip || '?') + ':' + (st.port || 8080) + '</span>');
            } else {
                setButtons(false);
                _setLanStatus('<span style="color:#64748b">خاموش</span>');
            }
        }).catch(function () {});

        if (startBtn) startBtn.onclick = function () {
            var pin = _getPin();
            setLanBusy(true);
            P.serverStart({ pin: pin }).then(function (res) {
                res = res || {};
                if (res.ok) {
                    MODE = 'owner';
                    window.__parsisSyncMode = MODE;
                    _lastRev = (typeof res.rev === 'number') ? res.rev : _lastRev;
                    setButtons(true);
                    _showLanLink(res.ip || '?', res.port, pin);
                    _setLanStatus('<span style="color:#059669">✅ سرور فعال شد — لینک زیر را برای همسر/همکار بفرستید (همان وای‌فای)</span>');
                    showToast('📡 سرور پارسیس فعال شد');
                    _ownerPushAll(); /* بلافاصله داده کامل را پوش کن */
                } else {
                    _setLanStatus('<span style="color:#dc2626">⛔ شروع سرور ناموفق بود: ' + (res.error || 'خطای نامشخص') + '</span>');
                }
            }).catch(function (err) {
                _setLanStatus('<span style="color:#dc2626">⛔ خطا: ' + ((err && err.message) || err || '') + '</span>');
            }).finally(function () { setLanBusy(false); });
        };

        if (stopBtn) stopBtn.onclick = function () {
            P.serverStop().then(function () {
                MODE = 'standalone';
                window.__parsisSyncMode = MODE;
                setButtons(false);
                var wrap = document.getElementById('set-lan-link-wrap');
                if (wrap) wrap.style.display = 'none';
                _setLanStatus('<span style="color:#64748b">خاموش</span>');
                showToast('⏹ اشتراک‌گذاری متوقف شد');
            }).catch(function () {});
        };

        if (copyBtn) copyBtn.onclick = function () {
            var inp = document.getElementById('set-lan-link-input');
            var text = inp ? inp.value : '';
            if (!text) return;
            var done = function () { showToast('📋 لینک کپی شد'); };
            try {
                if (_plugin() && typeof _plugin().writeClipboard === 'function') {
                    _plugin().writeClipboard({ text: text }).then(done, function () { _fallbackCopy(text, done); });
                } else if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(done, function () { _fallbackCopy(text, done); });
                } else _fallbackCopy(text, done);
            } catch (e) { _fallbackCopy(text, done); }
        };

        if (newPinBtn) newPinBtn.onclick = function () {
            try { localStorage.setItem(PIN_KEY, _genPin()); } catch (e) {}
            var pin = _getPin();
            var pinInp = document.getElementById('set-lan-pin-input');
            if (pinInp) pinInp.value = pin;
            var inp = document.getElementById('set-lan-link-input');
            if (inp && inp.value) inp.value = inp.value.replace(/key=\d+/, 'key=' + pin);
            /* اگر سرور روشن است، پین جدید را اعمال کن */
            P.serverSetPin({ pin: pin }).catch(function () {});
            showToast('🔑 کد دسترسی جدید ساخته شد');
        };

        /* دسترسی کامل فایل‌ها (اندروید ۱۱+) */
        if (filesBtn) filesBtn.onclick = function () {
            if (typeof P.hasAllFilesAccess !== 'function') return;
            P.hasAllFilesAccess().then(function (r) {
                if (r && r.granted) {
                    if (filesStatus) filesStatus.innerHTML = '<span style="color:#059669">✅ دسترسی کامل به فایل‌ها داده شده است</span>';
                    showToast('✅ قبلاً فعال است');
                } else {
                    P.openAllFilesAccessSettings().catch(function () {});
                    if (filesStatus) filesStatus.innerHTML = '<span style="color:#b45309">⚠️ در صفحه باز شده، اجازه «فایل‌ها و رسانه» را بدهید.</span>';
                }
            }).catch(function () {});
        };

        function setLanBusy(b) {
            if (startBtn) startBtn.disabled = b;
            if (stopBtn) stopBtn.disabled = b;
        }

        /* وضعیت اولیه دسترسی فایل‌ها */
        if (typeof P.hasAllFilesAccess === 'function') {
            P.hasAllFilesAccess().then(function (r) {
                if (r && r.granted && filesStatus) {
                    filesStatus.innerHTML = '<span style="color:#059669">✅ دسترسی کامل به فایل‌ها فعال است</span>';
                }
            }).catch(function () {});
        }
    }

    function _fallbackCopy(text, done) {
        try {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            var ok = document.execCommand('copy');
            document.body.removeChild(ta);
            if (ok && done) done();
        } catch (e) {}
    }

    /* ============================================================
       شروع
       ============================================================ */

    function main() {
        if (_isNative()) {
            /* اپ اندروید — فقط اگر سرور روشن باشد حالت owner می‌شود */
            window.__parsisAfterFlush = function (vals) {
                try {
                    if (MODE === 'owner') {
                        var P = _plugin();
                        if (P && typeof P.pushServerData === 'function') {
                            var json = JSON.stringify(vals || {});
                            if (json && json.length > 2) P.pushServerData({ json: json }).catch(function () {});
                        }
                    }
                } catch (e) {}
            };
            _ownerBoot().then(function () { _wireOwnerUI(); });
            _clientReadyResolve(true);
            return;
        }

        /* مرورگر — آیا روی سرور گوشی اجرا شده؟ */
        _detectServer().then(function (isServer) {
            if (!isServer) { _clientReadyResolve(true); return; }
            MODE = 'client';
            window.__parsisSyncMode = MODE;
            _installClientFlushHook();
            var key = _getKeyFromUrl();
            var p = key ? _hydrateFromServer(key) : Promise.reject(new Error('no-key'));
            p.catch(function () {
                var k2 = _askKey();
                if (k2) return _hydrateFromServer(k2);
                throw new Error('no-key');
            }).then(function () {
                _refreshUI();
                if (_pollTimer) clearInterval(_pollTimer);
                _pollTimer = setInterval(_pollOnce, 3000);
                document.addEventListener('visibilitychange', function () {
                    if (document.visibilityState === 'visible') _pollOnce();
                });
                try { showToast('📡 متصل به سرور پارسیس — داده‌ها زنده سینک می‌شود'); } catch (e) {}
            }).catch(function () {
                /* بدون کد دسترسی — اپ با داده‌های محلی (خالی) بالا می‌آید */
            }).finally(function () {
                _clientReadyResolve(true);
            });
        });
    }

    main();

})();
