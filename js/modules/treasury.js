/* ============================================================
   پارسیس — ماژول خزانه (دریافت و پرداخت)   ✅ v2.4.0
   مسیر: js/modules/treasury.js

   الگوبرداری از بخش خزانه‌داری ERP راهکاران:
     • ثبت دریافت‌ها و پرداخت‌های نقدی/بانکی جدا از اسناد حسابداری
     • هر ردیف: نوع (دریافت/پرداخت)، تاریخ، حساب (بانک/صندوق)،
       مبلغ، شخص، شرح
     • فهرست با جمع دریافت، جمع پرداخت و مانده + تاریخچه تغییر وضعیت
   ذخیره: مخزن «treasuryItems» (با ابر همگام می‌شود)
   ============================================================ */
'use strict';

var TREASURY_STORE = 'treasuryItems';

/* عنوان حساب (بانک یا صندوق) از روی شناسه «b:xxx» یا «c:xxx» */
function _trAccountLabel(accId) {
    if (!accId) return '—';
    var t = accId.charAt(0), id = accId.slice(2); /* ✅ پیشوند «b:» یا «c:» حذف می‌شود */
    try {
        if (t === 'b') {
            var b = (DB.load('bankAccounts', []) || []).filter(function (x) { return x && x.id === id; })[0];
            if (b) return '🏦 ' + (b.bank || '') + (b.branchName ? ' - ' + b.branchName : '');
        }
        if (t === 'c') {
            var c = (DB.load('cashBoxes', []) || []).filter(function (x) { return x && x.id === id; })[0];
            if (c) return '💰 ' + (c.title || '');
        }
    } catch (e) {}
    return '—';
}

/* پر کردن دراپ‌داون حساب‌ها (بانک‌ها + صندوق‌ها) */
function refreshTreasuryAccountSelect() {
    var sel = document.getElementById('tr-account');
    if (!sel) return;
    var cur = sel.value;
    var html = '<option value="">— انتخاب حساب —</option>';
    var banks = DB.load('bankAccounts', []);
    (Array.isArray(banks) ? banks : []).forEach(function (b) {
        html += '<option value="b:' + esc(b.id) + '">🏦 ' + esc((b.bank || '') + (b.branchName ? ' - ' + b.branchName : '')) + '</option>';
    });
    var cashes = DB.load('cashBoxes', []);
    (Array.isArray(cashes) ? cashes : []).forEach(function (c) {
        html += '<option value="c:' + esc(c.id) + '">💰 ' + esc(c.title || '') + '</option>';
    });
    sel.innerHTML = html;
    if (cur) sel.value = cur;
}

function refreshTreasuryPersonSelect() {
    var sel = document.getElementById('tr-person');
    if (!sel) return;
    var cur = sel.value;
    var persons = DB.load('persons', []);
    var html = '<option value="">— بدون شخص —</option>';
    (Array.isArray(persons) ? persons : []).forEach(function (p) {
        var nm = ((p.first || '') + ' ' + (p.last || '')).trim();
        if (nm) html += '<option value="' + esc(p.id) + '">' + esc(nm) + '</option>';
    });
    sel.innerHTML = html;
    if (cur) sel.value = cur;
}

/* ساخت HTML یک ردیف فهرست */
function _trRowHtml(t) {
    var kindTxt = t.kind === 'in' ? '📥 دریافت' : '📤 پرداخت';
    var amt = Number(t.amount) || 0;
    var personName = '—';
    if (t.personId) {
        var p = (DB.load('persons', []) || []).filter(function (x) { return x && x.id === t.personId; })[0];
        if (p) personName = ((p.first || '') + ' ' + (p.last || '')).trim() || '—';
    }
    return '<tr>'
        + '<td dir="ltr">' + toFa(esc(t.date || '—')) + '</td>'
        + '<td>' + kindTxt + '</td>'
        + '<td>' + esc(_trAccountLabel(t.accountId)) + '</td>'
        + '<td>' + esc(personName) + '</td>'
        + '<td style="font-weight:800;color:' + (t.kind === 'in' ? '#059669' : '#dc2626') + '">' + esc(formatMoney(amt)) + ' ' + esc(currencyLabel()) + '</td>'
        + '<td>' + esc(t.desc || '—') + '</td>'
        + '<td><div class="row-actions">'
        +   Hist.rowBtn(t.id, kindTxt + ' ' + formatRaw(amt))
        +   '<button class="row-btn edit" data-id="' + esc(t.id) + '">✎</button>'
        +   '<button class="row-btn del" data-id="' + esc(t.id) + '">×</button>'
        + '</div></td></tr>';
}

