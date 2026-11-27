/* ============================================================
   پارسیس — ماژول انبار (درخواست کالا + کارت موجودی + ارزش‌گذاری) ✅ v2.7.0
   مسیر: js/modules/stock.js

   ✅ v2.7.0 — الگوبرداری از انبار ERPهای روز دنیا:
     • درخواست کالا: گردش کار تأیید → صدور خودکار حوالهٔ خروج انبار
     • کارت موجودی کالا: گردش ورود/خروج + موجودی لحظه‌ای در هر ردیف
     • گزارش گردش کالا: جمع ورود/خروج همهٔ کالاها در بازه
     • ارزش‌گذاری موجودی: میانگین موزون (Weighted Average) + آخرین فی خرید
     • قیمت‌گذاری فروش: فی پیشنهادی = میانگین موزون × (۱ + حاشیه سود)
   ذخیره: «stockRequests» (+ کالاهای انبار و حواله‌های موجود)
   ============================================================ */
'use strict';

var SREQ_STORE = 'stockRequests';

var SREQ_STATUS = [
    { key: 'pending', label: 'در انتظار تأیید', bg: '#fef3c7', fg: '#92400e' },
    { key: 'issued',  label: 'صادرشده (حواله خروج)', bg: '#ecfdf5', fg: '#065f46' },
    { key: 'rejected',label: 'ردشده', bg: '#fee2e2', fg: '#991b1b' },
    { key: 'partial', label: 'صادرشده (جزئی)', bg: '#fef9c3', fg: '#854d0e' }
];

var _sreqLines = [];

function _sreqCtx() {
    return { boxId: 'sreq-lines', lines: _sreqLines, showPrice: false };
}

/* ============================================================
   میانگین موزون + آخرین فی خرید (Weighted Average Cost)
   ============================================================ */

function stockAvgCost(itemId) {
    var moves = DB.load('inventoryMoves', []);
    if (!Array.isArray(moves)) moves = [];
    var rows = moves.slice().sort(function (a, b) {
        return String(a.date || '').localeCompare(String(b.date || ''));
    });
    var qty = 0, val = 0, avg = 0, last = 0;
    rows.forEach(function (m) {
        if (!m || m.itemId !== itemId) return;
        var q = Number(m.qty) || 0;
        var p = Number(m.price) || 0;
        if (m.kind === 'in') {
            qty += q;
            val += q * p;
            if (p > 0) last = p;
            avg = qty > 0 ? val / qty : 0;
        } else {
            qty -= q;
            val = qty > 0 ? qty * avg : Math.max(0, val - q * avg);
        }
    });
    return { avg: avg, last: last, qty: qty };
}

/* ============================================================
   ۱) درخواست کالا (Stock Request)
   ============================================================ */

