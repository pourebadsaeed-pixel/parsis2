/* ============================================================
   پارسیس — فاکتور خرید + سند حسابداری خودکار ✅ v2.7.0
   مسیر: js/modules/purchase-invoices.js

   چرخهٔ کامل (مثل Odoo / ERPNext):
     فاکتور خرید → تأیید → رسید انبار (اختیاری/خودکار) + سند حسابداری
     (بدهکار: انبار/خرید + مالیات — بستانکار: حساب‌های پرداختنیِ تامین‌کننده)

   اتصال به حسابداری از صفحهٔ «اتصال به حسابداری» (purchase-settings)
   پیکربندی می‌شود: انتخاب حساب‌ها + فعال/غیرفعال بودن سند خودکار.
   ذخیره: «purchaseInvoices» + «purchaseAccSettings»
   ============================================================ */
'use strict';

var PINV_STORE = 'purchaseInvoices';
var PINV_SETTINGS_STORE = 'purchaseAccSettings';

var PINV_STATUS = [
    { key: 'draft',    label: 'پیش‌نویس', bg: '#f1f5f9', fg: '#475569' },
    { key: 'approved', label: 'تأییدشده', bg: '#ecfdf5', fg: '#065f46' }
];

var _pinvLines = [];

function _pinvCtx() {
    return { boxId: 'pinv-lines', lines: _pinvLines, showPrice: true, priceLabel: 'فی خرید' };
}

/* ---------- حساب‌های معین (سطح ۳) برای تنظیمات اتصال ---------- */

function _pinvLeafAccounts() {
    var accounts = DB.load('accounts', []);
    if (!Array.isArray(accounts)) accounts = [];
    var parentIds = {};
    accounts.forEach(function (a) { if (a.parent) parentIds[a.parent] = 1; });
    return accounts.filter(function (a) { return !parentIds[a.id] && a.active !== false; });
}

function _pinvFillAccountSelect(selId, selected, onlyLinked) {
    var sel = document.getElementById(selId);
    if (!sel) return;
    var accs = _pinvLeafAccounts();
    if (onlyLinked) {
        accs = accs.filter(function (a) {
            return (a.links || []).indexOf('person') !== -1 || (a.links || []).indexOf('company') !== -1;
        });
    }
    var html = '<option value="">— انتخاب حساب —</option>';
    accs.forEach(function (a) {
        html += '<option value="' + esc(a.id) + '">' + esc((a.code ? a.code + ' - ' : '') + (a.name || '')) + '</option>';
    });
    sel.innerHTML = html;
    if (selected) sel.value = selected;
}

/* ============================================================
   موتور سند حسابداری خودکار
   o = { date, desc, base, tax, reverse?, supplierId }
   خروجی: شناسهٔ سند یا null
   ============================================================ */

