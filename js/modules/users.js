/* ============================================================
   پارسیس — مدیریت کاربران (نسخه ۲ — کامل)
   مسیر: js/modules/users.js
   
   ویژگی‌ها:
     ✅ رفرنس به شخص
     ✅ سرپرست اصلی همیشه در لیست (غیرقابل حذف)
     ✅ پسورد مخفی + دکمه نمایش
     ✅ تکرار کلمه عبور
     ✅ تیک سرپرست (دسترسی کامل)
     ✅ تیک فعال/غیرفعال
     ✅ سرپرست می‌تواند همه را ویرایش کند
     ✅ کاربر عادی فقط خودش را
     ✅ حداقل یک سرپرست همیشه باید باقی بماند
   ============================================================ */
'use strict';

var ADMIN_USERNAME = 'سرپرست';
var ADMIN_DEFAULT_PASSWORD = '1369';
var ADMIN_MAIN_ID = 'u_admin';

/* ============================================================
   بخش ۱ — Defaults + Migration
   ============================================================ */
function getDefaultUsers() {
    return [{
        id: ADMIN_MAIN_ID,
        username: ADMIN_USERNAME,
        password: ADMIN_DEFAULT_PASSWORD,
        personId: '',
        isAdmin: true,
        active: true
    }];
}

function runUserMigrations() {
    try {
        var users = DB.load('users', null);
        if (!Array.isArray(users)) users = [];

        var changed = false;

        /* افزودن فیلدهای جدید به کاربران قدیمی */
        users.forEach(function (u) {
            if (!u.id) { u.id = uid(); changed = true; }
            if (typeof u.isAdmin === 'undefined') { u.isAdmin = false; changed = true; }
            if (typeof u.active === 'undefined') { u.active = true; changed = true; }
            if (typeof u.personId === 'undefined') { u.personId = ''; changed = true; }
        });

        /* اطمینان از وجود سرپرست اصلی */
        var adminById = users.find(function (u) { return u.id === ADMIN_MAIN_ID; });
        var adminByName = users.find(function (u) {
            return typeof normalizeFaLogin === 'function'
                ? normalizeFaLogin(u.username) === normalizeFaLogin(ADMIN_USERNAME)
                : (u.username || '').trim() === ADMIN_USERNAME;
        });

        if (!adminById && !adminByName) {
            users.unshift(getDefaultUsers()[0]);
            changed = true;
        } else if (adminById && !adminByName) {
            adminById.username = ADMIN_USERNAME;
            changed = true;
        }

        /* اطمینان از isAdmin برای اصلی */
        if (adminById && adminById.isAdmin !== true) {
            adminById.isAdmin = true;
            changed = true;
        }

        /* اطمینان از حداقل یک سرپرست */
        var hasAnyAdmin = users.some(function (u) { return u.isAdmin === true; });
        if (!hasAnyAdmin) {
            if (adminById) { adminById.isAdmin = true; }
            else if (adminByName) { adminByName.isAdmin = true; }
            else { users.unshift(getDefaultUsers()[0]); }
            changed = true;
        }

        if (changed || !DB.load('users', null)) {
            DB.save('users', users);
            console.log('[users migration] total: ' + users.length);
        }
    } catch (e) {
        console.warn('[users migration]', e);
    }
}

function initUsers() {
    runUserMigrations();
}

/* ============================================================
   بخش ۲ — Helper
   ============================================================ */
function _upEl(id) {
    var activePage = document.querySelector('.page.active');
    if (activePage) {
        var el = activePage.querySelector('#' + id);
        if (el) return el;
    }
    return document.getElementById(id);
}

function _upSetVal(id, val) {
    var el = _upEl(id);
    if (el) el.value = (val === undefined || val === null) ? '' : val;
}

function _upSetCheck(id, val) {
    var el = _upEl(id);
    if (el) el.checked = !!val;
}

function _upGetVal(id) {
    var el = _upEl(id);
    return el ? el.value : '';
}

function _upGetCheck(id) {
    var el = _upEl(id);
    return el ? el.checked : false;
}

