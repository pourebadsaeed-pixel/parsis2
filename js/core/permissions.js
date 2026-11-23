/* ============================================================
   پارسیس — موتور حقوق دسترسی و محدودیت داده (✅ v2.1.0)
   مسیر: js/core/permissions.js

   دو فرم در «معرفی کاربران» (✍ user-perms.js):
     ۱) فرم حقوق دسترسی  → دیدن / ایجاد / ویرایش / حذف / گزارش‌گیری
        برای هر صفحه به‌صورت جداگانه
     ۲) فرم محدودیت دسترسی → فقط دیدن اسناد/داده‌های مربوط به
        بانک‌ها/صندوق‌ها/شرکت‌ها/پروژه‌ها/اشخاصِ انتخاب‌شده

   اصول:
     • سرپرست (isAdmin) همیشه دسترسی کامل دارد.
     • کاربر عادی بدون هیچ تنظیمی = دسترسی کامل (سازگاری با نسخه‌های قبل).
     • هر مقداری که در فرم‌ها ذخیره شود، دقیقاً همان اعمال می‌شود.
     • صفحات مدیریتی (معرفی کاربران) فقط برای سرپرست.
   ============================================================ */
'use strict';

/* ---------- رجیستری صفحات و اعمال هر صفحه ---------- */
var PERM_ACTIONS = {
    view:   { label: '👁 دیدن',   color: '#2563eb' },
    create: { label: '➕ ایجاد',  color: '#059669' },
    edit:   { label: '✎ ویرایش', color: '#d97706' },
    delete: { label: '🗑 حذف',    color: '#dc2626' },
    report: { label: '🖨 گزارش/چاپ', color: '#7c3aed' }
};

/* صفحات داده‌ای — چهار عمل: دیدن/ایجاد/ویرایش/حذف */
var PERM_DATA_PAGES = [
    ['persons',            '👥 اشخاص'],
    ['companies',          '🏢 شرکت‌ها'],
    ['phonebook',          '📞 دفترچه تلفن'],
    ['bank-accounts',      '🏦 حساب‌های بانکی'],
    ['cash-boxes',         '💰 صندوق‌ها'],
    ['projects',           '📁 پروژه‌ها'],
    ['fiscal',             '📅 دوره‌های مالی'],
    ['chart-define',       '✏️ تعریف حساب‌ها'],
    ['account-types',      '📑 لیست نوع حساب'],
    ['bank-types',         '🏦 انواع حساب بانکی'],
    ['cash-types',         '💰 انواع صندوق'],
    ['currency',           '💱 ارز و واحد پول'],
    ['estimate-daily',     '📝 برآورد هزینه‌های روزانه'],
    ['cashflow-sources',   '📌 برآورد منابع دریافتنی'],
    ['facilities',         '🏦 تسهیلات'],
    ['voucher-list',       '📄 فهرست اسناد'],
    ['voucher-new',        '✏️ صدور سند'],
    ['templates',          '🧩 الگوهای سند'],
    ['notes',              '📔 دفترچه یادداشت'],
    ['sms',                '📱 پیامک بانکی'],
    ['jalali-calendar',    '📅 مدیریت تقویم']
];

/* صفحات گزارش — دو عمل: دیدن / گزارش‌گیری و چاپ */
var PERM_REPORT_PAGES = [
    ['dashboard',            '🎯 داشبورد مالی'],
    ['report-cashflow',      '💵 پیش‌بینی روزانه نقدینگی'],
    ['report-cashflow-desc', '💸 گردش وجه نقد'],
    ['report-account',       '📒 مرور حساب‌ها'],
    ['report-ledger',        '📚 گزارش دفاتر'],
    ['report-trial',         '⚖️ تراز آزمایشی'],
    ['report-incomplete',    '🔍 تراکنش‌های تکمیل نشده'],
    ['report-facility',      '🏦 خلاصه تسهیلات'],
    ['report-facility-full', '📊 گزارش جامع تسهیلات'],
    ['report-compare',       '📊 گزارش مقایسه‌ای']
];

