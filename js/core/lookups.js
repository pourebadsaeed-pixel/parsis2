/* ============================================================
   پارسیس — جستجوی حساب‌ها، چاپ، CSV
   مسیر: js/core/lookups.js
   ============================================================ */
'use strict';

function getAccountLabel(accId, accounts) {
    if (!accounts) accounts = DB.load('accounts', []);
    var acc = accounts.find(function (a) { return a.id === accId; });
    if (!acc) return '';
    if (!acc.parent) return acc.name;
    var parent = accounts.find(function (a) { return a.id === acc.parent; });
    if (!parent) return acc.name;
    return parent.name + ' - ' + acc.name;
}

function getAccountSearchText(accId, accounts) {
    if (!accounts) accounts = DB.load('accounts', []);
    var acc = accounts.find(function (a) { return a.id === accId; });
    if (!acc) return '';
    var parts = [acc.code || '', acc.name || ''];
    if (acc.parent) {
        var p = accounts.find(function (a) { return a.id === acc.parent; });
        if (p) {
            parts.push(p.code || '');
            parts.push(p.name || '');
        }
    }
    return parts.join(' ').toLowerCase();
}

function getDetailLabel(linkType, did) {
    if (linkType === 'person') {
        var p = DB.load('persons', []).find(function (x) { return x.id === did; });
        return p ? ((p.first || '') + ' ' + (p.last || '')) : did;
    }
    if (linkType === 'company') {
        var co = DB.load('companies', []).find(function (x) { return x.id === did; });
        return co ? co.name : did;
    }
    if (linkType === 'bank') {
        var b = DB.load('bankAccounts', []).find(function (x) { return x.id === did; });
        return b ? ((b.bank || '') + ' - ' + (b.account || '')) : did;
    }
    if (linkType === 'cashbox') {
        var c = DB.load('cashBoxes', []).find(function (x) { return x.id === did; });
        return c ? c.title : did;
    }
    if (linkType === 'project') {
        var pr = DB.load('projects', []).find(function (x) { return x.id === did; });
        return pr ? pr.name : did;
    }
    if (linkType === 'facility') {
        var fc = DB.load('facilities', []).find(function (x) { return x.id === did; });
        return fc ? fc.name : did;
    }
    return did;
}

function getLinkedItems(type) {
    if (type === 'person')   return DB.load('persons', []);
    if (type === 'company')  return DB.load('companies', []);
    if (type === 'bank')     return DB.load('bankAccounts', []);
    if (type === 'cashbox')  return DB.load('cashBoxes', []);
    if (type === 'project')  return DB.load('projects', []);
    if (type === 'facility') return DB.load('facilities', []);
    return [];
}

function getLinkedItemLabel(type, item) {
    if (type === 'person')   return (item.first || '') + ' ' + (item.last || '');
    if (type === 'company')  return item.name || '';
    if (type === 'bank')     return (item.bank || '') + ' - ' + (item.account || '');
    if (type === 'cashbox')  return item.title || '';
    if (type === 'project')  return item.name || '';
    if (type === 'facility') {
        var bank = DB.load('bankAccounts', []).find(function (b) { return b.id === item.bankId; });
        return item.name + (bank ? ' — ' + bank.bank : '');
    }
    return '';
}

function getBankMoeinId() {
    var accounts = DB.load('accounts', []);
    var m = accounts.find(function (a) { return a.links && a.links.indexOf('bank') !== -1; });
    return m ? m.id : '';
}

function getLeafAccounts() {
    var accounts = DB.load('accounts', []);
    return accounts.filter(function (a) {
        return !accounts.some(function (x) { return x.parent === a.id; });
    });
}

function sortAccountsByCode(arr) {
    return arr.slice().sort(function (a, b) {
        var ca = String(a.code || '');
        var cb = String(b.code || '');
        var pa = ca.split('-').map(function (x) { return parseInt(x, 10) || 0; });
        var pb = cb.split('-').map(function (x) { return parseInt(x, 10) || 0; });
        var n = Math.max(pa.length, pb.length);
        for (var i = 0; i < n; i++) {
            var va = pa[i] || 0;
            var vb = pb[i] || 0;
            if (va !== vb) return va - vb;
        }
        return ca.localeCompare(cb, 'fa');
    });
}