function piMakeVoucher(o) {
    try {
        var cfg = DB.load(PINV_SETTINGS_STORE, {});
        if (!cfg || typeof cfg !== 'object') return null;
        /* ✅ سیاست سخت‌گیرانه: اگر حساب‌ها ناقص باشند، سندِ غلط ثبت نکن —
           به‌جای آن piApprove هشدار می‌دهد که تنظیمات را کامل کند */
        if (!cfg.enabled || !cfg.payableAcc || !cfg.invAcc) return null;

        var accounts = DB.load('accounts', []);
        if (!Array.isArray(accounts)) accounts = [];
        var payAcc = accounts.filter(function (a) { return a.id === cfg.payableAcc; })[0];
        if (!payAcc) return null;

        var base = Math.round(Number(o.base) || 0);
        var tax = Math.round(Number(o.tax) || 0);
        if (base + tax <= 0) return null;
        if (tax > 0 && !cfg.taxAcc) return null; /* با مالیات، حساب مالیات هم لازم است */

        var lines = [];
        var iSide = o.reverse ? 'credit' : 'debit'; /* برگشت: انبار بستانکار */
        var pSide = o.reverse ? 'debit' : 'credit';  /* برگشت: پرداختنی بدهکار */

        if (base > 0 && cfg.invAcc) {
            lines.push({ id: uid(), account: cfg.invAcc, details: {},
                debit: iSide === 'debit' ? base : 0, credit: iSide === 'credit' ? base : 0,
                description: o.desc });
        }
        if (tax > 0 && cfg.taxAcc) {
            lines.push({ id: uid(), account: cfg.taxAcc, details: {},
                debit: iSide === 'debit' ? tax : 0, credit: iSide === 'credit' ? tax : 0,
                description: 'مالیات — ' + o.desc });
        }

        var payLine = { id: uid(), account: cfg.payableAcc, details: {},
            debit: pSide === 'debit' ? base + tax : 0, credit: pSide === 'credit' ? base + tax : 0,
            description: (o.reverse ? 'کاهش بدهی — ' : 'بدهی — ') + o.desc };

        /* تفصیلی تامین‌کننده روی حساب پرداختنی */
        if (o.supplierId && payAcc.links && payAcc.links.length) {
            if (payAcc.links.indexOf('person') !== -1) payLine.details = { person: o.supplierId };
            else if (payAcc.links.indexOf('company') !== -1) payLine.details = { company: o.supplierId };
        }
        lines.push(payLine);

        /* توازن — اگر به هر دلیلی متوازن نبود، سندِ غلط ثبت نکن */
        var td = 0, tc = 0;
        lines.forEach(function (l) { td += Number(l.debit) || 0; tc += Number(l.credit) || 0; });
        if (td !== tc) return null;

        var pid = state.activePeriodId || '';
        var num = '1';
        if (typeof getNextVoucherNumberForPeriod === 'function') num = getNextVoucherNumberForPeriod(pid);
        else {
            var vs = DB.load('vouchers', []);
            if (!Array.isArray(vs)) vs = [];
            var mx = 0;
            vs.forEach(function (v) { var n = parseInt(normalizeDigits(String(v.number || '0')).replace(/\D/g, '')) || 0; if (n > mx) mx = n; });
            num = String(mx + 1);
        }

        var vch = {
            id: uid(), number: num, date: o.date || todayJalaliStr(),
            time: (function () { var d = new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); })(),
            type: 'general', periodId: pid, desc: o.desc,
            lines: lines, status: 'approved', attachments: []
        };

        var vs2 = DB.load('vouchers', []);
        if (!Array.isArray(vs2)) vs2 = [];
        vs2.push(vch);
        DB.save('vouchers', vs2);
        try { Hist.log('vouchers', vch.id, 'ایجاد خودکار از خرید', null, vch, o.desc); } catch (eH) {}
        return vch.id;
    } catch (e) {
        console.warn('[purchase-invoices] voucher error:', e);
        return null;
    }
}

/* پرش به سند متصل */
function piOpenVoucher(voucherId) {
    if (!voucherId) return;
    if (typeof goToPage !== 'function') return;
    goToPage('voucher-list');
    setTimeout(function () {
        var sel = document.getElementById('vlist-search');
        if (sel) { sel.value = ''; }
        if (typeof renderVoucherList === 'function') renderVoucherList();
        showToast('🧾 سند متصل در فهرست اسناد قابل مشاهده است');
    }, 250);
}

/* ============================================================
   فهرست فاکتورهای خرید
   ============================================================ */

