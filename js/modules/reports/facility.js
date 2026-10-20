/* ============================================================
   پارسیس — گزارش‌های تسهیلات (خلاصه + جامع)
   مسیر: js/modules/reports/facility.js
   ============================================================ */
'use strict';

function runFacilityReport() {
    if (typeof makeFilterPanelCollapsible === 'function') {
        makeFilterPanelCollapsible('report-facility', 'filter-rf', 'فیلترهای خلاصه تسهیلات', '🔍');
    }

    var facilities = DB.load('facilities', []);
    var cf = (document.getElementById('rf-category') || {}).value || '';
    var sf = (document.getElementById('rf-status') || {}).value || '';
    var st = sortState.rf;
    var rows = [];
    var hide = getHideState('rf');

    facilities.forEach(function (f) {
        if (cf && (f.category || 'facility') !== cf) return;

        var ins = f.installments || [];
        var ri = ins.filter(function (x) { return x.status !== 'paid'; });
        var ra = ri.reduce(function (s, x) { return s + (Number(x.amount) || 0); }, 0);
        var lD = ri.length > 0 ? ri[ri.length - 1].date : '—';
        var unpaidSorted = ri.slice().sort(function (a, b) { return compareVals(a.date, b.date); });
        var fU = unpaidSorted.length > 0 ? unpaidSorted[0].date : '—';
        var set = ins.length > 0 && ri.length === 0;

        if (sf === 'settled' && !set) return;
        if (sf === 'active' && set) return;

        rows.push({ f: f, rC: ri.length, rA: ra, lD: lD, fU: fU, set: set });
    });

    rows.sort(function (a, b) {
        var va, vb;
        if (st.col === 'name') { va = a.f.name || ''; vb = b.f.name || ''; }
        else if (st.col === 'initial') { va = a.f.initial || 0; vb = b.f.initial || 0; }
        else if (st.col === 'paid') { va = a.f.paid || 0; vb = b.f.paid || 0; }
        else if (st.col === 'remainingCount') { va = a.rC; vb = b.rC; }
        else if (st.col === 'remainingAmount') { va = a.rA; vb = b.rA; }
        else if (st.col === 'lastDate') { va = a.lD; vb = b.lD; }
        else if (st.col === 'firstUnpaid') { va = a.fU; vb = b.fU; }
        else if (st.col === 'status') {
            va = a.set ? 'تسویه' : 'جاری';
            vb = b.set ? 'تسویه' : 'جاری';
        } else { va = ''; vb = ''; }
        return st.dir === 'asc' ? compareVals(va, vb) : -compareVals(va, vb);
    });

    var html = '<div class="table-wrap"><table class="report-table" id="rf-table"><thead><tr>'
        + '<th data-sort="name">عنوان</th>'
        + '<th data-sort="status">وضعیت</th>'
        + '<th data-sort="initial">مبلغ اولیه</th>'
        + '<th data-sort="paid">پرداخت</th>'
        + '<th data-sort="remainingCount">اقساط باقی</th>'
        + '<th data-sort="remainingAmount">مبلغ باقی</th>'
        + '<th data-sort="firstUnpaid">اولین قسط پرداخت‌نشده</th>'
        + '<th data-sort="lastDate">آخرین قسط</th>'
        + '</tr></thead><tbody>';

    var tr = 0;
    for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        var f = r.f;
        html += '<tr><td>' + esc(f.name) + '</td>'
            + '<td>' + (r.set
                ? '<span class="badge badge-settled">تسویه</span>'
                : '<span class="badge badge-active">جاری</span>') + '</td>'
            + '<td class="num">' + (hide ? '—' : fmtRep(f.initial || 0, 'rf')) + '</td>'
            + '<td class="num">' + (hide ? '—' : fmtRep(f.paid || 0, 'rf')) + '</td>'
            + '<td class="num">' + toFa(r.rC) + '</td>'
            + '<td class="num">' + (hide ? '—' : fmtRep(r.rA, 'rf')) + '</td>'
            + '<td dir="ltr">' + toFa(r.fU) + '</td>'
            + '<td dir="ltr">' + toFa(r.lD) + '</td></tr>';
        tr += r.rA;
    }

    html += '</tbody><tfoot><tr><td colspan="5" style="text-align:left">جمع مانده</td>'
        + '<td class="num">' + (hide ? '—' : fmtRep(tr, 'rf')) + '</td>'
        + '<td colspan="2"></td></tr></tfoot></table></div>';

    document.getElementById('rf-result').innerHTML = html;
    document.getElementById('rf-count').textContent = toFa(rows.length);

    var unitEl = document.getElementById('rf-unit');
    if (unitEl) unitEl.textContent = 'واحد: ' + currencyLabel();

    setupRfSorting();

    setTimeout(function () {
        var t = document.getElementById('rf-table');
        if (t && typeof makeTableResizable === 'function') makeTableResizable(t);
        if (typeof applyColVisibility === 'function') applyColVisibility('rf-table');
        if (typeof buildHeaderButtons === 'function') buildHeaderButtons();
    }, 30);

    if (typeof autoAttachReportHelpers === 'function') autoAttachReportHelpers();
}

