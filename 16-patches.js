/* پارسیس — پچ‌های UI و فیکس‌ها (ادغام 16-ui-patches + 16-fixes-v38) */
'use strict';

/* ═══════════════════════════════════════════════════════════════
   بخش ۱ — ردیف سند با تفصیلی ترکیبی
   ═══════════════════════════════════════════════════════════════ */
(function fixCombinedDetailCell() {
    window.renderVoucherLines = function() {
        var box = document.getElementById('voucher-lines');
        if (!box) return;
        box.innerHTML = '';
        if (voucherLines.length === 0) {
            voucherLines.push({ id: uid(), account: '', details: {}, debit: 0, credit: 0, description: '' });
        }
        var leaves = getLeafAccounts();
        var accounts = DB.load('accounts', []);

        for (var i = 0; i < voucherLines.length; i++) (function(idx) {
            var line = voucherLines[idx];
            if (!line.details) line.details = {};
            var wrap = document.createElement('div');
            wrap.className = 'voucher-line' + (line.locked ? ' locked' : '');
            wrap.setAttribute('data-line-id', line.id);

            var numSpan = document.createElement('span');
            numSpan.className = 'ln-num' + (line.locked ? ' locked-tag' : '');
            numSpan.textContent = '#' + toFa(idx + 1) + (line.locked ? ' 🔒' : '');
            wrap.appendChild(numSpan);

            /* ردیف ۱: انتخاب معین */
            var mainGrid = document.createElement('div');
            mainGrid.className = 'ln-search-row';
            mainGrid.style.paddingTop = '14px';

            var sA = document.createElement('input');
            sA.type = 'text'; sA.className = 'ln-search'; sA.placeholder = '🔍 جستجوی معین...';
            var selA = document.createElement('select');
            var fillA = function(q) {
                var cur = line.account;
                var f = leaves.filter(function(l) {
                    if (!q) return true;
                    return getAccountSearchText(l.id, accounts).indexOf(q) !== -1;
                });
                selA.innerHTML = '';
                var ph = document.createElement('option');
                ph.value = ''; ph.textContent = '— معین —';
                selA.appendChild(ph);
                for (var k = 0; k < f.length; k++) {
                    var o = document.createElement('option');
                    o.value = f[k].id;
                    o.textContent = getAccountLabel(f[k].id, accounts);
                    if (cur === f[k].id) o.selected = true;
                    selA.appendChild(o);
                }
            };
            fillA('');
            if (line.locked) selA.disabled = true;
            sA.addEventListener('input', function() { fillA(normalizeDigits(this.value.trim().toLowerCase())); });
            selA.addEventListener('change', function() {
                line.account = this.value;
                line.details = {};
                renderVoucherLines();
            });
            mainGrid.appendChild(sA);
            mainGrid.appendChild(selA);
            wrap.appendChild(mainGrid);

            /* ردیف ۲: تفصیلی ترکیبی */
            var acc = accounts.find(function(a) { return a.id === line.account; });
            if (acc && acc.links && acc.links.length > 0) {
                var combined = [];
                acc.links.forEach(function(lt) {
                    var items = getLinkedItems(lt);
                    items.forEach(function(it) {
                        var lbl = getLinkedItemLabel(lt, it);
                        combined.push({
                            linkType: lt, id: it.id,
                            label: linkTypeName(lt) + ': ' + lbl,
                            searchText: (lbl + ' ' + linkTypeName(lt)).toLowerCase()
                        });
                    });
                });
                var currentLT = null, currentID = null;
                if (line.details) {
                    acc.links.forEach(function(lt) {
                        if (line.details[lt]) { currentLT = lt; currentID = line.details[lt]; }
                    });
                }
                var detGrid = document.createElement('div');
                detGrid.className = 'ln-search-row';
                detGrid.style.marginTop = '8px';

                var sD = document.createElement('input');
                sD.type = 'text'; sD.className = 'ln-search'; sD.placeholder = '🔍 جستجوی تفصیلی...';
                var selD = document.createElement('select');
                var fillD = function(q) {
                    selD.innerHTML = '';
                    var ph = document.createElement('option');
                    ph.value = ''; ph.textContent = '— تفصیلی —';
                    selD.appendChild(ph);
                    combined.forEach(function(c) {
                        if (q && c.searchText.indexOf(q) === -1) return;
                        var o = document.createElement('option');
                        o.value = c.linkType + '::' + c.id;
                        o.textContent = c.label;
                        if (c.linkType === currentLT && c.id === currentID) o.selected = true;
                        selD.appendChild(o);
                    });
                };
                fillD('');
                if (line.locked) selD.disabled = true;
                sD.addEventListener('input', function() {
                    var q = normalizeDigits(this.value.trim().toLowerCase());
                    var curVal = selD.value;
                    fillD(q);
                    if (curVal) {
                        for (var k = 0; k < selD.options.length; k++) {
                            if (selD.options[k].value === curVal) { selD.selectedIndex = k; break; }
                        }
                    }
                });
                selD.addEventListener('change', function() {
                    line.details = {};
                    if (this.value) {
                        var parts = this.value.split('::');
                        line.details[parts[0]] = parts[1];
                        currentLT = parts[0]; currentID = parts[1];
                    }
                });
                detGrid.appendChild(sD);
                detGrid.appendChild(selD);
                wrap.appendChild(detGrid);
            }

            /* ردیف ۳: مبالغ + شماره/تاریخ پیگیری */
            var r3 = document.createElement('div');
            r3.className = 'ln-row r4';
            r3.style.marginTop = '10px';

            var wD = document.createElement('div');
            wD.className = 'ln-amount-wrap';
            var iD = document.createElement('input');
            iD.type = 'text'; iD.inputMode = 'numeric'; iD.dir = 'ltr'; iD.placeholder = 'بدهکار';
            iD.value = line.debit ? formatRaw(line.debit) : '';
            iD.addEventListener('input', function() {
                var v = normalizeDigits(this.value).replace(/[^\d]/g, '');
                this.value = v;
                var x = Number(v) || 0;
                line.debit = x;
                if (x > 0 && line.credit !== 0) { line.credit = 0; iC.value = ''; }
                updateVoucherTotals();
            });
            iD.addEventListener('blur', function() {
                var v = Number(normalizeDigits(this.value).replace(/[^\d]/g, '')) || 0;
                this.value = v ? formatRaw(v) : '';
                line.debit = v;
                updateVoucherTotals();
            });
            var cD = document.createElement('button');
            cD.type = 'button'; cD.className = 'calc-btn'; cD.textContent = '🧮';
            cD.addEventListener('click', function() {
                calcOpen(function() { return line.debit || 0; }, function(v) {
                    line.debit = v;
                    if (v > 0 && line.credit !== 0) line.credit = 0;
                    renderVoucherLines(); updateVoucherTotals();
                }, 'ماشین حساب بدهکار');
            });
            wD.appendChild(iD); wD.appendChild(cD);

            var wC = document.createElement('div');
            wC.className = 'ln-amount-wrap';
            var iC = document.createElement('input');
            iC.type = 'text'; iC.inputMode = 'numeric'; iC.dir = 'ltr'; iC.placeholder = 'بستانکار';
            iC.value = line.credit ? formatRaw(line.credit) : '';
            iC.addEventListener('input', function() {
                var v = normalizeDigits(this.value).replace(/[^\d]/g, '');
                this.value = v;
                var x = Number(v) || 0;
                line.credit = x;
                if (x > 0 && line.debit !== 0) { line.debit = 0; iD.value = ''; }
                updateVoucherTotals();
            });
            iC.addEventListener('blur', function() {
                var v = Number(normalizeDigits(this.value).replace(/[^\d]/g, '')) || 0;
                this.value = v ? formatRaw(v) : '';
                line.credit = v;
                updateVoucherTotals();
            });
            var cC = document.createElement('button');
            cC.type = 'button'; cC.className = 'calc-btn'; cC.textContent = '🧮';
            cC.addEventListener('click', function() {
                calcOpen(function() { return line.credit || 0; }, function(v) {
                    line.credit = v;
                    if (v > 0 && line.debit !== 0) line.debit = 0;
                    renderVoucherLines(); updateVoucherTotals();
                }, 'ماشین حساب بستانکار');
            });
            wC.appendChild(iC); wC.appendChild(cC);
            r3.appendChild(wD); r3.appendChild(wC);

            var iT = document.createElement('input');
            iT.type = 'text'; iT.dir = 'ltr'; iT.placeholder = 'ش پیگیری';
            iT.value = line.trackingNumber || '';
            iT.addEventListener('input', function() { line.trackingNumber = this.value; });
            r3.appendChild(iT);

            var iTD = document.createElement('input');
            iTD.type = 'text'; iTD.dir = 'ltr'; iTD.placeholder = 'ت پیگیری';
            iTD.value = line.trackingDate || '';
            iTD.classList.add('date-picker');
            iTD.addEventListener('input', function() { line.trackingDate = this.value; });
            r3.appendChild(iTD);
            wrap.appendChild(r3);

            /* ردیف ۴: شرح */
            var r4 = document.createElement('div');
            r4.className = 'desc-row';
            r4.style.marginTop = '8px';
            var iDsc = document.createElement('input');
            iDsc.type = 'text'; iDsc.placeholder = 'شرح قلم *';
            iDsc.value = line.description || '';
            iDsc.setAttribute('list', 'std-desc-list');
            if (!line.description && (Number(line.debit) > 0 || Number(line.credit) > 0)) {
                iDsc.classList.add('desc-required');
            }
            iDsc.addEventListener('input', function() {
                line.description = this.value;
                this.classList.remove('desc-required');
            });
            var clearBtn = document.createElement('button');
            clearBtn.type = 'button'; clearBtn.className = 'desc-clear-btn';
            clearBtn.textContent = '🧹';
            clearBtn.style.cssText = 'background:#fee2e2;color:#dc2626;border:none;border-radius:10px;width:38px;height:38px;font-size:1.05rem;font-weight:800;cursor:pointer;flex-shrink:0';
            clearBtn.addEventListener('click', function(e) {
                e.preventDefault();
                iDsc.value = ''; line.description = '';
                iDsc.classList.remove('desc-required'); iDsc.focus();
            });
            var btnAddDesc = document.createElement('button');
            btnAddDesc.type = 'button'; btnAddDesc.className = 'desc-add-btn'; btnAddDesc.textContent = '＋';
            btnAddDesc.addEventListener('click', function() { addDescriptionToStandard(iDsc.value); });
            r4.appendChild(iDsc); r4.appendChild(clearBtn); r4.appendChild(btnAddDesc);
            wrap.appendChild(r4);

            /* ردیف ۵: دکمه‌ها */
            var aW = document.createElement('div');
            aW.className = 'ln-actions';
            var bU = document.createElement('button');
            bU.className = 'ln-btn'; bU.textContent = '↑';
            if (idx === 0) bU.disabled = true;
            bU.addEventListener('click', function() { moveLine(idx, -1); });
            var bD = document.createElement('button');
            bD.className = 'ln-btn'; bD.textContent = '↓';
            if (idx === voucherLines.length - 1) bD.disabled = true;
            bD.addEventListener('click', function() { moveLine(idx, 1); });
            var bCp = document.createElement('button');
            bCp.className = 'ln-btn ln-copy'; bCp.textContent = '📋 کپی';
            bCp.addEventListener('click', function() { copyVoucherLine(idx); });
            var bSwap = document.createElement('button');
            bSwap.className = 'ln-btn ln-swap'; bSwap.textContent = '🔄 جابجایی';
            bSwap.addEventListener('click', function() {
                var tmp = line.debit; line.debit = line.credit; line.credit = tmp;
                renderVoucherLines();
                showToast('🔄 جابه‌جا شد.');
            });
            var bX = document.createElement('button');
            bX.className = 'ln-btn ln-del'; bX.textContent = '× حذف';
            bX.addEventListener('click', function() {
                if (!confirm('این ردیف حذف شود؟')) return;
                voucherLines.splice(idx, 1);
                renderVoucherLines();
            });
            aW.appendChild(bU); aW.appendChild(bD); aW.appendChild(bCp);
            aW.appendChild(bSwap); aW.appendChild(bX);
            wrap.appendChild(aW);

            box.appendChild(wrap);
        })(i);
        updateVoucherTotals();
        if (typeof attachDatePickers === 'function') attachDatePickers();
    };
})();

