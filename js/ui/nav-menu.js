/* ============================================================
   پارسیس — سیستم منوی کناری ERP (چندسطحی + جابه‌جایی) ✅ v2.7.0
   مسیر: js/ui/nav-menu.js

   ✅ v2.7.0 — بازطراحی کامل منوی کناری به سبک ERPهای روز دنیا:
     • ساختار داده‌محور: منو از پیکربندی (NAV_MENU_GROUPS) ساخته می‌شود
     • گروه‌بندی جدید: عمومی (ادغام اطلاعات اولیه + اطلاعات پایه + امنیت)،
       خزانه (+ مدیریت نقدینگی)، برنامه‌ریزی (تقویم + یادداشت) و…
     • جابه‌جایی گروه‌ها و آیتم‌ها با کشیدن و رها کردن (Drag & Drop)
       — هم در شاخهٔ اصلی و هم در زیرشاخه‌ها؛ ترتیب ذخیره می‌شود
     • آیکون‌های رنگی مربعی به سبک ERP + خطوط جداکننده + تورفتگی
     • حفظ وضعیت باز/بستهٔ گروه‌ها (navMenuCollapsed)
   ذخیره: 'navMenuOrder' (ترتیب) و 'navMenuCollapsed' (وضعیت گروه‌ها)
   سازگاری: همان کلاس‌های nav-group / nav-group-title / nav-group-items
   را نگه می‌دارد تا جستجو، پرکاربردها، بستن/باز کردن همه و ناوبری
   فعلی بدون تغییر کار کنند.
   ============================================================ */
'use strict';

/* ---------- پیکربندی منو ---------- */
/* هر آیتم: { page, tab?, preset?, icon, color, label, extraHtml? }
   کلید پایدار آیتم = page|tab|preset  (برای ذخیرهٔ ترتیب) */

