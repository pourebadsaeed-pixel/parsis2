/* پارسیس — پچ بهبودهای UX: تفصیلی ترکیبی، پرداخت قسط، گردش، پیامک */
'use strict';

/* =====================================================================
   ★ بخش ۱: توابع کمکی «استفاده‌شده در اسناد»
   ===================================================================== */
function isFiscalPeriodUsed(periodId) {
    if (!periodId) return false;
    var vs = DB.load('vouchers', []);
    return vs.some(function(v) { return v.periodId === periodId; });
}
function isAccountUsed(accountId) {
    if (!accountId) return false;
    var vs = DB.load('vouchers', []);
    for (var i = 0; i < vs.length; i++) {
        var lines = vs[i].lines || [];
        for (var j = 0; j < lines.length; j++) {
            if (lines[j].account === accountId) return true;
            if (lines[j].details) {
                for (var k in lines[j].details) {
                    if (lines[j].details[k] === accountId) return true;
                }
            }
        }
    }
    var accs = DB.load('accounts', []);
    return accs.some(function(a) { return a.parent === accountId; });
}
function isPersonUsed(personId) {
    if (!personId) return false;
    var vs = DB.load('vouchers', []);
    return vs.some(function(v) {
        return (v.lines || []).some(function(l) {
            return l.details && l.details.person === personId;
        });
    });
}
function isCompanyUsed(companyId) {
    if (!companyId) return false;
    var vs = DB.load('vouchers', []);
    return vs.some(function(v) {
        return (v.lines || []).some(function(l) {
            return l.details && l.details.company === companyId;
        });
    });
}
function isBankUsed(bankId) {
    if (!bankId) return false;
    var vs = DB.load('vouchers', []);
    return vs.some(function(v) {
        return (v.lines || []).some(function(l) {
            return l.details && l.details.bank === bankId;
        });
    });
}
function isCashBoxUsed(cbId) {
    if (!cbId) return false;
    var vs = DB.load('vouchers', []);
    return vs.some(function(v) {
        return (v.lines || []).some(function(l) {
            return l.details && l.details.cashbox === cbId;
        });
    });
}
function isProjectUsed(prjId) {
    if (!prjId) return false;
    var vs = DB.load('vouchers', []);
    return vs.some(function(v) {
        return (v.lines || []).some(function(l) {
            return l.details && l.details.project === prjId;
        });
    });
}
function isFacilityUsed(facId) {
    if (!facId) return false;
    var vs = DB.load('vouchers', []);
    return vs.some(function(v) {
        return (v.lines || []).some(function(l) {
            return l.details && l.details.facility === facId;
        });
    });
}
window.isFiscalPeriodUsed = isFiscalPeriodUsed;
window.isAccountUsed = isAccountUsed;
window.isPersonUsed = isPersonUsed;
window.isCompanyUsed = isCompanyUsed;
window.isBankUsed = isBankUsed;
window.isCashBoxUsed = isCashBoxUsed;
window.isProjectUsed = isProjectUsed;
window.isFacilityUsed = isFacilityUsed;

/* =====================================================================
   ★ بخش ۲: پچ attachRowActions — جلوگیری از حذف داده‌های استفاده‌شده
   ===================================================================== */
(function patchRowActions() {
    var _origAttach = window.attachRowActions;
    if (typeof _origAttach !== 'function') return;
    window.attachRowActions = function(tb, sk, rf, ef) {
        _origAttach.apply(this, arguments);
        var dls = tb.querySelectorAll('.row-btn.del');
        dls.forEach(function(btn) {
            var newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', function() {
                var id = this.getAttribute('data-id');
                var blockReason = checkDeleteBlocked(sk, id);
                if (blockReason) {
                    alert('⛔️ حذف امکان‌پذیر نیست:\n\n' + blockReason + '\n\nفقط ویرایش مجاز است.');
                    return;
                }
                if (!confirm('حذف شود؟')) return;
                var list = DB.load(sk);
                list = list.filter(function(x) { return x.id !== id; });
                DB.save(sk, list);
                rf();
                if (typeof updateHomeWidgets === 'function') updateHomeWidgets();
            });
        });
    };
    function checkDeleteBlocked(sk, id) {
        switch (sk) {
            case 'fiscalPeriods':
                if (isFiscalPeriodUsed(id)) return 'این دوره مالی در اسناد حسابداری استفاده شده است.';
                if (state.activePeriodId === id) return 'این دوره، دورهٔ فعال فعلی است. ابتدا دورهٔ دیگری را فعال کنید.';
                break;
            case 'persons':
                if (isPersonUsed(id)) return 'این شخص در اسناد حسابداری به‌عنوان تفصیلی استفاده شده است.';
                break;
            case 'companies':
                if (isCompanyUsed(id)) return 'این شرکت در اسناد حسابداری به‌عنوان تفصیلی استفاده شده است.';
                break;
            case 'bankAccounts':
                if (isBankUsed(id)) return 'این حساب بانکی در اسناد حسابداری استفاده شده است.';
                break;
            case 'cashBoxes':
                if (isCashBoxUsed(id)) return 'این صندوق در اسناد حسابداری استفاده شده است.';
                break;
            case 'projects':
                if (isProjectUsed(id)) return 'این پروژه در اسناد حسابداری استفاده شده است.';
                break;
            case 'accounts':
                if (isAccountUsed(id)) return 'این حساب در اسناد حسابداری استفاده شده یا فرزند دارد.';
                break;
        }
        return null;
    }
    window._checkDeleteBlocked = checkDeleteBlocked;
})();