/* ═══════════════════════════════════════════════════════════════
   بخش ۲ — انتخاب ساعت عقربه‌ای
   ═══════════════════════════════════════════════════════════════ */
function openTimePicker(callback, initialValue) {
    var old = document.getElementById('time-picker-modal'); if (old) old.remove();
    var oldO = document.getElementById('time-picker-overlay'); if (oldO) oldO.remove();

    var init = initialValue || '21:00';
    var ip = String(init).split(':');
    var selH = Number(ip[0]); if (isNaN(selH)) selH = 21;
    var selM = Number(ip[1]); if (isNaN(selM)) selM = 0;
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
        var dx = px - CX, dy = py - CY;
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

    hhDisp.addEventListener('click', function() { mode = 'hour'; drawNumbers(); drawHands(); });
    mmDisp.addEventListener('click', function() { mode = 'minute'; drawNumbers(); drawHands(); });

    var isDragging = false;
    svg.addEventListener('mousedown', function(e) { isDragging = true; handlePointer(e); });
    document.addEventListener('mousemove', function(e) { if (isDragging) handlePointer(e); });
    document.addEventListener('mouseup', function() { isDragging = false; });
    svg.addEventListener('touchstart', function(e) { isDragging = true; handlePointer(e); }, { passive: true });
    svg.addEventListener('touchmove', function(e) { if (isDragging) { e.preventDefault(); handlePointer(e); } }, { passive: false });
    svg.addEventListener('touchend', function() { isDragging = false; });

    drawNumbers();
    drawHands();

    function close() {
        var o = document.getElementById('time-picker-overlay'); if (o) o.remove();
        var m = document.getElementById('time-picker-modal'); if (m) m.remove();
    }
    document.getElementById('tp-close').onclick = close;
    document.getElementById('tp-cancel').onclick = close;
    document.getElementById('time-picker-overlay').onclick = close;
    document.getElementById('tp-ok').onclick = function() {
        var s = pad2(selH) + ':' + pad2(selM);
        if (callback) callback(s);
        close();
    };
}
window.openTimePicker = openTimePicker;

