/* ============================================================
   پارسیس — داشبورد مالی (بخش ۱: state + کارت‌ها + ترتیب)
   مسیر: js/modules/dashboard.js
   وابستگی: core/* + ui/* + reports/*
   ============================================================ */
'use strict';

/* ============================================================
   بخش ۱ — تعریف dashboards در state
   ============================================================ */
if (typeof state.dashboards === 'undefined') {
    state.dashboards = DB.load('dashboards', {
        cashLiquidity: true,
        expenseDonut: true,
        assetDonut: true,
        trendBar: true,
        topExpenses: true,
        lastVouchers: true,
        overdueInstallments: true,
        negativeBanks: true,
        topPersons: true,
        cashflowSummary: true
    });
    DB.save('dashboards', state.dashboards);
} else if (typeof state.dashboards.cashflowSummary === 'undefined') {
    state.dashboards.cashflowSummary = true;
    DB.save('dashboards', state.dashboards);
}

if (typeof state.dashboardOrder === 'undefined') {
    var _defOrder = [
        'cashLiquidity', 'expenseDonut', 'assetDonut', 'trendBar',
        'topExpenses', 'lastVouchers', 'overdueInstallments',
        'negativeBanks', 'topPersons', 'cashflowSummary'
    ];
    var _ord = DB.load('dashboardOrder', _defOrder);
    _defOrder.forEach(function (k) {
        if (_ord.indexOf(k) === -1) _ord.push(k);
    });
    state.dashboardOrder = _ord;
    DB.save('dashboardOrder', state.dashboardOrder);
} else if (state.dashboardOrder.indexOf('cashflowSummary') === -1) {
    state.dashboardOrder.push('cashflowSummary');
    DB.save('dashboardOrder', state.dashboardOrder);
}

/* ============================================================
   بخش ۲ — رنگ‌های نمودار
   ============================================================ */
var CHART_COLORS = [
    '#4a90e2', '#22a06b', '#e8a33d', '#e5484d', '#8b5cf6',
    '#06b6d4', '#f59e0b', '#ec4899', '#14b8a6', '#f97316'
];

/* ============================================================
   بخش ۳ — N ماه اخیر
   ============================================================ */
function getLastNMonths(n) {
    var d = new Date();
    var j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    var y = j[0], m = j[1];
    var out = [];
    for (var i = n - 1; i >= 0; i--) {
        var cm = m - i, cy = y;
        while (cm < 1) { cm += 12; cy--; }
        out.push({
            year: cy,
            month: cm,
            label: getJalaliMonthName(cm) + ' ' + String(cy).slice(-2)
        });
    }
    return out;
}

/* ============================================================
   بخش ۴ — تعریف HTML کارت‌های داشبورد
   ============================================================ */
function getDashboardCard(key) {
    var cards = {
        cashLiquidity:
            '<div class="card dash-card" data-dash-key="cashLiquidity">'
            + '<h3>💧 نمودار نقدینگی</h3>'
            + '<div id="dash-cash-liquidity"></div></div>',

        expenseDonut:
            '<div class="card dash-card" data-dash-key="expenseDonut">'
            + '<h3>🥧 ترکیب هزینه‌ها</h3>'
            + '<div id="dash-expense-donut"></div></div>',

        assetDonut:
            '<div class="card dash-card" data-dash-key="assetDonut">'
            + '<h3>🏦 ترکیب دارایی‌ها</h3>'
            + '<div id="dash-asset-donut"></div></div>',

        trendBar:
            '<div class="card dash-card dash-wide" data-dash-key="trendBar">'
            + '<h3>📊 روند درآمد و هزینه ۶ ماه اخیر</h3>'
            + '<div id="dash-trend"></div></div>',

        topExpenses:
            '<div class="card dash-card" data-dash-key="topExpenses">'
            + '<h3>🏆 بیشترین هزینه‌ها (Top 10)</h3>'
            + '<div id="dash-top-exp"></div></div>',

        lastVouchers:
            '<div class="card dash-card" data-dash-key="lastVouchers">'
            + '<h3>📄 ۱۰ سند آخر</h3>'
            + '<div id="dash-last-vouchers"></div></div>',

        overdueInstallments:
            '<div class="card dash-card" data-dash-key="overdueInstallments">'
            + '<h3>⏰ اقساط سررسید گذشته</h3>'
            + '<div id="dash-overdue-inst"></div></div>',

        negativeBanks:
            '<div class="card dash-card" data-dash-key="negativeBanks">'
            + '<h3>🔴 بانک‌های با کسری</h3>'
            + '<div id="dash-neg-banks"></div></div>',

        topPersons:
            '<div class="card dash-card" data-dash-key="topPersons">'
            + '<h3>👥 پرتراکنش‌ترین اشخاص</h3>'
            + '<div id="dash-top-persons"></div></div>',

        cashflowSummary:
            '<div class="card dash-card dash-wide" data-dash-key="cashflowSummary">'
            + '<h3>💸 خلاصه عوامل گردش وجه نقد (سال جاری)</h3>'
            + '<div id="dash-cf-summary"></div></div>'
    };
    return cards[key] || '';
}