function _upCurrentUser() {
    return (typeof state !== 'undefined' && state.currentUser) ? state.currentUser : {};
}

function _upIsAdmin() {
    var cu = _upCurrentUser();
    if (cu.isAdmin === true) return true;
    /* fallback: اگه session قدیمی است، از DB چک کن */
    try {
        var users = DB.load('users', []);
        var found = users.find(function (u) { return u.id === cu.id; });
        return found && found.isAdmin === true;
    } catch (e) { return false; }
}

/* ============================================================
   بخش ۳ — پر کردن dropdown اشخاص
   ============================================================ */
function populatePersonSelect() {
    var pSel = _upEl('user-person');
    if (!pSel) return;

    var currentVal = pSel.value;
    var persons = DB.load('persons', []);
    if (!Array.isArray(persons)) persons = [];

    pSel.innerHTML = '<option value="">— بدون شخص —</option>';

    if (persons.length === 0) {
        pSel.innerHTML = '<option value="">— ابتدا از «اشخاص» تعریف کنید —</option>';
        return;
    }

    persons.forEach(function (p) {
        var o = document.createElement('option');
        o.value = p.id;
        o.textContent = ((p.first || '') + ' ' + (p.last || '')).trim() || ('شخص ' + String(p.id).substr(0, 4));
        pSel.appendChild(o);
    });

    if (currentVal) pSel.value = currentVal;
}

/* ============================================================
   بخش ۴ — رندر فهرست
   ============================================================ */
function renderUsersList() {
    var list = DB.load('users', []);
    if (!Array.isArray(list)) list = [];

    var tb = _upEl('users-list-body');
    if (!tb) return;
    tb.innerHTML = '';

    var filterEl = _upEl('users-filter');
    var filter = filterEl ? (filterEl.value || '').toLowerCase() : '';

    var persons = DB.load('persons', []);
    var pMap = {};
    if (Array.isArray(persons)) {
        persons.forEach(function (p) { pMap[p.id] = ((p.first || '') + ' ' + (p.last || '')).trim(); });
    }

    var cu = _upCurrentUser();
    var iAmAdmin = _upIsAdmin();

    var shown = 0;
    list.forEach(function (u) {
        var pName = (u.personId && pMap[u.personId]) ? pMap[u.personId] : '—';

        if (filter) {
            var hay = ((u.username || '') + ' ' + pName).toLowerCase();
            if (hay.indexOf(filter) === -1) return;
        }
        shown++;

        var roleBadge = u.isAdmin
            ? '<span class="badge badge-approved">👑 سرپرست</span>'
            : '<span class="badge badge-type">کاربر</span>';

        var activeBadge = (u.active !== false)
            ? '<span class="badge badge-approved">✓ فعال</span>'
            : '<span class="badge badge-draft">غیرفعال</span>';

        var canEdit = iAmAdmin || u.id === cu.id;
        var canDelete = iAmAdmin && u.id !== ADMIN_MAIN_ID && u.id !== cu.id;

        var tr = document.createElement('tr');
        if (u.id === cu.id) tr.style.background = 'linear-gradient(90deg,#dbeafe,#ffffff)';
        if (u.active === false) tr.style.opacity = '0.6';

        tr.innerHTML =
              '<td dir="rtl">' + esc(u.username) + (u.id === cu.id ? ' <span style="font-size:.68rem;color:#1e40af;background:#dbeafe;padding:1px 8px;border-radius:8px;font-weight:800">(شما)</span>' : '') + '</td>'
            + '<td>' + esc(pName) + '</td>'
            + '<td>' + roleBadge + '</td>'
            + '<td>' + activeBadge + '</td>'
            + '<td><div class="row-actions">'
            +   (canEdit ? '<button class="row-btn edit" data-id="' + u.id + '" title="ویرایش">✎</button>' : '')
            +   (canDelete ? '<button class="row-btn del" data-id="' + u.id + '" title="حذف">×</button>' : '')
            + '</div></td>';
        tb.appendChild(tr);
    });

    if (shown === 0) {
        tb.innerHTML = '<tr><td colspan="5" class="empty-row">یافت نشد.</td></tr>';
    }

    var countEl = _upEl('users-count');
    if (countEl) countEl.textContent = toFa(shown);

    /* بایند دکمه‌ها */
    tb.querySelectorAll('.row-btn.edit').forEach(function (b) {
        b.onclick = function () {
            var id = this.getAttribute('data-id');
            var u = DB.load('users', []).find(function (x) { return x.id === id; });
            if (!u) { showToast('کاربر یافت نشد'); return; }
            fillUserForm(u);
            var activePage = document.querySelector('.page.active');
            var addTab = activePage ? activePage.querySelector('[data-tab="users-add"]') : null;
            if (addTab) addTab.click();
        };
    });

    tb.querySelectorAll('.row-btn.del').forEach(function (b) {
        b.onclick = function () {
            var id = this.getAttribute('data-id');
            var u = DB.load('users', []).find(function (x) { return x.id === id; });
            if (!u) return;

            if (u.id === ADMIN_MAIN_ID) {
                alert('❌ کاربر «سرپرست» اصلی قابل حذف نیست.');
                return;
            }

            var cu = _upCurrentUser();
            if (cu.id === id) {
                alert('❌ نمی‌توانید حساب خودتان را حذف کنید.');
                return;
            }

            if (u.isAdmin) {
                var others = DB.load('users', []).filter(function (x) {
                    return x.id !== id && x.isAdmin === true;
                });
                if (others.length === 0) {
                    alert('❌ حداقل یک سرپرست باید باقی بماند. ابتدا کاربر دیگری را سرپرست کنید.');
                    return;
                }
            }

            if (!confirm('حذف کاربر «' + u.username + '»؟')) return;

            var l = DB.load('users', []).filter(function (x) { return x.id !== id; });
            DB.save('users', l);
            renderUsersList();
            showToast('🗑 کاربر حذف شد');
        };
    });

    if (typeof buildFilterRow === 'function') buildFilterRow(document.getElementById('users-table'));
}

