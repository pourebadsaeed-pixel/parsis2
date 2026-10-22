/* ============================================================
   پارسیس — راه‌اندازی نهایی برنامه (سبک، بدون لگ)
   مسیر: js/app.js
   ============================================================ */
'use strict';

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
            if (aboutEl) aboutEl.textContent = APP_NAME + ' — نسخه ' + toFa(APP_VERSION) + ' (PWA)';
        });
    }
    var closeBtn = document.getElementById('close-settings');
    if (closeBtn) closeBtn.addEventListener('click', closeSettings);
    var overlay = document.getElementById('settings-overlay');
    if (overlay) overlay.addEventListener('click', closeSettings);
    var backupBtn = document.getElementById('modal-backup-btn');
    if (backupBtn) backupBtn.addEventListener('click', downloadBackup);
    var restoreBtn = document.getElementById('modal-restore-btn');
    if (restoreBtn) restoreBtn.addEventListener('click', function () { document.getElementById('restore-file').click(); });
    var restoreFile = document.getElementById('restore-file');
    if (restoreFile) restoreFile.addEventListener('change', function () { if (this.files[0]) restoreBackup(this.files[0]); this.value = ''; });
    var resetBtn = document.getElementById('modal-reset-btn');
    if (resetBtn) resetBtn.addEventListener('click', resetAllData);
}

function bindCurrencyHide() {
    var setLang = document.getElementById('set-language');
    if (setLang && !setLang.dataset.bound) {
        setLang.dataset.bound = '1'; setLang.value = state.language;
        setLang.addEventListener('change', function () { state.language = this.value; saveState(LS_KEYS.LANGUAGE); });
    }
    var setCur = document.getElementById('set-currency');
    if (setCur && !setCur.dataset.bound) {
        setCur.dataset.bound = '1'; setCur.value = state.currency;
        setCur.addEventListener('change', function () { state.currency = this.value; saveState(LS_KEYS.CURRENCY); });
    }
    function onCurrencyDisplay(v) {
        state.currencyDisplay = v; saveState(LS_KEYS.CURRENCY_DISPLAY);
        var s1 = document.getElementById('set-currency-display'); var s2 = document.getElementById('set-currency-display2');
        if (s1) s1.value = v; if (s2) s2.value = v;
        if (typeof updateUnitChips === 'function') updateUnitChips();
        if (typeof updateHomeWidgets === 'function') updateHomeWidgets();
        if (typeof rerenderCurrentPage === 'function') rerenderCurrentPage();
    }
    var s1 = document.getElementById('set-currency-display');
    if (s1 && !s1.dataset.bound) { s1.dataset.bound = '1'; s1.addEventListener('change', function () { onCurrencyDisplay(this.value); }); }
    var s2 = document.getElementById('set-currency-display2');
    if (s2 && !s2.dataset.bound) { s2.dataset.bound = '1'; s2.value = state.currencyDisplay; s2.addEventListener('change', function () { onCurrencyDisplay(this.value); }); }
    function onHideNumbers(v) {
        state.hideNumbers = v; saveState(LS_KEYS.HIDE_NUMBERS);
        var cb = document.getElementById('set-hide-numbers'); if (cb) cb.checked = v;
        if (typeof updateEyeButtons === 'function') updateEyeButtons();
        if (typeof updateHomeWidgets === 'function') updateHomeWidgets();
        if (typeof rerenderCurrentPage === 'function') rerenderCurrentPage();
    }
    var hideCb = document.getElementById('set-hide-numbers');
    if (hideCb && !hideCb.dataset.bound) { hideCb.dataset.bound = '1'; hideCb.checked = state.hideNumbers; hideCb.addEventListener('change', function () { onHideNumbers(this.checked); }); }
}

