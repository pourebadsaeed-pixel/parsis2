/* ============================================================
   پارسیس — نوتیفیکیشن رویدادهای تقویم (✅ v2.7.2)
   مسیر: js/modules/calendar-notifications.js

   ✅ v2.7.2 — درخواست کاربر:
     «می‌خوام نوتیفیکیشن مربوط به تقویم به صورت پاپ آپ به صفحه اصلی
      گوشی بیاد، زیر هم دیگه و روش که کلیک کنم وارد اون رویداد یا
      یادآوری بشم»

   چه می‌کند:
     • برای رویدادهای ثبت‌شدهٔ کاربر در «مدیریت تقویم» (شامل تکرارشونده‌ها)
       نوتیفیکیشن زمان‌بندی می‌کند — «یادآور» هر رویداد (دقیقه قبل)
       رعایت می‌شود؛ مقدار ۰ = زمان خود رویداد.
     • کانال نوتیفیکیشن با اهمیت بالا (HIGH) ساخته می‌شود → نوتیف
       به‌صورت پاپ‌آپ (Heads-up) روی صفحه اصلی گوشی ظاهر می‌شود.
     • هر رویداد شناسهٔ عددی یکتا دارد → نوتیف‌ها «زیر هم» دیده می‌شوند
       (پشت‌سرهم، بدون جایگزین‌شدن).
     • کلیک روی نوتیف → اپ باز می‌شود، صفحهٔ تقویم (نمای روز) باز می‌شود
       و همان رویداد در مودال ویرایش/مشاهده باز می‌شود.

   فقط روی اپ اندروید (Capacitor) فعال است؛ در مرورگر بی‌اثر است.
   فعال‌سازی: تنظیمات ← بخش «🤖 اندروید» ← «نوتیفیکیشن رویدادهای تقویم»
   ============================================================ */
'use strict';