/* ============================================================
   بخش ۵ — رندر اصلی داشبورد
   ============================================================ */
function renderDashboard() {
    var page = document.getElementById('page-dashboard');
    if (!page) return;

    /* ساخت container اگر نیست */
    if (!document.getElementById('dash-grid-container')) {
        var oldDash = page.querySelector('.dash-grid');
        if (oldDash) oldDash.style.display = 'none';

        var oldCards = page.querySelectorAll('.card');
        oldCards.forEach(function (c) {
            if (c.querySelector('#dash-trend') || c.querySelector('#dash-top-exp')) {
                c.style.display = 'none';
            }
        });

        var grid0 = document.createElement('div');
        grid0.id = 'dash-grid-container';
        grid0.className = 'dash-cards-grid';
        page.appendChild(grid0);
    }

    var grid = document.getElementById('dash-grid-container');
    var order = state.dashboardOrder || [];

    /* حذف کارت‌های غیرفعال */
    grid.querySelectorAll('.dash-card').forEach(function (c) {
        var k = c.getAttribute('data-dash-key');
        if (!state.dashboards[k]) c.remove();
    });

    /* افزودن کارت‌ها به ترتیب */
    order.forEach(function (key) {
        if (!state.dashboards[key]) return;
        var card = grid.querySelector('[data-dash-key="' + key + '"]');
        if (!card) {
            var html = getDashboardCard(key);
            if (html) {
                var tmp = document.createElement('div');
                tmp.innerHTML = html;
                card = tmp.firstElementChild;
                grid.appendChild(card);
            }
        }
        if (card) grid.appendChild(card);
    });

    renderDashboardContents();

    if (typeof buildShareButtons === 'function') setTimeout(buildShareButtons, 100);
}

/* ============================================================
   بخش ۶ — رسم دونات
   ============================================================ */
function renderDonutChart(containerId, dataObj, title, hide) {
    var el = document.getElementById(containerId);
    if (!el) return;

    var entries = Object.keys(dataObj).map(function (k) {
        return { label: k, value: dataObj[k] };
    }).filter(function (x) {
        return x.value > 0;
    }).sort(function (a, b) {
        return b.value - a.value;
    });

    if (entries.length === 0) {
        el.innerHTML = '<div class="widget-empty">داده‌ای برای نمایش نیست.</div>';
        return;
    }

    var total = entries.reduce(function (s, x) { return s + x.value; }, 0);
    var size = 200, radius = 70, cx = size / 2, cy = size / 2, stroke = 32;
    var circumference = 2 * Math.PI * radius;

    var svg = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" style="flex-shrink:0">';
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + radius + '" fill="none" stroke="rgba(0,0,0,0.05)" stroke-width="' + stroke + '" />';

    var cum = 0;
    for (var i = 0; i < entries.length; i++) {
        var p = entries[i].value / total;
        var arcLen = p * circumference;
        svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + radius + '" '
             + 'fill="none" stroke="' + CHART_COLORS[i % CHART_COLORS.length] + '" '
             + 'stroke-width="' + stroke + '" '
             + 'stroke-dasharray="' + arcLen + ' ' + (circumference - arcLen) + '" '
             + 'stroke-dashoffset="' + (-cum) + '" '
             + 'transform="rotate(-90 ' + cx + ' ' + cy + ')" />';
        cum += arcLen;
    }

    svg += '<text x="' + cx + '" y="' + (cy - 4) + '" text-anchor="middle" font-size="14" font-weight="bold" fill="#357abd">'
         + (hide ? '—' : toFa(total > 1000000
                ? formatMoney(total / 1000000) + 'M'
                : formatMoney(total))) + '</text>';
    svg += '<text x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle" font-size="10" fill="#8b95a6">'
         + esc(title) + '</text>';
    svg += '</svg>';

    var lg = '<div class="donut-legend">';
    for (var j = 0; j < entries.length; j++) {
        var pct = (entries[j].value / total * 100).toFixed(1);
        lg += '<div class="lg-item">'
            + '<span class="color-box" style="background:' + CHART_COLORS[j % CHART_COLORS.length] + '"></span>'
            + '<span class="lbl">' + esc(entries[j].label) + '</span>'
            + '<span class="val">'
            + (hide ? '—' : formatMoney(entries[j].value)) + ' (' + toFa(pct) + '٪)</span>'
            + '</div>';
    }
    lg += '</div>';

    el.innerHTML = '<div class="donut-wrap">' + svg + lg + '</div>';
}

