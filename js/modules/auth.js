/* ============================================================
   پارسیس — احراز هویت (بازنویسی کامل و ضد باگ)
   مسیر: js/modules/auth.js
   ============================================================ */
'use strict';

// ✅ ساخت کاربر پیش‌فرض در همان لحظه‌ی لود شدن ماژول (نه در init)
(function ensureDefaultUsersImmediately() {
    try {
        var users = DB.load('users', null);
        if (!users || !Array.isArray(users) || users.length === 0) {
            DB.save('users', [
                { id: 'u_admin', username: 'سرپرست', password: '1369', personId: '' }
            ]);
            console.log('👤 [auth] کاربر پیش‌فرض ساخته شد: سرپرست / 1369');
        }
    } catch (e) {
        console.error('[auth] خطا در ساخت کاربر پیش‌فرض:', e);
    }
})();

function normalizeFaLogin(s) {
    return String(s || '')
        .replace(/[يى]/g, 'ی')
        .replace(/[ك]/g, 'ک')
        .trim()
        .toLowerCase();
}

function forceBodyVisible() {
    if (document.body) {
        document.body.style.visibility = 'visible';
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
}

function checkAuth() {
    var sessionStr = null;
    try { sessionStr = sessionStorage.getItem('parsis.session'); } catch(e) {}

    if (!sessionStr) {
        showLoginScreen();
        return false;
    }

    try {
        state.currentUser = JSON.parse(sessionStr);
    } catch (e) {
        state.currentUser = { username: sessionStr };
    }
    showApp();
    return true;
}

function login() {
    var userInput = document.getElementById('login-username');
    var passInput = document.getElementById('login-password');
    var errEl = document.getElementById('login-error');
    var btn = document.getElementById('login-btn');

    var user = (userInput ? userInput.value : '').trim();
    var pass = (passInput ? passInput.value : '').trim();

    // اعتبارسنجی ورودی
    if (!user) {
        if (errEl) { errEl.textContent = 'نام کاربری را وارد کنید.'; errEl.style.display = 'block'; }
        if (userInput) userInput.focus();
        return;
    }
    if (!pass) {
        if (errEl) { errEl.textContent = 'کلمه عبور را وارد کنید.'; errEl.style.display = 'block'; }
        if (passInput) passInput.focus();
        return;
    }

    // خواندن لیست کاربران با fallback ایمن
    var users = [];
    try { users = DB.load('users', []); } catch(e) { users = []; }
    if (!Array.isArray(users) || users.length === 0) {
        users = [{ id: 'u_admin', username: 'سرپرست', password: '1369', personId: '' }];
        try { DB.save('users', users); } catch(e) {}
    }

    var found = users.find(function(u) {
        return normalizeFaLogin(u.username) === normalizeFaLogin(user) && u.password === pass;
    });

    if (found) {
        try { sessionStorage.setItem('parsis.session', JSON.stringify(found)); } catch(e) {}
        state.currentUser = found;
        if (errEl) errEl.style.display = 'none';

        // ✅ نمایش فوری برنامه (بدون نیاز به رفرش)
        showApp();

        // ✅ رفرش خودکار ویجت‌ها، تاپ‌بار، فرم‌ها و ...
        setTimeout(function() {
            try {
                if (typeof updateDateDisplay === 'function') updateDateDisplay();
                if (typeof updateTopbarPeriod === 'function') updateTopbarPeriod();
                if (typeof updateHomeWidgets === 'function') updateHomeWidgets();
                if (typeof applyPageHelpers === 'function') applyPageHelpers();
                if (typeof renderFrequentNav === 'function') renderFrequentNav();
                if (typeof initUsersPage === 'function') initUsersPage();
                if (typeof updateEyeButtons === 'function') updateEyeButtons();
                if (typeof attachDatePickers === 'function') attachDatePickers();
                if (typeof buildHeaderButtons === 'function') buildHeaderButtons();
                if (typeof makeAllTablesResizable === 'function') makeAllTablesResizable();
                if (typeof renderSmsInbox === 'function') renderSmsInbox();
                if (typeof updateSmsBadge === 'function') updateSmsBadge();
            } catch(e) { console.warn('[login re-render]', e); }
        }, 60);

        if (typeof showToast === 'function') showToast('✅ خوش آمدید ' + found.username);

    } else {
        if (errEl) {
            errEl.textContent = 'نام کاربری یا کلمه عبور اشتباه است.';
            errEl.style.display = 'block';
        }
        if (passInput) { passInput.value = ''; passInput.focus(); }
    }
}

function logout() {
    try { sessionStorage.removeItem('parsis.session'); } catch(e) {}
    location.reload();
}

function bindAuthUI() {
    // جلوگیری از بایند تکراری
    if (window._authUIBound) return;
    window._authUIBound = true;

    var loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            login();
        });
    }

    var passInput = document.getElementById('login-password');
    if (passInput) {
        passInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); login(); }
        });
    }

    var userInput = document.getElementById('login-username');
    if (userInput) {
        userInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                var pass = document.getElementById('login-password');
                if (pass) pass.focus();
            }
        });
    }
}

window.checkAuth = checkAuth;
window.logout = logout;
window.bindAuthUI = bindAuthUI;
window.login = login;
