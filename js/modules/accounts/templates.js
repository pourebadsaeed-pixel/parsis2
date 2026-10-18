/* ============================================================
   پارسیس — الگوهای سند + شرح‌های استاندارد
   مسیر: js/modules/accounts/templates.js
   ============================================================ */
'use strict';

/* خطوط الگوی در حال ویرایش */
var templateLines = [];

/* استایل اختصاصی برای بخش الگوها */
(function injectTplCss() {
    if (document.getElementById('tpl-fix-style')) return;
    var s = document.createElement('style');
    s.id = 'tpl-fix-style';
    s.textContent = `
        .tpl-row { display:flex; align-items:center; gap:12px; padding:12px 14px; background:var(--card-solid); border:1px solid var(--border); border-radius:12px; margin-bottom:8px; flex-wrap:nowrap; transition:all 0.2s; }
        .tpl-order { display:flex; flex-direction:column; align-items:center; gap:2px; flex-shrink:0; }
        .tpl-order-btn { background:#e0ecf8; color:#1e40af; border:none; border-radius:6px; width:28px; height:24px; font-size:0.8rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; transition:all 0.2s; }
        .tpl-order-btn:hover:not(:disabled) { background:#1e40af; color:#fff; transform:scale(1.1); }
        .tpl-order-btn:disabled { opacity:0.3; cursor:not-allowed; }
        .tpl-order-num { font-size:0.75rem; font-weight:800; color:var(--text-muted); }
        .tpl-content { flex:1; min-width:0; overflow:hidden; }
        .tpl-name { font-weight:800; color:var(--primary-dark); font-size:0.95rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .tpl-desc { font-size:0.75rem; color:var(--text-muted); margin-top:4px; }
        
        .tpl-line-row { display:flex; flex-wrap:wrap; gap:8px; align-items:center; padding:10px; background:var(--card-alt); border-radius:10px; margin-bottom:8px; border:1px solid var(--border); }
        .tpl-line-row > * { flex-shrink:0; }
        .tpl-line-row .num { width:24px; text-align:center; font-weight:900; color:var(--primary-dark); font-size:0.8rem; }
        .tpl-line-row select, .tpl-line-row input { padding:7px 10px; border:1.5px solid var(--border); border-radius:8px; font-family:inherit; font-size:0.8rem; background:#fff; outline:none; }
        .tpl-line-row select:focus, .tpl-line-row input:focus { border-color:var(--primary); }
        .tpl-line-row .inp-side { width:90px; cursor:pointer; }
        .tpl-line-row .inp-acc { flex:1; min-width:140px; }
        .tpl-line-row .inp-desc { flex:1; min-width:120px; }
        .tpl-line-row .inp-amt { width:110px; text-align:center; direction:ltr; }
        .tpl-line-row .btn-actions { display:flex; gap:4px; margin-right:auto; }
        
        @media (max-width: 600px) {
            .tpl-row { flex-wrap:wrap; }
            .tpl-line-row .inp-acc { width:100%; min-width:100%; }
            .tpl-line-row .inp-desc { width:100%; min-width:100%; }
            .tpl-line-row .inp-amt { flex:1; }
        }
    `;
    document.head.appendChild(s);
})();

/* ============================================================
   الگوهای پیش‌فرض
   ============================================================ */
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
        ]},
        { id: 'tpl-receive', name: 'دریافت از مشتری', desc: 'دریافت', lines: [
            { side: 'debit', nameHint: 'بانک', desc: 'واریز' },
            { side: 'credit', nameHint: 'دریافتنی', desc: 'دریافت از مشتری' }
        ]},
        { id: 'tpl-bill', name: 'پرداخت قبض', desc: 'پرداخت قبوض', lines: [
            { side: 'debit', nameHint: 'قبوض', desc: 'هزینه قبوض' },
            { side: 'credit', nameHint: 'بانک', desc: 'پرداخت' }
        ]}
    ];
}

