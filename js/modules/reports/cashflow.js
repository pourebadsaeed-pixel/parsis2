/* ============================================================
   پارسیس — گزارش نقدینگی و گردش وجه نقد
   مسیر: js/modules/reports/cashflow.js
   ============================================================ */
'use strict';

var _cfdBuckets = {};
var _cfdAllDescs = [];
var _cfdSelectedDescs = null;
var _cfdSearchText = '';
var _cfdSort = { col: 'name', dir: 'asc' };

function moneyHtml(n, key) {
    if (key && typeof getHideState === 'function' && getHideState(key)) return '—';
    n = Number(n) || 0;
    var mode = state.currencyDisplay || 'rial';
    var v = n;
    var decimals = 0;
    if (mode === 'toman') v = n / 10;
    else if (mode === 'million') { v = n / 1000000; decimals = 3; }

    var abs = Math.abs(v);
    var str = abs.toLocaleString('fa-IR', { maximumFractionDigits: decimals }).replace(/\u066C/g, ',');
    if (v < 0) return '<span class="neg-money">(' + str + ')</span>';
    return str;
}

function moneyText(n) {
    n = Number(n) || 0;
    var mode = state.currencyDisplay || 'rial';
    var v = n;
    if (mode === 'toman') v = n / 10;
    else if (mode === 'million') v = n / 1000000;
    var abs = Math.abs(v);
    var str = abs.toLocaleString('fa-IR', { maximumFractionDigits: mode === 'million' ? 3 : 0 }).replace(/\u066C/g, ',');
    return v < 0 ? '(' + str + ')' : str;
}

function computeBankBalanceLatest() {
    var vouchers = DB.load('vouchers', []);
    var banks = DB.load('bankAccounts', []);
    var bankIds = banks.map(function (b) { return b.id; });
    var total = 0;

    vouchers.forEach(function (v) {
        if (v.status !== 'approved') return;
        (v.lines || []).forEach(function (line) {
            if (line.details && line.details.bank && bankIds.indexOf(line.details.bank) !== -1) {
                total += (Number(line.debit) || 0) - (Number(line.credit) || 0);
            }
        });
    });
    return total;
}

function computeBankBalanceAtDate() {
    return computeBankBalanceLatest();
}

function getActiveFiscalYearStart() {
    var periods = DB.load('fiscalPeriods', []);
    var p = periods.find(function (x) { return x.id === state.activePeriodId; });
    if (!p || !p.from) return '';
    var parts = String(p.from).split('/');
    if (parts.length !== 3) return '';
    return parts[0] + '/01/01';
}

/* ============================================================
   ✅ تزریق CSS (اصلاح‌شده: min-height + z-index روی دکمه)
   ============================================================ */
function injectCfCollapseStyle() {
    if (document.getElementById('cf-collapse-style')) return;
    var s = document.createElement('style');
    s.id = 'cf-collapse-style';
    s.textContent = ''
    + '.cf-filter-card { position:relative !important; padding-top:14px !important; }'
    + '.cf-filter-toggle {'
    +   'position:absolute; top:8px; left:8px;'
    +   'width:34px; height:34px;'
    +   'border-radius:10px;'
    +   'background:linear-gradient(135deg,#4a90e2,#6366f1);'
    +   'color:#fff;'
    +   'border:none;'
    +   'cursor:pointer;'
    +   'font-size:0.9rem;'
    +   'display:flex; align-items:center; justify-content:center;'
    +   'z-index:9999;'
    +   'padding:0;'
    +   'transition:all 0.2s;'
    +   'font-family:inherit;'
    +   'box-shadow: 0 3px 10px rgba(74,144,226,0.4);'
    +   'user-select:none;'
    +   '-webkit-tap-highlight-color:transparent;'
    + '}'
    + '.cf-filter-toggle:hover { transform:scale(1.1); box-shadow:0 5px 14px rgba(74,144,226,0.55); }'
    + '.cf-filter-toggle:active { transform:scale(0.95); }'
    + '.cf-toggle-icon { display:inline-block; transition:transform 0.25s; line-height:1; }'
    + '.cf-filter-card.collapsed .cf-toggle-icon { transform:rotate(-90deg); }'
    + '.cf-filter-card.collapsed .cf-filter-body { display:none !important; }'
    + '.cf-filter-card.collapsed {'
    +   'min-height:56px !important;'
    +   'padding-bottom:10px !important;'
    + '}'
    + '.cf-filter-card.collapsed::after {'
    +   'content:"🔍 فیلترها (بسته) — برای باز کردن ▼ را بزنید";'
    +   'display:block;'
    +   'padding:8px 54px 4px 16px;'
    +   'font-size:0.8rem;'
    +   'color:var(--text-muted);'
    +   'font-weight:700;'
    +   'text-align:right;'
    +   'line-height:1.6;'
    + '}';
    document.head.appendChild(s);
}

/* ============================================================
   ✅ Global Delegation — روی کل سند (یک‌بار)
   این تضمین می‌کند کلیک روی دکمه‌ی ▼ در هر clone/تب/دوباره‌سازی کار کند
   ============================================================ */
