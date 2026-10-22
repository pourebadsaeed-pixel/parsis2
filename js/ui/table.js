/* ============================================================
   پارسیس — جدول‌ها: عرض، ترتیب، مخفی‌سازی، مرتب‌سازی، فیلتر
   مسیر: js/ui/table.js (رفع خطای سینتکس continue)
   ============================================================ */
'use strict';

var colWidths = DB.load(LS_KEYS.COL_WIDTHS, {});
function saveColWidths() { DB.save(LS_KEYS.COL_WIDTHS, colWidths); }

(function injectFilterCss() {
    if (document.getElementById('col-filter-style')) return;
    var s = document.createElement('style');
    s.id = 'col-filter-style';
    s.textContent = `
        .col-filter-btn { position: absolute; top: 50%; left: 4px; transform: translateY(-50%); width: 22px; height: 22px; border-radius: 6px; background: transparent; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0.3; transition: all 0.2s; padding: 0; z-index: 4; }
        .col-filter-btn:hover { opacity: 1; background: var(--primary-light); color: var(--primary-dark); transform: translateY(-50%) scale(1.1); }
        .col-filter-btn.active { opacity: 1; background: var(--primary); color: #fff; }
        .col-filter-popover { position: fixed; z-index: 99999; background: var(--card-solid); border: 1px solid var(--primary); border-radius: 12px; box-shadow: var(--shadow-lg); padding: 12px; width: 250px; display: flex; flex-direction: column; gap: 8px; direction: rtl; }
        .cf-dropdown-wrap { position: relative; }
        .cf-op-btn { padding: 9px 12px; border: 1.5px solid var(--border); border-radius: 8px; background: var(--card-solid); cursor: pointer; font-size: 0.82rem; display: flex; justify-content: space-between; align-items: center; font-weight: 700; color: var(--text); }
        .cf-op-list { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: var(--card-solid); border: 1.5px solid var(--primary); border-radius: 8px; box-shadow: var(--shadow-lg); z-index: 100000; max-height: 220px; overflow-y: auto; display: none; }
        .cf-op-list.show { display: block; }
        .cf-op-item { padding: 9px 12px; cursor: pointer; font-size: 0.82rem; border-bottom: 1px solid var(--border); }
        .cf-op-item:hover { background: var(--primary-soft); color: var(--primary-dark); }
        .cf-op-item.selected { background: var(--primary-light); font-weight: 800; color: var(--primary-dark); }
        .col-filter-popover input { width: 100%; padding: 9px 12px; font-size: 0.82rem; border: 1.5px solid var(--border); border-radius: 8px; outline: none; }
        .cf-actions { display: flex; gap: 8px; justify-content: space-between; margin-top: 4px; }
        .cf-actions button { flex: 1; padding: 8px; border-radius: 8px; border: none; font-size: 0.78rem; font-weight: 800; cursor: pointer; }
        .cf-clear { background: #fee2e2; color: #dc2626; }
        .cf-close { background: var(--primary-light); color: var(--primary-dark); }
    `;
    document.head.appendChild(s);
})();

function normalizeCellText(s) {
    return String(s || '').replace(/[\u200c\u200e\u200f]/g, ' ').replace(/[يى]/g, 'ی').replace(/[ك]/g, 'ک').replace(/\u066C/g, ',').replace(/\s+/g, ' ').trim().toLowerCase();
}
function normalizeForFilter(s) { return normalizeDigits(normalizeCellText(s)); }
function cellToNumber(s) { var t = normalizeDigits(String(s || '')).replace(/[^\d\-\.]/g, ''); if (!t || t === '-') return null; var n = Number(t); return isFinite(n) ? n : null; }

function testFilter(cellText, filter) {
    if (!filter || !filter.op) return true;
    var txt = normalizeForFilter(cellText); var val = normalizeForFilter(filter.val || '');
    var numTxt = cellToNumber(cellText); var numVal = cellToNumber(filter.val || '');
    switch (filter.op) {
        case 'contains': return txt.indexOf(val) !== -1;
        case 'eq': return txt === val;
        case 'neq': return txt !== val;
        case 'gt': return numTxt !== null && numVal !== null && numTxt > numVal;
        case 'gte': return numTxt !== null && numVal !== null && numTxt >= numVal;
        case 'lt': return numTxt !== null && numVal !== null && numTxt < numVal;
        case 'lte': return numTxt !== null && numVal !== null && numTxt <= numVal;
        case 'startsWith': return val.length > 0 && txt.indexOf(val) === 0;
        case 'endsWith': return val.length > 0 && txt.slice(-val.length) === val;
        case 'empty': return txt === '' || txt === '—' || txt === '-';
        case 'notEmpty': return txt !== '' && txt !== '—' && txt !== '-';
    }
    return true;
}

