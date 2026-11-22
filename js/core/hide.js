/* ============================================================
   پارسیس — مخفی‌سازی مبالغ (per-report)
   مسیر: js/core/hide.js
   وابستگی: constants.js, utils.js, state.js, db.js
   ============================================================ */
'use strict';

/* ============================================================
   بخش ۱ — getHideState / setHideState
   ============================================================ */
function getHideState(key) {
    if (!key) return state.hideNumbers;
    var v = state.reportHide[key];
    if (typeof v === 'boolean') return v;
    return state.hideNumbers;
}

function setHideState(key, val) {
    state.reportHide[key] = !!val;
    DB.save(LS_KEYS.REPORT_HIDE, state.reportHide);
    updateEyeButtons();
}

function toggleHideState(key) {
    setHideState(key, !getHideState(key));
}

/* ============================================================
   بخش ۲ — فرمت مبالغ با مخفی‌سازی
   ============================================================ */
function fmtFor(n, key) {
    if (getHideState(key)) return '—';
    return formatMoney(n || 0);
}

function fmtRep(n, key) {
    return fmtFor(n, key);
}

/* ============================================================
   بخش ۳ — آپدیت آیکن‌های چشم
   ============================================================ */
function updateEyeButtons() {
    var btns = document.querySelectorAll('.eye-toggle-btn');
    btns.forEach(function (btn) {
        var key = btn.getAttribute('data-hide-key');
        if (!key) return;
        var hidden = getHideState(key);
        btn.textContent = hidden ? '🙈' : '👁';
        btn.classList.toggle('active', !hidden);
        btn.title = hidden ? 'نمایش مبالغ' : 'مخفی کردن مبالغ';
    });
}

/* ============================================================
   صادرسازی
   ============================================================ */
window.getHideState    = getHideState;
window.setHideState    = setHideState;
window.toggleHideState = toggleHideState;
window.fmtFor          = fmtFor;
window.fmtRep          = fmtRep;
window.updateEyeButtons = updateEyeButtons;

console.log('✅ [core/hide.js] loaded');