/* صفحاتی که فقط سرپرست به آن‌ها دسترسی دارد */
var PERM_ADMIN_PAGES = ['users'];

/* عمل‌های مجاز برای هر نوع صفحه (در فرم نمایش داده می‌شود) */
function permsPageActions(page) {
    var isReport = false, i;
    for (i = 0; i < PERM_REPORT_PAGES.length; i++) if (PERM_REPORT_PAGES[i][0] === page) isReport = true;
    if (isReport) return ['view', 'report'];
    if (page === 'voucher-new') return ['view', 'create'];
    if (page === 'dashboard')   return ['view'];
    return ['view', 'create', 'edit', 'delete'];
}

/* عنوان فارسی صفحه (از ثابت‌ها یا رجیستری) */
function permsPageTitle(page) {
    var i;
    for (i = 0; i < PERM_DATA_PAGES.length; i++) if (PERM_DATA_PAGES[i][0] === page) return PERM_DATA_PAGES[i][1];
    for (i = 0; i < PERM_REPORT_PAGES.length; i++) if (PERM_REPORT_PAGES[i][0] === page) return PERM_REPORT_PAGES[i][1];
    if (page === 'users') return '👤 معرفی کاربران';
    return page;
}

/* انواع داده برای «محدودیت دسترسی» */
var PERM_LIMIT_KINDS = [
    ['bank',     '🏦 حساب‌های بانکی', 'bankAccounts'],
    ['cashbox',  '💰 صندوق‌ها',        'cashBoxes'],
    ['company',  '🏢 شرکت‌ها',         'companies'],
    ['project',  '📁 پروژه‌ها',        'projects'],
    ['person',   '👥 اشخاص',           'persons']
];

var PERM_LIMIT_STORE = 'parsisPermLimits';

/* ============================================================
   API عمومی
   ============================================================ */

function permsCurrentUser() {
    try {
        if (typeof state !== 'undefined' && state.currentUser && state.currentUser.id) {
            var users = DB.load('users', []);
            var fresh = null;
            for (var i = 0; i < users.length; i++) if (users[i].id === state.currentUser.id) { fresh = users[i]; break; }
            return fresh || state.currentUser;
        }
    } catch (e) {}
    return null;
}

function permsIsAdmin() {
    var u = permsCurrentUser();
    return !!(u && u.isAdmin === true);
}

/* تنظیمات دسترسی کاربر فعلی (خالی = همه‌چیز باز) */
function permsOfUser(u) {
    return (u && u.perms && typeof u.perms === 'object') ? u.perms : null;
}

/* آیا صفحه برای کاربر فعلی قابل دیدن است؟ */
function permsCanSee(page) {
    if (permsIsAdmin()) return true;
    if (PERM_ADMIN_PAGES.indexOf(page) !== -1) return false;
    if (page === 'home' || page === 'jalali-calendar') return true;

    var u = permsCurrentUser();
    var p = permsOfUser(u);
    if (!p) return true; /* کاربر عادی بدون تنظیم = باز */

    var pages = p.pages || {};
    var rec = pages[page];
    if (!rec) return true; /* این صفحه تنظیم نشده = باز */

    return rec.view !== false;
}

/* آیا عمل مشخص روی صفحه برای کاربر فعلی مجاز است؟ */
function permsCan(page, action) {
    if (permsIsAdmin()) return true;
    if (PERM_ADMIN_PAGES.indexOf(page) !== -1) return false;

    var u = permsCurrentUser();
    var p = permsOfUser(u);
    if (!p) return true;

    var pages = p.pages || {};
    var rec = pages[page];
    if (!rec) return true;

    if (rec[action] === undefined) return true; /* تنظیم نشده = باز */
    return rec[action] === true;
}

