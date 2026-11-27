/* ============================================================
   پارسیس — گزارش‌های خرید ✅ v2.7.0
   مسیر: js/modules/purchase-reports.js

   پنج گزارش (مثل داشبورد خرید ERPهای روز دنیا):
     ۱) جمع خرید دوره — تعداد/مبلغ فاکتورها + پرداخت/مانده
     ۲) خرید به تفکیک تامین‌کننده
     ۳) خرید به تفکیک کالا
     ۴) سفارش‌های باز — سفارش‌هایی که کامل دریافت نشده‌اند
     ۵) درخواست‌های در انتظار — گردش کار تأیید خرید
   ============================================================ */
'use strict';

var PRP_REPORT_TYPES = [
    { key: 'summary',  label: 'جمع خرید دوره' },
    { key: 'supplier', label: 'خرید به تفکیک تامین‌کننده' },
    { key: 'item',     label: 'خرید به تفکیک کالا' },
    { key: 'openpo',   label: 'سفارش‌های باز' },
    { key: 'pending',  label: 'درخواست‌های در انتظار' }
];

function _prpFillTypeSelect() {
    var sel = document.getElementById('prp-type');
    if (!sel) return;
    var html = '';
    PRP_REPORT_TYPES.forEach(function (t) {
        html += '<option value="' + t.key + '">' + t.label + '</option>';
    });
    sel.innerHTML = html;
}

function _prpInvoices(from, to) {
    var list = DB.load('purchaseInvoices', []);
    if (!Array.isArray(list)) list = [];
    return list.filter(function (v) {
        if (v.status !== 'approved') return false; /* فقط فاکتورهای تأییدشده */
        var d = String(v.date || '');
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
    });
}

