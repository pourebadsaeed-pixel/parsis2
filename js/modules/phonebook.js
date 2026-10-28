/* ============================================================
   پارسیس — دفترچه تلفن (نسخه ۱)
   مسیر: js/modules/phonebook.js
   
   ویژگی‌ها:
     ✅ فیلد نام = ارجاع به اشخاص (searchable)
     ✅ "+" برای افزودن سریع شخص بدون ترک صفحه
     ✅ موبایل از شخص خوانده و به آن نوشته می‌شود
     ✅ فیلد شرکت = ارجاع به شرکت‌ها (searchable)
     ✅ "+" برای افزودن سریع شرکت
     ✅ تب‌های فهرست + تعریف/ویرایش
     ✅ فیلتر شرکت در فهرست
     ✅ همگام با حذف اشخاص/شرکت‌ها
   ============================================================ */
'use strict';

/* ============================================================
   State داخلی
   ============================================================ */
var _pbSelectedPersonId = '';
var _pbSelectedCompanyId = '';

/* ============================================================
   Helpers
   ============================================================ */
function getPhonebook() {
    var l = DB.load('phonebook', []);
    return Array.isArray(l) ? l : [];
}

function savePhonebook(list) {
    DB.save('phonebook', list);
}

function _pbEl(id) {
    var activePage = document.querySelector('.page.active');
    if (activePage) {
        var el = activePage.querySelector('#' + id);
        if (el) return el;
    }
    return document.getElementById(id);
}

function _pbEsc(s) {
    return (typeof esc === 'function') ? esc(s) : String(s || '');
}

function _pbToFa(s) {
    return (typeof toFa === 'function') ? toFa(s) : String(s || '');
}

function _pbNormalizeDigits(s) {
    return (typeof normalizeDigits === 'function') ? normalizeDigits(s) : String(s || '');
}

function _pbToast(msg, ms) {
    if (typeof showToast === 'function') showToast(msg, ms);
}

/* ============================================================
   ساخت searchable select (پشتیبان از window.createSearchableSelect)
   ============================================================ */
function _pbMakeSearchableSelect(containerEl, items, selectedValue, placeholder, onChangeFn) {
    if (!containerEl) return;

    /* اگر تابع اصلی موجود است، از آن استفاده کن */
    if (typeof window.createSearchableSelect === 'function') {
        containerEl.innerHTML = '';
        try {
            var el = window.createSearchableSelect(items, selectedValue || '', placeholder, onChangeFn);
            containerEl.appendChild(el);
            return;
        } catch (e) {
            console.warn('[phonebook] createSearchableSelect failed, fallback to native', e);
        }
    }

    /* Fallback: <select> ساده */
    containerEl.innerHTML = '';
    var sel = document.createElement('select');
    sel.style.cssText = 'width:100%;padding:10px 14px;border-radius:10px;border:1.5px solid var(--border);background:var(--card-solid);font-family:inherit;font-size:0.88rem;color:var(--text)';

    var ph = document.createElement('option');
    ph.value = '';
    ph.textContent = placeholder || '— انتخاب کنید —';
    sel.appendChild(ph);

    items.forEach(function(it) {
        var o = document.createElement('option');
        o.value = it.value;
        o.textContent = it.text;
        if (it.value === selectedValue) o.selected = true;
        sel.appendChild(o);
    });

    sel.addEventListener('change', function() {
        if (onChangeFn) onChangeFn(this.value);
    });

    containerEl.appendChild(sel);
}

/* ============================================================
   Person combo
   ============================================================ */
function refreshPhonebookPersonSelect(selectedId) {
    _pbSelectedPersonId = selectedId || '';
    var container = _pbEl('pb-person-select');
    if (!container) return;

    var persons = DB.load('persons', []) || [];
    var items = persons.map(function(p) {
        var name = ((p.first || '') + ' ' + (p.last || '')).trim();
        return { value: p.id, text: name || ('(شخص ' + String(p.id).substr(0, 4) + ')') };
    });

    _pbMakeSearchableSelect(container, items, selectedId || '', '— انتخاب شخص —', function(val) {
        _pbSelectedPersonId = val;
        var hidden = _pbEl('pb-person-id');
        if (hidden) hidden.value = val;
        onPbPersonChange(val);
    });

    var hidden = _pbEl('pb-person-id');
    if (hidden) hidden.value = selectedId || '';
}

