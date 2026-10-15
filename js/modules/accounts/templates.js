/* ============================================================
   پارسیس — الگوهای سند + شرح‌های استاندارد
   مسیر: js/modules/accounts/templates.js
   وابستگی: core/* + ui/* + accounts/chart.js
   ============================================================ */
'use strict';

/* ============================================================
   بخش ۱ — الگوهای پیش‌فرض
   ============================================================ */
function getDefaultTemplates() {
    return [
        {
            id: 'tpl-taxi',
            name: 'کرایه تاکسی روزانه',
            desc: 'کرایه تاکسی شغلی',
            lines: [
                { side: 'debit',  nameHint: 'ایاب و ذهاب', desc: 'کرایه تاکسی', fixedAmount: 300000 },
                { side: 'credit', nameHint: 'صندوق',       desc: 'پرداخت از صندوق', fixedAmount: 300000 }
            ]
        },
        {
            id: 'tpl-supplies',
            name: 'خرید ملزومات',
            desc: 'خرید ملزومات اداری',
            lines: [
                { side: 'debit',  nameHint: 'ملزومات', desc: 'خرید ملزومات' },
                { side: 'credit', nameHint: 'بانک',    desc: 'پرداخت از بانک' }
            ]
        },
        {
            id: 'tpl-fuel',
            name: 'هزینه سوخت',
            desc: 'هزینه سوخت',
            lines: [
                { side: 'debit',  nameHint: 'سوخت',  desc: 'هزینه سوخت' },
                { side: 'credit', nameHint: 'صندوق', desc: 'پرداخت' }
            ]
        },
        {
            id: 'tpl-receive',
            name: 'دریافت از مشتری',
            desc: 'دریافت',
            lines: [
                { side: 'debit',  nameHint: 'بانک',       desc: 'واریز' },
                { side: 'credit', nameHint: 'دریافتنی',   desc: 'دریافت از مشتری' }
            ]
        },
        {
            id: 'tpl-bill',
            name: 'پرداخت قبض',
            desc: 'پرداخت قبوض',
            lines: [
                { side: 'debit',  nameHint: 'قبوض', desc: 'هزینه قبوض' },
                { side: 'credit', nameHint: 'بانک', desc: 'پرداخت' }
            ]
        }
    ];
}

function getDefaultStdDescriptions() {
    return [
        'کرایه تاکسی',
        'خرید ملزومات',
        'هزینه سوخت',
        'هزینه پذیرایی',
        'پرداخت قبض',
        'دریافت از مشتری',
        'پرداخت به تأمین‌کننده',
        'حقوق و دستمزد',
        'اجاره',
        'تلفن و اینترنت',
        'تعمیر و نگهداری',
        'تبلیغات',
        'حمل و نقل',
        'کارمزد بانکی',
        'مالیات',
        'بیمه'
    ];
}

/* ============================================================
   بخش ۲ — پر کردن سلکت الگوها در فرم سند
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

/* ============================================================
   بخش ۳ — جستجوی حساب با نام
   ============================================================ */
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
   بخش ۴ — رندر فهرست الگوها
   ============================================================ */
