/* ============================================================
   پارسیس — جستجوی حساب‌ها، چاپ، اکسل
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
   Helper: تبدیل ارقام فارسی → لاتین
   ============================================================ */
function _faDigitsToLatin(s) {
    if (s === undefined || s === null) return '';
    var t = String(s);
    t = t.replace(/[\u06F0-\u06F9]/g, function (d) {
        return String(d.charCodeAt(0) - 0x06F0);
    });
    t = t.replace(/[\u0660-\u0669]/g, function (d) {
        return String(d.charCodeAt(0) - 0x0660);
    });
    return t;
}

function tryParseNumericCell(text) {
    if (text === null || text === undefined) return null;
    var s = String(text).trim();
    if (!s) return null;

    var isNeg = false;
    if (/^\(.+\)$/.test(s)) {
        isNeg = true;
        s = s.slice(1, -1).trim();
    }

    s = _faDigitsToLatin(s);
    s = s.replace(/[,٬\s]/g, '');

    if (!/^-?\d+(\.\d+)?$/.test(s)) return null;

    var v = parseFloat(s);
    if (isNaN(v) || !isFinite(v)) return null;
    return isNeg ? -v : v;
}

/* ============================================================
   تابع چاپ — حذف سایدبار + انتقال جمع به صفحه آخر + flatten جزئیات تسهیلات
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
    } else if (selector === '#rc-result') {
        fromVal = (document.getElementById('rc-from1') || {}).value || '';
        toVal = (document.getElementById('rc-to2') || {}).value || '';
    } else if (selector === '#rff-result') {
        fromVal = (document.getElementById('rff-from') || {}).value || '';
        toVal = (document.getElementById('rff-to') || {}).value || '';
    }

    if (fromVal || toVal) {
        dateRange = 'از تاریخ: ' + toFa(fromVal) + (toVal ? ' | تا تاریخ: ' + toFa(toVal) : '');
    }

    var clone = targetEl.cloneNode(true);

    /* ✅ اگر حالت جزئیات گزارش جامع تسهیلات است، کارت‌ها را به جدول یکپارچه تبدیل کن */
    var detailList = clone.querySelector('.rff-detail-list');
    if (detailList && typeof window._flattenRffDetailToTableHtml === 'function') {
        var flatHtml = window._flattenRffDetailToTableHtml(detailList);
        var wrapper = document.createElement('div');
        wrapper.innerHTML = flatHtml;
        detailList.parentNode.replaceChild(wrapper, detailList);
    }

    var toRemove = clone.querySelectorAll('img, .ar-side, .share-btn, .col-filter-btn, .col-resizer, .row-actions, button, .no-print, .eye-toggle-btn, .col-toggle-btn, .col-reset-btn, .col-filter-popover, .col-menu, .ar-turnover-btn, .ar-col-toggle, .cfd-multi-wrap, .cfd-multi-btn, .cfd-multi-dropdown, .cf-filter-card, .cf-filter-body, .cf-filter-toggle, .list-header, .tabs, .rff-fac-head, .rff-fac-stats, .rff-fac-meta');
    for (var r = 0; r < toRemove.length; r++) toRemove[r].remove();

    clone.querySelectorAll('.cfd-details').forEach(function(el) {
        el.classList.add('show');
        el.style.display = 'block';
    });

    clone.querySelectorAll('table').forEach(function (table) {
        var thead = table.querySelector('thead');
        var tfoot = table.querySelector('tfoot');
        var tbody = table.querySelector('tbody');
        
        var footRow = null;
        if (tfoot && tbody) {
            footRow = tfoot.querySelector('tr');
            if (footRow) {
                footRow.style.backgroundColor = '#f1f5f9';
                footRow.style.color = '#0f172a';
                footRow.style.fontWeight = 'bold';
                footRow.style.fontSize = '11pt';
                footRow.style.pageBreakInside = 'avoid';
                var tds = footRow.querySelectorAll('td');
                for (var i=0; i<tds.length; i++) {
                    tds[i].style.borderTop = '2px solid #1e40af';
                    tds[i].style.borderBottom = '2px solid #1e40af';
                    tds[i].style.padding = '10px 5px';
                }
                tbody.appendChild(footRow);
            }
            tfoot.remove();
        }

        if (!tbody || !footRow) return;

        var headerTexts = [];
        if (thead) {
            var headerRow = thead.querySelector('tr');
            if (headerRow) {
                Array.from(headerRow.children).forEach(function (th) {
                    var cs = parseInt(th.getAttribute('colspan') || '1', 10);
                    var txt = th.textContent.trim();
                    for (var k = 0; k < cs; k++) headerTexts.push(txt);
                });
            }
        }

        var bodyRows = Array.from(tbody.querySelectorAll('tr')).filter(function (tr) {
            return tr !== footRow && tr.style.display !== 'none' && !tr.classList.contains('empty-row');
        });
        if (bodyRows.length === 0) return;

        var logicalCol = 0;
        var footCells = Array.from(footRow.children);

        footCells.forEach(function (cell) {
            var cs = parseInt(cell.getAttribute('colspan') || '1', 10);

            if (cs === 1) {
                var colIdx = logicalCol;
                var header = (headerTexts[colIdx] || '');
                var isBalanceCol = /مانده/.test(header);

                if (!isBalanceCol) {
                    var cellCleanTxt = _faDigitsToLatin(cell.textContent)
                        .replace(/,/g, '')
                        .replace(/[()]/g, '')
                        .trim();

                    if (/^-?\d+(\.\d+)?$/.test(cellCleanTxt)) {
                        var sum = 0;
                        var hasNumbers = false;

                        bodyRows.forEach(function (tr) {
                            var td = tr.children[colIdx];
                            if (!td) return;
                            var val = tryParseNumericCell(td.textContent);
                            if (val !== null) {
                                sum += val;
                                hasNumbers = true;
                            }
                        });

                        if (hasNumbers) {
                            var isNegSum = sum < 0;
                            var absSum = Math.abs(sum);
                            var formatted = absSum.toLocaleString('fa-IR');
                            cell.textContent = isNegSum ? '(' + formatted + ')' : formatted;
                            cell.style.color = isNegSum ? '#dc2626' : '#1e40af';
                        }
                    }
                }
            }

            logicalCol += cs;
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
                    margin: 15mm 12mm 18mm 12mm;
                    @bottom-center {
                        content: "صفحه " counter(page) " از " counter(pages);
                        font-family: Tahoma, sans-serif;
                        font-size: 10pt;
                        color: #475569;
                        font-weight: bold;
                    }
                    @top-center {
                        content: "${esc(title)}";
                        font-family: Tahoma, sans-serif;
                        font-size: 9pt;
                        color: #94a3b8;
                    }
                }
                body {
                    font-family: Tahoma, Arial, sans-serif;
                    direction: rtl;
                    color: #000;
                    margin: 0;
                    padding: 0;
                    font-size: 10.5pt;
                }
                .header {
                    text-align: center;
                    margin-bottom: 18px;
                    padding-bottom: 12px;
                    border-bottom: 2.5px solid #1e40af;
                }
                .header h1 {
                    font-size: 17pt;
                    margin: 0 0 8px 0;
                    color: #1e40af;
                    font-weight: 900;
                    letter-spacing: -0.3px;
                }
                .header .date-range {
                    font-size: 11pt;
                    color: #475569;
                    font-weight: bold;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 15px;
                }
                tr { page-break-inside: avoid !important; }
                thead { display: table-header-group; }
                th, td {
                    border: 1px solid #64748b;
                    padding: 5px 8px;
                    text-align: center;
                    vertical-align: middle;
                    font-size: 9.5pt;
                }
                th {
                    background-color: #e2e8f0 !important;
                    font-weight: bold !important;
                    color: #1e40af;
                }
                .num {
                    direction: ltr;
                    font-family: Arial, Tahoma, sans-serif;
                    font-variant-numeric: tabular-nums;
                }
                .dr { color: #dc2626 !important; font-weight: bold; }
                .cr { color: #059669 !important; font-weight: bold; }
                .cfd-section-title {
                    font-size: 14pt;
                    font-weight: bold;
                    text-align: center;
                    margin: 15px 0 10px;
                    color: #1e40af;
                }
                .cfd-head {
                    background-color: #e2e8f0 !important;
                    padding: 8px;
                    font-weight: bold;
                    border: 1px solid #64748b;
                }
                .cfd-details {
                    display: block !important;
                }
                .ar-main { display: block !important; }
                .ar-body { width: 100% !important; }
                .ar-tb { margin-bottom: 15px !important; background: transparent !important; border: none !important; padding: 0 !important; }
                .ar-tb-bc { font-size: 12pt !important; font-weight: bold !important; color: #1e40af !important; }
                .ar-tb-bc a { text-decoration: none !important; border-bottom: none !important; color: #1e40af !important; }
                .ar-tbl { table-layout: auto !important; width: 100% !important; }
                .ar-tbl thead th { background-color: #e2e8f0 !important; color: #1e40af !important; border: 1px solid #64748b !important; }
                .ar-tbl tbody td { border: 1px solid #64748b !important; }
                .ar-tbl tfoot td { background-color: #e2e8f0 !important; color: #1e40af !important; border: 1px solid #64748b !important; }
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

    if (typeof showToast === 'function') {
        showToast('🖨️ در پنجره باز شده، گزینه Save as PDF را انتخاب کنید.');
    }

    setTimeout(function () {
        printWindow.focus();
        printWindow.print();
        printWindow.onafterprint = function () { printWindow.close(); };
    }, 500);
}

/* ============================================================
   ابزار کمکی: ساخت HTML XLS از جدول سلولی
   ============================================================ */
function _buildExcelCell(txt, isHeader, colspan, rowspan) {
    var attrs = '';
    if (colspan && parseInt(colspan, 10) > 1) attrs += ' colspan="' + colspan + '"';
    if (rowspan && parseInt(rowspan, 10) > 1) attrs += ' rowspan="' + rowspan + '"';

    var baseStyle = 'border:1px solid #64748b;padding:5px 8px;text-align:center;vertical-align:middle;font-family:Tahoma;font-size:10pt;';

    if (isHeader) {
        return '<td' + attrs + ' style="' + baseStyle + 'background:#e2e8f0;font-weight:bold;color:#1e40af;mso-number-format:\'\\@\'">' + esc(txt) + '</td>';
    }

    var trimmed = String(txt).trim();
    if (trimmed === '' || trimmed === '—' || trimmed === '-') {
        return '<td' + attrs + ' style="' + baseStyle + 'mso-number-format:\'\\@\'">' + esc(trimmed) + '</td>';
    }

    var num = tryParseNumericCell(trimmed);
    if (num !== null) {
        return '<td' + attrs + ' style="' + baseStyle + 'mso-number-format:\'#,##0\';direction:ltr">' + num + '</td>';
    }

    return '<td' + attrs + ' style="' + baseStyle + 'mso-number-format:\'\\@\'">' + esc(trimmed) + '</td>';
}

function _wrapExcelHtml(tableRowsHtml, sheetName) {
    var safeName = String(sheetName || 'Report').replace(/[\\\/\?\*\[\]:]/g, '_').substring(0, 30);
    return '<html xmlns:o="urn:schemas-microsoft-com:office:office" '
         + 'xmlns:x="urn:schemas-microsoft-com:office:excel" '
         + 'xmlns="http://www.w3.org/TR/REC-html40">'
         + '<head>'
         +   '<meta charset="UTF-8">'
         +   '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">'
         +   '<!--[if gte mso 9]><xml>'
         +   '<x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>'
         +   '<x:Name>' + esc(safeName) + '</x:Name>'
         +   '<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>'
         +   '</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook>'
         +   '</xml><![endif]-->'
         +   '<style>'
         +     'table { border-collapse: collapse; }'
         +     'td { mso-number-format:\\@; }'
         +   '</style>'
         + '</head>'
         + '<body dir="rtl">'
         +   '<table dir="rtl" border="1" style="border-collapse:collapse">'
         +     tableRowsHtml
         +   '</table>'
         + '</body>'
         + '</html>';
}

function _triggerXlsDownload(htmlString, filename) {
    var blob = new Blob(['\uFEFF' + htmlString], { type: 'application/vnd.ms-excel;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var now = new Date();
    var dateStr = todayJalaliStr().replace(/\//g, '-');
    var timeStr = pad2(now.getHours()) + '-' + pad2(now.getMinutes());
    var a = document.createElement('a');
    a.href = url;
    a.download = filename + '-' + dateStr + '_' + timeStr + '.xls';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
}

/* ============================================================
   ✅ Helper: یک سلول را به HTML اکسل تبدیل می‌کند (باهوش)
   ============================================================ */
function _excelCellFromRaw(val) {
    if (val === null || val === undefined) {
        return '<td style="border:1px solid #64748b;padding:5px 8px;text-align:center;mso-number-format:\'\\@\'"></td>';
    }
    var num = null;
    if (typeof val === 'number') num = val;
    else num = tryParseNumericCell(val);
    if (num !== null && isFinite(num)) {
        return '<td style="border:1px solid #64748b;padding:5px 8px;text-align:center;mso-number-format:\'#,##0\';direction:ltr">' + num + '</td>';
    }
    return '<td style="border:1px solid #64748b;padding:5px 8px;text-align:center;mso-number-format:\'\\@\'">' + esc(String(val)) + '</td>';
}

/* ============================================================
   ✅ خروجی اکسل از یک آرایه دو بعدی (استاندارد)
   headers: ['ستون ۱', 'ستون ۲', ...]
   rows: [['مقدار', 123, ...], [...]]
   ============================================================ */
function exportDataToExcel(headers, rows, title, filename, sheetName) {
    var trs = [];

    if (title) {
        trs.push('<tr><td colspan="' + (headers ? headers.length : 1) + '" style="font-weight:bold;font-size:14pt;text-align:center;background:#e2e8f0;color:#1e40af;padding:10px;border:1px solid #64748b">' + esc(title) + '</td></tr>');
    }

    if (headers && headers.length > 0) {
        trs.push('<tr>');
        headers.forEach(function (h) {
            trs.push('<th style="border:1px solid #64748b;padding:8px;background:#e2e8f0;color:#1e40af;font-weight:bold;text-align:center;mso-number-format:\'\\@\'">' + esc(h) + '</th>');
        });
        trs.push('</tr>');
    }

    (rows || []).forEach(function (row) {
        trs.push('<tr>');
        (row || []).forEach(function (cell) {
            trs.push(_excelCellFromRaw(cell));
        });
        trs.push('</tr>');
    });

    var html = _wrapExcelHtml(trs.join(''), sheetName || filename || 'report');
    _triggerXlsDownload(html, filename || 'report');

    if (typeof showToast === 'function') showToast('✅ فایل اکسل آماده شد.');
}

/* ============================================================
   خروجی XLS ساختاری (برای list pages)
   ============================================================ */
function exportToCsv(key, filename) {
    var data = DB.load(key, []);
    if (!Array.isArray(data)) data = [];
    if (data.length === 0) { alert('داده‌ای نیست.'); return; }

    var keys = [];
    data.forEach(function (row) {
        Object.keys(row).forEach(function (k) { if (keys.indexOf(k) === -1) keys.push(k); });
    });

    var trs = [];

    var headerRow = '<tr>';
    keys.forEach(function (k) {
        headerRow += _buildExcelCell(k, true, 0, 0);
    });
    headerRow += '</tr>';
    trs.push(headerRow);

    data.forEach(function (row) {
        var tr = '<tr>';
        keys.forEach(function (k) {
            var v = row[k];
            if (v === null || v === undefined) v = '';
            if (typeof v === 'object') v = JSON.stringify(v);
            tr += _buildExcelCell(v, false, 0, 0);
        });
        tr += '</tr>';
        trs.push(tr);
    });

    var html = _wrapExcelHtml(trs.join(''), filename || 'data');
    _triggerXlsDownload(html, filename || 'data');

    if (typeof showToast === 'function') showToast('✅ فایل اکسل آماده شد.');
}

/* ============================================================
   خروجی XLS ساختاری از یک جدول HTML (با پشتیبانی از detail list)
   ============================================================ */
function exportReportTable(selector, filename) {
    var activePage = document.querySelector('.page.active');
    var el = activePage ? activePage.querySelector(selector) : null;
    if (!el) el = document.querySelector(selector);

    if (!el) { alert('ابتدا گزارش را اجرا کن.'); return; }

    /* ✅ تشخیص حالت جزئیات گزارش جامع تسهیلات */
    var detailList = el.querySelector('.rff-detail-list');
    if (detailList && typeof window._flattenRffDetailToTableData === 'function') {
        var flat = window._flattenRffDetailToTableData(detailList);
        var trs = [];
        trs.push('<tr>');
        flat.headers.forEach(function (h) {
            trs.push('<th style="border:1px solid #64748b;padding:8px;background:#e2e8f0;color:#1e40af;font-weight:bold;text-align:center;mso-number-format:\'\\@\'">' + esc(h) + '</th>');
        });
        trs.push('</tr>');
        flat.rows.forEach(function (row) {
            trs.push('<tr>');
            row.forEach(function (cell) { trs.push(_excelCellFromRaw(cell)); });
            trs.push('</tr>');
        });
        var htmlFlat = _wrapExcelHtml(trs.join(''), filename || 'report');
        _triggerXlsDownload(htmlFlat, filename || 'report');
        if (typeof showToast === 'function') showToast('✅ فایل اکسل آماده شد.');
        return;
    }

    var table = el.querySelector('table');
    if (!table) { alert('جدولی برای خروجی نیست.'); return; }

    var clone = table.cloneNode(true);
    clone.querySelectorAll('.row-actions, .col-filter-btn, .col-resizer, button, .no-print, .ar-turnover-btn, .ar-col-toggle, .share-btn, .eye-toggle-btn, .col-toggle-btn, .col-reset-btn').forEach(function (n) {
        n.remove();
    });

    clone.querySelectorAll('tr').forEach(function (tr) {
        Array.from(tr.children).forEach(function (cell) {
            if (cell.style.display === 'none') cell.remove();
        });
    });

    var trs2 = [];
    var allTrs = clone.querySelectorAll('tr');
    for (var i = 0; i < allTrs.length; i++) {
        var tr = allTrs[i];
        var cells = Array.from(tr.children);
        if (cells.length === 0) continue;

        var rowHtml = '<tr>';
        cells.forEach(function (cell) {
            var isHeader = (cell.tagName === 'TH');
            var txt = cell.textContent.trim();
            var cs = cell.getAttribute('colspan') || '1';
            var rs = cell.getAttribute('rowspan') || '1';
            rowHtml += _buildExcelCell(txt, isHeader, cs, rs);
        });
        rowHtml += '</tr>';
        trs2.push(rowHtml);
    }

    if (trs2.length === 0) { alert('داده‌ای برای خروجی نیست.'); return; }

    var html = _wrapExcelHtml(trs2.join(''), filename || 'report');
    _triggerXlsDownload(html, filename || 'report');

    if (typeof showToast === 'function') showToast('✅ فایل اکسل آماده شد (ستون‌ها تفکیک‌شده، اعداد قابل جمع).');
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
window.exportDataToExcel = exportDataToExcel;
window.tryParseNumericCell = tryParseNumericCell;

console.log('✅ [core/lookups.js] loaded — flatten + standard export');