function onPbPersonChange(personId) {
    if (!personId) return;
    var persons = DB.load('persons', []) || [];
    var person = persons.find(function(p) { return p.id === personId; });
    if (!person) return;

    /* فقط اگه فیلد موبایل خالیه، مقدار شخص رو کپی کن
       (تا اگه کاربر قبلاً چیزی تایپ کرده، از دست نره) */
    var mobileEl = _pbEl('pb-mobile');
    if (mobileEl && !mobileEl.value && person.mobile) {
        mobileEl.value = person.mobile;
    }
}

/* ============================================================
   Company combo
   ============================================================ */
function refreshPhonebookCompanySelect(selectedId) {
    _pbSelectedCompanyId = selectedId || '';
    var container = _pbEl('pb-company-select');
    if (!container) return;

    var companies = DB.load('companies', []) || [];
    var items = companies.map(function(c) {
        return { value: c.id, text: c.name || '(بدون نام)' };
    });

    _pbMakeSearchableSelect(container, items, selectedId || '', '— انتخاب شرکت —', function(val) {
        _pbSelectedCompanyId = val;
        var hidden = _pbEl('pb-company-id');
        if (hidden) hidden.value = val;
    });

    var hidden = _pbEl('pb-company-id');
    if (hidden) hidden.value = selectedId || '';
}

/* ============================================================
   Company filter (فهرست)
   ============================================================ */
function refreshPhonebookCompanyFilter() {
    var sel = _pbEl('pb-list-company-filter');
    if (!sel) return;

    var current = sel.value || '';
    var companies = DB.load('companies', []) || [];

    sel.innerHTML = '<option value="">همه شرکت‌ها</option>';
    companies.forEach(function(c) {
        var o = document.createElement('option');
        o.value = c.id;
        o.textContent = c.name || '(بدون نام)';
        sel.appendChild(o);
    });

    if (current) sel.value = current;
}

/* ============================================================
   Modal — افزودن سریع شخص
   ============================================================ */