/* ============================================================
   بخش ۵ — پر کردن فرم (برای ویرایش)
   ============================================================ */
function fillUserForm(u) {
    if (!u) return;

    _upSetVal('user-id', u.id || '');
    _upSetVal('user-username', u.username || '');

    /* ✅ پسورد خالی می‌مونه (امنیت + کاربر خودش تصمیم می‌گیره تغییر بده یا نه) */
    _upSetVal('user-password', '');
    _upSetVal('user-password-confirm', '');

    /* اطمینان از password type */
    var pwEl = _upEl('user-password');
    var cfEl = _upEl('user-password-confirm');
    if (pwEl) pwEl.type = 'password';
    if (cfEl) cfEl.type = 'password';
    var toggleBtn = _upEl('user-password-toggle');
    if (toggleBtn) toggleBtn.textContent = '👁';

    /* پر کردن dropdown اشخاص قبل از ست کردن */
    populatePersonSelect();

    _upSetVal('user-person', u.personId || '');
    _upSetCheck('user-is-admin', u.isAdmin === true);
    _upSetCheck('user-active', u.active !== false);

    /* قفل کردن isAdmin اگه کاربر عادی است */
    var isAdminEl = _upEl('user-is-admin');
    if (isAdminEl) {
        isAdminEl.disabled = !_upIsAdmin() || u.id === ADMIN_MAIN_ID;
        if (u.id === ADMIN_MAIN_ID) {
            isAdminEl.title = 'نقش «سرپرست» اصلی قابل تغییر نیست';
        } else if (!_upIsAdmin()) {
            isAdminEl.title = 'فقط سرپرست می‌تواند نقش را تغییر دهد';
        } else {
            isAdminEl.title = '';
        }
    }

    /* غیرفعال کردن active checkbox اگه self است */
    var activeEl = _upEl('user-active');
    if (activeEl) {
        var cu = _upCurrentUser();
        activeEl.disabled = (u.id === ADMIN_MAIN_ID) || (cu.id === u.id);
        if (u.id === ADMIN_MAIN_ID) activeEl.title = 'حساب «سرپرست» اصلی قابل غیرفعال‌سازی نیست';
        else if (cu.id === u.id) activeEl.title = 'نمی‌توانید حساب خودتان را غیرفعال کنید';
        else activeEl.title = '';
    }

    /* برچسب دکمه ذخیره */
    var saveBtn = _upEl('save-user');
    if (saveBtn) saveBtn.innerHTML = '💾 ذخیره تغییرات';
}

