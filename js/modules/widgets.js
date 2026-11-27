/* ============================================================
   پارسیس — ویجت‌های صفحه اصلی
   مسیر: js/modules/widgets.js
   
   ✅ v2: ویجت تولدها
     • نمایش سن به سال/ماه/روز زیر نام شخص
     • فیلتر کردن بر اساس showInBirthdayWidget
   ============================================================ */
'use strict';

(function injectChecklistWidgetCss() {
    if (document.getElementById('cl-widget-style')) return;
    var s = document.createElement('style');
    s.id = 'cl-widget-style';
    s.textContent = ''
    + '@font-face { font-family: "B Titr"; src: local("B Titr"), local("BTitr"), local("BTitrBold"); }'
    + '.cl-widget-note-title {'
    +   'font-family: "B Titr", "BTitr", "B Nazanin", Tahoma, sans-serif;'
    +   'font-weight: 900;'
    +   'color: var(--primary-dark);'
    +   'font-size: 0.9rem;'
    +   'letter-spacing: -0.2px;'
    +   'margin-left: 2px;'
    + '}'
    + '.cl-widget-sep {'
    +   'color: var(--text-muted);'
    +   'margin: 0 6px;'
    +   'font-weight: 700;'
    +   'font-family: "B Titr", Tahoma, sans-serif;'
    + '}';
    document.head.appendChild(s);
})();

function applyWidgetVisibility() {
    var cards = document.querySelectorAll('.widget-card');
    for (var i = 0; i < cards.length; i++) {
        var w = cards[i].getAttribute('data-widget');
        var enabled = !!state.widgets[w];
        var pageOk = (state.widgetPages[w] || 1) === state.homePage;
        cards[i].classList.toggle('widget-hidden', !enabled || !pageOk);
    }

    var cbs = document.querySelectorAll('[data-widget-toggle]');
    for (var j = 0; j < cbs.length; j++) {
        var k = cbs[j].getAttribute('data-widget-toggle');
        cbs[j].checked = !!state.widgets[k];
    }

    if (typeof renderHomePageTabs === 'function') renderHomePageTabs();
    if (typeof renderHomePageDots === 'function') renderHomePageDots();
}

function applyWidgetOrder() {
    var grid = document.getElementById('home-grid');
    if (!grid) return;
    var order = state.widgetOrder || [];
    order.forEach(function (key) {
        var card = grid.querySelector('.widget-card[data-widget="' + key + '"]');
        if (card) grid.appendChild(card);
    });
}

function renderWidgetOrderUI() {
    var box = document.getElementById('widget-order-list');
    if (!box) return;

    var names = {
        calendar: '📅 تقویم هفتگی',
        calendarNext3: '📅 ۳ روز آتی',
        calendarDay: '📆 روز جاری',
        calendarAgenda: '📋 دستورکار',
        todayChecklistPersonal: '⭐ چک‌لیست شخصی',
        todayChecklistFamily: '🏠 چک‌لیست خانواده',
        todayChecklistWork: '💼 چک‌لیست شغلی',
        bankTotal: '🏦 مانده کل بانک',
        bankBalances: '🏦 مانده حساب های بانکی',
        cashBalances: '💰 صندوق‌ها',
        upcomingInstallments: '⏰ اقساط ۳ روز آینده',
        birthdays: '🎂 تولدها',
        liveRates: '💱 نرخ لحظه‌ای ارز و طلا (ریال)',
        tgjuRates: '💱 نرخ لحظه‌ای ارز و طلا (TGJU)'
    };

    var order = state.widgetOrder || [];
    var MAX_PAGES = typeof MAX_HOME_PAGES !== 'undefined' ? MAX_HOME_PAGES : 4;
    box.innerHTML = '';

    order.forEach(function (key, idx) {
        var row = document.createElement('div');
        row.className = 'widget-order-row';
        var curPage = state.widgetPages[key] || 1;

        var sel = '<select class="wo-page" data-widget-page="' + key + '">';
        for (var p = 1; p <= MAX_PAGES; p++) {
            sel += '<option value="' + p + '"' + (curPage === p ? ' selected' : '') + '>صفحه ' + toFa(p) + '</option>';
        }
        sel += '</select>';

        var checked = state.widgets[key] ? 'checked' : '';

        row.innerHTML =
            '<label class="wo-name" style="display:flex;align-items:center;gap:6px;cursor:pointer;flex:1;min-width:0">'
            + '<input type="checkbox" data-widget-check="' + key + '" ' + checked + ' style="width:17px;height:17px;accent-color:var(--primary);flex-shrink:0">'
            + '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (names[key] || key) + '</span>'
            + '</label>' + sel
            + '<div class="wo-btns">'
            + '<button class="wo-btn" data-key="' + key + '" data-dir="-1"' + (idx === 0 ? ' disabled' : '') + '>↑</button>'
            + '<button class="wo-btn" data-key="' + key + '" data-dir="1"' + (idx === order.length - 1 ? ' disabled' : '') + '>↓</button>'
            + '</div>';

        box.appendChild(row);
    });

    box.querySelectorAll('.wo-btn').forEach(function (b) {
        b.addEventListener('click', function () {
            var key = this.getAttribute('data-key');
            var dir = Number(this.getAttribute('data-dir'));
            var arr = state.widgetOrder.slice();
            var i = arr.indexOf(key);
            var j = i + dir;
            if (j < 0 || j >= arr.length) return;
            var tmp = arr[i];
            arr[i] = arr[j];
            arr[j] = tmp;
            state.widgetOrder = arr;
            DB.save(LS_KEYS.WIDGET_ORDER, arr);
            updateHomeWidgets();
            renderWidgetOrderUI();
        });
    });

    box.querySelectorAll('[data-widget-page]').forEach(function (s) {
        s.addEventListener('change', function () {
            var key = this.getAttribute('data-widget-page');
            state.widgetPages[key] = Number(this.value);
            DB.save(LS_KEYS.WIDGET_PAGES, state.widgetPages);
            updateHomeWidgets();
        });
    });

    box.querySelectorAll('[data-widget-check]').forEach(function (cb) {
        cb.addEventListener('change', function () {
            var key = this.getAttribute('data-widget-check');
            state.widgets[key] = this.checked;
            DB.save(LS_KEYS.WIDGETS, state.widgets);
            updateHomeWidgets();
            applyWidgetVisibility();
        });
    });
}

