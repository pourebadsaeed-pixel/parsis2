/* ============================================================
   پارسیس — ماشین‌حساب حرفه‌ای (✅ v2.7.2)
   مسیر: js/modules/calculator.js

   ✅ v2.7.2 — درخواست کاربر: «یه ماشین حساب حرفه ای هم در قسمت
   برنامه ریزی اضافه کن»

   قابلیت‌ها:
     • نمایش عبارت + نتیجهٔ زنده + هزارگان
     • عملیات پایه: + − × ÷ پرانتز درصد مثبت/منفی
     • علمی: √، x²، xʸ، ۱/x، ln، log، sin/cos/tan (درجه/رادیان)،
       π، e، فاکتوریل (!)، قدرمطلق
     • حافظه: MC / MR / M+ / M−
     • تاریخچهٔ ۳۰ محاسبهٔ آخر (کلیک = بازیابی) + پاک‌کردن
     • پشتیبانی کامل از کیبورد (اعداد، عملگرها، Enter، Backspace، Esc)
     • نمایش و ورود با ارقام فارسی یا لاتین
     • موتور محاسبهٔ امن (بدون eval — پارسر بازگشتی)
   ============================================================ */
'use strict';

/* ------------------------------------------------------------
   موتور محاسبه — پارسر بازگشتی امن (بدون eval)
   ------------------------------------------------------------ */
var CalcEngine = (function () {

    function tokenize(src) {
        var s = String(src || '')
            .replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); })
            .replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); })
            .replace(/[×∗]/g, '*')
            .replace(/[÷]/g, '/')
            .replace(/[−–]/g, '-')
            .replace(/π/g, 'pi')
            .replace(/\s+/g, '');
        var toks = [];
        var i = 0;
        while (i < s.length) {
            var c = s[i];
            if (/[0-9.]/.test(c)) {
                var num = '';
                while (i < s.length && /[0-9.]/.test(s[i])) num += s[i++];
                toks.push({ t: 'num', v: parseFloat(num) });
            } else if (/[a-z]/i.test(c)) {
                var id = '';
                while (i < s.length && /[a-z]/i.test(s[i])) id += s[i++];
                toks.push({ t: 'id', v: id.toLowerCase() });
            } else if ('+-*/^!%()'.indexOf(c) !== -1) {
                toks.push({ t: c });
                i++;
            } else {
                throw new Error('کاراکتر نامعتبر: ' + c);
            }
        }
        return toks;
    }

    /* رجیستری توابع */
    var FUNCS = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'ln', 'log', 'sqrt', 'abs'];

    function factorial(n) {
        if (n < 0 || Math.floor(n) !== n) throw new Error('فاکتوریل فقط عدد صحیح نامنفی');
        if (n > 170) throw new Error('عدد برای فاکتوریل خیلی بزرگ است');
        var r = 1;
        for (var i2 = 2; i2 <= n; i2++) r *= i2;
        return r;
    }

    function parse(tokens, angleMode) {
        var pos = 0;
        var toRad = (angleMode === 'rad') ? 1 : Math.PI / 180;
        var fromRad = (angleMode === 'rad') ? 1 : 180 / Math.PI;

        function peek() { return tokens[pos]; }
        function eat(t) {
            var tk = tokens[pos];
            if (!tk || tk.t !== t) throw new Error('عبارت نامعتبر است');
            pos++;
        }

        function expr() {
            var v = term();
            while (peek() && (peek().t === '+' || peek().t === '-')) {
                var op = tokens[pos++].t;
                var r = term();
                v = (op === '+') ? v + r : v - r;
            }
            return v;
        }
        function term() {
            var v = unary();
            while (peek() && (peek().t === '*' || peek().t === '/')) {
                var op = tokens[pos++].t;
                var r = unary();
                if (op === '/' && r === 0) throw new Error('تقسیم بر صفر ممکن نیست');
                v = (op === '*') ? v * r : v / r;
            }
            return v;
        }
        function unary() {
            if (peek() && peek().t === '-') { pos++; return -unary(); }
            if (peek() && peek().t === '+') { pos++; return unary(); }
            return power();
        }
        function power() {
            var base = postfix();
            if (peek() && peek().t === '^') {
                pos++;
                var exp = unary(); /* راست‌گرا */
                return Math.pow(base, exp);
            }
            return base;
        }
        function postfix() {
            var v = primary();
            while (peek() && (peek().t === '!' || peek().t === '%')) {
                var op = tokens[pos++].t;
                v = (op === '!') ? factorial(v) : v / 100;
            }
            return v;
        }
        function primary() {
            var tk = peek();
            if (!tk) throw new Error('عبارت ناقص است');
            if (tk.t === 'num') { pos++; return tk.v; }
            if (tk.t === '(') {
                pos++;
                var v = expr();
                eat(')');
                return v;
            }
            if (tk.t === 'id') {
                pos++;
                var name = tk.v;
                if (name === 'pi') return Math.PI;
                if (name === 'e') return Math.E;
                if (FUNCS.indexOf(name) !== -1) {
                    var arg;
                    if (peek() && peek().t === '(') {
                        pos++;
                        arg = expr();
                        eat(')');
                    } else {
                        arg = primary();
                    }
                    switch (name) {
                        case 'sin':  return roundFix(Math.sin(arg * toRad));
                        case 'cos':  return roundFix(Math.cos(arg * toRad));
                        case 'tan':  return roundFix(Math.tan(arg * toRad));
                        case 'asin': return Math.asin(arg) * fromRad;
                        case 'acos': return Math.acos(arg) * fromRad;
                        case 'atan': return Math.atan(arg) * fromRad;
                        case 'ln':   return Math.log(arg);
                        case 'log':  return Math.log10(arg);
                        case 'sqrt':
                            if (arg < 0) throw new Error('جذر عدد منفی ممکن نیست');
                            return Math.sqrt(arg);
                        case 'abs':  return Math.abs(arg);
                    }
                }
                throw new Error('تابع ناشناخته: ' + name);
            }
            throw new Error('عبارت نامعتبر است');
        }

        function roundFix(v) {
            /* حذف خطای ممیز شناور مثل sin(180)=1e-17 */
            var r = Math.round(v);
            return (Math.abs(v - r) < 1e-12) ? r : v;
        }

        var result = expr();
        if (pos !== tokens.length) throw new Error('عبارت نامعتبر است');
        if (!isFinite(result)) throw new Error('نتیجه نامعین است');
        return result;
    }

    return {
        evaluate: function (src, angleMode) {
            var toks = tokenize(src);
            if (!toks.length) throw new Error('عبارت خالی است');
            return parse(toks, angleMode || 'deg');
        }
    };
})();

