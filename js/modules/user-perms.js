/* ============================================================
   پارسیس — دو فرم حقوق دسترسی و محدودیت دسترسی (✅ v2.1.0)
   مسیر: js/modules/user-perms.js

   فرم ۱ — «🔐 حقوق دسترسی»: جدول صفحات × عمل‌ها (دیدن/ایجاد/ویرایش/
           حذف/گزارش‌گیری) — با یک کلیک «همه» یا «هیچ».
   فرم ۲ — «🚫 محدودیت دسترسی»: فقط داده‌های بانک/صندوق/شرکت/
           پروژه/شخصِ انتخاب‌شده دیده می‌شود. خالی = همه.

   باز کردن: در «معرفی کاربران» دکمه 🔐 هر ردیف (فقط سرپرست).
   ============================================================ */
'use strict';

(function () {

    var _editUserId = '';

    function _m(id) {
        var modal = document.getElementById('user-perms-modal');
        if (!modal) return null;
        return modal.querySelector('#' + id) || document.getElementById(id);
    }

    function _esc(s) {
        try { return esc(String(s || '')); } catch (e) { return String(s || ''); }
    }

    /* ============================================================
       باز کردن فرم برای یک کاربر
       ============================================================ */
    function openUserPerms(userId) {
        if (!permsIsAdmin()) { showToast('⛔ فقط سرپرست می‌تواند دسترسی‌ها را تغییر دهد'); return; }
        var users = DB.load('users', []);
        var u = null;
        users.forEach(function (x) { if (x.id === userId) u = x; });
        if (!u) { showToast('کاربر یافت نشد'); return; }
        if (u.isAdmin === true) { showToast('👑 سرپرست همیشه دسترسی کامل دارد'); return; }

        _editUserId = userId;

        var titleEl = _m('user-perms-title');
        if (titleEl) titleEl.textContent = '🔐 دسترسی‌های «' + (u.username || '') + '»';

        renderPermsMatrix(u);
        renderLimitsForm(u);

        var modal = document.getElementById('user-perms-modal');
        var overlay = document.getElementById('user-perms-overlay');
        if (modal) modal.classList.add('show');
        if (overlay) overlay.classList.add('show');

        var tabs = modal.querySelectorAll('.user-perms-tab-btn');
        if (tabs.length) { tabs.forEach(function (b, i) { b.classList.toggle('active', i === 0); }); }
        showTab('perms');
    }

    function closeUserPerms() {
        var modal = document.getElementById('user-perms-modal');
        var overlay = document.getElementById('user-perms-overlay');
        if (modal) modal.classList.remove('show');
        if (overlay) overlay.classList.remove('show');
        _editUserId = '';
    }

    function showTab(which) {
        var modal = document.getElementById('user-perms-modal');
        if (!modal) return;
        var p = modal.querySelector('#user-perms-tab-perms');
        var l = modal.querySelector('#user-perms-tab-limits');
        if (p) p.style.display = (which === 'perms') ? 'block' : 'none';
        if (l) l.style.display = (which === 'limits') ? 'block' : 'none';
        var tabs = modal.querySelectorAll('.user-perms-tab-btn');
        tabs.forEach(function (b) {
            var on = b.getAttribute('data-uptab') === which;
            b.classList.toggle('active', on);
        });
    }

    /* ============================================================
       فرم ۱ — ماتریس صفحات × عمل‌ها
       ============================================================ */
    function collectPermsFromUser(u) {
        /* مقدار اولیه هر خانه: تنظیم‌نشده = باز (true) */
        var reg = window.PERMS_REGISTRY;
        var out = {};
        function pageRec(page) {
            var rec = {};
            reg.pageActions(page).forEach(function (a) {
                var v = undefined;
                if (u && u.perms && u.perms.pages && u.perms.pages[page]) {
                    v = u.perms.pages[page][a];
                }
                rec[a] = (v === undefined) ? true : (v === true);
            });
            return rec;
        }
        reg.dataPages.forEach(function (d) { out[d[0]] = pageRec(d[0]); });
        reg.reportPages.forEach(function (d) { out[d[0]] = pageRec(d[0]); });
        return out;
    }

    function renderPermsMatrix(u) {
        var reg = window.PERMS_REGISTRY;
        var box = _m('user-perms-matrix');
        if (!box) return;

        var pages = [];
        reg.dataPages.forEach(function (d) { pages.push(d); });
        reg.reportPages.forEach(function (d) { pages.push(d); });

        var state = collectPermsFromUser(u);

        var html = '<div style="max-height:44vh;overflow:auto;border:1px solid #e2e8f0;border-radius:12px">';
        html += '<table dir="rtl" style="width:100%;border-collapse:collapse;font-size:.72rem">';
        html += '<thead><tr style="background:#f1f5f9;position:sticky;top:0">';
        html += '<th style="padding:7px 8px;text-align:right;border-bottom:2px solid #e2e8f0">صفحه</th>';
        reg.actionsOrder = null;
        /* ستون‌ها: اجتماع عمل‌ها */
        var allActions = ['view', 'create', 'edit', 'delete', 'report'];
        allActions.forEach(function (a) {
            var meta = reg.actions[a] || { label: a };
            html += '<th style="padding:7px 4px;border-bottom:2px solid #e2e8f0;white-space:nowrap">' + meta.label + '</th>';
        });
        html += '<th style="padding:7px 4px;border-bottom:2px solid #e2e8f0">همه/هیچ</th>';
        html += '</tr></thead><tbody>';

        pages.forEach(function (d, idx) {
            var page = d[0], title = d[1];
            var actions = reg.pageActions(page);
            html += '<tr style="' + (idx % 2 ? 'background:#f8fafc;' : '') + '">';
            html += '<td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;font-weight:700">' + _esc(title) + '</td>';
            allActions.forEach(function (a) {
                if (actions.indexOf(a) === -1) {
                    html += '<td style="padding:6px 4px;border-bottom:1px solid #f1f5f9;text-align:center;color:#cbd5e1">—</td>';
                } else {
                    var checked = state[page][a] ? ' checked' : '';
                    html += '<td style="padding:6px 4px;border-bottom:1px solid #f1f5f9;text-align:center">'
                        + '<input type="checkbox" class="upm-cb" data-page="' + page + '" data-action="' + a + '"' + checked
                        + ' style="width:16px;height:16px;cursor:pointer;accent-color:#2563eb"></td>';
                }
            });
            html += '<td style="padding:6px 4px;border-bottom:1px solid #f1f5f9;text-align:center;white-space:nowrap">'
                + '<button type="button" class="btn-secondary upm-all" data-page="' + page + '" style="padding:2px 8px;font-size:.66rem;margin-inline-end:3px">همه</button>'
                + '<button type="button" class="btn-secondary upm-none" data-page="' + page + '" style="padding:2px 8px;font-size:.66rem">هیچ</button>'
                + '</td>';
            html += '</tr>';
        });

        html += '</tbody></table></div>';
        html += '<p class="muted" style="font-size:.7rem;margin-top:8px;line-height:1.8">💡 تیک‌خورده = مجاز. خانهٔ خالی «—» یعنی این عمل در آن صفحه معنا ندارد. اگر همهٔ تیک‌ها بمانند (پیش‌فرض)، کاربر دسترسی کامل دارد.</p>';

        box.innerHTML = html;

        box.querySelectorAll('.upm-all').forEach(function (b) {
            b.onclick = function () {
                var page = b.getAttribute('data-page');
                box.querySelectorAll('.upm-cb[data-page="' + page + '"]').forEach(function (cb) { cb.checked = true; });
            };
        });
        box.querySelectorAll('.upm-none').forEach(function (b) {
            b.onclick = function () {
                var page = b.getAttribute('data-page');
                box.querySelectorAll('.upm-cb[data-page="' + page + '"]').forEach(function (cb) { cb.checked = false; });
            };
        });
    }

    /* ============================================================
       فرم ۲ — محدودیت دسترسی (داده)
       ============================================================ */
    function collectLimitsFromUser(u) {
        var reg = window.PERMS_REGISTRY;
        var out = {};
        reg.limitKinds.forEach(function (k) {
            var saved = (u && u.perms && u.perms.limits && Array.isArray(u.perms.limits[k[0]])) ? u.perms.limits[k[0]] : [];
            out[k[0]] = saved.slice();
        });
        return out;
    }

    function renderLimitsForm(u) {
        var reg = window.PERMS_REGISTRY;
        var box = _m('user-perms-limits');
        if (!box) return;
        var limits = collectLimitsFromUser(u);

        var html = '<div style="max-height:44vh;overflow:auto;display:flex;flex-direction:column;gap:10px">';

        reg.limitKinds.forEach(function (k) {
            var kind = k[0], label = k[1], store = k[2];
            var items = DB.load(store, []);
            if (!Array.isArray(items)) items = [];
            var sel = limits[kind] || [];

            html += '<div style="border:1px solid #e2e8f0;border-radius:12px;padding:10px;background:#f8fafc">';
            html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">'
                + '<b style="font-size:.75rem">' + _esc(label) + '</b>'
                + '<button type="button" class="btn-secondary upl-all" data-kind="' + kind + '" style="padding:2px 8px;font-size:.64rem;margin-inline-start:auto">انتخاب همه</button>'
                + '<button type="button" class="btn-secondary upl-none" data-kind="' + kind + '" style="padding:2px 8px;font-size:.64rem">هیچ</button>'
                + '</div>';

            if (!items.length) {
                html += '<div style="font-size:.7rem;color:#94a3b8">موردی تعریف نشده است.</div>';
            } else {
                html += '<div style="display:flex;flex-wrap:wrap;gap:6px">';
                items.forEach(function (it) {
                    var title = (it.title || it.bank || it.name || ((it.first || '') + ' ' + (it.last || '')) || it.id) || '';
                    var lbl = String(title).trim() || String(it.id).slice(0, 6);
                    var checked = sel.indexOf(it.id) !== -1;
                    html += '<label style="display:inline-flex;align-items:center;gap:5px;background:#fff;border:1px solid #e2e8f0;border-radius:9px;padding:3px 9px;font-size:.7rem;cursor:pointer">'
                        + '<input type="checkbox" class="upl-cb" data-kind="' + kind + '" data-id="' + _esc(it.id) + '"' + (checked ? ' checked' : '')
                        + ' style="width:14px;height:14px;accent-color:#d97706"> ' + _esc(lbl) + '</label>';
                });
                html += '</div>';
            }
            html += '</div>';
        });

        html += '</div>';
        html += '<p class="muted" style="font-size:.7rem;margin-top:8px;line-height:1.8">💡 اگر در یک دسته «هیچ» انتخاب نشود، همهٔ موارد آن دسته دیده می‌شود. با انتخاب چند مورد، فقط اسناد و داده‌های مرتبط با همان‌ها نمایش داده می‌شود — مثلاً انتخاب یک بانک یعنی کاربر فقط اسناد، اقساط و موجودیِ همان بانک را می‌بیند.</p>';

        box.innerHTML = html;

        box.querySelectorAll('.upl-all').forEach(function (b) {
            b.onclick = function () {
                var kind = b.getAttribute('data-kind');
                box.querySelectorAll('.upl-cb[data-kind="' + kind + '"]').forEach(function (cb) { cb.checked = true; });
            };
        });
        box.querySelectorAll('.upl-none').forEach(function (b) {
            b.onclick = function () {
                var kind = b.getAttribute('data-kind');
                box.querySelectorAll('.upl-cb[data-kind="' + kind + '"]').forEach(function (cb) { cb.checked = false; });
            };
        });
    }

    /* ============================================================
       ذخیره
       ============================================================ */
    function saveUserPerms() {
        if (!_editUserId) return;
        if (!permsIsAdmin()) { showToast('⛔ فقط سرپرست'); return; }
        var users = DB.load('users', []);
        var u = null;
        users.forEach(function (x) { if (x.id === _editUserId) u = x; });
        if (!u) { showToast('کاربر یافت نشد'); return; }

        var modal = document.getElementById('user-perms-modal');
        var pages = {};
        modal.querySelectorAll('.upm-cb').forEach(function (cb) {
            var page = cb.getAttribute('data-page');
            var action = cb.getAttribute('data-action');
            if (!pages[page]) pages[page] = {};
            pages[page][action] = cb.checked;
        });

        var limits = {};
        modal.querySelectorAll('.upl-cb').forEach(function (cb) {
            var kind = cb.getAttribute('data-kind');
            if (!limits[kind]) limits[kind] = [];
            if (cb.checked) limits[kind].push(cb.getAttribute('data-id'));
        });

        u.perms = { pages: pages, limits: limits };
        DB.save('users', users);

        /* اگر کاربرِ فعلی تغییر کرد، منو بلافاصله به‌روز شود */
        try {
            var cu = state.currentUser;
            if (cu && cu.id === u.id) {
                window.dispatchEvent(new Event('parsisUserChanged'));
            }
        } catch (e) {}

        showToast('✅ دسترسی‌های «' + (u.username || '') + '» ذخیره شد');
        closeUserPerms();
        if (typeof renderUsersList === 'function') renderUsersList();
    }

    function clearUserPerms() {
        if (!_editUserId) return;
        if (!confirm('همهٔ دسترسی‌ها و محدودیت‌های این کاربر به حالت پیش‌فرض (دسترسی کامل) برگردد؟')) return;
        var users = DB.load('users', []);
        users.forEach(function (x) {
            if (x.id === _editUserId) { delete x.perms; }
        });
        DB.save('users', users);
        showToast('↩️ دسترسی‌ها به حالت پیش‌فرض بازگشت');
        var u = users.filter(function (x) { return x.id === _editUserId; })[0];
        renderPermsMatrix(u || null);
        renderLimitsForm(u || null);
        if (typeof renderUsersList === 'function') renderUsersList();
    }

    /* ============================================================
       بایند دکمه‌های فرم کاربران
       ============================================================ */
    function bindUserPermsUI() {
        var modal = document.getElementById('user-perms-modal');
        if (!modal || modal.dataset.permsBound) return;
        modal.dataset.permsBound = '1';

        var closeBtn = document.getElementById('user-perms-close');
        if (closeBtn) closeBtn.onclick = closeUserPerms;
        var ov = document.getElementById('user-perms-overlay');
        if (ov) ov.onclick = closeUserPerms;

        var saveBtn = document.getElementById('user-perms-save');
        if (saveBtn) saveBtn.onclick = saveUserPerms;
        var resetBtn = document.getElementById('user-perms-reset');
        if (resetBtn) resetBtn.onclick = clearUserPerms;

        modal.querySelectorAll('.user-perms-tab-btn').forEach(function (b) {
            b.onclick = function () { showTab(b.getAttribute('data-uptab') || 'perms'); };
        });
    }

    window.openUserPerms = openUserPerms;
    window.closeUserPerms = closeUserPerms;
    window.bindUserPermsUI = bindUserPermsUI;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(bindUserPermsUI, 700); });
    } else {
        setTimeout(bindUserPermsUI, 700);
    }

    console.log('✅ [modules/user-perms.js] loaded — v2.1.0');

})();
