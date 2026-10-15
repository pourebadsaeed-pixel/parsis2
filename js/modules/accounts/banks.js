/* ============================================================
   پارسیس — حساب‌های بانکی
   مسیر: js/modules/accounts/banks.js
   وابستگی: core/* + ui/*
   ============================================================ */
'use strict';

/* ============================================================
   بخش ۱ — پر کردن سلکت نوع
   ============================================================ */
function refreshBankTypeSelect() {
    var sel = document.getElementById('ba-type');
    if (!sel) return;
    sel.innerHTML = '<option value="">— نوع —</option>';
    for (var i = 0; i < state.bankTypes.length; i++) {
        var o = document.createElement('option');
        o.value = state.bankTypes[i];
        o.textContent = state.bankTypes[i];
        sel.appendChild(o);
    }
}

/* ============================================================
   بخش ۲ — رندر فهرست حساب‌ها
   ============================================================ */
function renderBankAccountsList() {
    var list = DB.load('bankAccounts', []);
    var filterEl = document.getElementById('ba-filter');
    var filter = (filterEl ? filterEl.value : '').toLowerCase();
    var tb = document.getElementById('ba-list-body');
    if (!tb) return;
    tb.innerHTML = '';

    var shown = 0;
    var filtered = list.filter(function (b) {
        if (filter && ((b.bank || '') + ' ' + (b.account || '') + ' ' + (b.branchName || '')).toLowerCase().indexOf(filter) === -1) {
            return false;
        }
        return true;
    });

    filtered = applyTableSort('ba-table', filtered, function (b, k) {
        if (k === 'order') return Number(b.order) || 9999;
        if (k === 'minBalance') return Number(b.minBalance) || 0;
        return b[k] || '';
    });

    for (var i = 0; i < filtered.length; i++) {
        var b = filtered[i];
        shown++;
        var mb = b.minBalance ? formatMoney(b.minBalance) + ' ' + currencyLabel() : '—';
        var tr = document.createElement('tr');
        tr.innerHTML = '<td dir="ltr">' + (b.order != null ? toFa(esc(b.order)) : '—') + '</td>'
            + '<td>' + esc(b.bank) + '</td>'
            + '<td>' + esc(b.branchName) + '</td>'
            + '<td dir="ltr">' + toFa(esc(b.account)) + '</td>'
            + '<td dir="ltr">' + mb + '</td>'
            + '<td><div class="row-actions">'
            + '<button class="row-btn edit" data-id="' + b.id + '">✎</button>'
            + '<button class="row-btn del" data-id="' + b.id + '">×</button>'
            + '</div></td>';
        tb.appendChild(tr);
    }

    if (shown === 0) {
        tb.innerHTML = '<tr><td colspan="6" class="empty-row">یافت نشد.</td></tr>';
    }

    var countEl = document.getElementById('ba-count');
    if (countEl) countEl.textContent = toFa(shown);

    attachRowActions(tb, 'bankAccounts', renderBankAccountsList, function (b) {
        document.getElementById('ba-id').value = b.id;
        document.getElementById('ba-bank').value = b.bank || '';
        document.getElementById('ba-type').value = b.type || '';
        document.getElementById('ba-branch-code').value = b.branchCode || '';
        document.getElementById('ba-branch-name').value = b.branchName || '';
        document.getElementById('ba-account').value = b.account || '';
        document.getElementById('ba-iban').value = b.iban || '';
        document.getElementById('ba-card').value = b.card || '';
        document.getElementById('ba-order').value = (b.order != null ? b.order : '');
        document.getElementById('ba-min-balance').value = b.minBalance ? formatRaw(b.minBalance) : '';
        var addTab = document.querySelector('[data-tab="ba-add"]');
        if (addTab) addTab.click();
    });

    if (typeof applyColVisibility === 'function') applyColVisibility('ba-table');
    if (typeof makeTableResizable === 'function') makeTableResizable(document.getElementById('ba-table'));
    if (typeof attachTableSorting === 'function') attachTableSorting('ba-table', renderBankAccountsList);
    if (typeof applySortIndicator === 'function') applySortIndicator('ba-table');
}

/* ============================================================
   بخش ۳ — پاک کردن فرم
   ============================================================ */
function clearBAForm() {
    var ids = ['ba-id', 'ba-bank', 'ba-branch-code', 'ba-branch-name',
               'ba-account', 'ba-iban', 'ba-card', 'ba-order', 'ba-min-balance'];
    ids.forEach(function (i) {
        var el = document.getElementById(i);
        if (el) el.value = '';
    });
    var typeEl = document.getElementById('ba-type');
    if (typeEl) typeEl.value = '';
}

/* ============================================================
   بخش ۴ — اتصال دکمه‌ها
   ============================================================ */
function bindBanksForm() {
    var saveBtn = document.getElementById('save-ba');
    if (saveBtn) saveBtn.addEventListener('click', function () {
        var id = document.getElementById('ba-id').value;
        var b = document.getElementById('ba-bank').value.trim();
        if (!b) { alert('نام بانک اجباری.'); return; }

        var oR = normalizeDigits(document.getElementById('ba-order').value.trim());
        var o = oR === '' ? null : Number(oR);
        var mb = parseMoney(normalizeDigits(document.getElementById('ba-min-balance').value));

        var o2 = {
            id: id || uid(),
            bank: b,
            type: document.getElementById('ba-type').value,
            branchCode: normalizeDigits(document.getElementById('ba-branch-code').value.trim()),
            branchName: document.getElementById('ba-branch-name').value.trim(),
            account: normalizeDigits(document.getElementById('ba-account').value.trim()),
            iban: document.getElementById('ba-iban').value.trim(),
            card: normalizeDigits(document.getElementById('ba-card').value.trim()),
            order: o,
            minBalance: mb
        };

        var l = DB.load('bankAccounts', []);
        if (id) {
            for (var i = 0; i < l.length; i++) {
                if (l[i].id === id) l[i] = o2;
            }
        } else {
            l.push(o2);
        }
        DB.save('bankAccounts', l);
        showToast('✅ حساب بانکی ذخیره شد.');
        clearBAForm();
        renderBankAccountsList();
        if (typeof updateHomeWidgets === 'function') updateHomeWidgets();
        var listTab = document.querySelector('[data-tab="ba-list"]');
        if (listTab) listTab.click();
    });

    var newBtn = document.getElementById('new-ba');
    if (newBtn) newBtn.addEventListener('click', clearBAForm);

    var filterEl = document.getElementById('ba-filter');
    if (filterEl) filterEl.addEventListener('input', renderBankAccountsList);

    attachMoneyInput(document.getElementById('ba-min-balance'));
}

/* ============================================================
   صادرسازی
   ============================================================ */
window.refreshBankTypeSelect  = refreshBankTypeSelect;
window.renderBankAccountsList = renderBankAccountsList;
window.clearBAForm            = clearBAForm;
window.bindBanksForm          = bindBanksForm;

console.log('✅ [modules/accounts/banks.js] loaded');
