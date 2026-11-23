/* ============================================================
   پارسیس — الگوهای سند + شرح‌های استاندارد
   مسیر: js/modules/accounts/templates.js (نسخه کامل)
   ============================================================ */
'use strict';

var templateLines = [];

(function injectTplCss() {
    if (document.getElementById('tpl-fix-style')) return;
    var s = document.createElement('style');
    s.id = 'tpl-fix-style';
    s.textContent = `
        .tpl-line-box { padding:14px; background:var(--card-alt); border-radius:14px; margin-bottom:12px; position:relative; border:1px solid var(--border); }
        .tpl-line-box .ln-num { position:absolute; top:10px; right:14px; font-size:0.75rem; color:var(--text-muted); font-weight:800; }
        
        .cs-wrapper { position: relative; width: 100%; margin-top: 14px; }
        .cs-trigger { padding:10px; font-size:0.82rem; border:1.5px solid var(--border); border-radius:10px; background:var(--card-solid); cursor:pointer; display:flex; justify-content:space-between; align-items:center; user-select:none; min-height:40px; }
        .cs-trigger:hover { border-color:var(--primary); }
        .cs-trigger::after { content:'▼'; font-size:0.7rem; color:var(--text-muted); }
        .cs-dropdown { position:absolute; top:calc(100% + 4px); left:0; right:0; background:var(--card-solid); border:1.5px solid var(--primary); border-radius:10px; z-index:100; display:none; box-shadow:var(--shadow-md); overflow:hidden; }
        .cs-wrapper.open .cs-dropdown { display:block; }
        
        .cs-search-box { padding:8px; border-bottom:1px solid var(--border); background:var(--card-alt); }
        .cs-search-input { width:100%; padding:8px 10px; border:1.5px solid var(--border); border-radius:8px; font-family:inherit; font-size:0.8rem; outline:none; }
        .cs-search-input:focus { border-color:var(--primary); }
        
        .cs-options { list-style:none; margin:0; padding:0; max-height:200px; overflow-y:auto; }
        .cs-options li { padding:10px 12px; font-size:0.82rem; cursor:pointer; border-bottom:1px solid var(--border); transition:background 0.15s; }
        .cs-options li:last-child { border-bottom:none; }
        .cs-options li:hover { background:var(--primary-soft); color:var(--primary-dark); }
        .cs-options li.selected { background:var(--primary-light); font-weight:800; color:var(--primary-dark); }
        .cs-options li.empty { text-align:center; color:var(--text-muted); font-size:0.75rem; cursor:default; }
        
        .tpl-amounts-row { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:10px; }
        .tpl-amount-wrap { position:relative; }
        .tpl-amount-wrap input { width:100%; padding:10px 36px 10px 10px; font-size:0.82rem; border:1.5px solid var(--border); border-radius:10px; background:var(--card-solid); text-align:center; direction:ltr; }
        .tpl-amount-wrap .calc-btn { position:absolute; top:50%; left:5px; transform:translateY(-50%); width:28px; height:28px; border-radius:8px; background:var(--primary-soft); color:var(--primary-dark); border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; }
        
        .tpl-desc-row { display:grid; grid-template-columns:1fr auto; gap:8px; margin-top:8px; }
        .tpl-desc-row input { width:100%; padding:10px; font-size:0.82rem; border:1.5px solid var(--border); border-radius:10px; background:var(--card-solid); }
        
        .tpl-actions-row { display:flex; justify-content:flex-end; gap:6px; padding-top:10px; border-top:1px dashed var(--border-strong); margin-top:10px; flex-wrap:wrap; }
        .tpl-actions-row button { padding:7px 12px; border-radius:9px; border:none; font-family:inherit; font-size:0.8rem; font-weight:800; cursor:pointer; }
        .tpl-btn-updown { background:var(--primary-light); color:var(--primary-dark); min-width:36px; }
        .tpl-btn-copy { background:#e0e7ff; color:#3730a3; }
        .tpl-btn-del { background:#fee2e2; color:#dc2626; }
        
        .tpl-row { display:flex; align-items:center; gap:12px; padding:12px 14px; background:var(--card-solid); border:1px solid var(--border); border-radius:12px; margin-bottom:8px; flex-wrap:nowrap; }
        .tpl-order { display:flex; flex-direction:column; align-items:center; gap:2px; flex-shrink:0; }
        .tpl-order-btn { background:#e0ecf8; color:#1e40af; border:none; border-radius:6px; width:28px; height:24px; font-size:0.8rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; }
        .tpl-order-btn:hover:not(:disabled) { background:#1e40af; color:#fff; }
        .tpl-order-btn:disabled { opacity:0.3; cursor:not-allowed; }
        .tpl-order-num { font-size:0.75rem; font-weight:800; color:var(--text-muted); }
        .tpl-content { flex:1; min-width:0; }
        .tpl-name { font-weight:800; color:var(--primary-dark); font-size:0.95rem; }
        .tpl-desc { font-size:0.75rem; color:var(--text-muted); margin-top:4px; }
        @media (max-width:600px) {
            .tpl-amounts-row { grid-template-columns:1fr; }
        }
    `;
    document.head.appendChild(s);
})();

