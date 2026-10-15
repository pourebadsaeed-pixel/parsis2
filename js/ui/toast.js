/* ============================================================
   پارسیس — توست (پیام شناور)
   مسیر: js/ui/toast.js
   وابستگی: ندارد
   ============================================================ */
'use strict';

var _toastTimer = null;

function showToast(msg, ms) {
    var t = document.querySelector('.toast');
    if (!t) {
        t = document.createElement('div');
        t.className = 'toast';
        document.body.appendChild(t);
    }
    t.textContent = msg;
    requestAnimationFrame(function () { t.classList.add('show'); });

    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function () {
        t.classList.remove('show');
    }, ms || 3000);
}

window.showToast = showToast;

console.log('✅ [ui/toast.js] loaded');
