/* ============================================================
   پارسیس — راه‌اندازی نهایی برنامه
   مسیر: js/app.js
   ============================================================ */
'use strict';

/* ============================================================
   بخش ۱ — Settings
   ============================================================ */
function bindSettingsButtons() {
    var settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function () {
            var modal = document.getElementById('settings-modal');
            var overlay = document.getElementById('settings-overlay');
            if (modal) modal.classList.add('show');
            if (overlay) overlay.classList.add('show');

            if (typeof renderWidgetOrderUI === 'function') renderWidgetOrderUI();
            if (typeof renderDashboardOrderUI === 'function') renderDashboardOrderUI();

            var aboutEl = document.getElementById('about-version');
            if (aboutEl) {
                aboutEl.textContent = APP_NAME + ' — نسخه ' + toFa(APP_VERSION) + ' (PWA)';
            }
        });
    }

    var closeBtn = document.getElementById('close-settings');
    if (closeBtn) closeBtn.addEventListener('click', closeSettings);

    var overlay = document.getElementById('settings-overlay');
    if (overlay) overlay.addEventListener('click', closeSettings);

    var backupBtn = document.getElementById('modal-backup-btn');
    if (backupBtn) backupBtn.addEventListener('click', downloadBackup);

    var restoreBtn = document.getElementById('modal-restore-btn');
    if (restoreBtn) restoreBtn.addEventListener('click', function () {
        var fileInput = document.getElementById('restore-file');
        if (fileInput) fileInput.click();
    });

    var restoreFile = document.getElementById('restore-file');
    if (restoreFile) restoreFile.addEventListener('change', function () {
        if (this.files[0]) restoreBackup(this.files[0]);
        this.value = '';
    });

    var resetBtn = document.getElementById('modal-reset-btn');
    if (resetBtn) resetBtn.addEventListener('click', resetAllData);

    var logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', function () {
        if (confirm('رفرش شود؟')) location.reload();
    });
}

/* ============================================================
   بخش ۲ — Currency & Hide
   ============================================================ */
function bindCurrencyHide() {
    var setLang = document.getElementById('set-language');
    if (setLang) {
        setLang.value = state.language;
        setLang.addEventListener('change', function () {
            state.language = this.value;
            saveState(LS_KEYS.LANGUAGE);
        });
    }

    var setCur = document.getElementById('set-currency');
    if (setCur) {
        setCur.value = state.currency;
        setCur.addEventListener('change', function () {
            state.currency = this.value;
            saveState(LS_KEYS.CURRENCY);
        });
    }

    function onCurrencyDisplay(v) {
        state.currencyDisplay = v;
        saveState(LS_KEYS.CURRENCY_DISPLAY);

        var s1 = document.getElementById('set-currency-display');
        var s2 = document.getElementById('set-currency-display2');
        if (s1) s1.value = v;
        if (s2) s2.value = v;

        if (typeof updateUnitChips === 'function') updateUnitChips();
        if (typeof updateHomeWidgets === 'function') updateHomeWidgets();
        if (typeof rerenderCurrentPage === 'function') rerenderCurrentPage();
    }

    var s1 = document.getElementById('set-currency-display');
    if (s1) s1.addEventListener('change', function () { onCurrencyDisplay(this.value); });

    var s2 = document.getElementById('set-currency-display2');
    if (s2) {
        s2.value = state.currencyDisplay;
        s2.addEventListener('change', function () { onCurrencyDisplay(this.value); });
    }

    function onHideNumbers(v) {
        state.hideNumbers = v;
        saveState(LS_KEYS.HIDE_NUMBERS);

        var cb = document.getElementById('set-hide-numbers');
        if (cb) cb.checked = v;

        if (typeof updateEyeButtons === 'function') updateEyeButtons();
        if (typeof updateHomeWidgets === 'function') updateHomeWidgets();
        if (typeof rerenderCurrentPage === 'function') rerenderCurrentPage();
    }

    var hideCb = document.getElementById('set-hide-numbers');
    if (hideCb) {
        hideCb.checked = state.hideNumbers;
        hideCb.addEventListener('change', function () { onHideNumbers(this.checked); });
    }
}

/* ============================================================
   بخش ۳ — bank/cash types
   ============================================================ */
