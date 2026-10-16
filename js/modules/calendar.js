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
    + '.calg-3day-col{position:relative;background:#fff;cursor:pointer}'
    + '.calg-3day-col:hover{background:#fafcff}'
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
    agendaRange: DB.load('cal41.agendaRange', '365')
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

/* ============================================================
   بخش ۹ — رندر نمای ماه
   ============================================================ */
function calRenderMonth41(events) {
    var y = CAL41.cursor.y, m = CAL41.cursor.m;
    var days = daysInJalaliMonth(y, m);
    var firstG = jalaliToGregorian(y, m, 1);
    var firstDow = (new Date(firstG[0], firstG[1] - 1, firstG[2]).getDay() + 1) % 7;

    var prevM = m - 1, prevY = y, nextM = m + 1, nextY = y;
    if (prevM < 1) { prevM = 12; prevY--; }
    if (nextM > 12) { nextM = 1; nextY++; }

    var prevDays = daysInJalaliMonth(prevY, prevM);
    var today = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());

    var byDate = {};
    events.forEach(function (e) {
        (byDate[e.date] = byDate[e.date] || []).push(e);
    });
    Object.keys(byDate).forEach(function (d) {
        byDate[d].sort(function (a, b) {
            return (a.time || '').localeCompare(b.time || '');
        });
    });

    var EN_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var FA_WD = ['یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنج‌شنبه','جمعه','شنبه'];
    var FA_WD_SHORT = ['ش','ی','د','س','چ','پ','ج'];

    var html = '<div class="calg-mhead">';
    FA_WD_SHORT.forEach(function (x) { html += '<div>' + x + '</div>'; });
    html += '</div><div class="calg-mgrid">';

    var total = 42, dc = 1, ndc = 1;
    for (var i = 0; i < total; i++) {
        var day, cy, cm, other = false;
        if (i < firstDow) {
            day = prevDays - (firstDow - 1 - i);
            cy = prevY; cm = prevM; other = true;
        } else if (dc <= days) {
            day = dc++; cy = y; cm = m;
        } else {
            day = ndc++; cy = nextY; cm = nextM; other = true;
        }

        var ds = cy + '/' + pad2(cm) + '/' + pad2(day);
        var isToday = (cy === today[0] && cm === today[1] && day === today[2]);
        var isFri = (i % 7) === 6;

        var gd = jalaliToGregorian(cy, cm, day);
        var dt = new Date(gd[0], gd[1] - 1, gd[2]);
        var cls = 'calg-mcell' + (other ? ' other' : '') + (isToday ? ' today' : '') + (isFri ? ' fri' : '');

        html += '<div class="' + cls + '" data-date="' + ds + '">';
        html += '<div class="cd">';
        html += '<div class="cjd">' + toFa(day) + ' ' + JALALI_MONTHS[cm - 1] + '</div>';
        html += '<div class="cwday">' + FA_WD[dt.getDay()] + '</div>';
        html += '<div class="cgd">' + dt.getDate() + ' ' + EN_MONTHS[dt.getMonth()] + '</div>';
        html += '</div>';

        var evs = byDate[ds] || [];
        var shown = 0;
        evs.forEach(function (e) {
            if (shown >= 3) return;
            var cat = (window.CAL_CATS && window.CAL_CATS[e.cat]) || { color: '#999' };
            var t = e.time ? toFaTime(e.time) : '';
            html += '<div class="cev">'
                 +  '<span class="cdot" style="background:' + cat.color + '"></span>'
                 +  (t ? '<span class="ctime">' + t + '</span>' : '')
                 +  '<span class="ctxt">' + esc(e.title) + '</span>'
                 +  '</div>';
            shown++;
        });
        if (evs.length > 3) {
            html += '<div class="cmore">+' + toFa(evs.length - 3) + ' مورد</div>';
        }
        html += '</div>';
    }
    html += '</div>';
    return html;
}

/* ============================================================
   بخش ۱۰ — رندر چند-روزه (هفته و ۳ روز)
   ✅ نمای ۳ روز: تایم‌لاین ۳ ستونه کامل (رویدادها absolute)
   ============================================================ */
function calRenderMultiDay41(events, numDays, viewKey) {
    var cur = CAL41.cursor;
    var startJ;

    if (viewKey === 'week') {
        var g0 = jalaliToGregorian(cur.y, cur.m, cur.d);
        var dt0 = new Date(g0[0], g0[1] - 1, g0[2]);
        var offsetFromSat = (dt0.getDay() + 1) % 7;
        startJ = addJalaliDays(cur.y + '/' + pad2(cur.m) + '/' + pad2(cur.d), -offsetFromSat);
    } else {
        startJ = cur.y + '/' + pad2(cur.m) + '/' + pad2(cur.d);
    }
    if (!startJ) return '<div class="calg-empty">تاریخ نامعتبر</div>';

    var byDate = {};
    events.forEach(function (e) {
        (byDate[e.date] = byDate[e.date] || []).push(e);
    });

    var today = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    var todayStr = today[0] + '/' + pad2(today[1]) + '/' + pad2(today[2]);
    var EN_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    /* ============================================================
       نمای ۳ روز آتی: تایم‌لاین ۳ ستونه
       ============================================================ */
    if (viewKey === '3day') {
        var HOUR_H = 64;
        var START_H = 5;
        var END_H = 24;
        var bodyH = (END_H - START_H) * HOUR_H;

        var html3 = '<div style="display:grid;grid-template-columns:74px repeat(' + numDays + ',minmax(0,1fr));border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--card-solid);direction:rtl">';

        /* هدر: خانه خالی + هدر روزها */
        html3 += '<div style="padding:8px 4px;background:var(--card-alt);border-bottom:2px solid var(--border);border-left:1px solid var(--border)"></div>';
        for (var dh = 0; dh < numDays; dh++) {
            var dsH = addJalaliDays(startJ, dh);
            if (!dsH) continue;
            var pH = dsH.split('/').map(Number);
            var gdH = jalaliToGregorian(pH[0], pH[1], pH[2]);
            var dtH = new Date(gdH[0], gdH[1] - 1, gdH[2]);
            var isTodayH = dsH === todayStr;
            var headStyle = isTodayH
                ? 'padding:8px 4px;text-align:center;background:linear-gradient(135deg,#dbeafe,#bfdbfe);border-bottom:2px solid #3b82f6;border-left:1px solid var(--border)'
                : 'padding:8px 4px;text-align:center;background:#eef4fb;border-bottom:2px solid var(--border);border-left:1px solid var(--border)';

            html3 += '<div style="' + headStyle + '" data-date="' + dsH + '">'
                  +   '<div style="font-size:.72rem;font-weight:800;color:' + (isTodayH ? '#1e3a8a' : '#64748b') + '">' + WEEKDAYS_FA[dtH.getDay()] + '</div>'
                  +   '<div style="font-size:.95rem;font-weight:900;color:' + (isTodayH ? '#1e3a8a' : '#1e40af') + ';margin-top:2px">' + toFa(pH[2]) + ' ' + JALALI_MONTHS[pH[1] - 1] + '</div>'
                  +   '<div style="font-size:.62rem;color:#94a3b8;direction:ltr;margin-top:1px">' + dtH.getDate() + ' ' + EN_MONTHS[dtH.getMonth()] + '</div>'
                  + '</div>';
        }

        /* ستون ساعت‌ها */
        html3 += '<div style="background:linear-gradient(180deg,#f9fbfe,#f4f8fd);border-left:1px solid var(--border)">';
        for (var h = START_H; h < END_H; h++) {
            html3 += '<div style="height:' + HOUR_H + 'px;display:flex;align-items:flex-start;justify-content:center;padding-top:5px;font-size:.72rem;font-weight:900;font-family:monospace;color:var(--primary-dark);direction:ltr;border-bottom:1px solid var(--border)">'
                  +   toFaTime(pad2(h) + ':00')
                  + '</div>';
        }
        html3 += '</div>';

        /* ۳ ستون روزها با رویدادهای absolute */
        for (var d = 0; d < numDays; d++) {
            var ds = addJalaliDays(startJ, d);
            if (!ds) continue;

            html3 += '<div class="calg-3day-col" data-day="' + ds + '" '
                  +  'style="position:relative;background:#fff;height:' + bodyH + 'px;border-left:1px solid var(--border)">';

            /* خطوط شبکه */
            for (var hh = START_H; hh <= END_H; hh++) {
                var top = (hh - START_H) * HOUR_H;
                html3 += '<div style="position:absolute;left:0;right:0;top:' + top + 'px;border-bottom:1px solid var(--border);pointer-events:none;z-index:0"></div>';
                if (hh < END_H) {
                    for (var q = 1; q <= 3; q++) {
                        var qtop = top + q * (HOUR_H / 4);
                        html3 += '<div style="position:absolute;left:0;right:0;top:' + qtop + 'px;border-bottom:1px dashed rgba(15,23,42,0.06);pointer-events:none;z-index:0"></div>';
                    }
                }
            }

            /* رویدادهای این روز */
            var dayEvs = (byDate[ds] || []).slice();
            var parsed = [];
            dayEvs.forEach(function (e) {
                var sMin = calTlToMin(e.startTime || e.time || '21:00');
                var eMin = e.endTime ? calTlToMin(e.endTime) : (sMin + 60);
                if (eMin <= sMin) eMin = sMin + 30;
                e._sMin = sMin;
                e._eMin = eMin;
                parsed.push(e);
            });
            var laid = calTlLayoutEvents(parsed);

            laid.forEach(function (e) {
                if (e._sMin >= END_H * 60) return;
                if (e._eMin <= START_H * 60) return;

                var top = (Math.max(e._sMin, START_H * 60) - START_H * 60) / 60 * HOUR_H;
                var bot = (Math.min(e._eMin, END_H * 60) - START_H * 60) / 60 * HOUR_H;
                var height = Math.max(26, bot - top);

                var totalCols = e._colsInGroup || 1;
                var col = e._col || 0;
                var colW = 100 / totalCols;
                var leftPct = col * colW;
                var widthPct = colW;

                var cat = (window.CAL_CATS && window.CAL_CATS[e.cat]) || { color: '#6366f1' };
                var timeTxt = toFaTime(e.startTime || e.time);
                if (e.endTime) timeTxt += ' — ' + toFaTime(e.endTime);

                var shortCls = '';
                if (height < 32) shortCls = ' micro';
                else if (height < 46) shortCls = ' tiny';
                else if (height < 60) shortCls = ' compact';

                html3 += '<div class="calg-tl-event' + shortCls + '" data-ev="' + esc(e.id) + '" '
                      +  'style="position:absolute;top:' + top + 'px;height:' + height + 'px;'
                      +  'left:calc(' + leftPct + '% + 3px);'
                      +  'right:calc(' + (100 - leftPct - widthPct) + '% + 3px);'
                      +  'background:' + cat.color + '15;'
                      +  'border-right-color:' + cat.color + ';'
                      +  'z-index:2" '
                      +  'title="' + esc(e.title) + '">'
                      +  '<div class="ev-time">' + timeTxt + '</div>'
                      +  '<div class="ev-title">' + esc(e.title) + '</div>'
                      +  (e.location ? '<div class="ev-loc">📍 ' + esc(e.location) + '</div>' : '')
                      +  '</div>';
            });

            html3 += '</div>';
        }

        html3 += '</div>';
        return html3;
    }

    /* ============================================================
       نمای هفته (بدون تغییر)
       ============================================================ */
    var html = '<div class="calg-multi" data-view="' + viewKey + '" style="display:grid;grid-template-columns:repeat(' + numDays + ',minmax(0,1fr));gap:5px">';

    for (var d2 = 0; d2 < numDays; d2++) {
        var ds2 = addJalaliDays(startJ, d2);
        if (!ds2) continue;
        var p = ds2.split('/').map(Number);
        var gd = jalaliToGregorian(p[0], p[1], p[2]);
        var dt = new Date(gd[0], gd[1] - 1, gd[2]);
        var isToday = ds2 === todayStr;

        html += '<div class="calg-md-head' + (isToday ? ' today' : '') + '" data-col="' + d2 + '">'
             +  '<div class="mh-wd">' + WEEKDAYS_FA[dt.getDay()] + '</div>'
             +  '<div class="mh-jd">' + toFa(p[2]) + ' ' + JALALI_MONTHS[p[1] - 1] + '</div>'
             +  '<div class="mh-gd">' + dt.getDate() + ' ' + EN_MONTHS[dt.getMonth()] + '</div>'
             +  '</div>';
    }

    for (var d3 = 0; d3 < numDays; d3++) {
        var ds3 = addJalaliDays(startJ, d3);
        if (!ds3) continue;
        var evs2 = (byDate[ds3] || []).slice().sort(function (a, b) {
            return (a.time || '').localeCompare(b.time || '');
        });
        var isToday2 = ds3 === todayStr;

        html += '<div class="calg-md-col' + (isToday2 ? ' today' : '') + '" data-date="' + ds3 + '" style="min-height:400px;max-height:60vh;overflow-y:auto;background:var(--card-solid);border:1px solid var(--border);border-radius:12px;padding:8px">';

        if (evs2.length === 0) {
            html += '<div style="text-align:center;padding:20px;font-size:.75rem;color:var(--text-muted)">رویدادی نیست</div>';
        } else {
            evs2.forEach(function (e) {
                var cat = (window.CAL_CATS && window.CAL_CATS[e.cat]) || { color: '#999' };
                var t = e.time ? toFaTime(e.time) : '';
                html += '<div class="calg-md-ev" data-ev="' + e.id + '" style="background:' + cat.color + '15;border-right:3px solid ' + cat.color + ';padding:8px;border-radius:8px;margin-bottom:6px;cursor:pointer">'
                     +  (t ? '<div style="font-size:.7rem;font-weight:900;color:' + cat.color + ';direction:ltr;margin-bottom:2px;font-family:monospace">' + t + '</div>' : '')
                     +  '<div style="font-weight:800;font-size:.82rem">' + esc(e.title) + '</div>'
                     +  (e.location ? '<div style="font-size:.7rem;color:var(--text-muted);margin-top:2px">📍 ' + esc(e.location) + '</div>' : '')
                     +  '</div>';
            });
        }
        html += '</div>';
    }
    html += '</div>';
    return html;
}

