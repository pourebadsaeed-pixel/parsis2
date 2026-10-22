/* ============================================================
   پارسیس — تراز آزمایشی + گزارش مقایسه‌ای (نسخه کامل)
   مسیر: js/modules/reports/trial.js
   ============================================================ */
'use strict';

if (typeof window._rtSort === 'undefined') window._rtSort = { col: 'name', dir: 'asc' };
if (typeof window._rcSort === 'undefined') window._rcSort = { col: 'name', dir: 'asc' };

function _reportSortCompare(a, b, col, dir) {
    var va = a[col]; var vb = b[col]; var c;
    if (typeof va === 'number' && typeof vb === 'number') c = va - vb;
    else c = compareVals(va, vb);
    return dir === 'asc' ? c : -c;
}

function _applyReportSort(rows, state) {
    if (!state || !state.col) return rows;
    return rows.slice().sort(function (a, b) { return _reportSortCompare(a, b, state.col, state.dir); });
}

function _updateSortIndicators(container, state) {
    if (!container || !state) return;
    container.querySelectorAll('th[data-sort-col]').forEach(function (th) {
        var col = th.getAttribute('data-sort-col'); var ind = th.querySelector('.rt-sort-ind');
        if (!ind) return;
        if (col === state.col) {
            ind.textContent = state.dir === 'asc' ? ' ▲' : ' ▼'; ind.style.opacity = '1'; ind.style.color = 'var(--primary-dark)';
        } else {
            ind.textContent = ' ⇅'; ind.style.opacity = '0.4'; ind.style.color = '';
        }
    });
}