function renderPinvList() {
    var list = DB.load(PINV_STORE, []);
    if (!Array.isArray(list)) list = [];
    var tb = document.getElementById('pinv-list-body');
    if (!tb) return;

    var filterEl = document.getElementById('pinv-filter');
    var filter = (filterEl ? filterEl.value : '').toLowerCase();

    var rows = list.slice().sort(function (a, b) {
        return String(b.date || '').localeCompare(String(a.date || '')) ||
               (Number(normalizeDigits(String(b.no || ''))) || 0) - (Number(normalizeDigits(String(a.no || ''))) || 0);
    });

    var totalAll = 0, shown = 0, html = '';
    rows.forEach(function (v) {
        var t = plTotals(v.lines, v.discount, v.taxRate);
        totalAll += t.total;
        var supplier = plPersonName(v.supplierId);
        var remaining = t.total - (Number(v.paid) || 0);
        var payBadge = remaining <= 0
            ? '<span style="display:inline-block;background:#ecfdf5;color:#065f46;border-radius:99px;padding:2px 10px;font-size:.68rem;font-weight:800">تسویه‌شده</span>'
            : '<span style="display:inline-block;background:#fef3c7;color:#92400e;border-radius:99px;padding:2px 10px;font-size:.68rem;font-weight:800">طلب: ' + esc(formatMoney(remaining)) + '</span>';
        var st = PINV_STATUS.filter(function (x) { return x.key === (v.status || 'draft'); })[0] || PINV_STATUS[0];
        var stBadge = '<span style="display:inline-block;background:' + st.bg + ';color:' + st.fg + ';border-radius:99px;padding:2px 10px;font-size:.68rem;font-weight:800">' + esc(st.label) + '</span>';
        var voucherHtml = v.voucherId
            ? '<span style="color:#1e40af;font-weight:800;cursor:pointer" class="pinv-open-voucher" data-id="' + esc(v.voucherId) + '">🧾 سند</span>'
            : '—';
        var hay = ((v.no || '') + ' ' + supplier + ' ' + (v.desc || '') + ' ' + (v.date || '')).toLowerCase();
        if (filter && hay.indexOf(filter) === -1) return;
        shown++;

        var acts = '';
        if (v.status === 'draft') {
            acts += '<button class="row-btn ok" data-id="' + esc(v.id) + '" title="تأیید + ثبت سند/انبار">✓</button>';
        } else {
            acts += '<button class="row-btn unok" data-id="' + esc(v.id) + '" title="لغو تأیید (سند و رسید حذف می‌شود)">↩</button>';
        }
        acts += '<button class="row-btn edit" data-id="' + esc(v.id) + '">✎</button>';
        acts += '<button class="row-btn del" data-id="' + esc(v.id) + '">×</button>';

        html += '<tr>'
            + '<td dir="ltr">' + toFa(esc(v.no || '—')) + '</td>'
            + '<td dir="ltr">' + toFa(esc(v.date || '—')) + '</td>'
            + '<td>' + esc(supplier) + '</td>'
            + '<td>' + toFa(String((v.lines || []).length)) + ' قلم</td>'
            + '<td>' + esc(formatMoney(t.sub)) + '</td>'
            + '<td>' + esc(formatMoney(t.tax)) + '</td>'
            + '<td style="font-weight:800;color:#065f46">' + esc(formatMoney(t.total)) + ' ' + esc(currencyLabel()) + '</td>'
            + '<td>' + payBadge + '</td>'
            + '<td>' + stBadge + '</td>'
            + '<td>' + voucherHtml + '</td>'
            + '<td><div class="row-actions">' + Hist.rowBtn(v.id, 'فاکتور خرید ' + (v.no || '')) + acts + '</div></td></tr>';
    });

    tb.innerHTML = shown ? html : '<tr><td colspan="11" class="empty-row">فاکتور خریدی ثبت نشده است.</td></tr>';
    var countEl = document.getElementById('pinv-count');
    if (countEl) countEl.textContent = toFa(shown);
    var totEl = document.getElementById('pinv-sum-total');
    if (totEl) totEl.textContent = formatMoney(totalAll) + ' ' + currencyLabel();

    Array.prototype.slice.call(tb.querySelectorAll('.pinv-open-voucher')).forEach(function (sp) {
        sp.onclick = function () { piOpenVoucher(sp.getAttribute('data-id')); };
    });
    Array.prototype.slice.call(tb.querySelectorAll('.row-btn.ok')).forEach(function (b) {
        b.onclick = function () { piApprove(b.getAttribute('data-id')); };
    });
    Array.prototype.slice.call(tb.querySelectorAll('.row-btn.unok')).forEach(function (b) {
        b.onclick = function () { piUnapprove(b.getAttribute('data-id')); };
    });
    Array.prototype.slice.call(tb.querySelectorAll('.row-btn.edit')).forEach(function (b) {
        b.onclick = function () {
            var id = b.getAttribute('data-id');
            var v = (DB.load(PINV_STORE, []) || []).filter(function (x) { return x && x.id === id; })[0];
            if (!v) return;
            if (v.status === 'approved') { alert('فاکتور تأییدشده قابل ویرایش نیست — اول «لغو تأیید» (↩) کنید.'); return; }
            fillPinvForm(v);
            var addTab = document.querySelector('#page-purchase-invoices .tab-btn[data-tab="pinv-add"]');
            if (addTab) addTab.click();
        };
    });
    Array.prototype.slice.call(tb.querySelectorAll('.row-btn.del')).forEach(function (b) {
        b.onclick = function () {
            var id = b.getAttribute('data-id');
            var v = (DB.load(PINV_STORE, []) || []).filter(function (x) { return x && x.id === id; })[0];
            if (!v) return;
            if (v.status === 'approved' && !confirm('این فاکتور تأیید شده و سند/رسید دارد. حذفش می‌کنید؟')) return;
            if (!confirm('حذف فاکتور خرید شماره «' + (v.no || '') + '»؟')) return;
            if (v.status === 'approved') piUnapprove(id, true);
            DB.save(PINV_STORE, (DB.load(PINV_STORE, []) || []).filter(function (x) { return x.id !== id; }));
            Hist.log(PINV_STORE, id, 'حذف', v, null, 'فاکتور خرید ' + (v.no || ''));
            renderPinvList();
            showToast('🗑 فاکتور خرید حذف شد');
        };
    });

    Hist.bindRowButtons(tb, PINV_STORE);
}

