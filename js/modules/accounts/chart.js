/* ============================================================
   پارسیس — چارت حساب‌ها (درخت)
   مسیر: js/modules/accounts/chart.js
   ✅ با چک وابستگی قبل از حذف
   ============================================================ */
'use strict';

var _chartFilter = {
    cat: '',
    nature: '',
    level: ''
};
var _chartFilterExpanded = {};

function _chartSortByCode(arr) {
    if (!arr || arr.length <= 1) return arr ? arr.slice() : [];
    return arr.slice().sort(function (a, b) {
        var ca = String(a.code || '').replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); });
        var cb = String(b.code || '').replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); });
        var pa = ca.split(/[-._\/]/).map(function (x) { return parseInt(x, 10) || 0; });
        var pb = cb.split(/[-._\/]/).map(function (x) { return parseInt(x, 10) || 0; });
        var n = Math.max(pa.length, pb.length);
        for (var i = 0; i < n; i++) {
            var va = pa[i] || 0;
            var vb = pb[i] || 0;
            if (va !== vb) return va - vb;
        }
        return ca.localeCompare(cb, 'fa');
    });
}

function _chartComputeLevel(acc, all) {
    if (!acc) return 1;
    var lvl = 1;
    var cur = acc;
    var safety = 0;
    while (cur && cur.parent && safety < 20) {
        lvl++;
        cur = all.find(function (x) { return x.id === cur.parent; });
        safety++;
    }
    return lvl;
}

function _chartMatchFilter(acc, all) {
    if (_chartFilter.cat && (acc.cat || 'permanent') !== _chartFilter.cat) return false;
    if (_chartFilter.nature && (acc.nature || 'debit') !== _chartFilter.nature) return false;
    if (_chartFilter.level) {
        var lvl = _chartComputeLevel(acc, all);
        if (String(lvl) !== String(_chartFilter.level)) return false;
    }
    return true;
}

function _chartHasActiveFilter() {
    return !!(_chartFilter.cat || _chartFilter.nature || _chartFilter.level);
}

