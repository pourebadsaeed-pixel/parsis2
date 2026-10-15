/* ============================================================
   پارسیس — منابع دریافتنی (Cash Flow Sources)
   مسیر: js/modules/vouchers/sources.js
   وابستگی: core/* + ui/*
   ============================================================ */
'use strict';

/* ============================================================
   بخش ۱ — پر کردن سلکت معین
   ============================================================ */
function refreshCfsMoeinSelect() {
    var sel = document.getElementById('cfs-moein');
    if (!sel) return;
    var v = sel.value;
    var leaves = getLeafAccountsSortedByCode();
    var accounts = DB.load('accounts', []);
    sel.innerHTML = '<option value="">— ابتدا معین را انتخاب کنید —</option>';
    leaves.forEach(function (a) {
        var o = document.createElement('option');
        o.value = a.id;
        o.textContent = getAccountLabel(a.id, accounts);
        sel.appendChild(o);
    });
    sel.value = v;
}

/* ============================================================
   بخش ۲ — واکنش به تغییر معین (نمایش تفصیلی)
   ============================================================ */
function onCfsMoeinChange() {
    var moeinId = document.getElementById('cfs-moein').value;
    var wrap = document.getElementById('cfs-details-wrap');
    if (!wrap) return;
    wrap.innerHTML = '';
    if (!moeinId) return;

    var accounts = DB.load('accounts', []);
    var acc = accounts.find(function (a) { return a.id === moeinId; });
    if (!acc || !acc.links || acc.links.length === 0) return;

    var prev = DB.load('cfs.tmp.details', {});
    var html = '';
    for (var i = 0; i < acc.links.length; i++) {
        var lt = acc.links[i];
        var items = getLinkedItems(lt);
        if (items.length === 0) continue;
        var selId = 'cfs-detail-' + lt;
        html += '<div class="field"><label>عنوان سطح ۴ منبع (' + linkTypeName(lt) + ') *</label>'
             +  '<select id="' + selId + '"><option value="">— انتخاب کنید —</option>';
        for (var k = 0; k < items.length; k++) {
            var it = items[k];
            html += '<option value="' + it.id + '"' + (prev[lt] === it.id ? ' selected' : '') + '>'
                 +  esc(getLinkedItemLabel(lt, it)) + '</option>';
        }
        html += '</select></div>';
    }
    wrap.innerHTML = html;
}

/* ============================================================
   بخش ۳ — رندر فهرست منابع
   ============================================================ */