/* ============================================================
   بخش ۱۱ — تایم‌لاین روز
   ============================================================ */
var CAL_TL_HOUR_HEIGHT = 64;
var CAL_TL_START_HOUR = 5;
var CAL_TL_END_HOUR = 24;
var CAL_TL_MIN_SNAP = 15;

function calTlToMin(t) {
    if (!t) return 0;
    var p = String(t).split(':');
    return (Number(p[0]) || 0) * 60 + (Number(p[1]) || 0);
}

function calTlToTime(m) {
    m = Math.max(0, Math.round(m));
    return pad2(Math.floor(m / 60)) + ':' + pad2(m % 60);
}

function calTlLayoutEvents(evs) {
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

function renderCalTimeline(dayEvs, dateStr) {
    var bodyHeight = (CAL_TL_END_HOUR - CAL_TL_START_HOUR) * CAL_TL_HOUR_HEIGHT;
    var today = todayJalaliStr();
    var isToday = (dateStr === today);
    var nowMin = (new Date().getHours() * 60 + new Date().getMinutes());

    var parsed = [];
    dayEvs.forEach(function (e) {
        var sMin = calTlToMin(e.startTime || e.time || '21:00');
        var eMin = e.endTime ? calTlToMin(e.endTime) : (sMin + 60);
        if (eMin <= sMin) eMin = sMin + 30;
        e._sMin = sMin;
        e._eMin = eMin;
        parsed.push(e);
    });

    var laid = calTlLayoutEvents(parsed);

    var html = '<div class="calg-tl-wrap">';

    html += '<div class="calg-tl-hours">';
    for (var h = CAL_TL_START_HOUR; h < CAL_TL_END_HOUR; h++) {
        html += '<div class="calg-tl-hour-lbl">' + toFaTime(pad2(h) + ':00') + '</div>';
    }
    html += '</div>';

    html += '<div class="calg-tl-body" data-day="' + esc(dateStr) + '" style="height:' + bodyHeight + 'px">';

    for (var hh = CAL_TL_START_HOUR; hh <= CAL_TL_END_HOUR; hh++) {
        var top = (hh - CAL_TL_START_HOUR) * CAL_TL_HOUR_HEIGHT;
        html += '<div class="calg-tl-gridline" style="top:' + top + 'px"></div>';
        if (hh < CAL_TL_END_HOUR) {
            for (var q = 1; q <= 3; q++) {
                var qtop = top + q * (CAL_TL_HOUR_HEIGHT / 4);
                html += '<div class="calg-tl-gridline minor" style="top:' + qtop + 'px"></div>';
            }
        }
    }

    laid.forEach(function (e) {
        if (e._sMin >= CAL_TL_END_HOUR * 60) return;
        if (e._eMin <= CAL_TL_START_HOUR * 60) return;

        var top = (Math.max(e._sMin, CAL_TL_START_HOUR * 60) - CAL_TL_START_HOUR * 60) / 60 * CAL_TL_HOUR_HEIGHT;
        var bot = (Math.min(e._eMin, CAL_TL_END_HOUR * 60) - CAL_TL_START_HOUR * 60) / 60 * CAL_TL_HOUR_HEIGHT;
        var height = Math.max(24, bot - top);

        var totalCols = e._colsInGroup || 1;
        var col = e._col || 0;
        var colW = 100 / totalCols;
        var leftPct = col * colW;
        var widthPct = colW;

        var cat = (window.CAL_CATS && window.CAL_CATS[e.cat]) || { color: '#6366f1' };
        var timeTxt = toFaTime(e.startTime || e.time);
        if (e.endTime) timeTxt += ' — ' + toFaTime(e.endTime);

        var shortCls = '';
        if (height < 26) shortCls = ' micro';
        else if (height < 36) shortCls = ' tiny';
        else if (height < 54) shortCls = ' compact';

        html += '<div class="calg-tl-event' + shortCls + '" data-ev="' + esc(e.id) + '" '
             +  'data-start-min="' + e._sMin + '" data-end-min="' + e._eMin + '" '
             +  'data-total-cols="' + totalCols + '" data-col-idx="' + col + '" '
             +  'style="top:' + top + 'px;height:' + height + 'px;'
             +  'left:calc(' + leftPct + '% + 6px);'
             +  'right:calc(' + (100 - leftPct - widthPct) + '% + 6px);'
             +  'background:' + cat.color + '15;'
             +  'border-right-color:' + cat.color + '" '
             +  'title="' + esc(e.title) + '">'
             +  '<div class="ev-time">' + timeTxt + '</div>'
             +  '<div class="ev-title">' + esc(e.title) + '</div>'
             +  (e.location ? '<div class="ev-loc">📍 ' + esc(e.location) + '</div>' : '')
             +  '</div>';
    });

    if (isToday && nowMin >= CAL_TL_START_HOUR * 60 && nowMin <= CAL_TL_END_HOUR * 60) {
        var nowTop = (nowMin - CAL_TL_START_HOUR * 60) / 60 * CAL_TL_HOUR_HEIGHT;
        html += '<div style="position:absolute;left:0;right:0;height:2px;background:#ef4444;z-index:5;pointer-events:none;top:' + nowTop + 'px"></div>';
    }

    html += '<div class="cal-tl-preview" id="cal-tl-preview" style="position:absolute;border-radius:10px;background:rgba(59,130,246,0.18);border:2px dashed #3b82f6;pointer-events:none;z-index:150;display:none;align-items:center;justify-content:center">'
         +  '<span class="pv-time" style="background:#1e40af;color:#fff;padding:4px 12px;border-radius:8px;font-size:.75rem;font-weight:900;font-family:monospace;direction:ltr"></span>'
         +  '</div>';

    html += '</div></div>';
    return html;
}

/* ============================================================
   بخش ۱۲ — نوار روزها
   ============================================================ */
function renderCalDateStrip() {
    var cur = CAL41.cursor;
    var curStr = cur.y + '/' + pad2(cur.m) + '/' + pad2(cur.d);

    var startG = jalaliToGregorian(cur.y, cur.m, cur.d);
    var startDt = new Date(startG[0], startG[1] - 1, startG[2]);
    var offsetFromSat = (startDt.getDay() + 1) % 7;
    var satStr = addJalaliDays(curStr, -offsetFromSat);

    var today = todayJalaliStr();
    var days = [];
    for (var i = 0; i < 7; i++) days.push(addJalaliDays(satStr, i));

    var FA_DOW_SHORT = ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش'];
    var FA_M_SHORT = ['فرو', 'ارد', 'خرد', 'تیر', 'مرد', 'شهر', 'مهر', 'آبا', 'آذر', 'دی', 'بهم', 'اسف'];

    var html = '<div class="cal-day-strip" id="cal-day-strip">';
    html += '<button type="button" class="cal-day-chip" data-nav-strip="-1" style="background:#eef4fb;border-color:#c8dcef;font-size:1rem;min-width:44px;display:flex;align-items:center;justify-content:center" title="هفته قبل">‹</button>';

    days.forEach(function (d) {
        var p = d.split('/').map(Number);
        var isToday = (d === today);
        var isCur = (d === curStr);
        var cls = 'cal-day-chip' + (isToday ? ' today' : '') + (isCur ? ' active' : '');

        var gd = jalaliToGregorian(p[0], p[1], p[2]);
        var dt = new Date(gd[0], gd[1] - 1, gd[2]);
        var wdShort = FA_DOW_SHORT[dt.getDay()];

        html += '<button type="button" class="' + cls + '" data-date="' + d + '">'
             +   '<div class="cdc-wd">' + wdShort + '</div>'
             +   '<div class="cdc-d">' + toFa(p[2]) + '</div>'
             +   '<div class="cdc-m">' + FA_M_SHORT[p[1] - 1] + '</div>'
             +  '</button>';
    });

    html += '<button type="button" class="cal-day-chip" data-nav-strip="1" style="background:#eef4fb;border-color:#c8dcef;font-size:1rem;min-width:44px;display:flex;align-items:center;justify-content:center" title="هفته بعد">›</button>';
    html += '</div>';
    return html;
}

/* ============================================================
   بخش ۱۳ — نمای روز
   ============================================================ */
function renderCalDayView(events) {
    var cur = CAL41.cursor;
    var ds = cur.y + '/' + pad2(cur.m) + '/' + pad2(cur.d);
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

    html += '<div style="text-align:center;margin-bottom:12px;padding:12px;background:var(--primary-soft);border-radius:12px">'
         +   '<div style="font-size:1.05rem;font-weight:900;color:#1e40af">'
         +     WEEKDAYS_FA[dt.getDay()] + '، ' + toFa(p[2]) + ' ' + JALALI_MONTHS[p[1] - 1] + ' ' + toFa(p[0])
         +   '</div>'
         +   '<div style="font-size:.78rem;color:#94a3b8;direction:ltr;margin-top:4px">'
         +     dt.getDate() + ' ' + EN_MONTHS[dt.getMonth()] + ' ' + dt.getFullYear()
         +   '</div>'
         +   '<div style="margin-top:8px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">'
         +     '<button class="calg-btn primary" id="calg-share-day">📤 اشتراک‌گذاری</button>'
         +     '<button class="calg-btn" id="calg-add-here">＋ افزودن رویداد</button>'
         +   '</div>'
         + '</div>';

    html += renderCalDateStrip();

    if (q) {
        html += '<div style="text-align:center;font-size:.78rem;color:var(--text-muted);margin-bottom:10px">'
             +  '🔍 نتایج جستجو برای «' + esc(q) + '» — ' + toFa(dayEvs.length) + ' مورد'
             +  '</div>';
    }

    html += renderCalTimeline(dayEvs, ds);

    return html;
}

/* ============================================================
   بخش ۱۴ — نمای دستورکار
   ============================================================ */
function renderCalAgendaView(events) {
    var today = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    var todayStr = today[0] + '/' + pad2(today[1]) + '/' + pad2(today[2]);

    var q = (CAL41.agendaSearch || '').toLowerCase();
    var range = CAL41.agendaRange || '365';

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
    future.forEach(function (e) {
        (byDate[e.date] = byDate[e.date] || []).push(e);
    });
    var dates = Object.keys(byDate).sort();

    if (dates.length === 0) {
        return '<div class="calg-empty">'
             + (q ? '🔍 هیچ رویدادی با «' + esc(q) + '» یافت نشد.' : 'رویدادی در این بازه نیست.')
             + '</div>';
    }

    var EN_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var html = '<div style="display:flex;flex-direction:column;gap:10px">';

    dates.forEach(function (d) {
        var p = d.split('/').map(Number);
        var gd = jalaliToGregorian(p[0], p[1], p[2]);
        var dt = new Date(gd[0], gd[1] - 1, gd[2]);
        var isToday = (d === todayStr);

        var dLeft = jalaliDiff(today[0], today[1], today[2], p[0], p[1], p[2]);
        var dLeftTxt = dLeft === 0 ? 'امروز'
                     : dLeft === 1 ? 'فردا'
                     : dLeft < 7 ? toFa(dLeft) + ' روز دیگر'
                     : dLeft < 30 ? toFa(Math.floor(dLeft / 7)) + ' هفته دیگر'
                     : dLeft < 365 ? toFa(Math.floor(dLeft / 30)) + ' ماه دیگر'
                     : toFa(Math.floor(dLeft / 365)) + ' سال دیگر';

        html += '<div style="padding:12px 14px;background:var(--card-alt);border-radius:10px;border-right:4px solid ' + (isToday ? '#1e40af' : '#3b82f6') + '">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:6px">';
        html += '<span style="font-size:.85rem;color:#1e40af;font-weight:900">'
             +  WEEKDAYS_FA[dt.getDay()] + '، ' + toFa(p[2]) + ' ' + JALALI_MONTHS[p[1] - 1] + ' ' + toFa(p[0])
             +  (isToday ? ' (امروز)' : '')
             +  '</span>';
        html += '<span style="font-size:.72rem;color:#64748b;background:#fff;padding:3px 10px;border-radius:9px;font-weight:700">' + dLeftTxt + '</span>';
        html += '</div>';
        html += '<div style="font-size:.68rem;color:#94a3b8;direction:ltr;margin-bottom:8px">' + dt.getDate() + ' ' + EN_MONTHS[dt.getMonth()] + ' ' + dt.getFullYear() + '</div>';

        byDate[d].forEach(function (e) {
            var cat = (window.CAL_CATS && window.CAL_CATS[e.cat]) || { color: '#999', icon: '📌' };
            html += '<div class="calg-agev" data-ev="' + esc(e.id) + '" style="display:flex;gap:8px;align-items:center;padding:8px;border-radius:8px;background:#fff;margin-bottom:4px;cursor:pointer;border:1px solid var(--border)">'
                 +   '<span style="width:8px;height:8px;border-radius:2px;background:' + cat.color + ';flex-shrink:0"></span>'
                 +   '<span style="font-size:.8rem;font-weight:700;flex:1">' + esc(e.title) + '</span>'
                 +   (e.time ? '<span style="font-size:.72rem;color:var(--text-muted);direction:ltr;font-family:monospace">' + toFaTime(e.time) + '</span>' : '')
                 +  '</div>';
        });
        html += '</div>';
    });

    html += '</div>';
    return html;
}

/* ============================================================
   بخش ۱۵ — عنوان نوار بالا
   ============================================================ */
function buildCalTitle41() {
    var cur = CAL41.cursor;
    if (!cur || isNaN(cur.y) || isNaN(cur.m) || isNaN(cur.d)) return '—';
    var mon = JALALI_MONTHS[cur.m - 1] || '';

    if (CAL41.view === 'month') return mon + ' ' + toFa(cur.y);
    if (CAL41.view === 'agenda') return 'رویدادهای پیش‌رو';
    if (CAL41.view === 'day') {
        var g = jalaliToGregorian(cur.y, cur.m, cur.d);
        var d = new Date(g[0], g[1] - 1, g[2]);
        return WEEKDAYS_FA[d.getDay()] + '، ' + toFa(cur.d) + ' ' + mon + ' ' + toFa(cur.y);
    }

    var days = CAL41.view === 'week' ? 7 : 3;
    var startD = cur.d;
    if (CAL41.view === 'week') {
        var g2 = jalaliToGregorian(cur.y, cur.m, cur.d);
        var dt2 = new Date(g2[0], g2[1] - 1, g2[2]);
        startD = cur.d - ((dt2.getDay() + 1) % 7);
    }
    var startJ = addJalaliDays(cur.y + '/' + pad2(cur.m) + '/' + pad2(startD), 0);
    var endJ = addJalaliDays(startJ, days - 1);
    if (!startJ || !endJ) return mon + ' ' + toFa(cur.y);
    var sp = startJ.split('/').map(Number);
    var ep = endJ.split('/').map(Number);
    return toFa(sp[2]) + ' ' + JALALI_MONTHS[sp[1] - 1] + ' — '
         + toFa(ep[2]) + ' ' + JALALI_MONTHS[ep[1] - 1] + ' ' + toFa(ep[0]);
}

/* ============================================================
   بخش ۱۶ — تابع اصلی رندر
   ============================================================ */
function calRender() {
    var page = document.getElementById('page-jalali-calendar');
    if (!page) {
        if (typeof calEnsurePage === 'function') calEnsurePage();
        page = document.getElementById('page-jalali-calendar');
        if (!page) return;
    }

    rebuildCalCats41();

    if (!CAL41.cursor || isNaN(CAL41.cursor.y)) {
        var t = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
        CAL41.cursor = { y: t[0], m: t[1], d: t[2] };
    }

    var all = calBuildAllEvents();
    var active = all.filter(function (e) {
        return CAL41.filterCats[e.cat] !== false;
    });

    var titleText = buildCalTitle41();

    var html = '<h2>📅 مدیریت تقویم</h2><div class="calg-wrap">';

    /* نوار بالا */
    html += '<div class="calg-bar">';
    html += '<button class="calg-btn" id="calg-prev">‹</button>';
    html += '<h3 id="calg-titledate">' + titleText + '</h3>';
    html += '<button class="calg-btn" id="calg-today">امروز</button>';
    html += '<button class="calg-btn" id="calg-next">›</button>';
    html += '<button class="calg-btn" id="calg-cat-mgr" title="مدیریت دسته‌بندی" style="font-size:1.05rem">🎨</button>';
    html += '<button class="calg-btn primary" id="calg-new">＋ رویداد</button>';
    html += '</div>';

    /* تب‌ها */
    html += '<div class="calg-tabs">';
    [['month', 'ماه'], ['week', 'هفته'], ['3day', '۳ روز آتی'], ['day', 'روز'], ['agenda', 'دستورکار']].forEach(function (x) {
        html += '<button class="calg-tab' + (CAL41.view === x[0] ? ' active' : '') + '" data-view="' + x[0] + '">' + x[1] + '</button>';
    });
    html += '</div>';

    /* نوار جستجو */
    if (CAL41.view === 'day' || CAL41.view === 'agenda') {
        var q = (CAL41.view === 'day') ? (CAL41.daySearch || '') : (CAL41.agendaSearch || '');
        html += '<div style="display:flex;gap:8px;padding:10px 14px;background:#f8fafd;border-bottom:1px solid var(--border);flex-wrap:wrap;align-items:center">';
        html += '<input type="text" id="calg-search-input" placeholder="🔍 جستجو..." value="' + esc(q) + '" '
             +  'style="flex:1;min-width:180px;padding:9px 14px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-size:0.85rem;outline:none">';
        if (q) {
            html += '<button type="button" id="calg-clear-search" '
                 +  'style="background:#fee2e2;color:#dc2626;border:none;border-radius:10px;padding:9px 14px;font-family:inherit;font-size:0.8rem;font-weight:800;cursor:pointer">✕</button>';
        }
        if (CAL41.view === 'agenda') {
            var ar = CAL41.agendaRange || '365';
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

    /* بدنه */
    html += '<div class="calg-body" id="calg-body">';
    if (CAL41.view === 'month')      html += calRenderMonth41(active);
    else if (CAL41.view === 'week')  html += calRenderMultiDay41(active, 7, 'week');
    else if (CAL41.view === '3day')  html += calRenderMultiDay41(active, 3, '3day');
    else if (CAL41.view === 'day')   html += renderCalDayView(active);
    else                              html += renderCalAgendaView(active);
    html += '</div>';

    /* راهنمای دسته‌بندی */
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

    bindCalEvents41(active);

    if (CAL41.view === 'day') {
        setTimeout(function () {
            var body = document.querySelector('.calg-tl-body');
            if (body) setupCalDayTimeline(body, active);
        }, 50);
    }
}

/* ============================================================
   بخش ۱۶.۵ — رندر فقط بدنه (برای جستجو بدون بستن کیبورد)
   ============================================================ */
function calRenderBodyOnly() {
    var bodyEl = document.getElementById('calg-body');
    if (!bodyEl) {
        calRender();
        return;
    }

    rebuildCalCats41();

    var all = calBuildAllEvents();
    var active = all.filter(function (e) {
        return CAL41.filterCats[e.cat] !== false;
    });

    var html = '';
    if (CAL41.view === 'month')      html = calRenderMonth41(active);
    else if (CAL41.view === 'week')  html = calRenderMultiDay41(active, 7, 'week');
    else if (CAL41.view === '3day')  html = calRenderMultiDay41(active, 3, '3day');
    else if (CAL41.view === 'day')   html = renderCalDayView(active);
    else                              html = renderCalAgendaView(active);

    bodyEl.innerHTML = html;

    bindCalBodyEvents(active);

    if (CAL41.view === 'day') {
        setTimeout(function () {
            var body = document.querySelector('.calg-tl-body');
            if (body) setupCalDayTimeline(body, active);
        }, 50);
    }
}

function bindCalBodyEvents(active) {
    /* نوار روزها */
    document.querySelectorAll('.cal-day-chip').forEach(function (ch) {
        var d = ch.getAttribute('data-date');
        var navStrip = ch.getAttribute('data-nav-strip');
        if (navStrip) {
            ch.onclick = function () {
                var cur = CAL41.cursor;
                var ds = cur.y + '/' + pad2(cur.m) + '/' + pad2(cur.d);
                var nd = addJalaliDays(ds, Number(navStrip) * 7);
                var pp = nd.split('/').map(Number);
                CAL41.cursor = { y: pp[0], m: pp[1], d: pp[2] };
                calRender();
            };
        } else if (d) {
            ch.onclick = function () {
                var pp = d.split('/').map(Number);
                CAL41.cursor = { y: pp[0], m: pp[1], d: pp[2] };
                calRender();
            };
        }
    });

    /* رویدادها */
    document.querySelectorAll('#calg-body [data-ev]').forEach(function (el) {
        el.onclick = function (e) {
            e.stopPropagation();
            var id = this.getAttribute('data-ev');
            var ev = active.find(function (x) { return x.id === id; });
            if (ev) handleEventClick41(ev);
        };
    });

    /* خانه‌های ماه */
    document.querySelectorAll('.calg-mcell').forEach(function (cell) {
        cell.onclick = function (e) {
            if (e.target.closest('.cev')) return;
            openEventModal41(null, this.getAttribute('data-date'));
        };
    });

    /* کلیک روی ناحیه خالی ستون ۳ روز */
    document.querySelectorAll('.calg-3day-col').forEach(function (col) {
        col.onclick = function (e) {
            if (e.target.closest('.calg-tl-event')) return;
            var rect = col.getBoundingClientRect();
            var y = e.clientY - rect.top;
            var totalMin = 5 * 60 + (y / 64) * 60;
            var snapped = Math.round(totalMin / 15) * 15;
            snapped = Math.max(5 * 60, Math.min(23 * 60, snapped));
            var hh = Math.floor(snapped / 60);
            var mm = snapped % 60;
            openEventModal41(null, this.getAttribute('data-day'), hh);
            setTimeout(function () {
                var ti = document.getElementById('evt-start-time');
                if (ti) ti.value = pad2(hh) + ':' + pad2(mm);
                var to = document.getElementById('evt-end-time');
                if (to) to.value = pad2(Math.min(23, hh + 1)) + ':' + pad2(mm);
            }, 80);
        };
    });

    /* سلول‌های نمای هفته */
    document.querySelectorAll('.calg-md-col').forEach(function (col) {
        col.onclick = function (e) {
            if (e.target.closest('[data-ev]')) return;
            openEventModal41(null, this.getAttribute('data-date'));
        };
    });
}

/* ============================================================
   بخش ۱۷ — اتصال رویدادهای shell تقویم
   ✅ رفع باگ: جستجو → فقط بدنه رندر می‌شود (کیبورد بسته نمی‌شود)
   ============================================================ */
function bindCalEvents41(active) {
    var prev = document.getElementById('calg-prev');
    var next = document.getElementById('calg-next');
    var today = document.getElementById('calg-today');
    var newBtn = document.getElementById('calg-new');
    var catMgr = document.getElementById('calg-cat-mgr');
    var shareDay = document.getElementById('calg-share-day');
    var addHere = document.getElementById('calg-add-here');

    if (prev) prev.onclick = function () { navigateCal41(-1); };
    if (next) next.onclick = function () { navigateCal41(1); };
    if (today) today.onclick = function () {
        var t = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
        CAL41.cursor = { y: t[0], m: t[1], d: t[2] };
        calRender();
    };
    if (newBtn) newBtn.onclick = function () {
        var ds = CAL41.cursor.y + '/' + pad2(CAL41.cursor.m) + '/' + pad2(CAL41.cursor.d);
        openEventModal41(null, ds);
    };
    if (catMgr) catMgr.onclick = window.openCategoriesManager;
    if (shareDay) shareDay.onclick = shareDayEvents41;
    if (addHere) addHere.onclick = function () {
        var ds = CAL41.cursor.y + '/' + pad2(CAL41.cursor.m) + '/' + pad2(CAL41.cursor.d);
        openEventModal41(null, ds);
    };

    /* تب‌ها */
    document.querySelectorAll('.calg-tab').forEach(function (t) {
        t.onclick = function () {
            CAL41.view = this.getAttribute('data-view');
            calRender();
        };
    });

    /* چک‌باکس دسته‌بندی */
    document.querySelectorAll('.calg-legend input').forEach(function (cb) {
        cb.onchange = function () {
            CAL41.filterCats[this.getAttribute('data-cat')] = this.checked;
            calRender();
        };
    });

    /* ✅ جستجو — فقط بدنه رندر می‌شود (کیبورد باز می‌مونه) */
    var si = document.getElementById('calg-search-input');
    if (si) {
        si.addEventListener('input', function () {
            if (CAL41.view === 'day') CAL41.daySearch = this.value;
            else if (CAL41.view === 'agenda') CAL41.agendaSearch = this.value;
            calRenderBodyOnly();
        });
    }

    var cs = document.getElementById('calg-clear-search');
    if (cs) cs.onclick = function () {
        if (CAL41.view === 'day') CAL41.daySearch = '';
        else CAL41.agendaSearch = '';
        calRender();
    };

    var rs = document.getElementById('calg-range-select');
    if (rs) rs.onchange = function () {
        CAL41.agendaRange = this.value;
        DB.save('cal41.agendaRange', this.value);
        calRender();
    };

    /* بقیه رویدادهای داخل بدنه */
    bindCalBodyEvents(active);
}

/* ============================================================
   بخش ۱۸ — ناوبری
   ============================================================ */
function navigateCal41(dir) {
    var cur = CAL41.cursor;
    if (CAL41.view === 'month' || CAL41.view === 'agenda') {
        cur.m += dir;
        if (cur.m < 1) { cur.m = 12; cur.y--; }
        if (cur.m > 12) { cur.m = 1; cur.y++; }
    } else {
        var n = CAL41.view === 'week' ? 7 : (CAL41.view === '3day' ? 3 : 1);
        var ds = cur.y + '/' + pad2(cur.m) + '/' + pad2(cur.d);
        var nd = addJalaliDays(ds, dir * n);
        var p = nd.split('/').map(Number);
        CAL41.cursor = { y: p[0], m: p[1], d: p[2] };
    }
    calRender();
}

/* ============================================================
   بخش ۱۹ — کلیک روی رویداد
   ============================================================ */
function handleEventClick41(ev) {
    if (!ev.recurrence || ev.recurrence.freq === 'none' || ev._isOverride) {
        openEventModal41(ev, null);
        return;
    }

    var rawList = calLoadUserEvents();
    var master = rawList.find(function (x) { return x.id === ev.rawId; });
    if (!master) {
        openEventModal41(ev, null);
        return;
    }

    showScopeDialog41(master, ev.date, ev.time, function (scope) {
        if (scope === 'this') {
            openEventModal41(ev, null, undefined, 'this');
        } else if (scope === 'future') {
            openEventModal41(ev, null, undefined, 'future');
        } else {
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
            openEventModal41(masterEv, null, undefined, 'all');
        }
    });
}

function showScopeDialog41(master, date, time, cb) {
    var old = document.getElementById('cal-scope-modal');
    if (old) old.remove();
    var oldO = document.getElementById('cal-scope-overlay');
    if (oldO) oldO.remove();

    if (!document.getElementById('cal-scope-style')) {
        var s = document.createElement('style');
        s.id = 'cal-scope-style';
        s.textContent = ''
        + '.cal-scope-btn{width:100%;text-align:right;padding:14px;border:1.5px solid var(--border);'
        + 'background:#fff;border-radius:12px;font-family:inherit;cursor:pointer;'
        + 'transition:all .2s;display:flex;flex-direction:column;gap:5px;margin-bottom:8px}'
        + '.cal-scope-btn:hover{background:#eff6ff;border-color:#3b82f6;transform:translateY(-1px)}'
        + '.cal-scope-btn .cs-title{font-weight:800;color:#1e40af;font-size:.9rem}'
        + '.cal-scope-btn .cs-sub{font-size:.75rem;color:#64748b}';
        document.head.appendChild(s);
    }

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
        +     '<button type="button" class="cal-scope-btn" data-scope="this">'
        +       '<span class="cs-title">📌 فقط این رخداد</span>'
        +       '<span class="cs-sub">تغییر یا حذف فقط برای رخداد ' + toFa(date) + '</span>'
        +     '</button>'
        +     '<button type="button" class="cal-scope-btn" data-scope="future">'
        +       '<span class="cs-title">⏩ این و رخدادهای بعدی</span>'
        +       '<span class="cs-sub">از ' + toFa(date) + ' به بعد تغییر می‌کند</span>'
        +     '</button>'
        +     '<button type="button" class="cal-scope-btn" data-scope="all">'
        +       '<span class="cs-title">🌐 همه رخدادها</span>'
        +       '<span class="cs-sub">کل زنجیره تکرار تغییر می‌کند</span>'
        +     '</button>'
        +   '</div>'
        +   '<div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end">'
        +     '<button class="btn-secondary" id="cal-scope-cancel">انصراف</button>'
        +   '</div>'
        + '</div>';
    document.body.insertAdjacentHTML('beforeend', html);

    var close = function () {
        var m = document.getElementById('cal-scope-modal');
        if (m) m.remove();
        var o = document.getElementById('cal-scope-overlay');
        if (o) o.remove();
    };

    document.querySelectorAll('.cal-scope-btn').forEach(function (b) {
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
   بخش ۲۰ — Drag & Drop روی تایم‌لاین
   ============================================================ */
function setupCalDayTimeline(body, active) {
    if (!body) return;
    if (body.dataset.dragReady === '1') return;
    body.dataset.dragReady = '1';

    var currentDay = body.getAttribute('data-day');
    var dragState = null;
    var pressTimer = null;

    function getPoint(e) {
        if (e.touches && e.touches.length) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        if (e.changedTouches && e.changedTouches.length) {
            return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    function onStart(e) {
        if (e.type === 'mousedown' && e.button !== 0) return;
        if (dragState) return;

        var evEl = e.target.closest && e.target.closest('.calg-tl-event');
        if (!evEl) return;

        var evId = evEl.getAttribute('data-ev');
        if (!evId) return;

        var all = calBuildAllEvents();
        var ev = all.find(function (x) { return x.id === evId; });
        if (!ev || ev.readonly) return;

        var pt = getPoint(e);
        var startPt = pt;

        clearTimeout(pressTimer);
        pressTimer = setTimeout(function () {
            beginDrag(e, evEl, ev, startPt);
        }, 260);

        function onMove(me) {
            var mp = getPoint(me);
            if (!dragState) {
                var dx = Math.abs(mp.x - startPt.x);
                var dy = Math.abs(mp.y - startPt.y);
                if (dx > 9 || dy > 9) {
                    clearTimeout(pressTimer);
                    pressTimer = null;
                    detach();
                }
                return;
            }
            if (me.cancelable) me.preventDefault();
            updateDrag(mp);
        }

        function onEnd() {
            clearTimeout(pressTimer);
            pressTimer = null;
            if (dragState) endDrag();
            detach();
        }

        function onCancel() {
            clearTimeout(pressTimer);
            pressTimer = null;
            if (dragState) cancelDrag();
            detach();
        }

        function detach() {
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('touchend', onEnd);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchcancel', onCancel);
        }

        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('mousemove', onMove);
        document.addEventListener('touchend', onEnd);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchcancel', onCancel);
    }

    function beginDrag(initialEvent, evEl, ev, pt) {
        var rect = evEl.getBoundingClientRect();
        var sMin = calTlToMin(ev.startTime || ev.time || '21:00');
        var eMin = ev.endTime ? calTlToMin(ev.endTime) : (sMin + 60);
        if (eMin <= sMin) eMin = sMin + 30;

        dragState = {
            ev: ev,
            evEl: evEl,
            offsetX: pt.x - rect.left,
            offsetY: pt.y - rect.top,
            startMin: sMin,
            endMin: eMin,
            duration: eMin - sMin,
            targetDay: ev.date,
            targetMin: sMin
        };

        evEl.style.position = 'fixed';
        evEl.style.top = rect.top + 'px';
        evEl.style.left = rect.left + 'px';
        evEl.style.right = 'auto';
        evEl.style.bottom = 'auto';
        evEl.style.width = rect.width + 'px';
        evEl.style.height = rect.height + 'px';
        evEl.style.margin = '0';
        evEl.classList.add('dragging');

        document.body.classList.add('cal-drag-active');

        var strip = document.getElementById('cal-day-strip');
        if (strip) strip.classList.add('pinned');

        var preview = document.getElementById('cal-tl-preview');
        if (preview) preview.classList.add('show');

        if (navigator.vibrate) {
            try { navigator.vibrate(20); } catch (er) {}
        }

        updateDrag(pt);
    }

    function updateDrag(pt) {
        if (!dragState) return;
        var st = dragState;

        st.evEl.style.top = (pt.y - st.offsetY) + 'px';
        st.evEl.style.left = (pt.x - st.offsetX) + 'px';

        var bodyEl = document.querySelector('.calg-tl-body');
        if (!bodyEl) return;
        var bodyRect = bodyEl.getBoundingClientRect();
        var relY = pt.y - bodyRect.top - st.offsetY;
        var totalMin = relY / CAL_TL_HOUR_HEIGHT * 60;
        var snapped = Math.round(totalMin / CAL_TL_MIN_SNAP) * CAL_TL_MIN_SNAP;
        var newStart = CAL_TL_START_HOUR * 60 + snapped;
        newStart = Math.max(CAL_TL_START_HOUR * 60,
                   Math.min(CAL_TL_END_HOUR * 60 - st.duration, newStart));
        st.targetMin = newStart;

        var tLabel = st.evEl.querySelector('.ev-time');
        if (tLabel) {
            tLabel.textContent = calTlToTime(newStart) + ' — ' + calTlToTime(newStart + st.duration);
        }

        var chips = document.querySelectorAll('.cal-day-chip');
        var foundDay = null;
        chips.forEach(function (ch) {
            var r = ch.getBoundingClientRect();
            var hit = pt.x >= r.left && pt.x <= r.right &&
                      pt.y >= r.top - 10 && pt.y <= r.bottom + 10;
            if (hit) {
                var d = ch.getAttribute('data-date');
                if (d) {
                    foundDay = d;
                    ch.classList.add('drag-over');
                }
            } else {
                ch.classList.remove('drag-over');
            }
        });
        if (foundDay) st.targetDay = foundDay;
    }

    function cleanupDrag() {
        if (!dragState) return;
        var st = dragState;
        dragState = null;

        st.evEl.classList.remove('dragging');
        st.evEl.style.position = '';
        st.evEl.style.top = '';
        st.evEl.style.left = '';
        st.evEl.style.right = '';
        st.evEl.style.bottom = '';
        st.evEl.style.width = '';
        st.evEl.style.height = '';
        st.evEl.style.margin = '';

        document.body.classList.remove('cal-drag-active');

        var strip = document.getElementById('cal-day-strip');
        if (strip) strip.classList.remove('pinned');
        document.querySelectorAll('.cal-day-chip').forEach(function (c) {
            c.classList.remove('drag-over');
        });
        var preview = document.getElementById('cal-tl-preview');
        if (preview) preview.classList.remove('show');
    }

    function cancelDrag() {
        if (!dragState) return;
        cleanupDrag();
        calRender();
    }

    function endDrag() {
        if (!dragState) return;
        var st = dragState;
        var sameTime = st.startMin === st.targetMin;
        var sameDay = st.ev.date === st.targetDay;
        cleanupDrag();

        if (sameTime && sameDay) {
            calRender();
            return;
        }
        applyDragMove(st);
    }

    function applyDragMove(st) {
        var rawEv = st.ev;
        var masterId = rawEv.rawId || rawEv.id;
        var list = calLoadUserEvents();
        var master = list.find(function (x) { return x.id === masterId; });
        if (!master) { calRender(); return; }

        var newStartTime = calTlToTime(st.targetMin);
        var newEndTime = calTlToTime(st.targetMin + st.duration);

        var isRecurring = master.recurrence &&
                         master.recurrence.freq &&
                         master.recurrence.freq !== 'none';

        if (!isRecurring) {
            var oldStart = master.startDate || master.date;
            var oldP = oldStart.split('/').map(Number);
            var tP = st.targetDay.split('/').map(Number);
            var dayDiff = jalaliDiff(oldP[0], oldP[1], oldP[2], tP[0], tP[1], tP[2]);

            master.startDate = st.targetDay;
            master.date = st.targetDay;
            master.startTime = newStartTime;
            master.time = newStartTime;
            if (master.endDate) master.endDate = addJalaliDays(master.endDate, dayDiff);
            master.endTime = newEndTime;

            DB.save('calendarUserEvents', list);
            afterCalMove('');
            return;
        }

        showScopeDialog41(master, rawEv.date, rawEv.time, function (scope) {
            var reloaded = calLoadUserEvents();
            var m2 = reloaded.find(function (x) { return x.id === masterId; });
            if (!m2) { calRender(); return; }

            var oldDate = rawEv.date;
            var oldP2 = oldDate.split('/').map(Number);
            var tP2 = st.targetDay.split('/').map(Number);
            var dayDiff2 = jalaliDiff(oldP2[0], oldP2[1], oldP2[2], tP2[0], tP2[1], tP2[2]);

            if (scope === 'all') {
                m2.startDate = addJalaliDays(m2.startDate || m2.date, dayDiff2);
                m2.date = m2.startDate;
                if (m2.endDate) m2.endDate = addJalaliDays(m2.endDate, dayDiff2);
                m2.startTime = newStartTime;
                m2.time = newStartTime;
                m2.endTime = newEndTime;

                var ov = DB.load('calendarRecOverrides', {});
                delete ov[masterId];
                DB.save('calendarRecOverrides', ov);
                DB.save('calendarUserEvents', reloaded);
                afterCalMove('همه رخدادها');

            } else if (scope === 'future') {
                var dayBefore = addJalaliDays(oldDate, -1);
                if (!m2.recurrence) m2.recurrence = {};
                var oldStartDate = m2.startDate || m2.date;

                if (dayBefore < oldStartDate) {
                    reloaded = reloaded.filter(function (x) { return x.id !== masterId; });
                } else {
                    m2.recurrence.ends = 'on';
                    m2.recurrence.until = dayBefore;
                }

                var nm = JSON.parse(JSON.stringify(m2));
                nm.id = 'u_' + uid();
                nm.startDate = st.targetDay;
                nm.date = st.targetDay;
                nm.startTime = newStartTime;
                nm.time = newStartTime;
                nm.endDate = st.targetDay;
                nm.endTime = newEndTime;
                nm.recurrence = JSON.parse(JSON.stringify(m2.recurrence || {}));
                nm.recurrence.ends = 'never';
                nm.recurrence.until = '';
                delete nm.recurrence.exdates;
                reloaded.push(nm);
                DB.save('calendarUserEvents', reloaded);
                afterCalMove('این و بعدی');

            } else {
                var ovs = DB.load('calendarRecOverrides', {});
                if (!ovs[masterId]) ovs[masterId] = {};
                ovs[masterId][oldDate] = { deleted: true };
                DB.save('calendarRecOverrides', ovs);

                var oneOff = {
                    id: 'u_' + uid(),
                    cat: master.cat,
                    startDate: st.targetDay,
                    date: st.targetDay,
                    startTime: newStartTime,
                    time: newStartTime,
                    endDate: st.targetDay,
                    endTime: newEndTime,
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
                afterCalMove('فقط این رخداد');
            }
        });
    }

    function afterCalMove(label) {
        calRender();
        if (typeof updateHomeWidgets === 'function') {
            try { updateHomeWidgets(); } catch (e) {}
        }
        showToast('📅 رویداد جابجا شد' + (label ? ' (' + label + ')' : ''));
    }

    body.addEventListener('click', function (e) {
        if (dragState) return;
        if (e.target.closest('.calg-tl-event')) return;
        if (e.target.closest('.cal-tl-preview')) return;

        var rect = body.getBoundingClientRect();
        var y = e.clientY - rect.top;
        var totalMin = CAL_TL_START_HOUR * 60 + (y / CAL_TL_HOUR_HEIGHT) * 60;
        var snapped = Math.round(totalMin / CAL_TL_MIN_SNAP) * CAL_TL_MIN_SNAP;
        snapped = Math.max(CAL_TL_START_HOUR * 60, Math.min(CAL_TL_END_HOUR * 60 - 60, snapped));

        var hh = Math.floor(snapped / 60);
        var mm = snapped % 60;
        var ds = body.getAttribute('data-day');

        openEventModal41(null, ds, hh);
        setTimeout(function () {
            var ti = document.getElementById('evt-start-time');
            if (ti) ti.value = pad2(hh) + ':' + pad2(mm);
            var to = document.getElementById('evt-end-time');
            if (to) to.value = pad2(Math.min(23, hh + 1)) + ':' + pad2(mm);
        }, 80);
    });

    body.addEventListener('touchstart', onStart, { passive: true });
    body.addEventListener('mousedown', onStart);
}

/* ============================================================
   بخش ۲۱ — مودال رویداد
   ============================================================ */
function openEventModal41(ev, defaultDate, defaultHour, scope) {
    var old = document.getElementById('evt-modal');
    if (old) old.remove();
    var oldO = document.getElementById('evt-overlay');
    if (oldO) oldO.remove();

    var isNew = !ev;
    var curDate = (ev && ev.startDate) || defaultDate
                || (CAL41.cursor.y + '/' + pad2(CAL41.cursor.m) + '/' + pad2(CAL41.cursor.d));
    var curTime = (ev && ev.startTime) || (defaultHour !== undefined ? pad2(defaultHour) + ':00' : '21:00');
    var endDate = (ev && ev.endDate) || curDate;
    var endTime = (ev && ev.endTime) || curTime;

    var userCats = uCats41();
    var selectedCat = (ev && ev.cat) || (userCats[0] && userCats[0].key) || 'personal';
    var recurrence = normalizeRec41(ev && ev.recurrence, curDate);
    var persons = (ev && ev.persons) ? ev.persons.slice() : [];

    var catPicker = '';
    userCats.forEach(function (c) {
        var active = (c.key === selectedCat)
            ? 'background:' + c.color + '20;border-color:' + c.color
            : 'background:#f8fafc;border-color:transparent';
        catPicker += '<button type="button" class="evt-cat-btn" data-cat="' + c.key + '" '
                  +  'style="' + active + ';padding:8px 14px;border-radius:10px;border:2px solid;'
                  +  'font-family:inherit;font-size:.8rem;font-weight:800;cursor:pointer;'
                  +  'display:inline-flex;align-items:center;gap:5px;color:' + c.color + '">'
                  +  c.icon + ' ' + c.label + '</button>';
    });

    var personsList = DB.load('persons', []);
    var personsChips = persons.map(function (pid) {
        var pr = personsList.find(function (x) { return x.id === pid; });
        if (!pr) return '';
        return '<span data-pid="' + pid + '" style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;background:#dbeafe;color:#1e40af;border-radius:14px;font-size:.78rem;font-weight:800">'
             + (pr.first || '') + ' ' + (pr.last || '')
             + ' <button type="button" style="background:none;border:none;color:#dc2626;cursor:pointer;font-weight:900" data-rm="' + pid + '">×</button></span>';
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

        +     '<div class="field"><label>عنوان *</label>'
        +       '<input type="text" id="evt-title" value="' + (ev ? esc(ev.title) : '') + '"></div>'

        +     '<div class="field"><label>دسته‌بندی</label>'
        +       '<div id="evt-cats" style="display:flex;flex-wrap:wrap;gap:6px">' + catPicker + '</div></div>'

        +     '<div class="field"><label>تاریخ و ساعت شروع</label>'
        +       '<div style="display:grid;grid-template-columns:1fr auto;gap:6px">'
        +         '<input type="text" id="evt-start-date" class="date-picker" dir="ltr" value="' + curDate + '">'
        +         '<div style="display:flex;gap:4px">'
        +           '<input type="text" id="evt-start-time" dir="ltr" placeholder="HH:MM" value="' + curTime + '" style="width:80px;text-align:center;font-family:monospace">'
        +           '<button type="button" id="evt-start-clock" style="width:38px;border:none;border-radius:10px;background:var(--primary-soft);color:var(--primary-dark);cursor:pointer;font-size:1.05rem">🕐</button>'
        +         '</div></div></div>'

        +     '<div class="field"><label>تاریخ و ساعت پایان</label>'
        +       '<div style="display:grid;grid-template-columns:1fr auto;gap:6px">'
        +         '<input type="text" id="evt-end-date" class="date-picker" dir="ltr" value="' + endDate + '">'
        +         '<div style="display:flex;gap:4px">'
        +           '<input type="text" id="evt-end-time" dir="ltr" placeholder="HH:MM" value="' + endTime + '" style="width:80px;text-align:center;font-family:monospace">'
        +           '<button type="button" id="evt-end-clock" style="width:38px;border:none;border-radius:10px;background:var(--primary-soft);color:var(--primary-dark);cursor:pointer;font-size:1.05rem">🕐</button>'
        +         '</div></div></div>'

        +     '<div class="field"><label>📍 محل رویداد</label>'
        +       '<input type="text" id="evt-location" value="' + (ev ? esc(ev.location || '') : '') + '"></div>'

        +     '<div class="field"><label>👥 افراد (چندگانه)</label>'
        +       '<div style="display:flex;gap:6px;margin-bottom:8px">'
        +         '<select id="evt-person-select" style="flex:1;padding:9px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit">' + personOptions + '</select>'
        +         '<button type="button" id="evt-person-add" style="padding:0 14px;background:var(--primary);color:#fff;border:none;border-radius:10px;font-weight:800;cursor:pointer">+ افزودن</button>'
        +       '</div>'
        +       '<div id="evt-persons-chips" style="display:flex;flex-wrap:wrap;gap:6px;min-height:26px">' + personsChips + '</div>'
        +     '</div>'

        +     '<div class="field"><label>📝 توضیحات</label>'
        +       '<textarea id="evt-desc" rows="3" style="width:100%;padding:9px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit">' + (ev ? esc(ev.desc || '') : '') + '</textarea></div>'

        +     '<div id="evt-recurrence-box"></div>'

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
    setTimeout(function () {
        if (typeof attachDatePickers === 'function') attachDatePickers();
    }, 80);

    renderRecurrenceUI41(recurrence, curDate);

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
        if (typeof openTimePicker === 'function') {
            openTimePicker(function (t) {
                document.getElementById('evt-start-time').value = t;
            }, document.getElementById('evt-start-time').value || '21:00');
        }
    };
    document.getElementById('evt-end-clock').onclick = function () {
        if (typeof openTimePicker === 'function') {
            openTimePicker(function (t) {
                document.getElementById('evt-end-time').value = t;
            }, document.getElementById('evt-end-time').value || '21:00');
        }
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
            return '<span data-pid="' + pid + '" style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;background:#dbeafe;color:#1e40af;border-radius:14px;font-size:.78rem;font-weight:800">'
                 + (pr.first || '') + ' ' + (pr.last || '')
                 + ' <button type="button" style="background:none;border:none;color:#dc2626;cursor:pointer;font-weight:900" data-rm="' + pid + '">×</button></span>';
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
        var o = document.getElementById('evt-overlay');
        if (o) o.remove();
        var m = document.getElementById('evt-modal');
        if (m) m.remove();
    }
    document.getElementById('evt-close').onclick = close;
    document.getElementById('evt-cancel').onclick = close;
    document.getElementById('evt-overlay').onclick = close;

    document.getElementById('evt-save').onclick = function () {
        var title = document.getElementById('evt-title').value.trim();
        var sd = normalizeDigits(document.getElementById('evt-start-date').value.trim());
        var st = (typeof toEnTime === 'function'
                ? toEnTime(document.getElementById('evt-start-time').value.trim())
                : document.getElementById('evt-start-time').value.trim()) || '21:00';
        var ed = normalizeDigits(document.getElementById('evt-end-date').value.trim()) || sd;
        var et = (typeof toEnTime === 'function'
                ? toEnTime(document.getElementById('evt-end-time').value.trim())
                : document.getElementById('evt-end-time').value.trim()) || st;
        var loc = document.getElementById('evt-location').value.trim();
        var desc = document.getElementById('evt-desc').value.trim();
        var rem = Math.max(0, Number(document.getElementById('evt-rem').value) || 0);

        var newRec = collectRecurrenceFromUI41(recurrence);

        if (!title) { alert('عنوان اجباری'); return; }
        if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(sd)) { alert('تاریخ شروع نامعتبر'); return; }
        if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(ed)) { alert('تاریخ پایان نامعتبر'); return; }

        var list = calLoadUserEvents();

        if (scope === 'this' && ev && ev.rawId) {
            var overrides = DB.load('calendarRecOverrides', {});
            if (!overrides[ev.rawId]) overrides[ev.rawId] = {};
            overrides[ev.rawId][ev.date] = {
                modified: {
                    title: title, cat: selectedCat,
                    time: st, endTime: et,
                    desc: desc, location: loc,
                    persons: persons.slice(), reminder: rem
                }
            };
            DB.save('calendarRecOverrides', overrides);

        } else if (scope === 'future' && ev && ev.rawId) {
            var master = list.find(function (x) { return x.id === ev.rawId; });
            if (master) {
                var dayBefore = addJalaliDays(ev.date, -1);
                if (master.recurrence) {
                    master.recurrence.ends = 'on';
                    master.recurrence.until = dayBefore;
                }
                if (dayBefore < (master.startDate || master.date)) {
                    list = list.filter(function (x) { return x.id !== ev.rawId; });
                }
            }
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
            var existing = null;
            if (ev && ev.rawId) existing = list.find(function (x) { return x.id === ev.rawId; });
            else if (ev && ev.id) existing = list.find(function (x) { return x.id === ev.id; });

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
        calRender();
        if (typeof updateHomeWidgets === 'function') {
            try { updateHomeWidgets(); } catch (e) {}
        }
        var scopeMsg = scope === 'this' ? ' (فقط این رویداد)'
                     : scope === 'future' ? ' (این و بعدی)'
                     : scope === 'all' ? ' (همه)' : '';
        showToast('✅ رویداد ذخیره شد' + scopeMsg);
    };

    if (ev) {
        document.getElementById('evt-delete').onclick = function () {
            var isRecurring = ev.recurrence && ev.recurrence.freq && ev.recurrence.freq !== 'none';
            if (isRecurring && !scope && ev.rawId) {
                var rawList = calLoadUserEvents();
                var master = rawList.find(function (x) { return x.id === ev.rawId; });
                if (master) {
                    showScopeDialog41(master, ev.date, ev.time, function (sc) {
                        doDelete(sc);
                    });
                    return;
                }
            }
            doDelete(scope || 'all');
        };

        function doDelete(sc) {
            if (!confirm('حذف شود؟')) return;
            var list = calLoadUserEvents();

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
                var idToDel = ev.rawId || ev.id;
                list = list.filter(function (x) { return x.id !== idToDel; });
                DB.save('calendarUserEvents', list);

                var ov2 = DB.load('calendarRecOverrides', {});
                delete ov2[idToDel];
                DB.save('calendarRecOverrides', ov2);
            }

            close();
            calRender();
            if (typeof updateHomeWidgets === 'function') {
                try { updateHomeWidgets(); } catch (e) {}
            }
            showToast('🗑 حذف شد');
        }
    }
}

/* ============================================================
   بخش ۲۲ — UI تکرار داخل مودال
   ============================================================ */
function renderRecurrenceUI41(rec, startDate) {
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

    html += '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">';
    html += '<span style="font-size:.85rem;font-weight:700">تکرار در هر</span>';
    html += '<input type="number" id="rec-interval" min="1" max="99" value="' + (rec.interval || 1) + '" style="width:70px;padding:9px;border:1.5px solid var(--border);border-radius:10px;text-align:center;font-weight:800;font-family:inherit">';
    html += '<select id="rec-freq" style="flex:1;min-width:130px;padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-weight:700;background:#fff">';
    freqOpts.forEach(function (o) {
        html += '<option value="' + o.v + '"' + (rec.freq === o.v ? ' selected' : '') + '>' + o.l + '</option>';
    });
    html += '</select></div>';

    html += '<div id="rec-weekdays-row" style="display:' + (rec.freq === 'weekly' ? 'block' : 'none') + ';margin-bottom:12px">';
    html += '<div style="font-size:.78rem;font-weight:800;color:var(--text-muted);margin-bottom:8px">تکرار در روزهای:</div>';
    html += '<div style="display:flex;gap:6px;justify-content:space-between;flex-wrap:wrap">';
    var curWds = rec.weekDays || [];
    var WEEK_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
    WEEK_SHORT.forEach(function (wd, i) {
        var active = curWds.indexOf(i) !== -1;
        html += '<button type="button" class="rec-wd-btn" data-wd="' + i + '" '
             +  'style="width:44px;height:44px;border-radius:50%;border:2px solid ' + (active ? '#dc2626' : 'var(--border)') + ';'
             +  'background:' + (active ? 'linear-gradient(135deg,#ef4444,#dc2626)' : '#fff') + ';'
             +  'color:' + (active ? '#fff' : 'var(--text)') + ';font-family:inherit;font-size:1rem;font-weight:900;cursor:pointer">' + wd + '</button>';
    });
    html += '</div></div>';

    var startDayNum = Number(startDate.split('/')[2]) || 1;
    html += '<div id="rec-monthly-row" style="display:' + (rec.freq === 'monthly' ? 'block' : 'none') + ';margin-bottom:12px">';
    html += '<div style="font-size:.78rem;font-weight:800;color:var(--text-muted)">ماهانه در روز ' + toFa(rec.monthlyDay || startDayNum) + ' ام هر ماه</div>';
    html += '</div>';

    var endsVal = rec.ends || 'never';
    html += '<div style="border-top:1px dashed var(--border);padding-top:12px;margin-top:12px">';
    html += '<div style="font-size:.78rem;font-weight:900;color:var(--text-muted);margin-bottom:8px">پایان</div>';

    html += '<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#fff;border:1.5px solid ' + (endsVal === 'never' ? '#3b82f6' : 'var(--border)') + ';border-radius:10px;cursor:pointer;margin-bottom:6px;font-size:.85rem;font-weight:700">';
    html += '<input type="radio" name="rec-ends" value="never" ' + (endsVal === 'never' ? 'checked' : '') + ' style="accent-color:#3b82f6"><span>هرگز</span></label>';

    html += '<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#fff;border:1.5px solid ' + (endsVal === 'on' ? '#3b82f6' : 'var(--border)') + ';border-radius:10px;cursor:pointer;margin-bottom:6px;font-size:.85rem;font-weight:700">';
    html += '<input type="radio" name="rec-ends" value="on" ' + (endsVal === 'on' ? 'checked' : '') + ' style="accent-color:#3b82f6"><span>در تاریخ</span>';
    html += '<input type="text" id="rec-until" class="date-picker" dir="ltr" value="' + (rec.until || '') + '" placeholder="YYYY/MM/DD" style="flex:1;min-width:120px;padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-family:monospace;direction:ltr;text-align:center">';
    html += '</label>';

    html += '<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#fff;border:1.5px solid ' + (endsVal === 'after' ? '#3b82f6' : 'var(--border)') + ';border-radius:10px;cursor:pointer;font-size:.85rem;font-weight:700">';
    html += '<input type="radio" name="rec-ends" value="after" ' + (endsVal === 'after' ? 'checked' : '') + ' style="accent-color:#3b82f6"><span>بعد از</span>';
    html += '<input type="number" id="rec-count" min="1" max="999" value="' + (rec.count || 10) + '" style="width:70px;padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-family:inherit;text-align:center;font-weight:800"><span>تکرار</span>';
    html += '</label>';

    html += '</div>';
    html += '</div>';

    box.innerHTML = html;

    var freqSel = document.getElementById('rec-freq');
    var wdRow = document.getElementById('rec-weekdays-row');
    var moRow = document.getElementById('rec-monthly-row');

    freqSel.onchange = function () {
        var f = this.value;
        wdRow.style.display = (f === 'weekly') ? 'block' : 'none';
        moRow.style.display = (f === 'monthly') ? 'block' : 'none';
        rec.freq = f;
    };

    document.querySelectorAll('.rec-wd-btn').forEach(function (b) {
        b.onclick = function () {
            var active = this.style.background.indexOf('rgb(239, 68, 68)') !== -1
                      || this.style.background.indexOf('#dc2626') !== -1;
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

function collectRecurrenceFromUI41(prevRec) {
    var freqSel = document.getElementById('rec-freq');
    var newRec = { freq: freqSel ? freqSel.value : 'none' };

    if (newRec.freq !== 'none') {
        newRec.interval = Math.max(1, Number(document.getElementById('rec-interval').value) || 1);

        if (newRec.freq === 'weekly') {
            var wds = [];
            document.querySelectorAll('.rec-wd-btn').forEach(function (b, i) {
                var active = b.style.background.indexOf('rgb(239, 68, 68)') !== -1
                          || b.style.background.indexOf('#dc2626') !== -1;
                if (active) wds.push(i);
            });
            newRec.weekDays = wds;
        }

        if (newRec.freq === 'monthly') {
            newRec.monthlyMode = 'day';
            var sd = normalizeDigits(document.getElementById('evt-start-date').value.trim());
            newRec.monthlyDay = Number(sd.split('/')[2]) || 1;
        }

        var endsRadio = document.querySelector('input[name="rec-ends"]:checked');
        newRec.ends = endsRadio ? endsRadio.value : 'never';

        if (newRec.ends === 'on') {
            newRec.until = normalizeDigits(document.getElementById('rec-until').value.trim());
        }
        if (newRec.ends === 'after') {
            newRec.count = Math.max(1, Number(document.getElementById('rec-count').value) || 10);
        }
        newRec.exdates = (prevRec && prevRec.exdates) ? prevRec.exdates.slice() : [];
    }
    return newRec;
}

/* ============================================================
   بخش ۲۳ — مدیریت دسته‌بندی‌ها
   ============================================================ */
window.openCategoriesManager = function () {
    var old = document.getElementById('cat-mgr-modal');
    if (old) old.remove();
    var oldO = document.getElementById('cat-mgr-overlay');
    if (oldO) oldO.remove();

    document.body.insertAdjacentHTML('beforeend',
        '<div id="cat-mgr-overlay" class="overlay show" style="z-index:880"></div>'
      + '<div id="cat-mgr-modal" class="modal show" style="max-width:520px;z-index:885">'
      +   '<div class="modal-head"><h2>🎨 مدیریت دسته‌بندی‌ها</h2><button id="cat-mgr-close" class="close-btn">×</button></div>'
      +   '<div class="modal-body" id="cat-mgr-body"></div>'
      +   '<div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end">'
      +     '<button id="cat-mgr-cancel" class="btn-secondary">انصراف</button>'
      +     '<button id="cat-mgr-save" class="btn-primary">💾 ذخیره</button>'
      +   '</div></div>');

    var cur = uCats41().slice();

    function rb() {
        var h = '<div style="display:flex;flex-direction:column;gap:10px">';
        cur.forEach(function (c, i) {
            h += '<div style="display:flex;gap:8px;align-items:center;padding:10px;background:var(--card-alt);border-radius:10px;border:1px solid var(--border)">'
               + '<input type="color" value="' + c.color + '" data-i="' + i + '" data-f="color" style="width:44px;height:40px;border:none;background:none;cursor:pointer;padding:0">'
               + '<input type="text" value="' + esc(c.icon) + '" data-i="' + i + '" data-f="icon" style="width:54px;padding:8px;text-align:center;font-size:1.15rem;border:1px solid var(--border);border-radius:8px;background:#fff;font-family:inherit">'
               + '<input type="text" value="' + esc(c.label) + '" data-i="' + i + '" data-f="label" style="flex:1;padding:9px 12px;border:1px solid var(--border);border-radius:8px;background:#fff;font-family:inherit;font-weight:700;font-size:.85rem">'
               + '<button class="cd" data-i="' + i + '" style="background:#fee2e2;color:#dc2626;border:none;width:38px;height:38px;border-radius:9px;font-size:1.2rem;cursor:pointer;font-weight:800">×</button>'
               + '</div>';
        });
        h += '</div><button id="cat-mgr-add" style="width:100%;margin-top:12px;padding:12px;background:var(--primary-soft);color:var(--primary-dark);border:1.5px dashed var(--primary);border-radius:11px;font-family:inherit;font-weight:800;cursor:pointer;font-size:.88rem">+ افزودن دسته جدید</button>';
        document.getElementById('cat-mgr-body').innerHTML = h;

        var b = document.getElementById('cat-mgr-body');
        b.querySelectorAll('input[data-f]').forEach(function (x) {
            x.addEventListener('input', function () {
                var i = +this.getAttribute('data-i');
                var f = this.getAttribute('data-f');
                if (cur[i]) cur[i][f] = this.value;
            });
        });
        b.querySelectorAll('.cd').forEach(function (x) {
            x.addEventListener('click', function () {
                var i = +this.getAttribute('data-i');
                if (cur.length <= 1) { alert('حداقل یک دسته باید بماند.'); return; }
                if (!confirm('حذف شود؟')) return;
                cur.splice(i, 1);
                rb();
            });
        });
        document.getElementById('cat-mgr-add').onclick = function () {
            cur.push({ key: 'cat_' + Date.now(), label: 'دسته جدید', color: '#6366f1', icon: '📌' });
            rb();
        };
    }
    rb();

    function close() {
        var o = document.getElementById('cat-mgr-overlay');
        if (o) o.remove();
        var m = document.getElementById('cat-mgr-modal');
        if (m) m.remove();
    }
    document.getElementById('cat-mgr-close').onclick = close;
    document.getElementById('cat-mgr-cancel').onclick = close;
    document.getElementById('cat-mgr-overlay').onclick = close;
    document.getElementById('cat-mgr-save').onclick = function () {
        for (var i = 0; i < cur.length; i++) {
            if (!cur[i].label.trim()) { alert('عنوان خالی است.'); return; }
        }
        sUCats41(cur);
        close();
        rebuildCalCats41();
        showToast('✅ ذخیره شد');
        calRender();
    };
};

/* ============================================================
   بخش ۲۴ — اشتراک‌گذاری روز
   ============================================================ */
function shareDayEvents41() {
    var ds = CAL41.cursor.y + '/' + pad2(CAL41.cursor.m) + '/' + pad2(CAL41.cursor.d);
    var all = calBuildAllEvents();
    var dayEvs = all.filter(function (e) { return e.date === ds; });

    if (dayEvs.length === 0) {
        showToast('رویدادی برای این روز نیست');
        return;
    }
    dayEvs.sort(function (a, b) { return (a.time || '').localeCompare(b.time || ''); });

    var gd = jalaliToGregorian(CAL41.cursor.y, CAL41.cursor.m, CAL41.cursor.d);
    var dt = new Date(gd[0], gd[1] - 1, gd[2]);

    var text = '📅 ' + WEEKDAYS_FA[dt.getDay()] + '، '
             + toFa(CAL41.cursor.d) + ' ' + JALALI_MONTHS[CAL41.cursor.m - 1] + ' '
             + toFa(CAL41.cursor.y) + '\n\n';

    dayEvs.forEach(function (e) {
        var cat = (window.CAL_CATS && window.CAL_CATS[e.cat]) || { icon: '📌' };
        text += cat.icon + ' ' + (e.time ? toFaTime(e.time) + ' — ' : '') + e.title;
        if (e.location) text += ' | 📍 ' + e.location;
        text += '\n';
    });

    if (navigator.share) {
        navigator.share({ title: 'رویدادهای ' + toFa(CAL41.cursor.d), text: text }).catch(function () {});
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text)
            .then(function () { showToast('📋 کپی شد'); })
            .catch(function () { prompt('متن:', text); });
    } else {
        prompt('متن:', text);
    }
}

/* ============================================================
   بخش ۲۵ — اطمینان از وجود صفحه تقویم
   ============================================================ */
function calEnsurePage() {
    if (!document.getElementById('page-jalali-calendar')) {
        var main = document.querySelector('main.content');
        if (main) {
            var sec = document.createElement('section');
            sec.id = 'page-jalali-calendar';
            sec.className = 'page';
            main.appendChild(sec);
        }
    }

    var navOps = document.querySelector('[data-nav-group="ops"] .nav-group-items');
    if (navOps) {
        var existing = navOps.querySelector('[data-page="jalali-calendar"]');
        if (!existing) {
            var b = document.createElement('button');
            b.setAttribute('data-page', 'jalali-calendar');
            b.textContent = '📅 مدیریت تقویم';
            navOps.appendChild(b);
        } else {
            existing.textContent = '📅 مدیریت تقویم';
        }
    }
}

/* ============================================================
   بخش ۲۶ — Init
   ============================================================ */
(function bootCal41() {
    function init() {
        calEnsurePage();

        if (!window._cal41Patched && typeof window.goToPage === 'function') {
            window._cal41Patched = true;
            var orig = window.goToPage;
            window.goToPage = function (name) {
                orig.apply(this, arguments);
                if (name === 'jalali-calendar') setTimeout(calRender, 80);
            };
        }

        var page = document.getElementById('page-jalali-calendar');
        if (page && page.classList.contains('active')) {
            calRender();
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 1500); });
    } else {
        setTimeout(init, 1500);
    }
    setTimeout(init, 3500);
})();

/* ============================================================
   بخش ۲۷ — پچ z-index تقویم داخل مودال
   ============================================================ */
(function fixCalendarZIndexInModal() {
    if (window._calZFix41) return;
    window._calZFix41 = true;

    function patch() {
        if (typeof window.openCalendar !== 'function') {
            setTimeout(patch, 500);
            return;
        }

        var _origOpen = window.openCalendar;
        window.openCalendar = function (input) {
            var maxZ = 0;
            var el = input;
            while (el && el !== document.body) {
                var cs = window.getComputedStyle(el);
                var z = parseInt(cs.zIndex, 10);
                if (!isNaN(z) && z > maxZ) maxZ = z;
                el = el.parentElement;
            }

            _origOpen.apply(this, arguments);

            var popup = document.getElementById('cal-popup');
            var overlay = document.getElementById('cal-overlay');
            if (maxZ >= 300) {
                var targetZ = maxZ + 200;
                if (overlay) overlay.style.zIndex = String(targetZ);
                if (popup) popup.style.zIndex = String(targetZ + 1);
            } else {
                if (overlay) overlay.style.zIndex = '';
                if (popup) popup.style.zIndex = '';
            }
        };

        if (typeof window.closeCalendar === 'function') {
            var _origClose = window.closeCalendar;
            window.closeCalendar = function () {
                _origClose.apply(this, arguments);
                var popup = document.getElementById('cal-popup');
                var overlay = document.getElementById('cal-overlay');
                if (popup) popup.style.zIndex = '';
                if (overlay) overlay.style.zIndex = '';
            };
        }
    }
    patch();
})();

/* ============================================================
   صادرسازی نهایی
   ============================================================ */
window.CAL41                       = CAL41;
window.DEF_CATS_41                 = DEF_CATS_41;
window.SYS_CATS_41                 = SYS_CATS_41;
window.uCats41                     = uCats41;
window.sUCats41                    = sUCats41;
window.rebuildCalCats41            = rebuildCalCats41;
window.calLoadUserEvents           = calLoadUserEvents;
window.calSaveUserEvents           = calSaveUserEvents;
window.makeOccurrence41            = makeOccurrence41;
window.normalizeRec41              = normalizeRec41;
window.expandRec41                 = expandRec41;
window.calBuildAllEvents           = calBuildAllEvents;
window.invalidateCalEventCache     = invalidateCalEventCache;
window.calRenderMonth41            = calRenderMonth41;
window.calRenderMultiDay41         = calRenderMultiDay41;
window.renderCalTimeline           = renderCalTimeline;
window.renderCalDateStrip          = renderCalDateStrip;
window.renderCalDayView            = renderCalDayView;
window.renderCalAgendaView         = renderCalAgendaView;
window.buildCalTitle41             = buildCalTitle41;
window.calRender                   = calRender;
window.calRenderBodyOnly           = calRenderBodyOnly;
window.bindCalEvents41             = bindCalEvents41;
window.bindCalBodyEvents           = bindCalBodyEvents;
window.navigateCal41               = navigateCal41;
window.handleEventClick41          = handleEventClick41;
window.showScopeDialog41           = showScopeDialog41;
window.setupCalDayTimeline         = setupCalDayTimeline;
window.openEventModal41            = openEventModal41;
window.renderRecurrenceUI41        = renderRecurrenceUI41;
window.collectRecurrenceFromUI41   = collectRecurrenceFromUI41;
window.shareDayEvents41            = shareDayEvents41;
window.calEnsurePage               = calEnsurePage;

console.log('✅ [modules/calendar.js] loaded — 4 parts complete');