function getBankBalance(bankId) {
    var vouchers = DB.load('vouchers', []);
    var total = 0;
    vouchers.forEach(function (v) {
        (v.lines || []).forEach(function (line) {
            if (line.details && line.details.bank === bankId) {
                total += (Number(line.debit) || 0) - (Number(line.credit) || 0);
            }
        });
    });
    return total;
}

function getCashBoxBalance(cbId) {
    var vouchers = DB.load('vouchers', []);
    var total = 0;
    vouchers.forEach(function (v) {
        (v.lines || []).forEach(function (line) {
            if (line.details && line.details.cashbox === cbId) {
                total += (Number(line.debit) || 0) - (Number(line.credit) || 0);
            }
        });
    });
    return total;
}

function isVisibleInDash(item) {
    if (!item) return false;
    if (typeof item.showInDash === 'undefined') return true;
    return item.showInDash !== false;
}

function getBirthdayInfo(birthStr) {
    if (!birthStr) return null;
    var parts = normalizeDigits(birthStr).split('/').map(Number);
    if (parts.length !== 3 || isNaN(parts[1]) || isNaN(parts[2])) return null;

    var bM = parts[1], bD = parts[2];
    if (bM < 1 || bM > 12 || bD < 1 || bD > 31) return null;

    var today = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    var tY = today[0], tM = today[1], tD = today[2];

    var dimThis = daysInJalaliMonth(tY, bM);
    if (bD > dimThis) return null;

    var daysThis = jalaliDiff(tY, tM, tD, tY, bM, bD);
    var birthYear;
    if (daysThis >= 0) {
        birthYear = tY;
    } else {
        birthYear = tY + 1;
        var dimN = daysInJalaliMonth(birthYear, bM);
        if (bD > dimN) return null;
    }

    var g = jalaliToGregorian(birthYear, bM, bD);
    var dt = new Date(g[0], g[1] - 1, g[2]);
    var dow = WEEKDAYS_FA[dt.getDay()];
    var daysRemaining = jalaliDiff(tY, tM, tD, birthYear, bM, bD);

    /* ✅ محاسبه سن به سال/ماه/روز */
    var ageText = '';
    if (typeof formatJalaliAge === 'function') {
        ageText = formatJalaliAge(birthStr);
    }

    return {
        birthMonth: bM,
        birthDay: bD,
        dow: dow,
        daysRemaining: daysRemaining,
        birthYear: birthYear,
        ageText: ageText   /* ✅ جدید */
    };
}

function updateHomeBankTotal() {
    var el = document.getElementById('home-bank-total');
    if (!el) return;

    var banks = DB.load('bankAccounts', []);
    var total = 0;
    for (var i = 0; i < banks.length; i++) {
        var b = banks[i];
        if (b.status === 'inactive' || b.active === false) continue;
        if (!isVisibleInDash(b)) continue;
        total += getBankBalance(b.id);
    }
    el.innerHTML = moneyHtml(total) + ' ' + currencyLabel();
}

/* ============================================================
   ویجت مانده حساب‌های بانکی
   ============================================================ */
function renderBankBalancesWidget() {
    var el = document.getElementById('home-bank-balances');
    if (!el) return;

    var banks = DB.load('bankAccounts', []);
    banks = banks.filter(isVisibleInDash);
    var allDash = banks.length;
    /* فقط حساب‌هایی که ستون «نمایش در ویجت» آن‌ها تیک خورده است */
    banks = banks.filter(function (b) { return b.showInBankWidget !== false; });
    if (banks.length === 0) {
        el.innerHTML = allDash > 0
            ? '<div class="widget-empty">🏦 همه حساب‌ها از نمایش در ویجت مستثنی شده‌اند.</div>'
            : '<div class="widget-empty">حساب بانکی برای نمایش ثبت نشده.</div>';
        return;
    }

    banks = banks.slice().sort(function (a, b) {
        var oa = Number(a.order) || 9999;
        var ob = Number(b.order) || 9999;
        if (oa !== ob) return oa - ob;
        return (a.bank || '').localeCompare(b.bank || '', 'fa');
    });

    var html = '', total = 0, shown = 0;
    for (var i = 0; i < banks.length; i++) {
        var b = banks[i];
        if (b.status === 'inactive' || b.active === false) continue;

        var bal = getBankBalance(b.id);
        var minBal = Number(b.minBalance) || 0;
        var deficit = bal - minBal;
        if (bal === 0 && minBal === 0) continue;

        shown++;
        total += bal;
        var cls = bal > 0 ? 'positive' : 'negative';
        var defCls = deficit < 0 ? 'negative' : 'positive';

        html += '<div class="balance-row">'
             +  '<div class="info">'
             +    '<div class="name">' + esc(b.bank || '—') + '</div>'
             +    '<div class="meta">'
             +      (b.branchName ? esc(b.branchName) + ' — ' : '')
             +      toFa(esc(b.iban || '—'))
             +    '</div>'
             +  '</div>'
             +  '<div class="amounts-grid">'
             +    '<div class="amt-cell"><span class="amt-lbl">مانده</span>'
             +      '<span class="amount ' + cls + '">' + moneyHtml(bal) + ' ' + currencyLabel() + '</span></div>'
             +    '<div class="amt-cell"><span class="amt-lbl">حداقل</span>'
             +      '<span class="amount">' + (minBal ? moneyHtml(minBal) : '—') + '</span></div>'
             +    '<div class="amt-cell"><span class="amt-lbl">(کسری) اضافی</span>'
             +      '<span class="amount ' + defCls + '">' + (minBal ? moneyHtml(deficit) : '—') + '</span></div>'
             +  '</div>'
             +  '</div>';
    }

    if (shown === 0) {
        el.innerHTML = '<div class="widget-empty">حساب با مانده غیرصفر نیست.</div>';
        return;
    }

    html += '<div class="balance-row balance-total">'
         +  '<div class="info"><div class="name">💰 جمع کل</div></div>'
         +  '<div class="amount">' + moneyHtml(total) + ' ' + currencyLabel() + '</div>'
         +  '</div>';

    el.innerHTML = html;
}

