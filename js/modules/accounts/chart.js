/* ============================================================
   پارسیس — چارت حساب‌ها (درخت)
   مسیر: js/modules/accounts/chart.js
   وابستگی: core/* + ui/*
   ============================================================ */
'use strict';

/* ============================================================
   بخش ۱ — رندر درخت
   ============================================================ */
function renderChartTree(cid, editable) {
    var box = document.getElementById(cid);
    if (!box) return;
    var accounts = DB.load('accounts', []);
    box.innerHTML = '';

    if (accounts.length === 0) {
        box.innerHTML = '<p class="muted" style="text-align:center;padding:20px">حسابی تعریف نشده.</p>';
        return;
    }

    var sI = document.getElementById('charttree-search');
    var q = (sI && sI.value || '').trim().toLowerCase();

    if (q) {
        /* حالت جستجو */
        var results = accounts.filter(function (a) {
            return (a.code || '').toLowerCase().indexOf(q) !== -1
                || (a.name || '').toLowerCase().indexOf(q) !== -1;
        });
        for (var r = 0; r < results.length; r++) {
            (function (node) {
                var div = document.createElement('div');
                div.className = 'tree-node';
                div.innerHTML = '<span class="tn-code">' + esc(node.code) + '</span>'
                    + '<span class="tn-name">' + esc(node.name) + '</span>';
                div.addEventListener('click', function () {
                    if (editable) openChartForm(node.id, computeLevelIn(node.id), null);
                });
                box.appendChild(div);
            })(results[r]);
        }
    } else {
        /* حالت درخت */
        var roots = accounts.filter(function (a) { return !a.parent; });
        for (var i = 0; i < roots.length; i++) {
            box.appendChild(buildNode(roots[i], accounts, 1, editable));
        }
    }
}

/* ============================================================
   بخش ۲ — ساخت یک گره درخت
   ============================================================ */
function computeLevelIn(id) {
    var accounts = DB.load('accounts', []);
    var lvl = 1;
    var cur = accounts.find(function (a) { return a.id === id; });
    while (cur && cur.parent) {
        lvl++;
        cur = accounts.find(function (a) { return a.id === cur.parent; });
    }
    return lvl;
}

function buildNode(node, all, level, editable) {
    var wrap = document.createElement('div');
    var div = document.createElement('div');
    div.className = 'tree-node';

    var children = all.filter(function (a) { return a.parent === node.id; });
    var hasC = children.length > 0;
    var exp = state.expandedNodes[node.id] === true;

    var tog = document.createElement('span');
    tog.className = 'tree-toggle';
    tog.textContent = hasC ? (exp ? '▼' : '◀') : '•';
    if (!hasC) tog.style.visibility = 'hidden';
    tog.addEventListener('click', function (e) {
        e.stopPropagation();
        state.expandedNodes[node.id] = !exp;
        saveState(LS_KEYS.EXPANDED_NODES);
        renderChartTree('chart-tree', editable);
    });
    div.appendChild(tog);

    var icon = level === 1 ? '📁' : (level === 2 ? '📂' : '📄');
    var lN = level === 1 ? 'گروه' : (level === 2 ? 'کل' : (level === 3 ? 'معین' : 'تفصیلی'));

    var html = '<span class="tn-icon">' + icon + '</span>'
        + '<span class="tn-code">' + esc(node.code) + '</span>'
        + '<span class="tn-name">' + esc(node.name) + '</span>'
        + '<span class="tn-level">' + lN + '</span>';

    if (node.links && node.links.length > 0) {
        html += '<span class="tn-link">' + node.links.map(linkTypeName).join('، ') + '</span>';
    }
    if (node.cfEffect) {
        html += '<span class="tn-cf">💸 گردش وجه نقد</span>';
    }
    div.insertAdjacentHTML('beforeend', html);

    if (editable) {
        if (level < 3) {
            var aB = document.createElement('button');
            aB.className = 'tree-add-btn';
            aB.textContent = '+';
            aB.addEventListener('click', function (e) {
                e.stopPropagation();
                state.expandedNodes[node.id] = true;
                saveState(LS_KEYS.EXPANDED_NODES);
                openChartForm(null, level + 1, node.id);
            });
            div.appendChild(aB);
        }

        var dB = document.createElement('button');
        dB.className = 'tree-del-btn';
        dB.textContent = '×';
        dB.addEventListener('click', function (e) {
            e.stopPropagation();
            if (!confirm('حذف شود؟')) return;
            var accs = DB.load('accounts', []);
            var toDel = {};
            function collect(id) {
                toDel[id] = true;
                accs.forEach(function (a) {
                    if (a.parent === id) collect(a.id);
                });
            }
            collect(node.id);
            var nl = accs.filter(function (a) { return !toDel[a.id]; });
            DB.save('accounts', nl);
            renderChartTree('chart-tree', true);
        });
        div.appendChild(dB);
    }

    div.addEventListener('click', function (e) {
        if (e.target.classList.contains('tree-toggle')) return;
        if (e.target.classList.contains('tree-add-btn')) return;
        if (e.target.classList.contains('tree-del-btn')) return;
        if (editable) openChartForm(node.id, level, null);
    });
    wrap.appendChild(div);

    if (hasC && exp) {
        var cb = document.createElement('div');
        cb.className = 'tree-children';
        for (var i = 0; i < children.length; i++) {
            cb.appendChild(buildNode(children[i], all, level + 1, editable));
        }
        wrap.appendChild(cb);
    }
    return wrap;
}

