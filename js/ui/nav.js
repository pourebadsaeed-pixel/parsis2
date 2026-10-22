/* ============================================================
   پارسیس — ناوبری (نسخه کامل)
   مسیر: js/ui/nav.js
   ============================================================ */
'use strict';

function openSidebar() {
    var sb = document.getElementById('sidebar'); var ov = document.getElementById('overlay');
    if (sb) sb.classList.add('open'); if (ov) ov.classList.add('show');
}

function closeSidebar() {
    var sb = document.getElementById('sidebar'); var ov = document.getElementById('overlay');
    if (sb) sb.classList.remove('open'); if (ov) ov.classList.remove('show');
}

function closeSettings() {
    var m = document.getElementById('settings-modal'); var o = document.getElementById('settings-overlay');
    if (m) m.classList.remove('show'); if (o) o.classList.remove('show');
}

function trackFormUsage(pageName) {
    if (!pageName || pageName === 'home') return;
    state.formUsage[pageName] = (state.formUsage[pageName] || 0) + 1;
    DB.save(LS_KEYS.FORM_USAGE, state.formUsage);
    renderFrequentNav();
}

function renderFrequentNav() {
    var container = document.getElementById('nav-frequent-items'); var group = document.getElementById('nav-frequent-group');
    if (!container || !group) return;
    var usage = state.formUsage || {};
    var entries = Object.keys(usage).map(function (k) { return { page: k, count: usage[k] }; })
        .sort(function (a, b) { return b.count - a.count; }).slice(0, 6);

    if (entries.length === 0) { group.style.display = 'none'; return; }
    group.style.display = ''; container.innerHTML = '';

    var clearBtn = document.createElement('button');
    clearBtn.className = 'clear-freq-btn'; clearBtn.type = 'button'; clearBtn.textContent = '🗑 خالی کردن تاریخچه';
    clearBtn.onclick = function () {
        if (!confirm('تاریخچه پاک شود؟')) return;
        state.formUsage = {}; DB.save(LS_KEYS.FORM_USAGE, {}); renderFrequentNav();
    };
    container.appendChild(clearBtn);

    var meta = { 'voucher-new': '✏️ صدور سند', 'voucher-list': '📄 فهرست اسناد', 'persons': '👥 اشخاص', 'companies': '🏢 شرکت‌ها', 'bank-accounts': '🏦 حساب‌ها', 'notes': '📔 یادداشت‌ها', 'dashboard': '🎯 داشبورد' };
    
    entries.forEach(function (e) {
        var m = meta[e.page] || '📄 ' + e.page;
        var b = document.createElement('button');
        b.innerHTML = '<span>' + m + '</span>';
        b.onclick = function () { if (typeof goToPage === 'function') goToPage(e.page); };
        container.appendChild(b);
    });
}

function setupTabs() {
    if (window._tabsDelegated) return;
    window._tabsDelegated = true;
    document.addEventListener('click', function (e) {
        var btn = e.target.closest('.tab-btn');
        if (!btn) return;
        var tn = btn.getAttribute('data-tab'); if (!tn) return;
        e.preventDefault(); e.stopPropagation();

        var parent = btn.parentElement; if (!parent) return;
        parent.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');

        var sec = parent.parentElement; if (!sec) return;
        sec.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });

        var currentPage = btn.closest('.page');
        var target = currentPage ? currentPage.querySelector('#tab-' + tn) : document.getElementById('tab-' + tn);
        if (target) target.classList.add('active');
        
        if (typeof attachDatePickers === 'function') attachDatePickers();
    });
}

function initSidebarSearch() {
    var inp = document.getElementById('sidebar-search-input');
    if (!inp || inp.dataset.boundSearch) return;
    inp.dataset.boundSearch = '1';
    inp.addEventListener('input', function () {
        var q = this.value.trim().toLowerCase();
        document.querySelectorAll('#sidebar-nav .nav-group').forEach(function(group) {
            var anyMatch = false;
            group.querySelectorAll('.nav-group-items button').forEach(function(btn) {
                var match = !q || btn.textContent.toLowerCase().indexOf(q) !== -1;
                btn.style.display = match ? '' : 'none';
                if (match) anyMatch = true;
            });
            group.style.display = anyMatch ? '' : 'none';
            if (q && anyMatch) group.classList.remove('collapsed');
        });
    });
}