function renderTemplateList() {
    var list = DB.load('voucherTemplates', []);
    var box = document.getElementById('tpl-list-body');
    if (!box) return;
    box.innerHTML = '';

    if (list.length === 0) {
        box.innerHTML = '<p class="muted" style="text-align:center;padding:16px">الگویی نیست.</p>';
        var cEl = document.getElementById('tpl-count');
        if (cEl) cEl.textContent = '۰';
        return;
    }

    for (var i = 0; i < list.length; i++) {
        (function (t, idx) {
            var row = document.createElement('div');
            row.className = 'tpl-row';
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.gap = '8px';
            row.style.flexWrap = 'nowrap';

            var lc = (t.lines || []).length;
            var ha = (t.lines || []).some(function (l) { return l.fixedAmount; });
            var sub = toFa(lc) + ' قلم' + (ha ? ' — دارای مبلغ' : '');

            /* دکمه بالا */
            var upBtn = document.createElement('button');
            upBtn.type = 'button';
            upBtn.className = 'row-btn';
            upBtn.textContent = '↑';
            upBtn.title = 'انتقال به بالا';
            upBtn.style.cssText = 'background:#e0ecf8;color:#1e40af;border:none;border-radius:8px;width:32px;height:32px;font-size:0.95rem;font-weight:800;cursor:pointer;flex-shrink:0';
            if (idx === 0) upBtn.disabled = true;
            if (idx === 0) upBtn.style.opacity = '0.35';
            upBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (idx === 0) return;
                var arr = DB.load('voucherTemplates', []);
                var tmp = arr[idx];
                arr[idx] = arr[idx - 1];
                arr[idx - 1] = tmp;
                DB.save('voucherTemplates', arr);
                renderTemplateList();
                refreshTemplateSelect();
                showToast('↕ ترتیب الگوها بروزرسانی شد.');
            });

            /* دکمه پایین */
            var downBtn = document.createElement('button');
            downBtn.type = 'button';
            downBtn.className = 'row-btn';
            downBtn.textContent = '↓';
            downBtn.title = 'انتقال به پایین';
            downBtn.style.cssText = 'background:#e0ecf8;color:#1e40af;border:none;border-radius:8px;width:32px;height:32px;font-size:0.95rem;font-weight:800;cursor:pointer;flex-shrink:0';
            if (idx === list.length - 1) downBtn.disabled = true;
            if (idx === list.length - 1) downBtn.style.opacity = '0.35';
            downBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (idx === list.length - 1) return;
                var arr = DB.load('voucherTemplates', []);
                var tmp = arr[idx];
                arr[idx] = arr[idx + 1];
                arr[idx + 1] = tmp;
                DB.save('voucherTemplates', arr);
                renderTemplateList();
                refreshTemplateSelect();
                showToast('↕ ترتیب الگوها بروزرسانی شد.');
            });

            var orderWrap = document.createElement('div');
            orderWrap.style.cssText = 'display:flex;flex-direction:column;gap:2px;flex-shrink:0';
            orderWrap.appendChild(upBtn);
            orderWrap.appendChild(downBtn);

            var contentWrap = document.createElement('div');
            contentWrap.style.cssText = 'flex:1;min-width:0';
            contentWrap.innerHTML = '<div class="tpl-name">' + esc(t.name) + '</div>'
                + '<div class="tpl-desc">' + sub + '</div>';

            var actWrap = document.createElement('div');
            actWrap.className = 'row-actions';
            actWrap.innerHTML = '<button class="row-btn open tpl-use" data-id="' + t.id + '" title="اعمال الگو">⚡</button>'
                + '<button class="row-btn edit tpl-edit" data-id="' + t.id + '" title="ویرایش">✎</button>'
                + '<button class="row-btn del tpl-del" data-id="' + t.id + '" title="حذف">×</button>';

            row.appendChild(orderWrap);
            row.appendChild(contentWrap);
            row.appendChild(actWrap);
            box.appendChild(row);
        })(list[i], i);
    }

    var countEl = document.getElementById('tpl-count');
    if (countEl) countEl.textContent = toFa(list.length);

    var uses = box.querySelectorAll('.tpl-use');
    var edits = box.querySelectorAll('.tpl-edit');
    var dels = box.querySelectorAll('.tpl-del');

    for (var u = 0; u < uses.length; u++) {
        uses[u].addEventListener('click', function () {
            var id = this.getAttribute('data-id');
            goToPage('voucher-new');
            if (typeof voucherLines !== 'undefined' &&
                (voucherLines.length === 0 || currentVoucherStatus === 'approved')) {
                if (typeof newVoucherForm === 'function') newVoucherForm();
            }
            if (typeof applyTemplate === 'function') applyTemplate(id);
        });
    }

    for (var e = 0; e < edits.length; e++) {
        edits[e].addEventListener('click', function () {
            var id = this.getAttribute('data-id');
            var t = DB.load('voucherTemplates', []).find(function (x) { return x.id === id; });
            if (!t) return;
            document.getElementById('tpl-id').value = t.id;
            document.getElementById('tpl-name').value = t.name || '';
            document.getElementById('tpl-desc').value = t.desc || '';
            if (typeof templateLines !== 'undefined') {
                templateLines = JSON.parse(JSON.stringify(t.lines || []));
                if (typeof renderTemplateLines === 'function') renderTemplateLines();
            }
            var addTab = document.querySelector('[data-tab="tpl-add"]');
            if (addTab) addTab.click();
        });
    }

    for (var d = 0; d < dels.length; d++) {
        dels[d].addEventListener('click', function () {
            if (!confirm('حذف شود؟')) return;
            var id = this.getAttribute('data-id');
            var l2 = DB.load('voucherTemplates', []).filter(function (x) { return x.id !== id; });
            DB.save('voucherTemplates', l2);
            renderTemplateList();
            refreshTemplateSelect();
        });
    }
}
/* ============================================================
   بخش ۵ — شرح‌های استاندارد
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
   بخش ۶ — اتصال دکمه‌های فرم الگو
   ============================================================ */
function bindTemplatesForm() {
    var addLineBtn = document.getElementById('tpl-add-line');
    if (addLineBtn) addLineBtn.addEventListener('click', function () {
        if (typeof templateLines === 'undefined') return;
        templateLines.push({ side: 'debit', account: '', details: {}, desc: '', fixedAmount: 0 });
        if (typeof renderTemplateLines === 'function') renderTemplateLines();
    });

    var saveBtn = document.getElementById('save-tpl');
    if (saveBtn) saveBtn.addEventListener('click', function () {
        var id = document.getElementById('tpl-id').value;
        var name = document.getElementById('tpl-name').value.trim();
        if (!name) { alert('نام اجباری.'); return; }

        var valid = (typeof templateLines !== 'undefined' ? templateLines : [])
            .filter(function (l) { return l.account || l.desc; });
        if (valid.length === 0) { alert('حداقل یک قلم.'); return; }

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
        if (typeof templateLines !== 'undefined') {
            templateLines = [];
            if (typeof renderTemplateLines === 'function') renderTemplateLines();
        }
        renderTemplateList();
        refreshTemplateSelect();
        var listTab = document.querySelector('[data-tab="tpl-list"]');
        if (listTab) listTab.click();
    });

    var newBtn = document.getElementById('new-tpl');
    if (newBtn) newBtn.addEventListener('click', function () {
        document.getElementById('tpl-id').value = '';
        document.getElementById('tpl-name').value = '';
        document.getElementById('tpl-desc').value = '';
        if (typeof templateLines !== 'undefined') {
            templateLines = [];
            if (typeof renderTemplateLines === 'function') renderTemplateLines();
        }
    });

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
window.renderStdDescChips         = renderStdDescChips;
window.updateStdDescCounter       = updateStdDescCounter;
window.refreshStdDescDatalist     = refreshStdDescDatalist;
window.addDescriptionToStandard   = addDescriptionToStandard;
window.bindTemplatesForm          = bindTemplatesForm;

console.log('✅ [modules/accounts/templates.js] loaded — complete');
