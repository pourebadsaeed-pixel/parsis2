/* ============================================================
   پارسیس — تقویم شمسی (بخش ۱: core + helpers + event building)
   مسیر: js/modules/calendar.js
   وابستگی: core/* + ui/* + reports/*
   ============================================================ */
'use strict';

/* ============================================================
   بخش ۱ — CSS پایه تقویم
   ============================================================ */
(function injectCalBaseCss() {
    if (document.getElementById('calg-style')) return;
    var s = document.createElement('style');
    s.id = 'calg-style';
    s.textContent = ''
    + '.calg-wrap { background:var(--card-solid); border-radius:16px; border:1px solid var(--border); overflow:hidden }'
    + '.calg-bar { display:flex; align-items:center; gap:8px; padding:12px 16px; border-bottom:1px solid var(--border); background:linear-gradient(180deg,#f4f8fd,#fff); flex-wrap:wrap }'
    + '.calg-bar h3 { margin:0; flex:1; font-size:1rem; font-weight:900; color:#1e40af }'
    + '.calg-btn { padding:7px 14px; border-radius:10px; border:1px solid var(--border); background:#fff; font-family:inherit; font-size:.8rem; font-weight:800; color:#1e40af; cursor:pointer; transition:all .2s }'
    + '.calg-btn:hover { background:#e0ecf8 }'
    + '.calg-btn.primary { background:linear-gradient(135deg,#1e40af,#3b82f6); color:#fff; border:none }'
    + '.calg-tabs { display:flex; gap:4px; padding:8px 16px; background:#f8fafd; border-bottom:1px solid var(--border); flex-wrap:wrap }'
    + '.calg-tab { padding:6px 14px; border-radius:8px; font-size:.78rem; font-weight:800; color:var(--text-muted); background:transparent; border:none; cursor:pointer; font-family:inherit; transition:all .2s }'
    + '.calg-tab.active { background:#1e40af; color:#fff }'
    + '.calg-body { padding:14px }'
    + '.calg-mhead { display:grid; grid-template-columns:repeat(7,1fr); gap:5px; margin-bottom:6px }'
    + '.calg-mhead > div { text-align:center; font-weight:900; font-size:.76rem; padding:7px 4px; background:#eef4fb; border-radius:8px; color:#1e40af }'
    + '.calg-mhead > div:last-child { color:#dc2626 }'
    + '.calg-mgrid { display:grid; grid-template-columns:repeat(7,1fr); gap:5px }'
    + '.calg-mcell { background:#fbfdff; border:1.5px solid #e0ecf8; border-radius:10px; min-height:92px; padding:6px; display:flex; flex-direction:column; cursor:pointer; transition:all .15s; overflow:hidden }'
    + '.calg-mcell:hover { border-color:#3b82f6; transform:translateY(-2px) }'
    + '.calg-mcell.other { opacity:.35 }'
    + '.calg-mcell.today { background:linear-gradient(135deg,#dbeafe,#eff6ff); border-color:#3b82f6; box-shadow:0 0 0 2px rgba(59,130,246,.2) }'
    + '.calg-mcell.fri { background:linear-gradient(135deg,#fee2e2,#fff5f5) }'
    + '.calg-mcell .cd { display:flex; flex-direction:column; align-items:flex-start; gap:1px; margin-bottom:4px; padding-bottom:3px; border-bottom:1px dashed var(--border) }'
    + '.calg-mcell .cd .cjd { font-weight:900; font-size:.82rem; color:#1e40af; line-height:1.15 }'
    + '.calg-mcell .cd .cwday { font-size:.62rem; color:#64748b; font-weight:700; line-height:1 }'
    + '.calg-mcell .cd .cgd { font-size:.6rem; color:#94a3b8; font-weight:700; direction:ltr; line-height:1 }'
    + '.calg-mcell .cev { display:flex; align-items:center; gap:4px; font-size:.68rem; overflow:hidden; margin-bottom:2px; padding:2px 4px; border-radius:5px; background:rgba(99,102,241,0.06) }'
    + '.calg-mcell .cev .cdot { width:7px; height:7px; border-radius:2px; flex-shrink:0 }'
    + '.calg-mcell .cev .ctime { font-size:.6rem; color:#6366f1; font-weight:800; direction:ltr; flex-shrink:0; font-family:monospace }'
    + '.calg-mcell .cev .ctxt { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1 }'
    + '.calg-mcell .cmore { font-size:.6rem; color:#94a3b8; font-weight:800 }'
    + '.calg-md-head { padding:8px 4px; text-align:center; background:#eef4fb; border-radius:10px; border:1px solid #dbe7f6 }'
    + '.calg-md-head.today { background:linear-gradient(135deg,#dbeafe,#bfdbfe); border-color:#3b82f6 }'
    + '.calg-md-head .mh-wd { font-size:.7rem; color:#64748b; font-weight:800 }'
    + '.calg-md-head .mh-jd { font-size:.9rem; font-weight:900; color:#1e40af; margin-top:2px }'
    + '.calg-md-head.today .mh-jd { color:#1e3a8a }'
    + '.calg-md-head .mh-gd { font-size:.62rem; color:#94a3b8; direction:ltr; margin-top:1px }'
    + '.calg-md-ev:hover { filter:brightness(0.97); transform:translateX(-2px) }'
    + '.calg-md-col::-webkit-scrollbar { width:5px }'
    + '.calg-md-col::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:3px }'
    + '.calg-md-hour-cell { min-height:52px; padding:5px 6px; border-bottom:1px solid var(--border); border-left:1px solid var(--border); cursor:pointer; transition:background .15s }'
    + '.calg-md-hour-cell:hover { background:#f0f6ff }'
    + '.calg-md-hour-label { padding:8px 6px; text-align:center; font-weight:900; font-size:.78rem; background:var(--card-alt); border-bottom:1px solid var(--border); direction:ltr; color:var(--primary-dark); font-family:monospace; border-left:1px solid var(--border) }'
    + '.calg-md-hour-ev { background:#dbeafe15; border-right:3px solid #3b82f6; padding:5px 7px; border-radius:7px; margin-bottom:3px; cursor:pointer; font-size:.72rem; font-weight:700 }'
    + '.calg-empty { text-align:center; padding:30px; color:#94a3b8 }'
    + '.calg-agev:hover { background:#e0ecf8 !important }'
    + '.calg-legend { display:flex; gap:10px; flex-wrap:wrap; padding:10px 14px; background:#fafcff; border-top:1px solid var(--border); font-size:.74rem; font-weight:700 }'
    + '.calg-legend label { display:flex; align-items:center; gap:5px; cursor:pointer }'
    + '.calg-legend .lg-dot { width:10px; height:10px; border-radius:3px }'
    + '.calg-tl-wrap{position:relative;display:grid;grid-template-columns:74px 1fr;border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--card-solid);direction:rtl}'
    + '.calg-tl-hours{background:linear-gradient(180deg,#f9fbfe,#f4f8fd);border-left:1px solid var(--border)}'
    + '.calg-tl-hour-lbl{height:64px;display:flex;align-items:flex-start;justify-content:center;padding-top:5px;font-size:0.72rem;font-weight:900;font-family:monospace;color:var(--primary-dark);direction:ltr;border-bottom:1px solid var(--border);position:relative}'
    + '.calg-tl-body{position:relative;background:#fff;touch-action:pan-y}'
    + '.calg-tl-gridline{position:absolute;left:0;right:0;height:0;border-bottom:1px solid var(--border);pointer-events:none;z-index:0}'
    + '.calg-tl-gridline.minor{border-bottom:1px dashed rgba(15,23,42,0.06)}'
    + '.calg-tl-event{position:absolute;border-radius:10px;padding:5px 9px;font-size:0.78rem;font-weight:700;overflow:hidden;cursor:grab;transition:box-shadow .18s;z-index:3;border-right-width:4px;border-right-style:solid;box-shadow:0 1px 3px rgba(15,23,42,0.08);touch-action:pan-y;user-select:none}'
    + '.calg-tl-event:active{cursor:grabbing}'
    + '.calg-tl-event.dragging{position:fixed!important;z-index:99999!important;box-shadow:0 22px 55px rgba(15,23,42,0.55),0 0 0 2px rgba(59,130,246,0.85)!important;opacity:.96!important;cursor:grabbing!important;transition:none!important;transform:none!important;pointer-events:none!important}'
    + '.calg-tl-event .ev-time{font-size:.68rem;font-family:monospace;color:#1e40af;font-weight:800;direction:ltr;margin-bottom:3px;white-space:nowrap}'
    + '.calg-tl-event .ev-title{font-weight:800;font-size:.82rem;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
    + '.calg-tl-event .ev-loc{font-size:.68rem;color:#64748b;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
    + '.calg-tl-event.compact{display:flex!important;align-items:center!important;gap:7px!important;padding:4px 9px!important}'
    + '.calg-tl-event.compact .ev-time{margin-bottom:0!important;font-size:0.6rem!important;padding:2px 6px;background:rgba(30,64,175,0.12);border-radius:5px}'
    + '.calg-tl-event.compact .ev-title{flex:1;font-size:0.78rem!important}'
    + '.calg-tl-event.compact .ev-loc{display:none!important}'
    + '.calg-tl-event.tiny{display:flex!important;align-items:center!important;padding:2px 8px!important;gap:5px!important}'
    + '.calg-tl-event.tiny .ev-time{font-size:0.58rem!important;padding:1px 5px;background:rgba(30,64,175,0.1);border-radius:4px;margin-bottom:0!important}'
    + '.calg-tl-event.tiny .ev-title{flex:1;font-size:0.72rem!important}'
    + '.calg-tl-event.tiny .ev-loc{display:none!important}'
    + '.calg-tl-event.micro{display:flex!important;align-items:center!important;padding:0 7px!important}'
    + '.calg-tl-event.micro .ev-time{display:none!important}'
    + '.calg-tl-event.micro .ev-title{flex:1;font-size:0.7rem!important}'
    + '.calg-tl-event.micro .ev-loc{display:none!important}'
    + '.cal-day-strip{display:flex;gap:5px;padding:8px;background:#f8fafd;border-radius:12px;border:1px solid var(--border);margin-bottom:10px;overflow-x:auto;direction:rtl}'
    + '.cal-day-strip.pinned{position:fixed!important;top:0!important;left:0!important;right:0!important;z-index:99998!important;border-radius:0!important;padding:12px 10px!important;background:#fff!important;box-shadow:0 10px 40px rgba(15,23,42,.35)!important;border-bottom:2px solid #1e40af!important}'
    + '.cal-day-chip{flex:0 0 auto;min-width:58px;padding:8px 6px;border-radius:10px;background:#fff;border:1.5px solid var(--border);text-align:center;cursor:pointer;transition:all .2s;font-family:inherit;user-select:none}'
    + '.cal-day-chip:hover{border-color:var(--primary)}'
    + '.cal-day-chip.today{background:linear-gradient(135deg,#dbeafe,#bfdbfe);border-color:#3b82f6}'
    + '.cal-day-chip.active{background:linear-gradient(135deg,#1e40af,#3b82f6);color:#fff;border-color:transparent}'
    + '.cal-day-chip.drag-over{background:linear-gradient(135deg,#a7f3d0,#6ee7b7)!important;border-color:#059669!important;transform:scale(1.12)}'
    + '.cal-day-chip .cdc-wd{font-size:.68rem;font-weight:800;color:#64748b}'
    + '.cal-day-chip.active .cdc-wd{color:rgba(255,255,255,.9)}'
    + '.cal-day-chip.today .cdc-wd{color:#1e40af}'
    + '.cal-day-chip .cdc-d{font-size:.9rem;font-weight:900;color:#1e40af;margin-top:3px}'
    + '.cal-day-chip.active .cdc-d{color:#fff}'
    + '.cal-day-chip .cdc-m{font-size:.6rem;color:#94a3b8;margin-top:1px}'
    + 'body.cal-drag-active{touch-action:none!important;overflow:hidden!important;user-select:none!important}'
    + '@media (max-width:640px) { .calg-mcell { min-height:60px; padding:4px } .calg-mcell .cev { display:none } }';
    document.head.appendChild(s);
})();

