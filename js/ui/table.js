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
/* ============================================================
   بخش ۳ — ترتیب ستون‌ها (جابجایی)
   ============================================================ */

var columnOrders = DB.load(LS_KEYS.COLUMN_ORDERS, {});

function saveColumnOrders() {
    DB.save(LS_KEYS.COLUMN_ORDERS, columnOrders);
}

/* گرفتن ترتیب فعلی ستون‌ها از DOM */
function getCurrentColumnOrder(tableId) {
    var table = document.getElementById(tableId);
    if (!table) return [];
    var headerRow = table.querySelector('thead tr:not(.column-filter-row)');
    if (!headerRow) return [];
    var ths = headerRow.querySelectorAll('th');
    var order = [];
    for (var i = 0; i < ths.length; i++) {
        var idx = ths[i].getAttribute('data-orig-index');
        if (idx === null) {
            idx = String(i);
            ths[i].setAttribute('data-orig-index', idx);
        }
        order.push(parseInt(idx, 10));
    }
    return order;
}

function findThByOrigIndex(headerRow, origIdx) {
    var ths = headerRow.querySelectorAll('th');
    for (var i = 0; i < ths.length; i++) {
        if (parseInt(ths[i].getAttribute('data-orig-index'), 10) === origIdx) return ths[i];
    }
    return null;
}

function syncBodyOrigIndices(table, headerRow) {
    var headerThs = headerRow.querySelectorAll('th');
    var allRows = table.querySelectorAll('tr');
    for (var r = 0; r < allRows.length; r++) {
        var row = allRows[r];
        if (row === headerRow) continue;
        var cells = row.children;
        if (cells.length <= 1) continue;
        for (var c = 0; c < cells.length; c++) {
            if (cells[c].getAttribute('data-orig-index') === null && headerThs[c]) {
                cells[c].setAttribute('data-orig-index', headerThs[c].getAttribute('data-orig-index'));
            }
        }
    }
}

function applyColumnOrder(tableId) {
    if (!tableId) return;
    var savedOrder = columnOrders[tableId];
    if (!savedOrder || !Array.isArray(savedOrder) || savedOrder.length === 0) return;

    var table = document.getElementById(tableId);
    if (!table) return;

    var headerRow = table.querySelector('thead tr:not(.column-filter-row)');
    if (!headerRow) return;
    var headerThs = headerRow.querySelectorAll('th');

    for (var i = 0; i < headerThs.length; i++) {
        if (headerThs[i].getAttribute('data-orig-index') === null) {
            headerThs[i].setAttribute('data-orig-index', String(i));
        }
    }

    syncBodyOrigIndices(table, headerRow);

    var allRows = table.querySelectorAll('tr');
    for (var r = 0; r < allRows.length; r++) {
        var row = allRows[r];
        var cells = Array.from(row.children);
        if (cells.length <= 1) continue;

        var map = {};
        var unindexed = [];
        for (var c = 0; c < cells.length; c++) {
            var oi = cells[c].getAttribute('data-orig-index');
            if (oi !== null) map[oi] = cells[c];
            else unindexed.push(cells[c]);
        }

        for (var s = 0; s < savedOrder.length; s++) {
            var cell = map[String(savedOrder[s])];
            if (cell) row.appendChild(cell);
        }
        for (var u = 0; u < unindexed.length; u++) {
            row.appendChild(unindexed[u]);
        }
    }
}

function captureColumnOrder(tableId) {
    var order = getCurrentColumnOrder(tableId);
    columnOrders[tableId] = order;
    saveColumnOrders();
}

function resetColumnOrder(tableId) {
    if (!tableId) return;
    delete columnOrders[tableId];
    saveColumnOrders();
    var table = document.getElementById(tableId);
    if (!table) return;
    var allRows = table.querySelectorAll('tr');
    for (var r = 0; r < allRows.length; r++) {
        var row = allRows[r];
        var cells = Array.from(row.children);
        if (cells.length <= 1) continue;
        var map = {};
        var unindexed = [];
        for (var c = 0; c < cells.length; c++) {
            var oi = cells[c].getAttribute('data-orig-index');
            if (oi !== null) map[oi] = cells[c];
            else unindexed.push(cells[c]);
        }
        var keys = Object.keys(map).map(Number).sort(function (a, b) { return a - b; });
        for (var k = 0; k < keys.length; k++) row.appendChild(map[keys[k]]);
        for (var u = 0; u < unindexed.length; u++) row.appendChild(unindexed[u]);
    }
    showToast('↺ ترتیب ستون‌ها به پیش‌فرض بازگشت.');
}

