/* ============================================================
   پارسیس — گزارش دفاتر (Ledger)
   مسیر: js/modules/reports/ledger.js
   ============================================================ */
'use strict';

var _RL = {
    filters: {
        accCat: ['permanent', 'temporary', 'none'],
        nature: ['debit', 'credit', 'none'],
        vType: ['general', 'opening', 'establishment', 'closing', 'final'],
        detType: ['person', 'company', 'bank', 'cashbox', 'project', 'facility', 'none']
    }
};

(function injectLedgerStyle() {
    if (document.getElementById('ledger-style')) return;
    var s = document.createElement('style');
    s.id = 'ledger-style';
    s.textContent = `
        .ms-wrapper { position: relative; width: 100%; z-index: 99; }
        .ms-btn { width: 100%; padding: 10px 14px; background: var(--card-solid); border: 1.5px solid var(--border); border-radius: 12px; text-align: right; display: flex; justify-content: space-between; align-items: center; cursor: pointer; font-family: inherit; font-size: 0.9rem; font-weight: 700; color: var(--text); }
        .ms-btn:hover { border-color: var(--primary); }
        .ms-dropdown { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: var(--card-solid); border: 1.5px solid var(--primary); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 99999 !important; display: none; flex-direction: column; }
        .ms-dropdown.show { display: flex; }
        .ms-actions { display: flex; gap: 8px; padding: 8px; border-bottom: 1px solid var(--border); background: var(--card-alt); }
        .ms-actions button { flex: 1; padding: 6px; background: var(--primary-light); color: var(--primary-dark); border: none; border-radius: 6px; font-family: inherit; font-weight: 700; cursor: pointer; font-size: 0.78rem; }
        .ms-actions button:hover { background: var(--primary); color: #fff; }
        .ms-list { max-height: 200px; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 4px; }
        .ms-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
        .ms-item:hover { background: var(--primary-soft); }
        .ms-item input { width: 16px; height: 16px; accent-color: var(--primary); }
    `;
    document.head.appendChild(s);
})();

// ✅ تابع اصلاح‌شده برای حفظ لیبل و نمایش صحیح
function buildMultiSelect(containerId, labelText, items, selectedValues, onChange) {
    var container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = ''; 

    var lbl = document.createElement('label');
    lbl.textContent = labelText;
    lbl.style.cssText = 'display:block; font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-bottom:6px;';
    container.appendChild(lbl);

    var wrapper = document.createElement('div');
    wrapper.className = 'ms-wrapper';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ms-btn';
    
    function updateBtn() {
        var count = selectedValues.length;
        var statusTxt = count === 0 ? 'هیچ‌کدام' : (count === items.length ? 'همه' : (count + ' مورد'));
        btn.innerHTML = '<span>' + labelText + ' (' + statusTxt + ')</span><span>▼</span>';
    }
    updateBtn();

    var dropdown = document.createElement('div');
    dropdown.className = 'ms-dropdown';

    var actions = document.createElement('div');
    actions.className = 'ms-actions';
    
    var btnAll = document.createElement('button');
    btnAll.type = 'button'; btnAll.textContent = '✓ انتخاب همه';
    btnAll.onclick = function(e) {
        e.stopPropagation();
        selectedValues.length = 0;
        items.forEach(function(x) { selectedValues.push(x.value); });
        renderItems(); updateBtn(); onChange(selectedValues);
    };
    
    var btnNone = document.createElement('button');
    btnNone.type = 'button'; btnNone.textContent = '✗ لغو همه';
    btnNone.onclick = function(e) {
        e.stopPropagation();
        selectedValues.length = 0;
        renderItems(); updateBtn(); onChange(selectedValues);
    };

    actions.appendChild(btnAll);
    actions.appendChild(btnNone);
    dropdown.appendChild(actions);

    var list = document.createElement('div');
    list.className = 'ms-list';
    dropdown.appendChild(list);

    function renderItems() {
        list.innerHTML = '';
        items.forEach(function(item) {
            var lblItem = document.createElement('label');
            lblItem.className = 'ms-item';

            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = item.value;
            cb.checked = selectedValues.indexOf(item.value) !== -1;
            cb.onchange = function() {
                if (this.checked) {
                    if (selectedValues.indexOf(item.value) === -1) selectedValues.push(item.value);
                } else {
                    for (var i = selectedValues.length - 1; i >= 0; i--) {
                        if (selectedValues[i] === item.value) selectedValues.splice(i, 1);
                    }
                }
                updateBtn();
                onChange(selectedValues);
            };
            lblItem.appendChild(cb);
            lblItem.appendChild(document.createTextNode(item.text));
            list.appendChild(lblItem);
        });
    }
    renderItems();

    btn.onclick = function(e) {
        e.stopPropagation();
        document.querySelectorAll('.ms-dropdown').forEach(function(d) {
            if (d !== dropdown) d.classList.remove('show');
        });
        dropdown.classList.toggle('show');
    };

    document.addEventListener('click', function(e) {
        if (!wrapper.contains(e.target)) dropdown.classList.remove('show');
    });

    wrapper.appendChild(btn);
    wrapper.appendChild(dropdown);
    container.appendChild(wrapper);
}