/* ------------------------------------------------------------
   صفحه ماشین‌حساب
   ------------------------------------------------------------ */
var CALC_PAGE = {
    expr: '',
    result: '',
    memory: 0,
    angle: 'deg',
    histOpen: false
};

function calcEnsurePage() {
    if (document.getElementById('page-calculator')) return;
    var sec = document.createElement('section');
    sec.id = 'page-calculator';
    sec.className = 'page';

    sec.innerHTML = ''
    + '<h2>🧮 ماشین‌حساب حرفه‌ای</h2>'
    + '<div class="calc-pro-wrap">'

    /* ---------- ستون ماشین‌حساب ---------- */
    + '<div class="calc-pro-main">'
    +   '<div class="calc-pro-display">'
    +     '<div class="calc-pro-expr" id="calc-expr">&nbsp;</div>'
    +     '<div class="calc-pro-result"><span id="calc-result">۰</span><button type="button" id="calc-copy-btn" class="calc-mini-btn" title="کپی نتیجه">📋</button></div>'
    +   '</div>'

    +   '<div class="calc-pro-mem-row">'
    +     '<button type="button" class="calc-fn-btn" data-mem="MC" title="پاک‌کردن حافظه">MC</button>'
    +     '<button type="button" class="calc-fn-btn" data-mem="MR" title="خواندن حافظه">MR</button>'
    +     '<button type="button" class="calc-fn-btn" data-mem="M+" title="افزودن به حافظه">M+</button>'
    +     '<button type="button" class="calc-fn-btn" data-mem="M-" title="کم‌کردن از حافظه">M−</button>'
    +     '<span class="calc-mem-ind" id="calc-mem-ind"></span>'
    +     '<button type="button" class="calc-mode-btn" id="calc-angle-btn" title="تغییر واحد زاویه">درجه</button>'
    +   '</div>'

    +   '<div class="calc-pro-sci">'
    +     '<button type="button" class="calc-fn-btn" data-ins="sin(">sin</button>'
    +     '<button type="button" class="calc-fn-btn" data-ins="cos(">cos</button>'
    +     '<button type="button" class="calc-fn-btn" data-ins="tan(">tan</button>'
    +     '<button type="button" class="calc-fn-btn" data-ins="asin(">sin⁻¹</button>'
    +     '<button type="button" class="calc-fn-btn" data-ins="acos(">cos⁻¹</button>'
    +     '<button type="button" class="calc-fn-btn" data-ins="atan(">tan⁻¹</button>'
    +     '<button type="button" class="calc-fn-btn" data-ins="ln(">ln</button>'
    +     '<button type="button" class="calc-fn-btn" data-ins="log(">log</button>'
    +     '<button type="button" class="calc-fn-btn" data-ins="sqrt(">√</button>'
    +     '<button type="button" class="calc-fn-btn" data-ins="^">xʸ</button>'
    +     '<button type="button" class="calc-fn-btn" data-ins="!">n!</button>'
    +     '<button type="button" class="calc-fn-btn" data-ins="abs(">|x|</button>'
    +     '<button type="button" class="calc-fn-btn" data-ins="pi">π</button>'
    +     '<button type="button" class="calc-fn-btn" data-ins="e">e</button>'
    +     '<button type="button" class="calc-fn-btn" data-ins="^2">x²</button>'
    +   '</div>'

    +   '<div class="calc-pro-grid">'
    +     '<button type="button" class="calc-op-btn calc-w2" data-act="clear">C</button>'
    +     '<button type="button" class="calc-op-btn" data-ins="(">(</button>'
    +     '<button type="button" class="calc-op-btn" data-ins=")">)</button>'
    +     '<button type="button" class="calc-op-btn" data-act="back">⌫</button>'

    +     '<button type="button" class="calc-op-btn" data-ins="7">7</button>'
    +     '<button type="button" class="calc-op-btn" data-ins="8">8</button>'
    +     '<button type="button" class="calc-op-btn" data-ins="9">9</button>'
    +     '<button type="button" class="calc-op-btn" data-ins="/">÷</button>'

    +     '<button type="button" class="calc-op-btn" data-ins="4">4</button>'
    +     '<button type="button" class="calc-op-btn" data-ins="5">5</button>'
    +     '<button type="button" class="calc-op-btn" data-ins="6">6</button>'
    +     '<button type="button" class="calc-op-btn" data-ins="*">×</button>'

    +     '<button type="button" class="calc-op-btn" data-ins="1">1</button>'
    +     '<button type="button" class="calc-op-btn" data-ins="2">2</button>'
    +     '<button type="button" class="calc-op-btn" data-ins="3">3</button>'
    +     '<button type="button" class="calc-op-btn" data-ins="-">−</button>'

    +     '<button type="button" class="calc-op-btn" data-ins="%">٪</button>'
    +     '<button type="button" class="calc-op-btn" data-ins="0">0</button>'
    +     '<button type="button" class="calc-op-btn" data-ins=".">.</button>'
    +     '<button type="button" class="calc-op-btn" data-ins="+">+</button>'

    +     '<button type="button" class="calc-op-btn calc-w2 calc-eq" data-act="eq">=</button>'
    +     '<button type="button" class="calc-op-btn" data-act="neg">±</button>'
    +     '<button type="button" class="calc-op-btn" data-act="inv">۱/x</button>'
    +   '</div>'
    + '</div>'

    /* ---------- ستون تاریخچه ---------- */
    + '<div class="calc-pro-hist" id="calc-hist-panel">'
    +   '<div class="calc-hist-head">'
    +     '<span>🕘 تاریخچه</span>'
    +     '<button type="button" id="calc-hist-clear" class="calc-mini-btn" title="پاک‌کردن تاریخچه">🗑</button>'
    +   '</div>'
    +   '<div class="calc-hist-list" id="calc-hist-list"></div>'
    + '</div>'

    + '</div>'
    + '<p class="muted" style="font-size:0.72rem;margin-top:10px;line-height:1.9">💡 کیبورد هم کار می‌کند: اعداد و عملگرها، Enter برای مساوی، Backspace برای پاک‌کردن تدریجی و Esc برای پاک‌کردن کل. زاویه‌ها به‌طور پیش‌فرض «درجه» هستند (تغییر با دکمهٔ «درجه/رادیان»).</p>';

    var main = document.querySelector('.content') || document.body;
    main.appendChild(sec);
}