/* بایند دکمه‌های ویرایش/حذف فهرست خزانه */
function _trBindRowActions(tb) {
    tb.querySelectorAll('.row-btn.edit').forEach(function (b) {
        b.onclick = function () {
            var id = b.getAttribute('data-id');
            var t = (DB.load(TREASURY_STORE, []) || []).filter(function (x) { return x && x.id === id; })[0];
            if (!t) return;
            fillTreasuryForm(t);
            var addTab = document.querySelector('#page-treasury .tab-btn[data-tab="tr-add"]');
            if (addTab) addTab.click();
        };
    });
    tb.querySelectorAll('.row-btn.del').forEach(function (b) {
        b.onclick = function () {
            var id = b.getAttribute('data-id');
            var t = (DB.load(TREASURY_STORE, []) || []).filter(function (x) { return x && x.id === id; })[0];
            if (!t) return;
            if (!confirm('حذف این ' + (t.kind === 'in' ? 'دریافت' : 'پرداخت') + ' به مبلغ ' + formatMoney(t.amount) + '؟')) return;
            var rest = (DB.load(TREASURY_STORE, []) || []).filter(function (x) { return x && x.id !== id; });
            Hist.log(TREASURY_STORE, id, 'حذف', t, null, (t.kind === 'in' ? 'دریافت ' : 'پرداخت ') + formatRaw(t.amount));
            DB.save(TREASURY_STORE, rest);
            renderTreasuryList();
            showToast('🗑 حذف شد');
        };
    });
    Hist.bindRowButtons(tb, TREASURY_STORE);
}

/* فهرست خزانه */
function renderTreasuryList() {
    var list = DB.load(TREASURY_STORE, []);
    if (!Array.isArray(list)) list = [];

    var tb = document.getElementById('tr-list-body');
    if (!tb) return;

    var filterEl = document.getElementById('tr-filter');
    var filter = (filterEl ? filterEl.value : '').toLowerCase();

    var sumIn = 0, sumOut = 0;
    var rows = list.slice().sort(function (a, b) {
        return String(b.date || '').localeCompare(String(a.date || ''));
    });

    var shown = 0;
    var html = '';
    rows.forEach(function (t) {
        var amt = Number(t.amount) || 0;
        if (t.kind === 'in') sumIn += amt; else sumOut += amt;
        var personName = '—';
        if (t.personId) {
            var p = (DB.load('persons', []) || []).filter(function (x) { return x && x.id === t.personId; })[0];
            if (p) personName = ((p.first || '') + ' ' + (p.last || '')).trim() || '—';
        }
        var hay = ((t.kind === 'in' ? 'دریافت پرداخت' : '') + ' ' + _trAccountLabel(t.accountId) + ' ' + personName + ' ' + (t.desc || '') + ' ' + (t.date || '')).toLowerCase();
        if (filter && hay.indexOf(filter) === -1) return;
        shown++;
        html += _trRowHtml(t);
    });

    tb.innerHTML = shown ? html : '<tr><td colspan="7" class="empty-row">دریافت/پرداختی ثبت نشده است — از تب «ثبت» اولین ردیف را اضافه کنید.</td></tr>';

    var countEl = document.getElementById('tr-count');
    if (countEl) countEl.textContent = toFa(shown);
    var inEl = document.getElementById('tr-sum-in');
    var outEl = document.getElementById('tr-sum-out');
    var balEl = document.getElementById('tr-sum-balance');
    if (inEl) inEl.textContent = formatMoney(sumIn) + ' ' + currencyLabel();
    if (outEl) outEl.textContent = formatMoney(sumOut) + ' ' + currencyLabel();
    if (balEl) balEl.textContent = formatMoney(sumIn - sumOut) + ' ' + currencyLabel();

    _trBindRowActions(tb);
}

/* فرم ثبت/ویرایش */
function fillTreasuryForm(t) {
    document.getElementById('tr-id').value = t.id || '';
    document.getElementById('tr-kind').value = t.kind || 'in';
    document.getElementById('tr-date').value = t.date || todayJalaliStr();
    refreshTreasuryAccountSelect();
    document.getElementById('tr-account').value = t.accountId || '';
    refreshTreasuryPersonSelect();
    document.getElementById('tr-person').value = t.personId || '';
    document.getElementById('tr-amount').value = t.amount ? formatRaw(t.amount) : '';
    document.getElementById('tr-desc').value = t.desc || '';
    var btn = document.getElementById('save-treasury');
    if (btn) btn.innerHTML = '💾 ذخیره تغییرات';
    _trApplyKindUI();
}

function clearTreasuryForm(kind) {
    document.getElementById('tr-id').value = '';
    document.getElementById('tr-kind').value = kind || 'in';
    document.getElementById('tr-date').value = todayJalaliStr();
    refreshTreasuryAccountSelect();
    refreshTreasuryPersonSelect();
    document.getElementById('tr-account').value = '';
    document.getElementById('tr-person').value = '';
    document.getElementById('tr-amount').value = '';
    document.getElementById('tr-desc').value = '';
    var btn = document.getElementById('save-treasury');
    if (btn) btn.innerHTML = '💾 ذخیره';
    _trApplyKindUI();
}