/* ============================================================
   بخش ۲ — دسته‌بندی‌های تقویم
   ============================================================ */
var DEF_CATS_41 = [
    { key: 'personal', label: 'شخصی', color: '#8b5cf6', icon: '⭐' },
    { key: 'work',     label: 'کاری', color: '#0ea5e9', icon: '💼' },
    { key: 'birthday', label: 'تولد', color: '#ec4899', icon: '🎂' },
    { key: 'meeting',  label: 'جلسه', color: '#f59e0b', icon: '👥' },
    { key: 'travel',   label: 'سفر',  color: '#10b981', icon: '✈️' }
];

var SYS_CATS_41 = {
    installment: { label: 'قسط',     color: '#dc2626', icon: '💳' },
    source:      { label: 'دریافتنی', color: '#10b981', icon: '📥' },
    external:    { label: 'خارجی',   color: '#64748b', icon: '🌐' }
};

function uCats41() {
    var l = DB.load('cal.userCats', null);
    if (!l || !l.length) {
        DB.save('cal.userCats', DEF_CATS_41);
        return DEF_CATS_41.slice();
    }
    return l;
}

function sUCats41(l) {
    DB.save('cal.userCats', l);
}

function rebuildCalCats41() {
    var c = Object.assign({}, SYS_CATS_41);
    uCats41().forEach(function (u) { c[u.key] = u; });
    try {
        window.CAL_CATS = c;
    } catch (e) {
        window.CAL_CATS_V41 = c;
    }
    return c;
}
rebuildCalCats41();

