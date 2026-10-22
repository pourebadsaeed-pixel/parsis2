/* ============================================================
   پارسیس — سیستم تب‌های پیشرفته (رفع مشکل غیرفعال شدن دکمه‌ها)
   ============================================================ */
'use strict';

(function patchGetElementById() {
    if (window._getByIdPatched) return;
    window._getByIdPatched = true;
    var origGet = document.getElementById;
    document.getElementById = function(id) {
        if (!id) return origGet.call(document, id);
        var activePage = document.querySelector('.page.active');
        if (activePage) {
            if (activePage.id === id || activePage.id.indexOf(id + '-') === 0) return activePage;
            if (activePage.querySelector) {
                var el = activePage.querySelector('#' + id);
                if (el) return el;
            }
        }
        return origGet.call(document, id);
    };
})();

var TAB_STATE = {
    tabs: [{ id: 'home', page: 'home', domId: 'page-home', title: 'صفحه اصلی', icon: '🏠' }],
    active: 'home',
    max: 15
};

function getPageMeta(pageId) {
    if (typeof PAGE_TITLES_FA !== 'undefined' && PAGE_TITLES_FA[pageId]) return PAGE_TITLES_FA[pageId];
    var btn = document.querySelector('.nav-group-items button[data-page="' + pageId + '"]');
    if (!btn) return { title: pageId, icon: '📄' };
    var clone = btn.cloneNode(true);
    var badge = clone.querySelector('.nav-badge'); if (badge) badge.remove();
    var txt = (clone.textContent || '').trim().replace(/\s+/g, ' ');
    if (!txt) return { title: pageId, icon: '📄' };
    var parts = txt.split(' '); var icon = parts[0]; var title = parts.slice(1).join(' ') || txt;
    var cc = icon && icon.charCodeAt(0);
    if (!cc || cc < 0x2000) { icon = '📄'; title = txt; }
    return { title: title, icon: icon };
}

function cleanClonedPage(clone) {
    // پاک کردن مارکرها تا بایندرها دوباره اجرا شوند
    ['data-bound', 'data-bound-collapse', 'data-picker', 'data-picker-bound', 'data-resizable', 'data-sort-attached', 'data-collapsible', 'data-money', 'data-cs-bound'].forEach(function(attr) {
        var els = clone.querySelectorAll('[' + attr + ']');
        for (var i = 0; i < els.length; i++) els[i].removeAttribute(attr);
    });
    clone.removeAttribute('data-rebound');
    clone.removeAttribute('data-filter-collapse-init');

    // حذف دکمه‌های ساخته شده داینامیک
    var toRemove = clone.querySelectorAll('.col-resizer, .col-filter-btn, tr.column-filter-row, .share-btn, .widget-share-btn, .eye-toggle-btn, .col-toggle-btn, .col-reset-btn');
    for (var r = 0; r < toRemove.length; r++) toRemove[r].remove();
    return clone;
}

function switchToTab(tabId) {
    var tab = TAB_STATE.tabs.find(function(t) { return t.id === tabId; });
    if (!tab) return;

    document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
    
    var targetPage = document.getElementById(tab.domId);
    if (targetPage) {
        targetPage.classList.add('active');
    } else {
        var origPage = document.getElementById('page-' + tab.page);
        if (origPage) origPage.classList.add('active');
    }

    TAB_STATE.active = tabId;
    if (typeof renderTabs === 'function') renderTabs();

    // ✅ بایند کردن مجدد دکمه‌های صفحه کلون شده
    if (tab.page !== 'home') {
        setTimeout(function() {
            try {
                if (typeof runPageRenderer === 'function') runPageRenderer(tab.page);
                if (typeof bindBaseDataForms === 'function') bindBaseDataForms();
                if (typeof bindFilterInputs === 'function') bindFilterInputs();
                if (typeof bindExportButtons === 'function') bindExportButtons();
                if (typeof applyPageHelpers === 'function') applyPageHelpers();
            } catch(e) { console.warn('[switchToTab bind]', e); }
        }, 50);
    }
}

function installGoToPageOverride() {
    if (typeof window.goToPage !== 'function' || window._origGoToPage) return false;
    var orig = window.goToPage; window._origGoToPage = orig;

    window.goToPage = function (name, forceNew) {
        if (!name) return;
        if (name === 'home') {
            var ht = TAB_STATE.tabs.find(function(t) { return t.page === 'home'; });
            if (ht) switchToTab(ht.id); return;
        }
        var existingTab = TAB_STATE.tabs.find(function(t) { return t.page === name; });
        if (!forceNew && existingTab) { switchToTab(existingTab.id); return; }

        var origPage = document.getElementById('page-' + name);
        if (!origPage) return;

        if (!origPage.classList.contains('page-template')) {
            origPage.classList.add('page-template'); origPage.classList.remove('active');
        }

        var uniqueId = 'page-' + name + '-' + Date.now();
        var clone = origPage.cloneNode(true);
        clone.id = uniqueId; clone.classList.remove('active', 'page-template');
        cleanClonedPage(clone);

        // پاک کردن محتویات گزارش‌ها برای رندر مجدد
        clone.querySelectorAll('#ra-result, #rt-result, #rc-result, #cf-result, #cfd-result, #ri-result, #rf-result, #rff-result, #dash-grid-container').forEach(function(b) { b.innerHTML = ''; });
        origPage.parentNode.appendChild(clone);

        var meta = getPageMeta(name); var newTabId = 'tab_' + Date.now();
        TAB_STATE.tabs.push({ id: newTabId, page: name, domId: uniqueId, title: meta.title, icon: meta.icon, context: null });
        if (typeof trackFormUsage === 'function') trackFormUsage(name);
        switchToTab(newTabId);
    };
    return true;
}

function initFormTabs() {
    setInterval(function() {
        if (installGoToPageOverride()) clearInterval(this);
    }, 300);
}
document.addEventListener('DOMContentLoaded', function() { setTimeout(initFormTabs, 500); });