function setupRfSorting() {
    var ths = document.querySelectorAll('#rf-result th[data-sort]');
    for (var i = 0; i < ths.length; i++) {
        if (ths[i].dataset.bound) continue;
        ths[i].dataset.bound = '1';
        ths[i].addEventListener('click', function () {
            var col = this.getAttribute('data-sort');
            if (sortState.rf.col === col) {
                sortState.rf.dir = sortState.rf.dir === 'asc' ? 'desc' : 'asc';
            } else {
                sortState.rf.col = col;
                sortState.rf.dir = 'asc';
            }
            runFacilityReport();
        });
    }
}

function setupRffSorting() {
    var ths = document.querySelectorAll('#rff-result th[data-sort]');
    for (var i = 0; i < ths.length; i++) {
        if (ths[i].dataset.bound) continue;
        ths[i].dataset.bound = '1';
        ths[i].addEventListener('click', function () {
            var col = this.getAttribute('data-sort');
            if (sortState.rff.col === col) {
                sortState.rff.dir = sortState.rff.dir === 'asc' ? 'desc' : 'asc';
            } else {
                sortState.rff.col = col;
                sortState.rff.dir = 'asc';
            }
            runFacilityFullReport();
        });
    }
}

function computeFacilityRows() {
    var facilities = DB.load('facilities', []);
    var cf = (document.getElementById('rff-category') || {}).value || '';
    var sf = (document.getElementById('rff-status') || {}).value || '';
    var inf = (document.getElementById('rff-inst-status') || {}).value || '';
    var bf = (document.getElementById('rff-bank') || {}).value || '';
    var fromD = (document.getElementById('rff-from') || {}).value || '';
    var toD = (document.getElementById('rff-to') || {}).value || '';
    var q = ((document.getElementById('rff-search') || {}).value || '').toLowerCase();

    var banks = DB.load('bankAccounts', []);
    var bankMap = {};
    banks.forEach(function (b) { bankMap[b.id] = b; });

    var today = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    var tStr = today[0] + '/' + pad2(today[1]) + '/' + pad2(today[2]);

    var rows = [];
    facilities.forEach(function (f) {
        if (cf && (f.category || 'facility') !== cf) return;
        if (bf && f.bankId !== bf) return;
        if (fromD && f.date && f.date < fromD) return;
        if (toD && f.date && f.date > toD) return;

        var allIns = f.installments || [];
        var ins = allIns;
        if (fromD || toD) {
            ins = allIns.filter(function (x) {
                if (!x.date) return false;
                if (fromD && x.date < fromD) return false;
                if (toD && x.date > toD) return false;
                return true;
            });
        }

        var paidCount = ins.filter(function (x) { return x.status === 'paid'; }).length;
        var totalAmt = ins.reduce(function (s, x) { return s + (Number(x.amount) || 0); }, 0);
        var paidAmt = ins.filter(function (x) { return x.status === 'paid'; })
            .reduce(function (s, x) { return s + (Number(x.amount) || 0); }, 0);
        var unpaidList = ins.filter(function (x) { return x.status !== 'paid'; });
        var unpaidAmt = unpaidList.reduce(function (s, x) { return s + (Number(x.amount) || 0); }, 0);

        var unpaidSorted = unpaidList.slice().sort(function (a, b) { return compareVals(a.date, b.date); });
        var firstUnpaidDate = unpaidSorted.length > 0 ? unpaidSorted[0].date : '';
        var firstUnpaidAmount = unpaidSorted.length > 0 ? Number(unpaidSorted[0].amount) || 0 : 0;

        var lastPaidDate = '—';
        var paidSorted = ins.filter(function (x) { return x.status === 'paid' && x.date; })
            .slice().sort(function (a, b) { return compareVals(b.date, a.date); });
        if (paidSorted.length > 0) lastPaidDate = paidSorted[0].date;

        var overdueCount = unpaidList.filter(function (x) {
            return x.date && x.date < tStr;
        }).length;

        var settled = ins.length > 0 && unpaidList.length === 0;

        var lastInsDate = '—';
        if (ins.length > 0) {
            var sortedIns = ins.slice().sort(function (a, b) { return compareVals(b.date, a.date); });
            lastInsDate = sortedIns[0].date || '—';
        }

        if ((fromD || toD) && ins.length === 0) return;
        if (sf === 'settled' && !settled) return;
        if (sf === 'active' && settled) return;
        if (inf === 'has-unpaid' && !(unpaidList.length > 0)) return;

        if (q) {
            var bankObj = bankMap[f.bankId];
            var txt = ((f.name || '') + ' '
                     + (f.date || '') + ' '
                     + categoryName(f.category) + ' '
                     + (bankObj ? bankObj.bank : '')).toLowerCase();
            if (txt.indexOf(q) === -1) return;
        }

        rows.push({
            f: f,
            bank: bankMap[f.bankId],
            insCount: ins.length,
            paidCount: paidCount,
            totalAmt: totalAmt,
            paidAmt: paidAmt,
            unpaidAmt: unpaidAmt,
            unpaidCount: unpaidList.length,
            firstUnpaidDate: firstUnpaidDate,
            firstUnpaidAmount: firstUnpaidAmount,
            lastPaidDate: lastPaidDate,
            overdueCount: overdueCount,
            settled: settled,
            lastInsDate: lastInsDate,
            filteredIns: ins
        });
    });
    return rows;
}

