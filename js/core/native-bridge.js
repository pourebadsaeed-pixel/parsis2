/* ============================================================
   پارسیس — پل نیتیو اندروید (Capacitor)
   مسیر: js/core/native-bridge.js

   فقط روی پلتفرم نیتیو (اپ اندروید) فعال می‌شود؛
   در مرورگر/سرویس‌ورکر هیچ اثری ندارد.

   قابلیت‌ها:
     ۱. هندل دکمه بازگشت اندروید (پاپ‌آپ → سایدبار → صفحه اصلی → خروج با دو بار زدن)
     ۲. رهگیری دانلودها (خروجی اکسل/پشتیبان/تصاویر) و ذخیره مستقیم در Download/Parsis فایل‌منیجر
        (✅ v2.0.7 — کادر اشتراک‌گذاری فقط وقتی ذخیره نیتیو ممکن نشد باز می‌شود)
     ۳. پنهان‌سازی اسپلش‌اسکرین پس از آماده شدن
     ۴. رنگ نوار وضعیت هماهنگ با اپ
     ۵. هپتیک ملایم در رویدادهای مهم
   ============================================================ */
'use strict';

(function () {
    function _isNative() {
        try {
            return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
        } catch (e) { return false; }
    }

    if (!_isNative()) return; /* در مرورگر وب هیچ اجرا نمی‌شود */

    var C = window.Capacitor;
    var Plugins = (C && C.Plugins) || {};
    var App = Plugins.App;
    var SplashScreen = Plugins.SplashScreen;
    var StatusBar = Plugins.StatusBar;
    var Haptics = Plugins.Haptics;
    var Share = Plugins.Share;
    var Filesystem = Plugins.Filesystem;
    var Toast = Plugins.Toast;

    function toastShort(msg) {
        try { Toast && Toast.show({ text: msg, duration: 'short' }); } catch (e) {}
    }

    /* ---------- ۳. پنهان‌سازی اسپلش ---------- */
    function hideSplash() {
        try { SplashScreen && SplashScreen.hide({ fadeOutDuration: 300 }); } catch (e) {}
    }
    if (document.readyState === 'complete') { setTimeout(hideSplash, 400); }
    else { window.addEventListener('load', function () { setTimeout(hideSplash, 400); }); }

    /* ---------- ۴. نوار وضعیت ---------- */
    try { StatusBar && StatusBar.setBackgroundColor({ color: '#1e3a8a' }); } catch (e) {}

    /* ---------- ۲. رهگیری دانلود فایل‌ها ---------- */
    function saveAndShare(href, filename) {
        filename = (filename || 'parsis-file').replace(/[\\/:*?"<>|]/g, '-');
        var Parsis = Plugins.Parsis;
        var fail = function () { toastShort('⚠️ ذخیره فایل ناموفق بود'); };
        /* مسیر قدیمی: نوشتن در حافظهٔ موقت + کادر اشتراک‌گذاری — فقط به‌عنوان جایگزین */
        function legacyShare(b64, mime) {
            try {
                var dir = Filesystem && Filesystem.Directory ? Filesystem.Directory.Cache : 'CACHE';
                Filesystem.writeFile({
                    path: 'parsis/' + filename,
                    data: b64,
                    directory: dir,
                    recursive: true
                }).then(function (w) {
                    return Filesystem.getUri({ path: 'parsis/' + filename, directory: dir });
                }).then(function (u) {
                    if (Share) {
                        return Share.share({ title: filename, text: filename, files: [u.uri], dialogTitle: 'ذخیره/اشتراک‌گذاری فایل' });
                    }
                    toastShort('💾 در حافظه موقت ذخیره شد: parsis/' + filename);
                }).catch(fail);
            } catch (e2) { fail(); }
        }
        try {
            fetch(href)
                .then(function (res) { return res.blob(); })
                .then(function (blob) {
                    var reader = new FileReader();
                    reader.onloadend = function () {
                        try {
                            var dataUrl = String(reader.result || '');
                            var b64 = dataUrl.indexOf(',') !== -1 ? dataUrl.split(',')[1] : dataUrl;
                            var mime = (blob && blob.type) || 'application/octet-stream';
                            /* ✅ v2.0.7 — ذخیره مستقیم در Download/Parsis تا در فایل‌منیجر
                               دیده شود؛ کادر اشتراک‌گذاری دیگر پیش‌فرض نیست */
                            if (Parsis && typeof Parsis.saveFile === 'function') {
                                Parsis.saveFile({ name: filename, mime: mime, base64: b64 })
                                    .then(function (r) {
                                        if (r && r.ok) {
                                            toastShort('✅ فایل در پوشهٔ Download/Parsis ذخیره شد: ' + filename);
                                        } else {
                                            legacyShare(b64, mime);
                                        }
                                    })
                                    .catch(function () { legacyShare(b64, mime); });
                            } else {
                                legacyShare(b64, mime);
                            }
                        } catch (e2) { fail(); }
                    };
                    reader.onerror = fail;
                    reader.readAsDataURL(blob);
                })
                .catch(fail);
        } catch (e) { fail(); }
    }

    document.addEventListener('click', function (e) {
        var a = (e.target && e.target.closest) ? e.target.closest('a[download]') : null;
        if (!a) return;
        var href = a.getAttribute('href') || '';
        if (href.indexOf('blob:') !== 0 && href.indexOf('data:') !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        try { Haptics && Haptics.impact({ style: Haptics.ImpactStyle ? Haptics.ImpactStyle.Light : 'LIGHT' }); } catch (e2) {}
        saveAndShare(href, a.getAttribute('download'));
        return false;
    }, true);

    /* ---------- ۱. دکمه بازگشت اندروید ---------- */
    var _lastBack = 0;

    function closeWelcomeIfOpen() {
        var el = document.getElementById('welcome-overlay');
        if (!el) return false;
        el.remove();
        return true;
    }

    function closeSidebarIfOpen() {
        var sb = document.getElementById('sidebar');
        if (sb && (sb.classList.contains('open') || sb.classList.contains('active'))) {
            if (typeof closeSidebar === 'function') closeSidebar();
            return true;
        }
        var ov = document.getElementById('overlay');
        if (ov && getComputedStyle(ov).display !== 'none' && ov.style.visibility !== 'hidden') {
            if (typeof closeSidebar === 'function') { closeSidebar(); return true; }
        }
        return false;
    }

    function closeSettingsIfOpen() {
        if (typeof closeSettings === 'function') {
            var st = document.getElementById('settings-panel');
            if (st && !st.classList.contains('hidden') && getComputedStyle(st).display !== 'none') {
                closeSettings();
                return true;
            }
        }
        return false;
    }

    function closeGenericModalIfOpen() {
        var m = document.querySelector('.modal.show .modal-close, .modal-overlay.show .modal-close, .popup.open [data-close]');
        if (m) { m.click(); return true; }
        return false;
    }

    function goHomeIfNotThere() {
        var active = document.querySelector('.page.active');
        if (active && active.id && active.id !== 'page-home') {
            if (typeof goToPage === 'function') { goToPage('home'); return true; }
            var btn = document.querySelector('button[data-page="home"]');
            if (btn) { btn.click(); return true; }
        }
        return false;
    }

    try {
        App && App.addListener('backButton', function () {
            if (closeWelcomeIfOpen()) return;
            if (closeSidebarIfOpen()) return;
            if (closeSettingsIfOpen()) return;
            if (closeGenericModalIfOpen()) return;
            if (goHomeIfNotThere()) return;

            /* دو بار بازگشت برای خروج */
            var now = Date.now();
            if (now - _lastBack < 2000) {
                try { App.exitApp(); } catch (e) {}
            } else {
                _lastBack = now;
                try { Haptics && Haptics.impact({ style: Haptics.ImpactStyle ? Haptics.ImpactStyle.Light : 'LIGHT' }); } catch (e2) {}
                toastShort('برای خروج، دکمه بازگشت را دوباره بزنید');
            }
        });
    } catch (e) { /* App plugin در دسترس نیست */ }

    /* ---------- ۵. پیامک‌های بانکی ورودی (اندروید) ----------
       ✅ v2.0.6 — پیامک زنده مستقیماً به فهرست «ثبت نشده‌ها» می‌رود */
    try {
        window.addEventListener('parsisSmsReceived', function (e) {
            var d = (e && e.detail) ? e.detail : {};
            /* Capacitor داده رویداد را مستقیماً روی شیء رویداد هم می‌گذارد */
            var body = String(d.body || (e && e.body) || '');
            if (!body) return;
            var live = true;
            try { live = DB.load('androidSmsLive', true) !== false; } catch (e0) {}
            if (!live) return;
            if (typeof window.handleMultipleIncomingSms === 'function') {
                window.handleMultipleIncomingSms(body, 'android', false);
                if (typeof window.updateSmsBadge === 'function') window.updateSmsBadge();
            } else if (typeof window.addSmsToInbox === 'function') {
                window.addSmsToInbox(body, 'android');
                if (typeof window.updateSmsBadge === 'function') window.updateSmsBadge();
            }
        });
    } catch (e) { /* غیرفعال */ }

    /* کشیدن پیامک‌های ذخیره‌شده هنگام خاموشی اپ (بافر نیتیو) از دل حافظه */
    function pullSmsBuffer() {
        try {
            var P = Plugins.Parsis;
            if (!P || !P.getSmsBuffer) return;
            P.getSmsBuffer().then(function (res) {
                var items = (res && res.items) || [];
                if (!items.length) return;
                var added = 0;
                for (var i = 0; i < items.length; i++) {
                    var live = true;
                    try { live = DB.load('androidSmsLive', true) !== false; } catch (e1) {}
                    if (!live) break;
                    if (typeof window.handleMultipleIncomingSms === 'function') {
                        var r2 = window.handleMultipleIncomingSms(String(items[i].body || ''), 'android-buffer', false);
                        if (r2 && r2.ok && (r2.matched + r2.unmatched) > 0) added++;
                    } else if (typeof window.addSmsToInbox === 'function' && window.addSmsToInbox(String(items[i].body || ''), 'android-buffer').ok) added++;
                }
                if (typeof window.updateSmsBadge === 'function') window.updateSmsBadge();
                if (added > 0 && typeof showToast === 'function') showToast('📱 ' + 'پیامک بانکی جدید از حافظه اضافه شد (' + toFa(added) + ')');
                try { P.clearSmsBuffer(); } catch (e2) {}
            }).catch(function () {});
        } catch (e) {}
    }
    setTimeout(pullSmsBuffer, 6000);
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') setTimeout(pullSmsBuffer, 1500);
    });

    /* ---------- علامت‌گذاری حالت نیتیو برای سایر ماژول‌ها ---------- */
    window.__PARSIS_NATIVE__ = true;
})();