/* ---------- تأیید فاکتور: انبار + سند ---------- */

function piApprove(id) {
    var inv = (DB.load(PINV_STORE, []) || []).filter(function (x) { return x && x.id === id; })[0];
    if (!inv) return;

    var cfg = DB.load(PINV_SETTINGS_STORE, {}) || {};
    var t = plTotals(inv.lines, inv.discount, inv.taxRate);
    var supplier = plPersonName(inv.supplierId);

    if (inv.supplierId === '' && !confirm('تامین‌کننده انتخاب نشده است. بدون تامین‌کننده تأیید می‌کنید؟')) return;

    /* رسید انبار خودکار — فقط وقتی از سفارشِ رسیددار نیامده باشد */
    var moveIds = [];
    if (cfg.autoStock !== false && !inv.poId) {
        var moves = DB.load('inventoryMoves', []);
        if (!Array.isArray(moves)) moves = [];
        (inv.lines || []).forEach(function (l) {
            if (!l.itemId || !(Number(l.qty) > 0)) return;
            var mv = { id: uid(), kind: 'in', date: inv.date || todayJalaliStr(), itemId: l.itemId,
                       qty: Number(l.qty) || 0, price: Number(l.price) || 0, party: supplier,
                       refNo: 'فاکتور خرید ' + (inv.no || ''), desc: 'رسید خرید از فاکتور ' + (inv.no || '') };
            moves.push(mv);
            moveIds.push(mv.id);
        });
        DB.save('inventoryMoves', moves);
    }

    /* سند حسابداری */
    var voucherId = piMakeVoucher({
        date: inv.date || todayJalaliStr(),
        desc: 'فاکتور خرید شماره ' + (inv.no || '') + (supplier !== '—' ? ' — ' + supplier : ''),
        base: t.base,
        tax: t.tax,
        supplierId: inv.supplierId || ''
    });
    if (!voucherId && cfg.enabled) {
        showToast('⚠️ سند خودکار ثبت نشد — از منوی «اتصال به حسابداری» حساب انبار/خرید، مالیات و بدهی تامین‌کننده را کامل کنید');
    }

    var list = DB.load(PINV_STORE, []);
    list = list.map(function (x) {
        if (x && x.id === id) {
            var b = JSON.parse(JSON.stringify(x));
            x.status = 'approved';
            x.moveIds = (x.moveIds || []).concat(moveIds);
            x.voucherId = voucherId || (x.voucherId || null);
            Hist.log(PINV_STORE, id, 'تأیید', b, x, 'فاکتور خرید ' + x.no);
        }
        return x;
    });
    DB.save(PINV_STORE, list);

    renderPinvList();
    if (typeof renderInvItemsList === 'function') renderInvItemsList();
    showToast('✅ فاکتور تأیید شد' + (voucherId ? ' + سند حسابداری ثبت شد' : '') + (moveIds.length ? ' + رسید انبار ثبت شد' : ''));
}