function renderSreqList() {
    var list = DB.load(SREQ_STORE, []);
    if (!Array.isArray(list)) list = [];
    var tb = document.getElementById('sreq-list-body');
    if (!tb) return;

    var filterEl = document.getElementById('sreq-filter');
    var filter = (filterEl ? filterEl.value : '').toLowerCase();

    var rows = list.slice().sort(function (a, b) {
        return String(b.date || '').localeCompare(String(a.date || '')) ||
               (Number(normalizeDigits(String(b.no || ''))) || 0) - (Number(normalizeDigits(String(a.no || ''))) || 0);
    });

    var shown = 0, html = '';
    rows.forEach(function (v) {
        var hay = ((v.no || '') + ' ' + (v.requester || '') + ' ' + (v.note || '') + ' ' + (v.date || '')).toLowerCase();
        if (filter && hay.indexOf(filter) === -1) return;
        shown++;

        var st = SREQ_STATUS.filter(function (x) { return x.key === v.status; })[0] || SREQ_STATUS[0];
        var stBadge = '<span style="display:inline-block;background:' + st.bg + ';color:' + st.fg + ';border-radius:99px;padding:2px 10px;font-size:.68rem;font-weight:800;white-space:nowrap">' + esc(st.label) + '</span>';

        var acts = '';
        if (v.status === 'pending') {
            acts += '<button class="row-btn ok" data-id="' + esc(v.id) + '" title="تأیید + صدور حواله خروج">✓</button>';
            acts += '<button class="row-btn reject" data-id="' + esc(v.id) + '" title="رد درخواست">✗</button>';
        }
        acts += '<button class="row-btn edit" data-id="' + esc(v.id) + '">✎</button>';
        acts += '<button class="row-btn del" data-id="' + esc(v.id) + '">×</button>';

        html += '<tr>'
            + '<td dir="ltr">' + toFa(esc(v.no || '—')) + '</td>'
            + '<td dir="ltr">' + toFa(esc(v.date || '—')) + '</td>'
            + '<td>' + esc(v.requester || '—') + '</td>'
            + '<td>' + toFa(String((v.lines || []).length)) + ' قلم</td>'
            + '<td>' + stBadge + '</td>'
            + '<td><div class="row-actions">' + Hist.rowBtn(v.id, 'درخواست کالا ' + (v.no || '')) + acts + '</div></td></tr>';
    });

    tb.innerHTML = shown ? html : '<tr><td colspan="6" class="empty-row">درخواست کالایی ثبت نشده است.</td></tr>';
    var countEl = document.getElementById('sreq-count');
    if (countEl) countEl.textContent = toFa(shown);

    Array.prototype.slice.call(tb.querySelectorAll('.row-btn.ok')).forEach(function (b) {
        b.onclick = function () { _sreqIssue(b.getAttribute('data-id')); };
    });
    Array.prototype.slice.call(tb.querySelectorAll('.row-btn.reject')).forEach(function (b) {
        b.onclick = function () { _sreqSetStatus(b.getAttribute('data-id'), 'rejected'); };
    });
    Array.prototype.slice.call(tb.querySelectorAll('.row-btn.edit')).forEach(function (b) {
        b.onclick = function () {
            var id = b.getAttribute('data-id');
            var v = (DB.load(SREQ_STORE, []) || []).filter(function (x) { return x && x.id === id; })[0];
            if (!v) return;
            if (v.status !== 'pending') { alert('فقط درخواست «در انتظار تأیید» قابل ویرایش است.'); return; }
            fillSreqForm(v);
            var addTab = document.querySelector('#page-stock-requests .tab-btn[data-tab="sreq-add"]');
            if (addTab) addTab.click();
        };
    });
    Array.prototype.slice.call(tb.querySelectorAll('.row-btn.del')).forEach(function (b) {
        b.onclick = function () {
            var id = b.getAttribute('data-id');
            var v = (DB.load(SREQ_STORE, []) || []).filter(function (x) { return x && x.id === id; })[0];
            if (!v) return;
            if (!confirm('حذف درخواست کالا شماره «' + (v.no || '') + '»؟')) return;
            DB.save(SREQ_STORE, (DB.load(SREQ_STORE, []) || []).filter(function (x) { return x.id !== id; }));
            Hist.log(SREQ_STORE, id, 'حذف', v, null, 'درخواست کالا ' + (v.no || ''));
            renderSreqList();
            showToast('🗑 درخواست کالا حذف شد');
        };
    });

    Hist.bindRowButtons(tb, SREQ_STORE);
}

function _sreqSetStatus(id, status) {
    var list = DB.load(SREQ_STORE, []);
    list = list.map(function (x) {
        if (x && x.id === id) {
            var b = JSON.parse(JSON.stringify(x));
            x.status = status;
            Hist.log(SREQ_STORE, id, status === 'rejected' ? 'رد' : 'تغییر وضعیت', b, x, 'درخواست کالا ' + x.no);
        }
        return x;
    });
    DB.save(SREQ_STORE, list);
    renderSreqList();
    showToast(status === 'rejected' ? '🚫 درخواست رد شد' : '✅ وضعیت به‌روز شد');
}