function runPurchaseReport() {
    var typeEl = document.getElementById('prp-type');
    var fromEl = document.getElementById('prp-from');
    var toEl = document.getElementById('prp-to');
    var body = document.getElementById('prp-body');
    var summaryEl = document.getElementById('prp-summary');
    if (!body || !typeEl) return;

    var type = typeEl.value || 'summary';
    var from = fromEl ? normalizeDigits(fromEl.value.trim()) : '';
    var to = toEl ? normalizeDigits(toEl.value.trim()) : '';

    var html = '';
    var total = 0, count = 0;

    if (type === 'summary') {
        var invs = _prpInvoices(from, to);
        var totalPaid = 0;
        invs.forEach(function (v) {
            var t = plTotals(v.lines, v.discount, v.taxRate);
            total += t.total;
            totalPaid += Number(v.paid) || 0;
        });
        count = invs.length;
        html = '<table class="data-table" id="prp-table"><thead><tr>' +
            '<th>تعداد فاکتور تأییدشده</th><th>جمع خرید</th><th>پرداخت‌شده</th><th>مانده بدهی</th>' +
            '</tr></thead><tbody><tr>' +
            '<td>' + toFa(String(count)) + '</td>' +
            '<td style="font-weight:800;color:#065f46">' + esc(formatMoney(total)) + ' ' + esc(currencyLabel()) + '</td>' +
            '<td>' + esc(formatMoney(totalPaid)) + ' ' + esc(currencyLabel()) + '</td>' +
            '<td style="font-weight:800;color:#92400e">' + esc(formatMoney(total - totalPaid)) + ' ' + esc(currencyLabel()) + '</td>' +
            '</tr></tbody></table>' +
            '<p class="muted" style="font-size:.72rem;margin-top:8px">💡 فقط فاکتورهای «تأییدشده» در آمار می‌آیند؛ برای تأیید از فهرست فاکتورها ✓ بزنید.</p>';
    }

    if (type === 'supplier') {
        var bySupplier = {};
        invs = _prpInvoices(from, to);
        invs.forEach(function (v) {
            var key = v.supplierId || '—';
            if (!bySupplier[key]) bySupplier[key] = { count: 0, sub: 0, total: 0, paid: 0 };
            var t = plTotals(v.lines, v.discount, v.taxRate);
            bySupplier[key].count++;
            bySupplier[key].sub += t.sub;
            bySupplier[key].total += t.total;
            bySupplier[key].paid += Number(v.paid) || 0;
        });
        html = '<table class="data-table" id="prp-table"><thead><tr>' +
            '<th>تامین‌کننده</th><th>تعداد فاکتور</th><th>جمع اقلام</th><th>مبلغ نهایی</th><th>پرداخت‌شده</th><th>مانده</th>' +
            '</tr></thead><tbody>';
        var keys = Object.keys(bySupplier).sort(function (a, b) { return bySupplier[b].total - bySupplier[a].total; });
        keys.forEach(function (k) {
            var r = bySupplier[k];
            total += r.total; count += r.count;
            html += '<tr><td>' + (k === '—' ? 'بدون تامین‌کننده' : esc(plPersonName(k))) + '</td>' +
                '<td>' + toFa(String(r.count)) + '</td>' +
                '<td>' + esc(formatMoney(r.sub)) + '</td>' +
                '<td style="font-weight:800">' + esc(formatMoney(r.total)) + '</td>' +
                '<td>' + esc(formatMoney(r.paid)) + '</td>' +
                '<td style="font-weight:800;color:#92400e">' + esc(formatMoney(r.total - r.paid)) + '</td></tr>';
        });
        html += '</tbody></table>';
        if (!keys.length) html = '<p class="empty-row">فاکتوری در این بازه نیست.</p>';
    }

    if (type === 'item') {
        var byItem = {};
        _prpInvoices(from, to).forEach(function (v) {
            (v.lines || []).forEach(function (l) {
                var key = l.itemId || ('desc:' + (l.desc || ''));
                if (!byItem[key]) byItem[key] = { itemId: l.itemId || '', desc: l.desc || '', qty: 0, total: 0 };
                byItem[key].qty += Number(l.qty) || 0;
                byItem[key].total += (Number(l.qty) || 0) * (Number(l.price) || 0);
            });
        });
        html = '<table class="data-table" id="prp-table"><thead><tr>' +
            '<th>کالا</th><th>شرح</th><th>تعداد خرید</th><th>جمع مبلغ</th><th>فی میانگین</th>' +
            '</tr></thead><tbody>';
        var ikeys = Object.keys(byItem).sort(function (a, b) { return byItem[b].total - byItem[a].total; });
        ikeys.forEach(function (k) {
            var r = byItem[k];
            total += r.total;
            var avg = r.qty > 0 ? r.total / r.qty : 0;
            html += '<tr>' +
                '<td>' + (r.itemId ? esc(plItemName(r.itemId)) : '—') + '</td>' +
                '<td>' + esc(r.desc || '—') + '</td>' +
                '<td>' + toFa(String(r.qty)) + '</td>' +
                '<td style="font-weight:800">' + esc(formatMoney(r.total)) + ' ' + esc(currencyLabel()) + '</td>' +
                '<td>' + esc(formatMoney(Math.round(avg))) + '</td></tr>';
        });
        html += '</tbody></table>';
        if (!ikeys.length) html = '<p class="empty-row">قلمی در این بازه خرید نشده است.</p>';
    }

    if (type === 'openpo') {
        var pos = DB.load('purchaseOrders', []);
        if (!Array.isArray(pos)) pos = [];
        html = '<table class="data-table" id="prp-table"><thead><tr>' +
            '<th>شماره</th><th>تاریخ</th><th>تامین‌کننده</th><th>وضعیت</th><th>اقلام</th><th>دریافت‌شده</th><th>باقی‌مانده</th><th>مبلغ سفارش</th>' +
            '</tr></thead><tbody>';
        var any = false;
        pos.forEach(function (po) {
            if (po.status === 'cancelled' || po.status === 'closed' || po.status === 'invoiced') return;
            var lineCount = (po.lines || []).length;
            var receivedCount = (po.lines || []).filter(function (l) { return (Number(l.received) || 0) >= (Number(l.qty) || 0); }).length;
            if (receivedCount === lineCount && lineCount > 0) return; /* کامل دریافت‌شده */
            any = true;
            var t = plTotals(po.lines, po.discount, po.taxRate);
            total += t.total; count++;
            html += '<tr>' +
                '<td dir="ltr">' + toFa(esc(po.no || '—')) + '</td>' +
                '<td dir="ltr">' + toFa(esc(po.date || '—')) + '</td>' +
                '<td>' + esc(plPersonName(po.supplierId)) + '</td>' +
                '<td>' + _poStatusBadgeHtml(po.status) + '</td>' +
                '<td>' + toFa(String(lineCount)) + '</td>' +
                '<td>' + toFa(String(receivedCount)) + '</td>' +
                '<td>' + toFa(String(lineCount - receivedCount)) + '</td>' +
                '<td style="font-weight:800">' + esc(formatMoney(t.total)) + ' ' + esc(currencyLabel()) + '</td></tr>';
        });
        html += '</tbody></table>';
        if (!any) html = '<p class="empty-row">سفارش بازی باز نیست — همه کامل دریافت شده‌اند.</p>';
    }

    if (type === 'pending') {
        var reqs = DB.load('purchaseReqs', []);
        if (!Array.isArray(reqs)) reqs = [];
        html = '<table class="data-table" id="prp-table"><thead><tr>' +
            '<th>شماره</th><th>تاریخ</th><th>تاریخ نیاز</th><th>درخواست‌کننده</th><th>وضعیت</th><th>اقلام</th><th>جمع برآوردی</th>' +
            '</tr></thead><tbody>';
        var any2 = false;
        reqs.forEach(function (r) {
            if (r.status !== 'draft' && r.status !== 'pending') return;
            any2 = true;
            var t = plTotals(r.lines, 0, 0);
            count++;
            html += '<tr>' +
                '<td dir="ltr">' + toFa(esc(r.no || '—')) + '</td>' +
                '<td dir="ltr">' + toFa(esc(r.date || '—')) + '</td>' +
                '<td dir="ltr">' + toFa(esc(r.needDate || '—')) + '</td>' +
                '<td>' + esc(r.requester || '—') + '</td>' +
                '<td>' + _prqStatusBadgeHtml(r.status) + '</td>' +
                '<td>' + toFa(String((r.lines || []).length)) + '</td>' +
                '<td style="font-weight:800">' + esc(formatMoney(t.sub)) + ' ' + esc(currencyLabel()) + '</td></tr>';
        });
        html += '</tbody></table>';
        if (!any2) html = '<p class="empty-row">درخواستی در انتظار نیست.</p>';
    }

    body.innerHTML = html;

    if (summaryEl) {
        summaryEl.innerHTML = (type === 'openpo' || type === 'pending')
            ? 'تعداد ردیف‌ها: ' + toFa(String(count))
            : (type === 'summary'
                ? ''
                : 'جمع کل: ' + esc(formatMoney(total)) + ' ' + esc(currencyLabel()));
    }

    if (typeof makeAllTablesResizable === 'function') makeAllTablesResizable();
    if (typeof applyColVisibilityAll === 'function') applyColVisibilityAll();
}

