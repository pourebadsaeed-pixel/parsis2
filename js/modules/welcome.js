/* ============================================================
   پارسیس — صفحه خوش‌آمدگویی
   مسیر: js/modules/welcome.js
   وابستگی: core/* + ui/* + reports/cashflow.js
   ============================================================ */
'use strict';

(function WelcomeModule() {
    if (window._welcomeLoaded) return;
    window._welcomeLoaded = true;

    /* ============================================================
       بخش ۱ — حذف نسخه قدیمی (اگر هست)
       ============================================================ */
    var old = document.getElementById('welcome-overlay');
    if (old) old.parentNode.removeChild(old);
    try { sessionStorage.removeItem('parsis.welcomeShown'); } catch (e) {}

    /* ============================================================
       بخش ۲ — مخفی کردن body تا آماده شدن overlay
       ============================================================ */
    function hijackBody() {
        if (document.body) document.body.style.visibility = 'hidden';
    }
    hijackBody();

    /* ============================================================
       بخش ۳ — ساخت overlay
       ============================================================ */
    function buildOverlay() {
        if (document.getElementById('welcome-overlay')) return;

        var el = document.createElement('div');
        el.id = 'welcome-overlay';
        el.className = 'welcome-overlay';
        el.style.visibility = 'visible';
        el.innerHTML = ''
            + '<div class="welcome-top">'
            +   '<div class="welcome-date" id="welcome-date-jalali">—</div>'
            +   '<div class="welcome-date-greg" id="welcome-date-greg">—</div>'
            + '</div>'
            + '<div class="welcome-center">'
            +   '<div class="welcome-logo">📊</div>'
            +   '<h1 class="welcome-title">پارسیس</h1>'
            +   '<div class="welcome-subtitle">حسابداری هوشمند</div>'
            +   '<div class="welcome-version">نسخه ' + toFa(APP_VERSION) + '</div>'
            + '</div>'
            + '<div class="welcome-chart-wrap">'
            +   '<div class="welcome-chart-title">💹 خلاصهٔ دورهٔ مالی فعال</div>'
            +   '<div class="welcome-chart" id="welcome-chart"></div>'
            +   '<div class="welcome-legend" id="welcome-legend"></div>'
            + '</div>'
            + '<div class="welcome-hint">👆 برای ورود کلیک کنید</div>';
        document.body.appendChild(el);

        el.addEventListener('click', function () {
            el.classList.add('welcome-out');
            setTimeout(function () {
                document.body.style.visibility = 'visible';
                el.style.display = 'none';
            }, 500);
        });
    }

    /* ============================================================
       بخش ۴ — نمایش تاریخ
       ============================================================ */
    function renderDate() {
        var d = new Date();
        var j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
        var jEl = document.getElementById('welcome-date-jalali');
        var gEl = document.getElementById('welcome-date-greg');

        if (jEl) {
            jEl.textContent = WEEKDAYS_FA[d.getDay()] + '، '
                + toFa(j[2]) + ' ' + JALALI_MONTHS[j[1] - 1] + ' ' + toFa(j[0]);
        }
        if (gEl) {
            gEl.textContent = d.getDate() + ' ' + GREG_MONTHS[d.getMonth()] + ' ' + d.getFullYear();
        }
    }

    /* ============================================================
       بخش ۵ — محاسبه آمار دوره فعال
       ============================================================ */
    function computePeriodStats() {
        var accounts = DB.load('accounts', []);
        var vouchers = DB.load('vouchers', []).filter(function (v) {
            if (v.status !== 'approved') return false;
            if (state.activePeriodId && v.periodId !== state.activePeriodId) return false;
            return true;
        });

        var income = 0, expense = 0;
        vouchers.forEach(function (v) {
            (v.lines || []).forEach(function (l) {
                if (!l.account) return;
                var rootId = getRootAccountId(l.account, accounts);
                var root = accounts.find(function (a) { return a.id === rootId; });
                if (!root) return;
                var code = String(root.code || '').charAt(0);
                var d = Number(l.debit) || 0;
                var c = Number(l.credit) || 0;
                if (code === '4') income += c;
                else if (code === '5') expense += d;
            });
        });

        return { income: income, expense: expense };
    }

    /* ============================================================
       بخش ۶ — رسم نمودار دونات
       ============================================================ */
    function renderChart() {
        var stats = computePeriodStats();
        var box = document.getElementById('welcome-chart');
        var legend = document.getElementById('welcome-legend');
        if (!box || !legend) return;

        var total = stats.income + stats.expense;
        if (total === 0) {
            box.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.7);padding:20px;font-size:0.85rem">در دورهٔ فعال، درآمد/هزینه‌ای ثبت نشده است.</div>';
            legend.innerHTML = '';
            return;
        }

        var incomePct = stats.income / total * 100;
        var expensePct = stats.expense / total * 100;

        var size = 240, r = 90, cx = size / 2, cy = size / 2;
        var circ = 2 * Math.PI * r;
        var incLen = incomePct / 100 * circ;

        var svg = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">';
        svg += '<defs>';
        svg += '<linearGradient id="wg-income" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#34d399"/><stop offset="100%" stop-color="#059669"/></linearGradient>';
        svg += '<linearGradient id="wg-expense" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f87171"/><stop offset="100%" stop-color="#dc2626"/></linearGradient>';
        svg += '</defs>';
        svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="32"/>';
        svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="url(#wg-expense)" stroke-width="32" stroke-dasharray="' + circ + ' ' + circ + '" transform="rotate(-90 ' + cx + ' ' + cy + ')" style="stroke-dashoffset:' + circ + '; animation: wgDraw 1s ease forwards; animation-delay: 0.3s; --dash-target: 0;"/>';
        svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="url(#wg-income)" stroke-width="32" stroke-dasharray="' + incLen + ' ' + (circ - incLen) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')" style="stroke-dashoffset:0; opacity:0; animation: wgFadeIn 0.5s ease forwards; animation-delay: 1.3s;"/>';
        svg += '<text x="' + cx + '" y="' + (cy - 6) + '" text-anchor="middle" font-size="14" fill="rgba(255,255,255,0.7)">مجموع</text>';
        svg += '<text x="' + cx + '" y="' + (cy + 18) + '" text-anchor="middle" font-size="18" font-weight="bold" fill="#fff" style="opacity:0; animation: wgFadeIn 0.5s ease forwards; animation-delay: 2.5s">' + toFa(total.toLocaleString('fa-IR')) + '</text>';
        svg += '</svg>';
        box.innerHTML = svg;

        legend.innerHTML = ''
            + '<div class="wl-item" style="opacity:0;animation:wgSlide 0.5s ease forwards;animation-delay:1s">'
            +   '<span class="wl-color in"></span>'
            +   '<span class="wl-label">💰 درآمد</span>'
            +   '<span class="wl-amount">' + formatMoney(stats.income) + '</span>'
            +   '<span class="wl-pct">' + toFa(incomePct.toFixed(1)) + '٪</span>'
            + '</div>'
            + '<div class="wl-item" style="opacity:0;animation:wgSlide 0.5s ease forwards;animation-delay:2s">'
            +   '<span class="wl-color out"></span>'
            +   '<span class="wl-label">💸 هزینه</span>'
            +   '<span class="wl-amount">' + formatMoney(stats.expense) + '</span>'
            +   '<span class="wl-pct">' + toFa(expensePct.toFixed(1)) + '٪</span>'
            + '</div>';
    }

    /* ============================================================
       بخش ۷ — تزریق CSS
       ============================================================ */
    function injectStyle() {
        if (document.getElementById('welcome-style')) return;
        var s = document.createElement('style');
        s.id = 'welcome-style';
        s.textContent = ''
        + '.welcome-overlay { position:fixed !important; inset:0 !important; z-index:999999 !important; '
        +   'background:radial-gradient(circle at 25% 20%, #1e3a8a 0%, #0f172a 45%, #4c1d95 100%) !important; '
        +   'display:flex !important; flex-direction:column !important; align-items:center !important; justify-content:space-between !important; '
        +   'padding:32px 16px !important; cursor:pointer !important; direction:rtl !important; '
        +   'opacity:1 !important; transition:opacity 0.5s, transform 0.6s !important; }'
        + '.welcome-overlay.welcome-out { opacity:0 !important; transform:scale(1.05) !important; pointer-events:none !important; }'
        + '.welcome-overlay::before { content:"" !important; position:absolute !important; inset:0 !important; '
        +   'background-image:radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0) !important; '
        +   'background-size:32px 32px !important; opacity:0.5 !important; pointer-events:none !important; }'
        + '.welcome-top { text-align:center !important; color:rgba(255,255,255,0.95) !important; z-index:1 !important; '
        +   'animation:wgSlideDown 0.7s ease both !important; }'
        + '.welcome-date { font-size:1.15rem !important; font-weight:900 !important; letter-spacing:0.3px !important; }'
        + '.welcome-date-greg { font-size:0.85rem !important; color:rgba(255,255,255,0.7) !important; margin-top:4px !important; }'
        + '.welcome-center { text-align:center !important; color:#fff !important; z-index:1 !important; }'
        + '.welcome-logo { font-size:5rem !important; line-height:1 !important; filter:drop-shadow(0 8px 30px rgba(129,140,248,0.6)) !important; '
        +   'animation:wgPop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both !important; animation-delay:0.2s !important; }'
        + '.welcome-title { font-size:3.4rem !important; font-weight:900 !important; letter-spacing:-1px !important; margin-top:14px !important; '
        +   'background:linear-gradient(135deg, #fff 0%, #a5b4fc 50%, #f0abfc 100%) !important; '
        +   '-webkit-background-clip:text !important; background-clip:text !important; -webkit-text-fill-color:transparent !important; '
        +   'animation:wgPop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both !important; animation-delay:0.5s !important; }'
        + '.welcome-subtitle { font-size:1.1rem !important; color:rgba(255,255,255,0.8) !important; margin-top:4px !important; '
        +   'animation:wgPop 0.7s ease both !important; animation-delay:0.8s !important; }'
        + '.welcome-version { font-size:0.8rem !important; color:rgba(255,255,255,0.5) !important; margin-top:6px !important; '
        +   'animation:wgPop 0.7s ease both !important; animation-delay:1s !important; }'
        + '.welcome-chart-wrap { width:min(420px, 92vw) !important; text-align:center !important; z-index:1 !important; '
        +   'animation:wgFadeIn 0.8s ease both !important; animation-delay:1.4s !important; }'
        + '.welcome-chart-title { color:rgba(255,255,255,0.9) !important; font-weight:900 !important; font-size:0.95rem !important; margin-bottom:10px !important; }'
        + '.welcome-chart { display:flex !important; justify-content:center !important; margin-bottom:14px !important; }'
        + '.welcome-legend { display:flex !important; flex-direction:column !important; gap:8px !important; }'
        + '.wl-item { display:grid !important; grid-template-columns:16px 1fr auto auto !important; gap:10px !important; '
        +   'align-items:center !important; padding:10px 14px !important; border-radius:14px !important; '
        +   'background:rgba(255,255,255,0.08) !important; backdrop-filter:blur(10px) !important; '
        +   'border:1px solid rgba(255,255,255,0.12) !important; color:#fff !important; font-size:0.9rem !important; '
        +   'font-weight: 900 !important; }'
        + '.wl-color { width:14px !important; height:14px !important; border-radius:4px !important; }'
        + '.wl-color.in { background:linear-gradient(135deg,#34d399,#059669) !important; }'
        + '.wl-color.out { background:linear-gradient(135deg,#f87171,#dc2626) !important; }'
        + '.wl-label { font-weight:900 !important; text-align:right !important; }'
        + '.wl-amount { font-weight:900 !important; font-variant-numeric:tabular-nums !important; direction:ltr !important; }'
        + '.wl-pct { background:rgba(255,255,255,0.15) !important; padding:3px 10px !important; border-radius:10px !important; font-weight:900 !important; font-size:0.78rem !important; }'
        + '.welcome-hint { color:rgba(255,255,255,0.75) !important; font-size:0.95rem !important; font-weight:900 !important; '
        +   'animation:wgPulse 2s ease-in-out infinite !important; z-index:1 !important; }'
        + '@keyframes wgSlideDown { from { opacity:0; transform:translateY(-16px); } to { opacity:1; transform:none; } }'
        + '@keyframes wgPop { from { opacity:0; transform:scale(0.6); } to { opacity:1; transform:scale(1); } }'
        + '@keyframes wgFadeIn { from { opacity:0; } to { opacity:1; } }'
        + '@keyframes wgSlide { from { opacity:0; transform:translateX(-14px); } to { opacity:1; transform:none; } }'
        + '@keyframes wgPulse { 0%,100% { opacity:0.6; } 50% { opacity:1; } }'
        + '@keyframes wgDraw { to { stroke-dashoffset: var(--dash-target, 0); } }';
        document.head.appendChild(s);
    }

    /* ============================================================
       بخش ۸ — Init
       ============================================================ */
    function init() {
        injectStyle();
        buildOverlay();
        renderDate();
        setTimeout(renderChart, 200);

        /* Safety: اگر کاربر ۵ ثانیه کلیک نکرد، خودکار باز شود */
        var safety = setTimeout(function () {
            if (document.body.style.visibility === 'hidden') {
                document.body.style.visibility = 'visible';
                var w = document.getElementById('welcome-overlay');
                if (w) {
                    w.classList.add('welcome-out');
                    setTimeout(function () { w.style.display = 'none'; }, 500);
                }
            }
        }, 5000);

        var w = document.getElementById('welcome-overlay');
        if (w) w.addEventListener('click', function () {
            clearTimeout(safety);
        }, { once: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('✅ [modules/welcome.js] loaded');
})();
