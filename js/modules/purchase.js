/* ============================================================
   پارسیس — ماژول خرید (درخواست + سفارش + برگشت) ✅ v2.7.0
   مسیر: js/modules/purchase.js

   الگوبرداری از چرخهٔ خرید ERPهای روز دنیا (Odoo / ERPNext / SAP):
     درخواست خرید (PR) → تأیید → سفارش خرید (PO) → رسید کالا (GRN)
     → فاکتور خرید (PI) [در purchase-invoices.js] → برگشت از خرید

   این فایل: درخواست خرید + سفارش خرید + برگشت از خرید
   ویرایشگر مشترک ردیف‌ها + وضعیت‌ها + شماره‌گذاری خودکار
   ذخیره: «purchaseReqs» و «purchaseOrders» و «purchaseReturns»
   ============================================================ */
'use strict';

var PREQ_STORE = 'purchaseReqs';
var PO_STORE   = 'purchaseOrders';
var PRET_STORE = 'purchaseReturns';

/* ---------- وضعیت‌ها ---------- */

var PREQ_STATUS = [
    { key: 'draft',    label: 'پیش‌نویس',           bg: '#f1f5f9', fg: '#475569' },
    { key: 'pending',  label: 'در انتظار تأیید',     bg: '#fef3c7', fg: '#92400e' },
    { key: 'approved', label: 'تأییدشده',            bg: '#ecfdf5', fg: '#065f46' },
    { key: 'rejected', label: 'ردشده',              bg: '#fee2e2', fg: '#991b1b' },
    { key: 'ordered',  label: 'تبدیل به سفارش',      bg: '#eff6ff', fg: '#1e40af' }
];

var PO_STATUS = [
    { key: 'draft',    label: 'پیش‌نویس',           bg: '#f1f5f9', fg: '#475569' },
    { key: 'sent',     label: 'ارسال‌شده به تامین‌کننده', bg: '#fef3c7', fg: '#92400e' },
    { key: 'partial',  label: 'دریافت جزئی',        bg: '#fef9c3', fg: '#854d0e' },
    { key: 'received', label: 'دریافت کامل',        bg: '#ecfdf5', fg: '#065f46' },
    { key: 'invoiced', label: 'فاکتورشده',          bg: '#eff6ff', fg: '#1e40af' },
    { key: 'closed',   label: 'بسته‌شده',           bg: '#f1f5f9', fg: '#475569' },
    { key: 'cancelled',label: 'لغوشده',             bg: '#fee2e2', fg: '#991b1b' }
];

var PRET_STATUS = [
    { key: 'draft',    label: 'پیش‌نویس',  bg: '#f1f5f9', fg: '#475569' },
    { key: 'approved', label: 'تأییدشده',  bg: '#ecfdf5', fg: '#065f46' }
];

function _plStatusInfo(list, key) {
    var s = list.filter(function (x) { return x.key === key; })[0];
    return s || list[0];
}

function _plStatusBadge(list, key) {
    var s = _plStatusInfo(list, key);
    return '<span style="display:inline-block;background:' + s.bg + ';color:' + s.fg +
        ';border-radius:99px;padding:2px 10px;font-size:.68rem;font-weight:800;white-space:nowrap">' + esc(s.label) + '</span>';
}

/* ---------- ابزارهای مشترک ---------- */

function plNextNo(store) {
    var list = DB.load(store, []);
    if (!Array.isArray(list)) list = [];
    var max = 0;
    list.forEach(function (v) {
        var n = parseInt(normalizeDigits(String(v.no || '')), 10);
        if (!isNaN(n) && n > max) max = n;
    });
    return String(max + 1);
}

function plTotals(lines, discount, taxRate) {
    var sub = 0;
    (lines || []).forEach(function (l) { sub += (Number(l.qty) || 0) * (Number(l.price) || 0); });
    discount = Number(discount) || 0;
    taxRate = Number(taxRate) || 0;
    var base = sub - discount;
    if (base < 0) base = 0;
    var tax = base * taxRate / 100;
    return { sub: sub, discount: discount, base: base, tax: tax, total: base + tax };
}

function plPersonName(id) {
    if (!id) return '—';
    var p = (DB.load('persons', []) || []).filter(function (x) { return x && x.id === id; })[0];
    return p ? (((p.first || '') + ' ' + (p.last || '')).trim() || '—') : '—';
}

function plItemName(id) {
    if (!id) return '';
    var it = (DB.load('inventoryItems', []) || []).filter(function (x) { return x && x.id === id; })[0];
    return it ? ((it.code ? it.code + ' - ' : '') + (it.name || '')) : '';
}

/* انتخاب تامین‌کننده (اشخاص) */
function plFillSupplierSelect(selId, selected, emptyLabel) {
    var sel = document.getElementById(selId);
    if (!sel) return;
    var persons = DB.load('persons', []);
    if (!Array.isArray(persons)) persons = [];
    var html = '<option value="">' + (emptyLabel || '— انتخاب تامین‌کننده —') + '</option>';
    persons.forEach(function (p) {
        var nm = ((p.first || '') + ' ' + (p.last || '')).trim();
        if (nm) html += '<option value="' + esc(p.id) + '">' + esc(nm) + '</option>';
    });
    sel.innerHTML = html;
    if (selected) sel.value = selected;
}

/* ============================================================
   ویرایشگر مشترک ردیف‌های اقلام
   ctx = { boxId, lines, showPrice, priceLabel, onChange }
   هر ردیف: { itemId, desc, qty, price }
   ============================================================ */

function plRenderLines(ctx) {
    var box = document.getElementById(ctx.boxId);
    if (!box) return;
    var items = DB.load('inventoryItems', []);
    if (!Array.isArray(items)) items = [];

    if (!ctx.lines.length) ctx.lines.push({ itemId: '', desc: '', qty: '', price: '' });

    var html = '';
    ctx.lines.forEach(function (l, i) {
        var sum = (Number(l.qty) || 0) * (Number(l.price) || 0);
        html += '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;border:1px solid #e2e8f0;border-radius:10px;padding:7px;background:#f8fafc;margin-bottom:6px">';
        html += '<select class="pl-line-item" data-idx="' + i + '" style="flex:1.4;min-width:120px;padding:7px;border:1px solid #cbd5e1;border-radius:8px;font-size:.72rem;background:#fff">';
        html += '<option value="">— بدون کالای انبار —</option>';
        items.forEach(function (it) {
            var s = l.itemId === it.id ? ' selected' : '';
            html += '<option value="' + esc(it.id) + '"' + s + '>' + esc((it.code ? it.code + ' - ' : '') + (it.name || '')) + '</option>';
        });
        html += '</select>';
        html += '<input type="text" class="pl-line-desc" data-idx="' + i + '" placeholder="شرح" value="' + esc(l.desc || '') + '" style="flex:1.6;min-width:110px;padding:7px;border:1px solid #cbd5e1;border-radius:8px;font-size:.72rem">';
        html += '<input type="text" class="pl-line-qty" data-idx="' + i + '" inputmode="numeric" dir="ltr" placeholder="تعداد" value="' + esc(l.qty === undefined || l.qty === '' ? '' : String(l.qty)) + '" style="width:72px;padding:7px;border:1px solid #cbd5e1;border-radius:8px;font-size:.72rem">';
        if (ctx.showPrice) {
            html += '<input type="text" class="pl-line-price" data-idx="' + i + '" inputmode="numeric" dir="ltr" placeholder="' + esc(ctx.priceLabel || 'فی') + '" value="' + esc(l.price ? formatRaw(l.price) : '') + '" style="width:104px;padding:7px;border:1px solid #cbd5e1;border-radius:8px;font-size:.72rem">';
        }
        html += '<span class="pl-line-sum" style="min-width:100px;font-size:.72rem;font-weight:800;color:#065f46">' + esc(formatMoney(sum)) + ' ' + esc(currencyLabel()) + '</span>';
        html += '<button type="button" class="pl-line-del" data-idx="' + i + '" title="حذف ردیف" style="border:none;background:#fef2f2;color:#dc2626;width:30px;height:30px;border-radius:8px;cursor:pointer;font-weight:900">×</button>';
        html += '</div>';
    });

    box.innerHTML = html;
    plBindLines(ctx);
}

