/* ============================================================
   پارسیس — بخش «امنیت»: گروه کاربران + حقوق دسترسی + محدودیت‌ها
   مسیر: js/modules/user-perms.js   (✅ v2.4.0 — بازنویسی کامل)

   سه صفحه در منوی «🛡 امنیت»:
     ۱) sec-groups — «👥 گروه کاربران»: فهرست/تعریف گروه‌ها
     ۲) sec-perms — «🔐 حقوق دسترسی»: انتخاب کاربر یا گروه +
        درختوارهٔ دسترسی (دسته‌ها ← صفحات ← عمل‌ها) با چک‌باکس، نه دایره
     ۳) sec-limits — «🚫 محدودیت حقوق دسترسی»: انتخاب کاربر یا گروه +
        قواعد محدودیت نمایش اسناد (فقط این‌ها / پنهان‌سازی) با انتخاب از فهرست

   ذخیره:
     • گروه: userGroups = [{ id, name, desc, active, perms }]
     • کاربر: users[i].perms (روی گروه مقدم است) و users[i].groupId
     • دسترسی مؤثر در permissions.js با PERMS_MERGE ادغام می‌شود.

   سازگاری: دکمه 🔐 قدیمی فهرست کاربران (openUserPerms) به صفحه
   «حقوق دسترسی» می‌رود و همان کاربر را انتخاب می‌کند.
   ============================================================ */
'use strict';

/* ============================================================
   بخش ۱ — انتخاب هدف (کاربر / گروه) — مشترک بین دو فرم
   ============================================================ */

function _secTargetTypeOf(prefix) {
    var sel = document.getElementById(prefix + '-target-type');
    return sel ? (sel.value || 'user') : 'user';
}

function _secTargetIdOf(prefix) {
    var sel = document.getElementById(prefix + '-target');
    return sel ? (sel.value || '') : '';
}

/* پر کردن دراپ‌داون هدف — بر اساس نوع، کاربران غیرسرپرست یا گروه‌ها */
function _secFillTargets(prefix) {
    var type = _secTargetTypeOf(prefix);
    var sel = document.getElementById(prefix + '-target');
    if (!sel) return;
    var cur = sel.value;
    sel.innerHTML = '';
    if (type === 'group') {
        var groups = DB.load('userGroups', []);
        if (!Array.isArray(groups)) groups = [];
        if (!groups.length) {
            sel.innerHTML = '<option value="">— هنوز گروهی تعریف نشده —</option>';
            return;
        }
        sel.innerHTML = '<option value="">— گروه را انتخاب کنید —</option>';
        groups.forEach(function (g) {
            var o = document.createElement('option');
            o.value = g.id;
            o.textContent = (g.name || 'گروه') + ' (' + toFa(_secGroupMembers(g.id).length) + ' عضو)';
            sel.appendChild(o);
        });
    } else {
        var users = DB.load('users', []);
        if (!Array.isArray(users)) users = [];
        var normals = users.filter(function (u) { return u && u.isAdmin !== true; });
        if (!normals.length) {
            sel.innerHTML = '<option value="">— کاربر عادی‌ای وجود ندارد —</option>';
            return;
        }
        sel.innerHTML = '<option value="">— کاربر را انتخاب کنید —</option>';
        normals.forEach(function (u) {
            var o = document.createElement('option');
            o.value = u.id;
            var gName = '';
            if (u.groupId) {
                var g = (DB.load('userGroups', []) || []).filter(function (x) { return x && x.id === u.groupId; })[0];
                if (g) gName = ' [گروه: ' + g.name + ']';
            }
            o.textContent = (u.username || '') + gName + (u.active === false ? ' (غیرفعال)' : '');
            sel.appendChild(o);
        });
    }
    if (cur) sel.value = cur;
}

/* اعضای یک گروه */
function _secGroupMembers(groupId) {
    var users = DB.load('users', []);
    if (!Array.isArray(users)) users = [];
    return users.filter(function (u) { return u && u.groupId === groupId; });
}

/* پیدا کردن رکورد هدف */
function _secFindTarget(prefix) {
    var type = _secTargetTypeOf(prefix);
    var id = _secTargetIdOf(prefix);
    if (!id) return null;
    if (type === 'group') {
        var groups = DB.load('userGroups', []);
        var g = null;
        (Array.isArray(groups) ? groups : []).forEach(function (x) { if (x.id === id) g = x; });
        return g ? { type: 'group', rec: g } : null;
    }
    var users = DB.load('users', []);
    var u = null;
    (Array.isArray(users) ? users : []).forEach(function (x) { if (x.id === id) u = x; });
    return u ? { type: 'user', rec: u } : null;
}

function _secBindTargetControls(prefix, onLoad) {
    var typeSel = document.getElementById(prefix + '-target-type');
    var entSel = document.getElementById(prefix + '-target');
    /* ✅ دکمه بارگذاری — هم شناسه کوتاه و هم شناسه کامل HTML را می‌پذیرد */
    var loadBtn = document.getElementById(prefix + '-load')
        || document.getElementById(prefix === 'sp' ? 'sec-perms-load' : 'sec-lim-load');
    if (typeSel && !typeSel.dataset.bound) {
        typeSel.dataset.bound = '1';
        typeSel.onchange = function () { _secFillTargets(prefix); };
    }
    if (loadBtn && !loadBtn.dataset.bound) {
        loadBtn.dataset.bound = '1';
        loadBtn.onclick = function () { onLoad(); };
    }
    if (entSel && !entSel.dataset.bound) {
        entSel.dataset.bound = '1';
        entSel.onchange = function () { onLoad(); };
    }
}

/* ============================================================
   بخش ۲ — صفحه «گروه کاربران» (sec-groups)
   ============================================================ */