/* ============================================================
   بخش ۷ — رسم نمودار میله‌ای
   ============================================================ */
function renderBarChart(containerId, data, hide) {
    var el = document.getElementById(containerId);
    if (!el) return;

    if (!data || data.length === 0) {
        el.innerHTML = '<div class="widget-empty">داده‌ای برای نمایش نیست.</div>';
        return;
    }

    var maxVal = 0;
    data.forEach(function (d) {
        if (d.income > maxVal) maxVal = d.income;
        if (d.expense > maxVal) maxVal = d.expense;
    });

    if (maxVal === 0) {
        el.innerHTML = '<div class="widget-empty">تراکنشی در این بازه ثبت نشده.</div>';
        return;
    }

    var html = '<div class="bar-chart">';
    data.forEach(function (d) {
        var ih = maxVal > 0 ? (d.income / maxVal * 140) : 0;
        var eh = maxVal > 0 ? (d.expense / maxVal * 140) : 0;

        html += '<div class="bar-group"><div class="bar-pair">';
        html += '<div class="bar in" style="height:' + ih + 'px" title="درآمد: '
             + (hide ? '—' : formatMoney(d.income)) + '">'
             + '<span class="bar-val">' + (hide ? '—' : formatMoney(d.income)) + '</span></div>';
        html += '<div class="bar out" style="height:' + eh + 'px" title="هزینه: '
             + (hide ? '—' : formatMoney(d.expense)) + '">'
             + '<span class="bar-val">' + (hide ? '—' : formatMoney(d.expense)) + '</span></div>';
        html += '</div><span class="bar-lbl">' + esc(d.label) + '</span></div>';
    });
    html += '</div>';

    html += '<div style="display:flex;justify-content:center;gap:20px;margin-top:12px;font-size:0.8rem">'
         +  '<span><span style="display:inline-block;width:14px;height:14px;background:linear-gradient(180deg,#34d399,#059669);border-radius:3px;vertical-align:middle;margin-left:6px"></span>درآمد</span>'
         +  '<span><span style="display:inline-block;width:14px;height:14px;background:linear-gradient(180deg,#f87171,#dc2626);border-radius:3px;vertical-align:middle;margin-left:6px"></span>هزینه</span>'
         +  '</div>';

    el.innerHTML = html;
}
/* ============================================================
   بخش ۸ — رندر محتویات داشبورد
   ============================================================ */
