/* پارسیس — پچ تقویم: تکرار Google Calendar + دستورکار کامل + جستجو/فیلتر */
'use strict';

(function () {
    if (window._calPatchGoogleStyle) return;
    window._calPatchGoogleStyle = true;

    /* ============================================================
       بخش ۰: ثابت‌ها و کمک‌تابع‌ها
       ============================================================ */
    var WEEK_FA_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
    var WEEK_FA_FULL  = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

    function p2(n) { return String(n).length < 2 ? '0' + n : String(n); }

    // JS day (0=Sun..6=Sat) → FA week index (0=Sat..6=Fri)
    function jsToFa(jsDay) { return (jsDay + 1) % 7; }

    function getFaWeekDay(jDate) {
        try {
            var p = jDate.split('/').map(Number);
            var g = jalaliToGregorian(p[0], p[1], p[2]);
            var d = new Date(g[0], g[1] - 1, g[2]);
            return jsToFa(d.getDay());
        } catch (e) { return 0; }
    }

    /* ============================================================
       بخش ۱: تبدیل فرمت قدیمی تکرار به جدید
       ============================================================ */
    function normalizeRec(rec, startDate) {
        if (!rec) return { freq: 'none' };
        if (rec.freq) return rec;                      // ساختار جدید
        if (!rec.type || rec.type === 'none') return { freq: 'none' };

        var map = { day: 'daily', week: 'weekly', month: 'monthly', year: 'yearly' };
        var freq = rec.type === 'custom' ? (map[rec.customUnit] || 'daily') : (map[rec.type] || 'daily');
        var startFwd = startDate ? getFaWeekDay(startDate) : 0;
        var startDay = startDate ? Number(startDate.split('/')[2]) : 1;

        return {
            freq: freq,
            interval: rec.interval || 1,
            weekDays: [startFwd],
            monthlyMode: 'day',
            monthlyDay: startDay,
            ends: rec.until ? 'on' : 'never',
            until: rec.until || '',
            count: 10,
            exdates: []
        };
    }

    /* ============================================================
       بخش ۲: expandRec — تولید همه‌ی رخدادهای تکرارشونده
       ============================================================ */
    function makeOcc(u, date, time) {
        var endD = date, endT = time;
        if (u.endDate && u.startDate) {
            try {
                var g1 = jalaliToGregorian.apply(null, date.split('/').map(Number));
                var g2 = jalaliToGregorian.apply(null, u.startDate.split('/').map(Number));
                var diff = Math.round((new Date(g1[0], g1[1] - 1, g1[2]) - new Date(g2[0], g2[1] - 1, g2[2])) / 86400000);
                endD = addJalaliDays(u.endDate, diff) || date;
                endT = u.endTime || time;
            } catch (e) {}
        }
        return {
            id: u.id + '_' + date + '_' + time,
            rawId: u.id,
            cat: u.cat || 'personal',
            date: date, time: time,
            startDate: date, startTime: time,
            endDate: endD, endTime: endT,
            title: u.title,
            sub: u.desc || '',
            desc: u.desc || '',
            location: u.location || '',
            persons: u.persons || [],
            reminder: u.reminder || 0,
            recurrence: u.recurrence,
            readonly: false
        };
    }

    function expandRec(u) {
        var out = [];
        var start = u.startDate || u.date;
        if (!start) return out;
        var rec = normalizeRec(u.recurrence, start);

        if (rec.freq === 'none') {
            out.push(makeOcc(u, start, u.startTime || u.time || '21:00'));
            return out;
        }

        var overrides = DB.load('calendarRecOverrides', {});
        var ov = overrides[u.id] || {};
        var ex = {};
        (rec.exdates || []).forEach(function (d) { ex[d] = true; });
        Object.keys(ov).forEach(function (d) { if (ov[d] && ov[d].deleted) ex[d] = true; });

        var dates = [];
        var today = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
        var todayStr = today[0] + '/' + p2(today[1]) + '/' + p2(today[2]);
        // ★ حداکثر تا ۱۰ سال آینده تولید می‌کنیم تا اقساط سال‌های دور هم دیده شوند
        var horizon = addJalaliDays(todayStr, 3650);

        if (rec.freq === 'daily') {
            var iv = Math.max(1, rec.interval || 1);
            var cur = start;
            for (var i = 0; i < 4000; i++) {
                if (cur > horizon) break;
                if (rec.ends === 'on' && rec.until && cur > rec.until) break;
                if (rec.ends === 'after' && i >= rec.count) break;
                if (!ex[cur]) dates.push(cur);
                cur = addJalaliDays(cur, iv);
                if (!cur) break;
            }
        } else if (rec.freq === 'weekly') {
            var wds = (rec.weekDays && rec.weekDays.length)
                ? rec.weekDays.slice().sort()
                : [getFaWeekDay(start)];
            var startFwd = getFaWeekDay(start);
            var firstSat = addJalaliDays(start, -startFwd);
            var iv2 = Math.max(1, rec.interval || 1);
            var stop = false;
            for (var w = 0; w < 600 && !stop; w++) {
                var ws = addJalaliDays(firstSat, w * 7 * iv2);
                if (!ws) break;
                if (ws > horizon) break;
                for (var k = 0; k < wds.length; k++) {
                    var dt = addJalaliDays(ws, wds[k]);
                    if (!dt || dt < start) continue;
                    if (dt > horizon) { stop = true; break; }
                    if (rec.ends === 'on' && rec.until && dt > rec.until) { stop = true; break; }
                    if (rec.ends === 'after' && dates.length >= rec.count) { stop = true; break; }
                    if (!ex[dt]) dates.push(dt);
                }
            }
        } else if (rec.freq === 'monthly') {
            var sp = start.split('/').map(Number);
            var dayTarget = rec.monthlyMode === 'day' ? (rec.monthlyDay || sp[2]) : sp[2];
            var iv3 = Math.max(1, rec.interval || 1);
            for (var mi = 0; mi < 130; mi++) {
                var mo = sp[1] + mi * iv3;
                var yr = sp[0];
                while (mo > 12) { mo -= 12; yr++; }
                var dim2 = daysInJalaliMonth(yr, mo);
                var dd = dayTarget > dim2 ? dim2 : dayTarget;
                var md = yr + '/' + p2(mo) + '/' + p2(dd);
                if (md > horizon) break;
                if (rec.ends === 'on' && rec.until && md > rec.until) break;
                if (rec.ends === 'after' && dates.length >= rec.count) break;
                if (!ex[md]) dates.push(md);
            }
        } else if (rec.freq === 'yearly') {
            var yp = start.split('/').map(Number);
            var iv4 = Math.max(1, rec.interval || 1);
            for (var yi = 0; yi < 30; yi++) {
                var y2 = yp[0] + yi * iv4;
                var yd = y2 + '/' + p2(yp[1]) + '/' + p2(yp[2]);
                if (yd > horizon) break;
                if (rec.ends === 'on' && rec.until && yd > rec.until) break;
                if (rec.ends === 'after' && dates.length >= rec.count) break;
                if (!ex[yd]) dates.push(yd);
            }
        }

        var time = u.startTime || u.time || '21:00';
        dates.forEach(function (d) { out.push(makeOcc(u, d, time)); });

        /* اعمال تغییرات جزئی (این رویداد) */
        Object.keys(ov).forEach(function (d) {
            if (ov[d] && ov[d].modified) {
                var m = ov[d].modified;
                out.push({
                    id: 'm_' + u.id + '_' + d,
                    rawId: u.id,
                    overrideDate: d,
                    _isOverride: true,
                    cat: m.cat || u.cat,
                    date: d,
                    time: m.time || time,
                    startDate: d,
                    startTime: m.time || time,
                    endDate: m.endDate || d,
                    endTime: m.endTime || m.time || time,
                    title: m.title || u.title,
                    sub: m.desc || '',
                    desc: m.desc || '',
                    location: m.location || '',
                    persons: m.persons || [],
                    reminder: m.reminder || 0,
                    recurrence: null,
                    readonly: false
                });
            }
        });

        return out;
    }

    window._calExpandRec = expandRec;
    window._calNormalizeRec = normalizeRec;

    /* ============================================================
       بخش ۳: Override calBuildAllEvents
       ============================================================ */
    window.calBuildAllEvents = function () {
        var evs = [];
        try {
            DB.load('facilities', []).forEach(function (f) {
                (f.installments || []).forEach(function (ins, i) {
                    if (!ins.date) return;
                    var t = ins.time || '21:00';
                    evs.push({
                        id: 'i_' + f.id + '_' + i,
                        cat: 'installment',
                        date: ins.date, time: t,
                        startDate: ins.date, startTime: t,
                        endDate: ins.date, endTime: t,
                        title: (ins.status === 'paid' ? '✅ ' : '⏰ ') + 'قسط ' + f.name,
                        sub: ins.status === 'paid' ? 'پرداخت‌شده' : 'پرداخت‌نشده',
                        amount: +ins.amount || 0,
                        ref: f.id,
                        readonly: true
                    });
                });
            });
        } catch (e) {}

        try {
            DB.load('cashFlowSources', []).forEach(function (s) {
                if (!s.expectedDate) return;
                var t = s.time || '21:00';
                evs.push({
                    id: 's_' + s.id, cat: 'source',
                    date: s.expectedDate, time: t,
                    startDate: s.expectedDate, startTime: t,
                    endDate: s.expectedDate, endTime: t,
                    title: '📥 ' + (typeof getSourceLabel === 'function' ? getSourceLabel(s) : 'دریافتنی'),
                    sub: s.notes || '',
                    amount: +s.amount || 0,
                    ref: s.id,
                    readonly: true
                });
            });
        } catch (e) {}

        try {
            DB.load('calendarUserEvents', []).forEach(function (u) {
                expandRec(u).forEach(function (e) { evs.push(e); });
            });
        } catch (e) {}

        if (Array.isArray(CAL41.externalEvents)) {
            CAL41.externalEvents.forEach(function (e) { evs.push(e); });
        }

        return evs;
    };

    /* ============================================================
       بخش ۴: استیت جستجو/فیلتر
       ============================================================ */
    if (typeof CAL41.daySearch === 'undefined')    CAL41.daySearch = '';
    if (typeof CAL41.agendaSearch === 'undefined') CAL41.agendaSearch = '';
    if (typeof CAL41.agendaRange === 'undefined')  CAL41.agendaRange = 'all';

    function matchQ(e, q) {
        if (!q) return true;
        q = q.toLowerCase();
        var hay = ((e.title || '') + ' ' + (e.location || '') + ' ' + (e.desc || '') + ' ' + (e.sub || '')).toLowerCase();
        return hay.indexOf(q) !== -1;
    }

    /* ============================================================
       بخش ۵: توابع رندر — روز و دستورکار (بازنویسی‌شده)
       ============================================================ */
    function renderDayLocal(events) {
        var ds = CAL41.cursor.y + '/' + p2(CAL41.cursor.m) + '/' + p2(CAL41.cursor.d);
        var q = CAL41.daySearch || '';
        var dayEvs = events.filter(function (e) { return e.date === ds; });
        dayEvs = dayEvs.filter(function (e) { return matchQ(e, q); });
        dayEvs.sort(function (a, b) { return (a.time || '').localeCompare(b.time || ''); });

        var gd = jalaliToGregorian(CAL41.cursor.y, CAL41.cursor.m, CAL41.cursor.d);
        var dt = new Date(gd[0], gd[1] - 1, gd[2]);
        var EN_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

        var html = '';
        html += '<div style="text-align:center;margin-bottom:14px;padding:12px;background:var(--primary-soft);border-radius:12px">';
        html += '<div style="font-size:1.05rem;font-weight:900;color:#1e40af">' +
                WEEKDAYS_FA[dt.getDay()] + '، ' + toFa(CAL41.cursor.d) + ' ' +
                JALALI_MONTHS[CAL41.cursor.m - 1] + ' ' + toFa(CAL41.cursor.y) + '</div>';
        html += '<div style="font-size:.78rem;color:#94a3b8;direction:ltr;margin-top:4px">' +
                dt.getDate() + ' ' + EN_MONTHS[dt.getMonth()] + ' ' + dt.getFullYear() + '</div>';
        html += '<button class="calg-btn primary" id="calg-share-day" style="margin-top:10px">📤 اشتراک‌گذاری</button>';
        html += '</div>';

        if (q) {
            html += '<div style="text-align:center;font-size:.78rem;color:var(--text-muted);margin-bottom:10px">' +
                    '🔍 نتایج جستجو برای «' + esc(q) + '» — ' + toFa(dayEvs.length) + ' مورد' +
                    '</div>';
        }

        html += '<div style="display:grid;grid-template-columns:70px 1fr;border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--card-solid)">';
        for (var h = 5; h <= 23; h++) {
            var hourStr = p2(h) + ':00';
            var hourEvs = dayEvs.filter(function (e) { return e.time && e.time.substring(0, 2) === p2(h); });
            html += '<div style="padding:10px 8px;text-align:center;font-weight:900;font-size:.82rem;background:var(--card-alt);border-bottom:1px solid var(--border);direction:ltr;color:var(--primary-dark);font-family:monospace">' + toFaTime(hourStr) + '</div>';
            html += '<div class="calg-hour-cell" data-date="' + ds + '" data-hour="' + h + '" style="padding:8px;border-bottom:1px solid var(--border);min-height:56px;cursor:pointer">';
            hourEvs.forEach(function (e) {
                var cat = (window.CAL_CATS && window.CAL_CATS[e.cat]) || { color: '#999' };
                html += '<div class="calg-day-ev" data-ev="' + esc(e.id) + '" style="background:' + cat.color + '15;border-right:4px solid ' + cat.color + ';padding:8px 10px;border-radius:8px;margin-bottom:4px;cursor:pointer">' +
                        '<div style="font-weight:800;font-size:.85rem">' + esc(e.title) + '</div>' +
                        (e.location ? '<div style="font-size:.72rem;color:var(--text-muted);margin-top:2px">📍 ' + esc(e.location) + '</div>' : '') +
                        '</div>';
            });
            html += '</div>';
        }
        html += '</div>';
        return html;
    }

    function renderAgendaLocal(events) {
        var today = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
        var todayStr = today[0] + '/' + p2(today[1]) + '/' + p2(today[2]);
        var q = CAL41.agendaSearch || '';
        var range = CAL41.agendaRange || 'all';

        var maxDate = '';
        if (range !== 'all') {
            maxDate = addJalaliDays(todayStr, Number(range));
        }

        var future = events.filter(function (e) {
            if (e.date < todayStr) return false;
            if (maxDate && e.date > maxDate) return false;
            return matchQ(e, q);
        });

        future.sort(function (a, b) {
            var c = a.date.localeCompare(b.date);
            if (c !== 0) return c;
            return (a.time || '').localeCompare(b.time || '');
        });

        var byDate = {};
        future.forEach(function (e) { (byDate[e.date] = byDate[e.date] || []).push(e); });
        var dates = Object.keys(byDate).sort();

        if (dates.length === 0) {
            return '<div class="calg-empty">' +
                   (q ? '🔍 هیچ رویدادی با «' + esc(q) + '» یافت نشد.' : 'رویدادی در آینده نیست.') +
                   '</div>';
        }

        var EN_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var html = '<div style="display:flex;flex-direction:column;gap:10px">';
        // ★ همه‌ی تاریخ‌ها نمایش داده می‌شوند (بدون محدودیت ۳۰)
        dates.forEach(function (d) {
            var p = d.split('/').map(Number);
            var gd = jalaliToGregorian(p[0], p[1], p[2]);
            var dt = new Date(gd[0], gd[1] - 1, gd[2]);
            var isToday = d === todayStr;
            var dLeft = jalaliDiff(today[0], today[1], today[2], p[0], p[1], p[2]);
            var dLeftTxt = dLeft === 0 ? 'امروز' :
                           dLeft === 1 ? 'فردا' :
                           dLeft < 7  ? toFa(dLeft) + ' روز دیگر' :
                           dLeft < 30 ? toFa(Math.floor(dLeft / 7)) + ' هفته دیگر' :
                           dLeft < 365 ? toFa(Math.floor(dLeft / 30)) + ' ماه دیگر' :
                           toFa(Math.floor(dLeft / 365)) + ' سال دیگر';

            html += '<div style="padding:12px 14px;background:var(--card-alt);border-radius:10px;border-right:4px solid ' + (isToday ? '#1e40af' : '#3b82f6') + '">';
            html += '<h4 style="margin:0 0 10px;font-size:.85rem;color:#1e40af;font-weight:900;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">';
            html += '<span>' + WEEKDAYS_FA[dt.getDay()] + '، ' + toFa(p[2]) + ' ' + JALALI_MONTHS[p[1] - 1] + ' ' + toFa(p[0]) + (isToday ? ' (امروز)' : '') + '</span>';
            html += '<span style="font-size:.72rem;color:#64748b;background:#fff;padding:3px 10px;border-radius:9px;font-weight:700">' + dLeftTxt + '</span>';
            html += '</h4>';
            html += '<div style="font-size:.68rem;color:#94a3b8;direction:ltr;margin-bottom:8px">' + dt.getDate() + ' ' + EN_MONTHS[dt.getMonth()] + ' ' + dt.getFullYear() + '</div>';

            byDate[d].forEach(function (e) {
                var cat = (window.CAL_CATS && window.CAL_CATS[e.cat]) || { color: '#999', icon: '📌' };
                html += '<div class="calg-agev" data-ev="' + esc(e.id) + '" style="display:flex;gap:8px;align-items:center;padding:8px;border-radius:8px;background:#fff;margin-bottom:4px;cursor:pointer;border:1px solid var(--border)">' +
                        '<span style="width:8px;height:8px;border-radius:2px;background:' + cat.color + ';flex-shrink:0"></span>' +
                        '<span style="font-size:.8rem;font-weight:700;flex:1">' + esc(e.title) + '</span>' +
                        (e.time ? '<span style="font-size:.72rem;color:var(--text-muted);direction:ltr;font-family:monospace">' + toFaTime(e.time) + '</span>' : '') +
                        '</div>';
            });
            html += '</div>';
        });
        html += '</div>';
        return html;
    }

    /* ============================================================
       بخش ۶: بازنویسی calRender
       ============================================================ */
    var _origCalRender = window.calRender;

    window.calRender = function () {
        var page = document.getElementById('page-jalali-calendar');
        if (!page) {
            if (typeof calEnsurePage === 'function') calEnsurePage();
            page = document.getElementById('page-jalali-calendar');
            if (!page) return;
        }

        if (typeof rebuildCalCats41 === 'function') rebuildCalCats41();
        if (!CAL41.cursor || isNaN(CAL41.cursor.y)) {
            var t = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
            CAL41.cursor = { y: t[0], m: t[1], d: t[2] };
        }

        var all = window.calBuildAllEvents();
        var active = all.filter(function (e) { return CAL41.filterCats[e.cat] !== false; });

        var html = '<h2>📅 مدیریت تقویم</h2><div class="calg-wrap">';

        html += '<div class="calg-bar">';
        html += '<button class="calg-btn" id="calg-prev">‹</button>';
        html += '<h3 id="calg-titledate">' + (typeof buildCalTitle41 === 'function' ? buildCalTitle41() : '—') + '</h3>';
        html += '<button class="calg-btn" id="calg-today">امروز</button>';
        html += '<button class="calg-btn" id="calg-next">›</button>';
        html += '<button class="calg-btn" id="calg-cat-mgr" title="مدیریت دسته‌بندی" style="font-size:1.05rem">🎨</button>';
        html += '<button class="calg-btn primary" id="calg-new">＋ رویداد</button>';
        html += '</div>';

        html += '<div class="calg-tabs">';
        [['month','ماه'],['week','هفته'],['3day','۳ روز آتی'],['day','روز'],['agenda','دستورکار']].forEach(function (x) {
            html += '<button class="calg-tab' + (CAL41.view === x[0] ? ' active' : '') + '" data-view="' + x[0] + '">' + x[1] + '</button>';
        });
        html += '</div>';

        /* ★ نوار جستجو برای روز و دستورکار */
        if (CAL41.view === 'day' || CAL41.view === 'agenda') {
            var q = CAL41.view === 'day' ? CAL41.daySearch : CAL41.agendaSearch;
            html += '<div class="calg-sbar" style="display:flex;gap:8px;padding:10px 14px;background:#f8fafd;border-bottom:1px solid var(--border);flex-wrap:wrap;align-items:center">';
            html += '<input type="text" id="calg-search-input" placeholder="🔍 جستجو در عنوان، محل، توضیحات..." value="' + esc(q) + '" style="flex:1;min-width:180px;padding:9px 14px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-size:0.85rem;outline:none">';
            if (q) {
                html += '<button type="button" id="calg-clear-search" style="background:#fee2e2;color:#dc2626;border:none;border-radius:10px;padding:9px 14px;font-family:inherit;font-size:0.8rem;font-weight:800;cursor:pointer">✕ پاک کردن</button>';
            }
            if (CAL41.view === 'agenda') {
                var ar = CAL41.agendaRange;
                html += '<select id="calg-range-select" style="padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-size:0.82rem;background:#fff;cursor:pointer">';
                html += '<option value="all"'  + (ar === 'all'  ? ' selected' : '') + '>همه تاریخ‌ها</option>';
                html += '<option value="30"'   + (ar === '30'   ? ' selected' : '') + '>۳۰ روز آینده</option>';
                html += '<option value="90"'   + (ar === '90'   ? ' selected' : '') + '>۳ ماه آینده</option>';
                html += '<option value="365"'  + (ar === '365'  ? ' selected' : '') + '>۱ سال آینده</option>';
                html += '<option value="1095"' + (ar === '1095' ? ' selected' : '') + '>۳ سال آینده</option>';
                html += '</select>';
            }
            html += '</div>';
        }

        html += '<div class="calg-body" id="calg-body">';
        if (CAL41.view === 'month')      html += (typeof calRenderMonth41 === 'function' ? calRenderMonth41(active) : '');
        else if (CAL41.view === 'week')  html += (typeof calRenderMultiDay41 === 'function' ? calRenderMultiDay41(active, 7, 'week') : '');
        else if (CAL41.view === '3day')  html += (typeof calRenderMultiDay41 === 'function' ? calRenderMultiDay41(active, 3, '3day') : '');
        else if (CAL41.view === 'day')   html += renderDayLocal(active);
        else                             html += renderAgendaLocal(active);
        html += '</div>';

        var cats = window.CAL_CATS || {};
        html += '<div class="calg-legend">';
        Object.keys(cats).forEach(function (k) {
            if (k === 'external') return;
            var c = cats[k];
            var checked = CAL41.filterCats[k] !== false ? 'checked' : '';
            html += '<label><input type="checkbox" data-cat="' + k + '" ' + checked + '>' +
                    '<span class="lg-dot" style="background:' + c.color + '"></span>' +
                    c.icon + ' ' + c.label + '</label>';
        });
        html += '</div>';

        html += '</div>';
        page.innerHTML = html;

        // اتصال رویدادهای اصلی
        if (typeof bindCalEvents41 === 'function') {
            bindCalEvents41(active);
        } else {
            // اتصال دستی (چون bindCalEvents41 ممکن است local باشد)
            bindCalEventsFallback(active);
        }
        bindSearchInputs();
    };

    /* fallback: اگر bindCalEvents41 لوکال است، خودمان رویدادها را وصل می‌کنیم */
    function bindCalEventsFallback(active) {
        var prev = document.getElementById('calg-prev');
        var next = document.getElementById('calg-next');
        var today = document.getElementById('calg-today');
        var newBtn = document.getElementById('calg-new');
        var catMgr = document.getElementById('calg-cat-mgr');
        var shareDay = document.getElementById('calg-share-day');

        if (prev) prev.onclick = function () { if (typeof navigateCal41 === 'function') navigateCal41(-1); };
        if (next) next.onclick = function () { if (typeof navigateCal41 === 'function') navigateCal41(1); };
        if (today) today.onclick = function () {
            var t = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
            CAL41.cursor = { y: t[0], m: t[1], d: t[2] };
            window.calRender();
        };
        if (newBtn) newBtn.onclick = function () {
            var ds = CAL41.cursor.y + '/' + p2(CAL41.cursor.m) + '/' + p2(CAL41.cursor.d);
            window.openEventModal41(null, ds);
        };
        if (catMgr && window.openCategoriesManager) catMgr.onclick = window.openCategoriesManager;
        if (shareDay && typeof shareDayEvents41 === 'function') shareDay.onclick = shareDayEvents41;

        document.querySelectorAll('.calg-tab').forEach(function (t) {
            t.onclick = function () {
                CAL41.view = this.getAttribute('data-view');
                window.calRender();
            };
        });
        document.querySelectorAll('.calg-legend input').forEach(function (cb) {
            cb.onchange = function () {
                CAL41.filterCats[this.getAttribute('data-cat')] = this.checked;
                window.calRender();
            };
        });
        document.querySelectorAll('[data-ev]').forEach(function (el) {
            el.onclick = function (e) {
                e.stopPropagation();
                var id = this.getAttribute('data-ev');
                var ev = active.find(function (x) { return x.id === id; });
                if (ev) handleEventClick(ev);
            };
        });
        document.querySelectorAll('.calg-mcell').forEach(function (cell) {
            cell.onclick = function (e) {
                if (e.target.closest('.cev')) return;
                window.openEventModal41(null, this.getAttribute('data-date'));
            };
        });
        document.querySelectorAll('.calg-hour-cell').forEach(function (cell) {
            cell.onclick = function (e) {
                if (e.target.closest('.calg-day-ev')) return;
                window.openEventModal41(null, this.getAttribute('data-date'), +this.getAttribute('data-hour'));
            };
        });
        document.querySelectorAll('.calg-md-hour-cell').forEach(function (cell) {
            cell.onclick = function (e) {
                if (e.target.closest('.calg-md-hour-ev')) return;
                window.openEventModal41(null, this.getAttribute('data-date'), +this.getAttribute('data-hour'));
            };
        });
        document.querySelectorAll('.calg-md-col').forEach(function (col) {
            col.onclick = function (e) {
                if (e.target.closest('[data-ev]')) return;
                window.openEventModal41(null, this.getAttribute('data-date'));
            };
        });
    }

    /* کلیک روی رویداد → اگر تکرارشونده بود، scope می‌پرسد */
    function handleEventClick(ev) {
        if (!ev.recurrence || ev.recurrence.freq === 'none' || ev._isOverride) {
            window.openEventModal41(ev, null);
            return;
        }
        /* رویداد تکرارشونده */
        var rawList = DB.load('calendarUserEvents', []);
        var master = rawList.find(function (x) { return x.id === ev.rawId; });
        if (!master) { window.openEventModal41(ev, null); return; }

        showScopeDialog(master, ev.date, ev.time, function (scope) {
            if (scope === 'this') {
                window.openEventModal41(ev, null, undefined, 'this');
            } else if (scope === 'future') {
                window.openEventModal41(ev, null, undefined, 'future');
            } else {
                // all
                var masterEv = {
                    id: master.id, rawId: master.id, cat: master.cat,
                    startDate: master.startDate || master.date,
                    startTime: master.startTime || master.time || '21:00',
                    endDate: master.endDate || master.startDate || master.date,
                    endTime: master.endTime || master.startTime || master.time || '21:00',
                    title: master.title, desc: master.desc, location: master.location,
                    persons: master.persons || [], reminder: master.reminder || 0,
                    recurrence: master.recurrence
                };
                window.openEventModal41(masterEv, null, undefined, 'all');
            }
        });
    }

    /* ============================================================
       بخش ۷: دایالوگ انتخاب دامنه (فقط این / این و بعدی / همه)
       ============================================================ */
    function showScopeDialog(master, date, time, cb) {
        var old = document.getElementById('cal-scope-modal'); if (old) old.remove();
        var oldO = document.getElementById('cal-scope-overlay'); if (oldO) oldO.remove();

        var html = ''
            + '<div id="cal-scope-overlay" class="overlay show" style="z-index:1500"></div>'
            + '<div id="cal-scope-modal" class="modal show" style="max-width:460px;z-index:1510">'
            +   '<div class="modal-head" style="background:linear-gradient(135deg,#f59e0b,#d97706)">'
            +     '<h2>🔁 رویداد تکرارشونده</h2>'
            +     '<button class="close-btn" id="cal-scope-close">×</button>'
            +   '</div>'
            +   '<div class="modal-body">'
            +     '<p style="font-size:.88rem;line-height:1.9;color:#374151;margin-bottom:14px">'
            +       'این رویداد بخشی از یک زنجیره تکرارشونده است.<br>'
            +       '<b>دامنه اعمال تغییرات یا حذف را انتخاب کنید:</b>'
            +     '</p>'
            +     '<div style="display:flex;flex-direction:column;gap:8px">'
            +       '<button type="button" class="cal-scope-btn" data-scope="this" style="text-align:right;padding:14px;border:1.5px solid var(--border);background:#fff;border-radius:12px;font-family:inherit;cursor:pointer;transition:all .2s">'
            +         '<div style="font-weight:800;color:#1e40af;font-size:.9rem">📌 فقط این رویداد</div>'
            +         '<div style="font-size:.75rem;color:#64748b;margin-top:4px">تغییر یا حذف فقط برای رخداد ' + toFa(date) + '</div>'
            +       '</button>'
            +       '<button type="button" class="cal-scope-btn" data-scope="future" style="text-align:right;padding:14px;border:1.5px solid var(--border);background:#fff;border-radius:12px;font-family:inherit;cursor:pointer;transition:all .2s">'
            +         '<div style="font-weight:800;color:#1e40af;font-size:.9rem">⏩ این و رویدادهای بعدی</div>'
            +         '<div style="font-size:.75rem;color:#64748b;margin-top:4px">از ' + toFa(date) + ' به بعد تغییر می‌کند</div>'
            +       '</button>'
            +       '<button type="button" class="cal-scope-btn" data-scope="all" style="text-align:right;padding:14px;border:1.5px solid var(--border);background:#fff;border-radius:12px;font-family:inherit;cursor:pointer;transition:all .2s">'
            +         '<div style="font-weight:800;color:#1e40af;font-size:.9rem">🌐 همه رویدادها</div>'
            +         '<div style="font-size:.75rem;color:#64748b;margin-top:4px">کل زنجیره تکرار تغییر می‌کند</div>'
            +       '</button>'
            +     '</div>'
            +   '</div>'
            +   '<div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end">'
            +     '<button class="btn-secondary" id="cal-scope-cancel">انصراف</button>'
            +   '</div>'
            + '</div>';
        document.body.insertAdjacentHTML('beforeend', html);

        var close = function () {
            var m = document.getElementById('cal-scope-modal'); if (m) m.remove();
            var o = document.getElementById('cal-scope-overlay'); if (o) o.remove();
        };

        document.querySelectorAll('.cal-scope-btn').forEach(function (b) {
            b.onmouseenter = function () { this.style.background = '#eff6ff'; this.style.borderColor = '#3b82f6'; };
            b.onmouseleave = function () { this.style.background = '#fff'; this.style.borderColor = 'var(--border)'; };
            b.onclick = function () {
                var scope = this.getAttribute('data-scope');
                close();
                cb(scope);
            };
        });
        document.getElementById('cal-scope-close').onclick = close;
        document.getElementById('cal-scope-cancel').onclick = close;
        document.getElementById('cal-scope-overlay').onclick = close;
    }

    /* ============================================================
       بخش ۸: جستجو — اتصال inputها به state
       ============================================================ */
    function bindSearchInputs() {
        var inp = document.getElementById('calg-search-input');
        if (inp) {
            // نگه‌داشتن فوکوس و موقعیت کرسر
            var len = inp.value.length;
            inp.addEventListener('input', debounce(function () {
                if (CAL41.view === 'day') CAL41.daySearch = inp.value;
                else CAL41.agendaSearch = inp.value;
                var focus = document.activeElement === inp;
                var selStart = inp.selectionStart;
                window.calRender();
                if (focus) {
                    var ni = document.getElementById('calg-search-input');
                    if (ni) {
                        ni.focus();
                        try { ni.setSelectionRange(selStart, selStart); } catch (e) {}
                    }
                }
            }, 200));
        }
        var clr = document.getElementById('calg-clear-search');
        if (clr) clr.onclick = function () {
            if (CAL41.view === 'day') CAL41.daySearch = '';
            else CAL41.agendaSearch = '';
            window.calRender();
        };
        var rng = document.getElementById('calg-range-select');
        if (rng) rng.onchange = function () {
            CAL41.agendaRange = this.value;
            window.calRender();
        };
    }

    var _debounceTimer = null;
    function debounce(fn, ms) {
        return function () {
            var self = this, args = arguments;
            clearTimeout(_debounceTimer);
            _debounceTimer = setTimeout(function () { fn.apply(self, args); }, ms);
        };
    }

    /* ============================================================
       بخش ۹: Override openEventModal41 — با UI تکرار به سبک گوگل
       ============================================================ */
    window.openEventModal41 = function (ev, defaultDate, defaultHour, scope) {
        var old = document.getElementById('evt-modal'); if (old) old.remove();
        var oldO = document.getElementById('evt-overlay'); if (oldO) oldO.remove();

        var isNew = !ev;
        var curDate = (ev && ev.startDate) || defaultDate || (CAL41.cursor.y + '/' + p2(CAL41.cursor.m) + '/' + p2(CAL41.cursor.d));
        var curTime = (ev && ev.startTime) || (defaultHour !== undefined ? p2(defaultHour) + ':00' : '21:00');
        var endDate = (ev && ev.endDate) || curDate;
        var endTime = (ev && ev.endTime) || curTime;
        var userCats = (typeof uCats41 === 'function') ? uCats41() : [];
        var selectedCat = (ev && ev.cat) || (userCats[0] && userCats[0].key) || 'personal';

        /* ★ نرمال‌سازی recurrence */
        var recurrence = normalizeRec(ev && ev.recurrence, curDate);

        var persons = (ev && ev.persons) ? ev.persons.slice() : [];

        var catPicker = '';
        userCats.forEach(function (c) {
            var active = (c.key === selectedCat)
                ? 'background:' + c.color + '20;border-color:' + c.color
                : 'background:#f8fafc;border-color:transparent';
            catPicker += '<button type="button" class="evt-cat-btn" data-cat="' + c.key + '" ' +
                         'style="' + active + ';padding:8px 14px;border-radius:10px;border:2px solid;' +
                         'font-family:inherit;font-size:.8rem;font-weight:800;cursor:pointer;' +
                         'display:inline-flex;align-items:center;gap:5px;color:' + c.color + '">' +
                         c.icon + ' ' + c.label + '</button>';
        });

        var personsList = DB.load('persons', []);
        var personsChips = persons.map(function (pid) {
            var pr = personsList.find(function (x) { return x.id === pid; });
            if (!pr) return '';
            return '<span data-pid="' + pid + '" style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;background:#dbeafe;color:#1e40af;border-radius:14px;font-size:.78rem;font-weight:800">' +
                   (pr.first || '') + ' ' + (pr.last || '') +
                   ' <button type="button" style="background:none;border:none;color:#dc2626;cursor:pointer;font-weight:900" data-rm="' + pid + '">×</button></span>';
        }).join('');

        var personOptions = '<option value="">— انتخاب —</option>';
        personsList.forEach(function (pr) {
            personOptions += '<option value="' + pr.id + '">' + esc((pr.first || '') + ' ' + (pr.last || '')) + '</option>';
        });

        var scopeBadge = '';
        if (scope === 'this') scopeBadge = '<div style="background:#fef3c7;color:#92400e;padding:8px 14px;border-radius:10px;font-size:.78rem;font-weight:800;margin-bottom:10px">📌 فقط رخداد «' + toFa(curDate) + '» تغییر می‌کند</div>';
        else if (scope === 'future') scopeBadge = '<div style="background:#dbeafe;color:#1e40af;padding:8px 14px;border-radius:10px;font-size:.78rem;font-weight:800;margin-bottom:10px">⏩ رخدادهای «' + toFa(curDate) + '» به بعد تغییر می‌کنند</div>';
        else if (scope === 'all') scopeBadge = '<div style="background:#d1fae5;color:#065f46;padding:8px 14px;border-radius:10px;font-size:.78rem;font-weight:800;margin-bottom:10px">🌐 همه رخدادهای این زنجیره تغییر می‌کنند</div>';

        var html = ''
            + '<div id="evt-overlay" class="overlay show" style="z-index:880"></div>'
            + '<div id="evt-modal" class="modal show" style="max-width:620px;z-index:885">'
            +   '<div class="modal-head"><h2>' + (isNew ? '＋ رویداد جدید' : '✎ ویرایش رویداد') + '</h2>'
            +     '<button id="evt-close" class="close-btn">×</button></div>'
            +   '<div class="modal-body" style="max-height:78vh;overflow-y:auto">'
            +     scopeBadge

            // عنوان
            +     '<div class="field"><label>عنوان *</label>'
            +       '<input type="text" id="evt-title" value="' + (ev ? esc(ev.title) : '') + '"></div>'

            // دسته
            +     '<div class="field"><label>دسته‌بندی</label>'
            +       '<div id="evt-cats" style="display:flex;flex-wrap:wrap;gap:6px">' + catPicker + '</div></div>'

            // تاریخ/ساعت شروع
            +     '<div class="field"><label>تاریخ و ساعت شروع</label>'
            +       '<div style="display:grid;grid-template-columns:1fr auto;gap:6px">'
            +         '<input type="text" id="evt-start-date" class="date-picker" dir="ltr" value="' + curDate + '">'
            +         '<div style="display:flex;gap:4px">'
            +           '<input type="text" id="evt-start-time" dir="ltr" placeholder="HH:MM" value="' + curTime + '" style="width:80px;text-align:center;font-family:monospace">'
            +           '<button type="button" id="evt-start-clock" style="width:38px;border:none;border-radius:10px;background:var(--primary-soft);color:var(--primary-dark);cursor:pointer;font-size:1.05rem">🕐</button>'
            +         '</div></div></div>'

            // تاریخ/ساعت پایان
            +     '<div class="field"><label>تاریخ و ساعت پایان</label>'
            +       '<div style="display:grid;grid-template-columns:1fr auto;gap:6px">'
            +         '<input type="text" id="evt-end-date" class="date-picker" dir="ltr" value="' + endDate + '">'
            +         '<div style="display:flex;gap:4px">'
            +           '<input type="text" id="evt-end-time" dir="ltr" placeholder="HH:MM" value="' + endTime + '" style="width:80px;text-align:center;font-family:monospace">'
            +           '<button type="button" id="evt-end-clock" style="width:38px;border:none;border-radius:10px;background:var(--primary-soft);color:var(--primary-dark);cursor:pointer;font-size:1.05rem">🕐</button>'
            +         '</div></div></div>'

            // محل
            +     '<div class="field"><label>📍 محل رویداد</label>'
            +       '<input type="text" id="evt-location" value="' + (ev ? esc(ev.location || '') : '') + '"></div>'

            // افراد
            +     '<div class="field"><label>👥 افراد (چندگانه)</label>'
            +       '<div style="display:flex;gap:6px;margin-bottom:8px">'
            +         '<select id="evt-person-select" style="flex:1;padding:9px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit">' + personOptions + '</select>'
            +         '<button type="button" id="evt-person-add" style="padding:0 14px;background:var(--primary);color:#fff;border:none;border-radius:10px;font-weight:800;cursor:pointer">+ افزودن</button>'
            +       '</div>'
            +       '<div id="evt-persons-chips" style="display:flex;flex-wrap:wrap;gap:6px;min-height:26px">' + personsChips + '</div>'
            +     '</div>'

            // توضیحات
            +     '<div class="field"><label>📝 توضیحات</label>'
            +       '<textarea id="evt-desc" rows="3" style="width:100%;padding:9px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit">' + (ev ? esc(ev.desc || '') : '') + '</textarea></div>'

            // ★★★ بخش تکرار — به سبک گوگل کلندر ★★★
            +     '<div id="evt-recurrence-box"></div>'

            // یادآور
            +     '<div class="field"><label>🔔 یادآور (دقیقه قبل)</label>'
            +       '<div style="display:flex;gap:6px;align-items:center">'
            +         '<button type="button" id="evt-rem-minus" style="width:42px;height:42px;border-radius:10px;border:1.5px solid var(--border);background:#fee2e2;color:#dc2626;font-size:1.2rem;font-weight:900;cursor:pointer">−</button>'
            +         '<input type="number" id="evt-rem" min="0" value="' + (ev && ev.reminder ? ev.reminder : 0) + '" style="flex:1;padding:10px;border:1.5px solid var(--border);border-radius:10px;text-align:center;font-weight:800">'
            +         '<button type="button" id="evt-rem-plus" style="width:42px;height:42px;border-radius:10px;border:1.5px solid var(--border);background:#dbeafe;color:#1e40af;font-size:1.2rem;font-weight:900;cursor:pointer">+</button>'
            +       '</div>'
            +       '<div style="font-size:.72rem;color:var(--text-muted);margin-top:6px">مقدار ۰ = یادآور در زمان رویداد</div>'
            +     '</div>'

            +   '</div>'
            +   '<div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap">'
            +     (ev ? '<button id="evt-delete" class="btn-danger">🗑 حذف</button>' : '<div></div>')
            +     '<div style="display:flex;gap:8px">'
            +       '<button id="evt-cancel" class="btn-secondary">انصراف</button>'
            +       '<button id="evt-save" class="btn-primary">💾 ذخیره</button>'
            +     '</div>'
            +   '</div>'
            + '</div>';

        document.body.insertAdjacentHTML('beforeend', html);
        setTimeout(function () { if (typeof attachDatePickers === 'function') attachDatePickers(); }, 80);

        /* ★★★ رندر UI تکرار به سبک گوگل ★★★ */
        renderRecurrenceUI(recurrence, curDate);

        function renderRecurrenceUI(rec, startDate) {
            var box = document.getElementById('evt-recurrence-box');
            if (!box) return;

            var freqOpts = [
                { v: 'none',    l: 'بدون تکرار' },
                { v: 'daily',   l: 'روزانه' },
                { v: 'weekly',  l: 'هفتگی' },
                { v: 'monthly', l: 'ماهانه' },
                { v: 'yearly',  l: 'سالانه' }
            ];

            var html = '<div class="field" style="padding:14px;background:#f8fafd;border:1.5px solid var(--border);border-radius:14px;margin-bottom:12px">';
            html += '<label style="font-weight:900;color:var(--primary-dark);font-size:.9rem;margin-bottom:10px;display:block">🔁 تکرار رویداد</label>';

            /* ردیف ۱: تکرار در هر [N] [واحد] */
            var freqLabel = '';
            if (rec.freq === 'daily')   freqLabel = 'روز';
            else if (rec.freq === 'weekly')  freqLabel = 'هفته';
            else if (rec.freq === 'monthly') freqLabel = 'ماه';
            else if (rec.freq === 'yearly')  freqLabel = 'سال';

            html += '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">';
            html += '<span style="font-size:.85rem;font-weight:700">تکرار در هر</span>';
            html += '<input type="number" id="rec-interval" min="1" max="99" value="' + (rec.interval || 1) + '" style="width:70px;padding:9px;border:1.5px solid var(--border);border-radius:10px;text-align:center;font-weight:800;font-family:inherit">';
            html += '<select id="rec-freq" style="flex:1;min-width:130px;padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-weight:700;background:#fff">';
            freqOpts.forEach(function (o) {
                html += '<option value="' + o.v + '"' + (rec.freq === o.v ? ' selected' : '') + '>' + o.l + '</option>';
            });
            html += '</select>';
            html += '</div>';

            /* ردیف ۲: اگر هفتگی — انتخاب روزهای هفته */
            html += '<div id="rec-weekdays-row" style="display:' + (rec.freq === 'weekly' ? 'block' : 'none') + ';margin-bottom:12px">';
            html += '<div style="font-size:.78rem;font-weight:800;color:var(--text-muted);margin-bottom:8px">تکرار در روزهای:</div>';
            html += '<div style="display:flex;gap:6px;justify-content:space-between;flex-wrap:wrap">';
            var curWds = rec.weekDays || [];
            WEEK_FA_SHORT.forEach(function (wd, i) {
                var active = curWds.indexOf(i) !== -1;
                html += '<button type="button" class="rec-wd-btn" data-wd="' + i + '" ' +
                        'style="width:44px;height:44px;border-radius:50%;border:2px solid ' + (active ? '#dc2626' : 'var(--border)') + ';' +
                        'background:' + (active ? 'linear-gradient(135deg,#ef4444,#dc2626)' : '#fff') + ';' +
                        'color:' + (active ? '#fff' : 'var(--text)') + ';font-family:inherit;font-size:1rem;font-weight:900;' +
                        'cursor:pointer;transition:all .2s" ' +
                        'title="' + WEEK_FA_FULL[i] + '">' + wd + '</button>';
            });
            html += '</div></div>';

            /* ردیف ۳: اگر ماهانه — انتخاب روز ماه یا روز هفته */
            var startDayNum = Number(startDate.split('/')[2]) || 1;
            html += '<div id="rec-monthly-row" style="display:' + (rec.freq === 'monthly' ? 'block' : 'none') + ';margin-bottom:12px">';
            html += '<div style="display:flex;gap:8px;flex-wrap:wrap">';
            html += '<select id="rec-monthly-mode" style="flex:1;padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;background:#fff">';
            html += '<option value="day"' + ((rec.monthlyMode || 'day') === 'day' ? ' selected' : '') + '>ماهانه در روز ' + toFa(rec.monthlyDay || startDayNum) + ' ام ماه</option>';
            html += '</select>';
            html += '</div></div>';

            /* ردیف ۴: بخش پایان */
            var endsVal = rec.ends || 'never';
            html += '<div style="border-top:1px dashed var(--border);padding-top:12px;margin-top:12px">';
            html += '<div style="font-size:.78rem;font-weight:900;color:var(--text-muted);margin-bottom:8px">پایان</div>';

            // Never
            html += '<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#fff;border:1.5px solid ' + (endsVal === 'never' ? '#3b82f6' : 'var(--border)') + ';border-radius:10px;cursor:pointer;margin-bottom:6px;font-size:.85rem;font-weight:700">';
            html += '<input type="radio" name="rec-ends" value="never" ' + (endsVal === 'never' ? 'checked' : '') + ' style="accent-color:#3b82f6">';
            html += '<span>هرگز</span></label>';

            // On date
            html += '<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#fff;border:1.5px solid ' + (endsVal === 'on' ? '#3b82f6' : 'var(--border)') + ';border-radius:10px;cursor:pointer;margin-bottom:6px;font-size:.85rem;font-weight:700">';
            html += '<input type="radio" name="rec-ends" value="on" ' + (endsVal === 'on' ? 'checked' : '') + ' style="accent-color:#3b82f6">';
            html += '<span>در تاریخ</span>';
            html += '<input type="text" id="rec-until" class="date-picker" dir="ltr" value="' + (rec.until || '') + '" placeholder="YYYY/MM/DD" style="flex:1;min-width:120px;padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-family:monospace;direction:ltr;text-align:center">';
            html += '</label>';

            // After count
            html += '<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#fff;border:1.5px solid ' + (endsVal === 'after' ? '#3b82f6' : 'var(--border)') + ';border-radius:10px;cursor:pointer;font-size:.85rem;font-weight:700">';
            html += '<input type="radio" name="rec-ends" value="after" ' + (endsVal === 'after' ? 'checked' : '') + ' style="accent-color:#3b82f6">';
            html += '<span>بعد از</span>';
            html += '<input type="number" id="rec-count" min="1" max="999" value="' + (rec.count || 10) + '" style="width:70px;padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-family:inherit;text-align:center;font-weight:800">';
            html += '<span>تکرار</span>';
            html += '</label>';

            html += '</div>'; // ends
            html += '</div>'; // recurrence box

            box.innerHTML = html;

            /* ★ اتصال رویدادها */
            var freqSel = document.getElementById('rec-freq');
            var wdRow = document.getElementById('rec-weekdays-row');
            var moRow = document.getElementById('rec-monthly-row');

            freqSel.onchange = function () {
                var f = this.value;
                wdRow.style.display = (f === 'weekly') ? 'block' : 'none';
                moRow.style.display = (f === 'monthly') ? 'block' : 'none';
                // بروزرسانی لیبل واحد
                rec.freq = f;
            };

            document.querySelectorAll('.rec-wd-btn').forEach(function (b) {
                b.onclick = function () {
                    var wd = Number(this.getAttribute('data-wd'));
                    var active = this.style.background.indexOf('rgb(239, 68, 68)') !== -1 ||
                                 this.style.background.indexOf('#dc2626') !== -1;
                    if (active) {
                        this.style.background = '#fff';
                        this.style.borderColor = 'var(--border)';
                        this.style.color = 'var(--text)';
                    } else {
                        this.style.background = 'linear-gradient(135deg,#ef4444,#dc2626)';
                        this.style.borderColor = '#dc2626';
                        this.style.color = '#fff';
                    }
                };
            });

            // فعال/غیرفعال کردن فیلدها بر اساس انتخاب رادیو
            var radioUpdate = function () {
                var v = document.querySelector('input[name="rec-ends"]:checked');
                if (!v) return;
                var val = v.value;
                var untilInp = document.getElementById('rec-until');
                var countInp = document.getElementById('rec-count');
                if (untilInp) untilInp.disabled = (val !== 'on');
                if (countInp) countInp.disabled = (val !== 'after');
            };
            document.querySelectorAll('input[name="rec-ends"]').forEach(function (r) {
                r.onchange = radioUpdate;
            });
            radioUpdate();

            setTimeout(function () {
                if (typeof attachDatePickers === 'function') attachDatePickers();
            }, 60);
        }

        /* -------------- اتصال رویدادهای پیکر ------------- */
        document.querySelectorAll('.evt-cat-btn').forEach(function (b) {
            b.onclick = function () {
                selectedCat = this.getAttribute('data-cat');
                document.querySelectorAll('.evt-cat-btn').forEach(function (x) {
                    x.style.background = '#f8fafc';
                    x.style.borderColor = 'transparent';
                });
                var c = (window.CAL_CATS || {})[selectedCat];
                this.style.background = (c ? c.color : '#888') + '20';
                this.style.borderColor = c ? c.color : '#888';
            };
        });

        document.getElementById('evt-start-clock').onclick = function () {
            if (typeof openTimePicker !== 'function') return;
            openTimePicker(function (t) { document.getElementById('evt-start-time').value = t; },
                document.getElementById('evt-start-time').value || '21:00');
        };
        document.getElementById('evt-end-clock').onclick = function () {
            if (typeof openTimePicker !== 'function') return;
            openTimePicker(function (t) { document.getElementById('evt-end-time').value = t; },
                document.getElementById('evt-end-time').value || '21:00');
        };

        document.getElementById('evt-rem-minus').onclick = function () {
            var el = document.getElementById('evt-rem');
            el.value = Math.max(0, (Number(el.value) || 0) - 5);
        };
        document.getElementById('evt-rem-plus').onclick = function () {
            var el = document.getElementById('evt-rem');
            el.value = Math.max(0, (Number(el.value) || 0) + 5);
        };
        document.getElementById('evt-rem').addEventListener('input', function () {
            if (Number(this.value) < 0) this.value = 0;
        });

        function renderChips() {
            var box = document.getElementById('evt-persons-chips');
            box.innerHTML = persons.map(function (pid) {
                var pr = personsList.find(function (x) { return x.id === pid; });
                if (!pr) return '';
                return '<span data-pid="' + pid + '" style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;background:#dbeafe;color:#1e40af;border-radius:14px;font-size:.78rem;font-weight:800">' +
                       (pr.first || '') + ' ' + (pr.last || '') +
                       ' <button type="button" style="background:none;border:none;color:#dc2626;cursor:pointer;font-weight:900" data-rm="' + pid + '">×</button></span>';
            }).join('');
            box.querySelectorAll('[data-rm]').forEach(function (b) {
                b.onclick = function () {
                    var pid = this.getAttribute('data-rm');
                    persons = persons.filter(function (x) { return x !== pid; });
                    renderChips();
                };
            });
        }
        document.getElementById('evt-person-add').onclick = function () {
            var v = document.getElementById('evt-person-select').value;
            if (v && persons.indexOf(v) === -1) {
                persons.push(v);
                renderChips();
                document.getElementById('evt-person-select').value = '';
            }
        };

        function close() {
            var o = document.getElementById('evt-overlay'); if (o) o.remove();
            var m = document.getElementById('evt-modal'); if (m) m.remove();
        }
        document.getElementById('evt-close').onclick = close;
        document.getElementById('evt-cancel').onclick = close;
        document.getElementById('evt-overlay').onclick = close;

        /* -------------- ذخیره -------------- */
        document.getElementById('evt-save').onclick = function () {
            var title = document.getElementById('evt-title').value.trim();
            var sd = normalizeDigits(document.getElementById('evt-start-date').value.trim());
            var st = (typeof toEnTime === 'function' ? toEnTime(document.getElementById('evt-start-time').value.trim()) : document.getElementById('evt-start-time').value.trim()) || '21:00';
            var ed = normalizeDigits(document.getElementById('evt-end-date').value.trim()) || sd;
            var et = (typeof toEnTime === 'function' ? toEnTime(document.getElementById('evt-end-time').value.trim()) : document.getElementById('evt-end-time').value.trim()) || st;
            var loc = document.getElementById('evt-location').value.trim();
            var desc = document.getElementById('evt-desc').value.trim();
            var rem = Math.max(0, Number(document.getElementById('evt-rem').value) || 0);

            // ساخت recurrence نهایی از فرم
            var freqSel = document.getElementById('rec-freq');
            var newRec = { freq: freqSel ? freqSel.value : 'none' };

            if (newRec.freq !== 'none') {
                newRec.interval = Math.max(1, Number(document.getElementById('rec-interval').value) || 1);
                if (newRec.freq === 'weekly') {
                    var wds = [];
                    document.querySelectorAll('.rec-wd-btn').forEach(function (b, i) {
                        var active = b.style.background.indexOf('rgb(239, 68, 68)') !== -1 ||
                                     b.style.background.indexOf('#dc2626') !== -1;
                        if (active) wds.push(i);
                    });
                    newRec.weekDays = wds.length ? wds : [getFaWeekDay(sd)];
                }
                if (newRec.freq === 'monthly') {
                    newRec.monthlyMode = 'day';
                    newRec.monthlyDay = Number(sd.split('/')[2]) || 1;
                }
                var endsRadio = document.querySelector('input[name="rec-ends"]:checked');
                newRec.ends = endsRadio ? endsRadio.value : 'never';
                if (newRec.ends === 'on') {
                    newRec.until = normalizeDigits(document.getElementById('rec-until').value.trim());
                    if (!newRec.until) { alert('⚠️ تاریخ پایان تکرار را وارد کنید.'); return; }
                }
                if (newRec.ends === 'after') {
                    newRec.count = Math.max(1, Number(document.getElementById('rec-count').value) || 10);
                }
                newRec.exdates = (recurrence && recurrence.exdates) ? recurrence.exdates.slice() : [];
            }

            if (!title) { alert('عنوان اجباری'); return; }
            if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(sd)) { alert('تاریخ شروع نامعتبر'); return; }
            if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(ed)) { alert('تاریخ پایان نامعتبر'); return; }

            var list = DB.load('calendarUserEvents', []);

            /* ★ اعمال بر اساس scope */
            if (scope === 'this' && ev && ev.rawId) {
                // فقط این رخداد: exception روی master
                var overrides = DB.load('calendarRecOverrides', {});
                if (!overrides[ev.rawId]) overrides[ev.rawId] = {};
                overrides[ev.rawId][ev.date] = {
                    modified: {
                        title: title, cat: selectedCat, time: st, endTime: et,
                        desc: desc, location: loc, persons: persons.slice(), reminder: rem
                    }
                };
                DB.save('calendarRecOverrides', overrides);
            } else if (scope === 'future' && ev && ev.rawId) {
                // این و بعدی‌ها: split
                var master = list.find(function (x) { return x.id === ev.rawId; });
                if (master) {
                    // پایان master را روز قبل از این رخداد کن
                    var dayBefore = addJalaliDays(ev.date, -1);
                    if (master.recurrence) {
                        master.recurrence.ends = 'on';
                        master.recurrence.until = dayBefore;
                    }
                    // اگر رخداد همان روز اول باشد، تا حذف می‌شود
                    if (dayBefore < (master.startDate || master.date)) {
                        list = list.filter(function (x) { return x.id !== ev.rawId; });
                    }
                }
                // رخداد جدید بساز
                var newEv = {
                    id: 'u_' + uid(),
                    cat: selectedCat,
                    startDate: sd, startTime: st, endDate: ed, endTime: et,
                    date: sd, time: st,
                    title: title, desc: desc, location: loc,
                    persons: persons.slice(), reminder: rem,
                    recurrence: newRec,
                    createdAt: Date.now()
                };
                list.push(newEv);
            } else {
                // scope === 'all' یا new event
                var existing = null;
                if (ev && ev.rawId) {
                    existing = list.find(function (x) { return x.id === ev.rawId; });
                } else if (ev && ev.id) {
                    existing = list.find(function (x) { return x.id === ev.id; });
                }
                if (existing) {
                    existing.cat = selectedCat;
                    existing.startDate = sd;
                    existing.startTime = st;
                    existing.endDate = ed;
                    existing.endTime = et;
                    existing.date = sd;
                    existing.time = st;
                    existing.title = title;
                    existing.desc = desc;
                    existing.location = loc;
                    existing.persons = persons.slice();
                    existing.reminder = rem;
                    existing.recurrence = newRec;
                } else {
                    list.push({
                        id: 'u_' + uid(),
                        cat: selectedCat,
                        startDate: sd, startTime: st, endDate: ed, endTime: et,
                        date: sd, time: st,
                        title: title, desc: desc, location: loc,
                        persons: persons.slice(), reminder: rem,
                        recurrence: newRec,
                        createdAt: Date.now()
                    });
                }
            }

            DB.save('calendarUserEvents', list);
            close();
            window.calRender();
            if (typeof updateHomeWidgets === 'function') {
                try { updateHomeWidgets(); } catch (e) {}
            }
            var scopeMsg = scope === 'this' ? ' (فقط این رویداد)' :
                           scope === 'future' ? ' (این و بعدی)' :
                           scope === 'all' ? ' (همه)' : '';
            if (typeof showToast === 'function') showToast('✅ رویداد ذخیره شد' + scopeMsg);
        };

        /* -------------- حذف -------------- */
        if (ev) {
            document.getElementById('evt-delete').onclick = function () {
                // اگر رویداد تکرارشونده است و scope مشخص نشده، دوباره بپرس
                var isRecurring = ev.recurrence && ev.recurrence.freq && ev.recurrence.freq !== 'none';
                if (isRecurring && !scope && ev.rawId) {
                    var rawList = DB.load('calendarUserEvents', []);
                    var master = rawList.find(function (x) { return x.id === ev.rawId; });
                    if (master) {
                        showScopeDialog(master, ev.date, ev.time, function (sc) {
                            doDelete(sc);
                        });
                        return;
                    }
                }
                doDelete(scope || 'all');
            };

            function doDelete(sc) {
                if (!confirm('حذف شود؟')) return;
                var list = DB.load('calendarUserEvents', []);

                if (sc === 'this' && ev.rawId) {
                    var ov = DB.load('calendarRecOverrides', {});
                    if (!ov[ev.rawId]) ov[ev.rawId] = {};
                    ov[ev.rawId][ev.date] = { deleted: true };
                    DB.save('calendarRecOverrides', ov);
                } else if (sc === 'future' && ev.rawId) {
                    var master = list.find(function (x) { return x.id === ev.rawId; });
                    if (master && master.recurrence) {
                        var dayBefore = addJalaliDays(ev.date, -1);
                        if (dayBefore < (master.startDate || master.date)) {
                            list = list.filter(function (x) { return x.id !== ev.rawId; });
                        } else {
                            master.recurrence.ends = 'on';
                            master.recurrence.until = dayBefore;
                        }
                        DB.save('calendarUserEvents', list);
                    }
                } else {
                    // all
                    var idToDel = ev.rawId || ev.id;
                    list = list.filter(function (x) { return x.id !== idToDel; });
                    DB.save('calendarUserEvents', list);
                    // overrides را هم پاک کن
                    var ov2 = DB.load('calendarRecOverrides', {});
                    delete ov2[idToDel];
                    DB.save('calendarRecOverrides', ov2);
                }

                close();
                window.calRender();
                if (typeof updateHomeWidgets === 'function') {
                    try { updateHomeWidgets(); } catch (e) {}
                }
                if (typeof showToast === 'function') showToast('🗑 حذف شد');
            }
        }
    };

    /* ============================================================
       بخش ۱۰: اتصال event کلیک به handleEventClick برای همه‌ی نماها
       ============================================================ */
    // ما در bindCalEventsFallback از handleEventClick استفاده می‌کنیم،
    // همچنین در bindCalEvents41 اصلی هم باید کلیک‌ها را intercept کنیم.
    // به همین دلیل یک observer ساده نصب می‌کنیم:
    document.addEventListener('click', function (e) {
        var t = e.target;
        if (!t || !t.closest) return;
        var evEl = t.closest('[data-ev]');
        if (!evEl) return;
        var page = document.getElementById('page-jalali-calendar');
        if (!page || !page.contains(evEl)) return;

        // جلوگیری از اجرای دوباره‌ی handler اصلی
        e.stopImmediatePropagation && e.stopImmediatePropagation();

        var id = evEl.getAttribute('data-ev');
        var all = window.calBuildAllEvents();
        var ev = all.find(function (x) { return x.id === id; });
        if (!ev) return;
        handleEventClick(ev);
    }, true);

    /* ============================================================
       بخش ۱۱: اطمینان از بارگذاری first
       ============================================================ */
    function bootPatch() {
        // اطمینان از اینکه تقویم در حافظه هست
        if (typeof window.calRender === 'function') {
            // اگر کاربر همین الان روی تقویم است، دوباره رندر کن
            var page = document.getElementById('page-jalali-calendar');
            if (page && page.classList.contains('active')) {
                setTimeout(function () { window.calRender(); }, 300);
            }
        }
        console.log('✅ [Calendar Patch] recurrence UI + دستورکار کامل + جستجو نصب شد');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(bootPatch, 2000); });
    } else {
        setTimeout(bootPatch, 2000);
    }

})();