/* ============================================================
   بخش ۳ — باز/بسته کردن همه
   ============================================================ */
function setAllExpanded(val) {
    var accounts = DB.load('accounts', []);
    state.expandedNodes = {};
    if (val) {
        for (var i = 0; i < accounts.length; i++) {
            state.expandedNodes[accounts[i].id] = true;
        }
    }
    saveState(LS_KEYS.EXPANDED_NODES);
    renderChartTree('chart-tree', true);
}

/* ============================================================
   بخش ۴ — فرم تعریف/ویرایش حساب
   ============================================================ */
function openChartForm(id, level, parentId) {
    var card = document.getElementById('chart-form-card');
    var accounts = DB.load('accounts', []);
    var node = id ? accounts.find(function (a) { return a.id === id; }) : null;

    card.style.display = 'block';

    var titles = { 1: 'گروه', 2: 'حساب کل', 3: 'حساب معین' };
    var titleEl = document.getElementById('chart-form-title');
    if (titleEl) {
        titleEl.textContent = node
            ? ('ویرایش ' + (titles[level] || ''))
            : ('تعریف ' + (titles[level] || 'حساب'));
    }

    document.getElementById('ch-id').value = node ? node.id : '';
    document.getElementById('ch-level').value = level;
    document.getElementById('ch-parent').value = node ? (node.parent || '') : (parentId || '');

    /* ساخت کد خودکار */
    var sc = '';
    if (!node) {
        if (parentId) {
            var par = accounts.find(function (a) { return a.id === parentId; });
            if (par) {
                var sib = accounts.filter(function (a) { return a.parent === parentId; });
                var w = level === 2 ? 2 : 3;
                var mx = 0;
                sib.forEach(function (s) {
                    var n = parseInt(s.code.split('-').pop()) || 0;
                    if (n > mx) mx = n;
                });
                sc = par.code + '-' + String(mx + 1).padStart(w, '0');
            }
        } else {
            var roots = accounts.filter(function (a) { return !a.parent; });
            var m = 0;
            roots.forEach(function (r) {
                var n = parseInt(r.code) || 0;
                if (n > m) m = n;
            });
            sc = String(m + 1);
        }
    }

    document.getElementById('ch-code').value = node ? node.code : sc;
    document.getElementById('ch-name').value = node ? node.name : '';
    document.getElementById('ch-cat').value = node ? (node.cat || 'permanent') : 'permanent';
    document.getElementById('ch-nature').value = node ? (node.nature || 'debit') : 'debit';
    document.getElementById('ch-active').checked = node ? (node.active !== false) : true;
    document.getElementById('ch-cf-effect').checked = node ? !!node.cfEffect : false;

    var nl = (node && node.links) ? node.links : [];
    var cbs = document.querySelectorAll('#ch-links-box input[type=checkbox]');
    for (var i = 0; i < cbs.length; i++) {
        cbs[i].checked = nl.indexOf(cbs[i].value) !== -1;
    }

    document.getElementById('ch-link-wrap').style.display = (level === 3) ? 'block' : 'none';
    document.getElementById('ch-cf-wrap').style.display = (level === 3) ? 'block' : 'none';

    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ============================================================
   بخش ۵ — بارگذاری چارت پیش‌فرض
   ============================================================ */
function loadDefaultChart() {
    var existing = DB.load('accounts', []);
    if (existing.length > 0) {
        alert('قبلاً تعریف شده.');
        return;
    }

    var accounts = [];
    var counter = 0;
    function add(code, name, parent, cat, nature, links, cfEffect) {
        counter++;
        accounts.push({
            id: 'a' + counter,
            code: code,
            name: name,
            parent: parent || '',
            cat: cat || 'permanent',
            nature: nature || 'debit',
            active: true,
            links: links || [],
            cfEffect: !!cfEffect
        });
        return 'a' + counter;
    }

    var g1 = add('1', 'دارایی‌ها', '', 'permanent', 'debit');
    var k11 = add('1-01', 'دارایی جاری', g1, 'permanent', 'debit');
    add('1-01-001', 'صندوق', k11, 'permanent', 'debit', ['cashbox'], true);
    add('1-01-002', 'بانک‌ها', k11, 'permanent', 'debit', ['bank'], true);
    add('1-01-003', 'حساب‌های دریافتنی', k11, 'permanent', 'debit', ['person', 'company']);

    var g2 = add('2', 'بدهی‌ها', '', 'permanent', 'credit');
    var k21 = add('2-01', 'بدهی جاری', g2, 'permanent', 'credit');
    add('2-01-001', 'حساب‌های پرداختنی', k21, 'permanent', 'credit', ['person', 'company']);
    add('2-01-002', 'تسهیلات بانکی پرداختنی', k21, 'permanent', 'credit', ['facility']);

    var g3 = add('3', 'سرمایه', '', 'permanent', 'credit');
    add('3-01', 'سرمایه اولیه', g3, 'permanent', 'credit');

    var g4 = add('4', 'درآمدها', '', 'temporary', 'credit');
    add('4-01', 'درآمد عملیاتی', g4, 'temporary', 'credit');

    var g5 = add('5', 'هزینه‌ها', '', 'temporary', 'debit');
    var k51 = add('5-01', 'هزینه‌های عمومی', g5, 'temporary', 'debit');
    add('5-01-001', 'هزینه ایاب و ذهاب', k51, 'temporary', 'debit', ['project']);
    add('5-01-002', 'هزینه ملزومات', k51, 'temporary', 'debit', ['project']);
    add('5-01-003', 'هزینه سوخت', k51, 'temporary', 'debit', ['project']);
    add('5-01-004', 'هزینه پذیرایی', k51, 'temporary', 'debit', ['project']);
    add('5-01-005', 'هزینه اجاره', k51, 'temporary', 'debit', ['project']);
    add('5-01-006', 'هزینه قبوض', k51, 'temporary', 'debit', ['project']);
    add('5-01-007', 'حقوق و دستمزد', k51, 'temporary', 'debit', ['project']);

    DB.save('accounts', accounts);
    showToast('✅ چارت پیش‌فرض بارگذاری شد.');
    state.expandedNodes = {};
    saveState(LS_KEYS.EXPANDED_NODES);
    renderChartTree('chart-tree', true);

    var ldc = document.getElementById('load-default-chart');
    if (ldc) ldc.disabled = true;

    if (typeof refreshTemplateSelect === 'function') refreshTemplateSelect();
}

/* ============================================================
   بخش ۶ — اتصال دکمه‌ها
   ============================================================ */
function bindChartForm() {
    var loadBtn = document.getElementById('load-default-chart');
    if (loadBtn) loadBtn.addEventListener('click', loadDefaultChart);

    var addGroupBtn = document.getElementById('add-group');
    if (addGroupBtn) addGroupBtn.addEventListener('click', function () {
        openChartForm(null, 1, null);
    });

    var saveBtn = document.getElementById('save-chart');
    if (saveBtn) saveBtn.addEventListener('click', function () {
        var id = document.getElementById('ch-id').value;
        var level = Number(document.getElementById('ch-level').value) || 1;
        var code = normalizeDigits(document.getElementById('ch-code').value.trim());
        var name = document.getElementById('ch-name').value.trim();
        if (!code || !name) { alert('کد و عنوان اجباری.'); return; }

        var links = [];
        var cbs = document.querySelectorAll('#ch-links-box input[type=checkbox]:checked');
        for (var li = 0; li < cbs.length; li++) links.push(cbs[li].value);

        var o = {
            id: id || uid(),
            code: code,
            name: name,
            parent: document.getElementById('ch-parent').value || '',
            level: level,
            cat: document.getElementById('ch-cat').value,
            nature: document.getElementById('ch-nature').value,
            links: (level === 3) ? links : [],
            cfEffect: (level === 3) ? document.getElementById('ch-cf-effect').checked : false,
            active: document.getElementById('ch-active').checked
        };

        var l = DB.load('accounts', []);
        if (id) {
            for (var i = 0; i < l.length; i++) {
                if (l[i].id === id) l[i] = o;
            }
        } else {
            l.push(o);
        }
        DB.save('accounts', l);
        showToast('✅ ذخیره شد');
        document.getElementById('chart-form-card').style.display = 'none';
        renderChartTree('chart-tree', true);
        if (loadBtn) loadBtn.disabled = true;
        if (typeof refreshTemplateSelect === 'function') refreshTemplateSelect();
    });

    var cancelBtn = document.getElementById('cancel-chart');
    if (cancelBtn) cancelBtn.addEventListener('click', function () {
        document.getElementById('chart-form-card').style.display = 'none';
    });

    var expBtn = document.getElementById('cd-expand');
    if (expBtn) expBtn.addEventListener('click', function () { setAllExpanded(true); });

    var colBtn = document.getElementById('cd-collapse');
    if (colBtn) colBtn.addEventListener('click', function () { setAllExpanded(false); });

    var searchEl = document.getElementById('charttree-search');
    if (searchEl) searchEl.addEventListener('input', function () {
        renderChartTree('chart-tree', true);
    });
}

/* ============================================================
   صادرسازی
   ============================================================ */
window.renderChartTree  = renderChartTree;
window.computeLevelIn   = computeLevelIn;
window.setAllExpanded   = setAllExpanded;
window.openChartForm    = openChartForm;
window.loadDefaultChart = loadDefaultChart;
window.bindChartForm    = bindChartForm;

console.log('✅ [modules/accounts/chart.js] loaded');
