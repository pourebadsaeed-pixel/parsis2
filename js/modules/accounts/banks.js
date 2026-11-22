/* ============================================================
   پارسیس — حساب‌های بانکی
   مسیر: js/modules/accounts/banks.js
   نسخه اصلاح‌شده: bind idempotent با onclick (رفع باگ ذخیره چندباره)
   ============================================================ */
'use strict';

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

/* helper: نمایش مبلغ با پرانتز برای منفی */
function _fmtMoneyParen(n) {
    n = Number(n) || 0;
    if (n < 0) return '(' + formatMoney(Math.abs(n)) + ')';
    return formatMoney(n);
}

function renderBankAccountsList() {
    var list = DB.load('bankAccounts', []);
    if (!Array.isArray(list)) list = [];
    list = list.filter(function(x) { return x && typeof x === 'object'; });

    var filterEl = document.getElementById('ba-filter');
    var filter = (filterEl ? filterEl.value : '').toLowerCase();
    var tb = document.getElementById('ba-list-body');
    if (!tb) return;
    tb.innerHTML = '';

    var shown = 0;
    var filtered = list.filter(function (b) {
        if (filter) {
            var hay = ((b.bank || '') + ' '
                     + (b.branchName || '') + ' '
                     + (b.card || '') + ' '
                     + (b.account || '') + ' '
                     + (b.iban || '')).toLowerCase();
            if (hay.indexOf(filter) === -1) return false;
        }
        return true;
    });

    /* Pre-compute balances */
    var balanceCache = {};
    var balFn = (typeof getBankBalance === 'function') ? getBankBalance : function() { return 0; };
    filtered.forEach(function(b) { balanceCache[b.id] = balFn(b.id); });

    try {
        filtered = applyTableSort('ba-table', filtered, function (b, k) {
            if (k === 'order') return Number(b.order) || 9999;
            if (k === 'minBalance') return Number(b.minBalance) || 0;
            if (k === 'balance') return balanceCache[b.id] || 0;
            if (k === 'diff') return (balanceCache[b.id] || 0) - (Number(b.minBalance) || 0);
            return b[k] || '';
        });
    } catch(e) {}

    var hide = (typeof getHideState === 'function') ? getHideState('ba-list') : false;

    for (var i = 0; i < filtered.length; i++) {
        var b = filtered[i];
        shown++;

        var minBal = Number(b.minBalance) || 0;
        var bal = balanceCache[b.id] || 0;
        var diff = bal - minBal;

        var mbText = hide ? '—' : (minBal ? formatMoney(minBal) + ' ' + currencyLabel() : '—');
        var balText = hide ? '—' : (_fmtMoneyParen(bal) + ' ' + currencyLabel());
        var diffText = hide ? '—' : (minBal ? (_fmtMoneyParen(diff) + ' ' + currencyLabel()) : '—');

        var balColor = bal >= 0 ? '#1e9e6a' : '#dc2626';
        var diffColor = (minBal && diff < 0) ? '#dc2626' : '#1e9e6a';
        var diffWeight = minBal ? 'bold' : 'normal';

        var tr = document.createElement('tr');
        tr.innerHTML = '<td dir="ltr">' + (b.order != null ? toFa(esc(b.order)) : '—') + '</td>'
            + '<td>' + esc(b.bank) + '</td>'
            + '<td>' + esc(b.branchName) + '</td>'
            + '<td dir="ltr">' + toFa(esc(b.card || '—')) + '</td>'
            + '<td dir="ltr">' + toFa(esc(b.account || '—')) + '</td>'
            + '<td dir="ltr" style="font-size:0.72rem">' + toFa(esc(b.iban || '—')) + '</td>'
            + '<td dir="ltr">' + mbText + '</td>'
            + '<td dir="ltr" style="color:' + balColor + ';font-weight:bold">' + balText + '</td>'
            + '<td dir="ltr" style="color:' + diffColor + ';font-weight:' + diffWeight + '">' + diffText + '</td>'
            + '<td><div class="row-actions">'
            + '<button class="row-btn edit" data-id="' + b.id + '">✎</button>'
            + '<button class="row-btn del" data-id="' + b.id + '">×</button>'
            + '</div></td>';
        tb.appendChild(tr);
    }

    if (shown === 0) {
        tb.innerHTML = '<tr><td colspan="10" class="empty-row">یافت نشد.</td></tr>';
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
        
        var activePage = document.querySelector('.page.active');
        var addTab = activePage ? activePage.querySelector('[data-tab="ba-add"]') : null;
        if (addTab) addTab.click();
    });

    if (typeof applyColVisibility === 'function') applyColVisibility('ba-table');
    if (typeof makeTableResizable === 'function') makeTableResizable(document.getElementById('ba-table'));
    if (typeof attachTableSorting === 'function') attachTableSorting('ba-table', renderBankAccountsList);
    if (typeof applySortIndicator === 'function') applySortIndicator('ba-table');
    if (typeof buildFilterRow === 'function') buildFilterRow(document.getElementById('ba-table'));
}

function clearBAForm() {
    ['ba-id', 'ba-bank', 'ba-branch-code', 'ba-branch-name', 'ba-account', 'ba-iban', 'ba-card', 'ba-order', 'ba-min-balance'].forEach(function (i) {
        var el = document.getElementById(i);
        if (el) el.value = '';
    });
    var typeEl = document.getElementById('ba-type');
    if (typeEl) typeEl.value = '';
}

/* ============================================================
   ✅ bindBanksForm — idempotent via onclick/oninput
   دیگر با هر بار switchToTab، لیسنر تکراری اضافه نمی‌شود
   ============================================================ */
function bindBanksForm() {
    var saveBtn = document.getElementById('save-ba');
    if (saveBtn) {
        saveBtn.onclick = function () {
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
            if (!Array.isArray(l)) l = [];
            if (id) {
                for (var i = 0; i < l.length; i++) { if (l[i].id === id) l[i] = o2; }
            } else {
                l.push(o2);
            }
            DB.save('bankAccounts', l);
            showToast('✅ حساب بانکی ذخیره شد.');
            clearBAForm();
            renderBankAccountsList();
            if (typeof updateHomeWidgets === 'function') updateHomeWidgets();

            var activePage = document.querySelector('.page.active');
            var listTab = activePage ? activePage.querySelector('[data-tab="ba-list"]') : null;
            if (listTab) listTab.click();
        };
    }

    var newBtn = document.getElementById('new-ba');
    if (newBtn) {
        newBtn.onclick = clearBAForm;
    }

    var filterEl = document.getElementById('ba-filter');
    if (filterEl) {
        filterEl.oninput = renderBankAccountsList;
    }

    /* attachMoneyInput از dataset.money استفاده می‌کند → idempotent */
    if (typeof attachMoneyInput === 'function') {
        attachMoneyInput(document.getElementById('ba-min-balance'));
    }
}

window.refreshBankTypeSelect  = refreshBankTypeSelect;
window.renderBankAccountsList = renderBankAccountsList;
window.clearBAForm            = clearBAForm;
window.bindBanksForm          = bindBanksForm;
window._fmtMoneyParen         = _fmtMoneyParen;

console.log('✅ [modules/accounts/banks.js] loaded — idempotent binding (onclick)');
