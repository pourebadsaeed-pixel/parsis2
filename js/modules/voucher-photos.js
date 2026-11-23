/* ============================================================
   پارسیس — پیوست تصویر چک/سند (دوربین اندروید + وب)
   مسیر: js/modules/voucher-photos.js

   قابلیت‌ها:
     • افزودن عکس چک/سند به فرم صدور سند با دوربین یا گالری
       (اندروید: پلاگین Camera — وب: input file + فشرده‌سازی)
     • فشرده‌سازی خودکار (حداکثر ۱۲۸۰px، JPEG کیفیت ~۵۵)
     • پیش‌نمایش تصاویر پیوست‌شده + حذف + مشاهده در اندازه کامل
   روی همه پلتفرم‌ها کار می‌کند؛ روی اندروید از دوربین نیتیو استفاده می‌شود.
   ============================================================ */
'use strict';

(function () {

    var MAX_PHOTOS = 3;
    var current = [];

    function isNative() {
        try {
            return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
        } catch (e) { return false; }
    }

    /* ---------- فشرده‌سازی DataURL با canvas ---------- */
    function compressDataUrl(dataUrl, maxWidth, quality) {
        return new Promise(function (resolve) {
            var img = new Image();
            img.onload = function () {
                try {
                    var w = img.width, h = img.height;
                    if (w > maxWidth) {
                        h = Math.round(h * maxWidth / w);
                        w = maxWidth;
                    }
                    var cv = document.createElement('canvas');
                    cv.width = w; cv.height = h;
                    cv.getContext('2d').drawImage(img, 0, 0, w, h);
                    resolve(cv.toDataURL('image/jpeg', quality || 0.55));
                } catch (e) { resolve(dataUrl); }
            };
            img.onerror = function () { resolve(dataUrl); };
            img.src = dataUrl;
        });
    }

    /* ---------- گرفتن عکس ---------- */
    async function takePhotoNative() {
        var Camera = window.Capacitor.Plugins && window.Capacitor.Plugins.Camera;
        if (!Camera) return null;
        var r = await Camera.getPhoto({
            quality: 55,
            width: 1400,
            resultType: 'dataUrl',
            source: 'PROMPT',
            saveToGallery: false
        });
        return (r && r.dataUrl) ? r.dataUrl : null;
    }

    function takePhotoBrowser() {
        return new Promise(function (resolve) {
            var inp = document.getElementById('voucher-photo-input');
            if (!inp) {
                inp = document.createElement('input');
                inp.type = 'file';
                inp.id = 'voucher-photo-input';
                inp.accept = 'image/*';
                inp.capture = 'environment';
                inp.style.display = 'none';
                document.body.appendChild(inp);
            }
            inp.value = '';
            inp.onchange = function () {
                var f = inp.files && inp.files[0];
                if (!f) { resolve(null); return; }
                var rd = new FileReader();
                rd.onloadend = function () { resolve(String(rd.result || '')); };
                rd.onerror = function () { resolve(null); };
                rd.readAsDataURL(f);
            };
            inp.click();
        });
    }

    async function addPhoto() {
        if (current.length >= MAX_PHOTOS) {
            if (typeof showToast === 'function') showToast('حداکثر ' + toFa(MAX_PHOTOS) + ' عکس برای هر سند');
            return;
        }
        try {
            if (typeof showLoading === 'function') showLoading('در حال گرفتن عکس...');
        } catch (e) {}
        var dataUrl = null;
        try {
            dataUrl = isNative() ? await takePhotoNative() : await takePhotoBrowser();
        } catch (e) {
            /* کاربر انصراف داد یا خطا */
        }
        try { if (typeof hideLoading === 'function') hideLoading(); } catch (e2) {}
        if (!dataUrl) return;
        dataUrl = await compressDataUrl(dataUrl, 1280, 0.55);
        current.push({ id: uid(), data: dataUrl, ts: Date.now() });
        renderStrip();
        if (typeof showToast === 'function') showToast('📷 عکس به سند پیوست شد');
        if (typeof HapticsShake === 'function') { try { HapticsShake(); } catch (e3) {} }
    }

    function removePhoto(id) {
        current = current.filter(function (p) { return p.id !== id; });
        renderStrip();
    }

    function viewPhoto(dataUrl) {
        var ov = document.getElementById('voucher-photo-viewer');
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'voucher-photo-viewer';
            ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;cursor:pointer';
            ov.innerHTML = '<img style="max-width:100%;max-height:92%;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,.6)">';
            ov.addEventListener('click', function () { ov.style.display = 'none'; });
            document.body.appendChild(ov);
        }
        ov.querySelector('img').src = dataUrl;
        ov.style.display = 'flex';
    }

    /* ---------- نوار پیوست‌ها ---------- */
    function renderStrip() {
        var strip = document.getElementById('voucher-attach-strip');
        if (!strip) return;
        strip.innerHTML = '';
        current.forEach(function (p) {
            var wrap = document.createElement('div');
            wrap.style.cssText = 'position:relative;width:64px;height:64px;flex-shrink:0';
            var img = document.createElement('img');
            img.src = p.data;
            img.style.cssText = 'width:64px;height:64px;object-fit:cover;border-radius:10px;border:2px solid var(--primary-soft,#93c5fd);cursor:pointer';
            img.addEventListener('click', function () { viewPhoto(p.data); });
            var del = document.createElement('button');
            del.type = 'button';
            del.textContent = '×';
            del.title = 'حذف عکس';
            del.style.cssText = 'position:absolute;top:-7px;left:-7px;width:22px;height:22px;border-radius:50%;background:#dc2626;color:#fff;border:none;font-size:14px;font-weight:700;cursor:pointer;line-height:1';
            del.addEventListener('click', function (e) { e.stopPropagation(); removePhoto(p.id); });
            wrap.appendChild(img);
            wrap.appendChild(del);
            strip.appendChild(wrap);
        });
        var btn = document.getElementById('v-attach-btn');
        if (btn) {
            btn.disabled = current.length >= MAX_PHOTOS;
            btn.style.opacity = btn.disabled ? '0.5' : '1';
            btn.textContent = '📷 افزودن عکس' + (current.length ? ' (' + toFa(current.length) + '/' + toFa(MAX_PHOTOS) + ')' : '');
        }
    }

    function bindUI() {
        var btn = document.getElementById('v-attach-btn');
        if (btn && !btn._vpBound) {
            btn._vpBound = true;
            btn.addEventListener('click', function (e) { e.preventDefault(); addPhoto(); });
        }
    }

    /* ---------- API عمومی (فرم سند از این‌ها استفاده می‌کند) ---------- */
    window.__getVoucherAttachments = function () {
        return JSON.parse(JSON.stringify(current));
    };
    window.__setVoucherAttachments = function (arr) {
        current = [];
        (Array.isArray(arr) ? arr : []).forEach(function (p) {
            if (p && p.data) current.push({ id: p.id || uid(), data: p.data, ts: p.ts || Date.now() });
        });
        renderStrip();
    };
    window.__resetVoucherAttachments = function () {
        window.__setVoucherAttachments([]);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(bindUI, 700); });
    } else {
        setTimeout(bindUI, 700);
    }

    console.log('✅ [modules/voucher-photos.js] loaded');
})();
