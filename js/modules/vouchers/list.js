/* ============================================================
   پارسیس — فهرست اسناد (بخش ۱: رندر + صفحه‌بندی + پیش‌نمایش)
   مسیر: js/modules/vouchers/list.js
   وابستگی: core/* + ui/* + vouchers/form.js
   ============================================================ */
'use strict';

/* ============================================================
   بخش ۱ — تنظیمات صفحه‌بندی
   ============================================================ */
var VOUCHER_PAGE_SIZE = 50;
window._vlistPg = window._vlistPg || { page: 1 };

/* ============================================================
   بخش ۲ — باکس صفحه‌بندی
   ============================================================ */
function ensureVoucherPaginationBox() {
    var box = document.getElementById('vlist-pagination');
    if (box) return box;

    box = document.createElement('div');
    box.id = 'vlist-pagination';
    box.style.cssText = 'display:flex;justify-content:center;align-items:center;gap:6px;'
                      + 'margin-top:14px;padding:6px 0;flex-wrap:wrap;direction:rtl';

    var tableWrap = document.querySelector('#page-voucher-list .table-wrap');
    if (tableWrap && tableWrap.parentNode) {
        tableWrap.parentNode.insertBefore(box, tableWrap.nextSibling);
    } else {
        var page = document.getElementById('page-voucher-list');
        if (page) page.appendChild(box);
    }
    return box;
}

function renderVoucherPager(total, curPage) {
    var box = ensureVoucherPaginationBox();
    if (!box) return;

    box.innerHTML = '';
    var totalPages = Math.max(1, Math.ceil(total / VOUCHER_PAGE_SIZE));

    if (totalPages <= 1) {
        box.style.display = 'none';
        return;
    }
    box.style.display = 'flex';

    function mkBtn(label, page, disabled, title) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.title = title || '';
        b.disabled = !!disabled;
        b.style.cssText = 'min-width:42px;height:38px;padding:0 12px;border-radius:10px;'
                        + 'border:1.5px solid var(--border);background:var(--card-solid);'
                        + 'color:var(--primary-dark);font-weight:800;font-family:inherit;'
                        + 'font-size:1rem;cursor:pointer;display:inline-flex;'
                        + 'align-items:center;justify-content:center';
        if (disabled) {
            b.style.opacity = '0.35';
            b.style.cursor = 'not-allowed';
        } else {
            b.addEventListener('click', function () {
                window._vlistPg.page = page;
                renderVoucherList();
            });
        }
        box.appendChild(b);
    }

    mkBtn('⏭', 1, curPage === 1, 'اولین صفحه');
    mkBtn('▶', curPage - 1, curPage === 1, 'صفحه قبل');

    var info = document.createElement('span');
    info.textContent = 'صفحه ' + toFa(curPage) + ' از ' + toFa(totalPages);
    info.style.cssText = 'padding:0 14px;font-weight:800;color:var(--primary-dark);font-size:0.85rem';
    box.appendChild(info);

    mkBtn('◀', curPage + 1, curPage === totalPages, 'صفحه بعد');
    mkBtn('⏮', totalPages, curPage === totalPages, 'آخرین صفحه');
}

/* ============================================================
   بخش ۳ — رندر فهرست اسناد
   ============================================================ */