function initLedgerFilters() {
    var accCatItems = [
        { value: 'permanent', text: 'دائمی' },
        { value: 'temporary', text: 'موقت' },
        { value: 'none', text: 'مهم نیست' }
    ];
    var natureItems = [
        { value: 'debit', text: 'بدهکار' },
        { value: 'credit', text: 'بستانکار' },
        { value: 'none', text: 'مهم نیست' }
    ];
    var vTypeItems = [
        { value: 'general', text: 'عمومی' },
        { value: 'opening', text: 'افتتاحیه' },
        { value: 'establishment', text: 'افتتاحیه استقرار' },
        { value: 'closing', text: 'بستن حساب' },
        { value: 'final', text: 'اختتامیه' }
    ];
    var detTypeItems = [
        { value: 'person', text: '👥 اشخاص' },
        { value: 'company', text: '🏢 شرکت‌ها' },
        { value: 'bank', text: '🏦 بانکی' },
        { value: 'cashbox', text: '💰 صندوق' },
        { value: 'project', text: '📁 پروژه' },
        { value: 'facility', text: '🏦 تسهیلات' },
        { value: 'none', text: 'بدون تفصیل' }
    ];

    buildMultiSelect('rl-ms-acccat', 'نوع حساب', accCatItems, _RL.filters.accCat, function() {});
    buildMultiSelect('rl-ms-nature', 'ماهیت حساب', natureItems, _RL.filters.nature, function() {});
    buildMultiSelect('rl-ms-vtype', 'نوع سند', vTypeItems, _RL.filters.vType, function() {});
    buildMultiSelect('rl-ms-dettype', 'نوع تفصیل', detTypeItems, _RL.filters.detType, function() {});
}

function getAccHierarchy(id, accounts) {
    var acc = accounts.find(function(a) { return a.id === id; });
    if (!acc) return { g: {}, k: {}, m: {} };
    var m = acc;
    var k = m.parent ? accounts.find(function(a) { return a.id === m.parent; }) : null;
    var g = k && k.parent ? accounts.find(function(a) { return a.id === k.parent; }) : null;
    
    if (m.level === 2) { k = m; m = {}; }
    else if (m.level === 1) { g = m; k = {}; m = {}; }

    if (k && k.level === 1) { g = k; k = {}; }
    
    return { g: g || {}, k: k || {}, m: m || {} };
}