function renderCashBalancesWidget() {
    var el = document.getElementById('home-cash-balances');
    if (!el) return;

    var cbs = DB.load('cashBoxes', []);
    cbs = cbs.filter(isVisibleInDash);
    if (cbs.length === 0) {
        el.innerHTML = '<div class="widget-empty">صندوقی برای نمایش نیست.</div>';
        return;
    }

    cbs = cbs.slice().sort(function (a, b) {
        var oa = Number(a.order) || 9999;
        var ob = Number(b.order) || 9999;
        if (oa !== ob) return oa - ob;
        return (a.title || '').localeCompare(b.title || '', 'fa');
    });

    var html = '', total = 0, shown = 0;
    for (var i = 0; i < cbs.length; i++) {
        var c = cbs[i];
        if (c.status === 'inactive' || c.active === false) continue;

        var bal = getCashBoxBalance(c.id);
        if (bal === 0) continue;

        shown++;
        total += bal;
        var cls = bal > 0 ? 'positive' : 'negative';

        html += '<div class="balance-row">'
             +  '<div class="info">'
             +    '<div class="name">' + esc(c.title || '—') + '</div>'
             +    '<div class="meta">' + esc(c.type || '—')
             +      (c.unit ? ' — ' + esc(c.unit) : '') + '</div>'
             +  '</div>'
             +  '<div class="amount ' + cls + '">' + moneyHtml(bal) + ' ' + currencyLabel() + '</div>'
             +  '</div>';
    }

    if (shown === 0) {
        el.innerHTML = '<div class="widget-empty">صندوق با مانده غیرصفر نیست.</div>';
        return;
    }

    html += '<div class="balance-row balance-total">'
         +  '<div class="info"><div class="name">💰 جمع کل</div></div>'
         +  '<div class="amount">' + moneyHtml(total) + ' ' + currencyLabel() + '</div>'
         +  '</div>';

    el.innerHTML = html;
}

/* ============================================================
   ✅ ویجت تولدها — با نمایش سن و فیلتر نمایش
   ============================================================ */
function renderBirthdaysWidget() {
    var el = document.getElementById('home-birthdays');
    if (!el) return;

    var persons = DB.load('persons', []);
    var items = [];

    for (var i = 0; i < persons.length; i++) {
        var p = persons[i];
        if (!p.birth) continue;
        /* ✅ فیلتر جدید: فقط کسانی که تیک «نمایش در ویجت تولدها» دارند */
        if (p.showInBirthdayWidget === false) continue;
        if (!isVisibleInDash(p)) continue;
        var info = getBirthdayInfo(p.birth);
        if (!info) continue;
        items.push({ person: p, info: info });
    }

    if (items.length === 0) {
        el.innerHTML = '<div class="widget-empty">تاریخ تولدی برای نمایش نیست.</div>';
        return;
    }

    items.sort(function (a, b) {
        return a.info.daysRemaining - b.info.daysRemaining;
    });

    var html = '';
    for (var k = 0; k < items.length; k++) {
        var it = items[k];
        var p2 = it.person;
        var info2 = it.info;
        var dl, dc = '';

        if (info2.daysRemaining === 0) { dl = '🎉 امروز'; dc = 'today'; }
        else if (info2.daysRemaining === 1) { dl = 'فردا'; dc = 'soon'; }
        else if (info2.daysRemaining <= 7) { dl = toFa(info2.daysRemaining) + ' روز دیگر'; dc = 'soon'; }
        else { dl = toFa(info2.daysRemaining) + ' روز'; }

        var ds = toFa(pad2(info2.birthMonth)) + '/' + toFa(pad2(info2.birthDay));

        /* ✅ نمایش سن زیر نام */
        var ageHtml = '';
        if (info2.ageText) {
            ageHtml = '<div style="font-size:0.72rem;color:var(--text-muted);font-weight:500;margin-top:2px">'
                    + '🎂 ' + info2.ageText
                    + '</div>';
        }

        html += '<div class="birthday-row">'
             +  '<div class="name">' + esc(p2.first || '') + ' ' + esc(p2.last || '') + ageHtml + '</div>'
             +  '<div>' + ds + '</div>'
             +  '<div class="dow">' + info2.dow + '</div>'
             +  '<div class="days ' + dc + '">' + dl + '</div>'
             +  '</div>';
    }

    el.innerHTML = html;
}

/* ============================================================
   ✅ v2.7.3 — ویجت «تقویم هفتگی» صفحه اول (بازنویسی کامل)
   درخواست‌های کاربر در این نسخه:
     • ساعت لحظه‌ای (ثانیه‌شمار) در وسطِ بالای ویجت
     • روزهای تعطیل (جمعه + تعطیلات رسمی) کاملاً قرمز
     • نوار تعطیلات/رویدادهای هفته قابل اسکرول (ردیف‌های زیاد جا می‌شوند)
     • «و N رویداد دیگر…» دیگر مخفی‌کننده نیست: با کلیک، فهرست کاملِ
       رویدادهای همان هفته به‌صورت اسکرول‌شونده باز می‌شود («نمایش کمتر»)
     • تنظیمات «کدام تقویم در ویجت دیده شود» در صفحهٔ مدیریت تقویم
       (کلید ذخیره: calWidgetSettings) — روی ویجت وب + ویجت اندروید اعمال می‌شود
     • دادهٔ همین ویجت برای ویجت نیتیو اندروید و پس‌زمینهٔ قفل ساخته می‌شود
   ============================================================ */