/* محدودیت داده: فهرست مجاز برای یک نوع (آرایه خالی/ناموجود = همه) */
function permsAllowedIds(kind) {
    var u = permsCurrentUser();
    var p = permsOfUser(u);
    if (!p || !p.limits) return [];
    var arr = p.limits[kind];
    if (!Array.isArray(arr)) return [];
    return arr.slice();
}

function permsHasLimits() {
    var u = permsCurrentUser();
    var p = permsOfUser(u);
    if (!p || !p.limits) return false;
    var kinds = PERM_LIMIT_KINDS;
    for (var i = 0; i < kinds.length; i++) {
        var arr = p.limits[kinds[i][0]];
        if (Array.isArray(arr) && arr.length > 0) return true;
    }
    return false;
}

/* ---------- فیلتر فهرست‌های ساده (بانک/صندوق/شرکت/پروژه/اشخاص/تسهیلات) ---------- */
/* rows را می‌گیرد و اگر محدودیت برای آن نوع فعال باشد، فقط مجازها را برمی‌گرداند */
function permsFilterList(kind, rows) {
    if (!Array.isArray(rows)) return rows;
    var allowed = permsAllowedIds(kind);
    if (!allowed.length) return rows; /* بدون محدودیت */
    return rows.filter(function (r) { return r && allowed.indexOf(r.id) !== -1; });
}

/* فیلتر تسهیلات بر اساس بانکِ تسهیلات */
function permsFilterFacilities(rows) {
    if (!Array.isArray(rows)) return rows;
    var allowed = permsAllowedIds('bank');
    if (!allowed.length) return rows;
    return rows.filter(function (f) {
        return f && (!f.bankId || allowed.indexOf(f.bankId) !== -1);
    });
}

/* ---------- فیلتر اسناد حسابداری بر اساس تفصیلی‌های ردیف‌ها ---------- */
/* سندی که هر ردیفش تفصیلیِ خارج از محدوده دارد، دیده نمی‌شود.
   اسناد بدون تفصیلی (عمومی) همیشه دیده می‌شوند. */
function permsFilterVouchers(list) {
    if (!Array.isArray(list)) return list;
    if (!permsHasLimits()) return list;
    var limits = {};
    PERM_LIMIT_KINDS.forEach(function (k) {
        var arr = permsAllowedIds(k[0]);
        if (arr.length) limits[k[0]] = arr;
    });
    var kinds = Object.keys(limits);
    return list.filter(function (v) {
        if (!v) return false;
        var lines = v.lines || [];
        for (var i = 0; i < lines.length; i++) {
            var d = lines[i] && lines[i].details;
            if (!d) continue;
            for (var j = 0; j < kinds.length; j++) {
                var k = kinds[j];
                var idv = d[k];
                if (idv && limits[k].indexOf(idv) === -1) return false;
            }
        }
        return true;
    });
}

/* ============================================================
   اعمال روی رابط کاربری
   ============================================================ */

/* پنهان کردن دکمه‌های منویی که کاربر نباید ببیند */
function permsApplyNavVisibility() {
    try {
        var btns = document.querySelectorAll('.nav-group-items button[data-page]');
        for (var i = 0; i < btns.length; i++) {
            var b = btns[i];
            var page = b.getAttribute('data-page') || '';
            if (!page) continue;
            var ok = permsCanSee(page);
            b.style.display = ok ? '' : 'none';
        }
        /* بخش‌های مدیریتی تنظیمات (سینک ابری و ...) فقط سرپرست */
        var adminSections = document.querySelectorAll('.admin-only-section');
        for (var j = 0; j < adminSections.length; j++) {
            adminSections[j].style.display = permsIsAdmin() ? '' : 'none';
        }
    } catch (e) {}
}

/* نگهبان روتر: goToPage اجازه «دیدن» را چک می‌کند */
function permsRouterGuard(page) {
    if (permsCanSee(page)) return true;
    try {
        showToast('⛔ دسترسی دیدن صفحه «' + permsPageTitle(page) + '» برای شما ندارید');
    } catch (e) {}
    if (page !== 'home' && typeof goToPage === 'function') {
        setTimeout(function () { goToPage('home'); }, 10);
    }
    return false;
}