function plBindLines(ctx) {
    var box = document.getElementById(ctx.boxId);
    if (!box) return;

    Array.prototype.slice.call(box.querySelectorAll('.pl-line-item')).forEach(function (sel) {
        sel.onchange = function () {
            var i = Number(sel.getAttribute('data-idx'));
            ctx.lines[i].itemId = sel.value;
            if (sel.value) {
                var it = (DB.load('inventoryItems', []) || []).filter(function (x) { return x && x.id === sel.value; })[0];
                if (it) {
                    if (!ctx.lines[i].desc) ctx.lines[i].desc = it.name || '';
                    if (!ctx.lines[i].price && it.buyPrice) ctx.lines[i].price = Number(it.buyPrice);
                }
            }
            plRenderLines(ctx);
            if (ctx.onChange) ctx.onChange();
        };
    });

    Array.prototype.slice.call(box.querySelectorAll('.pl-line-desc')).forEach(function (inp) {
        inp.oninput = function () {
            ctx.lines[Number(inp.getAttribute('data-idx'))].desc = inp.value;
        };
    });

    Array.prototype.slice.call(box.querySelectorAll('.pl-line-qty')).forEach(function (inp) {
        inp.oninput = function () {
            ctx.lines[Number(inp.getAttribute('data-idx'))].qty = normalizeDigits(inp.value);
            plUpdateLineSums(ctx);
            if (ctx.onChange) ctx.onChange();
        };
    });

    Array.prototype.slice.call(box.querySelectorAll('.pl-line-price')).forEach(function (inp) {
        inp.oninput = function () {
            ctx.lines[Number(inp.getAttribute('data-idx'))].price = parseMoney(inp.value);
            plUpdateLineSums(ctx);
            if (ctx.onChange) ctx.onChange();
        };
    });

    Array.prototype.slice.call(box.querySelectorAll('.pl-line-del')).forEach(function (b) {
        b.onclick = function () {
            ctx.lines.splice(Number(b.getAttribute('data-idx')), 1);
            if (!ctx.lines.length) ctx.lines.push({ itemId: '', desc: '', qty: '', price: '' });
            plRenderLines(ctx);
            if (ctx.onChange) ctx.onChange();
        };
    });
}

function plUpdateLineSums(ctx) {
    var box = document.getElementById(ctx.boxId);
    if (!box) return;
    /* بازمحاسبه جمع هر ردیف */
    var sums = box.querySelectorAll('.pl-line-sum');
    ctx.lines.forEach(function (l, i) {
        var sum = (Number(l.qty) || 0) * (Number(l.price) || 0);
        if (sums[i]) sums[i].textContent = formatMoney(sum) + ' ' + currencyLabel();
    });
}

/* ردیف‌های معتبر (شرح یا کالا + تعداد > 0) */
function plValidLines(lines) {
    return (lines || []).filter(function (l) {
        return ((l.itemId || '') || (l.desc || '').trim()) && (Number(l.qty) || 0) > 0;
    }).map(function (l) {
        return { itemId: l.itemId || '', desc: (l.desc || '').trim(), qty: Number(l.qty) || 0, price: Number(l.price) || 0 };
    });
}

/* ============================================================
   ۱) درخواست خرید (Purchase Requisition)
   ============================================================ */

var _preqLines = [];

function renderPreqList() {
    var list = DB.load(PREQ_STORE, []);
    if (!Array.isArray(list)) list = [];
    var tb = document.getElementById('preq-list-body');
    if (!tb) return;

    var filterEl = document.getElementById('preq-filter');
    var filter = (filterEl ? filterEl.value : '').toLowerCase();

    var rows = list.slice().sort(function (a, b) {
        return String(b.date || '').localeCompare(String(a.date || '')) ||
               (Number(normalizeDigits(String(b.no || ''))) || 0) - (Number(normalizeDigits(String(a.no || ''))) || 0);
    });

    var shown = 0, html = '';
    rows.forEach(function (v) {
        var t = plTotals(v.lines, 0, 0);
        var hay = ((v.no || '') + ' ' + (v.requester || '') + ' ' + (v.note || '') + ' ' + (v.date || '')).toLowerCase();
        if (filter && hay.indexOf(filter) === -1) return;
        shown++;

        var acts = '';
        if (v.status === 'draft' || v.status === 'pending') {
            acts += '<button class="row-btn ok" data-id="' + esc(v.id) + '" title="تأیید درخواست">✓</button>';
            acts += '<button class="row-btn reject" data-id="' + esc(v.id) + '" title="رد درخواست">✗</button>';
        }
        if (v.status === 'approved') {
            acts += '<button class="row-btn convert" data-id="' + esc(v.id) + '" title="تبدیل به سفارش خرید">🧾</button>';
        }
        acts += '<button class="row-btn edit" data-id="' + esc(v.id) + '">✎</button>';
        acts += '<button class="row-btn del" data-id="' + esc(v.id) + '">×</button>';

        html += '<tr>'
            + '<td dir="ltr">' + toFa(esc(v.no || '—')) + '</td>'
            + '<td dir="ltr">' + toFa(esc(v.date || '—')) + '</td>'
            + '<td dir="ltr">' + toFa(esc(v.needDate || '—')) + '</td>'
            + '<td>' + esc(v.requester || '—') + '</td>'
            + '<td>' + toFa(String((v.lines || []).length)) + ' قلم</td>'
            + '<td>' + esc(formatMoney(t.sub)) + ' ' + esc(currencyLabel()) + '</td>'
            + '<td>' + _plStatusBadge(PREQ_STATUS, v.status || 'pending') + '</td>'
            + '<td><div class="row-actions">' + Hist.rowBtn(v.id, 'درخواست خرید ' + (v.no || '')) + acts + '</div></td></tr>';
    });

    tb.innerHTML = shown ? html : '<tr><td colspan="8" class="empty-row">درخواستی ثبت نشده است — از تب «ثبت درخواست خرید» شروع کنید.</td></tr>';
    var countEl = document.getElementById('preq-count');
    if (countEl) countEl.textContent = toFa(shown);

    Array.prototype.slice.call(tb.querySelectorAll('.row-btn.ok')).forEach(function (b) {
        b.onclick = function () { _preqSetStatus(b.getAttribute('data-id'), 'approved'); };
    });
    Array.prototype.slice.call(tb.querySelectorAll('.row-btn.reject')).forEach(function (b) {
        b.onclick = function () { _preqSetStatus(b.getAttribute('data-id'), 'rejected'); };
    });
    Array.prototype.slice.call(tb.querySelectorAll('.row-btn.convert')).forEach(function (b) {
        b.onclick = function () { _preqToPo(b.getAttribute('data-id')); };
    });
    Array.prototype.slice.call(tb.querySelectorAll('.row-btn.edit')).forEach(function (b) {
        b.onclick = function () {
            var id = b.getAttribute('data-id');
            var v = (DB.load(PREQ_STORE, []) || []).filter(function (x) { return x && x.id === id; })[0];
            if (!v) return;
            fillPreqForm(v);
            var addTab = document.querySelector('#page-purchase-req .tab-btn[data-tab="preq-add"]');
            if (addTab) addTab.click();
        };
    });
    Array.prototype.slice.call(tb.querySelectorAll('.row-btn.del')).forEach(function (b) {
        b.onclick = function () {
            var id = b.getAttribute('data-id');
            var v = (DB.load(PREQ_STORE, []) || []).filter(function (x) { return x && x.id === id; })[0];
            if (!v) return;
            if (v.status === 'ordered' && !confirm('این درخواست قبلاً به سفارش خرید تبدیل شده است. حذفش می‌کنید؟')) return;
            if (!confirm('حذف درخواست خرید شماره «' + (v.no || '') + '»؟')) return;
            DB.save(PREQ_STORE, (DB.load(PREQ_STORE, []) || []).filter(function (x) { return x.id !== id; }));
            Hist.log(PREQ_STORE, id, 'حذف', v, null, 'درخواست خرید ' + (v.no || ''));
            renderPreqList();
            showToast('🗑 درخواست خرید حذف شد');
        };
    });

    Hist.bindRowButtons(tb, PREQ_STORE);
}

