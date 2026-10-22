/* ============================================================
   پارسیس — احراز هویت (نسخه نهایی، بهینه‌شده و بدون لگ)
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

function forceBodyVisible() {
    if (document.body) {
        document.body.style.visibility = 'visible';
        document.body.style.display = '';
    }
}

function showLoginScreen() {
    var overlay = document.getElementById('login-overlay');
    var app = document.getElementById('app');
    if (overlay) overlay.style.display = 'flex';
    if (app) app.style.display = 'none';
    forceBodyVisible();
}

function showApp() {
    var overlay = document.getElementById('login-overlay');
    var app = document.getElementById('app');
    if (overlay) overlay.style.display = 'none';
    if (app) app.style.display = 'block';
    forceBodyVisible();
    var welcome = document.getElementById('welcome-overlay');
    if (welcome) {
        welcome.style.display = 'none';
        if (welcome.parentNode) welcome.parentNode.removeChild(welcome);
    }
}

function checkAuth() {
    var sessionStr = null;
    try { sessionStr = sessionStorage.getItem('parsis.session'); } catch(e) {}
    if (!sessionStr) { showLoginScreen(); return false; }
    try { state.currentUser = JSON.parse(sessionStr); } catch(e) { state.currentUser = { username: sessionStr }; }
    showApp();
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
        try { sessionStorage.setItem('parsis.justLoggedIn', '1'); } catch(e) {}
        setTimeout(function() { try { sessionStorage.removeItem('parsis.justLoggedIn'); } catch(e) {} }, 3000);

        state.currentUser = found;
        if (errEl) errEl.style.display = 'none';

        showApp();

        // ✅ بهینه‌سازی: فقط موارد ضروری رندر می‌شوند تا مرورگر فریز نشود
        setTimeout(function() {
            var renderFns = [
                'updateDateDisplay', 'updateTopbarPeriod', 'updateHomeWidgets',
                'applyPageHelpers', 'renderFrequentNav', 'updateEyeButtons'
            ];
            renderFns.forEach(function(fn) {
                if (typeof window[fn] === 'function') {
                    try { window[fn](); } catch(e) { console.warn('[' + fn + ']', e); }
                }
            });
        }, 30);

        if (typeof showToast === 'function') showToast('✅ خوش آمدید ' + found.username);
    } catch(e) {
        console.error('[auth] خطا در login:', e);
        try { showApp(); } catch(e2) {}
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

    document.addEventListener('click', function(e) {
        var t = e.target;
        if (!t) return;
        if (t.id === 'login-btn' || (t.closest && t.closest('#login-btn'))) {
            e.preventDefault(); login(); return;
        }
        if (t.id === 'logout-btn' || (t.closest && t.closest('#logout-btn'))) {
            e.preventDefault(); logout(); return;
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key !== 'Enter') return;
        var t = e.target;
        if (!t) return;
        if (t.id === 'login-password' || t.id === 'login-username') {
            e.preventDefault(); login();
        }
    });
}

window.checkAuth = checkAuth;
window.logout = logout;
window.bindAuthUI = bindAuthUI;
window.login = login;
