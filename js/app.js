/* ============================================================
   پارسیس — راه‌اندازی (نسخه پایدار)
   ============================================================ */
'use strict';

function bindBaseDataForms() {
    try { if (typeof bindFiscalForm === 'function') bindFiscalForm(); } catch(e){ console.warn(e); }
    try { if (typeof bindPersonsForm === 'function') bindPersonsForm(); } catch(e){ console.warn(e); }
    try { if (typeof bindCompaniesForm === 'function') bindCompaniesForm(); } catch(e){ console.warn(e); }
    try { if (typeof bindBanksForm === 'function') bindBanksForm(); } catch(e){ console.warn(e); }
    try { if (typeof bindCashBoxesForm === 'function') bindCashBoxesForm(); } catch(e){ console.warn(e); }
    try { if (typeof bindProjectsForm === 'function') bindProjectsForm(); } catch(e){ console.warn(e); }
    try { if (typeof bindChartForm === 'function') bindChartForm(); } catch(e){ console.warn(e); }
    try { if (typeof bindSettingsButtons === 'function') bindSettingsButtons(); } catch(e){ console.warn(e); }
    try { if (typeof bindCurrencyHide === 'function') bindCurrencyHide(); } catch(e){ console.warn(e); }
    try { if (typeof bindBankCashTypes === 'function') bindBankCashTypes(); } catch(e){ console.warn(e); }
    try { if (typeof bindSmsButtons === 'function') bindSmsButtons(); } catch(e){ console.warn(e); }
    try { if (typeof bindEstimatesForm === 'function') bindEstimatesForm(); } catch(e){ console.warn(e); }
    try { if (typeof bindSourcesForm === 'function') bindSourcesForm(); } catch(e){ console.warn(e); }
    try { if (typeof bindFacilitiesForm === 'function') bindFacilitiesForm(); } catch(e){ console.warn(e); }
    try { if (typeof bindVoucherForm === 'function') bindVoucherForm(); } catch(e){ console.warn(e); }
    try { if (typeof bindVoucherListFilters === 'function') bindVoucherListFilters(); } catch(e){ console.warn(e); }
    try { if (typeof bindTemplatesForm === 'function') bindTemplatesForm(); } catch(e){ console.warn(e); }
    try { if (typeof bindNotesForm === 'function') bindNotesForm(); } catch(e){ console.warn(e); }
    try { if (typeof bindThemeFontButtons === 'function') bindThemeFontButtons(); } catch(e){ console.warn(e); }
}

function bindFilterInputs() {
    var filterMap = {
        'fiscal-filter': 'renderFiscalList', 'persons-filter': 'renderPersonsList',
        'comp-filter': 'renderCompaniesList', 'ba-filter': 'renderBankAccountsList',
        'cb-filter': 'renderCashBoxesList', 'proj-filter': 'renderProjectsList',
        'fac-filter': 'renderFacilitiesList', 'cfs-filter': 'renderCfsList',
        'est-filter': 'renderEstimateList', 'users-filter': 'renderUsersList',
        'vlist-search': 'renderVoucherList'
    };
    Object.keys(filterMap).forEach(function (id) {
        var el = document.getElementById(id);
        if (!el || el.dataset.bound) return;
        el.dataset.bound = '1';
        var fn = filterMap[id];
        el.addEventListener('input', function () {
            if (typeof window[fn] === 'function') window[fn]();
        });
    });
}

function bindExportButtons() {
    var eB = document.querySelectorAll('.export-btn[data-export]');
    for (var e = 0; e < eB.length; e++) {
        if (eB[e].dataset.bound) continue;
        eB[e].dataset.bound = '1';
        eB[e].addEventListener('click', function () {
            if (typeof exportToCsv === 'function') exportToCsv(this.getAttribute('data-export'), this.getAttribute('data-export'));
        });
    }
}

function startApp() {
    if (window._parsisAppStarted) return;
    window._parsisAppStarted = true;
    console.log('🚀 Starting app...');

    if (typeof applyTheme === 'function') applyTheme(state.theme);
    if (typeof applyFont === 'function') applyFont(state.font);
    
    try { if (typeof setupTabs === 'function') setupTabs(); } catch(e){}
    try { if (typeof setupSorting === 'function') setupSorting(); } catch(e){}
    try { if (typeof initCalendarListeners === 'function') initCalendarListeners(); } catch(e){}
    try { if (typeof initCalculator === 'function') initCalculator(); } catch(e){}
    try { if (typeof initSidebarSearch === 'function') initSidebarSearch(); } catch(e){}
    try { if (typeof initHomeSwipe === 'function') initHomeSwipe(); } catch(e){}

    // بایند تمام فرم‌ها
    bindBaseDataForms();
    bindFilterInputs();
    bindExportButtons();

    // رندر کردن محتویات اولیه
    try { if (typeof updateDateDisplay === 'function') updateDateDisplay(); } catch(e){}
    try { if (typeof updateTopbarPeriod === 'function') updateTopbarPeriod(); } catch(e){}
    try { if (typeof updateHomeWidgets === 'function') updateHomeWidgets(); } catch(e){ console.error('Widget error:', e); }
    try { if (typeof renderVoucherList === 'function') renderVoucherList(); } catch(e){ console.error('Voucher List error:', e); }
    try { if (typeof renderFrequentNav === 'function') renderFrequentNav(); } catch(e){}
    
    try { if (typeof attachDatePickers === 'function') attachDatePickers(); } catch(e){}
    try { if (typeof buildHeaderButtons === 'function') buildHeaderButtons(); } catch(e){}
    try { if (typeof makeAllTablesResizable === 'function') makeAllTablesResizable(); } catch(e){}
    
    if (typeof newVoucherForm === 'function') {
        var vIdEl = document.getElementById('v-id');
        if (vIdEl && !vIdEl.value) newVoucherForm();
    }

    try { if (typeof aiInit === 'function') aiInit(); } catch(e){}
    
    setTimeout(function () { if (typeof fetchLiveRates === 'function') fetchLiveRates(true); }, 1500);
}

function init() {
    if (typeof bindAuthUI === 'function') bindAuthUI();
    
    var isLogged = false;
    if (typeof checkAuth === 'function') isLogged = checkAuth();

    var overlay = document.getElementById('login-overlay');
    var app = document.getElementById('app');

    if (isLogged) {
        if (overlay) overlay.style.display = 'none';
        if (app) app.style.display = 'block';
        startApp(); 
    } else {
        if (overlay) overlay.style.display = 'flex';
        if (app) app.style.display = 'none';
    }
}

window.startApp = startApp;
window.bindFilterInputs = bindFilterInputs;
window.bindExportButtons = bindExportButtons;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