window.__calWidgetOffset = window.__calWidgetOffset || 0;
window.__calWidgetExpanded = window.__calWidgetExpanded || false;

/* ---------- تنظیمات ویجت: کدام دسته‌ها نمایش داده شوند ---------- */
var CALW_DEF_SETTINGS = {
    holiday: true,      /* 🔴 تعطیلات رسمی ایران */
    iran: true,        /* 🇮🇷 رویدادهای تقویم ایران */
    world: true,       /* 🌐 رویدادهای جهانی */
    ancient: true,      /* 🏺 ایران باستان */
    userEvents: true,  /* رویدادهای ثبت‌شدهٔ خود کاربر */
    installment: true,  /* اقساط */
    source: true       /* دریافتنی‌ها */
};

function calwSettings() {
    var s = null;
    try { s = DB.load('calWidgetSettings', null); } catch (e) {}
    if (!s || typeof s !== 'object') s = {};
    var out = {};
    Object.keys(CALW_DEF_SETTINGS).forEach(function (k) {
        out[k] = (k in s) ? !!s[k] : CALW_DEF_SETTINGS[k];
    });
    return out;
}
window.calwSettings = calwSettings;

function calwSettingApplies(set, ev) {
    /* آیا این رویداد با تنظیمات ویجت دیده می‌شود؟ */
    if (ev.builtin) {
        return !!(set[ev.cat] !== false && (CALW_DEF_SETTINGS[ev.cat] === undefined ? true : set[ev.cat]));
    }
    if (ev.cat === 'installment' || ev.cat === 'source') return !!set[ev.cat];
    return !!set.userEvents;
}

/* ---------- ساخت دادهٔ مشترک ویجت (وب + نیتیو + پس‌زمینه) ---------- */
function buildCalendarWidgetData(weekOffset) {
    var now = new Date();
    var todayJ = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    var todayStr = todayJ[0] + '/' + pad2(todayJ[1]) + '/' + pad2(todayJ[2]);

    var anchor = new Date(now);
    anchor.setDate(now.getDate() + (weekOffset || 0) * 7);

    var jsDay = anchor.getDay();
    var offsetFromSat = (jsDay + 1) % 7;
    var satDate = new Date(anchor);
    satDate.setDate(anchor.getDate() - offsetFromSat);

    var aJ = toJalali(anchor.getFullYear(), anchor.getMonth() + 1, anchor.getDate());

    /* ---------- روزهای هفته ---------- */
    var FA_WD_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
    var days = [];
    var weekStartStr = '', weekEndStr = '';
    for (var i = 0; i < 7; i++) {
        var d = new Date(satDate);
        d.setDate(satDate.getDate() + i);
        var j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
        var ds = j[0] + '/' + pad2(j[1]) + '/' + pad2(j[2]);
        if (i === 0) weekStartStr = ds;
        if (i === 6) weekEndStr = ds;
        days.push({
            idx: i,
            name: FA_WD_SHORT[i],
            jd: toFa(j[2]),
            jdate: ds,
            gd: String(d.getDate()),
            gmonth: GREG_MONTHS[d.getMonth()],
            isToday: (ds === todayStr),
            isFriday: (d.getDay() === 5)
        });
    }

    /* ---------- رویدادهای همان هفته (تقسیم بر اساس تعطیل‌بودن روز) ---------- */
    var builtinEvents = [];
    try {
        if (window.ParsisCalendarEvents) {
            builtinEvents = window.ParsisCalendarEvents.getEventsInRange(weekStartStr, weekEndStr) || [];
        }
    } catch (eW1) {}

    var set = calwSettings();
    var weekEvents = [];

    builtinEvents.forEach(function (ev) {
        if (!calwSettingApplies(set, ev)) return;
        weekEvents.push({
            date: ev.date,
            cat: ev.cat,
            title: ev.title,
            isHoliday: ev.cat === 'holiday',
            builtin: true
        });
    });

    try {
        if (typeof calBuildAllEvents === 'function') {
            calBuildAllEvents().forEach(function (ev) {
                if (ev.builtin) return; /* پیش‌فرض‌ها بالا اضافه شدند */
                if (ev.date < weekStartStr || ev.date > weekEndStr) return;
                if (!calwSettingApplies(set, ev)) return;
                weekEvents.push({
                    date: ev.date,
                    cat: ev.cat,
                    title: ev.title,
                    time: ev.time || '',
                    isHoliday: false,
                    builtin: false
                });
            });
        }
    } catch (eW2) {}

    weekEvents.sort(function (a, b) {
        if (a.date === b.date) return String(a.time || '').localeCompare(String(b.time || ''));
        return a.date.localeCompare(b.date);
    });

    /* روزهای تعطیل = جمعه + هر روزِ دارای رویدادِ دستهٔ «تعطیلات رسمی» */
    var holidayDates = {};
    builtinEvents.forEach(function (ev) {
        if (ev.cat === 'holiday' && ev.date >= weekStartStr && ev.date <= weekEndStr) {
            holidayDates[ev.date] = true;
        }
    });
    days.forEach(function (dd) {
        dd.isHoliday = dd.isFriday || !!holidayDates[dd.jdate];
    });

    return {
        todayStr: todayStr,
        weekStartStr: weekStartStr,
        weekEndStr: weekEndStr,
        anchorJ: { y: aJ[0], m: aJ[1], d: aJ[2], wd: anchor.getDay() },
        anchorG: { y: anchor.getFullYear(), m: anchor.getMonth(), d: anchor.getDate() },
        days: days,
        events: weekEvents,
        settings: set
    };
}
window.buildCalendarWidgetData = buildCalendarWidgetData;