/* ═══════════════════════════════════════════════════════════════
   بخش ۳ — دفترچه اقساط با ساعت پیش‌فرض ۲۱:۰۰
   ═══════════════════════════════════════════════════════════════ */
(function patchInstallmentTime() {
    window.renderInstallments = function() {
        var box = document.getElementById('fac-installments');
        if (!box) return;
        box.innerHTML = '';
        for (var i = 0; i < currentInstallments.length; i++) {
            (function(idx) {
                var ins = currentInstallments[idx];
                if (!ins.time) ins.time = '21:00';
                var row = document.createElement('div');
                row.className = 'installment-row';
                row.style.cssText = 'display:grid;grid-template-columns:38px 1fr 130px 1fr auto auto auto;gap:8px;align-items:center;padding:10px;background:var(--card-alt);border-radius:12px;margin-bottom:6px;border:1px solid var(--border)';

                var n = document.createElement('span');
                n.textContent = '#' + toFa(idx + 1);
                n.style.fontWeight = 'bold';

                var iD = document.createElement('input');
                iD.type = 'text'; iD.dir = 'ltr'; iD.className = 'date-picker'; iD.placeholder = 'تاریخ';
                iD.value = ins.date || '';
                iD.style.cssText = 'padding:7px 10px;font-size:0.8rem;border:1.5px solid var(--border);border-radius:9px;background:var(--card-solid);width:100%';
                iD.addEventListener('input', function() { ins.date = this.value; });

                var timeWrap = document.createElement('div');
                timeWrap.style.cssText = 'display:flex;gap:4px;align-items:center';
                var iT = document.createElement('input');
                iT.type = 'text'; iT.dir = 'ltr'; iT.placeholder = 'HH:MM';
                iT.value = ins.time || '21:00';
                iT.style.cssText = 'flex:1;padding:7px 8px;font-size:0.8rem;border:1.5px solid var(--border);border-radius:9px;background:var(--card-solid);font-family:monospace;text-align:center;direction:ltr;min-width:0';
                iT.addEventListener('input', function() { ins.time = this.value; });
                var clockBtn = document.createElement('button');
                clockBtn.type = 'button'; clockBtn.textContent = '🕐'; clockBtn.title = 'انتخاب ساعت';
                clockBtn.style.cssText = 'background:var(--primary-soft);color:var(--primary-dark);border:1.5px solid var(--border);width:32px;height:32px;border-radius:9px;cursor:pointer;font-size:1rem;padding:0;flex-shrink:0';
                clockBtn.addEventListener('click', function(e) {
                    e.preventDefault(); e.stopPropagation();
                    openTimePicker(function(hhmm) { ins.time = hhmm; iT.value = hhmm; }, ins.time);
                });
                timeWrap.appendChild(iT); timeWrap.appendChild(clockBtn);

                var iA = document.createElement('input');
                iA.type = 'text'; iA.inputMode = 'numeric'; iA.dir = 'ltr'; iA.placeholder = 'مبلغ';
                iA.value = ins.amount ? formatRaw(ins.amount) : '';
                iA.style.cssText = 'padding:7px 10px;font-size:0.8rem;border:1.5px solid var(--border);border-radius:9px;background:var(--card-solid);width:100%';
                attachMoneyInput(iA, function(v) { ins.amount = v; renderInstallmentsTotals(); });

                var sS = document.createElement('select');
                sS.innerHTML = '<option value="registered">ثبت</option><option value="paid">پرداخت</option>';
                sS.value = ins.status || 'registered';
                sS.style.cssText = 'padding:7px 10px;font-size:0.8rem;border:1.5px solid var(--border);border-radius:9px;background:var(--card-solid);width:100%';
                sS.addEventListener('change', function() { ins.status = this.value; renderInstallmentsTotals(); });

                var d = document.createElement('button');
                d.className = 'row-btn del'; d.textContent = '×';
                d.style.cssText = 'background:#fee2e2;color:#dc2626;border:none;border-radius:9px;padding:7px 10px;font-size:0.95rem;font-weight:800;cursor:pointer';
                d.addEventListener('click', function() {
                    if (!confirm('حذف شود؟')) return;
                    currentInstallments.splice(idx, 1);
                    renderInstallments();
                });

                var lastCell = document.createElement('div');
                if (ins.status === 'paid') {
                    var tag = document.createElement('div');
                    tag.style.cssText = 'font-size:0.72rem;color:#059669;font-weight:800;padding:4px 8px;background:#d1fae5;border-radius:9px;white-space:nowrap';
                    tag.textContent = '✅ پرداخت' + (ins.systemPaid ? ' (سیستمی)' : '');
                    lastCell.appendChild(tag);
                } else {
                    var payBtn = document.createElement('button');
                    payBtn.type = 'button'; payBtn.className = 'inst-pay-btn'; payBtn.textContent = '💳';
                    payBtn.title = 'پرداخت قسط';
                    payBtn.style.cssText = 'background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:9px;padding:7px 10px;font-size:0.9rem;font-weight:800;cursor:pointer';
                    payBtn.addEventListener('click', function() {
                        if (typeof payInstallment === 'function') payInstallment(currentFacilityId, idx);
                    });
                    lastCell.appendChild(payBtn);
                }

                row.appendChild(n); row.appendChild(iD); row.appendChild(timeWrap);
                row.appendChild(iA); row.appendChild(sS); row.appendChild(d); row.appendChild(lastCell);

                box.appendChild(row);
                if (typeof attachDatePickers === 'function') attachDatePickers();
            })(i);
        }
        renderInstallmentsTotals();
    };
})();

/* ═══════════════════════════════════════════════════════════════
   بخش ۴ — استایل دکمه‌های تقویم در inputها
   ═══════════════════════════════════════════════════════════════ */