function runTrialBalance() {
    if (typeof makeFilterPanelCollapsible === 'function') makeFilterPanelCollapsible('report-trial', 'filter-rt', 'فیلترهای تراز آزمایشی', '🔍');

    var activePeriod = DB.load('fiscalPeriods', []).find(function(p) { return p.id === state.activePeriodId; });
    var rtFromEl = document.getElementById('rt-from'); var rtToEl = document.getElementById('rt-to');
    if (rtFromEl && !rtFromEl.value) rtFromEl.value = activePeriod ? activePeriod.from : '';
    if (rtToEl && !rtToEl.value) rtToEl.value = activePeriod ? activePeriod.to : '';

    var opts = {
        from: (document.getElementById('rt-from') || {}).value || '', to: (document.getElementById('rt-to') || {}).value || '',
        vtype: (document.getElementById('rt-vtype') || {}).value || '', periodId: (document.getElementById('rt-period') || {}).value || '',
        cat: (document.getElementById('rt-cat') || {}).value || '', nature: (document.getElementById('rt-nature') || {}).value || '',
        level: Number((document.getElementById('rt-level') || {}).value) || 3
    };

    var accounts = DB.load('accounts', []); var result = computeAccountBalances(opts);
    var rolled = rollupBalances(accounts, result.balances); var hide = getHideState('rt');

    var rows = [];
    function getCh(pid) { return accounts.filter(function (a) { return a.parent === pid; }); }

    function walk(node, level) {
        var b = rolled[node.id] || { debit: 0, credit: 0 }; var net = b.debit - b.credit;
        if (opts.level === 4 && level === 3) {
            var sD = 0, sC = 0;
            Object.keys(result.detailBalances).forEach(function (key) {
                var d = result.detailBalances[key]; if (d.parents.indexOf(node.id) === -1) return;
                sD += d.debit; sC += d.credit; var dn = d.debit - d.credit;
                rows.push({ name: getDetailLabel(d.linkType, d.id) + ' (' + node.name + ')', level: 4, debit: d.debit, credit: d.credit, md: dn > 0 ? dn : 0, mc: dn < 0 ? -dn : 0 });
            });
            var dd = b.debit - sD; var dc = b.credit - sC;
            if (Math.abs(dd) > 0.5 || Math.abs(dc) > 0.5) {
                var dn2 = dd - dc;
                rows.push({ name: node.name + ' (بدون تفصیلی)', level: 4, debit: dd, credit: dc, md: dn2 > 0 ? dn2 : 0, mc: dn2 < 0 ? -dn2 : 0 });
            }
            return;
        }
        if (level === opts.level) {
            if (level === 1 || b.debit > 0 || b.credit > 0) {
                rows.push({ name: node.name, level: level, debit: b.debit, credit: b.credit, md: net > 0 ? net : 0, mc: net < 0 ? -net : 0 });
            }
            return;
        }
        if (level < opts.level) { var chs = getCh(node.id); for (var ci = 0; ci < chs.length; ci++) walk(chs[ci], level + 1); }
    }

    var roots = accounts.filter(function (a) { return !a.parent; });
    for (var i = 0; i < roots.length; i++) walk(roots[i], 1);
    rows = _applyReportSort(rows, window._rtSort);

    var html = '<div class="table-wrap"><table class="report-table" id="rt-table"><thead><tr>'
             +  '<th data-sort-col="name" style="cursor:pointer;user-select:none">عنوان<span class="rt-sort-ind"> ⇅</span></th>'
             +  '<th data-sort-col="level" style="cursor:pointer;user-select:none">سطح<span class="rt-sort-ind"> ⇅</span></th>'
             +  '<th data-sort-col="debit" style="cursor:pointer;user-select:none">گردش بدهکار<span class="rt-sort-ind"> ⇅</span></th>'
             +  '<th data-sort-col="credit" style="cursor:pointer;user-select:none">گردش بستانکار<span class="rt-sort-ind"> ⇅</span></th>'
             +  '<th data-sort-col="md" style="cursor:pointer;user-select:none">مانده بدهکار<span class="rt-sort-ind"> ⇅</span></th>'
             +  '<th data-sort-col="mc" style="cursor:pointer;user-select:none">مانده بستانکار<span class="rt-sort-ind"> ⇅</span></th>'
             +  '</tr></thead><tbody>';

    var tD = 0, tC = 0, tMD = 0, tMC = 0;
    for (var r = 0; r < rows.length; r++) {
        var row = rows[r]; tD += row.debit; tC += row.credit; tMD += row.md; tMC += row.mc;
        var lN = row.level === 1 ? 'گروه' : (row.level === 2 ? 'کل' : (row.level === 3 ? 'معین' : 'تفصیلی'));
        html += '<tr><td>' + esc(row.name) + '</td><td>' + lN + '</td>'
             +  '<td class="num dr">' + (hide ? '—' : fmtRep(row.debit, 'rt')) + '</td>'
             +  '<td class="num cr">' + (hide ? '—' : fmtRep(row.credit, 'rt')) + '</td>'
             +  '<td class="num dr">' + (hide ? '—' : (row.md ? fmtRep(row.md, 'rt') : '—')) + '</td>'
             +  '<td class="num cr">' + (hide ? '—' : (row.mc ? fmtRep(row.mc, 'rt') : '—')) + '</td></tr>';
    }

    html += '</tbody><tfoot><tr><td colspan="2" style="text-align:left">جمع</td>'
         +  '<td class="num dr">' + (hide ? '—' : fmtRep(tD, 'rt')) + '</td><td class="num cr">' + (hide ? '—' : fmtRep(tC, 'rt')) + '</td>'
         +  '<td class="num dr">' + (hide ? '—' : fmtRep(tMD, 'rt')) + '</td><td class="num cr">' + (hide ? '—' : fmtRep(tMC, 'rt')) + '</td></tr></tfoot></table></div>';

    var box = document.getElementById('rt-result'); box.innerHTML = html;

    box.querySelectorAll('th[data-sort-col]').forEach(function (th) {
        if (th.dataset.bound) return; th.dataset.bound = '1';
        th.addEventListener('click', function (e) {
            if (e.target.classList && e.target.classList.contains('col-resizer')) return;
            if (e.target.closest('.col-filter-btn')) return;
            var col = this.getAttribute('data-sort-col');
            if (window._rtSort.col === col) window._rtSort.dir = window._rtSort.dir === 'asc' ? 'desc' : 'asc';
            else { window._rtSort.col = col; window._rtSort.dir = 'asc'; }
            runTrialBalance();
        });
    });

    _updateSortIndicators(box, window._rtSort);
    document.getElementById('rt-count').textContent = toFa(rows.length);

    setTimeout(function () {
        var t = document.getElementById('rt-table');
        if (t && typeof makeTableResizable === 'function') makeTableResizable(t);
        if (typeof applyColVisibility === 'function') applyColVisibility('rt-table');
        if (typeof applyColWidths === 'function') applyColWidths('rt-table');
        if (typeof buildHeaderButtons === 'function') buildHeaderButtons();
        if (typeof buildFilterRow === 'function') buildFilterRow(t); // ✅ فعال‌سازی قیف
    }, 30);

    if (typeof autoAttachReportHelpers === 'function') autoAttachReportHelpers();
}

