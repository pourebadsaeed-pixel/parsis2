/* ============================================================
   پارسیس — برآورد هزینه‌های روزانه (نسخه کامل و اصلاح‌شده)
   مسیر: js/modules/vouchers/estimates.js
   ============================================================ */
'use strict';

var estimateItems = [];

function refreshEstPeriodSelect() {
    var sel = document.getElementById('est-period');
    if (!sel) return;
    var list = DB.load('fiscalPeriods', []);
    var v = sel.value;
    sel.innerHTML = '<option value="">— انتخاب دوره —</option>';
    list.forEach(function (p) {
        var o = document.createElement('option');
        o.value = p.id;
        o.textContent = p.title + ' (' + p.from + ' - ' + p.to + ')';
        sel.appendChild(o);
    });
    sel.value = v || state.activePeriodId || '';
}

function renderEstimateItems() {
    var box = document.getElementById('est-items');
    if (!box) return;
    box.innerHTML = '';

    if (estimateItems.length === 0) {
        estimateItems.push({ id: uid(), date: '', amount: 0 });
    }

    for (var i = 0; i < estimateItems.length; i++) {
        (function (idx) {
            var it = estimateItems[idx];
            var row = document.createElement('div');
            row.className = 'est-item-row';

            var n = document.createElement('span');
            n.textContent = '#' + toFa(idx + 1);
            n.style.fontWeight = 'bold';

            var iD = document.createElement('input');
            iD.type = 'text';
            iD.className = 'date-picker';
            iD.placeholder = 'تاریخ';
            iD.value = it.date || '';
            iD.addEventListener('input', function () { it.date = normalizeDigits(this.value); });

            var iA = document.createElement('input');
            iA.type = 'text';
            iA.inputMode = 'numeric';
            iA.dir = 'ltr';
            iA.placeholder = 'مبلغ';
            iA.value = it.amount ? formatRaw(it.amount) : '';
            iA.addEventListener('input', function () {
                var v = normalizeDigits(this.value);
                var r = v.replace(/[^\d]/g, '');
                this.value = r;
                it.amount = Number(r) || 0;
            });
            iA.addEventListener('blur', function () {
                var v = Number(normalizeDigits(this.value).replace(/[^\d]/g, '')) || 0;
                this.value = v ? formatRaw(v) : '';
                it.amount = v;
            });

            var del = document.createElement('button');
            del.className = 'row-btn del';
            del.textContent = '×';
            del.addEventListener('click', function () {
                if (!confirm('حذف شود؟')) return;
                estimateItems.splice(idx, 1);
                renderEstimateItems();
            });

            row.appendChild(n);
            row.appendChild(iD);
            row.appendChild(iA);
            row.appendChild(del);
            box.appendChild(row);

            if (typeof attachDatePickers === 'function') attachDatePickers();
        })(i);
    }
}

function autoGenerateEstimate() {
    var fromD = normalizeDigits(document.getElementById('est-from').value.trim());
    var toD = normalizeDigits(document.getElementById('est-to').value.trim());
    var total = parseMoney(normalizeDigits(document.getElementById('est-total').value));

    if (!fromD || !toD) { alert('از و تا تاریخ را وارد کنید.'); return; }
    if (!total) { alert('مبلغ تخمینی کل را وارد کنید.'); return; }
    if (fromD > toD) { alert('شروع باید قبل از پایان باشد.'); return; }

    var mode = prompt('نحوه تولید:\n1 - روزانه\n2 - هفتگی\n3 - ماهانه', '1');
    if (!mode) return;
    mode = mode.trim();

    var p1 = fromD.split('/').map(Number);
    var p2 = toD.split('/').map(Number);
    var items = [];

    if (mode === '1') {
        var days = jalaliDiff(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2]) + 1;
        if (days <= 0) { alert('بازه نامعتبر.'); return; }
        var each = Math.floor(total / days);
        var rem = total - each * days;
        for (var d = 0; d < days; d++) {
            var date = addJalaliDays(fromD, d);
            var amt = each + (d === days - 1 ? rem : 0);
            items.push({ id: uid(), date: date, amount: amt });
        }
    } else if (mode === '2') {
        var weeks = Math.ceil((jalaliDiff(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2]) + 1) / 7);
        if (weeks <= 0) { alert('بازه نامعتبر.'); return; }
        var eachW = Math.floor(total / weeks);
        var remW = total - eachW * weeks;
        for (var w = 0; w < weeks; w++) {
            var dateW = addJalaliDays(fromD, w * 7);
            if (dateW > toD) break;
            var amtW = eachW + (w === weeks - 1 ? remW : 0);
            items.push({ id: uid(), date: dateW, amount: amtW });
        }
    } else if (mode === '3') {
        var y1 = p1[0], m1 = p1[1], y2 = p2[0], m2 = p2[1];
        var months = (y2 - y1) * 12 + (m2 - m1) + 1;
        if (months <= 0) { alert('بازه نامعتبر.'); return; }
        var eachM = Math.floor(total / months);
        var remM = total - eachM * months;
        for (var mi = 0; mi < months; mi++) {
            var cy = y1, cm = m1 + mi;
            while (cm > 12) { cm -= 12; cy++; }
            var dateM = cy + '/' + pad2(cm) + '/01';
            if (dateM > toD) break;
            var amtM = eachM + (mi === months - 1 ? remM : 0);
            items.push({ id: uid(), date: dateM, amount: amtM });
        }
    } else {
        alert('گزینه نامعتبر.');
        return;
    }

    estimateItems = items;
    renderEstimateItems();
    showToast('✅ ' + toFa(items.length) + ' آیتم تولید شد.');
}

