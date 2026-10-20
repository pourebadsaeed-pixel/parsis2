/* ============================================================
   پارسیس — راه‌اندازی نهایی برنامه
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
        if (typeof window.logout === 'function') window.logout();
        else if (confirm('رفرش شود؟')) location.reload();
    });
}

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
    if (sar && !sar.dataset.bound) {
        sar.dataset.bound = '1';
        sar.addEventListener('change', function () { onSmsAutoRead(this.checked); });
    }

    var ssar = document.getElementById('set-sms-auto-read');
    if (ssar && !ssar.dataset.bound) {
        ssar.dataset.bound = '1';
        ssar.addEventListener('change', function () { onSmsAutoRead(this.checked); });
    }

    var readClip = document.getElementById('sms-read-clip');
    if (readClip && !readClip.dataset.bound) {
        readClip.dataset.bound = '1';
        readClip.addEventListener('click', function () {
            if (typeof readClipboardAndAdd === 'function') readClipboardAndAdd(false);
            else showToast('⚠️ سیستم پیامک لود نشده.');
        });
    }

    var parseSms = document.getElementById('parse-sms');
    if (parseSms && !parseSms.dataset.bound) {
        parseSms.dataset.bound = '1';
        parseSms.addEventListener('click', function () {
            var text = document.getElementById('sms-text').value;
            if (!text.trim()) {
                alert('متن را وارد کن
