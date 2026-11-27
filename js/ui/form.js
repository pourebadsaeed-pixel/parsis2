/* ============================================================
   پارسیس — سیستم تب‌های پیشرفته (نسخه با دابل‌کلیک بستن بقیه)
   مسیر: js/ui/form.js
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

var TAB_STATE = {
    tabs: [{ id: 'home', page: 'home', domId: 'page-home', title: 'صفحه اصلی', icon: '🏠' }],
    active: 'home',
    max: 15
};

var PAGE_BINDERS = {
    'persons':          'bindPersonsForm',
    'companies':        'bindCompaniesForm',
    'bank-accounts':    'bindBanksForm',
    'cash-boxes':       'bindCashBoxesForm',
    'projects':         'bindProjectsForm',
    'fiscal':           'bindFiscalForm',
    'chart-define':     'bindChartForm',
    'bank-types':       'bindBankCashTypes',
    'cash-types':       'bindBankCashTypes',
    'currency':         'bindCurrencyHide',
    'language':         'bindCurrencyHide',
    'estimate-daily':   'bindEstimatesForm',
    'cashflow-sources': 'bindSourcesForm',
    'facilities':       'bindFacilitiesForm',
    'voucher-new':      'bindVoucherForm',
    'voucher-list':     'bindVoucherListFilters',
    'templates':        'bindTemplatesForm',
    'notes':            'bindNotesForm',
    'users':            'bindUsersForm',
    'sms':              'bindSmsButtons',
    /* ✅ v2.4.0 — بخش امنیت + ماژول‌های جدید */
    'sec-groups':       'bindSecGroupsForm',
    'treasury':         'bindTreasuryForm',
    'assets':           'bindAssetsForm',
    'inventory-items':  'bindInvItemsForm',
    'inventory-moves':  'bindInvMovesForm',
    'sales':            'bindSalesForm'
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

function getGlobalContext() {
    var ctx = {};
    try {
        if (typeof voucherLines !== 'undefined') ctx.voucherLines = JSON.parse(JSON.stringify(voucherLines));
        if (typeof currentVoucherStatus !== 'undefined') ctx.currentVoucherStatus = currentVoucherStatus;
        if (typeof templateLines !== 'undefined') ctx.templateLines = JSON.parse(JSON.stringify(templateLines));
        if (typeof estimateItems !== 'undefined') ctx.estimateItems = JSON.parse(JSON.stringify(estimateItems));
        if (typeof _AR !== 'undefined') ctx._AR = JSON.parse(JSON.stringify(_AR));
        if (typeof window._vlistPg !== 'undefined') ctx._vlistPg = JSON.parse(JSON.stringify(window._vlistPg));
        if (typeof _rtSort !== 'undefined') ctx._rtSort = JSON.parse(JSON.stringify(_rtSort));
        if (typeof _rcSort !== 'undefined') ctx._rcSort = JSON.parse(JSON.stringify(_rcSort));
    } catch(e) {}
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
        if (ctx._vlistPg) window._vlistPg = ctx._vlistPg;
        if (ctx._rtSort) _rtSort = ctx._rtSort;
        if (ctx._rcSort) _rcSort = ctx._rcSort;
    } catch(e) {}
}

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
        try { if (typeof newVoucherForm === 'function') newVoucherForm(); } catch (e) {}
    }
}

function ensureTabBar() {
    var bar = document.getElementById('form-tabs-bar');
    if (bar) return bar;
    var topbar = document.querySelector('.topbar');
    if (!topbar) return null;
    bar = document.createElement('div');
    bar.id = 'form-tabs-bar'; bar.className = 'form-tabs-bar'; bar.style.display = 'none';
    topbar.parentNode.insertBefore(bar, topbar.nextSibling);
    function setStickyTop() { try { bar.style.top = topbar.offsetHeight + 'px'; } catch (e) {} }
    setStickyTop();
    window.addEventListener('resize', setStickyTop);
    return bar;
}

/* ============================================================
   ✅ renderTabs — با دابل‌کلیک بستن بقیه تب‌ها
   ============================================================ */
