/* ============================================================
   پارسیس — ناوبری (سایدبار، تب‌ها، صفحات پرکاربرد، swipe)
   مسیر: js/ui/nav.js
   وابستگی: core/* + toast.js
   ============================================================ */
'use strict';

/* ============================================================
   بخش ۱ — سایدبار: باز/بسته کردن
   ============================================================ */
function openSidebar() {
    var sb = document.getElementById('sidebar');
    var ov = document.getElementById('overlay');
    if (sb) sb.classList.add('open');
    if (ov) ov.classList.add('show');
}

function closeSidebar() {
    var sb = document.getElementById('sidebar');
    var ov = document.getElementById('overlay');
    if (sb) sb.classList.remove('open');
    if (ov) ov.classList.remove('show');
}

function closeSettings() {
    var m = document.getElementById('settings-modal');
    var o = document.getElementById('settings-overlay');
    if (m) m.classList.remove('show');
    if (o) o.classList.remove('show');
}

/* ============================================================
   بخش ۲ — ثبت/نمایش صفحات پرکاربرد
   ============================================================ */
function trackFormUsage(pageName) {
    if (!pageName || pageName === 'home') return;
    state.formUsage[pageName] = (state.formUsage[pageName] || 0) + 1;
    DB.save(LS_KEYS.FORM_USAGE, state.formUsage);
    renderFrequentNav();
}

function renderFrequentNav() {
    var container = document.getElementById('nav-frequent-items');
    var group = document.getElementById('nav-frequent-group');
    if (!container || !group) return;

    var usage = state.formUsage || {};
    var entries = Object.keys(usage)
        .map(function (k) { return { page: k, count: usage[k] }; })
        .sort(function (a, b) { return b.count - a.count; })
        .slice(0, 6);

    if (entries.length === 0) {
        group.style.display = 'none';
        return;
    }
    group.style.display = '';

    var meta = {
        'voucher-new':            { label: '✏️ صدور سند جدید' },
        'voucher-list':           { label: '📄 فهرست اسناد' },
        'persons':                { label: '👥 اشخاص' },
        'companies':              { label: '🏢 شرکت‌ها' },
        'bank-accounts':          { label: '🏦 حساب‌های بانکی' },
        'cash-boxes':             { label: '💰 صندوق‌ها' },
        'projects':               { label: '📁 پروژه‌ها' },
        'notes':                  { label: '📔 یادداشت‌ها' },
        'dashboard':              { label: '🎯 داشبورد مالی' },
        'report-cashflow':        { label: '💵 پیش‌بینی روزانه نقدینگی' },
        'report-cashflow-desc':   { label: '💸 گردش وجه نقد' },
        'report-account':         { label: '📒 مرور حساب‌ها' },
        'report-trial':           { label: '⚖️ تراز آزمایشی' },
        'report-incomplete':      { label: '🔍 تراکنش‌های تکمیل نشده' },
        'report-facility':        { label: '🏦 خلاصه تسهیلات' },
        'report-facility-full':   { label: '📊 گزارش جامع تسهیلات' },
        'report-rates':           { label: '📈 نرخ ارز و طلا' },
        'report-compare':         { label: '📊 گزارش مقایسه‌ای' },
        'facilities':             { label: '🏦 تسهیلات' },
        'chart-define':           { label: '✏️ تعریف حساب‌ها' },
        'sms':                    { label: '📱 پیامک بانکی' },
        'templates':              { label: '🧩 الگوها' },
        'fiscal':                 { label: '📅 دوره مالی' },
        'estimate-daily':         { label: '📝 برآورد هزینه‌ها' },
        'cashflow-sources':       { label: '📌 منابع دریافتنی' },
        'daily-close':            { label: '📅 قیمت پایانی روز' },
        'language':               { label: '🌐 زبان' },
        'account-types':          { label: '📑 لیست نوع حساب' },
        'bank-types':             { label: '🏦 انواع حساب بانکی' },
        'cash-types':             { label: '💰 انواع صندوق' },
        'currency':               { label: '💱 ارز و واحد پول' },
        'jalali-calendar':        { label: '📅 مدیریت تقویم' }
    };

    container.innerHTML = '';

    var clearBtn = document.createElement('button');
    clearBtn.className = 'clear-freq-btn';
    clearBtn.type = 'button';
    clearBtn.textContent = '🗑 خالی کردن تاریخچه صفحات پرکاربرد';
    clearBtn.addEventListener('click', function () {
        if (!confirm('تاریخچه صفحات پرکاربرد پاک شود؟')) return;
        state.formUsage = {};
        DB.save(LS_KEYS.FORM_USAGE, {});
        renderFrequentNav();
        showToast('✅ تاریخچه پاک شد.');
    });
    container.appendChild(clearBtn);

    entries.forEach(function (e) {
        var m = meta[e.page] || { label: '📄 ' + e.page };
        var b = document.createElement('button');
        b.setAttribute('data-page', e.page);
        b.innerHTML = '<span>' + m.label + '</span>';
        b.addEventListener('click', function () { goToPage(e.page); });
        container.appendChild(b);
    });
}

/* ============================================================
   بخش ۳ — Tab
   ============================================================ */
function setupTabs() {
    var btns = document.querySelectorAll('.tab-btn');
    for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener('click', function () {
            var tn = this.getAttribute('data-tab');
            if (!tn) return;
            var parent = this.parentElement;
            var tbs = parent.querySelectorAll('.tab-btn');
            for (var j = 0; j < tbs.length; j++) tbs[j].classList.remove('active');
            this.classList.add('active');

            var sec = parent.parentElement;
            var cs = sec.querySelectorAll('.tab-content');
            for (var k = 0; k < cs.length; k++) cs[k].classList.remove('active');
            var target = document.getElementById('tab-' + tn);
            if (target) target.classList.add('active');

            if (typeof attachDatePickers === 'function') attachDatePickers();
        });
    }
}

