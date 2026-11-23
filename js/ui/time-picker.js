/* ============================================================
   پارسیس — انتخاب ساعت عقربه‌ای
   مسیر: js/ui/time-picker.js
   وابستگی: core/* + ui/toast.js
   ============================================================ */
'use strict';

function openTimePicker(callback, initialValue) {
    var old = document.getElementById('time-picker-modal');
    if (old) old.remove();
    var oldO = document.getElementById('time-picker-overlay');
    if (oldO) oldO.remove();

    var init = initialValue || '21:00';
    var ip = String(init).split(':');
    var selH = Number(ip[0]);
    if (isNaN(selH)) selH = 21;
    var selM = Number(ip[1]);
    if (isNaN(selM)) selM = 0;
    selH = Math.max(0, Math.min(23, selH));
    selM = Math.max(0, Math.min(59, selM));
    var mode = 'hour';

    var html = ''
        + '<div id="time-picker-overlay" class="overlay show" style="z-index:900"></div>'
        + '<div id="time-picker-modal" class="modal show" style="max-width:400px;z-index:910">'
        +   '<div class="modal-head" style="background:linear-gradient(135deg,#6366f1,#4f46e5)">'
        +     '<h2>🕐 انتخاب ساعت</h2>'
        +     '<button id="tp-close" class="close-btn">×</button>'
        +   '</div>'
        +   '<div class="modal-body" style="text-align:center;padding:16px">'
        +     '<div style="direction:ltr;display:flex;justify-content:center;gap:14px;margin-bottom:14px">'
        +       '<div id="tp-hh-display" style="font-size:2.4rem;font-weight:900;font-family:monospace;direction:ltr;padding:8px 20px;background:#eef2ff;color:#4338ca;border-radius:12px;cursor:pointer;min-width:80px;text-align:center">' + pad2(selH) + '</div>'
        +       '<div style="font-size:2.4rem;font-weight:900;color:#4338ca">:</div>'
        +       '<div id="tp-mm-display" style="font-size:2.4rem;font-weight:900;font-family:monospace;direction:ltr;padding:8px 20px;background:#fef2f2;color:#dc2626;border-radius:12px;cursor:pointer;min-width:80px;text-align:center">' + pad2(selM) + '</div>'
        +     '</div>'
        +     '<div style="text-align:center;font-size:0.75rem;color:#64748b;margin-bottom:10px">'
        +       '👆 روی HH (آبی) کلیک کن = تنظیم ساعت | روی MM (قرمز) = تنظیم دقیقه'
        +     '</div>'
        +     '<div style="position:relative;width:280px;height:280px;margin:0 auto">'
        +       '<svg id="tp-svg" viewBox="0 0 280 280" style="width:100%;height:100%;cursor:pointer;user-select:none;touch-action:none">'
        +         '<circle cx="140" cy="140" r="130" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>'
        +         '<g id="tp-numbers"></g>'
        +         '<line id="tp-hour-hand" x1="140" y1="140" x2="140" y2="60" stroke="#4338ca" stroke-width="6" stroke-linecap="round"/>'
        +         '<line id="tp-min-hand" x1="140" y1="140" x2="140" y2="40" stroke="#dc2626" stroke-width="4" stroke-linecap="round"/>'
        +         '<circle cx="140" cy="140" r="6" fill="#1e293b"/>'
        +         '<circle id="tp-handle" cx="140" cy="60" r="14" fill="#4338ca" opacity="0.35"/>'
        +       '</svg>'
        +     '</div>'
        +     '<div style="display:flex;gap:8px;margin-top:16px">'
        +       '<button id="tp-cancel" style="flex:1;padding:12px;background:var(--card-alt);color:var(--text);border:none;border-radius:11px;font-family:inherit;font-weight:800;cursor:pointer">انصراف</button>'
        +       '<button id="tp-ok" style="flex:2;padding:12px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none;border-radius:11px;font-family:inherit;font-weight:800;cursor:pointer">تأیید</button>'
        +     '</div>'
        +   '</div>'
        + '</div>';
    document.body.insertAdjacentHTML('beforeend', html);

    var svg = document.getElementById('tp-svg');
    var numbersG = document.getElementById('tp-numbers');
    var hourHand = document.getElementById('tp-hour-hand');
    var minHand = document.getElementById('tp-min-hand');
    var handle = document.getElementById('tp-handle');
    var hhDisp = document.getElementById('tp-hh-display');
    var mmDisp = document.getElementById('tp-mm-display');
    var CX = 140, CY = 140;

    function drawNumbers() {
        var nums = '';
        if (mode === 'hour') {
            for (var i = 0; i < 24; i++) {
                var isOuter = i < 12;
                var r = isOuter ? 110 : 78;
                var ang = (i % 12) * 30 - 90;
                var rad = ang * Math.PI / 180;
                var x = CX + r * Math.cos(rad);
                var y = CY + r * Math.sin(rad);
                var isSel = (i === selH);
                nums += '<text x="' + x + '" y="' + (y + 5) + '" text-anchor="middle" '
                     +  'font-size="' + (isOuter ? 16 : 13) + '" font-weight="800" '
                     +  'fill="' + (isSel ? '#4338ca' : (isOuter ? '#1e293b' : '#64748b')) + '" '
                     +  'style="pointer-events:none;font-family:monospace">' + pad2(i) + '</text>';
            }
        } else {
            for (var j = 0; j < 12; j++) {
                var ang2 = j * 30 - 90;
                var rad2 = ang2 * Math.PI / 180;
                var x2 = CX + 110 * Math.cos(rad2);
                var y2 = CY + 110 * Math.sin(rad2);
                var v = j * 5;
                var isSel2 = (v === selM);
                nums += '<text x="' + x2 + '" y="' + (y2 + 5) + '" text-anchor="middle" '
                     +  'font-size="16" font-weight="800" '
                     +  'fill="' + (isSel2 ? '#dc2626' : '#1e293b') + '" '
                     +  'style="pointer-events:none;font-family:monospace">' + pad2(v) + '</text>';
            }
        }
        numbersG.innerHTML = nums;
    }

    function drawHands() {
        var hAng = (selH % 12) * 30 + selM * 0.5 - 90;
        var hRad = hAng * Math.PI / 180;
        var hLen = (selH < 12 ? 75 : 55);
        var hx = CX + hLen * Math.cos(hRad);
        var hy = CY + hLen * Math.sin(hRad);
        hourHand.setAttribute('x2', hx);
        hourHand.setAttribute('y2', hy);

        var mAng = selM * 6 - 90;
        var mRad = mAng * Math.PI / 180;
        var mx = CX + 95 * Math.cos(mRad);
        var my = CY + 95 * Math.sin(mRad);
        minHand.setAttribute('x2', mx);
        minHand.setAttribute('y2', my);

        if (mode === 'hour') {
            handle.setAttribute('cx', hx);
            handle.setAttribute('cy', hy);
            handle.setAttribute('fill', '#4338ca');
        } else {
            handle.setAttribute('cx', mx);
            handle.setAttribute('cy', my);
            handle.setAttribute('fill', '#dc2626');
        }

        hhDisp.textContent = pad2(selH);
        mmDisp.textContent = pad2(selM);
        hhDisp.style.background = mode === 'hour' ? '#eef2ff' : '#f3f4f6';
        hhDisp.style.color = mode === 'hour' ? '#4338ca' : '#6b7280';
        hhDisp.style.boxShadow = mode === 'hour' ? '0 0 0 3px rgba(67,56,202,0.25)' : 'none';
        mmDisp.style.background = mode === 'minute' ? '#fef2f2' : '#f3f4f6';
        mmDisp.style.color = mode === 'minute' ? '#dc2626' : '#6b7280';
        mmDisp.style.boxShadow = mode === 'minute' ? '0 0 0 3px rgba(220,38,38,0.25)' : 'none';
    }

    function posToTime(px, py) {
        var dx = px - CX;
        var dy = py - CY;
        var r = Math.sqrt(dx * dx + dy * dy);
        var ang = Math.atan2(dy, dx) * 180 / Math.PI + 90;
        if (ang < 0) ang += 360;

        if (mode === 'hour') {
            var isInner = r < 95;
            var slot = Math.round(ang / 30) % 12;
            selH = isInner ? slot + 12 : slot;
            if (selH >= 24) selH -= 12;
        } else {
            selM = Math.round(ang / 6) % 60;
        }
        drawNumbers();
        drawHands();
    }

    function handlePointer(e) {
        var rect = svg.getBoundingClientRect();
        var cx = (e.clientX !== undefined) ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        var cy = (e.clientY !== undefined) ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        var px = (cx - rect.left) / rect.width * 280;
        var py = (cy - rect.top) / rect.height * 280;
        posToTime(px, py);
    }

    hhDisp.addEventListener('click', function () {
        mode = 'hour';
        drawNumbers();
        drawHands();
    });
    mmDisp.addEventListener('click', function () {
        mode = 'minute';
        drawNumbers();
        drawHands();
    });

    var isDragging = false;
    svg.addEventListener('mousedown', function (e) {
        isDragging = true;
        handlePointer(e);
    });
    document.addEventListener('mousemove', function (e) {
        if (isDragging) handlePointer(e);
    });
    document.addEventListener('mouseup', function () {
        isDragging = false;
    });
    svg.addEventListener('touchstart', function (e) {
        isDragging = true;
        handlePointer(e);
    }, { passive: true });
    svg.addEventListener('touchmove', function (e) {
        if (isDragging) {
            e.preventDefault();
            handlePointer(e);
        }
    }, { passive: false });
    svg.addEventListener('touchend', function () {
        isDragging = false;
    });

    drawNumbers();
    drawHands();

    function close() {
        var o = document.getElementById('time-picker-overlay');
        if (o) o.remove();
        var m = document.getElementById('time-picker-modal');
        if (m) m.remove();
    }

    document.getElementById('tp-close').onclick = close;
    document.getElementById('tp-cancel').onclick = close;
    document.getElementById('time-picker-overlay').onclick = close;
    document.getElementById('tp-ok').onclick = function () {
        var s = pad2(selH) + ':' + pad2(selM);
        if (callback) callback(s);
        close();
    };
}

window.openTimePicker = openTimePicker;

console.log('✅ [ui/time-picker.js] loaded');