function runFacilityFullReport() {
    if (typeof makeFilterPanelCollapsible === 'function') {
        makeFilterPanelCollapsible('report-facility-full', 'filter-rff', 'فیلترهای گزارش جامع تسهیلات', '🔍');
    }

    var rows = computeFacilityRows();
    var st = sortState.rff;

    rows.sort(function (a, b) {
        var va, vb;
        switch (st.col) {
            case 'name': va = a.f.name || ''; vb = b.f.name || ''; break;
            case 'category': va = categoryName(a.f.category); vb = categoryName(b.f.category); break;
            case 'bank': va = a.bank ? a.bank.bank : ''; vb = b.bank ? b.bank.bank : ''; break;
            case 'date': va = a.f.date || ''; vb = b.f.date || ''; break;
            case 'initial': va = Number(a.f.initial || 0); vb = Number(b.f.initial || 0); break;
            case 'paidAmt': va = a.paidAmt; vb = b.paidAmt; break;
            case 'unpaidAmt': va = a.unpaidAmt; vb = b.unpaidAmt; break;
            case 'insCount': va = a.insCount; vb = b.insCount; break;
            case 'paidCount': va = a.paidCount; vb = b.paidCount; break;
            case 'unpaidCount': va = a.unpaidCount; vb = b.unpaidCount; break;
            case 'firstUnpaidDate': va = a.firstUnpaidDate || ''; vb = b.firstUnpaidDate || ''; break;
            case 'lastPaidDate': va = a.lastPaidDate || ''; vb = b.lastPaidDate || ''; break;
            case 'overdueCount': va = a.overdueCount; vb = b.overdueCount; break;
            case 'status': va = a.settled ? 'تسویه' : 'جاری'; vb = b.settled ? 'تسویه' : 'جاری'; break;
            default: va = ''; vb = '';
        }
        return st.dir === 'asc' ? compareVals(va, vb) : -compareVals(va, vb);
    });

    if (state.rffView === 'detail') renderFacilityFullDetail(rows);
    else renderFacilityFullSummary(rows);

    if (typeof autoAttachReportHelpers === 'function') autoAttachReportHelpers();
}