function createSearchableSelect(items, selectedValue, placeholder, onChange) {
    var wrap = document.createElement('div');
    wrap.className = 'cs-wrapper';

    var trigger = document.createElement('div');
    trigger.className = 'cs-trigger';
    var selItem = items.find(function(i) { return i.value === selectedValue; });
    trigger.textContent = selItem ? selItem.text : placeholder;
    wrap.appendChild(trigger);

    var dropdown = document.createElement('div');
    dropdown.className = 'cs-dropdown';

    var searchBox = document.createElement('div');
    searchBox.className = 'cs-search-box';
    var searchInp = document.createElement('input');
    searchInp.type = 'text';
    searchInp.className = 'cs-search-input';
    searchInp.placeholder = 'جستجو...';
    searchBox.appendChild(searchInp);
    dropdown.appendChild(searchBox);

    var list = document.createElement('ul');
    list.className = 'cs-options';
    dropdown.appendChild(list);
    wrap.appendChild(dropdown);

    function renderOptions(q) {
        list.innerHTML = '';
        q = (q || '').toLowerCase();
        var filtered = items.filter(function(i) { return !q || i.text.toLowerCase().indexOf(q) !== -1; });
        
        if (filtered.length === 0) {
            list.innerHTML = '<li class="empty">یافت نشد</li>';
            return;
        }
        
        filtered.forEach(function(i) {
            var li = document.createElement('li');
            li.textContent = i.text;
            if (i.value === selectedValue) li.className = 'selected';
            
            li.onclick = function() {
                selectedValue = i.value;
                trigger.textContent = i.text;
                wrap.classList.remove('open');
                searchInp.value = '';
                renderOptions('');
                if (onChange) onChange(i.value);
            };
            list.appendChild(li);
        });
    }
    renderOptions('');

    trigger.onclick = function(e) {
        e.stopPropagation();
        var isOpen = wrap.classList.contains('open');
        document.querySelectorAll('.cs-wrapper.open').forEach(function(el) { el.classList.remove('open'); });
        if (!isOpen) {
            wrap.classList.add('open');
            searchInp.focus();
        }
    };
    
    searchInp.oninput = function() { renderOptions(this.value); };
    
    document.addEventListener('click', function(e) {
        if (!wrap.contains(e.target)) wrap.classList.remove('open');
    });

    return wrap;
}

function getDefaultTemplates() {
    return [
        { id: 'tpl-taxi', name: 'کرایه تاکسی روزانه', desc: 'کرایه تاکسی شغلی', lines: [
            { side: 'debit', nameHint: 'ایاب و ذهاب', desc: 'کرایه تاکسی', fixedAmount: 300000 },
            { side: 'credit', nameHint: 'صندوق', desc: 'پرداخت از صندوق', fixedAmount: 300000 }
        ]},
        { id: 'tpl-supplies', name: 'خرید ملزومات', desc: 'خرید ملزومات اداری', lines: [
            { side: 'debit', nameHint: 'ملزومات', desc: 'خرید ملزومات' },
            { side: 'credit', nameHint: 'بانک', desc: 'پرداخت از بانک' }
        ]},
        { id: 'tpl-fuel', name: 'هزینه سوخت', desc: 'هزینه سوخت', lines: [
            { side: 'debit', nameHint: 'سوخت', desc: 'هزینه سوخت' },
            { side: 'credit', nameHint: 'صندوق', desc: 'پرداخت' }
        ]}
    ];
}

