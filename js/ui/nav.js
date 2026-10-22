/* ============================================================
   پارسیس — ناوبری
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

function bindSidebarNav() {
    if (window._navBound) return;
    window._navBound = true;

    var menuBtn = document.getElementById('menu-btn');
    if (menuBtn) menuBtn.onclick = openSidebar;
    var closeBtn = document.getElementById('close-sidebar');
    if (closeBtn) closeBtn.onclick = closeSidebar;
    var overlay = document.getElementById('overlay');
    if (overlay) overlay.onclick = function() { closeSidebar(); closeSettings(); };

    document.addEventListener('click', function (e) {
        var title = e.target.closest('.nav-group-title');
        if (title) { title.parentElement.classList.toggle('collapsed'); return; }
        
        var btn = e.target.closest('.nav-group-items button[data-page]');
        if (btn) {
            var pageName = btn.getAttribute('data-page');
            if (typeof goToPage === 'function') goToPage(pageName);
            closeSidebar();
            return;
        }
        
        var hTab = e.target.closest('.home-page-tab');
        if (hTab) { if (typeof setHomePage === 'function') setHomePage(Number(hTab.getAttribute('data-home-page'))); return; }
    });
}
window.bindSidebarNav = bindSidebarNav;