/* صفحه فعال فعلی (نام کوتاه) — برای نگهبان کلیک */
function _permsActivePage() {
    try {
        var active = document.querySelector('.page.active');
        if (!active || !active.id) return '';
        var id = active.id.replace('page-', '');
        /* طولانی‌ترها اول — تا report-cashflow-desc به‌اشتباه report-cashflow نشود */
        var prefixes = ['report-cashflow-desc', 'report-facility-full', 'report-account', 'report-ledger',
                        'report-cashflow', 'report-trial', 'report-incomplete', 'report-facility',
                        'report-compare', 'voucher-list', 'voucher-new'];
        for (var i = 0; i < prefixes.length; i++) {
            if (id.indexOf(prefixes[i]) === 0) return prefixes[i];
        }
        return id;
    } catch (e) { return ''; }
}

/* تشخیص عمل از روی دکمه کلیک‌شده — بازگشت null یعنی «بی‌اثر، عبور آزاد» */
function _permsDetectAction(el, page) {
    try {
        var id = (el.id || '').toLowerCase();
        var cls = (el.className || '').toString();
        var txt = (el.textContent || '').trim();

        /* حذف */
        if (cls.indexOf('row-btn del') !== -1 || cls.indexOf('del-btn') !== -1) return 'delete';
        if (id.indexOf('del-') === 0 || id.indexOf('-del') !== -1 || id.indexOf('delete-') === 0) return 'delete';

        /* ایجاد */
        if (id.indexOf('new-') === 0 || id.indexOf('add-') === 0) return 'create';
        if (txt.indexOf('➕') === 0 || txt.indexOf('جدید') !== -1) return 'create';

        /* ویرایش/ایجاد — دکمه‌های ذخیره */
        if (id.indexOf('save-') === 0 || cls.indexOf('save-btn') !== -1 || txt.indexOf('💾') !== -1) {
            return 'edit';
        }
        if (cls.indexOf('row-btn edit') !== -1) return 'edit';

        /* گزارش/چاپ/خروجی در صفحات گزارش */
        if (_isReportPage(page)) {
            if (cls.indexOf('export-btn') !== -1 || el.getAttribute('data-export')) return 'report';
            if (txt.indexOf('🖨') !== -1 || txt.indexOf('📊') !== -1 || txt.indexOf('⬇') !== -1 ||
                txt.indexOf('📄') !== -1 || txt.indexOf('📥') !== -1) return 'report';
            if (id.indexOf('print') !== -1 || id.indexOf('export') !== -1) return 'report';
        }
    } catch (e) {}
    return null;
}

function _isReportPage(page) {
    for (var i = 0; i < PERM_REPORT_PAGES.length; i++) {
        if (PERM_REPORT_PAGES[i][0] === page) return true;
    }
    return false;
}

/* نگهبان کلیک سراسری — عمل‌های نوشتن/چاپ را برای کاربران محدود چک می‌کند */
function permsInstallClickGuard() {
    if (window.__permsClickGuardInstalled) return;
    window.__permsClickGuardInstalled = true;

    document.addEventListener('click', function (e) {
        if (permsIsAdmin()) return;
        var el = e.target && e.target.closest ? e.target.closest('button') : null;
        if (!el) return;
        var page = _permsActivePage();
        if (!page) return;

        var action = _permsDetectAction(el, page);
        if (!action) return;

        /* ایجاد و ویرایش هر دو برای ذخیره لازم‌اند؟ — هرکدام که تعریف شده باشد */
        var allowed = permsCan(page, action);
        if (!allowed && action === 'edit') {
            /* ذخیرهٔ رکورد موجود = ویرایش؛ اگر ویرایش بسته ولی ایجاد باز است و رکورد جدید است، عبور */
            allowed = permsCan(page, 'create') && permsCan(page, 'edit');
        }
        if (!allowed) {
            e.preventDefault();
            e.stopPropagation();
            try {
                var actName = PERM_ACTIONS[action] ? PERM_ACTIONS[action].label : action;
                showToast('⛔ دسترسی «' + actName + '» در صفحه «' + permsPageTitle(page) + '» ندارید');
            } catch (e2) {}
            return false;
        }
    }, true);
}