function openQuickPersonModal() {
    var old = document.getElementById('pb-person-modal');
    if (old) old.remove();
    var oldO = document.getElementById('pb-person-modal-overlay');
    if (oldO) oldO.remove();

    var html =
        '<div id="pb-person-modal-overlay" class="overlay show" style="z-index:1500"></div>' +
        '<div id="pb-person-modal" class="modal show" style="max-width:520px;z-index:1510">' +
            '<div class="modal-head">' +
                '<h2>➕ افزودن شخص جدید</h2>' +
                '<button id="pb-person-modal-close" class="close-btn" type="button">×</button>' +
            '</div>' +
            '<div class="modal-body">' +
                '<p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:14px;line-height:1.9">' +
                    'پس از ذخیره، شخص به‌طور خودکار در فرم دفترچه تلفن انتخاب می‌شود.' +
                '</p>' +
                '<div class="grid-2">' +
                    '<div class="field"><label>نام *</label><input type="text" id="pb-new-pr-first"></div>' +
                    '<div class="field"><label>خانوادگی</label><input type="text" id="pb-new-pr-last"></div>' +
                '</div>' +
                '<div class="grid-2">' +
                    '<div class="field"><label>موبایل</label><input type="text" id="pb-new-pr-mobile" dir="ltr"></div>' +
                    '<div class="field"><label>تلفن</label><input type="text" id="pb-new-pr-phone" dir="ltr"></div>' +
                '</div>' +
                '<div class="field"><label>ایمیل</label><input type="email" id="pb-new-pr-email" dir="ltr"></div>' +
            '</div>' +
            '<div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end">' +
                '<button id="pb-person-modal-cancel" class="btn-secondary" type="button">انصراف</button>' +
                '<button id="pb-person-modal-save" class="btn-primary" type="button">💾 ذخیره و انتخاب</button>' +
            '</div>' +
        '</div>';

    document.body.insertAdjacentHTML('beforeend', html);

    var closeFn = function() {
        var m = document.getElementById('pb-person-modal');
        if (m) m.remove();
        var o = document.getElementById('pb-person-modal-overlay');
        if (o) o.remove();
    };

    document.getElementById('pb-person-modal-close').onclick = closeFn;
    document.getElementById('pb-person-modal-cancel').onclick = closeFn;
    document.getElementById('pb-person-modal-overlay').onclick = closeFn;

    setTimeout(function() {
        var first = document.getElementById('pb-new-pr-first');
        if (first) first.focus();
    }, 100);

    document.getElementById('pb-person-modal-save').onclick = function() {
        var first = (document.getElementById('pb-new-pr-first').value || '').trim();
        var last = (document.getElementById('pb-new-pr-last').value || '').trim();
        var mobile = _pbNormalizeDigits((document.getElementById('pb-new-pr-mobile').value || '').trim());
        var phone = _pbNormalizeDigits((document.getElementById('pb-new-pr-phone').value || '').trim());
        var email = (document.getElementById('pb-new-pr-email').value || '').trim();

        if (!first) { alert('⚠️ نام اجباری است'); return; }

        var newPerson = {
            id: uid(),
            first: first,
            last: last,
            father: '',
            nationalId: '',
            birth: '',
            mobile: mobile,
            phone: phone,
            email: email,
            bankTitle: '',
            acc: '',
            iban: '',
            card: '',
            address: ''
        };

        var persons = DB.load('persons', []) || [];
        persons.push(newPerson);
        DB.save('persons', persons);

        closeFn();

        /* انتخاب خودکار در فرم */
        refreshPhonebookPersonSelect(newPerson.id);

        /* پر کردن موبایل */
        if (mobile) {
            var mobileEl = _pbEl('pb-mobile');
            if (mobileEl) mobileEl.value = mobile;
        }

        _pbToast('✅ شخص «' + first + ' ' + last + '» اضافه شد');

        /* رفرش فهرست اشخاص اگه باز باشد */
        if (typeof renderPersonsList === 'function') {
            try { renderPersonsList(); } catch(e) {}
        }
    };
}

/* ============================================================
   Modal — افزودن سریع شرکت
   ============================================================ */
function openQuickCompanyModal() {
    var old = document.getElementById('pb-company-modal');
    if (old) old.remove();
    var oldO = document.getElementById('pb-company-modal-overlay');
    if (oldO) oldO.remove();

    var html =
        '<div id="pb-company-modal-overlay" class="overlay show" style="z-index:1500"></div>' +
        '<div id="pb-company-modal" class="modal show" style="max-width:480px;z-index:1510">' +
            '<div class="modal-head">' +
                '<h2>➕ افزودن شرکت جدید</h2>' +
                '<button id="pb-company-modal-close" class="close-btn" type="button">×</button>' +
            '</div>' +
            '<div class="modal-body">' +
                '<p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:14px;line-height:1.9">' +
                    'پس از ذخیره، شرکت به‌طور خودکار در فرم انتخاب می‌شود.' +
                '</p>' +
                '<div class="field"><label>نام شرکت *</label><input type="text" id="pb-new-co-name"></div>' +
                '<div class="grid-2">' +
                    '<div class="field"><label>تلفن</label><input type="text" id="pb-new-co-phone" dir="ltr"></div>' +
                    '<div class="field"><label>ایمیل</label><input type="email" id="pb-new-co-email" dir="ltr"></div>' +
                '</div>' +
            '</div>' +
            '<div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end">' +
                '<button id="pb-company-modal-cancel" class="btn-secondary" type="button">انصراف</button>' +
                '<button id="pb-company-modal-save" class="btn-primary" type="button">💾 ذخیره و انتخاب</button>' +
            '</div>' +
        '</div>';

    document.body.insertAdjacentHTML('beforeend', html);

    var closeFn = function() {
        var m = document.getElementById('pb-company-modal');
        if (m) m.remove();
        var o = document.getElementById('pb-company-modal-overlay');
        if (o) o.remove();
    };

    document.getElementById('pb-company-modal-close').onclick = closeFn;
    document.getElementById('pb-company-modal-cancel').onclick = closeFn;
    document.getElementById('pb-company-modal-overlay').onclick = closeFn;

    setTimeout(function() {
        var name = document.getElementById('pb-new-co-name');
        if (name) name.focus();
    }, 100);

    document.getElementById('pb-company-modal-save').onclick = function() {
        var name = (document.getElementById('pb-new-co-name').value || '').trim();
        var phone = _pbNormalizeDigits((document.getElementById('pb-new-co-phone').value || '').trim());
        var email = (document.getElementById('pb-new-co-email').value || '').trim();

        if (!name) { alert('⚠️ نام شرکت اجباری است'); return; }

        var newCompany = {
            id: uid(),
            name: name,
            phone: phone,
            email: email,
            address: ''
        };

        var companies = DB.load('companies', []) || [];
        companies.push(newCompany);
        DB.save('companies', companies);

        closeFn();

        /* انتخاب خودکار + رفرش فیلتر فهرست */
        refreshPhonebookCompanySelect(newCompany.id);
        refreshPhonebookCompanyFilter();

        _pbToast('✅ شرکت «' + name + '» اضافه شد');

        if (typeof renderCompaniesList === 'function') {
            try { renderCompaniesList(); } catch(e) {}
        }
    };
}