function runIncompleteReport() {
    var statusF = (document.getElementById('ri-status') || {}).value || '';
    var periodF = (document.getElementById('ri-period') || {}).value || '';
    var hide = getHideState('ri');
    var vouchers = DB.load('vouchers', []); var rows = [];

    vouchers.forEach(function (v) {
        var st = v.status || 'draft';
        if (statusF && st !== statusF) return;
        if (periodF && v.periodId !== periodF) return;
        var issues = getVoucherIssues(v);
        if (issues.length === 0) return;
        rows.push({ v: v, issues: issues });
    });

    rows.sort(function (a, b) { return compareVals(a.v.number, b.v.number); });
    var periods = DB.load('fiscalPeriods', []); var pM = {};
    periods.forEach(function (p) { pM[p.id] = p.title; });

    var html = '<div class="table-wrap"><table class="report-table" id="ri-table"><thead><tr>'
             +  '<th>#</th><th>شماره</th><th>تاریخ</th><th>مبلغ</th><th>دوره</th><th>شرح</th><th>وضعیت</th><th>مشکلات</th><th>عملیات</th>'
             +  '</tr></thead><tbody>';

    var totalAmt = 0;
    for (var i = 0; i < rows.length; i++) {
        var r = rows[i]; var v = r.v; var amt = getVoucherAmount(v); totalAmt += amt;
        var stB = v.status === 'approved' ? '<span class="badge badge-approved">✓</span>' : '<span class="badge badge-draft">پیش‌نویس</span>';
        var iss = '<div class="ri-issues">' + r.issues.map(function (x) { return '<div class="ri-issue-item">' + esc(x) + '</div>'; }).join('') + '</div>';
        var aH = '<div class="row-actions"><button class="row-btn open" data-vid="' + v.id + '" data-action="open-voucher">✎</button><button class="row-btn open" data-vid="' + v.id + '" data-action="preview-voucher">👁</button></div>';
        html += '<tr><td class="num">' + toFa(i + 1) + '</td><td dir="ltr">' + toFa(esc(v.number)) + '</td><td dir="ltr">' + toFa(esc(v.date)) + '</td>'
             +  '<td class="num" style="font-weight:bold">' + (hide ? '—' : formatMoney(amt)) + '</td><td>' + esc(pM[v.periodId] || '—') + '</td><td>' + esc(v.desc || '') + '</td>'
             +  '<td>' + stB + '</td><td>' + iss + '</td><td>' + aH + '</td></tr>';
    }

    if (rows.length === 0) html += '<tr><td colspan="9" class="empty-row">✅ سند ناقصی وجود ندارد.</td></tr>';
    html += '</tbody>';
    if (rows.length > 0) html += '<tfoot><tr><td colspan="3" style="text-align:left">جمع</td><td class="num" style="color:#c0392b">' + (hide ? '—' : formatMoney(totalAmt)) + '</td><td colspan="5"></td></tr></tfoot>';
    html += '</table></div>';

    var box = document.getElementById('ri-result'); box.innerHTML = html;
    document.getElementById('ri-count').textContent = toFa(rows.length);
    var unitEl = document.getElementById('ri-unit'); if (unitEl) unitEl.textContent = 'واحد: ' + currencyLabel();

    box.querySelectorAll('[data-action]').forEach(function (btn) {
        if (btn.dataset.bound) return; btn.dataset.bound = '1';
        btn.addEventListener('click', function () {
            var vid = this.getAttribute('data-vid'); var act = this.getAttribute('data-action');
            var v = findVoucherById(vid); if (!v) return;
            if (act === 'open-voucher') loadVoucherForEdit(v);
            else if (act === 'preview-voucher') openVoucherPreview(v);
        });
    });

    setTimeout(function () {
        var t = document.getElementById('ri-table');
        if (t && typeof makeTableResizable === 'function') makeTableResizable(t);
        if (typeof applyColVisibility === 'function') applyColVisibility('ri-table');
        if (typeof buildFilterRow === 'function') buildFilterRow(t);
    }, 30);

    if (typeof autoAttachReportHelpers === 'function') autoAttachReportHelpers();
}

