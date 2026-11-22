/* ============================================================
   پارسیس — پشتیبان‌گیری و بازیابی (اصلاح شده برای موبایل)
   مسیر: js/modules/backup.js
   ============================================================ */
'use strict';

function downloadBackup() {
    var data = {};
    DB.keys().forEach(function (k) {
        if (k === '__migrated') return;
        var v = DB.load(k, undefined);
        if (v !== undefined) data[k] = v;
    });

    function blobToDataURL(blob) {
        return new Promise(function (resolve) {
            try {
                var r = new FileReader();
                r.onload = function () { resolve(r.result); };
                r.onerror = function () { resolve(null); };
                r.readAsDataURL(blob);
            } catch (e) { resolve(null); }
        });
    }

    function collectImages() {
        return new Promise(function (resolve) {
            if (!window.indexedDB) { resolve([]); return; }
            var req = indexedDB.open('parsisNoteImages', 1);
            req.onupgradeneeded = function (e) {
                var db = e.target.result;
                if (!db.objectStoreNames.contains('handles')) db.createObjectStore('handles', { keyPath: 'id' });
            };
            req.onsuccess = function () {
                var db = req.result;
                if (!db.objectStoreNames.contains('handles')) { resolve([]); return; }
                var tx = db.transaction('handles', 'readonly');
                var all = tx.objectStore('handles').getAll();
                all.onsuccess = async function () {
                    var recs = all.result || [];
                    var out = [];
                    for (var i = 0; i < recs.length; i++) {
                        var rec = recs[i];
                        if (rec && rec.blob) {
                            var d = await blobToDataURL(rec.blob);
                            if (d) out.push({ id: rec.id, name: rec.name || '', size: rec.size || 0, type: rec.type || 'image/png', dataUrl: d });
                        }
                    }
                    resolve(out);
                };
                all.onerror = function () { resolve([]); };
            };
            req.onerror = function () { resolve([]); };
        });
    }

    collectImages().then(function (images) {
        var backup = {
            app: 'parsis', version: APP_VERSION, exportedAt: new Date().toISOString(), data: data, images: images
        };
        var blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var now = new Date();
        var dateStr = todayJalaliStr().replace(/\//g, '-');
        var timeStr = pad2(now.getHours()) + '-' + pad2(now.getMinutes());
        var a = document.createElement('a');
        a.href = url; a.download = 'parsis-' + dateStr + '_' + timeStr + '.json';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
        showToast('✅ پشتیبان با موفقیت دانلود شد.');
    });
}

function restoreBackup(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
        try {
            var text = String(e.target.result);
            if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
            var parsed = JSON.parse(text);
            var data = parsed.data || parsed;
            var images = parsed.images || [];

            if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
                alert('❌ فایل پشتیبان خالی یا نامعتبر است.'); return;
            }

            if (!confirm('⚠️ همه داده‌های فعلی پاک و جایگزین می‌شوند.\nادامه می‌دهید؟')) return;

            // ✅ نمایش صفحه انتظار (برای جلوگیری از ریفرش زودهنگام)
            var loadingAlert = document.createElement('div');
            loadingAlert.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.9);z-index:999999;display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-family:inherit;font-size:1.2rem;flex-direction:column;gap:20px;backdrop-filter:blur(5px);';
            loadingAlert.innerHTML = '<div>⏳ در حال بازیابی اطلاعات...</div><div style="font-size:0.9rem;opacity:0.8">لطفاً صبر کنید و صفحه را نبندید.</div>';
            document.body.appendChild(loadingAlert);

            // پاک کردن کش فعلی
            DB.keys().forEach(function (k) { if (k !== '__migrated') DB.remove(k); });

            // نوشتن داده‌های جدید در حافظه موقت
            var writeErrors = 0;
            Object.keys(data).forEach(function (origKey) {
                try {
                    var shortKey = (origKey.indexOf(LS_PREFIX) === 0) ? origKey.substring(LS_PREFIX.length) : origKey;
                    var val = data[origKey];
                    if (typeof val === 'string') { try { val = JSON.parse(val); } catch (ex) {} }
                    DB.save(shortKey, val);
                } catch (err) { writeErrors++; }
            });

            function dataURLToBlob(dataUrl) {
                var parts = String(dataUrl).split(',');
                if (parts.length !== 2) return null;
                var mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/png';
                var binary = atob(parts[1]);
                var arr = new Uint8Array(binary.length);
                for (var j = 0; j < binary.length; j++) arr[j] = binary.charCodeAt(j);
                return new Blob([arr], { type: mime });
            }

            function restoreImages(callback) {
                if (images.length === 0 || !window.indexedDB) { callback(); return; }
                var req = indexedDB.open('parsisNoteImages', 1);
                req.onupgradeneeded = function (ev) {
                    var db = ev.target.result;
                    if (!db.objectStoreNames.contains('handles')) db.createObjectStore('handles', { keyPath: 'id' });
                };
                req.onsuccess = function () {
                    var db = req.result;
                    var tx = db.transaction('handles', 'readwrite');
                    var store = tx.objectStore('handles');
                    store.clear();
                    images.forEach(function (img) {
                        try {
                            var blob = dataURLToBlob(img.dataUrl);
                            if (blob) store.put({ id: img.id, blob: blob, name: img.name || '', size: img.size || 0, type: img.type || 'image/png', isBlob: true });
                        } catch (err) {}
                    });
                    tx.oncomplete = function () { callback(); };
                    tx.onerror = function () { callback(); };
                };
                req.onerror = function () { callback(); };
            }

            // ✅ مهم‌ترین بخش: انتظار برای ذخیره کامل در دیتابیس
            DB.flush().then(function () {
                restoreImages(function () {
                    var msg = '✅ بازیابی با موفقیت انجام شد!\n\n';
                    if (writeErrors > 0) msg += '⚠️ ' + writeErrors + ' مورد خطا داشت.\n';
                    alert(msg + 'برنامه مجدداً بارگذاری می‌شود.');
                    location.reload();
                });
            });

        } catch (err) {
            alert('❌ خطا در خواندن فایل:\n' + (err.message || err));
        }
    };
    reader.onerror = function () { alert('❌ خطا در خواندن فایل.'); };
    reader.readAsText(file, 'UTF-8');
}

