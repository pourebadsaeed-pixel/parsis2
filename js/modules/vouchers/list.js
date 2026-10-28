/* ============================================================
   پارسیس — فهرست اسناد (با دریافت اکسل و نمونه)
   مسیر: js/modules/vouchers/list.js
   ✅ v3: اسناد وارد شده همیشه به عنوان پیش‌نویس ذخیره می‌شوند (بدون خطا)
   ============================================================ */
'use strict';

var VOUCHER_PAGE_SIZE = 50;
window._vlistPg = window._vlistPg || { page: 1 };

/* ============================================================
   ✅ توابع فایل نمونه و دریافت داده
   ============================================================ */

function downloadVoucherTemplate() {
    if (typeof XLSX === 'undefined') {
        alert('کتابخانه اکسل بارگذاری نشده است. اتصال اینترنت را بررسی کنید.');
        return;
    }

    var ws_data = [
        ['شماره سند', 'تاریخ', 'نوع سند', 'شرح سند', 'کد حساب', 'تفصیلی', 'شرح قلم', 'بدهکار', 'بستانکار'],
        ['', '1405/08/05', 'عمومی', 'خرید ملزومات', '5-01-002', 'صندوق', 'خرید ملزومات', '500000', '0'],
        ['', '1405/08/05', 'عمومی', 'خرید ملزومات', '1-01-001', '', 'پرداخت از صندوق', '0', '500000']
    ];
    var ws = XLSX.utils.aoa_to_sheet(ws_data);
    
    ws['!cols'] = [
        { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 20 },
        { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }
    ];

    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "parsis-voucher-template.xlsx");
}