function _preqSetStatus(id, status) {
    var list = DB.load(PREQ_STORE, []);
    var before = null, rec = null;
    list = list.map(function (x) {
        if (x && x.id === id) { before = JSON.parse(JSON.stringify(x)); rec = x; rec.status = status; }
        return x;
    });
    if (!rec) return;
    DB.save(PREQ_STORE, list);
    Hist.log(PREQ_STORE, id, status === 'approved' ? 'تأیید' : 'رد', before, rec, 'درخواست خرید ' + rec.no);
    renderPreqList();
    showToast(status === 'approved' ? '✅ درخواست تأیید شد' : '🚫 درخواست رد شد');
}

/* تبدیل درخواست تأییدشده به سفارش خرید */
function _preqToPo(id) {
    var req = (DB.load(PREQ_STORE, []) || []).filter(function (x) { return x && x.id === id; })[0];
    if (!req) return;

    var pos = DB.load(PO_STORE, []);
    if (!Array.isArray(pos)) pos = [];
    var po = {
        id: uid(),
        no: plNextNo(PO_STORE),
        date: todayJalaliStr(),
        supplierId: '',
        expectDate: req.needDate || '',
        reqId: req.id,
        lines: (req.lines || []).map(function (l) {
            return { itemId: l.itemId || '', desc: l.desc || '', qty: Number(l.qty) || 0, price: Number(l.price) || 0, received: 0 };
        }),
        status: 'draft',
        note: 'از درخواست خرید ' + (req.no || '')
    };
    pos.push(po);
    DB.save(PO_STORE, pos);

    var reqs = DB.load(PREQ_STORE, []);
    reqs = reqs.map(function (x) {
        if (x && x.id === id) { var b = JSON.parse(JSON.stringify(x)); x.status = 'ordered'; Hist.log(PREQ_STORE, id, 'تبدیل به سفارش ' + po.no, b, x, 'درخواست خرید ' + x.no); }
        return x;
    });
    DB.save(PREQ_STORE, reqs);

    renderPreqList();
    showToast('🧾 سفارش خرید شماره ' + toFa(po.no) + ' از درخواست ساخته شد — از منوی «سفارش خرید» تکمیلش کنید');
}

function fillPreqForm(v) {
    document.getElementById('preq-id').value = v.id || '';
    document.getElementById('preq-no').value = v.no || '';
    document.getElementById('preq-date').value = v.date || todayJalaliStr();
    document.getElementById('preq-need-date').value = v.needDate || '';
    document.getElementById('preq-requester').value = v.requester || '';
    document.getElementById('preq-status').value = v.status || 'pending';
    document.getElementById('preq-note').value = v.note || '';
    _preqLines = (v.lines || []).map(function (l) {
        return { itemId: l.itemId || '', desc: l.desc || '', qty: l.qty || '', price: l.price || '' };
    });
    if (!_preqLines.length) _preqLines.push({ itemId: '', desc: '', qty: '', price: '' });
    plRenderLines(_preqCtx());
    var btn = document.getElementById('save-preq');
    if (btn) btn.innerHTML = '💾 ذخیره تغییرات';
}

function clearPreqForm() {
    document.getElementById('preq-id').value = '';
    document.getElementById('preq-no').value = plNextNo(PREQ_STORE);
    document.getElementById('preq-date').value = todayJalaliStr();
    document.getElementById('preq-need-date').value = '';
    document.getElementById('preq-requester').value = '';
    document.getElementById('preq-status').value = 'pending';
    document.getElementById('preq-note').value = '';
    _preqLines = [{ itemId: '', desc: '', qty: '', price: '' }];
    plRenderLines(_preqCtx());
    var btn = document.getElementById('save-preq');
    if (btn) btn.innerHTML = '💾 ذخیره';
}

function _preqCtx() {
    return { boxId: 'preq-lines', lines: _preqLines, showPrice: true, priceLabel: 'فی برآوردی' };
}

function bindPreqForm() {
    var addLineBtn = document.getElementById('preq-add-line');
    if (addLineBtn && !addLineBtn.dataset.bound) {
        addLineBtn.dataset.bound = '1';
        addLineBtn.onclick = function () {
            _preqLines.push({ itemId: '', desc: '', qty: '', price: '' });
            plRenderLines(_preqCtx());
        };
    }
    var saveBtn = document.getElementById('save-preq');
    if (saveBtn && !saveBtn.dataset.bound) {
        saveBtn.dataset.bound = '1';
        saveBtn.onclick = function () {
            var id = document.getElementById('preq-id').value;
            var no = normalizeDigits(document.getElementById('preq-no').value.trim());
            var date = normalizeDigits(document.getElementById('preq-date').value.trim());
            var needDate = normalizeDigits(document.getElementById('preq-need-date').value.trim());
            var requester = document.getElementById('preq-requester').value.trim();
            var status = document.getElementById('preq-status').value || 'pending';
            var note = document.getElementById('preq-note').value.trim();

            if (!date) { alert('⚠️ تاریخ اجباری است.'); return; }
            if (!no) { alert('⚠️ شماره درخواست اجباری است.'); return; }
            var lines = plValidLines(_preqLines);
            if (!lines.length) { alert('⚠️ حداقل یک ردیف با کالا/شرح و تعداد لازم است.'); return; }

            var list = DB.load(PREQ_STORE, []);
            if (!Array.isArray(list)) list = [];
            var dup = list.filter(function (x) { return x && x.id !== id && normalizeDigits(String(x.no || '')) === no; })[0];
            if (dup) { alert('⚠️ درخواستی با شماره «' + no + '» قبلاً ثبت شده است.'); return; }

            var before = null, rec = null;
            if (id) {
                list.forEach(function (x) { if (x.id === id) before = JSON.parse(JSON.stringify(x)); });
                if (!before) { alert('❌ درخواست یافت نشد.'); return; }
                rec = before;
                rec.no = no; rec.date = date; rec.needDate = needDate;
                rec.requester = requester; rec.status = status; rec.note = note; rec.lines = lines;
                list = list.map(function (x) { return x.id === id ? rec : x; });
                Hist.log(PREQ_STORE, id, 'ویرایش', before, rec);
                showToast('✅ تغییرات درخواست ذخیره شد.');
            } else {
                rec = { id: uid(), no: no, date: date, needDate: needDate, requester: requester,
                        status: status, note: note, lines: lines };
                list.push(rec);
                Hist.log(PREQ_STORE, rec.id, 'ایجاد', null, rec);
                showToast('✅ درخواست خرید «' + no + '» ثبت شد.');
            }
            DB.save(PREQ_STORE, list);
            clearPreqForm();
            renderPreqList();
            var listTab = document.querySelector('#page-purchase-req .tab-btn[data-tab="preq-list"]');
            if (listTab) listTab.click();
        };
    }
    var newBtn = document.getElementById('new-preq');
    if (newBtn && !newBtn.dataset.bound) {
        newBtn.dataset.bound = '1';
        newBtn.onclick = clearPreqForm;
    }
    var f = document.getElementById('preq-filter');
    if (f && !f.dataset.bound) {
        f.dataset.bound = '1';
        f.addEventListener('input', renderPreqList);
    }
}