function ensureFixedLayout(table) {
    if (!table) return;
    table.classList.add('w-col-resized'); table.style.setProperty('table-layout', 'fixed', 'important');
    table.querySelectorAll('th, td').forEach(function(c) { c.style.setProperty('overflow', 'hidden', 'important'); c.style.setProperty('white-space', 'nowrap', 'important'); c.style.setProperty('text-overflow', 'ellipsis', 'important'); });
}
function removeFixedLayout(table) {
    if (!table) return;
    table.classList.remove('w-col-resized'); table.style.removeProperty('table-layout'); table.style.removeProperty('width'); table.style.removeProperty('min-width');
    table.querySelectorAll('th, td').forEach(function(c) { c.style.removeProperty('overflow'); c.style.removeProperty('white-space'); c.style.removeProperty('text-overflow'); });
}

function applyColWidths(tableId) {
    var table = document.getElementById(tableId); if (!table) return;
    var widths = colWidths[tableId] || []; var headerRow = table.querySelector('thead tr:not(.column-filter-row)'); if (!headerRow) return;
    var totalW = 0, hasWidth = false;
    headerRow.querySelectorAll('th').forEach(function(th, i) {
        var oi = th.getAttribute('data-orig-index'); var idx = oi !== null ? parseInt(oi, 10) : i;
        if (widths[idx]) { th.style.setProperty('width', widths[idx] + 'px', 'important'); th.style.setProperty('min-width', widths[idx] + 'px', 'important'); th.style.setProperty('max-width', widths[idx] + 'px', 'important'); totalW += widths[idx]; hasWidth = true; }
        else { th.style.removeProperty('width'); th.style.removeProperty('min-width'); th.style.removeProperty('max-width'); }
    });
    if (hasWidth) { ensureFixedLayout(table); table.style.setProperty('width', totalW + 'px', 'important'); table.style.setProperty('min-width', totalW + 'px', 'important'); }
    else removeFixedLayout(table);
}

function makeTableResizable(table) {
    if (!table || !table.id) return; var tableId = table.id; table.setAttribute('data-table-id', tableId);
    var headerRow = table.querySelector('thead tr:not(.column-filter-row)'); if (!headerRow) return;
    var ths = headerRow.querySelectorAll('th'); var needsSetup = false;
    for (var i = 0; i < ths.length; i++) { if (ths[i].getAttribute('data-orig-index') === null) ths[i].setAttribute('data-orig-index', String(i)); if (!ths[i].querySelector('.col-resizer')) { needsSetup = true; break; } }
    if (!needsSetup) { table.dataset.resizable = '1'; applyColWidths(tableId); return; }
    table.querySelectorAll('.col-resizer').forEach(function(r) { r.remove(); });
    ths.forEach(function(th, idx) {
        if (th.getAttribute('data-orig-index') === null) th.setAttribute('data-orig-index', String(idx));
        var res = document.createElement('div'); res.className = 'col-resizer'; res.title = 'تغییر عرض'; th.appendChild(res);
        var startX = 0, startW = 0, isDragging = false;
        function start(e) {
            isDragging = true; var x = e.touches ? e.touches[0].clientX : e.clientX; startX = x; startW = th.offsetWidth;
            document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; document.body.classList.add('resizing-cols'); ensureFixedLayout(table);
            var allThs = table.querySelectorAll('thead tr:not(.column-filter-row) th'); var totalW = 0;
            allThs.forEach(function(t) { if (t.style.display !== 'none') { var w = t.offsetWidth; totalW += w; t.style.setProperty('width', w + 'px', 'important'); t.style.setProperty('min-width', w + 'px', 'important'); t.style.setProperty('max-width', w + 'px', 'important'); } });
            table.style.setProperty('width', totalW + 'px', 'important'); table.style.setProperty('min-width', totalW + 'px', 'important');
        }
        function move(e) {
            if (!isDragging) return; var x = e.touches ? e.touches[0].clientX : e.clientX; var diff = startX - x;
            var w = Math.max(10, Math.min(5000, startW + diff));
            th.style.setProperty('width', w + 'px', 'important'); th.style.setProperty('min-width', w + 'px', 'important'); th.style.setProperty('max-width', w + 'px', 'important');
            var currentTotalW = 0; table.querySelectorAll('thead tr:not(.column-filter-row) th').forEach(function(t) { if (t.style.display !== 'none') currentTotalW += t.offsetWidth; });
            table.style.setProperty('width', currentTotalW + 'px', 'important'); table.style.setProperty('min-width', currentTotalW + 'px', 'important');
        }
        function end() {
            if (!isDragging) return; isDragging = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; document.body.classList.remove('resizing-cols');
            if (!colWidths[tableId]) colWidths[tableId] = [];
            table.querySelectorAll('thead tr:not(.column-filter-row) th').forEach(function(th) { var oi = th.getAttribute('data-orig-index'); var cidx = oi !== null ? parseInt(oi, 10) : 0; if (th.style.display !== 'none') colWidths[tableId][cidx] = th.offsetWidth; });
            saveColWidths();
        }
        res.addEventListener('dblclick', function(e) { e.preventDefault(); e.stopPropagation(); resetColumnWidths(tableId); });
        res.addEventListener('mousedown', function(e) { e.preventDefault(); e.stopPropagation(); start(e); });
        res.addEventListener('touchstart', function(e) { e.preventDefault(); e.stopPropagation(); start(e); }, { passive: false });
        document.addEventListener('mousemove', move); document.addEventListener('mouseup', end);
        document.addEventListener('touchmove', function(e) { if (isDragging) { move(e); e.preventDefault(); } }, { passive: false }); document.addEventListener('touchend', end);
    });
    table.dataset.resizable = '1'; applyColWidths(tableId);
}