function importVouchersFromExcel(file) {
    if (typeof XLSX === 'undefined') {
        alert('کتابخانه اکسل بارگذاری نشده است.');
        return;
    }
    
    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            var data = new Uint8Array(e.target.result);
            var workbook = XLSX.read(data, {type: 'array'});
            var firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            var rows = XLSX.utils.sheet_to_json(firstSheet, {header: 1});
            
            if (rows.length < 2) { alert('فایل خالی است.'); return; }
            
            var vouchersMap = {};
            var accounts = DB.load('accounts', []);
            var leaves = accounts.filter(function(a) { return !accounts.some(function(x) { return x.parent === a.id; }); });
            
            var parsedRows = 0;
            
            for (var i = 1; i < rows.length; i++) {
                var r = rows[i];
                if (!r || r.length < 5) continue;
                
                var vNum = String(r[0] || '').trim();
                var vDate = normalizeDigits(String(r[1] || '').trim());
                var vType = String(r[2] || 'general').trim();
                var vDesc = String(r[3] || '').trim();
                var accCode = String(r[4] || '').trim();
                var detailStr = String(r[5] || '').trim();
                var lineDesc = String(r[6] || '').trim();
                var debit = Number(normalizeDigits(String(r[7] || '0')).replace(/[^\d]/g, '')) || 0;
                var credit = Number(normalizeDigits(String(r[8] || '0')).replace(/[^\d]/g, '')) || 0;
                
                if (!vDate) continue; // تاریخ برای گروه‌بندی اسناد الزامی است
                
                var vKey = vNum || (vDate + '_' + vDesc);
                if (!vouchersMap[vKey]) {
                    vouchersMap[vKey] = {
                        number: vNum,
                        date: vDate,
                        type: vType,
                        desc: vDesc,
                        periodId: state.activePeriodId || '',
                        lines: [],
                        status: 'draft'
                    };
                }
                
                parsedRows++;
                
                var acc = leaves.find(function(a) { return String(a.code) === accCode; });
                if (!acc) {
                    // اگر کد حساب پیدا نشد، خط را خالی می‌گذاریم تا کاربر بعداً از فرم اصلاحش کند
                    vouchersMap[vKey].lines.push({
                        id: uid(),
                        account: '',
                        details: {},
                        debit: debit,
                        credit: credit,
                        description: lineDesc || vDesc || ('کد حساب ' + accCode + ' یافت نشد')
                    });
                    continue;
                }
                
                var details = {};
                if (detailStr && acc.links && acc.links.length > 0) {
                    var lt = acc.links[0]; 
                    var items = getLinkedItems(lt);
                    var found = items.find(function(it) { return getLinkedItemLabel(lt, it).indexOf(detailStr) !== -1; });
                    if (found) details[lt] = found.id;
                }
                
                vouchersMap[vKey].lines.push({
                    id: uid(),
                    account: acc.id,
                    details: details,
                    debit: debit,
                    credit: credit,
                    description: lineDesc || vDesc
                });
            }
            
            if (parsedRows === 0) {
                alert('هیچ ردیف معتبری در فایل یافت نشد.');
                return;
            }
            
            var imported = 0;
            var vList = DB.load('vouchers', []);
            var keys = Object.keys(vouchersMap);
            
            keys.forEach(function(k) {
                var v = vouchersMap[k];
                if (!v.number) {
                    v.number = getNextVoucherNumberForPeriod(v.periodId);
                }
                v.id = uid();
                v.status = 'draft'; // تضمین ذخیره به عنوان پیش‌نویس
                vList.push(v);
                imported++;
            });
            
            DB.save('vouchers', vList);
            renderVoucherList();
            
            alert('✅ ' + imported + ' سند با موفقیت به عنوان پیش‌نویس ذخیره شد.\n\n💡 اسنادی که دارای نقص (مثل عدم تراز یا کد حساب نامعتبر) هستند، در لیست با علامت ⚠️ نمایش داده می‌شوند و می‌توانید آن‌ها را ویرایش کنید.');
            
        } catch (err) {
            console.error(err);
            alert('خطا در خواندن فایل:\n' + err.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

/* ============================================================
   توابع رندر و بقیه منطق فهرست
   ============================================================ */

function ensureVoucherPaginationBox() {
    var box = document.getElementById('vlist-pagination');
    if (box) return box;
    box = document.createElement('div');
    box.id = 'vlist-pagination';
    box.style.cssText = 'display:flex;justify-content:center;align-items:center;gap:6px;margin-top:14px;padding:6px 0;flex-wrap:wrap;direction:rtl';
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
    if (totalPages <= 1) { box.style.display = 'none'; return; }
    box.style.display = 'flex';

    function mkBtn(label, page, disabled, title) {
        var b = document.createElement('button');
        b.type = 'button'; b.textContent = label; b.title = title || ''; b.disabled = !!disabled;
        b.style.cssText = 'min-width:42px;height:38px;padding:0 12px;border-radius:10px;border:1.5px solid var(--border);background:var(--card-solid);color:var(--primary-dark);font-weight:800;font-family:inherit;font-size:1rem;cursor:pointer;display:inline-flex;align-items:center;justify-content:center';
        if (disabled) { b.style.opacity = '0.35'; b.style.cursor = 'not-allowed'; }
        else { b.addEventListener('click', function () { window._vlistPg.page = page; renderVoucherList(); }); }
        box.appendChild(b);
    }
    mkBtn('⏭', 1, curPage === 1, 'اولین');
    mkBtn('▶', curPage - 1, curPage === 1, 'قبل');
    var info = document.createElement('span');
    info.textContent = 'صفحه ' + toFa(curPage) + ' از ' + toFa(totalPages);
    info.style.cssText = 'padding:0 14px;font-weight:800;color:var(--primary-dark);font-size:0.85rem';
    box.appendChild(info);
    mkBtn('◀', curPage + 1, curPage === totalPages, 'بعد');
    mkBtn('⏮', totalPages, curPage === totalPages, 'آخرین');
}

function _computeFilteredVouchers() {
    var allVouchers = DB.load('vouchers', []);
    if (!Array.isArray(allVouchers)) allVouchers = [];
    allVouchers = allVouchers.filter(function(x) { return x && typeof x === 'object'; });

    var periodFilter = (document.getElementById('vl-period-filter') || {}).value || '';
    var statusFilter = (document.getElementById('vlist-status-filter') || {}).value || '';
    var searchVal = ((document.getElementById('vlist-search') || {}).value || '').toLowerCase();

    var periods = DB.load('fiscalPeriods', []);
    var pMap = {};
    if (Array.isArray(periods)) { periods.forEach(function (p) { if (p) pMap[p.id] = p.title; }); }

    var vouchers = allVouchers.slice();
    if (periodFilter) vouchers = vouchers.filter(function (v) { return v.periodId === periodFilter; });
    if (statusFilter) vouchers = vouchers.filter(function (v) { return (v.status || 'draft') === statusFilter; });

    if (searchVal) {
        vouchers = vouchers.filter(function (v) {
            var pN = pMap[v.periodId] || '';
            var txt = String(v.number || '') + ' ' + String(v.date || '') + ' ' + String(v.desc || '') + ' ' + voucherTypeName(v.type) + ' ' + pN;
            return txt.toLowerCase().indexOf(searchVal) !== -1;
        });
    }

    var vFilters = (typeof COLUMN_FILTERS !== 'undefined' && COLUMN_FILTERS['voucher-table-list']) || {};
    var hasVFilters = Object.keys(vFilters).some(function(k) { return vFilters[k] && vFilters[k].op; });
    if (hasVFilters) {
        vouchers = vouchers.filter(function (v) {
            var rowCells = [
                String(v.number || ''),
                String(v.date || ''),
                voucherTypeName(v.type),
                pMap[v.periodId] || '—',
                v.desc || '',
                getVoucherAmount(v),
                v.status === 'approved' ? 'تأیید' : 'پیش‌نویس',
                ''
            ];
            for (var key in vFilters) {
                var origIdx = Number(key);
                var f = vFilters[key];
                if (!f || !f.op) continue;
                if (typeof testFilter === 'function' && !testFilter(rowCells[origIdx] || '', f)) return false;
            }
            return true;
        });
    }

    var st = (typeof sortState !== 'undefined' && sortState.vouchers) ? sortState.vouchers : { col: 'number', dir: 'desc' };
    vouchers.sort(function (a, b) {
        var va, vb;
        if (st.col === 'periodName') { va = pMap[a.periodId] || ''; vb = pMap[b.periodId] || ''; }
        else if (st.col === 'status') { va = a.status === 'approved' ? 'ت' : 'پ'; vb = b.status === 'approved' ? 'ت' : 'پ'; }
        else if (st.col === 'type') { va = voucherTypeName(a.type); vb = voucherTypeName(b.type); }
        else if (st.col === 'amount') { va = getVoucherAmount(a); vb = getVoucherAmount(b); }
        else { va = a[st.col] || ''; vb = b[st.col] || ''; }
        var c = compareVals(va, vb);
        return st.dir === 'asc' ? c : -c;
    });

    return { vouchers: vouchers, pMap: pMap, total: vouchers.length, allCount: allVouchers.length };
}

function renderVoucherList() {
    if (window._voucherListRendering) return;
    window._voucherListRendering = true;

    try {
        var tb = document.getElementById('voucher-list-body');
        if (!tb) return;

        var result = _computeFilteredVouchers();
        var allCount = result.allCount;
        var vouchers = result.vouchers;
        var pMap = result.pMap;
        var total = result.total;

        if (allCount === 0) {
            tb.innerHTML = '<tr><td colspan="8" class="empty-row">هیچ سندی ثبت نشده است.</td></tr>';
            var cEl = document.getElementById('vlist-count'); if (cEl) cEl.textContent = '۰';
            var box = document.getElementById('vlist-pagination'); if (box) box.style.display = 'none';
            return;
        }

        var totalPages = Math.max(1, Math.ceil(total / VOUCHER_PAGE_SIZE));
        if (window._vlistPg.page > totalPages) window._vlistPg.page = totalPages;
        if (window._vlistPg.page < 1) window._vlistPg.page = 1;
        var startIdx = (window._vlistPg.page - 1) * VOUCHER_PAGE_SIZE;
        var pageVouchers = vouchers.slice(startIdx, startIdx + VOUCHER_PAGE_SIZE);

        tb.innerHTML = '';
        var hide = getHideState('voucher-list');
        var shown = 0;

        for (var i = 0; i < pageVouchers.length; i++) {
            var v = pageVouchers[i];
            var status = v.status || 'draft';
            var issues = [];
            try { issues = getVoucherIssues(v) || []; } catch (e) { issues = []; }

            var badge;
            if (status === 'approved') badge = '<span class="badge badge-approved">✓ تأیید</span>';
            else if (issues.length > 0) badge = '<span class="badge badge-draft" title="ناقص">پیش‌نویس ⚠️</span>';
            else badge = '<span class="badge badge-draft">پیش‌نویس</span>';

            var tB = '<span class="badge badge-type">' + voucherTypeName(v.type) + '</span>';
            var pN = pMap[v.periodId] || '—';
            var amt = getVoucherAmount(v);
            var descTxt = v.desc ? esc(v.desc) : '<span style="color:#cbd5e1">—</span>';

            var tr = document.createElement('tr');
            if (status === 'approved') tr.classList.add('approved-row');

            var aH = '<div class="row-actions">'
                   + '<button class="row-btn open" data-id="' + v.id + '" data-action="preview" title="مشاهده">👁</button>'
                   + '<button class="row-btn copy" data-id="' + v.id + '" data-action="copy" title="کپی سند">📋</button>';
            if (status === 'draft') {
                aH += '<button class="row-btn edit" data-id="' + v.id + '" data-action="edit" title="ویرایش">✎</button>';
                aH += '<button class="row-btn approve" data-id="' + v.id + '" data-action="approve" title="تأیید">✓</button>';
                aH += '<button class="row-btn del" data-id="' + v.id + '" data-action="delete" title="حذف">×</button>';
            } else {
                aH += '<button class="row-btn unapprove" data-id="' + v.id + '" data-action="unapprove" title="برگشت از تأیید">↩</button>';
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

        var btns = tb.querySelectorAll('.row-btn');
        for (var b = 0; b < btns.length; b++) btns[b].addEventListener('click', handleVoucherRowAction);

        if (typeof applyColVisibility === 'function') applyColVisibility('voucher-table-list');
        if (typeof applyColWidths === 'function') applyColWidths('voucher-table-list');
        if (typeof makeTableResizable === 'function') makeTableResizable(document.getElementById('voucher-table-list'));
        if (typeof buildHeaderButtons === 'function') buildHeaderButtons();
        if (typeof applyColumnOrder === 'function') applyColumnOrder('voucher-table-list');
        if (typeof buildFilterRow === 'function') buildFilterRow(document.getElementById('voucher-table-list'));

        if (typeof COLUMN_FILTERS !== 'undefined') {
            window._lastVoucherFilterKey = JSON.stringify(COLUMN_FILTERS['voucher-table-list'] || {});
        }
    } finally {
        window._voucherListRendering = false;
    }
}

function handleVoucherRowAction() {
    var id = this.getAttribute('data-id');
    var action = this.getAttribute('data-action');
    var v = findVoucherById(id);
    if (!v) { showToast('سند یافت نشد.'); return; }

    if (action === 'preview') { openVoucherPreview(v); return; }
    if (action === 'edit')    { loadVoucherForEdit(v); return; }

    if (action === 'copy') {
        var srcLines = Array.isArray(v.lines) ? v.lines : [];
        if (srcLines.length === 0) { showToast('⚠️ این سند ردیفی ندارد که کپی شود.'); return; }
        var clonedLines = [];
        for (var li = 0; li < srcLines.length; li++) {
            var L = srcLines[li]; if (!L || typeof L !== 'object') continue;
            clonedLines.push({ id: uid(), account: L.account || '', details: JSON.parse(JSON.stringify(L.details || {})), debit: Number(L.debit) || 0, credit: Number(L.credit) || 0, description: L.description || '', trackingNumber: L.trackingNumber || '', trackingDate: L.trackingDate || '', locked: !!L.locked });
        }
        if (clonedLines.length === 0) { showToast('⚠️ خطا: ردیف‌ها قابل کپی نبودند.'); return; }
        var newV = { id: uid(), number: getNextVoucherNumberForPeriod(state.activePeriodId || ''), date: todayJalaliStr(), time: v.time || '08:00', type: v.type || 'general', periodId: state.activePeriodId || '', desc: v.desc || '', lines: clonedLines, status: 'draft' };
        var list = DB.load('vouchers', []); list.push(newV); DB.save('vouchers', list);
        showToast('📋 سند با ' + toFa(clonedLines.length) + ' ردیف کپی شد (پیش‌نویس)');
        renderVoucherList(); return;
    }

    if (action === 'approve') {
        var issues = getVoucherIssues(v);
        if (issues.length > 0) { alert('⚠️ سند قابل تأیید نیست:\n\n• ' + issues.join('\n• ')); return; }
        var list = DB.load('vouchers', []);
        for (var x = 0; x < list.length; x++) { if (list[x].id === id) list[x].status = 'approved'; }
        DB.save('vouchers', list); renderVoucherList(); showToast('✅ سند تأیید شد.'); return;
    }

    if (action === 'unapprove') {
        if (!confirm('به پیش‌نویس برگردد؟')) return;
        var list2 = DB.load('vouchers', []);
        for (var y = 0; y < list2.length; y++) { if (list2[y].id === id) list2[y].status = 'draft'; }
        DB.save('vouchers', list2); renderVoucherList(); return;
    }

    if (action === 'delete') {
        if (!confirm('حذف شود؟')) return;
        var list3 = DB.load('vouchers', []).filter(function (x) { return x.id !== id; });
        DB.save('vouchers', list3); renderVoucherList();
        if (typeof updateHomeWidgets === 'function') updateHomeWidgets(); return;
    }
}

function setupSorting() {
    var ths = document.querySelectorAll('#voucher-table-list th[data-sort]');
    for (var i = 0; i < ths.length; i++) {
        ths[i].addEventListener('click', function () {
            var col = this.getAttribute('data-sort');
            if (sortState.vouchers.col === col) { sortState.vouchers.dir = sortState.vouchers.dir === 'asc' ? 'desc' : 'asc'; } 
            else { sortState.vouchers.col = col; sortState.vouchers.dir = 'asc'; }
            renderVoucherList();
        });
    }
}

function openVoucherPreview(v) {
    var body = document.getElementById('vpreview-body'); if (!body) return;
    var accounts = DB.load('accounts', []); var periods = DB.load('fiscalPeriods', []);
    var period = periods.find(function (p) { return p.id === v.periodId; });
    var status = v.status === 'approved' ? '<span class="badge badge-approved">✓ تأیید</span>' : '<span class="badge badge-draft">پیش‌نویس</span>';

    var html = '<div class="vp-header"><div class="vp-grid">';
    html += '<div><span class="lbl">شماره:</span> <b>' + toFa(esc(v.number)) + '</b></div>';
    html += '<div><span class="lbl">تاریخ:</span> <b dir="ltr">' + toFa(esc(v.date)) + '</b></div>';
    html += '<div><span class="lbl">ساعت:</span> <b dir="ltr">' + toFa(esc(v.time || '08:00')) + '</b></div>';
    html += '<div><span class="lbl">نوع:</span> ' + voucherTypeName(v.type) + '</div>';
    html += '<div><span class="lbl">دوره:</span> ' + esc(period ? period.title : '—') + '</div>';
    html += '<div class="full"><span class="lbl">شرح:</span> <b>' + esc(v.desc || '') + '</b></div>';
    html += '<div><span class="lbl">وضعیت:</span> ' + status + '</div></div></div>';

    html += '<div class="table-wrap"><table class="report-table"><thead><tr><th>#</th><th>معین</th><th>تفصیلی</th><th>شرح</th><th>بدهکار</th><th>بستانکار</th></tr></thead><tbody>';
    var td = 0, tc = 0; var lines = v.lines || [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var accLabel = line.account ? getAccountLabel(line.account, accounts) : '—';
        var dt = '';
        if (line.details) { Object.keys(line.details).forEach(function (lt) { var did = line.details[lt]; if (did) { if (dt) dt += ' ، '; dt += linkTypeName(lt) + ': ' + getDetailLabel(lt, did); } }); }
        var d = Number(line.debit) || 0; var c = Number(line.credit) || 0; td += d; tc += c;
        html += '<tr><td>' + toFa(i + 1) + '</td><td>' + esc(accLabel) + '</td><td>' + (dt ? esc(dt) : '—') + '</td><td>' + esc(line.description || '') + '</td><td class="num dr">' + (d ? formatMoney(d) : '—') + '</td><td class="num cr">' + (c ? formatMoney(c) : '—') + '</td></tr>';
    }
    html += '</tbody><tfoot><tr><td colspan="4" style="text-align:left">جمع</td><td class="num dr">' + formatMoney(td) + '</td><td class="num cr">' + formatMoney(tc) + '</td></tr></tfoot></table></div>';

    if (td === tc && td > 0) html += '<div class="vp-balance-ok">✓ متوازن</div>';
    else html += '<div class="vp-balance-err">⚠️ اختلاف: ' + formatMoney(Math.abs(td - tc)) + '</div>';

    body.innerHTML = html;
    var m = document.getElementById('vpreview-modal'); var o = document.getElementById('vpreview-overlay');
    if (m) m.classList.add('show'); if (o) o.classList.add('show'); window._currentPreviewVoucher = v;

    var expBtn = document.getElementById('vpreview-export');
    if (expBtn) {
        expBtn.onclick = exportVoucherPreviewToExcel;
    }
}

function printVoucherPreview() {
    var v = window._currentPreviewVoucher;
    if (!v) return;
    var accounts = DB.load('accounts', []);
    var statusText = v.status === 'approved' ? 'تأیید شده' : 'پیش‌نویس';
    
    var linesHtml = '';
    var td = 0, tc = 0;
    (v.lines || []).forEach(function (line, idx) {
        var accLabel = line.account ? getAccountLabel(line.account, accounts) : '—';
        var dt = '';
        if (line.details) {
            Object.keys(line.details).forEach(function (lt) {
                var did = line.details[lt];
                if (did) { if (dt) dt += ' ، '; dt += linkTypeName(lt) + ': ' + getDetailLabel(lt, did); }
            });
        }
        var d = Number(line.debit) || 0;
        var c = Number(line.credit) || 0;
        td += d; tc += c;
        linesHtml += '<tr><td>' + toFa(idx + 1) + '</td><td>' + esc(accLabel) + '</td><td>' + (dt ? esc(dt) : '—') + '</td><td>' + esc(line.description || '') + '</td><td class="num dr">' + (d ? formatMoney(d) : '—') + '</td><td class="num cr">' + (c ? formatMoney(c) : '—') + '</td></tr>';
    });

    var htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="fa">
        <head>
            <meta charset="UTF-8">
            <title>سند حسابداری</title>
            <style>
                @page { size: A4; margin: 15mm; @bottom-center { content: "صفحه " counter(page) " از " counter(pages); font-family: Tahoma; font-size: 10pt; color: #475569; font-weight: bold; } @top-center { content: "سند حسابداری شماره ${toFa(esc(v.number))}"; font-family: Tahoma; font-size: 9pt; color: #94a3b8; } }
                body { font-family: Tahoma, sans-serif; direction: rtl; color: #000; margin: 0; padding: 0; font-size: 11pt; }
                .header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
                .header .right-side, .header .left-side { display: flex; flex-direction: column; gap: 5px; font-size: 11pt; }
                .header .right-side { text-align: right; }
                .header .left-side { text-align: left; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                tr { page-break-inside: avoid !important; }
                thead { display: table-header-group; }
                th, td { border: 1px solid #64748b; padding: 6px 10px; text-align: center; vertical-align: middle; }
                th { background-color: #e2e8f0 !important; font-weight: bold !important; color: #1e40af; }
                tfoot td { background-color: #e2e8f0 !important; font-weight: bold !important; color: #1e40af; }
                .num { direction: ltr; font-family: Arial; }
                .dr { color: #dc2626; font-weight: bold; }
                .cr { color: #059669; font-weight: bold; }
                h1 { text-align: center; font-size: 16pt; color: #1e40af; margin-bottom: 20px; }
            </style>
        </head>
        <body>
            <h1>سند حسابداری</h1>
            <div class="header">
                <div class="right-side">
                    <div><b>شماره:</b> ${toFa(esc(v.number))}</div>
                    <div><b>تاریخ:</b> ${toFa(esc(v.date))}</div>
                    <div><b>ساعت:</b> ${toFa(esc(v.time || '08:00'))}</div>
                </div>
                <div class="left-side">
                    <div><b>نوع:</b> ${voucherTypeName(v.type)}</div>
                    <div><b>شرح:</b> ${esc(v.desc || '')}</div>
                    <div><b>وضعیت:</b> ${statusText}</div>
                </div>
            </div>
            <table>
                <thead><tr><th>#</th><th>معین</th><th>تفصیلی</th><th>شرح</th><th>بدهکار</th><th>بستانکار</th></tr></thead>
                <tbody>${linesHtml}</tbody>
                <tfoot><tr><td colspan="4" style="text-align:left">جمع</td><td class="num dr">${formatMoney(td)}</td><td class="num cr">${formatMoney(tc)}</td></tr></tfoot>
            </table>
        </body>
        </html>
    `;
    
    var win = window.open('', '_blank');
    if (!win) { alert('لطفاً پاپ‌آپ را مجاز کنید.'); return; }
    win.document.open();
    win.document.write(htmlContent);
    win.document.close();
    setTimeout(function() { win.focus(); win.print(); win.onafterprint = function() { win.close(); }; }, 500);
}

function exportVoucherPreviewToExcel() {
    var v = window._currentPreviewVoucher;
    if (!v) { alert('سندی برای خروجی نیست.'); return; }

    var accounts = DB.load('accounts', []);
    var periods = DB.load('fiscalPeriods', []);
    var period = periods.find(function (p) { return p.id === v.periodId; });

    if (typeof exportDataToExcel !== 'function') {
        alert('تابع خروجی اکسل در دسترس نیست.');
        return;
    }

    var rows = [];
    var td = 0, tc = 0;
    (v.lines || []).forEach(function (line, idx) {
        var accLabel = line.account ? getAccountLabel(line.account, accounts) : '—';
        var detParts = [];
        if (line.details) {
            Object.keys(line.details).forEach(function (lt) {
                if (line.details[lt]) detParts.push(linkTypeName(lt) + ': ' + getDetailLabel(lt, line.details[lt]));
            });
        }
        var d = Number(line.debit) || 0;
        var c = Number(line.credit) || 0;
        td += d; tc += c;
        rows.push([
            String(idx + 1),
            accLabel,
            detParts.length ? detParts.join(' ، ') : '—',
            line.description || '',
            d > 0 ? d : '',
            c > 0 ? c : ''
        ]);
    });

    rows.push(['', '', '', 'جمع کل', td, tc]);

    var title = 'سند حسابداری شماره ' + v.number
              + ' — تاریخ ' + v.date
              + ' — ' + (v.status === 'approved' ? 'تأیید شده' : 'پیش‌نویس')
              + (period ? ' — دوره: ' + period.title : '')
              + (v.desc ? ' — شرح: ' + v.desc : '');

    var headers = ['#', 'معین', 'تفصیلی', 'شرح قلم', 'بدهکار', 'بستانکار'];
    exportDataToExcel(headers, rows, title, 'سند-' + v.number, 'سند');
}

function exportVoucherListToExcel(filename) {
    var result = _computeFilteredVouchers();
    var vouchers = result.vouchers;
    var pMap = result.pMap;

    if (vouchers.length === 0) {
        alert('داده‌ای برای خروجی نیست.');
        return;
    }

    var rows = vouchers.map(function (v) {
        return [
            String(v.number || ''),
            v.date || '',
            voucherTypeName(v.type),
            pMap[v.periodId] || '—',
            v.desc || '',
            getVoucherAmount(v),
            v.status === 'approved' ? 'تأیید شده' : 'پیش‌نویس'
        ];
    });

    var headers = ['شماره', 'تاریخ', 'نوع سند', 'دوره', 'شرح', 'مبلغ (ریال)', 'وضعیت'];
    exportDataToExcel(headers, rows, 'فهرست اسناد حسابداری', filename || 'فهرست-اسناد', 'اسناد');
}

function closeVoucherPreview() {
    var m = document.getElementById('vpreview-modal'); var o = document.getElementById('vpreview-overlay');
    if (m) m.classList.remove('show'); if (o) o.classList.remove('show'); window._currentPreviewVoucher = null;
}

function openVoucherForEditById(vid) {
    var v = findVoucherById(vid);
    if (!v) { showToast('سند یافت نشد.'); return; }
    if (v.status === 'approved') {
        if (confirm('این سند تأیید شده است.\n\nOK = برگشت از تأیید + ویرایش\nCancel = فقط مشاهده')) {
            var l = DB.load('vouchers', []);
            for (var i = 0; i < l.length; i++) { if (l[i].id === vid) { l[i].status = 'draft'; break; } }
            DB.save('vouchers', l); showToast('↩ سند به پیش‌نویس برگشت.'); loadVoucherForEdit(v);
        } else { openVoucherPreview(v); }
        return;
    }
    loadVoucherForEdit(v);
}

function bindVoucherListFilters() {
    var vpf = document.getElementById('vl-period-filter');
    if (vpf && !vpf.dataset.bound) {
        vpf.dataset.bound = '1';
        vpf.addEventListener('change', function () { window._vlistPg.page = 1; renderVoucherList(); });
    }
    var vsrch = document.getElementById('vlist-search');
    if (vsrch && !vsrch.dataset.bound) {
        vsrch.dataset.bound = '1';
        vsrch.addEventListener('input', function () { window._vlistPg.page = 1; renderVoucherList(); });
    }
    var vstatus = document.getElementById('vlist-status-filter');
    if (vstatus && !vstatus.dataset.bound) {
        vstatus.dataset.bound = '1';
        vstatus.addEventListener('change', function () { window._vlistPg.page = 1; renderVoucherList(); });
    }

    /* ✅ بایند دکمه‌های دریافت داده */
    var tmplBtn = document.getElementById('v-template-btn');
    if (tmplBtn && !tmplBtn.dataset.bound) {
        tmplBtn.dataset.bound = '1';
        tmplBtn.addEventListener('click', downloadVoucherTemplate);
    }

    var importBtn = document.getElementById('v-import-btn');
    var importFile = document.getElementById('v-import-file');
    if (importBtn && importFile && !importBtn.dataset.bound) {
        importBtn.dataset.bound = '1';
        importBtn.addEventListener('click', function() { importFile.click(); });
        importFile.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                importVouchersFromExcel(this.files[0]);
                this.value = '';
            }
        });
    }
}

(function patchGoToPageForVoucherList() {
    function install() {
        if (typeof window.goToPage !== 'function') { setTimeout(install, 500); return; }
        if (window._gtpVListPatched) return; window._gtpVListPatched = true;
        var orig = window.goToPage;
        window.goToPage = function (name, forceNew) {
            var r = orig.apply(this, arguments);
            if (name === 'voucher-list') { setTimeout(function () { try { renderVoucherList(); bindVoucherListFilters(); } catch (e) { console.error('vlist:', e); } }, 120); }
            return r;
        };
    }
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', function () { setTimeout(install, 2000); }); } else { setTimeout(install, 2000); }
})();

(function ensureVoucherListRendering() {
    setInterval(function () {
        var page = document.getElementById('page-voucher-list');
        if (!page || !page.classList.contains('active')) return;
        var tb = document.getElementById('voucher-list-body'); if (!tb) return;
        var rows = tb.querySelectorAll('tr').length;
        var isEmpty = rows === 0 || (rows === 1 && tb.querySelector('.empty-row'));
        var dbCount = DB.load('vouchers', []).length;
        if (isEmpty && dbCount > 0) renderVoucherList();
    }, 3000);
})();

document.addEventListener('click', function (e) {
    if (e.target.closest('#vpreview-export')) {
        if (typeof exportVoucherPreviewToExcel === 'function') exportVoucherPreviewToExcel();
    }
});

window.renderVoucherList = renderVoucherList;
window.handleVoucherRowAction = handleVoucherRowAction;
window.setupSorting = setupSorting;
window.openVoucherPreview = openVoucherPreview;
window.closeVoucherPreview = closeVoucherPreview;
window.printVoucherPreview = printVoucherPreview;
window.exportVoucherPreviewToExcel = exportVoucherPreviewToExcel;
window.exportVoucherListToExcel = exportVoucherListToExcel;
window.openVoucherForEditById = openVoucherForEditById;
window.bindVoucherListFilters = bindVoucherListFilters;
window._computeFilteredVouchers = _computeFilteredVouchers;
window.downloadVoucherTemplate = downloadVoucherTemplate;
window.importVouchersFromExcel = importVouchersFromExcel;

console.log('✅ [modules/vouchers/list.js] loaded — v3 (draft-import allowed)');
