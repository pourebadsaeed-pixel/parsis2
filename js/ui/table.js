/* ============================================================
   پارسیس — جدول‌ها: عرض، ترتیب، مخفی‌سازی ستون، مرتب‌سازی، فیلتر
   مسیر: js/ui/table.js
   وابستگی: core/*
   ============================================================ */
'use strict';

/* ============================================================
   بخش ۱ — تغییر عرض ستون‌ها (drag resize)
   ============================================================ */

var colWidths = DB.load(LS_KEYS.COL_WIDTHS, {});

function saveColWidths() {
    DB.save(LS_KEYS.COL_WIDTHS, colWidths);
}

function applyColWidths(tableId) {
    var table = document.getElementById(tableId);
    if (!table) return;
    var widths = colWidths[tableId] || [];
    var ths = table.querySelectorAll('thead th');
    for (var i = 0; i < ths.length; i++) {
        if (widths[i]) ths[i].style.width = widths[i] + 'px';
        else ths[i].style.width = '';
        ths[i].style.minWidth = '';
        ths[i].style.maxWidth = '';
    }
    table.style.minWidth = '';
}

function updateTableMinWidth(table) {
    if (table) table.style.minWidth = '';
}

function makeTableResizable(table) {
    if (!table || table.dataset.resizable === '1') return;
    table.dataset.resizable = '1';
    var tableId = table.id;
    if (!tableId) return;
    table.setAttribute('data-table-id', tableId);

    var MIN_W = 50, MAX_W = 600;
    var ths = table.querySelectorAll('thead th');

    for (var i = 0; i < ths.length; i++) {
        (function (th, idx) {
            if (th.querySelector('.col-resizer')) return;

            var res = document.createElement('div');
            res.className = 'col-resizer';
            res.title = 'بکش تا عرض تغییر کند • دابل‌کلیک: بازنشانی';
            th.appendChild(res);

            var startX = 0, startW = 0, isDragging = false;

            function start(x) {
                isDragging = true;
                startX = x;
                startW = th.offsetWidth;
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
                document.body.classList.add('resizing-cols');
            }

            function move(x) {
                if (!isDragging) return;
                var diff = startX - x;
                var w = Math.max(MIN_W, Math.min(MAX_W, startW + diff));
                th.style.width = w + 'px';
                th.style.minWidth = '';
                th.style.maxWidth = '';
            }

            function end() {
                if (!isDragging) return;
                isDragging = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                document.body.classList.remove('resizing-cols');
                if (!colWidths[tableId]) colWidths[tableId] = [];
                colWidths[tableId][idx] = th.offsetWidth;
                saveColWidths();
            }

            res.addEventListener('dblclick', function (e) {
                e.preventDefault();
                e.stopPropagation();
                th.style.width = '';
                th.style.minWidth = '';
                th.style.maxWidth = '';
                if (colWidths[tableId]) {
                    delete colWidths[tableId][idx];
                    saveColWidths();
                }
                showToast('↔ عرض ستون بازنشانی شد.');
            });

            res.addEventListener('click', function (e) {
                e.stopPropagation();
            });

            res.addEventListener('mousedown', function (e) {
                e.preventDefault();
                e.stopPropagation();
                start(e.pageX);
            });

            res.addEventListener('touchstart', function (e) {
                e.preventDefault();
                e.stopPropagation();
                start(e.touches[0].pageX);
            }, { passive: false });

            document.addEventListener('mousemove', function (e) {
                if (isDragging) move(e.pageX);
            });
            document.addEventListener('mouseup', end);
            document.addEventListener('touchmove', function (e) {
                if (isDragging) {
                    move(e.touches[0].pageX);
                    e.preventDefault();
                }
            }, { passive: false });
            document.addEventListener('touchend', end);
        })(ths[i], i);
    }
    applyColWidths(tableId);
}

function resetColumnWidths(tableId) {
    if (!tableId) return;
    delete colWidths[tableId];
    saveColWidths();
    var table = document.getElementById(tableId);
    if (!table) return;
    var ths = table.querySelectorAll('thead th');
    for (var i = 0; i < ths.length; i++) {
        ths[i].style.width = '';
        ths[i].style.minWidth = '';
        ths[i].style.maxWidth = '';
    }
    table.style.minWidth = '';
    table.style.width = '';
    showToast('↔ عرض ستون‌ها فیت شد.');
}

/* ============================================================
   بخش ۲ — لیسْت جدول‌های تحت مدیریت
   ============================================================ */
var MANAGED_TABLE_IDS = [
    'fiscal-table',
    'persons-table',
    'comp-table',
    'ba-table',
    'cb-table',
    'proj-table',
    'voucher-table-list',
    'rt-table',
    'ri-table',
    'rf-table',
    'rff-table',
    'cfs-table',
    'rr-table',
    'cf-table',
    'cfd-table',
    'dc-table',
    'rc-table',
    'ra-acc-table'
];

function makeAllTablesResizable() {
    for (var i = 0; i < MANAGED_TABLE_IDS.length; i++) {
        var t = document.getElementById(MANAGED_TABLE_IDS[i]);
        if (t) makeTableResizable(t);
    }
}

/* صادرسازی موقت */
window.colWidths            = colWidths;
window.saveColWidths        = saveColWidths;
window.applyColWidths       = applyColWidths;
window.updateTableMinWidth  = updateTableMinWidth;
window.makeTableResizable   = makeTableResizable;
window.resetColumnWidths    = resetColumnWidths;
window.makeAllTablesResizable = makeAllTablesResizable;
window.MANAGED_TABLE_IDS    = MANAGED_TABLE_IDS;