function piUnapprove(id, silent) {
    var inv = (DB.load(PINV_STORE, []) || []).filter(function (x) { return x && x.id === id; })[0];
    if (!inv) return;
    if (!silent && !confirm('لغو تأیید این فاکتور؟ سند حسابداری و رسیدهای خودکارِ آن حذف می‌شوند.')) return;

    if (inv.voucherId) {
        DB.save('vouchers', (DB.load('vouchers', []) || []).filter(function (v) { return v.id !== inv.voucherId; }));
    }
    if (inv.moveIds && inv.moveIds.length) {
        DB.save('inventoryMoves', (DB.load('inventoryMoves', []) || []).filter(function (m) { return inv.moveIds.indexOf(m.id) === -1; }));
    }
    var list = DB.load(PINV_STORE, []);
    list = list.map(function (x) {
        if (x && x.id === id) {
            var b = JSON.parse(JSON.stringify(x));
            x.status = 'draft'; x.voucherId = null; x.moveIds = [];
            Hist.log(PINV_STORE, id, 'لغو تأیید', b, x, 'فاکتور خرید ' + x.no);
        }
        return x;
    });
    DB.save(PINV_STORE, list);
    if (!silent) { renderPinvList(); showToast('↩ لغو تأیید شد'); }
}

/* ---------- فرم فاکتور خرید ---------- */

function fillPinvForm(v) {
    document.getElementById('pinv-id').value = v.id || '';
    document.getElementById('pinv-no').value = v.no || '';
    document.getElementById('pinv-date').value = v.date || todayJalaliStr();
    plFillSupplierSelect('pinv-supplier', v.supplierId || '');
    _pinvLines = (v.lines || []).map(function (l) {
        return { itemId: l.itemId || '', desc: l.desc || '', qty: l.qty || '', price: l.price || '' };
    });
    if (!_pinvLines.length) _pinvLines.push({ itemId: '', desc: '', qty: '', price: '' });
    document.getElementById('pinv-discount').value = v.discount ? formatRaw(v.discount) : '';
    document.getElementById('pinv-tax').value = (v.taxRate !== undefined && v.taxRate !== '') ? v.taxRate : '';
    document.getElementById('pinv-paid').value = v.paid ? formatRaw(v.paid) : '';
    document.getElementById('pinv-desc').value = v.desc || '';
    plRenderLines(_pinvCtx());
    _pinvUpdateTotals();
    var btn = document.getElementById('save-pinv');
    if (btn) btn.innerHTML = '💾 ذخیره تغییرات';
}

function clearPinvForm() {
    document.getElementById('pinv-id').value = '';
    document.getElementById('pinv-no').value = plNextNo(PINV_STORE);
    document.getElementById('pinv-date').value = todayJalaliStr();
    plFillSupplierSelect('pinv-supplier', '');
    _pinvLines = [{ itemId: '', desc: '', qty: '', price: '' }];
    document.getElementById('pinv-discount').value = '';
    document.getElementById('pinv-tax').value = '';
    document.getElementById('pinv-paid').value = '';
    document.getElementById('pinv-desc').value = '';
    plRenderLines(_pinvCtx());
    _pinvUpdateTotals();
    var btn = document.getElementById('save-pinv');
    if (btn) btn.innerHTML = '💾 ذخیره';
}