var NAV_MENU_GROUPS = [
    {
        id: 'general', icon: '🗂', color: '#3b82f6', title: 'عمومی',
        secs: [ { id: 'list', label: 'فهرست‌ها' }, { id: 'op', label: 'عملیات' } ],
        items: [
            { page: 'language',            icon: '🌐', color: '#0ea5e9', label: 'زبان', sec: 'list' },
            { page: 'account-types',       icon: '📑', color: '#6366f1', label: 'لیست نوع حساب', sec: 'list' },
            { page: 'bank-types',          icon: '🏦', color: '#f59e0b', label: 'انواع حساب بانکی', sec: 'list' },
            { page: 'cash-types',          icon: '💰', color: '#10b981', label: 'انواع صندوق', sec: 'list' },
            { page: 'currency',            icon: '💱', color: '#8b5cf6', label: 'ارز و واحد پول', sec: 'list' },
            { page: 'fiscal', tab: 'fiscal-list', icon: '📅', color: '#f97316', label: 'فهرست دوره‌های مالی', sec: 'list' },
            { page: 'persons', tab: 'persons-list', icon: '👥', color: '#3b82f6', label: 'فهرست اشخاص', sec: 'list' },
            { page: 'companies', tab: 'comp-list',  icon: '🏢', color: '#6366f1', label: 'فهرست شرکت‌ها', sec: 'list' },
            { page: 'phonebook',           icon: '📞', color: '#14b8a6', label: 'دفترچه تلفن', sec: 'list' },
            { page: 'bank-accounts', tab: 'ba-list', icon: '🏦', color: '#f59e0b', label: 'فهرست حساب‌های بانکی', sec: 'list' },
            { page: 'cash-boxes', tab: 'cb-list', icon: '💰', color: '#10b981', label: 'فهرست صندوق‌ها', sec: 'list' },
            { page: 'projects', tab: 'proj-list', icon: '📁', color: '#a855f7', label: 'فهرست پروژه‌ها', sec: 'list' },
            { page: 'users', tab: 'users-list', icon: '👤', color: '#3b82f6', label: 'فهرست کاربران', sec: 'list' },
            { page: 'sec-groups', tab: 'sg-list', icon: '👥', color: '#8b5cf6', label: 'فهرست گروه‌های کاربری', sec: 'list' },
            { page: 'sec-perms',  icon: '🔐', color: '#d97706', label: 'حقوق دسترسی', sec: 'list' },
            { page: 'sec-limits', icon: '🚫', color: '#dc2626', label: 'محدودیت حقوق دسترسی', sec: 'list' },
            { page: 'fiscal', tab: 'fiscal-add',  icon: '➕', color: '#22c55e', label: 'ایجاد دوره مالی', sec: 'op' },
            { page: 'chart-define',        icon: '✏️', color: '#ef4444', label: 'تعریف حساب‌ها', sec: 'op' },
            { page: 'persons', tab: 'persons-add',  icon: '➕', color: '#06b6d4', label: 'ایجاد شخص', sec: 'op' },
            { page: 'companies', tab: 'comp-add',   icon: '➕', color: '#8b5cf6', label: 'ایجاد شرکت', sec: 'op' },
            { page: 'bank-accounts', tab: 'ba-add',  icon: '➕', color: '#f97316', label: 'ایجاد حساب بانکی', sec: 'op' },
            { page: 'cash-boxes', tab: 'cb-add',  icon: '➕', color: '#22c55e', label: 'ایجاد صندوق', sec: 'op' },
            { page: 'projects', tab: 'proj-add',  icon: '➕', color: '#d946ef', label: 'ایجاد پروژه', sec: 'op' },
            { page: 'users', tab: 'users-add',  icon: '➕', color: '#2563eb', label: 'ایجاد کاربر', sec: 'op' },
            { page: 'sec-groups', tab: 'sg-add',  icon: '➕', color: '#7c3aed', label: 'ایجاد گروه کاربری', sec: 'op' }
        ]
    },
    {
        id: 'ops', icon: '📝', color: '#f59e0b', title: 'حسابداری',
        secs: [ { id: 'list', label: 'فهرست‌ها' }, { id: 'op', label: 'عملیات' }, { id: 'tools', label: 'ابزارها' }, { id: 'rep', label: 'گزارش‌ها' } ],
        items: [
            { page: 'voucher-list', icon: '📄', color: '#d97706', label: 'فهرست اسناد حسابداری', sec: 'list' },
            { page: 'templates', tab: 'tpl-list', icon: '🧩', color: '#f59e0b', label: 'فهرست الگوهای سند', sec: 'list' },
            { page: 'templates', tab: 'desc-list', icon: '💬', color: '#eab308', label: 'شرح‌های استاندارد', sec: 'list' },
            { page: 'voucher-new',  icon: '✏️', color: '#dc2626', label: 'صدور سند حسابداری', sec: 'op' },
            { page: 'templates', tab: 'tpl-add',  icon: '➕', color: '#f97316', label: 'ایجاد الگوی سند', sec: 'op' },
            { page: 'sms', icon: '📱', color: '#22c55e', label: 'پیامک بانکی', sec: 'tools',
              extraHtml: ' <span class="nav-badge hidden" id="sms-nav-badge">۰</span>' },
            /* ✅ v2.7.2 — درخواست کاربر: گزارش‌ها (بجز تسهیلات) به بخش حسابداری منتقل شد */
            { page: 'dashboard',            icon: '🎯', color: '#0891b2', label: 'داشبورد مالی', sec: 'rep' },
            { page: 'report-cashflow',      icon: '💵', color: '#059669', label: 'پیش‌بینی روزانه نقدینگی', sec: 'rep' },
            { page: 'report-cashflow-desc', icon: '💸', color: '#dc2626', label: 'گردش وجه نقد', sec: 'rep' },
            { page: 'report-account',      icon: '📒', color: '#3b82f6', label: 'مرور حساب‌ها', sec: 'rep' },
            { page: 'report-trial',        icon: '⚖️', color: '#7c3aed', label: 'تراز آزمایشی', sec: 'rep' },
            { page: 'report-incomplete',   icon: '🔍', color: '#f59e0b', label: 'تراکنش‌های تکمیل نشده', sec: 'rep' },
            { page: 'report-compare',      icon: '📈', color: '#16a34a', label: 'گزارش مقایسه‌ای', sec: 'rep' },
            { page: 'report-ledger',       icon: '📚', color: '#4f46e5', label: 'گزارش دفاتر', sec: 'rep' }
        ]
    },
    {
        id: 'treasury', icon: '💧', color: '#14b8a6', title: 'خزانه',
        secs: [ { id: 'list', label: 'فهرست‌ها' }, { id: 'op', label: 'عملیات' }, { id: 'plan', label: 'برآوردها' }, { id: 'rep', label: 'گزارش‌های خزانه' } ],
        items: [
            { page: 'treasury', tab: 'tr-list', icon: '📄', color: '#0d9488', label: 'فهرست دریافت و پرداخت', sec: 'list' },
            { page: 'facilities', tab: 'fac-list', icon: '🏦', color: '#0891b2', label: 'فهرست تسهیلات', sec: 'list' },
            { page: 'treasury', tab: 'tr-add', preset: 'in',  icon: '📥', color: '#059669', label: 'ثبت دریافت', sec: 'op' },
            { page: 'treasury', tab: 'tr-add', preset: 'out', icon: '📤', color: '#dc2626', label: 'ثبت پرداخت', sec: 'op' },
            { page: 'facilities', tab: 'fac-add',  icon: '➕', color: '#06b6d4', label: 'ایجاد تسهیلات', sec: 'op' },
            { page: 'estimate-daily',   icon: '📝', color: '#f59e0b', label: 'برآورد هزینه‌های روزانه', sec: 'plan' },
            { page: 'cashflow-sources', icon: '📌', color: '#f97316', label: 'برآورد منابع دریافتنی', sec: 'plan' },
            /* ✅ v2.7.2 — درخواست کاربر: دو گزارش تسهیلات به «گزارش‌های خزانه» منتقل شد */
            { page: 'report-facility',      icon: '🏦', color: '#0891b2', label: 'خلاصه تسهیلات', sec: 'rep' },
            { page: 'report-facility-full', icon: '📊', color: '#06b6d4', label: 'گزارش جامع تسهیلات', sec: 'rep' }
        ]
    },
    {
        id: 'planning', icon: '🗓', color: '#8b5cf6', title: 'برنامه‌ریزی',
        items: [
            { page: 'jalali-calendar', icon: '📅', color: '#8b5cf6', label: 'مدیریت تقویم' },
            { page: 'notes', icon: '📔', color: '#a855f7', label: 'دفترچه یادداشت' },
            /* ✅ v2.7.2 — ماشین‌حساب حرفه‌ای در برنامه‌ریزی */
            { page: 'calculator', icon: '🧮', color: '#0ea5e9', label: 'ماشین‌حساب حرفه‌ای' }
        ]
    },
    {
        id: 'assets', icon: '🏗', color: '#e11d48', title: 'اموال',
        secs: [ { id: 'list', label: 'فهرست‌ها' }, { id: 'op', label: 'عملیات' } ],
        items: [
            { page: 'assets', tab: 'as-list', icon: '📋', color: '#e11d48', label: 'فهرست اموال', sec: 'list' },
            { page: 'assets', tab: 'as-add',  icon: '➕', color: '#f43f5e', label: 'ثبت دارایی', sec: 'op' }
        ]
    },
    {
        id: 'purchase', icon: '🛒', color: '#059669', title: 'خرید و انبار',
        secs: [ { id: 'buy', label: 'خرید' }, { id: 'store', label: 'انبار' }, { id: 'rep', label: 'گزارش‌ها و تنظیمات' } ],
        items: [
            { page: 'purchase-req',      icon: '📝', color: '#059669', label: 'درخواست خرید', sec: 'buy' },
            { page: 'purchase-orders',   icon: '🧾', color: '#047857', label: 'سفارش خرید', sec: 'buy' },
            { page: 'purchase-invoices', icon: '📄', color: '#065f46', label: 'فاکتور خرید', sec: 'buy' },
            { page: 'purchase-returns',  icon: '↩️', color: '#dc2626', label: 'برگشت از خرید', sec: 'buy' },
            { page: 'inventory-items',  icon: '📦', color: '#2563eb', label: 'کالاها', sec: 'store' },
            { page: 'stock-requests',   icon: '📋', color: '#0891b2', label: 'درخواست کالا', sec: 'store' },
            { page: 'inventory-moves',  icon: '🔄', color: '#d97706', label: 'رسید و حواله انبار', sec: 'store' },
            { page: 'stock-card',       icon: '📚', color: '#4f46e5', label: 'کارت موجودی', sec: 'store' },
            { page: 'stock-valuation',  icon: '💰', color: '#16a34a', label: 'ارزش‌گذاری و قیمت‌گذاری', sec: 'store' },
            { page: 'purchase-reports',  icon: '📊', color: '#7c3aed', label: 'گزارش‌های خرید', sec: 'rep' },
            { page: 'purchase-settings', icon: '⚙️', color: '#64748b', label: 'اتصال به حسابداری', sec: 'rep' }
        ]
    },
    {
        id: 'sales', icon: '🛍', color: '#6366f1', title: 'فروش',
        secs: [ { id: 'list', label: 'فهرست‌ها' }, { id: 'op', label: 'عملیات' } ],
        items: [
            { page: 'sales', tab: 'si-list', icon: '📄', color: '#4f46e5', label: 'فهرست فاکتورها', sec: 'list' },
            { page: 'sales', tab: 'si-add',  icon: '➕', color: '#4338ca', label: 'صدور فاکتور', sec: 'op' }
        ]
    }
    /* ✅ v2.7.2 — گروه «گزارش‌ها» حذف شد: همه گزارش‌ها به «حسابداری» و
       دو گزارش تسهیلات به «گزارش‌های خزانه» (بخش خزانه) منتقل شدند.
       ترتیب ذخیره‌شده قدیمی کاربران به‌صورت امن نادیده گرفته می‌شود. */
];