(function installCfToggleDelegation() {
    if (window._cfToggleDelegated) return;
    window._cfToggleDelegated = true;

    document.addEventListener('click', function (e) {
        var btn = e.target && e.target.closest && e.target.closest('.cf-filter-toggle');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();

        var card = btn.closest('.cf-filter-card');
        if (!card) return;

        var isCollapsed = card.classList.toggle('collapsed');
        try { DB.save('cf.filterCollapsed', isCollapsed); } catch (er) {}
    }, true); /* capture phase — قبل از هر handler دیگری */
})();

/* ============================================================
   ✅ فقط sync state (دیگر bind نمی‌کند — Delegation انجام می‌دهد)
   ============================================================ */
function initCfFilterCollapse() {
    injectCfCollapseStyle();

    var collapsed = false;
    try { collapsed = DB.load('cf.filterCollapsed', false); } catch (e) {}

    var cards = document.querySelectorAll('.cf-filter-card');
    for (var i = 0; i < cards.length; i++) {
        if (collapsed) cards[i].classList.add('collapsed');
        else cards[i].classList.remove('collapsed');
    }
}

function runCashFlowReport() {
    injectCfCollapseStyle();
    initCfFilterCollapse();

    var activePeriod = DB.load('fiscalPeriods', []).find(function(p) { return p.id === state.activePeriodId; });
    var cfFromEl = document.getElementById('cf-from');
    var cfToEl = document.getElementById('cf-to');
    if (cfFromEl && !cfFromEl.value) cfFromEl.value = activePeriod ? activePeriod.from : '';
    if (cfToEl && !cfToEl.value) cfToEl.value = activePeriod ? activePeriod.to : '';

    var fromDate = normalizeDigits((document.getElementById('cf-from').value || '').trim());
    var toDate = normalizeDigits((document.getElementById('cf-to').value || '').trim());

    var yearStart = getActiveFiscalYearStart();
    if (!fromDate) fromDate = yearStart || todayJalaliStr();
    if (!toDate) toDate = todayJalaliStr();

    document.getElementById('cf-from').value = fromDate;
    document.getElementById('cf-to').value = toDate;

    if (fromDate > toDate) {
        alert('تاریخ شروع باید قبل از پایان باشد.');
        return;
    }

    var hide = getHideState('cf');
    var bankBalance = computeBankBalanceLatest();

    var sources = DB.load('cashFlowSources', []);
    var sourcesInRange = sources.filter(function (s) {
        if (!s.expectedDate) return true;
        return s.expectedDate >= fromDate && s.expectedDate <= toDate;
    });

    var facilities = DB.load('facilities', []);
    var facilityInsts = [];
    facilities.forEach(function (f) {
        (f.installments || []).forEach(function (inst) {
            if (inst.status === 'paid') return;
            if (!inst.date) return;
            if (inst.date < fromDate || inst.date > toDate) return;
            facilityInsts.push({ f: f, inst: inst });
        });
    });

    var estimates = DB.load('dailyEstimates', []);
    var estimateItemsArr = [];
    estimates.forEach(function (est) {
        (est.items || []).forEach(function (it) {
            if (!it.date) return;
            if (it.date < fromDate || it.date > toDate) return;
            estimateItemsArr.push({ est: est, item: it });
        });
    });

    var items = [];

    sourcesInRange.forEach(function (s) {
        var sourceLabel = getSourceLabel(s);
        var titleFromNotes = (s.notes && String(s.notes).trim()) ? String(s.notes).trim() : '';
        var displayTitle = titleFromNotes || sourceLabel;
        var metaLine = titleFromNotes
            ? ' <span class="muted" style="font-size:0.72rem">(' + esc(sourceLabel) + ')</span>'
            : '';
        items.push({
            type: 'source',
            date: s.expectedDate || fromDate,
            sortDate: s.expectedDate || (fromDate + '~'),
            amount: Number(s.amount) || 0,
            label: '📥 ' + esc(displayTitle) + metaLine,
            notes: ''
        });
    });

    facilityInsts.forEach(function (item) {
        items.push({
            type: 'facility',
            date: item.inst.date,
            sortDate: item.inst.date,
            amount: -Number(item.inst.amount || 0),
            label: '💸 قسط ' + esc(item.f.name),
            notes: ''
        });
    });

    estimateItemsArr.forEach(function (item) {
        items.push({
            type: 'estimate',
            date: item.item.date,
            sortDate: item.item.date,
            amount: -Number(item.item.amount || 0),
            label: '📝 ' + esc(item.est.title || item.est.desc || 'برآورد'),
            notes: ''
        });
    });

    items.sort(function (a, b) { return compareVals(a.sortDate, b.sortDate); });

    var html = '<div class="cf-report"><div class="table-wrap">';
    html += '<table class="cf-table data-table" id="cf-table" data-table-id="cf-table"><thead><tr>'
         +  '<th>عنوان دسته</th>'
         +  '<th>تاریخ</th>'
         +  '<th>مبلغ</th>'
         +  '<th>مانده در خط</th>'
         +  '</tr></thead><tbody>';

    var running = bankBalance;
    var bbCls = bankBalance < 0 ? 'cf-neg' : '';
    var bbText = hide ? '—'
        : (bankBalance < 0 ? '(' + formatMoney(Math.abs(bankBalance)) + ')' : formatMoney(bankBalance));

    html += '<tr class="cf-bank-row">'
         +  '<td class="cf-cat">💰 مانده بانک ها (آخرین مانده لحظه‌ای)</td>'
         +  '<td dir="ltr">' + toFa(fromDate) + '</td>'
         +  '<td class="num ' + bbCls + '">' + bbText + '</td>'
         +  '<td class="num ' + bbCls + '">' + bbText + '</td>'
         +  '</tr>';

    items.forEach(function (it) {
        running += it.amount;

        var amtCls = '';
        var amtText = '';
        if (it.type === 'facility' || it.type === 'estimate') {
            amtCls = 'cf-neg';
            amtText = hide ? '—' : '(' + formatMoney(Math.abs(it.amount)) + ')';
        } else {
            amtCls = 'cf-pos';
            amtText = hide ? '—' : formatMoney(it.amount);
        }

        var balCls = running < 0 ? 'cf-neg' : '';
        var balText = hide ? '—'
            : (running < 0 ? '(' + formatMoney(Math.abs(running)) + ')' : formatMoney(running));

        var rowCls = it.type === 'facility' ? 'cf-fac-row'
                   : (it.type === 'estimate' ? 'cf-est-row' : 'cf-source-row');

        var label = it.label;
        if (it.notes) {
            label += ' <span class="muted" style="font-size:0.72rem">(' + esc(it.notes) + ')</span>';
        }

        html += '<tr class="' + rowCls + '">'
             +  '<td class="cf-cat">' + label + '</td>'
             +  '<td dir="ltr">' + toFa(esc(it.date)) + '</td>'
             +  '<td class="num ' + amtCls + '">' + amtText + '</td>'
             +  '<td class="num ' + balCls + '">' + balText + '</td>'
             +  '</tr>';
    });

    html += '</tbody>';
    html += '</table></div></div>';

    document.getElementById('cf-result').innerHTML = html;
    document.getElementById('cf-count').textContent = toFa(items.length + 1) + ' ردیف';

    var unitEl = document.getElementById('cf-unit');
    if (unitEl) unitEl.textContent = 'واحد: ' + currencyLabel();

    setTimeout(function () {
        var t = document.getElementById('cf-table');
        if (t && typeof makeTableResizable === 'function') {
            makeTableResizable(t);
        }
        if (typeof applyColVisibility === 'function') applyColVisibility('cf-table');
        if (typeof applyColWidths === 'function') applyColWidths('cf-table');
        if (typeof buildHeaderButtons === 'function') buildHeaderButtons();
    }, 30);

    if (typeof autoAttachReportHelpers === 'function') autoAttachReportHelpers();
}