function getDefaultStdDescriptions() {
    return ['کرایه تاکسی', 'خرید ملزومات', 'هزینه سوخت', 'هزینه پذیرایی', 'پرداخت قبض', 'دریافت از مشتری', 'پرداخت به تأمین‌کننده', 'حقوق و دستمزد', 'اجاره', 'تلفن و اینترنت'];
}

function refreshTemplateSelect() {
    var sel = document.getElementById('v-template');
    if (!sel) return;
    var list = DB.load('voucherTemplates', []);
    sel.innerHTML = '<option value="">— بدون الگو —</option>';
    for (var i = 0; i < list.length; i++) {
        var o = document.createElement('option');
        o.value = list[i].id;
        var hasAmount = (list[i].lines || []).some(function (l) { return l.fixedAmount || l.debit || l.credit; });
        o.textContent = list[i].name + (hasAmount ? ' (آماده)' : '');
        sel.appendChild(o);
    }
}

function findAccountByNameHint(hint) {
    if (!hint) return '';
    var accounts = DB.load('accounts', []);
    var leaves = accounts.filter(function (a) { return !accounts.some(function (x) { return x.parent === a.id; }); });
    var q = hint.toLowerCase();
    var ex = leaves.find(function (a) { return (a.name || '').toLowerCase() === q; });
    if (ex) return ex.id;
    var pa = leaves.find(function (a) { return (a.name || '').toLowerCase().indexOf(q) !== -1; });
    if (pa) return pa.id;
    return '';
}

function renderTemplateList() {
    var list = DB.load('voucherTemplates', []);
    var box = document.getElementById('tpl-list-body');
    if (!box) return;
    box.innerHTML = '';

    var countEl = document.getElementById('tpl-count');
    if (countEl) countEl.textContent = toFa(list.length);

    if (list.length === 0) {
        box.innerHTML = '<p class="muted" style="text-align:center;padding:16px">الگویی نیست.</p>';
        return;
    }

    var html = '';
    list.forEach(function (t, idx) {
        var lc = (t.lines || []).length;
        html += '<div class="tpl-row">'
             +   '<div class="tpl-order">'
             +     '<button type="button" class="tpl-order-btn" data-tpl-action="up" data-tpl-idx="' + idx + '"' + (idx === 0 ? ' disabled' : '') + '>▲</button>'
             +     '<span class="tpl-order-num">' + toFa(idx + 1) + '</span>'
             +     '<button type="button" class="tpl-order-btn" data-tpl-action="down" data-tpl-idx="' + idx + '"' + (idx === list.length - 1 ? ' disabled' : '') + '>▼</button>'
             +   '</div>'
             +   '<div class="tpl-content">'
             +     '<div class="tpl-name">' + esc(t.name) + '</div>'
             +     '<div class="tpl-desc">' + toFa(lc) + ' قلم</div>'
             +   '</div>'
             +   '<div class="row-actions" style="flex-shrink:0">'
             +     '<button type="button" class="row-btn open" data-tpl-action="use" data-tpl-id="' + t.id + '" title="اعمال">⚡</button>'
             +     '<button type="button" class="row-btn edit" data-tpl-action="edit" data-tpl-id="' + t.id + '" title="ویرایش">✎</button>'
             +     '<button type="button" class="row-btn del" data-tpl-action="delete" data-tpl-id="' + t.id + '" title="حذف">×</button>'
             +   '</div>'
             + '</div>';
    });

    box.innerHTML = html;

    if (!box._tplBound) {
        box._tplBound = true;
        box.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-tpl-action]');
            if (!btn) return;
            var action = btn.getAttribute('data-tpl-action');
            var id = btn.getAttribute('data-tpl-id');
            var idx = Number(btn.getAttribute('data-tpl-idx'));

            if (action === 'up' || action === 'down') {
                var arr = DB.load('voucherTemplates', []);
                var newIdx = action === 'up' ? idx - 1 : idx + 1;
                if (newIdx < 0 || newIdx >= arr.length) return;
                var tmp = arr[idx]; arr[idx] = arr[newIdx]; arr[newIdx] = tmp;
                DB.save('voucherTemplates', arr);
                renderTemplateList();
                refreshTemplateSelect();
                return;
            }

            if (action === 'use') {
                goToPage('voucher-new');
                setTimeout(function () {
                    if (typeof newVoucherForm === 'function') newVoucherForm();
                    if (typeof applyTemplate === 'function') applyTemplate(id);
                }, 100);
                return;
            }

            if (action === 'edit') {
                var t = DB.load('voucherTemplates', []).find(function (x) { return x.id === id; });
                if (!t) return;
                document.getElementById('tpl-id').value = t.id;
                document.getElementById('tpl-name').value = t.name || '';
                document.getElementById('tpl-desc').value = t.desc || '';
                
                templateLines = (t.lines || []).map(function(l) {
                    var line = JSON.parse(JSON.stringify(l));
                    if (typeof line.debit === 'undefined') {
                        line.debit = (line.side === 'debit') ? (line.fixedAmount || 0) : 0;
                        line.credit = (line.side === 'credit') ? (line.fixedAmount || 0) : 0;
                    }
                    if (!line.details) line.details = {};
                    if (!line.account && line.nameHint) {
                        var rid = findAccountByNameHint(line.nameHint);
                        if (rid) line.account = rid;
                    }
                    return line;
                });
                
                renderTemplateLines();
                var activePage = document.querySelector('.page.active');
                var addTab = activePage ? activePage.querySelector('[data-tab="tpl-add"]') : null;
                if (addTab) addTab.click();
                return;
            }

            if (action === 'delete') {
                if (!confirm('حذف شود؟')) return;
                var l2 = DB.load('voucherTemplates', []).filter(function (x) { return x.id !== id; });
                DB.save('voucherTemplates', l2);
                renderTemplateList();
                refreshTemplateSelect();
                return;
            }
        });
    }
}

