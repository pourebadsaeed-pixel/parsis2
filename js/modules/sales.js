/* ============================================================
   پارسیس — ماژول فروش (فاکتور فروش)   ✅ v2.4.0
   مسیر: js/modules/sales.js

   الگوبرداری از بخش فروش ERP راهکاران:
     • صدور فاکتور فروش با ردیف‌ها (کالای انبار یا شرح آزاد، تعداد، فی)
     • تخفیف + مالیات بر ارزش افزوده + جمع نهایی
     • شماره‌گذاری خودکار فاکتور، وضعیت پرداخت
     • فهرست فاکتورها + تاریخچه تغییر وضعیت
   ذخیره: مخزن «salesInvoices» (با ابر همگام می‌شود)
   ============================================================ */
'use strict';

var SALES_STORE = 'salesInvoices';
var _salesLines = []; /* ردیف‌های فاکتور در حال ویرایش */

var SALES_STATUS = [
    { key: 'draft',    label: 'پیش‌نویس',      bg: '#f1f5f9', fg: '#475569' },
    { key: 'unpaid',   label: 'در انتظار پرداخت', bg: '#fef3c7', fg: '#92400e' },
    { key: 'paid',     label: 'تسویه‌شده',     bg: '#ecfdf5', fg: '#065f46' }
];

function _salesStatusLabel(st) {
    var s = SALES_STATUS.filter(function (x) { return x.key === st; })[0];
    return s || SALES_STATUS[0];
}

/* شماره فاکتور بعدی */
function _salesNextNo() {
    var list = DB.load(SALES_STORE, []);
    if (!Array.isArray(list)) list = [];
    var max = 0;
    list.forEach(function (v) {
        var n = parseInt(normalizeDigits(String(v.no || '')), 10);
        if (!isNaN(n) && n > max) max = n;
    });
    return String(max + 1);
}

/* جمع‌های فاکتور */
function salesInvoiceTotals(inv) {
    var lines = (inv && inv.lines) || [];
    var sub = 0;
    lines.forEach(function (l) { sub += (Number(l.qty) || 0) * (Number(l.price) || 0); });
    var discount = Number(inv && inv.discount) || 0;
    var taxRate = Number(inv && inv.taxRate) || 0;
    var base = sub - discount;
    if (base < 0) base = 0;
    var tax = base * taxRate / 100;
    var total = base + tax;
    return { sub: sub, discount: discount, tax: tax, total: total };
}

/* ---------- فرم فاکتور ---------- */

function refreshSalesPersonSelect() {
    var sel = document.getElementById('si-person');
    if (!sel) return;
    var cur = sel.value;
    var persons = DB.load('persons', []);
    var html = '<option value="">— انتخاب مشتری —</option>';
    (Array.isArray(persons) ? persons : []).forEach(function (p) {
        var nm = ((p.first || '') + ' ' + (p.last || '')).trim();
        if (nm) html += '<option value="' + esc(p.id) + '">' + esc(nm) + '</option>';
    });
    sel.innerHTML = html;
    if (cur) sel.value = cur;
}

function refreshSalesItemDatalist() {
    var sel = document.getElementById('si-item-' + '0');
    /* دراپ‌داون کالا در هر ردیف با renderSalesLines ساخته می‌شود */
}

