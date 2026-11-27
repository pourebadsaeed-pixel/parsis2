/* ============================================================
   پارسیس — پایگاه رویدادهای پیش‌فرض تقویم (✅ v2.7.2)
   مسیر: js/modules/calendar-events.js

   ✅ v2.7.2 — درخواست کاربر: «تقویم را کاملترش کن که رویدادهای
   تقویم ایران، تعطیلات رسمی ایران، رویدادهای جهانی و رویدادهای
   ایران باستان رو بشه در اون دید، البته بشه انتخاب کرد که کدوم
   یکی ها رو بشه دید»

   چهار دستهٔ داخلی (قابل فیلتر از لجند پایین صفحه تقویم):
     • holiday — تعطیلات رسمی ایران (شمسی + قمری تقریبی)
     • iran    — رویدادهای تقویم ایران (مناسبت‌های شمسی)
     • world   — رویدادهای جهانی (میلادی ثابت)
     • ancient — رویدادهای ایران باستان (جشن‌های ملی-تاریخی)

   نکته‌ها:
     • رویدادهای قمری با الگوریتم تقویم اسلامی جدولی محاسبه می‌شوند؛
       ممکن است یک روز با اعلام رسمی اختلاف داشته باشند (تقریبی).
     • همهٔ رویدادها فقط‌خواندنی هستند (readonly) و در «دستورکار»
       و نمای ماه/هفته/روز دیده می‌شوند.
   ============================================================ */
'use strict';