function renderTemplateLines() {
    var box = document.getElementById('tpl-lines');
    if (!box) return;
    box.innerHTML = '';

    if (templateLines.length === 0) {
        box.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.85rem;background:var(--card-alt);border-radius:10px;border:1px dashed var(--border)">هنوز قلمی اضافه نشده — روی «+ افزودن» بزنید</div>';
        return;
    }

    var accounts = DB.load('accounts', []);
    var leaves = accounts.filter(function (a) { return !accounts.some(function (x) { return x.parent === a.id; }); });
    leaves.sort(function (a, b) { return compareVals(a.code || '', b.code || ''); });

    var accItems = leaves.map(function(a) {
        return { value: a.id, text: getAccountLabel(a.id, accounts) };
    });

    templateLines.forEach(function (line, idx) {
        if (!line.details) line.details = {};
        
        var wrap = document.createElement('div');
        wrap.className = 'tpl-line-box';
        
        wrap.insertAdjacentHTML('beforeend', '<span class="ln-num">#' + toFa(idx + 1) + '</span>');

        var accSelect = createSearchableSelect(accItems, line.account, '— انتخاب حساب —', function(val) {
            line.account = val;
            line.details = {}; 
            renderTemplateLines(); 
        });
        wrap.appendChild(accSelect);

        var acc = accounts.find(function (a) { return a.id === line.account; });
        if (acc && acc.links && acc.links.length > 0) {
            var combined = [];
            acc.links.forEach(function (lt) {
                getLinkedItems(lt).forEach(function (it) {
                    var lbl = getLinkedItemLabel(lt, it);
                    combined.push({ 
                        value: lt + '::' + it.id, 
                        text: linkTypeName(lt) + ': ' + lbl 
                    });
                });
            });

            var currentDetVal = null;
            acc.links.forEach(function (lt) { 
                if (line.details[lt]) currentDetVal = lt + '::' + line.details[lt]; 
            });

            var detSelect = createSearchableSelect(combined, currentDetVal, '— انتخاب تفصیلی —', function(val) {
                line.details = {};
                if (val) {
                    var parts = val.split('::');
                    line.details[parts[0]] = parts[1];
                }
            });
            detSelect.style.marginTop = '8px';
            wrap.appendChild(detSelect);
        }

        var amtRow = document.createElement('div');
        amtRow.className = 'tpl-amounts-row';

        function mkAmtInput(placeholder, isDebit) {
            var w = document.createElement('div');
            w.className = 'tpl-amount-wrap';
            var i = document.createElement('input');
            i.type = 'text'; i.inputMode = 'numeric'; i.dir = 'ltr';
            i.placeholder = placeholder;
            var val = isDebit ? line.debit : line.credit;
            i.value = val ? formatRaw(val) : '';
            
            i.addEventListener('input', function () {
                var v = normalizeDigits(this.value).replace(/[^\d]/g, '');
                this.value = v;
                var x = Number(v) || 0;
                if (isDebit) { line.debit = x; if (x > 0) line.credit = 0; }
                else { line.credit = x; if (x > 0) line.debit = 0; }
            });
            i.addEventListener('blur', function () {
                var v = Number(normalizeDigits(this.value).replace(/[^\d]/g, '')) || 0;
                this.value = v ? formatRaw(v) : '';
                if (isDebit) { line.debit = v; if (v > 0) line.credit = 0; }
                else { line.credit = v; if (v > 0) line.debit = 0; }
            });

            var calcBtn = document.createElement('button');
            calcBtn.type = 'button'; calcBtn.className = 'calc-btn'; calcBtn.textContent = '🧮';
            calcBtn.addEventListener('click', function (e) {
                e.preventDefault();
                if (typeof calcOpen === 'function') {
                    calcOpen(
                        function () { return isDebit ? (line.debit || 0) : (line.credit || 0); },
                        function (v) {
                            if (isDebit) { line.debit = v; if (v > 0) line.credit = 0; }
                            else { line.credit = v; if (v > 0) line.debit = 0; }
                            renderTemplateLines();
                        },
                        isDebit ? 'ماشین حساب بدهکار' : 'ماشین حساب بستانکار'
                    );
                }
            });

            w.appendChild(i); w.appendChild(calcBtn);
            return w;
        }

        amtRow.appendChild(mkAmtInput('بدهکار', true));
        amtRow.appendChild(mkAmtInput('بستانکار', false));
        wrap.appendChild(amtRow);

        var descRow = document.createElement('div');
        descRow.className = 'tpl-desc-row';
        var descInp = document.createElement('input');
        descInp.type = 'text'; descInp.placeholder = 'شرح قلم *'; descInp.value = line.desc || '';
        descInp.setAttribute('list', 'std-desc-list');
        descInp.addEventListener('input', function () { line.desc = this.value; });
        
        var addStdBtn = document.createElement('button');
        addStdBtn.type = 'button'; addStdBtn.className = 'desc-add-btn'; addStdBtn.textContent = '＋';
        addStdBtn.title = 'افزودن به شرح‌های استاندارد';
        addStdBtn.addEventListener('click', function () {
            if (typeof addDescriptionToStandard === 'function') addDescriptionToStandard(descInp.value);
        });

        descRow.appendChild(descInp); descRow.appendChild(addStdBtn);
        wrap.appendChild(descRow);

        var actWrap = document.createElement('div');
        actWrap.className = 'tpl-actions-row';

        var upBtn = document.createElement('button');
        upBtn.type = 'button'; upBtn.className = 'tpl-btn-updown'; upBtn.textContent = '↑';
        upBtn.disabled = idx === 0;
        upBtn.onclick = function () { if (idx > 0) { var tmp = templateLines[idx]; templateLines[idx] = templateLines[idx - 1]; templateLines[idx - 1] = tmp; renderTemplateLines(); } };

        var downBtn = document.createElement('button');
        downBtn.type = 'button'; downBtn.className = 'tpl-btn-updown'; downBtn.textContent = '↓';
        downBtn.disabled = idx === templateLines.length - 1;
        downBtn.onclick = function () { if (idx < templateLines.length - 1) { var tmp = templateLines[idx]; templateLines[idx] = templateLines[idx + 1]; templateLines[idx + 1] = tmp; renderTemplateLines(); } };

        var cpBtn = document.createElement('button');
        cpBtn.type = 'button'; cpBtn.className = 'tpl-btn-copy'; cpBtn.textContent = '📋 کپی';
        cpBtn.onclick = function () { var cp = JSON.parse(JSON.stringify(line)); cp.id = uid(); templateLines.splice(idx + 1, 0, cp); renderTemplateLines(); };

        var delBtn = document.createElement('button');
        delBtn.type = 'button'; delBtn.className = 'tpl-btn-del'; delBtn.textContent = '× حذف';
        delBtn.onclick = function () { if (confirm('این قلم حذف شود؟')) { templateLines.splice(idx, 1); renderTemplateLines(); } };

        actWrap.appendChild(upBtn); actWrap.appendChild(downBtn); actWrap.appendChild(cpBtn); actWrap.appendChild(delBtn);
        wrap.appendChild(actWrap);

        box.appendChild(wrap);
    });
}