/* ============================================================
   رندر فهرست
   ============================================================ */
function renderPhonebookList() {
    var box = _pbEl('pb-list-body');
    if (!box) return;
    box.innerHTML = '';

    var list = getPhonebook();
    var persons = DB.load('persons', []) || [];
    var companies = DB.load('companies', []) || [];

    var pMap = {}, cMap = {};
    persons.forEach(function(p) { pMap[p.id] = p; });
    companies.forEach(function(c) { cMap[c.id] = c; });

    var filterCompanyId = (_pbEl('pb-list-company-filter') || {}).value || '';
    var searchQ = ((_pbEl('pb-list-search') || {}).value || '').toLowerCase();

    var filtered = list.filter(function(item) {
        if (filterCompanyId && item.companyId !== filterCompanyId) return false;
        if (searchQ) {
            var person = pMap[item.personId];
            var name = person ? ((person.first || '') + ' ' + (person.last || '')) : '';
            var hay = (name + ' ' + (item.mobile || '') + ' ' + (item.role || '') + ' ' + (item.extension || '')).toLowerCase();
            if (hay.indexOf(searchQ) === -1) return false;
        }
        return true;
    });

    /* مرتب‌سازی بر اساس نام */
    filtered.sort(function(a, b) {
        var pA = pMap[a.personId];
        var pB = pMap[b.personId];
        var nA = pA ? ((pA.first || '') + ' ' + (pA.last || '')) : '';
        var nB = pB ? ((pB.first || '') + ' ' + (pB.last || '')) : '';
        return nA.localeCompare(nB, 'fa');
    });

    var countEl = _pbEl('pb-count');
    if (countEl) countEl.textContent = _pbToFa(filtered.length);

    if (filtered.length === 0) {
        box.innerHTML = '<tr><td colspan="6" class="empty-row">موردی یافت نشد.</td></tr>';
        return;
    }

    filtered.forEach(function(item) {
        var person = pMap[item.personId];
        var name = person ? ((person.first || '') + ' ' + (person.last || '')).trim() : '— (حذف‌شده)';
        var mobile = item.mobile || (person && person.mobile) || '—';
        var company = cMap[item.companyId] ? cMap[item.companyId].name : '—';

        var tr = document.createElement('tr');
        tr.innerHTML =
            '<td>' + _pbEsc(name) + '</td>' +
            '<td dir="ltr">' + _pbToFa(_pbEsc(mobile)) + '</td>' +
            '<td>' + _pbEsc(item.role || '—') + '</td>' +
            '<td dir="ltr">' + _pbToFa(_pbEsc(item.extension || '—')) + '</td>' +
            '<td>' + _pbEsc(company) + '</td>' +
            '<td><div class="row-actions">' +
                '<button class="row-btn edit" data-id="' + item.id + '">✎</button>' +
                '<button class="row-btn del" data-id="' + item.id + '">×</button>' +
            '</div></td>';
        box.appendChild(tr);
    });

    /* بایند دکمه‌ها */
    box.querySelectorAll('.row-btn.edit').forEach(function(b) {
        b.onclick = function() {
            var id = this.getAttribute('data-id');
            loadPhonebookForEdit(id);
        };
    });

    box.querySelectorAll('.row-btn.del').forEach(function(b) {
        b.onclick = function() {
            var id = this.getAttribute('data-id');
            if (!confirm('این عضو دفترچه تلفن حذف شود؟')) return;

            var l = getPhonebook().filter(function(x) { return x.id !== id; });
            savePhonebook(l);
            renderPhonebookList();
            _pbToast('🗑 حذف شد');
        };
    });
}

