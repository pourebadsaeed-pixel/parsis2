/* ============================================================
   پارسیس — موتور حقوق دسترسی و محدودیت داده (✅ v2.4.0)
   مسیر: js/core/permissions.js

   ✅ v2.4.0 — بخش «امنیت»:
     • کاربر می‌تواند عضو «گروه کاربران» باشد؛ دسترسیِ مؤثر =
       گروه + کاربر (تنظیمِ صریحِ کاربر بر گروه مقدم است).
     • فرم‌های دسترسی/محدودیت به بخش «امنیت» منتقل شدند
       (کاربر / گروه قابل انتخاب) — فرم‌ها در user-perms.js.
     • ماژول‌های خزانه/اموال/انبار/فروش هم زیر پوشش دسترسی رفتند.
     • درختِ دسترسی (PERM_TREE_CATEGORIES) مشترک بین موتور و فرم‌ها.

   اصول:
     • سرپرست (isAdmin) همیشه دسترسی کامل دارد.
     • کاربر عادی بدون هیچ تنظیمی = دسترسی کامل (سازگاری با نسخه‌های قبل).
     • هر مقداری که در فرم‌ها ذخیره شود، دقیقاً همان اعمال می‌شود.
     • صفحات مدیریتی (بخش امنیت) فقط برای سرپرست.
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
    ['voucher-list',       '📄 فهرست اسناد حسابداری'],
    ['voucher-new',        '✏️ صدور سند حسابداری'],
    ['templates',          '🧩 الگوهای سند و شرح استاندارد'],
    ['notes',              '📔 دفترچه یادداشت'],
    ['sms',                '📱 پیامک بانکی'],
    ['jalali-calendar',    '📅 مدیریت تقویم'],
    /* ✅ v2.7.2 — ماشین‌حساب حرفه‌ای */
    ['calculator',          '🧮 ماشین‌حساب حرفه‌ای'],
    /* ✅ v2.4.0 — ماژول‌های جدید */
    ['treasury',           '💧 خزانه — دریافت و پرداخت'],
    ['assets',             '🏗 اموال و دارایی'],
    ['inventory-items',    '📦 کالاهای انبار'],
    ['inventory-moves',    '🔄 حواله‌های انبار'],
    ['sales',              '🛒 فروش — فاکتورها'],
    /* ✅ v2.7.0 — ماژول خرید و انبار */
    ['purchase-req',        '📝 درخواست خرید'],
    ['purchase-orders',     '🧾 سفارش خرید'],
    ['purchase-invoices',   '📄 فاکتور خرید'],
    ['purchase-returns',    '↩️ برگشت از خرید'],
    ['purchase-settings',  '⚙️ اتصال خرید به حسابداری'],
    ['stock-requests',     '📋 درخواست کالا'],
    ['stock-card',         '📚 کارت موجودی کالا'],
    ['stock-valuation',    '💰 ارزش‌گذاری و قیمت‌گذاری انبار']
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
    ['report-compare',       '📊 گزارش مقایسه‌ای'],
    /* ✅ v2.7.0 — ماژول خرید */
    ['purchase-reports',     '📊 گزارش‌های خرید']
];

/* ✅ v2.3.0 — صفحه زبان/تنظیمات پایه هم زیر پوشش دسترسی رفت (پوشش کامل همه صفحات) */
PERM_DATA_PAGES.push(['language', '🌐 زبان']);

/* صفحاتی که فقط سرپرست به آن‌ها دسترسی دارد — ✅ v2.4.0: کل بخش «امنیت» */
var PERM_ADMIN_PAGES = ['users', 'sec-groups', 'sec-perms', 'sec-limits'];

