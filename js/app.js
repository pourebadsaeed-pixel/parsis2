/* ============================================================
   پارسیس — راه‌اندازی نهایی
   مسیر: js/app.js
   ============================================================ */
'use strict';

function bindSettingsButtons() {
    var settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.onclick = function (e) {
            e.preventDefault();
            var modal = document.getElementById('settings-modal');
            var overlay = document.getElementById('settings-overlay');
            if (modal) modal.classList.add('show');
            if (overlay) overlay.classList.add('show');
            if (typeof renderWidgetOrderUI === 'function') renderWidgetOrderUI();
            if (typeof renderDashboardOrderUI === 'function') renderDashboardOrderUI();
            var aboutEl = document.getElementById('about-version');
            if (aboutEl) aboutEl.textContent = APP_NAME + ' — نسخه ' + toFa(APP_VERSION) + ' (PWA)';
        };
    }
    var closeBtn = document.getElementById('close-settings');
    if (closeBtn) closeBtn.onclick = closeSettings;
    var overlay = document.getElementById('settings-overlay');
    if (overlay) overlay.onclick = closeSettings;
    var backupBtn = document.getElementById('modal-backup-btn');
    if (backupBtn) backupBtn.onclick = downloadBackup;
    var restoreBtn = document.getElementById('modal-restore-btn');
    if (restoreBtn) restoreBtn.onclick = function () { document.getElementById('restore-file').click(); };
    var restoreFile = document.getElementById('restore-file');
    if (restoreFile) restoreFile.onchange = function () { if (this.files[0]) restoreBackup(this.files[0]); this.value = ''; };
    var resetBtn = document.getElementById('modal-reset-btn');
    if (resetBtn) resetBtn.onclick = resetAllData;
}

function bindCurrencyHide() {
    var setLang = document.getElementById('set-language');
    if (setLang && !setLang.dataset.bound) { setLang.dataset.bound = '1'; setLang.value = state.language; setLang.onchange = function () { state.language = this.value; saveState(LS_KEYS.LANGUAGE); }; }
    var setCur = document.getElementById('set-currency');
    if (setCur && !setCur.dataset.bound) { setCur.dataset.bound = '1'; setCur.value = state.currency; setCur.onchange = function () { state.currency = this.value; saveState(LS_KEYS.CURRENCY); }; }
    
    function onCurrencyDisplay(v) {
        state.currencyDisplay = v; saveState(LS_KEYS.CURRENCY_DISPLAY);
        var s1 = document.getElementById('set-currency-display'); var s2 = document.getElementById('set-currency-display2');
        if (s1) s1.value = v; if (s2) s2.value = v;
        if (typeof updateUnitChips === 'function') updateUnitChips();
        if (typeof updateHomeWidgets === 'function') updateHomeWidgets();
        if (typeof rerenderCurrentPage === 'function') rerenderCurrentPage();
    }
    var s1 = document.getElementById('set-currency-display');
    if (s1 && !s1.dataset.bound) { s1.dataset.bound = '1'; s1.onchange = function () { onCurrencyDisplay(this.value); }; }
    var s2 = document.getElementById('set-currency-display2');
    if (s2 && !s2.dataset.bound) { s2.dataset.bound = '1'; s2.value = state.currencyDisplay; s2.onchange = function () { onCurrencyDisplay(this.value); }; }
    
    function onHideNumbers(v) {
        state.hideNumbers = v; saveState(LS_KEYS.HIDE_NUMBERS);
        var cb = document.getElementById('set-hide-numbers'); if (cb) cb.checked = v;
        if (typeof updateEyeButtons === 'function') updateEyeButtons();
        if (typeof updateHomeWidgets === 'function') updateHomeWidgets();
        if (typeof rerenderCurrentPage === 'function') rerenderCurrentPage();
    }
    var hideCb = document.getElementById('set-hide-numbers');
    if (hideCb && !hideCb.dataset.bound) { hideCb.dataset.bound = '1'; hideCb.checked = state.hideNumbers; hideCb.onchange = function () { onHideNumbers(this.checked); }; }
}