/* ---------- ساعت لحظه‌ای (فقط المان ساعت را به‌روز می‌کند) ---------- */
var _calwClockTimer = null;
function calwTickClock() {
    var el = document.getElementById('calw-clock');
    if (!el) return;
    var n = new Date();
    var hh = pad2(n.getHours()), mm = pad2(n.getMinutes()), ss = pad2(n.getSeconds());
    el.setAttribute('data-hh', hh);
    el.textContent = toFa(hh) + ':' + toFa(mm) + ':' + toFa(ss);
    /* اگر تاریخ عوض شده باشد (نیمه‌شب) کل ویجت تازه‌سازی می‌شود */
    var dateAttr = el.getAttribute('data-date');
    if (dateAttr && dateAttr !== n.toDateString()) {
        el.setAttribute('data-date', n.toDateString());
        if ((window.__calWidgetOffset || 0) === 0) renderCalendarWidget();
    }
}
function calwStartClock() {
    if (_calwClockTimer) clearInterval(_calwClockTimer);
    calwTickClock();
    _calwClockTimer = setInterval(calwTickClock, 1000);
}

/* ---------- رندر ویجت ---------- */
function renderCalendarWidget() {
    var el = document.getElementById('home-cal-widget');
    if (!el) return;

    var weekOffset = window.__calWidgetOffset || 0;
    var expanded = !!window.__calWidgetExpanded;
    var data = buildCalendarWidgetData(weekOffset);
    var aJ = data.anchorJ;
    var aG = data.anchorG;

    var html = '';

    /* ---------- ساعت لحظه‌ای — وسطِ بالای ویجت ---------- */
    /* data-date باید از ابتدا ست شود تا calwTickClock در نبودش، بی‌نهایت رندر نکند */
    var nowR = new Date();
    html += '<div class="calw-clock-row">'
         +  '<div class="calw-clock" id="calw-clock" data-date="' + nowR.toDateString() + '">--:--:--</div>'
         +  '</div>';

    /* ---------- سربرگ: تاریخ شمسی + میلادی + فلش‌ها ---------- */
    html += '<div class="calw-head">';
    html += '<button type="button" class="calw-nav" id="calw-prev" title="هفته قبل">‹</button>';
    html += '<div class="calw-dates">';
    html += '<div class="calw-j">' + WEEKDAYS_FA[aJ.wd] + ' ' + toFa(aJ.d) + ' ' + JALALI_MONTHS[aJ.m - 1] + ' ' + toFa(aJ.y) + '</div>';
    html += '<div class="calw-g">' + WEEKDAYS_FA[aJ.wd] + ' ' + toFa(aG.d) + ' ' + GREG_MONTHS[aG.m] + ' ' + toFa(aG.y) + '</div>';
    html += '</div>';
    html += '<button type="button" class="calw-nav" id="calw-next" title="هفته بعد">›</button>';
    html += '</div>';
    if (weekOffset !== 0) {
        html += '<button type="button" class="calw-today-btn" id="calw-today">این هفته</button>';
    }

    /* ---------- روزهای هفته (تعطیل = کاملاً قرمز) ---------- */
    html += '<div class="cal-week-grid">';
    data.days.forEach(function (dd) {
        var cls = 'cal-week-day'
                + (dd.isToday ? ' today' : '')
                + (dd.isHoliday ? ' holiday' : '');
        html += '<div class="' + cls + '" data-date="' + dd.jdate + '">';
        html += '<div class="cwd-name">' + dd.name + '</div>';
        html += '<div class="cwd-circle">' + dd.jd + '</div>';
        html += '<div class="cwd-square">' + dd.gd + '</div>';
        html += '</div>';
    });
    html += '</div>';

    /* ---------- تعطیلات و رویدادهای هفته — قابل اسکرول ---------- */
    var evs = data.events;
    html += '<div class="calw-events-wrap">';
    html += '<div class="calw-events-title">تعطیلات و رویدادهای این هفته (' + toFa(evs.length) + ')</div>';
    html += '<div class="calw-events" id="calw-events">';

    if (evs.length === 0) {
        html += '<div class="calw-ev-row calw-empty">— تعطیلی یا رویداد ویژه‌ای در این هفته نیست</div>';
    } else {
        var showCount = expanded ? evs.length : Math.min(evs.length, 6);
        for (var ei = 0; ei < showCount; ei++) {
            var ev = evs[ei];
            var dd = ev.date.split('/');
            var timeTxt = ev.time ? ' <span class="calw-ev-time">' + toFaTime(ev.time) + '</span>' : '';
            html += '<div class="calw-ev-row' + (ev.isHoliday ? ' hol' : '') + '">'
                 +  '<span class="calw-ev-date">' + toFa(dd[2]) + ' ' + JALALI_MONTHS[Number(dd[1]) - 1] + '</span>'
                 +  '<span class="calw-ev-title">' + esc(ev.title) + timeTxt + '</span>'
                 +  '</div>';
        }
        if (!expanded && evs.length > 6) {
            /* ✅ v2.7.3 — این دکمه دیگر فقط اطلاع‌رسان نیست؛ فهرست کامل را باز می‌کند */
            html += '<button type="button" class="calw-more" id="calw-more-btn">'
                 +  'و ' + toFa(evs.length - 6) + ' رویداد دیگر در این هفته — برای دیدنِ کامل کلیک کنید ▾'
                 +  '</button>';
        }
        if (expanded && evs.length > 6) {
            html += '<button type="button" class="calw-more" id="calw-less-btn">▲ نمایش کمتر</button>';
        }
    }
    html += '</div>';
    html += '</div>';

    el.innerHTML = html;
    calwStartClock();

    /* ---------- فلش‌ها: راست = هفته قبل، چپ = هفته بعد ---------- */
    var prevBtn = document.getElementById('calw-prev');
    var nextBtn = document.getElementById('calw-next');
    var todayBtn = document.getElementById('calw-today');
    var moreBtn = document.getElementById('calw-more-btn');
    var lessBtn = document.getElementById('calw-less-btn');
    if (prevBtn) prevBtn.onclick = function () {
        window.__calWidgetOffset = (window.__calWidgetOffset || 0) - 1;
        renderCalendarWidget();
    };
    if (nextBtn) nextBtn.onclick = function () {
        window.__calWidgetOffset = (window.__calWidgetOffset || 0) + 1;
        renderCalendarWidget();
    };
    if (todayBtn) todayBtn.onclick = function () {
        window.__calWidgetOffset = 0;
        renderCalendarWidget();
    };
    if (moreBtn) moreBtn.onclick = function () {
        window.__calWidgetExpanded = true;
        renderCalendarWidget();
        setTimeout(function () {
            var box = document.getElementById('calw-events');
            if (box) box.scrollTop = 0;
        }, 30);
    };
    if (lessBtn) lessBtn.onclick = function () {
        window.__calWidgetExpanded = false;
        renderCalendarWidget();
    };
}