function renderVoucherList() {
    var tb = document.getElementById('voucher-list-body');
    if (!tb) return;

    var allVouchers = DB.load('vouchers', []);

    if (!Array.isArray(allVouchers) || allVouchers.length === 0) {
        tb.innerHTML = '<tr><td colspan="8" class="empty-row">هیچ سندی ثبت نشده است. برای ثبت، از «✏️ صدور سند» استفاده کنید.</td></tr>';
        var cEl = document.getElementById('vlist-count');
        if (cEl) cEl.textContent = '۰';
        var box = document.getElementById('vlist-pagination');
        if (box) box.style.display = 'none';
        return;
    }

    /* فیلترها */
    var periodFilter = (document.getElementById('vl-period-filter') || {}).value || '';
    var statusFilter = (document.getElementById('vlist-status-filter') || {}).value || '';
    var searchVal = ((document.getElementById('vlist-search') || {}).value || '').toLowerCase();

    var vouchers = allVouchers.slice();
    if (periodFilter) vouchers = vouchers.filter(function (v) { return v.periodId === periodFilter; });
    if (statusFilter) vouchers = vouchers.filter(function (v) { return (v.status || 'draft') === statusFilter; });

    var periods = DB.load('fiscalPeriods', []);
    var pMap = {};
    periods.forEach(function (p) { pMap[p.id] = p.title; });

    if (searchVal) {
        vouchers = vouchers.filter(function (v) {
            var pN = pMap[v.periodId] || '';
            var txt = String(v.number || '') + ' '
                    + String(v.date || '') + ' '
                    + String(v.desc || '') + ' '
                    + voucherTypeName(v.type) + ' '
                    + pN;
            return txt.toLowerCase().indexOf(searchVal) !== -1;
        });
    }

    /* مرتب‌سازی */
    var st = (typeof sortState !== 'undefined' && sortState.vouchers)
        ? sortState.vouchers
        : { col: 'number', dir: 'desc' };

    vouchers.sort(function (a, b) {
        var va, vb;
        if (st.col === 'periodName') {
            va = pMap[a.periodId] || '';
            vb = pMap[b.periodId] || '';
        } else if (st.col === 'status') {
            va = a.status === 'approved' ? 'ت' : 'پ';
            vb = b.status === 'approved' ? 'ت' : 'پ';
        } else if (st.col === 'type') {
            va = voucherTypeName(a.type);
            vb = voucherTypeName(b.type);
        } else if (st.col === 'amount') {
            va = getVoucherAmount(a);
            vb = getVoucherAmount(b);
        } else {
            va = a[st.col] || '';
            vb = b[st.col] || '';
        }
        var c = compareVals(va, vb);
        return st.dir === 'asc' ? c : -c;
    });

    /* صفحه‌بندی */
    var total = vouchers.length;
    var totalPages = Math.max(1, Math.ceil(total / VOUCHER_PAGE_SIZE));
    if (window._vlistPg.page > totalPages) window._vlistPg.page = totalPages;
    if (window._vlistPg.page < 1) window._vlistPg.page = 1;
    var startIdx = (window._vlistPg.page - 1) * VOUCHER_PAGE_SIZE;
    var pageVouchers = vouchers.slice(startIdx, startIdx + VOUCHER_PAGE_SIZE);

    /* رسم ردیف‌ها */
    tb.innerHTML = '';
    var hide = getHideState('voucher-list');
    var shown = 0;

    for (var i = 0; i < pageVouchers.length; i++) {
        var v = pageVouchers[i];
        var status = v.status || 'draft';
        var issues = [];
        try { issues = getVoucherIssues(v) || []; } catch (e) { issues = []; }

        var badge;
        if (status === 'approved') {
            badge = '<span class="badge badge-approved">✓ تأیید</span>';
        } else if (issues.length > 0) {
            badge = '<span class="badge badge-draft" title="ناقص">پیش‌نویس ⚠️</span>';
        } else {
            badge = '<span class="badge badge-draft">پیش‌نویس</span>';
        }

        var tB = '<span class="badge badge-type">' + voucherTypeName(v.type) + '</span>';
        var pN = pMap[v.periodId] || '—';
        var amt = getVoucherAmount(v);
        var descTxt = v.desc ? esc(v.desc) : '<span style="color:#cbd5e1">—</span>';

        var tr = document.createElement('tr');
        if (status === 'approved') tr.classList.add('approved-row');

        var aH = '<div class="row-actions">'
               + '<button class="row-btn open" data-id="' + v.id + '" data-action="preview">👁</button>';
        if (status === 'draft') {
            aH += '<button class="row-btn edit" data-id="' + v.id + '" data-action="edit">✎</button>';
            aH += '<button class="row-btn approve" data-id="' + v.id + '" data-action="approve">✓</button>';
            aH += '<button class="row-btn del" data-id="' + v.id + '" data-action="delete">×</button>';
        } else {
            aH += '<button class="row-btn unapprove" data-id="' + v.id + '" data-action="unapprove">↩</button>';
        }
        aH += '</div>';

        tr.innerHTML = '<td dir="ltr">' + toFa(esc(v.number)) + '</td>'
            + '<td dir="ltr">' + toFa(esc(v.date)) + '</td>'
            + '<td>' + tB + '</td>'
            + '<td>' + esc(pN) + '</td>'
            + '<td>' + descTxt + '</td>'
            + '<td class="num" style="font-weight:bold">' + (hide ? '—' : formatMoney(amt)) + '</td>'
            + '<td>' + badge + '</td>'
            + '<td>' + aH + '</td>';

        tb.appendChild(tr);
        shown++;
    }

    if (shown === 0) {
        tb.innerHTML = '<tr><td colspan="8" class="empty-row">سندی مطابق فیلترها یافت نشد.</td></tr>';
    }

    var cntEl = document.getElementById('vlist-count');
    if (cntEl) cntEl.textContent = toFa(total);

    renderVoucherPager(total, window._vlistPg.page);

    /* اتصال ردیف‌ها */
    var btns = tb.querySelectorAll('.row-btn');
    for (var b = 0; b < btns.length; b++) {
        btns[b].addEventListener('click', handleVoucherRowAction);
    }

    if (typeof applyColVisibility === 'function') applyColVisibility('voucher-table-list');
    if (typeof applyColWidths === 'function') applyColWidths('voucher-table-list');
    if (typeof makeTableResizable === 'function') makeTableResizable(document.getElementById('voucher-table-list'));
    if (typeof buildHeaderButtons === 'function') buildHeaderButtons();
    if (typeof applyColumnOrder === 'function') applyColumnOrder('voucher-table-list');
}