function renderFacilityFullSummary(rows) {
    var hide = getHideState('rff');
    var html = '<div class="table-wrap"><table class="report-table" id="rff-table"><thead><tr>'
        + '<th data-sort="name">عنوان</th>'
        + '<th data-sort="category">دسته</th>'
        + '<th data-sort="bank">بانک</th>'
        + '<th data-sort="date">تاریخ</th>'
        + '<th data-sort="initial">مبلغ اولیه</th>'
        + '<th data-sort="paidAmt">پرداخت</th>'
        + '<th data-sort="unpaidAmt">باقی‌مانده</th>'
        + '<th data-sort="insCount">تعداد</th>'
        + '<th data-sort="paidCount">پرداخت‌شده</th>'
        + '<th data-sort="unpaidCount">باقی</th>'
        + '<th data-sort="overdueCount">سررسید گذشته</th>'
        + '<th data-sort="firstUnpaidDate">اولین قسط پرداخت‌نشده</th>'
        + '<th data-sort="lastPaidDate">آخرین پرداخت</th>'
        + '<th data-sort="status">وضعیت</th>'
        + '<th>عملیات</th></tr></thead><tbody>';

    var sumInit = 0, sumPaid = 0, sumUnpaid = 0;
    var sumInsCount = 0, sumPaidCount = 0, sumUnpaidCount = 0, sumOverdue = 0;

    for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        var f = r.f;

        sumInit += Number(f.initial || 0);
        sumPaid += r.paidAmt;
        sumUnpaid += r.unpaidAmt;
        sumInsCount += r.insCount;
        sumPaidCount += r.paidCount;
        sumUnpaidCount += r.unpaidCount;
        sumOverdue += r.overdueCount;

        var catB = (f.category === 'scheduled')
            ? '<span class="badge badge-cat-sch">زمان‌بندی</span>'
            : '<span class="badge badge-cat-fac">تسهیلات</span>';
        var stB = r.settled
            ? '<span class="badge badge-settled">تسویه</span>'
            : '<span class="badge badge-active">جاری</span>';
        var overdue = r.overdueCount > 0
            ? '<span class="badge badge-overdue">' + toFa(r.overdueCount) + '</span>'
            : '۰';

        var firstUnpaidCell = r.firstUnpaidDate
            ? (toFa(r.firstUnpaidDate)
                + (r.firstUnpaidAmount
                    ? ' <span class="muted" style="font-size:0.7rem">('
                        + (hide ? '—' : fmtRep(r.firstUnpaidAmount, 'rff')) + ')</span>'
                    : ''))
            : '—';

        var aH = '<div class="row-actions">'
            + '<button class="row-btn open" data-fid="' + f.id + '" data-action="rff-inst">📖</button>'
            + '<button class="row-btn edit" data-fid="' + f.id + '" data-action="rff-edit">✎</button>'
            + '</div>';

        html += '<tr><td><strong>' + esc(f.name) + '</strong></td>'
            + '<td>' + catB + '</td>'
            + '<td>' + esc(r.bank ? r.bank.bank : '—') + '</td>'
            + '<td dir="ltr">' + toFa(esc(f.date || '—')) + '</td>'
            + '<td class="num">' + (hide ? '—' : fmtRep(f.initial || 0, 'rff')) + '</td>'
            + '<td class="num" style="color:#1e9e6a">' + (hide ? '—' : fmtRep(r.paidAmt, 'rff')) + '</td>'
            + '<td class="num" style="color:' + (r.unpaidAmt > 0 ? '#c0392b' : '#1e9e6a') + '">' + (hide ? '—' : fmtRep(r.unpaidAmt, 'rff')) + '</td>'
            + '<td class="num">' + toFa(r.insCount) + '</td>'
            + '<td class="num" style="color:#1e9e6a">' + toFa(r.paidCount) + '</td>'
            + '<td class="num" style="color:#c47c00">' + toFa(r.unpaidCount) + '</td>'
            + '<td class="num">' + overdue + '</td>'
            + '<td dir="ltr">' + firstUnpaidCell + '</td>'
            + '<td dir="ltr">' + toFa(r.lastPaidDate) + '</td>'
            + '<td>' + stB + '</td>'
            + '<td>' + aH + '</td></tr>';
    }

    if (rows.length === 0) {
        html += '<tr><td colspan="15" class="empty-row">موردی یافت نشد.</td></tr>';
    }
    html += '</tbody>';

    if (rows.length > 0) {
        html += '<tfoot><tr><td colspan="4" style="text-align:left">جمع کل</td>'
            + '<td class="num">' + (hide ? '—' : fmtRep(sumInit, 'rff')) + '</td>'
            + '<td class="num" style="color:#1e9e6a">' + (hide ? '—' : fmtRep(sumPaid, 'rff')) + '</td>'
            + '<td class="num" style="color:#c0392b">' + (hide ? '—' : fmtRep(sumUnpaid, 'rff')) + '</td>'
            + '<td class="num">' + toFa(sumInsCount) + '</td>'
            + '<td class="num" style="color:#1e9e6a">' + toFa(sumPaidCount) + '</td>'
            + '<td class="num" style="color:#c47c00">' + toFa(sumUnpaidCount) + '</td>'
            + '<td class="num">' + toFa(sumOverdue) + '</td>'
            + '<td colspan="4"></td></tr></tfoot>';
    }
    html += '</table></div>';

    document.getElementById('rff-result').innerHTML = html;
    document.getElementById('rff-count').textContent = toFa(rows.length);

    var unitEl = document.getElementById('rff-unit');
    if (unitEl) unitEl.textContent = 'واحد: ' + currencyLabel();

    setupRffSorting();

    var btns = document.querySelectorAll('#rff-result [data-action]');
    for (var bi = 0; bi < btns.length; bi++) {
        if (btns[bi].dataset.bound) continue;
        btns[bi].dataset.bound = '1';
        btns[bi].addEventListener('click', function () {
            var fid = this.getAttribute('data-fid');
            var act = this.getAttribute('data-action');
            var f = DB.load('facilities', []).find(function (x) { return x.id === fid; });
            if (!f) return;
            if (act === 'rff-inst') loadFacilityForInstallments(f);
            else if (act === 'rff-edit') loadFacilityIntoForm(f);
        });
    }

    setTimeout(function () {
        var t = document.getElementById('rff-table');
        if (t && typeof makeTableResizable === 'function') makeTableResizable(t);
        if (typeof applyColVisibility === 'function') applyColVisibility('rff-table');
        if (typeof buildHeaderButtons === 'function') buildHeaderButtons();
    }, 30);
}