function renderTabs() {
    var bar = ensureTabBar();
    if (!bar) return;
    if (TAB_STATE.tabs.length <= 1) { bar.style.display = 'none'; return; }
    bar.style.display = ''; bar.innerHTML = '';
    TAB_STATE.tabs.forEach(function (t) {
        var tab = document.createElement('div');
        tab.className = 'form-tab' + (t.id === TAB_STATE.active ? ' active' : '');
        tab.dataset.id = t.id; tab.dataset.page = t.page; tab.title = t.title; tab.draggable = true;
        var icon = document.createElement('span'); icon.className = 'ft-icon'; icon.textContent = t.icon || '📄';
        var title = document.createElement('span'); title.className = 'ft-title'; title.textContent = t.title || t.page;
        tab.appendChild(icon); tab.appendChild(title);

        if (t.id !== 'home') {
            var closeBtn = document.createElement('button');
            closeBtn.type = 'button'; closeBtn.className = 'ft-close'; closeBtn.textContent = '×'; closeBtn.title = 'بستن این تب';
            closeBtn.addEventListener('click', function (e) { e.stopPropagation(); closeTab(t.id); });
            tab.appendChild(closeBtn);
        }

        tab.addEventListener('click', function () { if (TAB_STATE.active !== t.id) switchToTab(t.id); });

        /* ✅ دابل‌کلیک: بستن بقیه تب‌ها */
        tab.addEventListener('dblclick', function (e) {
            e.preventDefault();
            e.stopPropagation();
            closeOtherTabs(t.id);
        });

        tab.addEventListener('dragover', function (e) { e.preventDefault(); });
        tab.addEventListener('drop', function (e) {
            e.preventDefault();
            var draggedId = e.dataTransfer.getData('text/plain'); var targetId = t.id;
            if (draggedId === targetId) return;
            var draggedIdx = TAB_STATE.tabs.findIndex(function(x) { return x.id === draggedId; });
            var targetIdx = TAB_STATE.tabs.findIndex(function(x) { return x.id === targetId; });
            if (draggedIdx === -1 || targetIdx === -1) return;
            var dragged = TAB_STATE.tabs.splice(draggedIdx, 1)[0];
            TAB_STATE.tabs.splice(targetIdx, 0, dragged); renderTabs();
        });
        tab.addEventListener('dragstart', function (e) { e.dataTransfer.setData('text/plain', t.id); this.classList.add('dragging'); });
        tab.addEventListener('dragend', function () { this.classList.remove('dragging'); });

        bar.appendChild(tab);
    });
    setTimeout(function () {
        var activeEl = bar.querySelector('.form-tab.active');
        if (activeEl && activeEl.scrollIntoView) { try { activeEl.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {} }
    }, 30);
}

/* ============================================================
   ✅ closeOtherTabs — بستن همه تب‌های دیگر به جز انتخاب‌شده
   ============================================================ */
function closeOtherTabs(keepTabId) {
    var keepTab = TAB_STATE.tabs.find(function (t) { return t.id === keepTabId; });
    if (!keepTab) return;

    var others = TAB_STATE.tabs.filter(function (t) { return t.id !== keepTabId && t.id !== 'home'; });
    if (others.length === 0) {
        if (typeof showToast === 'function') showToast('تب دیگری برای بستن نیست.');
        return;
    }

    var hasUnsaved = others.some(function (t) { return hasUnsavedData(t.page); });
    var msg = 'همه تب‌های دیگر بسته شوند؟' + (hasUnsaved ? '\n(بعضی تب‌ها داده ذخیره‌نشده دارند)' : '');
    if (!confirm(msg)) return;

    others.forEach(function (t) {
        clearFormData(t.page);
        var remNode = document.getElementById(t.domId);
        if (remNode && !remNode.classList.contains('page-template')) remNode.remove();
    });

    TAB_STATE.tabs = TAB_STATE.tabs.filter(function (t) {
        return t.id === keepTabId || t.id === 'home';
    });

    /* اگر تب فعال جزو بسته‌شده‌ها بود، به تب نگه‌داشته برو */
    if (!TAB_STATE.tabs.some(function (t) { return t.id === TAB_STATE.active; })) {
        switchToTab(keepTabId);
    } else {
        renderTabs();
    }

    if (typeof showToast === 'function') showToast('🧹 ' + toFa(others.length) + ' تب بسته شد');
}

function cleanClonedPage(clone) {
    ['data-bound', 'data-bound-collapse', 'data-picker', 'data-picker-bound', 'data-resizable', 'data-sort-attached', 'data-collapsible', 'data-money', 'data-cs-bound'].forEach(function(attr) {
        var els = clone.querySelectorAll('[' + attr + ']');
        for (var i = 0; i < els.length; i++) els[i].removeAttribute(attr);
    });
    clone.removeAttribute('data-rebound'); clone.removeAttribute('data-filter-collapse-init');
    var toRemove = clone.querySelectorAll('.col-resizer, .col-filter-btn, tr.column-filter-row, .share-btn, .widget-share-btn, .eye-toggle-btn, .col-toggle-btn, .col-reset-btn');
    for (var r = 0; r < toRemove.length; r++) toRemove[r].remove();
    return clone;
}

function switchToTab(tabId) {
    var tab = TAB_STATE.tabs.find(function(t) { return t.id === tabId; });
    if (!tab) return;

    var currentTab = TAB_STATE.tabs.find(function(t) { return t.id === TAB_STATE.active; });
    if (currentTab && currentTab.id !== 'home') currentTab.context = getGlobalContext();

    document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
    applyGlobalContext(tab.context);

    var targetPage = document.getElementById(tab.domId);
    if (targetPage) targetPage.classList.add('active');
    else {
        var origPage = document.getElementById('page-' + tab.page);
        if (origPage) origPage.classList.add('active');
    }

    TAB_STATE.active = tabId;
    renderTabs();

    if (tab.page !== 'home') {
        setTimeout(function() {
            try {
                if (typeof runPageRenderer === 'function') runPageRenderer(tab.page);
                if (typeof applyPageHelpers === 'function') applyPageHelpers();
                
                var fnName = PAGE_BINDERS[tab.page];
                if (fnName && typeof window[fnName] === 'function') window[fnName]();
                if (typeof bindFilterInputs === 'function') bindFilterInputs();
                if (typeof bindExportButtons === 'function') bindExportButtons();
            } catch(e) { console.warn('[switchToTab bind]', e); }
        }, 50);
    }
}

function closeTab(tabId) {
    if (tabId === 'home') return;
    var idx = TAB_STATE.tabs.findIndex(function(t) { return t.id === tabId; });
    if (idx === -1) return;
    var tab = TAB_STATE.tabs[idx];
    if (hasUnsavedData(tab.page)) { if (!confirm('این فرم داده ذخیره‌نشده دارد. بسته شود؟')) return; clearFormData(tab.page); }
    var wasActive = TAB_STATE.active === tabId;
    TAB_STATE.tabs.splice(idx, 1);
    var remNode = document.getElementById(tab.domId);
    if (remNode && !remNode.classList.contains('page-template') && remNode.id !== 'page-' + tab.page) remNode.remove();
    if (wasActive) {
        var prevIdx = Math.max(0, idx - 1);
        var prev = TAB_STATE.tabs[prevIdx];
        if (prev) { switchToTab(prev.id); return; }
    }
    renderTabs();
}

function closeAllTabs() {
    var nonHome = TAB_STATE.tabs.filter(function (t) { return t.id !== 'home'; });
    if (nonHome.length === 0) { if (typeof showToast === 'function') showToast('فرم بازی وجود ندارد'); return; }
    if (nonHome.some(function(t) { return hasUnsavedData(t.page); })) { if (!confirm('بعضی فرم‌ها ذخیره نشده‌اند. بسته شوند؟')) return; }
    nonHome.forEach(function (t) {
        clearFormData(t.page);
        var remNode = document.getElementById(t.domId);
        if (remNode && !remNode.classList.contains('page-template')) remNode.remove();
    });
    TAB_STATE.tabs = [{ id: 'home', page: 'home', domId: 'page-home', title: 'صفحه اصلی', icon: '🏠' }];
    TAB_STATE.active = 'home';
    switchToTab('home');
    if (typeof showToast === 'function') showToast('🧹 همه فرم‌ها بسته شد');
}

/* ✅ v2.7.2 — دکمه «🧹 بستن همه فرم‌ها» بالای منو حذف شد (درخواست کاربر: بلااستفاده بود).
   closeAllTabs برای استفاده‌های دیگر (مثل منوی تب‌ها) حفظ شده است. */
function injectCloseAllButton() {
    /* غیرفعال — دیگر دکمه‌ای تزریق نمی‌شود */
    return true;
}

/* ============================================================
   ✅ v2.7.2 — باکس‌های «الگو» و «شماره و تاریخ» فرم صدور سند:
   چیورن جمع‌شدن (^) — کلیک روی عنوان یا دکمه، بدنهٔ کارت را
   جمع/باز می‌کند؛ وضعیت ذخیره می‌شود (voucherCardCollapsed)
   ============================================================ */
(function injectVoucherCardCollapse() {
    if (document.getElementById('vcard-272-style')) return _bindVoucherCards272();
    var s = document.createElement('style');
    s.id = 'vcard-272-style';
    s.textContent = ''
    + '.vcard-head { display:flex; align-items:center; justify-content:space-between; gap:8px; '
      + 'padding:2px 2px 10px; margin-bottom:10px; border-bottom:1px dashed var(--border); cursor:pointer; user-select:none; }'
    + '.vcard-head-title { font-weight:900; color:var(--primary-dark); font-size:0.92rem; }'
    + '.vcard-toggle { width:34px; height:34px; border-radius:9px; border:1px solid var(--border); '
      + 'background:#f1f5f9; color:var(--primary-dark); font-size:1rem; line-height:1; cursor:pointer; '
      + 'font-family:inherit; display:flex; align-items:center; justify-content:center; transition:all .18s; flex-shrink:0; }'
    + '.vcard-toggle:hover { background:var(--primary-light,#dbeafe); transform:scale(1.06); }'
    + '.card.vcard-collapsed .vcard-toggle { transform:rotate(180deg); }'
    + '.card.vcard-collapsed .vcard-body { display:none !important; }'
    + '.card.vcard-collapsed .vcard-head { border-bottom:none; margin-bottom:0; padding-bottom:2px; }'
    + '.card.vcard-collapsed { padding-bottom:12px; }';
    document.head.appendChild(s);
    return _bindVoucherCards272();
})();

function _bindVoucherCards272() {
    var KEY = 'voucherCardCollapsed';
    var IDS = ['voucher-template-card', 'voucher-head-card'];

    function loadState() {
        var v = DB.load(KEY, {});
        return (v && typeof v === 'object') ? v : {};
    }

    function applyState() {
        var st = loadState();
        IDS.forEach(function (id) {
            /* querySelectorAll — چون تب‌های جدید، کلون صفحه می‌سازند و id تکراری
               به وجود می‌آید، وضعیت روی همهٔ نسخه‌ها اعمال می‌شود */
            Array.prototype.slice.call(document.querySelectorAll('[id="' + id + '"]')).forEach(function (card) {
                card.classList.toggle('vcard-collapsed', !!st[id]);
            });
        });
    }

    document.addEventListener('click', function (e) {
        var tgl = e.target.closest ? (e.target.closest('.vcard-toggle') || e.target.closest('.vcard-head')) : null;
        if (!tgl) return;
        var card = tgl.closest('.card');
        if (!card) return;
        var keyId = null, k;
        for (k = 0; k < IDS.length; k++) {
            if ((card.id || '').indexOf(IDS[k]) === 0) { keyId = IDS[k]; break; }
        }
        if (!keyId) return;
        e.preventDefault();
        e.stopPropagation();
        var willCollapse = !card.classList.contains('vcard-collapsed');
        card.classList.toggle('vcard-collapsed', willCollapse);
        var st = loadState();
        st[keyId] = willCollapse;
        DB.save(KEY, st);
    });

    setTimeout(applyState, 300);
    return true;
}

function installGoToPageOverride() {
    if (typeof window.goToPage !== 'function' || window._origGoToPage) return false;
    var orig = window.goToPage; window._origGoToPage = orig;
    window.goToPage = function (name, forceNew) {
        if (!name) return;
        if (name === 'home') { var ht = TAB_STATE.tabs.find(function(t) { return t.page === 'home'; }); if (ht) switchToTab(ht.id); return; }
        var existingTab = TAB_STATE.tabs.find(function(t) { return t.page === name; });
        if (!forceNew && existingTab) { switchToTab(existingTab.id); return; }
        
        var origPage = document.getElementById('page-' + name);
        if (!origPage) return;
        if (!origPage.classList.contains('page-template')) { origPage.classList.add('page-template'); origPage.classList.remove('active'); }

        var uniqueId = 'page-' + name + '-' + Date.now();
        var clone = origPage.cloneNode(true);
        clone.id = uniqueId; clone.classList.remove('active', 'page-template');
        cleanClonedPage(clone);
        clone.querySelectorAll('#ra-result, #rt-result, #rc-result, #cf-result, #cfd-result, #ri-result, #rf-result, #rff-result, #dash-grid-container').forEach(function(b) { b.innerHTML = ''; });
        origPage.parentNode.appendChild(clone);

        var meta = getPageMeta(name); var newTabId = 'tab_' + Date.now();
        if (name === 'voucher-new') { voucherLines = [{ id: uid(), account: '', details: {}, debit: 0, credit: 0, description: '' }]; currentVoucherStatus = 'draft'; }
        TAB_STATE.tabs.push({ id: newTabId, page: name, domId: uniqueId, title: meta.title, icon: meta.icon, context: null });
        if (typeof trackFormUsage === 'function') trackFormUsage(name);
        switchToTab(newTabId);
    };
    return true;
}

function autoAttachReportHelpers() {
    setTimeout(function () {
        if (typeof makeAllTablesResizable === 'function') makeAllTablesResizable();
        ['cf-table', 'cfd-table', 'rt-table', 'ri-table', 'rf-table', 'rff-table', 'rr-table', 'dc-table', 'turnover-table', 'rc-table'].forEach(function (id) {
            var t = document.getElementById(id); if (!t) return;
            if (typeof applyColVisibility === 'function') applyColVisibility(id);
            if (typeof columnOrders !== 'undefined' && columnOrders[id] && typeof applyColumnOrder === 'function') applyColumnOrder(id);
        });
        if (typeof buildHeaderButtons === 'function') buildHeaderButtons();
        if (typeof attachDatePickers === 'function') attachDatePickers();
        if (typeof attachFilterRowsToAllTables === 'function') attachFilterRowsToAllTables();
        if (typeof buildShareButtons === 'function') buildShareButtons();
    }, 60);
}

function initFormTabs() {
    var tries = 0;
    var interval = setInterval(function () {
        tries++;
        var ok1 = installGoToPageOverride();
        /* ✅ v2.7.2 — دکمه «بستن همه فرم‌ها» حذف شد (درخواست کاربر) */
        var ok2 = true;
        var ok3 = !!ensureTabBar();
        if ((ok1 && ok2 && ok3) || tries > 20) { clearInterval(interval); renderTabs(); }
    }, 300);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(initFormTabs, 500); });
else setTimeout(initFormTabs, 500);

window.TAB_STATE = TAB_STATE;
window.cleanClonedPage = cleanClonedPage;
window.switchToTab = switchToTab;
window.closeTab = closeTab;
window.closeOtherTabs = closeOtherTabs;
window.closeAllTabs = closeAllTabs;
window.autoAttachReportHelpers = autoAttachReportHelpers;
