/* ============================================================
   پارسیس — ماژول امنیت رمز عبور (SHA-256 + salt)
   مسیر: js/core/password.js
   ✅ v2.0.1 — رمزهای عبور دیگر به‌صورت متن ساده ذخیره نمی‌شوند.
      • هر رمز با SHA-256 + یک salt تصادفی یکتا هش می‌شود
      • پیاده‌سازی خالص JS تا در همه مرورگرها (حتی بدون HTTPS) کار کند
      • سازگاری با نسخه‌های قبلی: رمزهای متن‌ساده قدیمی هنگام
        ورود به‌صورت شفاف به هش تبدیل می‌شوند (migration)
   ============================================================ */
'use strict';

/* ------------------------------------------------------------
   SHA-256 — پیاده‌سازی فشرده (بر پایه نسخه public domain)
   خروجی: رشته hex با حروف کوچک
   ------------------------------------------------------------ */
function _parsisSha256(ascii) {
    function rightRotate(value, amount) {
        return (value >>> amount) | (value << (32 - amount));
    }

    var mathPow = Math.pow;
    var maxWord = mathPow(2, 32);
    var result = '';

    var words = [], asciiBitLength = ascii.length * 8;
    var hash = [];
    var k = [], primeCounter = 0;

    var isComposite = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
        if (!isComposite[candidate]) {
            for (var i = 0; i < 313; i += candidate) isComposite[i] = candidate;
            hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
            k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        }
    }

    ascii += '\x80';
    while (ascii.length % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii.length; i++) {
        var j = ascii.charCodeAt(i);
        if (j >> 8) return; /* ASCII فقط — ورودی UTF-8 انکود شده باشد */
        words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = ((asciiBitLength / maxWord) | 0);
    words[words.length] = (asciiBitLength);

    for (j = 0; j < words.length;) {
        var w = words.slice(j, j += 16);
        var oldHash = hash.slice(0, 8);

        for (i = 0; i < 64; i++) {
            var w15 = w[i - 15], w2 = w[i - 2];

            var a = hash[0], e = hash[4];
            var temp1 = hash[7]
                + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
                + ((e & hash[5]) ^ ((~e) & hash[6]))
                + k[i]
                + (w[i] = (i < 16) ? w[i] : (
                        w[i - 16]
                        + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
                        + w[i - 7]
                        + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
                    ) | 0
                );
            var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
                + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

            hash = [(temp1 + temp2) | 0].concat(hash);
            hash[4] = (hash[4] + temp1) | 0;
            hash.pop();
        }

        for (i = 0; i < 8; i++) {
            hash[i] = (hash[i] + oldHash[i]) | 0;
        }
    }

    for (i = 0; i < 8; i++) {
        for (j = 3; j + 1; j--) {
            var b = (hash[i] >> (j * 8)) & 255;
            result += ((b < 16) ? 0 : '') + b.toString(16);
        }
    }
    return result;
}

function _parsisUtf8Bytes(str) {
    try {
        if (typeof TextEncoder === 'function') return new TextEncoder().encode(String(str));
    } catch (e) {}
    /* fallback برای مرورگرهای خیلی قدیمی */
    return unescape(encodeURIComponent(String(str))).split('').map(function (c) { return c.charCodeAt(0) & 0xff; });
}

/* هش SHA-256 یک رشته دلخواه (UTF-8) — خروجی hex */
function parsisSha256Hex(str) {
    var bytes = _parsisUtf8Bytes(str);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return _parsisSha256(bin);
}

/* تولید salt تصادفی (hex) */
function parsisMakeSalt() {
    try {
        var arr = new Uint8Array(16);
        if (window.crypto && window.crypto.getRandomValues) {
            window.crypto.getRandomValues(arr);
        } else {
            for (var i = 0; i < 16; i++) arr[i] = Math.floor(Math.random() * 256);
        }
        var hex = '';
        for (var j = 0; j < arr.length; j++) hex += (arr[j] < 16 ? '0' : '') + arr[j].toString(16);
        return hex;
    } catch (e) {
        return 's' + Date.now().toString(16) + Math.floor(Math.random() * 1e8).toString(16);
    }
}

/* هش رمز عبور با salt — فرمت استاندارد ذخیره‌سازی */
function parsisHashPassword(pass, salt) {
    return parsisSha256Hex('parsis$' + String(salt || '') + '$' + String(pass || ''));
}

/* ساخت ساختار هش برای یک رمز جدید */
function parsisMakePasswordRecord(plain) {
    var salt = parsisMakeSalt();
    return { passHash: parsisHashPassword(plain, salt), salt: salt };
}

/* بررسی صحت رمز در برابر رکورد کاربر (hash یا legacy plain) */
function parsisVerifyPassword(user, plain) {
    if (!user) return false;
    if (user.passHash) {
        return parsisHashPassword(plain, user.salt) === user.passHash;
    }
    /* legacy: رمز متن ساده قدیمی */
    return typeof user.password === 'string' && user.password === plain;
}

/* آیا کاربر هنوز رمز متن ساده (legacy) دارد؟ */
function parsisHasLegacyPassword(user) {
    return !!user && !user.passHash && typeof user.password === 'string';
}

/* ارتقای کاربر legacy به هش (پس از تأیید موفق رمز) */
function parsisUpgradeUserPassword(user, plain) {
    var rec = parsisMakePasswordRecord(plain);
    user.passHash = rec.passHash;
    user.salt = rec.salt;
    try { delete user.password; } catch (e) { user.password = undefined; }
    return user;
}

window.parsisSha256Hex = parsisSha256Hex;
window.parsisMakeSalt = parsisMakeSalt;
window.parsisHashPassword = parsisHashPassword;
window.parsisMakePasswordRecord = parsisMakePasswordRecord;
window.parsisVerifyPassword = parsisVerifyPassword;
window.parisHasLegacyPassword = parsisHasLegacyPassword;
window.parsisHasLegacyPassword = parsisHasLegacyPassword;
window.parsisUpgradeUserPassword = parsisUpgradeUserPassword;

console.log('✅ [core/password.js] loaded — SHA-256 password hashing ready');