var ParsisCalendarEvents = (function () {

    /* ------------------------------------------------------------
       تبدیل تاریخ میلادی ↔ Julian Day Number (پایهٔ تبدیل قمری)
       ------------------------------------------------------------ */
    function gregorianToJDN(y, m, d) {
        var a = Math.floor((14 - m) / 12);
        var yy = y + 4800 - a;
        var mm = m + 12 * a - 3;
        return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4)
             - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
    }

    function jdnToGregorian(jdn) {
        var a = jdn + 32044;
        var b = Math.floor((4 * a + 3) / 146097);
        var c = a - Math.floor((146097 * b) / 4);
        var dd = Math.floor((4 * c + 3) / 1461);
        var e = c - Math.floor((1461 * dd) / 4);
        var mm = Math.floor((5 * e + 2) / 153);
        var day = e - Math.floor((153 * mm + 2) / 5) + 1;
        var month = mm + 3 - 12 * Math.floor(mm / 10);
        var year = 100 * b + dd - 4800 + Math.floor(mm / 10);
        return [year, month, day];
    }

    /* الگوریتم استاندارد میلادی → قمری (جدولی — تقریبی و رایج) */
    function gregorianToHijri(y, m, d) {
        var jd = gregorianToJDN(y, m, d);
        var l0 = jd - 1948440 + 10632;
        var n = Math.floor((l0 - 1) / 10631);
        l0 = l0 - 10631 * n + 354;
        var j = (Math.floor((10985 - l0) / 5316)) * (Math.floor((50 * l0) / 17719))
              + (Math.floor(l0 / 5670)) * (Math.floor((43 * l0) / 15238));
        l0 = l0 - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50))
              - (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29;
        var hm = Math.floor((24 * l0) / 709);
        var hd = l0 - Math.floor((709 * hm) / 24);
        var hy = 30 * n + j - 30;
        return [hy, hm, hd];
    }

    /* قمری → میلادی (جدولی) — برای جای‌گذاری تعطیلات قمری روی تقویم شمسی */
    function hijriToGregorian(hy, hm, hd) {
        /* جستجوی باینری روی JDN در بازهٔ سال قمری موردنظر */
        var approxJDN = Math.floor((hy - 1) * 354.367) + Math.floor((hm - 1) * 29.53) + hd + 1948440;
        var lo = approxJDN - 40, hi = approxJDN + 40;
        while (lo <= hi) {
            var mid = Math.floor((lo + hi) / 2);
            var g = jdnToGregorian(mid);
            var h = gregorianToHijri(g[0], g[1], g[2]);
            if (h[0] > hy || (h[0] === hy && h[1] > hm) || (h[0] === hy && h[1] === hm && h[2] >= hd)) {
                if (h[0] === hy && h[1] === hm && h[2] === hd) return g;
                hi = mid - 1;
            } else {
                lo = mid + 1;
            }
        }
        /* تقریب نهایی اگر دقیق پیدا نشد (خارج از بازهٔ نادر) */
        return jdnToGregorian(hi + 1);
    }

    /* ------------------------------------------------------------
       تبدیل میلادی ↔ شمسی (نسخهٔ محلی — بدون وابستگی به ترتیب لود)
       ------------------------------------------------------------ */
    function div(a, b) { return ~~(a / b); }

    function gregorianToJalaliLocal(gy, gm, gd) {
        var g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
        var jy = (gy <= 1600) ? 0 : 979;
        gy -= (gy <= 1600) ? 621 : 1600;
        var gy2 = (gm > 2) ? (gy + 1) : gy;
        var days = (365 * gy) + div(gy2 + 3, 4) - div(gy2 + 99, 100)
                 + div(gy2 + 399, 400) - 80 + gd + g_d_m[gm - 1];
        jy += 33 * div(days, 12053);
        days %= 12053;
        jy += 4 * div(days, 1461);
        days %= 1461;
        if (days > 365) { jy += div(days - 1, 365); days = (days - 1) % 365; }
        var jm = (days < 186) ? 1 + div(days, 31) : 7 + div(days - 186, 30);
        var jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
        return [jy, jm, jd];
    }

    function jalaliToGregorianLocal(jy, jm, jd) {
        var gy = (jy <= 979) ? 621 : 1600;
        jy -= (jy <= 979) ? 0 : 979;
        var days = (365 * jy) + (div(jy, 33) * 8) + div((jy % 33) + 3, 4)
                 + 78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
        gy += 400 * div(days, 146097);
        days %= 146097;
        if (days > 36524) {
            gy += 100 * div(--days, 36524);
            days %= 36524;
            if (days >= 365) days++;
        }
        gy += 4 * div(days, 1461);
        days %= 1461;
        if (days > 365) { gy += div(days - 1, 365); days = (days - 1) % 365; }
        var gd = days + 1;
        var sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28,
                    31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        var gm = 0;
        for (gm = 1; gm <= 12; gm++) {
            if (gd <= sal_a[gm]) break;
            gd -= sal_a[gm];
        }
        return [gy, gm, gd];
    }

    function pad2Local(n) { return (n < 10 ? '0' : '') + n; }

    /* ------------------------------------------------------------
       ۱) تعطیلات رسمی ایران — شمسی ثابت
       ------------------------------------------------------------ */
    var SOLAR_HOLIDAYS = [
        { m: 1,  d: 1,  t: '🌷 نوروز — آغاز سال نو' },
        { m: 1,  d: 2,  t: '🌷 عید نوروز' },
        { m: 1,  d: 3,  t: '🌷 عید نوروز' },
        { m: 1,  d: 4,  t: '🌷 عید نوروز' },
        { m: 1,  d: 12, t: '🇮🇷 روز جمهوری اسلامی' },
        { m: 1,  d: 13, t: '🌿 سیزده‌بدر — روز طبیعت' },
        { m: 11, d: 22, t: '🇮🇷 پیروزی انقلاب اسلامی' },
        { m: 12, d: 29, t: '🛢 روز ملی شدن صنعت نفت' }
    ];

    /* تعطیلات رسمی با تاریخ میلادی ثابت (هر سال) — ۴ ژوئن رحلت امام، ۵ ژوئن قیام ۱۵ خرداد */
    var GREGORIAN_HOLIDAYS = [
        { m: 6, d: 4, t: '🕯 رحلت امام خمینی' },
        { m: 6, d: 5, t: '🕊 قیام ۱۵ خرداد' }
    ];

    /* ------------------------------------------------------------
       ۲) تعطیلات رسمی ایران — قمری (تقریبی)
       ------------------------------------------------------------ */
    var HIJRI_HOLIDAYS = [
        { m: 1,  d: 9,  t: '🕯 تاسوعای حسینی' },
        { m: 1,  d: 10, t: '🕯 عاشورای حسینی' },
        { m: 2,  d: 20, t: '🕊 اربعین حسینی' },
        { m: 2,  d: 28, t: '🕯 رحلت رسول‌الله و شهادت امام حسن' },
        { m: 2,  d: 29, t: '🕯 شهادت امام رضا (پایان صفر)' },
        { m: 3,  d: 8,  t: '🕯 شهادت امام حسن عسکری' },
        { m: 3,  d: 17, t: '🎉 میلاد پیامبر اکرم و امام صادق' },
        { m: 6,  d: 3,  t: '🕯 شهادت حضرت فاطمه' },
        { m: 7,  d: 13, t: '🎉 ولادت امام علی' },
        { m: 7,  d: 27, t: '🎉 عید سعید مبعث' },
        { m: 8,  d: 15, t: '🎉 ولادت امام مهدی — نیمه شعبان' },
        { m: 9,  d: 21, t: '🕯 شهادت امام علی — شب قدر' },
        { m: 10, d: 1,  t: '🎉 عید سعید فطر' },
        { m: 10, d: 25, t: '🕯 شهادت امام صادق' },
        { m: 12, d: 10, t: '🐑 عید سعید قربان' },
        { m: 12, d: 18, t: '🎉 عید سعید غدیر' }
    ];

    /* ------------------------------------------------------------
       ۳) رویدادهای تقویم ایران — مناسبت‌های شمسی (غیرتعطیل)
       ------------------------------------------------------------ */
    var IRAN_EVENTS = [
        { m: 1,  d: 20, t: '☢️ روز ملی فناوری هسته‌ای' },
        { m: 1,  d: 25, t: '🕊 روز بزرگداشت عطار نیشابوری' },
        { m: 2,  d: 1,  t: '📜 روز بزرگداشت سعدی' },
        { m: 2,  d: 2,  t: '🌍 روز زمین پاک' },
        { m: 2,  d: 3,  t: '🏛 روز بزرگداشت شیخ بهایی' },
        { m: 2,  d: 9,  t: '🗳 روز شوراها' },
        { m: 2,  d: 10, t: '🌊 روز ملی خلیج فارس' },
        { m: 2,  d: 15, t: '📖 روز بزرگداشت شیخ صدوق' },
        { m: 2,  d: 25, t: '📜 روز بزرگداشت فردوسی' },
        { m: 2,  d: 28, t: '⭐ روز بزرگداشت حکیم عمر خیام' },
        { m: 3,  d: 1,  t: '📈 روز بهره‌وری و بهینه‌سازی مصرف' },
        { m: 3,  d: 3,  t: '🎖 روز مقاومت و فتح خرمشهر' },
        { m: 4,  d: 7,  t: '⚖️ شهادت آیت‌الله بهشتی — روز قوه قضاییه' },
        { m: 5,  d: 1,  t: '🩺 روز پزشک — بزرگداشت ابن‌سینا' },
        { m: 5,  d: 5,  t: '🏃 روز تربیت‌بدنی و ورزش' },
        { m: 5,  d: 8,  t: '🕯 روز بزرگداشت سهروردی' },
        { m: 5,  d: 14, t: '🕊 صدور فرمان مشروطیت' },
        { m: 5,  d: 27, t: '💊 روز بزرگداشت رازی — روز داروسازی' },
        { m: 6,  d: 13, t: '🤝 روز تعاون' },
        { m: 6,  d: 19, t: '🎬 روز سینما' },
        { m: 6,  d: 27, t: '✒️ روز شعر و ادب — شهادت شهریار' },
        { m: 7,  d: 7,  t: '🚒 روز آتش‌نشانی و خدمات ایمنی' },
        { m: 7,  d: 8,  t: '📜 روز بزرگداشت مولوی' },
        { m: 7,  d: 13, t: '👮 روز نیروی انتظامی' },
        { m: 7,  d: 14, t: '🐾 روز دامپزشکی' },
        { m: 7,  d: 29, t: '🚢 روز ملی صادرات' },
        { m: 8,  d: 8,  t: '🧒 روز نوجوان — شهادت محمدحسین فهمیده' },
        { m: 8,  d: 13, t: '✊ روز ملی مبارزه با استکبار جهانی' },
        { m: 8,  d: 18, t: '✅ روز کیفیت' },
        { m: 8,  d: 24, t: '📚 روز کتاب، کتابخوانی و کتابدار' },
        { m: 9,  d: 16, t: '🎓 روز دانشجو' },
        { m: 10, d: 8,  t: '💡 روز بصیرت و میثاق امت با ولایت' },
        { m: 10, d: 22, t: '🕌 روز وحدت حوزه و دانشگاه' },
        { m: 11, d: 1,  t: '📊 روز آمار و برنامه‌ریزی' },
        { m: 11, d: 8,  t: '✈️ روز نیروی هوایی' },
        { m: 11, d: 19, t: '🚀 روز نیروی هوافضا' },
        { m: 11, d: 21, t: '🛒 روز حمایت از حقوق مصرف‌کنندگان' },
        { m: 12, d: 25, t: '✒️ روز بزرگداشت پروین اعتصامی' }
    ];

    /* ------------------------------------------------------------
       ۴) رویدادهای جهانی — میلادی ثابت
       ------------------------------------------------------------ */
    var WORLD_EVENTS = [
        { m: 1,  d: 1,  t: '🎉 روز جهانی نو سال میلادی' },
        { m: 2,  d: 4,  t: '🎗 روز جهانی مبارزه با سرطان' },
        { m: 2,  d: 14, t: '💗 روز والنتاین — روز عشق' },
        { m: 3,  d: 8,  t: '👩 روز جهانی زن' },
        { m: 3,  d: 21, t: '📖 روز جهانی شعر' },
        { m: 3,  d: 22, t: '💧 روز جهانی آب' },
        { m: 4,  d: 2,  t: '🧩 روز جهانی اوتیسم' },
        { m: 4,  d: 7,  t: '🏥 روز جهانی بهداشت' },
        { m: 4,  d: 22, t: '🌍 روز جهانی زمین' },
        { m: 5,  d: 1,  t: '👷 روز جهانی کارگر' },
        { m: 5,  d: 8,  t: '⛑ روز جهانی صلیب سرخ و هلال احمر' },
        { m: 5,  d: 12, t: '💉 روز جهانی پرستار' },
        { m: 5,  d: 15, t: '👨‍👩‍👧 روز جهانی خانواده' },
        { m: 6,  d: 1,  t: '🧒 روز جهانی کودکان' },
        { m: 6,  d: 5,  t: '🌿 روز جهانی محیط زیست' },
        { m: 6,  d: 21, t: '🎵 روز جهانی موسیقی' },
        { m: 6,  d: 26, t: '🚫 روز جهانی مبارزه با مواد مخدر' },
        { m: 7,  d: 11, t: '👥 روز جهانی جمعیت' },
        { m: 8,  d: 12, t: '🧑‍💻 روز جهانی جوانان' },
        { m: 9,  d: 8,  t: '🔤 روز جهانی سوادآموزی' },
        { m: 9,  d: 21, t: '🕊 روز جهانی صلح' },
        { m: 9,  d: 27, t: '🗺 روز جهانی گردشگری' },
        { m: 10, d: 1,  t: '👴 روز جهانی سالمندان' },
        { m: 10, d: 5,  t: '👨‍🏫 روز جهانی معلم' },
        { m: 10, d: 13, t: '🆘 روز جهانی کاهش خطر بلایا' },
        { m: 10, d: 14, t: '🔬 روز جهانی استاندارد' },
        { m: 10, d: 16, t: '🌾 روز جهانی غذا' },
        { m: 10, d: 31, t: '💰 روز جهانی پس‌انداز' },
        { m: 11, d: 14, t: '🩸 روز جهانی دیابت' },
        { m: 12, d: 1,  t: '🎗 روز جهانی ایدز' },
        { m: 12, d: 5,  t: '🟤 روز جهانی خاک' },
        { m: 12, d: 10, t: '⚖️ روز جهانی حقوق بشر' },
        { m: 12, d: 11, t: '⛰ روز جهانی کوهستان' },
        { m: 12, d: 25, t: '🎄 کریسمس' }
    ];

    /* ------------------------------------------------------------
       ۵) رویدادهای ایران باستان — شمسی ثابت (جشن‌های ملی)
       ------------------------------------------------------------ */
    var ANCIENT_EVENTS = [
        { m: 1,  d: 19, t: '🏛 جشن فروردین‌گان' },
        { m: 2,  d: 2,  t: '🌼 جشن اردیبهشت‌گان — میانه بهار' },
        { m: 4,  d: 13, t: '💧 جشن تیرگان' },
        { m: 5,  d: 7,  t: '🌾 جشن امردادگان' },
        { m: 7,  d: 10, t: '🍂 جشن مهرگان' },
        { m: 8,  d: 7,  t: '👑 روز کوروش بزرگ' },
        { m: 9,  d: 9,  t: '🔥 جشن آذرگان' },
        { m: 9,  d: 30, t: '🌙 شب یلدا — چله' },
        { m: 11, d: 10, t: '🔥 جشن سده' },
        { m: 12, d: 5,  t: '👩 جشن اسفندگان — روز زن ایرانی' }
    ];

    /* ------------------------------------------------------------
       ساخت رویداد در بازهٔ مشخص
       ------------------------------------------------------------ */
    var _cache = null;
    var _cacheKey = '';

    function buildEvents() {
        var today = new Date();
        var todayJ = gregorianToJalaliLocal(today.getFullYear(), today.getMonth() + 1, today.getDate());
        var fromY = todayJ[0] - 1;
        var toY = todayJ[0] + 2;
        var out = [];

        var seq = 0;
        function push(jy, jm, jd, title, cat, iconHint) {
            seq++;
            out.push({
                id: 'b_' + cat + '_' + jy + '_' + jm + '_' + jd + '_' + seq,
                cat: cat,
                date: jy + '/' + pad2Local(jm) + '/' + pad2Local(jd),
                time: '12:00',
                startDate: jy + '/' + pad2Local(jm) + '/' + pad2Local(jd),
                startTime: '12:00',
                endDate: jy + '/' + pad2Local(jm) + '/' + pad2Local(jd),
                endTime: '12:00',
                title: iconHint + ' ' + title,
                sub: '',
                desc: '',
                location: '',
                persons: [],
                reminder: 0,
                readonly: true,
                builtin: true
            });
        }

        for (var y = fromY; y <= toY; y++) {
            var i, e, g;

            /* شمسی ثابت */
            for (i = 0; i < SOLAR_HOLIDAYS.length; i++) {
                e = SOLAR_HOLIDAYS[i];
                push(y, e.m, e.d, e.t, 'holiday', '🔴');
            }
            for (i = 0; i < IRAN_EVENTS.length; i++) {
                e = IRAN_EVENTS[i];
                push(y, e.m, e.d, e.t, 'iran', '🇮🇷');
            }
            for (i = 0; i < ANCIENT_EVENTS.length; i++) {
                e = ANCIENT_EVENTS[i];
                push(y, e.m, e.d, e.t, 'ancient', '🏺');
            }
        }

        /* میلادی ثابت — سال‌های میلادی پوشش‌دهندهٔ کل بازهٔ شمسی */
        {
            var gStart2 = jalaliToGregorianLocal(fromY, 1, 1);
            var gEnd2 = jalaliToGregorianLocal(toY, 12, 29);
            for (var gy = gStart2[0]; gy <= gEnd2[0]; gy++) {
                var i2, e2;
                for (i2 = 0; i2 < GREGORIAN_HOLIDAYS.length; i2++) {
                    e2 = GREGORIAN_HOLIDAYS[i2];
                    var jj = gregorianToJalaliLocal(gy, e2.m, e2.d);
                    if (jj[0] < fromY || jj[0] > toY) continue;
                    push(jj[0], jj[1], jj[2], e2.t, 'holiday', '🔴');
                }
                for (i2 = 0; i2 < WORLD_EVENTS.length; i2++) {
                    e2 = WORLD_EVENTS[i2];
                    var jw = gregorianToJalaliLocal(gy, e2.m, e2.d);
                    if (jw[0] < fromY || jw[0] > toY) continue;
                    push(jw[0], jw[1], jw[2], e2.t, 'world', '🌐');
                }
            }
        }

        /* قمری تقریبی — سال‌های قمری پوشش‌دهندهٔ کل بازهٔ شمسی (با حاشیه) */
        {
            var gFrom = jalaliToGregorianLocal(fromY, 1, 1);
            var gTo = jalaliToGregorianLocal(toY, 12, 29);
            var hFrom = gregorianToHijri(gFrom[0], gFrom[1], gFrom[2])[0] - 1;
            var hTo = gregorianToHijri(gTo[0], gTo[1], gTo[2])[0] + 1;
            for (var hy = hFrom; hy <= hTo; hy++) {
                var i3, e3;
                for (i3 = 0; i3 < HIJRI_HOLIDAYS.length; i3++) {
                    e3 = HIJRI_HOLIDAYS[i3];
                    var gh = hijriToGregorian(hy, e3.m, e3.d);
                    var jh = gregorianToJalaliLocal(gh[0], gh[1], gh[2]);
                    if (jh[0] < fromY || jh[0] > toY) continue;
                    push(jh[0], jh[1], jh[2], e3.t + ' (تقریبی)', 'holiday', '🌙');
                }
            }
        }

        /* حذف تکراری‌ها (مثلاً قمری و شمسی روی یک روز) */
        var seen = {};
        var unique = [];
        out.forEach(function (ev) {
            if (seen[ev.id]) return;
            seen[ev.id] = true;
            unique.push(ev);
        });

        unique.sort(function (a, b) { return a.date.localeCompare(b.date); });
        return unique;
    }

    function getEvents() {
        var today = new Date();
        var key = today.getFullYear() + '-' + today.getMonth() + '-' + today.getDate();
        if (!_cache || _cacheKey !== key) {
            _cache = buildEvents();
            _cacheKey = key;
        }
        return _cache;
    }

    /* رویدادهای یک بازهٔ تاریخ شمسی (رشتهٔ y/m/d) */
    function getEventsInRange(fromStr, toStr) {
        return getEvents().filter(function (e) {
            return (!fromStr || e.date >= fromStr) && (!toStr || e.date <= toStr);
        });
    }

    /* رویدادهای یک روز مشخص (y/m/d با صفر) */
    function getEventsOn(dateStr) {
        return getEvents().filter(function (e) { return e.date === dateStr; });
    }

    /* رویدادهای تعطیلی یک روز — برای ویجت خانه */
    function getHolidaysOn(dateStr) {
        return getEventsOn(dateStr).filter(function (e) { return e.cat === 'holiday'; });
    }

    return {
        getEvents: getEvents,
        getEventsInRange: getEventsInRange,
        getEventsOn: getEventsOn,
        getHolidaysOn: getHolidaysOn,
        gregorianToHijri: gregorianToHijri,
        gregorianToJalaliLocal: gregorianToJalaliLocal,
        jalaliToGregorianLocal: jalaliToGregorianLocal
    };
})();

window.ParsisCalendarEvents = ParsisCalendarEvents;

console.log('✅ [modules/calendar-events.js] loaded — v2.7.2 (تعطیلات رسمی + تقویم ایران + جهانی + ایران باستان)');
