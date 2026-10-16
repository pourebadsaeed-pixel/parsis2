/* ============================================================
   پارسیس — گزارش نقدینگی و گردش وجه نقد
   مسیر: js/modules/reports/cashflow.js
   وابستگی: core/* + ui/* + vouchers/*
   ============================================================ */
'use strict';

/* ============================================================
   بخش ۱ — نمایش مبالغ HTML-محور
   ============================================================ */
function moneyHtml(n, key) {
    if (key && typeof getHideState === 'function' && getHideState(key)) return '—';
    n = Number(n) || 0;
    var mode = state.currencyDisplay || 'rial';
    var v = n;
    var decimals = 0;
    if (mode === 'toman') v = n / 10;
    else if (mode === 'million') { v = n / 1000000; decimals = 3; }

    var abs = Math.abs(v);
    var str = abs.toLocaleString('fa-IR', { maximumFractionDigits: decimals }).replace(/\u066C/g, ',');
    if (v < 0) return '<span class="neg-money">(' + str + ')</span>';
    return str;
}

function moneyText(n) {
    n = Number(n) || 0;
    var mode = state.currencyDisplay || 'rial';
    var v = n;
    if (mode === 'toman') v = n / 10;
    else if (mode === 'million') v = n / 1000000;
    var abs = Math.abs(v);
    var str = abs.toLocaleString('fa-IR', { maximumFractionDigits: mode === 'million' ? 3 : 0 }).replace(/\u066C/g, ',');
    return v < 0 ? '(' + str + ')' : str;
}

/* ============================================================
   بخش ۲ — محاسبه مانده بانک
   ============================================================ */
function computeBankBalanceLatest() {
    var vouchers = DB.load('vouchers', []);
    var banks = DB.load('bankAccounts', []);
    var bankIds = banks.map(function (b) { return b.id; });
    var total = 0;

    vouchers.forEach(function (v) {
        if (v.status !== 'approved') return;
        (v.lines || []).forEach(function (line) {
            if (line.details && line.details.bank && bankIds.indexOf(line.details.bank) !== -1) {
                total += (Number(line.debit) || 0) - (Number(line.credit) || 0);
            }
        });
    });
    return total;
}

function computeBankBalanceAtDate() {
    return computeBankBalanceLatest();
}

/* ============================================================
   بخش ۳ — شروع سال مالی فعال
   ============================================================ */
function getActiveFiscalYearStart() {
    var periods = DB.load('fiscalPeriods', []);
    var p = periods.find(function (x) { return x.id === state.activePeriodId; });
    if (!p || !p.from) return '';
    var parts = String(p.from).split('/');
    if (parts.length !== 3) return '';
    return parts[0] + '/01/01';
}

/* ============================================================
   بخش ۴ — گزارش پیش‌بینی روزانه نقدینگی
   ✅ اصلاح: فعال‌سازی ریسایز ستون‌ها روی cf-table
   ============================================================ */