function renderFacilityFullDetail(rows) {
    var sorted = rows.slice().sort(function (a, b) {
        if (a.insCount !== b.insCount) return a.insCount - b.insCount;
        return compareVals(a.lastInsDate || '9999/99/99', b.lastInsDate || '9999/99/99');
    });

    var today = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    var tStr = today[0] + '/' + pad2(today[1]) + '/' + pad2(today[2]);
    var hide = getHideState('rff');

    var html = '<div class="rff-detail-list">';

    for (var i = 0; i < sorted.length; i++) {
        var r = sorted[i];
        var f = r.f;
        var ins = r.filteredIns || f.installments || [];
        var paidCount = r.paidCount;
        var unpaidCount = r.unpaidCount;
        var catLabel = (f.category === 'scheduled') ? 'زمان‌بندی' : 'تسهیلات';
        var cls = (f.category === 'scheduled') ? ' sch' : '';

        html += '<div class="rff-fac-card">'
             +  '<div class="rff-fac-head' + cls + '">'
             +    '<div>'
             +      '<div class="rff-fac-title">' + esc(f.name) + '</div>'
             +      '<div class="rff-fac-meta">';

        html += '<span class="chip-m">' + catLabel + '</span>';
        if (r.bank) html += '<span class="chip-m">🏦 ' + esc(r.bank.bank || '') + '</span>';
        if (f.date) html += '<span class="chip-m">📅 ' + toFa(f.date) + '</span>';

        html += '</div></div>'
             +    '<div>' + (r.settled
                ? '<span class="badge badge-settled">✓ تسویه</span>'
                : '<span class="badge badge-active">در جریان</span>') + '</div>'
             +  '</div>';

        html += '<div class="rff-fac-stats">';
        html += '<div class="item"><div class="lbl">مبلغ اولیه</div><div class="val">'
             +  (hide ? '—' : formatMoney(f.initial || 0)) + '</div></div>';
        html += '<div class="item"><div class="lbl">پرداخت شده</div><div class="val" style="color:#1e9e6a">'
             +  (hide ? '—' : formatMoney(r.paidAmt)) + '</div></div>';
        html += '<div class="item"><div class="lbl">باقی‌مانده</div><div class="val" style="color:'
             +  (r.unpaidAmt > 0 ? '#c0392b' : '#1e9e6a') + '">'
             +  (hide ? '—' : formatMoney(r.unpaidAmt)) + '</div></div>';
        html += '<div class="item"><div class="lbl">تعداد اقساط</div><div class="val">'
             +  toFa(ins.length) + '</div></div>';
        html += '<div class="item"><div class="lbl">پرداخت‌شده</div><div class="val" style="color:#1e9e6a">'
             +  toFa(paidCount) + '</div></div>';
        html += '<div class="item"><div class="lbl">باقی</div><div class="val" style="color:#c47c00">'
             +  toFa(unpaidCount) + '</div></div>';
        html += '</div>';

        if (ins.length === 0) {
            html += '<div class="rff-empty">— قسطی در این بازه یافت نشد —</div>';
        } else {
            html += '<table class="rff-inst-table"><thead><tr>'
                 +  '<th style="width:40px">#</th><th>تاریخ</th><th>مبلغ</th><th>وضعیت</th>'
                 +  '</tr></thead><tbody>';

            var sortedIns = ins.slice().sort(function (a, b) { return compareVals(a.date, b.date); });
            for (var j = 0; j < sortedIns.length; j++) {
                var inx = sortedIns[j];
                var isOverdue = (inx.status !== 'paid' && inx.date && inx.date < tStr);
                var rowCls = (inx.status === 'paid') ? 'paid-row' : (isOverdue ? 'overdue-row' : '');
                var stLabel = (inx.status === 'paid')
                    ? '<span class="badge badge-paid">✓ پرداخت</span>'
                    : (isOverdue
                        ? '<span class="badge badge-overdue">سررسید گذشته</span>'
                        : '<span class="badge badge-registered">ثبت</span>');

                html += '<tr class="' + rowCls + '">'
                     +  '<td class="num">' + toFa(j + 1) + '</td>'
                     +  '<td dir="ltr">' + toFa(esc(inx.date || '—')) + '</td>'
                     +  '<td class="num" style="font-weight:bold">' + (hide ? '—' : formatMoney(inx.amount || 0)) + '</td>'
                     +  '<td>' + stLabel + '</td></tr>';
            }
            html += '</tbody></table>';
        }

        html += '</div>';
    }

    if (rows.length === 0) {
        html += '<div class="card"><p class="muted" style="text-align:center">موردی یافت نشد.</p></div>';
    }
    html += '</div>';

    document.getElementById('rff-result').innerHTML = html;
    document.getElementById('rff-count').textContent = toFa(rows.length);

    var unitEl = document.getElementById('rff-unit');
    if (unitEl) unitEl.textContent = 'واحد: ' + currencyLabel();
}

