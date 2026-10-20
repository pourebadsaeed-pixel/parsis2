/* ============================================================
   پارسیس — فرم‌ها: سیستم تب پیشرفته (ایزوله‌سازی کامل + Drag & Drop)
   مسیر: js/ui/form.js
   ============================================================ */
'use strict';

/* ============================================================
   بخش ۱ — پچ کردن document.getElementById برای پشتیبانی از کپی صفحات
   ============================================================ */
(function patchGetElementById() {
    if (window._getByIdPatched) return;
    window._getByIdPatched = true;
    var origGet = document.getElementById;
    document.getElementById = function(id) {
        var activePage = document.querySelector('.page.active');
        if (activePage && activePage.querySelector) {
            var el = activePage.querySelector('#' + id);
            if (el) return el;
        }
        return origGet.call(document, id);
    };
})();

/* ============================================================
   بخش ۲ — CSS سیستم تب‌ها
   ============================================================ */
(function injectFormTabsCss() {
    if (document.getElementById('form-tabs-style')) return;
    var s = document.createElement('style');
    s.id = 'form-tabs-style';
    s.textContent = ''
    + '.form-tabs-bar{display:flex;gap:4px;padding:6px 10px;background:var(--card-solid);'
    + 'border-bottom:1px solid var(--border);overflow-x:auto;overflow-y:hidden;'
    + 'position:sticky;z-index:49;scrollbar-width:thin;-webkit-overflow-scrolling:touch;'
    + 'box-shadow:0 2px 6px rgba(15,23,42,.04)}'
    + '.form-tabs-bar::-webkit-scrollbar{height:4px}'
    + '.form-tabs-bar::-webkit-scrollbar-thumb{background:var(--primary-light);border-radius:2px}'
    + '.form-tab{display:flex;align-items:center;gap:6px;padding:6px 10px;'
    + 'background:var(--card-alt);border:1px solid var(--border);border-radius:8px;'
    + 'font-family:inherit;font-size:.78rem;font-weight:700;color:var(--text-muted);'
    + 'cursor:pointer;white-space:nowrap;flex-shrink:0;transition:all .2s;'
    + 'user-select:none;max-width:220px}'
    + '.form-tab:hover{background:var(--primary-soft);border-color:var(--primary);'
    + 'color:var(--primary-dark);transform:translateY(-1px)}'
    + '.form-tab.active{background:var(--gradient-accent);color:#fff;'
    + 'border-color:transparent;box-shadow:0 2px 8px rgba(99,102,241,.25)}'
    + '.form-tab.dragging { opacity: 0.5; transform: scale(0.95); }'
    + '.form-tab .ft-icon{font-size:.9rem;line-height:1}'
    + '.form-tab .ft-title{overflow:hidden;text-overflow:ellipsis;max-width:130px}'
    + '.form-tab .ft-close{background:rgba(0,0,0,.08);color:inherit;border:none;'
    + 'width:18px;height:18px;border-radius:4px;font-size:.9rem;line-height:1;'
    + 'cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center;'
    + 'margin-right:-4px;transition:background .15s}'
    + '.form-tab.active .ft-close{background:rgba(255,255,255,.25)}'
    + '.form-tab .ft-close:hover{background:rgba(220,38,38,.85);color:#fff}'
    + '@media (max-width:480px){.form-tab .ft-title{max-width:80px}'
    + '.form-tab{padding:5px 8px;font-size:.72rem}}';
    document.head.appendChild(s);
})();

/* ============================================================
   بخش ۳ — State سیستم تب‌ها
   ============================================================ */
var TAB_STATE = {
    tabs: [{ id: 'home', page: 'home', domId: 'page-home', title: 'صفحه اصلی', icon: '🏠' }],
    active: 'home',
    max: 15
};

function getPageMeta(pageId) {
    if (typeof PAGE_TITLES_FA !== 'undefined' && PAGE_TITLES_FA[pageId]) {
        return PAGE_TITLES_FA[pageId];
    }
    var btn = document.querySelector('.nav-group-items button[data-page="' + pageId + '"]');
    if (!btn) return { title: pageId, icon: '📄' };
    var clone = btn.cloneNode(true);
    var badge = clone.querySelector('.nav-badge');
    if (badge) badge.remove();
    var txt = (clone.textContent || '').trim().replace(/\s+/g, ' ');
    if (!txt) return { title: pageId, icon: '📄' };
    var parts = txt.split(' ');
    var icon = parts[0];
    var title = parts.slice(1).join(' ') || txt;
    var cc = icon && icon.charCodeAt(0);
    if (!cc || cc < 0x2000) {
        icon = '📄';
        title = txt;
    }
    return { title: title, icon: icon };
}

