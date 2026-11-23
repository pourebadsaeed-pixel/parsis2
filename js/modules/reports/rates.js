/* ============================================================
   پارسیس — دارایی‌های نرخ ارز و طلا
   مسیر: js/modules/reports/rates.js
   ============================================================ */
'use strict';

var RATE_ASSETS = [
    { key: 'usd',          label: '💵 دلار آمریکا',          source: 'json' },
    { key: 'eur',          label: '💶 یورو',                 source: 'json' },
    { key: 'gold_18k',     label: '🥇 طلای ۱۸ عیار (گرم)',   source: 'json' },
    { key: 'gold_24k',     label: '🥇 طلای ۲۴ عیار (گرم)',   source: 'json' },
    { key: 'coin_emami',   label: '🪙 سکه امامی',            source: 'json' },
    { key: 'coin_bahar',   label: '🪙 سکه بهار آزادی',       source: 'json' },
    { key: 'coin_half',    label: '🪙 نیم سکه',              source: 'json' },
    { key: 'coin_quarter', label: '🪙 ربع سکه',              source: 'json' }
];

window.RATE_ASSETS = RATE_ASSETS;

console.log('✅ [modules/reports/rates.js] loaded — 8 assets from market.json');
