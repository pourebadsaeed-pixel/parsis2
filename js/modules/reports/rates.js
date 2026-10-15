/* ============================================================
   پارسیس — گزارش نرخ ارز و طلا + قیمت پایانی روز
   مسیر: js/modules/reports/rates.js
   وابستگی: core/* + ui/*
   ============================================================ */
'use strict';

/* ============================================================
   بخش ۱ — دارایی‌های تحت پیگیری
   ============================================================ */
var RATE_ASSETS = [
    { key: 'price_dollar_rl', label: '💵 دلار آمریکا',          priceto: '',            navasanKey: 'usd',        source: 'fiat', navasanMul: 10 },
    { key: 'geram18',         label: '🥇 طلای ۱۸ عیار (گرم)',   priceto: '',            navasanKey: '18ayar',     source: 'gold', navasanMul: 10 },
    { key: 'geram24',         label: '🥇 طلای ۲۴ عیار (گرم)',   priceto: '',            navasanKey: '24ayar',     source: 'gold', navasanMul: 10 },
    { key: 'gold_mini_size',  label: '🥇 طلای دسته دوم (گرم)',  priceto: '',            navasanKey: '18ayar',     source: 'gold', navasanMul: 10 },
    { key: 'sekke_emami',     label: '🪙 سکه امامی',            priceto: '',            navasanKey: 'sekkeh',     source: 'gold', navasanMul: 10 },
    { key: 'sekke_bahar',     label: '🪙 سکه بهار آزادی',       priceto: '',            navasanKey: 'bahar',      source: 'gold', navasanMul: 10 },
    { key: 'nim_sekke',       label: '🪙 نیم سکه',              priceto: '',            navasanKey: 'nim',        source: 'gold', navasanMul: 10 },
    { key: 'rob_sekke',       label: '🪙 ربع سکه',              priceto: '',            navasanKey: 'rob',        source: 'gold', navasanMul: 10 }
];

/* ============================================================
   بخش ۲ — قیمت پایانی روز
   ============================================================ */
function getDailyCloseData() {
    return DB.load(LS_KEYS.DAILY_CLOSE, []);
}

function saveDailyCloseData(list) {
    DB.save(LS_KEYS.DAILY_CLOSE, list);
}

/* ============================================================
   بخش ۳ — گزارش نرخ ارز و طلا
   ============================================================ */
function runRatesReport() {
    var asset = (document.getElementById('rr-asset') || {}).value || 'price_dollar_rl';
    var range = (document.getElementById('rr-range') || {}).value || '30d';
    var box = document.getElementById('rr-result');
    if (!box) return;

    var hide = getHideState('rr');
    var days = range === '7d' ? 7 : (range === '30d' ? 30 : 90);

    var allData = getDailyCloseData();

    /* اگر داده‌ای نیست، پیام بده */
    if (allData.length === 0) {
        box.innerHTML = '<div class="widget-empty">📅 هنوز قیمت پایانی‌ای ذخیره نشده است. ابتدا از «📅 قیمت پایانی روز» استفاده کنید.</div>';
        document.getElementById('rr-count').textContent = '۰';
        return;
    }

    /* فیلتر بازه */
    var cutoffTs = Date.now() - days * 24 * 60 * 60 * 1000;
    var points = allData.filter(function (x) {
        var parts = x.date.split('/').map(Number);
        if (parts.length !== 3) return false;
        var g = jalaliToGregorian(parts[0], parts[1], parts[2]);
        var ts = new Date(g[0], g[1] - 1, g[2]).getTime();
        return ts >= cutoffTs;
    });

    points.sort(function (a, b) { return a.date.localeCompare(b.date); });

    if (points.length === 0) {
        box.innerHTML = '<div class="widget-empty">داده‌ای در این بازه وجود ندارد.</div>';
        document.getElementById('rr-count').textContent = '۰';
        return;
    }

    var html = '<div class="table-wrap"><table class="report-table" id="rr-table"><thead><tr>'
        + '<th>#</th><th>تاریخ</th><th>قیمت (ریال)</th><th>تغییر</th><th>درصد</th>'
        + '</tr></thead><tbody>';

    var prev = null;
    for (var j = 0; j < points.length; j++) {
        var p = points[j];
        var price = (p.values && p.values[asset]) || 0;
        var change = prev !== null ? price - prev : 0;
        var pct = prev ? (change / prev * 100) : 0;
        var chgCls = change > 0 ? 'cr' : (change < 0 ? 'dr' : '');
        var sign = change > 0 ? '+' : '';

        html += '<tr><td class="num">' + toFa(j + 1) + '</td>'
            + '<td dir="ltr">' + toFa(esc(p.date)) + '</td>'
            + '<td class="num" style="font-weight:bold">' + (hide ? '—' : formatRial(price)) + '</td>'
            + '<td class="num ' + chgCls + '">'
            + (!hide && prev !== null ? sign + formatRial(change) : '—') + '</td>'
            + '<td class="num ' + chgCls + '">'
            + (!hide && prev !== null ? sign + toFa(Math.abs(pct).toFixed(2)) + '٪' : '—') + '</td></tr>';

        prev = price;
    }

    html += '</tbody></table></div>';

    box.innerHTML = html;
    document.getElementById('rr-count').textContent = toFa(points.length) + ' ردیف';

    var unitEl = document.getElementById('rr-unit');
    if (unitEl) unitEl.textContent = 'واحد: ریال';

    if (typeof autoAttachReportHelpers === 'function') autoAttachReportHelpers();
}