function resetColumnWidths(tableId) {
    if (!tableId) return; delete colWidths[tableId]; saveColWidths();
    var table = document.getElementById(tableId); if (!table) return; removeFixedLayout(table);
    table.querySelectorAll('thead tr:not(.column-filter-row) th').forEach(function(th) { th.style.removeProperty('width'); th.style.removeProperty('min-width'); th.style.removeProperty('max-width'); });
    if (typeof showToast === 'function') showToast('↔ عرض ستون‌ها بازنشانی شد.');
}

var MANAGED_TABLE_IDS = ['fiscal-table', 'persons-table', 'comp-table', 'ba-table', 'cb-table', 'proj-table', 'voucher-table-list', 'rt-table', 'ri-table', 'rf-table', 'rff-table', 'cfs-table', 'cf-table', 'cfd-table', 'rc-table', 'ra-acc-table', 'turnover-table'];
function makeAllTablesResizable() { MANAGED_TABLE_IDS.forEach(function(id) { var t = document.getElementById(id); if (t) makeTableResizable(t); }); }

function makeFilterPanelCollapsible(pageId, storageKey, title, icon) {
    var page = document.querySelector('.page.active'); if (!page || page.id.indexOf('page-' + pageId) !== 0) page = document.getElementById('page-' + pageId);
    if (!page) return; var existingHeader = page.querySelector('.filter-collapse-header'); var existingBody = page.querySelector('.filter-collapse-body');
    if (existingHeader && existingBody) {
        if (!existingHeader.dataset.boundCollapse) { existingHeader.dataset.boundCollapse = '1'; existingHeader.addEventListener('click', function () { var isHidden = existingBody.style.display === 'none'; existingBody.style.display = isHidden ? '' : 'none'; var arrow = existingHeader.querySelector('.filter-collapse-arrow'); if (arrow) arrow.style.transform = isHidden ? '' : 'rotate(-90deg)'; state.cardCollapsed[storageKey] = !isHidden; DB.save(LS_KEYS.CARD_COLLAPSED, state.cardCollapsed); }); }
        var isCollapsed = state.cardCollapsed[storageKey] === true; existingBody.style.display = isCollapsed ? 'none' : ''; var arrow2 = existingHeader.querySelector('.filter-collapse-arrow'); if (arrow2) arrow2.style.transform = isCollapsed ? 'rotate(-90deg)' : ''; return;
    }
    if (page.dataset.filterCollapseInit === '1') return; page.dataset.filterCollapseInit = '1';
    var card = page.querySelector('.card'); if (!card) return; title = title || 'فیلترها'; icon = icon || '🔍';
    var header = document.createElement('div'); header.className = 'filter-collapse-header'; header.dataset.boundCollapse = '1';
    header.style.cssText = 'display:flex;align-items:center;gap:10px;padding:12px 16px;background:linear-gradient(180deg,#e8f0fb,#f4f8fd);cursor:pointer;user-select:none;border-radius:14px 14px 0 0;margin:-18px -18px 14px -18px;border-bottom:1px solid var(--border)';
    header.innerHTML = '<span style="font-size:1rem">' + icon + '</span><span style="flex:1;font-weight:900;color:#1e40af;font-size:.9rem">' + title + '</span><span class="filter-collapse-arrow" style="font-size:.75rem;color:#1e40af;transition:transform .25s">▼</span>';
    card.insertBefore(header, card.firstChild);
    var body = document.createElement('div'); body.className = 'filter-collapse-body'; var children = Array.from(card.childNodes);
    children.forEach(function(node) { if (node === header || (node.classList && node.classList.contains('filter-collapse-body'))) return; body.appendChild(node); });
    card.appendChild(body);
    var collapsed = state.cardCollapsed[storageKey] === true; if (collapsed) { body.style.display = 'none'; header.querySelector('.filter-collapse-arrow').style.transform = 'rotate(-90deg)'; }
    header.addEventListener('click', function () { var nowCollapsed = body.style.display === 'none' ? false : true; body.style.display = nowCollapsed ? 'none' : ''; header.querySelector('.filter-collapse-arrow').style.transform = nowCollapsed ? 'rotate(-90deg)' : ''; state.cardCollapsed[storageKey] = nowCollapsed; DB.save(LS_KEYS.CARD_COLLAPSED, state.cardCollapsed); });
}