/* =====================================================================
   ★ بخش ۳: پچ رسم ستون تفصیلی ترکیبی در فرم سند
   ★ توجه: این پچ روی نسخه فایل ۰۴ اعمال می‌شود ولی فایل ۱۶ نسخه
   نهایی را جایگزین می‌کند و این پچ عملاً override می‌شود.
   ===================================================================== */
(function patchCombinedDetailColumn() {
    var _orig = window.renderVoucherLines;
    if (typeof _orig !== 'function') return;

    window.renderVoucherLines = function() {
        var box = document.getElementById('voucher-lines');
        if (!box) return _orig.apply(this, arguments);
        _orig.apply(this, arguments);

        var accounts = DB.load('accounts', []);
        var lines = box.querySelectorAll('.voucher-line');
        lines.forEach(function(wrap, idx) {
            var line = voucherLines[idx];
            if (!line) return;
            var acc = accounts.find(function(a) { return a.id === line.account; });
            if (!acc || !acc.links || acc.links.length < 2) return;

            var detailDivs = wrap.querySelectorAll('.ln-search-row');
            if (detailDivs.length < 2) return;
            var firstInput = detailDivs[0].querySelector('input');
            var firstSelect = detailDivs[0].querySelector('select');
            if (!firstSelect) return;

            var combined = [];
            acc.links.forEach(function(lt) {
                var items = getLinkedItems(lt);
                items.forEach(function(it) {
                    combined.push({
                        linkType: lt,
                        id: it.id,
                        label: linkTypeName(lt) + ': ' + getLinkedItemLabel(lt, it)
                    });
                });
            });

            var currentLT = null, currentID = null;
            acc.links.forEach(function(lt) {
                if (line.details && line.details[lt]) {
                    currentLT = lt; currentID = line.details[lt];
                }
            });

            firstSelect.innerHTML = '';
            var ph = document.createElement('option');
            ph.value = ''; ph.textContent = '— تفصیلی ترکیبی —';
            firstSelect.appendChild(ph);
            combined.forEach(function(c) {
                var o = document.createElement('option');
                o.value = c.linkType + '::' + c.id;
                o.textContent = c.label;
                if (c.linkType === currentLT && c.id === currentID) o.selected = true;
                firstSelect.appendChild(o);
            });
            firstSelect.dataset.combined = '1';
            if (firstInput) firstInput.placeholder = '🔍 تفصیلی ترکیبی...';

            var newSel = firstSelect.cloneNode(true);
            firstSelect.parentNode.replaceChild(newSel, firstSelect);
            newSel.addEventListener('change', function() {
                var v = this.value;
                line.details = {};
                if (v) {
                    var parts = v.split('::');
                    line.details[parts[0]] = parts[1];
                }
            });
            if (firstInput) {
                var newInput = firstInput.cloneNode(true);
                firstInput.parentNode.replaceChild(newInput, firstInput);
                newInput.addEventListener('input', function() {
                    var q = normalizeDigits(this.value.trim().toLowerCase());
                    var cur = newSel.value;
                    newSel.innerHTML = '';
                    var ph2 = document.createElement('option');
                    ph2.value = ''; ph2.textContent = '— تفصیلی ترکیبی —';
                    newSel.appendChild(ph2);
                    combined.forEach(function(c) {
                        if (!q || c.label.toLowerCase().indexOf(q) !== -1) {
                            var o = document.createElement('option');
                            o.value = c.linkType + '::' + c.id;
                            o.textContent = c.label;
                            if (o.value === cur) o.selected = true;
                            newSel.appendChild(o);
                        }
                    });
                });
            }

            for (var d = detailDivs.length - 1; d >= 1; d--) {
                detailDivs[d].parentNode.removeChild(detailDivs[d]);
            }
        });
    };
})();

/* =====================================================================
   ★ بخش ۴: تنظیم getVoucherIssues — بررسی تفصیلی ترکیبی
   ===================================================================== */
