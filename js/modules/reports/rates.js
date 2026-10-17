/* ============================================================
   پارسیس — دارایی‌های نرخ ارز و طلا
   مسیر: js/modules/reports/rates.js
   
   ⚠️ توجه: گزارش نرخ ارز/طلا و فرم قیمت پایانی روز کلاً حذف شدند.
   این فایل فقط RATE_ASSETS را نگه می‌دارد چون ویجت نرخ لحظه‌ای
   صفحه اصلی (widgets.js) از آن استفاده می‌کند.
   ============================================================ */
'use strict';

var RATE_ASSETS = [
    { key: 'price_dollar_rl', label: '💵 دلار آمریکا',          priceto: '', navasanKey: 'usd',    source: 'fiat', navasanMul: 10 },
    { key: 'geram18',         label: '🥇 طلای ۱۸ عیار (گرم)',   priceto: '', navasanKey: '18ayar', source: 'gold', navasanMul: 10 },
    { key: 'geram24',         label: '🥇 طلای ۲۴ عیار (گرم)',   priceto: '', navasanKey: '24ayar', source: 'gold', navasanMul: 10 },
    { key: 'gold_mini_size',  label: '🥇 طلای دسته دوم (گرم)',  priceto: '', navasanKey: '18ayar', source: 'gold', navasanMul: 10 },
    { key: 'sekke_emami',     label: '🪙 سکه امامی',            priceto: '', navasanKey: 'sekkeh', source: 'gold', navasanMul: 10 },
    { key: 'sekke_bahar',     label: '🪙 سکه بهار آزادی',       priceto: '', navasanKey: 'bahar',  source: 'gold', navasanMul: 10 },
    { key: 'nim_sekke',       label: '🪙 نیم سکه',              priceto: '', navasanKey: 'nim',    source: 'gold', navasanMul: 10 },
    { key: 'rob_sekke',       label: '🪙 ربع سکه',              priceto: '', navasanKey: 'rob',    source: 'gold', navasanMul: 10 }
];

window.RATE_ASSETS = RATE_ASSETS;

console.log('✅ [modules/reports/rates.js] loaded — RATE_ASSETS only');