/* ============================================================
   بخش ۳ — تبدیل ساعت فارسی
   ============================================================ */
window.toFaTime = function (hhmm) {
    if (!hhmm) return '';
    return String(hhmm).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; });
};

window.toEnTime = function (faHHMM) {
    return String(faHHMM || '').replace(/[۰-۹]/g, function (d) {
        return String(d.charCodeAt(0) - 0x06F0);
    });
};

/* ============================================================
   بخش ۴ — state تقویم
   ============================================================ */
var CAL41 = {
    view: 'month',
    cursor: null,
    filterCats: {},
    colWidths: DB.load('cal41.colWidths', {}),
    externalEvents: [],
    daySearch: '',
    agendaSearch: '',
    agendaRange: 'all'
};

window.CAL41 = CAL41;

(function initCursor41() {
    try {
        var t = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
        CAL41.cursor = { y: t[0], m: t[1], d: t[2] };
    } catch (e) {
        CAL41.cursor = { y: 1403, m: 1, d: 1 };
    }
})();

/* ============================================================
   بخش ۵ — توابع کمکی رویداد
   ============================================================ */
function calLoadUserEvents() {
    return DB.load('calendarUserEvents', []);
}

function calSaveUserEvents(l) {
    DB.save('calendarUserEvents', l);
}