function renderSecGroupsList() {
    if (!permsIsAdmin()) { showToast('⛔ فقط سرپرست به بخش امنیت دسترسی دارد'); return; }
    var groups = DB.load('userGroups', []);
    if (!Array.isArray(groups)) groups = [];
    var tb = document.getElementById('sec-groups-body');
    if (!tb) return;
    tb.innerHTML = '';

    var filterEl = document.getElementById('sec-groups-filter');
    var filter = filterEl ? (filterEl.value || '').toLowerCase() : '';
    var shown = 0;

    groups.forEach(function (g) {
        var members = _secGroupMembers(g.id);
        var hay = ((g.name || '') + ' ' + (g.desc || '')).toLowerCase();
        if (filter && hay.indexOf(filter) === -1) return;
        shown++;
        var activeBadge = (g.active !== false)
            ? '<span class="badge badge-approved">✓ فعال</span>'
            : '<span class="badge badge-draft">غیرفعال</span>';
        var permsSummary = (g.perms && g.perms.pages && Object.keys(g.perms.pages).length)
            ? toFa(Object.keys(g.perms.pages).length) + ' صفحه تنظیم‌شده'
            : 'بدون محدودیت';
        var tr = document.createElement('tr');
        tr.innerHTML =
              '<td>' + esc(g.name || '—') + '</td>'
            + '<td>' + esc(g.desc || '—') + '</td>'
            + '<td>' + toFa(members.length) + '</td>'
            + '<td>' + esc(permsSummary) + '</td>'
            + '<td>' + activeBadge + '</td>'
            + '<td><div class="row-actions">'
            +   '<button class="row-btn perms" data-id="' + esc(g.id) + '" title="حقوق دسترسی گروه">🔐</button>'
            +   Hist.rowBtn(g.id, g.name || '')
            +   '<button class="row-btn edit" data-id="' + esc(g.id) + '" title="ویرایش">✎</button>'
            +   '<button class="row-btn del" data-id="' + esc(g.id) + '" title="حذف">×</button>'
            + '</div></td>';
        tb.appendChild(tr);
    });

    if (shown === 0) tb.innerHTML = '<tr><td colspan="6" class="empty-row">گروهی تعریف نشده است — از تب «✏️ تعریف گروه» اولین گروه را بسازید.</td></tr>';

    var countEl = document.getElementById('sec-groups-count');
    if (countEl) countEl.textContent = toFa(shown);

    tb.querySelectorAll('.row-btn.perms').forEach(function (b) {
        b.onclick = function () { openSecurityPerms('group', b.getAttribute('data-id')); };
    });
    Hist.bindRowButtons(tb, 'userGroups');

    tb.querySelectorAll('.row-btn.edit').forEach(function (b) {
        b.onclick = function () {
            var id = b.getAttribute('data-id');
            var g = (DB.load('userGroups', []) || []).filter(function (x) { return x && x.id === id; })[0];
            if (!g) return;
            _secFillGroupForm(g);
            var tabBtn = document.querySelector('#page-sec-groups .tab-btn[data-tab="sg-add"]');
            if (tabBtn) tabBtn.click();
        };
    });

    tb.querySelectorAll('.row-btn.del').forEach(function (b) {
        b.onclick = function () {
            var id = b.getAttribute('data-id');
            var g = (DB.load('userGroups', []) || []).filter(function (x) { return x && x.id === id; })[0];
            if (!g) return;
            var members = _secGroupMembers(id);
            if (members.length) {
                if (!confirm('گروه «' + g.name + '» ' + toFa(members.length) + ' عضو دارد. با حذف گروه، عضویت اعضا آزاد می‌شود (تنظیمات خودشان می‌ماند). حذف شود؟')) return;
            } else {
                if (!confirm('حذف گروه «' + g.name + '»؟')) return;
            }
            var before = JSON.parse(JSON.stringify(g));
            var rest = (DB.load('userGroups', []) || []).filter(function (x) { return x && x.id !== id; });
            DB.save('userGroups', rest);
            /* آزادسازی عضویت */
            var users = DB.load('users', []);
            var uChanged = false;
            (Array.isArray(users) ? users : []).forEach(function (u) {
                if (u.groupId === id) { u.groupId = ''; uChanged = true; }
            });
            if (uChanged) DB.save('users', users);
            Hist.log('userGroups', id, 'حذف', before, null, g.name || '');
            renderSecGroupsList();
            showToast('🗑 گروه حذف شد');
        };
    });

    if (typeof buildFilterRow === 'function') buildFilterRow(document.getElementById('sec-groups-table'));
}

function _secFillGroupForm(g) {
    document.getElementById('sg-id').value = (g && g.id) || '';
    document.getElementById('sg-name').value = (g && g.name) || '';
    document.getElementById('sg-desc').value = (g && g.desc) || '';
    document.getElementById('sg-active').checked = !g || g.active !== false;
    var btn = document.getElementById('save-sec-group');
    if (btn) btn.innerHTML = '💾 ذخیره تغییرات';
}

function clearSecGroupForm() {
    document.getElementById('sg-id').value = '';
    document.getElementById('sg-name').value = '';
    document.getElementById('sg-desc').value = '';
    document.getElementById('sg-active').checked = true;
    var btn = document.getElementById('save-sec-group');
    if (btn) btn.innerHTML = '💾 ذخیره';
}

