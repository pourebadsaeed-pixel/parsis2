/* پارسیس — پچ تقویم نسخه ۲۳: رفع هنگ پس از بازیابی پشتیبان
   • مسدودسازی حلقه‌ی بی‌نهایت MutationObserver پچ ۲۲
   • کش کردن calBuildAllEvents برای جلوگیری از محاسبات تکراری
   • throttling روی updateHomeWidgets
*/
'use strict';

(function () {
    if (window._calPerfFix23) return;
    window._calPerfFix23 = true;

    /* ============================================================
       ۱) مسدودسازی الگوی سنگین MutationObserver
       این کار باید قبل از اجرای boot() پچ ۲۲ انجام شود.
       (پچ ۲۲ با setTimeout(boot, 2800) دیر اجرا می‌شود، پس ما جلوتر هستیم)
       ============================================================ */
    var _origMO = window.MutationObserver || window.WebKitMutationObserver;
    if (_origMO) {
        function SafeMO(callback) {
            var mo = new _origMO(callback);
            var _origObserve = mo.observe.bind(mo);
            mo.observe = function (target, options) {
                if (target === document.body
                    && options
                    && options.attributes === true
                    && options.subtree === true) {
                    try {
                        console.warn('🚫 [CalPerf23] MutationObserver سنگین روی document.body مسدود شد (رفع هنگ).');
                    } catch (e) {}
                    return; // ★ اجرا نمی‌شود
                }
                return _origObserve(target, options);
            };
            return mo;
        }
        SafeMO.prototype = _origMO.prototype;
        window.MutationObserver = SafeMO;
        if (window.WebKitMutationObserver) window.WebKitMutationObserver = SafeMO;
    }

    /* ============================================================
       ۲) کش کردن calBuildAllEvents (کاهش محاسبات تکراری)
       ============================================================ */
    var CACHE_MS = 1200;
    var _cache = null;
    var _cacheTs = 0;
    var _origBuild = window.calBuildAllEvents;

    if (typeof _origBuild === 'function') {
        var cachedBuild = function () {
            var now = Date.now();
            if (_cache && (now - _cacheTs) < CACHE_MS) return _cache;
            try {
                _cache = _origBuild.apply(this, arguments);
            } catch (e) {
                console.error('[calPerf23] calBuildAllEvents error:', e);
                _cache = _cache || [];
            }
            _cacheTs = now;
            return _cache;
        };
        cachedBuild.invalidate = function () { _cache = null; _cacheTs = 0; };
        window.calBuildAllEvents = cachedBuild;
        window._calInvalidateEventCache = cachedBuild.invalidate;
    }

    /* ============================================================
       ۳) پاکسازی خودکار کش هنگام ذخیره در DB
       ============================================================ */
    try {
        var _origSave = DB.save;
        DB.save = function (k, v) {
            var r = _origSave.apply(this, arguments);
            if (k === 'calendarUserEvents' ||
                k === 'calendarRecOverrides' ||
                k === 'facilities' ||
                k === 'cashFlowSources') {
                if (window._calInvalidateEventCache) window._calInvalidateEventCache();
            }
            return r;
        };
    } catch (e) {}

    /* ============================================================
       ۴) throttling روی updateHomeWidgets
       (چون چندین پچ مختلف آن را صدا می‌زنند)
       ============================================================ */
    if (typeof window.updateHomeWidgets === 'function' &&
        !window.updateHomeWidgets._throttled23) {
        var _origUHW = window.updateHomeWidgets;
        var _uhwRAF = null;
        var _uhwLastArgs = null;
        window.updateHomeWidgets = function () {
            _uhwLastArgs = arguments;
            if (_uhwRAF) return;
            _uhwRAF = requestAnimationFrame(function () {
                _uhwRAF = null;
                try { _origUHW.apply(this, _uhwLastArgs); }
                catch (e) { console.error('[calPerf23] updateHomeWidgets:', e); }
            });
        };
        window.updateHomeWidgets._throttled23 = true;
    }

    /* ============================================================
       ۵) cleanup پچ ۲۲ — حذف event listener های اضافی روی document
       (پچ ۲۲ خودش setTimeout و setInterval دارد که با Observer جدید مشکلی ندارند)
       ============================================================ */

    /* ============================================================
       ۶) کش کردن expandRec روی رویدادهای تکرارشونده (بهینه‌سازی بیشتر)
       ============================================================ */
    (function patchExpandRec() {
        if (typeof window._calExpandRec !== 'function') return;
        if (window._calExpandRec._cached23) return;
        var orig = window._calExpandRec;
        var memo = new Map();
        var MEMO_MAX = 500;
        window._calExpandRec = function (u) {
            if (!u || !u.id) return orig(u);
            var key = u.id + '|' + (u.startDate || u.date) + '|' +
                      (u.startTime || u.time) + '|' +
                      JSON.stringify(u.recurrence || {});
            if (memo.has(key)) return memo.get(key);
            var result = orig(u);
            if (memo.size > MEMO_MAX) memo.clear();
            memo.set(key, result);
            return result;
        };
        window._calExpandRec._cached23 = true;
        window._calExpandRec._clearMemo23 = function () { memo.clear(); };
    })();

    /* پاکسازی memo هنگام تغییر داده‌های تقویم */
    try {
        var _saveForMemo = DB.save;
        DB.save = function (k, v) {
            var r = _saveForMemo.apply(this, arguments);
            if (k === 'calendarUserEvents' || k === 'calendarRecOverrides') {
                if (window._calExpandRec && window._calExpandRec._clearMemo23) {
                    window._calExpandRec._clearMemo23();
                }
            }
            return r;
        };
    } catch (e) {}

    /* ============================================================
       ۷) پیام موفقیت
       ============================================================ */
    setTimeout(function () {
        console.log(
            '%c✅ [Cal Perf Fix v23] نصب شد\n' +
            '   • Observer سنگین مسدود شد (رفع هنگ)\n' +
            '   • کش calBuildAllEvents فعال است\n' +
            '   • memoize expandRec فعال است',
            'color:#059669;font-weight:bold;font-size:12px'
        );
    }, 3200);

})();