function renderSalesLines() {
    var box = document.getElementById('si-lines');
    if (!box) return;
    var items = DB.load('inventoryItems', []);
    if (!Array.isArray(items)) items = [];

    if (!_salesLines.length) _salesLines.push({ desc: '', itemId: '', qty: '', price: '' });

    var html = '';
    _salesLines.forEach(function (l, i) {
        var sum = (Number(l.qty) || 0) * (Number(l.price) || 0);
        html += '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;border:1px solid #e2e8f0;border-radius:10px;padding:7px;background:#f8fafc;margin-bottom:6px" data-idx="' + i + '">';
        /* کالا (اختیاری) */
        html += '<select class="sl-line-item" data-idx="' + i + '" style="flex:1;min-width:130px;padding:7px;border:1px solid #cbd5e1;border-radius:8px;font-size:.72rem;background:#fff">';
        html += '<option value="">— بدون کالای انبار —</option>';
        items.forEach(function (it) {
            var sel = l.itemId === it.id ? ' selected' : '';
            html += '<option value="' + esc(it.id) + '"' + sel + '>' + esc((it.code ? it.code + ' - ' : '') + (it.name || '')) + '</option>';
        });
        html += '</select>';
        /* شرح */
        html += '<input type="text" class="sl-line-desc" data-idx="' + i + '" placeholder="شرح" value="' + esc(l.desc || '') + '" '
            + 'style="flex:2;min-width:130px;padding:7px;border:1px solid #cbd5e1;border-radius:8px;font-size:.72rem">';
        /* تعداد */
        html += '<input type="text" class="sl-line-qty" data-idx="' + i + '" inputmode="numeric" dir="ltr" placeholder="تعداد" value="' + esc(l.qty === undefined || l.qty === '' ? '' : String(l.qty)) + '" '
            + 'style="width:74px;padding:7px;border:1px solid #cbd5e1;border-radius:8px;font-size:.72rem">';
        /* فی */
        html += '<input type="text" class="sl-line-price" data-idx="' + i + '" inputmode="numeric" dir="ltr" placeholder="فی" value="' + esc(l.price ? formatRaw(l.price) : '') + '" '
            + 'style="width:110px;padding:7px;border:1px solid #cbd5e1;border-radius:8px;font-size:.72rem">';
        /* جمع */
        html += '<span style="min-width:110px;font-size:.72rem;font-weight:800;color:#1e40af">' + esc(formatMoney(sum)) + ' ' + esc(currencyLabel()) + '</span>';
        /* حذف */
        html += '<button type="button" class="sl-line-del" data-idx="' + i + '" title="حذف ردیف" '
            + 'style="border:none;background:#fef2f2;color:#dc2626;width:30px;height:30px;border-radius:8px;cursor:pointer;font-weight:900">×</button>';
        html += '</div>';
    });

    box.innerHTML = html;
    _salesBindLines();
    _salesUpdateTotals();
}

function _salesBindLines() {
    var box = document.getElementById('si-lines');
    if (!box) return;

    box.querySelectorAll('.sl-line-item').forEach(function (sel) {
        sel.onchange = function () {
            var i = Number(sel.getAttribute('data-idx'));
            _salesLines[i].itemId = sel.value;
            /* خودکار پر کردن شرح و فی فروش از کالا */
            if (sel.value) {
                var it = (DB.load('inventoryItems', []) || []).filter(function (x) { return x && x.id === sel.value; })[0];
                if (it) {
                    if (!_salesLines[i].desc) _salesLines[i].desc = it.name || '';
                    if (!_salesLines[i].price && it.sellPrice) _salesLines[i].price = Number(it.sellPrice);
                }
            }
            renderSalesLines();
        };
    });

    box.querySelectorAll('.sl-line-desc').forEach(function (inp) {
        inp.oninput = function () { _salesLines[Number(inp.getAttribute('data-idx'))].desc = inp.value; };
    });

    box.querySelectorAll('.sl-line-qty').forEach(function (inp) {
        inp.oninput = function () {
            _salesLines[Number(inp.getAttribute('data-idx'))].qty = normalizeDigits(inp.value);
            _salesUpdateTotals();
        };
    });

    box.querySelectorAll('.sl-line-price').forEach(function (inp) {
        inp.oninput = function () {
            _salesLines[Number(inp.getAttribute('data-idx'))].price = parseMoney(inp.value);
            _salesUpdateTotals();
        };
    });

    box.querySelectorAll('.sl-line-del').forEach(function (b) {
        b.onclick = function () {
            var i = Number(b.getAttribute('data-idx'));
            _salesLines.splice(i, 1);
            if (!_salesLines.length) _salesLines.push({ desc: '', itemId: '', qty: '', price: '' });
            renderSalesLines();
        };
    });
}

