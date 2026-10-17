/* ============================================================
   پارسیس — تقویم شمسی، ماشین‌حساب، انتخاب‌گرها
   مسیر: js/core/calendar-popup.js
   وابستگی: constants.js, utils.js
   ============================================================ */
'use strict';

/* ============================================================
   بخش ۱ — تقویم شمسی پاپ‌آپ
   ============================================================ */
var calTarget = null;
var calCursorY = 0;
var calCursorM = 0;
var calSelectedD = 0;
var calYearMode = false;
var calYearStart = 0;

function openCalendar(input) {
    calTarget = input;
    calYearMode = false;
    var today = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    var cursor = today;
    var v = normalizeDigits(input.value || '').trim();
    if (v) {
        var p = v.split('/').map(Number);
        if (p.length === 3 && !isNaN(p[0])) cursor = p;
    }
    calCursorY = cursor[0];
    calCursorM = cursor[1];
    calSelectedD = cursor[2] || 0;
    renderCalendar();
    var ov = document.getElementById('cal-overlay');
    var pp = document.getElementById('cal-popup');
    if (ov) ov.classList.add('show');
    if (pp) pp.classList.add('show');
}

function renderCalendar() {
    var body = document.getElementById('cal-body-content');
    if (!body) return;

    if (calYearMode) {
        var titleEl = document.getElementById('cal-title');
        if (titleEl) titleEl.textContent = 'انتخاب سال شمسی';
        var startY = calYearStart;
        var html = '<div class="cal-years">';
        var currentY = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate())[0];
        for (var y = startY; y < startY + 12; y++) {
            var cls = 'cal-year-btn';
            if (y === calCursorY) cls += ' selected';
            if (y === currentY) cls += ' current';
            html += '<div class="' + cls + '" data-year="' + y + '">' + toFa(y) + '</div>';
        }
        html += '</div>';
        body.innerHTML = html;
        body.querySelectorAll('.cal-year-btn').forEach(function (b) {
            b.addEventListener('click', function () {
                calCursorY = Number(this.getAttribute('data-year'));
                calYearMode = false;
                renderCalendar();
            });
        });
        return;
    }

    var titleEl2 = document.getElementById('cal-title');
    if (titleEl2) titleEl2.textContent = JALALI_MONTHS[calCursorM - 1] + ' ' + toFa(calCursorY) + ' 📅';

    var days = daysInJalaliMonth(calCursorY, calCursorM);
    var firstG = jalaliToGregorian(calCursorY, calCursorM, 1);
    var firstDate = new Date(firstG[0], firstG[1] - 1, firstG[2]);
    var firstDow = (firstDate.getDay() + 1) % 7;
    var todayJ = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());

    var html2 = '<div class="cal-weekdays"><div>ش</div><div>ی</div><div>د</div><div>س</div><div>چ</div><div>پ</div><div>ج</div></div>';
    html2 += '<div class="cal-days" id="cal-days">';
    for (var i = 0; i < firstDow; i++) html2 += '<div class="cal-day empty"></div>';
    for (var d = 1; d <= days; d++) {
        var cls2 = 'cal-day';
        if (todayJ[0] === calCursorY && todayJ[1] === calCursorM && todayJ[2] === d) cls2 += ' today';
        if (calSelectedD === d) cls2 += ' selected';
        html2 += '<div class="' + cls2 + '" data-day="' + d + '">' + toFa(d) + '</div>';
    }
    html2 += '</div>';
    body.innerHTML = html2;
    body.querySelectorAll('.cal-day[data-day]').forEach(function (el) {
        el.addEventListener('click', function () {
            pickDay(Number(this.getAttribute('data-day')));
        });
    });
}

function pickDay(d) {
    if (calTarget) {
        calTarget.value = calCursorY + '/' + pad2(calCursorM) + '/' + pad2(d);
        calTarget.dispatchEvent(new Event('input', { bubbles: true }));
    }
    closeCalendar();
}

function closeCalendar() {
    var ov = document.getElementById('cal-overlay');
    var pp = document.getElementById('cal-popup');
    if (ov) ov.classList.remove('show');
    if (pp) pp.classList.remove('show');
    calTarget = null;
    calYearMode = false;
}