function makeOccurrence41(u, date, time) {
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
        date: date,
        time: time,
        startDate: date,
        startTime: time,
        endDate: endD,
        endTime: endT,
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

/* ============================================================
   بخش ۶ — نرمال‌سازی recurrence قدیمی
   ============================================================ */
function normalizeRec41(rec, startDate) {
    if (!rec) return { freq: 'none' };
    if (rec.freq) return rec;
    if (!rec.type || rec.type === 'none') return { freq: 'none' };

    var map = { day: 'daily', week: 'weekly', month: 'monthly', year: 'yearly' };
    var freq = rec.type === 'custom'
        ? (map[rec.customUnit] || 'daily')
        : (map[rec.type] || 'daily');

    var startDay = startDate ? Number(startDate.split('/')[2]) : 1;

    return {
        freq: freq,
        interval: rec.interval || 1,
        weekDays: [],
        monthlyMode: 'day',
        monthlyDay: startDay,
        ends: rec.until ? 'on' : 'never',
        until: rec.until || '',
        count: rec.count || 10,
        exdates: []
    };
}

/* ============================================================
   بخش ۷ — گسترش رویدادهای تکرارشونده
   ============================================================ */
function expandRec41(u) {
    var out = [];
    var start = u.startDate || u.date;
    if (!start) return out;

    var rec = normalizeRec41(u.recurrence, start);

    if (rec.freq === 'none') {
        out.push(makeOccurrence41(u, start, u.startTime || u.time || '21:00'));
        return out;
    }

    var overrides = DB.load('calendarRecOverrides', {});
    var ov = overrides[u.id] || {};
    var ex = {};
    (rec.exdates || []).forEach(function (d) { ex[d] = true; });
    Object.keys(ov).forEach(function (d) {
        if (ov[d] && ov[d].deleted) ex[d] = true;
    });

    var dates = [];
    var today = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    var todayStr = today[0] + '/' + pad2(today[1]) + '/' + pad2(today[2]);
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
            : [0];
        var firstSat = start;
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
            var md = yr + '/' + pad2(mo) + '/' + pad2(dd);
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
            var yd = y2 + '/' + pad2(yp[1]) + '/' + pad2(yp[2]);
            if (yd > horizon) break;
            if (rec.ends === 'on' && rec.until && yd > rec.until) break;
            if (rec.ends === 'after' && dates.length >= rec.count) break;
            if (!ex[yd]) dates.push(yd);
        }
    }

    var time = u.startTime || u.time || '21:00';
    dates.forEach(function (d) {
        out.push(makeOccurrence41(u, d, time));
    });

    /* Exception: تغییر یافته‌ها */
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

/* ============================================================
   بخش ۸ — ساخت کل رویدادها (کش‌شده)
   ============================================================ */
var _calEvCache = null;
var _calEvCacheTs = 0;
var CAL_EV_CACHE_MS = 1200;

function calBuildAllEvents() {
    var now = Date.now();
    if (_calEvCache && (now - _calEvCacheTs) < CAL_EV_CACHE_MS) {
        return _calEvCache;
    }

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
                id: 's_' + s.id,
                cat: 'source',
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
        calLoadUserEvents().forEach(function (u) {
            expandRec41(u).forEach(function (e) { evs.push(e); });
        });
    } catch (e) {}

    if (Array.isArray(CAL41.externalEvents)) {
        CAL41.externalEvents.forEach(function (e) { evs.push(e); });
    }

    _calEvCache = evs;
    _calEvCacheTs = now;
    return evs;
}

function invalidateCalEventCache() {
    _calEvCache = null;
    _calEvCacheTs = 0;
}

/* پچ DB.save برای پاک کردن کش */
(function patchDBSaveForCal() {
    var _origSave = DB.save;
    DB.save = function (k, v) {
        var r = _origSave.apply(this, arguments);
        if (k === 'calendarUserEvents' ||
            k === 'calendarRecOverrides' ||
            k === 'facilities' ||
            k === 'cashFlowSources') {
            invalidateCalEventCache();
        }
        return r;
    };
})();