/* نماد وضعیت — از تعریف‌های purchase.js استفاده می‌کند */
function _poStatusBadgeHtml(key) {
    var s = PO_STATUS.filter(function (x) { return x.key === key; })[0] || PO_STATUS[0];
    return '<span style="display:inline-block;background:' + s.bg + ';color:' + s.fg + ';border-radius:99px;padding:2px 10px;font-size:.68rem;font-weight:800">' + esc(s.label) + '</span>';
}
function _prqStatusBadgeHtml(key) {
    var s = PREQ_STATUS.filter(function (x) { return x.key === key; })[0] || PREQ_STATUS[0];
    return '<span style="display:inline-block;background:' + s.bg + ';color:' + s.fg + ';border-radius:99px;padding:2px 10px;font-size:.68rem;font-weight:800">' + esc(s.label) + '</span>';
}

function initPurchaseReportsPage() {
    _prpFillTypeSelect();

    var fromEl = document.getElementById('prp-from');
    var toEl = document.getElementById('prp-to');
    if (fromEl && !fromEl.value) fromEl.value = (typeof getActiveFiscalYearStart === 'function' ? getActiveFiscalYearStart() : '') || todayJalaliStr();
    if (toEl && !toEl.value) toEl.value = todayJalaliStr();

    var runBtn = document.getElementById('prp-run');
    if (runBtn && !runBtn.dataset.bound) {
        runBtn.dataset.bound = '1';
        runBtn.onclick = runPurchaseReport;
    }
    var expBtn = document.getElementById('prp-export');
    if (expBtn && !expBtn.dataset.bound) {
        expBtn.dataset.bound = '1';
        expBtn.onclick = function () {
            if (typeof exportReportTable === 'function') exportReportTable('#prp-table', 'گزارش-خرید');
        };
    }
    var typeSel = document.getElementById('prp-type');
    if (typeSel && !typeSel.dataset.bound) {
        typeSel.dataset.bound = '1';
        typeSel.onchange = runPurchaseReport;
    }
    runPurchaseReport();
}

window.runPurchaseReport = runPurchaseReport;
window.initPurchaseReportsPage = initPurchaseReportsPage;

console.log('✅ [modules/purchase-reports.js] loaded — v2.7.0 (گزارش‌های خرید)');