(function injectCfdStyle() {
    if (document.getElementById('cfd-style-v6')) return;
    var s = document.createElement('style');
    s.id = 'cfd-style-v6';
    s.textContent = `
        .cfd-multi-wrap { position:relative; margin: 0 14px 14px 14px; z-index:50; }
        .cfd-multi-btn { width:100%; padding:10px 14px; background:var(--card-solid); border:1.5px solid var(--border); border-radius:12px; text-align:right; display:flex; justify-content:space-between; align-items:center; cursor:pointer; font-family:inherit; font-weight:700; color:var(--text); box-shadow:var(--shadow-sm); }
        .cfd-multi-btn:hover { border-color:var(--primary); }
        .cfd-multi-dropdown { position:absolute; top:calc(100% + 4px); left:0; right:0; background:var(--card-solid); border:1.5px solid var(--primary); border-radius:12px; box-shadow:var(--shadow-lg); display:none; flex-direction:column; max-height:320px; z-index:100; }
        .cfd-multi-dropdown.show { display:flex; }
        .cfd-multi-search { padding:8px; border-bottom:1px solid var(--border); background:var(--card-alt); }
        .cfd-multi-search input { width:100%; padding:8px 10px; border:1px solid var(--border); border-radius:8px; font-family:inherit; outline:none; }
        .cfd-multi-search input:focus { border-color:var(--primary); }
        .cfd-multi-actions { display:flex; gap:8px; padding:8px; border-bottom:1px solid var(--border); background:var(--card-alt); }
        .cfd-multi-actions button { flex:1; padding:6px; background:var(--primary-light); color:var(--primary-dark); border:none; border-radius:6px; font-family:inherit; font-weight:700; cursor:pointer; font-size:0.8rem; }
        .cfd-multi-actions button:hover { background:var(--primary); color:#fff; }
        .cfd-multi-list { overflow-y:auto; padding:8px; display:flex; flex-direction:column; gap:4px; }
        .cfd-multi-item { display:flex; align-items:center; gap:8px; padding:6px 8px; border-radius:6px; cursor:pointer; font-size:0.85rem; }
        .cfd-multi-item:hover { background:var(--primary-soft); }
        .cfd-multi-item input[type=checkbox] { accent-color:var(--primary); width:16px; height:16px; }
        
        .cfd-sort-th { cursor:pointer; user-select:none; }
        .cfd-sort-th:hover { background:#c8dcef !important; }
    `;
    document.head.appendChild(s);
})();