/* ---------- ابزار ---------- */

function _navItemKey(it) {
    return [it.page, it.tab || '', it.preset || ''].join('|');
}

function _navLoadOrder() {
    var o = DB.load('navMenuOrder', {});
    if (!o || typeof o !== 'object') o = {};
    if (!Array.isArray(o.groups)) o.groups = [];
    if (!o.items || typeof o.items !== 'object') o.items = {};
    return o;
}

function _navLoadCollapsed() {
    var c = DB.load('navMenuCollapsed', {});
    if (!c || typeof c !== 'object') return {};
    return c;
}

/* ✅ v2.7.2 — وضعیت جمع‌شدگی زیرشاخه‌ها (فهرست‌ها / عملیات / ابزارها / ...) */
function _navLoadSecCollapsed() {
    var c = DB.load('navSecCollapsed', {});
    if (!c || typeof c !== 'object') return {};
    return c;
}

function _navSaveSecCollapsed(c) {
    DB.save('navSecCollapsed', c || {});
}

/* ✅ v2.7.2 — قفل ترتیب منو: وقتی فعال باشد جابه‌جایی با کشیدن ممکن نیست
   (پیش‌فرض: قفل — تا جابه‌جایی تصادفی آیتم‌ها اتفاق نیفتد) */
function navIsLocked() {
    return DB.load('navMenuLocked', true) !== false;
}

