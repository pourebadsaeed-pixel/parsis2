/* ============================================================
   پارسیس — دوره‌های مالی (با چک وابستگی قبل از حذف)
   مسیر: js/modules/accounts/fiscal.js
   ✅ v3: فیلتر دوره فعال در فهرست اسناد
   ============================================================ */
'use strict';

function attachRowActions(tb, sk, rf, ef) {
    var eds = tb.querySelectorAll('.row-btn.edit');
    var dls = tb.querySelectorAll('.row-btn.del');

    for (var j = 0; j < eds.length; j++) {
        eds[j].addEventListener('click', function () {
            var id = this.getAttribute('data-id');
            var list = DB.load(sk);
            var item = list.find(function (x) { return x.id === id; });
            if (item) ef(item);
        });
    }

    for (var k = 0; k < dls.length; k++) {
        dls[k].addEventListener('click', function () {
            var id = this.getAttribute('data-id');

            var typeMap = {
                'fiscalPeriods': 'fiscalPeriod',
                'persons':       'person',
                'companies':     'company',
                'bankAccounts':  'bankAccount',
                'cashBoxes':     'cashBox',
                'projects':      'project'
            };
            var entityType = typeMap[sk];

            if (entityType && typeof getDeleteIssues === 'function') {
                var issues = getDeleteIssues(entityType, id);
                if (issues.length > 0) {
                    var entityName = (DB.load(sk) || []).find(function (x) { return x.id === id; });
                    var displayName = entityName ? (entityName.name || entityName.title || entityName.bank || '') : '';
                    alert('⚠️ امکان حذف' + (displayName ? ' «' + displayName + '»' : '') + ' وجود ندارد:\n\n• ' + issues.join('\n• ') + '\n\nابتدا وابستگی‌ها را حذف یا تغییر دهید.');
                    return;
                }
            }

            if (!confirm('حذف شود؟')) return;

            var list = DB.load(sk);
            list = list.filter(function (x) { return x.id !== id; });
            DB.save(sk, list);

            if (sk === 'fiscalPeriods' && state.activePeriodId === id) {
                state.activePeriodId = list.length > 0 ? list[0].id : '';
                saveState(LS_KEYS.ACTIVE_PERIOD);
                if (typeof updateTopbarPeriod === 'function') updateTopbarPeriod();
            }

            rf();
            if (typeof updateHomeWidgets === 'function') updateHomeWidgets();
            if (typeof showToast === 'function') showToast('🗑 حذف شد');
        });
    }
}

function renderFiscalList() {
    var list = DB.load('fiscalPeriods', []);
    var filterEl = document.getElementById('fiscal-filter');
    var filter = (filterEl ? filterEl.value : '').toLowerCase();
    var tb = document.getElementById('fiscal-list-body');
    if (!tb) return;
    tb.innerHTML = '';

    var shown = 0;
    var filtered = list.filter(function (p) {
        if (filter && (p.title || '').toLowerCase().indexOf(filter) === -1) return false;
        return true;
    });

    filtered = applyTableSort('fiscal-table', filtered, function (p, k) {
        if (k === 'title') return p.title || '';
        if (k === 'from') return p.from || '';
        if (k === 'to') return p.to || '';
        return '';
    });

    for (var i = 0; i < filtered.length; i++) {
        var p = filtered[i];
        shown++;
        var tr = document.createElement('tr');
        var isA = state.activePeriodId === p.id;
        var ab = isA
            ? '<span class="badge badge-approved">✓ فعال</span>'
            : '<button class="row-btn approve" data-id="' + p.id + '">فعال</button>';

        tr.innerHTML = '<td><strong>' + esc(p.title) + '</strong></td>'
            + '<td dir="ltr">' + toFa(esc(p.from)) + '</td>'
            + '<td dir="ltr">' + toFa(esc(p.to)) + '</td>'
            + '<td>' + ab + '</td>'
            + '<td><div class="row-actions">'
            + '<button class="row-btn edit" data-id="' + p.id + '">✎</button>'
            + '<button class="row-btn del" data-id="' + p.id + '">×</button>'
            + '</div></td>';
        tb.appendChild(tr);
    }

    if (shown === 0) {
        tb.innerHTML = '<tr><td colspan="5" class="empty-row">یافت نشد.</td></tr>';
    }

    var countEl = document.getElementById('fiscal-count');
    if (countEl) countEl.textContent = toFa(shown);

    attachRowActions(tb, 'fiscalPeriods', renderFiscalList, function (p) {
        document.getElementById('fiscal-id').value = p.id;
        document.getElementById('fiscal-title').value = p.title;
        document.getElementById('fiscal-from').value = p.from;
        document.getElementById('fiscal-to').value = p.to;
        
        var activePage = document.querySelector('.page.active');
        var addTab = activePage ? activePage.querySelector('[data-tab="fiscal-add"]') : null;
        if (addTab) addTab.click();
    });

    var acts = tb.querySelectorAll('.row-btn.approve');
    for (var a = 0; a < acts.length; a++) {
        acts[a].addEventListener('click', function () {
            state.activePeriodId = this.getAttribute('data-id');
            saveState(LS_KEYS.ACTIVE_PERIOD);
            renderFiscalList();
            updateTopbarPeriod();
        });
    }

    if (typeof applyColVisibility === 'function') applyColVisibility('fiscal-table');
    if (typeof makeTableResizable === 'function') makeTableResizable(document.getElementById('fiscal-table'));
    if (typeof attachTableSorting === 'function') attachTableSorting('fiscal-table', renderFiscalList);
    if (typeof applySortIndicator === 'function') applySortIndicator('fiscal-table');
    if (typeof buildFilterRow === 'function') buildFilterRow(document.getElementById('fiscal-table'));
}