function renderEstimateList() {
    var list = DB.load('dailyEstimates', []);
    var filterEl = document.getElementById('est-filter');
    var filter = (filterEl ? filterEl.value : '').toLowerCase();
    var box = document.getElementById('est-list-body');
    if (!box) return;
    box.innerHTML = '';

    var periods = DB.load('fiscalPeriods', []);
    var pMap = {};
    periods.forEach(function (p) { pMap[p.id] = p.title; });

    var shown = 0;
    list.sort(function (a, b) { return compareVals(b.from, a.from); });

    list.forEach(function (est) {
        var txt = ((est.title || '') + ' '
                 + (est.desc || '') + ' '
                 + (pMap[est.periodId] || '') + ' '
                 + (est.from || '') + ' '
                 + (est.to || '')).toLowerCase();
        if (filter && txt.indexOf(filter) === -1) return;
        shown++;

        var items = est.items || [];
        var total = items.reduce(function (s, x) { return s + (Number(x.amount) || 0); }, 0);

        var card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:10px">'
            + '<div><strong style="font-size:1rem">' + esc(est.title || est.desc || 'بدون عنوان') + '</strong>'
            + (est.desc && est.title ? '<div class="muted" style="font-size:0.78rem">' + esc(est.desc) + '</div>' : '')
            + '</div><div class="row-actions">'
            + '<button class="row-btn open" data-id="' + est.id + '" data-action="edit">✎</button>'
            + '<button class="row-btn del" data-id="' + est.id + '" data-action="delete">×</button>'
            + '</div></div>'
            + '<div class="facility-summary">'
            + '<div class="item"><div class="lbl">دوره مالی</div><div class="val">' + esc(pMap[est.periodId] || '—') + '</div></div>'
            + '<div class="item"><div class="lbl">از تاریخ</div><div class="val" dir="ltr">' + toFa(esc(est.from || '—')) + '</div></div>'
            + '<div class="item"><div class="lbl">تا تاریخ</div><div class="val" dir="ltr">' + toFa(esc(est.to || '—')) + '</div></div>'
            + '<div class="item"><div class="lbl">مبلغ تخمینی</div><div class="val">' + fmtFor(est.total || 0, 'est-list') + '</div></div>'
            + '<div class="item"><div class="lbl">جمع آیتم‌ها</div><div class="val" style="color:var(--accent)">' + fmtFor(total, 'est-list') + '</div></div>'
            + '<div class="item"><div class="lbl">تعداد</div><div class="val">' + toFa(items.length) + '</div></div>'
            + '</div>';
        box.appendChild(card);
    });

    if (shown === 0) {
        box.innerHTML = '<div class="card"><p class="muted" style="text-align:center">موردی ثبت نشده.</p></div>';
    }

    var countEl = document.getElementById('est-count');
    if (countEl) countEl.textContent = toFa(shown);

    var btns = box.querySelectorAll('[data-action]');
    for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener('click', function () {
            var id = this.getAttribute('data-id');
            var action = this.getAttribute('data-action');
            var est = DB.load('dailyEstimates', []).find(function (x) { return x.id === id; });
            if (!est) return;

            if (action === 'edit') {
                document.getElementById('est-id').value = est.id;
                document.getElementById('est-title').value = est.title || '';
                document.getElementById('est-period').value = est.periodId || '';
                document.getElementById('est-from').value = est.from || '';
                document.getElementById('est-to').value = est.to || '';
                document.getElementById('est-total').value = est.total ? formatRaw(est.total) : '';
                document.getElementById('est-desc').value = est.desc || '';
                estimateItems = JSON.parse(JSON.stringify(est.items || []));
                renderEstimateItems();
                
                var activePage = document.querySelector('.page.active');
                var addTab = activePage ? activePage.querySelector('[data-tab="est-add"]') : null;
                if (addTab) addTab.click();
            } else if (action === 'delete') {
                if (!confirm('حذف شود؟')) return;
                var l = DB.load('dailyEstimates', []).filter(function (x) { return x.id !== id; });
                DB.save('dailyEstimates', l);
                renderEstimateList();
            }
        });
    }
}