var columnOrders = DB.load(LS_KEYS.COLUMN_ORDERS, {});
function saveColumnOrders() { DB.save(LS_KEYS.COLUMN_ORDERS, columnOrders); }
function getCurrentColumnOrder(tableId) { var table = document.getElementById(tableId); if (!table) return []; var headerRow = table.querySelector('thead tr:not(.column-filter-row)'); if (!headerRow) return []; return Array.from(headerRow.querySelectorAll('th')).map(function(th, i) { var idx = th.getAttribute('data-orig-index'); if (idx === null) { idx = String(i); th.setAttribute('data-orig-index', idx); } return parseInt(idx, 10); }); }
function findThByOrigIndex(headerRow, origIdx) { return Array.from(headerRow.querySelectorAll('th')).find(function(th) { return parseInt(th.getAttribute('data-orig-index'), 10) === origIdx; }); }

// ✅ اصلاح باگ سینتکس در این تابع (تبدیل continue به return)
function syncBodyOrigIndices(table, headerRow) {
    if (!headerRow) headerRow = table.querySelector('thead tr:not(.column-filter-row)'); if (!headerRow) return;
    var origIndices = Array.from(headerRow.querySelectorAll('th')).map(function(th, i) { return th.getAttribute('data-orig-index') || String(i); });
    table.querySelectorAll('tr').forEach(function(row) { 
        if (row === headerRow) return; 
        var cells = row.children; 
        if (cells.length <= 1) return; // ✅ اصلاح شد
        for (var c = 0; c < cells.length; c++) { 
            if (cells[c].getAttribute('data-orig-index') === null) cells[c].setAttribute('data-orig-index', c < origIndices.length ? origIndices[c] : String(c)); 
        } 
    });
}

// ✅ اصلاح باگ سینتکس در این تابع (تبدیل continue به return)
function applyColumnOrder(tableId) {
    if (!tableId) return; var savedOrder = columnOrders[tableId]; if (!savedOrder || !savedOrder.length) return;
    var table = document.getElementById(tableId); if (!table) return; var headerRow = table.querySelector('thead tr:not(.column-filter-row)'); if (!headerRow) return;
    headerRow.querySelectorAll('th').forEach(function(th, i) { if (th.getAttribute('data-orig-index') === null) th.setAttribute('data-orig-index', String(i)); });
    syncBodyOrigIndices(table, headerRow);
    table.querySelectorAll('tr').forEach(function(row) { 
        var cells = Array.from(row.children); 
        if (cells.length <= 1) return; // ✅ اصلاح شد
        var map = {}, unindexed = []; 
        cells.forEach(function(c) { var oi = c.getAttribute('data-orig-index'); if (oi !== null) map[oi] = c; else unindexed.push(c); }); 
        savedOrder.forEach(function(s) { if (map[String(s)]) row.appendChild(map[String(s)]); }); 
        unindexed.forEach(function(c) { row.appendChild(c); }); 
    });
}

var colSettings = DB.load(LS_KEYS.COLUMN_SETTINGS, {});
function getHiddenCols(tableId) { return colSettings[tableId] || []; }
function setHiddenCols(tableId, arr) { colSettings[tableId] = arr; DB.save(LS_KEYS.COLUMN_SETTINGS, colSettings); }
function applyColVisibility(tableId) {
    var table = document.getElementById(tableId); if (!table) return; syncBodyOrigIndices(table);
    var hidden = getHiddenCols(tableId); table.querySelectorAll('tr').forEach(function(row) { var cells = row.children; if (cells.length === 1 && cells[0].hasAttribute('colspan')) return; for (var c = 0; c < cells.length; c++) { var oi = cells[c].getAttribute('data-orig-index'); var idx = oi !== null ? parseInt(oi, 10) : c; cells[c].style.display = hidden.indexOf(idx) !== -1 ? 'none' : ''; } });
}