(function injectCalendarButtonStyle() {
    if (document.getElementById('cal-v39-style')) return;
    var s = document.createElement('style');
    s.id = 'cal-v39-style';
    s.textContent = ''
    + '.date-wrap { position:relative !important; display:block !important }'
    + '.date-wrap .date-picker { padding-left:42px !important; padding-right:12px !important }'
    + '.date-wrap .cal-btn {'
    +   'position:absolute !important; top:50% !important; left:5px !important;'
    +   'transform:translateY(-50%) !important;'
    +   'z-index:99999 !important;'
    +   'pointer-events:auto !important;'
    +   'cursor:pointer !important;'
    +   'width:34px !important; height:34px !important;'
    +   'border-radius:9px !important;'
    +   'border:1.5px solid var(--border) !important;'
    +   'background:var(--primary-soft) !important;'
    +   'color:var(--primary-dark) !important;'
    +   'display:flex !important; align-items:center !important; justify-content:center !important;'
    +   'padding:0 !important; font-size:1.05rem !important;'
    +   'touch-action:manipulation !important;'
    +   'box-shadow:0 1px 3px rgba(15,23,42,0.08) !important;'
    + '}'
    + '.date-wrap .cal-btn:hover { background:var(--primary) !important; color:#fff !important }'
    + '.date-wrap .cal-btn:active { transform:translateY(-50%) scale(0.92) !important }';
    document.head.appendChild(s);
})();

/* ═══════════════════════════════════════════════════════════════
   بخش ۵ — اتصال مطمئن دکمه‌های تقویم به inputها
   ═══════════════════════════════════════════════════════════════ */
(function bulletproofDatePicker() {
    function attachOne(el) {
        if (!el || el.nodeType !== 1) return;
        var parent = el.parentNode;
        if (!parent) return;
        var wrap;
        if (parent.classList && parent.classList.contains('date-wrap')) {
            wrap = parent;
        } else {
            try {
                wrap = document.createElement('div');
                wrap.className = 'date-wrap';
                parent.insertBefore(wrap, el);
                wrap.appendChild(el);
            } catch(err) { return; }
        }
        wrap.style.position = 'relative';
        wrap.style.display = 'block';

        el.style.paddingLeft = '42px';
        el.style.paddingRight = '12px';

        if (wrap.querySelector('.cal-btn')) return;

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cal-btn';
        btn.innerHTML = '📅';
        btn.title = 'باز کردن تقویم';
        btn.setAttribute('data-picker-btn', '1');
        btn.style.cssText = [
            'position:absolute',
            'top:50%',
            'left:5px',
            'transform:translateY(-50%)',
            'z-index:9999',
            'pointer-events:auto',
            'cursor:pointer',
            'width:34px',
            'height:34px',
            'border-radius:9px',
            'border:1.5px solid var(--border)',
            'background:var(--primary-soft)',
            'color:var(--primary-dark)',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'padding:0',
            'font-size:1.05rem',
            'touch-action:manipulation',
            'box-shadow:0 1px 3px rgba(15,23,42,0.08)'
        ].join(';');

        (function(inputEl) {
            var fire = function(ev) {
                if (ev) { ev.preventDefault(); ev.stopPropagation(); }
                if (typeof window.openCalendar === 'function') {
                    try { window.openCalendar(inputEl); }
                    catch(err) { console.error('openCalendar failed:', err); }
                }
            };
            btn.addEventListener('click', fire, false);
            btn.addEventListener('mousedown', function(ev) {
                ev.preventDefault();
                ev.stopPropagation();
            }, true);
            btn.addEventListener('touchstart', function(ev) {
                ev.stopPropagation();
            }, { passive: true });
        })(el);

        wrap.appendChild(btn);
    }

    window.attachDatePickers = function() {
        var els = document.querySelectorAll('.date-picker');
        for (var i = 0; i < els.length; i++) {
            try { attachOne(els[i]); } catch(e) { console.warn('attachOne err:', e); }
        }
    };

    /* Event Delegation (Capture Phase) به‌عنوان لایه پشتیبان */
    document.addEventListener('click', function(e) {
        var t = e.target;
        if (!t || !t.closest) return;
        var btn = t.closest('.cal-btn');
        if (!btn) return;
        if (btn.dataset.handled === '1') {
            delete btn.dataset.handled;
            return;
        }
        var wrap = btn.closest('.date-wrap');
        if (!wrap) return;
        var inp = wrap.querySelector('.date-picker');
        if (!inp) return;
        e.preventDefault();
        e.stopPropagation();
        btn.dataset.handled = '1';
        if (typeof window.openCalendar === 'function') {
            try { window.openCalendar(inp); }
            catch(err) { console.error('openCalendar (delegation) failed:', err); }
        }
    }, true);

    /* اجرای دوره‌ای */
    setTimeout(window.attachDatePickers, 300);
    setTimeout(window.attachDatePickers, 1000);
    setTimeout(window.attachDatePickers, 2500);
    setInterval(window.attachDatePickers, 2000);
})();

/* ═══════════════════════════════════════════════════════════════
   بخش ۶ — ردیف فیلتر فهرست اسناد (تقویم + سلکتور وضعیت)
   ═══════════════════════════════════════════════════════════════ */
(function fixVoucherFilterRow() {
    function buildCustomFilterRow() {
        var table = document.getElementById('voucher-table-list');
        if (!table) return;
        var filterRow = table.querySelector('tr.column-filter-row');
        if (!filterRow) return;
        if (filterRow.dataset.vCustom === '1') return;
        filterRow.dataset.vCustom = '1';

        var dateCell = filterRow.children[1];
        if (dateCell) {
            dateCell.innerHTML = '';
            var dateInp = document.createElement('input');
            dateInp.type = 'text';
            dateInp.placeholder = '📅 تاریخ';
            dateInp.readOnly = true;
            dateInp.style.cssText = 'width:100%;padding:5px 8px;border:1px solid #c8dcef;border-radius:6px;'
                + 'font-family:inherit;font-size:0.75rem;background:#fff;cursor:pointer;text-align:center;direction:ltr;box-sizing:border-box';
            dateInp.addEventListener('click', function() {
                var tmp = document.createElement('input');
                tmp.type = 'text';
                tmp.style.cssText = 'position:fixed;top:-9999px;left:-9999px';
                tmp.addEventListener('input', function() {
                    dateInp.value = tmp.value;
                    applyVoucherColumnFilter(1, tmp.value);
                    tmp.remove();
                });
                document.body.appendChild(tmp);
                if (typeof openCalendar === 'function') openCalendar(tmp);
            });
            dateInp.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                dateInp.value = '';
                applyVoucherColumnFilter(1, '');
            });
            dateInp.title = 'کلیک: انتخاب تاریخ • راست‌کلیک: پاک کردن';
            dateCell.appendChild(dateInp);
        }

        var statusCell = filterRow.children[6];
        if (statusCell) {
            statusCell.innerHTML = '';
            var sel = document.createElement('select');
            sel.style.cssText = 'width:100%;padding:5px 6px;border:1px solid #c8dcef;border-radius:6px;'
                + 'font-family:inherit;font-size:0.75rem;background:#fff;cursor:pointer;box-sizing:border-box';
            sel.innerHTML = '<option value="">همه وضعیت‌ها</option>'
                + '<option value="تأیید">✓ تأییدشده</option>'
                + '<option value="پیش‌نویس">📝 پیش‌نویس</option>';
            sel.addEventListener('change', function() {
                applyVoucherColumnFilter(6, this.value);
            });
            statusCell.appendChild(sel);
        }
    }

    function applyVoucherColumnFilter(colIdx, query) {
        var table = document.getElementById('voucher-table-list');
        if (!table) return;
        var tbody = table.querySelector('tbody');
        if (!tbody) return;
        var q = normalizeDigits(String(query || '').trim().toLowerCase());
        tbody.querySelectorAll('tr').forEach(function(tr) {
            var tds = tr.children;
            if (tds.length === 1 && tds[0].hasAttribute('colspan')) return;
            if (!tds[colIdx]) return;
            var txt = normalizeDigits((tds[colIdx].textContent || '').trim().toLowerCase());
            tr.style.display = (!q || txt.indexOf(q) !== -1) ? '' : 'none';
        });
    }

    setInterval(buildCustomFilterRow, 700);
})();

