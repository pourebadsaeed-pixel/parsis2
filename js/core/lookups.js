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
   بخش ۵ — چاپ حرفه‌ای (PDF دانلود مستقیم، اصلاح بریدگی و فشردگی)
   ============================================================ */
async function printHtmlReport(selector, title) {
    var el = document.querySelector(selector);
    if (!el) {
        alert('ابتدا گزارش را اجرا کنید.');
        return;
    }

    showToast('⏳ در حال آماده‌سازی فایل PDF...');

    // ۱. کپی کردن محتوای گزارش
    var clone = el.cloneNode(true);

    // ۲. حذف فیلترها، جستجوها و دکمه‌های اضافی
    var removeSelectors = [
        '.list-header', '.column-filter-row', '.ar-filter-row', '.cfd-filter-row',
        '.row-actions', '.share-btn', '.widget-share-btn', '.cfd-multi-wrap',
        '.filters-toggle-btn', '.col-resizer', '.eye-toggle-btn',
        '.col-toggle-btn', '.export-btn', '.card-collapse-btn', '.ar-turnover-btn',
        '.ar-filter-badge', '.ar-side', '.ar-tb'
    ];
    removeSelectors.forEach(function(sel) {
        clone.querySelectorAll(sel).forEach(function(n) { n.remove(); });
    });

    // در گزارش مرور حساب‌ها، فقط خود جدول را می‌خواهیم
    if (selector === '#ra-result') {
        var arBody = clone.querySelector('.ar-body');
        if (arBody) clone.innerHTML = arBody.innerHTML;
    }

    // ۳. تشخیص خودکار حالت افقی (Landscape) بر اساس تعداد ستون‌ها
    var maxCols = 0;
    clone.querySelectorAll('table').forEach(function(t) {
        var cols = t.querySelectorAll('thead tr:first-child th').length;
        if (cols > maxCols) maxCols = cols;
    });
    var isLandscape = maxCols > 6;

    // ۴. استخراج بازه تاریخی از فیلترها
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

    // تعیین عرض دقیق برای جلوگیری از فشردگی (A4)
    var targetWidth = isLandscape ? '270mm' : '185mm';

    // ۵. قالب‌بندی HTML با فونت و استایل زیبا
    var htmlContent = `
        <div style="font-family: 'B Nazanin', Tahoma, sans-serif; direction: rtl; padding: 0; margin: 0 auto; color: #000; background: #fff; width: ${targetWidth}; box-sizing: border-box;">
            <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #4a90e2; padding-bottom: 10px;">
                <h1 style="font-family: 'B Titr', Tahoma, sans-serif; font-size: 12pt; margin: 0 0 5px 0; color: #1e40af;">${esc(title)}</h1>
                ${dateRange ? `<div style="font-size: 11pt; color: #333; font-weight: bold;">${esc(dateRange)}</div>` : ''}
            </div>
            <div style="font-size: 11pt; width: 100%;">
                ${clone.innerHTML}
            </div>
        </div>
        <style>
            /* استایل‌های حیاتی برای جلوگیری از پرش و فشردگی */
            tr { page-break-inside: avoid !important; page-break-after: auto !important; }
            table { width: 100% !important; border-collapse: collapse !important; margin-bottom: 15px; font-size: 9pt; table-layout: auto !important; }
            th, td { border: 1px solid #94a3b8 !important; padding: 6px 8px !important; text-align: right; word-break: break-word !important; white-space: normal !important; }
            th { background-color: #f1f5f9 !important; font-weight: bold; color: #1e40af; }
            tr:nth-child(even) { background-color: #f8fafc !important; }
            
            /* استایل اعداد */
            .num { text-align: center !important; direction: ltr !important; white-space: nowrap !important; }
            .dr { color: #dc2626 !important; font-weight: bold; }
            .cr { color: #059669 !important; font-weight: bold; }
            .neg-money { color: #dc2626 !important; font-weight: bold; direction: ltr !important; display: inline-block; }
            
            /* خنثی کردن استایل‌های کارت و اسکرول که باعث مشکل در چاپ می‌شوند */
            .card { border: none !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important; background: transparent !important; }
            .table-wrap { overflow: visible !important; border: none !important; max-width: none !important; }
            .cfd-hscroll { overflow: visible !important; border: none !important; }
            .ar-wrap { border: none !important; }
            .ar-tbl, .report-table, .data-table, .cfd-table { border: 1px solid #94a3b8 !important; table-layout: auto !important; }
            
            /* مخفی کردن منوهای جمع‌شونده و بخش‌های اضافی گزارش جزئیات */
            .cfd-details { display: block !important; }
            .cfd-group { page-break-inside: avoid !important; margin-bottom: 20px !important; }
        </style>
    `;

    // ۶. تولید و دانلود فایل PDF
    try {
        if (!window.html2pdf) {
            await new Promise(function(resolve, reject) {
                var s = document.createElement('script');
                s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                s.onload = resolve;
                s.onerror = reject;
                document.head.appendChild(s);
            });
        }
        
        var opt = {
            margin: [10, 10, 10, 10], // حاشیه بالا، راست، پایین، چپ
            filename: (title || 'گزارش').replace(/\s+/g, '-') + '.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2, 
                useCORS: true, 
                letterRendering: true,
                scrollY: 0,
                scrollX: 0,
                windowWidth: isLandscape ? 1200 : 800 // فیکس کردن پنجره برای رندر بهتر
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: isLandscape ? 'landscape' : 'portrait' },
            pagebreak: { mode: ['css', 'legacy'] } // استفاده از CSS برای شکستن صفحه
        };
        
        html2pdf().set(opt).from(htmlContent).save().then(function() {
            showToast('✅ فایل PDF دانلود شد.');
        });
    } catch (e) {
        console.error('PDF generation error:', e);
        alert('خطا در ایجاد فایل PDF.');
    }
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

console.log('✅ [core/lookups.js] loaded — Beautiful PDF Print Engine (Fixed Breaking & Squeezing)');