/* ============================================================
   بخش ۴ — جستجو در سایدبار
   ============================================================ */
function initSidebarSearch() {
    var inp = document.getElementById('sidebar-search-input');
    if (!inp) return;
    inp.addEventListener('input', function () {
        var q = this.value.trim().toLowerCase();
        var groups = document.querySelectorAll('#sidebar-nav .nav-group');
        for (var i = 0; i < groups.length; i++) {
            var btns = groups[i].querySelectorAll('.nav-group-items button');
            var anyMatch = false;
            for (var j = 0; j < btns.length; j++) {
                var txt = btns[j].textContent.toLowerCase();
                var match = !q || txt.indexOf(q) !== -1;
                btns[j].style.display = match ? '' : 'none';
                if (match) anyMatch = true;
            }
            groups[i].style.display = anyMatch ? '' : 'none';
            if (q && anyMatch) groups[i].classList.remove('collapsed');
        }
    });
}

/* ============================================================
   بخش ۵ — swipe صفحه اصلی
   ============================================================ */
function initHomeSwipe() {
    var grid = document.getElementById('home-grid');
    if (!grid) return;
    var startX = 0, startY = 0, tracking = false;

    grid.addEventListener('touchstart', function (e) {
        if (e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        tracking = true;
    }, { passive: true });

    grid.addEventListener('touchend', function (e) {
        if (!tracking) return;
        tracking = false;
        var dx = e.changedTouches[0].clientX - startX;
        var dy = e.changedTouches[0].clientY - startY;
        if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;

        if (dx < 0) {
            if (state.homePage < MAX_HOME_PAGES) {
                state.homePage++;
                saveState(LS_KEYS.HOME_PAGE);
                if (typeof applyWidgetVisibility === 'function') applyWidgetVisibility();
            }
        } else {
            if (state.homePage > 1) {
                state.homePage--;
                saveState(LS_KEYS.HOME_PAGE);
                if (typeof applyWidgetVisibility === 'function') applyWidgetVisibility();
            }
        }
    }, { passive: true });
}

/* ============================================================
   بخش ۶ — تب‌های صفحه اصلی
   ============================================================ */
function setHomePage(p) {
    if (p < 1 || p > MAX_HOME_PAGES) return;
    state.homePage = p;
    saveState(LS_KEYS.HOME_PAGE);
    if (typeof applyWidgetVisibility === 'function') applyWidgetVisibility();
}

function renderHomePageTabs() {
    var tabs = document.querySelectorAll('.home-page-tab');
    for (var i = 0; i < tabs.length; i++) {
        var pg = Number(tabs[i].getAttribute('data-home-page'));
        tabs[i].classList.toggle('active', pg === state.homePage);
    }
}

function renderHomePageDots() {
    var box = document.getElementById('home-page-dots');
    if (!box) return;
    box.innerHTML = '';
    for (var p = 1; p <= MAX_HOME_PAGES; p++) {
        var d = document.createElement('div');
        d.className = 'home-page-dot' + (p === state.homePage ? ' active' : '');
        (function (pg) {
            d.addEventListener('click', function () { setHomePage(pg); });
        })(p);
        box.appendChild(d);
    }
}

/* ============================================================
   بخش ۷ — اتصال رویدادهای سایدبار
   ============================================================ */
function bindSidebarNav() {
    var menuBtn = document.getElementById('menu-btn');
    if (menuBtn) menuBtn.addEventListener('click', openSidebar);

    var closeBtn = document.getElementById('close-sidebar');
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);

    var overlay = document.getElementById('overlay');
    if (overlay) overlay.addEventListener('click', function () {
        closeSidebar();
        closeSettings();
    });

    var titles = document.querySelectorAll('.nav-group-title');
    for (var i = 0; i < titles.length; i++) {
        titles[i].addEventListener('click', function () {
            this.parentElement.classList.toggle('collapsed');
        });
    }

    document.addEventListener('click', function (e) {
        var btn = e.target.closest('.nav-group-items button[data-page]');
        if (btn) goToPage(btn.getAttribute('data-page'));
    });

    var sideExpand = document.getElementById('side-expand');
    if (sideExpand) sideExpand.addEventListener('click', function () {
        document.querySelectorAll('.nav-group').forEach(function (g) {
            g.classList.remove('collapsed');
        });
    });

    var sideCollapse = document.getElementById('side-collapse');
    if (sideCollapse) sideCollapse.addEventListener('click', function () {
        document.querySelectorAll('.nav-group').forEach(function (g) {
            g.classList.add('collapsed');
        });
    });

    var hpTabs = document.querySelectorAll('.home-page-tab');
    for (var hpt = 0; hpt < hpTabs.length; hpt++) {
        hpTabs[hpt].addEventListener('click', function () {
            setHomePage(Number(this.getAttribute('data-home-page')));
        });
    }
}

/* ============================================================
   صادرسازی
   ============================================================ */
window.openSidebar        = openSidebar;
window.closeSidebar       = closeSidebar;
window.closeSettings      = closeSettings;
window.trackFormUsage     = trackFormUsage;
window.renderFrequentNav  = renderFrequentNav;
window.setupTabs          = setupTabs;
window.initSidebarSearch  = initSidebarSearch;
window.initHomeSwipe      = initHomeSwipe;
window.setHomePage        = setHomePage;
window.renderHomePageTabs = renderHomePageTabs;
window.renderHomePageDots = renderHomePageDots;
window.bindSidebarNav     = bindSidebarNav;

console.log('✅ [ui/nav.js] loaded');