/* تأیید درخواست → حوالهٔ خروج انبار (مثل ERP: تحویل به متقاضی) */
function _sreqIssue(id) {
    var req = (DB.load(SREQ_STORE, []) || []).filter(function (x) { return x && x.id === id; })[0];
    if (!req) return;

    var moves = DB.load('inventoryMoves', []);
    if (!Array.isArray(moves)) moves = [];
    var moveIds = [];
    var partial = false;

    (req.lines || []).forEach(function (l) {
        if (!l.itemId) return;
        var stock = (typeof inventoryStockOf === 'function') ? inventoryStockOf(l.itemId) : 9999;
        var qty = Number(l.qty) || 0;
        if (qty <= 0) return;
        var issueQty = qty;
        if (stock < qty) {
            if (!confirm('موجودی «' + plItemName(l.itemId) + '» فقط ' + toFa(String(stock)) + ' است — ' + toFa(String(qty)) + ' خواسته شده. همین مقدار صادر شود؟')) {
                issueQty = 0;
            } else {
                issueQty = stock;
                partial = true;
            }
        }
        if (issueQty > 0) {
            var mv = { id: uid(), kind: 'out', date: req.date || todayJalaliStr(), itemId: l.itemId,
                       qty: issueQty, price: 0, party: req.requester || '',
                       refNo: 'درخواست کالا ' + (req.no || ''), desc: 'تحویل از درخواست ' + (req.no || '') };
            moves.push(mv);
            moveIds.push(mv.id);
        }
    });

    if (!moveIds.length) { alert('هیچ قلمی قابل صدور نبود.'); return; }

    DB.save('inventoryMoves', moves);

    var list = DB.load(SREQ_STORE, []);
    list = list.map(function (x) {
        if (x && x.id === id) {
            var b = JSON.parse(JSON.stringify(x));
            x.status = partial ? 'partial' : 'issued';
            x.moveIds = moveIds;
            Hist.log(SREQ_STORE, id, 'تأیید + صدور حواله خروج', b, x, 'درخواست کالا ' + x.no);
        }
        return x;
    });
    DB.save(SREQ_STORE, list);

    renderSreqList();
    if (typeof renderInvItemsList === 'function') renderInvItemsList();
    showToast('✅ حوالهٔ خروج انبار صادر شد' + (partial ? ' (جزئی — موجودی کمتر از درخواست بود)' : ''));
}

function fillSreqForm(v) {
    document.getElementById('sreq-id').value = v.id || '';
    document.getElementById('sreq-no').value = v.no || '';
    document.getElementById('sreq-date').value = v.date || todayJalaliStr();
    document.getElementById('sreq-requester').value = v.requester || '';
    document.getElementById('sreq-note').value = v.note || '';
    _sreqLines = (v.lines || []).map(function (l) {
        return { itemId: l.itemId || '', desc: l.desc || '', qty: l.qty || '', price: '' };
    });
    if (!_sreqLines.length) _sreqLines.push({ itemId: '', desc: '', qty: '', price: '' });
    plRenderLines(_sreqCtx());
    var btn = document.getElementById('save-sreq');
    if (btn) btn.innerHTML = '💾 ذخیره تغییرات';
}

function clearSreqForm() {
    document.getElementById('sreq-id').value = '';
    document.getElementById('sreq-no').value = plNextNo(SREQ_STORE);
    document.getElementById('sreq-date').value = todayJalaliStr();
    document.getElementById('sreq-requester').value = '';
    document.getElementById('sreq-note').value = '';
    _sreqLines = [{ itemId: '', desc: '', qty: '', price: '' }];
    plRenderLines(_sreqCtx());
    var btn = document.getElementById('save-sreq');
    if (btn) btn.innerHTML = '💾 ذخیره';
}

