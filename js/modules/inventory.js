/* ============================================================
   پارسیس — ماژول انبار (کالاها + حواله‌ها)   ✅ v2.4.0
   مسیر: js/modules/inventory.js

   الگوبرداری از بخش انبار ERP راهکاران:
     • تعریف کالا: کد، نام، واحد، گروه کالا، حداقل موجودی، فی خرید/فروش
     • حواله ورود/خروج: تاریخ، کالا، تعداد، فی، طرف حساب، شماره مرجع
     • موجودی لحظه‌ای هر کالا = مجموع ورود − مجموع خروج
     • هشدار «زیر حداقل» در فهرست کالاها
   ذخیره: مخزن‌های «inventoryItems» و «inventoryMoves»
   ============================================================ */
'use strict';

var INV_ITEMS_STORE = 'inventoryItems';
var INV_MOVES_STORE = 'inventoryMoves';

var INV_UNITS = ['عدد', 'کیلوگرم', 'گرم', 'متر', 'لیتر', 'بسته', 'کارتن', 'جلسه', 'خدمت'];

/* ---------- کالاها ---------- */

function refreshInvItemSelects() {
    /* دراپ‌داون کالا در فرم حواله */
    var sel = document.getElementById('im-item');
    if (sel) {
        var cur = sel.value;
        var items = DB.load(INV_ITEMS_STORE, []);
        var html = '<option value="">— انتخاب کالا —</option>';
        (Array.isArray(items) ? items : []).forEach(function (it) {
            html += '<option value="' + esc(it.id) + '">' + esc((it.code ? it.code + ' - ' : '') + (it.name || '')) + '</option>';
        });
        sel.innerHTML = html;
        if (cur) sel.value = cur;
    }
    /* datalist گروه کالا در فرم کالا */
    var dl = document.getElementById('iv-groups-dl');
    if (dl) {
        var groups = {};
        (DB.load(INV_ITEMS_STORE, []) || []).forEach(function (it) { if (it.group) groups[it.group] = 1; });
        dl.innerHTML = Object.keys(groups).map(function (g) { return '<option value="' + esc(g) + '">'; }).join('');
    }
}

/* موجودی فعلی یک کالا */
function inventoryStockOf(itemId) {
    var moves = DB.load(INV_MOVES_STORE, []);
    if (!Array.isArray(moves)) return 0;
    var s = 0;
    moves.forEach(function (m) {
        if (!m || m.itemId !== itemId) return;
        var q = Number(m.qty) || 0;
        if (m.kind === 'in') s += q; else s -= q;
    });
    return s;
}