function initPreqPage() {
    if (!document.getElementById('preq-date').value) document.getElementById('preq-date').value = todayJalaliStr();
    if (!document.getElementById('preq-no').value) document.getElementById('preq-no').value = plNextNo(PREQ_STORE);
    plRenderLines(_preqCtx());
    renderPreqList();
    bindPreqForm();
    if (typeof Hist !== 'undefined' && Hist.renderTab) Hist.renderTab(PREQ_STORE, '#preq-id', '#hist-preq');
}

/* ============================================================
   ۲) سفارش خرید (Purchase Order)
   ============================================================ */

var _poLines = [];

function _poCtx() {
    return { boxId: 'po-lines', lines: _poLines, showPrice: true, priceLabel: 'فی خرید' };
}

function renderPoList() {
    var list = DB.load(PO_STORE, []);
    if (!Array.isArray(list)) list = [];
    var tb = document.getElementById('po-list-body');
    if (!tb) return;

    var filterEl = document.getElementById('po-filter');
    var filter = (filterEl ? filterEl.value : '').toLowerCase();

    var rows = list.slice().sort(function (a, b) {
        return String(b.date || '').localeCompare(String(a.date || '')) ||
               (Number(normalizeDigits(String(b.no || ''))) || 0) - (Number(normalizeDigits(String(a.no || ''))) || 0);
    });

    var shown = 0, html = '';
    rows.forEach(function (v) {
        var t = plTotals(v.lines, v.discount, v.taxRate);
        var supplier = plPersonName(v.supplierId);
        var hay = ((v.no || '') + ' ' + supplier + ' ' + (v.note || '') + ' ' + (v.date || '')).toLowerCase();
        if (filter && hay.indexOf(filter) === -1) return;
        shown++;

        var acts = '';
        if (v.status === 'draft') {
            acts += '<button class="row-btn send" data-id="' + esc(v.id) + '" title="ارسال به تامین‌کننده">📤</button>';
        }
        if (v.status === 'sent' || v.status === 'partial') {
            acts += '<button class="row-btn recv" data-id="' + esc(v.id) + '" title="ثبت رسید کالا">📥</button>';
        }
        if (v.status === 'received') {
            acts += '<button class="row-btn inv" data-id="' + esc(v.id) + '" title="صدور فاکتور خرید">🧾</button>';
        }
        if (v.status !== 'cancelled' && v.status !== 'invoiced') {
            acts += '<button class="row-btn cancel" data-id="' + esc(v.id) + '" title="لغو سفارش">🚫</button>';
        }
        acts += '<button class="row-btn edit" data-id="' + esc(v.id) + '">✎</button>';
        acts += '<button class="row-btn del" data-id="' + esc(v.id) + '">×</button>';

        html += '<tr>'
            + '<td dir="ltr">' + toFa(esc(v.no || '—')) + '</td>'
            + '<td dir="ltr">' + toFa(esc(v.date || '—')) + '</td>'
            + '<td>' + esc(supplier) + '</td>'
            + '<td dir="ltr">' + toFa(esc(v.expectDate || '—')) + '</td>'
            + '<td>' + toFa(String((v.lines || []).length)) + ' قلم</td>'
            + '<td style="font-weight:800;color:#065f46">' + esc(formatMoney(t.total)) + ' ' + esc(currencyLabel()) + '</td>'
            + '<td>' + _plStatusBadge(PO_STATUS, v.status || 'draft') + '</td>'
            + '<td><div class="row-actions">' + Hist.rowBtn(v.id, 'سفارش خرید ' + (v.no || '')) + acts + '</div></td></tr>';
    });

    tb.innerHTML = shown ? html : '<tr><td colspan="8" class="empty-row">سفارش خریدی ثبت نشده است.</td></tr>';
    var countEl = document.getElementById('po-count');
    if (countEl) countEl.textContent = toFa(shown);

    Array.prototype.slice.call(tb.querySelectorAll('.row-btn.send')).forEach(function (b) {
        b.onclick = function () { _poSetStatus(b.getAttribute('data-id'), 'sent'); };
    });
    Array.prototype.slice.call(tb.querySelectorAll('.row-btn.cancel')).forEach(function (b) {
        b.onclick = function () {
            if (!confirm('این سفارش لغو شود؟')) return;
            _poSetStatus(b.getAttribute('data-id'), 'cancelled');
        };
    });
    Array.prototype.slice.call(tb.querySelectorAll('.row-btn.recv')).forEach(function (b) {
        b.onclick = function () { _poReceive(b.getAttribute('data-id')); };
    });
    Array.prototype.slice.call(tb.querySelectorAll('.row-btn.inv')).forEach(function (b) {
        b.onclick = function () { _poToInvoice(b.getAttribute('data-id')); };
    });
    Array.prototype.slice.call(tb.querySelectorAll('.row-btn.edit')).forEach(function (b) {
        b.onclick = function () {
            var id = b.getAttribute('data-id');
            var v = (DB.load(PO_STORE, []) || []).filter(function (x) { return x && x.id === id; })[0];
            if (!v) return;
            if (v.status === 'invoiced') { alert('این سفارش فاکتور شده است و قابل ویرایش نیست.'); return; }
            fillPoForm(v);
            var addTab = document.querySelector('#page-purchase-orders .tab-btn[data-tab="po-add"]');
            if (addTab) addTab.click();
        };
    });
    Array.prototype.slice.call(tb.querySelectorAll('.row-btn.del')).forEach(function (b) {
        b.onclick = function () {
            var id = b.getAttribute('data-id');
            var v = (DB.load(PO_STORE, []) || []).filter(function (x) { return x && x.id === id; })[0];
            if (!v) return;
            if (!confirm('حذف سفارش خرید شماره «' + (v.no || '') + '»؟ رسیدهای ثبت‌شده معتبر می‌مانند.')) return;
            DB.save(PO_STORE, (DB.load(PO_STORE, []) || []).filter(function (x) { return x.id !== id; }));
            Hist.log(PO_STORE, id, 'حذف', v, null, 'سفارش خرید ' + (v.no || ''));
            renderPoList();
            showToast('🗑 سفارش خرید حذف شد');
        };
    });

    Hist.bindRowButtons(tb, PO_STORE);
}

