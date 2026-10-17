/* ============================================================
   پارسیس — ویجت‌های صفحه اصلی
   مسیر: js/modules/widgets.js
   ============================================================ */
'use strict';

/* ============================================================
   بخش ۰ — CSS ویجت چک‌لیست
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
        liveRates: '💱 نرخ لحظه‌ای ارز و طلا (Priceto)',
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
   بخش ۶ تا ۱۱ — ویجت‌های صفحه اصلی
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
   بخش ۱۳ — ویجت نرخ لحظه‌ای ارز و طلا و سکه (TGJU API)
   ============================================================ */
var TGJU_IDS = [
    { id: '137119', label: '💵 دلار آمریکا' },
    { id: '137123', label: '💶 یورو' },
    { id: '137120', label: '💷 پوند' },
    { id: '137121', label: '💴 درهم امارات' },
    { id: '137122', label: '💰 تتر' },
    { id: '137138', label: '🪙 سکه امامی' },
    { id: '137137', label: '🪙 سکه بهار آزادی' },
    { id: '137139', label: '🪙 نیم سکه' },
    { id: '137140', label: '🪙 ربع سکه' },
    { id: '137141', label: '🪙 سکه گرمی' },
    { id: '137225', label: '🥇 طلای ۱۸ عیار' },
    { id: '137207', label: '🥇 طلای ۲۴ عیار' },
    { id: '137221', label: '🥇 مثقال طلا' },
    { id: '137222', label: '🥇 طلای دست دوم' },
    { id: '137218', label: '🥇 انس جهانی طلا' }
];

var TGJU_RATES_CACHE = DB.load('tgjuRatesCache', { values: {}, ts: 0 });

async function fetchTgjuRates() {
    var results = {};
    
    // گرفتن دیتا به صورت موازی
    await Promise.all(TGJU_IDS.map(async function (item) {
        var url = 'https://api.tgju.org/v1/market/indicator/summary-table-data/' + item.id;
        var data = await tryFetchJsonWithFallback(url, 8000);
        if (data && data.data && data.data.price) {
            var priceStr = normalizeDigits(String(data.data.price)).replace(/[^\d]/g, '');
            var price = Number(priceStr);
            if (price > 0) {
                results[item.id] = {
                    price: price,
                    change: data.data.change || '',
                    time: data.data.time || ''
                };
            }
        }
    }));

    return results;
}

async function updateTgjuRatesWidget(forceRefresh) {
    var box = document.getElementById('home-tgju-rates');
    if (!box) return;

    if (!forceRefresh && TGJU_RATES_CACHE.ts && (Date.now() - TGJU_RATES_CACHE.ts < 60000)) {
        renderTgjuRatesWidget();
        return;
    }

    if (!forceRefresh) {
        box.innerHTML = '<div class="widget-empty">در حال دریافت نرخ‌ها...</div>';
    }

    try {
        var results = await fetchTgjuRates();
        
        var hasAny = false;
        for (var k in results) { hasAny = true; break; }

        if (hasAny) {
            TGJU_RATES_CACHE = { values: results, ts: Date.now() };
            DB.save('tgjuRatesCache', TGJU_RATES_CACHE);
            renderTgjuRatesWidget();
        } else if (!TGJU_RATES_CACHE.ts) {
            box.innerHTML = '<div class="widget-empty">❌ دریافت نرخ ناموفق بود.<br>اینترنت را بررسی کنید.</div>';
        } else {
            renderTgjuRatesWidget(); // نمایش دیتای کش شده
        }
    } catch (e) {
        if (!TGJU_RATES_CACHE.ts) box.innerHTML = '<div class="widget-empty">خطا در دریافت.</div>';
        else renderTgjuRatesWidget();
    }
}

function renderTgjuRatesWidget() {
    var box = document.getElementById('home-tgju-rates');
    if (!box) return;

    var c = TGJU_RATES_CACHE;
    var hide = getHideState('widgets');
    var html = '';
    var shown = 0;

    TGJU_IDS.forEach(function (item) {
        var val = c.values[item.id] ? c.values[item.id].price : 0;
        
        // فیلتر کردن موارد خالی (در صورت قطعی موقت)
        if (val <= 0 && c.ts) return;
        shown++;

        var chg = c.values[item.id] ? c.values[item.id].change : '';
        var chgCls = 'same';
        if (chg && chg.indexOf('-') !== -1) chgCls = 'down';
        else if (chg && chg !== '0') chgCls = 'up';

        html += '<div class="rate-row">'
             +  '<span class="name">' + item.label + '</span>'
             +  '<span class="amount">' + (hide ? '—' : (val > 0 ? formatRial(val) : '—')) + ' ریال</span>'
             +  '<span class="rate-chg ' + chgCls + '">' + (chg && !hide ? chg : '') + '</span>'
             +  '</div>';
    });

    if (shown === 0) {
        box.innerHTML = '<div class="widget-empty">داده‌ای موجود نیست.</div>';
        return;
    }

    box.innerHTML = html;
}

function bindTgjuRatesRefreshButton() {
    var btn = document.getElementById('tgju-rates-refresh');
    if (btn && !btn.dataset.bound) {
        btn.dataset.bound = '1';
        btn.addEventListener('click', function () {
            showToast('🔄 در حال بروزرسانی نرخ‌ها...');
            updateTgjuRatesWidget(true);
        });
    }
}

/* ============================================================
   بخش ۱۴ — به‌روزرسانی همه ویجت‌ها
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
    
    // ✅ ویجت‌های نرخ
    if (state.widgets.liveRates && typeof renderLiveRatesWidget === 'function') renderLiveRatesWidget();
    
    if (state.widgets.tgjuRates) {
        bindTgjuRatesRefreshButton();
        updateTgjuRatesWidget();
    }

    if (typeof window.updateSmsBadge === 'function') window.updateSmsBadge();
    if (typeof buildShareButtons === 'function') setTimeout(buildShareButtons, 100);
}

/* ============================================================
   صادرسازی
   ============================================================ */
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

console.log('✅ [modules/widgets.js] loaded — complete');