/* ============================================================
   بخش ۴ — مدیریت کلیک ردیف‌ها
   ============================================================ */
function handleVoucherRowAction() {
    var id = this.getAttribute('data-id');
    var action = this.getAttribute('data-action');
    var v = findVoucherById(id);
    if (!v) return;

    if (action === 'preview') { openVoucherPreview(v); return; }
    if (action === 'edit')    { loadVoucherForEdit(v); return; }

    if (action === 'approve') {
        var issues = getVoucherIssues(v);
        if (issues.length > 0) {
            alert('⚠️ سند قابل تأیید نیست:\n\n• ' + issues.join('\n• '));
            return;
        }
        var list = DB.load('vouchers', []);
        for (var x = 0; x < list.length; x++) {
            if (list[x].id === id) list[x].status = 'approved';
        }
        DB.save('vouchers', list);
        renderVoucherList();
        showToast('✅ سند تأیید شد.');
        return;
    }

    if (action === 'unapprove') {
        if (!confirm('به پیش‌نویس برگردد؟')) return;
        var list2 = DB.load('vouchers', []);
        for (var y = 0; y < list2.length; y++) {
            if (list2[y].id === id) list2[y].status = 'draft';
        }
        DB.save('vouchers', list2);
        renderVoucherList();
        return;
    }

    if (action === 'delete') {
        if (!confirm('حذف شود؟')) return;
        var list3 = DB.load('vouchers', []).filter(function (x) { return x.id !== id; });
        DB.save('vouchers', list3);
        renderVoucherList();
        if (typeof updateHomeWidgets === 'function') updateHomeWidgets();
        return;
    }
}

/* ============================================================
   بخش ۵ — مرتب‌سازی از روی هدر جدول
   ============================================================ */
function setupSorting() {
    var ths = document.querySelectorAll('#voucher-table-list th[data-sort]');
    for (var i = 0; i < ths.length; i++) {
        ths[i].addEventListener('click', function () {
            var col = this.getAttribute('data-sort');
            if (sortState.vouchers.col === col) {
                sortState.vouchers.dir = sortState.vouchers.dir === 'asc' ? 'desc' : 'asc';
            } else {
                sortState.vouchers.col = col;
                sortState.vouchers.dir = 'asc';
            }
            renderVoucherList();
        });
    }
}

/* ============================================================
   بخش ۶ — پیش‌نمایش سند
   ============================================================ */