var sortState = { vouchers: { col: 'number', dir: 'desc' }, facilities: { col: 'name', dir: 'asc' }, rf: { col: 'name', dir: 'asc' }, rff: { col: 'name', dir: 'asc' } };
function compareVals(a, b) { if (a == null) a = ''; if (b == null) b = ''; if (typeof a === 'string' && typeof b === 'string') { var na = parseFloat(a), nb = parseFloat(b); if (!isNaN(na) && !isNaN(nb) && a.trim() === String(na) && b.trim() === String(nb)) return na - nb; return a.localeCompare(b, 'fa'); } if (typeof a === 'number' && typeof b === 'number') return a - b; return String(a).localeCompare(String(b), 'fa'); }
var tableSortState = DB.load(LS_KEYS.TABLE_SORT_STATE, {});
function applySortIndicator(tableId) { var table = document.getElementById(tableId); if (!table) return; var st = tableSortState[tableId]; table.querySelectorAll('thead th[data-sort-key]').forEach(function(th) { var ind = th.querySelector('.sort-ind'); if (!ind) return; var k = th.getAttribute('data-sort-key'); if (st && st.col === k) { ind.textContent = st.dir === 'asc' ? '▲' : '▼'; ind.classList.add('active'); } else { ind.textContent = '⇅'; ind.classList.remove('active'); } }); }
function attachTableSorting(tableId, rerender) {
    var table = document.getElementById(tableId); if (!table) return;
    table.querySelectorAll('thead th[data-sortable]').forEach(function(th) {
        if (th.dataset.sortAttached) return; th.dataset.sortAttached = '1';
        th.addEventListener('click', function(e) {
            if (e.target.closest('.col-resizer') || e.target.closest('.col-filter-btn')) return;
            var k = th.getAttribute('data-sort-key'); if (!k) return; var st = tableSortState[tableId] || { col: k, dir: 'asc' };
            if (st.col === k) st.dir = st.dir === 'asc' ? 'desc' : 'asc'; else { st.col = k; st.dir = 'asc'; }
            tableSortState[tableId] = st; DB.save(LS_KEYS.TABLE_SORT_STATE, tableSortState); rerender();
        });
    });
}
function applyTableSort(tableId, rows, keyFn) { var st = tableSortState[tableId]; if (!st) return rows; var dir = st.dir === 'asc' ? 1 : -1; return rows.slice().sort(function(a, b) { return dir * compareVals(keyFn(a, st.col), keyFn(b, st.col)); }); }

var COLUMN_FILTERS = {};
function applyColumnFiltersToTable(tableId) {
    var table = document.getElementById(tableId); if (!table) return;
    var filters = COLUMN_FILTERS[tableId] || {}; var hasAny = Object.keys(filters).some(function(k) { return filters[k] && filters[k].op; });
    var tbody = table.querySelector('tbody'); if (!tbody) return; var rows = tbody.querySelectorAll('tr');
    if (!hasAny) { rows.forEach(function(tr) { tr.style.display = ''; }); return; }
    rows.forEach(function(tr) {
        var tds = tr.children; 
        if (tds.length === 1 && tds[0].hasAttribute('colspan')) { tr.style.display = 'none'; return; } // ✅ اصلاح شد
        var show = true;
        for (var key in filters) {
            var origIdx = Number(key); var f = filters[key]; if (!f || !f.op) continue;
            var cell = null; for (var c = 0; c < tds.length; c++) { var oi = tds[c].getAttribute('data-orig-index'); if (oi !== null && parseInt(oi, 10) === origIdx) { cell = tds[c]; break; } }
            if (!testFilter(cell ? cell.textContent : '', f)) { show = false; break; }
        }
        tr.style.display = show ? '' : 'none';
    });
}

function closeColFilterPopover() { var pop = document.getElementById('col-filter-popover'); if (pop) pop.remove(); }
document.addEventListener('click', function(e) { var pop = document.getElementById('col-filter-popover'); if (!pop) return; if (pop.contains(e.target) || (e.target.closest && e.target.closest('.col-filter-btn'))) return; closeColFilterPopover(); });