/* ============================================================
   بخش ۴ — مدیریت Context (ذخیره و بازیابی متغیرهای سراسری)
   ============================================================ */
function getGlobalContext() {
    var ctx = {};
    try {
        if (typeof voucherLines !== 'undefined') ctx.voucherLines = JSON.parse(JSON.stringify(voucherLines));
        if (typeof currentVoucherStatus !== 'undefined') ctx.currentVoucherStatus = currentVoucherStatus;
        if (typeof templateLines !== 'undefined') ctx.templateLines = JSON.parse(JSON.stringify(templateLines));
        if (typeof estimateItems !== 'undefined') ctx.estimateItems = JSON.parse(JSON.stringify(estimateItems));
        if (typeof _AR !== 'undefined') ctx._AR = JSON.parse(JSON.stringify(_AR));
        if (typeof _arFilters !== 'undefined') ctx._arFilters = JSON.parse(JSON.stringify(_arFilters));
        if (typeof _arSort !== 'undefined') ctx._arSort = JSON.parse(JSON.stringify(_arSort));
        if (typeof window._vlistPg !== 'undefined') ctx._vlistPg = JSON.parse(JSON.stringify(window._vlistPg));
        if (typeof _rtSort !== 'undefined') ctx._rtSort = JSON.parse(JSON.stringify(_rtSort));
        if (typeof _rcSort !== 'undefined') ctx._rcSort = JSON.parse(JSON.stringify(_rcSort));
        if (typeof _cfdBuckets !== 'undefined') ctx._cfdBuckets = JSON.parse(JSON.stringify(_cfdBuckets));
        if (typeof _cfdAllDescs !== 'undefined') ctx._cfdAllDescs = JSON.parse(JSON.stringify(_cfdAllDescs));
        if (typeof _cfdSelectedDescs !== 'undefined') ctx._cfdSelectedDescs = JSON.parse(JSON.stringify(_cfdSelectedDescs));
        if (typeof _cfdSearchText !== 'undefined') ctx._cfdSearchText = _cfdSearchText;
        if (typeof _cfdSort !== 'undefined') ctx._cfdSort = JSON.parse(JSON.stringify(_cfdSort));
    } catch(e) { console.warn('Context save error', e); }
    return ctx;
}

function applyGlobalContext(ctx) {
    if (!ctx) return;
    try {
        if (ctx.voucherLines) voucherLines = ctx.voucherLines;
        if (ctx.currentVoucherStatus) currentVoucherStatus = ctx.currentVoucherStatus;
        if (ctx.templateLines) templateLines = ctx.templateLines;
        if (ctx.estimateItems) estimateItems = ctx.estimateItems;
        if (ctx._AR) _AR = ctx._AR;
        if (ctx._arFilters) _arFilters = ctx._arFilters;
        if (ctx._arSort) _arSort = ctx._arSort;
        if (ctx._vlistPg) window._vlistPg = ctx._vlistPg;
        if (ctx._rtSort) _rtSort = ctx._rtSort;
        if (ctx._rcSort) _rcSort = ctx._rcSort;
        if (ctx._cfdBuckets) _cfdBuckets = ctx._cfdBuckets;
        if (ctx._cfdAllDescs) _cfdAllDescs = ctx._cfdAllDescs;
        if (ctx._cfdSelectedDescs) _cfdSelectedDescs = ctx._cfdSelectedDescs;
        if (ctx._cfdSearchText) _cfdSearchText = ctx._cfdSearchText;
        if (ctx._cfdSort) _cfdSort = ctx._cfdSort;
    } catch(e) { console.warn('Context apply error', e); }
}

/* ============================================================
   بخش ۵ — توابع بررسی تغییرات ذخیره‌نشده
   ============================================================ */
function hasUnsavedData(pageId) {
    if (pageId === 'voucher-new') {
        if (window._voucherFormSavedAndClean) return false;
        try {
            var desc = document.getElementById('v-desc');
            if (desc && desc.value && desc.value.trim()) return true;
            if (typeof voucherLines !== 'undefined' && Array.isArray(voucherLines)) {
                var meaningful = voucherLines.filter(function (l) {
                    if (!l) return false;
                    if (l.account) return true;
                    if (Number(l.debit) > 0) return true;
                    if (Number(l.credit) > 0) return true;
                    if (l.description && String(l.description).trim()) return true;
                    return false;
                });
                return meaningful.length > 0;
            }
        } catch (e) {}
    }
    return false;
}