function _salesUpdateTotals() {
    var sub = 0;
    _salesLines.forEach(function (l) { sub += (Number(l.qty) || 0) * (Number(l.price) || 0); });
    var discount = parseMoney(document.getElementById('si-discount').value);
    var taxRate = Number(normalizeDigits(document.getElementById('si-tax').value)) || 0;
    var base = sub - discount;
    if (base < 0) base = 0;
    var tax = base * taxRate / 100;
    var total = base + tax;

    var el = document.getElementById('si-total');
    if (el) el.textContent = formatMoney(total) + ' ' + currencyLabel();
    var subEl = document.getElementById('si-subtotal');
    if (subEl) subEl.textContent = formatMoney(sub) + ' ' + currencyLabel();
    var taxEl = document.getElementById('si-tax-amt');
    if (taxEl) taxEl.textContent = formatMoney(tax) + ' ' + currencyLabel();
}

/* ---------- فهرست فاکتورها ---------- */

function renderSalesList() {
    var list = DB.load(SALES_STORE, []);
    if (!Array.isArray(list)) list = [];

    var tb = document.getElementById('si-list-body');
    if (!tb) return;

    var filterEl = document.getElementById('si-filter');
    var filter = (filterEl ? filterEl.value : '').toLowerCase();

    var rows = list.slice().sort(function (a, b) {
        return String(b.date || '').localeCompare(String(a.date || '')) ||
               (Number(normalizeDigits(String(b.no || ''))) || 0) - (Number(normalizeDigits(String(a.no || ''))) || 0);
    });

    var totalAll = 0, shown = 0, html = '';
    rows.forEach(function (v) {
        var t = salesInvoiceTotals(v);
        totalAll += t.total;
        var personName = '—';
        if (v.personId) {
            var p = (DB.load('persons', []) || []).filter(function (x) { return x && x.id === v.personId; })[0];
            if (p) personName = ((p.first || '') + ' ' + (p.last || '')).trim() || '—';
        }
        var st = _salesStatusLabel(v.status || 'unpaid');
        var hay = ((v.no || '') + ' ' + personName + ' ' + (v.desc || '') + ' ' + (v.date || '')).toLowerCase();
        if (filter && hay.indexOf(filter) === -1) return;
        shown++;
        html += '<tr>'
            + '<td dir="ltr">' + toFa(esc(v.no || '—')) + '</td>'
            + '<td dir="ltr">' + toFa(esc(v.date || '—')) + '</td>'
            + '<td>' + esc(personName) + '</td>'
            + '<td>' + toFa(String((v.lines || []).length)) + ' قلم</td>'
            + '<td>' + esc(formatMoney(t.sub)) + '</td>'
            + '<td>' + esc(formatMoney(t.discount)) + '</td>'
            + '<td style="font-weight:800;color:#1e40af">' + esc(formatMoney(t.total)) + ' ' + esc(currencyLabel()) + '</td>'
            + '<td><span style="display:inline-block;background:' + st.bg + ';color:' + st.fg + ';border-radius:99px;padding:2px 10px;font-size:.68rem;font-weight:800">' + esc(st.label) + '</span></td>'
            + '<td><div class="row-actions">'
            +   Hist.rowBtn(v.id, 'فاکتور ' + (v.no || ''))
            +   '<button class="row-btn edit" data-id="' + esc(v.id) + '">✎</button>'
            +   '<button class="row-btn del" data-id="' + esc(v.id) + '">×</button>'
            + '</div></td></tr>';
    });

    tb.innerHTML = shown ? html : '<tr><td colspan="9" class="empty-row">فاکتوری صادر نشده است — از تب «صدور فاکتور» شروع کنید.</td></tr>';

    var countEl = document.getElementById('si-count');
    if (countEl) countEl.textContent = toFa(shown);
    var totEl = document.getElementById('si-sum-total');
    if (totEl) totEl.textContent = formatMoney(totalAll) + ' ' + currencyLabel();

    tb.querySelectorAll('.row-btn.edit').forEach(function (b) {
        b.onclick = function () {
            var id = b.getAttribute('data-id');
            var v = (DB.load(SALES_STORE, []) || []).filter(function (x) { return x && x.id === id; })[0];
            if (!v) return;
            fillSalesForm(v);
            var addTab = document.querySelector('#page-sales .tab-btn[data-tab="si-add"]');
            if (addTab) addTab.click();
        };
    });

    tb.querySelectorAll('.row-btn.del').forEach(function (b) {
        b.onclick = function () {
            var id = b.getAttribute('data-id');
            var v = (DB.load(SALES_STORE, []) || []).filter(function (x) { return x && x.id === id; })[0];
            if (!v) return;
            if (!confirm('حذف فاکتور شماره «' + (v.no || '') + '»؟')) return;
            var rest = (DB.load(SALES_STORE, []) || []).filter(function (x) { return x && x.id !== id; });
            Hist.log(SALES_STORE, id, 'حذف', v, null, 'فاکتور ' + (v.no || ''));
            DB.save(SALES_STORE, rest);
            renderSalesList();
            showToast('🗑 فاکتور حذف شد');
        };
    });

    Hist.bindRowButtons(tb, SALES_STORE);
}