function initCalendarListeners() {
    var prevBtn = document.getElementById('cal-prev');
    var nextBtn = document.getElementById('cal-next');
    var titleBtn = document.getElementById('cal-title');
    var todayBtn = document.getElementById('cal-today');
    var closeBtn = document.getElementById('cal-close');
    var overlay = document.getElementById('cal-overlay');

    if (prevBtn) prevBtn.addEventListener('click', function () {
        if (calYearMode) { calYearStart -= 12; renderCalendar(); return; }
        calCursorM--;
        if (calCursorM < 1) { calCursorM = 12; calCursorY--; }
        calSelectedD = 0;
        renderCalendar();
    });

    if (nextBtn) nextBtn.addEventListener('click', function () {
        if (calYearMode) { calYearStart += 12; renderCalendar(); return; }
        calCursorM++;
        if (calCursorM > 12) { calCursorM = 1; calCursorY++; }
        calSelectedD = 0;
        renderCalendar();
    });

    if (titleBtn) titleBtn.addEventListener('click', function () {
        calYearMode = !calYearMode;
        calYearStart = Math.floor(calCursorY / 12) * 12;
        renderCalendar();
    });

    if (todayBtn) todayBtn.addEventListener('click', function () {
        var t = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
        calCursorY = t[0];
        calCursorM = t[1];
        calSelectedD = t[2];
        calYearMode = false;
        renderCalendar();
    });

    if (closeBtn) closeBtn.addEventListener('click', closeCalendar);
    if (overlay) overlay.addEventListener('click', closeCalendar);
}

/* ============================================================
   بخش ۲ — ماشین حساب
   ============================================================ */
var calcTarget = null;
var calcExpr = '0';

function calcOpen(targetGetter, targetSetter, title) {
    calcTarget = { get: targetGetter, set: targetSetter };
    var v = targetGetter ? (Number(targetGetter()) || 0) : 0;
    calcExpr = String(v || 0);
    updateCalcDisplay();
    var t = document.getElementById('calc-popup');
    var titleEl = document.querySelector('#calc-popup .cal-title');
    if (titleEl) titleEl.textContent = '🧮 ' + (title || 'ماشین حساب');
    var ov = document.getElementById('calc-overlay');
    if (ov) ov.classList.add('show');
    if (t) t.classList.add('show');
}

function updateCalcDisplay() {
    var el = document.getElementById('calc-display');
    if (!el) return;
    el.value = calcExpr;
}

function calcEval() {
    try {
        var expr = calcExpr.replace(/[^0-9+\-*/().]/g, '');
        if (!expr) return 0;
        var result = Function('"use strict";return (' + expr + ')')();
        if (!isFinite(result)) return 0;
        return Math.round(result);
    } catch (e) { return 0; }
}

function calcButtonPress(key) {
    if (key === 'C') calcExpr = '0';
    else if (key === '←') calcExpr = calcExpr.length > 1 ? calcExpr.slice(0, -1) : '0';
    else if (key === '=') {
        var r = calcEval();
        calcExpr = String(r);
    } else if (['+', '-', '*', '/'].indexOf(key) !== -1) {
        var lastChar = calcExpr.slice(-1);
        if (['+', '-', '*', '/'].indexOf(lastChar) !== -1) calcExpr = calcExpr.slice(0, -1) + key;
        else calcExpr += key;
    } else if (key === '.') {
        var parts = calcExpr.split(/[+\-*/]/);
        var lastPart = parts[parts.length - 1];
        if (lastPart.indexOf('.') === -1) calcExpr += '.';
    } else if (/^\d$/.test(key)) {
        if (calcExpr === '0') calcExpr = key;
        else calcExpr += key;
    }
    updateCalcDisplay();
}

function calcClose() {
    var p = document.getElementById('calc-popup');
    var o = document.getElementById('calc-overlay');
    if (p) p.classList.remove('show');
    if (o) o.classList.remove('show');
    calcTarget = null;
}

