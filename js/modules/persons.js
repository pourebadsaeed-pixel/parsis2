/* ============================================================
   پارسیس — اشخاص (نسخه ضد باگ با فیلتر قیفی)
   مسیر: js/modules/persons.js
   ============================================================ */
'use strict';

function renderPersonsList() {
    var list = DB.load('persons', []);
    // ✅ محافظت در برابر داده‌های خراب
    if (!Array.isArray(list)) list = [];
    list = list.filter(function(x) { return x && typeof x === 'object'; });

    var filterEl = document.getElementById('persons-filter');
    var filter = (filterEl ? filterEl.value : '').toLowerCase();
    var tb = document.getElementById('persons-list-body');
    if (!tb) return;
    tb.innerHTML = '';

    var shown = 0;
    var filtered = list.filter(function (p) {
        var txt = ((p.first || '') + ' ' + (p.last || '') + ' ' + (p.mobile || '') + ' ' + (p.email || '') + ' ' + (p.nationalId || '')).toLowerCase();
        if (filter && txt.indexOf(filter) === -1) return false;
        return true;
    });

    try {
        filtered = applyTableSort('persons-table', filtered, function (p, k) { return p[k] || ''; });
    } catch(e) { console.warn('Sort error:', e); }

    for (var i = 0; i < filtered.length; i++) {
        var p = filtered[i];
        shown++;
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + esc(p.first) + '</td>'
            + '<td>' + esc(p.last) + '</td>'
            + '<td dir="ltr">' + toFa(esc(p.nationalId || '—')) + '</td>'
            + '<td dir="ltr">' + toFa(esc(p.birth || '—')) + '</td>'
            + '<td dir="ltr">' + toFa(esc(p.mobile || '—')) + '</td>'
            + '<td dir="ltr">' + esc(p.email || '—') + '</td>'
            + '<td><div class="row-actions">'
            + '<button class="row-btn edit" data-id="' + p.id + '">✎</button>'
            + '<button class="row-btn del" data-id="' + p.id + '">×</button>'
            + '</div></td>';
        tb.appendChild(tr);
    }

    if (shown === 0) {
        tb.innerHTML = '<tr><td colspan="7" class="empty-row">یافت نشد.</td></tr>';
    }

    var countEl = document.getElementById('persons-count');
    if (countEl) countEl.textContent = toFa(shown);

    attachRowActions(tb, 'persons', renderPersonsList, function (p) {
        document.getElementById('pr-id').value = p.id;
        document.getElementById('pr-first').value = p.first || '';
        document.getElementById('pr-last').value = p.last || '';
        document.getElementById('pr-father').value = p.father || '';
        document.getElementById('pr-national-id').value = p.nationalId || '';
        document.getElementById('pr-birth').value = p.birth || '';
        document.getElementById('pr-mobile').value = p.mobile || '';
        document.getElementById('pr-phone').value = p.phone || '';
        document.getElementById('pr-email').value = p.email || '';
        document.getElementById('pr-bank-title').value = p.bankTitle || '';
        document.getElementById('pr-acc').value = p.acc || '';
        document.getElementById('pr-iban').value = p.iban || '';
        document.getElementById('pr-card').value = p.card || '';
        document.getElementById('pr-address').value = p.address || '';
        
        var activePage = document.querySelector('.page.active');
        var addTab = activePage ? activePage.querySelector('[data-tab="persons-add"]') : null;
        if (addTab) addTab.click();
    });

    if (typeof applyColVisibility === 'function') applyColVisibility('persons-table');
    if (typeof makeTableResizable === 'function') makeTableResizable(document.getElementById('persons-table'));
    if (typeof attachTableSorting === 'function') attachTableSorting('persons-table', renderPersonsList);
    if (typeof applySortIndicator === 'function') applySortIndicator('persons-table');
    
    // ✅ ساخت دکمه‌های قیف
    if (typeof buildFilterRow === 'function') buildFilterRow(document.getElementById('persons-table'));
}

function clearPersonForm() {
    var ids = ['pr-id', 'pr-first', 'pr-last', 'pr-father', 'pr-national-id', 'pr-birth', 'pr-mobile', 'pr-phone', 'pr-email', 'pr-bank-title', 'pr-acc', 'pr-iban', 'pr-card', 'pr-address'];
    ids.forEach(function (i) {
        var el = document.getElementById(i);
        if (el) el.value = '';
    });
}

function bindPersonsForm() {
    var saveBtn = document.getElementById('save-person');
    if (saveBtn) saveBtn.addEventListener('click', function () {
        var id = document.getElementById('pr-id').value;
        var f = document.getElementById('pr-first').value.trim();
        if (!f) { alert('نام اجباری.'); return; }

        var o = {
            id: id || uid(), first: f, last: document.getElementById('pr-last').value.trim(),
            father: document.getElementById('pr-father').value.trim(), nationalId: normalizeDigits(document.getElementById('pr-national-id').value.trim()),
            birth: normalizeDigits(document.getElementById('pr-birth').value.trim()), mobile: normalizeDigits(document.getElementById('pr-mobile').value.trim()),
            phone: normalizeDigits(document.getElementById('pr-phone').value.trim()), email: document.getElementById('pr-email').value.trim(),
            bankTitle: document.getElementById('pr-bank-title').value.trim(), acc: normalizeDigits(document.getElementById('pr-acc').value.trim()),
            iban: document.getElementById('pr-iban').value.trim(), card: normalizeDigits(document.getElementById('pr-card').value.trim()),
            address: document.getElementById('pr-address').value.trim()
        };

        var l = DB.load('persons', []);
        if (!Array.isArray(l)) l = [];
        if (id) { for (var i = 0; i < l.length; i++) { if (l[i].id === id) l[i] = o; } } 
        else { l.push(o); }
        DB.save('persons', l);
        showToast('✅ شخص ذخیره شد.');
        clearPersonForm();
        renderPersonsList();
        if (typeof updateHomeWidgets === 'function') updateHomeWidgets();
        
        var activePage = document.querySelector('.page.active');
        var listTab = activePage ? activePage.querySelector('[data-tab="persons-list"]') : null;
        if (listTab) listTab.click();
    });

    var newBtn = document.getElementById('new-person');
    if (newBtn) newBtn.addEventListener('click', clearPersonForm);
    var filterEl = document.getElementById('persons-filter');
    if (filterEl) filterEl.addEventListener('input', renderPersonsList);
}

window.renderPersonsList = renderPersonsList;
window.clearPersonForm = clearPersonForm;
window.bindPersonsForm = bindPersonsForm;
