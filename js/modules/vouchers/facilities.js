/* ============================================================
   پارسیس — تسهیلات (بخش ۱: رندر لیست + فرم + اقساط)
   مسیر: js/modules/vouchers/facilities.js
   وابستگی: core/* + ui/* + vouchers/form.js
   ============================================================ */
'use strict';

var currentFacilityId = null;
var currentInstallments = [];

/* ============================================================
   بخش ۱ — پر کردن سلکت بانک
   ============================================================ */
function refreshFacBankSelect() {
    var sel = document.getElementById('fc-bank');
    if (!sel) return;
    var b = DB.load('bankAccounts', []);
    sel.innerHTML = '<option value="">— بانک —</option>';
    for (var i = 0; i < b.length; i++) {
        var o = document.createElement('option');
        o.value = b[i].id;
        o.textContent = (b[i].bank || '') + (b[i].account ? ' - ' + b[i].account : '');
        sel.appendChild(o);
    }
}

function refreshRffBankSelect() {
    var sel = document.getElementById('rff-bank');
    if (!sel) return;
    var b = DB.load('bankAccounts', []);
    var v = sel.value;
    sel.innerHTML = '<option value="">همه</option>';
    for (var i = 0; i < b.length; i++) {
        var o = document.createElement('option');
        o.value = b[i].id;
        o.textContent = (b[i].bank || '') + (b[i].account ? ' - ' + b[i].account : '');
        sel.appendChild(o);
    }
    sel.value = v;
}

/* ============================================================
   بخش ۲ — رندر فهرست تسهیلات
   ============================================================ */
function renderFacilitiesList() {
    var list = DB.load('facilities', []);
    var filterEl = document.getElementById('fac-filter');
    var filter = (filterEl ? filterEl.value : '').toLowerCase();
    var catFilterEl = document.getElementById('fac-cat-filter');
    var cf = catFilterEl ? catFilterEl.value : '';
    var box = document.getElementById('fac-list-body');
    if (!box) return;
    box.innerHTML = '';

    var hide = getHideState('fac-list');

    var filtered = list.filter(function (f) {
        if (cf && (f.category || 'facility') !== cf) return false;
        if (filter) {
            var txt = ((f.name || '') + ' '
                     + categoryName(f.category) + ' '
                     + (f.date || '')).toLowerCase();
            if (txt.indexOf(filter) === -1) return false;
        }
        return true;
    });

    var shown = 0;
    for (var i = 0; i < filtered.length; i++) {
        var f = filtered[i];
        shown++;
        var bank = DB.load('bankAccounts', []).find(function (b) { return b.id === f.bankId; });
        var paid = Number(f.paid || 0);
        var initial = Number(f.initial || 0);
        var rem = initial - paid;
        var set = rem <= 0 && initial > 0;

        var sB = set
            ? '<span class="badge badge-settled">✓ تسویه</span>'
            : '<span class="badge badge-active">در جریان</span>';
        var cB = (f.category === 'scheduled')
            ? '<span class="badge badge-cat-sch">زمان‌بندی</span>'
            : '<span class="badge badge-cat-fac">تسهیلات</span>';

        var card = document.createElement('div');
        card.className = 'card facility-card' + (f.category === 'scheduled' ? ' cat-sch' : '');
        card.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:10px">'
            + '<div><strong style="font-size:1rem">' + esc(f.name) + '</strong> ' + sB + ' ' + cB + '</div>'
            + '<div class="row-actions">'
            + '<button class="row-btn open" data-id="' + f.id + '">📖 اقساط</button>'
            + '<button class="row-btn edit" data-id="' + f.id + '">✎</button>'
            + '<button class="row-btn del" data-id="' + f.id + '"' + (set ? ' disabled' : '') + '>×</button>'
            + '</div></div>'
            + '<div class="facility-summary">'
            + '<div class="item"><div class="lbl">بانک</div><div class="val">' + esc(bank ? bank.bank : '—') + '</div></div>'
            + '<div class="item"><div class="lbl">تاریخ</div><div class="val" dir="ltr">' + toFa(esc(f.date)) + '</div></div>'
            + '<div class="item"><div class="lbl">مبلغ اولیه</div><div class="val">' + (hide ? '—' : formatMoney(initial)) + '</div></div>'
            + '<div class="item"><div class="lbl">پرداخت</div><div class="val" style="color:var(--accent)">' + (hide ? '—' : formatMoney(paid)) + '</div></div>'
            + '<div class="item"><div class="lbl">باقی</div><div class="val" style="color:' + (rem > 0 ? 'var(--danger)' : 'var(--accent)') + '">' + (hide ? '—' : formatMoney(rem)) + '</div></div>'
            + '<div class="item"><div class="lbl">تعداد</div><div class="val">' + toFa((f.installments || []).length) + '</div></div>'
            + '</div>';
        box.appendChild(card);
    }

    if (shown === 0) {
        box.innerHTML = '<div class="card"><p class="muted" style="text-align:center">موردی نیست.</p></div>';
    }

    var countEl = document.getElementById('fac-count');
    if (countEl) countEl.textContent = toFa(shown);

    /* اتصال دکمه‌ها */
    var o = box.querySelectorAll('.row-btn.open');
    var e = box.querySelectorAll('.row-btn.edit');
    var d = box.querySelectorAll('.row-btn.del');

    for (var oi = 0; oi < o.length; oi++) {
        o[oi].addEventListener('click', function () {
            var id = this.getAttribute('data-id');
            var f = DB.load('facilities', []).find(function (x) { return x.id === id; });
            if (f) loadFacilityForInstallments(f);
        });
    }
    for (var ei = 0; ei < e.length; ei++) {
        e[ei].addEventListener('click', function () {
            var id = this.getAttribute('data-id');
            var f = DB.load('facilities', []).find(function (x) { return x.id === id; });
            if (f) loadFacilityIntoForm(f);
        });
    }
    for (var di = 0; di < d.length; di++) {
        d[di].addEventListener('click', function () {
            if (this.disabled) return;
            var id = this.getAttribute('data-id');
            var f = DB.load('facilities', []).find(function (x) { return x.id === id; });
            if (f) tryDeleteFacility(f);
        });
    }
}

