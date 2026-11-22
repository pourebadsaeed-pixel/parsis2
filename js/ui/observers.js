/* ============================================================
   پارسیس — Observer مشترک برای جدول‌های جدید
   مسیر: js/ui/observers.js
   وابستگی: ui/table.js, ui/form.js
   ============================================================ */
'use strict';

(function initTableObserver() {

    function refreshAll() {
        if (typeof attachFilterRowsToAllTables === 'function') attachFilterRowsToAllTables();
        if (typeof window._enhanceGlobalSorting === 'function') window._enhanceGlobalSorting();

        var allTables = document.querySelectorAll('table[data-table-id]');
        for (var i = 0; i < allTables.length; i++) {
            var id = allTables[i].id;
            if (typeof columnOrders !== 'undefined' && columnOrders[id] && typeof applyColumnOrder === 'function') {
                applyColumnOrder(id);
            }
        }
    }

    function init() {
        refreshAll();

        /* MutationObserver: وقتی tbody یا جدول جدید اضافه شد */
        var observer = new MutationObserver(function (mutations) {
            var needsRefresh = false;
            for (var i = 0; i < mutations.length; i++) {
                var m = mutations[i];
                if (m.type !== 'childList') continue;
                var t = m.target;
                if (!t) continue;
                if (t.tagName === 'TBODY') { needsRefresh = true; break; }
                if (t.querySelector) {
                    if (t.querySelector('table.data-table, table.report-table, table.cf-table')) {
                        needsRefresh = true;
                        break;
                    }
                }
            }
            if (needsRefresh) {
                setTimeout(refreshAll, 80);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        /* شبکه اطمینان: هر ۹۰۰ms چک کن جدول‌های بدون filter-row دارند */
        setInterval(function () {
            var tables = document.querySelectorAll('table.data-table, table.report-table, table.cf-table');
            tables.forEach(function (t) {
                if (!t.id) return;
                var hasRow = t.querySelector('thead tr.column-filter-row');
                if (!hasRow && typeof buildFilterRow === 'function') buildFilterRow(t);
                if (typeof COLUMN_FILTERS !== 'undefined' && COLUMN_FILTERS[t.id] && typeof applyColumnFiltersToTable === 'function') {
                    applyColumnFiltersToTable(t.id);
                }
            });
        }, 900);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 900); });
    } else {
        setTimeout(init, 900);
    }
})();

console.log('✅ [ui/observers.js] loaded');