function _pinvUpdateTotals() {
    var t = plTotals(_pinvLines, parseMoney(document.getElementById('pinv-discount').value),
        Number(normalizeDigits(document.getElementById('pinv-tax').value)) || 0);
    var el;
    el = document.getElementById('pinv-subtotal'); if (el) el.textContent = formatMoney(t.sub) + ' ' + currencyLabel();
    el = document.getElementById('pinv-tax-amt');   if (el) el.textContent = formatMoney(t.tax) + ' ' + currencyLabel();
    el = document.getElementById('pinv-total');      if (el) el.textContent = formatMoney(t.total) + ' ' + currencyLabel();
}

function bindPinvForm() {
    var addLineBtn = document.getElementById('pinv-add-line');
    if (addLineBtn && !addLineBtn.dataset.bound) {
        addLineBtn.dataset.bound = '1';
        addLineBtn.onclick = function () {
            _pinvLines.push({ itemId: '', desc: '', qty: '', price: '' });
            plRenderLines(_pinvCtx());
            _pinvUpdateTotals();
        };
    }
    ['pinv-discount', 'pinv-tax'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el && !el.dataset.bound) {
            el.dataset.bound = '1';
            el.addEventListener('input', _pinvUpdateTotals);
        }
    });

    var saveBtn = document.getElementById('save-pinv');
    if (saveBtn && !saveBtn.dataset.bound) {
        saveBtn.dataset.bound = '1';
        saveBtn.onclick = function () {
            var id = document.getElementById('pinv-id').value;
            var no = normalizeDigits(document.getElementById('pinv-no').value.trim());
            var date = normalizeDigits(document.getElementById('pinv-date').value.trim());
            var supplierId = document.getElementById('pinv-supplier').value;
            var discount = parseMoney(document.getElementById('pinv-discount').value);
            var taxRate = Number(normalizeDigits(document.getElementById('pinv-tax').value)) || 0;
            var paid = parseMoney(document.getElementById('pinv-paid').value);
            var desc = document.getElementById('pinv-desc').value.trim();

            if (!date) { alert('⚠️ تاریخ اجباری است.'); return; }
            if (!no) { alert('⚠️ شماره فاکتور اجباری است.'); return; }
            var lines = plValidLines(_pinvLines);
            if (!lines.length) { alert('⚠️ حداقل یک ردیف با کالا/شرح و تعداد لازم است.'); return; }

            var list = DB.load(PINV_STORE, []);
            if (!Array.isArray(list)) list = [];
            var dup = list.filter(function (x) { return x && x.id !== id && normalizeDigits(String(x.no || '')) === no; })[0];
            if (dup) { alert('⚠️ فاکتوری با شماره «' + no + '» قبلاً ثبت شده است.'); return; }

            var before = null, rec = null;
            if (id) {
                list.forEach(function (x) { if (x.id === id) before = JSON.parse(JSON.stringify(x)); });
                if (!before) { alert('❌ فاکتور یافت نشد.'); return; }
                rec = before;
                rec.no = no; rec.date = date; rec.supplierId = supplierId; rec.lines = lines;
                rec.discount = discount; rec.taxRate = taxRate; rec.paid = paid; rec.desc = desc;
                list = list.map(function (x) { return x.id === id ? rec : x; });
                Hist.log(PINV_STORE, id, 'ویرایش', before, rec);
                showToast('✅ تغییرات فاکتور ذخیره شد.');
            } else {
                rec = { id: uid(), no: no, date: date, supplierId: supplierId, lines: lines,
                        discount: discount, taxRate: taxRate, paid: paid,
                        status: 'draft', desc: desc, voucherId: null, moveIds: [] };
                list.push(rec);
                Hist.log(PINV_STORE, rec.id, 'ایجاد', null, rec);
                showToast('✅ فاکتور خرید «' + no + '» ثبت شد — برای ثبت سند، تأییدش کنید.');
            }
            DB.save(PINV_STORE, list);
            clearPinvForm();
            renderPinvList();
            var listTab = document.querySelector('#page-purchase-invoices .tab-btn[data-tab="pinv-list"]');
            if (listTab) listTab.click();
        };
    }
    var newBtn = document.getElementById('new-pinv');
    if (newBtn && !newBtn.dataset.bound) {
        newBtn.dataset.bound = '1';
        newBtn.onclick = clearPinvForm;
    }
    var f = document.getElementById('pinv-filter');
    if (f && !f.dataset.bound) {
        f.dataset.bound = '1';
        f.addEventListener('input', renderPinvList);
    }
}