function runCashFlowByDescReport() {
    if (typeof makeFilterPanelCollapsible === 'function') {
        makeFilterPanelCollapsible('report-cashflow-desc', 'filter-cfd', 'فیلترهای گردش وجه نقد', '🔍');
    }

    var fromD = normalizeDigits((document.getElementById('cfd-from').value || '').trim());
    var toD   = normalizeDigits((document.getElementById('cfd-to').value || '').trim());

    var yearStart = getActiveFiscalYearStart();
    if (!fromD) fromD = yearStart || todayJalaliStr();
    if (!toD) toD = todayJalaliStr();
    if (fromD > toD) {
        alert('تاریخ شروع باید قبل از پایان باشد.');
        return;
    }

    document.getElementById('cfd-from').value = fromD;
    document.getElementById('cfd-to').value = toD;

    var vtype    = document.getElementById('cfd-vtype').value;
    var stripB   = document.getElementById('cfd-strip-babet').checked;

    var accounts = DB.load('accounts', []);
    var effectiveAccs = {};
    accounts.forEach(function (a) { if (a.cfEffect) effectiveAccs[a.id] = true; });

    if (Object.keys(effectiveAccs).length === 0) {
        document.getElementById('cfd-result').innerHTML =
            '<div class="card"><p class="muted" style="text-align:center;padding:16px">'
            + '⚠️ هیچ معینی با گزینه «موثر در گزارش گردش وجه نقد» تعریف نشده است.</p></div>';
        document.getElementById('cfd-count').textContent = '۰';
        return;
    }

    var vouchers = DB.load('vouchers', []).filter(function (v) {
        if (v.status !== 'approved') return false;
        if (v.date < fromD || v.date > toD) return false;
        if (vtype && v.type !== vtype) return false;
        return true;
    });

    function stripBabet(t) {
        if (!stripB) return t;
        return String(t || '').replace(/^\s*بابت\s*[:\-–]?\s*/, '').trim();
    }

    var buckets = {};
    vouchers.forEach(function (v) {
        (v.lines || []).forEach(function (l) {
            if (!l.account || !effectiveAccs[l.account]) return;
            var desc = stripBabet((l.description || '').trim()) || '(بدون شرح)';
            if (!buckets[desc]) buckets[desc] = { in: 0, out: 0, details: [] };
            var d = Number(l.debit) || 0;
            var c = Number(l.credit) || 0;
            buckets[desc].in += d;
            buckets[desc].out += c;
            buckets[desc].details.push({
                voucherId: v.id,
                date: v.date,
                number: v.number,
                desc: v.desc,
                accLabel: getAccountLabel(l.account, accounts),
                lineDesc: stripBabet(l.description || ''),
                debit: d,
                credit: c
            });
        });
    });

    _cfdBuckets = buckets;
    _cfdAllDescs = Object.keys(buckets).sort();

    if (_cfdSelectedDescs === null) {
        _cfdSelectedDescs = _cfdAllDescs.slice();
    } else {
        var newSel = _cfdAllDescs.filter(function(d) {
            return _cfdSelectedDescs.indexOf(d) !== -1;
        });
        if (_cfdSelectedDescs.length > 0) {
            _cfdAllDescs.forEach(function(d) {
                if (newSel.indexOf(d) === -1) newSel.push(d);
            });
        }
        _cfdSelectedDescs = newSel;
    }

    document.getElementById('cfd-result').innerHTML = '<div id="cfd-ms-container"></div><div id="cfd-tables-container"></div>';
    
    renderCfdMultiSelect();
    renderCfdTables();
}

