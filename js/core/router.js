/* ============================================================
   پارسیس — ناوبری بین صفحات
   مسیر: js/core/router.js
   وابستگی: db.js, constants.js, utils.js, state.js
   ============================================================ */
'use strict';

/* ============================================================
   بخش ۱ — goToPage: هدایت به صفحه + اجرای dispatcher
   ============================================================ */
function goToPage(name) {
    if (!name) return;

    /* ۱) مخفی کردن همه صفحات، نمایش صفحه‌ی هدف */
    var pages = document.querySelectorAll('.page');
    for (var i = 0; i < pages.length; i++) pages[i].classList.remove('active');
    var target = document.getElementById('page-' + name);
    if (target) target.classList.add('active');

    /* ۲) آپدیت دکمه‌های فعال در سایدبار */
    var btns = document.querySelectorAll('.nav-group-items button');
    for (var j = 0; j < btns.length; j++) {
        btns[j].classList.toggle('active',
            btns[j].getAttribute('data-page') === name);
    }

    /* ۳) بستن سایدبار (اگر باز است) */
    if (typeof closeSidebar === 'function') closeSidebar();

    /* ۴) ثبت در آمار صفحات پرکاربرد */
    if (typeof trackFormUsage === 'function') trackFormUsage(name);

    /* ۵) فراخوانی renderer مخصوص هر صفحه */
    runPageRenderer(name);

    /* ۶) اعمال کمک‌ابزارهای عمومی */
    applyPageHelpers();
}

/* ============================================================
   بخش ۲ — Dispatcher: کدام تابع برای کدام صفحه
   ============================================================ */
function runPageRenderer(name) {
    var dispatch = {
        /* اطلاعات پایه */
        'chart-define':         function () { if (typeof renderChartTree === 'function') renderChartTree('chart-tree', true); },
        'fiscal':               function () { if (typeof renderFiscalList === 'function') renderFiscalList(); },
        'persons':              function () { if (typeof renderPersonsList === 'function') renderPersonsList(); },
        'companies':            function () { if (typeof renderCompaniesList === 'function') renderCompaniesList(); },
        'bank-accounts':        function () { if (typeof renderBankAccountsList === 'function') renderBankAccountsList(); if (typeof refreshBankTypeSelect === 'function') refreshBankTypeSelect(); },
        'cash-boxes':           function () { if (typeof renderCashBoxesList === 'function') renderCashBoxesList(); if (typeof refreshCashTypeSelect === 'function') refreshCashTypeSelect(); },
        'projects':             function () { if (typeof renderProjectsList === 'function') renderProjectsList(); },

        /* نقدینگی */
        'estimate-daily':       function () { if (typeof refreshEstPeriodSelect === 'function') refreshEstPeriodSelect(); if (typeof renderEstimateList === 'function') renderEstimateList(); },
        'cashflow-sources':     function () { if (typeof refreshCfsMoeinSelect === 'function') refreshCfsMoeinSelect(); if (typeof renderCfsList === 'function') renderCfsList(); },
        'facilities':           function () { if (typeof renderFacilitiesList === 'function') renderFacilitiesList(); if (typeof refreshFacBankSelect === 'function') refreshFacBankSelect(); },

        /* عملیات */
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

        /* داشبورد */
        'dashboard':            function () { if (typeof renderDashboard === 'function') renderDashboard(); },

        /* گزارش‌ها */
        'report-cashflow': function () {
            var fromEl = document.getElementById('cf-from');
            if (fromEl && !fromEl.value) {
                var start = getActiveFiscalYearStart();
                var t = todayJalaliStr();
                fromEl.value = start || t;
                var toEl = document.getElementById('cf-to');
                if (toEl) toEl.value = addJalaliDays(t, 30);
            }
            if (typeof runCashFlowReport === 'function') runCashFlowReport();
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
            if (typeof runCashFlowByDescReport === 'function') runCashFlowByDescReport();
        },
        'report-account':       function () {
            if (typeof refreshReportPeriodSelects === 'function') refreshReportPeriodSelects();
            if (typeof updateUnitChips === 'function') updateUnitChips();
        },
        'report-trial':         function () {
            if (typeof refreshReportPeriodSelects === 'function') refreshReportPeriodSelects();
            if (typeof updateUnitChips === 'function') updateUnitChips();
        },
        'report-incomplete':    function () {
            if (typeof refreshReportPeriodSelects === 'function') refreshReportPeriodSelects();
            if (typeof updateUnitChips === 'function') updateUnitChips();
            if (typeof runIncompleteReport === 'function') runIncompleteReport();
        },
        'report-facility':      function () { if (typeof runFacilityReport === 'function') runFacilityReport(); },
        'report-facility-full': function () {
            if (typeof refreshRffBankSelect === 'function') refreshRffBankSelect();
            if (typeof runFacilityFullReport === 'function') runFacilityFullReport();
        },
        'report-rates':         function () { if (typeof runRatesReport === 'function') runRatesReport(); },
        'report-compare':       function () { if (typeof runComparisonReport === 'function') runComparisonReport(); },
        'daily-close':          function () { if (typeof renderDailyClosePage === 'function') renderDailyClosePage(); },

        /* صفحه اصلی */
        'home':                 function () { if (typeof updateHomeWidgets === 'function') updateHomeWidgets(); },

        /* تقویم */
        'jalali-calendar':      function () { if (typeof calRender === 'function') setTimeout(calRender, 80); }
    };

    if (dispatch[name]) dispatch[name]();
}

