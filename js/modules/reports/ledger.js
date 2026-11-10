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
        .ms-wrapper { width: 100%; }
        .ms-btn { width: 100%; padding: 10px 14px; background: var(--card-solid); border: 1.5px solid var(--border); border-radius: 12px; text-align: right; display: flex; justify-content: space-between; align-items: center; cursor: pointer; font-family: inherit; font-size: 0.9rem; font-weight: 700; color: var(--text); }
        .ms-btn:hover { border-color: var(--primary); }
        
        .ms-dropdown { 
            position: fixed; 
            background: var(--card-solid); 
            border: 1.5px solid var(--primary); 
            border-radius: 12px; 
            box-shadow: var(--shadow-lg); 
            z-index: 999999 !important; 
            display: none; 
            flex-direction: column; 
        }
        .ms-dropdown.show { display: flex; }
        .ms-actions { display: flex; gap: 8px; padding: 8px; border-bottom: 1px solid var(--border); background: var(--card-alt); border-radius: 12px 12px 0 0; }
        .ms-actions button { flex: 1; padding: 6px; background: var(--primary-light); color: var(--primary-dark); border: none; border-radius: 6px; font-family: inherit; font-weight: 700; cursor: pointer; font-size: 0.78rem; }
        .ms-actions button:hover { background: var(--primary); color: #fff; }
        .ms-list { max-height: 220px; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 4px; }
        .ms-item { display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
        .ms-item:hover { background: var(--primary-soft); }
        .ms-item input { width: 18px; height: 18px; accent-color: var(--primary); }

        /* ✅ استایل برای داینامیک شدن عرض جدول در صفحه */
        #rl-table { width: 100% !important; table-layout: auto !important; }
        #rl-table th, #rl-table td { min-width: 50px; }
    `;
    document.head.appendChild(s);
})();

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

    document.body.appendChild(dropdown);

    function positionDropdown() {
        var rect = btn.getBoundingClientRect();
        dropdown.style.top = (rect.bottom + 4) + 'px';
        dropdown.style.left = rect.left + 'px';
        dropdown.style.width = rect.width + 'px';
        
        var spaceBelow = window.innerHeight - rect.bottom;
        if (spaceBelow < 250) {
            dropdown.style.top = 'auto';
            dropdown.style.bottom = (window.innerHeight - rect.top + 4) + 'px';
        } else {
            dropdown.style.bottom = 'auto';
        }
    }

    btn.onclick = function(e) {
        e.stopPropagation();
        var isOpen = dropdown.classList.contains('show');
        document.querySelectorAll('.ms-dropdown').forEach(function(d) { d.classList.remove('show'); });
        
        if (!isOpen) {
            positionDropdown();
            dropdown.classList.add('show');
        }
    };

    document.addEventListener('click', function(e) {
        if (!dropdown.contains(e.target) && !wrapper.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });

    window.addEventListener('resize', function() { dropdown.classList.remove('show'); });
    window.addEventListener('scroll', function(e) { 
        if (!dropdown.contains(e.target)) dropdown.classList.remove('show'); 
    }, true);

    wrapper.appendChild(btn);
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

    // ✅ حذف colgroup و اجازه دادن به جدول برای کشیده شدن داینامیک
    var html = '<div class="table-wrap"><table class="report-table data-table" id="rl-table" data-table-id="rl-table">';
    html += '<thead><tr>';
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

/* ============================================================
   ✅ تابع اختصاصی چاپ با پشتیبانی از افقی/عمودی و Fit to Page
   ============================================================ */
function printLedgerReport(selector, title, orientation) {
    var activePage = document.querySelector('.page.active');
    var targetEl = activePage ? activePage.querySelector(selector) : null;
    if (!targetEl) targetEl = document.querySelector(selector);
    if (!targetEl) { alert('محتوایی برای چاپ یافت نشد.'); return; }

    var fromVal = (document.getElementById('rl-from') || {}).value || '';
    var toVal = (document.getElementById('rl-to') || {}).value || '';
    var dateRange = '';
    if (fromVal || toVal) {
        dateRange = 'از تاریخ: ' + toFa(fromVal) + (toVal ? ' | تا تاریخ: ' + toFa(toVal) : '');
    }

    var clone = targetEl.cloneNode(true);
    
    // ✅ 1. پیدا کردن ستون‌های مخفی شده
    var originalThs = targetEl.querySelectorAll('thead th');
    var hiddenIndices = [];
    for (var i = 0; i < originalThs.length; i++) {
        if (originalThs[i].style.display === 'none') {
            hiddenIndices.push(i);
        }
    }
    var visibleCount = originalThs.length - hiddenIndices.length;

    // ✅ 2. حذف ستون‌های مخفی از تمام سطرهای کپی شده تا فضای خالی نماند
    var cloneRows = clone.querySelectorAll('tr');
    cloneRows.forEach(function(tr) {
        for (var k = hiddenIndices.length - 1; k >= 0; k--) {
            var idx = hiddenIndices[k];
            if (tr.children[idx]) tr.children[idx].remove();
        }
    });

    // ✅ 3. تنظیم عرض داینامیک و مساوی برای ستون‌های باقی‌مانده جهت پر کردن صفحه
    var table = clone.querySelector('table');
    if (table) {
        var oldColgroup = table.querySelector('colgroup');
        if (oldColgroup) oldColgroup.remove();
        
        var newColgroup = document.createElement('colgroup');
        for (var c = 0; c < visibleCount; c++) {
            var col = document.createElement('col');
            col.style.width = (100 / visibleCount).toFixed(2) + '%';
            newColgroup.appendChild(col);
        }
        table.insertBefore(newColgroup, table.firstChild);
    }

    // ✅ 4. اصلاح colspan در فوتر (قبل از انتقال به tbody)
    var tfootTr = clone.querySelector('tfoot tr');
    if (tfootTr && tfootTr.children.length >= 4) {
        var visSpan1 = 0, visSpan2 = 0;
        for (var i = 0; i < 14; i++) { if (hiddenIndices.indexOf(i) === -1) visSpan1++; }
        for (var i = 16; i < 19; i++) { if (hiddenIndices.indexOf(i) === -1) visSpan2++; }
        tfootTr.children[0].colSpan = visSpan1;
        tfootTr.children[3].colSpan = visSpan2;
    }

    var toRemove = clone.querySelectorAll('button, .row-actions, .no-print, .print-hide, .col-resizer, .col-filter-btn');
    for (var r = 0; r < toRemove.length; r++) toRemove[r].remove();

    // انتقال فوتر به بدنه برای چاپ بهتر در بعضی مرورگرها
    clone.querySelectorAll('table').forEach(function (table) {
        var tfoot = table.querySelector('tfoot');
        var tbody = table.querySelector('tbody');
        if (tfoot && tbody) {
            var footRow = tfoot.querySelector('tr');
            if (footRow) {
                footRow.style.backgroundColor = '#f1f5f9';
                footRow.style.color = '#0f172a';
                footRow.style.fontWeight = 'bold';
                footRow.style.pageBreakInside = 'avoid';
                var tds = footRow.querySelectorAll('td');
                for (var i=0; i<tds.length; i++) {
                    tds[i].style.borderTop = '2px solid #1e40af';
                    tds[i].style.borderBottom = '2px solid #1e40af';
                    tds[i].style.padding = '4px 2px';
                }
                tbody.appendChild(footRow);
            }
            tfoot.remove();
        }
    });

    var pageSize = (orientation === 'landscape') ? 'A4 landscape' : 'A4 portrait';

    var htmlContent =
        '<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="UTF-8"><title>' + esc(title) + '</title>' +
        '<style>' +
        '@page { ' +
            'size: ' + pageSize + '; ' +
            'margin: 8mm; ' + // حاشیه استاندارد برای چاپ
            '@bottom-center { content: "صفحه " counter(page) " از " counter(pages); font-family: Tahoma; font-size: 8pt; color: #475569; font-weight: bold; } ' +
            '@top-center { content: "' + esc(title) + '"; font-family: Tahoma; font-size: 8pt; color: #94a3b8; } ' +
        '}' +
        'body { font-family: Tahoma, Arial, sans-serif; direction: rtl; color: #000; margin: 0; padding: 0; }' +
        '.header { text-align: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2.5px solid #1e40af; }' +
        '.header h1 { font-size: 16pt; margin: 0 0 5px 0; color: #1e40af; font-weight: 900; }' +
        '.date-range { font-size: 9pt; color: #475569; font-weight: bold; }' +
        'table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse; margin-bottom: 10px; }' +
        'th, td { border: 1px solid #64748b; padding: 4px 2px !important; text-align: center; vertical-align: middle; font-size: 7.5pt !important; white-space: normal !important; word-wrap: break-word !important; line-height: 1.4; }' +
        'th { background-color: #e2e8f0 !important; font-weight: bold !important; color: #1e40af; font-size: 8pt !important; }' +
        '.num { direction: ltr; font-family: Arial, Tahoma, sans-serif; font-variant-numeric: tabular-nums; }' +
        '.dr { color: #dc2626 !important; font-weight: bold; }' +
        '.cr { color: #059669 !important; font-weight: bold; }' +
        'tr { page-break-inside: avoid !important; }' +
        'thead { display: table-header-group; }' +
        '.row-actions, button, .print-hide { display: none !important; }' +
        '</style></head><body>' +
        '<div class="header">' +
            '<h1>' + esc(title) + '</h1>' +
            (dateRange ? '<div class="date-range">' + esc(dateRange) + '</div>' : '') +
        '</div>' +
        '<div>' + clone.innerHTML + '</div>' +
        '</body></html>';

    var printWindow = window.open('', '_blank');
    if (!printWindow) { alert('لطفاً پاپ‌آپ را در مرورگر خود مجاز کنید.'); return; }
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    if (typeof showToast === 'function') showToast('🖨️ در پنجره باز شده، گزینه Save as PDF را انتخاب کنید.');

    setTimeout(function () {
        printWindow.focus();
        printWindow.print();
        printWindow.onafterprint = function () { printWindow.close(); };
    }, 500);
}

function bindLedgerButtons() {
    var runBtn = document.getElementById('rl-run');
    if (runBtn && !runBtn.dataset.bound) {
        runBtn.dataset.bound = '1';
        runBtn.onclick = runLedgerReport;
    }

    var printBtn = document.getElementById('rl-print');
    if (printBtn) {
        if (!document.getElementById('rl-print-orientation')) {
            var sel = document.createElement('select');
            sel.id = 'rl-print-orientation';
            sel.style.cssText = 'padding: 0 16px; border-radius: 12px; border: 1.5px solid var(--primary); background: var(--primary-light); color: var(--primary-dark); font-family: inherit; font-size: 0.9rem; font-weight: 800; cursor: pointer; height: 42px; display: inline-flex; align-items: center; outline: none;';
            sel.innerHTML = '<option value="landscape">🖨 افقی (Fit to Page)</option><option value="portrait">🖨 عمودی (Portrait)</option>';
            printBtn.parentNode.insertBefore(sel, printBtn);
        }

        if (!printBtn.dataset.bound) {
            printBtn.dataset.bound = '1';
            printBtn.onclick = function() {
                var orientEl = document.getElementById('rl-print-orientation');
                var orient = orientEl ? orientEl.value : 'landscape';
                printLedgerReport('#rl-result', 'گزارش دفاتر', orient);
            };
        }
    }

    var exportBtn = document.getElementById('rl-export');
    if (exportBtn && !exportBtn.dataset.bound) {
        exportBtn.dataset.bound = '1';
        exportBtn.onclick = function() {
            if (typeof exportReportTable === 'function') exportReportTable('#rl-result', 'گزارش-دفاتر');
        };
    }
    
    var fromEl = document.getElementById('rl-from');
    var toEl = document.getElementById('rl-to');
    if (fromEl && !fromEl.value) fromEl.value = todayJalaliStr();
    if (toEl && !toEl.value) toEl.value = todayJalaliStr();
    
    if (typeof attachDatePickers === 'function') attachDatePickers();
    initLedgerFilters();
}

window.runLedgerReport = runLedgerReport;
window.bindLedgerButtons = bindLedgerButtons;