function renderInvItemsList() {
    var list = DB.load(INV_ITEMS_STORE, []);
    if (!Array.isArray(list)) list = [];

    var tb = document.getElementById('iv-list-body');
    if (!tb) return;

    var filterEl = document.getElementById('iv-filter');
    var filter = (filterEl ? filterEl.value : '').toLowerCase();

    var shown = 0, html = '';
    list.forEach(function (it) {
        var stock = inventoryStockOf(it.id);
        var low = (Number(it.minQty) > 0) && (stock <= Number(it.minQty));
        var hay = ((it.code || '') + ' ' + (it.name || '') + ' ' + (it.group || '') + ' ' + (it.desc || '')).toLowerCase();
        if (filter && hay.indexOf(filter) === -1) return;
        shown++;
        html += '<tr>'
            + '<td dir="ltr">' + toFa(esc(it.code || '—')) + '</td>'
            + '<td>' + esc(it.name || '—') + '</td>'
            + '<td>' + esc(it.group || '—') + '</td>'
            + '<td>' + esc(it.unit || 'عدد') + '</td>'
            + '<td style="font-weight:800;color:' + (low ? '#dc2626' : '#059669') + '">' + toFa(String(stock)) + (low ? ' ⚠️ زیر حداقل' : '') + '</td>'
            + '<td dir="ltr">' + toFa(esc(it.minQty ? String(it.minQty) : '—')) + '</td>'
            + '<td>' + esc(it.buyPrice ? formatMoney(it.buyPrice) : '—') + '</td>'
            + '<td>' + esc(it.sellPrice ? formatMoney(it.sellPrice) : '—') + '</td>'
            + '<td><div class="row-actions">'
            +   Hist.rowBtn(it.id, it.name || '')
            +   '<button class="row-btn edit" data-id="' + esc(it.id) + '">✎</button>'
            +   '<button class="row-btn del" data-id="' + esc(it.id) + '">×</button>'
            + '</div></td></tr>';
    });

    tb.innerHTML = shown ? html : '<tr><td colspan="9" class="empty-row">کالایی تعریف نشده است — از تب «ایجاد کالا» شروع کنید.</td></tr>';

    var countEl = document.getElementById('iv-count');
    if (countEl) countEl.textContent = toFa(shown);

    tb.querySelectorAll('.row-btn.edit').forEach(function (b) {
        b.onclick = function () {
            var id = b.getAttribute('data-id');
            var it = (DB.load(INV_ITEMS_STORE, []) || []).filter(function (x) { return x && x.id === id; })[0];
            if (!it) return;
            fillInvItemForm(it);
            var addTab = document.querySelector('#page-inventory-items .tab-btn[data-tab="iv-add"]');
            if (addTab) addTab.click();
        };
    });

    tb.querySelectorAll('.row-btn.del').forEach(function (b) {
        b.onclick = function () {
            var id = b.getAttribute('data-id');
            var it = (DB.load(INV_ITEMS_STORE, []) || []).filter(function (x) { return x && x.id === id; })[0];
            if (!it) return;
            if (!confirm('حذف کالا «' + (it.name || '') + '»؟ حواله‌های قبلی آن باقی می‌مانند.')) return;
            var rest = (DB.load(INV_ITEMS_STORE, []) || []).filter(function (x) { return x && x.id !== id; });
            Hist.log(INV_ITEMS_STORE, id, 'حذف', it, null, it.name || '');
            DB.save(INV_ITEMS_STORE, rest);
            renderInvItemsList();
            showToast('🗑 کالا حذف شد');
        };
    });

    Hist.bindRowButtons(tb, INV_ITEMS_STORE);
}

function fillInvItemForm(it) {
    document.getElementById('iv-id').value = it.id || '';
    document.getElementById('iv-code').value = it.code || '';
    document.getElementById('iv-name').value = it.name || '';
    document.getElementById('iv-unit').value = it.unit || 'عدد';
    document.getElementById('iv-group').value = it.group || '';
    document.getElementById('iv-min-qty').value = (it.minQty !== undefined && it.minQty !== '') ? it.minQty : '';
    document.getElementById('iv-buy-price').value = it.buyPrice ? formatRaw(it.buyPrice) : '';
    document.getElementById('iv-sell-price').value = it.sellPrice ? formatRaw(it.sellPrice) : '';
    document.getElementById('iv-desc').value = it.desc || '';
    var btn = document.getElementById('save-inv-item');
    if (btn) btn.innerHTML = '💾 ذخیره تغییرات';
}

function clearInvItemForm() {
    document.getElementById('iv-id').value = '';
    document.getElementById('iv-code').value = '';
    document.getElementById('iv-name').value = '';
    document.getElementById('iv-unit').value = 'عدد';
    document.getElementById('iv-group').value = '';
    document.getElementById('iv-min-qty').value = '';
    document.getElementById('iv-buy-price').value = '';
    document.getElementById('iv-sell-price').value = '';
    document.getElementById('iv-desc').value = '';
    var btn = document.getElementById('save-inv-item');
    if (btn) btn.innerHTML = '💾 ذخیره';
}