function bindSreqForm() {
    var addLineBtn = document.getElementById('sreq-add-line');
    if (addLineBtn && !addLineBtn.dataset.bound) {
        addLineBtn.dataset.bound = '1';
        addLineBtn.onclick = function () {
            _sreqLines.push({ itemId: '', desc: '', qty: '', price: '' });
            plRenderLines(_sreqCtx());
        };
    }

    var saveBtn = document.getElementById('save-sreq');
    if (saveBtn && !saveBtn.dataset.bound) {
        saveBtn.dataset.bound = '1';
        saveBtn.onclick = function () {
            var id = document.getElementById('sreq-id').value;
            var no = normalizeDigits(document.getElementById('sreq-no').value.trim());
            var date = normalizeDigits(document.getElementById('sreq-date').value.trim());
            var requester = document.getElementById('sreq-requester').value.trim();
            var note = document.getElementById('sreq-note').value.trim();
            if (!date) { alert('⚠️ تاریخ اجباری است.'); return; }
            if (!no) { alert('⚠️ شماره درخواست اجباری است.'); return; }
            var lines = plValidLines(_sreqLines);
            if (!lines.length) { alert('⚠️ حداقل یک ردیف با کالا و تعداد لازم است.'); return; }

            var list = DB.load(SREQ_STORE, []);
            if (!Array.isArray(list)) list = [];
            var dup = list.filter(function (x) { return x && x.id !== id && normalizeDigits(String(x.no || '')) === no; })[0];
            if (dup) { alert('⚠️ درخواستی با شماره «' + no + '» قبلاً ثبت شده است.'); return; }

            var before = null, rec = null;
            if (id) {
                list.forEach(function (x) { if (x.id === id) before = JSON.parse(JSON.stringify(x)); });
                if (!before) { alert('❌ درخواست یافت نشد.'); return; }
                rec = before;
                rec.no = no; rec.date = date; rec.requester = requester; rec.note = note; rec.lines = lines;
                list = list.map(function (x) { return x.id === id ? rec : x; });
                Hist.log(SREQ_STORE, id, 'ویرایش', before, rec);
                showToast('✅ تغییرات درخواست ذخیره شد.');
            } else {
                rec = { id: uid(), no: no, date: date, requester: requester, note: note,
                        lines: lines, status: 'pending', moveIds: [] };
                list.push(rec);
                Hist.log(SREQ_STORE, rec.id, 'ایجاد', null, rec);
                showToast('✅ درخواست کالا «' + no + '» ثبت شد.');
            }
            DB.save(SREQ_STORE, list);
            clearSreqForm();
            renderSreqList();
            var listTab = document.querySelector('#page-stock-requests .tab-btn[data-tab="sreq-list"]');
            if (listTab) listTab.click();
        };
    }
    var newBtn = document.getElementById('new-sreq');
    if (newBtn && !newBtn.dataset.bound) {
        newBtn.dataset.bound = '1';
        newBtn.onclick = clearSreqForm;
    }
    var f = document.getElementById('sreq-filter');
    if (f && !f.dataset.bound) {
        f.dataset.bound = '1';
        f.addEventListener('input', renderSreqList);
    }
}

function initSreqPage() {
    if (!document.getElementById('sreq-date').value) document.getElementById('sreq-date').value = todayJalaliStr();
    if (!document.getElementById('sreq-no').value) document.getElementById('sreq-no').value = plNextNo(SREQ_STORE);
    plRenderLines(_sreqCtx());
    renderSreqList();
    bindSreqForm();
    if (typeof Hist !== 'undefined' && Hist.renderTab) Hist.renderTab(SREQ_STORE, '#sreq-id', '#hist-sreq');
}

/* ============================================================
   ۲) کارت موجودی کالا (Stock Card) + گردش کالا
   ============================================================ */

function _stockFillItemSelect(selId) {
    var sel = document.getElementById(selId);
    if (!sel) return;
    var items = DB.load('inventoryItems', []);
    if (!Array.isArray(items)) items = [];
    var html = '<option value="">— انتخاب کالا —</option>';
    items.forEach(function (it) {
        html += '<option value="' + esc(it.id) + '">' + esc((it.code ? it.code + ' - ' : '') + (it.name || '')) + '</option>';
    });
    sel.innerHTML = html;
}

