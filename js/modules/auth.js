/* ============================================================
   پارسیس — احراز هویت (لاگین)
   مسیر: js/modules/auth.js
   ============================================================ */
'use strict';

// نرمال‌سازی نام کاربری برای جلوگیری از خطای حروف عربی و فارسی (ي و ی)
function normalizeFaLogin(s) {
    return String(s || '').replace(/[يى]/g, 'ی').replace(/[ك]/g, 'ک').trim().toLowerCase();
}

function checkAuth() {
    var currentUser = DB.load('auth.currentUser', null);
    if (!currentUser) {
        document.getElementById('login-overlay').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
        return false;
    } else {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        state.currentUser = currentUser;
        return true;
    }
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
        DB.save('auth.currentUser', found);
        errEl.style.display = 'none';
        
        // نمایش اپلیکیشن
        checkAuth();
        
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
    DB.remove('auth.currentUser');
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