function navSetLocked(v) {
    DB.save('navMenuLocked', !!v);
    document.body.classList.toggle('nav-order-locked', !!v);
    var btn = document.getElementById('nav-lock-order');
    if (btn) {
        btn.innerHTML = v ? '🔒 ترتیب قفل است' : '🔓 ترتیب آزاد است';
        btn.title = v ? 'قفل فعال است — برای جابه‌جایی منو کلیک کنید' : 'جابه‌جایی آزاد است — برای قفل‌کردن کلیک کنید';
        btn.classList.toggle('mini-btn-active', !!v);
    }
}

/* عنوان سایدبار: نام برنامه + نسخه در پرانتز */
function navSetSidebarTitle() {
    var el = document.getElementById('sidebar-app-title');
    if (!el) return;
    var ver = (typeof APP_VERSION !== 'undefined') ? APP_VERSION : '';
    var name = (typeof APP_NAME !== 'undefined') ? APP_NAME : 'پارسیس';
    el.textContent = name + (ver ? ' (' + toFa(ver) + ')' : '');
}

/* ---------- ساخت منو ---------- */

function buildNavMenu() {
    var nav = document.getElementById('sidebar-nav');
    if (!nav) return;

    var order = _navLoadOrder();
    var collapsed = _navLoadCollapsed();

    /* ایندکس پیکربندی‌ها */
    var cfgById = {};
    var allItems = {};
    NAV_MENU_GROUPS.forEach(function (g) {
        cfgById[g.id] = g;
        (g.items || []).forEach(function (it) { allItems[_navItemKey(it)] = it; });
    });

    /* ترتیب گروه‌ها: ذخیره‌شده + گروه‌های جدید در انتها */
    var groupIds = order.groups.filter(function (id) { return !!cfgById[id]; });
    NAV_MENU_GROUPS.forEach(function (g) {
        if (groupIds.indexOf(g.id) === -1) groupIds.push(g.id);
    });

    /* آیتم‌های تخصیص‌یافته در ترتیب ذخیره‌شده */
    var assigned = {};
    groupIds.forEach(function (gid) {
        (order.items[gid] || []).forEach(function (k) { assigned[k] = gid; });
    });

    /* پاک‌سازی گروه‌های ساخته‌شدهٔ قبلی (گروه پرکاربرد دست‌نخورده می‌ماند) */
    Array.prototype.slice.call(nav.querySelectorAll('.nav-group[data-nav-group]')).forEach(function (el) {
        el.remove();
    });

    var frag = document.createDocumentFragment();

    groupIds.forEach(function (gid) {
        var g = cfgById[gid];

        var list = [];
        (order.items[gid] || []).forEach(function (k) {
            if (allItems[k]) list.push(allItems[k]);
        });
        (g.items || []).forEach(function (it) {
            var k = _navItemKey(it);
            if (!assigned[k]) list.push(it); /* آیتم جدید/باقی‌مانده در انتها */
        });

        /* برچسب بخش‌های داخل گروه («فهرست‌ها» / «عملیات» / ...) — ✅ v2.7.1 */
        var secsMap = {};
        (g.secs || []).forEach(function (s) { secsMap[s.id] = s.label; });

        var groupEl = document.createElement('div');
        groupEl.className = 'nav-group' + (collapsed[gid] ? ' collapsed' : '');
        groupEl.setAttribute('data-nav-group', gid);

        var head = document.createElement('div');
        head.className = 'nav-group-head';
        head.innerHTML =
            '<span class="nav-drag" data-drag="group" title="جابه‌جایی گروه">⋮⋮</span>' +
            '<button type="button" class="nav-group-title">' +
                '<span class="nav-g-ico" style="background:' + g.color + '">' + g.icon + '</span>' +
                '<span class="nav-item-label">' + esc(g.title) + '</span>' +
                '<span class="caret">▾</span>' +
            '</button>';
        groupEl.appendChild(head);

        var itemsBox = document.createElement('div');
        itemsBox.className = 'nav-group-items';

        /* ✅ v2.7.2 — وضعیت جمع‌شدگی زیرشاخه‌ها */
        var secCollapsed = _navLoadSecCollapsed();

        var lastSec = null;
        list.forEach(function (it) {
            /* ✅ v2.7.1 — درخواست کاربر: «فهرست‌ها در یک بخش و عملیات زیر بخش کلی
               فهرست‌ها» — هر گروه به بخش‌های کوچکِ نام‌دار تقسیم می‌شود */
            var sec = it.sec || null;
            if (sec && secsMap[sec] && sec !== lastSec) {
                var lb = document.createElement('button');
                lb.type = 'button';
                lb.className = 'nav-sec-label' + (secCollapsed[gid + ':' + sec] ? ' sec-collapsed' : '');
                lb.setAttribute('data-nav-sec', sec);
                lb.setAttribute('data-nav-group-sec', gid + ':' + sec);
                lb.title = 'باز/بسته کردن «' + secsMap[sec] + '»';
                lb.innerHTML = '<span class="nav-sec-caret">▾</span><span class="nav-sec-txt">' + esc(secsMap[sec]) + '</span>';
                itemsBox.appendChild(lb);
            }
            if (sec) lastSec = sec;

            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'nav-item-btn' + ((sec && secCollapsed[gid + ':' + sec]) ? ' nav-sec-hidden' : '');
            b.setAttribute('data-page', it.page);
            b.setAttribute('data-nav-key', _navItemKey(it));
            if (it.tab) b.setAttribute('data-tab', it.tab);
            if (it.preset) b.setAttribute('data-preset', it.preset);
            if (sec) b.setAttribute('data-sec', sec);
            b.innerHTML =
                '<span class="nav-drag" data-drag="item" title="جابه‌جایی">⋮⋮</span>' +
                '<span class="nav-ico" style="background:' + it.color + '">' + it.icon + '</span>' +
                '<span class="nav-item-label">' + esc(it.label) + '</span>' +
                (it.extraHtml || '');
            itemsBox.appendChild(b);
        });

        groupEl.appendChild(itemsBox);
        frag.appendChild(groupEl);
    });

    nav.appendChild(frag);
    navSetSidebarTitle();

    /* ✅ v2.7.2 — همگام‌سازی وضعیت قفل با دکمه و بدنه */
    navSetLocked(navIsLocked());

    /* ✅ v2.7.1 — خودترمیمی: اگر به هر دلیل هیچ گروهی رندر نشد (دادهٔ خراب و...)
       ترتیب ذخیره‌شده کنار گذاشته می‌شود و منو یک بار دیگر از پیکربندی پیش‌فرض
       ساخته می‌شود (با گارد حلقهٔ بی‌نهایت) */
    if (nav.querySelectorAll('.nav-group[data-nav-group]').length === 0 && NAV_MENU_GROUPS.length > 0
        && !buildNavMenu._healed) {
        buildNavMenu._healed = true;
        try { DB.save('navMenuOrder', { groups: [], items: {} }); } catch (eSh) {}
        try { DB.save('navMenuCollapsed', {}); } catch (eSh2) {}
        try { buildNavMenu(); } catch (eSh3) {}
    }
}