function openVoucherPreview(v) {
    var body = document.getElementById('vpreview-body');
    if (!body) return;

    var accounts = DB.load('accounts', []);
    var periods = DB.load('fiscalPeriods', []);
    var period = periods.find(function (p) { return p.id === v.periodId; });
    var status = v.status === 'approved'
        ? '<span class="badge badge-approved">✓ تأیید</span>'
        : '<span class="badge badge-draft">پیش‌نویس</span>';

    var html = '<div class="vp-header"><div class="vp-grid">';
    html += '<div><span class="lbl">شماره:</span> <b>' + toFa(esc(v.number)) + '</b></div>';
    html += '<div><span class="lbl">تاریخ:</span> <b dir="ltr">' + toFa(esc(v.date)) + '</b></div>';
    html += '<div><span class="lbl">نوع:</span> ' + voucherTypeName(v.type) + '</div>';
    html += '<div><span class="lbl">دوره:</span> ' + esc(period ? period.title : '—') + '</div>';
    html += '<div class="full"><span class="lbl">شرح:</span> <b>' + esc(v.desc || '') + '</b></div>';
    html += '<div><span class="lbl">وضعیت:</span> ' + status + '</div>';
    html += '</div></div>';

    html += '<div class="table-wrap"><table class="report-table">'
         +  '<thead><tr><th>#</th><th>معین</th><th>تفصیلی</th><th>شرح</th>'
         +  '<th>بدهکار</th><th>بستانکار</th></tr></thead><tbody>';

    var td = 0, tc = 0;
    var lines = v.lines || [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var accLabel = line.account ? getAccountLabel(line.account, accounts) : '—';

        var dt = '';
        if (line.details) {
            Object.keys(line.details).forEach(function (lt) {
                var did = line.details[lt];
                if (did) {
                    if (dt) dt += ' ، ';
                    dt += linkTypeName(lt) + ': ' + getDetailLabel(lt, did);
                }
            });
        }

        var d = Number(line.debit) || 0;
        var c = Number(line.credit) || 0;
        td += d;
        tc += c;

        html += '<tr><td>' + toFa(i + 1) + '</td>'
            + '<td>' + esc(accLabel) + '</td>'
            + '<td>' + (dt ? esc(dt) : '—') + '</td>'
            + '<td>' + esc(line.description || '') + '</td>'
            + '<td class="num dr">' + (d ? formatMoney(d) : '—') + '</td>'
            + '<td class="num cr">' + (c ? formatMoney(c) : '—') + '</td></tr>';
    }

    html += '</tbody><tfoot><tr><td colspan="4" style="text-align:left">جمع</td>'
         +  '<td class="num dr">' + formatMoney(td) + '</td>'
         +  '<td class="num cr">' + formatMoney(tc) + '</td></tr></tfoot></table></div>';

    if (td === tc && td > 0) {
        html += '<div class="vp-balance-ok">✓ متوازن</div>';
    } else {
        html += '<div class="vp-balance-err">⚠️ اختلاف: ' + formatMoney(Math.abs(td - tc)) + '</div>';
    }

    body.innerHTML = html;

    var m = document.getElementById('vpreview-modal');
    var o = document.getElementById('vpreview-overlay');
    if (m) m.classList.add('show');
    if (o) o.classList.add('show');

    window._currentPreviewVoucher = v;
}

function closeVoucherPreview() {
    var m = document.getElementById('vpreview-modal');
    var o = document.getElementById('vpreview-overlay');
    if (m) m.classList.remove('show');
    if (o) o.classList.remove('show');
    window._currentPreviewVoucher = null;
}

function printVoucherPreview() {
    var v = window._currentPreviewVoucher;
    if (!v) return;
    var body = document.getElementById('vpreview-body');
    var win = window.open('', '_blank');
    if (!win) return;

    var ff = getPrintFontFamily();
    win.document.write('<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="UTF-8"><title>سند ' + esc(v.number) + '</title><style>');
    win.document.write('body { font-family:' + ff + '; direction:rtl; color:#222; font-size:12px; } '
                     + 'h1 { text-align:center; font-size:15px; } '
                     + 'table { width:100%; border-collapse:collapse; font-size:10px; } '
                     + 'th, td { border:1px solid #999; padding:5px 7px; } '
                     + 'th { background:#e6f0fa; } '
                     + '.dr { color:#c0392b; } .cr { color:#1e9e6a; }');
    win.document.write('</style></head><body><h1>سند شماره ' + toFa(esc(v.number)) + '</h1>' + body.innerHTML + '</body></html>');
    win.document.close();
    setTimeout(function () { win.focus(); win.print(); }, 400);
}