function bindSecGroupsForm() {
    var saveBtn = document.getElementById('save-sec-group');
    if (saveBtn && !saveBtn.dataset.bound) {
        saveBtn.dataset.bound = '1';
        saveBtn.onclick = function () {
            var id = document.getElementById('sg-id').value;
            var name = (document.getElementById('sg-name').value || '').trim();
            var desc = (document.getElementById('sg-desc').value || '').trim();
            var active = document.getElementById('sg-active').checked;
            if (!name) { alert('⚠️ نام گروه اجباری است.'); return; }
            var groups = DB.load('userGroups', []);
            if (!Array.isArray(groups)) groups = [];
            var dup = groups.filter(function (x) { return x && x.id !== id && (x.name || '').trim() === name; })[0];
            if (dup) { alert('⚠️ گروهی با نام «' + name + '» قبلاً ثبت شده است.'); return; }

            var before = null, rec = null;
            if (id) {
                groups.forEach(function (x) { if (x.id === id) before = JSON.parse(JSON.stringify(x)); });
                if (!before) { alert('❌ گروه یافت نشد.'); return; }
                rec = before;
                rec.name = name; rec.desc = desc; rec.active = active;
                groups = groups.map(function (x) { return x.id === id ? rec : x; });
                Hist.log('userGroups', id, 'ویرایش', before, rec);
                showToast('✅ تغییرات گروه ذخیره شد.');
            } else {
                rec = { id: uid(), name: name, desc: desc, active: active, perms: null };
                groups.push(rec);
                Hist.log('userGroups', rec.id, 'ایجاد', null, rec);
                showToast('✅ گروه «' + name + '» ایجاد شد.');
            }
            DB.save('userGroups', groups);
            clearSecGroupForm();
            renderSecGroupsList();
            var listTab = document.querySelector('#page-sec-groups .tab-btn[data-tab="sg-list"]');
            if (listTab) listTab.click();
        };
    }
    var newBtn = document.getElementById('new-sec-group');
    if (newBtn && !newBtn.dataset.bound) {
        newBtn.dataset.bound = '1';
        newBtn.onclick = clearSecGroupForm;
    }
    var f = document.getElementById('sec-groups-filter');
    if (f && !f.dataset.bound) {
        f.dataset.bound = '1';
        f.addEventListener('input', renderSecGroupsList);
    }
}

function initSecGroupsPage() {
    if (!permsIsAdmin()) return;
    renderSecGroupsList();
    bindSecGroupsForm();
}

/* ============================================================
   بخش ۳ — صفحه «حقوق دسترسی» (sec-perms) — درختواره‌ای
   ============================================================ */

var _secPermsDraft = null;   /* { pages: {page:{act:bool}} } — تنظیم خام هدف */
var _secPermsTarget = null;  /* { type, rec } */

/* پیش‌فرض یک صفحه — همه عمل‌ها باز */
function _secDefaultPageRec(page) {
    var rec = {};
    var reg = window.PERMS_REGISTRY;
    reg.pageActions(page).forEach(function (a) { rec[a] = true; });
    return rec;
}

/* ساخت پیش‌نویس از تنظیم خام هدف (مقادیر تنظیم‌نشده = باز) */
function _secLoadPermsDraft(target) {
    var reg = window.PERMS_REGISTRY;
    var raw = (target && target.rec && target.rec.perms && typeof target.rec.perms === 'object') ? target.rec.perms : null;
    var draft = { pages: {} };
    reg.dataPages.forEach(function (d) {
        var page = d[0];
        var rec = {};
        reg.pageActions(page).forEach(function (a) {
            var v = undefined;
            if (raw && raw.pages && raw.pages[page]) v = raw.pages[page][a];
            rec[a] = (v === undefined) ? true : (v === true);
        });
        draft.pages[page] = rec;
    });
    reg.reportPages.forEach(function (d) {
        var page = d[0];
        var rec = {};
        reg.pageActions(page).forEach(function (a) {
            var v = undefined;
            if (raw && raw.pages && raw.pages[page]) v = raw.pages[page][a];
            rec[a] = (v === undefined) ? true : (v === true);
        });
        draft.pages[page] = rec;
    });
    return draft;
}

/* عنوان فارسی صفحه — از رجیستری */
function _secPageTitle(page) {
    var reg = window.PERMS_REGISTRY;
    var i;
    for (i = 0; i < reg.dataPages.length; i++) if (reg.dataPages[i][0] === page) return reg.dataPages[i][1];
    for (i = 0; i < reg.reportPages.length; i++) if (reg.reportPages[i][0] === page) return reg.reportPages[i][1];
    return page;
}