/* ============================================================
   بارگذاری برای ویرایش
   ============================================================ */
function loadPhonebookForEdit(id) {
    var item = getPhonebook().find(function(x) { return x.id === id; });
    if (!item) { _pbToast('یافت نشد'); return; }

    var activePage = document.querySelector('.page.active');
    var formTab = activePage ? activePage.querySelector('[data-tab="pb-form"]') : null;
    if (formTab) formTab.click();

    setTimeout(function() {
        var idEl = _pbEl('pb-id');
        if (idEl) idEl.value = item.id;

        refreshPhonebookPersonSelect(item.personId);
        refreshPhonebookCompanySelect(item.companyId);

        var mEl = _pbEl('pb-mobile'); if (mEl) mEl.value = item.mobile || '';
        var rEl = _pbEl('pb-role'); if (rEl) rEl.value = item.role || '';
        var eEl = _pbEl('pb-extension'); if (eEl) eEl.value = item.extension || '';

        var saveBtn = _pbEl('pb-save');
        if (saveBtn) saveBtn.innerHTML = '💾 ذخیره تغییرات';
    }, 120);
}

/* ============================================================
   خالی کردن فرم
   ============================================================ */
function clearPhonebookForm() {
    var idEl = _pbEl('pb-id'); if (idEl) idEl.value = '';
    var mEl = _pbEl('pb-mobile'); if (mEl) mEl.value = '';
    var rEl = _pbEl('pb-role'); if (rEl) rEl.value = '';
    var eEl = _pbEl('pb-extension'); if (eEl) eEl.value = '';

    refreshPhonebookPersonSelect('');
    refreshPhonebookCompanySelect('');

    var saveBtn = _pbEl('pb-save');
    if (saveBtn) saveBtn.innerHTML = '💾 ذخیره';
}

/* ============================================================
   ذخیره
   ============================================================ */
function savePhonebookEntry() {
    var id = (_pbEl('pb-id') || {}).value || '';
    var personId = _pbSelectedPersonId;
    var companyId = _pbSelectedCompanyId;
    var mobile = _pbNormalizeDigits(((_pbEl('pb-mobile') || {}).value || '').trim());
    var role = ((_pbEl('pb-role') || {}).value || '').trim();
    var extension = _pbNormalizeDigits(((_pbEl('pb-extension') || {}).value || '').trim());

    if (!personId) { alert('⚠️ لطفاً شخص را انتخاب کنید.'); return; }

    /* بررسی تکراری: آیا همین شخص قبلاً در دفترچه هست؟ */
    var list = getPhonebook();
    var dup = list.find(function(x) { return x.id !== id && x.personId === personId; });
    if (dup && !id) {
        if (!confirm('⚠️ این شخص قبلاً در دفترچه تلفن ثبت شده.\nآیا می‌خواهید رکورد جدید هم اضافه شود؟')) return;
    }

    var item = {
        id: id || uid(),
        personId: personId,
        mobile: mobile,
        role: role,
        extension: extension,
        companyId: companyId
    };

    if (id) {
        var idx = list.findIndex(function(x) { return x.id === id; });
        if (idx !== -1) list[idx] = item;
        else list.push(item);
    } else {
        list.push(item);
    }
    savePhonebook(list);

    /* ✅ همگام‌سازی موبایل با شخص */
    var syncedMobile = false;
    if (mobile) {
        var persons = DB.load('persons', []) || [];
        var person = persons.find(function(p) { return p.id === personId; });
        if (person && person.mobile !== mobile) {
            person.mobile = mobile;
            DB.save('persons', persons);
            syncedMobile = true;
        }
    }

    _pbToast(
        syncedMobile
            ? '✅ ذخیره شد (شماره همراه به شخص نیز بروزرسانی شد)'
            : '✅ ذخیره شد',
        4000
    );

    clearPhonebookForm();
    renderPhonebookList();

    var activePage = document.querySelector('.page.active');
    var listTab = activePage ? activePage.querySelector('[data-tab="pb-list"]') : null;
    if (listTab) listTab.click();
}