/* ✅ v2.4.0 — درختوارهٔ دسته‌های دسترسی (مشترک بین موتور و فرم امنیت) */
var PERM_TREE_CATEGORIES = [
    { id: 'home-cat',     title: '🏠 خانه',                pages: ['dashboard'] },
    { id: 'base-cat',     title: '👥 پایه‌ها',              pages: ['persons', 'companies', 'phonebook'] },
    { id: 'acc-cat',      title: '🏦 حساب‌ها و دوره مالی',   pages: ['bank-accounts', 'cash-boxes', 'projects', 'fiscal'] },
    { id: 'voucher-cat',  title: '🧾 اسناد حسابداری',       pages: ['voucher-list', 'voucher-new', 'templates'] },
    { id: 'treasury-cat', title: '💧 خزانه',               pages: ['treasury', 'facilities'] },
    { id: 'assets-cat',   title: '🏗 اموال',               pages: ['assets'] },
    /* ✅ v2.7.0 — انبار به «خرید و انبار» ارتقا یافت */
    { id: 'inv-cat',      title: '🛒 خرید و انبار',        pages: ['inventory-items', 'inventory-moves', 'stock-requests', 'stock-card', 'stock-valuation', 'purchase-req', 'purchase-orders', 'purchase-invoices', 'purchase-returns', 'purchase-reports', 'purchase-settings'] },
    { id: 'sales-cat',    title: '🛒 فروش',                pages: ['sales'] },
    { id: 'report-cat',   title: '📚 گزارش‌ها',             pages: ['report-cashflow', 'report-cashflow-desc', 'report-account', 'report-ledger', 'report-trial', 'report-incomplete', 'report-facility', 'report-facility-full', 'report-compare'] },
    { id: 'def-cat',      title: '⚙️ تعریف‌ها و ابزارها',    pages: ['chart-define', 'account-types', 'bank-types', 'cash-types', 'currency', 'estimate-daily', 'cashflow-sources', 'notes', 'sms', 'jalali-calendar', 'calculator', 'language'] }
];

/* عمل‌های مجاز برای هر نوع صفحه (در فرم نمایش داده می‌شود) */
function permsPageActions(page) {
    var isReport = false, i;
    for (i = 0; i < PERM_REPORT_PAGES.length; i++) if (PERM_REPORT_PAGES[i][0] === page) isReport = true;
    if (isReport) return ['view', 'report'];
    if (page === 'voucher-new') return ['view', 'create'];
    if (page === 'dashboard')   return ['view'];
    if (page === 'language')    return ['view']; /* ✅ v2.3.0 */
    /* ✅ v2.4.0 — صفحات ماژول‌های جدید هم چهارجانبه */
    return ['view', 'create', 'edit', 'delete'];
}

