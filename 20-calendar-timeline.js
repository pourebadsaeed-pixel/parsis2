/* پارسیس — پچ تقویم نسخه ۲۰:
   • تایم‌لاین حرفه‌ای برای نمای روز (نمایش چندساعته + ربع ساعت‌ها)
   • Long-Press Drag & Drop روی رویداد (جابجایی در ساعت و روز)
   • نوار روزهای هفته برای Drag افقی
   • رفع لایوت باکس «پایان تکرار» (در تاریخ / بعد از)
*/
'use strict';

(function () {
    if (window._calTimelinePatch20) return;
    window._calTimelinePatch20 = true;

    /* ============================================================
       ثابت‌ها و کمک‌تابع‌ها
       ============================================================ */
    var HOUR_HEIGHT = 64;
    var START_HOUR  = 5;
    var END_HOUR    = 24;
    var MIN_SNAP    = 15;
    var TOTAL_MIN   = (END_HOUR - START_HOUR) * 60;

    function p2(n) { n = Number(n) || 0; return String(n).length < 2 ? '0' + n : String(n); }
    function toMin(t) {
        if (!t) return 0;
        var p = String(t).split(':');
        return (Number(p[0]) || 0) * 60 + (Number(p[1]) || 0);
    }
    function toTime(m) {
        m = Math.max(0, Math.round(m));
        return p2(Math.floor(m / 60)) + ':' + p2(m % 60);
    }
    function escS(s) {
        if (typeof esc === 'function') return esc(s);
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
        });
    }
    function faTime(t) {
        if (typeof toFaTime === 'function') return toFaTime(t);
        return String(t).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; });
    }
    function fa(n) {
        if (typeof toFa === 'function') return toFa(n);
        return String(n).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; });
    }
    function jalaliDayName(jDate) {
        try {
            var p = jDate.split('/').map(Number);
            var g = jalaliToGregorian(p[0], p[1], p[2]);
            var d = new Date(g[0], g[1] - 1, g[2]);
            return WEEKDAYS_FA[d.getDay()];
        } catch (e) { return ''; }
    }
    function jalaliDowShort(jDate) {
        try {
            var p = jDate.split('/').map(Number);
            var g = jalaliToGregorian(p[0], p[1], p[2]);
            var d = new Date(g[0], g[1] - 1, g[2]);
            return ['ی','د','س','چ','پ','ج','ش'][d.getDay()];
        } catch (e) { return ''; }
    }
    function jalaliMonthShort(m) {
        return ['فرو','ارد','خرد','تیر','مرد','شهر','مهر','آبا','آذر','دی','بهم','اسف'][m - 1] || '';
    }
    function jalaliFullDayLabel(jDate) {
        try {
            var p = jDate.split('/').map(Number);
            return jalaliDayName(jDate) + '، ' + fa(p[2]) + ' ' + JALALI_MONTHS[p[1] - 1] + ' ' + fa(p[0]);
        } catch (e) { return jDate; }
    }

    /* ============================================================
       CSS
       ============================================================ */
    function injectCss() {
        if (document.getElementById('cal-tl-style20')) return;
        var s = document.createElement('style');
        s.id = 'cal-tl-style20';
        s.textContent = ''
        /* --- Timeline --- */
        + '.cal-tl-wrap{position:relative;display:grid;grid-template-columns:74px 1fr;border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--card-solid);direction:rtl}'
        + '.cal-tl-hours{background:linear-gradient(180deg,#f9fbfe,#f4f8fd);border-left:1px solid var(--border)}'
        + '.cal-tl-hour-lbl{height:' + HOUR_HEIGHT + 'px;display:flex;align-items:flex-start;justify-content:center;padding-top:5px;font-size:0.72rem;font-weight:900;font-family:monospace;color:var(--primary-dark);direction:ltr;border-bottom:1px solid var(--border);position:relative}'
        + '.cal-tl-body{position:relative;background:#fff;touch-action:pan-y}'
        + '.cal-tl-gridline{position:absolute;left:0;right:0;height:0;border-bottom:1px solid var(--border);pointer-events:none;z-index:0}'
        + '.cal-tl-gridline.minor{border-bottom:1px dashed rgba(15,23,42,0.06)}'
        + '.cal-tl-event{position:absolute;border-radius:10px;padding:5px 9px;font-size:0.78rem;font-weight:700;overflow:hidden;cursor:grab;transition:box-shadow .18s,transform .15s,width .15s,left .15s;z-index:3;border-right-width:4px;border-right-style:solid;box-shadow:0 1px 3px rgba(15,23,42,0.08);touch-action:pan-y;user-select:none;-webkit-user-select:none}'
        + '.cal-tl-event:hover{filter:brightness(0.98)}'
        + '.cal-tl-event:active{cursor:grabbing}'
        + '.cal-tl-event.dragging{z-index:500;box-shadow:0 18px 42px rgba(15,23,42,0.4);transform:scale(1.03);opacity:.92;pointer-events:none;cursor:grabbing;transition:none}'
        + '.cal-tl-event .ev-time{font-size:.68rem;font-family:monospace;color:#1e40af;font-weight:800;direction:ltr;margin-bottom:3px;white-space:nowrap}'
        + '.cal-tl-event .ev-title{font-weight:800;font-size:.82rem;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
        + '.cal-tl-event .ev-loc{font-size:.68rem;color:#64748b;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
        + '.cal-tl-preview{position:absolute;border-radius:10px;background:rgba(59,130,246,0.18);border:2px dashed #3b82f6;pointer-events:none;z-index:150;display:none;align-items:center;justify-content:center;transition:top .06s,height .06s,left .06s,width .06s}'
        + '.cal-tl-preview.show{display:flex}'
        + '.cal-tl-preview .pv-time{background:#1e40af;color:#fff;padding:4px 12px;border-radius:8px;font-size:.75rem;font-weight:900;font-family:monospace;direction:ltr;white-space:nowrap;box-shadow:0 4px 12px rgba(30,64,175,.4)}'
        + '.cal-tl-now{position:absolute;left:0;right:0;height:2px;background:#ef4444;z-index:5;pointer-events:none}'
        + '.cal-tl-now::before{content:"";position:absolute;right:-5px;top:-4px;width:10px;height:10px;border-radius:50%;background:#ef4444;box-shadow:0 0 8px rgba(239,68,68,0.6)}'
        + '.cal-tl-hint{position:absolute;bottom:6px;left:8px;font-size:.66rem;color:#94a3b8;font-style:italic;pointer-events:none;background:rgba(255,255,255,.85);padding:2px 8px;border-radius:6px}'
        /* --- Date strip --- */
        + '.cal-day-strip{display:flex;gap:5px;padding:8px;background:#f8fafd;border-radius:12px;border:1px solid var(--border);margin-bottom:10px;overflow-x:auto;direction:rtl;transition:all .2s}'
        + '.cal-day-strip.pinned{position:fixed;top:0;left:0;right:0;z-index:1600;border-radius:0;box-shadow:0 8px 24px rgba(15,23,42,.25);padding:10px;background:#fff}'
        + '.cal-day-chip{flex:0 0 auto;min-width:58px;padding:8px 6px;border-radius:10px;background:#fff;border:1.5px solid var(--border);text-align:center;cursor:pointer;transition:all .2s;font-family:inherit;user-select:none;-webkit-user-select:none}'
        + '.cal-day-chip:hover{border-color:var(--primary)}'
        + '.cal-day-chip.today{background:linear-gradient(135deg,#dbeafe,#bfdbfe);border-color:#3b82f6}'
        + '.cal-day-chip.active{background:linear-gradient(135deg,#1e40af,#3b82f6);color:#fff;border-color:transparent;box-shadow:0 4px 12px rgba(59,130,246,.35)}'
        + '.cal-day-chip.drag-over{background:linear-gradient(135deg,#a7f3d0,#6ee7b7)!important;border-color:#059669!important;transform:scale(1.12);box-shadow:0 6px 20px rgba(5,150,105,.45);color:#065f46!important}'
        + '.cal-day-chip.drag-over .cdc-wd,.cal-day-chip.drag-over .cdc-d,.cal-day-chip.drag-over .cdc-m{color:#065f46!important}'
        + '.cal-day-chip .cdc-wd{font-size:.68rem;font-weight:800;color:#64748b}'
        + '.cal-day-chip.active .cdc-wd{color:rgba(255,255,255,.9)}'
        + '.cal-day-chip.today .cdc-wd{color:#1e40af}'
        + '.cal-day-chip .cdc-d{font-size:.9rem;font-weight:900;color:#1e40af;margin-top:3px;font-variant-numeric:tabular-nums}'
        + '.cal-day-chip.active .cdc-d{color:#fff}'
        + '.cal-day-chip.today .cdc-d{color:#1e3a8a}'
        + '.cal-day-chip .cdc-m{font-size:.6rem;color:#94a3b8;margin-top:1px}'
        /* --- Recurrence ends fix --- */
        + '.rec-ends-row{display:flex;align-items:center;gap:12px;padding:12px 14px;background:#fff;border:1.5px solid var(--border);border-radius:11px;margin-bottom:8px;cursor:pointer;transition:all .2s}'
        + '.rec-ends-row:hover{border-color:#93c5fd;background:#f8fafd}'
        + '.rec-ends-row.checked{border-color:#3b82f6;background:#eff6ff}'
        + '.rec-ends-row input[type=radio]{width:18px;height:18px;accent-color:#3b82f6;flex-shrink:0;cursor:pointer;margin:0}'
        + '.rec-ends-row .rec-lbl{font-size:.88rem;font-weight:800;color:var(--text);white-space:nowrap;flex-shrink:0;min-width:56px}'
        + '.rec-ends-row .rec-input-wrap{flex:1;display:flex;align-items:center;gap:8px;min-width:0}'
        + '.rec-ends-row .rec-input-wrap input[type=text]{flex:1;min-width:0;padding:9px 12px;border:1.5px solid var(--border);border-radius:9px;font-family:monospace;font-size:.88rem;direction:ltr;text-align:center;font-weight:700;background:#fff;outline:none}'
        + '.rec-ends-row .rec-input-wrap input[type=text]:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.15)}'
        + '.rec-ends-row .rec-input-wrap input[type=number]{width:88px;padding:9px 12px;border:1.5px solid var(--border);border-radius:9px;font-family:inherit;font-size:.92rem;text-align:center;font-weight:800;background:#fff;outline:none}'
        + '.rec-ends-row .rec-input-wrap input[type=number]:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.15)}'
        + '.rec-ends-row .rec-unit{font-size:.85rem;font-weight:700;color:var(--text-muted);flex-shrink:0}'
        + '.rec-ends-row input:disabled{background:#f3f4f6;color:#9ca3af;cursor:not-allowed}'
        /* --- Scope dialog --- */
        + '.cal-scope-btn{width:100%;text-align:right;padding:14px;border:1.5px solid var(--border);background:#fff;border-radius:12px;font-family:inherit;cursor:pointer;transition:all .2s;display:flex;flex-direction:column;gap:5px;margin-bottom:8px}'
        + '.cal-scope-btn:hover{background:#eff6ff;border-color:#3b82f6;transform:translateY(-1px)}'
        + '.cal-scope-btn .cs-title{font-weight:800;color:#1e40af;font-size:.9rem}'
        + '.cal-scope-btn .cs-sub{font-size:.75rem;color:#64748b}';
        document.head.appendChild(s);
    }

    /* ============================================================
       رندر تایم‌لاین روز
       ============================================================ */
    function buildEventPosition(e) {
        var sMin = toMin(e.startTime || e.time || '21:00');
        var eMin = e.endTime ? toMin(e.endTime) : (sMin + 60);
        if (eMin <= sMin) eMin = sMin + 30;
        return { sMin: sMin, eMin: eMin };
    }

    function layoutEvents(evs) {
        // sort by start
        var sorted = evs.slice().sort(function (a, b) {
            if (a._sMin !== b._sMin) return a._sMin - b._sMin;
            return a._eMin - b._eMin;
        });
        var columns = [];
        sorted.forEach(function (e) {
            var placed = false;
            for (var i = 0; i < columns.length; i++) {
                var last = columns[i][columns[i].length - 1];
                if (last._eMin <= e._sMin) {
                    columns[i].push(e);
                    e._col = i;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                e._col = columns.length;
                columns.push([e]);
            }
        });
        // برای هر رویداد، تعداد ستون‌های هم‌پوشان را محاسبه کن
        sorted.forEach(function (e) {
            var maxCol = e._col;
            sorted.forEach(function (o) {
                if (o === e) return;
                if (o._sMin < e._eMin && o._eMin > e._sMin) {
                    if (o._col > maxCol) maxCol = o._col;
                }
            });
            e._colsInGroup = maxCol + 1;
        });
        return sorted;
    }

    function renderTimeline(dayEvs, dateStr) {
        var bodyHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT;
        var today = todayJalaliStr();
        var isToday = (dateStr === today);
        var nowMin = (new Date().getHours() * 60 + new Date().getMinutes());

        // فیلتر و پارس
        var parsed = [];
        dayEvs.forEach(function (e) {
            var p = buildEventPosition(e);
            e._sMin = p.sMin;
            e._eMin = p.eMin;
            parsed.push(e);
        });
        var laid = layoutEvents(parsed);

        var html = '<div class="cal-tl-wrap">';
        // ستون ساعت‌ها
        html += '<div class="cal-tl-hours">';
        for (var h = START_HOUR; h < END_HOUR; h++) {
            html += '<div class="cal-tl-hour-lbl">' + faTime(p2(h) + ':00') + '</div>';
        }
        html += '</div>';

        // بدنه
        html += '<div class="cal-tl-body" data-day="' + escS(dateStr) + '" style="height:' + bodyHeight + 'px">';

        // gridlines
        html += '<div class="cal-tl-grid">';
        for (var hh = START_HOUR; hh <= END_HOUR; hh++) {
            var top = (hh - START_HOUR) * HOUR_HEIGHT;
            html += '<div class="cal-tl-gridline" style="top:' + top + 'px"></div>';
            if (hh < END_HOUR) {
                for (var q = 1; q <= 3; q++) {
                    var qtop = top + q * (HOUR_HEIGHT / 4);
                    html += '<div class="cal-tl-gridline minor" style="top:' + qtop + 'px"></div>';
                }
            }
        }
        html += '</div>';

        // events
        laid.forEach(function (e) {
            if (e._sMin >= END_HOUR * 60) return;
            if (e._eMin <= START_HOUR * 60) return;
            var top = (Math.max(e._sMin, START_HOUR * 60) - START_HOUR * 60) / 60 * HOUR_HEIGHT;
            var bot = (Math.min(e._eMin, END_HOUR * 60) - START_HOUR * 60) / 60 * HOUR_HEIGHT;
            var height = Math.max(24, bot - top);
            var totalCols = e._colsInGroup || 1;
            var col = e._col || 0;
            var colW = 100 / totalCols;
            var leftPct = col * colW;
            var widthPct = colW;
            var cat = (window.CAL_CATS && window.CAL_CATS[e.cat]) || { color: '#6366f1' };
            var timeTxt = faTime(e.startTime || e.time) + (e.endTime ? ' — ' + faTime(e.endTime) : '');

            html += '<div class="cal-tl-event" data-ev="' + escS(e.id) + '" '
                 +  'data-start-min="' + e._sMin + '" data-end-min="' + e._eMin + '" '
                 +  'data-total-cols="' + totalCols + '" data-col-idx="' + col + '" '
                 +  'style="top:' + top + 'px;height:' + height + 'px;'
                 +  'left:calc(' + leftPct + '% + 6px);'
                 +  'right:calc(' + (100 - leftPct - widthPct) + '% + 6px);'
                 +  'background:' + cat.color + '15;'
                 +  'border-right-color:' + cat.color + '" '
                 +  'title="' + escS(e.title) + '">'
                 +  '<div class="ev-time">' + timeTxt + '</div>'
                 +  '<div class="ev-title">' + escS(e.title) + '</div>'
                 +  (e.location ? '<div class="ev-loc">📍 ' + escS(e.location) + '</div>' : '')
                 +  '</div>';
        });

        // now indicator
        if (isToday && nowMin >= START_HOUR * 60 && nowMin <= END_HOUR * 60) {
            var nowTop = (nowMin - START_HOUR * 60) / 60 * HOUR_HEIGHT;
            html += '<div class="cal-tl-now" style="top:' + nowTop + 'px"></div>';
        }

        // preview
        html += '<div class="cal-tl-preview" id="cal-tl-preview"><span class="pv-time"></span></div>';
        html += '<div class="cal-tl-hint">💡 برای ساخت رویداد، یک جای خالی را لمس کن • برای جابجایی، نگه‌دار و بکش</div>';

        html += '</div>'; // body
        html += '</div>'; // wrap
        return html;
    }

    /* ============================================================
       نوار روزها (برای Drag افقی)
       ============================================================ */
    function renderDateStrip() {
        var cur = CAL41.cursor;
        var curStr = cur.y + '/' + p2(cur.m) + '/' + p2(cur.d);
        // ۷ روز حول روز جاری — از شنبه شروع می‌شود
        var startG = jalaliToGregorian(cur.y, cur.m, cur.d);
        var startDt = new Date(startG[0], startG[1] - 1, startG[2]);
        var offsetFromSat = (startDt.getDay() + 1) % 7;
        var satStr = addJalaliDays(curStr, -offsetFromSat);
        var today = todayJalaliStr();
        var days = [];
        for (var i = 0; i < 7; i++) days.push(addJalaliDays(satStr, i));

        var html = '<div class="cal-day-strip" id="cal-day-strip">';
        // قبلی
        html += '<button type="button" class="cal-day-chip" data-nav-strip="-1" style="background:#eef4fb;border-color:#c8dcef;font-size:1rem;min-width:44px;display:flex;align-items:center;justify-content:center" title="هفته قبل">‹</button>';
        days.forEach(function (d) {
            var p = d.split('/').map(Number);
            var isToday = (d === today);
            var isCur = (d === curStr);
            var cls = 'cal-day-chip' + (isToday ? ' today' : '') + (isCur ? ' active' : '');
            html += '<button type="button" class="' + cls + '" data-date="' + d + '">'
                 +   '<div class="cdc-wd">' + jalaliDowShort(d) + '</div>'
                 +   '<div class="cdc-d">' + fa(p[2]) + '</div>'
                 +   '<div class="cdc-m">' + jalaliMonthShort(p[1]) + '</div>'
                 +  '</button>';
        });
        // بعدی
        html += '<button type="button" class="cal-day-chip" data-nav-strip="1" style="background:#eef4fb;border-color:#c8dcef;font-size:1rem;min-width:44px;display:flex;align-items:center;justify-content:center" title="هفته بعد">›</button>';
        html += '</div>';
        return html;
    }

    /* ============================================================
       رندر نمای روز (کامل)
       ============================================================ */
    function renderDayView(events) {
        var cur = CAL41.cursor;
        var ds = cur.y + '/' + p2(cur.m) + '/' + p2(cur.d);
        var q = (CAL41.daySearch || '').toLowerCase();

        var dayEvs = events.filter(function (e) { return e.date === ds; });
        if (q) {
            dayEvs = dayEvs.filter(function (e) {
                var hay = ((e.title || '') + ' ' + (e.location || '') + ' ' + (e.desc || '')).toLowerCase();
                return hay.indexOf(q) !== -1;
            });
        }

        var p = ds.split('/').map(Number);
        var gd = jalaliToGregorian(p[0], p[1], p[2]);
        var dt = new Date(gd[0], gd[1] - 1, gd[2]);
        var EN_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

        var html = '';

        // header
        html += '<div style="text-align:center;margin-bottom:12px;padding:12px;background:var(--primary-soft);border-radius:12px">'
             +   '<div style="font-size:1.05rem;font-weight:900;color:#1e40af">'
             +     jalaliFullDayLabel(ds)
             +   '</div>'
             +   '<div style="font-size:.78rem;color:#94a3b8;direction:ltr;margin-top:4px">'
             +     dt.getDate() + ' ' + EN_MONTHS[dt.getMonth()] + ' ' + dt.getFullYear()
             +   '</div>'
             +   '<div style="margin-top:8px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">'
             +     '<button class="calg-btn primary" id="calg-share-day">📤 اشتراک‌گذاری</button>'
             +     '<button class="calg-btn" id="calg-add-here">＋ افزودن رویداد</button>'
             +   '</div>'
             + '</div>';

        // date strip
        html += renderDateStrip();

        // search result info
        if (q) {
            html += '<div style="text-align:center;font-size:.78rem;color:var(--text-muted);margin-bottom:10px">'
                 +  '🔍 نتایج جستجو برای «' + escS(q) + '» — ' + fa(dayEvs.length) + ' مورد'
                 +  '</div>';
        }

        // timeline
        html += renderTimeline(dayEvs, ds);

        return html;
    }

    /* ============================================================
       رندر دستورکار (با جستجو + بازه + بدون محدودیت ۳۰ روزه)
       ============================================================ */
    function renderAgendaView(events) {
        var today = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
        var todayStr = today[0] + '/' + p2(today[1]) + '/' + p2(today[2]);
        var q = (CAL41.agendaSearch || '').toLowerCase();
        var range = CAL41.agendaRange || 'all';

        var maxDate = '';
        if (range !== 'all') maxDate = addJalaliDays(todayStr, Number(range));

        var future = events.filter(function (e) {
            if (e.date < todayStr) return false;
            if (maxDate && e.date > maxDate) return false;
            if (q) {
                var hay = ((e.title || '') + ' ' + (e.location || '') + ' ' + (e.desc || '')).toLowerCase();
                if (hay.indexOf(q) === -1) return false;
            }
            return true;
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
                   (q ? '🔍 هیچ رویدادی با «' + escS(q) + '» یافت نشد.' : 'رویدادی در این بازه نیست.') +
                   '</div>';
        }

        var EN_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var html = '<div style="display:flex;flex-direction:column;gap:10px">';

        dates.forEach(function (d) {
            var p = d.split('/').map(Number);
            var gd = jalaliToGregorian(p[0], p[1], p[2]);
            var dt = new Date(gd[0], gd[1] - 1, gd[2]);
            var isToday = (d === todayStr);
            var dLeft = jalaliDiff(today[0], today[1], today[2], p[0], p[1], p[2]);
            var dLeftTxt = dLeft === 0 ? 'امروز' :
                           dLeft === 1 ? 'فردا' :
                           dLeft < 7 ? fa(dLeft) + ' روز دیگر' :
                           dLeft < 30 ? fa(Math.floor(dLeft / 7)) + ' هفته دیگر' :
                           dLeft < 365 ? fa(Math.floor(dLeft / 30)) + ' ماه دیگر' :
                           fa(Math.floor(dLeft / 365)) + ' سال دیگر';

            html += '<div style="padding:12px 14px;background:var(--card-alt);border-radius:10px;border-right:4px solid ' + (isToday ? '#1e40af' : '#3b82f6') + '">';
            html += '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:6px">';
            html += '<span style="font-size:.85rem;color:#1e40af;font-weight:900">'
                 +  jalaliDayName(d) + '، ' + fa(p[2]) + ' ' + JALALI_MONTHS[p[1] - 1] + ' ' + fa(p[0])
                 +  (isToday ? ' (امروز)' : '')
                 +  '</span>';
            html += '<span style="font-size:.72rem;color:#64748b;background:#fff;padding:3px 10px;border-radius:9px;font-weight:700">' + dLeftTxt + '</span>';
            html += '</div>';
            html += '<div style="font-size:.68rem;color:#94a3b8;direction:ltr;margin-bottom:8px">' + dt.getDate() + ' ' + EN_MONTHS[dt.getMonth()] + ' ' + dt.getFullYear() + '</div>';

            byDate[d].forEach(function (e) {
                var cat = (window.CAL_CATS && window.CAL_CATS[e.cat]) || { color: '#999', icon: '📌' };
                html += '<div class="calg-agev" data-ev="' + escS(e.id) + '" style="display:flex;gap:8px;align-items:center;padding:8px;border-radius:8px;background:#fff;margin-bottom:4px;cursor:pointer;border:1px solid var(--border)">'
                     +   '<span style="width:8px;height:8px;border-radius:2px;background:' + cat.color + ';flex-shrink:0"></span>'
                     +   '<span style="font-size:.8rem;font-weight:700;flex:1">' + escS(e.title) + '</span>'
                     +   (e.time ? '<span style="font-size:.72rem;color:var(--text-muted);direction:ltr;font-family:monospace">' + faTime(e.time) + '</span>' : '')
                     +  '</div>';
            });
            html += '</div>';
        });

        html += '</div>';
        return html;
    }

    /* ============================================================
       Override calRender
       ============================================================ */
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

        var titleText = (typeof buildCalTitle41 === 'function') ? buildCalTitle41() : '—';

        var html = '<h2>📅 مدیریت تقویم</h2><div class="calg-wrap">';

        // bar
        html += '<div class="calg-bar">';
        html += '<button class="calg-btn" id="calg-prev">‹</button>';
        html += '<h3 id="calg-titledate">' + titleText + '</h3>';
        html += '<button class="calg-btn" id="calg-today">امروز</button>';
        html += '<button class="calg-btn" id="calg-next">›</button>';
        html += '<button class="calg-btn" id="calg-cat-mgr" title="مدیریت دسته‌بندی" style="font-size:1.05rem">🎨</button>';
        html += '<button class="calg-btn primary" id="calg-new">＋ رویداد</button>';
        html += '</div>';

        // tabs
        html += '<div class="calg-tabs">';
        [['month','ماه'],['week','هفته'],['3day','۳ روز آتی'],['day','روز'],['agenda','دستورکار']].forEach(function (x) {
            html += '<button class="calg-tab' + (CAL41.view === x[0] ? ' active' : '') + '" data-view="' + x[0] + '">' + x[1] + '</button>';
        });
        html += '</div>';

        // search bar for day/agenda
        if (CAL41.view === 'day' || CAL41.view === 'agenda') {
            var q = (CAL41.view === 'day') ? (CAL41.daySearch || '') : (CAL41.agendaSearch || '');
            html += '<div style="display:flex;gap:8px;padding:10px 14px;background:#f8fafd;border-bottom:1px solid var(--border);flex-wrap:wrap;align-items:center">';
            html += '<input type="text" id="calg-search-input" placeholder="🔍 جستجو..." value="' + escS(q) + '" '
                 +  'style="flex:1;min-width:180px;padding:9px 14px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-size:0.85rem;outline:none">';
            if (q) {
                html += '<button type="button" id="calg-clear-search" '
                     +  'style="background:#fee2e2;color:#dc2626;border:none;border-radius:10px;padding:9px 14px;font-family:inherit;font-size:0.8rem;font-weight:800;cursor:pointer">✕</button>';
            }
            if (CAL41.view === 'agenda') {
                var ar = CAL41.agendaRange || 'all';
                html += '<select id="calg-range-select" style="padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-size:0.82rem;background:#fff;cursor:pointer;font-weight:700">'
                     +  '<option value="all"'   + (ar === 'all'   ? ' selected' : '') + '>همه تاریخ‌ها</option>'
                     +  '<option value="30"'    + (ar === '30'    ? ' selected' : '') + '>۳۰ روز آینده</option>'
                     +  '<option value="90"'    + (ar === '90'    ? ' selected' : '') + '>۳ ماه آینده</option>'
                     +  '<option value="365"'   + (ar === '365'   ? ' selected' : '') + '>۱ سال آینده</option>'
                     +  '<option value="1095"'  + (ar === '1095'  ? ' selected' : '') + '>۳ سال آینده</option>'
                     +  '<option value="3650"'  + (ar === '3650'  ? ' selected' : '') + '>۱۰ سال آینده</option>'
                     +  '</select>';
            }
            html += '</div>';
        }

        // body
        html += '<div class="calg-body" id="calg-body">';
        if (CAL41.view === 'month') {
            html += (typeof calRenderMonth41 === 'function') ? calRenderMonth41(active) : '';
        } else if (CAL41.view === 'week') {
            html += (typeof calRenderMultiDay41 === 'function') ? calRenderMultiDay41(active, 7, 'week') : '';
        } else if (CAL41.view === '3day') {
            html += (typeof calRenderMultiDay41 === 'function') ? calRenderMultiDay41(active, 3, '3day') : '';
        } else if (CAL41.view === 'day') {
            html += renderDayView(active);
        } else {
            html += renderAgendaView(active);
        }
        html += '</div>';

        // legend
        var cats = window.CAL_CATS || {};
        html += '<div class="calg-legend">';
        Object.keys(cats).forEach(function (k) {
            if (k === 'external') return;
            var c = cats[k];
            var checked = CAL41.filterCats[k] !== false ? 'checked' : '';
            html += '<label><input type="checkbox" data-cat="' + k + '" ' + checked + '>'
                 +  '<span class="lg-dot" style="background:' + c.color + '"></span>'
                 +  c.icon + ' ' + c.label + '</label>';
        });
        html += '</div>';

        html += '</div>';
        page.innerHTML = html;

        bindShellEvents(active);
        if (CAL41.view === 'day') setupDayTimeline(active);
    };

    /* ============================================================
       اتصال رویدادهای shell
       ============================================================ */
    function bindShellEvents(active) {
        function nav(dir) {
            if (typeof navigateCal41 === 'function') navigateCal41(dir);
            else {
                var cur = CAL41.cursor;
                if (CAL41.view === 'month' || CAL41.view === 'agenda') {
                    cur.m += dir;
                    if (cur.m < 1) { cur.m = 12; cur.y--; }
                    if (cur.m > 12) { cur.m = 1; cur.y++; }
                } else {
                    var n = CAL41.view === 'week' ? 7 : (CAL41.view === '3day' ? 3 : 1);
                    var ds = cur.y + '/' + p2(cur.m) + '/' + p2(cur.d);
                    var nd = addJalaliDays(ds, dir * n);
                    var pp = nd.split('/').map(Number);
                    CAL41.cursor = { y: pp[0], m: pp[1], d: pp[2] };
                }
                window.calRender();
            }
        }

        var pv = document.getElementById('calg-prev'); if (pv) pv.onclick = function () { nav(-1); };
        var nx = document.getElementById('calg-next'); if (nx) nx.onclick = function () { nav(1); };
        var td = document.getElementById('calg-today'); if (td) td.onclick = function () {
            var t = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
            CAL41.cursor = { y: t[0], m: t[1], d: t[2] };
            window.calRender();
        };
        var nw = document.getElementById('calg-new'); if (nw) nw.onclick = function () {
            var ds = CAL41.cursor.y + '/' + p2(CAL41.cursor.m) + '/' + p2(CAL41.cursor.d);
            if (typeof window.openEventModal41 === 'function') window.openEventModal41(null, ds);
        };
        var cm = document.getElementById('calg-cat-mgr'); if (cm && window.openCategoriesManager) cm.onclick = window.openCategoriesManager;

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

        // search
        var si = document.getElementById('calg-search-input');
        if (si) {
            var focusRestore = false, selPos = 0;
            si.addEventListener('input', function () {
                if (CAL41.view === 'day') CAL41.daySearch = this.value;
                else if (CAL41.view === 'agenda') CAL41.agendaSearch = this.value;
                focusRestore = true;
                selPos = this.selectionStart;
                window.calRender();
            });
            if (focusRestore) {
                // درخواست focus مجدد — در calRender بعدی از این استفاده می‌شود
            }
        }
        var cs = document.getElementById('calg-clear-search');
        if (cs) cs.onclick = function () {
            if (CAL41.view === 'day') CAL41.daySearch = '';
            else CAL41.agendaSearch = '';
            window.calRender();
        };
        var rs = document.getElementById('calg-range-select');
        if (rs) rs.onchange = function () {
            CAL41.agendaRange = this.value;
            window.calRender();
        };

        // share day
        var shd = document.getElementById('calg-share-day');
        if (shd && typeof shareDayEvents41 === 'function') shd.onclick = shareDayEvents41;
        var adh = document.getElementById('calg-add-here');
        if (adh) adh.onclick = function () {
            var ds = CAL41.cursor.y + '/' + p2(CAL41.cursor.m) + '/' + p2(CAL41.cursor.d);
            if (typeof window.openEventModal41 === 'function') window.openEventModal41(null, ds);
        };

        // date strip
        document.querySelectorAll('.cal-day-chip').forEach(function (ch) {
            var d = ch.getAttribute('data-date');
            var navStrip = ch.getAttribute('data-nav-strip');
            if (navStrip) {
                ch.onclick = function () {
                    var cur = CAL41.cursor;
                    var ds = cur.y + '/' + p2(cur.m) + '/' + p2(cur.d);
                    var nd = addJalaliDays(ds, Number(navStrip) * 7);
                    var pp = nd.split('/').map(Number);
                    CAL41.cursor = { y: pp[0], m: pp[1], d: pp[2] };
                    window.calRender();
                };
            } else if (d) {
                ch.onclick = function () {
                    var pp = d.split('/').map(Number);
                    CAL41.cursor = { y: pp[0], m: pp[1], d: pp[2] };
                    window.calRender();
                };
            }
        });

        // سایر نماها (ماه، هفته، ۳ روز) — کلیلک روی رویداد توسط پچ ۱۹ مدیریت می‌شود
        document.querySelectorAll('.calg-mcell').forEach(function (c) {
            c.onclick = function (e) {
                if (e.target.closest('.cev')) return;
                if (typeof window.openEventModal41 === 'function') window.openEventModal41(null, this.getAttribute('data-date'));
            };
        });
        document.querySelectorAll('.calg-md-col').forEach(function (c) {
            c.onclick = function (e) {
                if (e.target.closest('[data-ev]')) return;
                if (typeof window.openEventModal41 === 'function') window.openEventModal41(null, this.getAttribute('data-date'));
            };
        });
        document.querySelectorAll('.calg-md-hour-cell').forEach(function (c) {
            c.onclick = function (e) {
                if (e.target.closest('.calg-md-hour-ev')) return;
                if (typeof window.openEventModal41 === 'function') window.openEventModal41(null, this.getAttribute('data-date'), +this.getAttribute('data-hour'));
            };
        });
        document.querySelectorAll('.calg-hour-cell').forEach(function (c) {
            c.onclick = function (e) {
                if (e.target.closest('.calg-day-ev')) return;
                if (typeof window.openEventModal41 === 'function') window.openEventModal41(null, this.getAttribute('data-date'), +this.getAttribute('data-hour'));
            };
        });
    }

    /* ============================================================
       Drag & Drop روی تایم‌لاین
       ============================================================ */
    function setupDayTimeline(active) {
        var body = document.querySelector('.cal-tl-body');
        if (!body) return;
        if (body.dataset.dragReady === '1') return;
        body.dataset.dragReady = '1';

        var currentDay = body.getAttribute('data-day');
        var dragState = null;
        var pressTimer = null;

        /* ---- Long-press روی رویداد ---- */
        body.addEventListener('pointerdown', function (e) {
            if (e.button !== undefined && e.button !== 0) return;
            var evEl = e.target.closest('.cal-tl-event');
            if (!evEl) return;

            var evId = evEl.getAttribute('data-ev');
            if (!evId) return;
            var allEvs = window.calBuildAllEvents();
            var ev = allEvs.find(function (x) { return x.id === evId; });
            if (!ev) return;
            if (ev.readonly) return; // اجازه‌ی درگ فقط برای رویدادهای کاربری

            var startX = e.clientX, startY = e.clientY;
            var cancelled = false;
            var evRect = evEl.getBoundingClientRect();
            var offsetY = e.clientY - evRect.top;

            pressTimer = setTimeout(function () {
                if (cancelled) return;
                activateDrag(e, evEl, ev, offsetY, evRect);
            }, 320);

            function onFirstMove(me) {
                if (Math.abs(me.clientX - startX) > 8 || Math.abs(me.clientY - startY) > 8) {
                    if (!dragState) {
                        cancelled = true;
                        clearTimeout(pressTimer);
                        pressTimer = null;
                    }
                }
            }
            function cleanup() {
                document.removeEventListener('pointermove', onFirstMove);
                document.removeEventListener('pointerup', cleanup);
                document.removeEventListener('pointercancel', cleanup);
            }
            document.addEventListener('pointermove', onFirstMove, { passive: true });
            document.addEventListener('pointerup', cleanup);
            document.addEventListener('pointercancel', cleanup);
        });

        function activateDrag(initialEvent, evEl, ev, offsetY, evRect) {
            // هپتیک
            if (navigator.vibrate) { try { navigator.vibrate(18); } catch (er) {} }

            evEl.classList.add('dragging');
            var preview = document.getElementById('cal-tl-preview');
            if (preview) preview.classList.add('show');
            var strip = document.getElementById('cal-day-strip');
            if (strip) strip.classList.add('pinned');
            document.body.style.overflow = 'hidden';

            var sMin = Number(evEl.getAttribute('data-start-min'));
            var eMin = Number(evEl.getAttribute('data-end-min'));
            if (!eMin || eMin <= sMin) eMin = sMin + 60;

            dragState = {
                evId: ev.id,
                evRaw: ev,
                startMin: sMin,
                endMin: eMin,
                duration: eMin - sMin,
                offsetY: offsetY,
                targetDay: currentDay,
                targetStartMin: sMin,
                initialEvent: initialEvent
            };

            // pointer capture
            try { evEl.setPointerCapture(initialEvent.pointerId); } catch (er) {}

            // handlers
            function onMove(me) {
                me.preventDefault();
                updateDrag(me);
            }
            function onUp(me) {
                document.removeEventListener('pointermove', onMove);
                document.removeEventListener('pointerup', onUp);
                document.removeEventListener('pointercancel', onUp);
                finalizeDrag();
            }
            document.addEventListener('pointermove', onMove, { passive: false });
            document.addEventListener('pointerup', onUp);
            document.addEventListener('pointercancel', onUp);
        }

        function updateDrag(me) {
            if (!dragState) return;
            var bodyRect = body.getBoundingClientRect();
            var relY = me.clientY - bodyRect.top - dragState.offsetY;

            // snap به ۱۵ دقیقه
            var totalMin = relY / HOUR_HEIGHT * 60;
            var snappedMin = Math.round(totalMin / MIN_SNAP) * MIN_SNAP;
            var newStart = START_HOUR * 60 + snappedMin;

            // clamp
            newStart = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60 - dragState.duration, newStart));
            dragState.targetStartMin = newStart;

            // preview
            var preview = document.getElementById('cal-tl-preview');
            if (preview) {
                var top = (newStart - START_HOUR * 60) / 60 * HOUR_HEIGHT;
                var h = dragState.duration / 60 * HOUR_HEIGHT;
                preview.style.top = top + 'px';
                preview.style.height = h + 'px';
                preview.style.left = '6px';
                preview.style.right = '6px';
                var endMin = newStart + dragState.duration;
                preview.querySelector('.pv-time').textContent =
                    toTime(newStart) + ' — ' + toTime(endMin);
            }

            // check date chips
            var chips = document.querySelectorAll('.cal-day-chip');
            var found = null;
            chips.forEach(function (ch) {
                var r = ch.getBoundingClientRect();
                if (me.clientX >= r.left && me.clientX <= r.right &&
                    me.clientY >= r.top - 4 && me.clientY <= r.bottom + 4) {
                    var d = ch.getAttribute('data-date');
                    if (d) {
                        found = d;
                        ch.classList.add('drag-over');
                    }
                } else {
                    ch.classList.remove('drag-over');
                }
            });
            if (found) dragState.targetDay = found;
        }

        function finalizeDrag() {
            var evEl = document.querySelector('.cal-tl-event.dragging');
            if (evEl) evEl.classList.remove('dragging');
            var preview = document.getElementById('cal-tl-preview');
            if (preview) preview.classList.remove('show');
            var strip = document.getElementById('cal-day-strip');
            if (strip) strip.classList.remove('pinned');
            document.body.style.overflow = '';
            document.querySelectorAll('.cal-day-chip').forEach(function (c) { c.classList.remove('drag-over'); });

            if (!dragState) return;
            var st = dragState;
            dragState = null;

            var newStart = st.targetStartMin;
            var newEnd = newStart + st.duration;
            var targetDay = st.targetDay;

            if (st.startMin === newStart && targetDay === currentDay) {
                // بدون تغییر
                return;
            }

            var rawEv = st.evRaw;
            var masterId = rawEv.rawId || rawEv.id;
            var list = DB.load('calendarUserEvents', []);
            var master = list.find(function (x) { return x.id === masterId; });
            if (!master) return;

            var isRecurring = master.recurrence &&
                              master.recurrence.freq &&
                              master.recurrence.freq !== 'none';

            if (!isRecurring) {
                // جابجایی ساده
                moveMaster(master, list, targetDay, newStart, newEnd);
                return;
            }

            // اگر تکرارشونده بود → دامنه بپرس
            showScopeDialog(master, rawEv.date, rawEv.time, function (scope) {
                var reloaded = DB.load('calendarUserEvents', []);
                var m2 = reloaded.find(function (x) { return x.id === masterId; });
                if (!m2) return;

                if (scope === 'all') {
                    // جابجایی کل زنجیره
                    var dayDiff = jalaliDiff(
                        rawEv.date.split('/').map(Number)[0],
                        rawEv.date.split('/').map(Number)[1],
                        rawEv.date.split('/').map(Number)[2],
                        targetDay.split('/').map(Number)[0],
                        targetDay.split('/').map(Number)[1],
                        targetDay.split('/').map(Number)[2]
                    );
                    m2.startDate = addJalaliDays(m2.startDate, dayDiff);
                    m2.endDate = addJalaliDays(m2.endDate || m2.startDate, dayDiff);
                    m2.startTime = toTime(newStart);
                    m2.endTime = toTime(newEnd);
                    m2.date = m2.startDate;
                    m2.time = m2.startTime;
                    // پاک کردن استثناها چون همه جابجا شدند
                    var ov = DB.load('calendarRecOverrides', {});
                    delete ov[masterId];
                    DB.save('calendarRecOverrides', ov);
                    DB.save('calendarUserEvents', reloaded);
                    afterMove('همه رخدادها');
                } else if (scope === 'future') {
                    // split
                    var dayBefore = addJalaliDays(rawEv.date, -1);
                    if (!m2.recurrence) m2.recurrence = {};
                    var oldStart = m2.startDate || m2.date;
                    if (dayBefore < oldStart) {
                        // کل master حذف و فقط یه رویداد جدید بساز
                        reloaded = reloaded.filter(function (x) { return x.id !== masterId; });
                    } else {
                        m2.recurrence.ends = 'on';
                        m2.recurrence.until = dayBefore;
                    }
                    // رویداد جدید از این رخداد به بعد
                    var newMaster = JSON.parse(JSON.stringify(m2));
                    newMaster.id = 'u_' + uid();
                    newMaster.startDate = targetDay;
                    newMaster.date = targetDay;
                    newMaster.startTime = toTime(newStart);
                    newMaster.time = toTime(newStart);
                    newMaster.endDate = targetDay;
                    newMaster.endTime = toTime(newEnd);
                    newMaster.recurrence = JSON.parse(JSON.stringify(m2.recurrence || {}));
                    newMaster.recurrence.ends = 'never';
                    newMaster.recurrence.until = '';
                    delete newMaster.recurrence.exdates;
                    reloaded.push(newMaster);
                    DB.save('calendarUserEvents', reloaded);
                    afterMove('این و بعدی');
                } else {
                    // this → exception
                    var ovs = DB.load('calendarRecOverrides', {});
                    if (!ovs[masterId]) ovs[masterId] = {};
                    // حذف این رخداد از زنجیره
                    ovs[masterId][rawEv.date] = { deleted: true };
                    DB.save('calendarRecOverrides', ovs);
                    // ساخت یک رخداد one-off در تاریخ جدید
                    var oneOff = {
                        id: 'u_' + uid(),
                        cat: master.cat,
                        startDate: targetDay,
                        date: targetDay,
                        startTime: toTime(newStart),
                        time: toTime(newStart),
                        endDate: targetDay,
                        endTime: toTime(newEnd),
                        title: master.title,
                        desc: master.desc || '',
                        location: master.location || '',
                        persons: (master.persons || []).slice(),
                        reminder: master.reminder || 0,
                        recurrence: { freq: 'none' },
                        createdAt: Date.now()
                    };
                    reloaded.push(oneOff);
                    DB.save('calendarUserEvents', reloaded);
                    afterMove('فقط این رخداد');
                }
            });
        }

        function moveMaster(master, list, targetDay, newStart, newEnd) {
            var dayDiff = jalaliDiff(
                master.startDate.split('/').map(Number)[0],
                master.startDate.split('/').map(Number)[1],
                master.startDate.split('/').map(Number)[2],
                targetDay.split('/').map(Number)[0],
                targetDay.split('/').map(Number)[1],
                targetDay.split('/').map(Number)[2]
            );
            master.startDate = targetDay;
            master.date = targetDay;
            master.startTime = toTime(newStart);
            master.time = toTime(newStart);
            if (master.endDate) master.endDate = addJalaliDays(master.endDate, dayDiff);
            master.endTime = toTime(newEnd);
            DB.save('calendarUserEvents', list);
            afterMove('');
        }

        function afterMove(label) {
            window.calRender();
            if (typeof updateHomeWidgets === 'function') {
                try { updateHomeWidgets(); } catch (e) {}
            }
            if (typeof showToast === 'function') {
                showToast('📅 رویداد جابجا شد' + (label ? ' (' + label + ')' : ''));
            }
        }

        /* ---- کلیک روی ناحیه خالی → ساخت رویداد جدید ---- */
        body.addEventListener('click', function (e) {
            if (e.target.closest('.cal-tl-event')) return;
            if (e.target.closest('.cal-tl-preview')) return;
            if (dragState) return;
            var rect = body.getBoundingClientRect();
            var y = e.clientY - rect.top;
            var totalMin = START_HOUR * 60 + (y / HOUR_HEIGHT) * 60;
            var snapped = Math.round(totalMin / MIN_SNAP) * MIN_SNAP;
            snapped = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60 - 60, snapped));
            var hh = Math.floor(snapped / 60);
            var mm = snapped % 60;
            var ds = body.getAttribute('data-day');
            if (typeof window.openEventModal41 === 'function') {
                window.openEventModal41(null, ds, hh);
                setTimeout(function () {
                    var ti = document.getElementById('evt-start-time');
                    if (ti) ti.value = p2(hh) + ':' + p2(mm);
                    var to = document.getElementById('evt-end-time');
                    if (to) to.value = p2(hh + 1) + ':' + p2(mm);
                }, 80);
            }
        });
    }

    /* ============================================================
       رفع لایوت بخش «پایان تکرار»
       ============================================================ */
    function fixRecEndsLayout() {
        var box = document.getElementById('evt-recurrence-box');
        if (!box) return;
        if (box.dataset.endsFixed === '1') return;

        var radios = box.querySelectorAll('input[name="rec-ends"]');
        if (radios.length < 3) return;

        var untilInp = box.querySelector('#rec-until');
        var countInp = box.querySelector('#rec-count');
        var untilVal = untilInp ? untilInp.value : '';
        var countVal = countInp ? countInp.value : '10';
        var currentVal = (box.querySelector('input[name="rec-ends"]:checked') || {}).value || 'never';

        // پیدا کردن والد بخش ends
        var endsWrap = null;
        var lbl = null;
        radios.forEach(function (r) {
            var p = r.parentElement;
            if (!p) return;
            while (p && p !== box) {
                if (p.textContent && p.textContent.indexOf('پایان') !== -1 && p.children.length >= 3) {
                    endsWrap = p;
                    break;
                }
                p = p.parentElement;
            }
        });
        if (!endsWrap) {
            // بر اساس رادیوها
            var firstRadio = radios[0];
            var par = firstRadio.parentElement;
            while (par && par !== box) {
                if (par.querySelectorAll('input[name="rec-ends"]').length === 3) {
                    endsWrap = par;
                    break;
                }
                par = par.parentElement;
            }
        }
        if (!endsWrap) return;

        endsWrap.innerHTML =
            '<div style="font-size:.78rem;font-weight:900;color:var(--text-muted);margin-bottom:8px">پایان</div>' +
            '<label class="rec-ends-row ' + (currentVal === 'never' ? 'checked' : '') + '">' +
                '<input type="radio" name="rec-ends" value="never" ' + (currentVal === 'never' ? 'checked' : '') + '>' +
                '<span class="rec-lbl">هرگز</span>' +
                '<div class="rec-input-wrap"></div>' +
            '</label>' +
            '<label class="rec-ends-row ' + (currentVal === 'on' ? 'checked' : '') + '">' +
                '<input type="radio" name="rec-ends" value="on" ' + (currentVal === 'on' ? 'checked' : '') + '>' +
                '<span class="rec-lbl">در تاریخ</span>' +
                '<div class="rec-input-wrap">' +
                    '<input type="text" id="rec-until" class="date-picker" dir="ltr" value="' + escS(untilVal) + '" placeholder="YYYY/MM/DD">' +
                '</div>' +
            '</label>' +
            '<label class="rec-ends-row ' + (currentVal === 'after' ? 'checked' : '') + '">' +
                '<input type="radio" name="rec-ends" value="after" ' + (currentVal === 'after' ? 'checked' : '') + '>' +
                '<span class="rec-lbl">بعد از</span>' +
                '<div class="rec-input-wrap">' +
                    '<input type="number" id="rec-count" min="1" max="999" value="' + escS(countVal) + '">' +
                    '<span class="rec-unit">تکرار</span>' +
                '</div>' +
            '</label>';

        endsWrap.querySelectorAll('input[name="rec-ends"]').forEach(function (r) {
            r.onchange = function () {
                endsWrap.querySelectorAll('.rec-ends-row').forEach(function (row) {
                    var inp = row.querySelector('input[type=radio]');
                    row.classList.toggle('checked', inp && inp.checked);
                });
                updateState();
            };
        });

        function updateState() {
            var v = endsWrap.querySelector('input[name="rec-ends"]:checked');
            var val = v ? v.value : 'never';
            var u = endsWrap.querySelector('#rec-until');
            var c = endsWrap.querySelector('#rec-count');
            if (u) u.disabled = (val !== 'on');
            if (c) c.disabled = (val !== 'after');
        }
        updateState();

        box.dataset.endsFixed = '1';

        setTimeout(function () {
            if (typeof attachDatePickers === 'function') attachDatePickers();
        }, 60);
    }

    // MutationObserver برای دیدن مودال رویداد
    var _mo = null;
    function startModalObserver() {
        if (_mo) return;
        _mo = new MutationObserver(function (muts) {
            var hit = false;
            muts.forEach(function (m) {
                if (!m.addedNodes) return;
                for (var i = 0; i < m.addedNodes.length; i++) {
                    var n = m.addedNodes[i];
                    if (n.nodeType !== 1) continue;
                    if (n.id === 'evt-recurrence-box' || (n.querySelector && n.querySelector('#evt-recurrence-box'))) {
                        hit = true; break;
                    }
                }
            });
            if (hit) setTimeout(fixRecEndsLayout, 90);
        });
        _mo.observe(document.body, { childList: true, subtree: true });
    }

    /* ============================================================
       Override openEventModal41 تا بعد از باز شدن، fix اجرا شود
       ============================================================ */
    (function wrapOpenModal() {
        if (typeof window.openEventModal41 !== 'function') {
            setTimeout(wrapOpenModal, 800);
            return;
        }
        if (window.openEventModal41._wrapped20) return;
        var orig = window.openEventModal41;
        var wrapped = function () {
            var res = orig.apply(this, arguments);
            setTimeout(fixRecEndsLayout, 120);
            setTimeout(fixRecEndsLayout, 350);
            return res;
        };
        wrapped._wrapped20 = true;
        window.openEventModal41 = wrapped;
    })();

    /* ============================================================
       Boot
       ============================================================ */
    function boot() {
        injectCss();
        startModalObserver();
        // اگر کاربر روی تقویم است، رندر مجدد
        var page = document.getElementById('page-jalali-calendar');
        if (page && page.classList.contains('active')) {
            setTimeout(function () { if (typeof window.calRender === 'function') window.calRender(); }, 300);
        }
        console.log('✅ [Calendar Patch v20] تایم‌لاین حرفه‌ای + Long-Press Drag نصب شد');
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 2200); });
    } else {
        setTimeout(boot, 2200);
    }
    setTimeout(boot, 4200);

})();