function updateHomeUpcomingInstallments() {
    var el = document.getElementById('home-upcoming-installments');
    if (!el) return;

    var totalEl = document.getElementById('home-upcoming-total');
    var totalAmountEl = document.getElementById('home-upcoming-total-amount');

    var facilities = DB.load('facilities', []);
    var banks = DB.load('bankAccounts', []);
    var bankMap = {};
    banks.forEach(function (b) { bankMap[b.id] = b; });

    var today = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    var tY = today[0], tM = today[1], tD = today[2];

    var upcoming = [];
    var totalAmount = 0;

    facilities.forEach(function (f) {
        if (f.status === 'settled' || f.status === 'inactive') return;

        var ins = f.installments || [];
        var lastDate = '';
        var lastAmt = 0;

        if (ins.length > 0) {
            var sorted = ins.slice().sort(function (a, b) { return compareVals(a.date, b.date); });
            lastDate = sorted[sorted.length - 1].date || '';
            lastAmt = Number(sorted[sorted.length - 1].amount) || 0;
        }

        var bankBal = f.bankId ? getBankBalance(f.bankId) : 0;
        var bankName = f.bankId && bankMap[f.bankId] ? bankMap[f.bankId].bank : '';

        ins.forEach(function (inst) {
            if (inst.status === 'paid') return;
            if (!inst.date) return;

            var p = inst.date.split('/').map(Number);
            if (p.length !== 3) return;

            var diff = jalaliDiff(tY, tM, tD, p[0], p[1], p[2]);
            if (diff >= 0 && diff <= 3) {
                upcoming.push({
                    facility: f,
                    date: inst.date,
                    amount: inst.amount,
                    diff: diff,
                    lastDate: lastDate,
                    lastAmt: lastAmt,
                    bankName: bankName,
                    bankBal: bankBal
                });
                totalAmount += Number(inst.amount) || 0;
            }
        });
    });

    if (upcoming.length === 0) {
        el.innerHTML = '<div class="widget-empty">قسطی نیست.</div>';
        if (totalEl) totalEl.classList.add('hidden');
        return;
    }

    upcoming.sort(function (a, b) { return a.diff - b.diff; });

    var html = '';
    upcoming.forEach(function (u) {
        var dl = u.diff === 0 ? 'امروز'
               : (u.diff === 1 ? 'فردا' : toFa(u.diff) + ' روز دیگر');

        html += '<div class="balance-row inst-row">'
             +  '<div class="info">'
             +    '<div class="name">' + esc(u.facility.name) + '</div>'
             +    '<div class="meta">' + dl + ' — ' + toFa(esc(u.date)) + '</div>'
             +    '<div class="meta extra">'
             +      (u.lastDate
                    ? '🔚 آخرین قسط: ' + toFa(u.lastDate) + ' (' + moneyHtml(u.lastAmt) + ')'
                    : '')
             +      (u.bankName
                    ? ' | 🏦 ' + esc(u.bankName) + ': ' + moneyHtml(u.bankBal)
                    : '')
             +    '</div>'
             +  '</div>'
             +  '<div class="amount">' + moneyHtml(u.amount || 0) + '</div>'
             +  '</div>';
    });

    el.innerHTML = html;

    if (totalEl && totalAmountEl) {
        totalEl.classList.remove('hidden');
        totalAmountEl.innerHTML = moneyHtml(totalAmount) + ' ' + currencyLabel();
    }
}

var LIVE_RATES_CACHE = DB.load(LS_KEYS.LIVE_RATES_CACHE, {
    values: {}, ts: 0, prev: {}
});

function fetchWithTimeout(url, opts, ms) {
    return new Promise(function (resolve, reject) {
        var controller = new AbortController();
        var timer = setTimeout(function () {
            try { controller.abort(); } catch (e) {}
            reject(new Error('timeout'));
        }, ms || 8000);
        fetch(url, Object.assign({}, opts || {}, { signal: controller.signal, cache: 'no-store' }))
            .then(function (r) { clearTimeout(timer); resolve(r); })
            .catch(function (e) { clearTimeout(timer); reject(e); });
    });
}