(function patchVoucherIssuesForCombined() {
    var _orig = window.getVoucherIssues;
    if (typeof _orig !== 'function') return;
    window.getVoucherIssues = function(v) {
        var issues = _orig.apply(this, arguments);
        var accounts = DB.load('accounts', []);
        (v.lines || []).forEach(function(line, i) {
            if (!line.account) return;
            var acc = accounts.find(function(a) { return a.id === line.account; });
            if (!acc || !acc.links || acc.links.length < 2) return;
            var filled = acc.links.filter(function(lt) { return line.details && line.details[lt]; });
            if (filled.length === 0) {
                var msg = 'ردیف ' + toFa(i + 1) + ': تفصیلی ترکیبی انتخاب نشده';
                if (issues.indexOf(msg) === -1) issues.push(msg);
            }
        });
        return issues;
    };
})();

/* =====================================================================
   ★ بخش ۵: جلوگیری از حذف معین از چارت
   ===================================================================== */
(function patchChartTreeDelete() {
    var _orig = window.renderChartTree;
    if (typeof _orig !== 'function') return;
    window.renderChartTree = function(cid, editable) {
        _orig.apply(this, arguments);
        if (!editable) return;
        var box = document.getElementById(cid);
        if (!box) return;
        box.querySelectorAll('.tree-del-btn').forEach(function(btn) {
            var nodeDiv = btn.closest('.tree-node');
            if (!nodeDiv) return;
            var codeEl = nodeDiv.querySelector('.tn-code');
            if (!codeEl) return;
            var code = codeEl.textContent.trim();
            var accs = DB.load('accounts', []);
            var acc = accs.find(function(a) { return a.code === code; });
            if (!acc) return;
            var reason = window._checkDeleteBlocked('accounts', acc.id);
            if (reason) {
                btn.style.opacity = '0.35';
                btn.title = 'غیرقابل حذف: ' + reason;
                var newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                newBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    alert('⛔️ ' + reason + '\n\nفقط ویرایش مجاز است.');
                });
            }
        });
    };
})();

/* =====================================================================
   ★ بخش ۷: ستون رفرنس دوره مالی در فهرست اسناد
   ===================================================================== */
(function patchVoucherListFiscalRef() {
    var _orig = window.renderVoucherList;
    if (typeof _orig !== 'function') return;
    window.renderVoucherList = function() {
        _orig.apply(this, arguments);
        var tb = document.getElementById('voucher-list-body');
        if (!tb) return;
        var periods = DB.load('fiscalPeriods', []);
        var pMap = {};
        periods.forEach(function(p) { pMap[p.id] = p; });
        var vouchers = DB.load('vouchers', []);
        var vMap = {};
        vouchers.forEach(function(v) { vMap[v.id] = v; });

        Array.prototype.forEach.call(tb.querySelectorAll('tr'), function(tr) {
            var firstCell = tr.querySelector('td');
            if (!firstCell) return;
            var numCell = firstCell.textContent.trim();
            var v = vouchers.find(function(x) { return toFa(x.number) === numCell || x.number === numCell; });
            if (!v) return;
            tr.dataset.fiscalId = v.periodId || '';
            tr.title = v.periodId ? ('دوره: ' + (pMap[v.periodId] ? pMap[v.periodId].title : '?')) : 'بدون دوره';
        });
    };
})();

/* =====================================================================
   ★ بخش ۹: جابجایی دکمه 🧹 شرح به قبل از +
   ★ توجه: فایل ۱۶ نسخه نهایی را جایگزین می‌کند و این پچ عملاً override می‌شود.
   ===================================================================== */
(function patchDescRowButtons() {
    var _orig = window.renderVoucherLines;
    if (typeof _orig !== 'function') return;
    window.renderVoucherLines = (function(orig) {
        return function() {
            orig.apply(this, arguments);
            var box = document.getElementById('voucher-lines');
            if (!box) return;
            box.querySelectorAll('.desc-row').forEach(function(row) {
                if (row.dataset.reordered === '1') return;
                row.dataset.reordered = '1';
                var addBtn = row.querySelector('.desc-add-btn');
                if (!addBtn) return;
                /* ★ اگر از قبل دکمه‌ی clear-desc وجود داشت، پچ نکن */
                if (row.querySelector('.desc-clear-btn')) return;
                var clearBtn = document.createElement('button');
                clearBtn.type = 'button';
                clearBtn.className = 'desc-clear-btn';
                clearBtn.title = 'خالی کردن شرح این قلم';
                clearBtn.textContent = '🧹';
                clearBtn.style.cssText = 'background:#fee2e2;color:#dc2626;border:none;border-radius:10px;width:38px;height:38px;font-size:1.05rem;font-weight:800;cursor:pointer;flex-shrink:0';
                clearBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    var inp = row.querySelector('input[type=text]');
                    if (inp) {
                        inp.value = '';
                        inp.classList.remove('desc-required');
                        inp.dispatchEvent(new Event('input', { bubbles: true }));
                        inp.focus();
                    }
                });
                row.insertBefore(clearBtn, addBtn);
                row.style.gridTemplateColumns = '1fr auto auto';
            });
        };
    })(_orig);
})();

/* =====================================================================
   ★ بخش ۱۰: آیکن پرکاربرد بسته باشد
   ===================================================================== */
