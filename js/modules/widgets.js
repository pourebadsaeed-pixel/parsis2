/* ============================================================
   پارسیس — ویجت‌های صفحه اصلی (بخش ۱: state + ترتیب + balance)
   مسیر: js/modules/widgets.js
   وابستگی: core/* + ui/* + dashboard.js
   ============================================================ */
'use strict';

/* ============================================================
   بخش ۰ — CSS ویجت چک‌لیست (فونت B Titr + جداکننده)
   ============================================================ */
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

/* ============================================================
   بخش ۱ — نمای ویجت‌ها
   ============================================================ */
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

/* ============================================================
   بخش ۲ — UI ترتیب ویجت‌ها
   ============================================================ */
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
        bankBalances: '🏦 مانده حساب‌ها',
        cashBalances: '💰 صندوق‌ها',
        upcomingInstallments: '⏰ اقساط ۳ روز آینده',
        birthdays: '🎂 تولدها',
        liveRates: '💱 نرخ لحظه‌ای ارز و طلا',
        tgjuCoins: '🪙 قیمت لحظه‌ای سکه (TGJU)'
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

/* ============================================================
   بخش ۳ — محاسبه مانده بانک و صندوق
   ============================================================ */
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

/* ============================================================
   بخش ۴ — بررسی نمایش در ویجت
   ============================================================ */
function isVisibleInDash(item) {
    if (!item) return false;
    if (typeof item.showInDash === 'undefined') return true;
    return item.showInDash !== false;
}

/* ============================================================
   بخش ۵ — محاسبه تولد
   ============================================================ */
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

    return {
        birthMonth: bM,
        birthDay: bD,
        dow: dow,
        daysRemaining: daysRemaining,
        birthYear: birthYear
    };
}

/* ============================================================
   بخش ۶ — ویجت مانده کل بانک
   ============================================================ */
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
   بخش ۷ — ویجت مانده بانک‌ها (تفکیکی)
   ============================================================ */