function renderCfsList() {
    var list = DB.load('cashFlowSources', []);
    var filterEl = document.getElementById('cfs-filter');
    var filter = (filterEl ? filterEl.value : '').toLowerCase();
    var tb = document.getElementById('cfs-list-body');
    if (!tb) return;
    tb.innerHTML = '';

    var shown = 0;
    var accounts = DB.load('accounts', []);

    var rows = list.map(function (s) {
        var moeinLabel = getAccountLabel(s.moeinId, accounts);
        var detailLabel = (s.linkType && s.detailId)
            ? getDetailLabel(s.linkType, s.detailId)
            : '—';
        return { s: s, moein: moeinLabel, detail: detailLabel };
    }).filter(function (r) {
        var txt = (r.moein + ' ' + r.detail + ' ' + (r.s.notes || '')).toLowerCase();
        return !filter || txt.indexOf(filter) !== -1;
    });

    rows = applyTableSort('cfs-table', rows, function (r, k) {
        if (k === 'moein') return r.moein;
        if (k === 'detail') return r.detail;
        if (k === 'expectedDate') return r.s.expectedDate || '';
        if (k === 'amount') return Number(r.s.amount) || 0;
        if (k === 'notes') return r.s.notes || '';
        return '';
    });

    rows.forEach(function (r) {
        shown++;
        var s = r.s;
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + esc(r.moein) + '</td>'
            + '<td>' + esc(r.detail)
            + (s.linkType ? ' <span class="muted" style="font-size:0.7rem">(' + linkTypeName(s.linkType) + ')</span>' : '')
            + '</td>'
            + '<td dir="ltr">' + toFa(esc(s.expectedDate || '—')) + '</td>'
            + '<td class="num" style="font-weight:bold;color:#1e9e6a">' + fmtFor(s.amount || 0, 'cfs-list') + ' ' + currencyLabel() + '</td>'
            + '<td>' + esc(s.notes || '—') + '</td>'
            + '<td><div class="row-actions">'
            + '<button class="row-btn edit" data-id="' + s.id + '" data-action="edit" title="ویرایش">✎</button>'
            + '<button class="row-btn copy" data-id="' + s.id + '" data-action="copy" title="کپی">📋</button>'
            + '<button class="row-btn del" data-id="' + s.id + '" data-action="delete" title="حذف">×</button>'
            + '</div></td>';
        tb.appendChild(tr);
    });

    if (shown === 0) {
        tb.innerHTML = '<tr><td colspan="6" class="empty-row">موردی ثبت نشده.</td></tr>';
    }

    var countEl = document.getElementById('cfs-count');
    if (countEl) countEl.textContent = toFa(shown);

    /* اتصال رویدادها */
    var btns = tb.querySelectorAll('.row-btn');
    for (var b = 0; b < btns.length; b++) {
        btns[b].addEventListener('click', function () {
            var id = this.getAttribute('data-id');
            var action = this.getAttribute('data-action');
            var allList = DB.load('cashFlowSources', []);
            var s = allList.find(function (x) { return x.id === id; });
            if (!s) return;

            if (action === 'edit') {
                document.getElementById('cfs-id').value = s.id;
                document.getElementById('cfs-moein').value = s.moeinId || '';
                onCfsMoeinChange();
                if (s.linkType && s.detailId) {
                    var sel = document.getElementById('cfs-detail-' + s.linkType);
                    if (sel) sel.value = s.detailId;
                }
                document.getElementById('cfs-date').value = s.expectedDate || '';
                document.getElementById('cfs-amount').value = s.amount ? formatRaw(s.amount) : '';
                document.getElementById('cfs-notes').value = s.notes || '';
                var addTab = document.querySelector('[data-tab="cfs-add"]');
                if (addTab) addTab.click();
                return;
            }

            if (action === 'copy') {
                var copyItem = {
                    id: uid(),
                    moeinId: s.moeinId,
                    linkType: s.linkType,
                    detailId: s.detailId,
                    expectedDate: s.expectedDate,
                    amount: Number(s.amount) || 0,
                    notes: s.notes ? (s.notes + ' (کپی)') : 'کپی'
                };
                allList.push(copyItem);
                DB.save('cashFlowSources', allList);
                renderCfsList();
                showToast('📋 منبع کپی شد.');
                return;
            }

            if (action === 'delete') {
                if (!confirm('حذف شود؟')) return;
                var l2 = allList.filter(function (x) { return x.id !== id; });
                DB.save('cashFlowSources', l2);
                renderCfsList();
                if (typeof updateHomeWidgets === 'function') updateHomeWidgets();
                return;
            }
        });
    }

    if (typeof applyColVisibility === 'function') applyColVisibility('cfs-table');
    if (typeof makeTableResizable === 'function') makeTableResizable(document.getElementById('cfs-table'));
    if (typeof attachTableSorting === 'function') attachTableSorting('cfs-table', renderCfsList);
    if (typeof applySortIndicator === 'function') applySortIndicator('cfs-table');
}

/* ============================================================
   بخش ۴ — پاک کردن فرم
   ============================================================ */
function clearCfsForm() {
    var ids = ['cfs-id', 'cfs-moein', 'cfs-date', 'cfs-amount', 'cfs-notes'];
    ids.forEach(function (x) {
        var el = document.getElementById(x);
        if (el) el.value = '';
    });
    var wrap = document.getElementById('cfs-details-wrap');
    if (wrap) wrap.innerHTML = '';
    DB.save('cfs.tmp.details', {});
}