function renderSecPermsTree() {
    var box = document.getElementById('sec-perms-tree');
    if (!box || !_secPermsDraft) return;
    var reg = window.PERMS_REGISTRY;
    var cats = reg.treeCategories || [];

    /* صفحاتی که در هیچ دسته نیستند → «سایر» */
    var seen = {};
    cats.forEach(function (c) { c.pages.forEach(function (p) { seen[p] = 1; }); });
    var others = [];
    reg.dataPages.forEach(function (d) { if (!seen[d[0]]) others.push(d); });
    reg.reportPages.forEach(function (d) { if (!seen[d[0]]) others.push(d); });

    function _pageNode(page) {
        var rec = _secPermsDraft.pages[page] || {};
        var actions = reg.pageActions(page);
        var allOn = actions.every(function (a) { return rec[a] !== false; });
        var html = '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:6px 4px;border-bottom:1px dashed #f1f5f9">';
        html += '<label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;user-select:none" title="روشن/خاموش کردن همهٔ کارهای این صفحه">'
            + '<input type="checkbox" class="sp-master" data-page="' + page + '"' + (allOn ? ' checked' : '')
            + ' style="width:15px;height:15px;accent-color:#1d4ed8;cursor:pointer">'
            + '<span style="font-size:.74rem;font-weight:800;color:#1e293b;min-width:110px">' + esc(_secPageTitle(page)) + '</span></label>';
        actions.forEach(function (a) {
            var meta = reg.actions[a] || { label: a };
            var checked = rec[a] !== false;
            html += '<label style="display:inline-flex;align-items:center;gap:4px;border:1px solid '
                + (checked ? '#bfdbfe;background:#eff6ff' : '#fecaca;background:#fef2f2')
                + ';border-radius:99px;padding:2px 8px;font-size:.66rem;cursor:pointer;user-select:none">'
                + '<input type="checkbox" class="sp-act" data-page="' + page + '" data-action="' + a + '"' + (checked ? ' checked' : '')
                + ' style="width:13px;height:13px;accent-color:#2563eb;cursor:pointer"> ' + esc(meta.label) + '</label>';
        });
        html += '</div>';
        return html;
    }

    var html = '<div style="max-height:50vh;overflow:auto;border:1px solid #e2e8f0;border-radius:12px;padding:6px;background:#fff">';
    html += '<div style="font-size:.68rem;color:#64748b;padding:4px 8px 8px;line-height:1.9">'
        + '🌳 درخت دسترسی: هر دسته را باز کنید و فقط کارهایی را تیک بزنید که این '
        + (_secPermsTarget && _secPermsTarget.type === 'group' ? 'گروه' : 'کاربر')
        + ' اجازه انجامش را دارد. تیکِ سرِ صفحه = روشن/خاموش کردن همهٔ کارهای آن صفحه.</div>';

    cats.forEach(function (c) {
        var list = c.pages.filter(function (p) { return _secPermsDraft.pages[p]; });
        if (!list.length) return;
        html += '<details open style="margin:2px 0;border:1px solid #f1f5f9;border-radius:10px;background:#f8fafc">';
        html += '<summary style="cursor:pointer;padding:8px 10px;font-weight:800;font-size:.76rem;color:#0f172a;list-style:none">'
            + '<span style="display:inline-block;width:16px;color:#64748b">▾</span>' + esc(c.title)
            + '<span style="color:#94a3b8;font-weight:600;font-size:.66rem"> (' + toFa(list.length) + ')</span></summary>';
        html += '<div style="padding:2px 10px 8px 10px">';
        list.forEach(function (p) { html += _pageNode(p); });
        html += '</div></details>';
    });

    if (others.length) {
        html += '<details open style="margin:2px 0;border:1px solid #f1f5f9;border-radius:10px;background:#f8fafc">';
        html += '<summary style="cursor:pointer;padding:8px 10px;font-weight:800;font-size:.76rem;list-style:none"><span style="display:inline-block;width:16px;color:#64748b">▾</span>📦 سایر</summary>';
        html += '<div style="padding:2px 10px 8px 10px">';
        others.forEach(function (d) { html += _pageNode(d[0]); });
        html += '</div></details>';
    }

    html += '</div>';
    html += '<p style="font-size:.7rem;color:#64748b;margin-top:8px;line-height:1.9">💡 محدودیتِ دیدن اسناد (مثلاً فقط اسناد بانک ملی) جداگانه در صفحه «🚫 محدودیت حقوق دسترسی» تنظیم می‌شود.</p>';

    box.innerHTML = html;

    /* بایندها */
    box.querySelectorAll('.sp-act').forEach(function (cb) {
        cb.onchange = function () {
            var page = cb.getAttribute('data-page'), act = cb.getAttribute('data-action');
            if (_secPermsDraft.pages[page]) _secPermsDraft.pages[page][act] = cb.checked;
            /* رنگ چیپ */
            var lbl = cb.parentElement;
            if (lbl) {
                lbl.style.border = cb.checked ? '1px solid #bfdbfe' : '1px solid #fecaca';
                lbl.style.background = cb.checked ? '#eff6ff' : '#fef2f2';
            }
            _secSyncMaster(cb.getAttribute('data-page'));
        };
    });
    box.querySelectorAll('.sp-master').forEach(function (mc) {
        mc.onchange = function () {
            var page = mc.getAttribute('data-page');
            var on = mc.checked;
            var reg2 = window.PERMS_REGISTRY;
            reg2.pageActions(page).forEach(function (a) {
                if (_secPermsDraft.pages[page]) _secPermsDraft.pages[page][a] = on;
            });
            box.querySelectorAll('.sp-act[data-page="' + page + '"]').forEach(function (cb) {
                cb.checked = on;
                var lbl = cb.parentElement;
                if (lbl) {
                    lbl.style.border = on ? '1px solid #bfdbfe' : '1px solid #fecaca';
                    lbl.style.background = on ? '#eff6ff' : '#fef2f2';
                }
            });
        };
    });

    _secPermsSummary();
}

function _secSyncMaster(page) {
    var box = document.getElementById('sec-perms-tree');
    if (!box || !_secPermsDraft) return;
    var rec = _secPermsDraft.pages[page] || {};
    var actions = window.PERMS_REGISTRY.pageActions(page);
    var allOn = actions.every(function (a) { return rec[a] !== false; });
    var mc = box.querySelector('.sp-master[data-page="' + page + '"]');
    if (mc) mc.checked = allOn;
}

function _secPermsSummary() {
    var el = document.getElementById('sec-perms-summary');
    if (!el || !_secPermsDraft) return;
    var closedPages = 0, closedActs = 0;
    Object.keys(_secPermsDraft.pages).forEach(function (p) {
        var rec = _secPermsDraft.pages[p];
        var anyClosed = false;
        Object.keys(rec).forEach(function (a) {
            if (rec[a] === false) { closedActs++; anyClosed = true; }
        });
        if (anyClosed) closedPages++;
    });
    el.innerHTML = (closedPages === 0)
        ? '<span style="color:#059669">همهٔ صفحات و کارها باز است — بدون محدودیت</span>'
        : '<span style="color:#b45309">' + toFa(closedPages) + ' صفحه با محدودیت و ' + toFa(closedActs) + ' کارِ بسته</span>';
}