function renderBankBalancesWidget() {
    var el = document.getElementById('home-bank-balances');
    if (!el) return;

    var banks = DB.load('bankAccounts', []);
    banks = banks.filter(isVisibleInDash);
    if (banks.length === 0) {
        el.innerHTML = '<div class="widget-empty">حساب بانکی برای نمایش ثبت نشده.</div>';
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
             +      toFa(esc(b.account || '—'))
             +    '</div>'
             +  '</div>'
             +  '<div class="amounts-grid">'
             +    '<div class="amt-cell"><span class="amt-lbl">مانده</span>'
             +      '<span class="amount ' + cls + '">' + moneyHtml(bal) + ' ' + currencyLabel() + '</span></div>'
             +    '<div class="amt-cell"><span class="amt-lbl">حداقل</span>'
             +      '<span class="amount">' + (minBal ? moneyHtml(minBal) : '—') + '</span></div>'
             +    '<div class="amt-cell"><span class="amt-lbl">کسری</span>'
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

/* ============================================================
   بخش ۸ — ویجت مانده صندوق‌ها
   ============================================================ */
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
   بخش ۹ — ویجت تولدها
   ============================================================ */
function renderBirthdaysWidget() {
    var el = document.getElementById('home-birthdays');
    if (!el) return;

    var persons = DB.load('persons', []);
    var items = [];

    for (var i = 0; i < persons.length; i++) {
        var p = persons[i];
        if (!p.birth) continue;
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

        html += '<div class="birthday-row">'
             +  '<div class="name">' + esc(p2.first || '') + ' ' + esc(p2.last || '') + '</div>'
             +  '<div>' + ds + '</div>'
             +  '<div class="dow">' + info2.dow + '</div>'
             +  '<div class="days ' + dc + '">' + dl + '</div>'
             +  '</div>';
    }

    el.innerHTML = html;
}

/* ============================================================
   بخش ۱۰ — ویجت تقویم هفتگی
   ============================================================ */
function renderCalendarWidget() {
    var el = document.getElementById('home-cal-widget');
    if (!el) return;

    var now = new Date();
    var todayJ = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    var jsDay = now.getDay();
    var offsetFromSat = (jsDay + 1) % 7;

    var satDate = new Date(now);
    satDate.setDate(satDate.getDate() - offsetFromSat);

    var daysEn = ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'];
    var html = '<div class="cal-week-grid">';

    for (var i = 0; i < 7; i++) {
        var d = new Date(satDate);
        d.setDate(satDate.getDate() + i);

        var j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
        var isToday = (j[0] === todayJ[0] && j[1] === todayJ[1] && j[2] === todayJ[2]);
        var isHoliday = (d.getDay() === 5);

        var cls = 'cal-week-day' + (isToday ? ' today' : '') + (isHoliday ? ' holiday' : '');
        html += '<div class="' + cls + '">';
        html += '<div class="cwd-name-en">' + daysEn[i] + '</div>';
        html += '<div class="cwd-circle">' + toFa(j[2]) + '</div>';
        html += '<div class="cwd-square">' + d.getDate() + '</div>';
        html += '</div>';
    }
    html += '</div>';
    el.innerHTML = html;
}

/* ============================================================
   بخش ۱۱ — ویجت اقساط ۳ روز آینده
   ============================================================ */
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

/* ============================================================
   بخش ۱۲ — ویجت TGJU (رفرش دستی)
   ============================================================ */
function bindTgjuRefreshButton() {
    var btn = document.getElementById('tgju-refresh');
    if (btn && !btn.dataset.bound) {
        btn.dataset.bound = '1';
        btn.addEventListener('click', function () {
            var box = document.getElementById('tgju-coins-widget');
            if (box) {
                box.innerHTML = '<tgju type="market-overview" items="137138,137137,137139,137140,137141" columns="dot" token="webservice"></tgju>';
                showToast('🔄 در حال دریافت مجدد نرخ‌ها...');
            }
        });
    }
}

/* ============================================================
   بخش ۱۳ — به‌روزرسانی همه ویجت‌ها
   ============================================================ */
function updateHomeWidgets() {
    applyWidgetOrder();
    applyWidgetVisibility();

    if (state.widgets.calendar)          renderCalendarWidget();
    if (state.widgets.calendarNext3)     { /* در پیام بعد */ }
    if (state.widgets.calendarDay)       { /* در پیام بعد */ }
    if (state.widgets.calendarAgenda)    { /* در پیام بعد */ }

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
    
    // ✅ اتصال دکمه رفرش TGJU
    if (state.widgets.tgjuCoins) {
        bindTgjuRefreshButton();
    }

    if (typeof window.updateSmsBadge === 'function') window.updateSmsBadge();
    if (typeof buildShareButtons === 'function') setTimeout(buildShareButtons, 100);
}

/* ============================================================
   بخش ۱۴ — ویجت نرخ لحظه‌ای ارز و طلا (Priceto/Navasan)
   ============================================================ */
var PRICETO_BASE = 'https://api.priceto.day/v1/latest/irr';
var NAVASAN_GOLD_CDN = 'https://cdn.jsdelivr.net/gh/HosseinOdd/Navasan-API@main/data/gold.json';
var NAVASAN_FIAT_CDN = 'https://cdn.jsdelivr.net/gh/HosseinOdd/Navasan-API@main/data/fiat.json';

var CORS_PROXIES = [
    function (u) { return 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u); },
    function (u) { return 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(u); },
    function (u) { return 'https://corsproxy.io/?' + encodeURIComponent(u); }
];

var LIVE_RATES_CACHE = DB.load(LS_KEYS.LIVE_RATES_CACHE, {
    values: {}, ts: 0, prev: {}, timestamps: {}, lastUpdate: ''
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

async function tryFetchJsonWithFallback(url, ms) {
    var data = await tryFetchJson(url, ms);
    if (data) return data;

    for (var i = 0; i < CORS_PROXIES.length; i++) {
        try {
            var proxyUrl = CORS_PROXIES[i](url);
            data = await tryFetchJson(proxyUrl, (ms || 8000) + 3000);
            if (data) return data;
        } catch (e) {}
    }
    return null;
}

async function fetchFromPriceto(symbol) {
    if (!symbol) return { value: 0, ts: 0 };
    var url = PRICETO_BASE + '/' + symbol;
    var data = await tryFetchJsonWithFallback(url, 7000);
    if (!data) return { value: 0, ts: 0 };

    var v = 0;
    if (typeof data === 'number') v = data;
    else {
        v = Number(data.rate || data.price || data.value ||
                   (data.data && (data.data.rate || data.data.price)) || 0);
    }
    if (!isFinite(v) || v <= 0) return { value: 0, ts: 0 };
    return {
        value: v,
        ts: data.timestamp || data.ts || (data.data && data.data.timestamp) || 0
    };
}

function parseNavasanItem(data, assetKey, multiplier) {
    if (!data || typeof data !== 'object') return { value: 0, ts: 0 };
    var item = data[assetKey];
    if (!item) return { value: 0, ts: 0 };

    var val = item.value || item.price || item.p || item.last || 0;
    var v = Number(String(val).replace(/[,\s]/g, ''));
    if (!isFinite(v) || v <= 0) return { value: 0, ts: 0 };
    if (multiplier && multiplier !== 1) v = v * multiplier;

    return {
        value: v,
        ts: item.date || item.timestamp || item.last_update || 0
    };
}

async function fetchAllRates() {
    var results = {};
    var pending = RATE_ASSETS.map(function (a) {
        return { asset: a, done: false, value: 0, ts: 0 };
    });

    await Promise.all(pending.map(function (p) {
        return fetchFromPriceto(p.asset.priceto).then(function (r) {
            if (r.value > 0) {
                p.done = true;
                p.value = r.value;
                p.ts = r.ts;
            }
        });
    }));

    var stillNeed = pending.filter(function (p) { return !p.done; });

    if (stillNeed.length > 0) {
        var goldData = null, fiatData = null;
        try { goldData = await tryFetchJson(NAVASAN_GOLD_CDN, 9000); } catch (e) {}
        try { fiatData = await tryFetchJson(NAVASAN_FIAT_CDN, 9000); } catch (e) {}

        stillNeed.forEach(function (p) {
            var a = p.asset;
            var parsed = { value: 0, ts: 0 };
            if (a.source === 'gold' && goldData) {
                parsed = parseNavasanItem(goldData, a.navasanKey, a.navasanMul);
            } else if (a.source === 'fiat' && fiatData) {
                parsed = parseNavasanItem(fiatData, a.navasanKey, a.navasanMul);
            }
            if (parsed.value > 0) {
                p.done = true;
                p.value = parsed.value;
                p.ts = parsed.ts;
            }
        });
    }

    pending.forEach(function (p) {
        results[p.asset.key] = { value: p.value || 0, ts: p.ts || 0 };
    });
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
    var prevTs = LIVE_RATES_CACHE.timestamps || {};

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
            newTimestamps[key] = prevTs[key] || 0;
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

    var lastUpdate = '';
    if (anyFetched) {
        lastUpdate = todayJalaliStr() + ' — ' + tsToJalaliTime(Date.now());
    } else {
        lastUpdate = LIVE_RATES_CACHE.lastUpdate || '—';
    }

    LIVE_RATES_CACHE = {
        values: newValues,
        timestamps: newTimestamps,
        ts: anyFetched ? Date.now() : LIVE_RATES_CACHE.ts,
        prev: JSON.parse(JSON.stringify(prev)),
        lastUpdate: lastUpdate
    };
    DB.save(LS_KEYS.LIVE_RATES_CACHE, LIVE_RATES_CACHE);

    renderLiveRatesWidget();
    if (meta) {
        meta.textContent = (anyFetched ? '✅ بروزرسانی: ' : '⚠️ آخرین داده ذخیره‌شده: ')
                         + lastUpdate + ' — منبع: Priceto + Navasan';
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

    for (var i = 0; i < RATE_ASSETS.length; i++) {
        var a = RATE_ASSETS[i];
        var val = c.values[a.key] || 0;
        if (val <= 0) continue;
        anyShown = true;

        var oldV = prev[a.key] || 0;
        var chg = val - oldV;
        var chgCls = chg > 0 ? 'up' : (chg < 0 ? 'down' : 'same');
        var chgTxt = chg === 0 ? '—'
                   : (chg > 0 ? '▲ ' : '▼ ') + (hide ? '—' : formatRial(Math.abs(chg)));

        var itemTs = (c.timestamps && c.timestamps[a.key]) ? c.timestamps[a.key] : 0;
        var tsDisplay = '';
        if (itemTs > 0) {
            var tsMs = itemTs < 1e12 ? itemTs * 1000 : itemTs;
            tsDisplay = '🕐 ' + toFa(tsToJalaliDate(tsMs)) + ' ' + toFa(tsToJalaliTime(tsMs));
        }

        html += '<div class="rate-row">'
             +  '<span class="name">' + a.label + '</span>'
             +  '<span class="amount">' + (hide ? '—' : formatRial(val)) + ' ریال</span>'
             +  '<span class="rate-chg ' + chgCls + '">' + chgTxt + '</span>'
             +  '<span class="rate-updated">' + tsDisplay + '</span>'
             +  '</div>';
    }

    if (!anyShown) {
        box.innerHTML = '<div class="widget-empty">داده‌ای موجود نیست. روی 🔄 بزنید.</div>';
        return;
    }

    box.innerHTML = html;
}

/* ============================================================
   بخش ۱۵ — ویجت چک‌لیست
   ============================================================ */
function renderTodayChecklistWidget(category) {
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

/* ============================================================
   بخش ۱۶ — اتصال دکمه به‌روزرسانی نرخ‌ها
   ============================================================ */
function bindRatesRefreshButton() {
    var btn = document.getElementById('live-rates-refresh');
    if (btn) btn.addEventListener('click', function () {
        fetchLiveRates();
    });
}

/* ============================================================
   صادرسازی
   ============================================================ */
window.LIVE_RATES_CACHE                = LIVE_RATES_CACHE;
window.PRICETO_BASE                    = PRICETO_BASE;
window.NAVASAN_GOLD_CDN                = NAVASAN_GOLD_CDN;
window.NAVASAN_FIAT_CDN                = NAVASAN_FIAT_CDN;
window.CORS_PROXIES                    = CORS_PROXIES;
window.fetchWithTimeout                = fetchWithTimeout;
window.tryFetchJson                    = tryFetchJson;
window.tryFetchJsonWithFallback        = tryFetchJsonWithFallback;
window.fetchFromPriceto                = fetchFromPriceto;
window.parseNavasanItem                = parseNavasanItem;
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

console.log('✅ [modules/widgets.js] loaded — complete with TGJU widget fix');