function _poSetStatus(id, status) {
    var list = DB.load(PO_STORE, []);
    var before = null, rec = null;
    list = list.map(function (x) {
        if (x && x.id === id) { before = JSON.parse(JSON.stringify(x)); rec = x; rec.status = status; }
        return x;
    });
    if (!rec) return;
    DB.save(PO_STORE, list);
    Hist.log(PO_STORE, id, 'تغییر وضعیت به ' + _plStatusInfo(PO_STATUS, status).label, before, rec, 'سفارش خرید ' + rec.no);
    renderPoList();
    showToast('✅ وضعیت سفارش: ' + _plStatusInfo(PO_STATUS, status).label);
}

/* ثبت رسید کالا از سفارش — رسید انبار خودکار */
function _poReceive(id) {
    var po = (DB.load(PO_STORE, []) || []).filter(function (x) { return x && x.id === id; })[0];
    if (!po) return;
    var supplier = plPersonName(po.supplierId);
    if (po.supplierId === '' && !confirm('تامین‌کننده انتخاب نشده است. بدون تامین‌کننده ثبت رسید می‌کنید؟')) return;

    var full = confirm('همهٔ اقلام این سفارش کامل دریافت شد؟\n\nتأیید = ثبت رسید کامل — انصراف = ثبت جزئی (تک‌تک اقلام).');
    var received = {};
    var allFull = true;
    (po.lines || []).forEach(function (l, i) {
        var qty = Number(l.qty) || 0;
        var already = Number(l.received) || 0;
        var remaining = Math.max(0, qty - already);
        var got = remaining;
        if (!full && remaining > 0) {
            var v = prompt('تعداد دریافت‌شده «' + (l.desc || plItemName(l.itemId)) + '» (باقی‌مانده: ' + remaining + '):', String(remaining));
            if (v === null) { got = 0; }
            else { got = Math.max(0, Number(normalizeDigits(v)) || 0); }
        }
        received[i] = got;
        if (got < remaining) allFull = false;
    });

    var any = false;
    var moveDate = todayJalaliStr();
    var moves = DB.load('inventoryMoves', []);
    if (!Array.isArray(moves)) moves = [];

    var list = DB.load(PO_STORE, []);
    list = list.map(function (x) {
        if (x && x.id === id) {
            (x.lines || []).forEach(function (l, i) {
                var got = received[i] || 0;
                if (got > 0) {
                    any = true;
                    l.received = (Number(l.received) || 0) + got;
                    moves.push({
                        id: uid(), kind: 'in', date: moveDate, itemId: l.itemId || '',
                        qty: got, price: Number(l.price) || 0, party: supplier,
                        refNo: 'سفارش خرید ' + (x.no || ''), desc: 'رسید کالا از سفارش خرید ' + (x.no || '')
                    });
                }
            });
            var complete = (x.lines || []).every(function (l) { return (Number(l.received) || 0) >= (Number(l.qty) || 0); });
            x.status = complete ? 'received' : 'partial';
        }
        return x;
    });

    if (!any) { alert('هیچ قلمی دریافت نشد.'); return; }

    DB.save('inventoryMoves', moves);
    DB.save(PO_STORE, list);
    Hist.log(PO_STORE, id, 'ثبت رسید کالا', null, po, 'سفارش خرید ' + po.no);
    renderPoList();
    if (typeof renderInvItemsList === 'function') renderInvItemsList();
    showToast('📥 رسید انبار ثبت شد' + (allFull ? ' — دریافت کامل' : ' — دریافت جزئی'));
}

/* صدور فاکتور خرید از سفارشِ دریافت‌شده */
function _poToInvoice(id) {
    var po = (DB.load(PO_STORE, []) || []).filter(function (x) { return x && x.id === id; })[0];
    if (!po) return;

    var invoices = DB.load('purchaseInvoices', []);
    if (!Array.isArray(invoices)) invoices = [];
    var inv = {
        id: uid(),
        no: plNextNo('purchaseInvoices'),
        date: todayJalaliStr(),
        supplierId: po.supplierId || '',
        poId: po.id,
        lines: (po.lines || []).map(function (l) {
            var qty = Number(l.received) > 0 ? Number(l.received) : Number(l.qty) || 0;
            return { itemId: l.itemId || '', desc: l.desc || '', qty: qty, price: Number(l.price) || 0 };
        }).filter(function (l) { return l.qty > 0; }),
        discount: Number(po.discount) || 0,
        taxRate: Number(po.taxRate) || 0,
        paid: 0,
        status: 'draft',
        desc: 'از سفارش خرید ' + (po.no || '')
    };
    if (!inv.lines.length) { alert('قلمی برای فاکتور وجود ندارد.'); return; }
    invoices.push(inv);
    DB.save('purchaseInvoices', invoices);

    var list = DB.load(PO_STORE, []);
    list = list.map(function (x) { if (x && x.id === id) x.status = 'invoiced'; return x; });
    DB.save(PO_STORE, list);

    renderPoList();
    showToast('🧾 فاکتور خرید شماره ' + toFa(inv.no) + ' ساخته شد — از منوی «فاکتور خرید» تأییدش کنید');
}

function fillPoForm(v) {
    document.getElementById('po-id').value = v.id || '';
    document.getElementById('po-no').value = v.no || '';
    document.getElementById('po-date').value = v.date || todayJalaliStr();
    document.getElementById('po-expect-date').value = v.expectDate || '';
    plFillSupplierSelect('po-supplier', v.supplierId || '');
    _poLines = (v.lines || []).map(function (l) {
        return { itemId: l.itemId || '', desc: l.desc || '', qty: l.qty || '', price: l.price || '' };
    });
    if (!_poLines.length) _poLines.push({ itemId: '', desc: '', qty: '', price: '' });
    document.getElementById('po-discount').value = v.discount ? formatRaw(v.discount) : '';
    document.getElementById('po-tax').value = (v.taxRate !== undefined && v.taxRate !== '') ? v.taxRate : '';
    document.getElementById('po-note').value = v.note || '';
    plRenderLines(_poCtx());
    _poUpdateTotals();
    var btn = document.getElementById('save-po');
    if (btn) btn.innerHTML = '💾 ذخیره تغییرات';
}

function clearPoForm() {
    document.getElementById('po-id').value = '';
    document.getElementById('po-no').value = plNextNo(PO_STORE);
    document.getElementById('po-date').value = todayJalaliStr();
    document.getElementById('po-expect-date').value = '';
    plFillSupplierSelect('po-supplier', '');
    _poLines = [{ itemId: '', desc: '', qty: '', price: '' }];
    document.getElementById('po-discount').value = '';
    document.getElementById('po-tax').value = '';
    document.getElementById('po-note').value = '';
    plRenderLines(_poCtx());
    _poUpdateTotals();
    var btn = document.getElementById('save-po');
    if (btn) btn.innerHTML = '💾 ذخیره';
}

