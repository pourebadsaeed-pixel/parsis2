/* ============================================================
   پارسیس — لایه دیتابیس (IndexedDB + کش) - نسخه پایدار
   ============================================================ */
'use strict';

var LS_PREFIX = 'parsis.';
var IDB_NAME = 'parsis-db';
var IDB_STORE = 'kv';
var IDB_VERSION = 1;

var _cache = new Map();
var _idb = null;
var _readyPromise = null;
var _dirty = new Set();
var _flushTimer = null;
/* ✅ v2.0.6 — کلیدهای اعمال‌شده از سرور (برای جلوگیری از اکوی سینک) */
var _skipSync = new Set();

/* ✅ v2.3.3 — فهرستِ «تغییرخورده‌ها» در localStorage هم می‌ماند.
   قبلاً اگر کاربر در کمتر از ۰٫۱ ثانیه بعد از ذخیره، صفحه را می‌بست/رفرش می‌کرد،
   flush هنوز اجرا نشده بود و نامِ آن تغییر هرگز به صف پوش ابری نمی‌رسید —
   تغییر روی اپ بعدی «گم شده» به نظر می‌رسید و ظاهرش سینک یک‌طرفه بود.
   حالا نام هر تغییر بلافاصله در localStorage ثبت می‌شود و جلسهٔ بعد،
   قبل از هر دریافتِ رله، دوباره فرستاده می‌شود. */
var DIRTY_LS_KEY = 'parsis.dirtyNames';

function _persistDirty() {
    try { localStorage.setItem(DIRTY_LS_KEY, JSON.stringify(Array.from(_dirty))); } catch (e) {}
}

function _dropPersistedDirty(keys) {
    try {
        var arr = null;
        try { arr = JSON.parse(localStorage.getItem(DIRTY_LS_KEY) || '[]') || []; } catch (e) { arr = null; }
        if (!arr || !arr.length) return;
        var keep = {};
        arr.forEach(function (k) { keep[k] = 1; });
        (keys || []).forEach(function (k) { delete keep[k]; });
        localStorage.setItem(DIRTY_LS_KEY, JSON.stringify(Object.keys(keep)));
    } catch (e) {}
}

function openIdb() {
  return new Promise(function (resolve, reject) {
    if (_idb) return resolve(_idb);
    var req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = function (e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = function () { _idb = req.result; resolve(_idb); };
    req.onerror = function () { reject(req.error); };
  });
}

function idbGetAll() {
  return openIdb().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(IDB_STORE, 'readonly');
      var store = tx.objectStore(IDB_STORE);
      var result = {};
      var cursorReq = store.openCursor();
      cursorReq.onsuccess = function (e) {
        var cursor = e.target.result;
        if (cursor) { result[cursor.key] = cursor.value; cursor.continue(); }
        else resolve(result);
      };
      cursorReq.onerror = function () { reject(cursorReq.error); };
    });
  });
}