function loadSecPerms() {
    var target = _secFindTarget('sp');
    var infoEl = document.getElementById('sec-perms-info');
    if (!target) {
        if (infoEl) infoEl.innerHTML = '<span style="color:#b45309">⚠️ ابتدا نوع و مقصد (کاربر یا گروه) را انتخاب کنید.</span>';
        _secPermsDraft = null;
        _secPermsTarget = null;
        var box = document.getElementById('sec-perms-tree');
        if (box) box.innerHTML = '<div style="padding:18px;text-align:center;color:#94a3b8;font-size:.78rem">مقصدی انتخاب نشده است.</div>';
        return;
    }
    _secPermsTarget = target;
    _secPermsDraft = _secLoadPermsDraft(target);
    var lbl = target.type === 'group' ? 'گروه «' + (target.rec.name || '') + '»' : 'کاربر «' + (target.rec.username || '') + '»';
    var note = '';
    if (target.type === 'user' && target.rec.groupId) {
        var g = (DB.load('userGroups', []) || []).filter(function (x) { return x && x.id === target.rec.groupId; })[0];
        if (g) note = '<div style="font-size:.7rem;color:#64748b;margin-top:4px">این کاربر عضو گروه «' + esc(g.name) + '» است؛ هر کاری اینجا تیک نخورد، از تنظیم گروه پیروی می‌کند.</div>';
    }
    if (infoEl) infoEl.innerHTML = '🎯 مقصد: <b>' + esc(lbl) + '</b>' + note;
    renderSecPermsTree();
}

function saveSecPerms() {
    if (!_secPermsTarget || !_secPermsDraft) { showToast('⚠️ اول مقصد را انتخاب و بارگذاری کنید'); return; }
    var target = _secPermsTarget;
    /* فقط صفحاتی که حداقل یک کارشان بسته است ذخیره می‌شوند — بقیه «بدون تنظیم = باز» */
    var pages = {};
    Object.keys(_secPermsDraft.pages).forEach(function (p) {
        var rec = _secPermsDraft.pages[p];
        var out = {};
        var has = false;
        Object.keys(rec).forEach(function (a) {
            if (rec[a] === false) { out[a] = false; has = true; }
        });
        if (has) pages[p] = out;
    });

    if (target.type === 'group') {
        var groups = DB.load('userGroups', []);
        var before = null, rec = null;
        (Array.isArray(groups) ? groups : []).forEach(function (g) {
            if (g.id === target.rec.id) {
                before = JSON.parse(JSON.stringify(g));
                g.perms = { pages: pages, rules: (g.perms && Array.isArray(g.perms.rules)) ? g.perms.rules : [] };
                rec = g;
            }
        });
        if (!rec) { showToast('❌ گروه یافت نشد'); return; }
        DB.save('userGroups', groups);
        Hist.log('userGroups', rec.id, 'ویرایش', before, rec);
        showToast('✅ حقوق دسترسی گروه «' + (rec.name || '') + '» ذخیره شد.');
    } else {
        var users = DB.load('users', []);
        var beforeU = null, recU = null;
        (Array.isArray(users) ? users : []).forEach(function (u) {
            if (u.id === target.rec.id) {
                beforeU = JSON.parse(JSON.stringify(u));
                u.perms = { pages: pages, rules: (u.perms && Array.isArray(u.perms.rules)) ? u.perms.rules : [] };
                recU = u;
            }
        });
        if (!recU) { showToast('❌ کاربر یافت نشد'); return; }
        DB.save('users', users);
        Hist.log('users', recU.id, 'ویرایش', beforeU, recU);
        showToast('✅ حقوق دسترسی کاربر «' + (recU.username || '') + '» ذخیره شد.');
        try { window.dispatchEvent(new Event('parsisUserChanged')); } catch (e) {}
    }
    try { permsApplyNavVisibility(); } catch (e) {}
}

function initSecPermsPage() {
    if (!permsIsAdmin()) return;
    _secFillTargets('sp');
    _secBindTargetControls('sp', loadSecPerms);
    var saveBtn = document.getElementById('sec-perms-save');
    if (saveBtn && !saveBtn.dataset.bound) {
        saveBtn.dataset.bound = '1';
        saveBtn.onclick = saveSecPerms;
    }
    var expandBtn = document.getElementById('sec-perms-expand-all');
    var collapseBtn = document.getElementById('sec-perms-collapse-all');
    if (expandBtn) expandBtn.onclick = function () {
        document.querySelectorAll('#sec-perms-tree details').forEach(function (d) { d.open = true; });
    };
    if (collapseBtn) collapseBtn.onclick = function () {
        document.querySelectorAll('#sec-perms-tree details').forEach(function (d) { d.open = false; });
    };
}

/* باز کردن فرم دسترسی برای کاربر — سازگار با دکمه 🔐 قدیمی فهرست کاربران */
function openUserPerms(userId) {
    if (!permsIsAdmin()) { showToast('⛔ فقط سرپرست می‌تواند دسترسی‌ها را تغییر دهد'); return; }
    var typeSel = document.getElementById('sp-target-type');
    if (typeof goToPage === 'function') goToPage('sec-perms');
    setTimeout(function () {
        if (typeSel) typeSel.value = 'user';
        _secFillTargets('sp');
        var sel = document.getElementById('sp-target');
        if (sel) sel.value = userId;
        loadSecPerms();
    }, 250);
}

/* باز کردن فرم دسترسی با نوع و شناسه مشخص (از فهرست گروه‌ها) */
function openSecurityPerms(type, id) {
    if (!permsIsAdmin()) { showToast('⛔ فقط سرپرست می‌تواند دسترسی‌ها را تغییر دهد'); return; }
    if (typeof goToPage === 'function') goToPage('sec-perms');
    setTimeout(function () {
        var typeSel = document.getElementById('sp-target-type');
        if (typeSel) typeSel.value = type;
        _secFillTargets('sp');
        var sel = document.getElementById('sp-target');
        if (sel) sel.value = id;
        loadSecPerms();
    }, 250);
}

/* ============================================================
   بخش ۴ — صفحه «محدودیت حقوق دسترسی» (sec-limits) — قواعد نمایش اسناد
   ============================================================ */