function fillSalesForm(v) {
    document.getElementById('si-id').value = v.id || '';
    document.getElementById('si-no').value = v.no || '';
    document.getElementById('si-date').value = v.date || todayJalaliStr();
    refreshSalesPersonSelect();
    document.getElementById('si-person').value = v.personId || '';
    _salesLines = (v.lines || []).map(function (l) {
        return { desc: l.desc || '', itemId: l.itemId || '', qty: l.qty || '', price: l.price || '' };
    });
    if (!_salesLines.length) _salesLines.push({ desc: '', itemId: '', qty: '', price: '' });
    document.getElementById('si-discount').value = v.discount ? formatRaw(v.discount) : '';
    document.getElementById('si-tax').value = (v.taxRate !== undefined && v.taxRate !== '') ? v.taxRate : '';
    document.getElementById('si-paid').value = v.paid ? formatRaw(v.paid) : '';
    document.getElementById('si-status').value = v.status || 'unpaid';
    document.getElementById('si-desc').value = v.desc || '';
    renderSalesLines();
    var btn = document.getElementById('save-sales');
    if (btn) btn.innerHTML = '💾 ذخیره تغییرات';
}

function clearSalesForm() {
    document.getElementById('si-id').value = '';
    document.getElementById('si-no').value = _salesNextNo();
    document.getElementById('si-date').value = todayJalaliStr();
    refreshSalesPersonSelect();
    document.getElementById('si-person').value = '';
    _salesLines = [{ desc: '', itemId: '', qty: '', price: '' }];
    document.getElementById('si-discount').value = '';
    document.getElementById('si-tax').value = '';
    document.getElementById('si-paid').value = '';
    document.getElementById('si-status').value = 'unpaid';
    document.getElementById('si-desc').value = '';
    renderSalesLines();
    var btn = document.getElementById('save-sales');
    if (btn) btn.innerHTML = '💾 ذخیره';
}

