/* ============================================================
   پارسیس — احراز هویت (نسخه پایدار)
   ============================================================ */
'use strict';

(function ensureDefaultUsers() {
    try {
        var users = DB.load('users', null);
        if (!users || !Array.isArray(users) || users.length === 0) {
            DB.save('users', [{ id: 'u_admin', username: 'سرپرست', password: '1369', personId: '' }]);
        }
    } catch(e) {}
})();

function normalizeFaLogin(s) {
    return String(s || '').replace(/[يى]/g, 'ی').replace(/[ك]/g, 'ک').trim().toLowerCase();
}

function checkAuth() {
    var sessionStr = null;
    try { sessionStr = sessionStorage.getItem('parsis.session'); } catch(e) {}
    if (!sessionStr) return false;
    try { state.currentUser = JSON.parse(sessionStr); } catch(e) { state.currentUser = { username: sessionStr }; }
    return true;
}

function login() {
    try {
        var userInput = document.getElementById('login-username');
        var passInput = document.getElementById('login-password');
        var errEl = document.getElementById('login-error');

        var user = (userInput ? userInput.value : '').trim();
        var pass = (passInput ? passInput.value : '').trim();

        if (!user || !pass) {
            if (errEl) { errEl.textContent = 'نام کاربری و کلمه عبور را وارد کنید.'; errEl.style.display = 'block'; }
            return;
        }

        var users = DB.load('users', []);
        if (!Array.isArray(users) || users.length === 0) {
            users = [{ id: 'u_admin', username: 'سرپرست', password: '1369', personId: '' }];
            DB.save('users', users);
        }

        var found = users.find(function(u) {
            return normalizeFaLogin(u.username) === normalizeFaLogin(user) && u.password === pass;
        });

        if (!found) {
            if (errEl) { errEl.textContent = 'نام کاربری یا کلمه عبور اشتباه است.'; errEl.style.display = 'block'; }
            if (passInput) { passInput.value = ''; passInput.focus(); }
            return;
        }

        try { sessionStorage.setItem('parsis.session', JSON.stringify(found)); } catch(e) {}
        
        var btn = document.getElementById('login-btn');
        if (btn) { btn.innerHTML = '⏳ در حال ورود...'; btn.disabled = true; }
        
        // رفرش صفحه برای بارگذاری کامل و بدون لگ
        setTimeout(function() { location.reload(); }, 200);

    } catch(e) {
        console.error('[auth] خطا در login:', e);
        alert('خطا در ورود.');
    }
}

function logout() {
    try { sessionStorage.removeItem('parsis.session'); } catch(e) {}
    location.reload();
}

function bindAuthUI() {
    if (window._authDelegated) return;
    window._authDelegated = true;

    var loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.onclick = function(e) { e.preventDefault(); login(); };
    
    var logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.onclick = function(e) { e.preventDefault(); logout(); };

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && (e.target.id === 'login-password' || e.target.id === 'login-username')) {
            e.preventDefault(); login();
        }
    });
}

window.checkAuth = checkAuth;
window.logout = logout;
window.bindAuthUI = bindAuthUI;
window.login = login;