/* ============================================================
   بخش ۴ — قیمت پایانی روز
   ============================================================ */
function renderDailyClosePage() {
    var today = todayJalaliStr();
    var dateEl = document.getElementById('dc-date');
    if (dateEl && !dateEl.value) dateEl.value = today;

    var list = getDailyCloseData();
    var box = document.getElementById('dc-result');
    if (!box) return;

    var hide = getHideState('dc');

    /* فرم ورودی */
    var html = '';
    for (var i = 0; i < RATE_ASSETS.length; i++) {
        var a = RATE_ASSETS[i];
        var existing = list.find(function (x) { return x.date === today; });
        var val = (existing && existing.values && existing.values[a.key]) || 0;

        html += '<div class="close-price-row">'
             +  '<span class="cp-name">' + a.label + '</span>'
             +  '<input type="text" class="money-input" inputmode="numeric" dir="ltr" '
             +  'value="' + (val ? formatRaw(val) : '') + '" '
             +  'data-dc-key="' + a.key + '" '
             +  'style="width:150px;text-align:center;padding:8px 10px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-size:0.85rem;">'
             +  '</div>';
    }
    html += '<div class="form-buttons" style="margin-top:14px;justify-content:center">'
         +  '<button id="dc-save-btn" class="btn-primary">💾 ذخیره قیمت‌های پایانی (ریال)</button>'
         +  '</div>';

    box.innerHTML = html;

    document.getElementById('dc-count').textContent = toFa(RATE_ASSETS.length) + ' قلم';
    document.getElementById('dc-unit').textContent = 'واحد: ریال';

    /* اتصال input ها */
    var inputs = box.querySelectorAll('[data-dc-key]');
    for (var k = 0; k < inputs.length; k++) {
        (function (inp) {
            inp.addEventListener('input', function () {
                var v = normalizeDigits(this.value);
                var r = v.replace(/[^\d]/g, '');
                this.value = r;
            });
            inp.addEventListener('blur', function () {
                var v = Number(normalizeDigits(this.value).replace(/[^\d]/g, '')) || 0;
                this.value = v ? formatRaw(v) : '';
            });
        })(inputs[k]);
    }

    var saveBtn = document.getElementById('dc-save-btn');
    if (saveBtn) saveBtn.addEventListener('click', saveDailyClosePrices);

    renderDailyCloseHistory();
    if (typeof autoAttachReportHelpers === 'function') autoAttachReportHelpers();
}

function saveDailyClosePrices() {
    var dateInput = document.getElementById('dc-date');
    var date = normalizeDigits(dateInput.value.trim());
    if (!date) { alert('تاریخ اجباری است.'); return; }

    var values = {};
    var inputs = document.querySelectorAll('#dc-result [data-dc-key]');
    for (var i = 0; i < inputs.length; i++) {
        var key = inputs[i].getAttribute('data-dc-key');
        var raw = normalizeDigits(inputs[i].value).replace(/[^\d]/g, '');
        values[key] = Number(raw) || 0;
    }

    var list = getDailyCloseData();
    var idx = list.findIndex(function (x) { return x.date === date; });
    var entry = { date: date, values: values, savedAt: Date.now() };

    if (idx >= 0) list[idx] = entry;
    else list.push(entry);

    list.sort(function (a, b) { return b.date.localeCompare(a.date); });
    saveDailyCloseData(list);

    showToast('✅ قیمت‌های پایانی ' + toFa(date) + ' ذخیره شد.');
    renderDailyCloseHistory();
}