/* ============================================================
   بخش ۷ — باز کردن سند از هر جای برنامه
   ============================================================ */
function openVoucherForEditById(vid) {
    var v = findVoucherById(vid);
    if (!v) { showToast('سند یافت نشد.'); return; }

    if (v.status === 'approved') {
        var ans = confirm('این سند تأیید شده است.\n\nOK = برگشت از تأیید + ویرایش\nCancel = فقط مشاهده');
        if (ans) {
            var l = DB.load('vouchers', []);
            for (var i = 0; i < l.length; i++) {
                if (l[i].id === vid) { l[i].status = 'draft'; break; }
            }
            DB.save('vouchers', l);
            showToast('↩ سند به پیش‌نویس برگشت.');
            loadVoucherForEdit(v);
        } else {
            openVoucherPreview(v);
        }
        return;
    }
    loadVoucherForEdit(v);
}

function editVoucherFromAnywhere(vid) {
    openVoucherForEditById(vid);
}

/* ============================================================
   بخش ۸ — اتصال فیلترها و رویدادها
   ============================================================ */
function bindVoucherListFilters() {
    var vpf = document.getElementById('vl-period-filter');
    if (vpf) vpf.addEventListener('change', function () {
        window._vlistPg.page = 1;
        renderVoucherList();
    });

    var vsrch = document.getElementById('vlist-search');
    if (vsrch) vsrch.addEventListener('input', function () {
        window._vlistPg.page = 1;
        renderVoucherList();
    });

    var vstatus = document.getElementById('vlist-status-filter');
    if (vstatus) vstatus.addEventListener('change', function () {
        window._vlistPg.page = 1;
        renderVoucherList();
    });
}

/* ============================================================
   بخش ۹ — پچ goToPage
   ============================================================ */
(function patchGoToPageForVoucherList() {
    function install() {
        if (typeof window.goToPage !== 'function') {
            setTimeout(install, 500);
            return;
        }
        if (window._gtpVListPatched) return;
        window._gtpVListPatched = true;

        var orig = window.goToPage;
        window.goToPage = function (name) {
            var r = orig.apply(this, arguments);
            if (name === 'voucher-list') {
                setTimeout(function () {
                    try { renderVoucherList(); } catch (e) { console.error('vlist:', e); }
                }, 120);
            }
            return r;
        };
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(install, 2000); });
    } else {
        setTimeout(install, 2000);
    }
})();

/* ============================================================
   بخش ۱۰ — شبکه اطمینان
   ============================================================ */
(function ensureVoucherListRendering() {
    setInterval(function () {
        var page = document.getElementById('page-voucher-list');
        if (!page || !page.classList.contains('active')) return;
        var tb = document.getElementById('voucher-list-body');
        if (!tb) return;

        var rows = tb.querySelectorAll('tr').length;
        var isEmpty = rows === 0 || (rows === 1 && tb.querySelector('.empty-row'));
        var dbCount = DB.load('vouchers', []).length;

        if (isEmpty && dbCount > 0) {
            renderVoucherList();
        }
    }, 3000);
})();

/* ============================================================
   صادرسازی
   ============================================================ */
window.renderVoucherList          = renderVoucherList;
window.handleVoucherRowAction     = handleVoucherRowAction;
window.setupSorting               = setupSorting;
window.openVoucherPreview         = openVoucherPreview;
window.closeVoucherPreview        = closeVoucherPreview;
window.printVoucherPreview        = printVoucherPreview;
window.openVoucherForEditById     = openVoucherForEditById;
window.editVoucherFromAnywhere    = editVoucherFromAnywhere;
window.bindVoucherListFilters     = bindVoucherListFilters;
window.VOUCHER_PAGE_SIZE          = VOUCHER_PAGE_SIZE;

console.log('✅ [modules/vouchers/list.js] loaded — complete');