function initHomeSwipe() {
    var grid = document.getElementById('home-grid');
    if (!grid || grid.dataset.swipeBound) return;
    grid.dataset.swipeBound = '1';
    var startX = 0, startY = 0, tracking = false;
    grid.addEventListener('touchstart', function (e) { if (e.touches.length === 1) { startX = e.touches[0].clientX; startY = e.touches[0].clientY; tracking = true; } }, { passive: true });
    grid.addEventListener('touchend', function (e) {
        if (!tracking) return; tracking = false;
        var dx = e.changedTouches[0].clientX - startX; var dy = e.changedTouches[0].clientY - startY;
        if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
        if (dx < 0) { if (state.homePage < MAX_HOME_PAGES) { state.homePage++; saveState(LS_KEYS.HOME_PAGE); if (typeof applyWidgetVisibility === 'function') applyWidgetVisibility(); } } 
        else { if (state.homePage > 1) { state.homePage--; saveState(LS_KEYS.HOME_PAGE); if (typeof applyWidgetVisibility === 'function') applyWidgetVisibility(); } }
    }, { passive: true });
}

function setHomePage(p) {
    if (p < 1 || p > MAX_HOME_PAGES) return;
    state.homePage = p; saveState(LS_KEYS.HOME_PAGE);
    if (typeof applyWidgetVisibility === 'function') applyWidgetVisibility();
}

function isHomePageEmpty(pageNum) {
    var widgets = state.widgets || {}; var pages = state.widgetPages || {}; var order = state.widgetOrder || [];
    for (var i = 0; i < order.length; i++) { if (widgets[order[i]] && (pages[order[i]] || 1) === pageNum) return false; }
    return true;
}

function getMaxActiveHomePage() {
    var maxP = 0; for (var p = 1; p <= MAX_HOME_PAGES; p++) { if (!isHomePageEmpty(p)) maxP = p; }
    return maxP;
}

function renderHomePageTabs() {
    var tabs = document.querySelectorAll('.home-page-tab'); var maxActive = getMaxActiveHomePage();
    tabs.forEach(function(t) {
        var pg = Number(t.getAttribute('data-home-page'));
        t.style.display = !isHomePageEmpty(pg) ? '' : 'none';
        t.classList.toggle('active', pg === state.homePage);
    });
    if (state.homePage > maxActive) { state.homePage = Math.max(1, maxActive); saveState(LS_KEYS.HOME_PAGE); }
}

function renderHomePageDots() {
    var box = document.getElementById('home-page-dots'); if (!box) return;
    box.innerHTML = '';
    for (var p = 1; p <= MAX_HOME_PAGES; p++) {
        if (isHomePageEmpty(p)) continue;
        var d = document.createElement('div'); d.className = 'home-page-dot' + (p === state.homePage ? ' active' : '');
        d.onclick = function(pg) { return function() { setHomePage(pg); }; }(p);
        box.appendChild(d);
    }
}

function bindSidebarNav() {
    if (window._navBound) return; window._navBound = true;

    var menuBtn = document.getElementById('menu-btn'); if (menuBtn) menuBtn.onclick = openSidebar;
    var closeBtn = document.getElementById('close-sidebar'); if (closeBtn) closeBtn.onclick = closeSidebar;
    var overlay = document.getElementById('overlay'); if (overlay) overlay.onclick = function() { closeSidebar(); closeSettings(); };

    document.addEventListener('click', function (e) {
        var title = e.target.closest('.nav-group-title');
        if (title) { title.parentElement.classList.toggle('collapsed'); return; }
        
        var btn = e.target.closest('.nav-group-items button[data-page]');
        if (btn) { if (typeof goToPage === 'function') goToPage(btn.getAttribute('data-page')); closeSidebar(); return; }
        
        var hTab = e.target.closest('.home-page-tab');
        if (hTab) { setHomePage(Number(hTab.getAttribute('data-home-page'))); return; }
    });

    var sideExpand = document.getElementById('side-expand');
    if (sideExpand) sideExpand.onclick = function () { document.querySelectorAll('.nav-group').forEach(function (g) { g.classList.remove('collapsed'); }); };
    var sideCollapse = document.getElementById('side-collapse');
    if (sideCollapse) sideCollapse.onclick = function () { document.querySelectorAll('.nav-group').forEach(function (g) { g.classList.add('collapsed'); }); };
}

window.openSidebar = openSidebar;
window.closeSidebar = closeSidebar;
window.closeSettings = closeSettings;
window.trackFormUsage = trackFormUsage;
window.renderFrequentNav = renderFrequentNav;
window.setupTabs = setupTabs;
window.initSidebarSearch = initSidebarSearch;
window.initHomeSwipe = initHomeSwipe;
window.setHomePage = setHomePage;
window.renderHomePageTabs = renderHomePageTabs;
window.renderHomePageDots = renderHomePageDots;
window.bindSidebarNav = bindSidebarNav;
window.isHomePageEmpty = isHomePageEmpty;
window.getMaxActiveHomePage = getMaxActiveHomePage;