function bindInvItemsForm() {
    var saveBtn = document.getElementById('save-inv-item');
    if (saveBtn && !saveBtn.dataset.bound) {
        saveBtn.dataset.bound = '1';
        saveBtn.onclick = function () {
            var id = document.getElementById('iv-id').value;
            var code = normalizeDigits(document.getElementById('iv-code').value.trim());
            var name = document.getElementById('iv-name').value.trim();
            var unit = document.getElementById('iv-unit').value || 'عدد';
            var group = document.getElementById('iv-group').value.trim();
            var minQty = Number(normalizeDigits(document.getElementById('iv-min-qty').value)) || 0;
            var buyPrice = parseMoney(document.getElementById('iv-buy-price').value);
            var sellPrice = parseMoney(document.getElementById('iv-sell-price').value);
            var desc = document.getElementById('iv-desc').value.trim();

            if (!name) { alert('⚠️ نام کالا اجباری است.'); return; }

            var list = DB.load(INV_ITEMS_STORE, []);
            if (!Array.isArray(list)) list = [];

            /* کد تکراری؟ */
            var dup = list.filter(function (x) { return x && x.id !== id && code && x.code === code; })[0];
            if (dup) { alert('⚠️ کد کالا «' + code + '» قبلاً برای «' + dup.name + '» ثبت شده است.'); return; }

            var before = null, rec = null;
            if (id) {
                list.forEach(function (x) { if (x.id === id) before = JSON.parse(JSON.stringify(x)); });
                if (!before) { alert('❌ کالا یافت نشد.'); return; }
                rec = before;
                rec.code = code; rec.name = name; rec.unit = unit; rec.group = group;
                rec.minQty = minQty; rec.buyPrice = buyPrice; rec.sellPrice = sellPrice; rec.desc = desc;
                list = list.map(function (x) { return x.id === id ? rec : x; });
                Hist.log(INV_ITEMS_STORE, id, 'ویرایش', before, rec);
                showToast('✅ تغییرات کالا ذخیره شد.');
            } else {
                rec = { id: uid(), code: code, name: name, unit: unit, group: group,
                        minQty: minQty, buyPrice: buyPrice, sellPrice: sellPrice, desc: desc };
                list.push(rec);
                Hist.log(INV_ITEMS_STORE, rec.id, 'ایجاد', null, rec);
                showToast('✅ کالا «' + name + '» ایجاد شد.');
            }
            DB.save(INV_ITEMS_STORE, list);
            clearInvItemForm();
            renderInvItemsList();
            refreshInvItemSelects();
            var listTab = document.querySelector('#page-inventory-items .tab-btn[data-tab="iv-list"]');
            if (listTab) listTab.click();
        };
    }
    var newBtn = document.getElementById('new-inv-item');
    if (newBtn && !newBtn.dataset.bound) {
        newBtn.dataset.bound = '1';
        newBtn.onclick = clearInvItemForm;
    }
    var f = document.getElementById('iv-filter');
    if (f && !f.dataset.bound) {
        f.dataset.bound = '1';
        f.addEventListener('input', renderInvItemsList);
    }
}

function initInvItemsPage() {
    refreshInvItemSelects();
    renderInvItemsList();
    bindInvItemsForm();
    if (typeof Hist !== 'undefined' && Hist.renderTab) Hist.renderTab(INV_ITEMS_STORE, '#iv-id', '#hist-inv-items');
}

/* ---------- حواله‌ها ---------- */

