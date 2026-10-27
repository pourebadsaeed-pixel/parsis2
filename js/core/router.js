/* ============================================================
   پارسیس — ناوبری بین صفحات
   مسیر: js/core/router.js
   
   ✅ v3: افزودن case 'users' برای راه‌اندازی صفحه کاربران
   ============================================================ */
'use strict';

function goToPage(name) {
    if (!name) return;

    var pages = document.querySelectorAll('.page');
    for (var i = 0; i < pages.length; i++) pages[i].classList.remove('active');
    var target = document.getElementById('page-' + name);
    if (target) target.classList.add('active');

    var btns = document.querySelectorAll('.nav-group-items button');
    for (var j = 0; j < btns.length; j++) {
        btns[j].classList.toggle('active',
            btns[j].getAttribute('data-page') === name);
    }

    if (typeof closeSidebar === 'function') closeSidebar();
    if (typeof trackFormUsage === 'function') trackFormUsage(name);

    runPageRenderer(name);
    applyPageHelpers();
}

function runPageRenderer(name) {
    var dispatch = {
        'chart-define':         function () { if (typeof renderChartTree === 'function') renderChartTree('chart-tree', true); },
        'fiscal':               function () { if (typeof renderFiscalList === 'function') renderFiscalList(); },
        'persons':              function () { if (typeof renderPersonsList === 'function') renderPersonsList(); },
        'companies':            function () { if (typeof renderCompaniesList === 'function') renderCompaniesList(); },
        'bank-accounts':        function () { if (typeof renderBankAccountsList === 'function') renderBankAccountsList(); if (typeof refreshBankTypeSelect === 'function') refreshBankTypeSelect(); },
        'cash-boxes':           function () { if (typeof renderCashBoxesList === 'function') renderCashBoxesList(); if (typeof refreshCashTypeSelect === 'function') refreshCashTypeSelect(); },
        'projects':             function () { if (typeof renderProjectsList === 'function') renderProjectsList(); },

        /* ✅ v3 — صفحه کاربران */
        'users':                function () { if (typeof initUsersPage === 'function') initUsersPage(); },

        /* ✅ انواع حساب بانکی و انواع صندوق */
        'bank-types':           function () {
            if (typeof renderChips === 'function') renderChips('bank-types-list', state.bankTypes, 'bankTypes');
        },
        'cash-types':           function () {
            if (typeof renderChips === 'function') renderChips('cash-types-list', state.cashTypes, 'cashTypes');
        },

        'estimate-daily':       function () { if (typeof refreshEstPeriodSelect === 'function') refreshEstPeriodSelect(); if (typeof renderEstimateList === 'function') renderEstimateList(); },
        'cashflow-sources':     function () { if (typeof refreshCfsMoeinSelect === 'function') refreshCfsMoeinSelect(); if (typeof renderCfsList === 'function') renderCfsList(); },
        'facilities':           function () { if (typeof renderFacilitiesList === 'function') renderFacilitiesList(); if (typeof refreshFacBankSelect === 'function') refreshFacBankSelect(); },

        'voucher-list':         function () {
            if (typeof refreshPeriodFilters === 'function') refreshPeriodFilters();
            if (typeof renderVoucherList === 'function') renderVoucherList();
        },
        'voucher-new':          function () {
            if (typeof refreshTemplateSelect === 'function') refreshTemplateSelect();
            if (typeof voucherLines !== 'undefined' && Array.isArray(voucherLines) && voucherLines.length === 0) {
                if (typeof newVoucherForm === 'function') newVoucherForm();
            } else if (typeof renderVoucherLines === 'function') {
                renderVoucherLines();
            }
        },
        'templates':            function () {
            if (typeof renderTemplateList === 'function') renderTemplateList();
            if (typeof renderTemplateLines === 'function') renderTemplateLines();
            if (typeof renderStdDescChips === 'function') renderStdDescChips();
            if (typeof refreshStdDescDatalist === 'function') refreshStdDescDatalist();
        },
        'notes':                function () { if (typeof renderNotesList === 'function') renderNotesList(); },
        'sms':                  function () {
            if (typeof renderSmsInbox === 'function') renderSmsInbox();
            if (typeof updateSmsBadge === 'function') updateSmsBadge();
            if (typeof renderPendingSmsBox === 'function') renderPendingSmsBox();
        },

        'dashboard':            function () { if (typeof renderDashboard === 'function') renderDashboard(); },

        'report-cashflow': function () {
            var fromEl = document.getElementById('cf-from');
            if (fromEl && !fromEl.value) {
                var start = getActiveFiscalYearStart();
                var t = todayJalaliStr();
                fromEl.value = start || t;
                var toEl = document.getElementById('cf-to');
                if (toEl) toEl.value = addJalaliDays(t, 30);
            }
            if (typeof runCashFlowReport === 'function') setTimeout(runCashFlowReport, 50);
        },
        'report-cashflow-desc': function () {
            var fromEl2 = document.getElementById('cfd-from');
            if (fromEl2 && !fromEl2.value) {
                var start2 = getActiveFiscalYearStart();
                var t2 = todayJalaliStr();
                fromEl2.value = start2 || t2;
                var toEl2 = document.getElementById('cfd-to');
                if (toEl2) toEl2.value = addJalaliDays(t2, 30);
            }
            if (typeof runCashFlowByDescReport === 'function') setTimeout(runCashFlowByDescReport, 50);
        },
        'report-account':       function () {
            if (typeof refreshReportPeriodSelects === 'function') refreshReportPeriodSelects();
            if (typeof updateUnitChips === 'function') updateUnitChips();
            if (typeof rebuildAccountFilterPanel === 'function') rebuildAccountFilterPanel();
            if (typeof renderAccountReview === 'function') setTimeout(renderAccountReview, 50);
        },
        'report-trial':         function () {
            if (typeof refreshReportPeriodSelects === 'function') refreshReportPeriodSelects();
            if (typeof updateUnitChips === 'function') updateUnitChips();
            if (typeof runTrialBalance === 'function') setTimeout(runTrialBalance, 50);
        },
        'report-incomplete':    function () {
            if (typeof refreshReportPeriodSelects === 'function') refreshReportPeriodSelects();
            if (typeof updateUnitChips === 'function') updateUnitChips();
            if (typeof runIncompleteReport === 'function') setTimeout(runIncompleteReport, 50);
        },
        'report-facility':      function () {
            if (typeof runFacilityReport === 'function') setTimeout(runFacilityReport, 50);
        },
        'report-facility-full': function () {
            if (typeof refreshRffBankSelect === 'function') refreshRffBankSelect();
            if (typeof runFacilityFullReport === 'function') setTimeout(runFacilityFullReport, 50);
        },
        'report-compare':       function () {
            if (typeof runComparisonReport === 'function') setTimeout(runComparisonReport, 50);
        },

        'home':                 function () { if (typeof updateHomeWidgets === 'function') updateHomeWidgets(); },
        'jalali-calendar':      function () { if (typeof calRender === 'function') setTimeout(calRender, 80); }
    };

    if (dispatch[name]) dispatch[name]();
}