function runStockCard() {
    var itemId = (document.getElementById('sc-item') || {}).value || '';
    var from = normalizeDigits(((document.getElementById('sc-from') || {}).value || '').trim());
    var to = normalizeDigits(((document.getElementById('sc-to') || {}).value || '').trim());
    var body = document.getElementById('sc-body');
    if (!body) return;

    if (!itemId) { body.innerHTML = '<p class="empty-row">یک کالا انتخاب کنید.</p>'; return; }

    var item = (DB.load('inventoryItems', []) || []).filter(function (x) { return x && x.id === itemId; })[0];
    var unit = item ? (item.unit || '') : '';

    var moves = DB.load('inventoryMoves', []);
    if (!Array.isArray(moves)) moves = [];
    var rows = moves.filter(function (m) {
        return m && m.itemId === itemId &&
            (!from || String(m.date || '') >= from) && (!to || String(m.date || '') <= to);
    }).sort(function (a, b) {
        return String(a.date || '').localeCompare(String(b.date || ''));
    });

    /* موجودی ابتدای دوره */
    var startQty = 0;
    moves.forEach(function (m) {
        if (!m || m.itemId !== itemId) return;
        var d = String(m.date || '');
        if (from && d >= from) return;
        startQty += (m.kind === 'in' ? 1 : -1) * (Number(m.qty) || 0);
    });

    var bal = startQty;
    var html = '<table class="data-table" id="sc-table"><thead><tr>' +
        '<th>تاریخ</th><th>نوع</th><th>مرجع</th><th>طرف</th><th>ورود</th><th>خروج</th><th>موجودی</th><th>فی</th><th>شرح</th>' +
        '</tr></thead><tbody>';
    html += '<tr style="background:#f8fafc;font-weight:800"><td colspan="6">موجودی ابتدای دوره</td>' +
        '<td>' + toFa(String(startQty)) + ' ' + esc(unit) + '</td><td colspan="2"></td></tr>';

    var totIn = 0, totOut = 0;
    rows.forEach(function (m) {
        var q = Number(m.qty) || 0;
        if (m.kind === 'in') { bal += q; totIn += q; }
        else { bal -= q; totOut += q; }
        html += '<tr>' +
            '<td dir="ltr">' + toFa(esc(m.date || '—')) + '</td>' +
            '<td>' + (m.kind === 'in'
                ? '<span style="display:inline-block;background:#ecfdf5;color:#065f46;border-radius:99px;padding:1px 9px;font-size:.66rem;font-weight:800">ورود</span>'
                : '<span style="display:inline-block;background:#fee2e2;color:#991b1b;border-radius:99px;padding:1px 9px;font-size:.66rem;font-weight:800">خروج</span>') + '</td>' +
            '<td>' + esc(m.refNo || '—') + '</td>' +
            '<td>' + esc(m.party || '—') + '</td>' +
            '<td>' + (m.kind === 'in' ? toFa(String(q)) : '—') + '</td>' +
            '<td>' + (m.kind === 'out' ? toFa(String(q)) : '—') + '</td>' +
            '<td style="font-weight:800">' + toFa(String(bal)) + '</td>' +
            '<td>' + (m.price ? esc(formatMoney(m.price)) : '—') + '</td>' +
            '<td>' + esc(m.desc || '—') + '</td></tr>';
    });
    html += '</tbody><tfoot><tr style="font-weight:800;background:#f1f5f9">' +
        '<td colspan="4">جمع دوره</td>' +
        '<td>' + toFa(String(totIn)) + '</td><td>' + toFa(String(totOut)) + '</td>' +
        '<td>' + toFa(String(bal)) + '</td><td colspan="2"></td></tr></tfoot></table>';

    body.innerHTML = html;
    if (typeof makeAllTablesResizable === 'function') makeAllTablesResizable();
    if (typeof applyColVisibilityAll === 'function') applyColVisibilityAll();
}

function initStockCardPage() {
    _stockFillItemSelect('sc-item');
    var fromEl = document.getElementById('sc-from');
    if (fromEl && !fromEl.value) fromEl.value = (typeof getActiveFiscalYearStart === 'function' ? getActiveFiscalYearStart() : '') || todayJalaliStr();
    var toEl = document.getElementById('sc-to');
    if (toEl && !toEl.value) toEl.value = todayJalaliStr();

    var runBtn = document.getElementById('sc-run');
    if (runBtn && !runBtn.dataset.bound) {
        runBtn.dataset.bound = '1';
        runBtn.onclick = runStockCard;
    }
    var expBtn = document.getElementById('sc-export');
    if (expBtn && !expBtn.dataset.bound) {
        expBtn.dataset.bound = '1';
        expBtn.onclick = function () {
            if (typeof exportReportTable === 'function') exportReportTable('#sc-table', 'کارت-موجودی');
        };
    }
    var sel = document.getElementById('sc-item');
    if (sel && !sel.dataset.bound) {
        sel.dataset.bound = '1';
        sel.onchange = runStockCard;
    }
    runStockCard();
}