(function patchFrequentNavCollapsed() {
    function collapseFrequent() {
        var g = document.getElementById('nav-frequent-group');
        if (!g) return;
        g.classList.add('collapsed');
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(collapseFrequent, 900); });
    } else {
        setTimeout(collapseFrequent, 900);
    }
    if (typeof window.renderFrequentNav === 'function') {
        var _orig = window.renderFrequentNav;
        window.renderFrequentNav = function() {
            _orig.apply(this, arguments);
            collapseFrequent();
        };
    }
})();

/* =====================================================================
   ★ بخش ۱۱: حذف ردیف فیلتر از پرینت/اشتراک
   ===================================================================== */
(function patchShareAndPrintFilterRows() {
    if (typeof window.shareAsImage === 'function') {
        var _orig = window.shareAsImage;
        window.shareAsImage = function(el, title, filename) {
            var hiddenRows = [];
            if (el) {
                el.querySelectorAll('tr.column-filter-row').forEach(function(r) {
                    hiddenRows.push({ el: r, old: r.style.display });
                    r.style.display = 'none';
                });
                el.querySelectorAll('.filters-toggle-btn, .col-filter-btn').forEach(function(b) {
                    hiddenRows.push({ el: b, old: b.style.display });
                    b.style.display = 'none';
                });
            }
            return _orig.apply(this, arguments).finally(function() {
                hiddenRows.forEach(function(x) { x.el.style.display = x.old; });
            });
        };
    }
})();

/* =====================================================================
   ★ بخش ۱۲: گروه‌بندی صندوق پیامک‌ها در تب‌ها
   ===================================================================== */
(function patchSmsGroupingTabs() {
    function injectSmsTabs() {
        var page = document.getElementById('page-sms');
        if (!page) return;
        var pendingCard = document.querySelector('#page-sms .card #pending-sms-list');
        if (!pendingCard) return;
        if (document.getElementById('sms-group-tabs')) return;

        var tabs = document.createElement('div');
        tabs.id = 'sms-group-tabs';
        tabs.className = 'tabs';
        tabs.style.marginBottom = '16px';
        tabs.innerHTML =
            '<button class="tab-btn active" data-sms-group="pending">🔔 ثبت‌نشده (<span id="sms-pending-count-tab">۰</span>)</button>' +
            '<button class="tab-btn" data-sms-group="inbox">📥 صندوق (<span id="sms-inbox-count-tab">۰</span>)</button>' +
            '<button class="tab-btn" data-sms-group="registered">✅ ثبت‌شده</button>' +
            '<button class="tab-btn" data-sms-group="ignored">🚫 نادیده</button>';

        var firstCard = page.querySelector('.card');
        if (firstCard) {
            page.insertBefore(tabs, firstCard);
        } else {
            page.appendChild(tabs);
        }

        var state = { group: 'pending' };

        function applyFilter() {
            var pendingCard = page.querySelectorAll('.card')[0];
            var methodsCard = page.querySelectorAll('.card')[1];
            var pasteCard = page.querySelectorAll('.card')[2];
            var inboxCard = page.querySelectorAll('.card')[3];
            var allCards = [pendingCard, methodsCard, pasteCard, inboxCard];

            allCards.forEach(function(c) { if (c) c.style.display = 'none'; });

            if (state.group === 'pending') {
                if (pendingCard) pendingCard.style.display = '';
                if (methodsCard) methodsCard.style.display = '';
                if (pasteCard) pasteCard.style.display = '';
            } else if (state.group === 'inbox') {
                if (inboxCard) inboxCard.style.display = '';
                filterInboxBy(null);
            } else if (state.group === 'registered') {
                if (inboxCard) inboxCard.style.display = '';
                filterInboxBy('converted');
            } else if (state.group === 'ignored') {
                if (inboxCard) inboxCard.style.display = '';
                filterInboxBy('ignored');
            }
        }

        function filterInboxBy(status) {
            var items = document.querySelectorAll('#sms-inbox-list .sms-item');
            items.forEach(function(it) {
                var isConv = it.classList.contains('status-converted');
                var isIgn = it.classList.contains('status-ignored');
                var show = true;
                if (status === 'converted') show = isConv;
                else if (status === 'ignored') show = isIgn;
                it.style.display = show ? '' : 'none';
            });
        }

        tabs.querySelectorAll('[data-sms-group]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                tabs.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
                this.classList.add('active');
                state.group = this.getAttribute('data-sms-group');
                applyFilter();
            });
        });

        window._refreshSmsTabCounts = function() {
            var pc = (typeof getPendingSmsCount === 'function') ? getPendingSmsCount() : 0;
            var inbox = (typeof getSmsInbox === 'function') ? getSmsInbox() : [];
            var el1 = document.getElementById('sms-pending-count-tab');
            var el2 = document.getElementById('sms-inbox-count-tab');
            if (el1) el1.textContent = toFa(pc);
            if (el2) el2.textContent = toFa(inbox.length);
        };
        window._refreshSmsTabCounts();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(injectSmsTabs, 1200); });
    } else {
        setTimeout(injectSmsTabs, 1200);
    }

    if (typeof window.renderSmsInbox === 'function') {
        var _orig = window.renderSmsInbox;
        window.renderSmsInbox = function() {
            _orig.apply(this, arguments);
            if (window._refreshSmsTabCounts) window._refreshSmsTabCounts();
            var activeTab = document.querySelector('#sms-group-tabs .tab-btn.active');
            if (activeTab) {
                var g = activeTab.getAttribute('data-sms-group');
                setTimeout(function() {
                    var items = document.querySelectorAll('#sms-inbox-list .sms-item');
                    items.forEach(function(it) {
                        if (g === 'registered') it.style.display = it.classList.contains('status-converted') ? '' : 'none';
                        else if (g === 'ignored') it.style.display = it.classList.contains('status-ignored') ? '' : 'none';
                        else it.style.display = '';
                    });
                }, 50);
            }
        };
    }
    if (typeof window.renderPendingSmsBox === 'function') {
        var _origPending = window.renderPendingSmsBox;
        window.renderPendingSmsBox = function() {
            _origPending.apply(this, arguments);
            if (window._refreshSmsTabCounts) window._refreshSmsTabCounts();
        };
    }
})();