/* ═══════════════════════════════════════════════════════════════
   بخش ۷ — جمع پایانی تراز + گردش وجه نقد بر اساس ردیف‌های فیلترشده
   ═══════════════════════════════════════════════════════════════ */
(function fixFilteredTotals() {
    function parseNumTxt(txt) {
        var t = normalizeDigits(String(txt || ''));
        var neg = /\(.*\)/.test(t);
        var v = Number(t.replace(/[^\d\-]/g, '')) || 0;
        return neg ? -v : v;
    }

    function recalcTrial() {
        var box = document.getElementById('rt-result');
        if (!box) return;
        var tbody = box.querySelector('tbody');
        if (!tbody) return;
        var tfoot = box.querySelector('tfoot');
        if (!tfoot) return;
        var tD = 0, tC = 0, tMD = 0, tMC = 0;
        tbody.querySelectorAll('tr').forEach(function(tr) {
            if (tr.style.display === 'none') return;
            var c = tr.querySelectorAll('td');
            if (c.length < 6) return;
            tD  += parseNumTxt(c[2].textContent);
            tC  += parseNumTxt(c[3].textContent);
            tMD += parseNumTxt(c[4].textContent);
            tMC += parseNumTxt(c[5].textContent);
        });
        var fc = tfoot.querySelectorAll('td');
        if (fc.length < 6) return;
        fc[2].innerHTML = moneyHtml(tD);
        fc[3].innerHTML = moneyHtml(tC);
        fc[4].innerHTML = moneyHtml(tMD);
        fc[5].innerHTML = moneyHtml(tMC);
    }

    function recalcCfd() {
        var box = document.getElementById('cfd-result');
        if (!box) return;
        var mainTable = box.querySelector('table#cfd-table');
        if (!mainTable) return;
        var tbody = mainTable.querySelector('tbody');
        var tfoot = mainTable.querySelector('tfoot');
        if (!tbody || !tfoot) return;
        var tIn = 0, tOut = 0;
        tbody.querySelectorAll('tr').forEach(function(tr) {
            if (tr.style.display === 'none') return;
            var c = tr.querySelectorAll('td');
            if (c.length < 7) return;
            tIn  += parseNumTxt(c[2].textContent);
            tOut += parseNumTxt(c[3].textContent);
        });
        var fc = tfoot.querySelectorAll('td');
        if (fc.length < 7) return;
        fc[2].innerHTML = moneyHtml(tIn);
        fc[3].innerHTML = moneyHtml(tOut);
        fc[4].innerHTML = moneyHtml(tIn - tOut);
        fc[6].innerHTML = toFa('100.00') + '٪';
    }

    function patchFilterFn() {
        if (typeof window.applyColumnFiltersToTable !== 'function') { setTimeout(patchFilterFn, 700); return; }
        if (window._acftPatched) return;
        window._acftPatched = true;
        var _orig = window.applyColumnFiltersToTable;
        window.applyColumnFiltersToTable = function(tid) {
            _orig.apply(this, arguments);
            setTimeout(function() {
                if (tid === 'rt-table') recalcTrial();
                else if (tid === 'cfd-table') recalcCfd();
            }, 30);
        };
    }

    function observeTable(tableId, cb) {
        var table = document.getElementById(tableId);
        if (!table) return;
        var tbody = table.querySelector('tbody');
        if (!tbody) return;
        if (tbody.dataset.totObs === '1') return;
        tbody.dataset.totObs = '1';
        var obs = new MutationObserver(function() { cb(); });
        obs.observe(tbody, { attributes: true, attributeFilter: ['style'], subtree: true, childList: true });
    }

    setInterval(function() {
        observeTable('rt-table', recalcTrial);
        observeTable('cfd-table', recalcCfd);
    }, 1500);

    document.addEventListener('change', function(e) {
        if (e.target && e.target.id === 'rt-only-balance') setTimeout(recalcTrial, 200);
    }, true);
    document.addEventListener('click', function(e) {
        if (e.target && e.target.id === 'rt-run') setTimeout(recalcTrial, 400);
        if (e.target && e.target.id === 'cfd-run') setTimeout(recalcCfd, 400);
    }, true);

    window._recalcTrial = recalcTrial;
    window._recalcCfd = recalcCfd;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(patchFilterFn, 1200); });
    } else {
        setTimeout(patchFilterFn, 1200);
    }
})();

/* ═══════════════════════════════════════════════════════════════
   بخش ۸ — دو ستون جدید در خلاصه تسهیلات
   ═══════════════════════════════════════════════════════════════ */