/* ------------------------------------------------------------
   کمکی‌ها
   ------------------------------------------------------------ */
function calcFmt(v) {
    if (v === '' || v === null || v === undefined) return '';
    try {
        var n = Number(v);
        if (!isFinite(n)) return '—';
        var s;
        if (Math.abs(n) >= 1e15 || (n !== 0 && Math.abs(n) < 1e-9)) {
            s = n.toExponential(6).replace(/\.?0+e/, 'e');
        } else {
            var dec = Math.abs(n) < 1 ? 10 : 8;
            var r = Math.round(n * Math.pow(10, dec)) / Math.pow(10, dec);
            s = r.toLocaleString('en-US', { maximumFractionDigits: dec });
        }
        return s.replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; });
    } catch (e) { return String(v); }
}

function calcLoadHist() {
    var h = DB.load('calcHistory', []);
    return Array.isArray(h) ? h : [];
}
function calcSaveHist(h) { DB.save('calcHistory', h.slice(0, 30)); }

function calcUpdateDisplay() {
    /* همهٔ نسخه‌های صفحه (تب‌های چندگانه) همگام می‌شوند */
    Array.prototype.slice.call(document.querySelectorAll('section[id^="page-calculator"]')).forEach(function (pg) {
        var exprEl = pg.querySelector('#calc-expr');
        var resEl = pg.querySelector('#calc-result');
        var memEl = pg.querySelector('#calc-mem-ind');
        var angEl = pg.querySelector('#calc-angle-btn');
        if (exprEl) exprEl.textContent = CALC_PAGE.expr || '\u00a0';
        if (resEl) {
            if (CALC_PAGE.error) {
                resEl.textContent = '⚠ ' + CALC_PAGE.error;
                resEl.classList.add('calc-err');
            } else {
                resEl.textContent = CALC_PAGE.result || '۰';
                resEl.classList.remove('calc-err');
            }
        }
        if (memEl) memEl.textContent = CALC_PAGE.memory ? 'M: ' + calcFmt(CALC_PAGE.memory) : '';
        if (angEl) angEl.textContent = (CALC_PAGE.angle === 'deg') ? 'درجه' : 'رادیان';
    });
}