function renderInvMovesList() {
    var list = DB.load(INV_MOVES_STORE, []);
    if (!Array.isArray(list)) list = [];

    var tb = document.getElementById('im-list-body');
    if (!tb) return;

    var filterEl = document.getElementById('im-filter');
    var filter = (filterEl ? filterEl.value : '').toLowerCase();

    var rows = list.slice().sort(function (a, b) {
        return String(b.date || '').localeCompare(String(a.date || ''));
    });

    var shown = 0, html = '';
    rows.forEach(function (m) {
        var it = (DB.load(INV_ITEMS_STORE, []) || []).filter(function (x) { return x && x.id === m.itemId; })[0];
        var itemName = it ? ((it.code ? it.code + ' - ' : '') + (it.name || '')) : '—';
        var qty = Number(m.qty) || 0;
        var sum = qty * (Number(m.price) || 0);
        var hay = ((m.kind === 'in' ? 'ورود خروج' : '') + ' ' + itemName + ' ' + (m.party || '') + ' ' + (m.refNo || '') + ' ' + (m.desc || '') + ' ' + (m.date || '')).toLowerCase();
        if (filter && hay.indexOf(filter) === -1) return;
        shown++;
        html += '<tr>'
            + '<td dir="ltr">' + toFa(esc(m.date || '—')) + '</td>'
            + '<td>' + (m.kind === 'in' ? '<span class="badge badge-approved">📥 ورود</span>' : '<span class="badge badge-draft">📤 خروج</span>') + '</td>'
            + '<td>' + esc(itemName) + '</td>'
            + '<td>' + toFa(String(qty)) + ' ' + esc((it && it.unit) || '') + '</td>'
            + '<td>' + esc(m.price ? formatMoney(m.price) : '—') + '</td>'
            + '<td>' + esc(sum ? formatMoney(sum) : '—') + '</td>'
            + '<td>' + esc(m.party || '—') + '</td>'
            + '<td dir="ltr">' + toFa(esc(m.refNo || '—')) + '</td>'
            + '<td>' + esc(m.desc || '—') + '</td>'
            + '<td><div class="row-actions">'
            +   Hist.rowBtn(m.id, (m.kind === 'in' ? 'ورود ' : 'خروج ') + itemName)
            +   '<button class="row-btn edit" data-id="' + esc(m.id) + '">✎</button>'
            +   '<button class="row-btn del" data-id="' + esc(m.id) + '">×</button>'
            + '</div></td></tr>';
    });

    tb.innerHTML = shown ? html : '<tr><td colspan="10" class="empty-row">حواله‌ای ثبت نشده است — از تب «ثبت حواله» شروع کنید.</td></tr>';

    var countEl = document.getElementById('im-count');
    if (countEl) countEl.textContent = toFa(shown);

    tb.querySelectorAll('.row-btn.edit').forEach(function (b) {
        b.onclick = function () {
            var id = b.getAttribute('data-id');
            var m = (DB.load(INV_MOVES_STORE, []) || []).filter(function (x) { return x && x.id === id; })[0];
            if (!m) return;
            fillInvMoveForm(m);
            var addTab = document.querySelector('#page-inventory-moves .tab-btn[data-tab="im-add"]');
            if (addTab) addTab.click();
        };
    });

    tb.querySelectorAll('.row-btn.del').forEach(function (b) {
        b.onclick = function () {
            var id = b.getAttribute('data-id');
            var m = (DB.load(INV_MOVES_STORE, []) || []).filter(function (x) { return x && x.id === id; })[0];
            if (!m) return;
            if (!confirm('حذف این حواله؟ موجودی کالا به‌روز می‌شود.')) return;
            var rest = (DB.load(INV_MOVES_STORE, []) || []).filter(function (x) { return x && x.id !== id; });
            Hist.log(INV_MOVES_STORE, id, 'حذف', m, null, 'حواله');
            DB.save(INV_MOVES_STORE, rest);
            renderInvMovesList();
            showToast('🗑 حواله حذف شد');
        };
    });

    Hist.bindRowButtons(tb, INV_MOVES_STORE);
}

function fillInvMoveForm(m) {
    document.getElementById('im-id').value = m.id || '';
    document.getElementById('im-kind').value = m.kind || 'in';
    document.getElementById('im-date').value = m.date || todayJalaliStr();
    refreshInvItemSelects();
    document.getElementById('im-item').value = m.itemId || '';
    document.getElementById('im-qty').value = (m.qty !== undefined && m.qty !== '') ? m.qty : '';
    document.getElementById('im-price').value = m.price ? formatRaw(m.price) : '';
    document.getElementById('im-party').value = m.party || '';
    document.getElementById('im-refno').value = m.refNo || '';
    document.getElementById('im-desc').value = m.desc || '';
    var btn = document.getElementById('save-inv-move');
    if (btn) btn.innerHTML = '💾 ذخیره تغییرات';
}

function clearInvMoveForm() {
    document.getElementById('im-id').value = '';
    document.getElementById('im-kind').value = 'in';
    document.getElementById('im-date').value = todayJalaliStr();
    refreshInvItemSelects();
    document.getElementById('im-item').value = '';
    document.getElementById('im-qty').value = '';
    document.getElementById('im-price').value = '';
    document.getElementById('im-party').value = '';
    document.getElementById('im-refno').value = '';
    document.getElementById('im-desc').value = '';
    var btn = document.getElementById('save-inv-move');
    if (btn) btn.innerHTML = '💾 ذخیره';
}