(function augmentFacilitySummary() {
    function computeFacilityBalances() {
        var facilities = DB.load('facilities', []);
        var vouchers = DB.load('vouchers', []);
        var map = {};
        facilities.forEach(function(f) {
            var bal = 0;
            if (f.moeinId) {
                vouchers.forEach(function(v) {
                    if (v.status !== 'approved') return;
                    (v.lines || []).forEach(function(l) {
                        if (l.account !== f.moeinId) return;
                        if (l.details && l.details.facility === f.id) {
                            bal += (Number(l.credit) || 0) - (Number(l.debit) || 0);
                        }
                    });
                });
            }
            map[f.id] = bal;
        });
        return map;
    }

    function parseNumTxt(txt) {
        var t = normalizeDigits(String(txt || ''));
        var neg = /\(.*\)/.test(t);
        var v = Number(t.replace(/[^\d]/g, '')) || 0;
        return neg ? -v : v;
    }

    function augment() {
        var table = document.getElementById('rf-table');
        if (!table) return;
        if (table.dataset.augV38 === '1') return;
        table.dataset.augV38 = '1';

        var headerRow = table.querySelector('thead tr');
        if (!headerRow) return;
        var ths = Array.from(headerRow.querySelectorAll('th'));

        var remIdx = -1;
        ths.forEach(function(th, i) {
            if ((th.textContent || '').indexOf('مبلغ باقی') !== -1 && remIdx === -1) remIdx = i;
        });
        if (remIdx === -1) remIdx = 5;

        var balMap = computeFacilityBalances();
        var facilities = DB.load('facilities', []);
        var hide = getHideState('rf');

        var thA = document.createElement('th');
        thA.textContent = 'مانده حسابداری';
        thA.style.background = 'linear-gradient(180deg,#dbeafe,#bfdbfe)';
        thA.style.color = '#1e40af';
        var thB = document.createElement('th');
        thB.textContent = 'مغایرت با حسابداری';
        thB.style.background = 'linear-gradient(180deg,#fef3c7,#fde68a)';
        thB.style.color = '#92400e';

        var refTh = ths[remIdx];
        if (refTh) {
            refTh.parentNode.insertBefore(thA, refTh.nextSibling);
            refTh.parentNode.insertBefore(thB, refTh.nextSibling);
        }

        var tbody = table.querySelector('tbody');
        var totalBal = 0, totalVar = 0;
        tbody.querySelectorAll('tr').forEach(function(tr) {
            var cells = tr.querySelectorAll('td');
            if (cells.length < 6) return;
            var name = (cells[0].textContent || '').trim();
            var f = facilities.find(function(x) { return x.name === name; });
            if (!f) {
                var e1 = document.createElement('td'); e1.className = 'num'; e1.textContent = '—';
                var e2 = document.createElement('td'); e2.className = 'num'; e2.textContent = '—';
                var rc = cells[remIdx];
                rc.parentNode.insertBefore(e1, rc.nextSibling);
                rc.parentNode.insertBefore(e2, rc.nextSibling);
                return;
            }
            var remTxt = cells[remIdx] ? cells[remIdx].textContent : '';
            var rem = (remTxt && remTxt !== '—') ? parseNumTxt(remTxt) : 0;
            var bal = balMap[f.id] || 0;
            var variance = bal - rem;
            totalBal += bal; totalVar += variance;

            var tdA = document.createElement('td');
            tdA.className = 'num';
            tdA.style.color = '#1e40af';
            tdA.style.fontWeight = '800';
            tdA.innerHTML = hide ? '—' : (typeof moneyHtml === 'function' ? moneyHtml(bal) : formatMoney(bal));

            var tdB = document.createElement('td');
            tdB.className = 'num';
            tdB.style.fontWeight = '800';
            tdB.style.color = Math.abs(variance) > 1 ? '#dc2626' : '#059669';
            tdB.innerHTML = hide ? '—' : (typeof moneyHtml === 'function' ? moneyHtml(variance) : formatMoney(variance));

            var refCell = cells[remIdx];
            if (refCell) {
                refCell.parentNode.insertBefore(tdA, refCell.nextSibling);
                refCell.parentNode.insertBefore(tdB, refCell.nextSibling);
            }
        });

        var tfoot = table.querySelector('tfoot tr');
        if (tfoot) {
            var fcs = tfoot.querySelectorAll('td');
            if (fcs.length > remIdx) {
                var fcA = document.createElement('td');
                fcA.className = 'num';
                fcA.style.color = '#1e40af';
                fcA.innerHTML = hide ? '—' : moneyHtml(totalBal);
                var fcB = document.createElement('td');
                fcB.className = 'num';
                fcB.style.color = Math.abs(totalVar) > 1 ? '#dc2626' : '#059669';
                fcB.innerHTML = hide ? '—' : moneyHtml(totalVar);
                var refFc = fcs[remIdx];
                refCell = refFc;
                if (refFc) {
                    refFc.parentNode.insertBefore(fcA, refFc.nextSibling);
                    refFc.parentNode.insertBefore(fcB, refFc.nextSibling);
                }
            }
        }
    }

    var lastHtml = '';
    setInterval(function() {
        var box = document.getElementById('rf-result');
        if (!box) return;
        var cur = box.innerHTML.length + '_' + box.innerHTML.substring(0, 100);
        if (cur !== lastHtml) {
            lastHtml = cur;
            setTimeout(augment, 100);
        }
    }, 800);
})();

/* ═══════════════════════════════════════════════════════════════
   بخش ۹ — تاریخ پیش‌فرض همه گزارش‌ها = دوره مالی فعال
   ═══════════════════════════════════════════════════════════════ */
(function defaultAllReportDates() {
    function getActivePeriod() {
        var periods = DB.load('fiscalPeriods', []);
        return periods.find(function(p) { return p.id === state.activePeriodId; });
    }
    function apply() {
        var ap = getActivePeriod();
        if (!ap) return;
        var pairs = [
            ['cf-from', 'cf-to'],
            ['cfd-from', 'cfd-to'],
            ['ra-from', 'ra-to'],
            ['rt-from', 'rt-to'],
            ['rff-from', 'rff-to'],
            ['rc-from1', 'rc-to1'],
            ['rc-from2', 'rc-to2']
        ];
        pairs.forEach(function(pair) {
            var f = document.getElementById(pair[0]);
            var t = document.getElementById(pair[1]);
            if (f && !f.value) f.value = ap.from;
            if (t && !t.value) t.value = ap.to;
        });
    }
    var lastPage = '';
    setInterval(function() {
        var active = document.querySelector('.page.active');
        if (!active) return;
        var id = active.id;
        if (id === lastPage) return;
        lastPage = id;
        if (id && id.indexOf('report-') === 0) {
            apply();
        }
    }, 400);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(apply, 2000); });
    } else {
        setTimeout(apply, 2000);
    }
})();

/* ═══════════════════════════════════════════════════════════════
   بخش ۱۰ — درگ رویداد در نمای روز تقویم
   ═══════════════════════════════════════════════════════════════ */
