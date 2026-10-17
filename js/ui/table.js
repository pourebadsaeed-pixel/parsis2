/* ============================================================
   پارسیس — جدول‌ها: عرض، ترتیب، مخفی‌سازی، مرتب‌سازی، فیلتر
   مسیر: js/ui/table.js
   ============================================================ */
'use strict';

var colWidths = DB.load(LS_KEYS.COL_WIDTHS, {});
function saveColWidths() { DB.save(LS_KEYS.COL_WIDTHS, colWidths); }

function ensureFixedLayout(table) {
    if (!table) return;
    table.classList.add('w-col-resized');
    /* ✅ اجبار مرورگر به نادیده گرفتن محتوا برای کوچک شدن */
    table.style.setProperty('table-layout', 'fixed', 'important');
    table.style.setProperty('width', 'auto', 'important');
    table.style.setProperty('min-width', '0', 'important');
    
    /* ✅ اجبار به پنهان کردن متن سرریز شده */
    var allCells = table.querySelectorAll('th, td');
    for (var k = 0; k < allCells.length; k++) {
        allCells[k].style.setProperty('overflow', 'hidden', 'important');
        allCells[k].style.setProperty('white-space', 'nowrap', 'important');
        allCells[k].style.setProperty('text-overflow', 'ellipsis', 'important');
    }
}

function removeFixedLayout(table) {
    if (!table) return;
    table.classList.remove('w-col-resized');
    table.style.tableLayout = '';
    table.style.width = '';
    table.style.minWidth = '';
    
    var allCells = table.querySelectorAll('th, td');
    for (var k = 0; k < allCells.length; k++) {
        allCells[k].style.overflow = '';
        allCells[k].style.whiteSpace = '';
        allCells[k].style.textOverflow = '';
    }
}

function tableHasAnyWidth(tableId) {
    var w = colWidths[tableId];
    if (!w) return false;
    for (var k in w) {
        if (w[k] && w[k] > 0) return true;
    }
    return false;
}

function applyColWidths(tableId) {
    var table = document.getElementById(tableId);
    if (!table) return;
    var widths = colWidths[tableId] || [];
    var headerRow = table.querySelector('thead tr:not(.column-filter-row)');
    if (!headerRow) return;
    var ths = headerRow.querySelectorAll('th');
    
    for (var i = 0; i < ths.length; i++) {
        var oi = ths[i].getAttribute('data-orig-index');
        var idx = oi !== null ? parseInt(oi, 10) : i;
        if (widths[idx]) {
            ths[i].style.setProperty('width', widths[idx] + 'px', 'important');
            ths[i].style.setProperty('min-width', widths[idx] + 'px', 'important');
            ths[i].style.setProperty('max-width', widths[idx] + 'px', 'important');
        } else {
            ths[i].style.width = '';
            ths[i].style.minWidth = '';
            ths[i].style.maxWidth = '';
        }
    }
    
    if (tableHasAnyWidth(tableId)) {
        ensureFixedLayout(table);
    } else {
        removeFixedLayout(table);
    }
}

function updateTableMinWidth(table) { if (table) table.style.minWidth = ''; }

var COL_MIN_W = 10; /* حداقل عرض ۱۰ پیکسل یعنی می‌توانید کاملاً روی متن بیفتید */
var COL_MAX_W = 5000;