function applyPageHelpers() {
    if (typeof attachDatePickers === 'function') attachDatePickers();
    updateTopbarPeriod();
    if (typeof applyColVisibilityAll === 'function') applyColVisibilityAll();
    if (typeof makeAllTablesResizable === 'function') makeAllTablesResizable();
    if (typeof buildHeaderButtons === 'function') buildHeaderButtons();
    if (typeof updateEyeButtons === 'function') updateEyeButtons();
    if (typeof attachFilterRowsToAllTables === 'function') attachFilterRowsToAllTables();
    if (typeof window._enhanceGlobalSorting === 'function') window._enhanceGlobalSorting();
    if (typeof buildShareButtons === 'function') setTimeout(buildShareButtons, 80);

    if (typeof bindReportButtons === 'function') bindReportButtons();
    if (typeof bindTrialReportButtons === 'function') bindTrialReportButtons();
    if (typeof bindFacilityReportButtons === 'function') bindFacilityReportButtons();
    if (typeof bindCashFlowReportButtons === 'function') bindCashFlowReportButtons();

    setTimeout(function () {
        var allTables = document.querySelectorAll('table[data-table-id]');
        for (var i = 0; i < allTables.length; i++) {
            if (typeof applyColumnOrder === 'function') applyColumnOrder(allTables[i].id);
        }
    }, 100);
}