function bindBankCashTypes() {
    var addBankBtn = document.getElementById('add-bank-type');
    if (addBankBtn) addBankBtn.addEventListener('click', function () {
        var inp = document.getElementById('new-bank-type');
        var v = inp.value.trim();
        if (!v) return;
        if (state.bankTypes.indexOf(v) !== -1) return;
        state.bankTypes.push(v);
        saveState(LS_KEYS.BANK_TYPES);
        inp.value = '';
        renderChips('bank-types-list', state.bankTypes, 'bankTypes');
    });

    var addCashBtn = document.getElementById('add-cash-type');
    if (addCashBtn) addCashBtn.addEventListener('click', function () {
        var inp = document.getElementById('new-cash-type');
        var v = inp.value.trim();
        if (!v) return;
        if (state.cashTypes.indexOf(v) !== -1) return;
        state.cashTypes.push(v);
        saveState(LS_KEYS.CASH_TYPES);
        inp.value = '';
        renderChips('cash-types-list', state.cashTypes, 'cashTypes');
    });
}

/* ============================================================
   بخش ۴ — SMS
   ============================================================ */
function bindSmsButtons() {
    function onSmsAutoRead(val) {
        state.smsAutoRead = val;
        DB.save(LS_KEYS.SMS_AUTO_READ, val);

        var e1 = document.getElementById('sms-auto-read');
        var e2 = document.getElementById('set-sms-auto-read');
        if (e1) e1.checked = val;
        if (e2) e2.checked = val;
    }

    var sar = document.getElementById('sms-auto-read');
    if (sar) sar.addEventListener('change', function () { onSmsAutoRead(this.checked); });

    var ssar = document.getElementById('set-sms-auto-read');
    if (ssar) ssar.addEventListener('change', function () { onSmsAutoRead(this.checked); });

    var readClip = document.getElementById('sms-read-clip');
    if (readClip) readClip.addEventListener('click', function () {
        if (typeof readClipboardAndAdd === 'function') readClipboardAndAdd(false);
        else showToast('⚠️ سیستم پیامک لود نشده.');
    });

    var parseSms = document.getElementById('parse-sms');
    if (parseSms) parseSms.addEventListener('click', function () {
        var text = document.getElementById('sms-text').value;
        if (!text.trim()) {
            alert('متن را وارد کن.');
            return;
        }
        if (typeof addSmsToInbox !== 'function') {
            alert('سیستم پیامک لود نشده.');
            return;
        }
        var res = addSmsToInbox(text, 'paste');
        if (res.ok) {
            showToast('✅ اضافه شد');
            document.getElementById('sms-text').value = '';
            if (typeof renderSmsInbox === 'function') renderSmsInbox();
            if (typeof updateSmsBadge === 'function') updateSmsBadge();
        } else {
            alert(res.reason === 'duplicate' ? 'قبلاً ثبت شده.' : 'قابل تشخیص نبود.');
        }
    });

    var clearSms = document.getElementById('clear-sms');
    if (clearSms) clearSms.addEventListener('click', function () {
        document.getElementById('sms-text').value = '';
        document.getElementById('sms-result').innerHTML = '';
    });

    var smsClearConv = document.getElementById('sms-clear-converted');
    if (smsClearConv) smsClearConv.addEventListener('click', function () {
        if (!confirm('حذف تبدیل‌شده‌ها؟')) return;
        if (typeof getSmsInbox !== 'function') return;
        var l = getSmsInbox().filter(function (s) { return s.status === 'new'; });
        if (typeof saveSmsInbox === 'function') saveSmsInbox(l);
        if (typeof renderSmsInbox === 'function') renderSmsInbox();
        if (typeof updateSmsBadge === 'function') updateSmsBadge();
    });
}

/* ============================================================
   بخش ۵ — Widget toggles (legacy)
   ============================================================ */
function bindWidgetToggles() {
    var wT = document.querySelectorAll('[data-widget-toggle]');
    for (var wt = 0; wt < wT.length; wt++) {
        wT[wt].addEventListener('change', function () {
            var k = this.getAttribute('data-widget-toggle');
            state.widgets[k] = this.checked;
            DB.save(LS_KEYS.WIDGETS, state.widgets);
            if (typeof updateHomeWidgets === 'function') updateHomeWidgets();
        });
    }
}