function renderChartTree(cid, editable) {
    var box = document.getElementById(cid);
    if (!box) return;
    var accounts = DB.load('accounts', []);
    if (!Array.isArray(accounts)) accounts = [];
    box.innerHTML = '';

    _chartUpdateFilterStatus();

    if (accounts.length === 0) {
        box.innerHTML = '<p class="muted" style="text-align:center;padding:20px">حسابی تعریف نشده.</p>';
        return;
    }

    var sI = document.getElementById('charttree-search');
    var q = (sI && sI.value || '').trim().toLowerCase();
    var hasFilter = _chartHasActiveFilter();

    if (q) {
        var results = accounts.filter(function (a) {
            var match = (a.code || '').toLowerCase().indexOf(q) !== -1
                      || (a.name || '').toLowerCase().indexOf(q) !== -1;
            if (!match) return false;
            if (hasFilter && !_chartMatchFilter(a, accounts)) return false;
            return true;
        });

        results = _chartSortByCode(results);

        if (results.length === 0) {
            box.innerHTML = '<p class="muted" style="text-align:center;padding:20px">نتیجه‌ای یافت نشد.</p>';
            return;
        }

        for (var r = 0; r < results.length; r++) {
            (function (node) {
                var lvl = _chartComputeLevel(node, accounts);
                var lvlName = lvl === 1 ? 'گروه' : (lvl === 2 ? 'کل' : 'معین');
                var icon = lvl === 1 ? '📁' : (lvl === 2 ? '📂' : '📄');

                var extra = '';
                if (node.links && node.links.length > 0) {
                    extra += '<span class="tn-link">' + node.links.map(linkTypeName).join('، ') + '</span>';
                }
                if (node.cfEffect) extra += '<span class="tn-cf">💸</span>';
                if (node.active === false) extra += '<span class="tn-cf" style="background:#fee2e2;color:#991b1b">غیرفعال</span>';

                var div = document.createElement('div');
                div.className = 'tree-node';
                div.innerHTML = '<span class="tn-icon">' + icon + '</span>'
                    + '<span class="tn-code">' + esc(node.code) + '</span>'
                    + '<span class="tn-name">' + esc(node.name) + '</span>'
                    + '<span class="tn-level">' + lvlName + '</span>'
                    + extra;

                div.addEventListener('click', function (e) {
                    if (e.target.closest && e.target.closest('.tree-add-btn')) return;
                    if (e.target.closest && e.target.closest('.tree-del-btn')) return;
                    if (editable) openChartForm(node.id, lvl, null);
                });
                box.appendChild(div);
            })(results[r]);
        }
        return;
    }

    if (hasFilter) {
        var visibleIds = {};
        accounts.forEach(function (a) {
            if (_chartMatchFilter(a, accounts)) {
                visibleIds[a.id] = { self: true };
                var cur = a;
                var safety = 0;
                while (cur && cur.parent && safety < 20) {
                    safety++;
                    if (!visibleIds[cur.parent]) visibleIds[cur.parent] = { self: false };
                    cur = accounts.find(function (x) { return x.id === cur.parent; });
                }
            }
        });

        if (Object.keys(visibleIds).length === 0) {
            box.innerHTML = '<p class="muted" style="text-align:center;padding:20px">هیچ حسابی با این فیلترها یافت نشد.</p>';
            return;
        }

        Object.keys(visibleIds).forEach(function (id) {
            if (typeof _chartFilterExpanded[id] === 'undefined') _chartFilterExpanded[id] = true;
        });

        var roots = _chartSortByCode(accounts.filter(function (a) { return !a.parent; }));
        var anyShown = false;
        roots.forEach(function (root) {
            if (!visibleIds[root.id]) return;
            anyShown = true;
            box.appendChild(_chartBuildNodeFiltered(root, accounts, 1, editable, visibleIds));
        });

        if (!anyShown) {
            box.innerHTML = '<p class="muted" style="text-align:center;padding:20px">هیچ حسابی با این فیلترها یافت نشد.</p>';
        }
        return;
    }

    var normalRoots = _chartSortByCode(accounts.filter(function (a) { return !a.parent; }));
    for (var i = 0; i < normalRoots.length; i++) {
        box.appendChild(_chartBuildNode(normalRoots[i], accounts, 1, editable));
    }
}

function _chartUpdateFilterStatus() {
    var st = document.getElementById('chart-filter-status');
    if (!st) return;
    if (!_chartHasActiveFilter()) {
        st.style.display = 'none';
        st.innerHTML = '';
        return;
    }
    var parts = [];
    if (_chartFilter.cat) {
        var catLbl = _chartFilter.cat === 'permanent' ? 'دائمی' : (_chartFilter.cat === 'temporary' ? 'موقت' : 'مهم نیست');
        parts.push('نوع: ' + catLbl);
    }
    if (_chartFilter.nature) {
        var natLbl = _chartFilter.nature === 'debit' ? 'بدهکار' : (_chartFilter.nature === 'credit' ? 'بستانکار' : 'مهم نیست');
        parts.push('ماهیت: ' + natLbl);
    }
    if (_chartFilter.level) {
        var lvlLbl = _chartFilter.level === '1' ? 'گروه' : (_chartFilter.level === '2' ? 'کل' : 'معین');
        parts.push('طبقه: ' + lvlLbl);
    }
    st.style.display = 'block';
    st.innerHTML = '🔍 فیلتر فعال: ' + parts.join(' • ') + ' — گره‌های زردرنگ با فیلتر مطابق‌اند';
}