/* نصب اولیه — بعد از آماده شدن اپ */
function permsInit() {
    permsInstallClickGuard();

    /* بعد از هر ورود/ری‌رندر سایدبار، دکمه‌های مخفی اعمال شوند */
    setTimeout(permsApplyNavVisibility, 600);
    setTimeout(permsApplyNavVisibility, 2000);

    /* نگهبان goToPage — یک بار دور تابع اصلی می‌پیچیم */
    if (typeof goToPage === 'function' && !goToPage.__permsWrapped) {
        var orig = goToPage;
        window.goToPage = function (name) {
            if (!permsRouterGuard(name)) return;
            return orig.apply(this, arguments);
        };
        goToPage.__permsWrapped = true;
    }

    /* ✅ v2.1.0 — ناوبری واقعی اپ از سیستم «تب‌ها» (form.js) رد می‌شود؛
       پس switchToTab هم نگهبان لازم دارد (تا آماده شدن آن تلاش می‌کنیم) */
    var _tries = 0;
    (function trySwitch() {
        _tries++;
        if (typeof switchToTab === 'function' && !switchToTab.__permsWrapped &&
            typeof TAB_STATE !== 'undefined' && TAB_STATE && TAB_STATE.tabs) {
            var origS = switchToTab;
            window.switchToTab = function (tabId) {
                var tab = null;
                try {
                    tab = TAB_STATE.tabs.find(function (t) { return t.id === tabId; }) || null;
                } catch (e) {}
                var page = tab ? (tab.page || '') : '';
                if (page && !permsCanSee(page)) {
                    try { showToast('⛔ دسترسی دیدن صفحه «' + permsPageTitle(page) + '» برای شما ندارید'); } catch (e2) {}
                    var ht = TAB_STATE.tabs.find(function (t) { return t.page === 'home'; });
                    if (ht) origS.call(this, ht.id);
                    return;
                }
                return origS.apply(this, arguments);
            };
            switchToTab.__permsWrapped = true;
            try { console.log('[permissions] ✅ نگهبان تب‌ها نصب شد'); } catch (e3) {}
            return;
        }
        if (_tries < 40) setTimeout(trySwitch, 300);
    })();

    /* تغییر کاربر / ذخیره کاربران → دوباره اعمال شود */
    window.addEventListener('parsisUserChanged', function () {
        setTimeout(permsApplyNavVisibility, 150);
    });
}

window.permsCanSee = permsCanSee;
window.permsCan = permsCan;
window.permsIsAdmin = permsIsAdmin;
window.permsCurrentUser = permsCurrentUser;
window.permsAllowedIds = permsAllowedIds;
window.permsHasLimits = permsHasLimits;
window.permsFilterList = permsFilterList;
window.permsFilterFacilities = permsFilterFacilities;
window.permsFilterVouchers = permsFilterVouchers;
window.permsApplyNavVisibility = permsApplyNavVisibility;
window.permsRouterGuard = permsRouterGuard;
window.permsInit = permsInit;
window.PERMS_REGISTRY = {
    actions: PERM_ACTIONS,
    dataPages: PERM_DATA_PAGES,
    reportPages: PERM_REPORT_PAGES,
    adminPages: PERM_ADMIN_PAGES,
    limitKinds: PERM_LIMIT_KINDS,
    pageActions: permsPageActions,
    pageTitle: permsPageTitle
};

/* نصب بعد از لود اپ (app.js → startApp بعد از این فایل اجرا می‌شود) */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(permsInit, 400); });
} else {
    setTimeout(permsInit, 400);
}

console.log('✅ [core/permissions.js] loaded — v2.1.0');