function getDefaultStdDescriptions() {
    return ['کرایه تاکسی', 'خرید ملزومات', 'هزینه سوخت', 'هزینه پذیرایی', 'پرداخت قبض', 'دریافت از مشتری', 'پرداخت به تأمین‌کننده', 'حقوق و دستمزد', 'اجاره', 'تلفن و اینترنت', 'تعمیر و نگهداری', 'تبلیغات', 'حمل و نقل', 'کارمزد بانکی', 'مالیات', 'بیمه'];
}

/* ============================================================
   پر کردن سلکت الگوها
   ============================================================ */
function refreshTemplateSelect() {
    var sel = document.getElementById('v-template');
    if (!sel) return;
    var list = DB.load('voucherTemplates', []);
    sel.innerHTML = '<option value="">— بدون الگو —</option>';
    for (var i = 0; i < list.length; i++) {
        var o = document.createElement('option');
        o.value = list[i].id;
        var hasAmount = (list[i].lines || []).some(function (l) { return l.fixedAmount; });
        o.textContent = list[i].name + (hasAmount ? ' (آماده)' : '');
        sel.appendChild(o);
    }
}

function findAccountByNameHint(hint) {
    if (!hint) return '';
    var accounts = DB.load('accounts', []);
    var leaves = accounts.filter(function (a) {
        return !accounts.some(function (x) { return x.parent === a.id; });
    });
    var q = hint.toLowerCase();
    var ex = leaves.find(function (a) { return (a.name || '').toLowerCase() === q; });
    if (ex) return ex.id;
    var pa = leaves.find(function (a) { return (a.name || '').toLowerCase().indexOf(q) !== -1; });
    if (pa) return pa.id;
    return '';
}

/* ============================================================
   رندر فهرست الگوها (با دکمه‌های بالا/پایین اصلاح‌شده)
   ============================================================ */
function renderTemplateList() {
    var list = DB.load('voucherTemplates', []);
    var box = document.getElementById('tpl-list-body');
    if (!box) return;
    box.innerHTML = '';

    var countEl = document.getElementById('tpl-count');
    if (countEl) countEl.textContent = toFa(list.length);

    if (list.length === 0) {
        box.innerHTML = '<p class="muted" style="text-align:center;padding:16px">الگویی نیست. از تب «تعریف الگو» اضافه کنید.</p>';
        return;
    }

    var html = '';
    list.forEach(function (t, idx) {
        var lc = (t.lines || []).length;
        var ha = (t.lines || []).some(function (l) { return l.fixedAmount; });
        var sub = toFa(lc) + ' قلم' + (ha ? ' — دارای مبلغ' : '');

        html += '<div class="tpl-row">'
             +   '<div class="tpl-order">'
             +     '<button type="button" class="tpl-order-btn" data-tpl-action="up" data-tpl-idx="' + idx + '"' + (idx === 0 ? ' disabled' : '') + ' title="انتقال به بالا">▲</button>'
             +     '<span class="tpl-order-num">' + toFa(idx + 1) + '</span>'
             +     '<button type="button" class="tpl-order-btn" data-tpl-action="down" data-tpl-idx="' + idx + '"' + (idx === list.length - 1 ? ' disabled' : '') + ' title="انتقال به پایین">▼</button>'
             +   '</div>'
             +   '<div class="tpl-content">'
             +     '<div class="tpl-name">' + esc(t.name) + '</div>'
             +     '<div class="tpl-desc">' + sub + '</div>'
             +   '</div>'
             +   '<div class="row-actions" style="flex-shrink:0">'
             +     '<button type="button" class="row-btn open" data-tpl-action="use" data-tpl-id="' + t.id + '" title="اعمال الگو">⚡</button>'
             +     '<button type="button" class="row-btn edit" data-tpl-action="edit" data-tpl-id="' + t.id + '" title="ویرایش">✎</button>'
             +     '<button type="button" class="row-btn del" data-tpl-action="delete" data-tpl-id="' + t.id + '" title="حذف">×</button>'
             +   '</div>'
             + '</div>';
    });

    box.innerHTML = html;

    /* یک‌بار listener را به کل container وصل می‌کنیم (Event Delegation) */
    if (!box._tplBound) {
        box._tplBound = true;
        box.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-tpl-action]');
            if (!btn) return;
            var action = btn.getAttribute('data-tpl-action');
            var id = btn.getAttribute('data-tpl-id');
            var idx = Number(btn.getAttribute('data-tpl-idx'));

            if (action === 'up' || action === 'down') {
                e.preventDefault();
                var newIdx = action === 'up' ? idx - 1 : idx + 1;
                var arr = DB.load('voucherTemplates', []);
                if (newIdx < 0 || newIdx >= arr.length) return;
                var tmp = arr[idx];
                arr[idx] = arr[newIdx];
                arr[newIdx] = tmp;
                DB.save('voucherTemplates', arr);
                renderTemplateList();
                refreshTemplateSelect();
                showToast('↕ ترتیب الگوها بروزرسانی شد');
                return;
            }

            if (action === 'use') {
                goToPage('voucher-new');
                setTimeout(function () {
                    if (typeof voucherLines !== 'undefined' &&
                        (voucherLines.length === 0 || currentVoucherStatus === 'approved')) {
                        if (typeof newVoucherForm === 'function') newVoucherForm();
                    }
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
                
                templateLines = JSON.parse(JSON.stringify(t.lines || []));
                templateLines.forEach(function(line) {
                    if (!line.account && line.nameHint) {
                        var resolved = findAccountByNameHint(line.nameHint);
                        if (resolved) line.account = resolved;
                    }
                });
                renderTemplateLines();
                
                var addTab = document.querySelector('[data-tab="tpl-add"]');
                if (addTab) addTab.click();
                return;
            }

            if (action === 'delete') {
                if (!confirm('حذف شود؟')) return;
                var l2 = DB.load('voucherTemplates', []).filter(function (x) { return x.id !== id; });
                DB.save('voucherTemplates', l2);
                renderTemplateList();
                refreshTemplateSelect();
                showToast('🗑 حذف شد');
                return;
            }
        });
    }
}

