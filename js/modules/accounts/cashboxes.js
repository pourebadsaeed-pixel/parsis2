/* ============================================================
   پارسیس — صندوق‌ها
   مسیر: js/modules/accounts/cashboxes.js
   وابستگی: core/* + ui/*
   ============================================================ */
'use strict';

/* ============================================================
   بخش ۱ — پر کردن سلکت نوع
   ============================================================ */
function refreshCashTypeSelect() {
    var sel = document.getElementById('cb-type');
    if (!sel) return;
    sel.innerHTML = '<option value="">— نوع —</option>';
    for (var i = 0; i < state.cashTypes.length; i++) {
        var o = document.createElement('option');
        o.value = state.cashTypes[i];
        o.textContent = state.cashTypes[i];
        sel.appendChild(o);
    }
}

/* ============================================================
   بخش ۲ — رندر فهرست صندوق‌ها
   ============================================================ */
function renderCashBoxesList() {
    var list = DB.load('cashBoxes', []);
    var filterEl = document.getElementById('cb-filter');
    var filter = (filterEl ? filterEl.value : '').toLowerCase();
    var tb = document.getElementById('cb-list-body');
    if (!tb) return;
    tb.innerHTML = '';

    var shown = 0;
    var filtered = list.filter(function (c) {
        if (filter && ((c.title || '') + ' ' + (c.type || '')).toLowerCase().indexOf(filter) === -1) {
            return false;
        }
        return true;
    });

    filtered = applyTableSort('cb-table', filtered, function (c, k) {
        if (k === 'order') return Number(c.order) || 9999;
        return c[k] || '';
    });

    for (var i = 0; i < filtered.length; i++) {
        var c = filtered[i];
        shown++;
        var tr = document.createElement('tr');
        tr.innerHTML = '<td dir="ltr">' + (c.order != null ? toFa(esc(c.order)) : '—') + '</td>'
            + '<td>' + esc(c.title) + '</td>'
            + '<td>' + esc(c.type) + '</td>'
            + '<td>' + esc(c.unit) + '</td>'
            + '<td><div class="row-actions">'
            + '<button class="row-btn edit" data-id="' + c.id + '">✎</button>'
            + '<button class="row-btn del" data-id="' + c.id + '">×</button>'
            + '</div></td>';
        tb.appendChild(tr);
    }

    if (shown === 0) {
        tb.innerHTML = '<tr><td colspan="5" class="empty-row">یافت نشد.</td></tr>';
    }

    var countEl = document.getElementById('cb-count');
    if (countEl) countEl.textContent = toFa(shown);

    attachRowActions(tb, 'cashBoxes', renderCashBoxesList, function (c) {
        document.getElementById('cb-id').value = c.id;
        document.getElementById('cb-title').value = c.title || '';
        document.getElementById('cb-type').value = c.type || '';
        document.getElementById('cb-unit').value = c.unit || '';
        document.getElementById('cb-order').value = (c.order != null ? c.order : '');
        var addTab = document.querySelector('[data-tab="cb-add"]');
        if (addTab) addTab.click();
    });

    if (typeof applyColVisibility === 'function') applyColVisibility('cb-table');
    if (typeof makeTableResizable === 'function') makeTableResizable(document.getElementById('cb-table'));
    if (typeof attachTableSorting === 'function') attachTableSorting('cb-table', renderCashBoxesList);
    if (typeof applySortIndicator === 'function') applySortIndicator('cb-table');
}

/* ============================================================
   بخش ۳ — پاک کردن فرم
   ============================================================ */
function clearCBForm() {
    var ids = ['cb-id', 'cb-title', 'cb-unit', 'cb-order'];
    ids.forEach(function (i) {
        var el = document.getElementById(i);
        if (el) el.value = '';
    });
    var typeEl = document.getElementById('cb-type');
    if (typeEl) typeEl.value = '';
}

/* ============================================================
   بخش ۴ — اتصال دکمه‌ها
   ============================================================ */
function bindCashBoxesForm() {
    var saveBtn = document.getElementById('save-cb');
    if (saveBtn) saveBtn.addEventListener('click', function () {
        var id = document.getElementById('cb-id').value;
        var t = document.getElementById('cb-title').value.trim();
        if (!t) { alert('عنوان اجباری.'); return; }

        var oR = normalizeDigits(document.getElementById('cb-order').value.trim());
        var o = oR === '' ? null : Number(oR);

        var o2 = {
            id: id || uid(),
            title: t,
            type: document.getElementById('cb-type').value,
            unit: document.getElementById('cb-unit').value.trim(),
            order: o
        };

        var l = DB.load('cashBoxes', []);
        if (id) {
            for (var i = 0; i < l.length; i++) {
                if (l[i].id === id) l[i] = o2;
            }
        } else {
            l.push(o2);
        }
        DB.save('cashBoxes', l);
        showToast('✅ صندوق ذخیره شد.');
        clearCBForm();
        renderCashBoxesList();
        if (typeof updateHomeWidgets === 'function') updateHomeWidgets();
        var listTab = document.querySelector('[data-tab="cb-list"]');
        if (listTab) listTab.click();
    });

    var newBtn = document.getElementById('new-cb');
    if (newBtn) newBtn.addEventListener('click', clearCBForm);

    var filterEl = document.getElementById('cb-filter');
    if (filterEl) filterEl.addEventListener('input', renderCashBoxesList);
}

/* ============================================================
   صادرسازی
   ============================================================ */
window.refreshCashTypeSelect = refreshCashTypeSelect;
window.renderCashBoxesList   = renderCashBoxesList;
window.clearCBForm           = clearCBForm;
window.bindCashBoxesForm     = bindCashBoxesForm;

console.log('✅ [modules/accounts/cashboxes.js] loaded');