function bindFacilityReportButtons() {
    var rfRun = document.getElementById('rf-run');
    if (rfRun && !rfRun.dataset.bound && typeof runFacilityReport === 'function') {
        rfRun.dataset.bound = '1';
        rfRun.addEventListener('click', runFacilityReport);
    }

    var rffRun = document.getElementById('rff-run');
    if (rffRun && !rffRun.dataset.bound && typeof runFacilityFullReport === 'function') {
        rffRun.dataset.bound = '1';
        rffRun.addEventListener('click', runFacilityFullReport);
    }

    var rfCat = document.getElementById('rf-category');
    if (rfCat && !rfCat.dataset.bound) {
        rfCat.dataset.bound = '1';
        rfCat.addEventListener('change', runFacilityReport);
    }

    var rfStatus = document.getElementById('rf-status');
    if (rfStatus && !rfStatus.dataset.bound) {
        rfStatus.dataset.bound = '1';
        rfStatus.addEventListener('change', runFacilityReport);
    }

    var rffCat = document.getElementById('rff-category');
    if (rffCat && !rffCat.dataset.bound) {
        rffCat.dataset.bound = '1';
        rffCat.addEventListener('change', runFacilityFullReport);
    }

    var rffStatus = document.getElementById('rff-status');
    if (rffStatus && !rffStatus.dataset.bound) {
        rffStatus.dataset.bound = '1';
        rffStatus.addEventListener('change', runFacilityFullReport);
    }

    var rffInstStatus = document.getElementById('rff-inst-status');
    if (rffInstStatus && !rffInstStatus.dataset.bound) {
        rffInstStatus.dataset.bound = '1';
        rffInstStatus.addEventListener('change', runFacilityFullReport);
    }

    var rffBank = document.getElementById('rff-bank');
    if (rffBank && !rffBank.dataset.bound) {
        rffBank.dataset.bound = '1';
        rffBank.addEventListener('change', runFacilityFullReport);
    }

    var rffSearch = document.getElementById('rff-search');
    if (rffSearch && !rffSearch.dataset.bound) {
        rffSearch.dataset.bound = '1';
        rffSearch.addEventListener('input', runFacilityFullReport);
    }

    ['rff-from', 'rff-to'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el && !el.dataset.bound) {
            el.dataset.bound = '1';
            el.addEventListener('input', runFacilityFullReport);
        }
    });

    var rffTabs = document.querySelectorAll('[data-rff-view]');
    for (var ti = 0; ti < rffTabs.length; ti++) {
        if (rffTabs[ti].dataset.bound) continue;
        rffTabs[ti].dataset.bound = '1';
        rffTabs[ti].addEventListener('click', function () {
            var v = this.getAttribute('data-rff-view');
            state.rffView = v;
            saveState(LS_KEYS.RFF_VIEW);
            for (var z = 0; z < rffTabs.length; z++) {
                rffTabs[z].classList.toggle('active', rffTabs[z].getAttribute('data-rff-view') === v);
            }
            runFacilityFullReport();
        });
        rffTabs[ti].classList.toggle('active', rffTabs[ti].getAttribute('data-rff-view') === state.rffView);
    }

    setTimeout(function () {
        if (typeof makeFilterPanelCollapsible === 'function') {
            makeFilterPanelCollapsible('report-facility', 'filter-rf', 'فیلترهای خلاصه تسهیلات', '🔍');
            makeFilterPanelCollapsible('report-facility-full', 'filter-rff', 'فیلترهای گزارش جامع تسهیلات', '🔍');
        }
    }, 500);
}

window.runFacilityReport            = runFacilityReport;
window.setupRfSorting               = setupRfSorting;
window.setupRffSorting              = setupRffSorting;
window.computeFacilityRows          = computeFacilityRows;
window.runFacilityFullReport        = runFacilityFullReport;
window.renderFacilityFullSummary    = renderFacilityFullSummary;
window.renderFacilityFullDetail     = renderFacilityFullDetail;
window.bindFacilityReportButtons    = bindFacilityReportButtons;

console.log('✅ [modules/reports/facility.js] loaded — complete');