function runCashFlowReport() {
    var fromDate = normalizeDigits((document.getElementById('cf-from').value || '').trim());
    var toDate = normalizeDigits((document.getElementById('cf-to').value || '').trim());

    var yearStart = getActiveFiscalYearStart();
    if (!fromDate) fromDate = yearStart || todayJalaliStr();
    if (!toDate) toDate = todayJalaliStr();

    document.getElementById('cf-from').value = fromDate;
    document.getElementById('cf-to').value = toDate;

    if (fromDate > toDate) {
        alert('تاریخ شروع باید قبل از پایان باشد.');
        return;
    }

    var hide = getHideState('cf');
    var bankBalance = computeBankBalanceLatest();

    /* منابع دریافتنی */
    var sources = DB.load('cashFlowSources', []);
    var sourcesInRange = sources.filter(function (s) {
        if (!s.expectedDate) return true;
        return s.expectedDate >= fromDate && s.expectedDate <= toDate;
    });

    /* اقساط تسهیلات */
    var facilities = DB.load('facilities', []);
    var facilityInsts = [];
    facilities.forEach(function (f) {
        (f.installments || []).forEach(function (inst) {
            if (inst.status === 'paid') return;
            if (!inst.date) return;
            if (inst.date < fromDate || inst.date > toDate) return;
            facilityInsts.push({ f: f, inst: inst });
        });
    });

    /* برآورد هزینه‌ها */
    var estimates = DB.load('dailyEstimates', []);
    var estimateItemsArr = [];
    estimates.forEach(function (est) {
        (est.items || []).forEach(function (it) {
            if (!it.date) return;
            if (it.date < fromDate || it.date > toDate) return;
            estimateItemsArr.push({ est: est, item: it });
        });
    });

    var items = [];

    sourcesInRange.forEach(function (s) {
        var sourceLabel = getSourceLabel(s);
        var titleFromNotes = (s.notes && String(s.notes).trim()) ? String(s.notes).trim() : '';
        var displayTitle = titleFromNotes || sourceLabel;
        var metaLine = titleFromNotes
            ? ' <span class="muted" style="font-size:0.72rem">(' + esc(sourceLabel) + ')</span>'
            : '';
        items.push({
            type: 'source',
            date: s.expectedDate || fromDate,
            sortDate: s.expectedDate || (fromDate + '~'),
            amount: Number(s.amount) || 0,
            label: '📥 ' + esc(displayTitle) + metaLine,
            notes: ''
        });
    });

    facilityInsts.forEach(function (item) {
        items.push({
            type: 'facility',
            date: item.inst.date,
            sortDate: item.inst.date,
            amount: -Number(item.inst.amount || 0),
            label: '💸 قسط ' + esc(item.f.name),
            notes: ''
        });
    });

    estimateItemsArr.forEach(function (item) {
        items.push({
            type: 'estimate',
            date: item.item.date,
            sortDate: item.item.date,
            amount: -Number(item.item.amount || 0),
            label: '📝 ' + esc(item.est.title || item.est.desc || 'برآورد'),
            notes: ''
        });
    });

    items.sort(function (a, b) { return compareVals(a.sortDate, b.sortDate); });

    /* رسم */
    var html = '<div class="cf-report"><div class="table-wrap">';
    html += '<table class="cf-table" id="cf-table" data-table-id="cf-table"><thead><tr>'
         +  '<th style="width:35%">عنوان دسته</th>'
         +  '<th style="width:15%">تاریخ</th>'
         +  '<th style="width:25%">مبلغ</th>'
         +  '<th style="width:25%">مانده در خط</th>'
         +  '</tr></thead><tbody>';

    var running = bankBalance;
    var bbCls = bankBalance < 0 ? 'cf-neg' : '';
    var bbText = hide ? '—'
        : (bankBalance < 0 ? '(' + formatMoney(Math.abs(bankBalance)) + ')' : formatMoney(bankBalance));

    html += '<tr class="cf-bank-row">'
         +  '<td class="cf-cat">💰 مانده بانک ها (آخرین مانده لحظه‌ای)</td>'
         +  '<td dir="ltr">' + toFa(fromDate) + '</td>'
         +  '<td class="num ' + bbCls + '">' + bbText + '</td>'
         +  '<td class="num ' + bbCls + '">' + bbText + '</td>'
         +  '</tr>';

    items.forEach(function (it) {
        running += it.amount;

        var amtCls = '';
        var amtText = '';
        if (it.type === 'facility' || it.type === 'estimate') {
            amtCls = 'cf-neg';
            amtText = hide ? '—' : '(' + formatMoney(Math.abs(it.amount)) + ')';
        } else {
            amtCls = 'cf-pos';
            amtText = hide ? '—' : formatMoney(it.amount);
        }

        var balCls = running < 0 ? 'cf-neg' : '';
        var balText = hide ? '—'
            : (running < 0 ? '(' + formatMoney(Math.abs(running)) + ')' : formatMoney(running));

        var rowCls = it.type === 'facility' ? 'cf-fac-row'
                   : (it.type === 'estimate' ? 'cf-est-row' : 'cf-source-row');

        var label = it.label;
        if (it.notes) {
            label += ' <span class="muted" style="font-size:0.72rem">(' + esc(it.notes) + ')</span>';
        }

        html += '<tr class="' + rowCls + '">'
             +  '<td class="cf-cat">' + label + '</td>'
             +  '<td dir="ltr">' + toFa(esc(it.date)) + '</td>'
             +  '<td class="num ' + amtCls + '">' + amtText + '</td>'
             +  '<td class="num ' + balCls + '">' + balText + '</td>'
             +  '</tr>';
    });

    html += '</tbody>';

    var finalCls = running < 0 ? 'cf-neg' : '';
    var finalText = hide ? '—'
        : (running < 0 ? '(' + formatMoney(Math.abs(running)) + ')' : formatMoney(running));

    html += '<tfoot><tr><td colspan="2" style="text-align:left">مانده نهایی</td>'
         +  '<td class="num"></td>'
         +  '<td class="num ' + finalCls + '">' + finalText + '</td></tr></tfoot>';

    html += '</table></div></div>';

    document.getElementById('cf-result').innerHTML = html;
    document.getElementById('cf-count').textContent = toFa(items.length + 1) + ' ردیف';

    var unitEl = document.getElementById('cf-unit');
    if (unitEl) unitEl.textContent = 'واحد: ' + currencyLabel();

    /* ✅ فعال‌سازی ریسایز ستون‌ها */
    setTimeout(function () {
        var t = document.getElementById('cf-table');
        if (t && typeof makeTableResizable === 'function') {
            makeTableResizable(t);
        }
        if (typeof applyColVisibility === 'function') applyColVisibility('cf-table');
        if (typeof applyColWidths === 'function') applyColWidths('cf-table');
        if (typeof buildHeaderButtons === 'function') buildHeaderButtons();
    }, 30);

    if (typeof autoAttachReportHelpers === 'function') autoAttachReportHelpers();
}