/* ============================================================
   بخش ۳ — کمک‌ابزارهای عمومی پس از هر ناوبری
   ============================================================ */
function applyPageHelpers() {
    /* تقویم‌ها */
    if (typeof attachDatePickers === 'function') attachDatePickers();

    /* نوار بالای صفحه */
    updateTopbarPeriod();

    /* جدول‌ها */
    if (typeof applyColVisibilityAll === 'function') applyColVisibilityAll();
    if (typeof makeAllTablesResizable === 'function') makeAllTablesResizable();
    if (typeof buildHeaderButtons === 'function') buildHeaderButtons();
    if (typeof updateEyeButtons === 'function') updateEyeButtons();

    /* فیلتر ردیف ستون‌ها */
    if (typeof attachFilterRowsToAllTables === 'function') attachFilterRowsToAllTables();

    /* مرتب‌سازی سراسری */
    if (typeof window._enhanceGlobalSorting === 'function') window._enhanceGlobalSorting();

    /* دکمه‌های اشتراک‌گذاری */
    if (typeof buildShareButtons === 'function') setTimeout(buildShareButtons, 80);

    /* اعمال ترتیب ستون‌های ذخیره‌شده */
    setTimeout(function () {
        var allTables = document.querySelectorAll('table[data-table-id]');
        for (var i = 0; i < allTables.length; i++) {
            if (typeof applyColumnOrder === 'function') applyColumnOrder(allTables[i].id);
        }
    }, 100);
}

/* ============================================================
   بخش ۴ — ابزار شروع سال مالی فعال
   خروجی: رشته‌ی "YYYY/01/01" یا رشته‌ی خالی
   ============================================================ */
function getActiveFiscalYearStart() {
    var periods = DB.load('fiscalPeriods', []);
    var p = periods.find(function (x) { return x.id === state.activePeriodId; });
    if (!p || !p.from) return '';
    var parts = String(p.from).split('/');
    if (parts.length !== 3) return '';
    return parts[0] + '/01/01';
}

/* ============================================================
   بخش ۵ — به‌روزرسانی نشان دوره فعال در تاپ‌بار
   ============================================================ */
function updateTopbarPeriod() {
    var el = document.getElementById('topbar-period');
    if (!el) return;
    var list = DB.load('fiscalPeriods', []);
    var p = list.find(function (x) { return x.id === state.activePeriodId; });
    el.textContent = p ? p.title : 'دوره: —';
}

/* ============================================================
   بخش ۶ — بازخوانی صفحه‌ی جاری (پس از تغییر تنظیمات)
   ============================================================ */
function rerenderCurrentPage() {
    var active = document.querySelector('.page.active');
    if (!active) return;
    var id = active.id.replace('page-', '');
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
        'report-account':       'runAccountReport',
        'report-trial':         'runTrialBalance',
        'report-incomplete':    'runIncompleteReport',
        'report-facility':      'runFacilityReport',
        'report-facility-full': 'runFacilityFullReport',
        'report-rates':         'runRatesReport',
        'report-compare':       'runComparisonReport',
        'daily-close':          'renderDailyCloseHistory',
        'notes':                'renderNotesList',
        'dashboard':            'renderDashboard',
        'home':                 'updateHomeWidgets'
    };
    var fnName = map[id];
    if (fnName && typeof window[fnName] === 'function') window[fnName]();
}

/* ============================================================
   صادرسازی
   ============================================================ */
window.goToPage               = goToPage;
window.runPageRenderer        = runPageRenderer;
window.applyPageHelpers       = applyPageHelpers;
window.getActiveFiscalYearStart = getActiveFiscalYearStart;
window.updateTopbarPeriod     = updateTopbarPeriod;
window.rerenderCurrentPage    = rerenderCurrentPage;

console.log('✅ [core/router.js] loaded');
