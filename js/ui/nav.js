/* ============================================================
   پارسیس — ناوبری (سایدبار، تب‌ها، صفحات پرکاربرد، swipe)
   مسیر: js/ui/nav.js (نسخه اصلاح‌شده: تب‌های Delegation-based)
   ============================================================ */
'use strict';

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
    if (entries.length === 0) { group.style.display = 'none'; return; }
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
        'report-compare':         { label: '📊 گزارش مقایسه‌ای' },
        'facilities':             { label: '🏦 تسهیلات' },
        'chart-define':           { label: '✏️ تعریف حساب‌ها' },
        'sms':                    { label: '📱 پیامک بانکی' },
        'templates':              { label: '🧩 الگوها' },
        'fiscal':                 { label: '📅 دوره مالی' },
        'estimate-daily':         { label: '📝 برآورد هزینه‌ها' },
        'cashflow-sources':       { label: '📌 منابع دریافتنی' },
        'users':                  { label: '👤 معرفی کاربران' },
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
        b.addEventListener('click', function () {
            // ✅ استفاده از تب موجود یا ایجاد تب جدید
            if (typeof goToPage === 'function') goToPage(e.page);
        });
        container.appendChild(b);
    });
}

/* ============================================================
   setupTabs — با Event Delegation (کلون‌safe)
   ============================================================ */
function setupTabs() {
    if (window._tabsDelegated) return;
    window._tabsDelegated = true;

    document.addEventListener('click', function (e) {
        var btn = e.target.closest('.tab-btn');
        if (!btn) return;
        var tn = btn.getAttribute('data-tab');
        if (!tn) return;

        e.preventDefault();
        e.stopPropagation();

        var parent = btn.parentElement;
        if (!parent) return;
        var tbs = parent.querySelectorAll('.tab-btn');
        for (var j = 0; j < tbs.length; j++) tbs[j].classList.remove('active');
        btn.classList.add('active');

        var sec = parent.parentElement;
        if (!sec) return;
        var cs = sec.querySelectorAll('.tab-content');
        for (var k = 0; k < cs.length; k++) cs[k].classList.remove('active');

        // پیدا کردن محتوای درست در همان صفحه (کلون)
        var currentPage = btn.closest('.page');
        var target = null;
        if (currentPage) target = currentPage.querySelector('#tab-' + tn);
        if (!target) target = document.getElementById('tab-' + tn);
        if (target) target.classList.add('active');

        if (typeof attachDatePickers === 'function') attachDatePickers();
    });
}

/* ============================================================
   جستجوی سایدبار
   ============================================================ */