function renderCfdMultiSelect() {
    var container = document.getElementById('cfd-ms-container');
    if (!container) return;
    
    var html = '<div class="cfd-multi-wrap">';
    html += '<button type="button" class="cfd-multi-btn" id="cfd-ms-btn">';
    html += '<span id="cfd-ms-btn-text">🏷 فیلتر بابت‌ها (' + toFa(_cfdSelectedDescs.length) + ' از ' + toFa(_cfdAllDescs.length) + ')</span>';
    html += '<span style="font-size:0.8rem;color:var(--text-muted)">▼</span>';
    html += '</button>';
    html += '<div class="cfd-multi-dropdown" id="cfd-ms-dropdown">';
    html += '<div class="cfd-multi-search"><input type="text" id="cfd-ms-search" placeholder="جستجو در بابت‌ها..." value="' + esc(_cfdSearchText) + '"></div>';
    html += '<div class="cfd-multi-actions"><button type="button" id="cfd-ms-all">انتخاب همه</button><button type="button" id="cfd-ms-none">لغو انتخاب همه</button></div>';
    html += '<div class="cfd-multi-list" id="cfd-ms-list">';
    
    _cfdAllDescs.forEach(function(desc) {
        var isChecked = _cfdSelectedDescs.indexOf(desc) !== -1 ? 'checked' : '';
        var match = !_cfdSearchText || desc.toLowerCase().indexOf(_cfdSearchText.toLowerCase()) !== -1;
        html += '<label class="cfd-multi-item" style="display:' + (match ? 'flex' : 'none') + '" data-desc="' + esc(desc) + '">';
        html += '<input type="checkbox" class="cfd-ms-cb" value="' + esc(desc) + '" ' + isChecked + '>';
        html += '<span>' + esc(desc) + '</span>';
        html += '</label>';
    });
    html += '</div></div></div>';
    
    container.innerHTML = html;
    
    var msBtn = document.getElementById('cfd-ms-btn');
    var msDd = document.getElementById('cfd-ms-dropdown');
    
    msBtn.onclick = function(e) {
        e.stopPropagation();
        msDd.classList.toggle('show');
        if (msDd.classList.contains('show')) document.getElementById('cfd-ms-search').focus();
    };
    
    if (!window._cfdOutsideBound) {
        window._cfdOutsideBound = true;
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.cfd-multi-wrap')) {
                var dd = document.getElementById('cfd-ms-dropdown');
                if (dd) dd.classList.remove('show');
            }
        });
    }
    
    document.getElementById('cfd-ms-search').oninput = function() {
        _cfdSearchText = this.value;
        var q = _cfdSearchText.toLowerCase();
        document.querySelectorAll('#cfd-ms-list .cfd-multi-item').forEach(function(item) {
            var desc = item.getAttribute('data-desc').toLowerCase();
            item.style.display = desc.indexOf(q) !== -1 ? 'flex' : 'none';
        });
    };
    
    document.querySelectorAll('.cfd-ms-cb').forEach(function(cb) {
        cb.onchange = function(e) {
            if (e) e.stopPropagation();
            var val = this.value;
            if (this.checked) {
                if (_cfdSelectedDescs.indexOf(val) === -1) _cfdSelectedDescs.push(val);
            } else {
                _cfdSelectedDescs = _cfdSelectedDescs.filter(function(d) { return d !== val; });
            }
            document.getElementById('cfd-ms-btn-text').textContent = '🏷 فیلتر بابت‌ها (' + toFa(_cfdSelectedDescs.length) + ' از ' + toFa(_cfdAllDescs.length) + ')';
            renderCfdTables();
        };
    });
    
    document.getElementById('cfd-ms-all').onclick = function(e) {
        if (e) { e.stopPropagation(); e.preventDefault(); }
        _cfdSelectedDescs = _cfdAllDescs.slice();
        document.querySelectorAll('.cfd-ms-cb').forEach(function(cb) { cb.checked = true; });
        document.getElementById('cfd-ms-btn-text').textContent = '🏷 فیلتر بابت‌ها (' + toFa(_cfdSelectedDescs.length) + ' از ' + toFa(_cfdAllDescs.length) + ')';
        renderCfdTables();
    };
    
    document.getElementById('cfd-ms-none').onclick = function(e) {
        if (e) { e.stopPropagation(); e.preventDefault(); }
        _cfdSelectedDescs = [];
        document.querySelectorAll('.cfd-ms-cb').forEach(function(cb) { cb.checked = false; });
        document.getElementById('cfd-ms-btn-text').textContent = '🏷 فیلتر بابت‌ها (' + toFa(_cfdSelectedDescs.length) + ' از ' + toFa(_cfdAllDescs.length) + ')';
        renderCfdTables();
    };
}