function makeTableResizable(table) {
    if (!table || table.dataset.resizable === '1') return;
    table.dataset.resizable = '1';
    var tableId = table.id;
    if (!tableId) return;
    table.setAttribute('data-table-id', tableId);

    var headerRow = table.querySelector('thead tr:not(.column-filter-row)');
    if (!headerRow) return;
    var ths = headerRow.querySelectorAll('th');
    
    for (var i = 0; i < ths.length; i++) {
        (function (th, idx) {
            if (th.getAttribute('data-orig-index') === null) {
                th.setAttribute('data-orig-index', String(idx));
            }
            var origIdx = parseInt(th.getAttribute('data-orig-index'), 10);

            if (th.querySelector('.col-resizer')) return;
            var res = document.createElement('div');
            res.className = 'col-resizer';
            res.title = 'بکش تا عرض تغییر کند • دابل‌کلیک: بازنشانی';
            th.appendChild(res);

            var startX = 0, startW = 0, isDragging = false;

            function start(e) {
                if (isDragging) return;
                isDragging = true;
                var x = e.touches ? e.touches[0].clientX : e.clientX;
                startX = x;
                startW = th.offsetWidth;
                
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
                document.body.classList.add('resizing-cols');
                
                /* ✅ تبدیل جدول به Fixed تا مرورگر اجازه کوچک شدن بدهد */
                ensureFixedLayout(table);
                
                /* ✅ قفل کردن عرض ستون‌های دیگر که هنگام کشیدن جابه‌جا نشوند */
                var curHdr = table.querySelector('thead tr:not(.column-filter-row)');
                var allThs = curHdr ? curHdr.querySelectorAll('th') : [];
                for (var j = 0; j < allThs.length; j++) {
                    if (allThs[j].style.display !== 'none') {
                        var w = allThs[j].offsetWidth;
                        allThs[j].style.setProperty('width', w + 'px', 'important');
                        allThs[j].style.setProperty('min-width', w + 'px', 'important');
                        allThs[j].style.setProperty('max-width', w + 'px', 'important');
                    }
                }
            }

            function move(e) {
                if (!isDragging) return;
                var x = e.touches ? e.touches[0].clientX : e.clientX;
                var diff = startX - x; /* کشیدن به راست عرض را کم می‌کند */
                
                var w = Math.max(COL_MIN_W, Math.min(COL_MAX_W, startW + diff));
                
                th.style.setProperty('width', w + 'px', 'important');
                th.style.setProperty('min-width', w + 'px', 'important');
                th.style.setProperty('max-width', w + 'px', 'important');
            }

            function end() {
                if (!isDragging) return;
                isDragging = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                document.body.classList.remove('resizing-cols');

                if (!colWidths[tableId]) colWidths[tableId] = [];
                var curHdr = table.querySelector('thead tr:not(.column-filter-row)');
                if (curHdr) {
                    var allThs = curHdr.querySelectorAll('th');
                    for (var j = 0; j < allThs.length; j++) {
                        var oi = allThs[j].getAttribute('data-orig-index');
                        var cidx = oi !== null ? parseInt(oi, 10) : j;
                        if (allThs[j].style.display !== 'none') {
                            colWidths[tableId][cidx] = allThs[j].offsetWidth;
                        }
                    }
                }
                saveColWidths();
            }

            res.addEventListener('dblclick', function (e) {
                e.preventDefault();
                e.stopPropagation();
                resetColumnWidths(tableId);
            });

            res.addEventListener('mousedown', function (e) {
                e.preventDefault();
                e.stopPropagation();
                start(e);
            });

            res.addEventListener('touchstart', function (e) {
                e.preventDefault();
                e.stopPropagation();
                start(e);
            }, { passive: false });

            document.addEventListener('mousemove', move);
            document.addEventListener('mouseup', end);
            document.addEventListener('touchmove', function (e) {
                if (isDragging) { move(e); e.preventDefault(); }
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
    
    removeFixedLayout(table);

    var headerRow = table.querySelector('thead tr:not(.column-filter-row)');
    if (headerRow) {
        var ths = headerRow.querySelectorAll('th');
        for (var i = 0; i < ths.length; i++) {
            ths[i].style.width = '';
            ths[i].style.minWidth = '';
            ths[i].style.maxWidth = '';
        }
    }

    showToast('↔ عرض ستون‌ها به حالت پیش‌فرض (fit محتوا) برگشت.');
}

function resetAllColumnWidths() {
    if (!confirm('عرض همه ستون‌های همه جدول‌ها به حالت پیش‌فرض برگردد؟')) return;
    colWidths = {};
    saveColWidths();
    for (var i = 0; i < MANAGED_TABLE_IDS.length; i++) {
        var t = document.getElementById(MANAGED_TABLE_IDS[i]);
        if (!t) continue;
        removeFixedLayout(t);
        var hRow = t.querySelector('thead tr:not(.column-filter-row)');
        if (hRow) {
            var ths = hRow.querySelectorAll('th');
            for (var j = 0; j < ths.length; j++) {
                ths[j].style.width = '';
                ths[j].style.minWidth = '';
                ths[j].style.maxWidth = '';
            }
        }
    }
    showToast('↔ عرض همه جدول‌ها بازنشانی شد.');
}

var MANAGED_TABLE_IDS = [
    'fiscal-table', 'persons-table', 'comp-table', 'ba-table', 'cb-table', 'proj-table',
    'voucher-table-list', 'rt-table', 'ri-table', 'rf-table', 'rff-table', 'cfs-table',
    'cf-table', 'cfd-table', 'rc-table', 'ra-acc-table'
];

function makeAllTablesResizable() {
    for (var i = 0; i < MANAGED_TABLE_IDS.length; i++) {
        var t = document.getElementById(MANAGED_TABLE_IDS[i]);
        if (t) makeTableResizable(t);
    }
}

/* ============================================================
   تاشو کردن پنل فیلتر
   ============================================================ */
function makeFilterPanelCollapsible(pageId, storageKey, title, icon) {
    var page = document.getElementById('page-' + pageId);
    if (!page) return;

    if (page.dataset.filterCollapseInit === '1') return;
    page.dataset.filterCollapseInit = '1';

    var card = page.querySelector('.card');
    if (!card) return;

    title = title || 'فیلترها';
    icon = icon || '🔍';

    var header = document.createElement('div');
    header.className = 'filter-collapse-header';
    header.style.cssText = 'display:flex;align-items:center;gap:10px;padding:12px 16px;'
        + 'background:linear-gradient(180deg,#e8f0fb,#f4f8fd);cursor:pointer;user-select:none;'
        + 'border-radius:14px 14px 0 0;margin:-18px -18px 14px -18px;'
        + 'border-bottom:1px solid var(--border)';
    header.innerHTML = '<span style="font-size:1rem">' + icon + '</span>'
                    + '<span style="flex:1;font-weight:900;color:#1e40af;font-size:.9rem">' + title + '</span>'
                    + '<span class="filter-collapse-arrow" style="font-size:.75rem;color:#1e40af;transition:transform .25s">▼</span>';
    card.insertBefore(header, card.firstChild);

    var body = document.createElement('div');
    body.className = 'filter-collapse-body';
    var children = Array.from(card.childNodes);
    children.forEach(function (node) {
        if (node === header) return;
        if (node.classList && node.classList.contains('filter-collapse-body')) return;
        body.appendChild(node);
    });
    card.appendChild(body);

    var collapsed = state.cardCollapsed[storageKey] === true;
    if (collapsed) {
        body.style.display = 'none';
        header.querySelector('.filter-collapse-arrow').style.transform = 'rotate(-90deg)';
    }

    header.addEventListener('click', function () {
        var nowCollapsed = body.style.display === 'none' ? false : true;
        body.style.display = nowCollapsed ? 'none' : '';
        header.querySelector('.filter-collapse-arrow').style.transform = nowCollapsed ? 'rotate(-90deg)' : '';
        state.cardCollapsed[storageKey] = nowCollapsed;
        DB.save(LS_KEYS.CARD_COLLAPSED, state.cardCollapsed);
    });
}

/* ============================================================
   ترتیب ستون‌ها
   ============================================================ */
var columnOrders = DB.load(LS_KEYS.COLUMN_ORDERS, {});
function saveColumnOrders() { DB.save(LS_KEYS.COLUMN_ORDERS, columnOrders); }

function getCurrentColumnOrder(tableId) {
    var table = document.getElementById(tableId);
    if (!table) return [];
    var headerRow = table.querySelector('thead tr:not(.column-filter-row)');
    if (!headerRow) return [];
    var ths = headerRow.querySelectorAll('th');
    var order = [];
    for (var i = 0; i < ths.length; i++) {
        var idx = ths[i].getAttribute('data-orig-index');
        if (idx === null) { idx = String(i); ths[i].setAttribute('data-orig-index', idx); }
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
    var allRows = table.querySelectorAll('tr');
    for (var r = 0; r < allRows.length; r++) {
        var row = allRows[r];
        if (row === headerRow) continue;
        var cells = row.children;
        if (cells.length <= 1) continue;
        for (var c = 0; c < cells.length; c++) {
            if (cells[c].getAttribute('data-orig-index') === null) {
                cells[c].setAttribute('data-orig-index', String(c));
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
        for (var u = 0; u < unindexed.length; u++) row.appendChild(unindexed[u]);
    }
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
    showToast('↺ ترتیب ستون‌ها بازگشت.');
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
   نمایش/مخفی‌سازی ستون‌ها
   ============================================================ */
var colSettings = DB.load(LS_KEYS.COLUMN_SETTINGS, {});
function getHiddenCols(tableId) { return colSettings[tableId] || []; }
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
    for (var i = 0; i < MANAGED_TABLE_IDS.length; i++) applyColVisibility(MANAGED_TABLE_IDS[i]);
}

/* ============================================================
   منوی ستون‌ها
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
    var html = '<div class="col-menu-head">نمایش و ترتیب ستون‌ها</div><div class="col-menu-body">';
    for (var i = 0; i < currentOrder.length; i++) {
        var origIdx = currentOrder[i];
        var th = findThByOrigIndex(headerRow, origIdx);
        if (!th) continue;
        var label = String(th.textContent || '').replace(/[⇅▲▼]/g, '').trim() || ('ستون ' + (origIdx + 1));
        var checked = hidden.indexOf(origIdx) === -1 ? 'checked' : '';
        html += '<div class="col-menu-item" style="padding:6px 10px;display:flex;gap:6px;align-items:center">'
             +    '<input type="checkbox" data-table="' + tableId + '" data-col="' + origIdx + '" ' + checked + '>'
             +    '<span style="flex:1;font-size:0.82rem">' + esc(label) + '</span>'
             +    '<button type="button" class="col-move-btn" data-table="' + tableId + '" data-col="' + origIdx + '" data-dir="-1">▲</button>'
             +    '<button type="button" class="col-move-btn" data-table="' + tableId + '" data-col="' + origIdx + '" data-dir="1">▼</button>'
             +  '</div>';
    }
    html += '</div><div class="col-menu-foot">'
         +    '<button type="button" class="col-menu-reset">بازنشانی</button>'
         +    '<button type="button" class="col-menu-order-reset">↺ ترتیب</button>'
         +    '<button type="button" class="col-menu-close">بستن</button>'
         +  '</div>';
    menu.innerHTML = html;
    menu.classList.remove('hidden');
    var rect = btn.getBoundingClientRect();
    menu.style.top = (rect.bottom + window.scrollY + 6) + 'px';
    menu.style.left = Math.max(8, rect.left - 280 + rect.width) + 'px';

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
            moveColumnInTable(this.getAttribute('data-table'), Number(this.getAttribute('data-col')), Number(this.getAttribute('data-dir')));
            showColMenu(tableId, btn);
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
    menu.querySelector('.col-menu-close').addEventListener('click', function () { menu.classList.add('hidden'); });
}

document.addEventListener('click', function (e) {
    var menu = document.getElementById('col-menu');
    if (!menu || menu.classList.contains('hidden')) return;
    if (menu.contains(e.target)) return;
    if (e.target.closest && e.target.closest('.col-toggle-btn')) return;
    menu.classList.add('hidden');
});

/* ============================================================
   مرتب‌سازی
   ============================================================ */
var sortState = {
    vouchers: { col: 'number', dir: 'desc' },
    facilities: { col: 'name', dir: 'asc' },
    rf: { col: 'name', dir: 'asc' },
    rff: { col: 'name', dir: 'asc' }
};

function compareVals(a, b) {
    if (a === undefined || a === null) a = '';
    if (b === undefined || b === null) b = '';
    if (typeof a === 'string' && typeof b === 'string') {
        var na = parseFloat(a), nb = parseFloat(b);
        if (!isNaN(na) && !isNaN(nb) && a.trim() === String(na) && b.trim() === String(nb)) return na - nb;
        return a.localeCompare(b, 'fa');
    }
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b), 'fa');
}

var tableSortState = DB.load(LS_KEYS.TABLE_SORT_STATE, {});
function saveTableSortState() { DB.save(LS_KEYS.TABLE_SORT_STATE, tableSortState); }

function applySortIndicator(tableId) {
    var table = document.getElementById(tableId);
    if (!table) return;
    var ths = table.querySelectorAll('thead th[data-sort-key]');
    var st = tableSortState[tableId];
    for (var i = 0; i < ths.length; i++) {
        var ind = ths[i].querySelector('.sort-ind');
        if (!ind) continue;
        var k = ths[i].getAttribute('data-sort-key');
        if (st && st.col === k) { ind.textContent = st.dir === 'asc' ? '▲' : '▼'; ind.classList.add('active'); }
        else { ind.textContent = '⇅'; ind.classList.remove('active'); }
    }
}

function attachTableSorting(tableId, rerender) {
    var table = document.getElementById(tableId);
    if (!table) return;
    var ths = table.querySelectorAll('thead th[data-sortable]');
    for (var i = 0; i < ths.length; i++) {
        (function (th) {
            if (th.dataset.sortAttached) return;
            th.dataset.sortAttached = '1';
            th.addEventListener('click', function (e) {
                if (e.target.classList.contains('col-resizer')) return;
                var k = th.getAttribute('data-sort-key');
                if (!k) return;
                var st = tableSortState[tableId] || { col: k, dir: 'asc' };
                if (st.col === k) st.dir = st.dir === 'asc' ? 'desc' : 'asc';
                else { st.col = k; st.dir = 'asc'; }
                tableSortState[tableId] = st;
                saveTableSortState();
                rerender();
            });
        })(ths[i]);
    }
}

function applyTableSort(tableId, rows, keyFn) {
    var st = tableSortState[tableId];
    if (!st) return rows;
    var dir = st.dir === 'asc' ? 1 : -1;
    return rows.slice().sort(function (a, b) {
        return dir * compareVals(keyFn(a, st.col), keyFn(b, st.col));
    });
}

/* ============================================================
   فیلتر ردیف ستون‌ها
   ============================================================ */
var COLUMN_FILTERS = {};

function normalizeCellText(s) {
    return String(s || '')
        .replace(/[\u200c\u200e\u200f]/g, ' ')
        .replace(/[يى]/g, 'ی')
        .replace(/[ك]/g, 'ک')
        .replace(/\u066C/g, ',')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function cellToNumber(s) {
    var t = normalizeDigits(String(s || '')).replace(/[^\d\-\.]/g, '');
    if (!t || t === '-') return null;
    var n = Number(t);
    return isFinite(n) ? n : null;
}

function testFilter(cellText, filter) {
    if (!filter || !filter.op) return true;
    var txt = normalizeCellText(cellText);
    var val = normalizeCellText(filter.val || '');
    switch (filter.op) {
        case 'contains': return txt.indexOf(val) !== -1;
        case 'notContains': return txt.indexOf(val) === -1;
        case 'eq': return txt === val;
        case 'neq': return txt !== val;
        case 'startsWith': return txt.indexOf(val) === 0;
        case 'endsWith': return val.length > 0 && txt.slice(-val.length) === val;
        case 'empty': return txt === '' || txt === '—';
        case 'notEmpty': return txt !== '' && txt !== '—';
    }
    return true;
}

function applyColumnFiltersToTable(tableId) {
    var table = document.getElementById(tableId);
    if (!table) return;
    var filters = COLUMN_FILTERS[tableId] || {};
    var hasAny = Object.keys(filters).some(function (k) { return filters[k] && filters[k].op; });
    var tbody = table.querySelector('tbody');
    if (!tbody) return;
    var rows = tbody.querySelectorAll('tr');
    if (!hasAny) { rows.forEach(function (tr) { tr.style.display = ''; }); return; }
    rows.forEach(function (tr) {
        var tds = tr.children;
        if (tds.length === 1 && tds[0].hasAttribute('colspan')) { tr.style.display = 'none'; return; }
        var show = true;
        for (var key in filters) {
            var idx = Number(key);
            var f = filters[key];
            if (!f || !f.op) continue;
            var cellTxt = tds[idx] ? tds[idx].textContent : '';
            if (!testFilter(cellTxt, f)) { show = false; break; }
        }
        tr.style.display = show ? '' : 'none';
    });
}

function buildFilterRow(table) {
    if (!table || !table.id) return;
    var thead = table.querySelector('thead');
    if (!thead) return;
    if (thead.querySelector('tr.column-filter-row')) return;
    var headerRow = thead.querySelector('tr:not(.column-filter-row)');
    if (!headerRow) return;
    var ths = headerRow.querySelectorAll('th');
    if (ths.length === 0) return;
    var filterTr = document.createElement('tr');
    filterTr.className = 'column-filter-row';
    for (var i = 0; i < ths.length; i++) {
        (function (idx) {
            var td = document.createElement('th');
            td.className = 'column-filter-cell';
            td.setAttribute('data-orig-index', String(idx));
            td.style.cssText = 'padding:4px 6px;background:var(--card-alt);font-weight:normal';
            var inp = document.createElement('input');
            inp.type = 'text';
            inp.placeholder = '🔍';
            inp.style.cssText = 'width:100%;padding:4px 6px;font-size:.72rem;border:1px solid var(--border);border-radius:6px';
            td.appendChild(inp);
            filterTr.appendChild(td);
            inp.addEventListener('input', function () {
                var v = this.value.trim();
                if (!COLUMN_FILTERS[table.id]) COLUMN_FILTERS[table.id] = {};
                if (!v) delete COLUMN_FILTERS[table.id][idx];
                else COLUMN_FILTERS[table.id][idx] = { op: 'contains', val: v };
                applyColumnFiltersToTable(table.id);
            });
        })(i);
    }
    thead.appendChild(filterTr);
}

function attachFilterRowsToAllTables() {
    var tables = document.querySelectorAll('table.data-table, table.report-table, table.cf-table');
    tables.forEach(function (t) {
        if (!t.id || !t.querySelector('thead')) return;
        buildFilterRow(t);
        if (COLUMN_FILTERS[t.id]) applyColumnFiltersToTable(t.id);
    });
}

/* ============================================================
   Card collapse
   ============================================================ */
function makeCardCollapsible(cardEl, key, defaultOpen) {
    if (!cardEl || cardEl.dataset.collapsible === '1') return;
    cardEl.dataset.collapsible = '1';
    var collapsed = state.cardCollapsed[key] === true;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card-collapse-btn' + (collapsed ? ' collapsed' : '');
    btn.textContent = '‹';
    btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var nowCollapsed = !cardEl.classList.contains('collapsed');
        cardEl.classList.toggle('collapsed', nowCollapsed);
        btn.classList.toggle('collapsed', nowCollapsed);
        state.cardCollapsed[key] = nowCollapsed;
        DB.save(LS_KEYS.CARD_COLLAPSED, state.cardCollapsed);
    });
    cardEl.appendChild(btn);
    if (collapsed) cardEl.classList.add('collapsed');
}

/* ============================================================
   دکمه‌های هدر
   ============================================================ */
function buildHeaderButtons() {
    var headers = document.querySelectorAll('.list-header');
    for (var i = 0; i < headers.length; i++) {
        (function (h) {
            var tableId = h.getAttribute('data-col-table');
            var hideKey = h.getAttribute('data-hide-key');

            if (hideKey && !h.querySelector('.eye-toggle-btn')) {
                var eye = document.createElement('button');
                eye.type = 'button';
                eye.className = 'eye-toggle-btn';
                eye.setAttribute('data-hide-key', hideKey);
                eye.addEventListener('click', function (ev) {
                    ev.stopPropagation();
                    if (typeof toggleHideState === 'function') toggleHideState(hideKey);
                    if (typeof rerenderCurrentPage === 'function') rerenderCurrentPage();
                });
                h.appendChild(eye);
            }

            if (tableId && !h.querySelector('.col-reset-btn')) {
                var rBtn = document.createElement('button');
                rBtn.type = 'button';
                rBtn.className = 'col-reset-btn';
                rBtn.innerHTML = '↻';
                rBtn.title = 'بازنشانی عرض ستون‌ها به حالت پیش‌فرض';
                rBtn.addEventListener('click', function (ev) {
                    ev.stopPropagation();
                    resetColumnWidths(tableId);
                });
                h.appendChild(rBtn);
            }

            if (tableId && !h.querySelector('.col-toggle-btn')) {
                var btn = document.createElement('button');
                btn.className = 'col-toggle-btn';
                btn.type = 'button';
                btn.innerHTML = '⚙';
                btn.title = 'نمایش، ترتیب و پنهان کردن ستون‌ها';
                btn.addEventListener('click', function (ev) { ev.stopPropagation(); showColMenu(tableId, btn); });
                h.appendChild(btn);
            }
        })(headers[i]);
    }
    if (typeof updateEyeButtons === 'function') updateEyeButtons();
}

/* ============================================================
   Exports
   ============================================================ */
window.colWidths = colWidths;
window.saveColWidths = saveColWidths;
window.applyColWidths = applyColWidths;
window.updateTableMinWidth = updateTableMinWidth;
window.makeTableResizable = makeTableResizable;
window.resetColumnWidths = resetColumnWidths;
window.resetAllColumnWidths = resetAllColumnWidths;
window.makeAllTablesResizable = makeAllTablesResizable;
window.MANAGED_TABLE_IDS = MANAGED_TABLE_IDS;
window.columnOrders = columnOrders;
window.saveColumnOrders = saveColumnOrders;
window.getCurrentColumnOrder = getCurrentColumnOrder;
window.applyColumnOrder = applyColumnOrder;
window.resetColumnOrder = resetColumnOrder;
window.moveColumnInTable = moveColumnInTable;
window.getHiddenCols = getHiddenCols;
window.setHiddenCols = setHiddenCols;
window.applyColVisibility = applyColVisibility;
window.applyColVisibilityAll = applyColVisibilityAll;
window.showColMenu = showColMenu;
window.sortState = sortState;
window.compareVals = compareVals;
window.tableSortState = tableSortState;
window.applySortIndicator = applySortIndicator;
window.attachTableSorting = attachTableSorting;
window.applyTableSort = applyTableSort;
window.COLUMN_FILTERS = COLUMN_FILTERS;
window.applyColumnFiltersToTable = applyColumnFiltersToTable;
window.buildFilterRow = buildFilterRow;
window.attachFilterRowsToAllTables = attachFilterRowsToAllTables;
window.makeCardCollapsible = makeCardCollapsible;
window.buildHeaderButtons = buildHeaderButtons;
window.normalizeCellText = normalizeCellText;
window.testFilter = testFilter;
window.makeFilterPanelCollapsible = makeFilterPanelCollapsible;

console.log('✅ [ui/table.js] loaded — complete (pure resize)');