function initSidebarSearch() {
    var inp = document.getElementById('sidebar-search-input');
    if (!inp) return;
    if (inp.dataset.boundSearch) return;
    inp.dataset.boundSearch = '1';
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
   سوایپ صفحه اصلی
   ============================================================ */
function initHomeSwipe() {
    var grid = document.getElementById('home-grid');
    if (!grid) return;
    if (grid.dataset.swipeBound) return;
    grid.dataset.swipeBound = '1';
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

function setHomePage(p) {
    if (p < 1 || p > MAX_HOME_PAGES) return;
    state.homePage = p;
    saveState(LS_KEYS.HOME_PAGE);
    if (typeof applyWidgetVisibility === 'function') applyWidgetVisibility();
}

function isHomePageEmpty(pageNum) {
    var widgets = state.widgets || {};
    var pages = state.widgetPages || {};
    var order = state.widgetOrder || [];
    for (var i = 0; i < order.length; i++) {
        var k = order[i];
        if (widgets[k] && (pages[k] || 1) === pageNum) return false;
    }
    return true;
}

function getMaxActiveHomePage() {
    var maxP = 0;
    for (var p = 1; p <= MAX_HOME_PAGES; p++) {
        if (!isHomePageEmpty(p)) maxP = p;
    }
    return maxP;
}

function renderHomePageTabs() {
    var tabs = document.querySelectorAll('.home-page-tab');
    var maxActive = getMaxActiveHomePage();
    for (var i = 0; i < tabs.length; i++) {
        var pg = Number(tabs[i].getAttribute('data-home-page'));
        var hasWidgets = !isHomePageEmpty(pg);
        tabs[i].style.display = hasWidgets ? '' : 'none';
        tabs[i].classList.toggle('active', pg === state.homePage);
    }
    if (state.homePage > maxActive) {
        state.homePage = Math.max(1, maxActive);
        saveState(LS_KEYS.HOME_PAGE);
    }
}

function renderHomePageDots() {
    var box = document.getElementById('home-page-dots');
    if (!box) return;
    box.innerHTML = '';
    for (var p = 1; p <= MAX_HOME_PAGES; p++) {
        if (isHomePageEmpty(p)) continue;
        var d = document.createElement('div');
        d.className = 'home-page-dot' + (p === state.homePage ? ' active' : '');
        (function (pg) {
            d.addEventListener('click', function () { setHomePage(pg); });
        })(p);
        box.appendChild(d);
    }
}

/* ============================================================
   bindSidebarNav — Delegation-based
   ============================================================ */
function bindSidebarNav() {
    var menuBtn = document.getElementById('menu-btn');
    if (menuBtn && !menuBtn.dataset.boundMenu) {
        menuBtn.dataset.boundMenu = '1';
        menuBtn.addEventListener('click', openSidebar);
    }

    var closeBtn = document.getElementById('close-sidebar');
    if (closeBtn && !closeBtn.dataset.boundClose) {
        closeBtn.dataset.boundClose = '1';
        closeBtn.addEventListener('click', closeSidebar);
    }

    var overlay = document.getElementById('overlay');
    if (overlay && !overlay.dataset.boundOv) {
        overlay.dataset.boundOv = '1';
        overlay.addEventListener('click', function () {
            closeSidebar();
            closeSettings();
        });
    }

    // گروه‌های باز/بسته — delegation
    if (!window._navGroupsDelegated) {
        window._navGroupsDelegated = true;
        document.addEventListener('click', function (e) {
            var title = e.target.closest('.nav-group-title');
            if (title) {
                title.parentElement.classList.toggle('collapsed');
                return;
            }
        });
    }

    // دکمه‌های صفحه — delegation
    if (!window._navPagesDelegated) {
        window._navPagesDelegated = true;
        document.addEventListener('click', function (e) {
            var btn = e.target.closest('.nav-group-items button[data-page]');
            if (!btn) return;
            var pageName = btn.getAttribute('data-page');
            if (pageName === 'home') {
                if (typeof goToPage === 'function') goToPage('home');
            } else {
                // ✅ استفاده از تب موجود (بدون forceNew) — اگر نیاز بود کاربر باز می‌کند
                if (typeof goToPage === 'function') goToPage(pageName);
            }
            if (typeof closeSidebar === 'function') closeSidebar();
        });
    }

    var sideExpand = document.getElementById('side-expand');
    if (sideExpand && !sideExpand.dataset.boundExpand) {
        sideExpand.dataset.boundExpand = '1';
        sideExpand.addEventListener('click', function () {
            document.querySelectorAll('.nav-group').forEach(function (g) {
                g.classList.remove('collapsed');
            });
        });
    }

    var sideCollapse = document.getElementById('side-collapse');
    if (sideCollapse && !sideCollapse.dataset.boundCollapse) {
        sideCollapse.dataset.boundCollapse = '1';
        sideCollapse.addEventListener('click', function () {
            document.querySelectorAll('.nav-group').forEach(function (g) {
                g.classList.add('collapsed');
            });
        });
    }

    // تب‌های صفحه اصلی — delegation
    if (!window._homePageTabsDelegated) {
        window._homePageTabsDelegated = true;
        document.addEventListener('click', function (e) {
            var t = e.target.closest('.home-page-tab');
            if (!t) return;
            setHomePage(Number(t.getAttribute('data-home-page')));
        });
    }

    var setExpand = document.getElementById('settings-expand-all');
    if (setExpand && !setExpand.dataset.boundSExp) {
        setExpand.dataset.boundSExp = '1';
        setExpand.addEventListener('click', function () {
            document.querySelectorAll('#settings-modal .settings-details').forEach(function (d) {
                d.open = true;
            });
        });
    }

    var setCollapse = document.getElementById('settings-collapse-all');
    if (setCollapse && !setCollapse.dataset.boundSCol) {
        setCollapse.dataset.boundSCol = '1';
        setCollapse.addEventListener('click', function () {
            document.querySelectorAll('#settings-modal .settings-details').forEach(function (d) {
                d.open = false;
            });
        });
    }
}

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
window.isHomePageEmpty    = isHomePageEmpty;
window.getMaxActiveHomePage = getMaxActiveHomePage;

console.log('✅ [ui/nav.js] loaded — Delegation-based tabs (clone-safe)');