function _chartBuildNode(node, all, level, editable) {
    var wrap = document.createElement('div');
    var div = document.createElement('div');
    div.className = 'tree-node';

    var children = _chartSortByCode(all.filter(function (a) { return a.parent === node.id; }));
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
    var lN = level === 1 ? 'گروه' : (level === 2 ? 'کل' : 'معین');

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
    if (node.active === false) {
        html += '<span class="tn-cf" style="background:#fee2e2;color:#991b1b">غیرفعال</span>';
    }
    div.insertAdjacentHTML('beforeend', html);

    if (editable) {
        if (level < 3) {
            var aB = document.createElement('button');
            aB.className = 'tree-add-btn';
            aB.textContent = '+';
            aB.title = 'افزودن زیرمجموعه';
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
        dB.title = 'حذف';
        dB.addEventListener('click', function (e) {
            e.stopPropagation();
            _chartDeleteNode(node.id);
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
            cb.appendChild(_chartBuildNode(children[i], all, level + 1, editable));
        }
        wrap.appendChild(cb);
    }
    return wrap;
}

function _chartBuildNodeFiltered(node, all, level, editable, visibleIds) {
    var wrap = document.createElement('div');
    var div = document.createElement('div');
    div.className = 'tree-node';

    var children = _chartSortByCode(all.filter(function (a) {
        return a.parent === node.id && visibleIds[a.id];
    }));
    var hasC = children.length > 0;
    var exp = _chartFilterExpanded[node.id] === true;
    var isMatch = visibleIds[node.id] && visibleIds[node.id].self;

    if (isMatch) {
        div.style.background = 'linear-gradient(90deg, #fef3c7, #fde68a)';
        div.style.borderRight = '4px solid #f59e0b';
    } else {
        div.style.opacity = '0.7';
    }

    var tog = document.createElement('span');
    tog.className = 'tree-toggle';
    tog.textContent = hasC ? (exp ? '▼' : '◀') : '•';
    if (!hasC) tog.style.visibility = 'hidden';
    tog.addEventListener('click', function (e) {
        e.stopPropagation();
        _chartFilterExpanded[node.id] = !exp;
        renderChartTree('chart-tree', editable);
    });
    div.appendChild(tog);

    var icon = level === 1 ? '📁' : (level === 2 ? '📂' : '📄');
    var lN = level === 1 ? 'گروه' : (level === 2 ? 'کل' : 'معین');

    var html = '<span class="tn-icon">' + icon + '</span>'
        + '<span class="tn-code">' + esc(node.code) + '</span>'
        + '<span class="tn-name">' + esc(node.name) + '</span>'
        + '<span class="tn-level">' + lN + '</span>';

    if (node.links && node.links.length > 0) {
        html += '<span class="tn-link">' + node.links.map(linkTypeName).join('، ') + '</span>';
    }
    if (node.cfEffect) {
        html += '<span class="tn-cf">💸</span>';
    }
    if (node.active === false) {
        html += '<span class="tn-cf" style="background:#fee2e2;color:#991b1b">غیرفعال</span>';
    }
    if (isMatch) {
        html += '<span class="tn-cf" style="background:#f59e0b;color:#fff;font-weight:800">✓ مطابق</span>';
    }
    div.insertAdjacentHTML('beforeend', html);

    if (editable) {
        if (level < 3) {
            var aB = document.createElement('button');
            aB.className = 'tree-add-btn';
            aB.textContent = '+';
            aB.title = 'افزودن زیرمجموعه';
            aB.addEventListener('click', function (e) {
                e.stopPropagation();
                _chartFilterExpanded[node.id] = true;
                openChartForm(null, level + 1, node.id);
            });
            div.appendChild(aB);
        }
        var dB = document.createElement('button');
        dB.className = 'tree-del-btn';
        dB.textContent = '×';
        dB.title = 'حذف';
        dB.addEventListener('click', function (e) {
            e.stopPropagation();
            _chartDeleteNode(node.id);
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
            cb.appendChild(_chartBuildNodeFiltered(children[i], all, level + 1, editable, visibleIds));
        }
        wrap.appendChild(cb);
    }
    return wrap;
}

/* ============================================================
   ✅ _chartDeleteNode — با چک وابستگی
   ============================================================ */
function _chartDeleteNode(nodeId) {
    /* ✅ چک وابستگی‌ها (شامل زیرمجموعه‌ها) */
    if (typeof getDeleteIssues === 'function') {
        var issues = getDeleteIssues('chartAccount', nodeId);
        if (issues.length > 0) {
            var accs0 = DB.load('accounts', []);
            var node0 = accs0.find(function (a) { return a.id === nodeId; });
            var nodeName = node0 ? (node0.code + ' — ' + node0.name) : '';
            alert('⚠️ امکان حذف حساب' + (nodeName ? ' «' + nodeName + '»' : '') + ' وجود ندارد:\n\n• ' + issues.join('\n• ') + '\n\nابتدا وابستگی‌ها را حذف یا تغییر دهید.');
            return;
        }
    }

    if (!confirm('حذف شود؟ (تمام زیرمجموعه‌ها هم حذف می‌شوند)')) return;
    var accs = DB.load('accounts', []);
    var toDel = {};
    function collect(id) {
        toDel[id] = true;
        accs.forEach(function (a) {
            if (a.parent === id) collect(a.id);
        });
    }
    collect(nodeId);
    var nl = accs.filter(function (a) { return !toDel[a.id]; });
    DB.save('accounts', nl);
    renderChartTree('chart-tree', true);
    if (typeof showToast === 'function') showToast('🗑 حساب حذف شد');
}

function computeLevelIn(id) {
    var accounts = DB.load('accounts', []);
    return _chartComputeLevel(accounts.find(function (a) { return a.id === id; }), accounts);
}

function setAllExpanded(val) {
    var accounts = DB.load('accounts', []);
    state.expandedNodes = {};
    _chartFilterExpanded = {};
    if (val) {
        for (var i = 0; i < accounts.length; i++) {
            state.expandedNodes[accounts[i].id] = true;
            _chartFilterExpanded[accounts[i].id] = true;
        }
    }
    saveState(LS_KEYS.EXPANDED_NODES);
    renderChartTree('chart-tree', true);
}

function openChartForm(id, level, parentId) {
    var card = document.getElementById('chart-form-card');
    if (!card) return;
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

    var sc = '';
    if (!node) {
        if (parentId) {
            var par = accounts.find(function (a) { return a.id === parentId; });
            if (par) {
                var sib = accounts.filter(function (a) { return a.parent === parentId; });
                var w = level === 2 ? 2 : 3;
                var mx = 0;
                sib.forEach(function (s) {
                    var parts = String(s.code || '').split('-');
                    var n = parseInt(parts[parts.length - 1], 10) || 0;
                    if (n > mx) mx = n;
                });
                sc = par.code + '-' + String(mx + 1).padStart(w, '0');
            }
        } else {
            var roots = accounts.filter(function (a) { return !a.parent; });
            var m = 0;
            roots.forEach(function (r) {
                var n = parseInt(String(r.code || '').split('-')[0], 10) || 0;
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
    _chartFilterExpanded = {};
    saveState(LS_KEYS.EXPANDED_NODES);
    renderChartTree('chart-tree', true);

    var ldc = document.getElementById('load-default-chart');
    if (ldc) ldc.disabled = true;

    if (typeof refreshTemplateSelect === 'function') refreshTemplateSelect();
}

function bindChartForm() {
    var loadBtn = document.getElementById('load-default-chart');
    if (loadBtn && !loadBtn.dataset.bound) {
        loadBtn.dataset.bound = '1';
        loadBtn.addEventListener('click', loadDefaultChart);
    }

    var addGroupBtn = document.getElementById('add-group');
    if (addGroupBtn && !addGroupBtn.dataset.bound) {
        addGroupBtn.dataset.bound = '1';
        addGroupBtn.addEventListener('click', function () {
            openChartForm(null, 1, null);
        });
    }

    var saveBtn = document.getElementById('save-chart');
    if (saveBtn && !saveBtn.dataset.bound) {
        saveBtn.dataset.bound = '1';
        saveBtn.addEventListener('click', function () {
            var id = document.getElementById('ch-id').value;
            var level = Number(document.getElementById('ch-level').value) || 1;
            var code = normalizeDigits(document.getElementById('ch-code').value.trim());
            var name = document.getElementById('ch-name').value.trim();
            if (!code || !name) { alert('کد و عنوان اجباری.'); return; }

            var allAcc = DB.load('accounts', []);
            var dup = allAcc.filter(function (x) {
                return x.id !== id && String(x.code) === code;
            });
            if (dup.length > 0) {
                alert('⚠️ کد «' + code + '» قبلاً برای حساب «' + dup[0].name + '» استفاده شده است.');
                return;
            }

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
            document.getElementById('chart-form-card').style.display = 'none';
            renderChartTree('chart-tree', true);
            if (loadBtn) loadBtn.disabled = true;
            if (typeof refreshTemplateSelect === 'function') refreshTemplateSelect();

            if (_chartHasActiveFilter()) {
                var all2 = DB.load('accounts', []);
                var saved = all2.find(function (x) { return x.id === o.id; });
                if (saved && !_chartMatchFilter(saved, all2)) {
                    if (typeof showToast === 'function') showToast('✅ ذخیره شد — اما با فیلتر فعلی هم‌خوان نیست و از دید پنهان شد');
                    return;
                }
            }
            if (typeof showToast === 'function') showToast('✅ ذخیره شد');
        });
    }

    var cancelBtn = document.getElementById('cancel-chart');
    if (cancelBtn && !cancelBtn.dataset.bound) {
        cancelBtn.dataset.bound = '1';
        cancelBtn.addEventListener('click', function () {
            document.getElementById('chart-form-card').style.display = 'none';
        });
    }

    var expBtn = document.getElementById('cd-expand');
    if (expBtn && !expBtn.dataset.bound) {
        expBtn.dataset.bound = '1';
        expBtn.addEventListener('click', function () { setAllExpanded(true); });
    }

    var colBtn = document.getElementById('cd-collapse');
    if (colBtn && !colBtn.dataset.bound) {
        colBtn.dataset.bound = '1';
        colBtn.addEventListener('click', function () { setAllExpanded(false); });
    }

    var searchEl = document.getElementById('charttree-search');
    if (searchEl && !searchEl.dataset.bound) {
        searchEl.dataset.bound = '1';
        searchEl.addEventListener('input', function () {
            renderChartTree('chart-tree', true);
        });
    }

    var fCat = document.getElementById('chart-filter-cat');
    if (fCat) {
        fCat.value = _chartFilter.cat;
        if (!fCat.dataset.bound) {
            fCat.dataset.bound = '1';
            fCat.addEventListener('change', function () {
                _chartFilter.cat = this.value;
                _chartFilterExpanded = {};
                renderChartTree('chart-tree', true);
            });
        }
    }

    var fNat = document.getElementById('chart-filter-nature');
    if (fNat) {
        fNat.value = _chartFilter.nature;
        if (!fNat.dataset.bound) {
            fNat.dataset.bound = '1';
            fNat.addEventListener('change', function () {
                _chartFilter.nature = this.value;
                _chartFilterExpanded = {};
                renderChartTree('chart-tree', true);
            });
        }
    }

    var fLvl = document.getElementById('chart-filter-level');
    if (fLvl) {
        fLvl.value = _chartFilter.level;
        if (!fLvl.dataset.bound) {
            fLvl.dataset.bound = '1';
            fLvl.addEventListener('change', function () {
                _chartFilter.level = this.value;
                _chartFilterExpanded = {};
                renderChartTree('chart-tree', true);
            });
        }
    }

    var fClear = document.getElementById('chart-filter-clear');
    if (fClear && !fClear.dataset.bound) {
        fClear.dataset.bound = '1';
        fClear.addEventListener('click', function () {
            _chartFilter = { cat: '', nature: '', level: '' };
            _chartFilterExpanded = {};
            if (fCat) fCat.value = '';
            if (fNat) fNat.value = '';
            if (fLvl) fLvl.value = '';
            renderChartTree('chart-tree', true);
        });
    }
}

window.renderChartTree        = renderChartTree;
window.computeLevelIn         = computeLevelIn;
window.setAllExpanded         = setAllExpanded;
window.openChartForm          = openChartForm;
window.loadDefaultChart       = loadDefaultChart;
window.bindChartForm          = bindChartForm;
window._chartFilter           = _chartFilter;
window._chartSortByCode       = _chartSortByCode;

console.log('✅ [modules/accounts/chart.js] loaded — delete dependency check enabled');