function openColFilterPopover(tableId, origIdx, btn) {
    closeColFilterPopover(); var pop = document.createElement('div'); pop.className = 'col-filter-popover'; pop.id = 'col-filter-popover';
    var existing = (COLUMN_FILTERS[tableId] && COLUMN_FILTERS[tableId][origIdx]) || {}; var currentOp = existing.op || '';
    var ops = [['', '— انتخاب کنید —'], ['contains', 'شامل'], ['eq', 'مساوی'], ['neq', 'نامساوی'], ['gt', 'بزرگتر از'], ['gte', 'بزرگتر یا مساوی'], ['lt', 'کوچکتر از'], ['lte', 'کوچکتر یا مساوی'], ['startsWith', 'شروع با'], ['endsWith', 'پایان با'], ['empty', 'خالی'], ['notEmpty', 'خالی نباشد']];
    var opWrap = document.createElement('div'); opWrap.className = 'cf-dropdown-wrap';
    var opBtn = document.createElement('div'); opBtn.className = 'cf-op-btn';
    var selectedLabel = ops.find(function(o) { return o[0] === currentOp; })[1] || '— انتخاب کنید —';
    opBtn.innerHTML = '<span>' + selectedLabel + '</span><span>▼</span>';
    var opList = document.createElement('div'); opList.className = 'cf-op-list';
    ops.forEach(function(o) {
        var item = document.createElement('div'); item.className = 'cf-op-item' + (o[0] === currentOp ? ' selected' : ''); item.textContent = o[1];
        item.onclick = function(e) { e.stopPropagation(); currentOp = o[0]; opBtn.innerHTML = '<span>' + o[1] + '</span><span>▼</span>'; opList.classList.remove('show'); opList.querySelectorAll('.cf-op-item').forEach(function(el) { el.classList.remove('selected'); }); item.classList.add('selected'); update(); };
        opList.appendChild(item);
    });
    opBtn.onclick = function(e) { e.stopPropagation(); opList.classList.toggle('show'); };
    opWrap.appendChild(opBtn); opWrap.appendChild(opList); pop.appendChild(opWrap);
    var inp = document.createElement('input'); inp.type = 'text'; inp.placeholder = 'مقدار...'; inp.value = existing.val || ''; pop.appendChild(inp);
    var actions = document.createElement('div'); actions.className = 'cf-actions'; actions.innerHTML = '<button class="cf-clear" type="button">پاک کردن</button><button class="cf-close" type="button">بستن</button>'; pop.appendChild(actions);
    document.body.appendChild(pop);
    var rect = btn.getBoundingClientRect(); pop.style.top = (rect.bottom + 4) + 'px'; pop.style.left = Math.max(4, rect.left - 100) + 'px';
    function update() {
        var op = currentOp; var val = inp.value.trim();
        if (!op && !val) { if (COLUMN_FILTERS[tableId]) delete COLUMN_FILTERS[tableId][origIdx]; btn.classList.remove('active'); }
        else if (!op && val) { if (!COLUMN_FILTERS[tableId]) COLUMN_FILTERS[tableId] = {}; COLUMN_FILTERS[tableId][origIdx] = { op: 'contains', val: val }; btn.classList.add('active'); }
        else if (op === 'empty' || op === 'notEmpty') { if (!COLUMN_FILTERS[tableId]) COLUMN_FILTERS[tableId] = {}; COLUMN_FILTERS[tableId][origIdx] = { op: op, val: '' }; btn.classList.add('active'); }
        else if (op && !val) { if (COLUMN_FILTERS[tableId]) delete COLUMN_FILTERS[tableId][origIdx]; btn.classList.remove('active'); }
        else { if (!COLUMN_FILTERS[tableId]) COLUMN_FILTERS[tableId] = {}; COLUMN_FILTERS[tableId][origIdx] = { op: op, val: val }; btn.classList.add('active'); }
        applyColumnFiltersToTable(tableId);
    }
    inp.addEventListener('input', update);
    pop.querySelector('.cf-clear').addEventListener('click', function() { inp.value = ''; currentOp = ''; opBtn.innerHTML = '<span>— انتخاب کنید —</span><span>▼</span>'; opList.querySelectorAll('.cf-op-item').forEach(function(el) { el.classList.remove('selected'); }); update(); closeColFilterPopover(); });
    pop.querySelector('.cf-close').addEventListener('click', closeColFilterPopover);
    setTimeout(function() { inp.focus(); }, 30);
}

function buildFilterRow(table) {
    if (!table || !table.id) return; var thead = table.querySelector('thead'); if (!thead) return;
    var headerRow = thead.querySelector('tr:not(.column-filter-row)'); if (!headerRow) return;
    var ths = headerRow.querySelectorAll('th');
    ths.forEach(function(th, domIdx) {
        if (th.querySelector('.col-filter-btn')) return;
        var origIdxStr = th.getAttribute('data-orig-index'); if (origIdxStr === null) { origIdxStr = String(domIdx); th.setAttribute('data-orig-index', origIdxStr); }
        if (getComputedStyle(th).position === 'static') th.style.position = 'relative';
        var currentPL = parseInt(getComputedStyle(th).paddingLeft) || 0; if (currentPL < 26) th.style.paddingLeft = '26px';
        var btn = document.createElement('button'); btn.className = 'col-filter-btn'; btn.type = 'button';
        btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>';
        btn.title = 'فیلتر ستون'; btn.setAttribute('data-col-idx', origIdxStr); btn.setAttribute('data-table-id', table.id);
        btn.addEventListener('click', function(e) { e.stopPropagation(); openColFilterPopover(table.id, this.getAttribute('data-col-idx'), this); });
        th.appendChild(btn);
        var existing = COLUMN_FILTERS[table.id] && COLUMN_FILTERS[table.id][origIdxStr];
        if (existing && existing.op) btn.classList.add('active');
    });
}
function attachFilterRowsToAllTables() { document.querySelectorAll('table.data-table, table.report-table, table.cf-table, table.ar-tbl').forEach(function(t) { if (!t.id || !t.querySelector('thead')) return; buildFilterRow(t); if (COLUMN_FILTERS[t.id]) applyColumnFiltersToTable(t.id); }); }

