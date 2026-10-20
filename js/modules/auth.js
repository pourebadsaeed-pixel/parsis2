/* ============================================================
   پارسیس — احراز هویت (لاگین با Session)
   مسیر: js/modules/auth.js
   ============================================================ */
'use strict';

function normalizeFaLogin(s) {
    return String(s || '').replace(/[يى]/g, 'ی').replace(/[ك]/g, 'ک').trim().toLowerCase();
}

function checkAuth() {
    // ✅ استفاده از sessionStorage برای اینکه با بستن مرورگر پاک شود
    var sessionStr = sessionStorage.getItem('parsis.session');
    var loginOverlay = document.getElementById('login-overlay');
    var appDiv = document.getElementById('app');

    if (!sessionStr) {
        if (loginOverlay) loginOverlay.style.display = 'flex';
        if (appDiv) appDiv.style.display = 'none';
        return false;
    }

    try {
        state.currentUser = JSON.parse(sessionStr);
    } catch (e) {
        state.currentUser = { username: sessionStr };
    }

    if (loginOverlay) loginOverlay.style.display = 'none';
    if (appDiv) appDiv.style.display = 'block';
    return true;
}

function login() {
    var user = document.getElementById('login-username').value.trim();
    var pass = document.getElementById('login-password').value.trim();
    var errEl = document.getElementById('login-error');

    var users = DB.load('users', []);
    var found = users.find(function(u) { 
        return normalizeFaLogin(u.username) === normalizeFaLogin(user) && u.password === pass; 
    });

    if (found) {
        // ✅ ذخیره در sessionStorage (با بستن مرورگر پاک می‌شود)
        sessionStorage.setItem('parsis.session', JSON.stringify(found));
        errEl.style.display = 'none';
        
        checkAuth(); // نمایش برنامه
        
        if (typeof initUsersPage === 'function' && document.getElementById('page-users')) {
            initUsersPage();
        }
        if (typeof showToast === 'function') showToast('✅ خوش آمدید ' + found.username);
    } else {
        errEl.textContent = 'نام کاربری یا کلمه عبور اشتباه است.';
        errEl.style.display = 'block';
    }
}

function logout() {
    sessionStorage.removeItem('parsis.session');
    location.reload();
}

function bindAuthUI() {
    var loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.addEventListener('click', login);
    
    var passInput = document.getElementById('login-password');
    if (passInput) passInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') login();
    });
    
    var userInput = document.getElementById('login-username');
    if (userInput) userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') document.getElementById('login-password').focus();
    });

    var logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.removeEventListener('click', logout);
        logoutBtn.addEventListener('click', logout);
    }
}

window.checkAuth = checkAuth;
window.logout = logout;
window.bindAuthUI = bindAuthUI;