function getActiveFiscalYearStart() {
    var periods = DB.load('fiscalPeriods', []);
    var p = periods.find(function (x) { return x.id === state.activePeriodId; });
    if (!p || !p.from) return '';
    var parts = String(p.from).split('/');
    if (parts.length !== 3) return '';
    return parts[0] + '/01/01';
}

function updateTopbarPeriod() {
    var el = document.getElementById('topbar-period');
    if (!el) return;
    var list = DB.load('fiscalPeriods', []);
    var p = list.find(function (x) { return x.id === state.activePeriodId; });
    el.textContent = p ? p.title : 'دوره: —';
}

function rerenderCurrentPage() {
    var active = document.querySelector('.page.active');
    if (!active) return;
    var id = active.id.replace('page-', '').split('-').slice(0, 2).join('-');
    if (active.id.indexOf('page-report-account') === 0) id = 'report-account';
    if (active.id.indexOf('page-report-cashflow') === 0) id = 'report-cashflow';
    if (active.id.indexOf('page-report-cashflow-desc') === 0) id = 'report-cashflow-desc';
    if (active.id.indexOf('page-report-trial') === 0) id = 'report-trial';
    if (active.id.indexOf('page-report-incomplete') === 0) id = 'report-incomplete';
    if (active.id.indexOf('page-report-facility') === 0) id = 'report-facility';
    if (active.id.indexOf('page-report-facility-full') === 0) id = 'report-facility-full';
    if (active.id.indexOf('page-report-compare') === 0) id = 'report-compare';
    if (active.id.indexOf('page-voucher-list') === 0) id = 'voucher-list';

    var map = {
        'persons':              'renderPersonsList',
        'companies':            'renderCompaniesList',
        'bank-accounts':        'renderBankAccountsList',
        'cash-boxes':           'renderCashBoxesList',
        'projects':             'renderProjectsList',
        'fiscal':               'renderFiscalList',
        'voucher-list':         'renderVoucherList',
        'estimate-daily':       'renderEstimateList',
        'cashflow-sources':     'renderCfsList',
        'facilities':           'renderFacilitiesList',
        'report-cashflow':      'runCashFlowReport',
        'report-cashflow-desc': 'runCashFlowByDescReport',
        'report-account':       'renderAccountReview',
        'report-trial':         'runTrialBalance',
        'report-incomplete':    'runIncompleteReport',
        'report-facility':      'runFacilityReport',
        'report-facility-full': 'runFacilityFullReport',
        'report-compare':       'runComparisonReport',
        'notes':                'renderNotesList',
        'users':                'renderUsersList',
        'dashboard':            'renderDashboard',
        'home':                 'updateHomeWidgets'
    };
    var fnName = map[id];
    if (fnName && typeof window[fnName] === 'function') window[fnName]();
}

window.goToPage               = goToPage;
window.runPageRenderer        = runPageRenderer;
window.applyPageHelpers       = applyPageHelpers;
window.getActiveFiscalYearStart = getActiveFiscalYearStart;
window.updateTopbarPeriod     = updateTopbarPeriod;
window.rerenderCurrentPage    = rerenderCurrentPage;

console.log('✅ [core/router.js] loaded — users case added');
