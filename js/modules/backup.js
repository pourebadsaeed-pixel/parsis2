/* ============================================================
   پارسیس — پشتیبان‌گیری، بازیابی، ریست
   مسیر: js/modules/backup.js
   وابستگی: core/* + ui/toast.js
   ============================================================ */
'use strict';

/* ============================================================
   بخش ۱ — دانلود پشتیبان (شامل تصاویر IndexedDB)
   ============================================================ */
function downloadBackup() {
    var data = {};
    for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k.indexOf(LS_PREFIX) === 0) data[k] = localStorage.getItem(k);
    }

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
                if (!db.objectStoreNames.contains('handles')) {
                    db.createObjectStore('handles', { keyPath: 'id' });
                }
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
                            if (d) {
                                out.push({
                                    id: rec.id,
                                    name: rec.name || '',
                                    size: rec.size || 0,
                                    type: rec.type || 'image/png',
                                    dataUrl: d
                                });
                            }
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
            app: 'parsis',
            version: APP_VERSION,
            exportedAt: new Date().toISOString(),
            data: data,
            images: images
        };

        var blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var now = new Date();
        var dateStr = todayJalaliStr().replace(/\//g, '-');
        var timeStr = pad2(now.getHours()) + '-' + pad2(now.getMinutes());
        var a = document.createElement('a');
        a.href = url;
        a.download = 'parsis-' + dateStr + '_' + timeStr + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1500);

        if (images.length > 0) {
            showToast('✅ پشتیبان شامل ' + toFa(images.length) + ' تصویر یادداشت');
        } else {
            showToast('✅ پشتیبان دانلود شد.');
        }
    });
}

/* ============================================================
   بخش ۲ — بازیابی پشتیبان
   ============================================================ */
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
                alert('❌ فایل پشتیبان خالی یا نامعتبر است.');
                return;
            }

            var validKeys = Object.keys(data).filter(function (k) {
                return k.indexOf(LS_PREFIX) === 0;
            });
            if (validKeys.length === 0) {
                alert('❌ فایل پشتیبان شامل هیچ کلید پارسیس نیست.');
                return;
            }

            var msg = '📦 محتوای پشتیبان:\n\n';
            msg += '• تاریخ: ' + (parsed.exportedAt || '—') + '\n';
            msg += '• نسخه: ' + (parsed.version || '—') + '\n';
            msg += '• ' + toFa(validKeys.length) + ' کلید داده\n';
            if (images.length > 0) msg += '• ' + toFa(images.length) + ' تصویر یادداشت\n';
            msg += '\n⚠️ همه داده‌های فعلی پاک و جایگزین می‌شوند.\nادامه؟';
            if (!confirm(msg)) return;

            var toRemove = [];
            for (var i = 0; i < localStorage.length; i++) {
                var kk = localStorage.key(i);
                if (kk && kk.indexOf(LS_PREFIX) === 0) toRemove.push(kk);
            }
            toRemove.forEach(function (k) { localStorage.removeItem(k); });

            var writeErrors = 0;
            validKeys.forEach(function (k) {
                try { localStorage.setItem(k, data[k]); }
                catch (err) { writeErrors++; }
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
                    if (!db.objectStoreNames.contains('handles')) {
                        db.createObjectStore('handles', { keyPath: 'id' });
                    }
                };
                req.onsuccess = function () {
                    var db = req.result;
                    var tx = db.transaction('handles', 'readwrite');
                    var store = tx.objectStore('handles');
                    store.clear();
                    images.forEach(function (img) {
                        try {
                            var blob = dataURLToBlob(img.dataUrl);
                            if (blob) {
                                store.put({
                                    id: img.id,
                                    blob: blob,
                                    name: img.name || '',
                                    size: img.size || 0,
                                    type: img.type || 'image/png',
                                    isBlob: true
                                });
                            }
                        } catch (err) {}
                    });
                    tx.oncomplete = function () { callback(); };
                    tx.onerror = function () { callback(); };
                };
                req.onerror = function () { callback(); };
            }

            restoreImages(function () {
                var finalMsg = '✅ بازیابی موفق!\n\n';
                finalMsg += '• ' + toFa(validKeys.length) + ' کلید بازیابی شد';
                if (images.length > 0) {
                    finalMsg += '\n• ' + toFa(images.length) + ' تصویر بازیابی شد';
                }
                if (writeErrors > 0) {
                    finalMsg += '\n⚠️ ' + toFa(writeErrors) + ' کلید نوشته نشد';
                }
                alert(finalMsg);
                location.reload();
            });
        } catch (err) {
            alert('❌ خطا در خواندن فایل:\n' + (err.message || err));
        }
    };
    reader.onerror = function () { alert('❌ خطا در خواندن فایل.'); };
    reader.readAsText(file, 'UTF-8');
}

/* ============================================================
   بخش ۳ — ریست کامل
   ============================================================ */
function resetAllData() {
    var pwd = prompt('رمز ریست:');
    if (pwd === null) return;
    if (String(pwd).trim() !== '1234') {
        alert('رمز اشتباه.');
        return;
    }
    if (!confirm('⚠️ همه داده‌ها (شامل تصاویر یادداشت‌ها) پاک شود؟')) return;

    var ks = [];
    for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(LS_PREFIX) === 0) ks.push(k);
    }
    ks.forEach(function (k) { localStorage.removeItem(k); });

    try {
        var req = indexedDB.open('parsisNoteImages', 1);
        req.onupgradeneeded = function (e) {
            var db = e.target.result;
            if (!db.objectStoreNames.contains('handles')) {
                db.createObjectStore('handles', { keyPath: 'id' });
            }
        };
        req.onsuccess = function () {
            var db = req.result;
            if (db.objectStoreNames.contains('handles')) {
                var tx = db.transaction('handles', 'readwrite');
                tx.objectStore('handles').clear();
                tx.oncomplete = function () { alert('✅ همه داده‌ها پاک شد.'); location.reload(); };
                tx.onerror = function () { alert('✅'); location.reload(); };
            } else {
                alert('✅');
                location.reload();
            }
        };
        req.onerror = function () { alert('✅'); location.reload(); };
    } catch (e) {
        alert('✅');
        location.reload();
    }
}

/* ============================================================
   صادرسازی
   ============================================================ */
window.downloadBackup = downloadBackup;
window.restoreBackup  = restoreBackup;
window.resetAllData   = resetAllData;

console.log('✅ [modules/backup.js] loaded');
