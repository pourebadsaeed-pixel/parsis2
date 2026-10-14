/* پارسیس — پچ تقویم نسخه ۲۲: نمایش درست عنوان در رویدادهای کوتاه */
'use strict';

(function () {
    if (window._calShortEventFix22) return;
    window._calShortEventFix22 = true;

    /* ============================================================
       استایل‌ها: ۳ حالت نمایش
       ============================================================ */
    function injectCss() {
        if (document.getElementById('cal-short-ev-css22')) return;
        var s = document.createElement('style');
        s.id = 'cal-short-ev-css22';
        s.textContent = ''
        /* ---- COMPACT: بین ۳۶ تا ۵۴ پیکسل — زمان و عنوان کنار هم ---- */
        + '.cal-tl-event.compact{'
        +   'display:flex!important;'
        +   'align-items:center!important;'
        +   'gap:7px!important;'
        +   'padding:4px 9px!important;'
        +   'overflow:hidden!important;'
        + '}'
        + '.cal-tl-event.compact .ev-time{'
        +   'margin-bottom:0!important;'
        +   'flex-shrink:0;'
        +   'font-size:0.6rem!important;'
        +   'padding:2px 6px;'
        +   'background:rgba(30,64,175,0.12);'
        +   'border-radius:5px;'
        +   'line-height:1.4!important;'
        +   'font-weight:900;'
        + '}'
        + '.cal-tl-event.compact .ev-title{'
        +   'flex:1;'
        +   'min-width:0;'
        +   'font-size:0.78rem!important;'
        +   'white-space:nowrap;'
        +   'overflow:hidden;'
        +   'text-overflow:ellipsis;'
        +   'line-height:1.3!important;'
        + '}'
        + '.cal-tl-event.compact .ev-loc{display:none!important}'

        /* ---- TINY: بین ۲۶ تا ۳۶ پیکسل — فقط عنوان (زمان در tooltip) ---- */
        + '.cal-tl-event.tiny{'
        +   'display:flex!important;'
        +   'align-items:center!important;'
        +   'padding:2px 8px!important;'
        +   'gap:5px!important;'
        +   'overflow:hidden!important;'
        + '}'
        + '.cal-tl-event.tiny .ev-time{'
        +   'flex-shrink:0;'
        +   'font-size:0.58rem!important;'
        +   'padding:1px 5px;'
        +   'background:rgba(30,64,175,0.1);'
        +   'border-radius:4px;'
        +   'color:#1e40af!important;'
        +   'margin-bottom:0!important;'
        +   'opacity:.75;'
        + '}'
        + '.cal-tl-event.tiny .ev-title{'
        +   'flex:1;'
        +   'min-width:0;'
        +   'font-size:0.72rem!important;'
        +   'font-weight:800;'
        +   'white-space:nowrap;'
        +   'overflow:hidden;'
        +   'text-overflow:ellipsis;'
        +   'line-height:1.2!important;'
        + '}'
        + '.cal-tl-event.tiny .ev-loc{display:none!important}'

        /* ---- MICRO: کمتر از ۲۶ پیکسل — فقط عنوان، بدون زمان ---- */
        + '.cal-tl-event.micro{'
        +   'display:flex!important;'
        +   'align-items:center!important;'
        +   'padding:0 7px!important;'
        +   'overflow:hidden!important;'
        + '}'
        + '.cal-tl-event.micro .ev-time{display:none!important}'
        + '.cal-tl-event.micro .ev-title{'
        +   'flex:1;'
        +   'min-width:0;'
        +   'font-size:0.7rem!important;'
        +   'font-weight:800;'
        +   'white-space:nowrap;'
        +   'overflow:hidden;'
        +   'text-overflow:ellipsis;'
        +   'line-height:1!important;'
        + '}'
        + '.cal-tl-event.micro .ev-loc{display:none!important}'

        /* اطمینان از نبود سرریز */
        + '.cal-tl-event{overflow:hidden!important;box-sizing:border-box}'
        ;
        document.head.appendChild(s);
    }

    /* ============================================================
       اعمال کلاس بر اساس ارتفاع واقعی
       ============================================================ */
    function fixShortEvents() {
        var els = document.querySelectorAll('.cal-tl-event');
        for (var i = 0; i < els.length; i++) {
            var el = els[i];
            if (el.classList.contains('dragging')) continue;
            var h = el.getBoundingClientRect().height;
            el.classList.remove('compact', 'tiny', 'micro');
            if (h < 26) el.classList.add('micro');
            else if (h < 36) el.classList.add('tiny');
            else if (h < 54) el.classList.add('compact');
        }
    }

    /* ============================================================
       Wrapper روی calRender — بعد از هر رندر اجرا شود
       ============================================================ */
    function installWrapper() {
        if (typeof window.calRender !== 'function') {
            setTimeout(installWrapper, 400);
            return;
        }
        if (window.calRender._wrapped22) return;
        var orig = window.calRender;
        var wrapped = function () {
            var r = orig.apply(this, arguments);
            // همزمان با next paint اجرا شود
            requestAnimationFrame(function () {
                fixShortEvents();
                // و یک‌بار بعد از پویا شدن فونت‌ها
                setTimeout(fixShortEvents, 120);
                setTimeout(fixShortEvents, 400);
            });
            return r;
        };
        wrapped._wrapped22 = true;
        window.calRender = wrapped;
    }

    /* ============================================================
       رفع خودکار پس از تغییر اندازه صفحه یا تغییر zoom
       ============================================================ */
    var resizeTimer = null;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(fixShortEvents, 180);
    });

    /* روی تغییرات DOM تایم‌لاین (درگ و ...) */
    function startObserver() {
        var mo = new MutationObserver(function () { fixShortEvents(); });
        mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
    }

    /* ============================================================
       Boot
       ============================================================ */
    function boot() {
        injectCss();
        installWrapper();
        setTimeout(fixShortEvents, 300);
        /* شبکه‌ی اطمینان */
        setInterval(fixShortEvents, 1800);
        startObserver();
        console.log('✅ [Short Event Fix v22] رویدادهای کوتاه اکنون عنوان را نشان می‌دهند');
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 2800); });
    } else {
        setTimeout(boot, 2800);
    }
})();