/* ============================================================
   بخش ۵ — گزارش گردش وجه نقد
   ✅ اصلاح: فعال‌سازی ریسایز روی cfd-table و جداول جزئیات
   ============================================================ */
function runCashFlowByDescReport() {
    var fromD = normalizeDigits((document.getElementById('cfd-from').value || '').trim());
    var toD   = normalizeDigits((document.getElementById('cfd-to').value || '').trim());

    var yearStart = getActiveFiscalYearStart();
    if (!fromD) fromD = yearStart || todayJalaliStr();
    if (!toD) toD = todayJalaliStr();
    if (fromD > toD) {
        alert('تاریخ شروع باید قبل از پایان باشد.');
        return;
    }

    document.getElementById('cfd-from').value = fromD;
    document.getElementById('cfd-to').value = toD;

    var vtype    = document.getElementById('cfd-vtype').value;
    var viewMode = document.getElementById('cfd-view').value;
    var stripB   = document.getElementById('cfd-strip-babet').checked;

    var onlyBalEl = document.getElementById('cfd-only-balance');
    var onlyBal = onlyBalEl ? onlyBalEl.checked : false;
    var hide     = getHideState('cfd');

    var accounts = DB.load('accounts', []);
    var effectiveAccs = {};
    accounts.forEach(function (a) { if (a.cfEffect) effectiveAccs[a.id] = true; });

    if (Object.keys(effectiveAccs).length === 0) {
        document.getElementById('cfd-result').innerHTML =
            '<div class="card"><p class="muted" style="text-align:center;padding:16px">'
            + '⚠️ هیچ معینی با گزینه «موثر در گزارش گردش وجه نقد» تعریف نشده است.</p></div>';
        document.getElementById('cfd-count').textContent = '۰';
        return;
    }

    var vouchers = DB.load('vouchers', []).filter(function (v) {
        if (v.status !== 'approved') return false;
        if (v.date < fromD || v.date > toD) return false;
        if (vtype && v.type !== vtype) return false;
        return true;
    });

    function stripBabet(t) {
        if (!stripB) return t;
        return String(t || '').replace(/^\s*بابت\s*[:\-–]?\s*/, '').trim();
    }

    var buckets = {};
    vouchers.forEach(function (v) {
        (v.lines || []).forEach(function (l) {
            if (!l.account || !effectiveAccs[l.account]) return;
            var desc = stripBabet((l.description || '').trim()) || '(بدون شرح)';
            if (!buckets[desc]) buckets[desc] = { in: 0, out: 0, details: [] };
            var d = Number(l.debit) || 0;
            var c = Number(l.credit) || 0;
            buckets[desc].in += d;
            buckets[desc].out += c;
            buckets[desc].details.push({
                voucherId: v.id,
                date: v.date,
                number: v.number,
                desc: v.desc,
                accLabel: getAccountLabel(l.account, accounts),
                lineDesc: stripBabet(l.description || ''),
                debit: d,
                credit: c
            });
        });
    });

    var keys = Object.keys(buckets);
    if (onlyBal) {
        keys = keys.filter(function (k) {
            return Math.abs(buckets[k].in - buckets[k].out) > 0.5;
        });
    }
    keys.sort(function (a, b) { return compareVals(a, b); });

    if (keys.length === 0) {
        document.getElementById('cfd-result').innerHTML =
            '<div class="card"><p class="muted" style="text-align:center;padding:16px">در این بازه گردشی ثبت نشده است.</p></div>';
        document.getElementById('cfd-count').textContent = '۰';
        return;
    }

    var grandIn = 0, grandOut = 0;
    keys.forEach(function (k) {
        grandIn += buckets[k].in;
        grandOut += buckets[k].out;
    });
    var grandBalance = grandIn - grandOut;
    var grandAbs = Math.abs(grandBalance) || 1;

    var html = '';

    /* گزارش اصلی */
    if (viewMode === 'main' || viewMode === 'full') {
        html += '<div class="cfd-section-title">📋 گزارش اصلی</div>';
        html += '<div class="cfd-scroll-wrap"><div class="table-wrap"><table class="report-table" id="cfd-table" data-table-id="cfd-table"><thead><tr>'
             +  '<th style="width:50px">#</th>'
             +  '<th style="min-width:180px">بابت / شرح</th>'
             +  '<th style="width:130px">ورود (بدهکار)</th>'
             +  '<th style="width:130px">خروج (بستانکار)</th>'
             +  '<th style="width:130px">مانده</th>'
             +  '<th style="width:80px">تعداد</th>'
             +  '<th style="width:90px">درصد</th>'
             +  '</tr></thead><tbody>';

        var tIn = 0, tOut = 0;
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            var b = buckets[k];
            var bal = b.in - b.out;
            tIn += b.in;
            tOut += b.out;
            var pct = (bal / grandAbs) * 100;
            var pctCls = pct >= 0 ? 'cr' : 'dr';
            var pctText;
            if (pct < 0) pctText = '(' + toFa(Math.abs(pct).toFixed(2)) + '٪)';
            else pctText = '+' + toFa(Math.abs(pct).toFixed(2)) + '٪';

            html += '<tr><td class="num">' + toFa(i + 1) + '</td>'
                 +  '<td><strong>' + esc(k) + '</strong></td>'
                 +  '<td class="num" style="color:#1e9e6a">' + (hide ? '—' : (b.in ? moneyHtml(b.in) : '—')) + '</td>'
                 +  '<td class="num" style="color:#c0392b">' + (hide ? '—' : (b.out ? moneyHtml(b.out) : '—')) + '</td>'
                 +  '<td class="num" style="font-weight:bold">' + (hide ? '—' : moneyHtml(bal)) + '</td>'
                 +  '<td class="num">' + toFa(b.details.length) + '</td>'
                 +  '<td class="num ' + pctCls + '">' + (hide ? '—' : pctText) + '</td></tr>';
        }

        var totalBal = tIn - tOut;
        var totalPctText = totalBal < 0 ? '(۱۰۰.۰۰٪)' : '+۱۰۰.۰۰٪';

        html += '</tbody><tfoot><tr><td colspan="2" style="text-align:left">جمع کل</td>'
             +  '<td class="num" style="color:#1e9e6a">' + (hide ? '—' : moneyHtml(tIn)) + '</td>'
             +  '<td class="num" style="color:#c0392b">' + (hide ? '—' : moneyHtml(tOut)) + '</td>'
             +  '<td class="num">' + (hide ? '—' : moneyHtml(tIn - tOut)) + '</td><td></td>'
             +  '<td class="num">' + (hide ? '—' : totalPctText) + '</td></tr></tfoot></table></div></div>';
    }

    /* جزئیات */
    if (viewMode === 'details' || viewMode === 'full') {
        if (viewMode === 'full') {
            html += '<div class="cfd-section-title" style="margin-top:22px">📖 جزئیات اسناد</div>';
        }

        for (var j = 0; j < keys.length; j++) {
            var k2 = keys[j];
            var b2 = buckets[k2];

            html += '<div class="cfd-group" style="margin-top:14px">'
                 +   '<div class="cfd-head" onclick="this.nextElementSibling.classList.toggle(\'show\')">'
                 +     '<div class="cfd-title">' + esc(k2) + '</div>'
                 +     '<div class="cfd-nums">'
                 +       '<span class="n in">ورود: ' + (hide ? '—' : moneyHtml(b2.in)) + '</span>'
                 +       '<span class="n out">خروج: ' + (hide ? '—' : moneyHtml(b2.out)) + '</span>'
                 +       '<span class="n bal">مانده: ' + (hide ? '—' : moneyHtml(b2.in - b2.out)) + '</span>'
                 +     '</div>'
                 +   '</div>'
                 +   '<div class="cfd-details">'
                 +     '<div class="cfd-hscroll">'
                 +       '<table class="data-table cfd-detail-table" data-table-id="cfd-detail-' + j + '">'
                 +         '<thead><tr><th style="width:50px">#</th>'
                 +         '<th style="width:100px">تاریخ</th>'
                 +         '<th style="width:80px">شماره</th>'
                 +         '<th style="min-width:140px">شرح سند</th>'
                 +         '<th style="min-width:140px">حساب</th>'
                 +         '<th style="min-width:140px">شرح قلم</th>'
                 +         '<th style="width:120px">بدهکار</th>'
                 +         '<th style="width:120px">بستانکار</th>'
                 +         '<th style="width:90px">عملیات</th></tr></thead><tbody>';

            for (var di = 0; di < b2.details.length; di++) {
                var d2 = b2.details[di];
                html += '<tr class="cfd-row" data-vid="' + d2.voucherId + '" style="cursor:pointer">'
                     +   '<td>' + toFa(di + 1) + '</td>'
                     +   '<td dir="ltr">' + toFa(d2.date) + '</td>'
                     +   '<td dir="ltr">' + toFa(d2.number) + '</td>'
                     +   '<td>' + esc(d2.desc || '') + '</td>'
                     +   '<td>' + esc(d2.accLabel) + '</td>'
                     +   '<td>' + esc(d2.lineDesc) + '</td>'
                     +   '<td class="num dr">' + (hide ? '—' : (d2.debit ? moneyHtml(d2.debit) : '—')) + '</td>'
                     +   '<td class="num cr">' + (hide ? '—' : (d2.credit ? moneyHtml(d2.credit) : '—')) + '</td>'
                     +   '<td><button class="row-btn edit" data-vid="' + d2.voucherId + '" title="ویرایش سند">✎</button></td>'
                     + '</tr>';
            }
            html += '</tbody></table></div></div></div>';
        }
    }

    document.getElementById('cfd-result').innerHTML = html;
    document.getElementById('cfd-count').textContent = toFa(keys.length) + ' دسته';

    var unitEl = document.getElementById('cfd-unit');
    if (unitEl) unitEl.textContent = 'واحد: ' + currencyLabel();

    /* اتصال رویداد ویرایش */
    document.querySelectorAll('#cfd-result .cfd-row').forEach(function (row) {
        row.addEventListener('click', function (e) {
            if (e.target.closest('button')) return;
            var vid = this.getAttribute('data-vid');
            if (typeof openVoucherForEditById === 'function') openVoucherForEditById(vid);
        });
    });

    document.querySelectorAll('#cfd-result .row-btn.edit').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            var vid = this.getAttribute('data-vid');
            if (typeof openVoucherForEditById === 'function') openVoucherForEditById(vid);
        });
    });

    /* ✅ فعال‌سازی ریسایز ستون‌ها روی همه جداول cfd */
    setTimeout(function () {
        var t = document.getElementById('cfd-table');
        if (t && typeof makeTableResizable === 'function') makeTableResizable(t);

        /* جداول جزئیات */
        document.querySelectorAll('#cfd-result .cfd-detail-table').forEach(function (tt) {
            if (typeof makeTableResizable === 'function') makeTableResizable(tt);
        });

        if (typeof applyColVisibility === 'function') applyColVisibility('cfd-table');
        if (typeof applyColWidths === 'function') applyColWidths('cfd-table');
    }, 30);

    if (typeof autoAttachReportHelpers === 'function') autoAttachReportHelpers();
}