function moveColumnInTable(tableId, colIdx, direction) {
    var table = document.getElementById(tableId);
    if (!table) return;
    var headerRow = table.querySelector('thead tr:not(.column-filter-row)');
    if (!headerRow) return;
    var headerThs = headerRow.querySelectorAll('th');
    for (var i = 0; i < headerThs.length; i++) {
        if (headerThs[i].getAttribute('data-orig-index') === null) {
            headerThs[i].setAttribute('data-orig-index', String(i));
        }
    }
    var currentOrder = getCurrentColumnOrder(tableId);
    var pos = currentOrder.indexOf(colIdx);
    if (pos < 0) return;
    var newPos = pos + direction;
    if (newPos < 0 || newPos >= currentOrder.length) return;
    var tmp = currentOrder[pos];
    currentOrder[pos] = currentOrder[newPos];
    currentOrder[newPos] = tmp;
    columnOrders[tableId] = currentOrder;
    saveColumnOrders();
    applyColumnOrder(tableId);
    applyColVisibility(tableId);
}

/* ============================================================
   بخش ۴ — مخفی‌سازی ستون‌ها
   ============================================================ */

var colSettings = DB.load(LS_KEYS.COLUMN_SETTINGS, {});

function getHiddenCols(tableId) {
    return colSettings[tableId] || [];
}

function setHiddenCols(tableId, arr) {
    colSettings[tableId] = arr;
    DB.save(LS_KEYS.COLUMN_SETTINGS, colSettings);
}

function applyColVisibility(tableId) {
    var table = document.getElementById(tableId);
    if (!table) return;
    var hidden = getHiddenCols(tableId);
    var rows = table.querySelectorAll('tr');
    for (var r = 0; r < rows.length; r++) {
        var cells = rows[r].children;
        if (cells.length === 1 && cells[0].hasAttribute('colspan')) continue;
        for (var c = 0; c < cells.length; c++) {
            var origIdx = cells[c].getAttribute('data-orig-index');
            var idx = origIdx !== null ? parseInt(origIdx, 10) : c;
            cells[c].style.display = hidden.indexOf(idx) !== -1 ? 'none' : '';
        }
    }
    updateTableMinWidth(table);
}

function applyColVisibilityAll() {
    for (var i = 0; i < MANAGED_TABLE_IDS.length; i++) {
        applyColVisibility(MANAGED_TABLE_IDS[i]);
    }
}

/* ============================================================
   بخش ۵ — منوی ستون‌ها (⚙)
   ============================================================ */

