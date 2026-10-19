/* ============================================================
   پارسیس — لایه دیتابیس (IndexedDB + کش حافظه)
   مسیر: js/core/db.js
   API همگام باقی می‌ماند؛ فقط DB.ready() را یک‌بار await کنید.
   ============================================================ */
'use strict';

var LS_PREFIX = 'parsis.';
var IDB_NAME = 'parsis-db';
var IDB_STORE = 'kv';
var IDB_VERSION = 1;

var _cache = new Map();     // key -> value (in-memory)
var _idb = null;            // IDBDatabase
var _readyPromise = null;   // Promise resolved when cache is populated
var _dirty = new Set();     // pending writes
var _flushTimer = null;

/* ---------- IndexedDB primitives ---------- */
function openIdb() {
  return new Promise(function (resolve, reject) {
    if (_idb) return resolve(_idb);
    var req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = function (e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = function () { _idb = req.result; resolve(_idb); };
    req.onerror = function () { reject(req.error); };
    req.onblocked = function () { reject(new Error('IDB blocked')); };
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

function idbPut(key, value) {
  return openIdb().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  });
}

function idbDelete(key) {
  return openIdb().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  });
}

function idbClear() {
  return openIdb().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).clear();
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  });
}

/* ---------- Batched writes ---------- */
function scheduleFlush() {
  if (_flushTimer) return;
  _flushTimer = setTimeout(flushDirty, 120);
}

function flushDirty() {
  _flushTimer = null;
  if (_dirty.size === 0) return;
  var keys = Array.from(_dirty);
  _dirty.clear();
  keys.forEach(function (k) {
    if (_cache.has(k)) {
      idbPut(k, _cache.get(k)).catch(function (e) {
        console.warn('[DB.flush put]', k, e);
      });
    } else {
      idbDelete(k).catch(function (e) {
        console.warn('[DB.flush del]', k, e);
      });
    }
  });
}

/* ---------- One-time migration from localStorage ---------- */
function migrateFromLocalStorage() {
  var migrated = localStorage.getItem(LS_PREFIX + '__migrated');
  if (migrated === '1') return Promise.resolve(false);

  var toMigrate = [];
  for (var i = 0; i < localStorage.length; i++) {
    var full = localStorage.key(i);
    if (!full || full.indexOf(LS_PREFIX) !== 0) continue;
    var short = full.substring(LS_PREFIX.length);
    if (short === '__migrated') continue;
    toMigrate.push({ full: full, short: short });
  }

  if (toMigrate.length === 0) {
    localStorage.setItem(LS_PREFIX + '__migrated', '1');
    return Promise.resolve(false);
  }

  return Promise.all(toMigrate.map(function (item) {
    try {
      var raw = localStorage.getItem(item.full);
      if (raw == null || raw === '' || raw === 'undefined' || raw === 'null') return null;
      var parsed = JSON.parse(raw);
      if (!_cache.has(item.short)) _cache.set(item.short, parsed);
      return idbPut(item.short, parsed);
    } catch (e) {
      console.warn('[DB.migrate] skip', item.full, e);
      return null;
    }
  })).then(function () {
    localStorage.setItem(LS_PREFIX + '__migrated', '1');
    console.log('[DB] migrated ' + toMigrate.length + ' keys from localStorage');
    return true;
  });
}

/* ---------- Public API ---------- */
var DB = {
  ready: function () {
    if (_readyPromise) return _readyPromise;
    _readyPromise = openIdb()
      .then(idbGetAll)
      .then(function (all) {
        Object.keys(all).forEach(function (k) { _cache.set(k, all[k]); });
        return migrateFromLocalStorage();
      })
      .then(function () {
        if (navigator.storage && navigator.storage.persist) {
          navigator.storage.persist().catch(function () {});
        }
        return true;
      })
      .catch(function (e) {
        console.error('[DB.ready] IndexedDB unavailable — fallback to localStorage', e);
        for (var i = 0; i < localStorage.length; i++) {
          var full = localStorage.key(i);
          if (!full || full.indexOf(LS_PREFIX) !== 0) continue;
          var short = full.substring(LS_PREFIX.length);
          if (short === '__migrated') continue;
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
    if (v === undefined) {
      console.warn('[DB.save] Skipping undefined for key:', k);
      return;
    }
    _cache.set(k, v);
    _dirty.add(k);
    scheduleFlush();
  },

  remove: function (k) {
    _cache.delete(k);
    _dirty.add(k);
    scheduleFlush();
  },

  keys: function () {
    return Array.from(_cache.keys());
  },

  clearAll: function () {
    _cache.clear();
    idbClear().catch(function (e) { console.warn('[DB.clearAll]', e); });
  },

  estimate: function () {
    return (navigator.storage && navigator.storage.estimate)
      ? navigator.storage.estimate()
      : Promise.resolve({ usage: 0, quota: 0 });
  },

  flush: function () {
    return new Promise(function (resolve) {
      flushDirty();
      setTimeout(resolve, 50);
    });
  }
};

/* ---------- Best-effort flush on hide/close ---------- */
window.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'hidden') flushDirty();
});
window.addEventListener('pagehide', flushDirty);
window.addEventListener('beforeunload', flushDirty);

window.LS_PREFIX = LS_PREFIX;
window.DB = DB;

console.log('✅ [core/db.js] loaded (IndexedDB-backed + memory cache)');