function runLedgerReport() {
    initLedgerFilters();

    var fromD = normalizeDigits((document.getElementById('rl-from').value || '').trim());
    var toD = normalizeDigits((document.getElementById('rl-to').value || '').trim());
    
    // ✅ تاریخ پیش‌فرض: امروز
    if (!fromD) fromD = todayJalaliStr();
    if (!toD) toD = todayJalaliStr();
    
    document.getElementById('rl-from').value = fromD;
    document.getElementById('rl-to').value = toD;

    if (fromD > toD) { alert('تاریخ شروع باید قبل از پایان باشد.'); return; }

    var vouchers = DB.load('vouchers', []).filter(function(v) {
        return v.status === 'approved' && v.date >= fromD && v.date <= toD;
    });
    var accounts = DB.load('accounts', []);
    var periods = DB.load('fiscalPeriods', []);
    var pMap = {};
    periods.forEach(function(p) { pMap[p.id] = p.title; });

    var rows = [];
    var hide = getHideState('rl');

    vouchers.forEach(function(v) {
        if (_RL.filters.vType.length > 0 && _RL.filters.vType.indexOf(v.type || 'general') === -1) return;
        
        var vDate = v.date || '';
        var vTime = v.time || '';
        var vNum = v.number || '';
        var vDesc = v.desc || '';
        var vPeriod = pMap[v.periodId] || '—';
        var vTypeName = voucherTypeName(v.type);

        (v.lines || []).forEach(function(l) {
            if (!l.account) return;
            var acc = accounts.find(function(a) { return a.id === l.account; });
            if (!acc) return;

            var cat = acc.cat || 'permanent';
            if (_RL.filters.accCat.length > 0 && _RL.filters.accCat.indexOf(cat) === -1) return;

            var nat = acc.nature || 'debit';
            if (_RL.filters.nature.length > 0 && _RL.filters.nature.indexOf(nat) === -1) return;

            var detTypeMatch = false;
            var detCode = '—';
            var detTitle = '—';

            if (l.details && Object.keys(l.details).length > 0) {
                Object.keys(l.details).forEach(function(lt) {
                    if (l.details[lt] && _RL.filters.detType.indexOf(lt) !== -1) {
                        detTypeMatch = true;
                        detCode = '—';
                        detTitle = linkTypeName(lt) + ': ' + getDetailLabel(lt, l.details[lt]);
                    }
                });
            } else {
                if (_RL.filters.detType.indexOf('none') !== -1) detTypeMatch = true;
            }

            if (!detTypeMatch) return;

            var hier = getAccHierarchy(acc.id, accounts);

            rows.push({
                vType: vTypeName,
                vNum: vNum,
                vPeriod: vPeriod,
                vDate: vDate,
                vTime: vTime,
                vDesc: vDesc,
                gCode: hier.g.code || '—',
                gName: hier.g.name || '—',
                kCode: hier.k.code || '—',
                kName: hier.k.name || '—',
                mCode: hier.m.code || '—',
                mName: hier.m.name || '—',
                detCode: detCode,
                detTitle: detTitle,
                debit: Number(l.debit) || 0,
                credit: Number(l.credit) || 0,
                trackNum: l.trackingNumber || '—',
                trackDate: l.trackingDate || '—',
                lineDesc: l.description || ''
            });
        });
    });

    rows.sort(function(a, b) {
        var c = compareVals(b.vDate, a.vDate);
        if (c !== 0) return c;
        c = compareVals(b.vNum, a.vNum);
        if (c !== 0) return c;
        return compareVals(a.vType, b.vType);
    });

    var html = '<div class="table-wrap"><table class="report-table data-table" id="rl-table" data-table-id="rl-table"><thead><tr>';
    html += '<th>نوع سند</th><th>شماره سند</th><th>دوره مالی</th><th>تاریخ سند</th><th>ساعت</th><th>شرح سند</th>';
    html += '<th>کد گروه</th><th>عنوان گروه</th><th>کد کل</th><th>عنوان کل</th>';
    html += '<th>کد معین</th><th>عنوان معین</th><th>کد تفصیل</th><th>عنوان تفصیل</th>';
    html += '<th>بدهکار</th><th>بستانکار</th><th>ش پیگیری</th><th>تاریخ پیگیری</th><th>شرح قلم</th>';
    html += '</tr></thead><tbody>';

    var tD = 0, tC = 0;
    rows.forEach(function(r) {
        tD += r.debit;
        tC += r.credit;
        html += '<tr>';
        html += '<td>' + esc(r.vType) + '</td>';
        html += '<td dir="ltr">' + toFa(esc(r.vNum)) + '</td>';
        html += '<td>' + esc(r.vPeriod) + '</td>';
        html += '<td dir="ltr">' + toFa(esc(r.vDate)) + '</td>';
        html += '<td dir="ltr">' + toFa(esc(r.vTime)) + '</td>';
        html += '<td>' + esc(r.vDesc) + '</td>';
        html += '<td dir="ltr">' + toFa(esc(r.gCode)) + '</td>';
        html += '<td>' + esc(r.gName) + '</td>';
        html += '<td dir="ltr">' + toFa(esc(r.kCode)) + '</td>';
        html += '<td>' + esc(r.kName) + '</td>';
        html += '<td dir="ltr">' + toFa(esc(r.mCode)) + '</td>';
        html += '<td>' + esc(r.mName) + '</td>';
        html += '<td dir="ltr">' + toFa(esc(r.detCode)) + '</td>';
        html += '<td>' + esc(r.detTitle) + '</td>';
        html += '<td class="num dr">' + (hide ? '—' : (r.debit ? formatMoney(r.debit) : '—')) + '</td>';
        html += '<td class="num cr">' + (hide ? '—' : (r.credit ? formatMoney(r.credit) : '—')) + '</td>';
        html += '<td dir="ltr">' + toFa(esc(r.trackNum)) + '</td>';
        html += '<td dir="ltr">' + toFa(esc(r.trackDate)) + '</td>';
        html += '<td>' + esc(r.lineDesc) + '</td>';
        html += '</tr>';
    });

    if (rows.length === 0) {
        html += '<tr><td colspan="19" class="empty-row">داده‌ای یافت نشد.</td></tr>';
    }

    html += '</tbody><tfoot><tr>';
    html += '<td colspan="14" style="text-align:left;font-weight:bold">جمع کل</td>';
    html += '<td class="num dr">' + (hide ? '—' : formatMoney(tD)) + '</td>';
    html += '<td class="num cr">' + (hide ? '—' : formatMoney(tC)) + '</td>';
    html += '<td colspan="3"></td>';
    html += '</tr></tfoot></table></div>';

    document.getElementById('rl-result').innerHTML = html;
    document.getElementById('rl-count').textContent = toFa(rows.length) + ' ردیف';
    document.getElementById('rl-unit').textContent = 'واحد: ' + currencyLabel();

    setTimeout(function () {
        var t = document.getElementById('rl-table');
        if (t && typeof makeTableResizable === 'function') makeTableResizable(t);
        if (typeof applyColVisibility === 'function') applyColVisibility('rl-table');
        if (typeof buildFilterRow === 'function') buildFilterRow(t);
        if (typeof buildShareButtons === 'function') buildShareButtons();
    }, 50);
}

