/* ============================================================
   پارسیس — پروژه‌ها (نسخه ضد باگ با فیلتر قیفی)
   مسیر: js/modules/accounts/projects.js
   ============================================================ */
'use strict';

function renderProjectsList() {
    var list = DB.load('projects', []);
    if (!Array.isArray(list)) list = [];
    list = list.filter(function(x) { return x && typeof x === 'object'; });

    var filterEl = document.getElementById('proj-filter');
    var filter = (filterEl ? filterEl.value : '').toLowerCase();
    var tb = document.getElementById('proj-list-body');
    if (!tb) return;
    tb.innerHTML = '';

    var shown = 0;
    var filtered = list.filter(function (p) {
        if (filter && (p.name || '').toLowerCase().indexOf(filter) === -1) return false;
        return true;
    });

    try {
        filtered = applyTableSort('proj-table', filtered, function (p, k) { return p[k] || ''; });
    } catch(e) {}

    for (var i = 0; i < filtered.length; i++) {
        var p = filtered[i];
        shown++;
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + esc(p.name) + '</td>'
            + '<td><div class="row-actions">'
            + '<button class="row-btn edit" data-id="' + p.id + '">✎</button>'
            + '<button class="row-btn del" data-id="' + p.id + '">×</button>'
            + '</div></td>';
        tb.appendChild(tr);
    }

    if (shown === 0) {
        tb.innerHTML = '<tr><td colspan="2" class="empty-row">یافت نشد.</td></tr>';
    }

    var countEl = document.getElementById('proj-count');
    if (countEl) countEl.textContent = toFa(shown);

    attachRowActions(tb, 'projects', renderProjectsList, function (p) {
        document.getElementById('pj-id').value = p.id;
        document.getElementById('pj-name').value = p.name || '';
        
        var activePage = document.querySelector('.page.active');
        var addTab = activePage ? activePage.querySelector('[data-tab="proj-add"]') : null;
        if (addTab) addTab.click();
    });

    if (typeof applyColVisibility === 'function') applyColVisibility('proj-table');
    if (typeof makeTableResizable === 'function') makeTableResizable(document.getElementById('proj-table'));
    if (typeof attachTableSorting === 'function') attachTableSorting('proj-table', renderProjectsList);
    if (typeof applySortIndicator === 'function') applySortIndicator('proj-table');
    if (typeof buildFilterRow === 'function') buildFilterRow(document.getElementById('proj-table'));
}

function clearProjectForm() {
    var idEl = document.getElementById('pj-id');
    var nameEl = document.getElementById('pj-name');
    if (idEl) idEl.value = '';
    if (nameEl) nameEl.value = '';
}

function bindProjectsForm() {
    var saveBtn = document.getElementById('save-project');
    if (saveBtn) saveBtn.addEventListener('click', function () {
        var id = document.getElementById('pj-id').value;
        var n = document.getElementById('pj-name').value.trim();
        if (!n) { alert('نام اجباری.'); return; }

        var o = { id: id || uid(), name: n };
        var l = DB.load('projects', []);
        if (!Array.isArray(l)) l = [];
        if (id) { for (var i = 0; i < l.length; i++) { if (l[i].id === id) l[i] = o; } } 
        else { l.push(o); }
        DB.save('projects', l);
        showToast('✅ پروژه ذخیره شد.');
        clearProjectForm();
        renderProjectsList();
        
        var activePage = document.querySelector('.page.active');
        var listTab = activePage ? activePage.querySelector('[data-tab="proj-list"]') : null;
        if (listTab) listTab.click();
    });

    var newBtn = document.getElementById('new-project');
    if (newBtn) newBtn.addEventListener('click', clearProjectForm);
    var filterEl = document.getElementById('proj-filter');
    if (filterEl) filterEl.addEventListener('input', renderProjectsList);
}

window.renderProjectsList = renderProjectsList;
window.clearProjectForm   = clearProjectForm;
window.bindProjectsForm   = bindProjectsForm;