/* ============================================================
   بخش ۶ — Base forms
   ============================================================ */
function bindBaseDataForms() {
    if (typeof bindFiscalForm === 'function') bindFiscalForm();
    if (typeof bindPersonsForm === 'function') bindPersonsForm();
    if (typeof bindCompaniesForm === 'function') bindCompaniesForm();
    if (typeof bindBanksForm === 'function') bindBanksForm();
    if (typeof bindCashBoxesForm === 'function') bindCashBoxesForm();
    if (typeof bindProjectsForm === 'function') bindProjectsForm();
    if (typeof bindChartForm === 'function') bindChartForm();
}

function bindCashForms() {
    if (typeof bindEstimatesForm === 'function') bindEstimatesForm();
    if (typeof bindSourcesForm === 'function') bindSourcesForm();
    if (typeof bindFacilitiesForm === 'function') bindFacilitiesForm();
}

function bindVoucherTemplatesForms() {
    if (typeof bindVoucherForm === 'function') bindVoucherForm();
    if (typeof bindVoucherListFilters === 'function') bindVoucherListFilters();
    if (typeof bindTemplatesForm === 'function') bindTemplatesForm();
}

/* ============================================================
   بخش ۷ — Report buttons
   ⚠️ گزارش نرخ ارز و طلا (rr-*) و قیمت پایانی روز (dc-*) حذف شدند
   ============================================================ */
function bindReportButtons() {
    if (typeof bindCashFlowReportButtons === 'function') bindCashFlowReportButtons();

    var printButtons = {
        'cf-print':  ['#cf-result',  'پیش‌بینی روزانه نقدینگی'],
        'cfd-print': ['#cfd-result', 'گردش وجه نقد'],
        'ra-print':  ['#ra-result',  'مرور حساب‌ها'],
        'rt-print':  ['#rt-result',  'تراز آزمایشی'],
        'ri-print':  ['#ri-result',  'تراکنش‌های تکمیل نشده'],
        'rf-print':  ['#rf-result',  'خلاصه تسهیلات'],
        'rff-print': ['#rff-result', 'گزارش جامع تسهیلات'],
        'rc-print':  ['#rc-result',  'گزارش مقایسه‌ای دوره‌ها']
    };
    Object.keys(printButtons).forEach(function (id) {
        var btn = document.getElementById(id);
        if (!btn) return;
        var args = printButtons[id];
        btn.addEventListener('click', function () {
            if (typeof printHtmlReport === 'function') printHtmlReport(args[0], args[1]);
        });
    });

    var exportButtons = {
        'cf-export':  ['#cf-result',  'cash-flow'],
        'cfd-export': ['#cfd-result', 'cash-flow-by-desc'],
        'ra-export':  ['#ra-result',  'account-report'],
        'rt-export':  ['#rt-result',  'trial-balance'],
        'ri-export':  ['#ri-result',  'incomplete-transactions'],
        'rf-export':  ['#rf-result',  'facility-summary'],
        'rff-export': ['#rff-result', 'facility-full-report'],
        'rc-export':  ['#rc-result',  'comparison-report']
    };
    Object.keys(exportButtons).forEach(function (id) {
        var btn = document.getElementById(id);
        if (!btn) return;
        var args = exportButtons[id];
        btn.addEventListener('click', function () {
            if (typeof exportReportTable === 'function') exportReportTable(args[0], args[1]);
        });
    });

    if (typeof bindRatesRefreshButton === 'function') bindRatesRefreshButton();
    if (typeof bindFacilityReportButtons === 'function') bindFacilityReportButtons();
    if (typeof bindTrialReportButtons === 'function') bindTrialReportButtons();

    var rtRun = document.getElementById('rt-run');
    if (rtRun && typeof runTrialBalance === 'function') {
        rtRun.addEventListener('click', runTrialBalance);
    }
    var riRun = document.getElementById('ri-run');
    if (riRun && typeof runIncompleteReport === 'function') {
        riRun.addEventListener('click', runIncompleteReport);
    }
    var rcRun = document.getElementById('rc-run');
    if (rcRun && typeof runComparisonReport === 'function') {
        rcRun.addEventListener('click', runComparisonReport);
    }
    var raRun = document.getElementById('ra-run');
    if (raRun && typeof runAccountReport === 'function') {
        raRun.addEventListener('click', runAccountReport);
    }
}