function makeCardCollapsible(cardEl, key) {
    if (!cardEl) return; var collapsed = state.cardCollapsed[key] === true; var btn = cardEl.querySelector('.card-collapse-btn');
    if (!btn) { btn = document.createElement('button'); btn.type = 'button'; btn.className = 'card-collapse-btn'; btn.textContent = '‹'; cardEl.appendChild(btn); }
    btn.classList.toggle('collapsed', collapsed); cardEl.classList.toggle('collapsed', collapsed);
    if (!btn.dataset.bound) { btn.dataset.bound = '1'; btn.addEventListener('click', function(e) { e.stopPropagation(); var now = !cardEl.classList.contains('collapsed'); cardEl.classList.toggle('collapsed', now); btn.classList.toggle('collapsed', now); state.cardCollapsed[key] = now; DB.save(LS_KEYS.CARD_COLLAPSED, state.cardCollapsed); }); }
}

function buildHeaderButtons() {
    document.querySelectorAll('.list-header').forEach(function(h) {
        var tableId = h.getAttribute('data-col-table'); var hideKey = h.getAttribute('data-hide-key');
        if (hideKey) {
            var eye = h.querySelector('.eye-toggle-btn'); if (!eye) { eye = document.createElement('button'); eye.type = 'button'; eye.className = 'eye-toggle-btn'; eye.setAttribute('data-hide-key', hideKey); h.appendChild(eye); }
            if (!eye.dataset.bound) { eye.dataset.bound = '1'; eye.addEventListener('click', function(ev) { ev.stopPropagation(); if (typeof toggleHideState === 'function') toggleHideState(hideKey); if (typeof rerenderCurrentPage === 'function') rerenderCurrentPage(); }); }
        }
        if (tableId) {
            var rBtn = h.querySelector('.col-reset-btn'); if (!rBtn) { rBtn = document.createElement('button'); rBtn.type = 'button'; rBtn.className = 'col-reset-btn'; rBtn.innerHTML = '↻'; rBtn.title = 'بازنشانی عرض'; h.appendChild(rBtn); }
            if (!rBtn.dataset.bound) { rBtn.dataset.bound = '1'; rBtn.addEventListener('click', function(ev) { ev.stopPropagation(); resetColumnWidths(tableId); }); }
            if (tableId !== 'ra-acc-table') {
                var btn = h.querySelector('.col-toggle-btn'); if (!btn) { btn = document.createElement('button'); btn.className = 'col-toggle-btn'; btn.type = 'button'; btn.innerHTML = '⚙'; btn.title = 'تنظیمات ستون‌ها'; h.appendChild(btn); }
                if (!btn.dataset.bound) { btn.dataset.bound = '1'; btn.addEventListener('click', function(ev) { ev.stopPropagation(); showColMenu(tableId, btn); }); }
            }
        }
    });
    if (typeof updateEyeButtons === 'function') updateEyeButtons();
}