/* ============================================================
   ۳) ارزش‌گذاری موجودی + قیمت‌گذاری فروش
   ============================================================ */

function renderStockValuation() {
    var onlyLow = !!(document.getElementById('sv-low-only') || {}).checked;
    var items = DB.load('inventoryItems', []);
    if (!Array.isArray(items)) items = [];
    var tb = document.getElementById('sv-body');
    if (!tb) return;

    var html = '';
    var totalVal = 0, shown = 0;
    items.forEach(function (it) {
        var stock = (typeof inventoryStockOf === 'function') ? inventoryStockOf(it.id) : 0;
        var w = stockAvgCost(it.id);
        var val = stock * w.avg;
        var low = (Number(it.minQty) > 0) && (stock <= Number(it.minQty));
        if (onlyLow && !low) return;
        totalVal += val;
        shown++;
        html += '<tr>'
            + '<td dir="ltr">' + toFa(esc(it.code || '—')) + '</td>'
            + '<td>' + esc(it.name || '—') + '</td>'
            + '<td>' + esc(it.group || '—') + '</td>'
            + '<td style="font-weight:800;color:' + (low ? '#dc2626' : '#065f46') + '">' + toFa(String(stock)) + ' ' + esc(it.unit || '') + (low ? ' ⚠️' : '') + '</td>'
            + '<td>' + esc(w.avg ? formatMoney(Math.round(w.avg)) : '—') + '</td>'
            + '<td>' + esc(w.last ? formatMoney(w.last) : '—') + '</td>'
            + '<td style="font-weight:800">' + esc(val ? formatMoney(Math.round(val)) : '—') + ' ' + esc(currencyLabel()) + '</td>'
            + '<td>' + esc(it.sellPrice ? formatMoney(it.sellPrice) : '—') + '</td>'
            + '</tr>';
    });

    tb.innerHTML = shown ? html : '<tr><td colspan="8" class="empty-row">کالایی ' + (onlyLow ? 'زیر حداقل موجودی' : '') + ' نیست.</td></tr>';
    var totEl = document.getElementById('sv-total-val');
    if (totEl) totEl.textContent = formatMoney(Math.round(totalVal)) + ' ' + currencyLabel();
    var cntEl = document.getElementById('sv-count');
    if (cntEl) cntEl.textContent = toFa(shown);

    var sel = document.getElementById('sv-price-item');
    if (sel) {
        var cur = sel.value;
        var phtml = '<option value="">— انتخاب کالا —</option>';
        items.forEach(function (it) {
            phtml += '<option value="' + esc(it.id) + '">' + esc((it.code ? it.code + ' - ' : '') + (it.name || '')) + '</option>';
        });
        sel.innerHTML = phtml;
        if (cur) sel.value = cur;
        _svUpdatePriceHint();
    }
}

