/* ============================================================
   پارسیس — دفترچه تلفن (نسخه ۲.۳)
   مسیر: js/modules/phonebook.js
   
   تغییرات v2.3:
     ✅ فایل نمونه اکسل: افزودن ستون‌های «موبایل» و «داخلی»
     ✅ Import: خواندن موبایل و داخلی از اکسل
     ✅ Import: به‌روزرسانی موبایل پروفایل شخص در صورت تفاوت
     ✅ Import: ذخیره موبایل و داخلی در رکورد دفترچه
     ✅ گزارش ۴ شمارنده (شامل موبایل‌های به‌روزرسانی‌شده)
   
   تغییرات v2.2:
     ✅ افزوده: دکمه و تابع دانلود فایل نمونه اکسل (Template)
     ✅ تزریق خودکار دکمه «📥 فایل نمونه» کنار «📤 دریافت از اکسل»
   
   تغییرات v2.1:
     ✅ رفع باگ کار نکردن دکمه اکسل
     ✅ ایجاد خودکار input file مخفی
     ✅ واحد سازمانی و ایمپورت هوشمند اکسل
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

/* ✅ v2.7.1 — عنوان نمایشی مخاطب برای تاریخچه تغییر وضعیت */
function _pbEntryTitle(item) {
    try {
        var p = (DB.load('persons', []) || []).filter(function (x) { return x && x.id === item.personId; })[0];
        var nm = p ? ((p.first || '') + ' ' + (p.last || '')).trim() : '';
        if (!nm) nm = 'مخاطب';
        var co = (DB.load('companies', []) || []).filter(function (x) { return x && x.id === item.companyId; })[0];
        return nm + (co && co.name ? ' — ' + co.name : '');
    } catch (e) { return 'مخاطب'; }
}

/* ============================================================
   ✅ تزریق فیلد واحد سازمانی + دکمه‌های اکسل
   ============================================================ */
function _injectPBNewElements() {
    // 1. تزریق فیلد واحد سازمانی در فرم (اگر در HTML نبود)
    if (!document.getElementById('pb-org-unit')) {
        var roleEl = document.getElementById('pb-role');
        if (roleEl) {
            var roleField = roleEl.closest('.field');
            if (roleField) {
                var orgField = document.createElement('div');
                orgField.className = 'field';
                orgField.innerHTML = '<label>واحد سازمانی</label><input type="text" id="pb-org-unit" placeholder="مثلاً: فنی و مهندسی">';
                roleField.parentNode.insertBefore(orgField, roleField.nextSibling);
            }
        }
    }

    // 2. اطمینان از وجود input file و دکمه‌های اکسل
    var header = document.querySelector('#page-phonebook .list-header');
    if (header) {
        var importBtn = document.getElementById('pb-import-btn');
        var templateBtn = document.getElementById('pb-template-btn');
        var fileInput = document.getElementById('pb-import-file');

        // اگر input file وجود نداشت، بساز و مخفی کن
        if (!fileInput) {
            fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.id = 'pb-import-file';
            fileInput.accept = '.xlsx, .xls, .csv';
            fileInput.style.display = 'none';
            header.appendChild(fileInput);
        }

        // اگر دکمه import وجود نداشت، بساز
        if (!importBtn) {
            importBtn = document.createElement('button');
            importBtn.id = 'pb-import-btn';
            importBtn.className = 'export-btn';
            importBtn.style.cssText = 'background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none';
            importBtn.innerHTML = '📤 دریافت از اکسل';
            var exportBtn = header.querySelector('[data-export="phonebook"]');
            if (exportBtn) {
                header.insertBefore(importBtn, exportBtn);
            } else {
                header.appendChild(importBtn);
            }
        }

        // اگر دکمه «فایل نمونه» وجود نداشت، بساز و قبل از import قرار بده
        if (!templateBtn) {
            templateBtn = document.createElement('button');
            templateBtn.id = 'pb-template-btn';
            templateBtn.className = 'export-btn';
            templateBtn.style.cssText = 'background:#dbeafe;color:#1e40af;border:none';
            templateBtn.innerHTML = '📥 فایل نمونه';
            templateBtn.title = 'دانلود فایل نمونه اکسل';
            if (importBtn && importBtn.parentNode) {
                importBtn.parentNode.insertBefore(templateBtn, importBtn);
            } else {
                var exportBtn2 = header.querySelector('[data-export="phonebook"]');
                if (exportBtn2) {
                    header.insertBefore(templateBtn, exportBtn2);
                } else {
                    header.appendChild(templateBtn);
                }
            }
        }

        // اتصال رویداد دکمه «فایل نمونه»
        if (!templateBtn.dataset.bound) {
            templateBtn.dataset.bound = '1';
            templateBtn.onclick = function (e) {
                e.preventDefault();
                downloadPhonebookTemplate();
            };
        }

        // اتصال رویداد دکمه import
        if (!importBtn.dataset.bound) {
            importBtn.dataset.bound = '1';
            importBtn.onclick = function (e) {
                e.preventDefault();
                var fileInp = document.getElementById('pb-import-file');
                if (fileInp) fileInp.click();
            };
        }

        if (!fileInput.dataset.bound) {
            fileInput.dataset.bound = '1';
            fileInput.onchange = function (e) {
                if (e.target.files && e.target.files[0]) {
                    importPhonebookFromExcel(e.target.files[0]);
                    this.value = '';
                }
            };
        }
    }
}