/* =====================================================================
   ★ بخش ۱۳: ویرایش سند از مودال گردش حساب
   ===================================================================== */
(function patchTurnoverEditLinks() {
    var _orig = window.openAccountTurnover;
    if (typeof _orig !== 'function') return;
    window.openAccountTurnover = function(accountId, detailInfo) {
        var res = _orig.apply(this, arguments);
        setTimeout(function() {
            var body = document.getElementById('turnover-body');
            if (!body) return;
            var table = body.querySelector('table');
            if (!table) return;
            var tbody = table.querySelector('tbody');
            if (!tbody) return;
            var rows = tbody.querySelectorAll('tr');
            rows.forEach(function(tr) {
                tr.style.cursor = 'pointer';
                tr.title = 'کلیک برای ویرایش سند';
                tr.classList.add('turnover-clickable');
                tr.addEventListener('click', function(e) {
                    if (e.target.closest('button')) return;
                    var cells = tr.querySelectorAll('td');
                    if (cells.length < 3) return;
                    var numTxt = cells[2].textContent.trim();
                    var numVal = normalizeDigits(numTxt).replace(/[^\d]/g, '');
                    var v = DB.load('vouchers', []).find(function(x) {
                        return String(normalizeDigits(String(x.number))).replace(/[^\d]/g, '') === numVal;
                    });
                    if (v && typeof openVoucherForEditById === 'function') {
                        openVoucherForEditById(v.id);
                    }
                });
            });
        }, 100);
        return res;
    };
})();

/* =====================================================================
   ★★★ بخش ۱۴ (حذف شده): تنها مانده / فقط حساب‌های دارای مانده
   ★ چک‌باکس‌های rt-only-balance و rc-only-balance دیگر ساخته نمی‌شوند.
   ★ چک‌باکس ra-only-balance در فایل ۱۵ مدیریت می‌شود.
   ===================================================================== */

/* =====================================================================
   ★ بخش ۲۰: پرداخت قسط + ساخت سند خودکار
   ===================================================================== */
(function patchFacilityMoeinSelect() {
    function refresh() {
        var sel = document.getElementById('fc-moein');
        if (!sel) return;
        var accounts = DB.load('accounts', []);
        var leaves = accounts.filter(function(a) { return !accounts.some(function(x) { return x.parent === a.id; }); });
        var facilityAccounts = leaves.filter(function(a) { return a.links && a.links.indexOf('facility') !== -1; });
        sel.innerHTML = '<option value="">— معین تسهیلات (اختیاری) —</option>';
        facilityAccounts.forEach(function(a) {
            var o = document.createElement('option');
            o.value = a.id;
            o.textContent = a.code + ' — ' + a.name;
            sel.appendChild(o);
        });
    }
    function injectField() {
        var card = document.querySelector('#tab-fac-add .card');
        if (!card) return;
        if (document.getElementById('fc-moein')) return;
        var field = document.createElement('div');
        field.className = 'field';
        field.innerHTML = '<label>معین تسهیلات (برای ساخت سند پرداخت قسط)</label><select id="fc-moein"></select>';
        var ref = document.getElementById('fc-bank');
        if (ref) {
            ref.closest('.field').parentNode.insertBefore(field, ref.closest('.field').nextSibling);
        } else {
            card.appendChild(field);
        }
        refresh();
    }
    if (typeof window.loadFacilityIntoForm === 'function') {
        var _orig = window.loadFacilityIntoForm;
        window.loadFacilityIntoForm = function(f) {
            _orig.apply(this, arguments);
            refresh();
            var sel = document.getElementById('fc-moein');
            if (sel) sel.value = f.moeinId || '';
        };
    }
    if (typeof window.loadFacilityForInstallments === 'function') {
        var _orig2 = window.loadFacilityForInstallments;
        window.loadFacilityForInstallments = function(f) {
            _orig2.apply(this, arguments);
            refresh();
            var sel = document.getElementById('fc-moein');
            if (sel) sel.value = f.moeinId || '';
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(injectField, 1100); });
    } else {
        setTimeout(injectField, 1100);
    }
    window._refreshFacilityMoein = refresh;
})();