/* ذخیرهٔ ترتیب از DOM فعلی */
function _navSaveOrderFromDOM() {
    var nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    var order = { groups: [], items: {} };
    Array.prototype.slice.call(nav.querySelectorAll('.nav-group[data-nav-group]')).forEach(function (gEl) {
        var gid = gEl.getAttribute('data-nav-group');
        order.groups.push(gid);
        var keys = [];
        Array.prototype.slice.call(gEl.querySelectorAll('.nav-item-btn')).forEach(function (b) {
            keys.push(b.getAttribute('data-nav-key'));
        });
        order.items[gid] = keys;
    });
    DB.save('navMenuOrder', order);
}

/* ذخیرهٔ وضعیت باز/بستهٔ گروه‌ها از DOM */
function _navSaveCollapsedFromDOM() {
    var nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    var c = {};
    Array.prototype.slice.call(nav.querySelectorAll('.nav-group[data-nav-group]')).forEach(function (gEl) {
        c[gEl.getAttribute('data-nav-group')] = gEl.classList.contains('collapsed');
    });
    DB.save('navMenuCollapsed', c);
}

/* بازنشانی ترتیب به حالت پیش‌فرض */
function navResetOrder() {
    if (!confirm('ترتیب منو به حالت پیش‌فرض بازگردانده شود؟')) return;
    DB.save('navMenuOrder', { groups: [], items: {} });
    DB.save('navMenuCollapsed', {});
    DB.save('navSecCollapsed', {}); /* ✅ v2.7.2 — زیرشاخه‌ها هم باز شود */
    buildNavMenu();
    /* ✅ v2.7.1 — اگر بازسازی اول کامل نشده بود، یک بار دیگر با تاخیر تلاش می‌شود */
    setTimeout(function () {
        try {
            var nav = document.getElementById('sidebar-nav');
            if (nav && nav.querySelectorAll('.nav-group[data-nav-group]').length === 0) buildNavMenu();
        } catch (eR) {}
    }, 250);
    showToast('✅ ترتیب منو بازنشانی شد');
}

