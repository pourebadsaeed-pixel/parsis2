/* ============================================================
   پارسیس — برآورد منابع دریافتنی (نسخه اصلاح‌شده نهایی)
   مسیر: js/modules/vouchers/sources.js
   ============================================================ */
'use strict';

var _cfsSelectedDetail = null;

function refreshCfsMoeinSelect() {
    var hiddenInp = document.getElementById('cfs-moein');
    var container = document.getElementById('cfs-moein-searchable');
    if (!hiddenInp || !container) return;

    var leaves = getLeafAccountsSortedByCode();
    var accounts = DB.load('accounts', []);
    var items = leaves.map(function (a) {
        return { value: a.id, text: getAccountLabel(a.id, accounts) };
    });

    var currentVal = hiddenInp.value || '';

    if (typeof createSearchableSelect !== 'function') {
        container.innerHTML = '<select id="cfs-moein-fallback"></select>';
        var sel = document.getElementById('cfs-moein-fallback');
        sel.innerHTML = '<option value="">— انتخاب معین —</option>';
        items.forEach(function(it) {
            var o = document.createElement('option');
            o.value = it.value; o.textContent = it.text;
            if (it.value === currentVal) o.selected = true;
            sel.appendChild(o);
        });
        sel.addEventListener('change', function() {
            hiddenInp.value = this.value;
            onCfsMoeinChange();
        });
        return;
    }

    container.innerHTML = '';
    var searchSel = createSearchableSelect(
        items,
        currentVal,
        '— ابتدا معین را انتخاب کنید —',
        function (val) {
            hiddenInp.value = val || '';
            onCfsMoeinChange();
        }
    );
    container.appendChild(searchSel);
}

function onCfsMoeinChange(preSelectedDetailValue) {
    var moeinId = document.getElementById('cfs-moein').value;
    var wrap = document.getElementById('cfs-details-wrap');
    if (!wrap) return;
    wrap.innerHTML = '';
    _cfsSelectedDetail = null;

    if (!moeinId) return;

    var accounts = DB.load('accounts', []);
    var acc = accounts.find(function (a) { return a.id === moeinId; });
    if (!acc || !acc.links || acc.links.length === 0) return;

    var uniqueLinks = [];
    acc.links.forEach(function (lt) {
        if (uniqueLinks.indexOf(lt) === -1) uniqueLinks.push(lt);
    });

    var combined = [];
    var seenTexts = {};
    uniqueLinks.forEach(function (lt) {
        var items = getLinkedItems(lt);
        items.forEach(function (it) {
            var val = lt + '::' + it.id;
            var lbl = getLinkedItemLabel(lt, it);
            var txt = linkTypeName(lt) + ': ' + lbl;
            if (!seenTexts[txt]) {
                seenTexts[txt] = true;
                combined.push({ value: val, text: txt });
            }
        });
    });

    if (combined.length === 0) {
        wrap.innerHTML = '<div class="field" style="color:#c47c00;font-size:0.82rem;padding:8px 12px;background:#fef3c7;border-radius:10px;border:1px solid #f59e0b">'
                       + '⚠️ برای این معین هیچ آیتم تفصیلی‌ای تعریف نشده است (می‌توانید بدون انتخاب ذخیره کنید).'
                       + '</div>';
        return;
    }

    var initialVal = null;
    if (preSelectedDetailValue) {
        var exists = combined.some(function (it) { return it.value === preSelectedDetailValue; });
        if (exists) {
            initialVal = preSelectedDetailValue;
            var parts = preSelectedDetailValue.split('::');
            _cfsSelectedDetail = { linkType: parts[0], id: parts[1] };
        }
    }

    var wrapDiv = document.createElement('div');
    wrapDiv.className = 'field';

    var lbl = document.createElement('label');
    lbl.textContent = 'عنوان سطح ۴ منبع (' + uniqueLinks.map(linkTypeName).join(' / ') + ') *';
    wrapDiv.appendChild(lbl);

    if (typeof createSearchableSelect === 'function') {
        var detSel = createSearchableSelect(
            combined,
            initialVal,
            '— انتخاب تفصیلی —',
            function (val) {
                if (!val) { _cfsSelectedDetail = null; return; }
                var parts = val.split('::');
                _cfsSelectedDetail = { linkType: parts[0], id: parts[1] };
            }
        );
        wrapDiv.appendChild(detSel);
    } else {
        var sel = document.createElement('select');
        sel.innerHTML = '<option value="">— انتخاب تفصیلی —</option>';
        combined.forEach(function (it) {
            var o = document.createElement('option');
            o.value = it.value;
            o.textContent = it.text;
            if (it.value === initialVal) o.selected = true;
            sel.appendChild(o);
        });
        sel.addEventListener('change', function () {
            if (!this.value) { _cfsSelectedDetail = null; return; }
            var parts = this.value.split('::');
            _cfsSelectedDetail = { linkType: parts[0], id: parts[1] };
        });
        wrapDiv.appendChild(sel);
    }

    wrap.appendChild(wrapDiv);
}

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
                refreshCfsMoeinSelect();
                var preSel = (s.linkType && s.detailId) ? (s.linkType + '::' + s.detailId) : null;
                onCfsMoeinChange(preSel);
                document.getElementById('cfs-date').value = s.expectedDate || '';
                document.getElementById('cfs-amount').value = s.amount ? formatRaw(s.amount) : '';
                document.getElementById('cfs-notes').value = s.notes || '';

                var activePage = document.querySelector('.page.active');
                var addTab = activePage ? activePage.querySelector('[data-tab="cfs-add"]') : null;
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
    if (typeof buildFilterRow === 'function') buildFilterRow(document.getElementById('cfs-table'));
}

