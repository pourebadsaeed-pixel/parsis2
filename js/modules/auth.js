/* ============================================================
   پارسیس — احراز هویت (نسخه ۲)
   مسیر: js/modules/auth.js
   
   ویژگی‌ها:
     ✅ چک کردن active (حساب غیرفعال نمی‌تواند وارد شود)
     ✅ ذخیره isAdmin در session
     ✅ پیام واضح برای حساب غیرفعال
   ============================================================ */
'use strict';

(function ensureDefaultUsers() {
    try {
        var users = DB.load('users', null);
        if (!users || !Array.isArray(users) || users.length === 0) {
            DB.save('users', [{
                id: 'u_admin',
                username: 'سرپرست',
                password: '1369',
                personId: '',
                isAdmin: true,
                active: true
            }]);
        }
    } catch (e) {}
})();

function normalizeFaLogin(s) {
    return String(s || '').replace(/[يى]/g, 'ی').replace(/[ك]/g, 'ک').trim().toLowerCase();
}

function checkAuth() {
    var sessionStr = null;
    try { sessionStr = sessionStorage.getItem('parsis.session'); } catch (e) {}
    if (!sessionStr) return false;
    try {
        state.currentUser = JSON.parse(sessionStr);
    } catch (e) {
        state.currentUser = { username: sessionStr };
    }

    /* رفرش isAdmin و active از DB (در صورت تغییر) */
    try {
        var users = DB.load('users', []);
        var found = users.find(function (u) { return u.id === state.currentUser.id; });
        if (found) {
            if (found.active === false) {
                /* کاربر غیرفعال شده — خروج اجباری */
                sessionStorage.removeItem('parsis.session');
                return false;
            }
            state.currentUser.isAdmin = found.isAdmin === true;
            state.currentUser.username = found.username;
            sessionStorage.setItem('parsis.session', JSON.stringify(state.currentUser));
        }
    } catch (e) {}

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
            users = [{
                id: 'u_admin',
                username: 'سرپرست',
                password: '1369',
                personId: '',
                isAdmin: true,
                active: true
            }];
            DB.save('users', users);
        }

        /* ۱. کاربر با این نام/پسورد */
        var found = users.find(function (u) {
            return normalizeFaLogin(u.username) === normalizeFaLogin(user) && u.password === pass;
        });

        if (!found) {
            if (errEl) {
                errEl.textContent = 'نام کاربری یا کلمه عبور اشتباه است.';
                errEl.style.display = 'block';
            }
            if (passInput) { passInput.value = ''; passInput.focus(); }
            return;
        }

        /* ۲. بررسی active */
        if (found.active === false) {
            if (errEl) {
                errEl.textContent = '⚠️ حساب کاربری شما غیرفعال است. با سرپرست تماس بگیرید.';
                errEl.style.display = 'block';
            }
            if (passInput) { passInput.value = ''; }
            return;
        }

        /* ۳. ذخیره session */
        try { sessionStorage.setItem('parsis.session', JSON.stringify(found)); } catch (e) {}

        var btn = document.getElementById('login-btn');
        if (btn) { btn.innerHTML = '⏳ در حال ورود...'; btn.disabled = true; }

        setTimeout(function () { location.reload(); }, 200);

    } catch (e) {
        console.error('[auth] خطا در login:', e);
        alert('خطا در ورود.');
    }
}

function logout() {
    try { sessionStorage.removeItem('parsis.session'); } catch (e) {}
    location.reload();
}

function bindAuthUI() {
    if (window._authDelegated) return;
    window._authDelegated = true;

    var loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.onclick = function (e) { e.preventDefault(); login(); };

    var logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.onclick = function (e) { e.preventDefault(); logout(); };

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && (e.target.id === 'login-password' || e.target.id === 'login-username')) {
            e.preventDefault();
            login();
        }
    });
}

window.checkAuth = checkAuth;
window.logout = logout;
window.bindAuthUI = bindAuthUI;
window.login = login;
