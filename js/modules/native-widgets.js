/* ============================================================
   پارسیس — ویجت‌های صفحه اصلی گوشی (اندروید) + تنظیمات اندروید
   مسیر: js/modules/native-widgets.js

   قابلیت‌ها:
     • ساخت اسنپ‌شات داده (بانک‌ها/صندوق‌ها/یادآورها) از همان منابع
       ویجت‌های داخل برنامه و ارسال به لایه نیتیو برای نمایش
       در ویجت‌های صفحه اصلی گوشی
     • اتصال رابط تنظیمات «🤖 اندروید»: دسترسی پیامک، ایمپورت
       پیامک‌های اینباکس، دریافت زنده پیامک، رفرش ویجت‌ها
   روی مرورگر بی‌اثر است (فقط بایند کردن تنظیمات با پیام راهنما).
   ============================================================ */
'use strict';

(function () {

    function isNative() {
        try {
            return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
        } catch (e) { return false; }
    }

    function getParsis() {
        if (!isNative()) return null;
        var p = window.Capacitor.Plugins && window.Capacitor.Plugins.Parsis;
        return p || null;
    }

    function moneyStr(v) {
        return (typeof formatMoney === 'function') ? formatMoney(v) : String(v || 0);
    }

    /* ============================================================
       ساخت اسنپ‌شات ویجت‌ها — از همان منطق ویجت‌های داشبورد
       ============================================================ */
    function buildSnapshot() {
        var snap = { updatedAt: '', bank: { total: '—', rows: [] }, cash: { total: '—', rows: [] }, agenda: { rows: [] },
            summary: { rows: [] }, notes: { rows: [] }, facility: { rows: [] } };
        try { snap.updatedAt = todayJalaliStr() + ' — ' + tsToJalaliTime(Date.now()); } catch (e) {}

        /* ---------- بانک‌ها (همان فیلتر ویجت داشبورد) ---------- */
        try {
            var banks = DB.load('bankAccounts', []).filter(isVisibleInDash)
                .filter(function (b) { return b.showInBankWidget !== false; })
                .filter(function (b) { return !(b.status === 'inactive' || b.active === false); })
                .sort(function (a, b) {
                    var oa = Number(a.order) || 9999, ob = Number(b.order) || 9999;
                    if (oa !== ob) return oa - ob;
                    return (a.bank || '').localeCompare(b.bank || '', 'fa');
                });
            var total = 0, shown = 0;
            banks.forEach(function (b) {
                var bal = getBankBalance(b.id);
                if (bal === 0 && !(Number(b.minBalance) || 0)) return;
                shown++; total += bal;
                snap.bank.rows.push({
                    t: String(b.bank || '—'),
                    v: moneyStr(bal) + ' ' + currencyLabel(),
                    s: String(b.iban || '').slice(-4) ? '...' + String(b.iban || '').slice(-4) : ''
                });
                if (snap.bank.rows.length >= 8) return;
            });
            snap.bank.total = shown ? moneyStr(total) + ' ' + currencyLabel() : '—';
        } catch (e) {}

        /* ---------- صندوق‌ها ---------- */
        try {
            var cbs = DB.load('cashBoxes', []).filter(isVisibleInDash)
                .filter(function (c) { return !(c.status === 'inactive' || c.active === false); })
                .sort(function (a, b) {
                    var oa = Number(a.order) || 9999, ob = Number(b.order) || 9999;
                    if (oa !== ob) return oa - ob;
                    return (a.title || '').localeCompare(b.title || '', 'fa');
                });
            var cTotal = 0, cShown = 0;
            cbs.forEach(function (c) {
                var bal = getCashBoxBalance(c.id);
                if (bal === 0) return;
                cShown++; cTotal += bal;
                if (snap.cash.rows.length < 6) {
                    snap.cash.rows.push({ t: String(c.title || '—'), v: moneyStr(bal) + ' ' + currencyLabel(), s: '' });
                }
            });
            snap.cash.total = cShown ? moneyStr(cTotal) + ' ' + currencyLabel() : '—';
        } catch (e) {}

        /* ---------- ✅ v2.1.0 — ویجت خلاصه داشبورد ---------- */
        try {
            var sumRows = [];
            sumRows.push({ t: '🏦 بانک‌ها', v: snap.bank.total || '—', s: '' });
            sumRows.push({ t: '💰 صندوق‌ها', v: snap.cash.total || '—', s: '' });
            var monthPrefix = String(todayJalaliStr() || '').slice(0, 7);
            var vCount = 0;
            DB.load('vouchers', []).forEach(function (v) {
                if (!v || v.status !== 'approved') return;
                if (String(v.date || '').indexOf(monthPrefix) === 0) vCount++;
            });
            sumRows.push({ t: '📄 اسناد این ماه', v: toFa(vCount) + ' سند', s: '' });
            try {
                var pend = 0;
                var inbox = DB.load('smsInbox', []);
                if (Array.isArray(inbox)) inbox.forEach(function (m) { if (m && !m.matched && !m.ignored) pend++; });
                if (pend > 0) sumRows.push({ t: '📱 پیامک ثبت‌نشده', v: toFa(pend) + ' پیام', s: '' });
            } catch (e6) {}
            snap.summary.rows = sumRows.slice(0, 4);
        } catch (e5) {}

        /* ---------- ✅ v2.1.0 — ویجت اقساط پیش‌رو ---------- */
        try {
            var facRows = [];
            var todayF = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
            var fY = todayF[0], fM = todayF[1], fD = todayF[2];
            DB.load('facilities', []).forEach(function (f) {
                if (!f || f.status === 'settled' || f.status === 'inactive') return;
                (f.installments || []).forEach(function (inst) {
                    if (!inst || inst.status === 'paid' || !inst.date) return;
                    var p = normalizeDigits(inst.date).split('/').map(Number);
                    if (p.length !== 3 || isNaN(p[0]) || isNaN(p[1]) || isNaN(p[2])) return;
                    var diff = jalaliDiff(fY, fM, fD, p[0], p[1], p[2]);
                    if (diff < 0 || diff > 30) return;
                    facRows.push({
                        d: diff,
                        t: (f.name || 'قسط'),
                        v: moneyStr(inst.amount || 0) + ' ' + currencyLabel(),
                        s: toFa(inst.date) + (diff === 0 ? ' — امروز' : diff === 1 ? ' — فردا' : ' — ' + toFa(diff) + ' روز دیگر')
                    });
                });
            });
            facRows.sort(function (a, b) { return a.d - b.d; });
            snap.facility.rows = facRows.slice(0, 6);
        } catch (e4) {}

        /* ---------- ✅ v2.1.0 — ویجت یادداشت‌ها و چک‌لیست ---------- */
        try {
            var noteRows = [];
            var todayStr = todayJalaliStr();
            [['personal', '⭐ شخصی'], ['family', '🏠 خانواده'], ['work', '💼 شغلی']].forEach(function (pair) {
                var cnt = 0;
                DB.load('notes', []).forEach(function (n) {
                    if (!n || n.archived || (n.category || 'personal') !== pair[0]) return;
                    (n.checklist || []).forEach(function (c) {
                        if (c.text && !c.done && n.date === todayStr) cnt++;
                    });
                });
                if (cnt > 0) noteRows.push({ t: pair[1] + ' امروز', v: toFa(cnt) + ' مورد', s: '' });
            });
            var recent = DB.load('notes', []).filter(function (n) { return n && !n.archived && n.title; })
                .sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); })
                .slice(0, 3);
            recent.forEach(function (n) {
                noteRows.push({ t: String(n.title || '').slice(0, 28), v: toFa(n.date || ''), s: '' });
            });
            snap.notes.rows = noteRows.slice(0, 6);
        } catch (e7) {}

        /* ---------- یادآورها: اقساط + تولدها + چک‌لیست ---------- */
        try {
            var agenda = [];
            var today = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
            var tY = today[0], tM = today[1], tD = today[2];

            DB.load('facilities', []).forEach(function (f) {
                if (!f || f.status === 'settled' || f.status === 'inactive') return;
                (f.installments || []).forEach(function (inst) {
                    if (!inst || inst.status === 'paid' || !inst.date) return;
                    var p = normalizeDigits(inst.date).split('/').map(Number);
                    if (p.length !== 3 || isNaN(p[0]) || isNaN(p[1]) || isNaN(p[2])) return;
                    var diff = jalaliDiff(tY, tM, tD, p[0], p[1], p[2]);
                    if (diff < 0 || diff > 7) return;
                    agenda.push({
                        d: diff,
                        t: '⏰ ' + (f.name || 'قسط'),
                        v: moneyStr(inst.amount || 0) + ' ' + currencyLabel(),
                        s: toFa(inst.date) + (diff === 0 ? ' — امروز' : diff === 1 ? ' — فردا' : ' — ' + toFa(diff) + ' روز دیگر')
                    });
                });
            });

            DB.load('persons', []).forEach(function (p) {
                if (!p || !p.birth || p.showInBirthdayWidget === false || !isVisibleInDash(p)) return;
                var info = getBirthdayInfo(p.birth);
                if (!info || info.daysRemaining < 0 || info.daysRemaining > 14) return;
                agenda.push({
                    d: 100 + info.daysRemaining,
                    t: '🎂 ' + ((p.first || '') + ' ' + (p.last || '')).trim(),
                    v: toFa(info.birthMonth) + '/' + toFa(info.birthDay),
                    s: info.dow + (info.daysRemaining === 0 ? ' — امروز' : info.daysRemaining === 1 ? ' — فردا' : ' — ' + toFa(info.daysRemaining) + ' روز دیگر')
                });
            });

            [['personal', '⭐ شخصی'], ['family', '🏠 خانواده'], ['work', '💼 شغلی']].forEach(function (pair) {
                try {
                    var todayStr = todayJalaliStr();
                    var cnt = 0;
                    DB.load('notes', []).forEach(function (n) {
                        if (n.archived || (n.category || 'personal') !== pair[0]) return;
                        (n.checklist || []).forEach(function (c) {
                            if (c.text && !c.done && n.date !== todayStr) cnt++;
                        });
                    });
                    if (cnt > 0) agenda.push({ d: 200, t: pair[1] + ' چک‌لیست', v: toFa(cnt) + ' مورد', s: '' });
                } catch (e2) {}
            });

            agenda.sort(function (a, b) { return a.d - b.d; });
            snap.agenda.rows = agenda.slice(0, 8);
        } catch (e3) {}

        return snap;
    }

    function pushWidgets(silent) {
        var P = getParsis();
        if (!P || !P.pushWidgetData) return;
        try {
            P.pushWidgetData({ json: JSON.stringify(buildSnapshot()) }).then(function () {
                if (!silent && typeof showToast === 'function') showToast('📱 ویجت‌های صفحه اصلی به‌روزرسانی شد');
                updateWidgetStatus();
            }).catch(function () {});
        } catch (e) {}
    }

    /* ============================================================
       رابط تنظیمات «🤖 اندروید»
       ============================================================ */
    function toast(msg) {
        if (typeof showToast === 'function') showToast(msg);
    }

    function updateWidgetStatus() {
        var el = document.getElementById('set-andr-widgets-status');
        if (!el) return;
        var P = getParsis();
        if (!P) { el.textContent = '— فقط در اپ اندروید'; el.style.color = '#64748b'; return; }
        el.textContent = '✅ داده ویجت‌ها ارسال شد (' + buildSnapshot().bank.rows.length + ' حساب بانکی)';
        el.style.color = '#166534';
    }

    async function requestSmsPerm() {
        var P = getParsis();
        if (!P || !P.requestSmsPermissions) { toast('این قابلیت فقط در اپ اندروید است.'); return 'browser'; }
        try {
            var r = await P.requestSmsPermissions();
            return r && r.granted ? 'granted' : 'denied';
        } catch (e) { return 'denied'; }
    }

    async function checkSmsPerm() {
        var P = getParsis();
        if (!P || !P.hasSmsPermission) return 'browser';
        try {
            var r = await P.hasSmsPermission();
            return r && r.granted ? 'granted' : 'denied';
        } catch (e) { return 'unknown'; }
    }

    function updateSmsStatus() {
        var el = document.getElementById('set-andr-sms-status');
        if (!el) return;
        var P = getParsis();
        if (!P) { el.textContent = '— فقط در اپ اندروید'; el.style.color = '#64748b'; return; }
        checkSmsPerm().then(function (st) {
            if (st === 'granted') { el.textContent = '✅ دسترسی پیامک فعال است'; el.style.color = '#166534'; }
            else { el.textContent = '⛔ دسترسی پیامک داده نشده'; el.style.color = '#b91c1c'; }
        });
    }

    /* ============================================================
       ✅ v2.7.2 — دسترسی دوربین و آلارم دقیق (درخواست کاربر:
       «نرم‌افزار اندروید به فایل‌ها، دوربین و آلارم دسترسی داشته باشه»)
       ============================================================ */
    async function requestCameraPerm() {
        var P = getParsis();
        if (!P || !P.requestCameraAndMediaPermissions) {
            if (typeof showToast === 'function') showToast('این قابلیت فقط در اپ اندروید است.');
            return 'browser';
        }
        try {
            var r = await P.requestCameraAndMediaPermissions();
            return r && r.granted ? 'granted' : 'requested';
        } catch (e) { return 'denied'; }
    }

    async function checkCameraPerm() {
        var P = getParsis();
        if (!P || !P.hasCameraPermission) return 'browser';
        try {
            var r = await P.hasCameraPermission();
            return r && r.granted ? 'granted' : 'denied';
        } catch (e) { return 'unknown'; }
    }

    async function checkAlarmPerm() {
        var P = getParsis();
        if (!P || !P.hasExactAlarmPermission) return 'browser';
        try {
            var r = await P.hasExactAlarmPermission();
            return r && r.granted ? 'granted' : 'denied';
        } catch (e) { return 'unknown'; }
    }

    function requestAlarmPerm() {
        var P = getParsis();
        if (!P || !P.requestExactAlarmPermission) {
            if (typeof showToast === 'function') showToast('این قابلیت فقط در اپ اندروید است.');
            return;
        }
        try {
            P.requestExactAlarmPermission().then(function () {
                if (typeof showToast === 'function') showToast('⏰ صفحهٔ اجازهٔ آلارم دقیق باز شد — اجازه را فعال کنید');
                setTimeout(updateAlarmStatus, 2500);
            }).catch(function () {});
        } catch (e) {}
    }

    function updateCameraStatus() {
        var el = document.getElementById('set-andr-camera-status');
        if (!el) return;
        var P = getParsis();
        if (!P) { el.textContent = '— فقط در اپ اندروید'; el.style.color = '#64748b'; return; }
        checkCameraPerm().then(function (st) {
            if (st === 'granted') { el.textContent = '✅ دسترسی دوربین فعال است'; el.style.color = '#166534'; }
            else { el.textContent = '⛔ دسترسی دوربین داده نشده (برای عکس پیوست اسناد)'; el.style.color = '#b91c1c'; }
        });
    }

    function updateAlarmStatus() {
        var el = document.getElementById('set-andr-alarm-status');
        if (!el) return;
        var P = getParsis();
        if (!P) { el.textContent = '— فقط در اپ اندروید'; el.style.color = '#64748b'; return; }
        checkAlarmPerm().then(function (st) {
            if (st === 'granted') { el.textContent = '✅ آلارم دقیق فعال است (یادآورها سر وقت می‌آیند)'; el.style.color = '#166534'; }
            else { el.textContent = '⛔ آلارم دقیق فعال نیست (اندروید ۱۲+ — برای یادآورهای دقیق)'; el.style.color = '#b91c1c'; }
        });
    }

    function bindSettings() {
        var smsBtn = document.getElementById('set-andr-sms-btn');
        if (smsBtn && !smsBtn._awBound) {
            smsBtn._awBound = true;
            smsBtn.addEventListener('click', async function () {
                var st = await requestSmsPerm();
                if (st === 'granted') toast('✅ دسترسی پیامک فعال شد');
                /* اجازه بده پنجره سیستم بسته شود بعد وضعیت را چک کن */
                setTimeout(updateSmsStatus, 1200);
            });
        }

        var impBtn = document.getElementById('set-andr-import-btn');
        if (impBtn && !impBtn._awBound) {
            impBtn._awBound = true;
            impBtn.addEventListener('click', async function () {
                var P = getParsis();
                if (!P || !P.readInboxSms) { toast('این قابلیت فقط در اپ اندروید است.'); return; }
                var st = await checkSmsPerm();
                if (st !== 'granted') { toast('ابتدا دسترسی پیامک را فعال کنید.'); return; }
                try {
                    var r = await P.readInboxSms({ days: 30, limit: 500 });
                    var items = (r && r.items) || [];
                    var added = 0;
                    if (typeof window.addSmsToInbox === 'function') {
                        for (var i = 0; i < items.length; i++) {
                            if (window.addSmsToInbox(String(items[i].body || ''), 'android-inbox').ok) added++;
                        }
                    }
                    if (typeof window.updateSmsBadge === 'function') window.updateSmsBadge();
                    toast(added ? '📥 ' + toFa(added) + ' پیامک بانکی از اینباکس اضافه شد' : 'پیامک بانکی جدیدی در اینباکس نیست');
                } catch (e) { toast('⚠️ خواندن اینباکس ناموفق بود'); }
            });
        }

        var liveCb = document.getElementById('set-andr-sms-live');
        if (liveCb && !liveCb._awBound) {
            liveCb._awBound = true;
            liveCb.checked = DB.load('androidSmsLive', true) !== false;
            liveCb.addEventListener('change', function () {
                DB.save('androidSmsLive', !!liveCb.checked);
                toast(liveCb.checked ? '📱 دریافت زنده پیامک فعال شد' : 'دریافت زنده پیامک خاموش شد');
            });
        }

        var wBtn = document.getElementById('set-andr-widgets-btn');
        if (wBtn && !wBtn._awBound) {
            wBtn._awBound = true;
            wBtn.addEventListener('click', function () {
                if (!getParsis()) { toast('این قابلیت فقط در اپ اندروید است.'); return; }
                pushWidgets(false);
            });
        }

        /* ✅ v2.7.2 — دوربین و آلارم دقیق */
        var camBtn = document.getElementById('set-andr-camera-btn');
        if (camBtn && !camBtn._awBound) {
            camBtn._awBound = true;
            camBtn.addEventListener('click', async function () {
                var st = await requestCameraPerm();
                if (st === 'granted') toast('✅ دسترسی دوربین و رسانه فعال است');
                else if (st === 'requested') toast('📱 پنجرهٔ اجازه باز شد — دسترسی را تأیید کنید');
                setTimeout(updateCameraStatus, 1600);
            });
        }

        var alarmBtn = document.getElementById('set-andr-alarm-btn');
        if (alarmBtn && !alarmBtn._awBound) {
            alarmBtn._awBound = true;
            alarmBtn.addEventListener('click', function () {
                requestAlarmPerm();
            });
        }

        /* وضعیت اولیه بخش‌ها */
        updateSmsStatus();
        updateWidgetStatus();
        updateCameraStatus();
        updateAlarmStatus();
    }

    /* اتصال پس از آماده شدن DOM */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(bindSettings, 900); });
    } else {
        setTimeout(bindSettings, 900);
    }

    /* ============================================================
       هک روی updateHomeWidgets — هر تغییر داده → ارسال اسنپ‌شات
       ============================================================ */
    function wrapUpdateHomeWidgets() {
        if (typeof window.updateHomeWidgets !== 'function') {
            setTimeout(wrapUpdateHomeWidgets, 400);
            return;
        }
        if (window.updateHomeWidgets.__widgetPushWrapped) return;
        var orig = window.updateHomeWidgets;
        window.updateHomeWidgets = function () {
            try { orig.apply(this, arguments); } catch (e) {}
            try { pushWidgets(true); } catch (e2) {}
        };
        window.updateHomeWidgets.__widgetPushWrapped = true;
        /* ارسال اولیه */
        setTimeout(function () { pushWidgets(true); }, 2500);
    }
    wrapUpdateHomeWidgets();

    /* رفرش دوره‌ای (هر ۱۰ دقیقه هنگام باز بودن اپ) */
    setInterval(function () { pushWidgets(true); }, 600000);

    window.ParsisNativeWidgets = {
        buildSnapshot: buildSnapshot,
        pushWidgets: pushWidgets,
        updateWidgetStatus: updateWidgetStatus,
        updateSmsStatus: updateSmsStatus,
        updateCameraStatus: updateCameraStatus,
        updateAlarmStatus: updateAlarmStatus,
        requestAlarmPerm: requestAlarmPerm
    };

    console.log('✅ [modules/native-widgets.js] loaded');
})();