/* ============================================================
   بخش ۵ — ذخیره منبع
   ============================================================ */
function saveCfsSource() {
    var id = document.getElementById('cfs-id').value;
    var moeinId = document.getElementById('cfs-moein').value;
    if (!moeinId) { alert('معین منبع اجباری است.'); return; }

    var accounts = DB.load('accounts', []);
    var acc = accounts.find(function (a) { return a.id === moeinId; });
    if (!acc) { alert('معین نامعتبر.'); return; }

    var linkType = '';
    var detailId = '';
    if (acc.links && acc.links.length > 0) {
        for (var i = 0; i < acc.links.length; i++) {
            var lt = acc.links[i];
            var sel = document.getElementById('cfs-detail-' + lt);
            if (!sel) continue;
            var items = getLinkedItems(lt);
            if (items.length === 0) continue;
            if (!sel.value) {
                alert('سطح ۴ (' + linkTypeName(lt) + ') اجباری است.');
                return;
            }
            linkType = lt;
            detailId = sel.value;
            break;
        }
    }

    var expectedDate = normalizeDigits(document.getElementById('cfs-date').value.trim());
    var amount = parseMoney(normalizeDigits(document.getElementById('cfs-amount').value));
    if (!amount) { alert('مبلغ اجباری است.'); return; }
    var notes = document.getElementById('cfs-notes').value.trim();

    var o = {
        id: id || uid(),
        moeinId: moeinId,
        linkType: linkType,
        detailId: detailId,
        expectedDate: expectedDate,
        amount: amount,
        notes: notes
    };

    var list = DB.load('cashFlowSources', []);
    if (id) {
        for (var k = 0; k < list.length; k++) {
            if (list[k].id === id) list[k] = o;
        }
    } else {
        list.push(o);
    }
    DB.save('cashFlowSources', list);
    showToast('✅ ذخیره شد');
    clearCfsForm();
    renderCfsList();
    var listTab = document.querySelector('[data-tab="cfs-list"]');
    if (listTab) listTab.click();
}

/* ============================================================
   بخش ۶ — برچسب منبع (برای گزارش‌ها)
   ============================================================ */
function getSourceLabel(s) {
    var accounts = DB.load('accounts', []);
    var moeinLabel = getAccountLabel(s.moeinId, accounts);
    var detailLabel = '';
    if (s.linkType && s.detailId) detailLabel = getDetailLabel(s.linkType, s.detailId);
    return moeinLabel + (detailLabel ? ' — ' + detailLabel : '');
}

/* ============================================================
   بخش ۷ — اتصال دکمه‌ها
   ============================================================ */
function bindSourcesForm() {
    var moeinSel = document.getElementById('cfs-moein');
    if (moeinSel) moeinSel.addEventListener('change', onCfsMoeinChange);

    var saveBtn = document.getElementById('save-cfs');
    if (saveBtn) saveBtn.addEventListener('click', saveCfsSource);

    var newBtn = document.getElementById('new-cfs');
    if (newBtn) newBtn.addEventListener('click', clearCfsForm);

    var filterEl = document.getElementById('cfs-filter');
    if (filterEl) filterEl.addEventListener('input', renderCfsList);

    attachMoneyInput(document.getElementById('cfs-amount'));
}

/* ============================================================
   صادرسازی
   ============================================================ */
window.refreshCfsMoeinSelect = refreshCfsMoeinSelect;
window.onCfsMoeinChange      = onCfsMoeinChange;
window.renderCfsList         = renderCfsList;
window.clearCfsForm          = clearCfsForm;
window.saveCfsSource         = saveCfsSource;
window.getSourceLabel        = getSourceLabel;
window.bindSourcesForm       = bindSourcesForm;

console.log('✅ [modules/vouchers/sources.js] loaded');