(function patchSaveFacility() {
    var btn = document.getElementById('save-fac');
    if (!btn) return;
    btn.addEventListener('click', function() {
        setTimeout(function() {
            var moeinSel = document.getElementById('fc-moein');
            var vId = document.getElementById('fc-id').value;
            if (!moeinSel || !vId) return;
            var l = DB.load('facilities', []);
            var idx = -1;
            for (var i = 0; i < l.length; i++) if (l[i].id === vId) { idx = i; break; }
            if (idx === -1) return;
            l[idx].moeinId = moeinSel.value;
            DB.save('facilities', l);
        }, 100);
    }, true);
})();

(function patchInstallmentPayButtons() {
    var _origRender = window.renderInstallments;
    if (typeof _origRender !== 'function') return;
    window.renderInstallments = function() {
        _origRender.apply(this, arguments);
        setTimeout(function() {
            var box = document.getElementById('fac-installments');
            if (!box) return;
            var rows = box.querySelectorAll('.installment-row');
            rows.forEach(function(row, idx) {
                if (row.querySelector('.inst-pay-btn')) return;
                var ins = currentInstallments[idx];
                if (!ins) return;
                if (ins.status === 'paid') {
                    var tag = document.createElement('div');
                    tag.style.cssText = 'font-size:0.72rem;color:#059669;font-weight:800;padding:4px 10px;background:#d1fae5;border-radius:9px';
                    tag.textContent = '✅ پرداخت‌شده' + (ins.systemPaid ? ' (سیستمی)' : '');
                    row.appendChild(tag);
                    return;
                }
                var payBtn = document.createElement('button');
                payBtn.type = 'button';
                payBtn.className = 'inst-pay-btn';
                payBtn.textContent = '💳 پرداخت';
                payBtn.title = 'پرداخت قسط و ساخت سند خودکار';
                payBtn.style.cssText = 'background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:10px;padding:7px 12px;font-family:inherit;font-size:0.78rem;font-weight:800;cursor:pointer';
                payBtn.addEventListener('click', function() {
                    payInstallment(currentFacilityId, idx);
                });
                row.appendChild(payBtn);
            });
        }, 60);
    };
})();

async function payInstallment(facilityId, installmentIdx) {
    var facilities = DB.load('facilities', []);
    var f = facilities.find(function(x) { return x.id === facilityId; });
    if (!f) { alert('تسهیلات یافت نشد.'); return; }
    var ins = (f.installments || [])[installmentIdx];
    if (!ins) { alert('قسط یافت نشد.'); return; }
    if (ins.status === 'paid') { alert('این قسط قبلاً پرداخت شده است.'); return; }
    if (!ins.amount || !ins.date) { alert('تاریخ و مبلغ قسط باید مشخص باشد.'); return; }
    if (!f.moeinId) {
        alert('⚠️ ابتدا معین تسهیلات را برای این تسهیلات تعریف کنید.\n(فیلد «معین تسهیلات» در فرم تعریف تسهیلات)');
        return;
    }
    if (!f.bankId) {
        alert('⚠️ ابتدا بانک تسهیلات را انتخاب کنید.');
        return;
    }
    var bank = DB.load('bankAccounts', []).find(function(b) { return b.id === f.bankId; });
    var bankTitle = bank ? (bank.bank + ' — ' + (bank.account || '')) : '—';
    var msg = 'پرداخت قسط:\n\n' +
        'تاریخ: ' + ins.date + '\n' +
        'مبلغ: ' + formatMoney(ins.amount) + ' ' + currencyLabel() + '\n' +
        'بانک: ' + bankTitle + '\n' +
        'معین تسهیلات: ' + (DB.load('accounts', []).find(function(a) { return a.id === f.moeinId; }) || {}).name + '\n\n' +
        'سند خودکار ساخته شود؟';
    if (!confirm(msg)) return;

    var bankMoein = (typeof getBankMoeinId === 'function') ? getBankMoeinId() : '';
    if (!bankMoein) { alert('معین بانک در چارت تعریف نشده.'); return; }
    var accounts = DB.load('accounts', []);
    var facAcc = accounts.find(function(a) { return a.id === f.moeinId; });
    var hasFacilityLink = facAcc && facAcc.links && facAcc.links.indexOf('facility') !== -1;

    var date = ins.date;
    var dv = validateDateInActivePeriod(date);
    if (!dv.ok) { alert('⚠️ ' + dv.msg); return; }

    var description = 'پرداخت قسط ' + (ins.date) + ' — ' + f.name;
    var lines = [];

    var facDetails = hasFacilityLink ? { facility: f.id } : {};
    lines.push({
        id: uid(),
        account: f.moeinId,
        details: facDetails,
        debit: Number(ins.amount) || 0,
        credit: 0,
        description: description
    });

    lines.push({
        id: uid(),
        account: bankMoein,
        details: { bank: f.bankId },
        debit: 0,
        credit: Number(ins.amount) || 0,
        description: description,
        locked: true
    });

    var vouchers = DB.load('vouchers', []);
    var v = {
        id: uid(),
        number: (typeof getNextVoucherNumberForPeriod === 'function')
                ? getNextVoucherNumberForPeriod(state.activePeriodId || '')
                : String(vouchers.length + 1),
        date: date,
        type: 'general',
        periodId: state.activePeriodId || '',
        desc: description,
        lines: lines,
        status: 'draft'
    };

    facilities.forEach(function(ff) {
        if (ff.id === facilityId) {
            ff.installments[installmentIdx].status = 'paid';
            ff.installments[installmentIdx].systemPaid = true;
            ff.installments[installmentIdx].systemVoucherId = v.id;
            ff.installments[installmentIdx].paidAt = Date.now();
            var tp = ff.installments.reduce(function(s, x) { return s + (x.status === 'paid' ? Number(x.amount || 0) : 0); }, 0);
            ff.paid = tp;
            var allPaid = ff.installments.every(function(x) { return x.status === 'paid'; });
            ff.status = allPaid ? 'settled' : 'active';
        }
    });
    DB.save('facilities', facilities);
    vouchers.push(v);
    DB.save('vouchers', vouchers);

    showToast('✅ قسط پرداخت شد — سند خودکار ساخته شد.');
    if (typeof renderFacilitiesList === 'function') renderFacilitiesList();
    if (typeof updateHomeWidgets === 'function') updateHomeWidgets();

    if (typeof loadVoucherForEdit === 'function') {
        loadVoucherForEdit(v);
    }
    if (typeof goToPage === 'function') goToPage('voucher-new');
}
window.payInstallment = payInstallment;