var _secLimDraft = null;  /* { rules: [...] } */
var _secLimTarget = null;

var _secRuleKindLabel = {
    bank: 'تفصیل بانکی', cashbox: 'تفصیل صندوق', company: 'تفصیل شرکتی',
    project: 'تفصیل پروژه', person: 'تفصیل شخصی'
};

function _secRuleSentence(r) {
    var vals = r.ids.length;
    var kind = _secRuleKindLabel[r.kind] || r.kind;
    if (r.mode === 'only') {
        var base = 'فقط اسنادی دیده می‌شوند که ' + kind + ' آن یکی از ' + toFa(vals) + ' مورد انتخابی باشد';
        if (r.allowEmpty) base += ' (اسناد بدون این تفصیل هم دیده می‌شوند)';
        return base + '.';
    }
    return 'اسنادی که ' + kind + ' آن یکی از ' + toFa(vals) + ' مورد انتخابی باشد، نمایش داده نمی‌شوند.';
}

function _secRuleIdLabel(kind, idv) {
    try {
        var reg = window.PERMS_REGISTRY;
        var kdef = null;
        reg.limitKinds.forEach(function (k) { if (k[0] === kind) kdef = k; });
        if (!kdef) return idv;
        var it = (DB.load(kdef[2], []) || []).filter(function (x) { return x && x.id === idv; })[0];
        if (!it) return idv;
        return String(it.title || it.bank || it.name || ((it.first || '') + ' ' + (it.last || '')) || idv).trim() || String(idv).slice(0, 6);
    } catch (e) { return idv; }
}

function loadSecLimits() {
    var target = _secFindTarget('sl');
    var infoEl = document.getElementById('sec-lim-info');
    if (!target) {
        if (infoEl) infoEl.innerHTML = '<span style="color:#b45309">⚠️ ابتدا نوع و مقصد (کاربر یا گروه) را انتخاب کنید.</span>';
        _secLimDraft = null;
        _secLimTarget = null;
        var body = document.getElementById('sec-lim-body');
        if (body) body.innerHTML = '<div style="padding:18px;text-align:center;color:#94a3b8;font-size:.78rem">مقصدی انتخاب نشده است.</div>';
        return;
    }
    _secLimTarget = target;
    var raw = (target.rec && target.rec.perms && Array.isArray(target.rec.perms.rules)) ? target.rec.perms.rules : [];
    _secLimDraft = raw.map(function (r) {
        return {
            id: r.id || ('r' + Date.now() + '_' + Math.floor(Math.random() * 999)),
            target: 'voucher',
            mode: (r.mode === 'hide') ? 'hide' : 'only',
            kind: r.kind || 'bank',
            ids: Array.isArray(r.ids) ? r.ids.slice() : [],
            allowEmpty: r.allowEmpty === true
        };
    });
    var lbl = target.type === 'group' ? 'گروه «' + (target.rec.name || '') + '»' : 'کاربر «' + (target.rec.username || '') + '»';
    var note = '';
    if (target.type === 'user' && target.rec.groupId) {
        var g = (DB.load('userGroups', []) || []).filter(function (x) { return x && x.id === target.rec.groupId; })[0];
        if (g) note = '<div style="font-size:.7rem;color:#64748b;margin-top:4px">قواعد گروه «' + esc(g.name) + '» هم روی این کاربر اعمال می‌شود (قواعد اینجا جدا ذخیره می‌شوند).</div>';
    }
    if (infoEl) infoEl.innerHTML = '🎯 مقصد: <b>' + esc(lbl) + '</b>' + note;
    renderSecLimits();
}