/* ============================================================
   بخش ۳ — حذف تسهیلات
   ============================================================ */
function tryDeleteFacility(f) {
    var ins = f.installments || [];
    var pi = ins.filter(function (x) { return x.status === 'paid'; });
    if (pi.length > 0) {
        alert('دارای ' + toFa(pi.length) + ' قسط پرداخت‌شده.');
        return;
    }
    if (ins.length > 0) {
        alert('ابتدا اقساط را حذف کن.');
        return;
    }
    if (!confirm('حذف شود؟')) return;

    var l = DB.load('facilities', []);
    l = l.filter(function (x) { return x.id !== f.id; });
    DB.save('facilities', l);
    renderFacilitiesList();
}

/* ============================================================
   بخش ۴ — بارگذاری تسهیلات در فرم
   ============================================================ */
function loadFacilityIntoForm(f) {
    document.getElementById('fc-id').value = f.id;
    document.getElementById('fc-name').value = f.name || '';
    document.getElementById('fc-category').value = f.category || 'facility';
    document.getElementById('fc-bank').value = f.bankId || '';
    document.getElementById('fc-date').value = f.date || '';
    document.getElementById('fc-initial').value = f.initial ? formatRaw(f.initial) : '';
    document.getElementById('fc-paid').value = f.paid ? formatRaw(f.paid) : '';

    var insCard = document.getElementById('fac-installments-card');
    if (insCard) insCard.style.display = 'none';

    var addTab = document.querySelector('[data-tab="fac-add"]');
    if (addTab) addTab.click();
}