/* ============================================================
   بایند فرم و دکمه‌ها
   ============================================================ */
function bindPhonebookForm() {
    /* رفرش اولیه */
    refreshPhonebookPersonSelect(_pbSelectedPersonId || '');
    refreshPhonebookCompanySelect(_pbSelectedCompanyId || '');
    refreshPhonebookCompanyFilter();

    /* دکمه ذخیره */
    var saveBtn = _pbEl('pb-save');
    if (saveBtn && !saveBtn.dataset.bound) {
        saveBtn.dataset.bound = '1';
        saveBtn.onclick = savePhonebookEntry;
    }

    /* دکمه جدید */
    var newBtn = _pbEl('pb-new');
    if (newBtn && !newBtn.dataset.bound) {
        newBtn.dataset.bound = '1';
        newBtn.onclick = function() {
            clearPhonebookForm();
            _pbToast('📝 فرم خالی شد');
        };
    }

    /* دکمه + شخص */
    var addPersonBtn = _pbEl('pb-person-add');
    if (addPersonBtn && !addPersonBtn.dataset.bound) {
        addPersonBtn.dataset.bound = '1';
        addPersonBtn.onclick = openQuickPersonModal;
    }

    /* دکمه + شرکت */
    var addCompanyBtn = _pbEl('pb-company-add');
    if (addCompanyBtn && !addCompanyBtn.dataset.bound) {
        addCompanyBtn.dataset.bound = '1';
        addCompanyBtn.onclick = openQuickCompanyModal;
    }

    /* فیلتر شرکت */
    var companyFilter = _pbEl('pb-list-company-filter');
    if (companyFilter && !companyFilter.dataset.bound) {
        companyFilter.dataset.bound = '1';
        companyFilter.onchange = renderPhonebookList;
    }

    /* جستجو */
    var searchInput = _pbEl('pb-list-search');
    if (searchInput && !searchInput.dataset.bound) {
        searchInput.dataset.bound = '1';
        searchInput.oninput = renderPhonebookList;
    }
}

/* ============================================================
   Init صفحه
   ============================================================ */
function initPhonebookPage() {
    bindPhonebookForm();
    renderPhonebookList();

    /* در صورت باز شدن تب ذخیره‌شده، حالت فرم را ریست کن */
    var idEl = _pbEl('pb-id');
    if (idEl && !idEl.value) {
        var mobileEl = _pbEl('pb-mobile');
        if (mobileEl) mobileEl.value = '';
    }
}

/* ============================================================
   صادرسازی
   ============================================================ */
window.getPhonebook               = getPhonebook;
window.savePhonebook              = savePhonebook;
window.refreshPhonebookPersonSelect = refreshPhonebookPersonSelect;
window.refreshPhonebookCompanySelect = refreshPhonebookCompanySelect;
window.refreshPhonebookCompanyFilter = refreshPhonebookCompanyFilter;
window.renderPhonebookList        = renderPhonebookList;
window.loadPhonebookForEdit       = loadPhonebookForEdit;
window.clearPhonebookForm         = clearPhonebookForm;
window.savePhonebookEntry         = savePhonebookEntry;
window.bindPhonebookForm          = bindPhonebookForm;
window.initPhonebookPage          = initPhonebookPage;
window.openQuickPersonModal       = openQuickPersonModal;
window.openQuickCompanyModal      = openQuickCompanyModal;

console.log('✅ [modules/phonebook.js] loaded');