(function () {

    var CFG_KEY  = 'androidCalNotifs';
    var SCHED_KEY = 'calNotifScheduledIds';
    var LINK_KEY  = 'calNotifLinks';   /* نگاشت id عددی → {rawId, date} */
    var CHANNEL_ID = 'parsis-calendar';
    var MAX_DAYS = 45;
    var MAX_NOTIFS = 90;

    function isNative() {
        try {
            return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
        } catch (e) { return false; }
    }

    function getPlugin() {
        if (!isNative()) return null;
        var p = window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
        return p || null;
    }

    function getCfg() {
        var c = DB.load(CFG_KEY, { enabled: false });
        if (!c || typeof c !== 'object') c = { enabled: false };
        c.enabled = !!c.enabled;
        return c;
    }
    function saveCfg(c) { DB.save(CFG_KEY, c); }

    function hashId(s) {
        var h = 0;
        s = 'parsis-cal-' + s;
        for (var i = 0; i < s.length; i++) {
            h = ((h << 5) - h) + s.charCodeAt(i);
            h |= 0;
        }
        return Math.abs(h) % 1900000000;
    }

    /* تبدیل (تاریخ شمسی + ساعت) → epoch محلی */
    function jalaliTimeToEpoch(dateStr, hhmm) {
        try {
            var p = String(dateStr || '').split('/').map(Number);
            if (p.length !== 3 || isNaN(p[0]) || isNaN(p[1]) || isNaN(p[2])) return null;
            var g = jalaliToGregorian(p[0], p[1], p[2]);
            var t = String(hhmm || '09:00').split(':').map(Number);
            var hh = (t.length === 2 && !isNaN(t[0])) ? t[0] : 9;
            var mm = (t.length === 2 && !isNaN(t[1])) ? t[1] : 0;
            return new Date(g[0], g[1] - 1, g[2], hh, mm, 0).getTime();
        } catch (e) { return null; }
    }

    /* ------------------------------------------------------------
       ساخت فهرست نوتیفیکیشن‌ها از رویدادهای تقویم کاربر
       ------------------------------------------------------------ */
    function buildNotifications() {
        var cfg = getCfg();
        if (!cfg.enabled) return [];

        var now = Date.now();
        var out = [];
        var links = {};

        try {
            var evs = (typeof calBuildAllEvents === 'function')
                ? calBuildAllEvents()
                : [];
            evs.forEach(function (ev) {
                /* فقط رویدادهای خود کاربر (نه اقساط/دریافتنی/پیش‌فرض) */
                if (!ev.rawId || ev.readonly || ev.builtin) return;

                var rem = Number(ev.reminder) || 0; /* دقیقه قبل؛ ۰ = زمان رویداد */
                var ts = jalaliTimeToEpoch(ev.startDate || ev.date, ev.startTime || ev.time);
                if (ts === null) return;
                ts = ts - rem * 60000;

                if (ts <= now) return;                          /* گذشته */
                if (ts > now + MAX_DAYS * 86400000) return;    /* خیلی دور */

                var id = hashId(ev.rawId + '|' + ev.date + '|' + (ev.time || ''));
                var p = String(ev.date || '').split('/');
                var whenTxt = toFa(p[2]) + '/' + toFa(p[1]) + ' — ' + toFaTime(String(ev.time || ''));
                var body = whenTxt + (ev.location ? ' | 📍 ' + ev.location : '');

                out.push({
                    id: id,
                    title: '🔔 ' + (ev.title || 'رویداد تقویم'),
                    body: body,
                    schedule: { at: new Date(ts), allowWhileIdle: true, channelId: CHANNEL_ID }
                });
                links[id] = { rawId: ev.rawId, date: ev.date };
            });
        } catch (e) {}

        out.sort(function (a, b) { return a.schedule.at.getTime() - b.schedule.at.getTime(); });
        out = out.slice(0, MAX_NOTIFS);

        /* فقط لینک‌های نوتیف‌های نهایی ذخیره شود */
        var finalLinks = {};
        out.forEach(function (n) { if (links[n.id]) finalLinks[n.id] = links[n.id]; });
        DB.save(LINK_KEY, finalLinks);

        return out;
    }

    function toFaTime(s) {
        return String(s || '').replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; });
    }

    /* ------------------------------------------------------------
       کانال با اهمیت بالا → نمایش پاپ‌آپی (heads-up) روی صفحه اصلی
       ------------------------------------------------------------ */
    async function ensureChannel(p) {
        try {
            if (!p || !p.createChannel) return;
            await p.createChannel({
                id: CHANNEL_ID,
                name: 'رویدادهای تقویم پارسیس',
                description: 'یادآور رویدادها و قرارهای تقویم',
                importance: 5,          /* HIGH → پاپ‌آپ */
                visibility: 'public',
                vibration: true,
                lights: true,
                lightColor: '#2563eb'
            });
        } catch (e) {}
    }

    /* ------------------------------------------------------------
       زمان‌بندی مجدد کامل
       ------------------------------------------------------------ */
    async function reschedule(silent) {
        var p = getPlugin();
        if (!p) return;
        try {
            var perm = 'granted';
            try {
                var st = await p.checkPermissions();
                perm = (st && st.notifications) ? st.notifications : 'unknown';
            } catch (eP) {}

            if (perm !== 'granted') {
                if (getCfg().enabled && !silent) {
                    perm = (await p.requestPermissions());
                    perm = (perm && perm.notifications) ? perm.notifications : 'unknown';
                    if (perm !== 'granted') { updateStatus('⛔ بدون دسترسی نوتیفیکیشن'); return; }
                } else { updateStatus(); return; }
            }

            await ensureChannel(p);

            /* لغو قبلی‌ها */
            var old = DB.load(SCHED_KEY, []);
            if (Array.isArray(old) && old.length) {
                try { await p.cancel({ notifications: old.map(function (i) { return { id: i }; }) }); } catch (eC) {}
            }

            var list = buildNotifications();
            if (list.length) await p.schedule({ notifications: list });
            DB.save(SCHED_KEY, list.map(function (n) { return n.id; }));

            if (!silent && typeof showToast === 'function') {
                showToast(list.length
                    ? '🔔 ' + toFa(list.length) + ' نوتیفیکیشن تقویم زمان‌بندی شد'
                    : 'رویدادی برای نوتیفیکیشن نیست');
            }
            updateStatus();
        } catch (e) {
            if (!silent && typeof showToast === 'function') showToast('⚠️ خطا در زمان‌بندی نوتیفیکیشن تقویم');
        }
    }

    /* ------------------------------------------------------------
       کلیک روی نوتیف → ورود به همان رویداد
       ------------------------------------------------------------ */
    function openFromNotification(id) {
        try {
            var links = DB.load(LINK_KEY, {});
            var info = links[id];
            if (!info || !info.rawId) {
                /* حتی بدون لینک: برو به صفحه تقویم */
                if (typeof window.goToPage === 'function') window.goToPage('jalali-calendar');
                return;
            }
            if (typeof window.goToPage === 'function') window.goToPage('jalali-calendar');
            setTimeout(function () {
                if (typeof window.calOpenEventOccurrence === 'function') {
                    var ok = window.calOpenEventOccurrence(info.rawId, info.date);
                    if (!ok && typeof showToast === 'function')
                        showToast('رویداد یافت نشد — شاید حذف شده باشد');
                }
            }, 350);
        } catch (e) {}
    }

    function bindClickListener(p) {
        if (!p || !p.addListener || p.__calNotifBound) return;
        p.__calNotifBound = true;
        try {
            p.addListener('localNotificationClick', function (res) {
                /* اگر اپ با کلیک روی نوتیف باز شده باشد، Capacitor این رویداد را پس از لود می‌فرستد */
                var n = res && res.notification;
                if (!n) return;
                setTimeout(function () { openFromNotification(n.id); }, 400);
            });
        } catch (e) {}
    }

    /* ------------------------------------------------------------
       UI بخش تنظیمات
       ------------------------------------------------------------ */
    function updateStatus() {
        var el = document.getElementById('set-andr-calnotif');
        if (!el) return;
        var cfg = getCfg();
        var p = getPlugin();

        var box = document.getElementById('set-andr-notif-status');
        if (!cfg.enabled) {
            el.checked = false;
            if (box && !box.textContent) box.textContent = '⏸ نوتیفیکیشن تقویم خاموش است';
            return;
        }
        el.checked = true;
        if (!p) {
            if (box && !box.textContent) box.textContent = '— فقط در اپ اندروید فعال است';
        }
    }

    function bindSettings() {
        var cb = document.getElementById('set-andr-calnotif');
        if (cb && !cb._calNotifBound) {
            cb._calNotifBound = true;
            cb.checked = getCfg().enabled;
            cb.addEventListener('change', function () {
                var cfg = getCfg();
                cfg.enabled = !!cb.checked;
                saveCfg(cfg);
                if (cb.checked) reschedule(false);
                else {
                    /* خاموش: نوتیف‌های زمان‌بندی‌شدهٔ تقویم لغو شوند */
                    var p = getPlugin();
                    if (p) {
                        var old = DB.load(SCHED_KEY, []);
                        if (Array.isArray(old) && old.length) {
                            try {
                                p.cancel({ notifications: old.map(function (i) { return { id: i }; }) });
                            } catch (eC) {}
                        }
                    }
                    DB.save(SCHED_KEY, []);
                    if (typeof showToast === 'function') showToast('⏸ نوتیفیکیشن تقویم خاموش شد');
                }
                updateStatus();
            });
        }
        updateStatus();
    }

    /* ------------------------------------------------------------
       بوت‌استرپ
       ------------------------------------------------------------ */
    function boot() {
        var p = getPlugin();
        if (p) {
            bindClickListener(p);
            if (getCfg().enabled) {
                setTimeout(function () { reschedule(true); }, 7000);
                /* هر بار دادهٔ تقویم عوض شد، دوباره زمان‌بندی شود */
                var _origSave = DB.save;
                if (!DB.save.__calNotifHooked) {
                    DB.save = function (k, v) {
                        var r = _origSave.apply(this, arguments);
                        if (k === 'calendarUserEvents' || k === 'calendarRecOverrides') {
                            clearTimeout(DB.__calNotifTimer);
                            DB.__calNotifTimer = setTimeout(function () { reschedule(true); }, 2500);
                        }
                        return r;
                    };
                    DB.save.__calNotifHooked = true;
                }
            }
        }
        setTimeout(bindSettings, 900);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 1200); });
    } else {
        setTimeout(boot, 1200);
    }

    window.ParsisCalNotifs = {
        reschedule: reschedule,
        buildNotifications: buildNotifications,
        getCfg: getCfg,
        saveCfg: saveCfg,
        openFromNotification: openFromNotification
    };

    console.log('✅ [modules/calendar-notifications.js] loaded — v2.7.2 (پاپ‌آپ + زیر هم + کلیک = ورود به رویداد)');
})();
