/* ============================================================
   پارسیس — تم و فونت
   مسیر: js/ui/theme.js
   وابستگی: constants.js, state.js, db.js
   ============================================================ */
'use strict';

/* ============================================================
   بخش ۱ — تم‌ها
   ============================================================ */
var THEMES = [
    'sky', 'beige', 'jade', 'ocean', 'sunset', 'forest',
    'midnight', 'glass3d', 'neu3d', 'cyber3d', 'gold3d'
];

function applyTheme(theme) {
    if (!theme) return;
    /* حذف همه کلاس‌های تم قبلی */
    for (var i = 0; i < THEMES.length; i++) {
        document.body.classList.remove('theme-' + THEMES[i]);
    }
    document.body.classList.add('theme-' + theme);

    /* آپدیت کارت فعال در تنظیمات */
    var cards = document.querySelectorAll('.theme-card');
    for (var j = 0; j < cards.length; j++) {
        cards[j].classList.toggle('active',
            cards[j].getAttribute('data-theme') === theme);
    }
}

/* ============================================================
   بخش ۲ — فونت‌ها
   ============================================================ */
var FONTS = ['bnazanin', 'bsans', 'tahoma'];

function applyFont(font) {
    if (!font) return;
    for (var i = 0; i < FONTS.length; i++) {
        document.body.classList.remove('font-' + FONTS[i]);
    }
    document.body.classList.add('font-' + font);

    var cards = document.querySelectorAll('.font-card');
    for (var j = 0; j < cards.length; j++) {
        cards[j].classList.toggle('active',
            cards[j].getAttribute('data-font') === font);
    }
}

/* ============================================================
   بخش ۳ — اتصال دکمه‌های انتخاب تم و فونت
   ============================================================ */
function bindThemeFontButtons() {
    var tC = document.querySelectorAll('.theme-card');
    for (var i = 0; i < tC.length; i++) {
        tC[i].addEventListener('click', function () {
            state.theme = this.getAttribute('data-theme');
            DB.save(LS_KEYS.THEME, state.theme);
            applyTheme(state.theme);
        });
    }

    var fC = document.querySelectorAll('.font-card');
    for (var j = 0; j < fC.length; j++) {
        fC[j].addEventListener('click', function () {
            state.font = this.getAttribute('data-font');
            DB.save(LS_KEYS.FONT, state.font);
            applyFont(state.font);
        });
    }
}

/* ============================================================
   صادرسازی
   ============================================================ */
window.THEMES               = THEMES;
window.FONTS                = FONTS;
window.applyTheme           = applyTheme;
window.applyFont            = applyFont;
window.bindThemeFontButtons = bindThemeFontButtons;

console.log('✅ [ui/theme.js] loaded');