function renderSecLimits() {
    var box = document.getElementById('sec-lim-body');
    if (!box || !_secLimDraft) return;
    var reg = window.PERMS_REGISTRY;

    var html = '<div style="max-height:50vh;overflow:auto;display:flex;flex-direction:column;gap:10px">';
    if (!_secLimDraft.length) {
        html += '<div style="border:1px dashed #cbd5e1;border-radius:12px;padding:16px;text-align:center;background:#f8fafc">'
            + '<div style="font-size:.8rem;font-weight:800;color:#475569">هنوز قاعده‌ای نساخته‌اید</div>'
            + '<div style="font-size:.7rem;color:#64748b;margin-top:4px;line-height:1.9">مثال: «فقط اسنادی دیده شوند که تفصیل بانکی آن‌ها بانک ملی یا ملت-۱۲۳ است»<br>دکمه پایین را بزنید و قاعده اول را بسازید.</div></div>';
    }

    _secLimDraft.forEach(function (r, idx) {
        html += '<div style="border:1px solid #e2e8f0;border-radius:12px;padding:10px;background:#fff" data-rid="' + esc(r.id) + '">';
        html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">'
            + '<b style="font-size:.74rem;color:#0f172a">قاعده ' + toFa(idx + 1) + '</b>'
            + '<button type="button" class="btn-secondary sl-del" data-rid="' + esc(r.id) + '" style="margin-inline-start:auto;padding:3px 10px;font-size:.66rem">🗑 حذف قاعده</button></div>';

        html += '<div style="display:flex;gap:6px;margin-bottom:8px">'
            + '<button type="button" class="sl-mode' + (r.mode === 'only' ? ' sl-mode-on' : '') + '" data-rid="' + esc(r.id) + '" data-mode="only" '
            + 'style="flex:1;padding:7px;border-radius:10px;font-size:.7rem;font-weight:800;cursor:pointer;border:1.5px solid '
            + (r.mode === 'only' ? '#059669;background:#ecfdf5;color:#065f46' : '#e2e8f0;background:#f8fafc;color:#64748b') + '">🟢 فقط این‌ها را ببیند</button>'
            + '<button type="button" class="sl-mode' + (r.mode === 'hide' ? ' sl-mode-on' : '') + '" data-rid="' + esc(r.id) + '" data-mode="hide" '
            + 'style="flex:1;padding:7px;border-radius:10px;font-size:.7rem;font-weight:800;cursor:pointer;border:1.5px solid '
            + (r.mode === 'hide' ? '#dc2626;background:#fef2f2;color:#991b1b' : '#e2e8f0;background:#f8fafc;color:#64748b') + '">🔴 این‌ها را نبیند</button></div>';

        html += '<div style="font-size:.72rem;color:#334155;margin-bottom:6px">اسنادی که <b>' + esc(_secRuleKindLabel[r.kind] || r.kind) + '</b> آن:</div>';
        html += '<select class="sl-kind" data-rid="' + esc(r.id) + '" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:8px;font-size:.72rem;background:#f8fafc;margin-bottom:8px">';
        reg.limitKinds.forEach(function (k) {
            html += '<option value="' + k[0] + '"' + (r.kind === k[0] ? ' selected' : '') + '>' + esc(k[1]) + '</option>';
        });
        html += '</select>';

        html += '<div style="font-size:.72rem;color:#334155;margin-bottom:5px">' + (r.mode === 'only' ? 'از این‌هاست:' : 'یکی از این‌ها باشد:') + '</div>';
        html += '<button type="button" class="btn-secondary sl-pick-toggle" data-rid="' + esc(r.id) + '" style="width:100%;padding:8px;font-size:.72rem">'
            + '🔍 انتخاب از فهرست (' + toFa(r.ids.length) + ' مورد)</button>';

        if (r.ids.length) {
            html += '<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:6px">';
            r.ids.forEach(function (idv) {
                html += '<span style="display:inline-flex;align-items:center;gap:4px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:99px;padding:2px 8px;font-size:.66rem">'
                    + esc(_secRuleIdLabel(r.kind, idv)) + '<button type="button" class="sl-chip-del" data-rid="' + esc(r.id) + '" data-id="' + esc(idv) + '" '
                    + 'style="border:none;background:none;color:#dc2626;cursor:pointer;font-size:.8rem;line-height:1">×</button></span>';
            });
            html += '</div>';
        }

        html += '<div class="sl-pick-panel" data-rid="' + esc(r.id) + '" style="display:none;margin-top:8px;border:1px solid #e2e8f0;border-radius:10px;padding:8px;background:#f8fafc">';
        var kdef = null;
        reg.limitKinds.forEach(function (k) { if (k[0] === r.kind) kdef = k; });
        var items = kdef ? (DB.load(kdef[2], []) || []) : [];
        if (items.length) {
            html += '<input type="text" class="sl-search" data-rid="' + esc(r.id) + '" placeholder="🔍 جستجو…" '
                + 'style="width:100%;padding:6px 10px;border:1px solid #cbd5e1;border-radius:8px;font-size:.72rem;margin-bottom:6px">';
            html += '<div class="sl-pick-list" data-rid="' + esc(r.id) + '" style="max-height:180px;overflow:auto;display:flex;flex-direction:column;gap:3px">';
            items.forEach(function (it) {
                var lbl = String(it.title || it.bank || it.name || ((it.first || '') + ' ' + (it.last || '')) || it.id).trim();
                var checked = r.ids.indexOf(it.id) !== -1;
                html += '<label class="sl-item" data-lbl="' + esc(lbl.toLowerCase()) + '" style="display:flex;align-items:center;gap:7px;background:#fff;border:1px solid #f1f5f9;border-radius:8px;padding:5px 9px;font-size:.72rem;cursor:pointer">'
                    + '<input type="checkbox" class="sl-cb" data-rid="' + esc(r.id) + '" data-id="' + esc(it.id) + '"' + (checked ? ' checked' : '')
                    + ' style="width:14px;height:14px;accent-color:#2563eb"> ' + esc(lbl) + '</label>';
            });
            html += '</div>';
        } else {
            html += '<div style="font-size:.7rem;color:#94a3b8">موردی تعریف نشده است — اول از منوی مربوطه چند مورد اضافه کنید.</div>';
        }
        html += '</div>';

        if (r.mode === 'only') {
            html += '<label style="display:flex;align-items:center;gap:6px;margin-top:8px;font-size:.7rem;color:#475569;cursor:pointer">'
                + '<input type="checkbox" class="sl-empty" data-rid="' + esc(r.id) + '"' + (r.allowEmpty ? ' checked' : '')
                + ' style="width:14px;height:14px;accent-color:#059669"> اسنادِ بدونِ این نوع تفصیل هم دیده شوند</label>';
        }

        html += '<div style="margin-top:8px;font-size:.68rem;color:#059669;background:#ecfdf5;border-radius:8px;padding:5px 9px;line-height:1.9">📌 ' + esc(_secRuleSentence(r)) + '</div>';
        html += '</div>';
    });

    html += '</div>';
    html += '<button type="button" id="sl-add" class="btn-primary" style="width:100%;margin-top:10px;padding:9px">➕ قاعده جدید</button>';
    html += '<p style="font-size:.7rem;color:#64748b;margin-top:8px;line-height:1.9">💡 چند قاعدهٔ «فقط» با هم ترکیب می‌شوند (سند باید همه را پاس کند). قواعد «نبیند» هر کدام که بخورد سند را پنهان می‌کند. این قواعد روی فهرست اسناد، داشبورد و همهٔ گزارش‌ها یک‌جا اعمال می‌شود.</p>';

    box.innerHTML = html;

    /* ---------- بایندها ---------- */
    var addBtn = box.querySelector('#sl-add');
    if (addBtn) addBtn.onclick = function () {
        _secLimDraft.push({
            id: 'r' + Date.now() + '_' + Math.floor(Math.random() * 999),
            target: 'voucher', mode: 'only', kind: 'bank', ids: [], allowEmpty: false
        });
        renderSecLimits();
    };

    box.querySelectorAll('.sl-del').forEach(function (b) {
        b.onclick = function () {
            var rid = b.getAttribute('data-rid');
            _secLimDraft = _secLimDraft.filter(function (x) { return x.id !== rid; });
            renderSecLimits();
        };
    });

    box.querySelectorAll('.sl-mode').forEach(function (b) {
        b.onclick = function () {
            var rid = b.getAttribute('data-rid');
            _secLimDraft.forEach(function (x) { if (x.id === rid) x.mode = b.getAttribute('data-mode'); });
            renderSecLimits();
        };
    });

    box.querySelectorAll('.sl-kind').forEach(function (sel) {
        sel.onchange = function () {
            var rid = sel.getAttribute('data-rid');
            _secLimDraft.forEach(function (x) { if (x.id === rid) { x.kind = sel.value; x.ids = []; } });
            renderSecLimits();
        };
    });

    box.querySelectorAll('.sl-pick-toggle').forEach(function (b) {
        b.onclick = function () {
            var rid = b.getAttribute('data-rid');
            var panel = box.querySelector('.sl-pick-panel[data-rid="' + rid + '"]');
            if (panel) panel.style.display = (panel.style.display === 'none') ? 'block' : 'none';
        };
    });

    box.querySelectorAll('.sl-search').forEach(function (inp) {
        inp.oninput = function () {
            var q = inp.value.trim().toLowerCase();
            var rid = inp.getAttribute('data-rid');
            box.querySelectorAll('.sl-pick-list[data-rid="' + rid + '"] .sl-item').forEach(function (row) {
                var lbl = row.getAttribute('data-lbl') || '';
                row.style.display = (!q || lbl.indexOf(q) !== -1) ? 'flex' : 'none';
            });
        };
    });

    box.querySelectorAll('.sl-cb').forEach(function (cb) {
        cb.onchange = function () {
            var rid = cb.getAttribute('data-rid'), idv = cb.getAttribute('data-id');
            _secLimDraft.forEach(function (x) {
                if (x.id !== rid) return;
                var i = x.ids.indexOf(idv);
                if (cb.checked && i === -1) x.ids.push(idv);
                if (!cb.checked && i !== -1) x.ids.splice(i, 1);
            });
            renderSecLimits();
        };
    });

    box.querySelectorAll('.sl-chip-del').forEach(function (b) {
        b.onclick = function () {
            var rid = b.getAttribute('data-rid'), idv = b.getAttribute('data-id');
            _secLimDraft.forEach(function (x) {
                if (x.id !== rid) return;
                var i = x.ids.indexOf(idv);
                if (i !== -1) x.ids.splice(i, 1);
            });
            renderSecLimits();
        };
    });

    box.querySelectorAll('.sl-empty').forEach(function (cb) {
        cb.onchange = function () {
            var rid = cb.getAttribute('data-rid');
            _secLimDraft.forEach(function (x) { if (x.id === rid) x.allowEmpty = cb.checked; });
        };
    });
}