/* ============================================================
   رندر فرم اقلام الگو (templateLines)
   ============================================================ */
function renderTemplateLines() {
    var box = document.getElementById('tpl-lines');
    if (!box) return;
    box.innerHTML = '';

    if (templateLines.length === 0) {
        box.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.85rem;background:var(--card-alt);border-radius:10px;border:1px dashed var(--border)">هنوز قلمی اضافه نشده — روی «+ افزودن» بزنید</div>';
        return;
    }

    var accounts = DB.load('accounts', []);
    var leaves = accounts.filter(function (a) {
        return !accounts.some(function (x) { return x.parent === a.id; });
    });
    leaves.sort(function (a, b) { return compareVals(a.code || '', b.code || ''); });

    templateLines.forEach(function (line, idx) {
        var row = document.createElement('div');
        row.className = 'tpl-line-row';

        /* شماره */
        var num = document.createElement('div');
        num.className = 'num';
        num.textContent = '#' + toFa(idx + 1);
        row.appendChild(num);

        /* سمت (بدهکار / بستانکار) */
        var sideSel = document.createElement('select');
        sideSel.className = 'inp-side';
        sideSel.innerHTML = '<option value="debit">بدهکار</option><option value="credit">بستانکار</option>';
        sideSel.value = line.side || 'debit';
        sideSel.onchange = function () { line.side = this.value; };
        row.appendChild(sideSel);

        /* حساب */
        var accSel = document.createElement('select');
        accSel.className = 'inp-acc';
        var accHtml = '<option value="">— انتخاب حساب —</option>';
        leaves.forEach(function (a) {
            accHtml += '<option value="' + a.id + '"' + (line.account === a.id ? ' selected' : '') + '>' + esc(a.code + ' - ' + a.name) + '</option>';
        });
        accSel.innerHTML = accHtml;
        accSel.onchange = function () { line.account = this.value; };
        row.appendChild(accSel);

        /* شرح */
        var descInp = document.createElement('input');
        descInp.type = 'text';
        descInp.className = 'inp-desc';
        descInp.placeholder = 'شرح قلم';
        descInp.value = line.desc || '';
        descInp.oninput = function () { line.desc = this.value; };
        row.appendChild(descInp);

        /* مبلغ */
        var amtInp = document.createElement('input');
        amtInp.type = 'text';
        amtInp.inputMode = 'numeric';
        amtInp.className = 'inp-amt';
        amtInp.placeholder = 'مبلغ';
        amtInp.value = line.fixedAmount ? formatRaw(line.fixedAmount) : '';
        amtInp.oninput = function () {
            var v = normalizeDigits(this.value).replace(/[^\d]/g, '');
            this.value = v;
            line.fixedAmount = Number(v) || 0;
        };
        amtInp.onblur = function () {
            var v = Number(normalizeDigits(this.value).replace(/[^\d]/g, '')) || 0;
            this.value = v ? formatRaw(v) : '';
            line.fixedAmount = v;
        };
        row.appendChild(amtInp);

        /* دکمه‌های عملیات */
        var actionsWrap = document.createElement('div');
        actionsWrap.className = 'btn-actions';

        var upBtn = document.createElement('button');
        upBtn.type = 'button';
        upBtn.className = 'tpl-order-btn';
        upBtn.textContent = '▲';
        upBtn.disabled = idx === 0;
        upBtn.onclick = function () {
            if (idx === 0) return;
            var tmp = templateLines[idx];
            templateLines[idx] = templateLines[idx - 1];
            templateLines[idx - 1] = tmp;
            renderTemplateLines();
        };

        var downBtn = document.createElement('button');
        downBtn.type = 'button';
        downBtn.className = 'tpl-order-btn';
        downBtn.textContent = '▼';
        downBtn.disabled = idx === templateLines.length - 1;
        downBtn.onclick = function () {
            if (idx === templateLines.length - 1) return;
            var tmp = templateLines[idx];
            templateLines[idx] = templateLines[idx + 1];
            templateLines[idx + 1] = tmp;
            renderTemplateLines();
        };

        var delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'tpl-order-btn';
        delBtn.style.background = '#fee2e2';
        delBtn.style.color = '#dc2626';
        delBtn.textContent = '×';
        delBtn.title = 'حذف';
        delBtn.onclick = function () {
            if (!confirm('این قلم حذف شود؟')) return;
            templateLines.splice(idx, 1);
            renderTemplateLines();
        };

        actionsWrap.appendChild(upBtn);
        actionsWrap.appendChild(downBtn);
        actionsWrap.appendChild(delBtn);
        row.appendChild(actionsWrap);

        box.appendChild(row);
    });
}

