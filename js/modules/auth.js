/* ============================================================
   پارسیس — احراز هویت (نسخه ۳)
   مسیر: js/modules/auth.js
   
   ویژگی‌ها:
     ✅ چک کردن active (حساب غیرفعال نمی‌تواند وارد شود)
     ✅ ذخیره isAdmin در session
     ✅ نمایش کارت کاربر فعلی در سایدبار
     ✅ خروج با تأیید
   ============================================================ */
'use strict';

/* ============================================================
   بخش ۱ — اطمینان از وجود کاربر پیش‌فرض
   ============================================================ */
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

/* ============================================================
   بخش ۲ — نمایش کارت کاربر فعلی در سایدبار
   ============================================================ */
function renderCurrentUserUI() {
    var user = state.currentUser;
    if (!user || !user.username) return;

    var old = document.getElementById('sidebar-user-card');
    if (old) old.remove();

    var sidebarFoot = document.querySelector('.sidebar-foot');
    if (!sidebarFoot) {
        /* سایدبار هنوز رندر نشده — دوباره امتحان کن */
        setTimeout(renderCurrentUserUI, 300);
        return;
    }

    var isAdmin = user.isAdmin === true;
    var icon = isAdmin ? '👑' : '👤';
    var roleLabel = isAdmin ? '👑 سرپرست' : '👤 کاربر عادی';
    var bgGradient = isAdmin
        ? 'linear-gradient(135deg,#fef3c7,#fde68a)'
        : 'linear-gradient(135deg,#dbeafe,#bfdbfe)';
    var borderColor = isAdmin ? '#f59e0b' : '#3b82f6';
    var iconBg = isAdmin
        ? 'linear-gradient(135deg,#fbbf24,#f59e0b)'
        : 'linear-gradient(135deg,#60a5fa,#3b82f6)';
    var textColor = isAdmin ? '#92400e' : '#1e40af';

    var card = document.createElement('div');
    card.id = 'sidebar-user-card';
    card.style.cssText =
        'padding:12px;margin-bottom:8px;' +
        'background:' + bgGradient + ';' +
        'border-radius:12px;' +
        'border:1.5px solid ' + borderColor + ';' +
        'box-shadow:0 2px 8px rgba(0,0,0,0.06);';

    card.innerHTML =
        '<div style="display:flex;align-items:center;gap:10px">' +
            '<div style="width:40px;height:40px;border-radius:50%;' +
                'background:' + iconBg + ';' +
                'color:#fff;display:flex;align-items:center;justify-content:center;' +
                'font-weight:900;font-size:1.15rem;flex-shrink:0;' +
                'box-shadow:0 2px 8px rgba(0,0,0,0.15)">' +
                icon +
            '</div>' +
            '<div style="flex:1;min-width:0;text-align:right">' +
                '<div style="font-weight:900;color:' + textColor + ';' +
                    'font-size:0.88rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
                    (typeof esc === 'function' ? esc(user.username) : user.username) +
                '</div>' +
                '<div style="font-size:0.7rem;color:#64748b;font-weight:700;margin-top:2px">' +
                    roleLabel +
                '</div>' +
            '</div>' +
        '</div>';

    sidebarFoot.insertBefore(card, sidebarFoot.firstChild);
}

/* ============================================================
   بخش ۳ — بررسی نشست (session)
   ============================================================ */
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

    /* نمایش کارت کاربر — چند بار تلاش کن تا سایدبار رندر بشه */
    setTimeout(renderCurrentUserUI, 500);
    setTimeout(renderCurrentUserUI, 1500);
    setTimeout(renderCurrentUserUI, 3000);

    return true;
}

/* ============================================================
   بخش ۴ — ورود
   ============================================================ */
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
            users = [{ id: 'u_admin', username: 'سرپرست', password: '1369', personId: '', isAdmin: true, active: true }];
            DB.save('users', users);
        }

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

        if (found.active === false) {
            if (errEl) {
                errEl.textContent = '⚠️ حساب کاربری شما غیرفعال است. با سرپرست تماس بگیرید.';
                errEl.style.display = 'block';
            }
            if (passInput) { passInput.value = ''; }
            return;
        }

        try { sessionStorage.setItem('parsis.session', JSON.stringify(found)); } catch (e) {}

        var btn = document.getElementById('login-btn');
        if (btn) { btn.innerHTML = '⏳ در حال ورود...'; btn.disabled = true; }

        setTimeout(function () { location.reload(); }, 200);

    } catch (e) {
        console.error('[auth] خطا در login:', e);
        alert('خطا در ورود.');
    }
}

/* ============================================================
   بخش ۵ — خروج
   ============================================================ */
function logout() {
    try { sessionStorage.removeItem('parsis.session'); } catch (e) {}
    if (typeof state !== 'undefined') state.currentUser = null;
    location.reload();
}

/* ============================================================
   بخش ۶ — بایند UI
   ============================================================ */
function bindAuthUI() {
    if (window._authDelegated) return;
    window._authDelegated = true;

    var loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.onclick = function (e) { e.preventDefault(); login(); };

    var logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = function (e) {
            e.preventDefault();
            var u = (state.currentUser && state.currentUser.username) ? state.currentUser.username : '';
            if (confirm('از حساب' + (u ? ' «' + u + '»' : '') + ' خارج می‌شوید؟')) {
                logout();
            }
        };
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && (e.target.id === 'login-password' || e.target.id === 'login-username')) {
            e.preventDefault();
            login();
        }
    });
}

/* ============================================================
   صادرسازی
   ============================================================ */
window.checkAuth = checkAuth;
window.logout = logout;
window.bindAuthUI = bindAuthUI;
window.login = login;
window.renderCurrentUserUI = renderCurrentUserUI;

console.log('✅ [modules/auth.js] loaded — v3 (current user card)');