function saveSecLimits() {
    if (!_secLimTarget || !_secLimDraft) { showToast('⚠️ اول مقصد را انتخاب و بارگذاری کنید'); return; }
    var target = _secLimTarget;
    if (target.type === 'group') {
        var groups = DB.load('userGroups', []);
        var before = null, rec = null;
        (Array.isArray(groups) ? groups : []).forEach(function (g) {
            if (g.id === target.rec.id) {
                before = JSON.parse(JSON.stringify(g));
                g.perms = { pages: (g.perms && g.perms.pages) ? g.perms.pages : {}, rules: JSON.parse(JSON.stringify(_secLimDraft)) };
                rec = g;
            }
        });
        if (!rec) { showToast('❌ گروه یافت نشد'); return; }
        DB.save('userGroups', groups);
        Hist.log('userGroups', rec.id, 'ویرایش', before, rec);
        showToast('✅ محدودیت‌های گروه «' + (rec.name || '') + '» ذخیره شد.');
    } else {
        var users = DB.load('users', []);
        var beforeU = null, recU = null;
        (Array.isArray(users) ? users : []).forEach(function (u) {
            if (u.id === target.rec.id) {
                beforeU = JSON.parse(JSON.stringify(u));
                u.perms = { pages: (u.perms && u.perms.pages) ? u.perms.pages : {}, rules: JSON.parse(JSON.stringify(_secLimDraft)) };
                recU = u;
            }
        });
        if (!recU) { showToast('❌ کاربر یافت نشد'); return; }
        DB.save('users', users);
        Hist.log('users', recU.id, 'ویرایش', beforeU, recU);
        showToast('✅ محدودیت‌های کاربر «' + (recU.username || '') + '» ذخیره شد.');
        try { window.dispatchEvent(new Event('parsisUserChanged')); } catch (e) {}
    }
}

function initSecLimitsPage() {
    if (!permsIsAdmin()) return;
    _secFillTargets('sl');
    _secBindTargetControls('sl', loadSecLimits);
    var saveBtn = document.getElementById('sec-lim-save');
    if (saveBtn && !saveBtn.dataset.bound) {
        saveBtn.dataset.bound = '1';
        saveBtn.onclick = saveSecLimits;
    }
}

/* ============================================================
   صادرسازی
   ============================================================ */
window.renderSecGroupsList = renderSecGroupsList;
window.initSecGroupsPage   = initSecGroupsPage;
window.initSecPermsPage    = initSecPermsPage;
window.initSecLimitsPage   = initSecLimitsPage;
window.loadSecPerms        = loadSecPerms;
window.loadSecLimits       = loadSecLimits;
window.openUserPerms       = openUserPerms;
window.openSecurityPerms   = openSecurityPerms;
window._secGroupMembers    = _secGroupMembers;

console.log('✅ [modules/user-perms.js] loaded — v2.4.0 (بخش امنیت: گروه + درخت دسترسی + محدودیت)');