function calcLiveEval() {
    CALC_PAGE.error = '';
    CALC_PAGE.result = '';
    if (!CALC_PAGE.expr) return;
    try {
        var v = CalcEngine.evaluate(CALC_PAGE.expr, CALC_PAGE.angle);
        CALC_PAGE.result = calcFmt(v);
        CALC_PAGE.value = v;
    } catch (e) {
        /* عبارت ناقص وسط تایپ طبیعی است — فقط وقتی کلید = زده شود خطا نشان بده */
        CALC_PAGE.result = '';
    }
}

function calcRenderHist() {
    Array.prototype.slice.call(document.querySelectorAll('#calc-hist-list')).forEach(function (list) {
        var h = calcLoadHist();
        if (!h.length) {
            list.innerHTML = '<div class="calc-hist-empty">هنوز محاسبه‌ای ثبت نشده است.</div>';
            return;
        }
        var html = '';
        h.forEach(function (item, idx) {
            html += '<div class="calc-hist-item" data-hist="' + idx + '">'
                 +  '<div class="calc-hist-expr">' + esc(item.expr) + '</div>'
                 +  '<div class="calc-hist-res">= ' + calcFmt(item.result) + '</div>'
                 +  '</div>';
        });
        list.innerHTML = html;

        Array.prototype.slice.call(list.querySelectorAll('.calc-hist-item')).forEach(function (el) {
            el.onclick = function () {
                var idx = Number(el.getAttribute('data-hist'));
                var item = calcLoadHist()[idx];
                if (!item) return;
                CALC_PAGE.expr = item.expr;
                CALC_PAGE.result = calcFmt(item.result);
                CALC_PAGE.error = '';
                calcUpdateDisplay();
            };
        });
    });
}

function calcPushHistory(expr, value) {
    var h = calcLoadHist();
    h.unshift({ expr: expr, result: value, at: Date.now() });
    calcSaveHist(h);
    calcRenderHist();
}

function calcInsert(txt) {
    CALC_PAGE.expr += txt;
    calcLiveEval();
    calcUpdateDisplay();
}