function bindLedgerButtons() {
    var runBtn = document.getElementById('rl-run');
    if (runBtn && !runBtn.dataset.bound) {
        runBtn.dataset.bound = '1';
        runBtn.onclick = runLedgerReport;
    }
    var printBtn = document.getElementById('rl-print');
    if (printBtn && !printBtn.dataset.bound) {
        printBtn.dataset.bound = '1';
        printBtn.onclick = function() {
            if (typeof printHtmlReport === 'function') printHtmlReport('#rl-result', 'گزارش دفاتر');
        };
    }
    var exportBtn = document.getElementById('rl-export');
    if (exportBtn && !exportBtn.dataset.bound) {
        exportBtn.dataset.bound = '1';
        exportBtn.onclick = function() {
            if (typeof exportReportTable === 'function') exportReportTable('#rl-result', 'گزارش-دفاتر');
        };
    }
    
    // ✅ تنظیم تاریخ پیش‌فرض به امروز
    var fromEl = document.getElementById('rl-from');
    var toEl = document.getElementById('rl-to');
    if (fromEl && !fromEl.value) fromEl.value = todayJalaliStr();
    if (toEl && !toEl.value) toEl.value = todayJalaliStr();
    
    if (typeof attachDatePickers === 'function') attachDatePickers();
    initLedgerFilters();
}

window.runLedgerReport = runLedgerReport;
window.bindLedgerButtons = bindLedgerButtons;