function bindInvMovesForm() {
    var saveBtn = document.getElementById('save-inv-move');
    if (saveBtn && !saveBtn.dataset.bound) {
        saveBtn.dataset.bound = '1';
        saveBtn.onclick = function () {
            var id = document.getElementById('im-id').value;
            var kind = document.getElementById('im-kind').value || 'in';
            var date = normalizeDigits(document.getElementById('im-date').value.trim());
            var itemId = document.getElementById('im-item').value;
            var qty = Number(normalizeDigits(document.getElementById('im-qty').value)) || 0;
            var price = parseMoney(document.getElementById('im-price').value);
            var party = document.getElementById('im-party').value.trim();
            var refNo = normalizeDigits(document.getElementById('im-refno').value.trim());
            var desc = document.getElementById('im-desc').value.trim();

            if (!date) { alert('⚠️ تاریخ اجباری است.'); return; }
            if (!itemId) { alert('⚠️ کالا را انتخاب کنید (اول از «کالاهای انبار» تعریف کنید).'); return; }
            if (!qty) { alert('⚠️ تعداد را وارد کنید.'); return; }

            /* موجودی کافی برای خروج؟ */
            if (kind === 'out') {
                var it0 = (DB.load(INV_ITEMS_STORE, []) || []).filter(function (x) { return x && x.id === itemId; })[0];
                var stock = inventoryStockOf(itemId) + (id ? _imOwnOldQty(id, itemId) : 0);
                if (it0 && stock < qty) {
                    if (!confirm('⚠️ موجودی فعلی این کالا ' + toFa(String(stock)) + ' است (کمتر از ' + toFa(String(qty)) + '). ادامه می‌دهید؟')) return;
                }
            }

            var list = DB.load(INV_MOVES_STORE, []);
            if (!Array.isArray(list)) list = [];

            var before = null, rec = null;
            if (id) {
                list.forEach(function (x) { if (x.id === id) before = JSON.parse(JSON.stringify(x)); });
                if (!before) { alert('❌ حواله یافت نشد.'); return; }
                rec = before;
                rec.kind = kind; rec.date = date; rec.itemId = itemId; rec.qty = qty;
                rec.price = price; rec.party = party; rec.refNo = refNo; rec.desc = desc;
                list = list.map(function (x) { return x.id === id ? rec : x; });
                Hist.log(INV_MOVES_STORE, id, 'ویرایش', before, rec);
                showToast('✅ تغییرات حواله ذخیره شد.');
            } else {
                rec = { id: uid(), kind: kind, date: date, itemId: itemId, qty: qty,
                        price: price, party: party, refNo: refNo, desc: desc };
                list.push(rec);
                Hist.log(INV_MOVES_STORE, rec.id, 'ایجاد', null, rec);
                showToast(kind === 'in' ? '✅ حواله ورود ثبت شد.' : '✅ حواله خروج ثبت شد.');
            }
            DB.save(INV_MOVES_STORE, list);
            clearInvMoveForm();
            renderInvMovesList();
            var listTab = document.querySelector('#page-inventory-moves .tab-btn[data-tab="im-list"]');
            if (listTab) listTab.click();
        };
    }
    var newBtn = document.getElementById('new-inv-move');
    if (newBtn && !newBtn.dataset.bound) {
        newBtn.dataset.bound = '1';
        newBtn.onclick = clearInvMoveForm;
    }
    var f = document.getElementById('im-filter');
    if (f && !f.dataset.bound) {
        f.dataset.bound = '1';
        f.addEventListener('input', renderInvMovesList);
    }
}

/* مقدار قدیمی خود حواله (برای چک موجودی هنگام ویرایش) */
function _imOwnOldQty(moveId, itemId) {
    var m = (DB.load(INV_MOVES_STORE, []) || []).filter(function (x) { return x && x.id === moveId; })[0];
    if (!m || m.itemId !== itemId) return 0;
    var q = Number(m.qty) || 0;
    return m.kind === 'in' ? -q : q; /* جبران اثر قبلی */
}

function initInvMovesPage() {
    refreshInvItemSelects();
    if (!document.getElementById('im-date').value) document.getElementById('im-date').value = todayJalaliStr();
    renderInvMovesList();
    bindInvMovesForm();
    if (typeof Hist !== 'undefined' && Hist.renderTab) Hist.renderTab(INV_MOVES_STORE, '#im-id', '#hist-inv-moves');
}

window.renderInvItemsList = renderInvItemsList;
window.bindInvItemsForm = bindInvItemsForm;
window.initInvItemsPage = initInvItemsPage;
window.renderInvMovesList = renderInvMovesList;
window.bindInvMovesForm = bindInvMovesForm;
window.initInvMovesPage = initInvMovesPage;
window.inventoryStockOf = inventoryStockOf;
window.refreshInvItemSelects = refreshInvItemSelects;

console.log('✅ [modules/inventory.js] loaded — v2.4.0 (انبار: کالاها + حواله‌ها)');
