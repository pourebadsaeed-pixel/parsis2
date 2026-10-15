/* ============================================================
   پارسیس — رفع باگ دکمه منو (تداخل نام bindSidebarNav)
   مسیر: js/modules/fix-sidebar.js
   ============================================================ */
'use strict';

(function fixSidebarMenu() {
    function attach() {
        /* دکمه منو ☰ */
        var menuBtn = document.getElementById('menu-btn');
        if (menuBtn && !menuBtn._sidebarFix) {
            menuBtn._sidebarFix = true;
            menuBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (typeof window.openSidebar === 'function') {
                    window.openSidebar();
                }
            });
        }

        /* دکمه بستن × */
        var closeBtn = document.getElementById('close-sidebar');
        if (closeBtn && !closeBtn._sidebarFix) {
            closeBtn._sidebarFix = true;
            closeBtn.addEventListener('click', function (e) {
                e.preventDefault();
                if (typeof window.closeSidebar === 'function') {
                    window.closeSidebar();
                }
            });
        }

        /* کلیک روی overlay */
        var overlay = document.getElementById('overlay');
        if (overlay && !overlay._sidebarFix) {
            overlay._sidebarFix = true;
            overlay.addEventListener('click', function () {
                if (typeof window.closeSidebar === 'function') window.closeSidebar();
                if (typeof window.closeSettings === 'function') window.closeSettings();
            });
        }

        /* آکاردئون گروه‌ها */
        var titles = document.querySelectorAll('.nav-group-title');
        for (var i = 0; i < titles.length; i++) {
            if (titles[i]._sidebarFix) continue;
            titles[i]._sidebarFix = true;
            titles[i].addEventListener('click', function () {
                this.parentElement.classList.toggle('collapsed');
            });
        }

        /* کلیک روی دکمه‌های ناوبری */
        if (!document._sidebarNavDelegated) {
            document._sidebarNavDelegated = true;
            document.addEventListener('click', function (e) {
                if (!e.target || !e.target.closest) return;
                var btn = e.target.closest('.nav-group-items button[data-page]');
                if (btn) {
                    if (typeof window.goToPage === 'function') {
                        window.goToPage(btn.getAttribute('data-page'));
                    }
                }
            });
        }

        /* باز/بستن همه */
        var sideExpand = document.getElementById('side-expand');
        if (sideExpand && !sideExpand._sidebarFix) {
            sideExpand._sidebarFix = true;
            sideExpand.addEventListener('click', function () {
                document.querySelectorAll('.nav-group').forEach(function (g) {
                    g.classList.remove('collapsed');
                });
            });
        }

        var sideCollapse = document.getElementById('side-collapse');
        if (sideCollapse && !sideCollapse._sidebarFix) {
            sideCollapse._sidebarFix = true;
            sideCollapse.addEventListener('click', function () {
                document.querySelectorAll('.nav-group').forEach(function (g) {
                    g.classList.add('collapsed');
                });
            });
        }

        /* تب‌های صفحه اصلی */
        var hpTabs = document.querySelectorAll('.home-page-tab');
        for (var j = 0; j < hpTabs.length; j++) {
            if (hpTabs[j]._sidebarFix) continue;
            hpTabs[j]._sidebarFix = true;
            hpTabs[j].addEventListener('click', function () {
                if (typeof window.setHomePage === 'function') {
                    window.setHomePage(Number(this.getAttribute('data-home-page')));
                }
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attach);
    } else {
        attach();
    }
    /* شبکه‌ی اطمینان */
    setTimeout(attach, 500);
    setTimeout(attach, 1500);
})();

console.log('✅ [modules/fix-sidebar.js] loaded');