/* =====================================================================
   ★ بخش ۲۲: استایل خوش‌آمدگویی + قسط + وضعیت سند
   ===================================================================== */
(function injectStyles() {
    var css = ''
    + '/* ---- Welcome Screen ---- */'
    + '.welcome-overlay { position:fixed; inset:0; z-index:9999; '
    +   'background:radial-gradient(circle at 25% 20%, #1e3a8a 0%, #0f172a 45%, #4c1d95 100%); '
    +   'display:flex; flex-direction:column; align-items:center; justify-content:space-between; '
    +   'padding:24px 16px; cursor:pointer; direction:rtl; '
    +   'opacity:1; transition:opacity 0.5s, transform 0.6s; }'
    + '.welcome-overlay.welcome-out { opacity:0; transform:scale(1.05); pointer-events:none; }'
    + '.welcome-overlay::before { content:""; position:absolute; inset:0; '
    +   'background-image:radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0); '
    +   'background-size:32px 32px; opacity:0.5; pointer-events:none; }'
    + '.welcome-top { text-align:center; color:rgba(255,255,255,0.9); z-index:1; '
    +   'animation:wgSlideDown 0.7s ease both; }'
    + '.welcome-date { font-size:1.05rem; font-weight:800; letter-spacing:0.3px; }'
    + '.welcome-date-greg { font-size:0.78rem; color:rgba(255,255,255,0.6); direction:ltr; margin-top:2px; }'
    + '.welcome-center { text-align:center; color:#fff; z-index:1; }'
    + '.welcome-logo { font-size:5rem; line-height:1; filter:drop-shadow(0 8px 30px rgba(129,140,248,0.6)); '
    +   'animation:wgPop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both; animation-delay:0.2s; }'
    + '.welcome-title { font-size:3rem; font-weight:900; letter-spacing:-1px; margin-top:14px; '
    +   'background:linear-gradient(135deg, #fff 0%, #a5b4fc 50%, #f0abfc 100%); '
    +   '-webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; '
    +   'animation:wgPop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both; animation-delay:0.5s; }'
    + '.welcome-subtitle { font-size:1rem; color:rgba(255,255,255,0.75); margin-top:4px; '
    +   'animation:wgPop 0.7s ease both; animation-delay:0.8s; }'
    + '.welcome-version { font-size:0.75rem; color:rgba(255,255,255,0.5); margin-top:6px; '
    +   'animation:wgPop 0.7s ease both; animation-delay:1s; }'
    + '.welcome-chart-wrap { width:min(420px, 92vw); text-align:center; z-index:1; '
    +   'animation:wgFadeIn 0.8s ease both; animation-delay:1.4s; }'
    + '.welcome-chart-title { color:rgba(255,255,255,0.85); font-weight:800; font-size:0.9rem; margin-bottom:10px; }'
    + '.welcome-chart { display:flex; justify-content:center; margin-bottom:14px; }'
    + '.welcome-legend { display:flex; flex-direction:column; gap:8px; }'
    + '.wl-item { display:grid; grid-template-columns:16px 1fr auto auto; gap:10px; '
    +   'align-items:center; padding:10px 14px; border-radius:14px; '
    +   'background:rgba(255,255,255,0.08); backdrop-filter:blur(10px); '
    +   'border:1px solid rgba(255,255,255,0.12); color:#fff; font-size:0.85rem; }'
    + '.wl-color { width:14px; height:14px; border-radius:4px; }'
    + '.wl-color.in { background:linear-gradient(135deg,#34d399,#059669); }'
    + '.wl-color.out { background:linear-gradient(135deg,#f87171,#dc2626); }'
    + '.wl-label { font-weight:800; text-align:right; }'
    + '.wl-amount { font-weight:800; font-variant-numeric:tabular-nums; direction:ltr; }'
    + '.wl-pct { background:rgba(255,255,255,0.15); padding:3px 10px; border-radius:10px; font-weight:800; font-size:0.78rem; }'
    + '.welcome-hint { color:rgba(255,255,255,0.6); font-size:0.85rem; font-weight:700; '
    +   'animation:wgPulse 2s ease-in-out infinite; z-index:1; }'
    + '@keyframes wgSlideDown { from { opacity:0; transform:translateY(-16px); } to { opacity:1; transform:none; } }'
    + '@keyframes wgPop { from { opacity:0; transform:scale(0.6); } to { opacity:1; transform:scale(1); } }'
    + '@keyframes wgFadeIn { from { opacity:0; } to { opacity:1; } }'
    + '@keyframes wgSlide { from { opacity:0; transform:translateX(-14px); } to { opacity:1; transform:none; } }'
    + '@keyframes wgPulse { 0%,100% { opacity:0.6; } 50% { opacity:1; } }'
    + '@keyframes wgDraw { to { stroke-dashoffset: var(--dash-target, 0); } }'
    + '@keyframes wgDrawInc { to { stroke-dasharray: var(--inc-len, 0) 10000; } }'
    + '/* ---- Voucher Status Bar ---- */'
    + '.voucher-status-bar { animation:vsbIn 0.35s ease; }'
    + '@keyframes vsbIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } }'
    + '/* ---- Installment Pay Button ---- */'
    + '.installment-row .inst-pay-btn:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(16,185,129,0.35); }'
    + '/* ---- Turnover Clickable ---- */'
    + '.turnover-clickable:hover { background:var(--primary-soft) !important; }'
    + '/* ---- Combined Detail Column ---- */'
    + '.voucher-line select[data-combined="1"] { background:linear-gradient(90deg, var(--primary-soft), var(--card-solid)); '
    +   'border-color:var(--primary-light); font-weight:700; }';
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
})();