var DB = {
  ready: function () {
    if (_readyPromise) return _readyPromise;
    _readyPromise = openIdb()
      .then(idbGetAll)
      .then(function (all) {
        Object.keys(all).forEach(function (k) { _cache.set(k, all[k]); });
        return true;
      })
      .catch(function (e) {
        console.error('[DB.ready] IDB failed, fallback to localStorage', e);
        for (var i = 0; i < localStorage.length; i++) {
          var full = localStorage.key(i);
          if (!full || full.indexOf(LS_PREFIX) !== 0) continue;
          var short = full.substring(LS_PREFIX.length);
          try { _cache.set(short, JSON.parse(localStorage.getItem(full))); } catch (_) {}
        }
        return false;
      });
    return _readyPromise;
  },

  load: function (k, f) {
    if (_cache.has(k)) {
      var v = _cache.get(k);
      return v === undefined ? f : v;
    }
    return f;
  },

  save: function (k, v) {
    if (v === undefined) return;
    _cache.set(k, v);
    _dirty.add(k);
    _skipSync.delete(k);
    _persistDirty(); /* ✅ v2.3.3 — نام تغییر فوراً ماندگار می‌شود */
    scheduleFlush();
  },

  remove: function (k) {
    _cache.delete(k);
    _dirty.add(k);
    _skipSync.delete(k);
    _persistDirty(); /* ✅ v2.3.3 */
    scheduleFlush();
  },

  keys: function () { return Array.from(_cache.keys()); },

  /* ✅ v2.3.3 — فهرست storeهای تغییرکردهٔ هنوز پوش‌نشده (حافظه + ماندگار) */
  pendingNames: function () {
    var s = {};
    Array.from(_dirty).forEach(function (k) { s[k] = 1; });
    try {
      var arr = JSON.parse(localStorage.getItem(DIRTY_LS_KEY) || '[]') || [];
      arr.forEach(function (k) { if (k) s[k] = 1; });
    } catch (e) {}
    return Object.keys(s);
  },

  clearAll: function () {
    _cache.clear();
    _dirty.clear();
    try { localStorage.removeItem(DIRTY_LS_KEY); } catch (eLs) {} /* ✅ v2.3.3 */
    return openIdb().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).clear();
        tx.oncomplete = resolve;
        tx.onerror = resolve;
      });
    });
  },

  flush: function () {
    return new Promise(function (resolve) {
      if (_flushTimer) { clearTimeout(_flushTimer); _flushTimer = null; }
      if (_dirty.size === 0) { resolve(); return; }
      var keys = Array.from(_dirty); _dirty.clear();
      openIdb().then(function (db) {
        var tx = db.transaction(IDB_STORE, 'readwrite');
        var store = tx.objectStore(IDB_STORE);
        keys.forEach(function (k) {
          if (_cache.has(k)) store.put(_cache.get(k), k);
          else store.delete(k);
        });
        tx.oncomplete = function () {
          /* ✅ v2.0.6 — اطلاع تغییرات به لایه سینک شبکه (سرور LAN) */
          try {
            if (typeof window.__parsisAfterFlush === 'function') {
              var vals = {};
              keys.forEach(function (k) {
                if (_skipSync.has(k)) return;
                if (_cache.has(k) && _cache.get(k) !== undefined) vals[k] = _cache.get(k);
              });
              if (Object.keys(vals).length > 0) window.__parsisAfterFlush(vals);
            }
          } catch (eSync) { /* سینک غیرفعال */ }
          keys.forEach(function (k) { _skipSync.delete(k); });
          _dropPersistedDirty(keys); /* ✅ v2.3.3 — این‌ها دیگر پوش‌نشده نیستند */
          resolve();
        };
        tx.onerror = function () {
          /* ✅ v2.3.3 — flush ناموفق: کلیدها دوباره dirty می‌شوند تا flush بعدی
             دوباره تلاش کند (قبلاً برای همیشه «پاک‌شده» حساب می‌شدند و مقدارِ
             فقط در حافظه، هرگز در پایگاه داده نمی‌نشست) */
          keys.forEach(function (k) { _dirty.add(k); _skipSync.delete(k); });
          _persistDirty();
          resolve();
        };
      }).catch(function() {
        /* ✅ v2.3.3 — همان رفتار برای خطای باز کردن IDB */
        try {
          keys.forEach(function (k) { _dirty.add(k); _skipSync.delete(k); });
          _persistDirty();
        } catch (e2) {}
        resolve();
      });
    });
  },

  /* ✅ v2.0.6 — اعمال داده دریافتی از سرور/کلاینت دیگر بدون ارسال مجدد */
  _applyRemote: function (stores) {
    if (!stores || typeof stores !== 'object') return 0;
    var n = 0;
    Object.keys(stores).forEach(function (k) {
      if (k === 'rev' || stores[k] === undefined) return;
      try {
        _cache.set(k, stores[k]);
        _dirty.add(k);
        _skipSync.add(k);
        n++;
      } catch (e) {}
    });
    if (n > 0) scheduleFlush();
    return n;
  },

  /* حالت فعلی سینک شبکه: 'standalone' | 'owner' | 'client' */
  _syncMode: function () { return (window.__parsisSyncMode || 'standalone'); }
};

function scheduleFlush() {
  if (_flushTimer) return;
  _persistDirty(); /* ✅ v2.3.3 */
  _flushTimer = setTimeout(DB.flush, 100);
}

/* ✅ v2.3.3 — هنگام ترک صفحه (رفرش/بستن/سوییچ اپ) فوراً flush می‌کنیم؛
   تراکنش‌های IndexedDB در حال unload هم معمولاً کامل می‌شوند، پس مقدارِ
   تغییراتِ آخرین لحظه در پایگاه داده می‌ماند و جلسهٔ بعد با pendingNames پوش می‌شود. */
try {
  window.addEventListener('pagehide', function () { try { DB.flush(); } catch (e) {} });
  document.addEventListener('visibilitychange', function () {
    try { if (document.visibilityState === 'hidden') DB.flush(); } catch (e) {}
  });
} catch (eUnload) {}

window.LS_PREFIX = LS_PREFIX;
window.DB = DB;
