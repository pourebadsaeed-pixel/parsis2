/* ============================================================
   پارسیس — لایه دیتابیس (localStorage wrapper)
   مسیر: js/core/db.js
   وابستگی: ندارد
   ============================================================ */
'use strict';

var LS_PREFIX = 'parsis.';

var DB = {
    load: function (k, f) {
        try {
            var r = localStorage.getItem(LS_PREFIX + k);
            return r ? JSON.parse(r) : f;
        } catch (e) {
            console.warn('[DB.load]', k, e);
            return f;
        }
    },

    save: function (k, v) {
        try {
            localStorage.setItem(LS_PREFIX + k, JSON.stringify(v));
        } catch (e) {
            console.warn('[DB.save]', k, e);
            if (e && (e.name === 'QuotaExceededError' ||
                      e.code === 22 ||
                      e.number === -2147024882)) {
                if (typeof showToast === 'function') {
                    showToast('⚠️ فضای ذخیره‌سازی پر شده است.');
                }
            }
        }
    },

    remove: function (k) {
        try { localStorage.removeItem(LS_PREFIX + k); }
        catch (e) { console.warn('[DB.remove]', k, e); }
    },

    keys: function () {
        var out = [];
        try {
            for (var i = 0; i < localStorage.length; i++) {
                var k = localStorage.key(i);
                if (k && k.indexOf(LS_PREFIX) === 0) {
                    out.push(k.substring(LS_PREFIX.length));
                }
            }
        } catch (e) { console.warn('[DB.keys]', e); }
        return out;
    },

    clearAll: function () {
        var ks = this.keys();
        for (var i = 0; i < ks.length; i++) this.remove(ks[i]);
    }
};

window.LS_PREFIX = LS_PREFIX;
window.DB = DB;

console.log('✅ [core/db.js] loaded');