function refreshPeriodFilters() {
    var list = DB.load('fiscalPeriods', []);
    var sel = document.getElementById('vl-period-filter');
    if (!sel) return;
    
    // ✅ حذف گزینه "همه دوره‌ها" برای جلوگیری از قاطی شدن اسناد
    sel.innerHTML = ''; 
    for (var i = 0; i < list.length; i++) {
        var o = document.createElement('option');
        o.value = list[i].id;
        o.textContent = list[i].title;
        sel.appendChild(o);
    }
    
    // ✅ انتخاب خودکار دوره فعال
    if (state.activePeriodId) {
        sel.value = state.activePeriodId;
    } else if (list.length > 0) {
        sel.value = list[0].id;
    }
}

function clearFiscalForm() {
    var ids = ['fiscal-id', 'fiscal-title', 'fiscal-from', 'fiscal-to'];
    ids.forEach(function (x) {
        var el = document.getElementById(x);
        if (el) el.value = '';
    });
}

function bindFiscalForm() {
    var saveBtn = document.getElementById('save-fiscal');
    if (saveBtn) saveBtn.addEventListener('click', function () {
        var id = document.getElementById('fiscal-id').value;
        var t = document.getElementById('fiscal-title').value.trim();
        var f = normalizeDigits(document.getElementById('fiscal-from').value.trim());
        var to = normalizeDigits(document.getElementById('fiscal-to').value.trim());

        if (!t || !f || !to) {
            alert('همه فیلدها را پر کن.');
            return;
        }

        var l = DB.load('fiscalPeriods', []);
        if (id) {
            var p = l.find(function (x) { return x.id === id; });
            if (p) {
                p.title = t;
                p.from = f;
                p.to = to;
            }
        } else {
            var nid = uid();
            l.push({ id: nid, title: t, from: f, to: to });
            if (!state.activePeriodId) {
                state.activePeriodId = nid;
                saveState(LS_KEYS.ACTIVE_PERIOD);
            }
        }
        DB.save('fiscalPeriods', l);
        clearFiscalForm();
        showToast('✅ دوره مالی ذخیره شد.');
        renderFiscalList();
        updateTopbarPeriod();
        
        var activePage = document.querySelector('.page.active');
        var listTab = activePage ? activePage.querySelector('[data-tab="fiscal-list"]') : null;
        if (listTab) listTab.click();
    });

    var newBtn = document.getElementById('new-fiscal');
    if (newBtn) newBtn.addEventListener('click', clearFiscalForm);

    var filterEl = document.getElementById('fiscal-filter');
    if (filterEl) filterEl.addEventListener('input', renderFiscalList);
}

window.attachRowActions    = attachRowActions;
window.renderFiscalList    = renderFiscalList;
window.refreshPeriodFilters = refreshPeriodFilters;
window.clearFiscalForm     = clearFiscalForm;
window.bindFiscalForm      = bindFiscalForm;

console.log('✅ [modules/accounts/fiscal.js] loaded — v3 active period filter');
