/* ============================================================
   پارسیس — دارایی‌های نرخ ارز و طلا
   مسیر: js/modules/reports/rates.js
   ============================================================ */
'use strict';

var RATE_ASSETS = [
    { key: 'price_dollar_rl', label: '💵 دلار آمریکا',          priceto: 'price_dollar_rl', navasanKey: 'usd',    source: 'fiat', navasanMul: 10 },
    { key: 'price_eur',       label: '💶 یورو',                 priceto: 'price_eur',       navasanKey: 'eur',    source: 'fiat', navasanMul: 10 },
    { key: 'geram18',         label: '🥇 طلای ۱۸ عیار (گرم)',   priceto: 'geram18',         navasanKey: '18ayar', source: 'gold', navasanMul: 10 },
    { key: 'geram24',         label: '🥇 طلای ۲۴ عیار (گرم)',   priceto: 'geram24',         navasanKey: '24ayar', source: 'gold', navasanMul: 10 },
    { key: 'gold_mini_size',  label: '🥇 طلای دسته دوم (گرم)',  priceto: 'gold_mini_size',  navasanKey: '18ayar', source: 'gold', navasanMul: 10 },
    { key: 'sekke_emami',     label: '🪙 سکه امامی',            priceto: 'sekke_emami',     navasanKey: 'sekkeh', source: 'gold', navasanMul: 10 },
    { key: 'sekke_bahar',     label: '🪙 سکه بهار آزادی',       priceto: 'sekke_bahar',     navasanKey: 'bahar',  source: 'gold', navasanMul: 10 },
    { key: 'nim_sekke',       label: '🪙 نیم سکه',              priceto: 'nim_sekke',       navasanKey: 'nim',    source: 'gold', navasanMul: 10 },
    { key: 'rob_sekke',       label: '🪙 ربع سکه',              priceto: 'rob_sekke',       navasanKey: 'rob',    source: 'gold', navasanMul: 10 }
];

window.RATE_ASSETS = RATE_ASSETS;

console.log('✅ [modules/reports/rates.js] loaded — با نمادهای Priceto');