/* ============================================================
   جابه‌جایی با کشیدن و رها کردن (Pointer Events — موبایل + دسکتاپ)
   ============================================================ */

var _navDrag = null;        /* وضعیت درگ جاری */
var _navClickSuppress = false;

function _navDropLine() {
    var nav = document.getElementById('sidebar-nav');
    if (!nav) return null;
    var line = nav.querySelector('.nav-drop-line');
    if (!line) {
        line = document.createElement('div');
        line.className = 'nav-drop-line';
        nav.appendChild(line);
    }
    return line;
}

function _navShowLineAt(y) {
    var line = _navDropLine();
    if (!line) return;
    line.style.display = 'block';
    line.style.top = (y - 4) + 'px';
}

function _navHideLine() {
    var nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    var line = nav.querySelector('.nav-drop-line');
    if (line) line.style.display = 'none';
}

/* محل درج بر اساس موقعیت عمودی — targets = آرایه‌ای از {el, y} */
function _navFindInsertion(cands, y) {
    if (!cands.length) return { before: null };
    for (var i = 0; i < cands.length; i++) {
        if (y < cands[i].mid) return { before: cands[i].el };
    }
    return { before: null }; /* بعد از آخری */
}

function _navVisibleGroupEls() {
    var nav = document.getElementById('sidebar-nav');
    if (!nav) return [];
    return Array.prototype.slice.call(nav.querySelectorAll('.nav-group[data-nav-group]')).filter(function (g) {
        return g.offsetParent !== null; /* قابل مشاهده */
    });
}

/* موقعیت‌های مجاز درج آیتم: همهٔ دکمه‌های آیتم در گروه‌های باز */
function _navItemCandidates() {
    var out = [];
    _navVisibleGroupEls().forEach(function (gEl) {
        if (gEl.classList.contains('collapsed')) return;
        Array.prototype.slice.call(gEl.querySelectorAll('.nav-item-btn')).forEach(function (b) {
            var r = b.getBoundingClientRect();
            out.push({ el: b, mid: (r.top + r.bottom) / 2 });
        });
    });
    return out;
}

function _navGroupCandidates() {
    var out = [];
    _navVisibleGroupEls().forEach(function (gEl) {
        var r = gEl.getBoundingClientRect();
        out.push({ el: gEl, mid: (r.top + r.bottom) / 2 });
    });
    return out;
}

function _navBeginDrag(e) {
    document.body.classList.add('nav-dragging-body');
    _navDrag.el.classList.add('nav-dragging');
    _navDragStartAutoOpenTimer(e);
}

/* درگ روی سرگروهِ بسته: بعد از مکث کوتاه باز شود */
function _navDragStartAutoOpenTimer(e) {
    clearTimeout(_navDrag._openTimer);
    if (_navDrag.type !== 'item') return;
    var g = _navOverCollapsedGroup(e.clientY);
    if (g) {
        _navDrag._openTimer = setTimeout(function () {
            g.classList.remove('collapsed');
            _navSaveCollapsedFromDOM();
        }, 550);
    }
}

function _navOverCollapsedGroup(y) {
    var over = null;
    _navVisibleGroupEls().forEach(function (gEl) {
        var r = gEl.getBoundingClientRect();
        if (y >= r.top && y <= r.bottom && gEl.classList.contains('collapsed')) over = gEl;
    });
    return over;
}

function _navMoveDrag(e) {
    var y = e.clientY;
    var nav = document.getElementById('sidebar-nav');
    if (!nav) return;

    /* اسکرول خودکار نزدیک لبه‌ها */
    var nr = nav.getBoundingClientRect();
    if (y < nr.top + 44) nav.scrollTop -= 9;
    else if (y > nr.bottom - 44) nav.scrollTop += 9;

    if (_navDrag.type === 'group') {
        var cands = _navGroupCandidates().filter(function (c) { return c.el !== _navDrag.el; });
        var ins = _navFindInsertion(cands, y);
        _navDrag.target = ins.before; /* null = انتهای لیست */
        var lineY = ins.before ? ins.before.getBoundingClientRect().top : null;
        if (lineY === null) {
            var last = cands.length ? cands[cands.length - 1].el : null;
            lineY = last ? last.getBoundingClientRect().bottom : nr.top + 10;
        }
        _navShowLineAt(lineY);
    } else {
        var cands2 = _navItemCandidates().filter(function (c) { return c.el !== _navDrag.el; });
        var ins2 = _navFindInsertion(cands2, y);
        _navDrag.target = ins2.before;
        var lineY2 = ins2.before ? ins2.before.getBoundingClientRect().top : null;
        if (lineY2 === null) {
            var last2 = cands2.length ? cands2[cands2.length - 1].el : null;
            if (last2) lineY2 = last2.getBoundingClientRect().bottom;
            else {
                var cg = _navOverCollapsedGroup(y) || _navVisibleGroupEls()[0];
                lineY2 = cg ? cg.getBoundingClientRect().bottom : nr.top + 10;
            }
        }
        _navShowLineAt(lineY2);
    }
    _navDragStartAutoOpenTimer(e);
}

