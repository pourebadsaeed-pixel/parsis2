/* ============================================================
   پارسیس — ثابت‌های سراسری
   مسیر: js/core/constants.js
   ============================================================ */
'use strict';

var APP_NAME    = 'پارسیس';
var APP_VERSION = '2.0.0';

var JALALI_MONTHS = [
    'فروردین', 'اردیبهشت', 'خرداد',
    'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر',
    'دی', 'بهمن', 'اسفند'
];

var GREG_MONTHS = [
    'ژانویه', 'فوریه', 'مارس', 'آپریل', 'مه', 'ژوئن',
    'جولای', 'آگوست', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'
];

var WEEKDAYS_FA = [
    'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه',
    'پنجشنبه', 'جمعه', 'شنبه'
];

var LS_KEYS = {
    THEME:            'theme',
    LANGUAGE:         'language',
    FONT:             'font',
    CURRENCY:         'currency',
    CURRENCY_DISPLAY: 'currencyDisplay',
    HIDE_NUMBERS:     'hideNumbers',
    REPORT_HIDE:      'reportHide',
    BANK_TYPES:       'bankTypes',
    CASH_TYPES:       'cashTypes',
    ACTIVE_PERIOD:    'activePeriodId',
    EXPANDED_NODES:   'expandedNodes',
    WIDGETS:          'widgets',
    WIDGET_ORDER:     'widgetOrder',
    WIDGET_PAGES:     'widgetPages',
    HOME_PAGE:        'homePage',
    SMS_AUTO_READ:    'smsAutoRead',
    RFF_VIEW:         'rffView',
    NOTES_VIEW:       'notesView',
    FORM_USAGE:       'formUsage',
    AI_FAB_POS:       'aiFabPos',
    CARD_COLLAPSED:   'cardCollapsed',
    COL_WIDTHS:       'colWidths',
    COLUMN_ORDERS:    'columnOrders',
    COLUMN_SETTINGS:  'columnSettings',
    TABLE_SORT_STATE: 'tableSortState',
    LIVE_RATES_CACHE: 'liveRatesCache',
    DAILY_CLOSE:      'dailyClosePrices',
    CAL_USER_CATS:    'cal.userCats'
};

var NAVIGABLE_PAGES = {
    'home':                 'صفحه اصلی',
    'dashboard':            'داشبورد مالی',
    'voucher-list':         'فهرست اسناد',
    'voucher-new':          'صدور سند جدید',
    'persons':              'اشخاص',
    'companies':            'شرکت‌ها',
    'bank-accounts':        'حساب‌های بانکی',
    'cash-boxes':           'صندوق‌ها',
    'projects':             'پروژه‌ها',
    'fiscal':               'دوره‌های مالی',
    'chart-define':         'تعریف حساب‌ها',
    'facilities':           'تسهیلات',
    'cashflow-sources':     'منابع دریافتنی',
    'estimate-daily':       'برآورد هزینه‌های روزانه',
    'templates':            'الگوهای سند',
    'notes':                'دفترچه یادداشت',
    'sms':                  'پیامک بانکی',
    'report-cashflow':      'پیش‌بینی روزانه نقدینگی',
    'report-cashflow-desc': 'گردش وجه نقد',
    'report-account':       'مرور حساب‌ها',
    'report-trial':         'تراز آزمایشی',
    'report-incomplete':    'تراکنش‌های تکمیل نشده',
    'report-facility':      'خلاصه تسهیلات',
    'report-facility-full': 'گزارش جامع تسهیلات',
    'report-rates':         'گزارش نرخ ارز و طلا',
    'report-compare':       'گزارش مقایسه‌ای دوره‌ها',
    'daily-close':          'قیمت پایانی روز',
    'jalali-calendar':      'مدیریت تقویم'
};