(function dayViewDragDrop() {
    function setup() {
        var page = document.getElementById('page-jalali-calendar');
        if (!page) return;
        var dayGrid = page.querySelector('.calg-wgrid.day');
        if (!dayGrid) return;

        dayGrid.querySelectorAll('.calg-wcell').forEach(function(cell) {
            if (cell.dataset.drReady === '1') return;
            cell.dataset.drReady = '1';
            cell.addEventListener('dragover', function(e) {
                e.preventDefault();
                cell.style.background = '#dbeafe';
                cell.style.outline = '2px dashed #3b82f6';
            });
            cell.addEventListener('dragleave', function() {
                cell.style.background = '';
                cell.style.outline = '';
            });
            cell.addEventListener('drop', function(e) {
                e.preventDefault();
                e.stopPropagation();
                cell.style.background = '';
                cell.style.outline = '';
                var evId = e.dataTransfer.getData('text/plain');
                if (!evId) return;
                var newHour = Number(cell.getAttribute('data-hour'));
                var newDate = cell.getAttribute('data-date');
                if (!newHour || !newDate) return;

                var userEvs = DB.load('calendarUserEvents', []);
                var idx = -1;
                for (var i = 0; i < userEvs.length; i++) {
                    if (userEvs[i].id === evId) { idx = i; break; }
                }
                if (idx === -1) { showToast('⚠️ فقط رویدادهای شخصی قابل جابجایی هستند'); return; }

                var oldTime = userEvs[idx].time || '00:00';
                var minutes = '00';
                var parts = oldTime.split(':');
                if (parts.length === 2) minutes = parts[1] || '00';
                userEvs[idx].time = pad2(newHour) + ':' + minutes;
                userEvs[idx].date = newDate;
                DB.save('calendarUserEvents', userEvs);
                showToast('🕒 رویداد به ساعت ' + toFa(newHour) + ':' + toFa(minutes) + ' منتقل شد');
                if (typeof calRender === 'function') calRender();
            });
        });

        dayGrid.querySelectorAll('.wev').forEach(function(ev) {
            if (ev.dataset.drSrc === '1') return;
            ev.dataset.drSrc = '1';
            ev.setAttribute('draggable', 'true');
            ev.style.cursor = 'grab';
            ev.addEventListener('dragstart', function(e) {
                var id = ev.getAttribute('data-ev');
                if (id) {
                    e.dataTransfer.setData('text/plain', id);
                    e.dataTransfer.effectAllowed = 'move';
                    ev.style.opacity = '0.5';
                }
            });
            ev.addEventListener('dragend', function() {
                ev.style.opacity = '';
            });
        });
    }
    setInterval(setup, 900);
})();

/* ═══════════════════════════════════════════════════════════════
   بخش ۱۱ — فعال‌سازی خودکار دقیقه پس از ساعت
   ═══════════════════════════════════════════════════════════════ */
(function autoFocusMinute() {
    function enhance() {
        var timeInp = document.getElementById('calg-time');
        if (!timeInp || timeInp.dataset.minReady === '1') return;
        timeInp.dataset.minReady = '1';
        timeInp.setAttribute('placeholder', 'HH:MM');
        timeInp.setAttribute('maxlength', '5');

        timeInp.addEventListener('input', function() {
            var v = this.value.replace(/[^\d:]/g, '');
            if (/^\d{2}$/.test(v)) {
                this.value = v + ':';
                return;
            }
            if (/^\d{2}:\d{2}$/.test(v)) {
                this.value = v;
            } else {
                this.value = v;
            }
        });

        timeInp.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && /^\d{2}$/.test(this.value)) {
                e.preventDefault();
                this.value = this.value + ':';
            }
        });

        timeInp.addEventListener('focus', function() {
            if (!this.value) this.value = '';
        });
    }
    setInterval(enhance, 800);
})();

/* ═══════════════════════════════════════════════════════════════
   بخش ۱۲ — بهبود اسکن سند (تشخیص معین/تفصیلی + بستانکار پیش‌فرض)
   ═══════════════════════════════════════════════════════════════ */