function getLeafAccountsSortedByCode() {
    var accounts = DB.load('accounts', []);
    var leaves = accounts.filter(function (a) {
        return !accounts.some(function (x) { return x.parent === a.id; });
    });
    return sortAccountsByCode(leaves);
}

function buildOptionsInto(sel, items, labelFn, selectedId, placeholder) {
    sel.innerHTML = '';
    var ph = document.createElement('option');
    ph.value = '';
    ph.textContent = placeholder || '—';
    sel.appendChild(ph);
    for (var i = 0; i < items.length; i++) {
        var o = document.createElement('option');
        o.value = items[i].id;
        o.textContent = labelFn(items[i]);
        if (selectedId === items[i].id) o.selected = true;
        sel.appendChild(o);
    }
}

/* ============================================================
   بخش چاپ (کاملاً اصلاح شده برای مودال‌ها و صفحات)
   ============================================================ */
function printHtmlReport(selector, title) {
    // ✅ پیدا کردن المان هدف فقط در صفحه فعال یا مودال
    var activePage = document.querySelector('.page.active');
    var targetEl = activePage ? activePage.querySelector(selector) : null;
    
    // اگر در صفحه فعال نبود (مثلا در مودال بود)
    if (!targetEl) targetEl = document.querySelector(selector);
    
    if (!targetEl) {
        alert('محتوایی برای چاپ یافت نشد.');
        return;
    }

    // استخراج تاریخ‌ها
    var dateRange = '';
    var fromEl = document.getElementById('rt-from') || 
                 document.getElementById('ra-from') || 
                 document.getElementById('cf-from') || 
                 document.getElementById('cfd-from');
                 
    var toEl = document.getElementById('rt-to') || 
               document.getElementById('ra-to') || 
               document.getElementById('cf-to') || 
               document.getElementById('cfd-to');

    var fVal = fromEl && fromEl.value ? fromEl.value : '';
    var tVal = toEl && toEl.value ? toEl.value : '';

    if (fVal || tVal) {
        dateRange = 'از تاریخ: ' + toFa(fVal) + ' | تا تاریخ: ' + toFa(tVal);
    } else if (activePage) {
        var dateInputs = activePage.querySelectorAll('.date-picker');
        var dates = [];
        dateInputs.forEach(function(inp) {
            if (inp.value) {
                var label = inp.closest('.field') ? inp.closest('.field').querySelector('label') : null;
                var labelText = label ? label.textContent.trim() : '';
                dates.push((labelText ? labelText + ': ' : '') + toFa(inp.value));
            }
        });
        if (dates.length > 0) dateRange = dates.join(' | ');
    }

    var tablesHtml = '';
    var isLandscape = false;

    // پیدا کردن تمام جدول‌های داخل المان هدف
    var sourceTables = targetEl.tagName === 'TABLE' ? [targetEl] : targetEl.querySelectorAll('table');

    if (sourceTables.length === 0) {
        tablesHtml = targetEl.innerHTML;
    } else {
        sourceTables.forEach(function(tbl) {
            if (tbl.offsetWidth === 0 && !tbl.closest('.modal')) return; 

            var clone = tbl.cloneNode(true);

            // پاکسازی فیلترها و دکمه‌های اضافی
            clone.querySelectorAll('tr.column-filter-row, tr.ar-filter-row, tr.cfd-filter-row').forEach(el => el.remove());
            
            var ths = clone.querySelectorAll('thead th');
            var actionColIndex = -1;
            ths.forEach(function(th, i) { 
                if (th.textContent.includes('عملیات')) actionColIndex = i; 
            });
            if (actionColIndex > -1) {
                clone.querySelectorAll('tr').forEach(function(tr) {
                    var cells = tr.children;
                    if (cells.length > actionColIndex) cells[actionColIndex].remove();
                });
            }
            clone.querySelectorAll('.row-actions, .col-resizer, .eye-toggle-btn, .col-toggle-btn, button, .ar-turnover-btn').forEach(el => el.remove());

            var thCount = clone.querySelectorAll('thead tr:first-child th').length;
            if (thCount > 6) isLandscape = true;

            var groupTitle = '';
            var parentGroup = tbl.closest('.cfd-group');
            if (parentGroup) {
                var titleEl = parentGroup.querySelector('.cfd-title');
                if (titleEl) groupTitle = titleEl.textContent.trim();
            }

            if (groupTitle) {
                tablesHtml += `<div style="margin-top:20px; margin-bottom:10px; font-weight:bold; font-size:12pt; color:#1e40af;">${esc(groupTitle)}</div>`;
            }
            
            tablesHtml += clone.outerHTML;
        });
    }

    var now = new Date();
    var timeStr = pad2(now.getHours()) + ':' + pad2(now.getMinutes());
    var dateStr = todayJalaliStr().replace(/\//g, '-');
    var safeTitle = (title || 'گزارش').replace(/[\\/:*?"<>|]/g, '').trim(); 
    var fileName = safeTitle + '-(' + timeStr + '-' + dateStr + ')';

    var htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="fa">
        <head>
            <meta charset="UTF-8">
            <title>${esc(fileName)}</title>
            <style>
                @page { size: ${isLandscape ? 'A4 landscape' : 'A4 portrait'}; margin: 12mm; }
                body { font-family: 'B Nazanin', Tahoma, sans-serif; font-size: 11pt; direction: rtl; color: #000; margin: 0; padding: 0; }
                .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
                .header h1 { font-family: 'B Titr', Tahoma, sans-serif; font-size: 14pt; margin: 0 0 5px 0; color: #1e40af; }
                .header .date-range { font-size: 11pt; color: #475569; font-weight: bold; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                tr { page-break-inside: avoid !important; }
                thead { display: table-header-group; }
                th, td { border: 1px solid #64748b; padding: 4px 8px; text-align: center; vertical-align: middle; word-wrap: break-word; }
                th { background-color: #e2e8f0 !important; font-weight: bold !important; font-family: 'B Titr', Tahoma, sans-serif; color: #1e40af; font-size: 11pt; }
                tfoot td { background-color: #e2e8f0 !important; font-weight: bold !important; font-family: 'B Titr', Tahoma, sans-serif; color: #1e40af; }
                td:first-child { text-align: right; font-weight: bold; }
                .num, .ltr { direction: ltr; font-family: Arial, Tahoma, sans-serif; font-size: 10pt; white-space: nowrap; }
                .dr, .neg-money, td[style*="color:#c0392b"] { color: #dc2626 !important; font-weight: bold; }
                .cr, td[style*="color:#1e9e6a"] { color: #059669 !important; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${esc(title)}</h1>
                ${dateRange ? `<div class="date-range">${esc(dateRange)}</div>` : ''}
            </div>
            <div>
                ${tablesHtml}
            </div>
        </body>
        </html>
    `;

    var printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('لطفاً پاپ‌آپ (Popup) را در مرورگر خود مجاز کنید.');
        return;
    }
    
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    showToast('🖨️ در پنجره باز شده، گزینه Save as PDF را انتخاب کنید.');

    printWindow.onload = function() {
        setTimeout(function() {
            printWindow.focus();
            printWindow.print();
            printWindow.onafterprint = function() { printWindow.close(); };
        }, 500);
    };
}

function exportToCsv(key, filename) {
    var data = DB.load(key, []);
    if (!Array.isArray(data)) data = [];
    if (data.length === 0) { alert('داده‌ای نیست.'); return; }
    var keys = [];
    data.forEach(function (row) {
        Object.keys(row).forEach(function (k) { if (keys.indexOf(k) === -1) keys.push(k); });
    });
    var lines = [keys.join(',')];
    data.forEach(function (row) {
        lines.push(keys.map(function (k) {
            var v = row[k];
            if (v === null || v === undefined) v = '';
            if (typeof v === 'object') v = JSON.stringify(v);
            v = String(v).replace(/"/g, '""');
            return '"' + v + '"';
        }).join(','));
    });
    var csv = '\uFEFF' + lines.join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var now = new Date();
    var dateStr = todayJalaliStr().replace(/\//g, '-');
    var timeStr = pad2(now.getHours()) + '-' + pad2(now.getMinutes());
    var a = document.createElement('a');
    a.href = url;
    a.download = filename + '-' + dateStr + '_' + timeStr + '.csv';
    a.click();
    URL.revokeObjectURL(url);
}

function exportReportTable(selector, filename) {
    var activePage = document.querySelector('.page.active');
    var el = activePage ? activePage.querySelector(selector) : null;
    if (!el) el = document.querySelector(selector);
    
    if (!el) { alert('ابتدا گزارش را اجرا کن.'); return; }
    
    var table = el.querySelector('table');
    var detailList = el.querySelector('.rff-detail-list');
    var rows = [];
    
    if (detailList) {
        rows.push(['گزارش جامع تسهیلات — جزئیات']); rows.push([]);
        var cards = detailList.querySelectorAll('.rff-fac-card');
        for (var c = 0; c < cards.length; c++) {
            var card = cards[c];
            var title = card.querySelector('.rff-fac-title');
            rows.push(['عنوان تسهیلات:', title ? title.textContent.trim() : '']);
            var tbl = card.querySelector('.rff-inst-table');
            if (tbl) {
                var trs = tbl.querySelectorAll('tr');
                for (var t = 0; t < trs.length; t++) {
                    var cells = trs[t].querySelectorAll('th, td');
                    var rr = [];
                    for (var cc = 0; cc < cells.length; cc++) rr.push(cells[cc].textContent.trim());
                    rows.push(rr);
                }
            }
            rows.push([]);
        }
    } else if (table) {
        var trs2 = table.querySelectorAll('tr');
        for (var i = 0; i < trs2.length; i++) {
            var cells2 = trs2[i].querySelectorAll('th, td');
            var row2 = [];
            for (var j = 0; j < cells2.length; j++) {
                if (cells2[j].style.display === 'none') continue;
                row2.push(String(cells2[j].textContent || '').trim());
            }
            if (row2.length > 0) rows.push(row2);
        }
    } else { alert('ابتدا گزارش را اجرا کن.'); return; }

    if (rows.length === 0) { alert('داده‌ای برای خروجی نیست.'); return; }
    var lines = [];
    for (var r = 0; r < rows.length; r++) {
        lines.push(rows[r].map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','));
    }
    var csv = '\uFEFF' + lines.join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var now = new Date();
    var dateStr = todayJalaliStr().replace(/\//g, '-');
    var timeStr = pad2(now.getHours()) + '-' + pad2(now.getMinutes());
    var a = document.createElement('a');
    a.href = url; a.download = filename + '-' + dateStr + '_' + timeStr + '.csv';
    a.click(); URL.revokeObjectURL(url);
}

window.getAccountLabel = getAccountLabel;
window.getAccountSearchText = getAccountSearchText;
window.getDetailLabel = getDetailLabel;
window.getLinkedItems = getLinkedItems;
window.getLinkedItemLabel = getLinkedItemLabel;
window.getBankMoeinId = getBankMoeinId;
window.getLeafAccounts = getLeafAccounts;
window.sortAccountsByCode = sortAccountsByCode;
window.getLeafAccountsSortedByCode = getLeafAccountsSortedByCode;
window.buildOptionsInto = buildOptionsInto;
window.printHtmlReport = printHtmlReport;
window.exportToCsv = exportToCsv;
window.exportReportTable = exportReportTable;

console.log('✅ [core/lookups.js] loaded — Clean Print Window + Modal Support');