/* =====================================================================
   ★ بخش ۲۳: بهبود Context AI برای قابلیت‌های جدید
   ===================================================================== */
(function improveAIContext() {
    if (typeof aiBuildContext === 'function') {
        var _orig = aiBuildContext;
        window.aiBuildContext = function() {
            var base = _orig.apply(this, arguments);
            var extra = []
                .concat([''])
                .concat(['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'])
                .concat(['🆕 قابلیت‌های نسخه ۲.۰'])
                .concat(['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'])
                .concat(['• معین‌های چند-نوعی: در فرم سند، اگر معینی بیش از یک لینک (مثلاً person و company) دارد،'])
                .concat(['  کاربر یک ستون ترکیبی می‌بیند؛ در details فقط یک کلید از لینک‌های معین مجاز است.'])
                .concat(['• پرداخت قسط: هر قسط دارای دکمه «💳 پرداخت» است که سند خودکار می‌سازد:'])
                .concat(['  ردیف بدهکار = معین تسهیلات با details.facility'])
                .concat(['  ردیف بستانکار = معین بانک با details.bank'])
                .concat(['• برای اطلاعات پایه استفاده‌شده، حذف مجاز نیست — فقط ویرایش.'])
                .concat(['• تراز آزمایشی سطح گروه (level 1) هم پشتیبانی می‌کند.'])
                .concat([''])
                .concat(['📌 برای اطلاعات بیشتر درباره هر قسط، به فیلدهای facilities[].installments نگاه کن.']);
            return base + '\n' + extra.join('\n');
        };
    }
})();

/* =====================================================================
   ★ بخش ۲۴: رفرش نهایی و ثبت رویدادها
   ===================================================================== */
(function finalInit() {
    function boot() {
        console.log('🎉 پارسیس — پچ بهبودهای UX اعمال شد.');
        if (typeof updateHomeWidgets === 'function') updateHomeWidgets();
        if (typeof updateEyeButtons === 'function') updateEyeButtons();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(boot, 1400); });
    } else {
        setTimeout(boot, 1400);
    }
})();