function bindBankCashTypes() {
    var addBankBtn = document.getElementById('add-bank-type');
    if (addBankBtn && !addBankBtn.dataset.bound) {
        addBankBtn.dataset.bound = '1';
        addBankBtn.addEventListener('click', function () {
            var inp = document.getElementById('new-bank-type'); var v = inp.value.trim();
            if (!v || state.bankTypes.indexOf(v) !== -1) return;
            state.bankTypes.push(v); saveState(LS_KEYS.BANK_TYPES); inp.value = '';
            renderChips('bank-types-list', state.bankTypes, 'bankTypes');
        });
    }
    var addCashBtn = document.getElementById('add-cash-type');
    if (addCashBtn && !addCashBtn.dataset.bound) {
        addCashBtn.dataset.bound = '1';
        addCashBtn.addEventListener('click', function () {
            var inp = document.getElementById('new-cash-type'); var v = inp.value.trim();
            if (!v || state.cashTypes.indexOf(v) !== -1) return;
            state.cashTypes.push(v); saveState(LS_KEYS.CASH_TYPES); inp.value = '';
            renderChips('cash-types-list', state.cashTypes, 'cashTypes');
        });
    }
}

function bindSmsButtons() {
    function onSmsAutoRead(val) { state.smsAutoRead = val; DB.save(LS_KEYS.SMS_AUTO_READ, val); var e1 = document.getElementById('sms-auto-read'); var e2 = document.getElementById('set-sms-auto-read'); if (e1) e1.checked = val; if (e2) e2.checked = val; }
    var sar = document.getElementById('sms-auto-read'); if (sar && !sar.dataset.bound) { sar.dataset.bound = '1'; sar.addEventListener('change', function () { onSmsAutoRead(this.checked); }); }
    var ssar = document.getElementById('set-sms-auto-read'); if (ssar && !ssar.dataset.bound) { ssar.dataset.bound = '1'; ssar.addEventListener('change', function () { onSmsAutoRead(this.checked); }); }
    var readClip = document.getElementById('sms-read-clip'); if (readClip && !readClip.dataset.bound) { readClip.dataset.bound = '1'; readClip.addEventListener('click', function () { if (typeof readClipboardAndAdd === 'function') readClipboardAndAdd(false); }); }
    var parseSms = document.getElementById('parse-sms'); if (parseSms && !parseSms.dataset.bound) {
        parseSms.dataset.bound = '1';
        parseSms.addEventListener('click', function () {
            var text = document.getElementById('sms-text').value; if (!text.trim()) return;
            if (typeof addSmsToInbox === 'function') {
                var res = addSmsToInbox(text, 'paste');
                if (res.ok) { showToast('✅ اضافه شد'); document.getElementById('sms-text').value = ''; if (typeof renderSmsInbox === 'function') renderSmsInbox(); if (typeof updateSmsBadge === 'function') updateSmsBadge(); }
            }
        });
    }
    var clearSms = document.getElementById('clear-sms'); if (clearSms && !clearSms.dataset.bound) { clearSms.dataset.bound = '1'; clearSms.addEventListener('click', function () { document.getElementById('sms-text').value = ''; document.getElementById('sms-result').innerHTML = ''; }); }
    var smsClearConv = document.getElementById('sms-clear-converted'); if (smsClearConv && !smsClearConv.dataset.bound) { smsClearConv.dataset.bound = '1'; smsClearConv.addEventListener('click', function () { if (!confirm('حذف تبدیل‌شده‌ها؟')) return; if (typeof getSmsInbox === 'function') { var l = getSmsInbox().filter(function (s) { return s.status === 'new'; }); if (typeof saveSmsInbox === 'function') saveSmsInbox(l); if (typeof renderSmsInbox === 'function') renderSmsInbox(); if (typeof updateSmsBadge === 'function') updateSmsBadge(); } }); }
}

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