/* ============================================================
   ساخت searchable select
   ============================================================ */
function _pbMakeSearchableSelect(containerEl, items, selectedValue, placeholder, onChangeFn) {
    if (!containerEl) return;

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

    containerEl.innerHTML = '';
    var sel = document.createElement('select');
    sel.style.cssText = 'width:100%;padding:10px 14px;border-radius:10px;border:1.5px solid var(--border);background:var(--card-solid);font-family:inherit;font-size:0.88rem;color:var(--text)';

    var ph = document.createElement('option');
    ph.value = '';
    ph.textContent = placeholder || '— انتخاب کنید —';
    sel.appendChild(ph);

    items.forEach(function (it) {
        var o = document.createElement('option');
        o.value = it.value;
        o.textContent = it.text;
        if (it.value === selectedValue) o.selected = true;
        sel.appendChild(o);
    });

    sel.addEventListener('change', function () {
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
    var items = persons.map(function (p) {
        var name = ((p.first || '') + ' ' + (p.last || '')).trim();
        return { value: p.id, text: name || ('(شخص ' + String(p.id).substr(0, 4) + ')') };
    });

    _pbMakeSearchableSelect(container, items, selectedId || '', '— انتخاب شخص —', function (val) {
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
    var person = persons.find(function (p) { return p.id === personId; });
    if (!person) return;

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
    var items = companies.map(function (c) {
        return { value: c.id, text: c.name || '(بدون نام)' };
    });

    _pbMakeSearchableSelect(container, items, selectedId || '', '— انتخاب شرکت —', function (val) {
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
    companies.forEach(function (c) {
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
                    'پس از ذخیره، شخص به‌طور خودکار در فرم انتخاب می‌شود.' +
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

    var closeFn = function () {
        var m = document.getElementById('pb-person-modal');
        if (m) m.remove();
        var o = document.getElementById('pb-person-modal-overlay');
        if (o) o.remove();
    };

    document.getElementById('pb-person-modal-close').onclick = closeFn;
    document.getElementById('pb-person-modal-cancel').onclick = closeFn;
    document.getElementById('pb-person-modal-overlay').onclick = closeFn;

    setTimeout(function () {
        var first = document.getElementById('pb-new-pr-first');
        if (first) first.focus();
    }, 100);

    document.getElementById('pb-person-modal-save').onclick = function () {
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

        refreshPhonebookPersonSelect(newPerson.id);

        if (mobile) {
            var mobileEl = _pbEl('pb-mobile');
            if (mobileEl) mobileEl.value = mobile;
        }

        _pbToast('✅ شخص «' + first + ' ' + last + '» اضافه شد');

        if (typeof renderPersonsList === 'function') {
            try { renderPersonsList(); } catch (e) {}
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

    var closeFn = function () {
        var m = document.getElementById('pb-company-modal');
        if (m) m.remove();
        var o = document.getElementById('pb-company-modal-overlay');
        if (o) o.remove();
    };

    document.getElementById('pb-company-modal-close').onclick = closeFn;
    document.getElementById('pb-company-modal-cancel').onclick = closeFn;
    document.getElementById('pb-company-modal-overlay').onclick = closeFn;

    setTimeout(function () {
        var name = document.getElementById('pb-new-co-name');
        if (name) name.focus();
    }, 100);

    document.getElementById('pb-company-modal-save').onclick = function () {
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

        refreshPhonebookCompanySelect(newCompany.id);
        refreshPhonebookCompanyFilter();

        _pbToast('✅ شرکت «' + name + '» اضافه شد');

        if (typeof renderCompaniesList === 'function') {
            try { renderCompaniesList(); } catch (e) {}
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
    persons.forEach(function (p) { pMap[p.id] = p; });
    companies.forEach(function (c) { cMap[c.id] = c; });

    var filterCompanyId = (_pbEl('pb-list-company-filter') || {}).value || '';
    var searchQ = ((_pbEl('pb-list-search') || {}).value || '').toLowerCase();

    var filtered = list.filter(function (item) {
        if (filterCompanyId && item.companyId !== filterCompanyId) return false;
        if (searchQ) {
            var person = pMap[item.personId];
            var name = person ? ((person.first || '') + ' ' + (person.last || '')) : '';
            var hay = (name + ' ' + (item.mobile || '') + ' ' + (item.role || '') + ' ' + (item.orgUnit || '') + ' ' + (item.extension || '')).toLowerCase();
            if (hay.indexOf(searchQ) === -1) return false;
        }
        return true;
    });

    filtered.sort(function (a, b) {
        var pA = pMap[a.personId];
        var pB = pMap[b.personId];
        var nA = pA ? ((pA.first || '') + ' ' + (pA.last || '')) : '';
        var nB = pB ? ((pB.first || '') + ' ' + (pB.last || '')) : '';
        return nA.localeCompare(nB, 'fa');
    });

    var countEl = _pbEl('pb-count');
    if (countEl) countEl.textContent = _pbToFa(filtered.length);

    if (filtered.length === 0) {
        box.innerHTML = '<tr><td colspan="7" class="empty-row">موردی یافت نشد.</td></tr>';
        return;
    }

    filtered.forEach(function (item) {
        var person = pMap[item.personId];
        var name = person ? ((person.first || '') + ' ' + (person.last || '')).trim() : '— (حذف‌شده)';
        var mobile = item.mobile || (person && person.mobile) || '—';
        var company = cMap[item.companyId] ? cMap[item.companyId].name : '—';

        var tr = document.createElement('tr');
        tr.innerHTML =
            '<td>' + _pbEsc(name) + '</td>' +
            '<td dir="ltr">' + _pbToFa(_pbEsc(mobile)) + '</td>' +
            '<td>' + _pbEsc(item.orgUnit || '—') + '</td>' +
            '<td>' + _pbEsc(item.role || '—') + '</td>' +
            '<td dir="ltr">' + _pbToFa(_pbEsc(item.extension || '—')) + '</td>' +
            '<td>' + _pbEsc(company) + '</td>' +
            '<td><div class="row-actions">' +
                '<button class="row-btn edit" data-id="' + item.id + '">✎</button>' +
                '<button class="row-btn del" data-id="' + item.id + '">×</button>' +
            '</div></td>';
        box.appendChild(tr);
    });

    box.querySelectorAll('.row-btn.edit').forEach(function (b) {
        b.onclick = function () {
            var id = this.getAttribute('data-id');
            loadPhonebookForEdit(id);
        };
    });

    box.querySelectorAll('.row-btn.del').forEach(function (b) {
        b.onclick = function () {
            var id = this.getAttribute('data-id');
            if (!confirm('این عضو دفترچه تلفن حذف شود؟')) return;

            /* ✅ v2.7.1 — ثبت حذف مخاطب در تاریخچه تغییر وضعیت */
            try {
                var _pbDel = getPhonebook().filter(function (x) { return x.id === id; })[0];
                if (_pbDel && typeof Hist !== 'undefined' && Hist.log) {
                    var _pbLbl = _pbEntryTitle(_pbDel);
                    Hist.log('phonebook', id, 'حذف', _pbDel, null, _pbLbl);
                }
            } catch (eH) {}
            var l = getPhonebook().filter(function (x) { return x.id !== id; });
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
    var item = getPhonebook().find(function (x) { return x.id === id; });
    if (!item) { _pbToast('یافت نشد'); return; }

    var activePage = document.querySelector('.page.active');
    var formTab = activePage ? activePage.querySelector('[data-tab="pb-form"]') : null;
    if (formTab) formTab.click();

    setTimeout(function () {
        var idEl = _pbEl('pb-id');
        if (idEl) idEl.value = item.id;

        refreshPhonebookPersonSelect(item.personId);
        refreshPhonebookCompanySelect(item.companyId);

        var mEl = _pbEl('pb-mobile'); if (mEl) mEl.value = item.mobile || '';
        var oEl = _pbEl('pb-org-unit'); if (oEl) oEl.value = item.orgUnit || '';
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
    var oEl = _pbEl('pb-org-unit'); if (oEl) oEl.value = '';
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
    var orgUnit = ((_pbEl('pb-org-unit') || {}).value || '').trim();
    var role = ((_pbEl('pb-role') || {}).value || '').trim();
    var extension = _pbNormalizeDigits(((_pbEl('pb-extension') || {}).value || '').trim());

    if (!personId) { alert('⚠️ لطفاً شخص را انتخاب کنید.'); return; }

    var list = getPhonebook();
    var dup = list.find(function (x) { return x.id !== id && x.personId === personId; });
    if (dup && !id) {
        if (!confirm('⚠️ این شخص قبلاً در دفترچه تلفن ثبت شده.\nآیا می‌خواهید رکورد جدید هم اضافه شود؟')) return;
    }

    var item = {
        id: id || uid(),
        personId: personId,
        mobile: mobile,
        orgUnit: orgUnit,
        role: role,
        extension: extension,
        companyId: companyId
    };

    if (id) {
        var idx = list.findIndex(function (x) { return x.id === id; });
        /* ✅ v2.7.1 — ثبت ایجاد/ویرایش مخاطب در تاریخچه تغییر وضعیت */
        var _pbBefore = (idx !== -1) ? JSON.parse(JSON.stringify(list[idx])) : null;
        if (idx !== -1) list[idx] = item;
        else list.push(item);
        try { if (typeof Hist !== 'undefined' && Hist.log) Hist.log('phonebook', item.id, _pbBefore ? 'ویرایش' : 'ایجاد', _pbBefore, item, _pbEntryTitle(item)); } catch (eH2) {}
    } else {
        list.push(item);
        try { if (typeof Hist !== 'undefined' && Hist.log) Hist.log('phonebook', item.id, 'ایجاد', null, item, _pbEntryTitle(item)); } catch (eH3) {}
    }
    savePhonebook(list);

    var syncedMobile = false;
    if (mobile) {
        var persons = DB.load('persons', []) || [];
        var person = persons.find(function (p) { return p.id === personId; });
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
   ✅ دانلود فایل نمونه اکسل (v2.3 — شامل موبایل و داخلی)
   ============================================================ */
function downloadPhonebookTemplate() {
    if (typeof XLSX === 'undefined') {
        alert('⚠️ کتابخانه اکسل (SheetJS) بارگذاری نشده است. اتصال اینترنت را بررسی کنید.');
        return;
    }

    var data = [
        ['نام', 'نام خانوادگی', 'موبایل', 'داخلی', 'واحد سازمانی', 'سمت', 'شرکت'],
        ['علی',  'رضایی',  '09121234567', '123', 'فنی و مهندسی', 'مدیر فروش', 'شرکت نمونه'],
        ['مریم', 'احمدی',  '09351234567', '456', 'مالی',         'حسابدار',   ''],
        ['حسین', 'کریمی',  '',            '789', 'بازاریابی',    'کارشناس',   '']
    ];

    var ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
        { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 10 }, { wch: 20 }, { wch: 18 }, { wch: 22 }
    ];

    var helpData = [
        ['راهنمای تکمیل فایل دریافت از اکسل — دفترچه تلفن پارسیس'],
        [''],
        ['📝 ستون‌های فایل:'],
        ['1) نام — اجباری (نام کوچک)'],
        ['2) نام خانوادگی — اجباری'],
        ['3) موبایل — اختیاری (اگر خالی باشد از موبایل شخص استفاده می‌شود)'],
        ['4) داخلی — اختیاری (شماره داخلی سازمانی)'],
        ['5) واحد سازمانی — اختیاری'],
        ['6) سمت — اختیاری'],
        ['7) شرکت — اختیاری (اگر در «شرکت‌ها» نباشد، خودکار ساخته می‌شود)'],
        [''],
        ['💡 رفتار هوشمند سیستم:'],
        ['• اگر شخصی با همان «نام + نام خانوادگی» وجود داشته باشد → به آن متصل می‌شود'],
        ['• اگر شخص وجود نداشته باشد → خودکار در صفحه «اشخاص» ایجاد می‌شود'],
        ['• اگر شرکت وجود نداشته باشد → خودکار در صفحه «شرکت‌ها» ایجاد می‌شود'],
        ['• اگر «موبایل» در اکسل باشد → هم در دفترچه و هم در پروفایل شخص ذخیره می‌شود'],
        ['• اگر شخص قبلاً در دفترچه باشد → واحد/سمت/داخلی/موبایل به‌روزرسانی می‌شوند'],
        [''],
        ['⚠️ نکات مهم:'],
        ['• ردیف اول فایل باید هدرها باشد (نباید حذف شود)'],
        ['• ردیف‌های خالی به‌طور خودکار نادیده گرفته می‌شوند'],
        ['• ستون‌های «نام» و «نام خانوادگی» باید دقیقاً با همین نام حفظ شوند'],
        ['• بقیه ستون‌ها با جستجوی کلمات کلیدی پیدا می‌شوند (حساس به ترتیب نیستند)'],
        [''],
        ['🔢 نمونه فایل:'],
        ['• ردیف ۱: علی رضایی + موبایل + داخلی + شرکت → شخص و شرکت جدید ایجاد می‌شوند'],
        ['• ردیف ۲: مریم احمدی + موبایل + داخلی (بدون شرکت)'],
        ['• ردیف ۳: حسین کریمی + داخلی (بدون موبایل — موبایل شخص دست نمی‌خورد)']
    ];

    var wsHelp = XLSX.utils.aoa_to_sheet(helpData);
    wsHelp['!cols'] = [{ wch: 70 }];

    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.utils.book_append_sheet(wb, wsHelp, 'راهنما');
    XLSX.writeFile(wb, 'parsis-phonebook-template.xlsx');

    _pbToast('📥 فایل نمونه دانلود شد');
}

/* ============================================================
   ✅ Excel Import (v2.3 — شامل موبایل و داخلی)
   ============================================================ */
function importPhonebookFromExcel(file) {
    if (typeof XLSX === 'undefined') {
        alert('⚠️ کتابخانه اکسل (SheetJS) بارگذاری نشده است.');
        return;
    }

    var reader = new FileReader();
    reader.onload = function (e) {
        try {
            var data = new Uint8Array(e.target.result);
            var workbook = XLSX.read(data, { type: 'array' });
            var sheet = workbook.Sheets[workbook.SheetNames[0]];
            var rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            if (rows.length < 2) { alert('فایل خالی است یا رکوردی ندارد.'); return; }

            var headers = rows[0].map(function (h) { return String(h || '').trim(); });

            /* ---------- پیدا کردن ایندکس ستون‌ها با کلمات کلیدی ---------- */
            var idxFirst  = headers.findIndex(function (h) { return h === 'نام'; });
            var idxLast   = headers.findIndex(function (h) {
                return h === 'نام خانوادگی' || h === 'خانوادگی' || h === 'فامیلی';
            });

            /* ✅ موبایل و داخلی */
            var idxMobile = headers.findIndex(function (h) {
                return h.indexOf('موبایل') !== -1
                    || h.indexOf('همراه') !== -1
                    || h.indexOf('mobile') !== -1
                    || h.indexOf('Mobile') !== -1;
            });
            var idxExt = headers.findIndex(function (h) {
                return h.indexOf('داخلی') !== -1
                    || h.indexOf('extension') !== -1
                    || h.indexOf('Extension') !== -1;
            });

            var idxOrg  = headers.findIndex(function (h) { return h.indexOf('واحد') !== -1; });
            var idxRole = headers.findIndex(function (h) {
                return h.indexOf('سمت') !== -1 || h.indexOf('سِمت') !== -1;
            });
            var idxComp = headers.findIndex(function (h) { return h.indexOf('شرکت') !== -1; });

            if (idxFirst === -1 || idxLast === -1) {
                alert('❌ ستون‌های "نام" و "نام خانوادگی" در فایل پیدا نشد.\nلطفاً هدرهای فایل را اصلاح کنید.');
                return;
            }

            var persons   = DB.load('persons', []) || [];
            var companies = DB.load('companies', []) || [];
            var phonebook = DB.load('phonebook', []) || [];

            var addedCount = 0;
            var addedPersonsCount = 0;
            var addedCompaniesCount = 0;
            var updatedPersonsMobileCount = 0;

            for (var i = 1; i < rows.length; i++) {
                var row = rows[i];
                if (!row || row.length === 0) continue;

                var first = String(row[idxFirst] || '').trim();
                var last  = String(row[idxLast]  || '').trim();
                if (!first && !last) continue;

                /* ✅ خواندن موبایل و داخلی */
                var mobile    = idxMobile !== -1 ? _pbNormalizeDigits(String(row[idxMobile] || '').trim()) : '';
                var extension = idxExt    !== -1 ? _pbNormalizeDigits(String(row[idxExt]    || '').trim()) : '';
                var orgUnit   = idxOrg    !== -1 ? String(row[idxOrg]  || '').trim() : '';
                var role      = idxRole   !== -1 ? String(row[idxRole] || '').trim() : '';
                var compName  = idxComp   !== -1 ? String(row[idxComp] || '').trim() : '';

                /* ---------- ۱) تطبیق یا ایجاد شخص ---------- */
                var person = persons.find(function (p) { return p.first === first && p.last === last; });

                if (!person) {
                    person = {
                        id: uid(), first: first, last: last, father: '', nationalId: '',
                        birth: '', mobile: mobile, phone: '', email: '', bankTitle: '',
                        acc: '', iban: '', card: '', address: ''
                    };
                    persons.push(person);
                    addedPersonsCount++;
                } else if (mobile && person.mobile !== mobile) {
                    person.mobile = mobile;
                    updatedPersonsMobileCount++;
                }

                /* ---------- ۲) تطبیق یا ایجاد شرکت ---------- */
                var companyId = '';
                if (compName) {
                    var company = companies.find(function (c) { return c.name === compName; });
                    if (!company) {
                        company = { id: uid(), name: compName, phone: '', email: '', address: '' };
                        companies.push(company);
                        addedCompaniesCount++;
                    }
                    companyId = company.id;
                }

                /* ---------- ۳) ثبت/بروزرسانی در دفترچه تلفن ---------- */
                var pb = phonebook.find(function (x) { return x.personId === person.id; });

                if (pb) {
                    pb.orgUnit = orgUnit || pb.orgUnit || '';
                    pb.role    = role    || pb.role    || '';
                    if (companyId) pb.companyId = companyId;
                    if (mobile)    pb.mobile    = mobile;
                    if (extension) pb.extension = extension;
                } else {
                    phonebook.push({
                        id: uid(),
                        personId: person.id,
                        companyId: companyId,
                        orgUnit: orgUnit,
                        role: role,
                        extension: extension,
                        mobile: mobile || (person.mobile || '')
                    });
                }
                addedCount++;
            }

            /* ---------- ذخیره ---------- */
            if (addedPersonsCount > 0 || updatedPersonsMobileCount > 0) {
                DB.save('persons', persons);
            }
            if (addedCompaniesCount > 0) DB.save('companies', companies);
            DB.save('phonebook', phonebook);

            /* ---------- پیام نتیجه ---------- */
            var msg = '✅ ' + _pbToFa(addedCount) + ' رکورد پردازش شد.\n\n'
                    + '👤 اشخاص جدید: ' + _pbToFa(addedPersonsCount) + '\n'
                    + '🏢 شرکت‌های جدید: ' + _pbToFa(addedCompaniesCount);
            if (updatedPersonsMobileCount > 0) {
                msg += '\n📱 موبایل اشخاص به‌روزرسانی‌شده: ' + _pbToFa(updatedPersonsMobileCount);
            }
            alert(msg);

            /* ---------- بازسازی UI ---------- */
            if (typeof renderPersonsList   === 'function') renderPersonsList();
            if (typeof renderCompaniesList === 'function') renderCompaniesList();
            refreshPhonebookCompanyFilter();
            renderPhonebookList();

        } catch (err) {
            console.error(err);
            alert('❌ خطا در پردازش فایل اکسل:\n' + err.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

/* ============================================================
   بایند فرم و دکمه‌ها
   ============================================================ */
function bindPhonebookForm() {
    _injectPBNewElements();

    refreshPhonebookPersonSelect(_pbSelectedPersonId || '');
    refreshPhonebookCompanySelect(_pbSelectedCompanyId || '');
    refreshPhonebookCompanyFilter();

    var saveBtn = _pbEl('pb-save');
    if (saveBtn && !saveBtn.dataset.bound) {
        saveBtn.dataset.bound = '1';
        saveBtn.onclick = savePhonebookEntry;
    }

    var newBtn = _pbEl('pb-new');
    if (newBtn && !newBtn.dataset.bound) {
        newBtn.dataset.bound = '1';
        newBtn.onclick = function () {
            clearPhonebookForm();
            _pbToast('📝 فرم خالی شد');
        };
    }

    var addPersonBtn = _pbEl('pb-person-add');
    if (addPersonBtn && !addPersonBtn.dataset.bound) {
        addPersonBtn.dataset.bound = '1';
        addPersonBtn.onclick = openQuickPersonModal;
    }

    var addCompanyBtn = _pbEl('pb-company-add');
    if (addCompanyBtn && !addCompanyBtn.dataset.bound) {
        addCompanyBtn.dataset.bound = '1';
        addCompanyBtn.onclick = openQuickCompanyModal;
    }

    var companyFilter = _pbEl('pb-list-company-filter');
    if (companyFilter && !companyFilter.dataset.bound) {
        companyFilter.dataset.bound = '1';
        companyFilter.onchange = renderPhonebookList;
    }

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

    var idEl = _pbEl('pb-id');
    if (idEl && !idEl.value) {
        var mobileEl = _pbEl('pb-mobile');
        if (mobileEl) mobileEl.value = '';
    }
}

/* ============================================================
   صادرسازی
   ============================================================ */
window.getPhonebook                  = getPhonebook;
window.savePhonebook                 = savePhonebook;
window.refreshPhonebookPersonSelect  = refreshPhonebookPersonSelect;
window.refreshPhonebookCompanySelect = refreshPhonebookCompanySelect;
window.refreshPhonebookCompanyFilter = refreshPhonebookCompanyFilter;
window.renderPhonebookList           = renderPhonebookList;
window.loadPhonebookForEdit          = loadPhonebookForEdit;
window.clearPhonebookForm            = clearPhonebookForm;
window.savePhonebookEntry            = savePhonebookEntry;
window.bindPhonebookForm             = bindPhonebookForm;
window.initPhonebookPage             = initPhonebookPage;
window.openQuickPersonModal          = openQuickPersonModal;
window.openQuickCompanyModal         = openQuickCompanyModal;
window.importPhonebookFromExcel      = importPhonebookFromExcel;
window.downloadPhonebookTemplate     = downloadPhonebookTemplate;

console.log('✅ [modules/phonebook.js] loaded — v2.3 (Excel Template + Mobile + Extension + OrgUnit)');
