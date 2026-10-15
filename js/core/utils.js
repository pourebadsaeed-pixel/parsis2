/* ============================================================
   پارسیس — ابزارهای پایه (اعداد، ارقام، پول، تاریخ شمسی)
   مسیر: js/core/utils.js
   وابستگی: constants.js
   ============================================================ */
'use strict';

/* ============================================================
   بخش ۱ — اعداد و ارقام فارسی
   ============================================================ */

function toFa(x) {
    if (x === undefined || x === null) return '';
    return String(x).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; });
}

function toFaSimple(x) {
    return String(x).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; });
}

function normalizeDigits(s) {
    if (s === undefined || s === null) return '';
    s = String(s);
    s = s.replace(/[\u06F0-\u06F9]/g, function (d) {
        return String(d.charCodeAt(0) - 0x06F0);
    });
    s = s.replace(/[\u0660-\u0669]/g, function (d) {
        return String(d.charCodeAt(0) - 0x0660);
    });
    s = s.replace(/\u066B/g, '.');
    s = s.replace(/\u060C/g, ',');
    s = s.replace(/\u066C/g, ',');
    return s;
}

function pad2(n) {
    return String(n).length < 2 ? '0' + n : String(n);
}

function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function esc(s) {
    if (s === undefined || s === null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/* ============================================================
   بخش ۲ — پول و واحد
   ============================================================ */

function formatRaw(n) {
    n = Number(n) || 0;
    return Math.round(n).toLocaleString('fa-IR').replace(/\u066C/g, ',');
}

function formatMoney(n) {
    n = Number(n) || 0;
    var mode = (typeof state !== 'undefined' && state.currencyDisplay) || 'rial';
    if (mode === 'toman') return formatRaw(n / 10);
    if (mode === 'million') {
        var v = n / 1000000;
        return v.toLocaleString('fa-IR', { maximumFractionDigits: 3 })
                .replace(/\u066C/g, ',');
    }
    return formatRaw(n);
}

function formatRial(n) {
    n = Number(n) || 0;
    return formatRaw(n);
}

function currencyLabel() {
    var m = (typeof state !== 'undefined' && state.currencyDisplay) || 'rial';
    if (m === 'toman') return 'تومان';
    if (m === 'million') return 'میلیون ریال';
    return 'ریال';
}

function parseMoney(s) {
    var t = String(s).replace(/[^\d\-]/g, '');
    return Number(t) || 0;
}

/* ============================================================
   بخش ۳ — تبدیل تاریخ شمسی / میلادی
   ============================================================ */

function toJalali(gy, gm, gd) {
    var g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    var jy = (gy <= 1600) ? 0 : 979;
    gy -= (gy <= 1600) ? 621 : 1600;
    var gy2 = (gm > 2) ? (gy + 1) : gy;
    var days = (365 * gy)
        + Math.floor((gy2 + 3) / 4)
        - Math.floor((gy2 + 99) / 100)
        + Math.floor((gy2 + 399) / 400)
        - 80 + gd + g_d_m[gm - 1];
    jy += 33 * Math.floor(days / 12053);
    days %= 12053;
    jy += 4 * Math.floor(days / 1461);
    days %= 1461;
    if (days > 365) {
        jy += Math.floor((days - 1) / 365);
        days = (days - 1) % 365;
    }
    var jm = (days < 186)
        ? 1 + Math.floor(days / 31)
        : 7 + Math.floor((days - 186) / 30);
    var jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
    return [jy, jm, jd];
}

function jalaliToGregorian(jy, jm, jd) {
    jy = parseInt(jy); jm = parseInt(jm); jd = parseInt(jd);
    var gy;
    if (jy > 979) { gy = 1600; jy -= 979; } else { gy = 621; }
    var days = (365 * jy)
        + (Math.floor(jy / 33) * 8)
        + Math.floor(((jy % 33) + 3) / 4)
        + 78 + jd
        + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
    gy += 400 * Math.floor(days / 146097);
    days %= 146097;
    if (days > 36524) {
        gy += 100 * Math.floor(--days / 36524);
        days %= 36524;
        if (days >= 365) days++;
    }
    gy += 4 * Math.floor(days / 1461);
    days %= 1461;
    if (days > 365) {
        gy += Math.floor((days - 1) / 365);
        days = (days - 1) % 365;
    }
    var gd = days + 1;
    var leap = (gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0);
    var sal_a = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var gm;
    for (gm = 1; gm <= 12 && gd > sal_a[gm]; gm++) gd -= sal_a[gm];
    return [gy, gm, gd];
}

function isJalaliLeap(jy) {
    var r = jy % 33;
    return [1, 5, 9, 13, 17, 22, 26, 30].indexOf(r) !== -1;
}

function daysInJalaliMonth(jy, jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    return isJalaliLeap(jy) ? 30 : 29;
}

function todayJalaliStr() {
    var d = new Date();
    var j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return j[0] + '/' + pad2(j[1]) + '/' + pad2(j[2]);
}

function jalaliDiff(y1, m1, d1, y2, m2, d2) {
    var g1 = jalaliToGregorian(y1, m1, d1);
    var g2 = jalaliToGregorian(y2, m2, d2);
    var date1 = new Date(g1[0], g1[1] - 1, g1[2]);
    var date2 = new Date(g2[0], g2[1] - 1, g2[2]);
    return Math.round((date2 - date1) / (1000 * 60 * 60 * 24));
}

function addJalaliDays(dateStr, days) {
    if (!dateStr) return '';
    var p = normalizeDigits(dateStr).split('/').map(Number);
    if (p.length !== 3) return '';
    var g = jalaliToGregorian(p[0], p[1], p[2]);
    var dt = new Date(g[0], g[1] - 1, g[2]);
    dt.setDate(dt.getDate() + days);
    var j = toJalali(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
    return j[0] + '/' + pad2(j[1]) + '/' + pad2(j[2]);
}

function tsToJalaliDate(ts) {
    var d = new Date(ts);
    var j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return j[0] + '/' + pad2(j[1]) + '/' + pad2(j[2]);
}

function tsToJalaliTime(ts) {
    var d = new Date(ts);
    return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}

function getJalaliMonthName(m) {
    return JALALI_MONTHS[m - 1] || '';
}

/* ============================================================
   بخش ۴ — نمایش تاریخ در تاپ‌بار
   ============================================================ */

function updateDateDisplay() {
    var d = new Date();
    var j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    var el1 = document.getElementById('date-jalali');
    if (el1) {
        el1.textContent = WEEKDAYS_FA[d.getDay()] + ' '
            + toFa(j[2]) + ' ' + JALALI_MONTHS[j[1] - 1] + ' ' + toFa(j[0])
            + ' مصادف با '
            + d.getDate() + ' ' + GREG_MONTHS[d.getMonth()] + ' ' + d.getFullYear();
    }
    var el2 = document.getElementById('date-gregorian');
    if (el2) el2.textContent = '';
}

/* ============================================================
   بخش ۵ — برچسب‌های فارسی (نوع سند، دسته، لینک)
   ============================================================ */

function voucherTypeName(t) {
    if (VOUCHER_TYPE_NAMES[t]) return VOUCHER_TYPE_NAMES[t];
    return t || 'عمومی';
}

function categoryName(c) {
    if (c === 'facility')  return 'تسهیلات';
    if (c === 'scheduled') return 'زمان‌بندی شده';
    return c || '—';
}

function linkTypeName(t) {
    return LINK_TYPE_NAMES[t] || '';
}

/* ============================================================
   صادرسازی روی window
   ============================================================ */
window.toFa              = toFa;
window.toFaSimple        = toFaSimple;
window.normalizeDigits   = normalizeDigits;
window.pad2              = pad2;
window.uid               = uid;
window.esc               = esc;
window.formatRaw         = formatRaw;
window.formatMoney       = formatMoney;
window.formatRial        = formatRial;
window.currencyLabel     = currencyLabel;
window.parseMoney        = parseMoney;
window.toJalali          = toJalali;
window.jalaliToGregorian = jalaliToGregorian;
window.isJalaliLeap      = isJalaliLeap;
window.daysInJalaliMonth = daysInJalaliMonth;
window.todayJalaliStr    = todayJalaliStr;
window.jalaliDiff        = jalaliDiff;
window.addJalaliDays     = addJalaliDays;
window.tsToJalaliDate    = tsToJalaliDate;
window.tsToJalaliTime    = tsToJalaliTime;
window.getJalaliMonthName = getJalaliMonthName;
window.updateDateDisplay = updateDateDisplay;
window.voucherTypeName   = voucherTypeName;
window.categoryName      = categoryName;
window.linkTypeName      = linkTypeName;

console.log('✅ [core/utils.js] loaded');