function renderStdDescChips() {
    var list = DB.load('standardDescriptions', getDefaultStdDescriptions());
    var box = document.getElementById('std-desc-chips');
    if (!box) return;

    var searchEl = document.getElementById('std-desc-search');
    var q = searchEl ? (searchEl.value || '').trim().toLowerCase() : '';

    var filtered = list.filter(function (item) { return !q || String(item).toLowerCase().indexOf(q) !== -1; });
    box.innerHTML = '';
    
    if (filtered.length === 0) {
        box.innerHTML = '<div class="muted" style="text-align:center;padding:16px;font-size:0.85rem">شرحی مطابق جستجو یافت نشد.</div>';
        updateStdDescCounter(list.length, 0);
        return;
    }

    filtered.forEach(function (item) {
        var chip = document.createElement('span');
        chip.className = 'chip';
        var realIdx = list.indexOf(item);
        chip.innerHTML = esc(item) + ' <button class="chip-del" data-i="' + realIdx + '">×</button>';
        box.appendChild(chip);
    });

    box.querySelectorAll('.chip-del').forEach(function (b) {
        b.addEventListener('click', function () {
            var idx = Number(this.getAttribute('data-i'));
            var l = DB.load('standardDescriptions', getDefaultStdDescriptions());
            l.splice(idx, 1);
            DB.save('standardDescriptions', l);
            renderStdDescChips();
            refreshStdDescDatalist();
        });
    });
    updateStdDescCounter(list.length, filtered.length);
}