function bindModalClosers() {
    var closeVp = document.getElementById('close-vpreview'); if (closeVp && typeof closeVoucherPreview === 'function') closeVp.addEventListener('click', closeVoucherPreview);
    var vpClose = document.getElementById('vpreview-close-btn'); if (vpClose && typeof closeVoucherPreview === 'function') vpClose.addEventListener('click', closeVoucherPreview);
    var vpOv = document.getElementById('vpreview-overlay'); if (vpOv && typeof closeVoucherPreview === 'function') vpOv.addEventListener('click', closeVoucherPreview);
    var closeTo = document.getElementById('close-turnover'); if (closeTo && typeof closeTurnover === 'function') closeTo.addEventListener('click', closeTurnover);
    var toClose = document.getElementById('turnover-close-btn'); if (toClose && typeof closeTurnover === 'function') toClose.addEventListener('click', closeTurnover);
    var toOv = document.getElementById('turnover-overlay'); if (toOv && typeof closeTurnover === 'function') toOv.addEventListener('click', closeTurnover);
    var closeIv = document.getElementById('close-imgview'); if (closeIv) closeIv.addEventListener('click', function () { document.getElementById('imgview-modal').classList.remove('show'); document.getElementById('imgview-overlay').classList.remove('show'); });
    var closeNv = document.getElementById('close-noteview'); if (closeNv && typeof closeNoteView === 'function') closeNv.addEventListener('click', closeNoteView);
}

function bindFilterInputs() {
    var filterMap = { 'fiscal-filter': 'renderFiscalList', 'persons-filter': 'renderPersonsList', 'comp-filter': 'renderCompaniesList', 'ba-filter': 'renderBankAccountsList', 'cb-filter': 'renderCashBoxesList', 'proj-filter': 'renderProjectsList', 'fac-filter': 'renderFacilitiesList', 'cfs-filter': 'renderCfsList', 'est-filter': 'renderEstimateList', 'users-filter': 'renderUsersList' };
    Object.keys(filterMap).forEach(function (id) {
        var el = document.getElementById(id);
        if (!el || el.dataset.bound) return;
        el.dataset.bound = '1';
        var fn = filterMap[id];
        el.addEventListener('input', function () { if (typeof window[fn] === 'function') window[fn](); });
    });
}

function bindExportButtons() {
    var eB = document.querySelectorAll('.export-btn[data-export]');
    for (var e = 0; e < eB.length; e++) {
        if (eB[e].dataset.bound) continue;
        eB[e].dataset.bound = '1';
        eB[e].addEventListener('click', function () { if (typeof exportToCsv === 'function') exportToCsv(this.getAttribute('data-export'), this.getAttribute('data-export')); });
    }
}