function initCalculator() {
    var box = document.getElementById('calc-buttons');
    if (!box) return;
    var keys = ['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '=', '+', '←', 'C'];
    box.innerHTML = '';
    keys.forEach(function (k) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'calc-btn-key' + (['+', '-', '*', '/'].indexOf(k) !== -1 ? ' op' : '') + (k === '=' ? ' eq' : '');
        b.textContent = k === '←' ? '⌫' : k === '*' ? '×' : k === '/' ? '÷' : k;
        b.addEventListener('click', function () { calcButtonPress(k); });
        box.appendChild(b);
    });

    var closeBtn = document.getElementById('calc-close');
    var overlay = document.getElementById('calc-overlay');
    var setBtn = document.getElementById('calc-set');
    var addBtn = document.getElementById('calc-add');
    var clearBtn = document.getElementById('calc-clear');

    if (closeBtn) closeBtn.addEventListener('click', calcClose);
    if (overlay) overlay.addEventListener('click', calcClose);

    if (setBtn) setBtn.addEventListener('click', function () {
        var r = calcEval();
        if (calcTarget && calcTarget.set) {
            calcTarget.set(r);
            showToast('✅ مقدار درج شد: ' + formatRaw(r));
        }
        calcClose();
    });

    if (addBtn) addBtn.addEventListener('click', function () {
        var r = calcEval();
        if (calcTarget && calcTarget.get && calcTarget.set) {
            var cur = Number(calcTarget.get()) || 0;
            calcTarget.set(cur + r);
            showToast('➕ افزوده شد: ' + formatRaw(r));
        }
        calcClose();
    });

    if (clearBtn) clearBtn.addEventListener('click', function () {
        calcExpr = '0';
        updateCalcDisplay();
    });
}

/* ============================================================
   بخش ۳ — پیوست خودکار تقویم به input[.date-picker]
   ============================================================ */
function attachDatePickers() {
    var els = document.querySelectorAll('.date-picker');
    for (var i = 0; i < els.length; i++) {
        var el = els[i];
        if (el.dataset.picker === '1') continue;
        el.dataset.picker = '1';

        if (el.parentNode && el.parentNode.classList && el.parentNode.classList.contains('date-wrap')) continue;

        try {
            var wrap = document.createElement('div');
            wrap.className = 'date-wrap';
            el.parentNode.insertBefore(wrap, el);
            wrap.appendChild(el);

            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'cal-btn';
            btn.innerHTML = '📅';
            btn.title = 'باز کردن تقویم';
            (function (inp) {
                btn.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    openCalendar(inp);
                });
            })(el);
            wrap.appendChild(btn);
        } catch (err) {
            console.warn('[attachDatePickers]', err);
        }
    }
}

/* ============================================================
   بخش ۴ — Money input binding
   ============================================================ */
function attachMoneyInput(el, setter) {
    if (!el || el.dataset.money) return;
    el.dataset.money = '1';

    el.addEventListener('input', function () {
        var val = normalizeDigits(el.value);
        var neg = val.trim().charAt(0) === '-';
        var raw = val.replace(/[^\d]/g, '');
        el.value = (neg ? '-' : '') + raw;
        var v = Number(raw) || 0;
        if (setter) setter(neg ? -v : v);
    });

    el.addEventListener('blur', function () {
        var val = normalizeDigits(el.value);
        var neg = val.trim().charAt(0) === '-';
        var raw = val.replace(/[^\d]/g, '');
        var v = Number(raw) || 0;
        el.value = (neg && v ? '-' : '') + (v ? formatRaw(v) : '');
        if (setter) setter(neg ? -v : v);
    });
}

/* ============================================================
   صادرسازی
   ============================================================ */
window.openCalendar          = openCalendar;
window.renderCalendar        = renderCalendar;
window.pickDay               = pickDay;
window.closeCalendar         = closeCalendar;
window.initCalendarListeners = initCalendarListeners;
window.calcOpen              = calcOpen;
window.updateCalcDisplay     = updateCalcDisplay;
window.calcButtonPress       = calcButtonPress;
window.calcClose             = calcClose;
window.initCalculator        = initCalculator;
window.attachDatePickers     = attachDatePickers;
window.attachMoneyInput      = attachMoneyInput;

console.log('✅ [core/calendar-popup.js] loaded');