function initPinvPage() {
    if (!document.getElementById('pinv-date').value) document.getElementById('pinv-date').value = todayJalaliStr();
    if (!document.getElementById('pinv-no').value) document.getElementById('pinv-no').value = plNextNo(PINV_STORE);
    plFillSupplierSelect('pinv-supplier', '');
    plRenderLines(_pinvCtx());
    renderPinvList();
    bindPinvForm();
    if (typeof Hist !== 'undefined' && Hist.renderTab) Hist.renderTab(PINV_STORE, '#pinv-id', '#hist-pinv');
}

/* ============================================================
   صفحهٔ تنظیمات اتصال خرید به حسابداری
   ============================================================ */

function initPurchaseSettingsPage() {
    var cfg = DB.load(PINV_SETTINGS_STORE, {});
    if (!cfg || typeof cfg !== 'object') cfg = {};
    if (cfg.enabled === undefined) cfg.enabled = false;
    if (cfg.autoStock === undefined) cfg.autoStock = true;

    _pinvFillAccountSelect('pas-inv-acc', cfg.invAcc || '');
    _pinvFillAccountSelect('pas-tax-acc', cfg.taxAcc || '');
    _pinvFillAccountSelect('pas-payable-acc', cfg.payableAcc || '', true);

    var cb1 = document.getElementById('pas-enabled');
    if (cb1) cb1.checked = !!cfg.enabled;
    var cb2 = document.getElementById('pas-autostock');
    if (cb2) cb2.checked = !!cfg.autoStock;

    var saveBtn = document.getElementById('save-pas');
    if (saveBtn && !saveBtn.dataset.bound) {
        saveBtn.dataset.bound = '1';
        saveBtn.onclick = function () {
            var c = {
                enabled: !!(document.getElementById('pas-enabled') || {}).checked,
                invAcc: (document.getElementById('pas-inv-acc') || {}).value || '',
                taxAcc: (document.getElementById('pas-tax-acc') || {}).value || '',
                payableAcc: (document.getElementById('pas-payable-acc') || {}).value || '',
                autoStock: !!(document.getElementById('pas-autostock') || {}).checked
            };
            if (c.enabled && !c.payableAcc) {
                alert('⚠️ برای سند خودکار، «حساب بدهی تامین‌کننده» الزامی است.');
                return;
            }
            DB.save(PINV_SETTINGS_STORE, c);
            showToast('✅ تنظیمات اتصال خرید به حسابداری ذخیره شد');
        };
    }
}

/* ---------- خروجی سراسری ---------- */

window.renderPinvList = renderPinvList;
window.fillPinvForm = fillPinvForm;
window.clearPinvForm = clearPinvForm;
window.bindPinvForm = bindPinvForm;
window.initPinvPage = initPinvPage;
window.piApprove = piApprove;
window.piUnapprove = piUnapprove;
window.piMakeVoucher = piMakeVoucher;
window.piOpenVoucher = piOpenVoucher;
window.initPurchaseSettingsPage = initPurchaseSettingsPage;

console.log('✅ [modules/purchase-invoices.js] loaded — v2.7.0 (فاکتور خرید + سند خودکار)');