function clearEstForm() {
    var ids = ['est-id', 'est-title', 'est-period', 'est-from', 'est-to', 'est-total', 'est-desc'];
    ids.forEach(function (x) {
        var el = document.getElementById(x);
        if (el) el.value = '';
    });
    estimateItems = [];
    renderEstimateItems();
}

function saveEstimate() {
    var id = document.getElementById('est-id').value;
    var title = document.getElementById('est-title').value.trim();
    var periodId = document.getElementById('est-period').value;
    var from = normalizeDigits(document.getElementById('est-from').value.trim());
    var to = normalizeDigits(document.getElementById('est-to').value.trim());
    var total = parseMoney(normalizeDigits(document.getElementById('est-total').value));
    var desc = document.getElementById('est-desc').value.trim();

    if (!title) { alert('عنوان برآورد اجباری است.'); return; }
    if (!from || !to) { alert('از و تا تاریخ اجباری است.'); return; }
    if (!total) { alert('مبلغ تخمینی اجباری است.'); return; }

    var o = {
        id: id || uid(), title: title, periodId: periodId, from: from, to: to, total: total, desc: desc,
        items: estimateItems.map(function (it) { return { id: it.id, date: it.date, amount: Number(it.amount) || 0 }; })
    };

    var l = DB.load('dailyEstimates', []);
    if (id) { for (var i = 0; i < l.length; i++) { if (l[i].id === id) l[i] = o; } } 
    else { l.push(o); }
    DB.save('dailyEstimates', l);
    showToast('✅ ذخیره شد');
    clearEstForm();
    renderEstimateList();
    
    var activePage = document.querySelector('.page.active');
    var listTab = activePage ? activePage.querySelector('[data-tab="est-list"]') : null;
    if (listTab) listTab.click();
}

function bindEstimatesForm() {
    var addItemBtn = document.getElementById('est-add-item');
    if (addItemBtn) addItemBtn.addEventListener('click', function () {
        estimateItems.push({ id: uid(), date: '', amount: 0 });
        renderEstimateItems();
    });

    var genBtn = document.getElementById('est-auto-gen');
    if (genBtn) genBtn.addEventListener('click', autoGenerateEstimate);

    var saveBtn = document.getElementById('save-est');
    if (saveBtn) saveBtn.addEventListener('click', saveEstimate);

    var newBtn = document.getElementById('new-est');
    if (newBtn) newBtn.addEventListener('click', clearEstForm);

    var filterEl = document.getElementById('est-filter');
    if (filterEl) filterEl.addEventListener('input', renderEstimateList);

    attachMoneyInput(document.getElementById('est-total'));
}

window.estimateItems         = estimateItems;
window.refreshEstPeriodSelect = refreshEstPeriodSelect;
window.renderEstimateItems   = renderEstimateItems;
window.autoGenerateEstimate  = autoGenerateEstimate;
window.renderEstimateList    = renderEstimateList;
window.clearEstForm          = clearEstForm;
window.saveEstimate          = saveEstimate;
window.bindEstimatesForm     = bindEstimatesForm;

console.log('✅ [modules/vouchers/estimates.js] loaded — Complete');