function renderDashboardContents() {
    var accounts = DB.load('accounts', []);
    var vouchers = DB.load('vouchers', []).filter(function (v) { return v.status === 'approved'; });
    var banks = DB.load('bankAccounts', []);
    var cashBoxes = DB.load('cashBoxes', []);

    var pr = getPeriodMonthRange();
    var hide = getHideState('dashboard');

    /* KPI ها */
    var totalBank = 0;
    banks.forEach(function (b) { totalBank += getBankBalance(b.id); });
    var totalCash = 0;
    cashBoxes.forEach(function (c) { totalCash += getCashBoxBalance(c.id); });
    var liquidity = totalBank + totalCash;

    var liqEl = document.getElementById('dash-liquidity');
    if (liqEl) liqEl.innerHTML = (hide ? '—' : moneyHtml(liquidity)) + ' ' + currencyLabel();

    var liqSubEl = document.getElementById('dash-liquidity-sub');
    if (liqSubEl) {
        liqSubEl.innerHTML = 'بانک: ' + (hide ? '—' : moneyHtml(totalBank))
                          + ' | صندوق: ' + (hide ? '—' : moneyHtml(totalCash));
    }

    /* درآمد و هزینه ماه */
    var monthVouchers = vouchers.filter(function (v) {
        return v.date >= pr.from && v.date <= pr.to;
    });

    var incomeAmt = 0, expenseAmt = 0;
    monthVouchers.forEach(function (v) {
        (v.lines || []).forEach(function (l) {
            if (!l.account) return;
            var rootId = getRootAccountId(l.account, accounts);
            var root = accounts.find(function (a) { return a.id === rootId; });
            if (!root) return;
            var codeRoot = String(root.code || '').charAt(0);
            var d = Number(l.debit) || 0;
            var c = Number(l.credit) || 0;
            if (codeRoot === '4') incomeAmt += c;
            else if (codeRoot === '5') expenseAmt += d;
        });
    });

    var incEl = document.getElementById('dash-income');
    if (incEl) incEl.innerHTML = hide ? '—' : moneyHtml(incomeAmt);

    var expEl = document.getElementById('dash-expense');
    if (expEl) expEl.innerHTML = hide ? '—' : moneyHtml(expenseAmt);

    var profit = incomeAmt - expenseAmt;
    var prEl = document.getElementById('dash-profit');
    if (prEl) {
        prEl.innerHTML = hide ? '—' : moneyHtml(profit);
        prEl.className = 'kpi-val ' + (profit >= 0 ? 'positive' : 'negative');
    }

    var incSub = document.getElementById('dash-income-sub');
    if (incSub) incSub.textContent = getJalaliMonthName(pr.month) + ' ' + toFa(pr.year);

    var expSub = document.getElementById('dash-expense-sub');
    if (expSub) expSub.textContent = getJalaliMonthName(pr.month) + ' ' + toFa(pr.year);

    var prSub = document.getElementById('dash-profit-sub');
    if (prSub) prSub.textContent = profit >= 0 ? '✅ سود' : '⚠️ زیان';

    /* 💧 نمودار نقدینگی */
    var clEl = document.getElementById('dash-cash-liquidity');
    if (clEl) {
        var months0 = getLastNMonths(6);
        var points = months0.map(function (mo) {
            var mFrom = mo.year + '/' + pad2(mo.month) + '/01';
            var mTo = mo.year + '/' + pad2(mo.month) + '/'
                    + pad2(daysInJalaliMonth(mo.year, mo.month));
            var bal = 0;
            vouchers.forEach(function (v) {
                if (v.date < mFrom || v.date > mTo) return;
                (v.lines || []).forEach(function (l) {
                    if (!l.details) return;
                    if (l.details.bank || l.details.cashbox) {
                        bal += (Number(l.debit) || 0) - (Number(l.credit) || 0);
                    }
                });
            });
            return { label: mo.label, val: bal };
        });

        clEl.innerHTML = '<div class="mini-trend">'
            + points.map(function (p) {
                var cls = p.val >= 0 ? 'in' : 'out';
                var h = Math.min(Math.abs(p.val) / 1000000, 100) + 20;
                return '<div class="mini-bar">'
                    + '<div class="mini-bar-fill ' + cls + '" style="height:' + h + '%"></div>'
                    + '<span class="mini-lbl">' + esc(p.label) + '</span>'
                    + '<span class="mini-val">' + (hide ? '—' : moneyHtml(p.val)) + '</span>'
                    + '</div>';
            }).join('') + '</div>';
    }

    /* 🥧 دونات هزینه‌ها */
    var expByGroup = {};
    vouchers.forEach(function (v) {
        (v.lines || []).forEach(function (l) {
            if (!l.account) return;
            var d = Number(l.debit) || 0;
            if (d === 0) return;
            var rootId = getRootAccountId(l.account, accounts);
            var root = accounts.find(function (a) { return a.id === rootId; });
            if (!root || String(root.code || '').charAt(0) !== '5') return;

            var acc = accounts.find(function (a) { return a.id === l.account; });
            var lvl2 = acc;
            while (lvl2 && lvl2.parent) {
                var par = accounts.find(function (a) { return a.id === lvl2.parent; });
                if (!par || !par.parent) break;
                lvl2 = par;
            }
            var key = lvl2 ? lvl2.name : (root ? root.name : 'سایر');
            expByGroup[key] = (expByGroup[key] || 0) + d;
        });
    });
    if (document.getElementById('dash-expense-donut')) {
        renderDonutChart('dash-expense-donut', expByGroup, 'هزینه', hide);
    }

    /* 🏦 دونات دارایی‌ها */
    var assets = {};
    banks.forEach(function (b) {
        if (typeof isVisibleInDash === 'function' && !isVisibleInDash(b)) return;
        var bal = getBankBalance(b.id);
        if (bal > 0) assets['بانک ' + b.bank] = bal;
    });
    cashBoxes.forEach(function (c) {
        if (typeof isVisibleInDash === 'function' && !isVisibleInDash(c)) return;
        var bal = getCashBoxBalance(c.id);
        if (bal > 0) assets['صندوق ' + c.title] = bal;
    });
    if (document.getElementById('dash-asset-donut')) {
        renderDonutChart('dash-asset-donut', assets, 'دارایی', hide);
    }

    /* 📊 نمودار روند */
    var months2 = getLastNMonths(6);
    var monthStats = months2.map(function (mo) {
        var mFrom = mo.year + '/' + pad2(mo.month) + '/01';
        var mTo = mo.year + '/' + pad2(mo.month) + '/'
                + pad2(daysInJalaliMonth(mo.year, mo.month));
        var inc = 0, exp = 0;
        vouchers.forEach(function (v) {
            if (v.date < mFrom || v.date > mTo) return;
            (v.lines || []).forEach(function (l) {
                if (!l.account) return;
                var rootId = getRootAccountId(l.account, accounts);
                var root = accounts.find(function (a) { return a.id === rootId; });
                if (!root) return;
                var codeRoot = String(root.code || '').charAt(0);
                var d = Number(l.debit) || 0;
                var c = Number(l.credit) || 0;
                if (codeRoot === '4') inc += c;
                else if (codeRoot === '5') exp += d;
            });
        });
        return { label: mo.label, income: inc, expense: exp };
    });
    if (document.getElementById('dash-trend')) {
        renderBarChart('dash-trend', monthStats, hide);
    }

    /* 🏆 بیشترین هزینه‌ها */
    var expByMoein = {};
    vouchers.forEach(function (v) {
        (v.lines || []).forEach(function (l) {
            if (!l.account) return;
            var d = Number(l.debit) || 0;
            if (d === 0) return;
            var acc = accounts.find(function (a) { return a.id === l.account; });
            if (!acc) return;
            if (String(acc.code || '').charAt(0) !== '5') return;
            expByMoein[acc.name] = (expByMoein[acc.name] || 0) + d;
        });
    });

    var topArr = Object.keys(expByMoein).map(function (k) {
        return { name: k, val: expByMoein[k] };
    }).sort(function (a, b) {
        return b.val - a.val;
    }).slice(0, 10);

    var topEl = document.getElementById('dash-top-exp');
    if (topEl) {
        if (topArr.length === 0) {
            topEl.innerHTML = '<div class="widget-empty">هزینه‌ای ثبت نشده.</div>';
        } else {
            var h = '<div class="top-exp-list">';
            topArr.forEach(function (x, i) {
                h += '<div class="top-exp-item">'
                    + '<div class="rank">' + toFa(i + 1) + '</div>'
                    + '<div class="name">' + esc(x.name) + '</div>'
                    + '<div class="amt">' + (hide ? '—' : moneyHtml(x.val)) + ' ' + currencyLabel() + '</div>'
                    + '</div>';
            });
            h += '</div>';
            topEl.innerHTML = h;
        }
    }

    /* 📄 ۱۰ سند آخر */
    var lastV = document.getElementById('dash-last-vouchers');
    if (lastV) {
        var recent = vouchers.slice().sort(function (a, b) {
            return compareVals(b.date, a.date) || compareVals(b.number, a.number);
        }).slice(0, 10);

        if (recent.length === 0) {
            lastV.innerHTML = '<div class="widget-empty">سندی نیست.</div>';
        } else {
            lastV.innerHTML = '<div class="top-exp-list">'
                + recent.map(function (v) {
                    return '<div class="top-exp-item">'
                        + '<div class="name">#' + toFa(v.number) + ' — ' + esc(v.desc || '') + '</div>'
                        + '<div class="amt" style="color:var(--primary-dark)">'
                        + (hide ? '—' : moneyHtml(getVoucherAmount(v))) + '</div>'
                        + '<div class="muted" style="font-size:.7rem">' + toFa(v.date) + '</div>'
                        + '</div>';
                }).join('') + '</div>';
        }
    }

    /* ⏰ اقساط سررسید گذشته */
    var ovEl = document.getElementById('dash-overdue-inst');
    if (ovEl) {
        var today = todayJalaliStr();
        var facilities = DB.load('facilities', []);
        var overdue = [];

        facilities.forEach(function (f) {
            (f.installments || []).forEach(function (inst) {
                if (inst.status === 'paid') return;
                if (!inst.date || inst.date >= today) return;
                overdue.push({ f: f, inst: inst });
            });
        });

        if (overdue.length === 0) {
            ovEl.innerHTML = '<div class="widget-empty">✅ قسط سررسید گذشته‌ای نیست.</div>';
        } else {
            ovEl.innerHTML = '<div class="top-exp-list">'
                + overdue.map(function (u) {
                    return '<div class="top-exp-item">'
                        + '<div class="name">' + esc(u.f.name) + ' — ' + toFa(u.inst.date) + '</div>'
                        + '<div class="amt" style="color:var(--danger)">'
                        + (hide ? '—' : moneyHtml(u.inst.amount)) + '</div>'
                        + '</div>';
                }).join('') + '</div>';
        }
    }

    /* 🔴 بانک‌های با کسری */
    var nbEl = document.getElementById('dash-neg-banks');
    if (nbEl) {
        var deficits = [];
        banks.forEach(function (b) {
            if (typeof isVisibleInDash === 'function' && !isVisibleInDash(b)) return;
            var bal = getBankBalance(b.id);
            var minB = Number(b.minBalance) || 0;
            if (bal < minB) {
                deficits.push({ b: b, bal: bal, min: minB, def: bal - minB });
            }
        });

        if (deficits.length === 0) {
            nbEl.innerHTML = '<div class="widget-empty">✅ همه بانک‌ها بالای حداقل هستند.</div>';
        } else {
            nbEl.innerHTML = '<div class="top-exp-list">'
                + deficits.map(function (d) {
                    return '<div class="top-exp-item">'
                        + '<div class="name">' + esc(d.b.bank) + ' — ' + toFa(d.b.account || '') + '</div>'
                        + '<div class="amt" style="color:var(--danger)">'
                        + (hide ? '—' : moneyHtml(d.def)) + '</div>'
                        + '</div>';
                }).join('') + '</div>';
        }
    }

    /* 👥 پرتراکنش‌ترین اشخاص */
    var tpEl = document.getElementById('dash-top-persons');
    if (tpEl) {
        var persons = DB.load('persons', []);
        var stats = {};
        vouchers.forEach(function (v) {
            (v.lines || []).forEach(function (l) {
                if (!l.details || !l.details.person) return;
                var pid = l.details.person;
                var amt = (Number(l.debit) || 0) + (Number(l.credit) || 0);
                if (!stats[pid]) stats[pid] = { count: 0, total: 0 };
                stats[pid].count++;
                stats[pid].total += amt;
            });
        });

        var arr = Object.keys(stats).map(function (pid) {
            var p = persons.find(function (x) { return x.id === pid; });
            if (p && typeof isVisibleInDash === 'function' && !isVisibleInDash(p)) return null;
            return {
                id: pid,
                name: p ? (p.first || '') + ' ' + (p.last || '') : pid,
                count: stats[pid].count,
                total: stats[pid].total
            };
        }).filter(Boolean).sort(function (a, b) {
            return b.total - a.total;
        }).slice(0, 10);

        if (arr.length === 0) {
            tpEl.innerHTML = '<div class="widget-empty">تراکنشی با اشخاص نیست.</div>';
        } else {
            tpEl.innerHTML = '<div class="top-exp-list">'
                + arr.map(function (x, i) {
                    return '<div class="top-exp-item">'
                        + '<div class="rank">' + toFa(i + 1) + '</div>'
                        + '<div class="name">' + esc(x.name) + '</div>'
                        + '<div class="amt" style="color:var(--primary-dark)">'
                        + (hide ? '—' : moneyHtml(x.total)) + '</div>'
                        + '</div>';
                }).join('') + '</div>';
        }
    }

    /* 💸 خلاصه گردش وجه نقد */
    var cfSummaryEl = document.getElementById('dash-cf-summary');
    if (cfSummaryEl && typeof buildCashFlowDescSummaryForDash === 'function') {
        var cfSummary = buildCashFlowDescSummaryForDash();
        if (cfSummary.length === 0) {
            cfSummaryEl.innerHTML = '<div class="widget-empty">گردش وجه نقدی ثبت نشده.</div>';
        } else {
            var cfTotal = cfSummary.reduce(function (s, x) {
                return s + Math.abs(x.bal);
            }, 0) || 1;

            cfSummaryEl.innerHTML = '<div class="top-exp-list">'
                + cfSummary.map(function (x, i) {
                    var pct = (Math.abs(x.bal) / cfTotal * 100).toFixed(1);
                    var cls = x.bal >= 0 ? 'positive' : 'negative';
                    return '<div class="top-exp-item">'
                        + '<div class="rank">' + toFa(i + 1) + '</div>'
                        + '<div class="name">' + esc(x.label) + '</div>'
                        + '<div class="amt ' + cls + '">'
                        + (hide ? '—' : moneyHtml(x.bal))
                        + ' <span style="font-size:0.72rem;color:var(--text-muted)">('
                        + toFa(pct) + '٪)</span></div>'
                        + '</div>';
                }).join('') + '</div>';
        }
    }
}