function _navFinishDrag() {
    var nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    var target = _navDrag.target; /* عنصری که باید قبل از آن درج شود (یا null) */

    if (_navDrag.type === 'group') {
        if (target) nav.insertBefore(_navDrag.el, target);
        else nav.appendChild(_navDrag.el);
    } else {
        var itemEl = _navDrag.el;
        if (target) {
            var destGroup = target.closest('.nav-group');
            if (destGroup && destGroup.classList.contains('nav-frequent')) return; /* پرکاربرد ممنوع */
            target.parentNode.insertBefore(itemEl, target);
        } else {
            /* انتها: داخل آخرین گروه باز */
            var groups = _navVisibleGroupEls().filter(function (g) { return !g.classList.contains('collapsed'); });
            var last = groups.length ? groups[groups.length - 1] : null;
            if (last) last.querySelector('.nav-group-items').appendChild(itemEl);
        }
    }

    _navSaveOrderFromDOM();
    _navSaveCollapsedFromDOM();
    buildNavMenu(); /* رندر تمیز بر اساس ترتیب جدید */
    showToast('✅ ترتیب منو ذخیره شد');
}

/* ---------- بایند رویدادهای درگ ---------- */

(function navMenuDragInit() {
    document.addEventListener('pointerdown', function (e) {
        var handle = e.target.closest ? e.target.closest('.nav-drag') : null;
        if (!handle) return;
        /* ✅ v2.7.2 — قفل ترتیب: اگر فعال باشد هیچ جابه‌جایی‌ای شروع نمی‌شود */
        if (navIsLocked()) {
            try { e.preventDefault(); e.stopPropagation(); } catch (eLk) {}
            if (typeof showToast === 'function')
                showToast('🔒 ترتیب منو قفل است — از دکمه «ترتیب قفل» در بالای منو بازش کنید');
            return;
        }
        var groupEl = handle.closest('.nav-group');
        if (!groupEl || groupEl.classList.contains('nav-frequent')) return;
        if (e.button !== undefined && e.button !== 0) return;

        _navDrag = {
            type: handle.getAttribute('data-drag') === 'group' ? 'group' : 'item',
            el: handle.getAttribute('data-drag') === 'group' ? groupEl : handle.closest('.nav-item-btn'),
            startX: e.clientX,
            startY: e.clientY,
            started: false,
            target: null,
            pid: e.pointerId
        };
        _navClickSuppress = true;
    });

    document.addEventListener('pointermove', function (e) {
        if (!_navDrag || e.pointerId !== _navDrag.pid) return;
        if (!_navDrag.started) {
            if (Math.abs(e.clientY - _navDrag.startY) < 7 && Math.abs(e.clientX - _navDrag.startX) < 7) return;
            _navDrag.started = true;
            _navBeginDrag(e);
        }
        e.preventDefault();
        _navMoveDrag(e);
    }, { passive: false });

    function endDrag(e) {
        if (!_navDrag || (e && e.pointerId !== undefined && e.pointerId !== _navDrag.pid)) return;
        var wasDrag = _navDrag.started;
        if (_navDrag.started) {
            _navHideLine();
            try { _navFinishDrag(); } catch (err) { console.warn('[nav-menu] drag error:', err); }
        }
        document.body.classList.remove('nav-dragging-body');
        if (_navDrag && _navDrag.el) _navDrag.el.classList.remove('nav-dragging');
        clearTimeout(_navDrag ? _navDrag._openTimer : 0);
        _navDrag = null;
        _navDragWasDrag = wasDrag;
        /* کلیکِ بلافاصله بعد از درگ را بلع */
        setTimeout(function () { _navClickSuppress = false; _navDragWasDrag = false; }, 350);
    }

    document.addEventListener('pointerup', endDrag);
    document.addEventListener('pointercancel', endDrag);

    /* جلوگیری از ناوبری/تاشگی هنگام تعامل با دستگیرهٔ جابه‌جایی */
    document.addEventListener('click', function (e) {
        if (!_navClickSuppress) return;
        var onHandle = e.target.closest && e.target.closest('.nav-drag');
        if (onHandle) { e.preventDefault(); e.stopPropagation(); return; }
        if (_navDragWasDrag && e.target.closest && e.target.closest('.nav-group-items button')) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);

    /* خشک‌کردن انتخاب متن هنگام درگ */
    document.addEventListener('selectstart', function (e) {
        if (_navDrag && _navDrag.started) e.preventDefault();
    });
})();

var _navDragWasDrag = false;

/* ---------- پایدارسازی وضعیت باز/بسته + دکمه‌ها ---------- */

(function navMenuStateInit() {
    /* کلیک روی عنوان گروه → بعد از toggle، وضعیت ذخیره شود */
    document.addEventListener('click', function (e) {
        if (!(e.target.closest && e.target.closest('.nav-group-title'))) return;
        setTimeout(_navSaveCollapsedFromDOM, 30);
    });

    /* ✅ v2.7.2 — کلیک روی زیرشاخه (فهرست‌ها/عملیات/ابزارها/...) →
       اکسپند/کولپسِ همان زیرشاخه + ذخیرهٔ وضعیت */
    document.addEventListener('click', function (e) {
        var secBtn = e.target.closest ? e.target.closest('.nav-sec-label') : null;
        if (!secBtn) return;
        e.preventDefault();
        e.stopPropagation();
        var key = secBtn.getAttribute('data-nav-group-sec');
        if (!key) return;
        var groupId = key.split(':')[0];
        var secId = secBtn.getAttribute('data-nav-sec');
        var gEl = secBtn.closest('.nav-group');
        if (!gEl) return;

        var willCollapse = !secBtn.classList.contains('sec-collapsed');
        secBtn.classList.toggle('sec-collapsed', willCollapse);
        var c = _navLoadSecCollapsed();
        c[key] = willCollapse;
        _navSaveSecCollapsed(c);

        Array.prototype.slice.call(gEl.querySelectorAll('.nav-item-btn[data-sec]')).forEach(function (b) {
            if (b.getAttribute('data-sec') === secId) b.classList.toggle('nav-sec-hidden', willCollapse);
        });
    });

    /* ✅ v2.7.2 — قفل/باز کردن ترتیب منو */
    document.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('#nav-lock-order') : null;
        if (!btn) return;
        e.preventDefault();
        var locked = navIsLocked();
        navSetLocked(!locked);
        if (typeof showToast === 'function') showToast(!locked
            ? '🔓 ترتیب منو آزاد شد — حالا می‌توانید آیتم‌ها را بکشید'
            : '🔒 ترتیب منو قفل شد — جابه‌جایی تصادفی غیرممکن است');
    });

    /* باز/بستن همه (دکمه‌های داخل سایدبار) → بعد از اجرا ذخیره شود */
    ['side-expand', 'side-collapse'].forEach(function (id) {
        document.addEventListener('click', function (e) {
            if (e.target && e.target.id === id) setTimeout(_navSaveCollapsedFromDOM, 30);
        });
    });

    /* بازنشانی ترتیب */
    document.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('#nav-reset-order') : null;
        if (!btn) return;
        e.preventDefault();
        navResetOrder();
    });
})();

