/* ============================================================
   پارسیس — اشخاص (نسخه ضد باگ با فیلتر قیفی)
   مسیر: js/modules/persons.js
   
   ✅ v2.1:
     • رفع باگ «نام اجباری» هنگام ذخیره با نام پر
       علت: addEventListener بدون data-bound → listener تکراری
       راه‌حل: data-bound guard + activePage.querySelector
   
   ✅ v2:
     • فیلد showInBirthdayWidget (نمایش در ویجت تولدها)
     • چک‌باکس قابل کلیک در فهرست (کنار نام)
     • چک‌باکس در فرم (بالای دکمه‌های ذخیره)
   ============================================================ */
'use strict';

/* ============================================================
   ✅ تزریق چک‌باکس «نمایش در ویجت تولدها» در فرم
   ============================================================ */
function _injectPersonsWidgetCheckbox() {
    var prIdEl = document.getElementById('pr-id');
    if (!prIdEl) return;

    var formCard = prIdEl.closest('.card');
    if (!formCard) return;
    if (formCard.querySelector('#pr-show-in-widget')) return;

    var formButtons = formCard.querySelector('.form-buttons');

    var wrapper = document.createElement('div');
    wrapper.className = 'field';
    wrapper.style.cssText = 'padding:14px;background:var(--card-alt);border-radius:12px;border:1.5px solid var(--primary-light);margin-bottom:12px';
    wrapper.innerHTML =
        '<label class="checkbox-item" style="margin:0;cursor:pointer;background:none;padding:0;display:flex;align-items:flex-start;gap:10px">'
        +   '<input type="checkbox" id="pr-show-in-widget" checked style="width:20px;height:20px;accent-color:var(--primary);flex-shrink:0;margin-top:2px;cursor:pointer">'
        +   '<div style="flex:1">'
        +     '<div style="font-weight:800;color:var(--primary-dark);font-size:0.9rem">🎂 نمایش در ویجت تولدهای پیش‌رو</div>'
        +     '<div style="font-size:0.72rem;color:var(--text-muted);margin-top:6px;line-height:1.8">'
        +       '💡 فقط اشخاصی که این گزینه فعال باشد در ویجت تولدهای صفحه اصلی نمایش داده می‌شوند.'
        +     '</div>'
        +   '</div>'
        + '</label>';

    if (formButtons) {
        formButtons.parentNode.insertBefore(wrapper, formButtons);
    } else {
        formCard.appendChild(wrapper);
    }
}

/* ============================================================
   رندر فهرست
   ============================================================ */