function resetAllData() {
    var pwd = prompt('رمز ریست:');
    if (pwd === null) return;
    if (String(pwd).trim() !== '1234') { alert('رمز اشتباه.'); return; }
    if (!confirm('⚠️ همه داده‌ها پاک شود؟')) return;

    DB.clearAll().then(function() {
        try {
            var req = indexedDB.open('parsisNoteImages', 1);
            req.onupgradeneeded = function (e) {
                var db = e.target.result;
                if (!db.objectStoreNames.contains('handles')) db.createObjectStore('handles', { keyPath: 'id' });
            };
            req.onsuccess = function () {
                var db = req.result;
                if (db.objectStoreNames.contains('handles')) {
                    var tx = db.transaction('handles', 'readwrite');
                    tx.objectStore('handles').clear();
                    tx.oncomplete = done; tx.onerror = done;
                } else { done(); }
            };
            req.onerror = done;
        } catch (e) { done(); }

        function done() {
            try {
                var toRemove = [];
                for (var i = 0; i < localStorage.length; i++) {
                    var k = localStorage.key(i);
                    if (k && k.indexOf(LS_PREFIX) === 0) toRemove.push(k);
                }
                toRemove.forEach(function (k) { localStorage.removeItem(k); });
            } catch (e) {}
            alert('✅ همه داده‌ها پاک شد.');
            location.reload();
        }
    });
}

window.downloadBackup = downloadBackup;
window.restoreBackup  = restoreBackup;
window.resetAllData   = resetAllData;