/* ============================================================
   بخش ۶ — پاک کردن فرم (کاربر جدید)
   ============================================================ */
function clearUserForm() {
    _upSetVal('user-id', '');
    _upSetVal('user-username', '');
    _upSetVal('user-password', '');
    _upSetVal('user-password-confirm', '');
    _upSetVal('user-person', '');
    _upSetCheck('user-is-admin', false);
    _upSetCheck('user-active', true);

    var pwEl = _upEl('user-password');
    var cfEl = _upEl('user-password-confirm');
    if (pwEl) pwEl.type = 'password';
    if (cfEl) cfEl.type = 'password';
    var toggleBtn = _upEl('user-password-toggle');
    if (toggleBtn) toggleBtn.textContent = '👁';

    var isAdminEl = _upEl('user-is-admin');
    if (isAdminEl) {
        isAdminEl.disabled = !_upIsAdmin();
        isAdminEl.title = '';
    }

    var activeEl = _upEl('user-active');
    if (activeEl) { activeEl.disabled = false; activeEl.title = ''; }

    var saveBtn = _upEl('save-user');
    if (saveBtn) saveBtn.innerHTML = '💾 ذخیره';
}

/* ============================================================
   بخش ۷ — بایند فرم
   ============================================================ */
function bindUsersForm() {
    /* هر بار، dropdown اشخاص را پر کن */
    populatePersonSelect();

    var saveBtn = _upEl('save-user');
    if (saveBtn && !saveBtn.dataset.bound) {
        saveBtn.dataset.bound = '1';
        saveBtn.onclick = function () {
            var id = _upGetVal('user-id');
            var username = (_upGetVal('user-username') || '').trim();
            var password = _upGetVal('user-password') || '';
            var passwordConfirm = _upGetVal('user-password-confirm') || '';
            var personId = _upGetVal('user-person') || '';
            var isAdmin = _upGetCheck('user-is-admin');
            var active = _upGetCheck('user-active');

            var iAmAdmin = _upIsAdmin();
            var cu = _upCurrentUser();

            /* --- ولیدیشن --- */
            if (!username) { alert('⚠️ نام کاربری اجباری است.'); return; }

            var isEditing = !!id;
            if (!isEditing && !iAmAdmin) {
                alert('⚠️ فقط سرپرست می‌تواند کاربر جدید ایجاد کند.');
                return;
            }

            if (!isEditing && !password) { alert('⚠️ کلمه عبور برای کاربر جدید اجباری است.'); return; }
            if (password && password.length < 3) { alert('⚠️ کلمه عبور حداقل ۳ کاراکتر باشد.'); return; }
            if (password && password !== passwordConfirm) {
                alert('⚠️ کلمه عبور و تکرار آن یکسان نیستند.');
                return;
            }

            var list = DB.load('users', []);
            if (!Array.isArray(list)) list = [];

            /* نام کاربری تکراری؟ */
            var dup = list.find(function (x) {
                if (x.id === id) return false;
                return normalizeFaLogin(x.username) === normalizeFaLogin(username);
            });
            if (dup) { alert('⚠️ نام کاربری «' + username + '» قبلاً برای «' + dup.username + '» ثبت شده.'); return; }

            /* --- ویرایش --- */
            if (isEditing) {
                var u = list.find(function (x) { return x.id === id; });
                if (!u) { alert('❌ کاربر یافت نشد.'); return; }

                /* فقط سرپرست می‌تواند نقش را تغییر دهد */
                if (!iAmAdmin) isAdmin = u.isAdmin;
                if (u.id === ADMIN_MAIN_ID) isAdmin = true;

                /* نمی‌توان نقش «سرپرست» اصلی را برداشت */
                if (u.id === ADMIN_MAIN_ID && !isAdmin) {
                    alert('❌ نمی‌توانید نقش «سرپرست» اصلی را بردارید.');
                    return;
                }

                /* نمی‌توان آخرین سرپرست را کاربر عادی کرد */
                if (u.isAdmin && !isAdmin) {
                    var otherAdmins = list.filter(function (x) {
                        return x.id !== id && x.isAdmin === true;
                    });
                    if (otherAdmins.length === 0) {
                        alert('❌ حداقل یک سرپرست باید باقی بماند. ابتدا کاربر دیگری را سرپرست کنید.');
                        return;
                    }
                }

                /* نمی‌توان خودت را غیرفعال کنی */
                if (u.id === ADMIN_MAIN_ID && !active) {
                    alert('❌ حساب «سرپرست» اصلی قابل غیرفعال‌سازی نیست.');
                    return;
                }
                if (cu.id === id && !active) {
                    alert('❌ نمی‌توانید حساب خودتان را غیرفعال کنید.');
                    return;
                }

                u.username = username;
                u.personId = personId;
                u.isAdmin = isAdmin;
                u.active = active;
                if (password) u.password = password;

                /* آپدیت session اگه خودش را ویرایش می‌کند */
                if (cu.id === id) {
                    cu.isAdmin = isAdmin;
                    cu.active = active;
                    state.currentUser = cu;
                    try { sessionStorage.setItem('parsis.session', JSON.stringify(cu)); } catch (e) {}
                }

                showToast('✅ تغییرات ذخیره شد.');

            } else {
                /* --- کاربر جدید --- */
                list.push({
                    id: uid(),
                    username: username,
                    password: password,
                    personId: personId,
                    isAdmin: iAmAdmin ? isAdmin : false,
                    active: active
                });
                showToast('✅ کاربر جدید «' + username + '» ایجاد شد.');
            }

            DB.save('users', list);
            clearUserForm();
            renderUsersList();

            var activePage = document.querySelector('.page.active');
            var listTab = activePage ? activePage.querySelector('[data-tab="users-list"]') : null;
            if (listTab) listTab.click();
        };
    }

    var newBtn = _upEl('new-user');
    if (newBtn && !newBtn.dataset.bound) {
        newBtn.dataset.bound = '1';
        newBtn.onclick = clearUserForm;
    }

    /* دکمه نمایش/مخفی پسورد */
    var toggleBtn = _upEl('user-password-toggle');
    if (toggleBtn && !toggleBtn.dataset.bound) {
        toggleBtn.dataset.bound = '1';
        toggleBtn.onclick = function () {
            var pwEl = _upEl('user-password');
            var cfEl = _upEl('user-password-confirm');
            if (!pwEl) return;
            var isHidden = pwEl.type === 'password';
            pwEl.type = isHidden ? 'text' : 'password';
            if (cfEl) cfEl.type = isHidden ? 'text' : 'password';
            this.textContent = isHidden ? '🙈' : '👁';
        };
    }
}

/* ============================================================
   بخش ۸ — Init صفحه
   ============================================================ */
function initUsersPage() {
    initUsers();
    populatePersonSelect();
    renderUsersList();
    bindUsersForm();
}

/* ============================================================
   صادرسازی
   ============================================================ */
window.renderUsersList      = renderUsersList;
window.initUsersPage        = initUsersPage;
window.initUsers            = initUsers;
window.populatePersonSelect = populatePersonSelect;
window.fillUserForm         = fillUserForm;
window.clearUserForm        = clearUserForm;
window.bindUsersForm        = bindUsersForm;
window.runUserMigrations    = runUserMigrations;

console.log('✅ [modules/users.js] loaded — complete rewrite');