function renderPersonsList() {
    var list = (typeof permsFilterList === 'function' ? permsFilterList('person', DB.load('persons', [])) : DB.load('persons', []));
    if (!Array.isArray(list)) list = [];
    list = list.filter(function (x) { return x && typeof x === 'object'; });

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
    } catch (e) { console.warn('Sort error:', e); }

    for (var i = 0; i < filtered.length; i++) {
        var p = filtered[i];
        shown++;
        var showInWidget = (p.showInBirthdayWidget !== false);
        var tr = document.createElement('tr');
        tr.innerHTML =
              '<td>'
            +   '<label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer" title="نمایش در ویجت تولدهای پیش‌رو">'
            +     '<input type="checkbox" class="pr-widget-cb" data-id="' + p.id + '"' + (showInWidget ? ' checked' : '')
            +       ' style="width:16px;height:16px;accent-color:var(--primary);cursor:pointer;flex-shrink:0">'
            +     '<span style="font-size:0.9rem;line-height:1">🎂</span>'
            +     '<span>' + esc(p.first) + '</span>'
            +   '</label>'
            + '</td>'
            + '<td>' + esc(p.last) + '</td>'
            + '<td dir="ltr">' + toFa(esc(p.nationalId || '—')) + '</td>'
            + '<td dir="ltr">' + toFa(esc(p.birth || '—')) + '</td>'
            + '<td dir="ltr">' + toFa(esc(p.mobile || '—')) + '</td>'
            + '<td dir="ltr">' + esc(p.email || '—') + '</td>'
            + '<td><div class="row-actions">'
            +   '<button class="row-btn edit" data-id="' + p.id + '">✎</button>'
            +   '<button class="row-btn del" data-id="' + p.id + '">×</button>'
            + '</div></td>';
        tb.appendChild(tr);
    }

    if (shown === 0) {
        tb.innerHTML = '<tr><td colspan="7" class="empty-row">یافت نشد.</td></tr>';
    }

    var countEl = document.getElementById('persons-count');
    if (countEl) countEl.textContent = toFa(shown);

    /* ✅ بایند چک‌باکس‌های ویجت */
    tb.querySelectorAll('.pr-widget-cb').forEach(function (cb) {
        cb.addEventListener('click', function (e) { e.stopPropagation(); });
        cb.addEventListener('change', function (e) {
            e.stopPropagation();
            var id = this.getAttribute('data-id');
            var checked = this.checked;
            var all = DB.load('persons', []);
            if (!Array.isArray(all)) all = [];
            for (var k = 0; k < all.length; k++) {
                if (all[k].id === id) {
                    all[k].showInBirthdayWidget = checked;
                    break;
                }
            }
            DB.save('persons', all);
            if (typeof updateHomeWidgets === 'function') updateHomeWidgets();
            if (typeof showToast === 'function') {
                showToast(checked
                    ? '🎂 در ویجت تولدها نمایش داده می‌شود'
                    : '🚫 از ویجت تولدها حذف شد');
            }
        });
    });

    attachRowActions(tb, 'persons', renderPersonsList, function (p) {
        var activePage = document.querySelector('.page.active');
        var base = activePage || document;

        var idEl = base.querySelector('#pr-id'); if (idEl) idEl.value = p.id;
        var el;
        el = base.querySelector('#pr-first');        if (el) el.value = p.first || '';
        el = base.querySelector('#pr-last');         if (el) el.value = p.last || '';
        el = base.querySelector('#pr-father');       if (el) el.value = p.father || '';
        el = base.querySelector('#pr-national-id');  if (el) el.value = p.nationalId || '';
        el = base.querySelector('#pr-birth');        if (el) el.value = p.birth || '';
        el = base.querySelector('#pr-mobile');       if (el) el.value = p.mobile || '';
        el = base.querySelector('#pr-phone');        if (el) el.value = p.phone || '';
        el = base.querySelector('#pr-email');        if (el) el.value = p.email || '';
        el = base.querySelector('#pr-bank-title');   if (el) el.value = p.bankTitle || '';
        el = base.querySelector('#pr-acc');          if (el) el.value = p.acc || '';
        el = base.querySelector('#pr-iban');         if (el) el.value = p.iban || '';
        el = base.querySelector('#pr-card');         if (el) el.value = p.card || '';
        el = base.querySelector('#pr-address');      if (el) el.value = p.address || '';

        /* ✅ بارگذاری وضعیت چک‌باکس ویجت */
        _injectPersonsWidgetCheckbox();
        var wEl = base.querySelector('#pr-show-in-widget');
        if (wEl) wEl.checked = (p.showInBirthdayWidget !== false);

        var addTab = activePage ? activePage.querySelector('[data-tab="persons-add"]') : null;
        if (addTab) addTab.click();
    });

    if (typeof applyColVisibility === 'function') applyColVisibility('persons-table');
    if (typeof makeTableResizable === 'function') makeTableResizable(document.getElementById('persons-table'));
    if (typeof attachTableSorting === 'function') attachTableSorting('persons-table', renderPersonsList);
    if (typeof applySortIndicator === 'function') applySortIndicator('persons-table');

    if (typeof buildFilterRow === 'function') buildFilterRow(document.getElementById('persons-table'));
}

/* ============================================================
   خالی کردن فرم
   ============================================================ */
