/* ============================================================
   پارسیس — جستجوی حساب‌ها، چاپ، CSV (نسخه نهایی چاپ گزارش‌ها)
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
   تابع چاپ هوشمند و استاندارد (با حذف آیکن‌ها و محاسبه مجدد جمع)
   ============================================================ */
function printHtmlReport(selector, title) {
    var activePage = document.querySelector('.page.active');
    var targetEl = activePage ? activePage.querySelector(selector) : null;
    
    if (!targetEl) targetEl = document.querySelector(selector);
    
    if (!targetEl) {
        alert('محتوایی برای چاپ یافت نشد.');
        return;
    }

    var dateRange = '';
    var fromVal = '', toVal = '';
    if (selector === '#ra-result') {
        fromVal = (document.getElementById('ra-from') || {}).value || '';
        toVal = (document.getElementById('ra-to') || {}).value || '';
    } else if (selector === '#rt-result') {
        fromVal = (document.getElementById('rt-from') || {}).value || '';
        toVal = (document.getElementById('rt-to') || {}).value || '';
    } else if (selector === '#cf-result') {
        fromVal = (document.getElementById('cf-from') || {}).value || '';
        toVal = (document.getElementById('cf-to') || {}).value || '';
    } else if (selector === '#cfd-result') {
        fromVal = (document.getElementById('cfd-from') || {}).value || '';
        toVal = (document.getElementById('cfd-to') || {}).value || '';
    } else if (selector === '#ri-result') {
        fromVal = (document.getElementById('ri-from') || {}).value || '';
        toVal = (document.getElementById('ri-to') || {}).value || '';
    }
    
    if (fromVal || toVal) {
        dateRange = 'از تاریخ: ' + toFa(fromVal) + (toVal ? ' | تا تاریخ: ' + toFa(toVal) : '');
    }

    var clone = targetEl.cloneNode(true);

    // ✅ حذف تمام آیکن‌ها و دکمه‌های اضافی
    var toRemove = clone.querySelectorAll('.share-btn, .col-filter-btn, .col-resizer, .row-actions, button, .no-print, .eye-toggle-btn, .col-toggle-btn, .col-reset-btn, .col-filter-popover, .col-menu, .ar-turnover-btn, .ar-col-toggle');
    for (var r = 0; r < toRemove.length; r++) toRemove[r].remove();

    // ✅ محاسبه مجدد جمع (فقط ردیف‌های قابل مشاهده)
    clone.querySelectorAll('table').forEach(function(table) {
        var tfoot = table.querySelector('tfoot');
        var tbody = table.querySelector('tbody');
        if (!tfoot || !tbody) return;
        
        var visibleRows = Array.from(tbody.querySelectorAll('tr')).filter(function(tr) { 
            return tr.style.display !== 'none' && !tr.classList.contains('empty-row'); 
        });
        
        var footRow = tfoot.querySelector('tr');
        if (!footRow) return;
        
        Array.from(footRow.children).forEach(function(cell, idx) {
            var txt = cell.textContent.trim();
            if (/\d/.test(txt) && !/^[^\d]*$/.test(txt)) {
                var sum = 0;
                var hasNumbers = false;
                visibleRows.forEach(function(tr) {
                    var td = tr.children[idx];
                    if (td) {
                        var tdTxt = td.textContent.replace(/,/g, '').replace(/[۰-۹]/g, function(d) { return d.charCodeAt(0) - 0x06F0; }).replace(/[^\d\-\.]/g, '');
                        var val = parseFloat(tdTxt);
                        if (!isNaN(val)) { sum += val; hasNumbers = true; }
                    }
                });
                if (hasNumbers) {
                    var isNeg = sum < 0;
                    var absSum = Math.abs(sum);
                    var formatted = absSum.toLocaleString('fa-IR');
                    cell.textContent = isNeg ? '(' + formatted + ')' : formatted;
                    if (isNeg) cell.style.color = '#dc2626';
                    else cell.style.color = '#1e40af';
                }
            }
        });
    });

    var htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="fa">
        <head>
            <meta charset="UTF-8">
            <title>${esc(title)}</title>
            <style>
                @page { 
                    size: A4; 
                    margin: 15mm; 
                    @bottom-center { content: "صفحه " counter(page) " از " counter(pages); font-family: Tahoma, sans-serif; font-size: 10pt; color: #555; }
                }
                body { font-family: Tahoma, sans-serif; direction: rtl; color: #000; margin: 0; padding: 0; font-size: 11pt; }
                .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
                .header h1 { font-size: 16pt; margin: 0 0 5px 0; color: #1e40af; }
                .header .date-range { font-size: 11pt; color: #475569; font-weight: bold; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                tr { page-break-inside: avoid !important; }
                thead { display: table-header-group; }
                th, td { border: 1px solid #64748b; padding: 4px 8px; text-align: center; vertical-align: middle; font-size: 10pt; }
                th { background-color: #e2e8f0 !important; font-weight: bold !important; color: #1e40af; }
                tfoot td { background-color: #e2e8f0 !important; font-weight: bold !important; color: #1e40af; }
                .num { direction: ltr; font-family: Arial, Tahoma, sans-serif; }
                .dr { color: #dc2626 !important; font-weight: bold; }
                .cr { color: #059669 !important; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${esc(title)}</h1>
                ${dateRange ? `<div class="date-range">${esc(dateRange)}</div>` : ''}
            </div>
            <div>${clone.innerHTML}</div>
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

    if (typeof showToast === 'function') showToast('🖨️ در پنجره باز شده، گزینه Save as PDF را انتخاب کنید.');

    setTimeout(function() {
        printWindow.focus();
        printWindow.print();
        printWindow.onafterprint = function() { printWindow.close(); };
    }, 500);
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

console.log('✅ [core/lookups.js] loaded — Clean Print Window + Smart Totals');