function calcAct(action) {
    switch (action) {
        case 'clear':
            CALC_PAGE.expr = '';
            CALC_PAGE.result = '';
            CALC_PAGE.error = '';
            break;
        case 'back':
            CALC_PAGE.expr = CALC_PAGE.expr.slice(0, -1);
            calcLiveEval();
            break;
        case 'eq':
            if (!CALC_PAGE.expr) return;
            try {
                var v = CalcEngine.evaluate(CALC_PAGE.expr, CALC_PAGE.angle);
                CALC_PAGE.result = calcFmt(v);
                CALC_PAGE.value = v;
                CALC_PAGE.error = '';
                calcPushHistory(CALC_PAGE.expr, v);
                CALC_PAGE.expr = String(v);
            } catch (e) {
                CALC_PAGE.error = e && e.message ? e.message : 'عبارت نامعتبر';
                CALC_PAGE.result = '';
            }
            break;
        case 'neg':
            try {
                /* منفی/مثبت‌کردن عبارت فعلی */
                var cur = Number(CALC_PAGE.value !== undefined ? CALC_PAGE.value : CALC_PAGE.expr);
                if (!isNaN(cur)) {
                    CALC_PAGE.expr = (CALC_PAGE.expr.charAt(0) === '-') ? CALC_PAGE.expr.slice(1) : '-' + CALC_PAGE.expr;
                    calcLiveEval();
                }
            } catch (e) {}
            break;
        case 'inv':
            /* ✅ معکوس: اگر عبارت فعلی یک عدد است، کامل معکوس می‌شود؛
               وگرنه «1/» برای ادامهٔ عبارت اضافه می‌شود */
            if (CALC_PAGE.expr && /^[0-9.]+$/.test(CALC_PAGE.expr)) {
                if (Number(CALC_PAGE.expr) === 0) {
                    CALC_PAGE.error = 'تقسیم بر صفر ممکن نیست';
                } else {
                    CALC_PAGE.expr = '1/(' + CALC_PAGE.expr + ')';
                    CALC_PAGE.error = '';
                    calcLiveEval();
                }
            } else {
                calcInsert('1/');
            }
            break;
    }
    calcUpdateDisplay();
}

function calcMemory(op) {
    var cur = 0;
    try { cur = CALC_PAGE.value !== undefined && CALC_PAGE.expr !== '' ? Number(CALC_PAGE.value) : 0; } catch (e) {}
    switch (op) {
        case 'MC': CALC_PAGE.memory = 0; break;
        case 'MR':
            CALC_PAGE.expr += String(CALC_PAGE.memory || 0);
            calcLiveEval();
            break;
        case 'M+': CALC_PAGE.memory = CALC_PAGE.memory + (calcCurrent() || 0); break;
        case 'M-': CALC_PAGE.memory = CALC_PAGE.memory - (calcCurrent() || 0); break;
    }
    calcUpdateDisplay();
}

function calcCurrent() {
    try {
        if (!CALC_PAGE.expr) return 0;
        return CalcEngine.evaluate(CALC_PAGE.expr, CALC_PAGE.angle);
    } catch (e) { return 0; }
}

function calcCopyResult() {
    var txt = String(CALC_PAGE.value !== undefined && CALC_PAGE.result ? CALC_PAGE.result
               : (CALC_PAGE.value !== undefined ? calcFmt(CALC_PAGE.value) : ''));
    var latin = txt.replace(/[۰-۹]/g, function (d) { return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)); })
                   .replace(/,/g, '');
    if (!latin) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(latin).then(function () {
            if (typeof showToast === 'function') showToast('📋 نتیجه کپی شد: ' + latin);
        }).catch(function () {});
    } else if (typeof writeClipboard === 'function') {
        writeClipboard(latin);
    }
}

/* ------------------------------------------------------------
   رویدادها — نمای سطح document (تا تب‌های کلون‌شده هم کار کنند)
   ------------------------------------------------------------ */
