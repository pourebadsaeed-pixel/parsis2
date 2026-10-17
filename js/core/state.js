/* ============================================================
   پارسیس — وضعیت سراسری + migrations اولیه
   مسیر: js/core/state.js
   ============================================================ */
'use strict';

/* ============================================================
   بخش ۱ — تعریف state مرکزی
   ============================================================ */
var state = {
    /* ظاهر */
    theme:           DB.load(LS_KEYS.THEME, 'sky'),
    language:        DB.load(LS_KEYS.LANGUAGE, 'fa'),
    font:            DB.load(LS_KEYS.FONT, 'tahoma'),

    /* واحد پول و نمایش */
    currency:        DB.load(LS_KEYS.CURRENCY, 'rial'),
    currencyDisplay: DB.load(LS_KEYS.CURRENCY_DISPLAY, 'rial'),
    hideNumbers:     DB.load(LS_KEYS.HIDE_NUMBERS, true),
    reportHide:      DB.load(LS_KEYS.REPORT_HIDE, {}),

    /* انواع پایه */
    bankTypes:       DB.load(LS_KEYS.BANK_TYPES, ['جاری', 'پس‌انداز', 'قرض‌الحسنه']),
    cashTypes:       DB.load(LS_KEYS.CASH_TYPES, ['نقد', 'طلا', 'ارز دیجیتال']),

    /* دوره فعال */
    activePeriodId:  DB.load(LS_KEYS.ACTIVE_PERIOD, ''),

    /* درخت‌های باز شده */
    expandedNodes:       DB.load(LS_KEYS.EXPANDED_NODES, {}),
    reportExpandedNodes: {},

    /* ویجت‌های صفحه اصلی */
    widgets: DB.load(LS_KEYS.WIDGETS, {
        calendar: true,
        calendarNext3: false,
        calendarDay: false,
        calendarAgenda: false,
        todayChecklistPersonal: true,
        todayChecklistFamily:   true,
        todayChecklistWork:     true,
        bankTotal: true,
        bankBalances: true,
        cashBalances: true,
        upcomingInstallments: true,
        birthdays: true,
        liveRates: true,
        tgjuCoins: true // ✅ ویجت جدید
    }),

    widgetOrder: DB.load(LS_KEYS.WIDGET_ORDER, [
        'calendar', 'calendarNext3', 'calendarDay', 'calendarAgenda',
        'todayChecklistPersonal', 'todayChecklistFamily', 'todayChecklistWork',
        'bankTotal', 'cashBalances', 'bankBalances',
        'upcomingInstallments', 'birthdays', 'liveRates', 'tgjuCoins' // ✅ اضافه شد
    ]),

    widgetPages: DB.load(LS_KEYS.WIDGET_PAGES, {
        calendar:               1,
        calendarNext3:          4,
        calendarDay:            4,
        calendarAgenda:         4,
        todayChecklistPersonal: 1,
        todayChecklistFamily:   1,
        todayChecklistWork:     1,
        bankTotal:              1,
        cashBalances:           2,
        bankBalances:           2,
        upcomingInstallments:   1,
        birthdays:              3,
        liveRates:              3,
        tgjuCoins:              2 // ✅ پیش‌فرض در صفحه ۲
    }),

    homePage:        DB.load(LS_KEYS.HOME_PAGE, 1),
    smsAutoRead:     DB.load(LS_KEYS.SMS_AUTO_READ, false),
    rffView:         DB.load(LS_KEYS.RFF_VIEW, 'summary'),
    notesView:       DB.load(LS_KEYS.NOTES_VIEW, 'all'),
    formUsage:       DB.load(LS_KEYS.FORM_USAGE, {}),
    aiFabPos:        DB.load(LS_KEYS.AI_FAB_POS, { left: 22, bottom: 22 }),
    cardCollapsed:   DB.load(LS_KEYS.CARD_COLLAPSED, {})
};

/* ============================================================
   بخش ۲ — ذخیره‌سازی state
   ============================================================ */
function saveState(k) {
    if (!k) return;
    DB.save(k, state[k]);
}

/* ============================================================
   بخش ۳ — نرمال‌سازی خودکار
   ============================================================ */
