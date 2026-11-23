/* ============================================================
   پارسیس — یادآور سرسید اقساط (نوتیفیکیشن نیتیو اندروید)
   مسیر: js/modules/reminders.js

   قابلیت‌ها:
     • زمان‌بندی خودکار نوتیفیکیشن برای اقساط پرداخت‌نشده
       (۳ روز قبل، ۱ روز قبل و روز موعد — ساعت قابل تنظیم)
     • درخواست دسترسی نوتیفیکیشن (اندروید ۱۳ به بالا)
     • اتصال به بخش «اندروید» تنظیمات
   فقط روی اپ اندروید (Capacitor) فعال می‌شود؛ در مرورگر بی‌اثر است.
   ============================================================ */
'use strict';

(function () {

    var CFG_KEY = 'androidReminders';
    var SCHED_KEY = 'reminderScheduledIds';

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
        var c = DB.load(CFG_KEY, { enabled: false, daysBefore: [3, 1, 0], hour: 9 });
        if (!Array.isArray(c.daysBefore) || !c.daysBefore.length) c.daysBefore = [3, 1, 0];
        if (!c.hour) c.hour = 9;
        return c;
    }
    function saveCfg(c) { DB.save(CFG_KEY, c); }

    /* شناسه عددی پایدار برای هر (قسط، تاریخ، جایگاه) */
    function hashId(s) {
        var h = 0;
        s = 'parsis-rem-' + s;
        for (var i = 0; i < s.length; i++) {
            h = ((h << 5) - h) + s.charCodeAt(i);
            h |= 0;
        }
        return Math.abs(h) % 1900000000;
    }

    function jalaliToEpoch(jy, jm, jd, hour) {
        var g = jalaliToGregorian(jy, jm, jd);
        return new Date(g[0], g[1] - 1, g[2], hour || 9, 0, 0).getTime();
    }

    function moneyStr(v) {
        var s = (typeof formatMoney === 'function') ? formatMoney(v) : String(v || 0);
        return s;
    }

    /* ساخت فهرست نوتیفیکیشن‌ها بر اساس اقساط آینده */
    function buildNotifications() {
        var cfg = getCfg();
        if (!cfg.enabled) return [];
        var now = Date.now();
        var out = [];
        var facilities = DB.load('facilities', []);
        var MAX_DAYS_AHEAD = 90;

        facilities.forEach(function (f) {
            if (!f || f.status === 'settled' || f.status === 'inactive') return;
            (f.installments || []).forEach(function (inst) {
                if (!inst || inst.status === 'paid' || !inst.date) return;
                var p = normalizeDigits(inst.date).split('/').map(Number);
                if (p.length !== 3 || isNaN(p[0]) || isNaN(p[1]) || isNaN(p[2])) return;

                cfg.daysBefore.forEach(function (dBefore) {
                    var ts = jalaliToEpoch(p[0], p[1], p[2], cfg.hour) - dBefore * 86400000;
                    if (ts <= now) return;
                    if (ts > now + MAX_DAYS_AHEAD * 86400000) return;

                    var when;
                    if (dBefore === 0) when = 'امروز سرسید قسط است';
                    else if (dBefore === 1) when = 'فردا سرسید قسط است';
                    else when = 'سرسید قسط تا ' + toFa(dBefore) + ' روز دیگر';

                    out.push({
                        id: hashId(f.id + '|' + inst.date + '|' + dBefore),
                        title: '⏰ یادآور قسط: ' + (f.name || 'تسهیلات'),
                        body: when + ' — ' + moneyStr(inst.amount || 0) + ' ' + currencyLabel(),
                        schedule: { at: new Date(ts), allowWhileIdle: true }
                    });
                });
            });
        });

        out.sort(function (a, b) { return a.schedule.at.getTime() - b.schedule.at.getTime(); });
        return out.slice(0, 80);
    }

    async function checkPermission() {
        var p = getPlugin();
        if (!p) return 'browser';
        try {
            var st = await p.checkPermissions();
            return st && st.notifications ? st.notifications : 'unknown';
        } catch (e) { return 'unknown'; }
    }

    async function requestPermission() {
        var p = getPlugin();
        if (!p) return 'browser';
        try {
            var st = await p.requestPermissions();
            return st && st.notifications ? st.notifications : 'unknown';
        } catch (e) { return 'unknown'; }
    }

    /* زمان‌بندی مجدد کامل: لغو قبلی‌ها + ثبت جدیدها */
    async function reschedule(silent) {
        var p = getPlugin();
        if (!p) return;
        try {
            var perm = await checkPermission();
            if (perm !== 'granted') {
                if (getCfg().enabled && !silent) {
                    perm = await requestPermission();
                    if (perm !== 'granted') { updateStatus('⛔ بدون دسترسی نوتیفیکیشن'); return; }
                } else { updateStatus(); return; }
            }

            /* لغو زمان‌بندی‌های قبلی */
            var old = DB.load(SCHED_KEY, []);
            if (Array.isArray(old) && old.length) {
                try { await p.cancel({ notifications: old.map(function (i) { return { id: i }; }) }); } catch (e1) {}
            }

            var list = buildNotifications();
            if (list.length) await p.schedule({ notifications: list });
            DB.save(SCHED_KEY, list.map(function (n) { return n.id; }));

            if (!silent && typeof showToast === 'function') {
                showToast(list.length ? '⏰ ' + toFa(list.length) + ' یادآور زمان‌بندی شد' : 'قسطی برای یادآوری نیست');
            }
            updateStatus();
        } catch (e) {
            if (!silent && typeof showToast === 'function') showToast('⚠️ خطا در زمان‌بندی یادآورها');
        }
    }

    /* ---------- UI بخش تنظیمات ---------- */
    function updateStatus(forced) {
        var el = document.getElementById('set-andr-notif-status');
        if (!el) return;
        var cfg = getCfg();
        var p = getPlugin();
        if (!p) { el.textContent = '— فقط در اپ اندروید فعال است'; el.style.color = '#64748b'; return; }
        if (forced) { el.textContent = forced; el.style.color = '#b91c1c'; return; }
        checkPermission().then(function (perm) {
            if (!cfg.enabled) {
                el.textContent = '⏸ یادآور اقساط خاموش است';
                el.style.color = '#64748b';
            } else if (perm === 'granted') {
                var n = buildNotifications().length;
                el.textContent = '✅ فعال — ' + toFa(n) + ' یادآور زمان‌بندی‌شده';
                el.style.color = '#166534';
            } else {
                el.textContent = '⛔ دسترسی نوتیفیکیشن داده نشده';
                el.style.color = '#b91c1c';
            }
        });
    }

    function bindSettings() {
        var cb = document.getElementById('set-andr-rem');
        if (!cb || cb._remBound) return;
        cb._remBound = true;
        cb.checked = !!getCfg().enabled;
        cb.addEventListener('change', function () {
            var cfg = getCfg();
            cfg.enabled = cb.checked;
            saveCfg(cfg);
            reschedule(false);
        });

        var btn = document.getElementById('set-andr-notif-btn');
        if (btn && !btn._remBound) {
            btn._remBound = true;
            btn.addEventListener('click', async function () {
                var p = getPlugin();
                if (!p) { if (typeof showToast === 'function') showToast('این قابلیت فقط در اپ اندروید است.'); return; }
                var perm = await requestPermission();
                if (perm !== 'granted') { updateStatus('⛔ دسترسی داده نشد — از تنظیمات گوشی ← Apps ← پارسیس ← Notifications فعال کنید'); return; }
                if (typeof showToast === 'function') showToast('✅ دسترسی نوتیفیکیشن فعال شد');
                if (getCfg().enabled) reschedule(true);
                updateStatus();
            });
        }

        updateStatus();
    }

    /* بوت‌استرپ: زمان‌بندی مجدد هنگام باز شدن اپ + اتصال تنظیمات */
    if (isNative()) {
        setTimeout(function () { reschedule(true); }, 5000);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setTimeout.bind(null, bindSettings, 800));
    } else {
        setTimeout(bindSettings, 800);
    }

    window.ParsisReminders = {
        reschedule: reschedule,
        buildNotifications: buildNotifications,
        getCfg: getCfg,
        saveCfg: saveCfg,
        updateStatus: updateStatus
    };

    console.log('✅ [modules/reminders.js] loaded');
})();