/* تطبیق ظاهر فرم با نوع (دریافت/پرداخت) */
function _trApplyKindUI() {
    var kindEl = document.getElementById('tr-kind');
    if (!kindEl) return;
    var kind = kindEl.value || 'in';
    var badge = document.getElementById('tr-kind-badge');
    if (badge) {
        if (kind === 'in') {
            badge.textContent = '📥 ثبت دریافت';
            badge.style.cssText = 'display:inline-block;background:#ecfdf5;color:#065f46;border:1.5px solid #059669;border-radius:10px;padding:6px 14px;font-weight:900;font-size:.8rem';
        } else {
            badge.textContent = '📤 ثبت پرداخت';
            badge.style.cssText = 'display:inline-block;background:#fef2f2;color:#991b1b;border:1.5px solid #dc2626;border-radius:10px;padding:6px 14px;font-weight:900;font-size:.8rem';
        }
    }
}

function bindTreasuryForm() {
    var kindEl = document.getElementById('tr-kind');
    if (kindEl && !kindEl.dataset.bound) {
        kindEl.dataset.bound = '1';
        kindEl.onchange = _trApplyKindUI;
    }
    var saveBtn = document.getElementById('save-treasury');
    if (saveBtn && !saveBtn.dataset.bound) {
        saveBtn.dataset.bound = '1';
        saveBtn.onclick = function () {
            var id = document.getElementById('tr-id').value;
            var kind = document.getElementById('tr-kind').value || 'in';
            var date = normalizeDigits(document.getElementById('tr-date').value.trim());
            var accountId = document.getElementById('tr-account').value;
            var amount = parseMoney(document.getElementById('tr-amount').value);
            var personId = document.getElementById('tr-person').value;
            var desc = document.getElementById('tr-desc').value.trim();

            if (!date) { alert('⚠️ تاریخ اجباری است.'); return; }
            if (!accountId) { alert('⚠️ حساب (بانک/صندوق) را انتخاب کنید.'); return; }
            if (!amount) { alert('⚠️ مبلغ را وارد کنید.'); return; }

            var list = DB.load(TREASURY_STORE, []);
            if (!Array.isArray(list)) list = [];

            var before = null, rec = null;
            if (id) {
                list.forEach(function (x) { if (x.id === id) before = JSON.parse(JSON.stringify(x)); });
                if (!before) { alert('❌ رکورد یافت نشد.'); return; }
                rec = before;
                rec.kind = kind; rec.date = date; rec.accountId = accountId;
                rec.amount = amount; rec.personId = personId; rec.desc = desc;
                list = list.map(function (x) { return x.id === id ? rec : x; });
                Hist.log(TREASURY_STORE, id, 'ویرایش', before, rec);
                showToast('✅ تغییرات ذخیره شد.');
            } else {
                rec = { id: uid(), kind: kind, date: date, accountId: accountId, amount: amount, personId: personId, desc: desc };
                list.push(rec);
                Hist.log(TREASURY_STORE, rec.id, 'ایجاد', null, rec);
                showToast(kind === 'in' ? '✅ دریافت ثبت شد.' : '✅ پرداخت ثبت شد.');
            }
            DB.save(TREASURY_STORE, list);
            clearTreasuryForm(kind);
            renderTreasuryList();
            var listTab = document.querySelector('#page-treasury .tab-btn[data-tab="tr-list"]');
            if (listTab) listTab.click();
        };
    }
    var newBtn = document.getElementById('new-treasury');
    if (newBtn && !newBtn.dataset.bound) {
        newBtn.dataset.bound = '1';
        newBtn.onclick = function () { clearTreasuryForm(document.getElementById('tr-kind').value || 'in'); };
    }
    var f = document.getElementById('tr-filter');
    if (f && !f.dataset.bound) {
        f.dataset.bound = '1';
        f.addEventListener('input', renderTreasuryList);
    }
}

function initTreasuryPage() {
    refreshTreasuryAccountSelect();
    refreshTreasuryPersonSelect();
    if (!document.getElementById('tr-date').value) document.getElementById('tr-date').value = todayJalaliStr();
    _trApplyKindUI();
    renderTreasuryList();
    bindTreasuryForm();
    if (typeof Hist !== 'undefined' && Hist.renderTab) Hist.renderTab(TREASURY_STORE, '#tr-id', '#hist-treasury');
}

window.renderTreasuryList = renderTreasuryList;
window.bindTreasuryForm = bindTreasuryForm;
window.initTreasuryPage = initTreasuryPage;
window.refreshTreasuryAccountSelect = refreshTreasuryAccountSelect;
window.fillTreasuryForm = fillTreasuryForm;
window.clearTreasuryForm = clearTreasuryForm;

console.log('✅ [modules/treasury.js] loaded — v2.4.0 (خزانه: دریافت و پرداخت)');