function renderCfdTables() {
    var container = document.getElementById('cfd-tables-container');
    if (!container) return;
    
    var keys = _cfdAllDescs.filter(function(k) {
        return _cfdSelectedDescs.indexOf(k) !== -1;
    });
    
    var onlyBalEl = document.getElementById('cfd-only-balance');
    var onlyBal = onlyBalEl ? onlyBalEl.checked : false;
    
    if (onlyBal) {
        keys = keys.filter(function (k) {
            return Math.abs(_cfdBuckets[k].in - _cfdBuckets[k].out) > 0.5;
        });
    }
    
    var viewMode = document.getElementById('cfd-view').value;
    var hide = getHideState('cfd');
    
    if (keys.length === 0) {
        container.innerHTML = '<div class="card" style="margin-top:10px"><p class="muted" style="text-align:center;padding:20px">هیچ بابت موردنظری انتخاب نشده است. (از منوی بالا بابت‌ها را انتخاب کنید)</p></div>';
        document.getElementById('cfd-count').textContent = '۰ دسته';
        var unitEl = document.getElementById('cfd-unit');
        if (unitEl) unitEl.textContent = 'واحد: ' + currencyLabel();
        return;
    }

    keys.sort(function(a, b) {
        var va, vb;
        var col = _cfdSort.col;
        if (col === 'name') { va = a; vb = b; }
        else if (col === 'in') { va = _cfdBuckets[a].in; vb = _cfdBuckets[b].in; }
        else if (col === 'out') { va = _cfdBuckets[a].out; vb = _cfdBuckets[b].out; }
        else if (col === 'bal') { va = _cfdBuckets[a].in - _cfdBuckets[a].out; vb = _cfdBuckets[b].in - _cfdBuckets[b].out; }
        else if (col === 'count') { va = _cfdBuckets[a].details.length; vb = _cfdBuckets[b].details.length; }
        else if (col === 'pct') { va = (_cfdBuckets[a].in - _cfdBuckets[a].out); vb = (_cfdBuckets[b].in - _cfdBuckets[b].out); }
        else { va = a; vb = b; }

        if (typeof va === 'number' && typeof vb === 'number') {
            return _cfdSort.dir === 'asc' ? va - vb : vb - va;
        }
        return _cfdSort.dir === 'asc' ? String(va).localeCompare(String(vb), 'fa') : String(vb).localeCompare(String(va), 'fa');
    });
    
    var html = '';
    
    if (viewMode === 'main' || viewMode === 'full') {
        html += '<div class="cfd-section-title">📋 گزارش اصلی</div>';
        html += '<div class="cfd-scroll-wrap"><div class="table-wrap"><table class="report-table data-table" id="cfd-table" data-table-id="cfd-table"><thead>';
        
        var sortIcon = function(col) { return _cfdSort.col === col ? (_cfdSort.dir === 'asc' ? ' ▲' : ' ▼') : ' ⇅'; };
        
        html += '<tr>';
        html += '<th style="width:40px">#</th>';
        html += '<th class="cfd-sort-th" data-sort="name">بابت / شرح ' + sortIcon('name') + '</th>';
        html += '<th class="cfd-sort-th" data-sort="in">ورود (بدهکار) ' + sortIcon('in') + '</th>';
        html += '<th class="cfd-sort-th" data-sort="out">خروج (بستانکار) ' + sortIcon('out') + '</th>';
        html += '<th class="cfd-sort-th" data-sort="bal">مانده ' + sortIcon('bal') + '</th>';
        html += '<th class="cfd-sort-th" data-sort="count">تعداد ' + sortIcon('count') + '</th>';
        html += '<th class="cfd-sort-th" data-sort="pct">درصد ' + sortIcon('pct') + '</th>';
        html += '</tr></thead><tbody>';

        var tIn = 0, tOut = 0;
        var grandAbs = Object.keys(_cfdBuckets).reduce(function(s, k) { return s + Math.abs(_cfdBuckets[k].in - _cfdBuckets[k].out); }, 0) || 1;

        keys.forEach(function (k, i) {
            var b = _cfdBuckets[k];
            var bal = b.in - b.out;
            tIn += b.in;
            tOut += b.out;
            var pct = (bal / grandAbs) * 100;
            var pctCls = pct >= 0 ? 'cr' : 'dr';
            var pctText = pct < 0 ? '(' + toFa(Math.abs(pct).toFixed(2)) + '٪)' : '+' + toFa(Math.abs(pct).toFixed(2)) + '٪';

            html += '<tr>';
            html += '<td class="num">' + toFa(i + 1) + '</td>';
            html += '<td><strong>' + esc(k) + '</strong></td>';
            html += '<td class="num" style="color:#1e9e6a">' + (hide ? '—' : (b.in ? moneyHtml(b.in) : '—')) + '</td>';
            html += '<td class="num" style="color:#c0392b">' + (hide ? '—' : (b.out ? moneyHtml(b.out) : '—')) + '</td>';
            html += '<td class="num" style="font-weight:bold">' + (hide ? '—' : moneyHtml(bal)) + '</td>';
            html += '<td class="num">' + toFa(b.details.length) + '</td>';
            html += '<td class="num ' + pctCls + '">' + (hide ? '—' : pctText) + '</td>';
            html += '</tr>';
        });

        html += '</tbody><tfoot><tr><td colspan="2" style="text-align:left">جمع کل</td>';
        html += '<td class="num" style="color:#1e9e6a">' + (hide ? '—' : moneyHtml(tIn)) + '</td>';
        html += '<td class="num" style="color:#c0392b">' + (hide ? '—' : moneyHtml(tOut)) + '</td>';
        html += '<td class="num">' + (hide ? '—' : moneyHtml(tIn - tOut)) + '</td><td></td>';
        html += '<td class="num">' + (hide ? '—' : (tIn - tOut < 0 ? '(۱۰۰.۰۰٪)' : '+۱۰۰.۰۰٪')) + '</td></tr></tfoot>';
        html += '</table></div></div>';
    }

    if (viewMode === 'details' || viewMode === 'full') {
        if (viewMode === 'full') {
            html += '<div class="cfd-section-title" style="margin-top:22px">📖 جزئیات اسناد</div>';
        } else {
            html += '<div class="cfd-section-title">📖 جزئیات اسناد</div>';
        }

        keys.forEach(function (k2, j) {
            var b2 = _cfdBuckets[k2];

            html += '<div class="cfd-group" style="margin-top:14px">'
                 +   '<div class="cfd-head" onclick="this.nextElementSibling.classList.toggle(\'show\')">'
                 +     '<div class="cfd-title">' + esc(k2) + '</div>'
                 +     '<div class="cfd-nums">'
                 +       '<span class="n in">ورود: ' + (hide ? '—' : moneyHtml(b2.in)) + '</span>'
                 +       '<span class="n out">خروج: ' + (hide ? '—' : moneyHtml(b2.out)) + '</span>'
                 +       '<span class="n bal">مانده: ' + (hide ? '—' : moneyHtml(b2.in - b2.out)) + '</span>'
                 +     '</div>'
                 +   '</div>'
                 +   '<div class="cfd-details">'
                 +     '<div class="cfd-hscroll">'
                 +       '<table class="data-table cfd-detail-table" data-table-id="cfd-detail-' + j + '">'
                 +         '<thead><tr><th>#</th>'
                 +         '<th>تاریخ</th>'
                 +         '<th>شماره</th>'
                 +         '<th>شرح سند</th>'
                 +         '<th>حساب</th>'
                 +         '<th>شرح قلم</th>'
                 +         '<th>بدهکار</th>'
                 +         '<th>بستانکار</th>'
                 +         '<th>عملیات</th></tr></thead><tbody>';

            for (var di = 0; di < b2.details.length; di++) {
                var d2 = b2.details[di];
                html += '<tr class="cfd-row" data-vid="' + d2.voucherId + '" style="cursor:pointer">'
                     +   '<td>' + toFa(di + 1) + '</td>'
                     +   '<td dir="ltr">' + toFa(d2.date) + '</td>'
                     +   '<td dir="ltr">' + toFa(d2.number) + '</td>'
                     +   '<td>' + esc(d2.desc || '') + '</td>'
                     +   '<td>' + esc(d2.accLabel) + '</td>'
                     +   '<td>' + esc(d2.lineDesc) + '</td>'
                     +   '<td class="num dr">' + (hide ? '—' : (d2.debit ? moneyHtml(d2.debit) : '—')) + '</td>'
                     +   '<td class="num cr">' + (hide ? '—' : (d2.credit ? moneyHtml(d2.credit) : '—')) + '</td>'
                     +   '<td><button class="row-btn edit" data-vid="' + d2.voucherId + '" title="ویرایش سند">✎</button></td>'
                     + '</tr>';
            }
            html += '</tbody></table></div></div></div>';
        });
    }

    container.innerHTML = html;
    
    document.getElementById('cfd-count').textContent = toFa(keys.length) + ' دسته';
    var unitEl = document.getElementById('cfd-unit');
    if (unitEl) unitEl.textContent = 'واحد: ' + currencyLabel();

    bindCfdTableEvents();
}