function calcBindEvents() {
    if (calcBindEvents._bound) return;
    calcBindEvents._bound = true;

    function inCalcPage(target) {
        var pg = target.closest ? target.closest('section[id^="page-calculator"]') : null;
        return pg || null;
    }

    document.addEventListener('click', function (e) {
        var pg = inCalcPage(e.target);
        if (!pg) return;

        var histItem = e.target.closest ? e.target.closest('.calc-hist-item') : null;
        if (histItem) { histItem.onclick && histItem.onclick(); return; }

        var angleBtn = e.target.closest ? e.target.closest('#calc-angle-btn') : null;
        if (angleBtn) {
            CALC_PAGE.angle = (CALC_PAGE.angle === 'deg') ? 'rad' : 'deg';
            calcLiveEval();
            calcUpdateDisplay();
            return;
        }
        var copyBtn = e.target.closest ? e.target.closest('#calc-copy-btn') : null;
        if (copyBtn) { calcCopyResult(); return; }
        var histClear = e.target.closest ? e.target.closest('#calc-hist-clear') : null;
        if (histClear) {
            calcSaveHist([]);
            calcRenderHist();
            if (typeof showToast === 'function') showToast('🗑 تاریخچهٔ ماشین‌حساب پاک شد');
            return;
        }

        var ins = e.target.closest ? e.target.closest('[data-ins]') : null;
        var act = e.target.closest ? e.target.closest('[data-act]') : null;
        var mem = e.target.closest ? e.target.closest('[data-mem]') : null;
        if (ins) { calcInsert(ins.getAttribute('data-ins')); return; }
        if (act) { calcAct(act.getAttribute('data-act')); return; }
        if (mem) { calcMemory(mem.getAttribute('data-mem')); return; }
    });

    /* کیبورد — فقط وقتی یکی از صفحات ماشین‌حساب فعال است */
    document.addEventListener('keydown', function (e) {
        var anyActive = document.querySelector('section[id^="page-calculator"].active');
        if (!anyActive) return;
        var tag = (e.target && e.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        var k = e.key;
        if (/^[0-9]$/.test(k) || k === '.' || k === '(' || k === ')') { calcInsert(k); e.preventDefault(); }
        else if (k === '+' || k === '-' || k === '*' || k === '/') { calcInsert(k === '*' ? '*' : k); e.preventDefault(); }
        else if (k === '^') { calcInsert('^'); e.preventDefault(); }
        else if (k === '!' ) { calcInsert('!'); e.preventDefault(); }
        else if (k === '%') { calcInsert('%'); e.preventDefault(); }
        else if (k === 'Enter' || k === '=') { calcAct('eq'); e.preventDefault(); }
        else if (k === 'Backspace') { calcAct('back'); e.preventDefault(); }
        else if (k === 'Escape') { calcAct('clear'); e.preventDefault(); }
    });
}

function initCalculatorPage() {
    calcEnsurePage();
    calcBindEvents();
    CALC_PAGE.memory = Number(DB.load('calcMemory', 0)) || 0;
    calcUpdateDisplay();
    calcRenderHist();
}

/* ساخت خودکار صفحه بعد از لود */
(function calcAutoInit() {
    function go() {
        try {
            calcEnsurePage();
            calcBindEvents();
            CALC_PAGE.memory = Number(DB.load('calcMemory', 0)) || 0;
            calcUpdateDisplay();
            calcRenderHist();
        } catch (e) { console.warn('[calculator] init error:', e); }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(go, 600); });
    } else {
        setTimeout(go, 600);
    }
})();

/* ذخیرهٔ حافظه هنگام تغییر */
setInterval(function () {
    try { DB.save('calcMemory', CALC_PAGE.memory || 0); } catch (e) {}
}, 4000);

window.initCalculatorPage = initCalculatorPage;
window.CalcEngine = CalcEngine;

/* ------------------------------------------------------------
   استایل‌ها
   ------------------------------------------------------------ */