function _poUpdateTotals() {
    var t = plTotals(_poLines, parseMoney(document.getElementById('po-discount').value),
        Number(normalizeDigits(document.getElementById('po-tax').value)) || 0);
    var el;
    el = document.getElementById('po-subtotal'); if (el) el.textContent = formatMoney(t.sub) + ' ' + currencyLabel();
    el = document.getElementById('po-tax-amt');   if (el) el.textContent = formatMoney(t.tax) + ' ' + currencyLabel();
    el = document.getElementById('po-total');     if (el) el.textContent = formatMoney(t.total) + ' ' + currencyLabel();
}

function bindPoForm() {
    var addLineBtn = document.getElementById('po-add-line');
    if (addLineBtn && !addLineBtn.dataset.bound) {
        addLineBtn.dataset.bound = '1';
        addLineBtn.onclick = function () {
            _poLines.push({ itemId: '', desc: '', qty: '', price: '' });
            plRenderLines(_poCtx());
            _poUpdateTotals();
        };
    }
    ['po-discount', 'po-tax'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el && !el.dataset.bound) {
            el.dataset.bound = '1';
            el.addEventListener('input', _poUpdateTotals);
        }
    });

    var saveBtn = document.getElementById('save-po');
    if (saveBtn && !saveBtn.dataset.bound) {
        saveBtn.dataset.bound = '1';
        saveBtn.onclick = function () {
            var id = document.getElementById('po-id').value;
            var no = normalizeDigits(document.getElementById('po-no').value.trim());
            var date = normalizeDigits(document.getElementById('po-date').value.trim());
            var expectDate = normalizeDigits(document.getElementById('po-expect-date').value.trim());
            var supplierId = document.getElementById('po-supplier').value;
            var discount = parseMoney(document.getElementById('po-discount').value);
            var taxRate = Number(normalizeDigits(document.getElementById('po-tax').value)) || 0;
            var note = document.getElementById('po-note').value.trim();

            if (!date) { alert('⚠️ تاریخ اجباری است.'); return; }
            if (!no) { alert('⚠️ شماره سفارش اجباری است.'); return; }
            var lines = plValidLines(_poLines);
            if (!lines.length) { alert('⚠️ حداقل یک ردیف با کالا/شرح و تعداد لازم است.'); return; }

            var list = DB.load(PO_STORE, []);
            if (!Array.isArray(list)) list = [];
            var dup = list.filter(function (x) { return x && x.id !== id && normalizeDigits(String(x.no || '')) === no; })[0];
            if (dup) { alert('⚠️ سفارشی با شماره «' + no + '» قبلاً ثبت شده است.'); return; }

            var before = null, rec = null;
            if (id) {
                list.forEach(function (x) { if (x.id === id) before = JSON.parse(JSON.stringify(x)); });
                if (!before) { alert('❌ سفارش یافت نشد.'); return; }
                var oldReceived = {};
                (before.lines || []).forEach(function (l, i) { oldReceived[i] = Number(l.received) || 0; });
                rec = before;
                rec.no = no; rec.date = date; rec.expectDate = expectDate; rec.supplierId = supplierId;
                rec.lines = lines.map(function (l, i) { l.received = oldReceived[i] || 0; return l; });
                rec.discount = discount; rec.taxRate = taxRate; rec.note = note;
                list = list.map(function (x) { return x.id === id ? rec : x; });
                Hist.log(PO_STORE, id, 'ویرایش', before, rec);
                showToast('✅ تغییرات سفارش ذخیره شد.');
            } else {
                rec = { id: uid(), no: no, date: date, expectDate: expectDate, supplierId: supplierId,
                        lines: lines.map(function (l) { l.received = 0; return l; }),
                        discount: discount, taxRate: taxRate, status: 'draft', note: note };
                list.push(rec);
                Hist.log(PO_STORE, rec.id, 'ایجاد', null, rec);
                showToast('✅ سفارش خرید «' + no + '» ثبت شد.');
            }
            DB.save(PO_STORE, list);
            clearPoForm();
            renderPoList();
            var listTab = document.querySelector('#page-purchase-orders .tab-btn[data-tab="po-list"]');
            if (listTab) listTab.click();
        };
    }
    var newBtn = document.getElementById('new-po');
    if (newBtn && !newBtn.dataset.bound) {
        newBtn.dataset.bound = '1';
        newBtn.onclick = clearPoForm;
    }
    var f = document.getElementById('po-filter');
    if (f && !f.dataset.bound) {
        f.dataset.bound = '1';
        f.addEventListener('input', renderPoList);
    }
}

function initPoPage() {
    if (!document.getElementById('po-date').value) document.getElementById('po-date').value = todayJalaliStr();
    if (!document.getElementById('po-no').value) document.getElementById('po-no').value = plNextNo(PO_STORE);
    plFillSupplierSelect('po-supplier', '');
    plRenderLines(_poCtx());
    renderPoList();
    bindPoForm();
    if (typeof Hist !== 'undefined' && Hist.renderTab) Hist.renderTab(PO_STORE, '#po-id', '#hist-po');
}

/* ============================================================
   ۳) برگشت از خرید (Purchase Return)
   ============================================================ */

var _pretLines = [];

function _pretCtx() {
    return { boxId: 'pret-lines', lines: _pretLines, showPrice: true, priceLabel: 'فی برگشت' };
}

