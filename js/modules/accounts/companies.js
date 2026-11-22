/* ============================================================
   پارسیس — شرکت‌ها (نسخه ضد باگ با فیلتر قیفی)
   مسیر: js/modules/accounts/companies.js
   ============================================================ */
'use strict';

function renderCompaniesList() {
    var list = DB.load('companies', []);
    if (!Array.isArray(list)) list = [];
    list = list.filter(function(x) { return x && typeof x === 'object'; });

    var filterEl = document.getElementById('comp-filter');
    var filter = (filterEl ? filterEl.value : '').toLowerCase();
    var tb = document.getElementById('comp-list-body');
    if (!tb) return;
    tb.innerHTML = '';

    var shown = 0;
    var filtered = list.filter(function (c) {
        if (filter && ((c.name || '') + ' ' + (c.phone || '') + ' ' + (c.email || '')).toLowerCase().indexOf(filter) === -1) return false;
        return true;
    });

    try {
        filtered = applyTableSort('comp-table', filtered, function (c, k) { return c[k] || ''; });
    } catch(e) {}

    for (var i = 0; i < filtered.length; i++) {
        var c = filtered[i];
        shown++;
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + esc(c.name) + '</td>'
            + '<td dir="ltr">' + toFa(esc(c.phone || '—')) + '</td>'
            + '<td dir="ltr">' + esc(c.email || '—') + '</td>'
            + '<td><div class="row-actions">'
            + '<button class="row-btn edit" data-id="' + c.id + '">✎</button>'
            + '<button class="row-btn del" data-id="' + c.id + '">×</button>'
            + '</div></td>';
        tb.appendChild(tr);
    }

    if (shown === 0) {
        tb.innerHTML = '<tr><td colspan="4" class="empty-row">یافت نشد.</td></tr>';
    }

    var countEl = document.getElementById('comp-count');
    if (countEl) countEl.textContent = toFa(shown);

    attachRowActions(tb, 'companies', renderCompaniesList, function (c) {
        document.getElementById('co-id').value = c.id;
        document.getElementById('co-name').value = c.name || '';
        document.getElementById('co-phone').value = c.phone || '';
        document.getElementById('co-email').value = c.email || '';
        document.getElementById('co-address').value = c.address || '';
        
        var activePage = document.querySelector('.page.active');
        var addTab = activePage ? activePage.querySelector('[data-tab="comp-add"]') : null;
        if (addTab) addTab.click();
    });

    if (typeof applyColVisibility === 'function') applyColVisibility('comp-table');
    if (typeof makeTableResizable === 'function') makeTableResizable(document.getElementById('comp-table'));
    if (typeof attachTableSorting === 'function') attachTableSorting('comp-table', renderCompaniesList);
    if (typeof applySortIndicator === 'function') applySortIndicator('comp-table');
    if (typeof buildFilterRow === 'function') buildFilterRow(document.getElementById('comp-table'));
}

function clearCompanyForm() {
    ['co-id', 'co-name', 'co-phone', 'co-email', 'co-address'].forEach(function (i) {
        var el = document.getElementById(i);
        if (el) el.value = '';
    });
}

function bindCompaniesForm() {
    var saveBtn = document.getElementById('save-company');
    if (saveBtn) saveBtn.addEventListener('click', function () {
        var id = document.getElementById('co-id').value;
        var n = document.getElementById('co-name').value.trim();
        if (!n) { alert('نام اجباری.'); return; }

        var o = {
            id: id || uid(), name: n, phone: normalizeDigits(document.getElementById('co-phone').value.trim()),
            email: document.getElementById('co-email').value.trim(), address: document.getElementById('co-address').value.trim()
        };

        var l = DB.load('companies', []);
        if (!Array.isArray(l)) l = [];
        if (id) { for (var i = 0; i < l.length; i++) { if (l[i].id === id) l[i] = o; } } 
        else { l.push(o); }
        DB.save('companies', l);
        showToast('✅ شرکت ذخیره شد.');
        clearCompanyForm();
        renderCompaniesList();
        
        var activePage = document.querySelector('.page.active');
        var listTab = activePage ? activePage.querySelector('[data-tab="comp-list"]') : null;
        if (listTab) listTab.click();
    });

    var newBtn = document.getElementById('new-company');
    if (newBtn) newBtn.addEventListener('click', clearCompanyForm);
    var filterEl = document.getElementById('comp-filter');
    if (filterEl) filterEl.addEventListener('input', renderCompaniesList);
}

window.renderCompaniesList = renderCompaniesList;
window.clearCompanyForm    = clearCompanyForm;
window.bindCompaniesForm   = bindCompaniesForm;