function clearPersonForm() {
    var activePage = document.querySelector('.page.active');
    var base = activePage || document;

    var ids = ['pr-id', 'pr-first', 'pr-last', 'pr-father', 'pr-national-id', 'pr-birth', 'pr-mobile', 'pr-phone', 'pr-email', 'pr-bank-title', 'pr-acc', 'pr-iban', 'pr-card', 'pr-address'];
    ids.forEach(function (id) {
        var el = base.querySelector('#' + id);
        if (el) el.value = '';
    });

    /* ✅ ریست چک‌باکس ویجت به «تیک‌خورده» (پیش‌فرض برای شخص جدید) */
    _injectPersonsWidgetCheckbox();
    var wEl = base.querySelector('#pr-show-in-widget');
    if (wEl) wEl.checked = true;
}

/* ============================================================
   ✅ بایند فرم — نسخه v2.1 (data-bound guard)
   ============================================================ */
function bindPersonsForm() {
    _injectPersonsWidgetCheckbox();

    /* ✅ data-bound: هر listener فقط یک بار متصل می‌شود */
    var saveBtn = document.getElementById('save-person');
    if (saveBtn && !saveBtn.dataset.bound) {
        saveBtn.dataset.bound = '1';
        saveBtn.addEventListener('click', function () {
            var activePage = document.querySelector('.page.active');
            if (!activePage) return;

            function _val(sel) {
                var el = activePage.querySelector('#' + sel);
                return el ? el.value : '';
            }

            var f = _val('pr-first').trim();
            if (!f) { alert('نام اجباری.'); return; }

            var id = _val('pr-id');
            var wEl = activePage.querySelector('#pr-show-in-widget');
            var showInWidget = wEl ? wEl.checked : true;

            var o = {
                id: id || uid(),
                first: f,
                last: _val('pr-last').trim(),
                father: _val('pr-father').trim(),
                nationalId: normalizeDigits(_val('pr-national-id').trim()),
                birth: normalizeDigits(_val('pr-birth').trim()),
                mobile: normalizeDigits(_val('pr-mobile').trim()),
                phone: normalizeDigits(_val('pr-phone').trim()),
                email: _val('pr-email').trim(),
                bankTitle: _val('pr-bank-title').trim(),
                acc: normalizeDigits(_val('pr-acc').trim()),
                iban: _val('pr-iban').trim(),
                card: normalizeDigits(_val('pr-card').trim()),
                address: _val('pr-address').trim(),
                showInBirthdayWidget: showInWidget
            };

            var l = DB.load('persons', []);
            if (!Array.isArray(l)) l = [];
            /* ✅ v2.4.0 — ثبت در تاریخچه تغییر وضعیت */
            var _before = null;
            if (id) { for (var i2 = 0; i2 < l.length; i2++) { if (l[i2].id === id) _before = l[i2]; } }
            if (id) {
                for (var i = 0; i < l.length; i++) { if (l[i].id === id) l[i] = o; }
            } else {
                l.push(o);
            }
            try { if (typeof Hist !== 'undefined' && Hist.log) Hist.log('persons', o.id, _before ? 'ویرایش' : 'ایجاد', _before, o); } catch (eH) {}
            DB.save('persons', l);
            showToast('✅ شخص ذخیره شد.');
            clearPersonForm();
            renderPersonsList();
            if (typeof updateHomeWidgets === 'function') updateHomeWidgets();

            var listTab = activePage.querySelector('[data-tab="persons-list"]');
            if (listTab) listTab.click();
        });
    }

    var newBtn = document.getElementById('new-person');
    if (newBtn && !newBtn.dataset.bound) {
        newBtn.dataset.bound = '1';
        newBtn.addEventListener('click', clearPersonForm);
    }

    var filterEl = document.getElementById('persons-filter');
    if (filterEl && !filterEl.dataset.bound) {
        filterEl.dataset.bound = '1';
        filterEl.addEventListener('input', renderPersonsList);
    }
}

/* ============================================================
   صادرسازی
   ============================================================ */
window.renderPersonsList  = renderPersonsList;
window.clearPersonForm    = clearPersonForm;
window.bindPersonsForm    = bindPersonsForm;

console.log('✅ [modules/persons.js] loaded — v2.1 (fixed duplicate save listener + widget toggle)');