function renderPretList() {
    var list = DB.load(PRET_STORE, []);
    if (!Array.isArray(list)) list = [];
    var tb = document.getElementById('pret-list-body');
    if (!tb) return;

    var filterEl = document.getElementById('pret-filter');
    var filter = (filterEl ? filterEl.value : '').toLowerCase();

    var rows = list.slice().sort(function (a, b) {
        return String(b.date || '').localeCompare(String(a.date || '')) ||
               (Number(normalizeDigits(String(b.no || ''))) || 0) - (Number(normalizeDigits(String(a.no || ''))) || 0);
    });

    var shown = 0, html = '';
    rows.forEach(function (v) {
        var t = plTotals(v.lines, 0, 0);
        var supplier = plPersonName(v.supplierId);
        var hay = ((v.no || '') + ' ' + supplier + ' ' + (v.desc || '') + ' ' + (v.date || '')).toLowerCase();
        if (filter && hay.indexOf(filter) === -1) return;
        shown++;

        var acts = '';
        if (v.status === 'draft') {
            acts += '<button class="row-btn ok" data-id="' + esc(v.id) + '" title="تأیید و ثبت برگشت">✓</button>';
        } else {
            acts += '<button class="row-btn unok" data-id="' + esc(v.id) + '" title="لغو تأیید">↩</button>';
        }
        acts += '<button class="row-btn edit" data-id="' + esc(v.id) + '">✎</button>';
        acts += '<button class="row-btn del" data-id="' + esc(v.id) + '">×</button>';

        var voucherHtml = v.voucherId
            ? '<span style="color:#1e40af;font-weight:800;cursor:pointer" class="pret-open-voucher" data-id="' + esc(v.voucherId) + '">🧾 سند</span>'
            : '—';

        html += '<tr>'
            + '<td dir="ltr">' + toFa(esc(v.no || '—')) + '</td>'
            + '<td dir="ltr">' + toFa(esc(v.date || '—')) + '</td>'
            + '<td>' + esc(supplier) + '</td>'
            + '<td>' + toFa(String((v.lines || []).length)) + ' قلم</td>'
            + '<td style="font-weight:800;color:#991b1b">' + esc(formatMoney(t.sub)) + ' ' + esc(currencyLabel()) + '</td>'
            + '<td>' + _plStatusBadge(PRET_STATUS, v.status || 'draft') + '</td>'
            + '<td>' + voucherHtml + '</td>'
            + '<td><div class="row-actions">' + Hist.rowBtn(v.id, 'برگشت از خرید ' + (v.no || '')) + acts + '</div></td></tr>';
    });

    tb.innerHTML = shown ? html : '<tr><td colspan="8" class="empty-row">برگشتی از خرید ثبت نشده است.</td></tr>';
    var countEl = document.getElementById('pret-count');
    if (countEl) countEl.textContent = toFa(shown);

    Array.prototype.slice.call(tb.querySelectorAll('.pret-open-voucher')).forEach(function (sp) {
        sp.onclick = function () {
            if (typeof piOpenVoucher === 'function') piOpenVoucher(sp.getAttribute('data-id'));
        };
    });
    Array.prototype.slice.call(tb.querySelectorAll('.row-btn.ok')).forEach(function (b) {
        b.onclick = function () { pretApprove(b.getAttribute('data-id')); };
    });
    Array.prototype.slice.call(tb.querySelectorAll('.row-btn.unok')).forEach(function (b) {
        b.onclick = function () { pretUnapprove(b.getAttribute('data-id')); };
    });
    Array.prototype.slice.call(tb.querySelectorAll('.row-btn.edit')).forEach(function (b) {
        b.onclick = function () {
            var id = b.getAttribute('data-id');
            var v = (DB.load(PRET_STORE, []) || []).filter(function (x) { return x && x.id === id; })[0];
            if (!v) return;
            if (v.status === 'approved') { alert('برگشت تأییدشده قابل ویرایش نیست — اول «لغو تأیید» کنید.'); return; }
            fillPretForm(v);
            var addTab = document.querySelector('#page-purchase-returns .tab-btn[data-tab="pret-add"]');
            if (addTab) addTab.click();
        };
    });
    Array.prototype.slice.call(tb.querySelectorAll('.row-btn.del')).forEach(function (b) {
        b.onclick = function () {
            var id = b.getAttribute('data-id');
            var v = (DB.load(PRET_STORE, []) || []).filter(function (x) { return x && x.id === id; })[0];
            if (!v) return;
            if (v.status === 'approved' && !confirm('این برگشت تأیید شده است (سند و حواله دارد). حذفش می‌کنید؟')) return;
            if (!confirm('حذف برگشت از خرید شماره «' + (v.no || '') + '»؟')) return;
            if (v.status === 'approved') pretUnapprove(id, true);
            DB.save(PRET_STORE, (DB.load(PRET_STORE, []) || []).filter(function (x) { return x.id !== id; }));
            Hist.log(PRET_STORE, id, 'حذف', v, null, 'برگشت از خرید ' + (v.no || ''));
            renderPretList();
            showToast('🗑 برگشت از خرید حذف شد');
        };
    });

    Hist.bindRowButtons(tb, PRET_STORE);
}

/* تأیید برگشت: حواله خروج انبار + سند برعکسِ فاکتور */
function pretApprove(id) {
    var ret = (DB.load(PRET_STORE, []) || []).filter(function (x) { return x && x.id === id; })[0];
    if (!ret) return;
    var supplier = plPersonName(ret.supplierId);

    /* حواله خروج انبار */
    var moves = DB.load('inventoryMoves', []);
    if (!Array.isArray(moves)) moves = [];
    var moveIds = [];
    (ret.lines || []).forEach(function (l) {
        if (!l.itemId) return;
        var stock = (typeof inventoryStockOf === 'function') ? inventoryStockOf(l.itemId) : 9999;
        if (stock < l.qty && !confirm('موجودی «' + plItemName(l.itemId) + '» کافی نیست (' + toFa(String(stock)) + '). ادامه می‌دهید؟')) return;
        var mv = { id: uid(), kind: 'out', date: ret.date || todayJalaliStr(), itemId: l.itemId,
                   qty: Number(l.qty) || 0, price: Number(l.price) || 0, party: supplier,
                   refNo: 'برگشت خرید ' + (ret.no || ''), desc: 'برگشت به تامین‌کننده از برگشتی ' + (ret.no || '') };
        moves.push(mv);
        moveIds.push(mv.id);
    });
    DB.save('inventoryMoves', moves);

    /* سند حسابداری برعکس */
    var voucherId = null;
    if (typeof piMakeVoucher === 'function') {
        voucherId = piMakeVoucher({
            date: ret.date || todayJalaliStr(),
            desc: 'برگشت از خرید شماره ' + (ret.no || '') + (supplier !== '—' ? ' — ' + supplier : ''),
            base: plTotals(ret.lines, 0, 0).sub,
            tax: 0,
            reverse: true,
            supplierId: ret.supplierId || ''
        });
        if (!voucherId) {
            var _cfgChk = DB.load('purchaseAccSettings', {}) || {};
            if (_cfgChk.enabled) showToast('⚠️ سند خودکار ثبت نشد — تنظیمات «اتصال به حسابداری» را کامل کنید');
        }
    }

    var list = DB.load(PRET_STORE, []);
    list = list.map(function (x) {
        if (x && x.id === id) { var b = JSON.parse(JSON.stringify(x)); x.status = 'approved'; x.moveIds = moveIds; x.voucherId = voucherId; Hist.log(PRET_STORE, id, 'تأیید', b, x, 'برگشت از خرید ' + x.no); }
        return x;
    });
    DB.save(PRET_STORE, list);
    renderPretList();
    showToast('✅ برگشت تأیید شد' + (voucherId ? ' + سند حسابداری ثبت شد' : ''));
}

/* لغو تأیید: حذف سند و حواله‌های مرتبط */
function pretUnapprove(id, silent) {
    var ret = (DB.load(PRET_STORE, []) || []).filter(function (x) { return x && x.id === id; })[0];
    if (!ret) return;
    if (!silent && !confirm('لغو تأیید این برگشت؟ سند و حواله‌های مرتبط حذف می‌شوند.')) return;

    if (ret.voucherId) {
        DB.save('vouchers', (DB.load('vouchers', []) || []).filter(function (v) { return v.id !== ret.voucherId; }));
    }
    if (ret.moveIds && ret.moveIds.length) {
        DB.save('inventoryMoves', (DB.load('inventoryMoves', []) || []).filter(function (m) { return ret.moveIds.indexOf(m.id) === -1; }));
    }
    var list = DB.load(PRET_STORE, []);
    list = list.map(function (x) {
        if (x && x.id === id) { var b = JSON.parse(JSON.stringify(x)); x.status = 'draft'; x.voucherId = null; x.moveIds = []; Hist.log(PRET_STORE, id, 'لغو تأیید', b, x, 'برگشت از خرید ' + x.no); }
        return x;
    });
    DB.save(PRET_STORE, list);
    if (!silent) { renderPretList(); showToast('↩ لغو تأیید شد'); }
}