(function injectCalcCss() {
    if (document.getElementById('calc-pro-style')) return;
    var s = document.createElement('style');
    s.id = 'calc-pro-style';
    s.textContent = ''
    + '.calc-pro-wrap { display:grid; grid-template-columns:minmax(0,1.6fr) minmax(0,1fr); gap:14px; align-items:start; }'
    + '.calc-pro-main { background:var(--card-solid); border:1px solid var(--border); border-radius:16px; padding:14px; }'
    + '.calc-pro-display { background:linear-gradient(135deg,#0f172a,#1e293b); border-radius:14px; padding:14px 16px; direction:ltr; text-align:right; margin-bottom:10px; }'
    + '.calc-pro-expr { min-height:1.4em; color:#94a3b8; font-family:monospace; font-size:1rem; word-break:break-all; }'
    + '.calc-pro-result { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:6px; }'
    + '.calc-pro-result span { color:#fff; font-weight:900; font-size:1.7rem; word-break:break-all; }'
    + '.calc-pro-result span.calc-err { color:#fca5a5; font-size:1rem; }'
    + '.calc-mini-btn { border:none; background:rgba(255,255,255,0.14); color:#fff; border-radius:8px; padding:5px 9px; cursor:pointer; font-size:0.85rem; flex-shrink:0; }'
    + '.calc-pro-mem-row { display:flex; align-items:center; gap:6px; margin-bottom:8px; flex-wrap:wrap; }'
    + '.calc-mem-ind { flex:1; font-size:0.72rem; font-weight:800; color:var(--text-muted); text-align:left; direction:ltr; }'
    + '.calc-mode-btn { border:1.5px solid var(--primary-dark); background:var(--primary-light,#dbeafe); color:var(--primary-dark); border-radius:9px; padding:6px 12px; font-family:inherit; font-weight:900; font-size:0.75rem; cursor:pointer; }'
    + '.calc-pro-sci { display:grid; grid-template-columns:repeat(5,1fr); gap:6px; margin-bottom:8px; }'
    + '.calc-fn-btn { padding:9px 4px; border-radius:10px; border:1px solid var(--border); background:var(--card-alt); color:var(--primary-dark); font-family:inherit; font-size:0.8rem; font-weight:800; cursor:pointer; transition:all .15s; }'
    + '.calc-fn-btn:hover { background:var(--primary-light,#dbeafe); }'
    + '.calc-fn-btn:active { transform:scale(0.95); }'
    + '.calc-pro-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:7px; }'
    + '.calc-op-btn { padding:14px 4px; border-radius:12px; border:1px solid var(--border); background:var(--card-solid); color:var(--text); font-family:inherit; font-size:1.05rem; font-weight:800; cursor:pointer; transition:all .12s; }'
    + '.calc-op-btn:hover { border-color:var(--primary-dark); background:var(--card-alt); }'
    + '.calc-op-btn:active { transform:scale(0.94); }'
    + '.calc-op-btn[data-ins="/"], .calc-op-btn[data-ins="*"], .calc-op-btn[data-ins="-"], .calc-op-btn[data-ins="+"] { background:linear-gradient(135deg,#eff6ff,#dbeafe); color:#1e40af; font-weight:900; }'
    + '.calc-op-btn[data-act="clear"] { background:linear-gradient(135deg,#fee2e2,#fecaca); color:#991b1b; font-weight:900; }'
    + '.calc-op-btn[data-act="back"] { background:linear-gradient(135deg,#fef3c7,#fde68a); color:#92400e; font-weight:900; }'
    + '.calc-op-btn.calc-eq { background:linear-gradient(135deg,#2563eb,#1e40af); color:#fff; font-size:1.2rem; }'
    + '.calc-op-btn.calc-w2 { grid-column:span 2; }'
    + '.calc-pro-hist { background:var(--card-solid); border:1px solid var(--border); border-radius:16px; padding:12px; }'
    + '.calc-hist-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; font-weight:900; color:var(--primary-dark); font-size:0.9rem; }'
    + '.calc-hist-head .calc-mini-btn { background:#fee2e2; color:#991b1b; }'
    + '.calc-hist-list { display:flex; flex-direction:column; gap:6px; max-height:430px; overflow-y:auto; }'
    + '.calc-hist-item { border:1px solid var(--border); border-radius:10px; padding:8px 10px; cursor:pointer; transition:all .15s; direction:ltr; text-align:right; }'
    + '.calc-hist-item:hover { border-color:var(--primary-dark); background:var(--card-alt); }'
    + '.calc-hist-expr { font-family:monospace; font-size:0.78rem; color:var(--text-muted); word-break:break-all; }'
    + '.calc-hist-res { font-weight:900; font-size:0.92rem; color:var(--primary-dark); margin-top:2px; word-break:break-all; }'
    + '.calc-hist-empty { text-align:center; color:var(--text-muted); font-size:0.78rem; padding:18px 6px; }'
    + '@media (max-width:760px) { .calc-pro-wrap { grid-template-columns:1fr; } .calc-hist-list { max-height:240px; } .calc-pro-sci { grid-template-columns:repeat(5,1fr); } }';
    document.head.appendChild(s);
})();

console.log('✅ [modules/calculator.js] loaded — v2.7.2 (ماشین‌حساب حرفه‌ای در برنامه‌ریزی)');
