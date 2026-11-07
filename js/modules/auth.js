/* ============================================================
   پارسیس — احراز هویت + قفل بیومتریک (WebAuthn)
   مسیر: js/modules/auth.js
   ============================================================ */
'use strict';

(function ensureDefaultUsers() {
    try {
        var users = DB.load('users', null);
        if (!users || !Array.isArray(users) || users.length === 0) {
            DB.save('users', [{
                id: 'u_admin', username: 'سرپرست', password: 'گویندگان',
                personId: '', isAdmin: true, active: true
            }]);
        }
    } catch (e) {}
})();

function normalizeFaLogin(s) {
    return String(s || '').replace(/[يى]/g, 'ی').replace(/[ك]/g, 'ک').trim().toLowerCase();
}

function _bufToB64(buf) {
    let binary = '';
    let bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return window.btoa(binary);
}

function _b64ToBuf(base64) {
    let binary = window.atob(base64);
    let bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}

async function checkBiometricSupport() {
    if (!window.PublicKeyCredential) return false;
    try {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (e) {
        return false;
    }
}

async function registerBiometric() {
    var user = state.currentUser;
    if (!user) return false;

    var challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    try {
        var cred = await navigator.credentials.create({
            publicKey: {
                challenge: challenge,
                rp: { name: "پارسیس", id: location.hostname },
                user: {
                    id: new Uint8Array(16),
                    name: user.username,
                    displayName: user.username
                },
                pubKeyCredParams: [{ alg: -7, type: "public-key" }],
                authenticatorSelection: { 
                    authenticatorAttachment: "platform", 
                    userVerification: "required" 
                },
                timeout: 60000
            }
        });

        if (cred) {
            DB.save(LS_KEYS.BIOMETRIC_CRED_ID, _bufToB64(cred.rawId));
            DB.save(LS_KEYS.BIOMETRIC_ENABLED, true);
            DB.save(LS_KEYS.LAST_USER_ID, user.id);
            return true;
        }
    } catch (e) {
        console.error('WebAuthn Registration Error:', e);
        return false;
    }
    return false;
}

async function loginWithBiometric() {
    var storedId = DB.load(LS_KEYS.BIOMETRIC_CRED_ID, null);
    if (!storedId) return;

    var challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    try {
        var assert = await navigator.credentials.get({
            publicKey: {
                challenge: challenge,
                allowCredentials: [{ id: _b64ToBuf(storedId), type: 'public-key' }],
                userVerification: "required",
                timeout: 60000
            }
        });

        if (assert) {
            var users = DB.load('users', []);
            var userId = DB.load(LS_KEYS.LAST_USER_ID, '');
            var found = users.find(function(u) { return u.id === userId; });
            
            if (found) {
                try { sessionStorage.setItem('parsis.session', JSON.stringify(found)); } catch (e) {}
                var btn = document.getElementById('login-bio-btn');
                if (btn) { btn.innerHTML = '⏳ در حال ورود...'; btn.disabled = true; }
                setTimeout(function () { location.reload(); }, 200);
            }
        }
    } catch (e) {
        console.error('WebAuthn Login Error:', e);
        showToast('❌ ورود با اثر انگشت ناموفق بود یا لغو شد.');
    }
}

async function updateBiometricUI() {
    var isSupported = await checkBiometricSupport();
    var isEnabled = DB.load(LS_KEYS.BIOMETRIC_ENABLED, false);
    
    var bioBtn = document.getElementById('login-bio-btn');
    if (bioBtn) {
        if (isSupported && isEnabled) {
            bioBtn.classList.remove('hidden');
            bioBtn.onclick = loginWithBiometric;
        } else {
            bioBtn.classList.add('hidden');
        }
    }

    var cb = document.getElementById('set-biometric');
    var status = document.getElementById('bio-settings-status');
    if (cb) {
        cb.checked = isEnabled;
        cb.disabled = !isSupported;
        
        if (!isSupported) {
            if (status) status.innerHTML = '<span style="color:#dc2626">⚠️ دستگاه یا مرورگر شما از این قابلیت پشتیبانی نمی‌کند.</span>';
        } else if (isEnabled) {
            if (status) status.innerHTML = '<span style="color:#059669">✅ فعال است</span>';
        } else {
            if (status) status.innerHTML = '<span style="color:#64748b">غیرفعال</span>';
        }

        cb.onchange = async function() {
            if (this.checked) {
                var success = await registerBiometric();
                if (!success) {
                    this.checked = false;
                    alert('خطا در فعال‌سازی اثر انگشت. لطفاً مطمئن شوید اثر انگشت یا رمز صفحه گوشی را تنظیم کرده‌اید.');
                } else {
                    if (status) status.innerHTML = '<span style="color:#059669">✅ فعال است</span>';
                    showToast('✅ قفل بیومتریک فعال شد');
                }
            } else {
                DB.save(LS_KEYS.BIOMETRIC_ENABLED, false);
                DB.save(LS_KEYS.BIOMETRIC_CRED_ID, null);
                if (status) status.innerHTML = '<span style="color:#64748b">غیرفعال</span>';
                showToast('🔒 قفل بیومتریک غیرفعال شد');
            }
        };
    }
}

function renderCurrentUserUI() {
    var user = state.currentUser;
    if (!user || !user.username) return;

    var old = document.getElementById('sidebar-user-card');
    if (old) old.remove();

    var sidebarFoot = document.querySelector('.sidebar-foot');
    if (!sidebarFoot) {
        setTimeout(renderCurrentUserUI, 300);
        return;
    }

    var isAdmin = user.isAdmin === true;
    var icon = isAdmin ? '👑' : '👤';
    var roleLabel = isAdmin ? '👑 سرپرست' : '👤 کاربر عادی';
    var bgGradient = isAdmin ? 'linear-gradient(135deg,#fef3c7,#fde68a)' : 'linear-gradient(135deg,#dbeafe,#bfdbfe)';
    var borderColor = isAdmin ? '#f59e0b' : '#3b82f6';
    var iconBg = isAdmin ? 'linear-gradient(135deg,#fbbf24,#f59e0b)' : 'linear-gradient(135deg,#60a5fa,#3b82f6)';
    var textColor = isAdmin ? '#92400e' : '#1e40af';

    var card = document.createElement('div');
    card.id = 'sidebar-user-card';
    card.style.cssText = 'padding:12px;margin-bottom:8px;background:' + bgGradient + ';border-radius:12px;border:1.5px solid ' + borderColor + ';box-shadow:0 2px 8px rgba(0,0,0,0.06);';
    card.innerHTML = '<div style="display:flex;align-items:center;gap:10px">'
        + '<div style="width:40px;height:40px;border-radius:50%;background:' + iconBg + ';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:1.15rem;flex-shrink:0;">' + icon + '</div>'
        + '<div style="flex:1;min-width:0;text-align:right">'
        + '<div style="font-weight:900;color:' + textColor + ';font-size:0.88rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(user.username) + '</div>'
        + '<div style="font-size:0.7rem;color:#64748b;font-weight:700;margin-top:2px">' + roleLabel + '</div>'
        + '</div></div>';

    sidebarFoot.insertBefore(card, sidebarFoot.firstChild);
}

function checkAuth() {
    var sessionStr = null;
    try { sessionStr = sessionStorage.getItem('parsis.session'); } catch (e) {}
    if (!sessionStr) return false;

    try { state.currentUser = JSON.parse(sessionStr); } catch (e) { state.currentUser = { username: sessionStr }; }

    try {
        var users = DB.load('users', []);
        var found = users.find(function (u) { return u.id === state.currentUser.id; });
        if (found) {
            if (found.active === false) {
                sessionStorage.removeItem('parsis.session');
                return false;
            }
            state.currentUser.isAdmin = found.isAdmin === true;
            state.currentUser.username = found.username;
            sessionStorage.setItem('parsis.session', JSON.stringify(state.currentUser));
        }
    } catch (e) {}

    setTimeout(renderCurrentUserUI, 500);
    setTimeout(renderCurrentUserUI, 1500);
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
            users = [{ id: 'u_admin', username: 'سرپرست', password: 'گویندگان', personId: '', isAdmin: true, active: true }];
            DB.save('users', users);
        }

        var found = users.find(function (u) {
            return normalizeFaLogin(u.username) === normalizeFaLogin(user) && u.password === pass;
        });

        if (!found) {
            if (errEl) { errEl.textContent = 'نام کاربری یا کلمه عبور اشتباه است.'; errEl.style.display = 'block'; }
            if (passInput) { passInput.value = ''; passInput.focus(); }
            return;
        }

        if (found.active === false) {
            if (errEl) { errEl.textContent = '⚠️ حساب کاربری شما غیرفعال است.'; errEl.style.display = 'block'; }
            return;
        }

        try { sessionStorage.setItem('parsis.session', JSON.stringify(found)); } catch (e) {}
        DB.save(LS_KEYS.LAST_USER_ID, found.id); 

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
    if (typeof state !== 'undefined') state.currentUser = null;
    location.reload();
}

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
            if (confirm('از حساب' + (u ? ' «' + u + '»' : '') + ' خارج می‌شوید؟')) logout();
        };
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && (e.target.id === 'login-password' || e.target.id === 'login-username')) {
            e.preventDefault(); login();
        }
    });

    updateBiometricUI();
}

window.checkAuth = checkAuth;
window.logout = logout;
window.bindAuthUI = bindAuthUI;
window.login = login;
window.renderCurrentUserUI = renderCurrentUserUI;
window.updateBiometricUI = updateBiometricUI;