function clearFormData(pageId) {
    if (pageId === 'voucher-new') {
        try {
            if (typeof newVoucherForm === 'function') newVoucherForm();
        } catch (e) {}
    }
}

/* ============================================================
   بخش ۶ — نوار تب‌ها
   ============================================================ */
function ensureTabBar() {
    var bar = document.getElementById('form-tabs-bar');
    if (bar) return bar;

    var topbar = document.querySelector('.topbar');
    if (!topbar) return null;

    bar = document.createElement('div');
    bar.id = 'form-tabs-bar';
    bar.className = 'form-tabs-bar';
    bar.style.display = 'none';
    topbar.parentNode.insertBefore(bar, topbar.nextSibling);

    function setStickyTop() {
        try { bar.style.top = topbar.offsetHeight + 'px'; } catch (e) {}
    }
    setStickyTop();
    window.addEventListener('resize', setStickyTop);
    return bar;
}

function renderTabs() {
    var bar = ensureTabBar();
    if (!bar) return;

    if (TAB_STATE.tabs.length <= 1) {
        bar.style.display = 'none';
        return;
    }
    bar.style.display = '';
    bar.innerHTML = '';

    TAB_STATE.tabs.forEach(function (t) {
        var tab = document.createElement('div');
        tab.className = 'form-tab' + (t.id === TAB_STATE.active ? ' active' : '');
        tab.dataset.id = t.id;
        tab.dataset.page = t.page;
        tab.title = t.title;
        tab.draggable = true;

        var icon = document.createElement('span');
        icon.className = 'ft-icon';
        icon.textContent = t.icon || '📄';

        var title = document.createElement('span');
        title.className = 'ft-title';
        title.textContent = t.title || t.page;

        tab.appendChild(icon);
        tab.appendChild(title);

        if (t.id !== 'home') {
            var closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'ft-close';
            closeBtn.textContent = '×';
            closeBtn.title = 'بستن این تب';
            closeBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                closeTab(t.id);
            });
            tab.appendChild(closeBtn);
        }

        tab.addEventListener('click', function () {
            if (TAB_STATE.active === t.id) return;
            switchToTab(t.id);
        });

        tab.addEventListener('dblclick', function (e) {
            e.stopPropagation();
            if (t.id === 'home') return;
            var targetId = t.id;
            TAB_STATE.tabs = TAB_STATE.tabs.filter(function(x) {
                return x.id === 'home' || x.id === targetId;
            });
            switchToTab(targetId);
            renderTabs();
        });

        tab.addEventListener('dragstart', function (e) {
            e.dataTransfer.setData('text/plain', t.id);
            this.classList.add('dragging');
        });
        tab.addEventListener('dragend', function () {
            this.classList.remove('dragging');
        });
        tab.addEventListener('dragover', function (e) {
            e.preventDefault();
        });
        tab.addEventListener('drop', function (e) {
            e.preventDefault();
            var draggedId = e.dataTransfer.getData('text/plain');
            var targetId = t.id;
            if (draggedId === targetId) return;
            
            var draggedIdx = TAB_STATE.tabs.findIndex(function(x) { return x.id === draggedId; });
            var targetIdx = TAB_STATE.tabs.findIndex(function(x) { return x.id === targetId; });
            if (draggedIdx === -1 || targetIdx === -1) return;

            var dragged = TAB_STATE.tabs.splice(draggedIdx, 1)[0];
            TAB_STATE.tabs.splice(targetIdx, 0, dragged);
            renderTabs();
        });

        bar.appendChild(tab);
    });

    setTimeout(function () {
        var activeEl = bar.querySelector('.form-tab.active');
        if (activeEl && activeEl.scrollIntoView) {
            try { activeEl.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {}
        }
    }, 30);
}

/* ============================================================
   بخش ۷ — جابه‌جایی بین تب‌ها
   ============================================================ */