function showColMenu(tableId, btn) {
    var menu = document.getElementById('col-menu');
    if (!menu) return;
    var table = document.getElementById(tableId);
    if (!table) return;
    var thead = table.querySelector('thead');
    if (!thead) return;
    var headerRow = thead.querySelector('tr:not(.column-filter-row)');
    if (!headerRow) return;
    var ths = headerRow.querySelectorAll('th');

    for (var ii = 0; ii < ths.length; ii++) {
        if (ths[ii].getAttribute('data-orig-index') === null) {
            ths[ii].setAttribute('data-orig-index', String(ii));
        }
    }

    var hidden = getHiddenCols(tableId);
    var currentOrder = getCurrentColumnOrder(tableId);

    var html = '<div class="col-menu-head">👁 نمایش و ترتیب ستون‌ها</div>';
    html += '<div class="col-menu-body">';

    for (var i = 0; i < currentOrder.length; i++) {
        var origIdx = currentOrder[i];
        var th = findThByOrigIndex(headerRow, origIdx);
        if (!th) continue;
        var label = String(th.textContent || '').replace(/[⇅▲▼]/g, '').trim() || ('ستون ' + (origIdx + 1));
        var checked = hidden.indexOf(origIdx) === -1 ? 'checked' : '';
        html += '<div class="col-menu-item" style="display:flex;gap:6px;align-items:center;padding:6px 10px">'
             +    '<input type="checkbox" data-table="' + tableId + '" data-col="' + origIdx + '" ' + checked + ' style="flex-shrink:0">'
             +    '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:0.82rem">' + esc(label) + '</span>'
             +    '<button type="button" class="col-move-btn" data-table="' + tableId + '" data-col="' + origIdx + '" data-dir="-1" '
             +       (i === 0 ? 'disabled ' : '')
             +       'style="width:26px;height:26px;border-radius:7px;border:1px solid var(--border);background:var(--card-solid);color:var(--primary-dark);font-weight:800;cursor:pointer;padding:0;flex-shrink:0' + (i === 0 ? ';opacity:0.35;cursor:not-allowed' : '') + '">↑</button>'
             +    '<button type="button" class="col-move-btn" data-table="' + tableId + '" data-col="' + origIdx + '" data-dir="1" '
             +       (i === currentOrder.length - 1 ? 'disabled ' : '')
             +       'style="width:26px;height:26px;border-radius:7px;border:1px solid var(--border);background:var(--card-solid);color:var(--primary-dark);font-weight:800;cursor:pointer;padding:0;flex-shrink:0' + (i === currentOrder.length - 1 ? ';opacity:0.35;cursor:not-allowed' : '') + '">↓</button>'
             +  '</div>';
    }
    html += '</div>';
    html += '<div class="col-menu-foot">'
         +    '<button type="button" class="col-menu-reset">بازنشانی نمایش</button>'
         +    '<button type="button" class="col-menu-order-reset">↺ بازگشت ترتیب</button>'
         +    '<button type="button" class="col-menu-close">بستن</button>'
         +  '</div>';
    menu.innerHTML = html;
    menu.classList.remove('hidden');

    var rect = btn.getBoundingClientRect();
    var menuW = 280;
    var top = rect.bottom + window.scrollY + 6;
    var left = rect.left + window.scrollX - menuW + rect.width;
    if (left < 8) left = 8;
    if (left + menuW > window.innerWidth - 8) left = window.innerWidth - menuW - 8;
    menu.style.top = top + 'px';
    menu.style.left = left + 'px';
    menu.style.minWidth = menuW + 'px';

    menu.querySelectorAll('input[type=checkbox]').forEach(function (cb) {
        cb.addEventListener('change', function () {
            var tid = this.getAttribute('data-table');
            var idx = Number(this.getAttribute('data-col'));
            var h = getHiddenCols(tid).slice();
            if (this.checked) h = h.filter(function (x) { return x !== idx; });
            else if (h.indexOf(idx) === -1) h.push(idx);
            setHiddenCols(tid, h);
            applyColVisibility(tid);
        });
    });

    menu.querySelectorAll('.col-move-btn').forEach(function (b) {
        b.addEventListener('click', function () {
            var tid = this.getAttribute('data-table');
            var col = Number(this.getAttribute('data-col'));
            var dir = Number(this.getAttribute('data-dir'));
            moveColumnInTable(tid, col, dir);
            showColMenu(tid, btn);
        });
    });

    menu.querySelector('.col-menu-reset').addEventListener('click', function () {
        setHiddenCols(tableId, []);
        applyColVisibility(tableId);
        showColMenu(tableId, btn);
    });

    menu.querySelector('.col-menu-order-reset').addEventListener('click', function () {
        resetColumnOrder(tableId);
        showColMenu(tableId, btn);
    });

    menu.querySelector('.col-menu-close').addEventListener('click', function () {
        menu.classList.add('hidden');
    });
}

/* بستن منو با کلیک بیرون */
document.addEventListener('click', function (e) {
    var menu = document.getElementById('col-menu');
    if (!menu || menu.classList.contains('hidden')) return;
    if (menu.contains(e.target)) return;
    if (e.target.closest && e.target.closest('.col-toggle-btn')) return;
    menu.classList.add('hidden');
});

