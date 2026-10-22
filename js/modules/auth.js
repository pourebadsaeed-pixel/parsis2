/* ============================================================
   پارسیس — احراز هویت (نسخه نهایی، بدون لگ با رفرش هوشمند)
   مسیر: js/modules/auth.js
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

        // ✅ ذخیره سشن
        try { sessionStorage.setItem('parsis.session', JSON.stringify(found)); } catch(e) {}
        try { sessionStorage.setItem('parsis.justLoggedIn', '1'); } catch(e) {}
        
        // ✅ نمایش پیام موفقیت
        var btn = document.getElementById('login-btn');
        if (btn) {
            btn.innerHTML = '✅ ورود موفق، لطفاً صبر کنید...';
            btn.style.background = 'linear-gradient(135deg,#10b981,#059669)';
        }
        
        // ✅ رفرش هوشمند (حل قطعی مشکل لگ)
        setTimeout(function() {
            location.reload();
        }, 300);

    } catch(e) {
        console.error('[auth] خطا در login:', e);
        alert('خطا در ورود: ' + e.message);
    }
}

function logout() {
    try { sessionStorage.removeItem('parsis.session'); } catch(e) {}
    try { sessionStorage.removeItem('parsis.justLoggedIn'); } catch(e) {}
    location.reload();
}

function bindAuthUI() {
    if (window._authDelegated) return;
    window._authDelegated = true;

    // اتصال مستقیم دکمه ورود
    var loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.onclick = function(e) {
            e.preventDefault();
            this.innerHTML = '⏳ در حال بررسی...';
            setTimeout(function() { login(); }, 50);
        };
    }

    // اتصال دکمه خروج
    var logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = function(e) { e.preventDefault(); logout(); };
    }

    // ورود با کلید Enter
    document.addEventListener('keydown', function(e) {
        if (e.key !== 'Enter') return;
        var t = e.target;
        if (t && (t.id === 'login-password' || t.id === 'login-username')) {
            e.preventDefault();
            login();
        }
    });
}

window.checkAuth = checkAuth;
window.logout = logout;
window.bindAuthUI = bindAuthUI;
window.login = login;