/* ============================================================
   بخش ۶ — خلاصه گردش وجه نقد برای داشبورد
   ============================================================ */
function buildCashFlowDescSummaryForDash() {
    var d = new Date();
    var j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    var fromD = j[0] + '/01/01';
    var today = j[0] + '/' + pad2(j[1]) + '/' + pad2(j[2]);

    var accounts = DB.load('accounts', []);
    var effectiveAccs = {};
    accounts.forEach(function (a) { if (a.cfEffect) effectiveAccs[a.id] = true; });

    var vouchers = DB.load('vouchers', []).filter(function (v) {
        return v.status === 'approved' && v.date >= fromD && v.date <= today;
    });

    var buckets = {};
    vouchers.forEach(function (v) {
        (v.lines || []).forEach(function (l) {
            if (!l.account || !effectiveAccs[l.account]) return;
            var desc = String(l.description || '').trim()
                .replace(/^\s*بابت\s*[:\-–]?\s*/, '').trim() || '(بدون شرح)';
            if (!buckets[desc]) buckets[desc] = { in: 0, out: 0 };
            buckets[desc].in  += Number(l.debit) || 0;
            buckets[desc].out += Number(l.credit) || 0;
        });
    });

    return Object.keys(buckets).map(function (k) {
        return { label: k, bal: buckets[k].in - buckets[k].out };
    }).sort(function (a, b) {
        return Math.abs(b.bal) - Math.abs(a.bal);
    }).slice(0, 8);
}

