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
       ✅ v2.7.3 — ویجت نیتیو «تقویم هفتگی» صفحه اصلی گوشی
       (درخواست کاربر: انتقال ویجت تقویم هفته به صفحه اصلی گوشی + ساعت لحظه‌ای)
       داده از buildCalendarWidgetData (در widgets.js) ساخته و با
       ParsisPlugin.pushCalendarWidgetData برای ویجت اندروید ارسال می‌شود.
       ساعت در ویجت نیتیو با TextClock سیستمی به‌صورت زنده تیک می‌زند.
       ============================================================ */
    function buildCalendarNativeData() {
        if (typeof window.buildCalendarWidgetData !== 'function') return null;
        var d = window.buildCalendarWidgetData(0);
        if (!d || !d.days || !d.days.length) return null;
        var aJ = d.anchorJ, aG = d.anchorG;
        var data = {
            updatedAt: '',
            jDate: WEEKDAYS_FA[aJ.wd] + ' ' + toFa(aJ.d) + ' ' + JALALI_MONTHS[aJ.m - 1] + ' ' + toFa(aJ.y),
            gDate: WEEKDAYS_FA[aJ.wd] + ' ' + toFa(aG.d) + ' ' + GREG_MONTHS[aG.m] + ' ' + toFa(aG.y),
            days: [],
            events: []
        };
        try { data.updatedAt = todayJalaliStr() + ' — ' + tsToJalaliTime(Date.now()); } catch (eT) {}
        d.days.forEach(function (dd) {
            data.days.push({ n: dd.name, jd: dd.jd, gd: dd.gd, hol: !!dd.isHoliday, today: !!dd.isToday });
        });
        d.events.slice(0, 40).forEach(function (ev) {
            var dd = String(ev.date).split('/');
            data.events.push({
                d: toFa(dd[2]) + ' ' + JALALI_MONTHS[Number(dd[1]) - 1],
                t: String(ev.title || ''),
                tm: ev.time ? toFaTime(ev.time) : '',
                hol: !!ev.isHoliday
            });
        });
        return data;
    }

    function pushCalendarWidget(silent) {
        var P = getParsis();
        if (!P || !P.pushCalendarWidgetData) return;
        try {
            var data = buildCalendarNativeData();
            if (!data) return;
            P.pushCalendarWidgetData({ json: JSON.stringify(data) }).then(function () {
                if (!silent && typeof showToast === 'function') showToast('📅 ویجت تقویم هفتگی گوشی به‌روزرسانی شد');
                updateCalWidgetStatus();
            }).catch(function () {});
        } catch (e) {}
    }

    function updateCalWidgetStatus() {
        var el = document.getElementById('set-calw-status');
        if (!el) return;
        var P = getParsis();
        if (!P || !P.pushCalendarWidgetData) { el.textContent = '— فقط در اپ اندروید'; el.style.color = '#64748b'; return; }
        var data = buildCalendarNativeData();
        el.textContent = data
            ? '✅ آماده — ' + toFa(data.events.length) + ' رویداد این هفته ارسال شد (ساعت ویجت زنده است)'
            : '…';
        el.style.color = '#166534';
    }

    /* ---------- 📌 افزودن ویجت تقویم به صفحه اصلی (اندروید ۸+) ---------- */
    async function pinCalendarWidget() {
        var P = getParsis();
        if (!P || !P.pinCalendarWidget) {
            toast('این قابلیت فقط در اپ اندروید است.');
            return;
        }
        try {
            var r = await P.pinCalendarWidget();
            if (r && r.ok) toast('📌 پنجرهٔ افزودن ویجت باز شد — «افزودن ویجت» را بزنید');
            else toast('این لانچر پین خودکار را پشتیبانی نمی‌کند — روی صفحه اصلی انگشت نگه دارید ← Widgets ← پارسیس ← تقویم هفتگی');
        } catch (e) {
            toast('پین ویجت ناموفق بود — از راه دستی (Widgets) اضافه کنید');
        }
    }

    /* ============================================================
       ✅ v2.7.3 — پس‌زمینهٔ «تقویم هفتگی» برای صفحه قفل / صفحه اصلی
       درخواست کاربر: ویجت تقویم به صفحه قفل هم «به‌عنوان پس‌زمینه» برود.
       اندروید (۵ به بعد) اجازهٔ ویجت روی قفل را نمی‌دهد؛ راه استاندارد =
       رندر تقویم هفته (ساعت + تاریخ + روزها + رویدادها) به تصویر PNG و
       تنظیم به‌عنوان Wallpaper قفل (WallpaperManager + FLAG_LOCK).
       ============================================================ */
    function drawCalendarWallpaper(scale) {
        scale = scale || 1;
        var W = 1080 * scale, H = 2160 * scale;
        var d = (typeof window.buildCalendarWidgetData === 'function') ? window.buildCalendarWidgetData(0) : null;
        if (!d || !d.days) return null;
        var canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        var x = canvas.getContext('2d');

        /* پس‌زمینه */
        var g = x.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, '#04241b');
        g.addColorStop(0.5, '#033528');
        g.addColorStop(1, '#02160f');
        x.fillStyle = g;
        x.fillRect(0, 0, W, H);

        /* الگوی نقطه‌ای */
        x.fillStyle = 'rgba(255,255,255,0.045)';
        var dotGap = 34 * scale;
        for (var py = dotGap / 2; py < H; py += dotGap) {
            for (var px = dotGap / 2; px < W; px += dotGap) {
                x.beginPath();
                x.arc(px, py, 1.6 * scale, 0, Math.PI * 2);
                x.fill();
            }
        }

        var faFont = '"Vazirmatn", Tahoma, sans-serif';
        var aJ = d.anchorJ, aG = d.anchorG;
        var now = new Date();
        var hh = pad2(now.getHours()), mm = pad2(now.getMinutes());

        var cx = W / 2;
        x.textAlign = 'center';
        x.textBaseline = 'middle';

        /* ساعت بزرگ */
        x.fillStyle = '#ffffff';
        x.font = '900 ' + Math.round(150 * scale) + 'px ' + faFont;
        x.fillText(toFa(hh) + ':' + toFa(mm), cx, 300 * scale);

        /* تاریخ شمسی */
        x.fillStyle = '#d1fae5';
        x.font = '900 ' + Math.round(52 * scale) + 'px ' + faFont;
        x.fillText(WEEKDAYS_FA[aJ.wd] + ' ' + toFa(aJ.d) + ' ' + JALALI_MONTHS[aJ.m - 1] + ' ' + toFa(aJ.y), cx, 430 * scale);

        /* تاریخ میلادی */
        x.fillStyle = 'rgba(209,250,229,0.65)';
        x.font = '700 ' + Math.round(34 * scale) + 'px ' + faFont;
        x.fillText(WEEKDAYS_FA[aJ.wd] + ' ' + toFa(aG.d) + ' ' + GREG_MONTHS[aG.m] + ' ' + toFa(aG.y), cx, 492 * scale);

        /* خط جداکننده */
        x.strokeStyle = 'rgba(255,255,255,0.18)';
        x.lineWidth = 2 * scale;
        x.beginPath();
        x.moveTo(90 * scale, 560 * scale);
        x.lineTo(W - 90 * scale, 560 * scale);
        x.stroke();

        /* روزهای هفته — از راست (شنبه) */
        var cellW = (W - 120 * scale - 6 * 12 * scale) / 7;
        var cellH = 190 * scale;
        var cellY = 610 * scale;
        for (var i = 0; i < 7; i++) {
            var dd = d.days[i];
            var col = 6 - i; /* راست = شنبه در بوم LTR */
            var cellX = 60 * scale + col * (cellW + 12 * scale);
            var nameCol = 'rgba(255,255,255,0.75)';
            var numCol = '#f8fafc';
            if (dd.isHoliday) {
                x.fillStyle = 'rgba(220,38,38,0.30)';
                roundedRect(x, cellX, cellY, cellW, cellH, 22 * scale);
                x.fill();
                x.strokeStyle = 'rgba(248,113,113,0.55)';
                x.lineWidth = 2 * scale;
                roundedRect(x, cellX, cellY, cellW, cellH, 22 * scale);
                x.stroke();
                nameCol = '#fecaca';
                numCol = '#fecaca';
            } else {
                x.fillStyle = 'rgba(255,255,255,0.09)';
                roundedRect(x, cellX, cellY, cellW, cellH, 22 * scale);
                x.fill();
            }
            if (dd.isToday) {
                x.strokeStyle = '#34d399';
                x.lineWidth = 4 * scale;
                roundedRect(x, cellX, cellY, cellW, cellH, 22 * scale);
                x.stroke();
                nameCol = '#6ee7b7';
                numCol = '#ffffff';
            }
            x.textAlign = 'center';
            x.fillStyle = nameCol;
            x.font = '800 ' + Math.round(34 * scale) + 'px ' + faFont;
            x.fillText(dd.name, cellX + cellW / 2, cellY + 52 * scale);
            x.fillStyle = numCol;
            x.font = '900 ' + Math.round(62 * scale) + 'px ' + faFont;
            x.fillText(dd.jd, cellX + cellW / 2, cellY + 122 * scale);
            x.fillStyle = 'rgba(255,255,255,0.38)';
            x.font = '600 ' + Math.round(26 * scale) + 'px ' + faFont;
            x.fillText(dd.gd, cellX + cellW / 2, cellY + 166 * scale);
        }

        /* رویدادها */
        var evY = 870 * scale;
        var evs = d.events.slice(0, 9);
        x.textAlign = 'right';
        x.fillStyle = 'rgba(255,255,255,0.8)';
        x.font = '900 ' + Math.round(40 * scale) + 'px ' + faFont;
        var title = 'تعطیلات و رویدادهای این هفته' + (d.events.length > 9 ? ' (' + toFa(d.events.length) + ')' : '');
        x.fillText(title, W - 90 * scale, evY);
        evY += 46 * scale;

        if (evs.length === 0) {
            x.fillStyle = 'rgba(255,255,255,0.45)';
            x.font = '700 ' + Math.round(32 * scale) + 'px ' + faFont;
            x.fillText('— تعطیلی یا رویداد ویژه‌ای در این هفته نیست', W - 90 * scale, evY + 30 * scale);
        }
        for (var k = 0; k < evs.length; k++) {
            var ev = evs[k];
            var rowH = 92 * scale;
            var rowY = evY + k * (rowH + 14 * scale);
            if (ev.hol) {
                x.fillStyle = 'rgba(220,38,38,0.24)';
                roundedRect(x, 60 * scale, rowY, W - 120 * scale, rowH, 18 * scale);
                x.fill();
                x.strokeStyle = 'rgba(248,113,113,0.45)';
                x.lineWidth = 2 * scale;
                roundedRect(x, 60 * scale, rowY, W - 120 * scale, rowH, 18 * scale);
                x.stroke();
            } else {
                x.fillStyle = 'rgba(255,255,255,0.07)';
                roundedRect(x, 60 * scale, rowY, W - 120 * scale, rowH, 18 * scale);
                x.fill();
            }
            /* تاریخ (سمت راست) */
            x.textAlign = 'right';
            x.fillStyle = ev.hol ? '#fca5a5' : '#6ee7b7';
            x.font = '900 ' + Math.round(30 * scale) + 'px ' + faFont;
            x.fillText(ev.date.split('/')[2] ? toFa(ev.date.split('/')[2]) + ' ' + (JALALI_MONTHS[Number(ev.date.split('/')[1]) - 1] || '') : '', W - 100 * scale, rowY + rowH / 2);
            /* عنوان */
            x.fillStyle = '#f1f5f9';
            x.font = '800 ' + Math.round(34 * scale) + 'px ' + faFont;
            var maxTw = W - 120 * scale - 260 * scale;
            x.fillText(truncateCanvasText(x, ev.title, maxTw), W - 100 * scale - 250 * scale, rowY + rowH / 2);
        }

        /* امضا */
        x.textAlign = 'center';
        x.fillStyle = 'rgba(255,255,255,0.35)';
        x.font = '700 ' + Math.round(30 * scale) + 'px ' + faFont;
        x.fillText('پارسیس — حسابداری هوشمند' + (typeof APP_VERSION !== 'undefined' ? ' (' + toFa(APP_VERSION) + ')' : ''), cx, H - 80 * scale);

        return canvas;
    }

    function roundedRect(x, rx, ry, rw, rh, r) {
        x.beginPath();
        x.moveTo(rx + r, ry);
        x.lineTo(rx + rw - r, ry);
        x.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r);
        x.lineTo(rx + rw, ry + rh - r);
        x.quadraticCurveTo(rx + rw, ry + rh, rx + rw - r, ry + rh);
        x.lineTo(rx + r, ry + rh);
        x.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r);
        x.lineTo(rx, ry + r);
        x.quadraticCurveTo(rx, ry, rx + r, ry);
        x.closePath();
    }

    function truncateCanvasText(x, txt, maxW) {
        txt = String(txt || '');
        if (x.measureText(txt).width <= maxW) return txt;
        var s = txt;
        while (s.length > 3 && x.measureText(s + '…').width > maxW) s = s.slice(0, -1);
        return s + '…';
    }

    /* پیش‌نمایش پس‌زمینه (در مرورگر هم کار می‌کند — با دانلود تصویر) */
    function openWallpaperPreview() {
        var canvas = drawCalendarWallpaper(0.5);
        if (!canvas) { toast('داده‌ای برای ساخت پس‌زمینه نیست'); return; }
        var url = canvas.toDataURL('image/png');
        var old = document.getElementById('calw-wp-modal');
        var oldO = document.getElementById('calw-wp-overlay');
        if (old) old.parentNode.removeChild(old);
        if (oldO) oldO.parentNode.removeChild(oldO);
        var ov = document.createElement('div');
        ov.id = 'calw-wp-overlay';
        ov.className = 'overlay show';
        ov.style.zIndex = '960';
        var m = document.createElement('div');
        m.id = 'calw-wp-modal';
        m.className = 'modal show';
        m.style.maxWidth = '360px';
        m.style.zIndex = '965';
        m.innerHTML = ''
            + '<div class="modal-head"><h2>🖼 پیش‌نمایش پس‌زمینهٔ تقویم هفتگی</h2><button id="calw-wp-close" class="close-btn">×</button></div>'
            + '<div class="modal-body" style="text-align:center">'
            +   '<img src="' + url + '" alt="پیش‌نمایش" style="width:100%;max-width:260px;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.35)">'
            +   '<p style="font-size:.72rem;color:#64748b;line-height:1.9;margin-top:10px">این تصویر از تقویم همین هفتهٔ شما ساخته می‌شود (ساعتِ لحظه‌ای فقط در ویجت زنده است). برای دیدنِ روزها و رویدادهای تازه، دوباره بسازید و تنظیم کنید.</p>'
            + '</div>'
            + '<div class="modal-foot" style="display:flex;gap:8px;flex-wrap:wrap">'
            +   '<button id="calw-wp-close2" class="btn-secondary" style="flex:1">بستن</button>'
            +   '<a id="calw-wp-dl" class="btn-secondary" style="flex:1;text-decoration:none;text-align:center;padding:10px 12px" download="parsis-calendar-wallpaper.png" href="' + url + '">⬇️ دانلود</a>'
            +   '<button id="calw-wp-lock" class="btn-primary" style="flex:1">🖼 پس‌زمینهٔ قفل</button>'
            +   '<button id="calw-wp-home" class="btn-primary" style="flex:1">🖼 پس‌زمینهٔ صفحهٔ اصلی</button>'
            + '</div>';
        document.body.appendChild(ov);
        document.body.appendChild(m);
        function close() {
            if (ov.parentNode) ov.parentNode.removeChild(ov);
            if (m.parentNode) m.parentNode.removeChild(m);
        }
        document.getElementById('calw-wp-close').onclick = close;
        document.getElementById('calw-wp-close2').onclick = close;
        ov.onclick = close;
        document.getElementById('calw-wp-lock').onclick = function () { setCalendarWallpaper('lock'); };
        document.getElementById('calw-wp-home').onclick = function () { setCalendarWallpaper('system'); };
    }

    async function setCalendarWallpaper(target) {
        var P = getParsis();
        if (!P || !P.setWallpaperFromBase64) {
            toast('تنظیم پس‌زمینه فقط در اپ اندروید است — می‌توانید تصویر را دانلود کنید.');
            return;
        }
        try {
            var canvas = drawCalendarWallpaper(1);
            if (!canvas) { toast('ساخت تصویر ناموفق بود'); return; }
            var b64 = canvas.toDataURL('image/png').split(',')[1];
            toast('⏳ در حال تنظیم پس‌زمینه…');
            var r = await P.setWallpaperFromBase64({ base64: b64, target: target || 'lock' });
            if (r && r.ok) {
                toast(r.lockOk && r.systemOk
                    ? '✅ پس‌زمینهٔ قفل و صفحهٔ اصلی تنظیم شد'
                    : (r.lockOk ? '✅ پس‌زمینهٔ صفحه قفل تنظیم شد' : '✅ پس‌زمینهٔ صفحه اصلی تنظیم شد'));
            } else {
                toast('⚠️ تنظیم پس‌زمینه ناموفق بود');
            }
        } catch (e) {
            toast('⚠️ خطا در ساخت/تنظیم تصویر');
        }
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

        /* ✅ v2.7.3 — ویجت نیتیو «تقویم هفتگی» + پس‌زمینهٔ قفل/صفحه اصلی */
        var calPinBtn = document.getElementById('set-calw-pin-btn');
        if (calPinBtn && !calPinBtn._awBound) {
            calPinBtn._awBound = true;
            calPinBtn.addEventListener('click', function () { pinCalendarWidget(); });
        }
        var calRefreshBtn = document.getElementById('set-calw-refresh-btn');
        if (calRefreshBtn && !calRefreshBtn._awBound) {
            calRefreshBtn._awBound = true;
            calRefreshBtn.addEventListener('click', function () {
                if (!getParsis()) { toast('این قابلیت فقط در اپ اندروید است.'); return; }
                pushCalendarWidget(false);
            });
        }
        var calPreviewBtn = document.getElementById('set-calw-preview-btn');
        if (calPreviewBtn && !calPreviewBtn._awBound) {
            calPreviewBtn._awBound = true;
            calPreviewBtn.addEventListener('click', function () { openWallpaperPreview(); });
        }
        var calLockWpBtn = document.getElementById('set-calw-lock-btn');
        if (calLockWpBtn && !calLockWpBtn._awBound) {
            calLockWpBtn._awBound = true;
            calLockWpBtn.addEventListener('click', function () { setCalendarWallpaper('lock'); });
        }
        var calHomeWpBtn = document.getElementById('set-calw-home-btn');
        if (calHomeWpBtn && !calHomeWpBtn._awBound) {
            calHomeWpBtn._awBound = true;
            calHomeWpBtn.addEventListener('click', function () { setCalendarWallpaper('system'); });
        }

        /* وضعیت اولیه بخش‌ها */
        updateSmsStatus();
        updateWidgetStatus();
        updateCameraStatus();
        updateAlarmStatus();
        updateCalWidgetStatus();
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
            try { pushCalendarWidget(true); } catch (e3) {}   /* ✅ v2.7.3 */
        };
        window.updateHomeWidgets.__widgetPushWrapped = true;
        /* ارسال اولیه */
        setTimeout(function () { pushWidgets(true); }, 2500);
        setTimeout(function () { pushCalendarWidget(true); }, 3200);
    }
    wrapUpdateHomeWidgets();

    /* رفرش دوره‌ای (هر ۱۰ دقیقه هنگام باز بودن اپ) */
    setInterval(function () { pushWidgets(true); }, 600000);
    setInterval(function () { pushCalendarWidget(true); }, 600000);

    window.ParsisNativeWidgets = {
        buildSnapshot: buildSnapshot,
        pushWidgets: pushWidgets,
        buildCalendarNativeData: buildCalendarNativeData,
        pushCalendarWidget: pushCalendarWidget,
        updateCalWidgetStatus: updateCalWidgetStatus,
        pinCalendarWidget: pinCalendarWidget,
        openWallpaperPreview: openWallpaperPreview,
        setCalendarWallpaper: setCalendarWallpaper,
        drawCalendarWallpaper: drawCalendarWallpaper,
        updateWidgetStatus: updateWidgetStatus,
        updateSmsStatus: updateSmsStatus,
        updateCameraStatus: updateCameraStatus,
        updateAlarmStatus: updateAlarmStatus,
        requestAlarmPerm: requestAlarmPerm
    };

    console.log('✅ [modules/native-widgets.js] loaded');
})();