function bindCfdTableEvents() {
    document.querySelectorAll('#cfd-result .cfd-row').forEach(function (row) {
        if (row.dataset.bound) return;
        row.dataset.bound = '1';
        row.addEventListener('click', function (e) {
            if (e.target.closest('button')) return;
            var vid = this.getAttribute('data-vid');
            if (typeof openVoucherForEditById === 'function') openVoucherForEditById(vid);
        });
    });

    document.querySelectorAll('#cfd-result .row-btn.edit').forEach(function (btn) {
        if (btn.dataset.bound) return;
        btn.dataset.bound = '1';
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            var vid = this.getAttribute('data-vid');
            if (typeof openVoucherForEditById === 'function') openVoucherForEditById(vid);
        });
    });

    document.querySelectorAll('#cfd-table .cfd-sort-th').forEach(function(th) {
        if (th.dataset.bound) return;
        th.dataset.bound = '1';
        th.addEventListener('click', function(e) {
            if (e.target.tagName === 'INPUT') return;
            if (e.target.closest('.col-filter-btn')) return;
            var col = this.getAttribute('data-sort');
            if (_cfdSort.col === col) {
                _cfdSort.dir = _cfdSort.dir === 'asc' ? 'desc' : 'asc';
            } else {
                _cfdSort.col = col;
                _cfdSort.dir = 'asc';
            }
            renderCfdTables();
        });
    });

    setTimeout(function () {
        var t = document.getElementById('cfd-table');
        if (t && typeof makeTableResizable === 'function') makeTableResizable(t);

        document.querySelectorAll('#cfd-result .cfd-detail-table').forEach(function (tt) {
            if (typeof makeTableResizable === 'function') makeTableResizable(tt);
        });

        if (typeof applyColVisibility === 'function') applyColVisibility('cfd-table');
        if (typeof applyColWidths === 'function') applyColWidths('cfd-table');
        if (typeof buildHeaderButtons === 'function') buildHeaderButtons();
    }, 50);
}

function buildCashFlowDescSummaryForDash() {
    var d = new Date();
    var j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    var fromD = j[0] + '/01/01';
    var today = j[0] + '/' + pad2(j[1]) + '/' + pad2(j[2]);

    var accounts = DB.load('accounts', []);
    var effectiveAccs = {};
    accounts.forEach(function (a) { if (a.cfEffect) effectiveAccs[a.id] = true; });

    var vouchers = DB.load('vouchers', []).filter(function (v) {
        return v.status === 'approved' && v.date >= fromD && v.date <= today;
    });

    var buckets = {};
    vouchers.forEach(function (v) {
        (v.lines || []).forEach(function (l) {
            if (!l.account || !effectiveAccs[l.account]) return;
            var desc = String(l.description || '').trim()
                .replace(/^\s*بابت\s*[:\-–]?\s*/, '').trim() || '(بدون شرح)';
            if (!buckets[desc]) buckets[desc] = { in: 0, out: 0 };
            buckets[desc].in  += Number(l.debit) || 0;
            buckets[desc].out += Number(l.credit) || 0;
        });
    });

    return Object.keys(buckets).map(function (k) {
        return { label: k, bal: buckets[k].in - buckets[k].out };
    }).sort(function (a, b) {
        return Math.abs(b.bal) - Math.abs(a.bal);
    }).slice(0, 8);
}