/* صادرسازی */
window.columnOrders         = columnOrders;
window.saveColumnOrders     = saveColumnOrders;
window.getCurrentColumnOrder = getCurrentColumnOrder;
window.applyColumnOrder     = applyColumnOrder;
window.resetColumnOrder     = resetColumnOrder;
window.moveColumnInTable    = moveColumnInTable;
window.captureColumnOrder   = captureColumnOrder;
window.getHiddenCols        = getHiddenCols;
window.setHiddenCols        = setHiddenCols;
window.applyColVisibility   = applyColVisibility;
window.applyColVisibilityAll = applyColVisibilityAll;
window.showColMenu          = showColMenu;
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<title>تست لایه Core + UI</title>
<style>
    table { border-collapse: collapse; margin: 10px 0; }
    th, td { border: 1px solid #ccc; padding: 5px 10px; }
    #result div { padding: 3px 0; font-family: monospace; }
</style>
</head>
<body>

<h1>تست Core + UI</h1>
<div id="result"></div>

<hr>
<h2>جدول تست</h2>
<div class="list-header" data-col-table="test-table" data-hide-key="test">
    <span>نمونه</span>
</div>
<table class="data-table" id="test-table">
    <thead>
        <tr>
            <th data-sortable data-sort-key="name" data-orig-index="0">نام <span class="sort-ind"></span></th>
            <th data-sortable data-sort-key="age" data-orig-index="1">سن <span class="sort-ind"></span></th>
        </tr>
    </thead>
    <tbody>
        <tr><td>علی</td><td>30</td></tr>
        <tr><td>رضا</td><td>25</td></tr>
    </tbody>
</table>

<script src="./js/core/db.js"></script>
<script src="./js/core/constants.js"></script>
<script src="./js/core/utils.js"></script>
<script src="./js/core/state.js"></script>
<script src="./js/core/router.js"></script>
<script src="./js/ui/toast.js"></script>
<script src="./js/ui/nav.js"></script>
<script src="./js/ui/theme.js"></script>
<script src="./js/ui/table.js"></script>

<script>
var out = [];
function log(label, ok, extra) {
    out.push((ok ? '✅' : '❌') + ' ' + label + (extra ? ' → ' + extra : ''));
}

try {
    /* Core */
    log('DB',                       typeof DB !== 'undefined');
    log('LS_KEYS',                  typeof LS_KEYS !== 'undefined');
    log('state',                    typeof state !== 'undefined');
    log('goToPage',                 typeof goToPage === 'function');

    /* UI ناوبری */
    log('showToast',                typeof showToast === 'function');
    log('openSidebar',              typeof openSidebar === 'function');
    log('setHomePage',              typeof setHomePage === 'function');

    /* UI تم */
    log('applyTheme',               typeof applyTheme === 'function');
    log('applyFont',                typeof applyFont === 'function');

    /* UI جدول */
    log('makeTableResizable',       typeof makeTableResizable === 'function');
    log('makeAllTablesResizable',   typeof makeAllTablesResizable === 'function');
    log('applyColumnOrder',         typeof applyColumnOrder === 'function');
    log('applyColVisibility',       typeof applyColVisibility === 'function');
    log('showColMenu',              typeof showColMenu === 'function');
    log('attachTableSorting',       typeof attachTableSorting === 'function');
    log('buildFilterRow',           typeof buildFilterRow === 'function');
    log('makeCardCollapsible',      typeof makeCardCollapsible === 'function');
    log('buildHeaderButtons',       typeof buildHeaderButtons === 'function');

    /* اجرای تست واقعی */
    makeAllTablesResizable();
    log('اجرای makeAllTablesResizable', true);

    attachFilterRowsToAllTables();
    log('اجرای attachFilterRowsToAllTables', true);

    buildHeaderButtons();
    log('اجرای buildHeaderButtons', true);

    var headerBtns = document.querySelectorAll('.list-header button');
    log('دکمه‌های هدر ساخته شد', headerBtns.length >= 3, headerBtns.length + ' دکمه');

    applyTheme('ocean');
    log('applyTheme("ocean")', document.body.classList.contains('theme-ocean'));
    applyTheme('sky');

    applyFont('tahoma');
    log('applyFont("tahoma")', document.body.classList.contains('font-tahoma'));

    showToast('✅ تست لایه UI موفق بود');
    log('اجرای showToast', true, '(پیام پایین صفحه)');

    document.getElementById('result').innerHTML = out.join('<br>');
} catch (e) {
    document.getElementById('result').innerHTML =
        out.join('<br>') + '<br><br>❌ خطا: ' + (e.message || e) +
        '<br><pre style="color:red;direction:ltr">' + (e.stack || '') + '</pre>';
}
</script>
</body>
</html>