/* عنوان فارسی صفحه (از ثابت‌ها یا رجیستری) */
function permsPageTitle(page) {
    var i;
    for (i = 0; i < PERM_DATA_PAGES.length; i++) if (PERM_DATA_PAGES[i][0] === page) return PERM_DATA_PAGES[i][1];
    for (i = 0; i < PERM_REPORT_PAGES.length; i++) if (PERM_REPORT_PAGES[i][0] === page) return PERM_REPORT_PAGES[i][1];
    if (page === 'users') return '👤 معرفی کاربر';
    /* ✅ v2.4.0 — صفحات امنیت */
    if (page === 'sec-groups') return '👥 گروه کاربران';
    if (page === 'sec-perms')  return '🔐 حقوق دسترسی';
    if (page === 'sec-limits') return '🚫 محدودیت حقوق دسترسی';
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

/* ============================================================
   ✅ v2.4.0 — دسترسی مؤثر = گروه + کاربر
   کاربر می‌تواند عضو یک «گروه کاربران» باشد؛ اول تنظیمِ گروه اعمال می‌شود،
   بعد هر مقداری که خودِ کاربر صریحاً ذخیره کرده روی آن سوار می‌شود.
   خروجی: { pages:{page:{action:true|false}}, rules:[...], limits:{...} }
   ============================================================ */
function _permsMergeEff(groupPerms, userPerms) {
    var out = { pages: {}, rules: [], limits: {} };
    var gp = (groupPerms && typeof groupPerms === 'object' && groupPerms.pages) ? groupPerms.pages : {};
    var up = (userPerms && typeof userPerms === 'object' && userPerms.pages) ? userPerms.pages : {};
    var ids = {}, k;
    for (k in gp) ids[k] = 1;
    for (k in up) ids[k] = 1;
    Object.keys(ids).forEach(function (p) {
        var rec = {}, g = gp[p] || {}, u2 = up[p] || {}, a;
        for (a in g) rec[a] = g[a];
        for (a in u2) if (u2[a] !== undefined) rec[a] = u2[a];
        out.pages[p] = rec;
    });
    /* قواعد: قواعد گروه + قواعد کاربر */
    if (groupPerms && Array.isArray(groupPerms.rules)) out.rules = out.rules.concat(groupPerms.rules);
    if (userPerms && Array.isArray(userPerms.rules)) out.rules = out.rules.concat(userPerms.rules);
    /* limits: از قواعد «فقط این‌ها» مشتق می‌شود (برای سازگاری فیلترها) */
    out.rules.forEach(function (r) {
        if (r && r.target === 'voucher' && r.mode === 'only' && Array.isArray(r.ids)) {
            var arr = out.limits[r.kind] || (out.limits[r.kind] = []);
            r.ids.forEach(function (idv) { if (arr.indexOf(idv) === -1) arr.push(idv); });
        }
    });
    return out;
}

/* تنظیمات دسترسی مؤثر کاربر (خالی = همه‌چیز باز) */
function permsOfUser(u) {
    var up = (u && u.perms && typeof u.perms === 'object') ? u.perms : null;
    /* ✅ v2.4.0 — عضویت گروه کاربری */
    var grp = null;
    if (u && u.groupId) {
        try {
            grp = (DB.load('userGroups', []) || []).filter(function (g) {
                return g && g.id === u.groupId;
            })[0] || null;
        } catch (e) { grp = null; }
    }
    var gp = (grp && grp.perms && typeof grp.perms === 'object') ? grp.perms : null;
    if (!gp && !up) return null;
    /* ✅ v2.4.0 — همیشه از ادغام می‌گذرد تا limits از قواعد «فقط» مشتق شود
       (کاربرِ فقط-گروهی یا فقط-کاربری هم به فیلترها محدودیت می‌دهد) */
    return _permsMergeEff(gp, up);
}

/* آیا صفحه برای کاربر فعلی قابل دیدن است؟ */
function permsCanSee(page) {
    if (permsIsAdmin()) return true;
    if (PERM_ADMIN_PAGES.indexOf(page) !== -1) return false;
    if (page === 'home') return true;

    /* ✅ v2.3.0 — «مدیریت تقویم» دیگر همیشه‌باز نیست؛ تنظیم درختِ دسترسی واقعاً اعمال می‌شود */
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
    var hasRules = permsHasRules();
    if (!permsHasLimits() && !hasRules) return list;
    var limits = {};
    if (permsHasLimits()) {
        PERM_LIMIT_KINDS.forEach(function (k) {
            var arr = permsAllowedIds(k[0]);
            if (arr.length) limits[k[0]] = arr;
        });
    }
    var kinds = Object.keys(limits);
    return list.filter(function (v) {
        if (!v) return false;
        /* ✅ v2.2.0 — قواعد شرطی نمایش اسناد */
        if (hasRules && !permsVoucherRulesPass(v)) return false;
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
   ✅ v2.2.0 — قواعد شرطی نمایش اسناد
   هر قاعده: { id, target:'voucher', mode:'only'|'hide', kind, ids:[], allowEmpty }
     • mode 'only'  → «فقط اسنادی دیده شوند که تفصیلِ <kind> آن یکی از ids است»
     • mode 'hide'  → «اسنادی که تفصیلِ <kind> آن یکی از ids است پنهان شوند»
     • allowEmpty (فقط برای only) → اسنادِ بدونِ این نوع تفصیل هم دیده شوند
   چند قاعدهٔ only با «و» (AND) ترکیب می‌شوند؛ hideها اگر بخورند پنهان می‌کنند.
   سازگاری: هنگام ذخیره از فرم، ids قواعد only به limits[kind] هم کپی می‌شود
   تا فیلتر ماژول‌ها (permsFilterList) هم همان محدوده را ببیند.
   ============================================================ */
function permsHasRules() {
    var u = permsCurrentUser();
    var p = permsOfUser(u);
    return !!(p && Array.isArray(p.rules) && p.rules.length > 0);
}

function permsVoucherRules() {
    var u = permsCurrentUser();
    var p = permsOfUser(u);
    if (!p || !Array.isArray(p.rules)) return [];
    return p.rules.filter(function (r) {
        return r && r.target === 'voucher' && Array.isArray(r.ids) && r.ids.length > 0;
    });
}

/* مجموعه تفصیل‌های یک نوع از همه ردیف‌های سند (بدون تکرار) */
function _voucherDetailIds(v, kind) {
    var out = [];
    var lines = (v && v.lines) || [];
    for (var i = 0; i < lines.length; i++) {
        var d = lines[i] && lines[i].details;
        var idv = d ? d[kind] : '';
        if (idv && out.indexOf(idv) === -1) out.push(idv);
    }
    return out;
}

function _permRulePasses(r, v) {
    if (!v) return false;
    var ids = _voucherDetailIds(v, r.kind);
    var hit = false;
    for (var i = 0; i < ids.length; i++) {
        if (r.ids.indexOf(ids[i]) !== -1) { hit = true; break; }
    }
    if (r.mode === 'only') {
        if (hit) return true;
        /* سند بدون هیچ تفصیلِ این نوع: فقط با allowEmpty دیده می‌شود */
        return !!r.allowEmpty && ids.length === 0;
    }
    return !hit; /* mode 'hide' */
}

/* آیا سند با توجه به قواعد کاربر فعلی دیده می‌شود؟ */
function permsVoucherRulesPass(v) {
    var rules = permsVoucherRules();
    if (!rules.length) return true;
    for (var i = 0; i < rules.length; i++) {
        var r = rules[i];
        if (!_permRulePasses(r, v)) return false;
    }
    return true;
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

    /* ✅ v2.3.0 — هر بار هر بخش از رابط کاربری دوباره رندر شود، پنهان‌سازی منو
       دوباره اعمال می‌شود (با debounce؛ قبلاً فقط دو بار ثابت اعمال می‌شد و اگر
       سایدبار بعدتر رندر می‌شد، دکمه‌های محدود دوباره ظاهر می‌شدند) */
    try {
        var _navPending = false;
        var mo = new MutationObserver(function () {
            if (_navPending) return;
            _navPending = true;
            setTimeout(function () { _navPending = false; permsApplyNavVisibility(); }, 250);
        });
        mo.observe(document.body, { childList: true, subtree: true });
    } catch (eMO) {}

    /* ✅ v2.3.0 — نگهبان goToPage حالا داخل خود router.js است (دفاع در عمق)؛
       اینجا دیگر دور آن wrapper نمی‌پیچیم تا پیام خطا دوبار نشان داده نشود */

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
window.permsPageTitle = permsPageTitle;
window.permsRouterGuard = permsRouterGuard;
window.permsAllowedIds = permsAllowedIds;
window.permsHasLimits = permsHasLimits;
window.permsFilterList = permsFilterList;
window.permsFilterFacilities = permsFilterFacilities;
window.permsFilterVouchers = permsFilterVouchers;
window.permsHasRules = permsHasRules;
window.permsVoucherRules = permsVoucherRules;
window.permsVoucherRulesPass = permsVoucherRulesPass;
window.permsVoucherDetailIds = _voucherDetailIds;
window.permsApplyNavVisibility = permsApplyNavVisibility;
window.permsRouterGuard = permsRouterGuard;
window.permsInit = permsInit;
window.PERMS_MERGE = _permsMergeEff; /* ✅ v2.4.0 — ادغام گروه/کاربر برای فرم امنیت */
window.PERMS_REGISTRY = {
    actions: PERM_ACTIONS,
    dataPages: PERM_DATA_PAGES,
    reportPages: PERM_REPORT_PAGES,
    adminPages: PERM_ADMIN_PAGES,
    limitKinds: PERM_LIMIT_KINDS,
    treeCategories: PERM_TREE_CATEGORIES, /* ✅ v2.4.0 */
    linkTypes: (typeof LINK_TYPES !== 'undefined') ? LINK_TYPES : ['person', 'company', 'bank', 'cashbox', 'project', 'facility'],
    pageActions: permsPageActions,
    pageTitle: permsPageTitle
};

/* نصب بعد از لود اپ (app.js → startApp بعد از این فایل اجرا می‌شود) */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(permsInit, 400); });
} else {
    setTimeout(permsInit, 400);
}

console.log('✅ [core/permissions.js] loaded — v2.4.0 (امنیت + گروه کاربران)');
