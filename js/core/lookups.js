/* ============================================================
   پارسیس — جستجوی حساب‌ها، چاپ، CSV
   مسیر: js/core/lookups.js
   وابستگی: constants.js, utils.js, db.js, state.js, toast.js
   ============================================================ */
'use strict';

/* ============================================================
   بخش ۱ — برچسب حساب
   ============================================================ */
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

/* ============================================================
   بخش ۲ — برچسب تفصیلی
   ============================================================ */
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

/* ============================================================
   بخش ۳ — جستجوی بانک و حساب‌های برگ
   ============================================================ */
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

/* ============================================================
   بخش ۴ — پر کردن select با آیتم‌ها
   ============================================================ */
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
   بخش ۵ — چاپ حرفه‌ای (استفاده از موتور چاپ مرورگر برای کیفیت عالی)
   ============================================================ */
async function printHtmlReport(selector, title) {
    var el = document.querySelector(selector);
    if (!el) {
        alert('ابتدا گزارش را اجرا کنید.');
        return;
    }

    showToast('⏳ در حال آماده‌سازی پیش‌نمایش چاپ...');

    // ۱. استخراج داده‌های جدول
    var tablesHtml = '';
    
    if (selector === '#cfd-result') {
        var mainTable = el.querySelector('#cfd-table');
        if (mainTable) tablesHtml += mainTable.outerHTML;

        el.querySelectorAll('.cfd-group').forEach(function(g) {
            var titleEl = g.querySelector('.cfd-title');
            var titleText = titleEl ? titleEl.textContent.trim() : '';
            var tbl = g.querySelector('table');
            if (tbl) {
                tablesHtml += '<div style="margin-top:20px; margin-bottom:10px; font-weight:bold; font-size:14px; color:#1e40af; border-right:3px solid #1e40af; padding-right:8px;">' + esc(titleText) + '</div>';
                tablesHtml += tbl.outerHTML;
            }
        });
    } else if (selector === '#ra-result') {
        var raTable = el.querySelector('#ra-acc-table');
        if (raTable) tablesHtml = raTable.outerHTML;
    } else {
        var tbls = el.querySelectorAll('table');
        tbls.forEach(function(t) { tablesHtml += t.outerHTML; });
    }

    // ۲. استخراج بازه تاریخی
    var dateRange = '';
    var activePage = document.querySelector('.page.active');
    if (activePage) {
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

    // ۳. ایجاد یک محیط مخفی تمیز برای سنجش ابعاد
    var tempWrapper = document.createElement('div');
    tempWrapper.style.position = 'absolute';
    tempWrapper.style.left = '-9999px';
    tempWrapper.style.top = '0';
    tempWrapper.innerHTML = `
        <div id="pdf-export-root" style="width: 750px; direction: rtl; font-family: Tahoma, sans-serif;">
            ${tablesHtml}
        </div>
        <style>
            #pdf-export-root table { width: 100%; border-collapse: collapse; table-layout: auto; }
            #pdf-export-root th, #pdf-export-root td { border: 1px solid #64748b; padding: 6px; white-space: nowrap; }
        </style>
    `;
    document.body.appendChild(tempWrapper);

    // سنجش عرض واقعی جدول برای تشخیص افقی یا عمودی بودن
    var actualTableWidth = 0;
    var testTables = tempWrapper.querySelectorAll('table');
    testTables.forEach(function(t) {
        if (t.scrollWidth > actualTableWidth) actualTableWidth = t.scrollWidth;
    });
    
    // اگر عرض جدول بیشتر از 800 پیکسل بود، باید افقی چاپ شود
    var isLandscape = actualTableWidth > 800;
    document.body.removeChild(tempWrapper);

    // ۴. ساخت قالب HTML نهایی و بسیار تمیز برای موتور چاپ مرورگر
    var htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="fa">
        <head>
            <meta charset="UTF-8">
            <title>${esc(title)}</title>
            <style>
                /* تنظیم خودکار جهت کاغذ A4 */
                @page { size: ${isLandscape ? 'A4 landscape' : 'A4 portrait'}; margin: 10mm; }
                
                body { 
                    font-family: 'B Nazanin', Tahoma, sans-serif; 
                    direction: rtl; 
                    background: #fff; 
                    color: #000; 
                    margin: 0; 
                    padding: 0; 
                }
                .header {
                    text-align: center; 
                    margin-bottom: 20px; 
                    border-bottom: 2px solid #1e40af; 
                    padding-bottom: 10px;
                }
                h1 { 
                    font-family: 'B Titr', Tahoma, sans-serif; 
                    font-size: 16pt; 
                    margin: 0 0 5px 0; 
                    color: #1e40af; 
                }
                .date-range { 
                    font-size: 11pt; 
                    color: #333; 
                    font-weight: bold; 
                }
                
                /* استایل عالی برای جداول */
                table { 
                    width: 100% !important; 
                    border-collapse: collapse !important; 
                    margin-bottom: 15px !important; 
                    font-size: 10pt !important; 
                }
                th, td { 
                    border: 1px solid #64748b !important; 
                    padding: 8px 6px !important; 
                    text-align: center !important; 
                    vertical-align: middle !important;
                }
                th { 
                    background-color: #f1f5f9 !important; 
                    font-weight: bold !important; 
                }
                /* ستون اول (شرح) راست‌چین */
                td:first-child { 
                    text-align: right !important; 
                    font-weight: bold !important;
                }
                
                /* اعداد انگلیسی و چپ‌چین در سلول‌ها */
                .num, .ltr { 
                    direction: ltr !important; 
                    font-family: Arial, Tahoma, sans-serif !important; 
                    white-space: nowrap !important; 
                }
                
                /* رنگ‌بندی */
                .dr, .neg-money, td[style*="color:#c0392b"] { color: #dc2626 !important; font-weight: bold !important; }
                .cr, td[style*="color:#1e9e6a"] { color: #059669 !important; font-weight: bold !important; }
                
                /* جلوگیری از نصفه شدن ردیف‌ها */
                tr { page-break-inside: avoid !important; }
                .empty-row, .ar-empty { display: none !important; }
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

    // ۵. ارسال به iFrame برای باز کردن پنجره چاپ
    var iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    var doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    // صبر کوتاه برای لود فونت‌ها و سپس باز کردن پنجره چاپ
    setTimeout(function() {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        // پاکسازی
        setTimeout(function() { document.body.removeChild(iframe); }, 1000);
        showToast('🖨️ پنجره چاپ باز شد. لطفاً "Save as PDF" را انتخاب کنید.');
    }, 500);
}

/* ============================================================
   بخش ۶ — CSV Export
   ============================================================ */
function exportToCsv(key, filename) {
    var data = DB.load(key, []);
    if (!Array.isArray(data)) data = [];
    if (data.length === 0) {
        alert('داده‌ای نیست.');
        return;
    }
    var keys = [];
    data.forEach(function (row) {
        Object.keys(row).forEach(function (k) {
            if (keys.indexOf(k) === -1) keys.push(k);
        });
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
    var el = document.querySelector(selector);
    if (!el) {
        alert('ابتدا گزارش را اجرا کن.');
        return;
    }
    var table = el.querySelector('table');
    var detailList = el.querySelector('.rff-detail-list');
    var rows = [];

    if (detailList) {
        rows.push(['گزارش جامع تسهیلات — جزئیات']);
        rows.push([]);
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
    } else {
        alert('ابتدا گزارش را اجرا کن.');
        return;
    }

    if (rows.length === 0) {
        alert('داده‌ای برای خروجی نیست.');
        return;
    }

    var lines = [];
    for (var r = 0; r < rows.length; r++) {
        lines.push(rows[r].map(function (c) {
            return '"' + String(c).replace(/"/g, '""') + '"';
        }).join(','));
    }

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

/* ============================================================
   صادرسازی
   ============================================================ */
window.getAccountLabel              = getAccountLabel;
window.getAccountSearchText         = getAccountSearchText;
window.getDetailLabel               = getDetailLabel;
window.getLinkedItems               = getLinkedItems;
window.getLinkedItemLabel           = getLinkedItemLabel;
window.getBankMoeinId               = getBankMoeinId;
window.getLeafAccounts              = getLeafAccounts;
window.sortAccountsByCode           = sortAccountsByCode;
window.getLeafAccountsSortedByCode  = getLeafAccountsSortedByCode;
window.buildOptionsInto             = buildOptionsInto;
window.printHtmlReport              = printHtmlReport;
window.exportToCsv                  = exportToCsv;
window.exportReportTable            = exportReportTable;

console.log('✅ [core/lookups.js] loaded — Native Print Engine');