function updateStdDescCounter(total, shown) {
    var cnt = document.getElementById('std-desc-count');
    if (!cnt) return;
    cnt.textContent = (total === shown) ? (toFa(total) + ' شرح') : (toFa(shown) + ' از ' + toFa(total) + ' شرح');
}

function refreshStdDescDatalist() {
    var list = DB.load('standardDescriptions', getDefaultStdDescriptions());
    var dl = document.getElementById('std-desc-list');
    if (!dl) return;
    dl.innerHTML = '';
    list.forEach(function (item) {
        var o = document.createElement('option'); o.value = item; dl.appendChild(o);
    });
}

function addDescriptionToStandard(desc, silent) {
    if (!desc || !desc.trim()) { if (!silent) alert('شرح خالی است.'); return false; }
    var v = desc.trim();
    var l = DB.load('standardDescriptions', getDefaultStdDescriptions());
    if (l.indexOf(v) !== -1) { if (!silent) showToast('قبلاً در لیست است.'); return false; }
    l.push(v);
    DB.save('standardDescriptions', l);
    refreshStdDescDatalist();
    renderStdDescChips();
    if (!silent) showToast('✅ اضافه شد.');
    return true;
}

function bindTemplatesForm() {
    var addLineBtn = document.getElementById('tpl-add-line');
    if (addLineBtn) addLineBtn.addEventListener('click', function () {
        templateLines.push({ side: 'debit', account: '', details: {}, desc: '', debit: 0, credit: 0 });
        renderTemplateLines();
    });

    var saveBtn = document.getElementById('save-tpl');
    if (saveBtn) saveBtn.addEventListener('click', function () {
        var id = document.getElementById('tpl-id').value;
        var name = document.getElementById('tpl-name').value.trim();
        if (!name) { alert('نام اجباری است.'); return; }

        var valid = templateLines.filter(function (l) { return l.account || l.desc; });
        if (valid.length === 0) { alert('حداقل یک قلم باید حساب یا شرح داشته باشد.'); return; }

        var o = {
            id: id || uid(),
            name: name,
            desc: document.getElementById('tpl-desc').value.trim(),
            lines: valid.map(function (l) {
                var amt = Number(l.debit) || Number(l.credit) || 0;
                var side = (Number(l.debit) > 0) ? 'debit' : 'credit';
                return {
                    side: side,
                    account: l.account || '',
                    details: l.details || {},
                    desc: l.desc || '',
                    fixedAmount: amt
                };
            })
        };

        var l = DB.load('voucherTemplates', []);
        if (id) {
            for (var i = 0; i < l.length; i++) { if (l[i].id === id) l[i] = o; }
        } else {
            l.push(o);
        }
        DB.save('voucherTemplates', l);
        showToast('✅ الگو ذخیره شد.');
        
        document.getElementById('tpl-id').value = '';
        document.getElementById('tpl-name').value = '';
        document.getElementById('tpl-desc').value = '';
        templateLines = [];
        renderTemplateLines();
        
        renderTemplateList();
        refreshTemplateSelect();
        var activePage = document.querySelector('.page.active');
        var listTab = activePage ? activePage.querySelector('[data-tab="tpl-list"]') : null;
        if (listTab) listTab.click();
    });

    var newBtn = document.getElementById('new-tpl');
    if (newBtn) newBtn.addEventListener('click', function () {
        document.getElementById('tpl-id').value = '';
        document.getElementById('tpl-name').value = '';
        document.getElementById('tpl-desc').value = '';
        templateLines = [];
        renderTemplateLines();
    });

    var loadDefaultsBtn = document.getElementById('tpl-load-defaults');
    if (loadDefaultsBtn) loadDefaultsBtn.addEventListener('click', function () {
        var l = DB.load('voucherTemplates', []);
        var d = getDefaultTemplates();
        var added = 0;
        d.forEach(function (x) {
            if (!l.some(function (y) { return y.name === x.name; })) { l.push(x); added++; }
        });
        DB.save('voucherTemplates', l);
        renderTemplateList();
        refreshTemplateSelect();
        showToast('✅ ' + toFa(added) + ' الگو افزوده شد.');
    });

    var addStdBtn = document.getElementById('add-std-desc');
    if (addStdBtn) addStdBtn.addEventListener('click', function () {
        var inp = document.getElementById('new-std-desc');
        var v = inp.value.trim();
        if (!v) return;
        var l = DB.load('standardDescriptions', getDefaultStdDescriptions());
        if (l.indexOf(v) !== -1) { alert('قبلاً وجود دارد.'); return; }
        l.push(v);
        DB.save('standardDescriptions', l);
        inp.value = '';
        renderStdDescChips();
        refreshStdDescDatalist();
    });

    var stdSearch = document.getElementById('std-desc-search');
    if (stdSearch) stdSearch.addEventListener('input', function () { renderStdDescChips(); });
}

window.createSearchableSelect     = createSearchableSelect;
window.getDefaultTemplates        = getDefaultTemplates;
window.getDefaultStdDescriptions  = getDefaultStdDescriptions;
window.refreshTemplateSelect      = refreshTemplateSelect;
window.findAccountByNameHint      = findAccountByNameHint;
window.renderTemplateList         = renderTemplateList;
window.renderTemplateLines        = renderTemplateLines;
window.renderStdDescChips         = renderStdDescChips;
window.updateStdDescCounter       = updateStdDescCounter;
window.refreshStdDescDatalist     = refreshStdDescDatalist;
window.addDescriptionToStandard   = addDescriptionToStandard;
window.bindTemplatesForm          = bindTemplatesForm;

console.log('✅ [modules/accounts/templates.js] loaded — Complete');
