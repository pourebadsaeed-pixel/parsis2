/* ============================================================
   پارسیس — فرم درختواره‌ای دسترسی + قواعد شرطی نمایش اسناد (✅ v2.2.0)
   مسیر: js/modules/user-perms.js

   تب ۱ — «🌳 درخت دسترسی»: دسته‌ها ← صفحات ← عمل‌ها (تیک‌کوچک، نه دایره‌ای)
   تب ۲ — «🚫 قواعد نمایش اسناد»: قاعده‌سازی شرطی بدون نمایش لیست موجودیت‌ها؛
          مثال: «فقط اسنادی دیده شوند که تفصیلِ بانکی آن یکی از
          {بانک ملی، بانک ملت-۱۲۳} است» یا برعکس «نمایش داده نشوند».

   باز کردن: در «معرفی کاربران» دکمه 🔐 هر ردیف (فقط سرپرست).
   ذخیره: u.perms = { pages, rules, limits(مشتق‌شده برای سازگاری) }
   ============================================================ */
'use strict';

(function () {

    var _editUserId = '';
    var _draft = { pages: {}, rules: [] };

    /* دسته‌بندی صفحات برای نمایش درختواره‌ای */
    var PERM_CATEGORIES = [
        { id: 'home-cat',      title: '🏠 خانه',                 pages: ['dashboard'] },
        { id: 'base-cat',      title: '👥 پایه‌ها',               pages: ['persons', 'companies', 'phonebook'] },
        { id: 'acc-cat',       title: '🏦 حساب‌ها و دوره مالی',    pages: ['bank-accounts', 'cash-boxes', 'projects', 'fiscal'] },
        { id: 'voucher-cat',   title: '🧾 اسناد حسابداری',        pages: ['voucher-list', 'voucher-new', 'templates'] },
        { id: 'report-cat',    title: '📚 گزارش‌ها',              pages: ['report-cashflow', 'report-cashflow-desc', 'report-account', 'report-ledger', 'report-trial', 'report-incomplete', 'report-facility', 'report-facility-full', 'report-compare'] },
        { id: 'def-cat',       title: '⚙️ تعریف‌ها و ابزارها',     pages: ['chart-define', 'account-types', 'bank-types', 'cash-types', 'currency', 'estimate-daily', 'cashflow-sources', 'facilities', 'notes', 'sms', 'jalali-calendar', 'language'] }
    ];

    var RULE_KIND_LABEL = {
        bank: 'تفصیل بانکی', cashbox: 'تفصیل صندوق', company: 'تفصیل شرکتی',
        project: 'تفصیل پروژه', person: 'تفصیل شخصی'
    };

    function _m(id) {
        var modal = document.getElementById('user-perms-modal');
        if (!modal) return null;
        return modal.querySelector('#' + id) || document.getElementById(id);
    }

    function _esc(s) {
        try { return esc(String(s || '')); } catch (e) { return String(s || ''); }
    }

    function _reg() { return window.PERMS_REGISTRY; }

    function _kindLabel(kind) { return RULE_KIND_LABEL[kind] || kind; }

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
        _loadDraft(u);

        var titleEl = _m('user-perms-title');
        if (titleEl) titleEl.textContent = '🔐 دسترسی‌های «' + (u.username || '') + '»';

        renderPermsTree();
        renderRulesForm();

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
        _draft = { pages: {}, rules: [] };
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
       ساخت پیش‌نویس از داده کاربر (با مهاجرت limits قدیمی → قاعده only)
       ============================================================ */
    function _loadDraft(u) {
        var reg = _reg();
        _draft = { pages: {}, rules: [] };

        /* صفحات — مقدار پیش‌فرض هر عمل: باز (true) */
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
        reg.dataPages.forEach(function (d) { _draft.pages[d[0]] = pageRec(d[0]); });
        reg.reportPages.forEach(function (d) { _draft.pages[d[0]] = pageRec(d[0]); });

        /* قواعد — مهاجرت یک‌باره از limits قدیمی */
        var oldLimits = (u && u.perms && u.perms.limits) ? u.perms.limits : null;
        var hasOld = false, n = 0;
        if (oldLimits) {
            reg.limitKinds.forEach(function (k) {
                if (Array.isArray(oldLimits[k[0]]) && oldLimits[k[0]].length) { hasOld = true; n += oldLimits[k[0]].length; }
            });
        }
        var savedRules = (u && u.perms && Array.isArray(u.perms.rules)) ? u.perms.rules : [];
        if (savedRules.length) {
            savedRules.forEach(function (r) {
                _draft.rules.push({
                    id: r.id || ('r' + Date.now() + '_' + Math.floor(Math.random() * 999)),
                    target: 'voucher',
                    mode: (r.mode === 'hide') ? 'hide' : 'only',
                    kind: r.kind || 'bank',
                    ids: Array.isArray(r.ids) ? r.ids.slice() : [],
                    allowEmpty: r.allowEmpty === true
                });
            });
        } else if (hasOld) {
            /* limits قدیمی → قاعده «فقط اینها» همان نوع */
            reg.limitKinds.forEach(function (k) {
                var arr = (oldLimits && Array.isArray(oldLimits[k[0]])) ? oldLimits[k[0]] : [];
                if (!arr.length) return;
                _draft.rules.push({
                    id: 'r' + Date.now() + '_' + k[0],
                    target: 'voucher',
                    mode: 'only',
                    kind: k[0],
                    ids: arr.slice(),
                    allowEmpty: false
                });
            });
        }
    }

    /* ============================================================
       تب ۱ — درخت دسترسی
       ============================================================ */
    function renderPermsTree() {
        var reg = _reg();
        var box = _m('user-perms-matrix');
        if (!box) return;

        var pagesByCat = {};
        var seen = {};
        PERM_CATEGORIES.forEach(function (c) {
            pagesByCat[c.id] = [];
            c.pages.forEach(function (p) {
                var meta = null, i;
                for (i = 0; i < reg.dataPages.length; i++) if (reg.dataPages[i][0] === p) meta = reg.dataPages[i];
                for (i = 0; i < reg.reportPages.length; i++) if (reg.reportPages[i][0] === p) meta = reg.reportPages[i];
                if (!meta) return;
                pagesByCat[c.id].push(meta);
                seen[p] = true;
            });
        });
        var others = [];
        reg.dataPages.forEach(function (d) { if (!seen[d[0]]) others.push(d); });
        reg.reportPages.forEach(function (d) { if (!seen[d[0]]) others.push(d); });

        var ruleCount = _draft.rules.length;

        var html = '<div style="max-height:46vh;overflow:auto;border:1px solid #e2e8f0;border-radius:12px;padding:6px;background:#fff">';
        html += '<div style="font-size:.68rem;color:#64748b;padding:4px 8px 8px">روی هر صفحه، فقط کارهایی که می‌خواهی را روشن کن. تیک‌ها چیزی را از سرپرست کم نمی‌کنند؛ فقط برای همین کاربر اعمال می‌شود.</div>';

        PERM_CATEGORIES.forEach(function (c) {
            var list = pagesByCat[c.id];
            if (!list.length) return;
            html += '<details open style="margin:2px 0;border:1px solid #f1f5f9;border-radius:10px;background:#f8fafc">';
            html += '<summary style="cursor:pointer;padding:8px 10px;font-weight:800;font-size:.76rem;color:#0f172a;list-style:none">'
                + '<span style="display:inline-block;width:16px;color:#64748b">▾</span>' + _esc(c.title)
                + '<span style="color:#94a3b8;font-weight:600;font-size:.66rem"> (' + list.length + ')</span></summary>';
            html += '<div style="padding:2px 10px 8px 10px">';
            list.forEach(function (d) {
                html += _pageNodeHtml(d[0], d[1], ruleCount);
            });
            html += '</div></details>';
        });

        if (others.length) {
            html += '<details open style="margin:2px 0;border:1px solid #f1f5f9;border-radius:10px;background:#f8fafc">';
            html += '<summary style="cursor:pointer;padding:8px 10px;font-weight:800;font-size:.76rem;list-style:none"><span style="display:inline-block;width:16px;color:#64748b">▾</span>📦 سایر</summary>';
            html += '<div style="padding:2px 10px 8px 10px">';
            others.forEach(function (d) { html += _pageNodeHtml(d[0], d[1], ruleCount); });
            html += '</div></details>';
        }

        html += '</div>';
        html += '<p class="muted" style="font-size:.7rem;margin-top:8px;line-height:1.8">💡 «قواعد نمایش سند» زیر شاخهٔ «فهرست اسناد» است — برای شرط گذاشتن روی تفصیلِ اسناد (مثلاً فقط اسناد بانک ملی و ملت) از آن یا از تب «قواعد نمایش اسناد» استفاده کن.</p>';

        box.innerHTML = html;

        /* بایندها */
        box.querySelectorAll('.upt-act').forEach(function (cb) {
            cb.onchange = function () {
                var page = cb.getAttribute('data-page'), act = cb.getAttribute('data-action');
                if (_draft.pages[page]) _draft.pages[page][act] = cb.checked;
            };
        });
        box.querySelectorAll('.upt-gorules').forEach(function (b) {
            b.onclick = function () { renderRulesForm(); showTab('limits'); };
        });
    }

    function _pageNodeHtml(page, title, ruleCount) {
        var reg = _reg();
        var actions = reg.pageActions(page);
        var rec = _draft.pages[page] || {};
        var html = '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:6px 4px;border-bottom:1px dashed #f1f5f9">';
        html += '<span style="font-size:.74rem;font-weight:700;color:#1e293b;min-width:110px">' + _esc(title) + '</span>';
        actions.forEach(function (a) {
            var meta = reg.actions[a] || { label: a };
            var checked = rec[a] !== false;
            html += '<label style="display:inline-flex;align-items:center;gap:4px;border:1px solid '
                + (checked ? '#bfdbfe;background:#eff6ff' : '#e2e8f0;background:#fff')
                + ';border-radius:99px;padding:2px 8px;font-size:.66rem;cursor:pointer;user-select:none">'
                + '<input type="checkbox" class="upt-act" data-page="' + page + '" data-action="' + a + '"' + (checked ? ' checked' : '')
                + ' style="width:13px;height:13px;accent-color:#2563eb;cursor:pointer"> ' + _esc(meta.label) + '</label>';
        });
        if (page === 'voucher-list') {
            html += '<button type="button" class="btn-secondary upt-gorules" style="padding:3px 10px;font-size:.66rem;margin-inline-start:auto">'
                + '🚫 قاعده نمایش سند (' + ruleCount + ')</button>';
        }
        html += '</div>';
        return html;
    }

    /* ============================================================
       تب ۲ — سازنده قواعد شرطی نمایش اسناد
       ============================================================ */
    function _ruleSentence(r) {
        var vals = r.ids.length;
        var kind = _kindLabel(r.kind);
        if (r.mode === 'only') {
            var base = 'فقط اسنادی دیده می‌شوند که ' + kind + ' آن یکی از ' + vals + ' مورد انتخابی باشد';
            if (r.allowEmpty) base += ' (اسناد بدون این تفصیل هم دیده می‌شوند)';
            return base + '.';
        }
        return 'اسنادی که ' + kind + ' آن یکی از ' + vals + ' مورد انتخابی باشد، نمایش داده نمی‌شوند.';
    }

    function _itemsOfStore(store) {
        var items = DB.load(store, []);
        if (!Array.isArray(items)) items = [];
        return items;
    }

    function _itemLabel(it) {
        var title = (it.title || it.bank || it.name || ((it.first || '') + ' ' + (it.last || '')) || it.id) || '';
        return String(title).trim() || String(it.id).slice(0, 6);
    }

    function renderRulesForm() {
        var reg = _reg();
        var box = _m('user-perms-limits');
        if (!box) return;

        var html = '<div style="max-height:46vh;overflow:auto;display:flex;flex-direction:column;gap:10px">';

        if (!_draft.rules.length) {
            html += '<div style="border:1px dashed #cbd5e1;border-radius:12px;padding:16px;text-align:center;background:#f8fafc">'
                + '<div style="font-size:.8rem;font-weight:800;color:#475569">هنوز قاعده‌ای نساخته‌ای</div>'
                + '<div style="font-size:.7rem;color:#64748b;margin-top:4px;line-height:1.9">مثال: «فقط اسنادی دیده شوند که تفصیل بانکی آن‌ها بانک ملی یا ملت-۱۲۳ است»<br>دکمه پایین را بزن و قاعده اول را بساز.</div></div>';
        }

        _draft.rules.forEach(function (r, idx) {
            html += '<div style="border:1px solid #e2e8f0;border-radius:12px;padding:10px;background:#fff" data-rid="' + _esc(r.id) + '">';

            /* سربرگ قاعده */
            html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">'
                + '<b style="font-size:.74rem;color:#0f172a">قاعده ' + (idx + 1) + '</b>'
                + '<button type="button" class="btn-secondary upr-del" data-rid="' + _esc(r.id) + '" style="margin-inline-start:auto;padding:3px 10px;font-size:.66rem">🗑 حذف قاعده</button>'
                + '</div>';

            /* انتخاب حالت — دکمه دوتایی (نه رادیو) */
            html += '<div style="display:flex;gap:6px;margin-bottom:8px">'
                + '<button type="button" class="upr-mode' + (r.mode === 'only' ? ' upr-mode-on' : '') + '" data-rid="' + _esc(r.id) + '" data-mode="only" '
                + 'style="flex:1;padding:7px;border-radius:10px;font-size:.7rem;font-weight:800;cursor:pointer;border:1.5px solid '
                + (r.mode === 'only' ? '#059669;background:#ecfdf5;color:#065f46' : '#e2e8f0;background:#f8fafc;color:#64748b') + '">🟢 فقط این‌ها را ببیند</button>'
                + '<button type="button" class="upr-mode' + (r.mode === 'hide' ? ' upr-mode-on' : '') + '" data-rid="' + _esc(r.id) + '" data-mode="hide" '
                + 'style="flex:1;padding:7px;border-radius:10px;font-size:.7rem;font-weight:800;cursor:pointer;border:1.5px solid '
                + (r.mode === 'hide' ? '#dc2626;background:#fef2f2;color:#991b1b' : '#e2e8f0;background:#f8fafc;color:#64748b') + '">🔴 این‌ها را نبیند</button>'
                + '</div>';

            /* انتخاب نوع تفصیل */
            html += '<div style="font-size:.72rem;color:#334155;margin-bottom:6px;line-height:2">اسنادی که <b>' + _kindLabel(r.kind) + '</b> آن:</div>';
            html += '<select class="upr-kind" data-rid="' + _esc(r.id) + '" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:8px;font-size:.72rem;background:#f8fafc;margin-bottom:8px">';
            reg.limitKinds.forEach(function (k) {
                html += '<option value="' + k[0] + '"' + (r.kind === k[0] ? ' selected' : '') + '>' + _esc(k[1]) + '</option>';
            });
            html += '</select>';

            /* انتخابگر مقادیر — فقط با کلیک باز می‌شود (لیست‌ها پنهان‌اند) */
            html += '<div style="font-size:.72rem;color:#334155;margin-bottom:5px">' + (r.mode === 'only' ? 'از این‌هاست:' : 'یکی از این‌ها باشد:') + '</div>';
            html += '<button type="button" class="btn-secondary upr-pick-toggle" data-rid="' + _esc(r.id) + '" style="width:100%;padding:8px;font-size:.72rem">'
                + '🔍 انتخاب از فهرست (' + r.ids.length + ' مورد)</button>';

            /* چیپ‌های انتخاب‌شده */
            if (r.ids.length) {
                html += '<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:6px">';
                r.ids.forEach(function (idv) {
                    var lbl = _ruleIdLabel(r.kind, idv);
                    html += '<span style="display:inline-flex;align-items:center;gap:4px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:99px;padding:2px 8px;font-size:.66rem">'
                        + _esc(lbl) + '<button type="button" class="upr-chip-del" data-rid="' + _esc(r.id) + '" data-id="' + _esc(idv) + '" '
                        + 'style="border:none;background:none;color:#dc2626;cursor:pointer;font-size:.8rem;line-height:1">×</button></span>';
                });
                html += '</div>';
            }

            /* پنل انتخابگر (پنهان تا کلیک) */
            html += '<div class="upr-pick-panel" data-rid="' + _esc(r.id) + '" style="display:none;margin-top:8px;border:1px solid #e2e8f0;border-radius:10px;padding:8px;background:#f8fafc">';
            var kdef = null;
            reg.limitKinds.forEach(function (k) { if (k[0] === r.kind) kdef = k; });
            var items = kdef ? _itemsOfStore(kdef[2]) : [];
            if (items.length) {
                html += '<input type="text" class="upr-search" data-rid="' + _esc(r.id) + '" placeholder="جستجو…" '
                    + 'style="width:100%;padding:6px 10px;border:1px solid #cbd5e1;border-radius:8px;font-size:.72rem;margin-bottom:6px">';
                html += '<div class="upr-pick-list" data-rid="' + _esc(r.id) + '" style="max-height:180px;overflow:auto;display:flex;flex-direction:column;gap:3px">';
                items.forEach(function (it) {
                    var lbl = _itemLabel(it);
                    var checked = r.ids.indexOf(it.id) !== -1;
                    html += '<label class="upr-item" data-lbl="' + _esc(lbl.toLowerCase()) + '" style="display:flex;align-items:center;gap:7px;background:#fff;border:1px solid #f1f5f9;border-radius:8px;padding:5px 9px;font-size:.72rem;cursor:pointer">'
                        + '<input type="checkbox" class="upr-cb" data-rid="' + _esc(r.id) + '" data-id="' + _esc(it.id) + '"' + (checked ? ' checked' : '')
                        + ' style="width:14px;height:14px;accent-color:#2563eb"> ' + _esc(lbl) + '</label>';
                });
                html += '</div>';
            } else {
                html += '<div style="font-size:.7rem;color:#94a3b8">موردی تعریف نشده است — اول از منوی مربوطه چند مورد اضافه کن.</div>';
            }
            html += '</div>';

            /* گزینه اسناد بدون تفصیل (فقط حالت only) */
            if (r.mode === 'only') {
                html += '<label style="display:flex;align-items:center;gap:6px;margin-top:8px;font-size:.7rem;color:#475569;cursor:pointer">'
                    + '<input type="checkbox" class="upr-empty" data-rid="' + _esc(r.id) + '"' + (r.allowEmpty ? ' checked' : '')
                    + ' style="width:14px;height:14px;accent-color:#059669"> اسنادِ بدونِ این نوع تفصیل هم دیده شوند</label>';
            }

            /* جمله زنده قاعده */
            html += '<div style="margin-top:8px;font-size:.68rem;color:#059669;background:#ecfdf5;border-radius:8px;padding:5px 9px;line-height:1.9">📌 ' + _esc(_ruleSentence(r)) + '</div>';

            html += '</div>';
        });

        html += '</div>';
        html += '<button type="button" id="upr-add" class="btn-primary" style="width:100%;margin-top:10px;padding:9px">➕ قاعده جدید</button>';
        html += '<p class="muted" style="font-size:.7rem;margin-top:8px;line-height:1.9">💡 چند قاعدهٔ «فقط» با هم ترکیب می‌شوند (سند باید همه را پاس کند). قواعد «نبیند» هر کدام که بخورد سند را پنهان می‌کند. این قواعد روی فهرست اسناد، داشبورد و همه گزارش‌ها یک‌جا اعمال می‌شود.</p>';

        box.innerHTML = html;

        /* ---------- بایندها ---------- */
        box.querySelector('#upr-add').onclick = function () {
            _draft.rules.push({
                id: 'r' + Date.now() + '_' + Math.floor(Math.random() * 999),
                target: 'voucher', mode: 'only', kind: 'bank', ids: [], allowEmpty: false
            });
            renderRulesForm();
        };

        box.querySelectorAll('.upr-del').forEach(function (b) {
            b.onclick = function () {
                var rid = b.getAttribute('data-rid');
                _draft.rules = _draft.rules.filter(function (x) { return x.id !== rid; });
                renderRulesForm(); renderPermsTree();
            };
        });

        box.querySelectorAll('.upr-mode').forEach(function (b) {
            b.onclick = function () {
                var rid = b.getAttribute('data-rid');
                _draft.rules.forEach(function (x) { if (x.id === rid) x.mode = b.getAttribute('data-mode'); });
                renderRulesForm();
            };
        });

        box.querySelectorAll('.upr-kind').forEach(function (sel) {
            sel.onchange = function () {
                var rid = sel.getAttribute('data-rid');
                _draft.rules.forEach(function (x) { if (x.id === rid) { x.kind = sel.value; x.ids = []; } });
                renderRulesForm();
            };
        });

        box.querySelectorAll('.upr-pick-toggle').forEach(function (b) {
            b.onclick = function () {
                var rid = b.getAttribute('data-rid');
                var panel = box.querySelector('.upr-pick-panel[data-rid="' + rid + '"]');
                if (panel) panel.style.display = (panel.style.display === 'none') ? 'block' : 'none';
            };
        });

        box.querySelectorAll('.upr-search').forEach(function (inp) {
            inp.oninput = function () {
                var q = inp.value.trim().toLowerCase();
                var rid = inp.getAttribute('data-rid');
                box.querySelectorAll('.upr-pick-list[data-rid="' + rid + '"] .upr-item').forEach(function (row) {
                    var lbl = row.getAttribute('data-lbl') || '';
                    row.style.display = (!q || lbl.indexOf(q) !== -1) ? 'flex' : 'none';
                });
            };
        });

        box.querySelectorAll('.upr-cb').forEach(function (cb) {
            cb.onchange = function () {
                var rid = cb.getAttribute('data-rid'), idv = cb.getAttribute('data-id');
                _draft.rules.forEach(function (x) {
                    if (x.id !== rid) return;
                    if (cb.checked) { if (x.ids.indexOf(idv) === -1) x.ids.push(idv); }
                    else { x.ids = x.ids.filter(function (y) { return y !== idv; }); }
                });
                renderRulesForm();
            };
        });

        box.querySelectorAll('.upr-chip-del').forEach(function (b) {
            b.onclick = function () {
                var rid = b.getAttribute('data-rid'), idv = b.getAttribute('data-id');
                _draft.rules.forEach(function (x) { if (x.id === rid) x.ids = x.ids.filter(function (y) { return y !== idv; }); });
                renderRulesForm();
            };
        });

        box.querySelectorAll('.upr-empty').forEach(function (cb) {
            cb.onchange = function () {
                var rid = cb.getAttribute('data-rid');
                _draft.rules.forEach(function (x) { if (x.id === rid) x.allowEmpty = cb.checked; });
                renderRulesForm();
            };
        });
    }

    /* برچسب فارسی یک شناسه برای چیپ‌ها */
    function _ruleIdLabel(kind, idv) {
        var kdef = null;
        _reg().limitKinds.forEach(function (k) { if (k[0] === kind) kdef = k; });
        if (kdef) {
            var items = _itemsOfStore(kdef[2]);
            for (var i = 0; i < items.length; i++) if (items[i].id === idv) return _itemLabel(items[i]);
        }
        return String(idv).slice(0, 8);
    }

    /* ============================================================
       ذخیره — قواعد + صفحات + limits مشتق‌شده (سازگاری با فیلترهای قبلی)
       ============================================================ */
    function saveUserPerms() {
        if (!_editUserId) return;
        if (!permsIsAdmin()) { showToast('⛔ فقط سرپرست'); return; }
        var users = DB.load('users', []);
        var u = null;
        users.forEach(function (x) { if (x.id === _editUserId) u = x; });
        if (!u) { showToast('کاربر یافت نشد'); return; }

        /* limits مشتق: اجتماع ids قواعد only به تفصیل هر نوع —
           تا فیلتر ماژول‌ها (اشخاص/بانک‌ها/...) هم همان محدوده را ببیند */
        var reg = _reg();
        var limits = {};
        reg.limitKinds.forEach(function (k) { limits[k[0]] = []; });
        _draft.rules.forEach(function (r) {
            if (r.mode === 'only' && limits[r.kind]) {
                r.ids.forEach(function (idv) { if (limits[r.kind].indexOf(idv) === -1) limits[r.kind].push(idv); });
            }
        });

        u.perms = {
            pages: JSON.parse(JSON.stringify(_draft.pages)),
            rules: JSON.parse(JSON.stringify(_draft.rules)),
            limits: limits
        };
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
        if (!confirm('همهٔ دسترسی‌ها و قواعد این کاربر به حالت پیش‌فرض (دسترسی کامل) برگردد؟')) return;
        var users = DB.load('users', []);
        users.forEach(function (x) {
            if (x.id === _editUserId) { delete x.perms; }
        });
        DB.save('users', users);
        showToast('↩️ دسترسی‌ها به حالت پیش‌فرض بازگشت');
        _loadDraft(null);
        renderPermsTree();
        renderRulesForm();
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
            b.onclick = function () {
                var which = b.getAttribute('data-uptab') || 'perms';
                if (which === 'limits') renderRulesForm();
                showTab(which);
            };
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

    console.log('✅ [modules/user-perms.js] loaded — v2.2.0');

})();