function startApp() {
    if (window._parsisAppStarted) return;
    window._parsisAppStarted = true;
    console.log('🚀 Starting heavy app components...');

    try { if (typeof applyTheme === 'function') applyTheme(state.theme); } catch(e){}
    try { if (typeof applyFont === 'function') applyFont(state.font); } catch(e){}
    try {
        if (typeof renderChips === 'function') {
            renderChips('bank-types-list', state.bankTypes, 'bankTypes');
            renderChips('cash-types-list', state.cashTypes, 'cashTypes');
        }
    } catch(e){}
    try { if (typeof setupTabs === 'function') setupTabs(); } catch(e){}
    try { if (typeof setupSorting === 'function') setupSorting(); } catch(e){}
    try { if (typeof initCalendarListeners === 'function') initCalendarListeners(); } catch(e){}
    try { if (typeof initCalculator === 'function') initCalculator(); } catch(e){}
    try { if (typeof initSidebarSearch === 'function') initSidebarSearch(); } catch(e){}
    try { if (typeof initHomeSwipe === 'function') initHomeSwipe(); } catch(e){}

    if (DB.load('accounts', []).length > 0) { var ldc = document.getElementById('load-default-chart'); if (ldc) ldc.disabled = true; }
    if (!DB.load('voucherTemplates', null) && typeof getDefaultTemplates === 'function') DB.save('voucherTemplates', getDefaultTemplates());
    if (!DB.load('standardDescriptions', null) && typeof getDefaultStdDescriptions === 'function') DB.save('standardDescriptions', getDefaultStdDescriptions());

    try { if (typeof refreshStdDescDatalist === 'function') refreshStdDescDatalist(); } catch(e){}
    try { if (typeof refreshTemplateSelect === 'function') refreshTemplateSelect(); } catch(e){}
    try { if (typeof renderTemplateList === 'function') renderTemplateList(); } catch(e){}
    try { if (typeof applyWidgetVisibility === 'function') applyWidgetVisibility(); } catch(e){}
    try { if (typeof renderWidgetOrderUI === 'function') renderWidgetOrderUI(); } catch(e){}
    try { if (typeof renderFrequentNav === 'function') renderFrequentNav(); } catch(e){}
    try { if (typeof renderSmsInbox === 'function') renderSmsInbox(); } catch(e){}
    try { if (typeof updateSmsBadge === 'function') updateSmsBadge(); } catch(e){}

    var binds = [bindSettingsButtons, bindCurrencyHide, bindBankCashTypes, bindSmsButtons, bindBaseDataForms, bindCashForms, bindVoucherTemplatesForms, bindModalClosers, bindFilterInputs, bindExportButtons];
    binds.forEach(function (fn) { try { fn(); } catch (e) { console.warn(e); } });

    try { if (typeof initUsersPage === 'function') initUsersPage(); } catch(e){}
    try { if (typeof updateDateDisplay === 'function') updateDateDisplay(); } catch(e){}
    try { if (typeof updateTopbarPeriod === 'function') updateTopbarPeriod(); } catch(e){}
    try { if (typeof updateHomeWidgets === 'function') updateHomeWidgets(); } catch(e){}
    try { if (typeof updateEyeButtons === 'function') updateEyeButtons(); } catch(e){}

    setInterval(function () { if (typeof updateDateDisplay === 'function') updateDateDisplay(); if (typeof updateTopbarPeriod === 'function') updateTopbarPeriod(); }, 60000);

    if (typeof newVoucherForm === 'function') { var vIdEl = document.getElementById('v-id'); if (vIdEl && !vIdEl.value) newVoucherForm(); }

    try { if (typeof attachDatePickers === 'function') attachDatePickers(); } catch(e){}
    try { if (typeof buildHeaderButtons === 'function') buildHeaderButtons(); } catch(e){}
    try { if (typeof makeAllTablesResizable === 'function') makeAllTablesResizable(); } catch(e){}

    setTimeout(function () { if (typeof fetchLiveRates === 'function') fetchLiveRates(true); }, 1500);
    setInterval(function () { if (state.widgets.liveRates && typeof fetchLiveRates === 'function') fetchLiveRates(true); }, 300000);

    function autoRead() { if (!state.smsAutoRead || typeof readClipboardAndAdd !== 'function') return; setTimeout(function () { readClipboardAndAdd(true); }, 700); }
    window.addEventListener('focus', autoRead);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') autoRead(); });

    try { if (typeof aiInit === 'function') aiInit(); } catch(e){}
    try { if (typeof aiRender === 'function') aiRender(); } catch(e){}
    try { if (typeof renderEstimateItems === 'function') renderEstimateItems(); } catch(e){}
    
    console.log('🎉 ' + APP_NAME + ' v' + APP_VERSION + ' — آماده است.');
}

function init() {
    if (typeof bindAuthUI === 'function') bindAuthUI();
    if (typeof initUsers === 'function') initUsers();

    var isLogged = false;
    if (typeof checkAuth === 'function') {
        isLogged = checkAuth();
    }

    var overlay = document.getElementById('login-overlay');
    var app = document.getElementById('app');
    var welcome = document.getElementById('welcome-overlay');

    if (isLogged) {
        if (overlay) overlay.style.display = 'none';
        if (app) app.style.display = 'block';
        if (welcome) {
            welcome.style.display = 'none';
            if (welcome.parentNode) welcome.parentNode.removeChild(welcome);
        }
        
        // تاخیر خیلی کوتاه برای اینکه مرورگر صفحه سفید را لود کند
        setTimeout(function() {
            startApp();
        }, 50);
    } else {
        if (overlay) overlay.style.display = 'flex';
        if (app) app.style.display = 'none';
    }
}

window.startApp = startApp;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(function (e) { console.log('SW register failed:', e); });
}