function bindSalesForm() {
    var addLineBtn = document.getElementById('si-add-line');
    if (addLineBtn && !addLineBtn.dataset.bound) {
        addLineBtn.dataset.bound = '1';
        addLineBtn.onclick = function () {
            _salesLines.push({ desc: '', itemId: '', qty: '', price: '' });
            renderSalesLines();
        };
    }
    ['si-discount', 'si-tax'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el && !el.dataset.bound) {
            el.dataset.bound = '1';
            el.addEventListener('input', _salesUpdateTotals);
        }
    });

    var saveBtn = document.getElementById('save-sales');
    if (saveBtn && !saveBtn.dataset.bound) {
        saveBtn.dataset.bound = '1';
        saveBtn.onclick = function () {
            var id = document.getElementById('si-id').value;
            var no = normalizeDigits(document.getElementById('si-no').value.trim());
            var date = normalizeDigits(document.getElementById('si-date').value.trim());
            var personId = document.getElementById('si-person').value;
            var discount = parseMoney(document.getElementById('si-discount').value);
            var taxRate = Number(normalizeDigits(document.getElementById('si-tax').value)) || 0;
            var paid = parseMoney(document.getElementById('si-paid').value);
            var status = document.getElementById('si-status').value || 'unpaid';
            var desc = document.getElementById('si-desc').value.trim();

            if (!date) { alert('⚠️ تاریخ اجباری است.'); return; }
            if (!no) { alert('⚠️ شماره فاکتور اجباری است.'); return; }
            var lines = _salesLines.filter(function (l) {
                return (l.desc || '').trim() && ((Number(l.qty) || 0) > 0);
            }).map(function (l) {
                return { desc: l.desc.trim(), itemId: l.itemId || '', qty: Number(l.qty) || 0, price: Number(l.price) || 0 };
            });
            if (!lines.length) { alert('⚠️ حداقل یک ردیف با شرح و تعداد لازم است.'); return; }

            /* شماره تکراری؟ */
            var list = DB.load(SALES_STORE, []);
            if (!Array.isArray(list)) list = [];
            var dup = list.filter(function (x) { return x && x.id !== id && normalizeDigits(String(x.no || '')) === no; })[0];
            if (dup) { alert('⚠️ فاکتور با شماره «' + no + '» قبلاً ثبت شده است.'); return; }

            var before = null, rec = null;
            if (id) {
                list.forEach(function (x) { if (x.id === id) before = JSON.parse(JSON.stringify(x)); });
                if (!before) { alert('❌ فاکتور یافت نشد.'); return; }
                rec = before;
                rec.no = no; rec.date = date; rec.personId = personId; rec.lines = lines;
                rec.discount = discount; rec.taxRate = taxRate; rec.paid = paid; rec.status = status; rec.desc = desc;
                list = list.map(function (x) { return x.id === id ? rec : x; });
                Hist.log(SALES_STORE, id, 'ویرایش', before, rec);
                showToast('✅ تغییرات فاکتور ذخیره شد.');
            } else {
                rec = { id: uid(), no: no, date: date, personId: personId, lines: lines,
                        discount: discount, taxRate: taxRate, paid: paid, status: status, desc: desc };
                list.push(rec);
                Hist.log(SALES_STORE, rec.id, 'ایجاد', null, rec);
                showToast('✅ فاکتور «' + no + '» صادر شد.');
            }
            DB.save(SALES_STORE, list);
            clearSalesForm();
            renderSalesList();
            var listTab = document.querySelector('#page-sales .tab-btn[data-tab="si-list"]');
            if (listTab) listTab.click();
        };
    }
    var newBtn = document.getElementById('new-sales');
    if (newBtn && !newBtn.dataset.bound) {
        newBtn.dataset.bound = '1';
        newBtn.onclick = clearSalesForm;
    }
    var f = document.getElementById('si-filter');
    if (f && !f.dataset.bound) {
        f.dataset.bound = '1';
        f.addEventListener('input', renderSalesList);
    }
}

function initSalesPage() {
    refreshSalesPersonSelect();
    if (!document.getElementById('si-date').value) document.getElementById('si-date').value = todayJalaliStr();
    if (!document.getElementById('si-no').value) document.getElementById('si-no').value = _salesNextNo();
    renderSalesList();
    bindSalesForm();
    if (typeof Hist !== 'undefined' && Hist.renderTab) Hist.renderTab(SALES_STORE, '#si-id', '#hist-sales');
}

window.renderSalesList = renderSalesList;
window.bindSalesForm = bindSalesForm;
window.initSalesPage = initSalesPage;
window.salesInvoiceTotals = salesInvoiceTotals;
window.fillSalesForm = fillSalesForm;
window.clearSalesForm = clearSalesForm;
window.renderSalesLines = renderSalesLines;

console.log('✅ [modules/sales.js] loaded — v2.4.0 (فروش: فاکتور فروش)');