function bindBankCashTypes() {
    var addBankBtn = document.getElementById('add-bank-type');
    if (addBankBtn && !addBankBtn.dataset.bound) {
        addBankBtn.dataset.bound = '1';
        addBankBtn.onclick = function () {
            var inp = document.getElementById('new-bank-type');
            var v = (inp.value || '').trim();
            if (!v) { if (typeof showToast === 'function') showToast('⚠️ متن را وارد کنید'); return; }
            if (state.bankTypes.indexOf(v) !== -1) { if (typeof showToast === 'function') showToast('⚠️ این نوع قبلاً وجود دارد'); return; }
            state.bankTypes.push(v);
            saveState(LS_KEYS.BANK_TYPES);
            inp.value = '';
            if (typeof renderChips === 'function') renderChips('bank-types-list', state.bankTypes, 'bankTypes');
            if (typeof refreshBankTypeSelect === 'function') { try { refreshBankTypeSelect(); } catch (e) {} }
            if (typeof showToast === 'function') showToast('✅ نوع بانکی «' + v + '» اضافه شد');
        };
    }

    var addCashBtn = document.getElementById('add-cash-type');
    if (addCashBtn && !addCashBtn.dataset.bound) {
        addCashBtn.dataset.bound = '1';
        addCashBtn.onclick = function () {
            var inp = document.getElementById('new-cash-type');
            var v = (inp.value || '').trim();
            if (!v) { if (typeof showToast === 'function') showToast('⚠️ متن را وارد کنید'); return; }
            if (state.cashTypes.indexOf(v) !== -1) { if (typeof showToast === 'function') showToast('⚠️ این نوع قبلاً وجود دارد'); return; }
            state.cashTypes.push(v);
            saveState(LS_KEYS.CASH_TYPES);
            inp.value = '';
            if (typeof renderChips === 'function') renderChips('cash-types-list', state.cashTypes, 'cashTypes');
            if (typeof refreshCashTypeSelect === 'function') { try { refreshCashTypeSelect(); } catch (e) {} }
            if (typeof showToast === 'function') showToast('✅ نوع صندوق «' + v + '» اضافه شد');
        };
    }

    if (typeof renderChips === 'function') {
        renderChips('bank-types-list', state.bankTypes, 'bankTypes');
        renderChips('cash-types-list', state.cashTypes, 'cashTypes');
    }
}

/* ✅ v10: bindSmsButtons ساده شد — بقیه در sms.js */
function bindSmsButtons() {
    function onSmsAutoRead(val) {
        state.smsAutoRead = val;
        DB.save(LS_KEYS.SMS_AUTO_READ, val);
        var e1 = document.getElementById('sms-auto-read'); if (e1) e1.checked = val;
        var e2 = document.getElementById('set-sms-auto-read'); if (e2) e2.checked = val;
    }
    var ssar = document.getElementById('set-sms-auto-read');
    if (ssar && !ssar.dataset.bound) {
        ssar.dataset.bound = '1';
        ssar.onchange = function () { onSmsAutoRead(this.checked); };
    }
    /* بقیه دکمه‌های SMS توسط bindSmsDelegation در sms.js مدیریت می‌شوند */
}

function bindBaseDataForms() {
    try { if (typeof bindFiscalForm === 'function') bindFiscalForm(); } catch(e){ console.warn(e); }
    try { if (typeof bindPersonsForm === 'function') bindPersonsForm(); } catch(e){ console.warn(e); }
    try { if (typeof bindCompaniesForm === 'function') bindCompaniesForm(); } catch(e){ console.warn(e); }
    try { if (typeof bindBanksForm === 'function') bindBanksForm(); } catch(e){ console.warn(e); }
    try { if (typeof bindCashBoxesForm === 'function') bindCashBoxesForm(); } catch(e){ console.warn(e); }
    try { if (typeof bindProjectsForm === 'function') bindProjectsForm(); } catch(e){ console.warn(e); }
    try { if (typeof bindChartForm === 'function') bindChartForm(); } catch(e){ console.warn(e); }
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
        el.oninput = function () {
            if (typeof window[fn] === 'function') window[fn]();
        };
    });
}

function bindExportButtons() {
    var eB = document.querySelectorAll('.export-btn[data-export]');
    for (var e = 0; e < eB.length; e++) {
        if (eB[e].dataset.bound) continue;
        eB[e].dataset.bound = '1';
        eB[e].onclick = function () {
            if (typeof exportToCsv === 'function') exportToCsv(this.getAttribute('data-export'), this.getAttribute('data-export'));
        };
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

    try { if (typeof bindSidebarNav === 'function') bindSidebarNav(); } catch(e){ console.warn('Sidebar bind error:', e); }
    try { if (typeof bindSettingsButtons === 'function') bindSettingsButtons(); } catch(e){ console.warn('Settings bind error:', e); }

    bindBaseDataForms();
    bindFilterInputs();
    bindExportButtons();

    try { bindBankCashTypes(); } catch(e) { console.warn('BankCashTypes bind error:', e); }
    try { bindSmsButtons(); } catch(e) { console.warn('SmsButtons bind error:', e); }

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
window.bindBankCashTypes = bindBankCashTypes;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