function clearCfsForm() {
    var ids = ['cfs-id', 'cfs-moein', 'cfs-date', 'cfs-amount', 'cfs-notes'];
    ids.forEach(function (x) {
        var el = document.getElementById(x);
        if (el) el.value = '';
    });
    var wrap = document.getElementById('cfs-details-wrap');
    if (wrap) wrap.innerHTML = '';
    _cfsSelectedDetail = null;
    DB.save('cfs.tmp.details', {});
    refreshCfsMoeinSelect();
}

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
        var hasAnyLinkItems = acc.links.some(function (lt) {
            return getLinkedItems(lt).length > 0;
        });

        if (hasAnyLinkItems) {
            if (!_cfsSelectedDetail) {
                alert('لطفاً یک آیتم از لیست سطح ۴ انتخاب کنید.');
                return;
            }
            linkType = _cfsSelectedDetail.linkType;
            detailId = _cfsSelectedDetail.id;
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

    var activePage = document.querySelector('.page.active');
    var listTab = activePage ? activePage.querySelector('[data-tab="cfs-list"]') : null;
    if (listTab) listTab.click();
}

function getSourceLabel(s) {
    var accounts = DB.load('accounts', []);
    var moeinLabel = getAccountLabel(s.moeinId, accounts);
    var detailLabel = '';
    if (s.linkType && s.detailId) detailLabel = getDetailLabel(s.linkType, s.detailId);
    return moeinLabel + (detailLabel ? ' — ' + detailLabel : '');
}

/* ============================================================
   ✅ بایند کردن (استفاده از onclick برای جلوگیری از باگ تب‌های کپی‌شده)
   ============================================================ */
function bindSourcesForm() {
    refreshCfsMoeinSelect();

    var saveBtn = document.getElementById('save-cfs');
    if (saveBtn) {
        saveBtn.onclick = saveCfsSource; 
    }

    var newBtn = document.getElementById('new-cfs');
    if (newBtn) {
        newBtn.onclick = clearCfsForm;
    }

    var filterEl = document.getElementById('cfs-filter');
    if (filterEl) {
        filterEl.oninput = renderCfsList;
    }

    if (typeof attachMoneyInput === 'function') {
        attachMoneyInput(document.getElementById('cfs-amount'));
    }
}

window.refreshCfsMoeinSelect = refreshCfsMoeinSelect;
window.onCfsMoeinChange      = onCfsMoeinChange;
window.renderCfsList         = renderCfsList;
window.clearCfsForm          = clearCfsForm;
window.saveCfsSource         = saveCfsSource;
window.getSourceLabel        = getSourceLabel;
window.bindSourcesForm       = bindSourcesForm;

console.log('✅ [modules/vouchers/sources.js] loaded — save button fixed');