function showColMenu(tableId, btn) {
    var menu = document.getElementById('col-menu'); if (!menu) return;
    var table = document.getElementById(tableId); if (!table) return;
    var headerRow = table.querySelector('thead tr:not(.column-filter-row)'); if (!headerRow) return;
    headerRow.querySelectorAll('th').forEach(function(th, i) { if (th.getAttribute('data-orig-index') === null) th.setAttribute('data-orig-index', String(i)); });
    var hidden = getHiddenCols(tableId); var currentOrder = getCurrentColumnOrder(tableId);
    var html = '<div class="col-menu-head">نمایش و ترتیب ستون‌ها</div><div class="col-menu-body">';
    currentOrder.forEach(function(origIdx) {
        var th = findThByOrigIndex(headerRow, origIdx); if (!th) return;
        var label = String(th.textContent || '').replace(/[⇅▲▼⚲]/g, '').trim() || ('ستون ' + (origIdx + 1));
        var checked = hidden.indexOf(origIdx) === -1 ? 'checked' : '';
        html += '<div class="col-menu-item" style="padding:6px 10px;display:flex;gap:6px;align-items:center"><input type="checkbox" data-table="' + tableId + '" data-col="' + origIdx + '" ' + checked + '><span style="flex:1;font-size:0.82rem">' + esc(label) + '</span><button type="button" class="col-move-btn" data-table="' + tableId + '" data-col="' + origIdx + '" data-dir="-1">▲</button><button type="button" class="col-move-btn" data-table="' + tableId + '" data-col="' + origIdx + '" data-dir="1">▼</button></div>';
    });
    html += '</div><div class="col-menu-foot"><button type="button" class="col-menu-reset">بازنشانی</button><button type="button" class="col-menu-order-reset">↺ ترتیب</button><button type="button" class="col-menu-close">بستن</button></div>';
    menu.innerHTML = html; menu.classList.remove('hidden'); menu.style.zIndex = '99999'; menu.style.position = 'fixed';
    var rect = btn.getBoundingClientRect(); menu.style.top = (rect.bottom + 6) + 'px'; menu.style.left = Math.max(8, rect.left - 280 + rect.width) + 'px';
    menu.querySelectorAll('input[type=checkbox]').forEach(function(cb) { cb.addEventListener('change', function () { var tid = this.getAttribute('data-table'); var idx = Number(this.getAttribute('data-col')); var h = getHiddenCols(tid).slice(); if (this.checked) h = h.filter(function(x) { return x !== idx; }); else if (h.indexOf(idx) === -1) h.push(idx); setHiddenCols(tid, h); applyColVisibility(tid); }); });
    menu.querySelectorAll('.col-move-btn').forEach(function(b) { b.addEventListener('click', function () { var tid = this.getAttribute('data-table'); var cidx = Number(this.getAttribute('data-col')); var dir = Number(this.getAttribute('data-dir')); var arr = getCurrentColumnOrder(tid); var pos = arr.indexOf(cidx); if (pos < 0) return; var npos = pos + dir; if (npos < 0 || npos >= arr.length) return; var tmp = arr[pos]; arr[pos] = arr[npos]; arr[npos] = tmp; columnOrders[tid] = arr; saveColumnOrders(); applyColumnOrder(tid); applyColVisibility(tid); showColMenu(tableId, btn); }); });
    menu.querySelector('.col-menu-reset').addEventListener('click', function() { setHiddenCols(tableId, []); applyColVisibility(tableId); showColMenu(tableId, btn); });
    menu.querySelector('.col-menu-order-reset').addEventListener('click', function() { delete columnOrders[tableId]; saveColumnOrders(); var table2 = document.getElementById(tableId); if (table2) { table2.querySelectorAll('tr').forEach(function(row) { var cells = Array.from(row.children); if (cells.length <= 1) return; var map = {}, unindexed = []; cells.forEach(function(c) { var oi = c.getAttribute('data-orig-index'); if (oi !== null) map[oi] = c; else unindexed.push(c); }); Object.keys(map).map(Number).sort(function(a, b) { return a - b; }).forEach(function(k) { row.appendChild(map[k]); }); unindexed.forEach(function(c) { row.appendChild(c); }); }); } showColMenu(tableId, btn); });
    menu.querySelector('.col-menu-close').addEventListener('click', function() { menu.classList.add('hidden'); });
}

document.addEventListener('click', function(e) { var menu = document.getElementById('col-menu'); if (!menu || menu.classList.contains('hidden')) return; if (menu.contains(e.target) || (e.target.closest && e.target.closest('.col-toggle-btn'))) return; menu.classList.add('hidden'); });

window.colWidths = colWidths; window.saveColWidths = saveColWidths; window.applyColWidths = applyColWidths; window.updateTableMinWidth = updateTableMinWidth; window.makeTableResizable = makeTableResizable; window.resetColumnWidths = resetColumnWidths; window.makeAllTablesResizable = makeAllTablesResizable; window.MANAGED_TABLE_IDS = MANAGED_TABLE_IDS; window.columnOrders = columnOrders; window.saveColumnOrders = saveColumnOrders; window.getCurrentColumnOrder = getCurrentColumnOrder; window.applyColumnOrder = applyColumnOrder; window.resetColumnOrder = resetColumnOrder; window.moveColumnInTable = moveColumnInTable; window.getHiddenCols = getHiddenCols; window.setHiddenCols = setHiddenCols; window.applyColVisibility = applyColVisibility; window.applyColVisibilityAll = applyColVisibilityAll; window.showColMenu = showColMenu; window.sortState = sortState; window.compareVals = compareVals; window.tableSortState = tableSortState; window.applySortIndicator = applySortIndicator; window.attachTableSorting = attachTableSorting; window.applyTableSort = applyTableSort; window.COLUMN_FILTERS = COLUMN_FILTERS; window.applyColumnFiltersToTable = applyColumnFiltersToTable; window.buildFilterRow = buildFilterRow; window.attachFilterRowsToAllTables = attachFilterRowsToAllTables; window.makeCardCollapsible = makeCardCollapsible; window.buildHeaderButtons = buildHeaderButtons; window.normalizeCellText = normalizeCellText; window.testFilter = testFilter; window.makeFilterPanelCollapsible = makeFilterPanelCollapsible; window.syncBodyOrigIndices = syncBodyOrigIndices; window.openColFilterPopover = openColFilterPopover; window.closeColFilterPopover = closeColFilterPopover;

console.log('✅ [ui/table.js] loaded — Syntax error fixed');