/* ============================================================
   بخش ۷ — اتصال دکمه‌های گردش وجه نقد
   ============================================================ */
function bindCashFlowReportButtons() {
    var runCf = document.getElementById('cf-run');
    if (runCf) runCf.addEventListener('click', runCashFlowReport);

    var todayCf = document.getElementById('cf-today');
    if (todayCf) todayCf.addEventListener('click', function () {
        var t = todayJalaliStr();
        document.getElementById('cf-from').value = t;
        document.getElementById('cf-to').value = addJalaliDays(t, 30);
        runCashFlowReport();
    });

    var runCfd = document.getElementById('cfd-run');
    if (runCfd) runCfd.addEventListener('click', runCashFlowByDescReport);

    var todayCfd = document.getElementById('cfd-today');
    if (todayCfd) todayCfd.addEventListener('click', function () {
        var t = todayJalaliStr();
        document.getElementById('cfd-from').value = t;
        document.getElementById('cfd-to').value = addJalaliDays(t, 30);
        runCashFlowByDescReport();
    });

    var onlyBal = document.getElementById('cfd-only-balance');
    if (onlyBal) onlyBal.addEventListener('change', runCashFlowByDescReport);
}

/* ============================================================
   صادرسازی
   ============================================================ */
window.moneyHtml                       = moneyHtml;
window.moneyText                       = moneyText;
window.fmtFor                          = function (n, key) {
    if (typeof getHideState === 'function' && getHideState(key)) return '—';
    return moneyHtml(n);
};
window.fmtRep                          = function (n, key) { return window.fmtFor(n, key); };
window.formatMoneyHTML                 = function (n) { return moneyHtml(n); };
window.computeBankBalanceLatest        = computeBankBalanceLatest;
window.computeBankBalanceAtDate        = computeBankBalanceAtDate;
window.getActiveFiscalYearStart        = getActiveFiscalYearStart;
window.runCashFlowReport               = runCashFlowReport;
window.runCashFlowByDescReport         = runCashFlowByDescReport;
window.buildCashFlowDescSummaryForDash = buildCashFlowDescSummaryForDash;
window.bindCashFlowReportButtons       = bindCashFlowReportButtons;

console.log('✅ [modules/reports/cashflow.js] loaded — complete');