/* ============================================================
   بخش ۸ — Modal closers
   ============================================================ */
function bindModalClosers() {
    var closeVp = document.getElementById('close-vpreview');
    if (closeVp && typeof closeVoucherPreview === 'function') {
        closeVp.addEventListener('click', closeVoucherPreview);
    }
    var vpClose = document.getElementById('vpreview-close-btn');
    if (vpClose && typeof closeVoucherPreview === 'function') {
        vpClose.addEventListener('click', closeVoucherPreview);
    }
    var vpOv = document.getElementById('vpreview-overlay');
    if (vpOv && typeof closeVoucherPreview === 'function') {
        vpOv.addEventListener('click', closeVoucherPreview);
    }
    var vpPrint = document.getElementById('vpreview-print');
    if (vpPrint && typeof printVoucherPreview === 'function') {
        vpPrint.addEventListener('click', printVoucherPreview);
    }

    var closeTo = document.getElementById('close-turnover');
    if (closeTo && typeof closeTurnover === 'function') closeTo.addEventListener('click', closeTurnover);
    var toClose = document.getElementById('turnover-close-btn');
    if (toClose && typeof closeTurnover === 'function') toClose.addEventListener('click', closeTurnover);
    var toOv = document.getElementById('turnover-overlay');
    if (toOv && typeof closeTurnover === 'function') toOv.addEventListener('click', closeTurnover);
    var toPrint = document.getElementById('turnover-print');
    if (toPrint && typeof printHtmlReport === 'function') {
        toPrint.addEventListener('click', function () {
            printHtmlReport('#turnover-body', 'گردش حساب');
        });
    }

    var closeIv = document.getElementById('close-imgview');
    if (closeIv) closeIv.addEventListener('click', function () {
        document.getElementById('imgview-modal').classList.remove('show');
        document.getElementById('imgview-overlay').classList.remove('show');
    });
    var ivOv = document.getElementById('imgview-overlay');
    if (ivOv) ivOv.addEventListener('click', function () {
        document.getElementById('imgview-modal').classList.remove('show');
        document.getElementById('imgview-overlay').classList.remove('show');
    });

    var closeNv = document.getElementById('close-noteview');
    if (closeNv && typeof closeNoteView === 'function') closeNv.addEventListener('click', closeNoteView);
    var nvOv = document.getElementById('noteview-overlay');
    if (nvOv && typeof closeNoteView === 'function') nvOv.addEventListener('click', closeNoteView);

    var closeScan = document.getElementById('voucher-scan-close');
    if (closeScan) closeScan.addEventListener('click', function () {
        var m = document.getElementById('voucher-scan-modal');
        var o = document.getElementById('voucher-scan-overlay');
        if (m) m.remove();
        if (o) o.remove();
    });
    var scanOv = document.getElementById('voucher-scan-overlay');
    if (scanOv) scanOv.addEventListener('click', function () {
        var m = document.getElementById('voucher-scan-modal');
        var o = document.getElementById('voucher-scan-overlay');
        if (m) m.remove();
        if (o) o.remove();
    });
}

/* ============================================================
   بخش ۹ — Sidebar
   ============================================================ */
function bindSidebarNavApp() {
    if (typeof initSidebarSearch === 'function') initSidebarSearch();
    if (typeof window.bindSidebarNav === 'function' && !window._sbNavBound) {
        window._sbNavBound = true;
        window.bindSidebarNav();
    }
}

/* ============================================================
   بخش ۱۰ — Filter inputs
   ============================================================ */
function bindFilterInputs() {
    var filterMap = {
        'fiscal-filter':    'renderFiscalList',
        'persons-filter':   'renderPersonsList',
        'comp-filter':      'renderCompaniesList',
        'ba-filter':        'renderBankAccountsList',
        'cb-filter':        'renderCashBoxesList',
        'proj-filter':      'renderProjectsList',
        'fac-filter':       'renderFacilitiesList',
        'cfs-filter':       'renderCfsList',
        'est-filter':       'renderEstimateList'
    };
    Object.keys(filterMap).forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        var fn = filterMap[id];
        el.addEventListener('input', function () {
            if (typeof window[fn] === 'function') window[fn]();
        });
    });

    var facCat = document.getElementById('fac-cat-filter');
    if (facCat && typeof renderFacilitiesList === 'function') {
        facCat.addEventListener('change', renderFacilitiesList);
    }
}