(function improveScan() {
    async function analyzeWithContext(dataUrl) {
        if (typeof AI === 'undefined' || !AI.apiKey) throw new Error('کلید API تنظیم نشده');

        var accounts = DB.load('accounts', []);
        var leaves = accounts.filter(function(a) { return !accounts.some(function(x) { return x.parent === a.id; }); });
        var accountList = leaves.map(function(a) {
            var lk = (a.links && a.links.length) ? ' [لینک: ' + a.links.join(',') + ']' : '';
            return a.code + ' = ' + a.name + lk;
        }).join('\n');

        var persons = DB.load('persons', []).map(function(p) { return (p.first || '') + ' ' + (p.last || ''); }).filter(Boolean).slice(0, 60).join(' | ');
        var companies = DB.load('companies', []).map(function(c) { return c.name; }).filter(Boolean).slice(0, 40).join(' | ');
        var banks = DB.load('bankAccounts', []).map(function(b) { return (b.bank || '') + (b.account ? ' - ' + b.account : ''); }).join(' | ');
        var cashboxes = DB.load('cashBoxes', []).map(function(c) { return c.title; }).join(' | ');
        var projects = DB.load('projects', []).map(function(p) { return p.name; }).join(' | ');
        var facilities = DB.load('facilities', []).map(function(f) { return f.name; }).join(' | ');

        var prompt = 'این تصویر یک سند/فاکتور/رسید/پوز است. تمام اطلاعات را دقیق استخراج کن و فقط یک JSON خالص برگردان (بدون توضیح، بدون ```):\n\n'
            + '{\n'
            + '  "date": "<تاریخ شمسی YYYY/MM/DD یا خالی>",\n'
            + '  "description": "<شرح کلی سند>",\n'
            + '  "total_amount": <عدد صحیح کل به ریال>,\n'
            + '  "debit_lines": [\n'
            + '    {\n'
            + '      "account_code": "<کد معین از لیست زیر>",\n'
            + '      "amount": <عدد صحیح به ریال>,\n'
            + '      "description": "<شرح این قلم>",\n'
            + '      "details": {\n'
            + '        "person": "<نام شخص از لیست>",\n'
            + '        "company": "<نام شرکت از لیست>",\n'
            + '        "project": "<نام پروژه از لیست>",\n'
            + '        "facility": "<نام تسهیلات از لیست>"\n'
            + '      }\n'
            + '    }\n'
            + '  ]\n'
            + '}\n\n'
            + 'قوانین:\n'
            + '1. اگر مبلغ تومان است، × 10 کن تا ریال شود.\n'
            + '2. هر ردیف هزینه را جدا در debit_lines بگذار.\n'
            + '3. کد معین را از لیست زیر انتخاب کن.\n'
            + '4. اگر معین با تفصیلی مرتبط است، نام دقیق را در details بگذار.\n'
            + '5. اگر مطمئن نیستی، مقدار خالی یا صفر بگذار.\n'
            + '6. سمت بستانکار را نیاز نیست بنویسی.\n\n'
            + '═══ معین‌های معتبر ═══\n' + accountList + '\n\n'
            + '═══ اشخاص موجود ═══\n' + (persons || '(خالی)') + '\n\n'
            + '═══ شرکت‌ها ═══\n' + (companies || '(خالی)') + '\n\n'
            + '═══ بانک‌ها ═══\n' + (banks || '(خالی)') + '\n\n'
            + '═══ صندوق‌ها ═══\n' + (cashboxes || '(خالی)') + '\n\n'
            + '═══ پروژه‌ها ═══\n' + (projects || '(خالی)') + '\n\n'
            + '═══ تسهیلات ═══\n' + (facilities || '(خالی)');

        var result = await aiCallAPI(prompt, { dataUrl: dataUrl, name: 'scan.jpg' });
        var content = (result && result.content) || '';
        var m = content.match(/\{[\s\S]*\}/);
        if (!m) throw new Error('پاسخ AI قابل تجزیه نبود');
        return JSON.parse(m[0]);
    }

    function findMoeinByCode(code) {
        var accounts = DB.load('accounts', []);
        var leaves = accounts.filter(function(a) { return !accounts.some(function(x) { return x.parent === a.id; }); });
        return leaves.find(function(a) { return String(a.code) === String(code); });
    }

    function fuzzyFindDetail(linkType, hint) {
        if (!hint) return '';
        var items = getLinkedItems(linkType);
        var norm = function(s) {
            return String(s || '').toLowerCase()
                .replace(/[يى]/g, 'ی').replace(/[ك]/g, 'ک')
                .replace(/\s+/g, ' ').trim();
        };
        var hintN = norm(hint);
        if (!hintN) return '';
        var exact = items.find(function(it) { return norm(getLinkedItemLabel(linkType, it)) === hintN; });
        if (exact) return exact.id;
        var partial = items.find(function(it) { return norm(getLinkedItemLabel(linkType, it)).indexOf(hintN) !== -1; });
        if (partial) return partial.id;
        var partial2 = items.find(function(it) { return hintN.indexOf(norm(getLinkedItemLabel(linkType, it))) !== -1; });
        if (partial2) return partial2.id;
        var words = hintN.split(' ').filter(function(w) { return w.length > 2; });
        for (var i = 0; i < items.length; i++) {
            var lbl = norm(getLinkedItemLabel(linkType, items[i]));
            var hits = words.filter(function(w) { return lbl.indexOf(w) !== -1; }).length;
            if (hits >= Math.max(1, Math.floor(words.length / 2))) return items[i].id;
        }
        return '';
    }

    function findDefaultCreditMoein() {
        var accounts = DB.load('accounts', []);
        var leaves = accounts.filter(function(a) { return !accounts.some(function(x) { return x.parent === a.id; }); });
        var walletAcc = leaves.find(function(a) { return /کیف|wallet/i.test(a.name || ''); });
        if (walletAcc) return { acc: walletAcc, type: 'wallet' };
        var cashboxes = DB.load('cashBoxes', []);
        var walletCb = cashboxes.find(function(c) { return /کیف|wallet/i.test(c.title || ''); });
        if (walletCb) {
            var cbMoein = leaves.find(function(a) { return a.links && a.links.indexOf('cashbox') !== -1; });
            if (cbMoein) return { acc: cbMoein, type: 'cashbox', detail: walletCb.id };
        }
        var cbAcc = leaves.find(function(a) { return a.links && a.links.indexOf('cashbox') !== -1; });
        if (cbAcc && cashboxes.length > 0) {
            return { acc: cbAcc, type: 'cashbox', detail: cashboxes[0].id };
        }
        var bankMoeinId = (typeof getBankMoeinId === 'function') ? getBankMoeinId() : '';
        if (bankMoeinId) {
            var bankAcc = accounts.find(function(a) { return a.id === bankMoeinId; });
            var banks = DB.load('bankAccounts', []);
            return { acc: bankAcc, type: 'bank', detail: banks[0] ? banks[0].id : '' };
        }
        return null;
    }

    function applyScanData(data) {
        if (data.date && /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(data.date)) {
            var dt = document.getElementById('v-date');
            if (dt) dt.value = data.date;
        }
        if (data.description) {
            var d = document.getElementById('v-desc');
            if (d) d.value = String(data.description).trim();
        }

        var lines = [];
        var totalAmt = 0;
        var debitLines = Array.isArray(data.debit_lines) ? data.debit_lines : [];
        if (debitLines.length === 0 && (data.total_amount || data.amount)) {
            debitLines = [{ amount: data.total_amount || data.amount, description: data.description || 'اسکن شده' }];
        }

        debitLines.forEach(function(dl) {
            var amt = Number(dl.amount) || 0;
            if (amt <= 0) return;
            totalAmt += amt;

            var acc = dl.account_code ? findMoeinByCode(dl.account_code) : null;
            var accId = acc ? acc.id : '';

            var details = {};
            if (acc && acc.links) {
                acc.links.forEach(function(lt) {
                    var hint = dl.details && dl.details[lt];
                    if (!hint) return;
                    var foundId = fuzzyFindDetail(lt, hint);
                    if (foundId) details[lt] = foundId;
                });
            }

            lines.push({
                id: uid(),
                account: accId,
                details: details,
                debit: amt,
                credit: 0,
                description: dl.description || data.description || ''
            });
        });

        if (lines.length === 0) {
            lines.push({ id: uid(), account: '', details: {}, debit: 0, credit: 0, description: '' });
            voucherLines = lines;
            renderVoucherLines();
            return;
        }

        var def = findDefaultCreditMoein();
        if (def && def.acc && totalAmt > 0) {
            var credDetails = {};
            if (def.type === 'cashbox' && def.detail) credDetails.cashbox = def.detail;
            else if (def.type === 'bank' && def.detail) credDetails.bank = def.detail;

            var credDesc = 'پرداخت از ' + (def.acc.name || 'کیف پول');
            lines.push({
                id: uid(),
                account: def.acc.id,
                details: credDetails,
                debit: 0,
                credit: totalAmt,
                description: credDesc
            });
        }

        voucherLines = lines;
        renderVoucherLines();
        goToPage('voucher-new');
        showToast('📷 اسکن انجام شد — ' + toFa(lines.length) + ' قلم تشخیص داده شد');
    }

    function patchAnalyzeButton() {
        var analyzeBtn = document.getElementById('vsc-analyze');
        if (!analyzeBtn || analyzeBtn.dataset.patched === 'v38') return;
        analyzeBtn.dataset.patched = 'v38';
        var newBtn = analyzeBtn.cloneNode(true);
        analyzeBtn.parentNode.replaceChild(newBtn, analyzeBtn);

        newBtn.addEventListener('click', async function() {
            var preview = document.querySelector('#vsc-preview img');
            if (!preview || !preview.src) { alert('ابتدا عکس بگیر'); return; }
            var status = document.getElementById('vsc-status');
            status.style.color = '#4f46e5';
            status.textContent = '🤖 در حال تحلیل با AI... (چند ثانیه صبر کن)';
            status.style.fontWeight = '800';
            try {
                var data = await analyzeWithContext(preview.src);
                applyScanData(data);
                var m = document.getElementById('voucher-scan-modal');
                var o = document.getElementById('voucher-scan-overlay');
                if (m) m.remove();
                if (o) o.remove();
            } catch(e) {
                status.style.color = '#dc2626';
                status.textContent = '⚠️ خطا: ' + (e.message || e);
                console.error('scan error:', e);
            }
        });
    }

    setInterval(patchAnalyzeButton, 800);
})();

console.log('✅ پارسیس — 16-patches بارگذاری شد (UI + فیکس‌ها)');