function loadFacilityForInstallments(f) {
    currentFacilityId = f.id;
    currentInstallments = JSON.parse(JSON.stringify(f.installments || []));

    document.getElementById('fc-id').value = f.id;
    document.getElementById('fc-name').value = f.name || '';
    document.getElementById('fc-category').value = f.category || 'facility';
    document.getElementById('fc-bank').value = f.bankId || '';
    document.getElementById('fc-date').value = f.date || '';
    document.getElementById('fc-initial').value = f.initial ? formatRaw(f.initial) : '';
    document.getElementById('fc-paid').value = f.paid ? formatRaw(f.paid) : '';

    var insCard = document.getElementById('fac-installments-card');
    if (insCard) insCard.style.display = 'block';

    renderInstallments();

    var addTab = document.querySelector('[data-tab="fac-add"]');
    if (addTab) addTab.click();

    setTimeout(function () {
        if (insCard) insCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
}

/* ============================================================
   بخش ۵ — رندر اقساط
   ============================================================ */
function renderInstallments() {
    var box = document.getElementById('fac-installments');
    if (!box) return;
    box.innerHTML = '';

    for (var i = 0; i < currentInstallments.length; i++) {
        (function (idx) {
            var ins = currentInstallments[idx];
            if (!ins.time) ins.time = '21:00';

            var row = document.createElement('div');
            row.className = 'installment-row';
            row.style.cssText = 'display:grid;grid-template-columns:38px 1fr 130px 1fr auto auto auto;gap:8px;align-items:center;padding:10px;background:var(--card-alt);border-radius:12px;margin-bottom:6px;border:1px solid var(--border)';

            var n = document.createElement('span');
            n.textContent = '#' + toFa(idx + 1);
            n.style.fontWeight = 'bold';

            var iD = document.createElement('input');
            iD.type = 'text';
            iD.dir = 'ltr';
            iD.className = 'date-picker';
            iD.placeholder = 'تاریخ';
            iD.value = ins.date || '';
            iD.style.cssText = 'padding:7px 10px;font-size:0.8rem;border:1.5px solid var(--border);border-radius:9px;background:var(--card-solid);width:100%';
            iD.addEventListener('input', function () { ins.date = this.value; });

            var timeWrap = document.createElement('div');
            timeWrap.style.cssText = 'display:flex;gap:4px;align-items:center';
            var iT = document.createElement('input');
            iT.type = 'text';
            iT.dir = 'ltr';
            iT.placeholder = 'HH:MM';
            iT.value = ins.time || '21:00';
            iT.style.cssText = 'flex:1;padding:7px 8px;font-size:0.8rem;border:1.5px solid var(--border);border-radius:9px;background:var(--card-solid);font-family:monospace;text-align:center;direction:ltr;min-width:0';
            iT.addEventListener('input', function () { ins.time = this.value; });

            var clockBtn = document.createElement('button');
            clockBtn.type = 'button';
            clockBtn.textContent = '🕐';
            clockBtn.title = 'انتخاب ساعت';
            clockBtn.style.cssText = 'background:var(--primary-soft);color:var(--primary-dark);border:1.5px solid var(--border);width:32px;height:32px;border-radius:9px;cursor:pointer;font-size:1rem;padding:0;flex-shrink:0';
            clockBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (typeof openTimePicker === 'function') {
                    openTimePicker(function (hhmm) {
                        ins.time = hhmm;
                        iT.value = hhmm;
                    }, ins.time);
                }
            });
            timeWrap.appendChild(iT);
            timeWrap.appendChild(clockBtn);

            var iA = document.createElement('input');
            iA.type = 'text';
            iA.inputMode = 'numeric';
            iA.dir = 'ltr';
            iA.placeholder = 'مبلغ';
            iA.value = ins.amount ? formatRaw(ins.amount) : '';
            iA.style.cssText = 'padding:7px 10px;font-size:0.8rem;border:1.5px solid var(--border);border-radius:9px;background:var(--card-solid);width:100%';
            attachMoneyInput(iA, function (v) { ins.amount = v; renderInstallmentsTotals(); });

            var sS = document.createElement('select');
            sS.innerHTML = '<option value="registered">ثبت</option><option value="paid">پرداخت</option>';
            sS.value = ins.status || 'registered';
            sS.style.cssText = 'padding:7px 10px;font-size:0.8rem;border:1.5px solid var(--border);border-radius:9px;background:var(--card-solid);width:100%';
            sS.addEventListener('change', function () { ins.status = this.value; renderInstallmentsTotals(); });

            var d = document.createElement('button');
            d.className = 'row-btn del';
            d.textContent = '×';
            d.style.cssText = 'background:#fee2e2;color:#dc2626;border:none;border-radius:9px;padding:7px 10px;font-size:0.95rem;font-weight:800;cursor:pointer';
            d.addEventListener('click', function () {
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
                payBtn.type = 'button';
                payBtn.className = 'inst-pay-btn';
                payBtn.textContent = '💳';
                payBtn.title = 'پرداخت قسط';
                payBtn.style.cssText = 'background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:9px;padding:7px 10px;font-size:0.9rem;font-weight:800;cursor:pointer';
                payBtn.addEventListener('click', function () {
                    if (typeof payInstallment === 'function') payInstallment(currentFacilityId, idx);
                });
                lastCell.appendChild(payBtn);
            }

            row.appendChild(n);
            row.appendChild(iD);
            row.appendChild(timeWrap);
            row.appendChild(iA);
            row.appendChild(sS);
            row.appendChild(d);
            row.appendChild(lastCell);

            box.appendChild(row);
            if (typeof attachDatePickers === 'function') attachDatePickers();
        })(i);
    }
    renderInstallmentsTotals();
}

/* ============================================================
   بخش ۶ — جمع‌های اقساط
   ============================================================ */
function renderInstallmentsTotals() {
    var ti = 0, tp = 0;
    for (var i = 0; i < currentInstallments.length; i++) {
        ti += Number(currentInstallments[i].amount || 0);
        if (currentInstallments[i].status === 'paid') {
            tp += Number(currentInstallments[i].amount || 0);
        }
    }

    var init = parseMoney(normalizeDigits(document.getElementById('fc-initial').value));
    var rem = init - tp;

    document.getElementById('fac-total-inst').textContent = formatMoney(ti);
    document.getElementById('fac-total-paid').textContent = formatMoney(tp);
    document.getElementById('fac-total-remaining').textContent = formatMoney(rem);
    document.getElementById('fc-paid').value = formatRaw(tp);

    var s = document.getElementById('fac-summary');
    if (s) {
        s.innerHTML = '<div class="item"><div class="lbl">مبلغ اولیه</div><div class="val">' + formatMoney(init) + '</div></div>'
            + '<div class="item"><div class="lbl">جمع اقساط</div><div class="val">' + formatMoney(ti) + '</div></div>'
            + '<div class="item"><div class="lbl">پرداخت</div><div class="val" style="color:var(--accent)">' + formatMoney(tp) + '</div></div>'
            + '<div class="item"><div class="lbl">باقی</div><div class="val" style="color:' + (rem > 0 ? 'var(--danger)' : 'var(--accent)') + '">' + formatMoney(rem) + '</div></div>';
    }
}

/* ============================================================
   بخش ۷ — تاریخ ماه بعد
   ============================================================ */
function nextMonthDate(dateStr) {
    var p = (dateStr || todayJalaliStr()).split('/').map(Number);
    if (p.length !== 3) {
        var t = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
        p = t;
    }
    var y = p[0], m = p[1] + 1, d = p[2];
    if (m > 12) { m = 1; y++; }
    var dim = daysInJalaliMonth(y, m);
    if (d > dim) d = dim;
    return y + '/' + pad2(m) + '/' + pad2(d);
}

/* ============================================================
   بخش ۸ — تولید خودکار اقساط
   ============================================================ */
function autoGenerateInstallments() {
    var init = parseMoney(normalizeDigits(document.getElementById('fc-initial').value));
    if (!init) { alert('مبلغ اولیه.'); return; }

    var dS = document.getElementById('fc-date').value || todayJalaliStr();
    var df = nextMonthDate(dS);
    var fD = prompt('تاریخ اولین قسط:', toFa(df));
    if (!fD) return;
    fD = normalizeDigits(fD.trim());
    if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(fD)) { alert('فرمت اشتباه.'); return; }

    var cs = prompt('تعداد اقساط:', '۱۲');
    if (!cs) return;
    var cnt = Number(normalizeDigits(cs));
    if (!cnt || cnt < 1) { alert('نامعتبر.'); return; }

    var each = Math.floor(init / cnt);
    var rem = init - each * cnt;

    currentInstallments = [];
    var p = fD.split('/').map(Number);
    var y = p[0], m = p[1], d = p[2];

    for (var i = 0; i < cnt; i++) {
        var cY = y, cM = m + i, cD = d;
        while (cM > 12) { cM -= 12; cY++; }
        var dim = daysInJalaliMonth(cY, cM);
        if (cD > dim) cD = dim;
        var amt = each + (i === cnt - 1 ? rem : 0);
        currentInstallments.push({
            id: uid(),
            date: cY + '/' + pad2(cM) + '/' + pad2(cD),
            time: '21:00',
            amount: amt,
            status: 'registered'
        });
    }
    renderInstallments();
}

/* ============================================================
   بخش ۹ — پاک کردن فرم
   ============================================================ */
function clearFacForm() {
    var ids = ['fc-id', 'fc-name', 'fc-date', 'fc-initial', 'fc-paid'];
    ids.forEach(function (x) {
        var el = document.getElementById(x);
        if (el) el.value = '';
    });
    document.getElementById('fc-category').value = 'facility';
    document.getElementById('fc-bank').value = '';
    var insCard = document.getElementById('fac-installments-card');
    if (insCard) insCard.style.display = 'none';

    currentFacilityId = null;
    currentInstallments = [];
}
