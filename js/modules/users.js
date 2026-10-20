/* ============================================================
   پارسیس — مدیریت کاربران
   مسیر: js/modules/users.js
   ============================================================ */
'use strict';

function getDefaultUsers() {
    return [
        { id: 'u_admin', username: 'سرپرست', password: '1369', personId: '' }
    ];
}

function initUsers() {
    var users = DB.load('users', null);
    if (!users) {
        DB.save('users', getDefaultUsers());
    }
}

function renderUsersList() {
    var list = DB.load('users', []);
    var tb = document.getElementById('users-list-body');
    if (!tb) return;
    tb.innerHTML = '';

    var filter = (document.getElementById('users-filter')?.value || '').toLowerCase();
    var persons = DB.load('persons', []);
    var pMap = {};
    persons.forEach(function(p) { pMap[p.id] = (p.first || '') + ' ' + (p.last || ''); });

    var shown = 0;
    list.forEach(function(u) {
        if (filter && u.username.toLowerCase().indexOf(filter) === -1) return;
        shown++;
        var pName = u.personId && pMap[u.personId] ? pMap[u.personId] : '—';
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + esc(u.username) + '</td>'
            + '<td>' + esc(pName) + '</td>'
            + '<td><div class="row-actions">'
            + '<button class="row-btn edit" data-id="' + u.id + '">✎</button>'
            + '<button class="row-btn del" data-id="' + u.id + '">×</button>'
            + '</div></td>';
        tb.appendChild(tr);
    });

    if (shown === 0) tb.innerHTML = '<tr><td colspan="3" class="empty-row">یافت نشد.</td></tr>';
    
    var countEl = document.getElementById('users-count');
    if (countEl) countEl.textContent = toFa(shown);

    // Attach actions
    tb.querySelectorAll('.row-btn.edit').forEach(function(b) {
        b.onclick = function() {
            var id = this.getAttribute('data-id');
            var u = DB.load('users', []).find(function(x) { return x.id === id; });
            if (!u) return;
            document.getElementById('user-id').value = u.id;
            document.getElementById('user-username').value = u.username;
            document.getElementById('user-password').value = u.password;
            document.getElementById('user-person').value = u.personId || '';
            document.querySelector('[data-tab="users-add"]').click();
        };
    });

    tb.querySelectorAll('.row-btn.del').forEach(function(b) {
        b.onclick = function() {
            if (!confirm('حذف شود؟')) return;
            var id = this.getAttribute('data-id');
            if (id === 'u_admin') { alert('کاربر پیش‌فرض قابل حذف نیست.'); return; }
            var l = DB.load('users', []).filter(function(x) { return x.id !== id; });
            DB.save('users', l);
            renderUsersList();
        };
    });
}

function clearUserForm() {
    document.getElementById('user-id').value = '';
    document.getElementById('user-username').value = '';
    document.getElementById('user-password').value = '';
    document.getElementById('user-person').value = '';
}

function bindUsersForm() {
    var saveBtn = document.getElementById('save-user');
    if (saveBtn) saveBtn.addEventListener('click', function() {
        var id = document.getElementById('user-id').value;
        var username = document.getElementById('user-username').value.trim();
        var password = document.getElementById('user-password').value.trim();
        var personId = document.getElementById('user-person').value;

        if (!username || !password) { alert('نام کاربری و کلمه عبور اجباری است.'); return; }

        var l = DB.load('users', []);
        if (l.some(function(x) { return x.username === username && x.id !== id; })) {
            alert('نام کاربری تکراری است.'); return;
        }

        if (id) {
            for (var i = 0; i < l.length; i++) {
                if (l[i].id === id) {
                    l[i].username = username;
                    l[i].password = password;
                    l[i].personId = personId;
                }
            }
        } else {
            l.push({ id: uid(), username: username, password: password, personId: personId });
        }
        DB.save('users', l);
        showToast('✅ کاربر ذخیره شد.');
        clearUserForm();
        renderUsersList();
        document.querySelector('[data-tab="users-list"]').click();
    });

    var newBtn = document.getElementById('new-user');
    if (newBtn) newBtn.addEventListener('click', clearUserForm);
}

function initUsersPage() {
    initUsers();
    var pSel = document.getElementById('user-person');
    if (pSel) {
        var persons = DB.load('persons', []);
        pSel.innerHTML = '<option value="">— بدون شخص —</option>';
        persons.forEach(function(p) {
            var o = document.createElement('option');
            o.value = p.id;
            o.textContent = (p.first || '') + ' ' + (p.last || '');
            pSel.appendChild(o);
        });
    }
    renderUsersList();
    bindUsersForm();
}

window.renderUsersList = renderUsersList;
window.initUsersPage = initUsersPage;