(function normalizeWidgetState() {
    var allKeys = [
        'calendar', 'calendarNext3', 'calendarDay', 'calendarAgenda',
        'todayChecklistPersonal', 'todayChecklistFamily', 'todayChecklistWork',
        'bankTotal', 'bankBalances', 'cashBalances',
        'upcomingInstallments', 'birthdays', 'liveRates', 'tgjuCoins' // ✅
    ];

    var order = (state.widgetOrder || []).slice();
    allKeys.forEach(function (k) {
        if (order.indexOf(k) === -1) order.push(k);
    });
    state.widgetOrder = order.filter(function (k) {
        return allKeys.indexOf(k) !== -1;
    });

    allKeys.forEach(function (k) {
        if (typeof state.widgets[k] === 'undefined') {
            state.widgets[k] = (k.indexOf('calendar') === 0) ? false : true;
        }
    });

    allKeys.forEach(function (k) {
        if (typeof state.widgetPages[k] === 'undefined') {
            state.widgetPages[k] = 1;
        }
    });

    DB.save(LS_KEYS.WIDGET_ORDER, state.widgetOrder);
    DB.save(LS_KEYS.WIDGETS, state.widgets);
    DB.save(LS_KEYS.WIDGET_PAGES, state.widgetPages);
})();

/* ============================================================
   بخش ۴ — Migrations (یکبار در شروع اجرا می‌شوند)
   ============================================================ */
(function runMigrations() {

    /* ---- ۴.۱ — انتقال link → links در حساب‌ها ---- */
    try {
        var accounts = DB.load('accounts', []);
        var changed = false;
        for (var i = 0; i < accounts.length; i++) {
            if (accounts[i].link && !accounts[i].links) {
                accounts[i].links = [accounts[i].link];
                delete accounts[i].link;
                changed = true;
            } else if (!accounts[i].links) {
                accounts[i].links = [];
                changed = true;
            }
            if (typeof accounts[i].cfEffect === 'undefined') {
                accounts[i].cfEffect = false;
                changed = true;
            }
        }
        if (changed) DB.save('accounts', accounts);
    } catch (e) {
        console.warn('[migrate accounts]', e);
    }

    /* ---- ۴.۲ — افزودن archived به یادداشت‌ها ---- */
    try {
        var notes = DB.load('notes', []);
        var nch = false;
        for (var ni = 0; ni < notes.length; ni++) {
            if (typeof notes[ni].archived === 'undefined') {
                notes[ni].archived = false;
                nch = true;
            }
            if (typeof notes[ni].category === 'undefined' || !notes[ni].category) {
                notes[ni].category = 'personal';
                nch = true;
            }
        }
        if (nch) DB.save('notes', notes);
    } catch (e) {
        console.warn('[migrate notes]', e);
    }

    /* ---- ۴.۳ — اطمینان از بازه‌ی درست homePage ---- */
    try {
        var hp = Number(state.homePage || 1);
        if (hp < 1 || hp > MAX_HOME_PAGES) {
            state.homePage = 1;
            DB.save(LS_KEYS.HOME_PAGE, 1);
        }
    } catch (e) {
        console.warn('[migrate homePage]', e);
    }

    /* ---- ۴.۴ — تبدیل todayChecklist قدیمی به ۳ چک‌لیست ---- */
    try {
        var w = DB.load(LS_KEYS.WIDGETS, null);
        if (w && typeof w.todayChecklist !== 'undefined') {
            var oldVal = !!w.todayChecklist;
            if (typeof w.todayChecklistPersonal === 'undefined') w.todayChecklistPersonal = oldVal;
            if (typeof w.todayChecklistFamily === 'undefined')   w.todayChecklistFamily   = oldVal;
            if (typeof w.todayChecklistWork === 'undefined')     w.todayChecklistWork     = oldVal;
            delete w.todayChecklist;
            DB.save(LS_KEYS.WIDGETS, w);
            state.widgets = w;
        }
    } catch (e) {
        console.warn('[migrate todayChecklist]', e);
    }

})();

/* ============================================================
   صادرسازی
   ============================================================ */
window.state     = state;
window.saveState = saveState;

console.log('✅ [core/state.js] loaded');
