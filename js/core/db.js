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
    scheduleFlush();
  },

  remove: function (k) {
    _cache.delete(k);
    _dirty.add(k);
    scheduleFlush();
  },

  keys: function () { return Array.from(_cache.keys()); },

  clearAll: function () {
    _cache.clear();
    _dirty.clear();
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
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { resolve(); }; 
      }).catch(function() { resolve(); });
    });
  }
};

function scheduleFlush() {
  if (_flushTimer) return;
  _flushTimer = setTimeout(DB.flush, 100);
}

window.LS_PREFIX = LS_PREFIX;
window.DB = DB;