/* ============================================================
   بخش ۹ — UI ترتیب و فعال/غیرفعال کارت‌ها
   ============================================================ */
function renderDashboardOrderUI() {
    var box = document.getElementById('dashboard-order-list');
    if (!box) return;

    var names = {
        cashLiquidity: '💧 نمودار نقدینگی',
        expenseDonut: '🥧 ترکیب هزینه‌ها',
        assetDonut: '🏦 ترکیب دارایی‌ها',
        trendBar: '📊 روند ۶ ماه اخیر',
        topExpenses: '🏆 بیشترین هزینه‌ها',
        lastVouchers: '📄 ۱۰ سند آخر',
        overdueInstallments: '⏰ اقساط سررسید گذشته',
        negativeBanks: '🔴 بانک‌های با کسری',
        topPersons: '👥 پرتراکنش‌ترین اشخاص',
        cashflowSummary: '💸 خلاصه عوامل گردش وجه نقد'
    };

    var order = state.dashboardOrder || [];
    box.innerHTML = '';

    order.forEach(function (key, idx) {
        var row = document.createElement('div');
        row.className = 'widget-order-row';
        var enabled = !!state.dashboards[key];

        row.innerHTML = '<label class="wo-name" style="cursor:pointer">'
            + '<input type="checkbox" data-dash-toggle="' + key + '" '
            + (enabled ? 'checked' : '') + ' style="margin-left:6px"> '
            + (names[key] || key) + '</label>'
            + '<div class="wo-btns">'
            + '<button class="wo-btn" data-dash-key="' + key + '" data-dir="-1"'
            + (idx === 0 ? ' disabled' : '') + '>↑</button>'
            + '<button class="wo-btn" data-dash-key="' + key + '" data-dir="1"'
            + (idx === order.length - 1 ? ' disabled' : '') + '>↓</button>'
            + '</div>';
        box.appendChild(row);
    });

    box.querySelectorAll('.wo-btn').forEach(function (b) {
        b.addEventListener('click', function () {
            var key = this.getAttribute('data-dash-key');
            var dir = Number(this.getAttribute('data-dir'));
            var arr = state.dashboardOrder.slice();
            var i = arr.indexOf(key);
            var j = i + dir;
            if (j < 0 || j >= arr.length) return;
            var tmp = arr[i];
            arr[i] = arr[j];
            arr[j] = tmp;
            state.dashboardOrder = arr;
            DB.save('dashboardOrder', arr);
            renderDashboardOrderUI();
            renderDashboard();
        });
    });

    box.querySelectorAll('[data-dash-toggle]').forEach(function (cb) {
        cb.addEventListener('change', function () {
            var k = this.getAttribute('data-dash-toggle');
            state.dashboards[k] = this.checked;
            DB.save('dashboards', state.dashboards);
            renderDashboard();
        });
    });
}

/* ============================================================
   صادرسازی
   ============================================================ */
window.CHART_COLORS              = CHART_COLORS;
window.getLastNMonths            = getLastNMonths;
window.getDashboardCard          = getDashboardCard;
window.renderDashboard           = renderDashboard;
window.renderDashboardContents   = renderDashboardContents;
window.renderDonutChart          = renderDonutChart;
window.renderBarChart            = renderBarChart;
window.renderDashboardOrderUI    = renderDashboardOrderUI;

console.log('✅ [modules/dashboard.js] loaded — complete');