async function tryFetchJson(url, ms) {
    try {
        var res = await fetchWithTimeout(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json, text/plain, */*' }
        }, ms || 8000);
        if (!res.ok) return null;
        var text = await res.text();
        if (!text) return null;
        try { return JSON.parse(text); } catch (e) { return null; }
    } catch (e) { return null; }
}

async function fetchAllRates() {
    var results = {};
    var data = await tryFetchJson('https://raw.githubusercontent.com/itsyebekhe/usd/main/market.json', 10000);
    if (!data) return results;

    var ts = new Date(data.updated_at).getTime() || Date.now();

    function addItem(key, valueToman) {
        if (valueToman > 0) {
            results[key] = { value: valueToman * 10, ts: ts };
        }
    }

    addItem('usd', data.usd);
    addItem('eur', data.eur);
    addItem('gold_18k', data.gold_18k);

    if (data.gold_18k > 0) {
        addItem('gold_24k', Math.round(data.gold_18k * 1.3333));
    }

    addItem('coin_emami', data.coin_emami);
    addItem('coin_bahar', data.coin_bahar);
    addItem('coin_half', data.coin_half);
    addItem('coin_quarter', data.coin_quarter);

    return results;
}

async function fetchLiveRates(silent) {
    var box = document.getElementById('home-live-rates');
    var meta = document.getElementById('live-rates-meta');

    if (box && !silent) {
        box.innerHTML = '<div class="widget-empty">در حال دریافت نرخ‌ها...</div>';
    }

    var newResults = {};
    try {
        newResults = await fetchAllRates();
    } catch (e) {
        newResults = {};
    }

    var anyFetched = false;
    var newValues = {}, newTimestamps = {};
    var prev = LIVE_RATES_CACHE.values || {};

    for (var i = 0; i < RATE_ASSETS.length; i++) {
        var key = RATE_ASSETS[i].key;
        var res = newResults[key] || { value: 0, ts: 0 };
        var val = res.value || 0;
        var ts = res.ts || 0;

        if (val > 0) {
            newValues[key] = val;
            newTimestamps[key] = ts;
            anyFetched = true;
        } else {
            newValues[key] = prev[key] || 0;
        }
    }

    var hasAnyValue = false;
    for (var k in newValues) {
        if (newValues[k] > 0) { hasAnyValue = true; break; }
    }

    if (!hasAnyValue && !LIVE_RATES_CACHE.ts) {
        if (box) {
            box.innerHTML = '<div class="widget-empty">❌ دریافت نرخ ناموفق بود.<br>اتصال اینترنت را بررسی کرده و روی 🔄 بزنید.</div>';
        }
        if (meta) meta.textContent = 'برای تلاش مجدد روی 🔄 بزنید.';
        return;
    }

    var lastUpdate = LIVE_RATES_CACHE.lastUpdate || '';
    var finalTs = LIVE_RATES_CACHE.ts;

    if (anyFetched) {
        var latestItemTs = 0;
        for (var k in newTimestamps) {
            if (newTimestamps[k] > latestItemTs) latestItemTs = newTimestamps[k];
        }
        finalTs = latestItemTs || Date.now();
        lastUpdate = todayJalaliStr() + ' — ' + tsToJalaliTime(finalTs);
    }

    LIVE_RATES_CACHE = {
        values: newValues,
        ts: finalTs,
        prev: JSON.parse(JSON.stringify(prev)),
        lastUpdate: lastUpdate
    };
    DB.save(LS_KEYS.LIVE_RATES_CACHE, LIVE_RATES_CACHE);

    renderLiveRatesWidget();
    if (meta) {
        meta.textContent = (anyFetched ? '✅ بروزرسانی: ' : '⚠️ آخرین داده: ')
                         + lastUpdate + ' — منبع: TGJU Market';
    }
}

function renderLiveRatesWidget() {
    var box = document.getElementById('home-live-rates');
    if (!box) return;

    var c = LIVE_RATES_CACHE;
    if (!c.ts || !c.values) {
        box.innerHTML = '<div class="widget-empty">داده‌ای موجود نیست.</div>';
        return;
    }

    var html = '';
    var prev = c.prev || {};
    var anyShown = false;
    var hide = getHideState('widgets');

    var fetchTime = toFa(tsToJalaliTime(c.ts));
    var fetchDate = toFa(tsToJalaliDate(c.ts));

    for (var i = 0; i < RATE_ASSETS.length; i++) {
        var a = RATE_ASSETS[i];
        var val = c.values[a.key] || 0;
        if (val <= 0) continue;
        anyShown = true;

        var oldV = prev[a.key] || 0;
        var chg = val - oldV;

        var amountClass = '';
        if (oldV > 0) {
            if (chg > 0) amountClass = 'positive';
            else if (chg < 0) amountClass = 'negative';
        }

        var chgCls = chg > 0 ? 'up' : (chg < 0 ? 'down' : 'same');
        var chgTxt = chg === 0 ? '—'
                   : (chg > 0 ? '▲ ' : '▼ ') + (hide ? '—' : formatRial(Math.abs(chg)));

        html += '<div class="rate-row">'
             +  '<span class="name">' + a.label + '</span>'
             +  '<span class="amount ' + amountClass + '">' + (hide ? '—' : formatRial(val)) + ' ریال</span>'
             +  '<span class="rate-chg ' + chgCls + '">' + chgTxt + '</span>'
             +  '<span class="rate-updated">🕐 ' + fetchDate + ' ' + fetchTime + '</span>'
             +  '</div>';
    }

    if (!anyShown) {
        box.innerHTML = '<div class="widget-empty">داده‌ای موجود نیست. روی 🔄 بزنید.</div>';
        return;
    }

    box.innerHTML = html;
}

function renderTodayChecklistWidget(category) {
    /* ✅ v2.3.0 — کاربرِ بدون دسترسی به «دفترچه یادداشت»، ویجت چک‌لیست را نمی‌بیند.
       قبلاً ویجت مستقیم از store «notes» می‌خواند و محتوای یادداشت‌ها را نشانی می‌داد
       حتی اگر دیدنِ دفترچه در درخت دسترسی بسته شده بود. */
    try {
        if (typeof permsCanSee === 'function' && !permsCanSee('notes')) {
            if (typeof CHECKLIST_CATEGORIES !== 'undefined') {
                for (var ci = 0; ci < CHECKLIST_CATEGORIES.length; ci++) {
                    if (CHECKLIST_CATEGORIES[ci].key !== category) continue;
                    var elX = document.getElementById(CHECKLIST_CATEGORIES[ci].elId);
                    if (elX) {
                        elX.innerHTML = '';
                        if (elX.closest) {
                            var card = elX.closest('.widget, .card');
                            if (card) card.style.display = 'none';
                        }
                    }
                }
            }
            return;
        }
    } catch (ePerm) {}

    var meta = null;
    if (typeof CHECKLIST_CATEGORIES !== 'undefined') {
        for (var ci = 0; ci < CHECKLIST_CATEGORIES.length; ci++) {
            if (CHECKLIST_CATEGORIES[ci].key === category) {
                meta = CHECKLIST_CATEGORIES[ci];
                break;
            }
        }
    }
    if (!meta) return;

    var el = document.getElementById(meta.elId);
    if (!el) return;

    var today = todayJalaliStr();
    var notes = DB.load('notes', []);
    var allItems = [];

    notes.forEach(function (n) {
        if (n.archived) return;
        var noteCat = n.category || 'personal';
        if (noteCat !== category) return;

        (n.checklist || []).forEach(function (c) {
            if (!c.text) return;
            allItems.push({ note: n, item: c });
        });
    });

    var filtered = allItems.filter(function (x) {
        if (x.note.date === today) return true;
        return !x.item.done;
    });

    if (filtered.length === 0) {
        el.innerHTML = '<div class="widget-empty">✅ چک‌لیستی برای نمایش نیست.</div>';
        return;
    }

    filtered.sort(function (a, b) {
        var aT = a.note.date === today ? 0 : 1;
        var bT = b.note.date === today ? 0 : 1;
        if (aT !== bT) return aT - bT;
        return compareVals(b.note.date || '', a.note.date || '');
    });

    var html = '';
    filtered.forEach(function (x) {
        var dateLabel = toFa(esc(x.note.date || ''));
        var noteTitle = String(x.note.title || 'یادداشت').trim();

        html += '<div class="cl-widget-item' + (x.item.done ? ' done' : '') + '" '
             +  'data-note-id="' + x.note.id + '" '
             +  'data-item-id="' + x.item.id + '" '
             +  'title="کلیک برای باز کردن یادداشت">'
             +  '<input type="checkbox" ' + (x.item.done ? 'checked' : '') + '>'
             +  '<span class="cl-widget-text">'
             +    '<strong class="cl-widget-note-title">' + esc(noteTitle) + '</strong>'
             +    '<span class="cl-widget-sep">—</span>'
             +    esc(x.item.text)
             +  '</span>'
             +  '<span class="cl-widget-note">📅 ' + dateLabel + '</span>'
             +  '</div>';
    });

    el.innerHTML = html;

    el.querySelectorAll('.cl-widget-item').forEach(function (row) {
        var cb = row.querySelector('input[type=checkbox]');
        cb.addEventListener('click', function (e) {
            e.stopPropagation();
            var noteId = row.getAttribute('data-note-id');
            var itemId = row.getAttribute('data-item-id');
            var notes = DB.load('notes', []);
            for (var i = 0; i < notes.length; i++) {
                if (notes[i].id === noteId) {
                    for (var j = 0; j < (notes[i].checklist || []).length; j++) {
                        if (notes[i].checklist[j].id === itemId) {
                            notes[i].checklist[j].done = !notes[i].checklist[j].done;
                            break;
                        }
                    }
                }
            }
            DB.save('notes', notes);
            renderTodayChecklistWidget(category);
        });

        row.addEventListener('click', function (e) {
            if (e.target.tagName === 'INPUT') return;
            var noteId = row.getAttribute('data-note-id');
            if (noteId && typeof openNoteView === 'function') openNoteView(noteId);
        });
    });
}

function updateHomeWidgets() {
    applyWidgetOrder();
    applyWidgetVisibility();

    if (state.widgets.calendar)          renderCalendarWidget();
    if (state.widgets.calendarNext3)     { }
    if (state.widgets.calendarDay)       { }
    if (state.widgets.calendarAgenda)    { }

    if (state.widgets.todayChecklistPersonal && typeof renderTodayChecklistWidget === 'function') {
        renderTodayChecklistWidget('personal');
    }
    if (state.widgets.todayChecklistFamily && typeof renderTodayChecklistWidget === 'function') {
        renderTodayChecklistWidget('family');
    }
    if (state.widgets.todayChecklistWork && typeof renderTodayChecklistWidget === 'function') {
        renderTodayChecklistWidget('work');
    }

    if (state.widgets.bankTotal)             updateHomeBankTotal();
    if (state.widgets.bankBalances)          renderBankBalancesWidget();
    if (state.widgets.cashBalances)          renderCashBalancesWidget();
    if (state.widgets.upcomingInstallments)  updateHomeUpcomingInstallments();
    if (state.widgets.birthdays)             renderBirthdaysWidget();

    if (state.widgets.liveRates && typeof renderLiveRatesWidget === 'function') renderLiveRatesWidget();

    if (typeof window.updateSmsBadge === 'function') window.updateSmsBadge();
    if (typeof buildShareButtons === 'function') setTimeout(buildShareButtons, 100);
}

function bindRatesRefreshButton() {
    var btn = document.getElementById('live-rates-refresh');
    if (btn) btn.addEventListener('click', function () {
        fetchLiveRates();
    });
}

window.LIVE_RATES_CACHE                = LIVE_RATES_CACHE;
window.fetchWithTimeout                = fetchWithTimeout;
window.tryFetchJson                    = tryFetchJson;
window.fetchAllRates                   = fetchAllRates;
window.fetchLiveRates                  = fetchLiveRates;
window.renderLiveRatesWidget           = renderLiveRatesWidget;
window.applyWidgetVisibility           = applyWidgetVisibility;
window.applyWidgetOrder                = applyWidgetOrder;
window.renderWidgetOrderUI             = renderWidgetOrderUI;
window.getBankBalance                  = getBankBalance;
window.getCashBoxBalance               = getCashBoxBalance;
window.isVisibleInDash                 = isVisibleInDash;
window.getBirthdayInfo                 = getBirthdayInfo;
window.updateHomeBankTotal             = updateHomeBankTotal;
window.renderBankBalancesWidget        = renderBankBalancesWidget;
window.renderCashBalancesWidget        = renderCashBalancesWidget;
window.renderBirthdaysWidget           = renderBirthdaysWidget;
window.renderCalendarWidget            = renderCalendarWidget;
window.updateHomeUpcomingInstallments  = updateHomeUpcomingInstallments;
window.updateHomeWidgets               = updateHomeWidgets;
window.renderTodayChecklistWidget      = renderTodayChecklistWidget;
window.bindRatesRefreshButton          = bindRatesRefreshButton;

console.log('✅ [modules/widgets.js] loaded — birthday age + filter');