/* ============================================================
   بخش ۱۱ — Export
   ============================================================ */
function bindExportButtons() {
    var eB = document.querySelectorAll('.export-btn[data-export]');
    for (var e = 0; e < eB.length; e++) {
        eB[e].addEventListener('click', function () {
            if (typeof exportToCsv === 'function') {
                exportToCsv(this.getAttribute('data-export'), this.getAttribute('data-export'));
            }
        });
    }
}

/* ============================================================
   بخش ۱۲ — init
   ============================================================ */
function init() {
    if (typeof applyTheme === 'function') applyTheme(state.theme);
    if (typeof applyFont === 'function') applyFont(state.font);

    if (typeof renderChips === 'function') {
        renderChips('bank-types-list', state.bankTypes, 'bankTypes');
        renderChips('cash-types-list', state.cashTypes, 'cashTypes');
    }

    if (typeof setupTabs === 'function') setupTabs();
    if (typeof setupSorting === 'function') setupSorting();
    if (typeof initCalendarListeners === 'function') initCalendarListeners();
    if (typeof initCalculator === 'function') initCalculator();
    if (typeof initSidebarSearch === 'function') initSidebarSearch();
    if (typeof initHomeSwipe === 'function') initHomeSwipe();

    if (DB.load('accounts', []).length > 0) {
        var ldc = document.getElementById('load-default-chart');
        if (ldc) ldc.disabled = true;
    }

    if (!localStorage.getItem(LS_PREFIX + 'voucherTemplates')) {
        if (typeof getDefaultTemplates === 'function') {
            DB.save('voucherTemplates', getDefaultTemplates());
        }
    }
    if (!localStorage.getItem(LS_PREFIX + 'standardDescriptions')) {
        if (typeof getDefaultStdDescriptions === 'function') {
            DB.save('standardDescriptions', getDefaultStdDescriptions());
        }
    }

    if (typeof refreshStdDescDatalist === 'function') refreshStdDescDatalist();
    if (typeof refreshTemplateSelect === 'function') refreshTemplateSelect();
    if (typeof renderTemplateList === 'function') renderTemplateList();
    if (typeof applyWidgetVisibility === 'function') applyWidgetVisibility();
    if (typeof renderWidgetOrderUI === 'function') renderWidgetOrderUI();
    if (typeof renderFrequentNav === 'function') renderFrequentNav();

    if (typeof renderSmsInbox === 'function') renderSmsInbox();
    if (typeof updateSmsBadge === 'function') updateSmsBadge();

    var c2 = document.getElementById('set-currency-display2');
    if (c2) c2.value = state.currencyDisplay;

    var hn = document.getElementById('set-hide-numbers');
    if (hn) hn.checked = state.hideNumbers;

    var s1 = document.getElementById('set-sms-auto-read');
    if (s1) s1.checked = state.smsAutoRead;

    var s2 = document.getElementById('sms-auto-read');
    if (s2) s2.checked = state.smsAutoRead;

    var aboutEl = document.getElementById('about-version');
    if (aboutEl) {
        aboutEl.textContent = APP_NAME + ' — نسخه ' + toFa(APP_VERSION) + ' (PWA)';
    }

    if (typeof updateUnitChips === 'function') updateUnitChips();

    var binds = [
        ['bindSidebarNavApp',  bindSidebarNavApp],
        ['bindSettingsButtons', bindSettingsButtons],
        ['bindThemeFontButtons', function () {
            if (typeof bindThemeFontButtons === 'function') bindThemeFontButtons();
        }],
        ['bindWidgetToggles',  bindWidgetToggles],
        ['bindCurrencyHide',   bindCurrencyHide],
        ['bindBankCashTypes',  bindBankCashTypes],
        ['bindSmsButtons',     bindSmsButtons],
        ['bindBaseDataForms',  bindBaseDataForms],
        ['bindCashForms',      bindCashForms],
        ['bindVoucherTemplatesForms', bindVoucherTemplatesForms],
        ['bindReportButtons',  bindReportButtons],
        ['bindModalClosers',   bindModalClosers],
        ['bindNotesForm',      function () {
            if (typeof bindNotesForm === 'function') bindNotesForm();
        }],
        ['bindFilterInputs',   bindFilterInputs],
        ['bindExportButtons',  bindExportButtons]
    ];

    binds.forEach(function (pair) {
        try {
            pair[1]();
        } catch (e) {
            console.warn('[' + pair[0] + ']', e);
        }
    });

    if (typeof updateDateDisplay === 'function') updateDateDisplay();
    if (typeof updateTopbarPeriod === 'function') updateTopbarPeriod();
    if (typeof updateHomeWidgets === 'function') updateHomeWidgets();
    if (typeof updateEyeButtons === 'function') updateEyeButtons();

    setInterval(function () {
        if (typeof updateDateDisplay === 'function') updateDateDisplay();
        if (typeof updateTopbarPeriod === 'function') updateTopbarPeriod();
    }, 60000);

    if (typeof newVoucherForm === 'function') {
        var vIdEl = document.getElementById('v-id');
        if (vIdEl && !vIdEl.value) newVoucherForm();
    }

    if (typeof attachDatePickers === 'function') attachDatePickers();
    if (typeof buildHeaderButtons === 'function') buildHeaderButtons();
    if (typeof makeAllTablesResizable === 'function') makeAllTablesResizable();

    if (typeof checkClipboardSupport === 'function') checkClipboardSupport();
    if (typeof clearNoteForm === 'function') clearNoteForm();

    if (typeof makeCardCollapsible === 'function') {
        makeCardCollapsible(document.getElementById('voucher-template-card'), 'voucher-template-card', true);
        makeCardCollapsible(document.getElementById('voucher-head-card'), 'voucher-head-card', true);
    }

    setTimeout(function () {
        if (typeof fetchLiveRates === 'function') fetchLiveRates(true);
    }, 1500);

    setInterval(function () {
        if (state.widgets.liveRates && typeof fetchLiveRates === 'function') {
            fetchLiveRates(true);
        }
    }, 300000);

    function autoRead() {
        if (!state.smsAutoRead) return;
        if (typeof readClipboardAndAdd !== 'function') return;
        setTimeout(function () { readClipboardAndAdd(true); }, 700);
    }
    window.addEventListener('focus', autoRead);
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') autoRead();
    });

    if (typeof aiInit === 'function') aiInit();
    if (typeof aiRender === 'function') aiRender();
    if (typeof renderEstimateItems === 'function') renderEstimateItems();
    if (typeof autoAttachReportHelpers === 'function') autoAttachReportHelpers();
    if (typeof buildShareButtons === 'function') setTimeout(buildShareButtons, 300);

    console.log('🎉 ' + APP_NAME + ' v' + APP_VERSION + ' — آماده است.');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

/* ============================================================
   Service Worker
   ============================================================ */
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(function (e) {
        console.log('SW register failed:', e);
    });
}

/* ============================================================
   Global error handler
   ============================================================ */
window.addEventListener('error', function (e) {
    console.error('[Global Error]', e.error || e.message);
});

window.addEventListener('unhandledrejection', function (e) {
    console.warn('[Unhandled Rejection]', e.reason);
});

/* ============================================================
   Exports
   ============================================================ */
window.bindSettingsButtons      = bindSettingsButtons;
window.bindCurrencyHide         = bindCurrencyHide;
window.bindBankCashTypes        = bindBankCashTypes;
window.bindSmsButtons           = bindSmsButtons;
window.bindWidgetToggles        = bindWidgetToggles;
window.bindBaseDataForms        = bindBaseDataForms;
window.bindCashForms            = bindCashForms;
window.bindVoucherTemplatesForms = bindVoucherTemplatesForms;
window.bindReportButtons        = bindReportButtons;
window.bindModalClosers         = bindModalClosers;
window.bindFilterInputs         = bindFilterInputs;
window.bindExportButtons        = bindExportButtons;
window.parsisInit               = init;

console.log('✅ [app.js] loaded — ready to init');