/* پنل قیمت‌گذاری: میانگین موزون + حاشیه سود → فی فروش پیشنهادی */
function _svUpdatePriceHint() {
    var itemId = (document.getElementById('sv-price-item') || {}).value || '';
    var margin = Number(normalizeDigits((document.getElementById('sv-margin') || {}).value)) || 0;
    var info = document.getElementById('sv-price-info');
    var applyBtn = document.getElementById('sv-apply-price');
    if (!info) return;
    if (!itemId) {
        info.innerHTML = '<span class="muted" style="font-size:.75rem">یک کالا انتخاب کنید تا میانگین موزون و فی پیشنهادی محاسبه شود.</span>';
        if (applyBtn) applyBtn.disabled = true;
        return;
    }
    var w = stockAvgCost(itemId);
    var suggested = Math.round(w.avg * (1 + margin / 100));
    info.innerHTML = '<div style="display:flex;gap:8px;flex-wrap:wrap;font-size:.78rem;font-weight:700">'
        + '<span style="background:#f0fdf4;color:#166534;border-radius:10px;padding:5px 12px">میانگین موزون: ' + esc(formatMoney(Math.round(w.avg))) + ' ' + esc(currencyLabel()) + '</span>'
        + '<span style="background:#fefce8;color:#854d0e;border-radius:10px;padding:5px 12px">آخرین فی خرید: ' + esc(w.last ? formatMoney(w.last) : '—') + '</span>'
        + '<span style="background:#eff6ff;color:#1e40af;border-radius:10px;padding:5px 12px">فی فروش پیشنهادی (با حاشیه ' + toFa(String(margin)) + '٪): ' + esc(formatMoney(suggested)) + ' ' + esc(currencyLabel()) + '</span>'
        + '</div>';
    if (applyBtn) {
        applyBtn.disabled = false;
        applyBtn.setAttribute('data-suggested', String(suggested));
    }
}

function _svApplyPrice() {
    var itemId = (document.getElementById('sv-price-item') || {}).value || '';
    var applyBtn = document.getElementById('sv-apply-price');
    if (!itemId || !applyBtn) return;
    var suggested = Number(applyBtn.getAttribute('data-suggested')) || 0;
    if (suggested <= 0) { alert('قیمت پیشنهادی محاسبه نشده است.'); return; }
    var items = DB.load('inventoryItems', []);
    if (!Array.isArray(items)) items = [];
    var it = items.filter(function (x) { return x && x.id === itemId; })[0];
    if (!it) return;
    if (!confirm('فی فروش «' + (it.name || '') + '» به ' + formatMoney(suggested) + ' ' + currencyLabel() + ' تغییر کند؟')) return;
    var before = JSON.parse(JSON.stringify(it));
    it.sellPrice = suggested;
    DB.save('inventoryItems', items);
    Hist.log('inventoryItems', it.id, 'قیمت‌گذاری فروش', before, it, it.name || '');
    renderStockValuation();
    if (typeof renderInvItemsList === 'function') renderInvItemsList();
    showToast('✅ فی فروش کالا به‌روز شد');
}

function initStockValuationPage() {
    renderStockValuation();

    var lowCb = document.getElementById('sv-low-only');
    if (lowCb && !lowCb.dataset.bound) {
        lowCb.dataset.bound = '1';
        lowCb.onchange = renderStockValuation;
    }
    var sel = document.getElementById('sv-price-item');
    if (sel && !sel.dataset.bound) {
        sel.dataset.bound = '1';
        sel.onchange = _svUpdatePriceHint;
    }
    var marginEl = document.getElementById('sv-margin');
    if (marginEl && !marginEl.dataset.bound) {
        marginEl.dataset.bound = '1';
        marginEl.oninput = _svUpdatePriceHint;
    }
    var applyBtn = document.getElementById('sv-apply-price');
    if (applyBtn && !applyBtn.dataset.bound) {
        applyBtn.dataset.bound = '1';
        applyBtn.disabled = true;
        applyBtn.onclick = _svApplyPrice;
    }
    var expBtn = document.getElementById('sv-export');
    if (expBtn && !expBtn.dataset.bound) {
        expBtn.dataset.bound = '1';
        expBtn.onclick = function () {
            if (typeof exportReportTable === 'function') exportReportTable('#sv-table', 'ارزش-موجودی');
        };
    }
}

/* ---------- خروجی سراسری ---------- */

window.renderSreqList = renderSreqList;
window.fillSreqForm = fillSreqForm;
window.clearSreqForm = clearSreqForm;
window.bindSreqForm = bindSreqForm;
window.initSreqPage = initSreqPage;
window.runStockCard = runStockCard;
window.initStockCardPage = initStockCardPage;
window.renderStockValuation = renderStockValuation;
window.initStockValuationPage = initStockValuationPage;
window.stockAvgCost = stockAvgCost;

console.log('✅ [modules/stock.js] loaded — v2.7.0 (انبار: درخواست کالا + کارت موجودی + ارزش‌گذاری)');