/* ============================================================
   شرح‌های استاندارد
   ============================================================ */
function renderStdDescChips() {
    var list = DB.load('standardDescriptions', getDefaultStdDescriptions());
    var box = document.getElementById('std-desc-chips');
    if (!box) return;

    var searchEl = document.getElementById('std-desc-search');
    var q = searchEl ? (searchEl.value || '').trim().toLowerCase() : '';

    var filtered = list.filter(function (item) {
        return !q || String(item).toLowerCase().indexOf(q) !== -1;
    });

    box.innerHTML = '';
    if (filtered.length === 0) {
        box.innerHTML = '<div class="muted" style="text-align:center;padding:16px;font-size:0.85rem">شرحی مطابق جستجو یافت نشد.</div>';
        updateStdDescCounter(list.length, 0);
        return;
    }

    for (var i = 0; i < filtered.length; i++) {
        (function (item) {
            var chip = document.createElement('span');
            chip.className = 'chip';
            var realIdx = list.indexOf(item);
            chip.innerHTML = esc(item) + ' <button class="chip-del" data-i="' + realIdx + '">×</button>';
            box.appendChild(chip);
        })(filtered[i]);
    }

    var dels = box.querySelectorAll('.chip-del');
    for (var j = 0; j < dels.length; j++) {
        dels[j].addEventListener('click', function () {
            var idx = Number(this.getAttribute('data-i'));
            var l = DB.load('standardDescriptions', getDefaultStdDescriptions());
            l.splice(idx, 1);
            DB.save('standardDescriptions', l);
            renderStdDescChips();
            refreshStdDescDatalist();
        });
    }
    updateStdDescCounter(list.length, filtered.length);
}