function fillPretForm(v) {
    document.getElementById('pret-id').value = v.id || '';
    document.getElementById('pret-no').value = v.no || '';
    document.getElementById('pret-date').value = v.date || todayJalaliStr();
    plFillSupplierSelect('pret-supplier', v.supplierId || '');
    document.getElementById('pret-desc').value = v.desc || '';
    _pretLines = (v.lines || []).map(function (l) {
        return { itemId: l.itemId || '', desc: l.desc || '', qty: l.qty || '', price: l.price || '' };
    });
    if (!_pretLines.length) _pretLines.push({ itemId: '', desc: '', qty: '', price: '' });
    plRenderLines(_pretCtx());
    var btn = document.getElementById('save-pret');
    if (btn) btn.innerHTML = '💾 ذخیره تغییرات';
}

function clearPretForm() {
    document.getElementById('pret-id').value = '';
    document.getElementById('pret-no').value = plNextNo(PRET_STORE);
    document.getElementById('pret-date').value = todayJalaliStr();
    plFillSupplierSelect('pret-supplier', '');
    document.getElementById('pret-desc').value = '';
    _pretLines = [{ itemId: '', desc: '', qty: '', price: '' }];
    plRenderLines(_pretCtx());
    var btn = document.getElementById('save-pret');
    if (btn) btn.innerHTML = '💾 ذخیره';
}

function bindPretForm() {
    var addLineBtn = document.getElementById('pret-add-line');
    if (addLineBtn && !addLineBtn.dataset.bound) {
        addLineBtn.dataset.bound = '1';
        addLineBtn.onclick = function () {
            _pretLines.push({ itemId: '', desc: '', qty: '', price: '' });
            plRenderLines(_pretCtx());
        };
    }

    /* انتخاب فاکتور مرجع → پر کردن خودکار */
    var refSel = document.getElementById('pret-from-invoice');
    if (refSel && !refSel.dataset.bound) {
        refSel.dataset.bound = '1';
        refSel.onchange = function () {
            var invId = refSel.value;
            if (!invId) return;
            var inv = (DB.load('purchaseInvoices', []) || []).filter(function (x) { return x && x.id === invId; })[0];
            if (!inv) return;
            document.getElementById('pret-supplier').value = inv.supplierId || '';
            _pretLines = (inv.lines || []).map(function (l) {
                return { itemId: l.itemId || '', desc: l.desc || '', qty: l.qty || '', price: l.price || '' };
            });
            if (!_pretLines.length) _pretLines.push({ itemId: '', desc: '', qty: '', price: '' });
            plRenderLines(_pretCtx());
            document.getElementById('pret-desc').value = 'برگشت از فاکتور خرید ' + (inv.no || '');
            showToast('📥 اقلام فاکتور ' + toFa(inv.no || '') + ' برگشت داده شد — تعدادها را ویرایش کنید');
        };
    }

    var saveBtn = document.getElementById('save-pret');
    if (saveBtn && !saveBtn.dataset.bound) {
        saveBtn.dataset.bound = '1';
        saveBtn.onclick = function () {
            var id = document.getElementById('pret-id').value;
            var no = normalizeDigits(document.getElementById('pret-no').value.trim());
            var date = normalizeDigits(document.getElementById('pret-date').value.trim());
            var supplierId = document.getElementById('pret-supplier').value;
            var desc = document.getElementById('pret-desc').value.trim();
            if (!date) { alert('⚠️ تاریخ اجباری است.'); return; }
            if (!no) { alert('⚠️ شماره برگشت اجباری است.'); return; }
            var lines = plValidLines(_pretLines);
            if (!lines.length) { alert('⚠️ حداقل یک ردیف با کالا/شرح و تعداد لازم است.'); return; }

            var list = DB.load(PRET_STORE, []);
            if (!Array.isArray(list)) list = [];
            var dup = list.filter(function (x) { return x && x.id !== id && normalizeDigits(String(x.no || '')) === no; })[0];
            if (dup) { alert('⚠️ برگشتی با شماره «' + no + '» قبلاً ثبت شده است.'); return; }

            var before = null, rec = null;
            if (id) {
                list.forEach(function (x) { if (x.id === id) before = JSON.parse(JSON.stringify(x)); });
                if (!before) { alert('❌ برگشت یافت نشد.'); return; }
                rec = before;
                rec.no = no; rec.date = date; rec.supplierId = supplierId; rec.lines = lines; rec.desc = desc;
                list = list.map(function (x) { return x.id === id ? rec : x; });
                Hist.log(PRET_STORE, id, 'ویرایش', before, rec);
                showToast('✅ تغییرات برگشت ذخیره شد.');
            } else {
                rec = { id: uid(), no: no, date: date, supplierId: supplierId, lines: lines,
                        status: 'draft', desc: desc, voucherId: null, moveIds: [] };
                list.push(rec);
                Hist.log(PRET_STORE, rec.id, 'ایجاد', null, rec);
                showToast('✅ برگشت از خرید «' + no + '» ثبت شد.');
            }
            DB.save(PRET_STORE, list);
            clearPretForm();
            renderPretList();
            var listTab = document.querySelector('#page-purchase-returns .tab-btn[data-tab="pret-list"]');
            if (listTab) listTab.click();
        };
    }
    var newBtn = document.getElementById('new-pret');
    if (newBtn && !newBtn.dataset.bound) {
        newBtn.dataset.bound = '1';
        newBtn.onclick = clearPretForm;
    }
    var f = document.getElementById('pret-filter');
    if (f && !f.dataset.bound) {
        f.dataset.bound = '1';
        f.addEventListener('input', renderPretList);
    }
}

function initPretPage() {
    if (!document.getElementById('pret-date').value) document.getElementById('pret-date').value = todayJalaliStr();
    if (!document.getElementById('pret-no').value) document.getElementById('pret-no').value = plNextNo(PRET_STORE);
    plFillSupplierSelect('pret-supplier', '');

    /* دراپ‌داون فاکتورهای تأییدشده برای برگشت */
    var refSel = document.getElementById('pret-from-invoice');
    if (refSel) {
        var html = '<option value="">— از فاکتور موجود برگشت بزن —</option>';
        (DB.load('purchaseInvoices', []) || []).forEach(function (inv) {
            html += '<option value="' + esc(inv.id) + '">فاکتور ' + esc(inv.no || '') + ' — ' + esc(plPersonName(inv.supplierId)) + '</option>';
        });
        refSel.innerHTML = html;
    }

    plRenderLines(_pretCtx());
    renderPretList();
    bindPretForm();
    if (typeof Hist !== 'undefined' && Hist.renderTab) Hist.renderTab(PRET_STORE, '#pret-id', '#hist-pret');
}

/* ---------- خروجی سراسری ---------- */

window.renderPreqList = renderPreqList;
window.fillPreqForm = fillPreqForm;
window.clearPreqForm = clearPreqForm;
window.bindPreqForm = bindPreqForm;
window.initPreqPage = initPreqPage;
window.renderPoList = renderPoList;
window.fillPoForm = fillPoForm;
window.clearPoForm = clearPoForm;
window.bindPoForm = bindPoForm;
window.initPoPage = initPoPage;
window.renderPretList = renderPretList;
window.fillPretForm = fillPretForm;
window.clearPretForm = clearPretForm;
window.bindPretForm = bindPretForm;
window.initPretPage = initPretPage;
window.plTotals = plTotals;
window.plNextNo = plNextNo;
window.plPersonName = plPersonName;
window.plValidLines = plValidLines;
window.plRenderLines = plRenderLines;

console.log('✅ [modules/purchase.js] loaded — v2.7.0 (خرید: درخواست + سفارش + برگشت)');
