/* ============================================================
   پارسیس — احراز هویت + قفل بیومتریک
   مسیر: js/modules/auth.js   (✅ v2.4.0 — در اپ اندروید همیشه مسیر نیتیو مقدم است)
   ✅ v2.0.5 — دو مسیر پشتیبانی:
     • اپ اندروید: قفل بیومتریک نیتیو از طریق BiometricPrompt سیستم‌عامل
       (WebView اندروید استاندارد WebAuthn را پیاده‌سازی نمی‌کند و پیش‌تر
       همین باعث پیام «پشتیبانی نمی‌شود» می‌شد)
     • مرورگر: استاندارد WebAuthn (فقط با HTTPS یا localhost)
   ============================================================ */
'use strict';

(function ensureDefaultUsers() {
    try {
        var users = DB.load('users', null);
        if (!users || !Array.isArray(users) || users.length === 0) {
            /* ✅ v2.0.1 — رمز پیش‌فرض هم حالا هش می‌شود (SHA-256 + salt) */
            var rec = (typeof parsisMakePasswordRecord === 'function')
                ? parsisMakePasswordRecord('گویندگان') : null;
            var admin = { id: 'u_admin', username: 'سرپرست', personId: '', isAdmin: true, active: true };
            if (rec) { admin.passHash = rec.passHash; admin.salt = rec.salt; }
            else { admin.password = 'گویندگان'; } /* fallback در صورت نبود ماژول */
            DB.save('users', [admin]);
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
/* ---------- ✅ v2.0.5 — تشخیص مسیر بیومتریک ---------- */

/* پلاگین نیتیو پارسیس (فقط در اپ اندروید موجود است) */
function _parsisNativePlugin() {
    try {
        if (!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())) return null;
        var P = (window.Capacitor.Plugins && window.Capacitor.Plugins.Parsis) || null;
        return (P && typeof P.authenticate === 'function') ? P : null;
    } catch (e) { return null; }
}

/* آیا سنسور بیومتریک گوشی آماده است؟ (فقط در اپ اندروید معنی‌دار است) */
async function _nativeBiometricAvailable() {
    var P = _parsisNativePlugin();
    if (!P || typeof P.isBiometricAvailable !== 'function') return false;
    try {
        var res = await P.isBiometricAvailable();
        return !!(res && res.available === true);
    } catch (e) { return false; }
}

/* آیا WebAuthn مرورگر در دسترس است؟ (نیازمند secure context) */
function _webauthnAvailable() {
    if (!window.PublicKeyCredential) return false;
    if (!window.isSecureContext) return false;
    return true;
}

/* نتیجه: { ok: true, mode: 'native'|'webauthn' } یا { ok: false, reason: '...' } */
async function getBiometricMode() {
    /* ۱) اول مسیر نیتیو اندروید */
    if (await _nativeBiometricAvailable()) return { ok: true, mode: 'native' };

    /* ۲) اگر داخل اپ اندروید هستیم ولی بیومتریک گوشی فعال نیست */
    if (_parsisNativePlugin()) return { ok: false, reason: 'native-no-biometric' };

    /* ۳) مسیر مرورگر — WebAuthn */
    if (!window.PublicKeyCredential) return { ok: false, reason: 'no-webauthn' };
    if (!window.isSecureContext) return { ok: false, reason: 'insecure-context' };
    try {
        var ok = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        return ok ? { ok: true, mode: 'webauthn' } : { ok: false, reason: 'no-platform-authenticator' };
    } catch (e) {
        return { ok: false, reason: 'no-platform-authenticator' };
    }
}

/* سازگاری با کد قبلی */
async function checkBiometricSupport() {
    var m = await getBiometricMode();
    return m.ok;
}

/* پیام وضعیت برای هر دلیل عدم پشتیبانی — شفاف و کاربرپسند */
function _bioStatusHtml(reason) {
    switch (reason) {
        case 'native-no-biometric':
            return '<span style="color:#b45309">⚠️ اثر انگشت، چهره یا قفل صفحه هنوز روی این گوشی ثبت نشده است؛ ابتدا از تنظیمات اندروید (Security) یکی از آن‌ها را فعال کنید.</span>';
        case 'insecure-context':
            return '<span style="color:#b45309">⚠️ در مرورگر، این قابلیت فقط وقتی صفحه با HTTPS (یا localhost) باز شود کار می‌کند. در اپ اندروید پارسیس این محدودیت وجود ندارد.</span>';
        case 'no-webauthn':
            return '<span style="color:#b45309">⚠️ مرورگر شما از استاندارد WebAuthn پشتیبانی نمی‌کند. اپ اندروید پارسیس بدون محدودیت از قفل بیومتریک پشتیبانی می‌کند.</span>';
        case 'no-platform-authenticator':
            return '<span style="color:#b45309">⚠️ اثر انگشت یا قفل صفحه روی این دستگاه ثبت نشده است؛ ابتدا در تنظیمات سیستم فعال کنید.</span>';
        default:
            return '<span style="color:#dc2626">⚠️ دستگاه یا مرورگر شما از این قابلیت پشتیبانی نمی‌کند.</span>';
    }
}

/* احراز هویت نیتیو اندروید — پنجره BiometricPrompt سیستم‌عامل */
function nativeAuthenticate(user) {
    var P = _parsisNativePlugin();
    if (!P) return Promise.resolve(false);
    return P.authenticate({
        title: 'ورود به پارسیس',
        subtitle: (user && user.username) ? user.username : '',
        deviceCredential: true
    }).then(function (res) {
        return !!(res && res.success === true);
    }).catch(function () { return false; });
}

/* ✅ v2.0.5 — ثبت قفل بیومتریک (مسیر نیتیو یا WebAuthn) */
async function registerBiometric() {
    var user = state.currentUser;
    if (!user) return false;

    /* ۱) مسیر نیتیو اندروید — BiometricPrompt سیستم‌عامل */
    if (await _nativeBiometricAvailable()) {
        var nativeOk = await nativeAuthenticate(user);
        if (nativeOk) {
            DB.save(LS_KEYS.BIOMETRIC_METHOD, 'native');
            DB.save(LS_KEYS.BIOMETRIC_ENABLED, true);
            DB.save(LS_KEYS.LAST_USER_ID, user.id);
        }
        return nativeOk;
    }

    /* ۲) مسیر مرورگر — WebAuthn */
    if (!_webauthnAvailable()) return false;

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
            DB.save(LS_KEYS.BIOMETRIC_METHOD, 'webauthn');
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

/* ورود موفق بعد از احراز هویت بیومتریک */
function _finishBiometricLogin(found) {
    try { sessionStorage.setItem('parsis.session', JSON.stringify(found)); } catch (e) {}
    /* ✅ v2.3.0 — اعلام تغییر کاربر تا منو/دسترسی‌ها فوراً هم‌تراز شوند */
    try { window.dispatchEvent(new Event('parsisUserChanged')); } catch (eUC) {}
    var btn = document.getElementById('login-bio-btn');
    if (btn) { btn.innerHTML = '⏳ در حال ورود...'; btn.disabled = true; }
    setTimeout(function () { location.reload(); }, 200);
}

/* ✅ v2.0.5 — ورود با اثر انگشت (مسیر نیتیو اندروید یا WebAuthn مرورگر) */
async function loginWithBiometric() {
    if (!DB.load(LS_KEYS.BIOMETRIC_ENABLED, false)) return;

    var users = DB.load('users', []);
    var userId = DB.load(LS_KEYS.LAST_USER_ID, '');
    var found = users.find(function (u) { return u.id === userId; });
    if (!found) {
        showToast('⚠️ کاربر ذخیره‌شده یافت نشد؛ لطفاً با نام کاربری وارد شوید.');
        return;
    }

    var P = _parsisNativePlugin();
    var method = DB.load(LS_KEYS.BIOMETRIC_METHOD, '');

    /* ۱) مسیر نیتیو اندروید — BiometricPrompt سیستم‌عامل
       ✅ v2.4.0 — در اپ اندروید همیشه اول مسیر نیتیو امتحان می‌شود؛
       قبلاً اگر کاربر قبلاً بیومتریک را در «مرورگر» فعال کرده بود
       (method = webauthn) در اپ اندروید به WebAuthn می‌رفت که داخل
       WebView اندروید پشتیبانی نمی‌شود و دکمه بی‌عملکرد می‌ماند. */
    if (P) {
        var nativeOk = await nativeAuthenticate(found);
        if (nativeOk) {
            _finishBiometricLogin(found);
        } else {
            showToast('❌ ورود با اثر انگشت ناموفق بود یا لغو شد. اگر اثر انگشت/چهره یا قفل صفحه روی گوشی ثبت نشده، از تنظیمات اندروید فعالش کنید.');
        }
        return;
    }

    /* ۲) مسیر مرورگر — WebAuthn (فقط وقتی پلاگین نیتیو موجود نیست) */
    var storedId = DB.load(LS_KEYS.BIOMETRIC_CRED_ID, null);
    if (!storedId) {
        showToast('⚠️ اطلاعات اثر انگشت یافت نشد؛ یک‌بار از تنظیمات دوباره فعال کنید یا با نام کاربری وارد شوید.');
        return;
    }
    if (!_webauthnAvailable()) return;

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
            _finishBiometricLogin(found);
        }
    } catch (e) {
        console.error('WebAuthn Login Error:', e);
        showToast('❌ ورود با اثر انگشت ناموفق بود یا لغو شد.');
    }
}

/* ✅ v2.0.5 — وضعیت قفل بیومتریک با پیام شفاف برای هر حالت */
async function updateBiometricUI() {
    var mode = await getBiometricMode();
    var isEnabled = DB.load(LS_KEYS.BIOMETRIC_ENABLED, false);

    var bioBtn = document.getElementById('login-bio-btn');
    if (bioBtn) {
        if (mode.ok && isEnabled) {
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
        cb.disabled = !mode.ok;

        if (!mode.ok) {
            if (status) status.innerHTML = _bioStatusHtml(mode.reason);
        } else if (isEnabled) {
            var tag = (mode.mode === 'native') ? ' — نیتیو اندروید' : ' — مرورگر';
            if (status) status.innerHTML = '<span style="color:#059669">✅ فعال است' + tag + '</span>';
        } else {
            var hint = (mode.mode === 'native') ? 'نیتیو اندروید' : 'مرورگر';
            if (status) status.innerHTML = '<span style="color:#64748b">غیرفعال</span> <span style="color:#94a3b8">(مسیر: ' + hint + ')</span>';
        }

        cb.onchange = async function() {
            if (this.checked) {
                var success = await registerBiometric();
                if (!success) {
                    this.checked = false;
                    var cur = await getBiometricMode();
                    alert(cur.ok ? 'خطا در فعال‌سازی اثر انگشت. لطفاً مطمئن شوید اثر انگشت یا رمز صفحه گوشی را تنظیم کرده‌اید.'
                                 : _bioStatusHtml(cur.reason).replace(/<[^>]+>/g, ''));
                } else {
                    var m2 = await getBiometricMode();
                    var tag2 = (m2.ok && m2.mode === 'native') ? ' — نیتیو اندروید' : ' — مرورگر';
                    if (status) status.innerHTML = '<span style="color:#059669">✅ فعال است' + tag2 + '</span>';
                    showToast('✅ قفل بیومتریک فعال شد');
                }
            } else {
                DB.save(LS_KEYS.BIOMETRIC_ENABLED, false);
                DB.save(LS_KEYS.BIOMETRIC_CRED_ID, null);
                DB.save(LS_KEYS.BIOMETRIC_METHOD, '');
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
            /* ✅ v2.0.1 — کاربر پیش‌فرض با رمز هش‌شده */
            var recD = (typeof parsisMakePasswordRecord === 'function')
                ? parsisMakePasswordRecord('گویندگان') : null;
            var adminD = { id: 'u_admin', username: 'سرپرست', personId: '', isAdmin: true, active: true };
            if (recD) { adminD.passHash = recD.passHash; adminD.salt = recD.salt; }
            else { adminD.password = 'گویندگان'; }
            users = [adminD];
            DB.save('users', users);
        }

        /* ✅ v2.0.1 — ابتدا کاربر با نام کاربری پیدا می‌شود، سپس رمز به‌صورت
           امن (هش یا legacy) بررسی و در صورت نیاز ارتقا داده می‌شود */
        var found = users.find(function (u) {
            return normalizeFaLogin(u.username) === normalizeFaLogin(user);
        });

        if (!found || !(typeof parsisVerifyPassword === 'function' && parsisVerifyPassword(found, pass))) {
            if (errEl) { errEl.textContent = 'نام کاربری یا کلمه عبور اشتباه است.'; errEl.style.display = 'block'; }
            if (passInput) { passInput.value = ''; passInput.focus(); }
            return;
        }

        /* ✅ v2.0.1 — migration شفاف: رمز متن‌ساده قدیمی بعد از ورود موفق هش می‌شود */
        if (typeof parsisHasLegacyPassword === 'function' && parsisHasLegacyPassword(found)) {
            try {
                parsisUpgradeUserPassword(found, pass);
                DB.save('users', users);
                console.log('[auth] ✅ رمز کاربر به حالت هش‌شده ارتقا یافت');
            } catch (e) { console.warn('[auth] password upgrade failed', e); }
        }

        if (found.active === false) {
            if (errEl) { errEl.textContent = '⚠️ حساب کاربری شما غیرفعال است.'; errEl.style.display = 'block'; }
            return;
        }

        try { sessionStorage.setItem('parsis.session', JSON.stringify(found)); } catch (e) {}
        DB.save(LS_KEYS.LAST_USER_ID, found.id); 

        /* ✅ v2.3.0 — اعلام تغییر کاربر تا منو/دسترسی‌ها فوراً هم‌تراز شوند */
        try { window.dispatchEvent(new Event('parsisUserChanged')); } catch (eUC) {}

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
    /* ✅ v2.1.0 — قبل از رفرش، آخرین تغییرها ذخیره شود */
    try { if (typeof DB !== 'undefined' && typeof DB.flush === 'function') DB.flush(); } catch (e) {}
    setTimeout(function () { location.reload(); }, 250);
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