var PAGE_TITLES_FA = {
    'home':                 { icon: '🏠', title: 'صفحه اصلی' },
    'language':             { icon: '🌐', title: 'زبان' },
    'account-types':        { icon: '📑', title: 'لیست نوع حساب' },
    'bank-types':           { icon: '🏦', title: 'انواع حساب بانکی' },
    'cash-types':           { icon: '💰', title: 'انواع صندوق' },
    'currency':             { icon: '💱', title: 'ارز و واحد پول' },
    'fiscal':               { icon: '📅', title: 'دوره مالی' },
    'chart-define':         { icon: '✏️', title: 'تعریف حساب‌ها' },
    'persons':              { icon: '👥', title: 'اشخاص' },
    'companies':            { icon: '🏢', title: 'شرکت‌ها' },
    'bank-accounts':        { icon: '🏦', title: 'حساب‌های بانکی' },
    'cash-boxes':           { icon: '💰', title: 'صندوق‌ها' },
    'projects':             { icon: '📁', title: 'پروژه‌ها' },
    'estimate-daily':       { icon: '📝', title: 'برآورد هزینه‌های روزانه' },
    'cashflow-sources':     { icon: '📌', title: 'برآورد منابع دریافتنی' },
    'facilities':           { icon: '🏦', title: 'تسهیلات' },
    'voucher-list':         { icon: '📄', title: 'فهرست اسناد' },
    'voucher-new':          { icon: '✏️', title: 'صدور سند' },
    'templates':            { icon: '🧩', title: 'الگوهای سند و شرح استاندارد' },
    'notes':                { icon: '📔', title: 'دفترچه یادداشت' },
    'sms':                  { icon: '📱', title: 'پیامک بانکی' },
    'dashboard':            { icon: '🎯', title: 'داشبورد مالی' },
    'report-cashflow':      { icon: '💵', title: 'پیش‌بینی روزانه نقدینگی' },
    'report-cashflow-desc': { icon: '💸', title: 'گردش وجه نقد' },
    'report-account':       { icon: '📒', title: 'مرور حساب‌ها' },
    'report-trial':         { icon: '⚖️', title: 'تراز آزمایشی' },
    'report-incomplete':    { icon: '🔍', title: 'تراکنش‌های تکمیل نشده' },
    'report-facility':      { icon: '🏦', title: 'خلاصه تسهیلات' },
    'report-facility-full': { icon: '📊', title: 'گزارش جامع تسهیلات' },
    'report-rates':         { icon: '📈', title: 'گزارش نرخ ارز و طلا' },
    'report-compare':       { icon: '📊', title: 'گزارش مقایسه‌ای' },
    'daily-close':          { icon: '📅', title: 'قیمت پایانی روز' },
    'jalali-calendar':      { icon: '📅', title: 'مدیریت تقویم' }
};

var LINK_TYPES = ['person', 'company', 'bank', 'cashbox', 'project', 'facility'];

var LINK_TYPE_NAMES = {
    person:   'اشخاص',
    company:  'شرکت‌ها',
    bank:     'بانکی',
    cashbox:  'صندوق',
    project:  'پروژه',
    facility: 'تسهیلات'
};

var VOUCHER_TYPES = ['general', 'opening', 'establishment', 'closing', 'final'];

var VOUCHER_TYPE_NAMES = {
    general:       'عمومی',
    opening:       'افتتاحیه',
    establishment: 'افتتاحیه استقرار',
    closing:       'بستن حساب',
    final:         'اختتامیه'
};

var FACILITY_CATEGORIES = {
    facility:  'تسهیلات',
    scheduled: 'زمان‌بندی شده'
};

var NOTE_CATEGORIES = [
    { key: 'personal', label: 'شخصی',   icon: '⭐', color: '#8b5cf6', bg: '#f3e8ff' },
    { key: 'family',   label: 'خانواده', icon: '🏠', color: '#ec4899', bg: '#fce7f3' },
    { key: 'work',     label: 'شغلی',   icon: '💼', color: '#0ea5e9', bg: '#e0f2fe' }
];

var CHECKLIST_CATEGORIES = [
    { key: 'personal', label: 'شخصی',   emoji: '⭐', widget: 'todayChecklistPersonal', elId: 'home-today-checklist-personal' },
    { key: 'family',   label: 'خانواده', emoji: '🏠', widget: 'todayChecklistFamily',   elId: 'home-today-checklist-family' },
    { key: 'work',     label: 'شغلی',   emoji: '💼', widget: 'todayChecklistWork',     elId: 'home-today-checklist-work' }
];

var MAX_HOME_PAGES = 4;

window.APP_NAME             = APP_NAME;
window.APP_VERSION          = APP_VERSION;
window.JALALI_MONTHS        = JALALI_MONTHS;
window.GREG_MONTHS          = GREG_MONTHS;
window.WEEKDAYS_FA          = WEEKDAYS_FA;
window.LS_KEYS              = LS_KEYS;
window.NAVIGABLE_PAGES      = NAVIGABLE_PAGES;
window.PAGE_TITLES_FA       = PAGE_TITLES_FA;
window.LINK_TYPES           = LINK_TYPES;
window.LINK_TYPE_NAMES      = LINK_TYPE_NAMES;
window.VOUCHER_TYPES        = VOUCHER_TYPES;
window.VOUCHER_TYPE_NAMES   = VOUCHER_TYPE_NAMES;
window.FACILITY_CATEGORIES  = FACILITY_CATEGORIES;
window.NOTE_CATEGORIES      = NOTE_CATEGORIES;
window.CHECKLIST_CATEGORIES = CHECKLIST_CATEGORIES;
window.MAX_HOME_PAGES       = MAX_HOME_PAGES;

console.log('✅ [core/constants.js] loaded — LS_KEYS keys:', Object.keys(LS_KEYS).length);