function switchToTab(tabId) {
    var tab = TAB_STATE.tabs.find(function(t) { return t.id === tabId; });
    if (!tab) return;

    // ذخیره وضعیت تب فعلی
    var currentTab = TAB_STATE.tabs.find(function(t) { return t.id === TAB_STATE.active; });
    if (currentTab && currentTab.id !== 'home') {
        currentTab.context = getGlobalContext();
    }

    // مخفی کردن همه صفحات
    document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });

    // بازیابی وضعیت تب جدید
    applyGlobalContext(tab.context);

    // نمایش صفحه مربوطه
    var targetPage = document.getElementById(tab.domId);
    if (targetPage) {
        targetPage.classList.add('active');
    } else {
        var origPage = document.getElementById('page-' + tab.page);
        if (origPage) origPage.classList.add('active');
    }

    TAB_STATE.active = tabId;
    renderTabs();

    if (tab.page !== 'home') {
        if (typeof runPageRenderer === 'function') runPageRenderer(tab.page);
        if (typeof applyPageHelpers === 'function') applyPageHelpers();
    }
}

/* ============================================================
   بخش ۸ — بستن تب‌ها
   ============================================================ */
function closeTab(tabId) {
    if (tabId === 'home') return;

    var idx = TAB_STATE.tabs.findIndex(function(t) { return t.id === tabId; });
    if (idx === -1) return;
    var tab = TAB_STATE.tabs[idx];

    if (hasUnsavedData(tab.page)) {
        if (!confirm('این فرم داده‌های ذخیره‌نشده دارد.\n\nOK = بستن و از دست دادن داده‌ها\nCancel = انصراف')) return;
        clearFormData(tab.page);
    }

    var wasActive = TAB_STATE.active === tabId;
    TAB_STATE.tabs.splice(idx, 1);

    var remNode = document.getElementById(tab.domId);
    if (remNode && !remNode.classList.contains('page-template') && remNode.id !== 'page-' + tab.page) {
        remNode.remove();
    }

    if (wasActive) {
        var prevIdx = Math.min(idx - 1, TAB_STATE.tabs.length - 1);
        if (prevIdx < 0) prevIdx = 0;
        var prev = TAB_STATE.tabs[prevIdx];
        if (prev) {
            switchToTab(prev.id);
            return;
        }
    }
    renderTabs();
}

function closeAllTabs() {
    var nonHome = TAB_STATE.tabs.filter(function (t) { return t.id !== 'home'; });
    if (nonHome.length === 0) {
        showToast('فرم بازی وجود ندارد');
        return;
    }

    var anyDirty = false;
    nonHome.forEach(function (t) { if (hasUnsavedData(t.page)) anyDirty = true; });
    if (anyDirty) {
        if (!confirm('بعضی فرم‌ها داده‌های ذخیره‌نشده دارند.\n\nOK = بستن همه\nCancel = انصراف')) return;
    }
    
    nonHome.forEach(function (t) { 
        clearFormData(t.page);
        var remNode = document.getElementById(t.domId);
        if (remNode && !remNode.classList.contains('page-template') && remNode.id !== 'page-' + t.page) {
            remNode.remove();
        }
    });

    TAB_STATE.tabs = [{ id: 'home', page: 'home', domId: 'page-home', title: 'صفحه اصلی', icon: '🏠' }];
    TAB_STATE.active = 'home';
    switchToTab('home');
    showToast('🧹 همه فرم‌ها بسته شد');
}

/* ============================================================
   بخش ۹ — دکمه بستن همه فرم‌ها در سایدبار
   ============================================================ */
function injectCloseAllButton() {
    if (document.getElementById('close-all-forms-btn')) return true;
    var searchBox = document.querySelector('.sidebar-search');
    if (!searchBox) return false;

    var wrap = document.createElement('div');
    wrap.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border)';

    var btn = document.createElement('button');
    btn.id = 'close-all-forms-btn';
    btn.type = 'button';
    btn.innerHTML = '🧹 بستن همه فرم‌ها';
    btn.title = 'بستن همه تب‌های فرم بدون رفرش';
    btn.style.cssText = [
        'width:100%','padding:10px 14px','background:linear-gradient(135deg,#fee2e2,#fecaca)',
        'color:#991b1b','border:1px solid #fca5a5','border-radius:10px',
        'font-family:inherit','font-size:.82rem','font-weight:800','cursor:pointer'
    ].join(';');

    btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeAllTabs();
    });

    wrap.appendChild(btn);
    searchBox.parentNode.insertBefore(wrap, searchBox.nextSibling);
    return true;
}

/* ============================================================
   بخش ۱۰ — پچ goToPage برای ساخت کپی‌های مستقل
   ============================================================ */