function updateStdDescCounter(total, shown) {
    var cnt = document.getElementById('std-desc-count');
    if (!cnt) return;
    if (total === shown) cnt.textContent = toFa(total) + ' شرح';
    else cnt.textContent = toFa(shown) + ' از ' + toFa(total) + ' شرح';
}

function refreshStdDescDatalist() {
    var list = DB.load('standardDescriptions', getDefaultStdDescriptions());
    var dl = document.getElementById('std-desc-list');
    if (!dl) return;
    dl.innerHTML = '';
    for (var i = 0; i < list.length; i++) {
        var o = document.createElement('option');
        o.value = list[i];
        dl.appendChild(o);
    }
}

function addDescriptionToStandard(desc, silent) {
    if (!desc || !desc.trim()) {
        if (!silent) alert('شرح خالی است.');
        return false;
    }
    var v = desc.trim();
    var l = DB.load('standardDescriptions', getDefaultStdDescriptions());
    if (l.indexOf(v) !== -1) {
        if (!silent) showToast('قبلاً در لیست است.');
        return false;
    }
    l.push(v);
    DB.save('standardDescriptions', l);
    refreshStdDescDatalist();
    renderStdDescChips();
    if (!silent) showToast('✅ اضافه شد.');
    return true;
}

/* ============================================================
   اتصال دکمه‌های فرم الگو
   ============================================================ */
function bindTemplatesForm() {
    /* افزودن قلم */
    var addLineBtn = document.getElementById('tpl-add-line');
    if (addLineBtn) addLineBtn.addEventListener('click', function () {
        templateLines.push({ side: 'debit', account: '', details: {}, desc: '', fixedAmount: 0 });
        renderTemplateLines();
    });

    /* ذخیره الگو */
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
                return {
                    side: l.side,
                    account: l.account || '',
                    details: l.details || {},
                    desc: l.desc || '',
                    fixedAmount: Number(l.fixedAmount) || 0
                };
            })
        };

        var l = DB.load('voucherTemplates', []);
        if (id) {
            for (var i = 0; i < l.length; i++) {
                if (l[i].id === id) l[i] = o;
            }
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
        var listTab = document.querySelector('[data-tab="tpl-list"]');
        if (listTab) listTab.click();
    });

    /* جدید */
    var newBtn = document.getElementById('new-tpl');
    if (newBtn) newBtn.addEventListener('click', function () {
        document.getElementById('tpl-id').value = '';
        document.getElementById('tpl-name').value = '';
        document.getElementById('tpl-desc').value = '';
        templateLines = [];
        renderTemplateLines();
    });

    /* افزودن پیش‌فرض‌ها */
    var loadDefaultsBtn = document.getElementById('tpl-load-defaults');
    if (loadDefaultsBtn) loadDefaultsBtn.addEventListener('click', function () {
        var l = DB.load('voucherTemplates', []);
        var d = getDefaultTemplates();
        var added = 0;
        d.forEach(function (x) {
            if (!l.some(function (y) { return y.name === x.name; })) {
                l.push(x);
                added++;
            }
        });
        DB.save('voucherTemplates', l);
        renderTemplateList();
        refreshTemplateSelect();
        showToast('✅ ' + toFa(added) + ' الگو افزوده شد.');
    });

    /* شرح استاندارد */
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
    if (stdSearch) stdSearch.addEventListener('input', function () {
        renderStdDescChips();
    });
}

/* ============================================================
   صادرسازی
   ============================================================ */
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

console.log('✅ [modules/accounts/templates.js] loaded — complete (fixed)');