function renderDailyCloseHistory() {
    var box = document.getElementById('dc-history-list');
    if (!box) return;

    var list = getDailyCloseData();
    var hide = getHideState('dc');

    if (list.length === 0) {
        box.innerHTML = '<div class="widget-empty">هنوز قیمتی ذخیره نشده است.</div>';
        return;
    }

    var html = '<div class="table-wrap"><table class="data-table" id="dc-table"><thead><tr><th>تاریخ</th>';
    for (var i = 0; i < RATE_ASSETS.length; i++) {
        html += '<th>' + RATE_ASSETS[i].label.replace(/^[^\s]+\s/, '') + '</th>';
    }
    html += '<th>عملیات</th></tr></thead><tbody>';

    for (var j = 0; j < list.length; j++) {
        var row = list[j];
        html += '<tr><td dir="ltr">' + toFa(esc(row.date)) + '</td>';
        for (var k = 0; k < RATE_ASSETS.length; k++) {
            var v = (row.values && row.values[RATE_ASSETS[k].key]) || 0;
            html += '<td class="num">' + (v && !hide ? formatRial(v) : '—') + '</td>';
        }
        html += '<td><div class="row-actions">'
             +  '<button class="row-btn edit" data-dc-edit="' + row.date + '">✎</button>'
             +  '<button class="row-btn del" data-dc-del="' + row.date + '">×</button>'
             +  '</div></td></tr>';
    }

    html += '</tbody></table></div>';
    box.innerHTML = html;

    var editBtns = box.querySelectorAll('[data-dc-edit]');
    for (var e = 0; e < editBtns.length; e++) {
        editBtns[e].addEventListener('click', function () {
            var date = this.getAttribute('data-dc-edit');
            var entry = getDailyCloseData().find(function (x) { return x.date === date; });
            if (!entry) return;

            document.getElementById('dc-date').value = entry.date;
            var inputs = document.querySelectorAll('#dc-result [data-dc-key]');
            for (var ii = 0; ii < inputs.length; ii++) {
                var key = inputs[ii].getAttribute('data-dc-key');
                var v = (entry.values && entry.values[key]) || 0;
                inputs[ii].value = v ? formatRaw(v) : '';
            }
            showToast('📝 ویرایش کنید و ذخیره کنید.');
        });
    }

    var delBtns = box.querySelectorAll('[data-dc-del]');
    for (var d = 0; d < delBtns.length; d++) {
        delBtns[d].addEventListener('click', function () {
            var date = this.getAttribute('data-dc-del');
            if (!confirm('حذف قیمت‌های پایانی ' + toFa(date) + '؟')) return;
            var newList = getDailyCloseData().filter(function (x) { return x.date !== date; });
            saveDailyCloseData(newList);
            renderDailyCloseHistory();
            showToast('🗑 حذف شد.');
        });
    }

    if (typeof autoAttachReportHelpers === 'function') autoAttachReportHelpers();
}

/* ============================================================
   بخش ۵ — اتصال دکمه‌ها
   ============================================================ */
function bindRatesReportButtons() {
    var rrRun = document.getElementById('rr-run');
    if (rrRun) rrRun.addEventListener('click', runRatesReport);

    var dcSave = document.getElementById('dc-save');
    if (dcSave) dcSave.addEventListener('click', function () {
        var box = document.getElementById('dc-result');
        if (!box || box.querySelector('.widget-empty')) {
            renderDailyClosePage();
        }
    });
}

/* ============================================================
   صادرسازی
   ============================================================ */
window.RATE_ASSETS              = RATE_ASSETS;
window.getDailyCloseData        = getDailyCloseData;
window.saveDailyCloseData       = saveDailyCloseData;
window.runRatesReport           = runRatesReport;
window.renderDailyClosePage     = renderDailyClosePage;
window.saveDailyClosePrices     = saveDailyClosePrices;
window.renderDailyCloseHistory  = renderDailyCloseHistory;
window.bindRatesReportButtons   = bindRatesReportButtons;

console.log('✅ [modules/reports/rates.js] loaded');