function installGoToPageOverride() {
    if (typeof window.goToPage !== 'function') return false;
    if (window._origGoToPage) return true;

    var orig = window.goToPage;
    window._origGoToPage = orig;

    window.goToPage = function (name, forceNew) {
        if (!name) return;

        if (name === 'home') {
            var homeTab = TAB_STATE.tabs.find(function(t) { return t.page === 'home'; });
            if (homeTab) switchToTab(homeTab.id);
            return;
        }

        var existingTab = TAB_STATE.tabs.find(function(t) { return t.page === name; });

        if (!forceNew && existingTab) {
            switchToTab(existingTab.id);
            return;
        }

        // محدودیت تعداد تب‌ها
        while (TAB_STATE.tabs.length >= TAB_STATE.max) {
            var toRemoveIdx = -1;
            for (var i = 1; i < TAB_STATE.tabs.length; i++) {
                if (TAB_STATE.tabs[i].id !== TAB_STATE.active) {
                    toRemoveIdx = i;
                    break;
                }
            }
            if (toRemoveIdx === -1) break;
            var removedTab = TAB_STATE.tabs.splice(toRemoveIdx, 1)[0];
            var remNode = document.getElementById(removedTab.domId);
            if (remNode && !remNode.classList.contains('page-template')) remNode.remove();
        }

        var origPage = document.getElementById('page-' + name);
        if (!origPage) return;

        // علامت‌گذاری به عنوان الگو
        if (!origPage.classList.contains('page-template')) {
            origPage.classList.add('page-template');
            origPage.classList.remove('active');
        }

        var uniqueId = 'page-' + name + '-' + Date.now();
        var clone = origPage.cloneNode(true);
        clone.id = uniqueId;
        clone.classList.remove('active');
        clone.classList.remove('page-template');
        
        origPage.parentNode.appendChild(clone);

        var meta = getPageMeta(name);
        var newTabId = 'tab_' + Date.now();
        
        // اگر فرم سند جدید است، وضعیت را ریست کن
        if (name === 'voucher-new') {
            voucherLines = [{ id: uid(), account: '', details: {}, debit: 0, credit: 0, description: '' }];
            currentVoucherStatus = 'draft';
        }

        TAB_STATE.tabs.push({
            id: newTabId,
            page: name,
            domId: uniqueId,
            title: meta.title,
            icon: meta.icon,
            context: null
        });

        if (typeof trackFormUsage === 'function') trackFormUsage(name);
        switchToTab(newTabId);
    };
    return true;
}

/* ============================================================
   بخش ۱۱ — autoAttachReportHelpers
   ============================================================ */
function autoAttachReportHelpers() {
    setTimeout(function () {
        if (typeof makeAllTablesResizable === 'function') makeAllTablesResizable();

        var ids = ['cf-table', 'cfd-table', 'rt-table', 'ri-table', 'rf-table',
                   'rff-table', 'rr-table', 'dc-table', 'turnover-table', 'rc-table'];
        ids.forEach(function (id) {
            var t = document.getElementById(id);
            if (!t) return;
            if (typeof applyColVisibility === 'function') applyColVisibility(id);
            if (typeof columnOrders !== 'undefined' && columnOrders[id] && typeof applyColumnOrder === 'function') {
                applyColumnOrder(id);
            }
        });

        if (typeof buildHeaderButtons === 'function') buildHeaderButtons();
        if (typeof attachDatePickers === 'function') attachDatePickers();
        if (typeof attachFilterRowsToAllTables === 'function') attachFilterRowsToAllTables();
        if (typeof window._enhanceGlobalSorting === 'function') window._enhanceGlobalSorting();
        if (typeof buildShareButtons === 'function') buildShareButtons();
    }, 60);
}

/* ============================================================
   بخش ۱۲ — راه‌اندازی
   ============================================================ */
function initFormTabs() {
    var tries = 0;
    var interval = setInterval(function () {
        tries++;
        var ok1 = installGoToPageOverride();
        var ok2 = injectCloseAllButton();
        var ok3 = !!ensureTabBar();
        if ((ok1 && ok2 && ok3) || tries > 20) {
            clearInterval(interval);
            renderTabs();
        }
    }, 300);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(initFormTabs, 500); });
} else {
    setTimeout(initFormTabs, 500);
}

window.TAB_STATE             = TAB_STATE;
window.getPageMeta           = getPageMeta;
window.hasUnsavedData        = hasUnsavedData;
window.clearFormData         = clearFormData;
window.renderTabs            = renderTabs;
window.switchToTab           = switchToTab;
window.closeTab              = closeTab;
window.closeAllTabs          = closeAllTabs;
window.autoAttachReportHelpers = autoAttachReportHelpers;

console.log('✅ [ui/form.js] loaded — Advanced Tabs (Isolated Contexts)');
