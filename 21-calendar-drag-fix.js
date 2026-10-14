/* پارسیس — پچ تقویم نسخه ۲۱: رفع پرش Drag با موقعیت Fixed + TouchEvents */
'use strict';

(function () {
    if (window._calDragFix21) return;
    window._calDragFix21 = true;

    var HOUR_HEIGHT = 64;
    var START_HOUR  = 5;
    var END_HOUR    = 24;
    var MIN_SNAP    = 15;
    var LONG_PRESS_MS = 260;
    var MOVE_TOLERANCE = 9;

    function p2(n) { n = Number(n) || 0; return String(n).length < 2 ? '0' + n : String(n); }
    function toMin(t) { if (!t) return 0; var p = String(t).split(':'); return (Number(p[0]) || 0) * 60 + (Number(p[1]) || 0); }
    function toTime(m) { m = Math.max(0, Math.round(m)); return p2(Math.floor(m / 60)) + ':' + p2(m % 60); }
    function escS(s) {
        if (typeof esc === 'function') return esc(s);
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
        });
    }
    function fa(n) {
        if (typeof toFa === 'function') return toFa(n);
        return String(n).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; });
    }

    /* ============================================================
       نصب استایل مخصوص درگ
       ============================================================ */
    function injectDragCss() {
        if (document.getElementById('cal-drag21-style')) return;
        var s = document.createElement('style');
        s.id = 'cal-drag21-style';
        s.textContent = ''
        /* حذف transform و pointer-events که باعث پرش می‌شدند */
        + '.cal-tl-event.dragging{'
        +   'position:fixed!important;'
        +   'z-index:99999!important;'
        +   'box-shadow:0 22px 55px rgba(15,23,42,0.55),0 0 0 2px rgba(59,130,246,0.85)!important;'
        +   'opacity:.96!important;'
        +   'cursor:grabbing!important;'
        +   'transition:none!important;'
        +   'transform:none!important;'
        +   'pointer-events:none!important;'
        +   'will-change:top,left;'
        + '}'
        /* حالت فشرده کردن صفحه هنگام درگ */
        + 'body.cal-drag-active{touch-action:none!important;overflow:hidden!important;'
        +   'user-select:none!important;-webkit-user-select:none!important}'
        /* نوار روزهای pin شده */
        + '.cal-day-strip.pinned{'
        +   'position:fixed!important;top:0!important;left:0!important;right:0!important;'
        +   'z-index:99998!important;border-radius:0!important;padding:12px 10px!important;'
        +   'background:#fff!important;box-shadow:0 10px 40px rgba(15,23,42,.35)!important;'
        +   'border-bottom:2px solid #1e40af!important;'
        + '}'
        + '.cal-day-strip.pinned::after{'
        +   'content:"📍 انگشت را روی یک روز رها کن";'
        +   'position:absolute;top:100%;left:50%;transform:translateX(-50%);'
        +   'background:#1e40af;color:#fff;font-size:.68rem;font-weight:800;'
        +   'padding:4px 12px;border-radius:0 0 8px 8px;white-space:nowrap;'
        + '}'
        ;
        document.head.appendChild(s);
    }

    /* ============================================================
       استیت درگ
       ============================================================ */
    var drag = null;

    function getPoint(e) {
        if (e.touches && e.touches.length) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        if (e.changedTouches && e.changedTouches.length) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        return { x: e.clientX, y: e.clientY };
    }

    function setupDrag(body) {
        var currentDay = body.getAttribute('data-day');
        var pressTimer = null;
        var cancelled = false;
        var pressStart = null;

        function onStart(e) {
            if (e.type === 'mousedown' && e.button !== 0) return;
            if (drag) return; // درگ فعال است
            var evEl = e.target.closest && e.target.closest('.cal-tl-event');
            if (!evEl) return;
            var evId = evEl.getAttribute('data-ev');
            if (!evId) return;
            var all = window.calBuildAllEvents();
            var ev = all.find(function (x) { return x.id === evId; });
            if (!ev || ev.readonly) return;

            var pt = getPoint(e);
            pressStart = { x: pt.x, y: pt.y };
            cancelled = false;

            clearTimeout(pressTimer);
            pressTimer = setTimeout(function () {
                if (cancelled) return;
                beginDrag(ev, evEl, pressStart);
            }, LONG_PRESS_MS);

            document.addEventListener('touchmove', onMove, { passive: false, capture: true });
            document.addEventListener('touchend', onEnd, { capture: true });
            document.addEventListener('touchcancel', onCancel, { capture: true });
            document.addEventListener('mousemove', onMove, { capture: true });
            document.addEventListener('mouseup', onEnd, { capture: true });
        }

        function onMove(e) {
            if (!drag) {
                var pt = getPoint(e);
                if (!pressStart) return;
                var dx = Math.abs(pt.x - pressStart.x);
                var dy = Math.abs(pt.y - pressStart.y);
                if (dx > MOVE_TOLERANCE || dy > MOVE_TOLERANCE) {
                    cancelled = true;
                    clearTimeout(pressTimer);
                    pressTimer = null;
                    detach();
                }
                return;
            }
            // درگ فعال است
            if (e.cancelable) e.preventDefault();
            updateDrag(getPoint(e));
        }

        function onEnd(e) {
            clearTimeout(pressTimer);
            pressTimer = null;
            if (drag) {
                endDrag();
            }
            detach();
        }

        function onCancel() {
            clearTimeout(pressTimer);
            pressTimer = null;
            cancelled = true;
            if (drag) cancelDrag();
            detach();
        }

        function detach() {
            document.removeEventListener('touchmove', onMove, { capture: true });
            document.removeEventListener('touchend', onEnd, { capture: true });
            document.removeEventListener('touchcancel', onCancel, { capture: true });
            document.removeEventListener('mousemove', onMove, { capture: true });
            document.removeEventListener('mouseup', onEnd, { capture: true });
            pressStart = null;
        }

        body.addEventListener('touchstart', onStart, { passive: true });
        body.addEventListener('mousedown', onStart);

        /* کلیک روی ناحیه خالی → ساخت رویداد */
        body.addEventListener('click', function (e) {
            if (drag) return;
            if (e.target.closest('.cal-tl-event')) return;
            if (e.target.closest('.cal-tl-preview')) return;
            var rect = body.getBoundingClientRect();
            var y = e.clientY - rect.top;
            var totalMin = START_HOUR * 60 + (y / HOUR_HEIGHT) * 60;
            var snapped = Math.round(totalMin / MIN_SNAP) * MIN_SNAP;
            snapped = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60 - 60, snapped));
            var hh = Math.floor(snapped / 60);
            var mm = snapped % 60;
            var ds = body.getAttribute('data-day');
            if (typeof window.openEventModal41 === 'function') {
                window.openEventModal41(null, ds, hh);
                setTimeout(function () {
                    var ti = document.getElementById('evt-start-time');
                    if (ti) ti.value = p2(hh) + ':' + p2(mm);
                    var to = document.getElementById('evt-end-time');
                    if (to) to.value = p2(Math.min(23, hh + 1)) + ':' + p2(mm);
                }, 80);
            }
        });
    }

    /* ============================================================
       شروع درگ — بدون هیچ پرش
       ============================================================ */
    function beginDrag(ev, evEl, pt) {
        var rect = evEl.getBoundingClientRect();

        var sMin = toMin(ev.startTime || ev.time || '21:00');
        var eMin = ev.endTime ? toMin(ev.endTime) : (sMin + 60);
        if (eMin <= sMin) eMin = sMin + 30;

        drag = {
            ev: ev,
            evEl: evEl,
            offsetX: pt.x - rect.left,
            offsetY: pt.y - rect.top,
            origW: rect.width,
            origH: rect.height,
            startMin: sMin,
            endMin: eMin,
            duration: eMin - sMin,
            targetDay: ev.date,
            targetMin: sMin,
            startFingerX: pt.x,
            startFingerY: pt.y
        };

        /* ★ حیاتی: المان را دقیقاً در موقعیت فعلی‌اش فیکس می‌کنیم تا هیچ جهشی رخ ندهد */
        evEl.style.position = 'fixed';
        evEl.style.top = rect.top + 'px';
        evEl.style.left = rect.left + 'px';
        evEl.style.right = 'auto';
        evEl.style.bottom = 'auto';
        evEl.style.width = rect.width + 'px';
        evEl.style.height = rect.height + 'px';
        evEl.style.margin = '0';
        evEl.classList.add('dragging');

        /* قفل کردن کل صفحه */
        document.body.classList.add('cal-drag-active');

        /* پین کردن نوار روزها */
        var strip = document.getElementById('cal-day-strip');
        if (strip) strip.classList.add('pinned');

        /* پیش‌نمایش */
        var preview = document.getElementById('cal-tl-preview');
        if (preview) preview.classList.add('show');

        /* هایپتیک */
        if (navigator.vibrate) { try { navigator.vibrate(20); } catch (er) {} }

        /* آپدیت اول */
        updateDrag(pt);
    }

    /* ============================================================
       آپدیت موقعیت درگ — تعقیب مستقیم انگشت
       ============================================================ */
    function updateDrag(pt) {
        if (!drag) return;
        var st = drag;

        /* ۱) جابجایی بصری دقیقاً هم‌راستا با انگشت */
        st.evEl.style.top = (pt.y - st.offsetY) + 'px';
        st.evEl.style.left = (pt.x - st.offsetX) + 'px';

        /* ۲) تبدیل مختصات انگشت به زمان در تایم‌لاین */
        var body = document.querySelector('.cal-tl-body');
        if (!body) return;
        var bodyRect = body.getBoundingClientRect();
        var relY = pt.y - bodyRect.top - st.offsetY;
        var totalMin = relY / HOUR_HEIGHT * 60;
        var snapped = Math.round(totalMin / MIN_SNAP) * MIN_SNAP;
        var newStart = START_HOUR * 60 + snapped;
        newStart = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60 - st.duration, newStart));
        st.targetMin = newStart;

        /* ۳) بروزرسانی برچسب زمان */
        var tLabel = st.evEl.querySelector('.ev-time');
        if (tLabel) {
            tLabel.textContent = toTime(newStart) + ' — ' + toTime(newStart + st.duration);
        }

        /* ۴) تشخیص روز مقصد */
        var chips = document.querySelectorAll('.cal-day-chip');
        var foundDay = null;
        chips.forEach(function (ch) {
            var r = ch.getBoundingClientRect();
            var hit = pt.x >= r.left && pt.x <= r.right &&
                      pt.y >= r.top - 10 && pt.y <= r.bottom + 10;
            if (hit) {
                var d = ch.getAttribute('data-date');
                if (d) {
                    foundDay = d;
                    ch.classList.add('drag-over');
                }
            } else {
                ch.classList.remove('drag-over');
            }
        });
        if (foundDay) st.targetDay = foundDay;
    }

    /* ============================================================
       پایان یا لغو
       ============================================================ */
    function cleanupDrag() {
        if (!drag) return;
        var st = drag;
        drag = null;

        /* پاک کردن استایل‌های اینلاین درگ */
        st.evEl.classList.remove('dragging');
        st.evEl.style.position = '';
        st.evEl.style.top = '';
        st.evEl.style.left = '';
        st.evEl.style.right = '';
        st.evEl.style.bottom = '';
        st.evEl.style.width = '';
        st.evEl.style.height = '';
        st.evEl.style.margin = '';

        document.body.classList.remove('cal-drag-active');

        var strip = document.getElementById('cal-day-strip');
        if (strip) strip.classList.remove('pinned');
        document.querySelectorAll('.cal-day-chip').forEach(function (c) { c.classList.remove('drag-over'); });
        var preview = document.getElementById('cal-tl-preview');
        if (preview) preview.classList.remove('show');
    }

    function cancelDrag() {
        if (!drag) return;
        cleanupDrag();
        window.calRender();
    }

    function endDrag() {
        if (!drag) return;
        var st = drag;

        /* اگر موقعیت و روز تغییر نکرده بود، فقط رندر مجدد */
        var sameTime = st.startMin === st.targetMin;
        var sameDay = st.ev.date === st.targetDay;

        cleanupDrag();

        if (sameTime && sameDay) {
            window.calRender();
            return;
        }

        applyMove(st);
    }

    /* ============================================================
       اعمال جابجایی در دیتابیس
       ============================================================ */
    function applyMove(st) {
        var rawEv = st.ev;
        var masterId = rawEv.rawId || rawEv.id;
        var list = DB.load('calendarUserEvents', []);
        var master = list.find(function (x) { return x.id === masterId; });
        if (!master) { window.calRender(); return; }

        var newStartTime = toTime(st.targetMin);
        var newEndTime = toTime(st.targetMin + st.duration);

        var isRecurring = master.recurrence &&
                          master.recurrence.freq &&
                          master.recurrence.freq !== 'none';

        if (!isRecurring) {
            var oldStart = master.startDate || master.date;
            var oldP = oldStart.split('/').map(Number);
            var tP = st.targetDay.split('/').map(Number);
            var dayDiff = jalaliDiff(oldP[0], oldP[1], oldP[2], tP[0], tP[1], tP[2]);

            master.startDate = st.targetDay;
            master.date = st.targetDay;
            master.startTime = newStartTime;
            master.time = newStartTime;
            if (master.endDate) master.endDate = addJalaliDays(master.endDate, dayDiff);
            master.endTime = newEndTime;

            DB.save('calendarUserEvents', list);
            afterMove('');
            return;
        }

        /* تکرارشونده → انتخاب دامنه */
        showScope(st, function (scope) {
            var reloaded = DB.load('calendarUserEvents', []);
            var m2 = reloaded.find(function (x) { return x.id === masterId; });
            if (!m2) { window.calRender(); return; }

            var oldDate = rawEv.date;
            var oldP2 = oldDate.split('/').map(Number);
            var tP2 = st.targetDay.split('/').map(Number);
            var dayDiff2 = jalaliDiff(oldP2[0], oldP2[1], oldP2[2], tP2[0], tP2[1], tP2[2]);

            if (scope === 'all') {
                m2.startDate = addJalaliDays(m2.startDate || m2.date, dayDiff2);
                m2.date = m2.startDate;
                if (m2.endDate) m2.endDate = addJalaliDays(m2.endDate, dayDiff2);
                m2.startTime = newStartTime;
                m2.time = newStartTime;
                m2.endTime = newEndTime;
                var ov = DB.load('calendarRecOverrides', {});
                delete ov[masterId];
                DB.save('calendarRecOverrides', ov);
                DB.save('calendarUserEvents', reloaded);
                afterMove('همه رخدادها');
            } else if (scope === 'future') {
                var dayBefore = addJalaliDays(oldDate, -1);
                if (!m2.recurrence) m2.recurrence = {};
                var oldStartDate = m2.startDate || m2.date;
                if (dayBefore < oldStartDate) {
                    reloaded = reloaded.filter(function (x) { return x.id !== masterId; });
                } else {
                    m2.recurrence.ends = 'on';
                    m2.recurrence.until = dayBefore;
                }
                var nm = JSON.parse(JSON.stringify(m2));
                nm.id = 'u_' + uid();
                nm.startDate = st.targetDay;
                nm.date = st.targetDay;
                nm.startTime = newStartTime;
                nm.time = newStartTime;
                nm.endDate = st.targetDay;
                nm.endTime = newEndTime;
                nm.recurrence = JSON.parse(JSON.stringify(m2.recurrence || {}));
                nm.recurrence.ends = 'never';
                nm.recurrence.until = '';
                delete nm.recurrence.exdates;
                reloaded.push(nm);
                DB.save('calendarUserEvents', reloaded);
                afterMove('این و بعدی');
            } else {
                /* this — استثنا */
                var ovs = DB.load('calendarRecOverrides', {});
                if (!ovs[masterId]) ovs[masterId] = {};
                ovs[masterId][oldDate] = { deleted: true };
                DB.save('calendarRecOverrides', ovs);

                var oneOff = {
                    id: 'u_' + uid(),
                    cat: master.cat,
                    startDate: st.targetDay,
                    date: st.targetDay,
                    startTime: newStartTime,
                    time: newStartTime,
                    endDate: st.targetDay,
                    endTime: newEndTime,
                    title: master.title,
                    desc: master.desc || '',
                    location: master.location || '',
                    persons: (master.persons || []).slice(),
                    reminder: master.reminder || 0,
                    recurrence: { freq: 'none' },
                    createdAt: Date.now()
                };
                reloaded.push(oneOff);
                DB.save('calendarUserEvents', reloaded);
                afterMove('فقط این رخداد');
            }
        });
    }

    /* ============================================================
       دیالوگ انتخاب دامنه (این / این و بعدی / همه)
       ============================================================ */
    function showScope(st, cb) {
        var old = document.getElementById('cal-scope21'); if (old) old.remove();
        var oldO = document.getElementById('cal-scope21-ov'); if (oldO) oldO.remove();

        var html = ''
            + '<div id="cal-scope21-ov" class="overlay show" style="z-index:99990"></div>'
            + '<div id="cal-scope21" class="modal show" style="max-width:460px;z-index:99991">'
            +   '<div class="modal-head" style="background:linear-gradient(135deg,#f59e0b,#d97706)">'
            +     '<h2>🔁 رویداد تکرارشونده</h2>'
            +     '<button class="close-btn" id="scope21-close">×</button>'
            +   '</div>'
            +   '<div class="modal-body">'
            +     '<p style="font-size:.88rem;line-height:1.9;color:#374151;margin-bottom:14px">'
            +       'این رویداد بخشی از یک زنجیره‌ی تکرارشونده است.<br>'
            +       '<b>دامنه‌ی جابجایی را انتخاب کنید:</b>'
            +     '</p>'
            +     '<button type="button" class="cs-btn" data-scope="this">'
            +       '<span class="cs-title">📌 فقط این رخداد</span>'
            +       '<span class="cs-sub">تغییر فقط برای رخداد ' + fa(st.ev.date) + '</span>'
            +     '</button>'
            +     '<button type="button" class="cs-btn" data-scope="future">'
            +       '<span class="cs-title">⏩ این و رخدادهای بعدی</span>'
            +       '<span class="cs-sub">از ' + fa(st.ev.date) + ' به بعد جابجا می‌شود</span>'
            +     '</button>'
            +     '<button type="button" class="cs-btn" data-scope="all">'
            +       '<span class="cs-title">🌐 همه‌ی رخدادها</span>'
            +       '<span class="cs-sub">کل زنجیره‌ی تکرار جابجا می‌شود</span>'
            +     '</button>'
            +   '</div>'
            +   '<div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end">'
            +     '<button class="btn-secondary" id="scope21-cancel">انصراف</button>'
            +   '</div>'
            + '</div>';

        /* استایل */
        if (!document.getElementById('cal-scope21-style')) {
            var st2 = document.createElement('style');
            st2.id = 'cal-scope21-style';
            st2.textContent = ''
                + '.cs-btn{width:100%;text-align:right;padding:14px;border:1.5px solid var(--border);'
                + 'background:#fff;border-radius:12px;font-family:inherit;cursor:pointer;'
                + 'transition:all .2s;display:flex;flex-direction:column;gap:5px;margin-bottom:8px}'
                + '.cs-btn:hover{background:#eff6ff;border-color:#3b82f6;transform:translateY(-1px)}'
                + '.cs-btn .cs-title{font-weight:800;color:#1e40af;font-size:.9rem}'
                + '.cs-btn .cs-sub{font-size:.75rem;color:#64748b}';
            document.head.appendChild(st2);
        }

        document.body.insertAdjacentHTML('beforeend', html);
        var close = function () {
            var m = document.getElementById('cal-scope21'); if (m) m.remove();
            var o = document.getElementById('cal-scope21-ov'); if (o) o.remove();
        };
        document.querySelectorAll('#cal-scope21 .cs-btn').forEach(function (b) {
            b.onclick = function () {
                var sc = this.getAttribute('data-scope');
                close();
                cb(sc);
            };
        });
        document.getElementById('scope21-close').onclick = close;
        document.getElementById('scope21-cancel').onclick = close;
        document.getElementById('cal-scope21-ov').onclick = close;
    }

    function afterMove(label) {
        window.calRender();
        if (typeof updateHomeWidgets === 'function') {
            try { updateHomeWidgets(); } catch (e) {}
        }
        if (typeof showToast === 'function') {
            showToast('📅 رویداد جابجا شد' + (label ? ' (' + label + ')' : ''));
        }
    }

    /* ============================================================
       نصب: پس از هر رندر، تایم‌لاین را دوباره با درگ جدید بپوشان
       ============================================================ */
    function fixTimeline() {
        var body = document.querySelector('.cal-tl-body');
        if (!body) return;
        if (body.dataset.dragFixed21 === '1') return;

        /* ★ نکته: با clone کردن، همه‌ی listenerهای پچ ۲۰ حذف می‌شوند */
        var clone = body.cloneNode(true);
        clone.dataset.dragFixed21 = '1';
        clone.dataset.dragReady = '1'; // پچ ۲۰ دیگر دوباره وصل نکند
        body.parentNode.replaceChild(clone, body);

        setupDrag(clone);
    }

    /* Wrapper روی calRender */
    function installWrapper() {
        if (typeof window.calRender !== 'function') {
            setTimeout(installWrapper, 400);
            return;
        }
        if (window.calRender._wrapped21) return;
        var orig = window.calRender;
        var wrapped = function () {
            var r = orig.apply(this, arguments);
            setTimeout(fixTimeline, 0);
            return r;
        };
        wrapped._wrapped21 = true;
        window.calRender = wrapped;
    }

    /* ============================================================
       Boot
       ============================================================ */
    function boot() {
        injectDragCss();
        installWrapper();
        /* اجرای اولیه در صورت رندر قبلی */
        setTimeout(fixTimeline, 200);
        /* شبکه‌ی اطمینان — هر ۲ ثانیه چک کن */
        setInterval(fixTimeline, 2000);
        console.log('✅ [Calendar Drag v21] درگ حرفه‌ای با موقعیت Fixed نصب شد');
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 2400); });
    } else {
        setTimeout(boot, 2400);
    }
})();