window.buildNavMenu = buildNavMenu;
window.navResetOrder = navResetOrder;
window.navSetSidebarTitle = navSetSidebarTitle;
window.navIsLocked = navIsLocked;
window.navSetLocked = navSetLocked;
window.NAV_MENU_GROUPS = NAV_MENU_GROUPS;

/* ============================================================
   ✅ v2.7.2 — استایل‌های زیرشاخه + قفل ترتیب
   ============================================================ */
(function injectNav272Css() {
    if (document.getElementById('nav-272-style')) return;
    var s = document.createElement('style');
    s.id = 'nav-272-style';
    s.textContent = ''
    + '.nav-sec-label { display:flex !important; align-items:center; gap:4px; cursor:pointer !important; '
      + 'border:none; background:transparent; font-family:inherit; padding:6px 6px 4px !important; width:100%; '
      + 'text-align:right; color:var(--text-muted); font-weight:900; font-size:.68rem !important; '
      + 'letter-spacing:.2px; transition:color .15s; }'
    + '.nav-sec-label:hover { color:var(--primary-dark,#1e40af); }'
    + '.nav-sec-caret { display:inline-block; font-size:.6rem; color:#94a3b8; transition:transform .18s; width:12px; text-align:center; }'
    + '.nav-sec-label.sec-collapsed .nav-sec-caret { transform:rotate(-90deg); }'
    + '.nav-sec-label.sec-collapsed { opacity:.75; }'
    + '.nav-item-btn.nav-sec-hidden { display:none !important; }'
    + '/* قفل ترتیب: دستگیره‌های جابه‌جایی کاملاً پنهان می‌شوند */'
    + 'body.nav-order-locked .nav-drag { display:none !important; }'
    + 'body.nav-order-locked .nav-item-btn { cursor:pointer !important; }'
    + '.mini-btn-active { background:linear-gradient(135deg,#dcfce7,#bbf7d0) !important; color:#166534 !important; border-color:#86efac !important; }';
    document.head.appendChild(s);
})();

console.log('✅ [ui/nav-menu.js] loaded — v2.7.2 (جابه‌جایی گزارش‌ها + قفل ترتیب + اکسپند زیرشاخه‌ها)');