function runComparisonReport() {
    if (typeof makeFilterPanelCollapsible === 'function') makeFilterPanelCollapsible('report-compare', 'filter-rc', 'فیلترهای گزارش مقایسه‌ای', '🔍');

    var p1 = { from: normalizeDigits((document.getElementById('rc-from1') || {}).value || '').trim(), to: normalizeDigits((document.getElementById('rc-to1') || {}).value || '').trim() };
    var p2 = { from: normalizeDigits((document.getElementById('rc-from2') || {}).value || '').trim(), to: normalizeDigits((document.getElementById('rc-to2') || {}).value || '').trim() };
    var vtype = (document.getElementById('rc-vtype') || {}).value || '';
    var cat = (document.getElementById('rc-cat') || {}).value || '';
    var nature = (document.getElementById('rc-nature') || {}).value || '';
    var level = Number((document.getElementById('rc-level') || {}).value) || 2;
    var hide = getHideState('rc');

    if (!p1.from || !p1.to || !p2.from || !p2.to) { alert('هر چهار تاریخ اجباری است.'); return; }
    if (p1.from > p1.to || p2.from > p2.to) { alert('بازه نامعتبر.'); return; }

    var accounts = DB.load('accounts', []);
    function computeBalances(f, t) { return rollupBalances(accounts, computeAccountBalances({ from: f, to: t, vtype: vtype, cat: cat, nature: nature, level: level }).balances); }
    var bal1 = computeBalances(p1.from, p1.to); var bal2 = computeBalances(p2.from, p2.to);

    var rows = [];
    function walk(node, lvl) {
        var b1 = bal1[node.id] || { debit: 0, credit: 0 }; var b2 = bal2[node.id] || { debit: 0, credit: 0 };
        var net1 = b1.debit - b1.credit; var net2 = b2.debit - b2.credit;
        if (lvl === level) {
            if (lvl === 1 || b1.debit || b1.credit || b2.debit || b2.credit) rows.push({ name: node.name, level: lvl, net1: net1, net2: net2 });
            return;
        }
        if (lvl < level) { var chs = accounts.filter(function (a) { return a.parent === node.id; }); for (var i = 0; i < chs.length; i++) walk(chs[i], lvl + 1); }
    }
    var roots = accounts.filter(function (a) { return !a.parent; }); for (var i = 0; i < roots.length; i++) walk(roots[i], 1);

    rows.forEach(function (row) { row.diff = row.net2 - row.net1; row.pct = row.net1 !== 0 ? (row.diff / Math.abs(row.net1) * 100) : (row.net2 !== 0 ? 100 : 0); });
    var sortState = window._rcSort; var sortKeyMap = { 'name': 'name', 'level': 'level', 'net1': 'net1', 'net2': 'net2', 'pct': 'pct' };
    if (sortState && sortState.col) { var key = sortKeyMap[sortState.col] || sortState.col; rows = rows.slice().sort(function (a, b) { return _reportSortCompare(a, b, key, sortState.dir); }); }

    var html = '<div class="table-wrap"><table class="report-table" id="rc-table"><thead><tr>'
        + '<th data-sort-col="name" style="cursor:pointer;user-select:none">عنوان<span class="rt-sort-ind"> ⇅</span></th>'
        + '<th data-sort-col="level" style="cursor:pointer;user-select:none">سطح<span class="rt-sort-ind"> ⇅</span></th>'
        + '<th data-sort-col="net1" style="cursor:pointer;user-select:none">مانده دوره ۱<br><span style="font-size:0.72rem;font-weight:normal">' + toFa(p1.from) + ' تا ' + toFa(p1.to) + '</span><span class="rt-sort-ind"> ⇅</span></th>'
        + '<th data-sort-col="net2" style="cursor:pointer;user-select:none">مانده دوره ۲<br><span style="font-size:0.72rem;font-weight:normal">' + toFa(p2.from) + ' تا ' + toFa(p2.to) + '</span><span class="rt-sort-ind"> ⇅</span></th>'
        + '<th data-sort-col="pct" style="cursor:pointer;user-select:none">درصد افت/رشد<span class="rt-sort-ind"> ⇅</span></th></tr></thead><tbody>';

    var t1 = 0, t2 = 0;
    for (var r = 0; r < rows.length; r++) {
        var row = rows[r]; t1 += row.net1; t2 += row.net2; var pct = row.pct; var pctCls = pct > 0 ? 'cr' : (pct < 0 ? 'dr' : '');
        var pctText; if (pct < 0) pctText = '(' + toFa(Math.abs(pct).toFixed(2)) + '٪)'; else if (pct > 0) pctText = '▲ +' + toFa(pct.toFixed(2)) + '٪'; else pctText = '۰.۰۰٪';
        var lN = row.level === 1 ? 'گروه' : (row.level === 2 ? 'کل' : (row.level === 3 ? 'معین' : 'تفصیلی'));
        html += '<tr><td>' + esc(row.name) + '</td><td>' + lN + '</td><td class="num">' + (hide ? '—' : moneyHtml(row.net1)) + '</td><td class="num">' + (hide ? '—' : moneyHtml(row.net2)) + '</td><td class="num ' + pctCls + '" style="font-weight:800">' + (hide ? '—' : pctText) + '</td></tr>';
    }

    var tDiff = t2 - t1; var tPct = t1 !== 0 ? (tDiff / Math.abs(t1) * 100) : (t2 !== 0 ? 100 : 0);
    var tPctCls = tPct > 0 ? 'cr' : (tPct < 0 ? 'dr' : ''); var tPctText;
    if (tPct < 0) tPctText = '(' + toFa(Math.abs(tPct).toFixed(2)) + '٪)'; else if (tPct > 0) tPctText = '▲ +' + toFa(tPct.toFixed(2)) + '٪'; else tPctText = '۰.۰۰٪';

    html += '</tbody><tfoot><tr><td colspan="2" style="text-align:left">جمع کل</td><td class="num">' + (hide ? '—' : moneyHtml(t1)) + '</td><td class="num">' + (hide ? '—' : moneyHtml(t2)) + '</td><td class="num ' + tPctCls + '" style="font-weight:800">' + (hide ? '—' : tPctText) + '</td></tr></tfoot></table></div>';

    var box = document.getElementById('rc-result'); box.innerHTML = html;
    document.getElementById('rc-count').textContent = toFa(rows.length);
    var u = document.getElementById('rc-unit'); if (u) u.textContent = 'واحد: ' + currencyLabel();

    box.querySelectorAll('th[data-sort-col]').forEach(function (th) {
        if (th.dataset.bound) return; th.dataset.bound = '1';
        th.addEventListener('click', function (e) {
            if (e.target.classList && e.target.classList.contains('col-resizer')) return;
            if (e.target.closest('.col-filter-btn')) return;
            var col = this.getAttribute('data-sort-col');
            if (window._rcSort.col === col) window._rcSort.dir = window._rcSort.dir === 'asc' ? 'desc' : 'asc';
            else { window._rcSort.col = col; window._rcSort.dir = 'asc'; }
            runComparisonReport();
        });
    });

    _updateSortIndicators(box, window._rcSort);

    setTimeout(function () {
        var t = document.getElementById('rc-table');
        if (t && typeof makeTableResizable === 'function') makeTableResizable(t);
        if (typeof applyColVisibility === 'function') applyColVisibility('rc-table');
        if (typeof buildHeaderButtons === 'function') buildHeaderButtons();
        if (typeof buildFilterRow === 'function') buildFilterRow(t); // ✅ فعال‌سازی قیف
    }, 30);

    if (typeof autoAttachReportHelpers === 'function') autoAttachReportHelpers();
}

function bindTrialReportButtons() {
    var rtRun = document.getElementById('rt-run'); if (rtRun && !rtRun.dataset.bound && typeof runTrialBalance === 'function') { rtRun.dataset.bound = '1'; rtRun.addEventListener('click', runTrialBalance); }
    var riRun = document.getElementById('ri-run'); if (riRun && !riRun.dataset.bound && typeof runIncompleteReport === 'function') { riRun.dataset.bound = '1'; riRun.addEventListener('click', runIncompleteReport); }
    var rcRun = document.getElementById('rc-run'); if (rcRun && !rcRun.dataset.bound && typeof runComparisonReport === 'function') { rcRun.dataset.bound = '1'; rcRun.addEventListener('click', runComparisonReport); }
}

window.runTrialBalance          = runTrialBalance;
window.runIncompleteReport      = runIncompleteReport;
window.runComparisonReport      = runComparisonReport;
window.bindTrialReportButtons   = bindTrialReportButtons;

console.log('✅ [modules/reports/trial.js] loaded — Complete');