/* ============================================================
   ✅ bind دکمه‌ها (بدون bind کردن toggle — Delegation انجام می‌دهد)
   ============================================================ */
function bindCashFlowReportButtons() {
    injectCfCollapseStyle();
    initCfFilterCollapse();

    var runCf = document.getElementById('cf-run');
    if (runCf && !runCf.dataset.bound) {
        runCf.dataset.bound = '1';
        runCf.addEventListener('click', runCashFlowReport);
    }

    var todayCf = document.getElementById('cf-today');
    if (todayCf && !todayCf.dataset.bound) {
        todayCf.dataset.bound = '1';
        todayCf.addEventListener('click', function () {
            var t = todayJalaliStr();
            document.getElementById('cf-from').value = t;
            document.getElementById('cf-to').value = addJalaliDays(t, 30);
            runCashFlowReport();
        });
    }

    var printCf = document.getElementById('cf-print');
    if (printCf && !printCf.dataset.bound) {
        printCf.dataset.bound = '1';
        printCf.addEventListener('click', function () {
            if (typeof printHtmlReport === 'function') {
                printHtmlReport('#cf-result', 'پیش‌بینی روزانه نقدینگی');
            } else {
                alert('تابع چاپ در دسترس نیست.');
            }
        });
    }

    var exportCf = document.getElementById('cf-export');
    if (exportCf && !exportCf.dataset.bound) {
        exportCf.dataset.bound = '1';
        exportCf.addEventListener('click', function () {
            if (typeof exportReportTable === 'function') {
                exportReportTable('#cf-result', 'پیش‌بینی-روزانه-نقدینگی');
            } else {
                alert('تابع اکسل در دسترس نیست.');
            }
        });
    }

    var runCfd = document.getElementById('cfd-run');
    if (runCfd && !runCfd.dataset.bound) {
        runCfd.dataset.bound = '1';
        runCfd.addEventListener('click', runCashFlowByDescReport);
    }

    var todayCfd = document.getElementById('cfd-today');
    if (todayCfd && !todayCfd.dataset.bound) {
        todayCfd.dataset.bound = '1';
        todayCfd.addEventListener('click', function () {
            var t = todayJalaliStr();
            document.getElementById('cfd-from').value = t;
            document.getElementById('cfd-to').value = addJalaliDays(t, 30);
            runCashFlowByDescReport();
        });
    }

    var printCfd = document.getElementById('cfd-print');
    if (printCfd && !printCfd.dataset.bound) {
        printCfd.dataset.bound = '1';
        printCfd.addEventListener('click', function () {
            if (typeof printHtmlReport === 'function') {
                printHtmlReport('#cfd-result', 'گردش وجه نقد');
            }
        });
    }

    var exportCfd = document.getElementById('cfd-export');
    if (exportCfd && !exportCfd.dataset.bound) {
        exportCfd.dataset.bound = '1';
        exportCfd.addEventListener('click', function () {
            if (typeof exportReportTable === 'function') {
                exportReportTable('#cfd-result', 'گردش-وجه-نقد');
            }
        });
    }

    var onlyBal = document.getElementById('cfd-only-balance');
    if (onlyBal && !onlyBal.dataset.bound) {
        onlyBal.dataset.bound = '1';
        onlyBal.addEventListener('change', runCashFlowByDescReport);
    }

    setTimeout(function () {
        if (typeof makeFilterPanelCollapsible === 'function') {
            makeFilterPanelCollapsible('report-cashflow-desc', 'filter-cfd', 'فیلترهای گردش وجه نقد', '🔍');
        }
    }, 500);
}

window.moneyHtml                       = moneyHtml;
window.moneyText                       = moneyText;
window.fmtFor                          = function (n, key) {
    if (typeof getHideState === 'function' && getHideState(key)) return '—';
    return moneyHtml(n);
};
window.fmtRep                          = function (n, key) { return window.fmtFor(n, key); };
window.formatMoneyHTML                 = function (n) { return moneyHtml(n); };
window.computeBankBalanceLatest        = computeBankBalanceLatest;
window.computeBankBalanceAtDate        = computeBankBalanceAtDate;
window.getActiveFiscalYearStart        = getActiveFiscalYearStart;
window.runCashFlowReport               = runCashFlowReport;
window.runCashFlowByDescReport         = runCashFlowByDescReport;
window.buildCashFlowDescSummaryForDash = buildCashFlowDescSummaryForDash;
window.bindCashFlowReportButtons       = bindCashFlowReportButtons;

console.log('✅ [modules/reports/cashflow.js] loaded — collapse/expand fixed via delegation + min-height + z-index');
