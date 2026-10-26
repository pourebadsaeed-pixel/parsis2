/* ============================================================
   پارسیس — پیامک بانکی (نسخه ۳ تبی با الگوهای پیشرفته)
   مسیر: js/modules/sms.js
   ============================================================ */
'use strict';

/* ============================================================
   بخش ۱ — تطبیق بانک با نام
   ============================================================ */
function matchBankAccountByBankName(text) {
    if (!text) return null;
    var t = String(text);
    var ba = DB.load('bankAccounts', []);
    var best = null, bestScore = 0;

    for (var i = 0; i < ba.length; i++) {
        var b = ba[i];
        var bankName = String(b.bank || '').trim();
        if (bankName.length < 3) continue;

        if (t.indexOf(bankName) !== -1) {
            var score = bankName.length * 2;
            if (score > bestScore) { bestScore = score; best = b; }
            continue;
        }

        var parts = bankName.split(/\s+/).filter(function (w) { return w.length >= 3; });
        for (var p = 0; p < parts.length; p++) {
            if (t.indexOf(parts[p]) !== -1) {
                var sc = parts[p].length;
                if (sc > bestScore) { bestScore = sc; best = b; }
            }
        }
    }
    return bestScore >= 3 ? best : null;
}

/* ============================================================
   بخش ۲ — تطبیق کامل حساب بانکی
   ============================================================ */
function findMatchingBankAccount(text) {
    if (!text) return null;
    var rawText = String(text);

    var byName = matchBankAccountByBankName(rawText);
    if (byName) return byName;

    var t = normalizeDigits(rawText).replace(/\D/g, '');
    if (t.length < 6) return null;

    var ba = DB.load('bankAccounts', []);
    var best = null, bestScore = 0;

    for (var j = 0; j < ba.length; j++) {
        var bj = ba[j];
        var cands = [
            { v: (bj.account || '').replace(/\D/g, ''), w: 3 },
            { v: (bj.card || '').replace(/\D/g, ''), w: 2 },
            { v: (bj.iban || '').replace(/\D/g, ''), w: 2 }
        ];

        for (var k = 0; k < cands.length; k++) {
            var n = cands[k].v;
            if (n.length < 6) continue;

            var maxLen = Math.min(n.length, 16);
            for (var len = maxLen; len >= 6; len--) {
                var sub = n.slice(-len);
                if (t.indexOf(sub) !== -1) {
                    var score = len * cands[k].w;
                    if (score > bestScore) {
                        bestScore = score;
                        best = bj;
                    }
                    break;
                }
            }
        }
    }
    return best;
}

/* ============================================================
   بخش ۳ — پارس پیامک بانکی
   ============================================================ */
function parseBankSms(text) {
    var result = {
        amount: 0, direction: '', balance: 0,
        accountCandidates: [], matchedAccount: null, bankName: '', raw: text
    };
    if (!text) return result;

    var t = normalizeDigits(text);

    var knownBanks = [
        'ملی', 'پاسارگاد', 'صادرات', 'تجارت', 'ملت', 'سپه', 'کشاورزی', 'مسکن',
        'پارسیان', 'سامان', 'رفاه', 'اقتصاد نوین', 'آینده', 'شهر', 'دی',
        'سینا', 'گردشگری', 'صنعت و معدن', 'توسعه صادرات', 'قوامین', 'حکمت',
        'ایران زمین', 'مهر ایران', 'خاورمیانه', 'کارآفرین', 'پست بانک',
        'رسالت', 'بلو', 'سرمایه'
    ];
    for (var b = 0; b < knownBanks.length; b++) {
        if (t.indexOf(knownBanks[b]) !== -1) {
            result.bankName = 'بانک ' + knownBanks[b];
            break;
        }
    }

    var bm = t.match(/مانده\s*(?:حساب)?\s*[:ـ]?\s*([\d,]+)/);
    if (bm) result.balance = Number(bm[1].replace(/,/g, '')) || 0;
    if (!result.balance) {
        var mo = t.match(/موجودی\s*(?:قابل\s*استفاده)?\s*[:ـ]?\s*([\d,]+)/);
        if (mo) result.balance = Number(mo[1].replace(/,/g, '')) || 0;
    }

    var bigNums = [];
    var numRe = /\d{1,3}(?:,\d{3})+|\d{4,}/g, nm;
    while ((nm = numRe.exec(t)) !== null) {
        var val = Number(nm[0].replace(/,/g, ''));
        if (val < 1000) continue;

        var idx = nm.index;
        var cb = idx > 0 ? t.charAt(idx - 1) : '';
        var ca = idx + nm[0].length < t.length ? t.charAt(idx + nm[0].length) : '';
        var neg = /[-−\u2212]/.test(cb) || /[-−\u2212]/.test(ca);
        var pos = cb === '+' || ca === '+';

        var existing = bigNums.find(function (x) { return x.value === val; });
        if (existing) {
            if (pos && !existing.pos) { existing.pos = true; existing.idx = idx; }
            if (neg && !existing.neg) { existing.neg = true; existing.idx = idx; }
            continue;
        }
        bigNums.push({ value: val, neg: neg, pos: pos, idx: idx });
    }

    var chosen = null, bestScore = -1;
    var keywords = ['مبلغ', 'برداشت', 'واریز', 'خرید', 'پرداخت', 'انتقال', 'مانده‌گیری', 'برداشت وجه', 'کسر'];

    for (var k = 0; k < bigNums.length; k++) {
        var bn = bigNums[k];
        var ctx = t.substring(Math.max(0, bn.idx - 30), Math.min(t.length, bn.idx + 30));
        var score = 0;
        for (var ki = 0; ki < keywords.length; ki++) {
            if (ctx.indexOf(keywords[ki]) !== -1) score += 10;
        }
        if (bn.neg) score += 5;
        if (bn.pos) score += 5;
        score += Math.min(bn.value.toString().length, 10) * 0.5;
        if (result.balance && bn.value === result.balance) score -= 3;
        if (score > bestScore) { bestScore = score; chosen = bn; }
    }

    if (chosen) {
        result.amount = chosen.value;
        if (chosen.neg) result.direction = 'out';
        else if (chosen.pos) result.direction = 'in';
    }

    var candidates = [], seen = {};
    function addC(s) {
        s = String(s).replace(/[*\s\-\.]/g, '');
        if (s.length < 3) return;
        if (seen[s]) return;
        seen[s] = true;
        candidates.push({ value: s });
    }

    var labelRe = /(?:حساب|کارت|شبا|شماره\s*حساب|شماره\s*کارت|IR)\s*[:ـ]?\s*([\d*.\-]{3,30})/gi, lm;
    while ((lm = labelRe.exec(t)) !== null) addC(lm[1]);

    var pasRe = /(\d{3})[.\-](\d{3})[.\-](\d{5,})(?:[.\-](\d{1,3}))?/g, pm;
    while ((pm = pasRe.exec(t)) !== null) {
        addC(pm[3]);
        addC(pm[1] + pm[2] + pm[3] + (pm[4] || ''));
    }

    var allD = t.match(/\d{5,25}/g) || [];
    for (var ad = 0; ad < allD.length; ad++) {
        var v2 = allD[ad];
        if (Number(v2) === result.balance) continue;
        if (Number(v2) === result.amount) continue;
        addC(v2);
    }
    result.accountCandidates = candidates;

    var byName = matchBankAccountByBankName(text);
    if (byName) {
        result.matchedAccount = byName;
        result.matchedField = 'نام بانک';
        return result;
    }

    var ba = DB.load('bankAccounts', []);
    var bestAcc = null, bestMS = 0;

    for (var bi = 0; bi < ba.length; bi++) {
        var bak = ba[bi];
        var fields = [
            { v: (bak.account || '').replace(/\D/g, ''), w: 10, name: 'حساب' },
            { v: (bak.card || '').replace(/\D/g, ''), w: 7, name: 'کارت' },
            { v: (bak.iban || '').replace(/\D/g, ''), w: 5, name: 'شبا' }
        ];

        for (var fi = 0; fi < fields.length; fi++) {
            var fv = fields[fi].v, w = fields[fi].w;
            if (fv.length < 4) continue;

            for (var ci2 = 0; ci2 < candidates.length; ci2++) {
                var cand = candidates[ci2].value;
                if (cand.length < 4) continue;

                var sc = 0;
                if (fv === cand) sc = 100 * w;
                else if (fv.indexOf(cand) !== -1) sc = (50 + cand.length * 3) * w;
                else if (cand.indexOf(fv) !== -1) sc = (50 + fv.length * 3) * w;
                else {
                    var ml = Math.min(fv.length, cand.length, 10);
                    for (var sl = ml; sl >= 4; sl--) {
                        if (fv.slice(-sl) === cand.slice(-sl)) { sc = (20 + sl * 8) * w; break; }
                    }
                }
                if (sc > bestMS) {
                    bestMS = sc;
                    bestAcc = { account: bak, matchedField: fields[fi].name };
                }
            }
        }
    }

    if (bestAcc && bestMS >= 200) {
        result.matchedAccount = bestAcc.account;
        result.matchedField = bestAcc.matchedField;
    }
    return result;
}

/* ============================================================
   بخش ۴ — مدیریت صندوق پیامک
   ============================================================ */
function getSmsInbox() {
    var l = DB.load('smsInbox', []);
    return Array.isArray(l) ? l : [];
}

function saveSmsInbox(list) {
    DB.save('smsInbox', list);
}

function getUnreadSmsCount() {
    var l = getSmsInbox();
    var c = 0;
    l.forEach(function (s) { if (s.status === 'new') c++; });
    return c;
}

function updateSmsBadge() {
    var inboxCount   = getUnreadSmsCount();
    var pendingCount = getPendingSmsCount();
    var total = inboxCount + pendingCount;

    var b = document.getElementById('sms-nav-badge');
    if (!b) return;
    if (total > 0) {
        b.textContent = toFa(total);
        b.classList.remove('hidden');
    } else {
        b.classList.add('hidden');
    }
}

function addSmsToInbox(rawText, source) {
    var text = String(rawText || '').trim();
    if (!text) return { ok: false, reason: 'empty' };

    var list = getSmsInbox();
    if (list.some(function (s) { return s.rawText === text; })) {
        return { ok: false, reason: 'duplicate' };
    }

    var parsed = parseBankSms(text);
    if (!parsed.bankName && !parsed.amount && parsed.accountCandidates.length === 0) {
        return { ok: false, reason: 'not-bank' };
    }

    var item = {
        id: uid(),
        rawText: text,
        source: source || 'manual',
        receivedAt: Date.now(),
        parsed: {
            amount: parsed.amount,
            direction: parsed.direction,
            balance: parsed.balance,
            bankName: parsed.bankName,
            matchedAccountId: parsed.matchedAccount ? parsed.matchedAccount.id : '',
            matchedAccountTitle: parsed.matchedAccount
                ? ((parsed.matchedAccount.bank || '') + ' - ' + (parsed.matchedAccount.account || ''))
                : '',
            matchedField: parsed.matchedField || '',
            accountCandidates: parsed.accountCandidates
        },
        status: 'new',
        voucherId: ''
    };

    list.unshift(item);
    saveSmsInbox(list);
    return { ok: true, item: item };
}

/* ============================================================
   بخش ۵ — الگوها
   ============================================================ */
var SMS_PATTERNS_KEY = 'smsPatterns';
var SMS_PENDING_KEY = 'smsPending';
var SMS_PENDING_MAX = 200;
var SMS_PATTERN_THRESHOLD = 0.75;

function loadSmsPatterns() {
    var list = DB.load(SMS_PATTERNS_KEY, []);
    return Array.isArray(list) ? list : [];
}

function saveSmsPatterns(list) {
    DB.save(SMS_PATTERNS_KEY, list);
}

function getPendingSms() {
    var list = DB.load(SMS_PENDING_KEY, []);
    return Array.isArray(list) ? list : [];
}

function savePendingSms(list) {
    DB.save(SMS_PENDING_KEY, list.slice(-SMS_PENDING_MAX));
}

function getPendingSmsCount() {
    return getPendingSms().length;
}

/* ✅ Migration: افزودن فیلدهای جدید به الگوهای قدیمی */
function runSmsMigrations() {
    try {
        var patterns = loadSmsPatterns();
        var changed = false;
        patterns.forEach(function (p) {
            if (typeof p.voucherDesc === 'undefined') {
                p.voucherDesc = p.label || 'تراکنش بانکی';
                changed = true;
            }
            if (typeof p.lineDesc === 'undefined') {
                p.lineDesc = p.label || 'تراکنش بانکی';
                changed = true;
            }
        });
        if (changed) saveSmsPatterns(patterns);
        console.log('🧠 SMS migrations — patterns:', patterns.length);
    } catch (e) {
        console.warn('[sms migrations]', e);
    }
}

/* ============================================================
   بخش ۶ — تشخیص جهت و مبلغ با علامت
   ============================================================ */
function parseSignNumber(str) {
    var s = String(str).replace(/\s+/g, '').trim();
    var sign = '';

    if (s.charAt(0) === '+') { sign = '+'; s = s.slice(1); }
    else if (s.charAt(0) === '-') { sign = '-'; s = s.slice(1); }
    if (!sign && s.charAt(s.length - 1) === '+') { sign = '+'; s = s.slice(0, -1); }
    else if (!sign && s.charAt(s.length - 1) === '-') { sign = '-'; s = s.slice(0, -1); }

    var num = Number(s.replace(/,/g, ''));
    return { amount: (isFinite(num) && num > 0) ? num : 0, sign: sign };
}

function extractAmountWithSign(text) {
    var t = normalizeDigits(String(text || '')).replace(/[−–—]/g, '-').replace(/[＋]/g, '+');

    var labeled = t.match(/(?:انتقالي|انتقالی|مبلغ|برداشت|واریز|خرید|پرداخت|افزایش|کسر|موجودي|موجودی|حقوق|قسط)\s*[:ـ]?\s*([+\-]?\s*[\d][\d,]*(?:\s*[+\-])?)/);
    if (labeled) {
        var res = parseSignNumber(labeled[1]);
        if (res.amount > 0) return res;
    }

    var m1 = t.match(/([+\-])\s*([\d]{1,3}(?:,[\d]{3})+)/);
    if (m1) return { amount: Number(m1[2].replace(/,/g, '')), sign: m1[1] };

    var m2 = t.match(/([\d]{1,3}(?:,[\d]{3})+)\s*([+\-])/);
    if (m2) return { amount: Number(m2[1].replace(/,/g, '')), sign: m2[2] };

    var m3 = t.match(/([\d]{1,3}(?:,[\d]{3})+)/);
    if (m3) return { amount: Number(m3[1].replace(/,/g, '')), sign: '' };

    return { amount: 0, sign: '' };
}

function detectSmsDirection(text) {
    var t = normalizeDigits(String(text || '')).replace(/[−–—]/g, '-');
    var amtRes = extractAmountWithSign(t);

    if (amtRes.sign === '+') return 'in';
    if (amtRes.sign === '-') return 'out';

    if (/واریز\s*به/.test(t))          return 'in';
    if (/برداشت\s*از/.test(t))         return 'out';
    if (/پرداخت\s*از/.test(t))         return 'out';
    if (/انتقال\s*به\s*حساب/.test(t))  return 'in';
    if (/انتقال\s*از\s*حساب/.test(t))  return 'out';
    if (/انتقال\s*به/.test(t))         return 'in';
    if (/انتقال\s*از/.test(t))         return 'out';
    if (/افزایش\s*موجودی/.test(t))     return 'in';
    if (/کسر\s*از/.test(t))            return 'out';
    if (/دریافت\s*از/.test(t))         return 'in';

    if (/بستانکار/.test(t) && !/بدهکار/.test(t)) return 'in';
    if (/بدهکار/.test(t) && !/بستانکار/.test(t)) return 'out';

    if (/واریز|افزایش|دریافت|حقوق|سود\s*بانکی/.test(t)) return 'in';
    if (/برداشت|خرید|کسر|قسط|پرداخت/.test(t)) return 'out';

    return '';
}

/* ============================================================
   بخش ۷ — توکن‌سازی الگو
   ============================================================ */
function smsNormalizeForPattern(text) {
    return normalizeDigits(String(text || ''))
        .replace(/[\u200c\u200e\u200f]/g, ' ')
        .replace(/[،,]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function buildSmsPattern(raw) {
    var normalized = smsNormalizeForPattern(raw);
    var parts = normalized.split(' ').filter(Boolean);
    var tokens = [], mapping = {}, n = 0;

    for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        var signBefore = p.match(/^([+\-−])(\d.*)$/);
        var signAfter  = p.match(/^(\d.*?)([+\-−])$/);

        if (signBefore) {
            n++;
            var s = signBefore[1] === '−' ? '-' : signBefore[1];
            var slot = '#' + n;
            tokens.push(s + slot);
            mapping[slot] = p;
        } else if (signAfter) {
            n++;
            var s2 = signAfter[2] === '−' ? '-' : signAfter[2];
            var slot2 = '#' + n;
            tokens.push(slot2 + s2);
            mapping[slot2] = p;
        } else if (/\d/.test(p)) {
            n++;
            var slot3 = '#' + n;
            tokens.push(slot3);
            mapping[slot3] = p;
        } else {
            tokens.push(p);
        }
    }
    return { raw: normalized, tokens: tokens, mapping: mapping, key: tokens.join(' ') };
}

function isWild(t) {
    return typeof t === 'string' && t.indexOf('#') !== -1;
}

function smsTokenSimilarity(a, b) {
    var n = Math.max(a.length, b.length);
    if (n === 0) return 0;
    var score = 0, hasSignConflict = false;

    function getSign(t) {
        if (!t) return '';
        var c0 = t.charAt(0);
        if (c0 === '+' || c0 === '-') return c0;
        var cl = t.charAt(t.length - 1);
        if (cl === '+' || cl === '-') return cl;
        return '';
    }

    for (var i = 0; i < n; i++) {
        var ta = a[i], tb = b[i];
        if (ta === undefined || tb === undefined) { score -= 0.2; continue; }
        if (ta === tb) { score += 1.0; continue; }

        var wildA = isWild(ta), wildB = isWild(tb);
        if (wildA && wildB) {
            var signA = getSign(ta), signB = getSign(tb);
            if (signA === signB) score += 1.0;
            else if (!signA || !signB) score += 0.85;
            else { hasSignConflict = true; score -= 2.0; }
        } else if (wildA || wildB) {
            score += 0.4;
        } else {
            score -= 0.3;
        }
    }
    if (hasSignConflict) return 0;
    return Math.max(0, score / n);
}

function findMatchingSmsPattern(raw) {
    var patterns = loadSmsPatterns();
    var active = patterns.filter(function (p) { return !p.blocked; });
    if (active.length === 0) return null;

    var built = buildSmsPattern(raw);
    var best = null, bestScore = 0;

    for (var i = 0; i < active.length; i++) {
        var s = smsTokenSimilarity(built.tokens, active[i].tokens || []);
        if (s > bestScore) { bestScore = s; best = active[i]; }
    }

    return bestScore >= SMS_PATTERN_THRESHOLD
        ? { pattern: best, score: bestScore, built: built }
        : null;
}

/* ============================================================
   بخش ۸ — فیلتر هوشمند پیامک بانکی
   ============================================================ */
function isBankSms(text) {
    if (!text) return false;
    var t = String(text).trim();
    if (t.length < 15) return false;

    if (/کد\s*(ورود|تایید|تأیید|فعال\s*سازی|فعالسازی|احراز|ثبت\s*نام)/.test(t)) return false;
    if (/رمز\s*(یک\s*بار|یکبار|پویا|دوم|موقت)/.test(t)) return false;
    if (/\bOTP\b/i.test(t)) return false;
    if (/one[\s-]?time\s*(password|code)/i.test(t)) return false;
    if (/کد\s*تخفیف|کد\s*معرف|کد\s*هدیه|کد\s*پنل/.test(t)) return false;
    if (/^\s*\D*\d{4,6}\D*\s*$/.test(t) && !/ریال|تومان|مبلغ|برداشت|واریز/.test(t)) return false;

    if (typeof findMatchingBankAccount === 'function') {
        try { if (findMatchingBankAccount(t)) return true; } catch (e) {}
    }

    var hasBankWord = /بانک|حساب|کارت|شبا|سپرده|ATM|خودپرداز|درگاه/.test(t);
    var hasMoneyWord = /ریال|تومان|مبلغ|موجودی|مانده/.test(t);
    var hasDirWord = /برداشت|واریز|پرداخت|دریافت|خرید|انتقال|بستانکار|بدهکار|افزایش|کسر|قسط|حقوق|اجاره/.test(t);
    var hasBigNumber = /\d{1,3}(?:,\d{3})+|\d{6,}/.test(t);
    var hasDate = /\d{4}\/\d{1,2}\/\d{1,2}|\d{2}\/\d{1,2}\/\d{1,2}/.test(t);

    if (hasBankWord && hasBigNumber) return true;
    if (hasMoneyWord && (hasDirWord || hasBigNumber)) return true;
    if (hasDirWord && hasBigNumber && hasDate) return true;
    return false;
}

/* ============================================================
   بخش ۹ — پیشنهادها
   ============================================================ */
function suggestAmount(text) {
    var t = normalizeDigits(String(text || ''));
    var m1 = t.match(/مبلغ\s*[:ـ]?\s*([\d,]+)/);
    if (m1) { var v1 = Number(m1[1].replace(/,/g, '')); if (v1 > 0) return v1; }
    var m2 = t.match(/([\d]{1,3}(?:,[\d]{3})+)/);
    if (m2) { var v2 = Number(m2[1].replace(/,/g, '')); if (v2 > 0) return v2; }
    var m3 = t.match(/\b(\d{6,})\b/);
    if (m3) return Number(m3[1]);
    return 0;
}

function suggestDate(text) {
    var t = normalizeDigits(String(text || ''));
    var m = t.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (m) return m[1] + '/' + pad2(m[2]) + '/' + pad2(m[3]);

    var m2 = t.match(/(\d{2})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (m2) {
        var y = Number(m2[1]);
        var cy = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate())[0];
        if (y < 100) y += Math.floor(cy / 100) * 100;
        return y + '/' + pad2(m2[2]) + '/' + pad2(m2[3]);
    }
    return todayJalaliStr();
}

function suggestDescription(text) {
    var lines = String(text || '').split('\n');
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim().replace(/^\*+|\*+$/g, '').trim();
        if (!line || line.length > 40) continue;
        if (/\d/.test(line)) continue;
        if (/بانک|حساب|کارت|شبا|ریال|تومان|مبلغ|موجودی/.test(line)) continue;
        return line;
    }
    return '';
}

function suggestLabel(text, bankName, dir) {
    var bank = bankName || '';
    if (!bank) {
        var m = String(text || '').match(/بانک\s+([^\s*،,\n]+)/);
        if (m) bank = 'بانک ' + m[1];
    }
    var dirLabel = dir === 'out' ? 'برداشت' : (dir === 'in' ? 'واریز' : 'تراکنش');
    return (bank ? bank + ' — ' : '') + dirLabel;
}

/* ============================================================
   بخش ۱۰ — CRUD الگو
   ============================================================ */
function addSmsPattern(opts) {
    var patterns = loadSmsPatterns();
    var built = buildSmsPattern(opts.raw || '');
    var key = opts.key || built.key;
    var existing = patterns.find(function (p) { return p.key === key; });

    if (existing) {
        existing.uses = (existing.uses || 0) + 1;
        existing.lastUsed = Date.now();
        if (opts.label) existing.label = opts.label;
        if (opts.direction) existing.direction = opts.direction;
        if (opts.linkedAccountId) existing.linkedAccountId = opts.linkedAccountId;
        if (opts.slots) existing.slots = opts.slots;
        if (opts.voucherDesc) existing.voucherDesc = opts.voucherDesc;
        if (opts.lineDesc) existing.lineDesc = opts.lineDesc;
        saveSmsPatterns(patterns);
        return existing;
    }

    var rec = {
        id: 'sp_' + uid(),
        key: key,
        raw: built.raw,
        tokens: built.tokens,
        mapping: opts.mapping || built.mapping,
        slots: opts.slots || {},
        label: opts.label || 'الگوی پیامک',
        direction: opts.direction || '',
        linkedAccountId: opts.linkedAccountId || '',
        voucherDesc: opts.voucherDesc || opts.label || 'تراکنش بانکی',
        lineDesc: opts.lineDesc || opts.label || 'تراکنش بانکی',
        uses: 1,
        createdAt: Date.now(),
        lastUsed: Date.now()
    };

    patterns.push(rec);
    saveSmsPatterns(patterns);
    return rec;
}

function bumpSmsPatternUsage(id) {
    var all = loadSmsPatterns();
    var p = all.find(function (x) { return x.id === id; });
    if (!p) return;
    p.uses = (p.uses || 0) + 1;
    p.lastUsed = Date.now();
    saveSmsPatterns(all);
}

function deleteSmsPattern(id) {
    saveSmsPatterns(loadSmsPatterns().filter(function (p) { return p.id !== id; }));
}

/* ============================================================
   بخش ۱۱ — افزودن به باکس ثبت‌نشده‌ها
   ============================================================ */
function addPendingSms(raw, source, force) {
    var text = String(raw || '').trim();
    if (!text) return null;

    var list = getPendingSms();
    if (list.some(function (p) { return p.raw === text; })) return null;
    if (!force && !isBankSms(text)) return null;

    var amount    = suggestAmount(text);
    var direction = detectSmsDirection(text) || '';
    var date      = suggestDate(text);
    var desc      = suggestDescription(text);
    var matched   = (typeof findMatchingBankAccount === 'function') ? findMatchingBankAccount(text) : null;
    var bankM     = text.match(/بانک\s+([^\s*،,\n]+)/);

    var rec = {
        id: 'pd_' + uid(),
        raw: text,
        source: source || 'clipboard',
        createdAt: Date.now(),
        forced: !!force,
        suggestion: {
            amount: amount,
            direction: direction,
            date: date,
            description: desc,
            bankName: bankM ? 'بانک ' + bankM[1] : '',
            linkedAccountId: matched ? matched.id : ''
        }
    };

    list.push(rec);
    savePendingSms(list);
    return rec;
}

function removePendingSms(id) {
    savePendingSms(getPendingSms().filter(function (p) { return p.id !== id; }));
}

function clearPendingSms() {
    savePendingSms([]);
}

/* ============================================================
   بخش ۱۲ — رندر تب ثبت‌نشده‌ها
   ============================================================ */
function renderPendingSmsBox() {
    var box = document.getElementById('pending-sms-list');
    if (!box) return;

    var list = getPendingSms();
    var countEl = document.getElementById('pending-sms-count');
    if (countEl) countEl.textContent = toFa(list.length);

    var searchEl = document.getElementById('pending-sms-search');
    var q = searchEl ? (searchEl.value || '').trim().toLowerCase() : '';

    if (list.length === 0) {
        box.innerHTML = '<div class="widget-empty">📭 پیامک ثبت‌نشده‌ای وجود ندارد.'
            + '<br><span style="font-size:.72rem;opacity:.8">'
            + 'یک پیامک را در کادر پایین پیست کن.'
            + '</span></div>';
        updateSmsBadge();
        return;
    }

    var accounts = DB.load('bankAccounts', []);
    var sorted = list.slice().sort(function (a, b) {
        return (b.createdAt || 0) - (a.createdAt || 0);
    });

    var shown = 0;
    var html = '';

    for (var i = 0; i < sorted.length; i++) {
        var p = sorted[i];

        if (q) {
            var hay = ((p.raw || '') + ' ' + ((p.suggestion && p.suggestion.description) || '') + ' ' + ((p.suggestion && p.suggestion.bankName) || '')).toLowerCase();
            if (hay.indexOf(q) === -1) continue;
        }
        shown++;

        var s = p.suggestion || {};
        var pid = p.id;

        var liveDir = detectSmsDirection(p.raw);
        var effectiveDir = liveDir || s.direction || '';
        var liveAmt = extractAmountWithSign(p.raw);

        var accountOpts = '<option value="">— انتخاب حساب —</option>';
        for (var a = 0; a < accounts.length; a++) {
            var acc = accounts[a];
            var sel = (s.linkedAccountId === acc.id) ? ' selected' : '';
            accountOpts += '<option value="' + acc.id + '"' + sel + '>'
                + esc((acc.bank || '') + ' — ' + (acc.account || '')) + '</option>';
        }

        var clsIn = (effectiveDir === 'in')  ? ' active-in'  : '';
        var clsOut = (effectiveDir === 'out') ? ' active-out' : '';
        var forcedBadge = p.forced ? '<span class="badge">دستی</span>' : '';
        var meta = '📅 ' + toFa(tsToJalaliDate(p.createdAt))
                 + ' — ' + toFa(tsToJalaliTime(p.createdAt));

        var autoHint = '';
        if (liveDir && (!s.direction || s.direction !== liveDir)) {
            autoHint = liveDir === 'in'
                ? ' <span style="color:#059669;font-size:.68rem;font-weight:800">(تشخیص خودکار: واریز)</span>'
                : ' <span style="color:#dc2626;font-size:.68rem;font-weight:800">(تشخیص خودکار: برداشت)</span>';
        }

        html += '<div class="pending-sms-card psm-new" data-pid="' + pid + '">'
            +   '<div class="psm-head">'
            +     '<div><div class="title">🔔 پیامک جدید' + forcedBadge + autoHint + '</div>'
            +     '<div class="meta">' + esc(meta) + '</div></div>'
            +   '</div>'
            +   '<div class="psm-text-wrap">'
            +     '<div class="psm-text-toggle" data-toggle="text"><span>📄 متن پیامک</span><span class="arrow">◀</span></div>'
            +     '<div class="psm-text-body">' + esc(p.raw) + '</div>'
            +   '</div>'
            +   '<div class="psm-body">'
            +     '<div class="psm-dir-box">'
            +       '<button type="button" class="psm-dir-btn' + clsIn + '" data-dir="in" data-pid="' + pid + '">'
            +         '<span class="icon">📥</span><span class="lbl">واریز</span></button>'
            +       '<button type="button" class="psm-dir-btn' + clsOut + '" data-dir="out" data-pid="' + pid + '">'
            +         '<span class="icon">📤</span><span class="lbl">برداشت</span></button>'
            +     '</div>'
            +     '<input type="hidden" data-field="direction" value="' + effectiveDir + '">'
            +     '<div class="psm-field">'
            +       '<label>💰 مبلغ (ریال)</label>'
            +       '<input type="text" class="amount-input" inputmode="numeric" dir="ltr" data-field="amount" value="'
            +       ((liveAmt.amount || s.amount) ? formatRaw(liveAmt.amount || s.amount) : '') + '">'
            +     '</div>'
            +     '<div class="psm-field">'
            +       '<label>🏦 حساب بانکی</label>'
            +       '<select data-field="account">' + accountOpts + '</select>'
            +     '</div>'
            +     '<div class="psm-row-2">'
            +       '<div class="psm-field"><label>📅 تاریخ</label>'
            +         '<input type="text" dir="ltr" class="date-picker" data-field="date" value="' + esc(s.date || todayJalaliStr()) + '"></div>'
            +       '<div class="psm-field"><label>📝 شرح سند</label>'
            +         '<input type="text" data-field="voucherDesc" value="' + esc(suggestLabel(p.raw, s.bankName, effectiveDir)) + '"></div>'
            +     '</div>'
            +     '<div class="psm-field">'
            +       '<label>📝 شرح قلم</label>'
            +       '<input type="text" data-field="lineDesc" value="' + esc(suggestLabel(p.raw, s.bankName, effectiveDir)) + '">'
            +     '</div>'
            +     '<div class="psm-field">'
            +       '<label>🏷 نام الگو (برای شناسایی خودکار)</label>'
            +       '<input type="text" data-field="label" value="' + esc(suggestLabel(p.raw, s.bankName, effectiveDir)) + '">'
            +     '</div>'
            +   '</div>'
            +   '<div class="psm-actions">'
            +     '<button class="psm-btn-primary" data-action="save-with-voucher" data-id="' + pid + '">✅ ثبت + ساخت سند</button>'
            +     '<button class="psm-btn-secondary" data-action="save-pattern-only" data-id="' + pid + '">🧠 فقط ثبت الگو</button>'
            +     '<button class="psm-btn-danger" data-action="drop" data-id="' + pid + '">🗑</button>'
            +   '</div>'
            + '</div>';
    }

    if (shown === 0) {
        html = '<div class="widget-empty">🔍 نتیجه‌ای با این جستجو یافت نشد.</div>';
    }

    box.innerHTML = html;
    if (typeof attachDatePickers === 'function') attachDatePickers();
    bindPendingEventsNew(box);
    updateSmsBadge();
}

function bindPendingEventsNew(box) {
    box.querySelectorAll('.psm-text-toggle').forEach(function (t) {
        t.onclick = function () {
            var body = this.nextElementSibling;
            if (!body) return;
            var isOpen = body.classList.toggle('show');
            this.classList.toggle('open', isOpen);
        };
    });

    box.querySelectorAll('.psm-dir-btn').forEach(function (btn) {
        btn.onclick = function () {
            var card = this.closest('.pending-sms-card');
            if (!card) return;
            var dir = this.getAttribute('data-dir');

            card.querySelectorAll('.psm-dir-btn').forEach(function (b) {
                b.classList.remove('active-in', 'active-out');
            });
            this.classList.add(dir === 'in' ? 'active-in' : 'active-out');

            var hidden = card.querySelector('[data-field="direction"]');
            if (hidden) hidden.value = dir;
        };
    });

    box.querySelectorAll('[data-field="amount"]').forEach(function (inp) {
        inp.oninput = function () {
            this.value = normalizeDigits(this.value).replace(/[^\d]/g, '');
        };
        inp.onblur = function () {
            var v = Number(normalizeDigits(this.value).replace(/[^\d]/g, '')) || 0;
            this.value = v ? formatRaw(v) : '';
        };
    });

    box.querySelectorAll('[data-action]').forEach(function (btn) {
        btn.onclick = function () {
            var action = this.getAttribute('data-action');
            var pid = this.getAttribute('data-id');
            if (action === 'drop') {
                if (!confirm('این پیامک حذف شود؟')) return;
                removePendingSms(pid);
                renderPendingSmsBox();
                return;
            }
            if (action === 'save-pattern-only') return savePendingAsPattern(pid, false);
            if (action === 'save-with-voucher')  return savePendingAsPattern(pid, true);
        };
    });
}

/* ============================================================
   بخش ۱۳ — ذخیره الگو از باکس ثبت‌نشده
   ============================================================ */
function savePendingAsPattern(pid, withVoucher) {
    var card = document.querySelector('.pending-sms-card[data-pid="' + pid + '"]');
    if (!card) return;

    var pending = getPendingSms().find(function (p) { return p.id === pid; });
    if (!pending) return;

    var accountId   = card.querySelector('[data-field="account"]').value;
    var amountStr   = card.querySelector('[data-field="amount"]').value;
    var dirHidden   = card.querySelector('[data-field="direction"]').value;
    var dateStr     = card.querySelector('[data-field="date"]').value;
    var voucherDesc = card.querySelector('[data-field="voucherDesc"]').value;
    var lineDesc    = card.querySelector('[data-field="lineDesc"]').value;
    var labelStr    = card.querySelector('[data-field="label"]').value;

    var amount = Number(normalizeDigits(amountStr).replace(/[^\d]/g, '')) || 0;
    var direction = dirHidden;

    if (!amount)    { alert('⚠️ مبلغ را وارد کنید.'); return; }
    if (!direction) { alert('⚠️ واریز یا برداشت را انتخاب کنید.'); return; }
    if (!labelStr.trim()) { alert('⚠️ نام الگو اجباری است.'); return; }
    if (withVoucher && !accountId) { alert('⚠️ برای ساخت سند، حساب بانکی را انتخاب کنید.'); return; }

    var built = buildSmsPattern(pending.raw);
    var amountSlot = null;
    for (var slot in built.mapping) {
        var numVal = Number(String(built.mapping[slot]).replace(/[^\d]/g, ''));
        if (numVal === amount) { amountSlot = parseInt(slot.slice(1), 10); break; }
    }

    addSmsPattern({
        raw: pending.raw,
        key: built.key,
        tokens: built.tokens,
        mapping: built.mapping,
        slots: { amount: amountSlot },
        label: labelStr.trim(),
        direction: direction,
        linkedAccountId: accountId,
        voucherDesc: voucherDesc.trim() || labelStr.trim(),
        lineDesc: lineDesc.trim() || labelStr.trim()
    });

    if (typeof addSmsToInbox === 'function') {
        var res = addSmsToInbox(pending.raw, 'learned');
        if (res.ok) {
            var inbox = getSmsInbox();
            for (var i = 0; i < inbox.length; i++) {
                if (inbox[i].id === res.item.id) {
                    inbox[i].status = 'converted';
                    inbox[i].parsed.direction = direction;
                    inbox[i].parsed.amount = amount;
                }
            }
            saveSmsInbox(inbox);
            renderSmsInbox();
        }
    }

    if (withVoucher) {
        createVoucherFromPending({
            bankAccountId: accountId,
            amount: amount,
            direction: direction,
            date: normalizeDigits(dateStr).trim() || todayJalaliStr(),
            voucherDesc: voucherDesc.trim() || labelStr.trim(),
            lineDesc: lineDesc.trim() || labelStr.trim()
        });
    }

    removePendingSms(pid);
    renderPendingSmsBox();
    renderSmsPatternsTab();
    updateSmsBadge();

    showToast(withVoucher
        ? '✅ الگو ثبت شد + سند ساخته شد (' + (direction === 'in' ? 'واریز' : 'برداشت') + ')'
        : '🧠 الگو ثبت شد (' + (direction === 'in' ? 'واریز' : 'برداشت') + ')');
}

/* ============================================================
   بخش ۱۴ — ساخت سند از یک pending
   ============================================================ */
function createVoucherFromPending(data) {
    if (typeof getBankMoeinId !== 'function') {
        alert('تابع معین بانک یافت نشد.');
        return;
    }
    var bankMoein = getBankMoeinId();
    if (!bankMoein) {
        alert('⚠️ معین بانک در چارت حساب‌ها تعریف نشده.');
        return;
    }

    var bankDetail = data.bankAccountId ? { bank: data.bankAccountId } : {};
    var lines = [];
    var vDesc = data.voucherDesc || data.description || '';
    var lDesc = data.lineDesc || data.description || '';

    if (data.direction === 'out') {
        lines.push({
            id: uid(), account: '', details: {},
            debit: data.amount, credit: 0,
            description: lDesc
        });
        lines.push({
            id: uid(), account: bankMoein, details: bankDetail,
            debit: 0, credit: data.amount,
            description: lDesc, locked: true
        });
    } else {
        lines.push({
            id: uid(), account: bankMoein, details: bankDetail,
            debit: data.amount, credit: 0,
            description: lDesc, locked: true
        });
        lines.push({
            id: uid(), account: '', details: {},
            debit: 0, credit: data.amount,
            description: lDesc
        });
    }

    var vl = DB.load('vouchers', []);
    var v = {
        id: uid(),
        number: (typeof getNextVoucherNumberForPeriod === 'function')
                ? getNextVoucherNumberForPeriod(state.activePeriodId || '')
                : String(vl.length + 1),
        date: data.date || todayJalaliStr(),
        type: 'general',
        periodId: state.activePeriodId || '',
        desc: vDesc,
        lines: lines,
        status: 'draft'
    };
    vl.push(v);
    DB.save('vouchers', vl);

    if (typeof loadVoucherForEdit === 'function') loadVoucherForEdit(v);
    else if (typeof goToPage === 'function') goToPage('voucher-list');

    showToast('📝 پیش‌نویس سند آماده شد');
}

/* ============================================================
   بخش ۱۵ — استخراج مقادیر از الگو
   ============================================================ */
function extractValuesFromPattern(newRaw, pattern) {
    var built = buildSmsPattern(newRaw);
    var result = {
        amount: 0, direction: '', date: '',
        bankAccountId: pattern.linkedAccountId || ''
    };
    if (pattern.slots && pattern.slots.amount) {
        var rawVal = built.mapping['#' + pattern.slots.amount];
        if (rawVal) result.amount = Number(String(rawVal).replace(/[^\d]/g, '')) || 0;
    }
    if (!result.amount) result.amount = suggestAmount(newRaw);
    result.direction = pattern.direction || detectSmsDirection(newRaw);
    result.date = suggestDate(newRaw);
    return result;
}

/* ============================================================
   بخش ۱۶ — ورودی پیامک
   ============================================================ */
function handleIncomingSms(text, source, force) {
    var t = String(text || '').trim();
    if (!t) return { ok: false, reason: 'empty' };
    if (!force && !isBankSms(t)) return { ok: false, reason: 'not-bank' };

    var m = findMatchingSmsPattern(t);
    if (m) {
        var res = addSmsToInbox(t, source || 'clipboard');
        if (res.ok) {
            bumpSmsPatternUsage(m.pattern.id);
            renderSmsInbox();
            updateSmsBadge();

            var vals = extractValuesFromPattern(t, m.pattern);
            var amtTxt = vals.amount ? formatMoney(vals.amount) + ' ' + currencyLabel() : '';
            showToast('📱 شناسایی شد' + (amtTxt ? ' — ' + amtTxt : '') + ' (' + m.pattern.label + ')');
            return { ok: true, matched: true, pattern: m.pattern, values: vals };
        }
        if (res.reason === 'duplicate') return { ok: false, reason: 'duplicate' };
    }

    var added = addPendingSms(t, source || 'clipboard', force);
    if (added) {
        renderPendingSmsBox();
        updateSmsBadge();
        showToast(force ? '🔔 به‌صورت دستی اضافه شد' : '🔔 پیامک جدید — برای ثبت الگو بازبینی کن');
        return { ok: true, matched: false, pending: added };
    }
    return { ok: false, reason: 'duplicate' };
}

/* ============================================================
   بخش ۱۷ — خواندن کلیپ‌بورد
   ============================================================ */
var _lastClipboardText = '';

function readClipboardAndAdd(auto) {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
        if (!auto) alert('مرورگر از کلیپ‌بورد پشتیبانی نمی‌کند.');
        return;
    }

    navigator.clipboard.readText().then(function (text) {
        var t = String(text || '').trim();
        if (!t) { if (!auto) alert('کلیپ‌بورد خالی است.'); return; }
        if (auto && t === _lastClipboardText) return;

        var res = handleIncomingSms(t, auto ? 'auto' : 'clipboard');
        if (res.ok) { _lastClipboardText = t; return; }

        if (res.reason === 'duplicate') { if (!auto) showToast('قبلاً ثبت شده.'); return; }

        if (res.reason === 'not-bank') {
            if (auto) return;
            var preview = t.length > 300 ? t.slice(0, 300) + '…' : t;
            var ok = confirm('❌ این متن به‌عنوان پیامک بانکی شناسایی نشد.\n\n'
                + 'محتوا:\n' + preview + '\n\nاگر مطمئنی این پیامک بانکیه، «OK» بزن تا به باکس اضافه بشه.');
            if (!ok) return;
            var forced = handleIncomingSms(t, 'manual', true);
            if (forced.ok) _lastClipboardText = t;
            else showToast('قبلاً ثبت شده بود.');
            return;
        }
        if (!auto) alert('پیامک قابل پردازش نبود.');
    }).catch(function () {
        if (!auto) alert('دسترسی به کلیپ‌بورد داده نشد.');
    });
}

function checkClipboardSupport() {
    var el = document.getElementById('clip-status');
    if (!el) return;
    if (navigator.clipboard && navigator.clipboard.readText) {
        el.textContent = 'در دسترس';
        el.className = 'method-status ok';
    } else {
        el.textContent = 'ندارد';
        el.className = 'method-status no';
    }
}

/* ============================================================
   بخش ۱۸ — رندر تب inbox (با جستجو، فیلتر، چک‌باکس)
   ============================================================ */
function renderSmsInbox() {
    var box = document.getElementById('sms-inbox-list');
    if (!box) return;

    var list = getSmsInbox();
    var countEl = document.getElementById('sms-inbox-count');
    if (countEl) countEl.textContent = toFa(list.length);

    var searchEl = document.getElementById('sms-inbox-search');
    var statusEl = document.getElementById('sms-inbox-status-filter');
    var q = searchEl ? (searchEl.value || '').trim().toLowerCase() : '';
    var statusF = statusEl ? statusEl.value : '';

    if (list.length === 0) {
        box.innerHTML = '<div class="widget-empty">📭 صندوق خالی است.</div>';
        return;
    }

    var filtered = list.slice();
    if (statusF) filtered = filtered.filter(function (s) { return s.status === statusF; });
    if (q) {
        filtered = filtered.filter(function (s) {
            var p = s.parsed || {};
            var hay = ((s.rawText || '') + ' ' + (p.bankName || '') + ' ' + (p.matchedAccountTitle || '')).toLowerCase();
            return hay.indexOf(q) !== -1;
        });
    }

    filtered.sort(function (a, b) { return (b.receivedAt || 0) - (a.receivedAt || 0); });

    if (filtered.length === 0) {
        box.innerHTML = '<div class="widget-empty">🔍 نتیجه‌ای یافت نشد.</div>';
        return;
    }

    var html = '';
    filtered.forEach(function (s) {
        var p = s.parsed || {};
        var dirLabel, dirClass;
        if (p.direction === 'out') { dirLabel = '🔴 برداشت'; dirClass = 'out'; }
        else if (p.direction === 'in') { dirLabel = '🟢 واریز'; dirClass = 'in'; }
        else { dirLabel = '❓'; dirClass = ''; }

        var statusBadge, statusClass;
        if (s.status === 'converted') { statusBadge = '✓ ثبت شده'; statusClass = 'status-converted'; }
        else if (s.status === 'ignored') { statusBadge = '— نادیده'; statusClass = 'status-ignored'; }
        else { statusBadge = '🔔 ثبت نشده'; statusClass = 'status-new'; }

        var meta = '📅 ' + toFa(tsToJalaliDate(s.receivedAt))
                 + ' — ' + toFa(tsToJalaliTime(s.receivedAt));

        var parsedHtml = '';
        if (p.bankName) parsedHtml += '<span class="pill">🏦 ' + esc(p.bankName) + '</span>';
        if (p.amount) parsedHtml += '<span class="pill ' + dirClass + '">' + dirLabel + ': '
                                  + formatMoney(p.amount) + ' ' + currencyLabel() + '</span>';
        else parsedHtml += '<span class="pill">' + dirLabel + '</span>';
        if (p.balance) parsedHtml += '<span class="pill">💰 ' + formatMoney(p.balance) + '</span>';
        if (p.matchedAccountTitle) parsedHtml += '<span class="pill" style="background:#d1fae5;color:#065f46">🎯 '
                                              + esc(p.matchedAccountTitle) + '</span>';

        var canConvert = (s.status === 'new');
        var checkboxHtml = '<input type="checkbox" class="sms-select-cb" data-sid="' + s.id + '" style="width:18px;height:18px;accent-color:var(--primary);cursor:pointer;margin-left:8px" title="انتخاب برای سند ترکیبی">';

        html += '<div class="sms-item ' + statusClass + '">'
             +  '<div class="sms-item-head"><div style="display:flex;align-items:flex-start;gap:4px">'
             +    checkboxHtml
             +    '<div><div class="title">' + statusBadge + '</div>'
             +    '<div class="meta">' + esc(meta) + '</div></div>'
             +  '</div></div>'
             +  '<div class="sms-item-parsed">' + parsedHtml + '</div>'
             +  '<div class="sms-item-text">' + esc(s.rawText) + '</div>'
             +  '<div class="sms-item-actions">'
             +    '<button class="btn-convert" data-action="convert" data-id="' + s.id + '"'
             +    (canConvert ? '' : ' disabled') + '>📝 ساخت سند</button>'
             +    '<button class="btn-ignore" data-action="ignore" data-id="' + s.id + '">🚫</button>'
             +    '<button class="btn-delete" data-action="delete" data-id="' + s.id + '">🗑</button>'
             +  '</div>'
             +  '</div>';
    });

    box.innerHTML = html;

    box.querySelectorAll('[data-action]').forEach(function (btn) {
        btn.onclick = function () {
            var action = this.getAttribute('data-action');
            var id = this.getAttribute('data-id');

            if (action === 'convert') {
                if (typeof convertSmsToVoucher === 'function') {
                    try { convertSmsToVoucher(id); }
                    catch (e) { alert('خطا در ساخت سند:\n' + (e.message || e)); }
                }
                return;
            }
            if (action === 'ignore') {
                var l = getSmsInbox();
                for (var x = 0; x < l.length; x++) if (l[x].id === id) l[x].status = 'ignored';
                saveSmsInbox(l);
                renderSmsInbox();
                updateSmsBadge();
                return;
            }
            if (action === 'delete') {
                if (!confirm('این پیامک از صندوق حذف شود؟')) return;
                var l2 = getSmsInbox().filter(function (x) { return x.id !== id; });
                saveSmsInbox(l2);
                renderSmsInbox();
                updateSmsBadge();
                return;
            }
        };
    });
}

/* ============================================================
   بخش ۱۹ — ساخت سند ترکیبی از چند پیامک
   ============================================================ */
function convertMultipleSmsToVoucher() {
    var checked = document.querySelectorAll('.sms-select-cb:checked');
    if (checked.length === 0) {
        alert('⚠️ ابتدا یک یا چند پیامک را انتخاب کنید.');
        return;
    }

    var bankMoein = (typeof getBankMoeinId === 'function') ? getBankMoeinId() : '';
    if (!bankMoein) {
        alert('⚠️ معین بانک در چارت حساب‌ها تعریف نشده.');
        return;
    }

    var allInbox = getSmsInbox();
    var selected = [];
    checked.forEach(function (cb) {
        var sid = cb.getAttribute('data-sid');
        var item = allInbox.find(function (x) { return x.id === sid; });
        if (item) selected.push(item);
    });

    if (selected.length === 0) return;

    var lines = [];
    var usedIds = [];
    var descriptions = [];
    var totalAmount = 0;
    var skippedCount = 0;

    selected.forEach(function (s) {
        var p = s.parsed || {};
        var amount = Number(p.amount) || 0;
        var dir = p.direction || '';
        var bankAccId = p.matchedAccountId || '';

        if (!amount || !dir) {
            skippedCount++;
            return;
        }

        var pattern = findMatchingSmsPattern(s.rawText);
        var voucherDesc = (pattern && pattern.pattern.voucherDesc) || (p.bankName || '') + ' — ' + (dir === 'in' ? 'واریز' : 'برداشت');
        var lineDesc = (pattern && pattern.pattern.lineDesc) || voucherDesc;

        var bankDetail = bankAccId ? { bank: bankAccId } : {};

        if (dir === 'out') {
            lines.push({
                id: uid(), account: '', details: {},
                debit: amount, credit: 0,
                description: lineDesc
            });
            lines.push({
                id: uid(), account: bankMoein, details: bankDetail,
                debit: 0, credit: amount,
                description: lineDesc, locked: true
            });
        } else {
            lines.push({
                id: uid(), account: bankMoein, details: bankDetail,
                debit: amount, credit: 0,
                description: lineDesc, locked: true
            });
            lines.push({
                id: uid(), account: '', details: {},
                debit: 0, credit: amount,
                description: lineDesc
            });
        }

        totalAmount += amount;
        descriptions.push(voucherDesc);
        usedIds.push(s.id);
    });

    if (lines.length === 0) {
        alert('⚠️ هیچ‌کدام از پیامک‌های انتخاب‌شده مبلغ یا جهت مشخص ندارند.');
        return;
    }

    var voucherDesc = 'سند ترکیبی پیامک بانکی — ' + toFa(usedIds.length) + ' تراکنش';
    if (descriptions.length <= 3) {
        var uniq = descriptions.filter(function (d, i, arr) { return arr.indexOf(d) === i; });
        voucherDesc = uniq.join(' + ');
    }

    var vl = DB.load('vouchers', []);
    var v = {
        id: uid(),
        number: (typeof getNextVoucherNumberForPeriod === 'function')
                ? getNextVoucherNumberForPeriod(state.activePeriodId || '')
                : String(vl.length + 1),
        date: todayJalaliStr(),
        type: 'general',
        periodId: state.activePeriodId || '',
        desc: voucherDesc,
        lines: lines,
        status: 'draft'
    };
    vl.push(v);
    DB.save('vouchers', vl);

    // Update inbox statuses
    var inbox = getSmsInbox();
    for (var i = 0; i < inbox.length; i++) {
        if (usedIds.indexOf(inbox[i].id) !== -1) {
            inbox[i].status = 'converted';
            inbox[i].voucherId = v.id;
        }
    }
    saveSmsInbox(inbox);

    renderSmsInbox();
    updateSmsBadge();

    var msg = '✅ سند ترکیبی ساخته شد — ' + toFa(usedIds.length) + ' پیامک';
    if (skippedCount > 0) msg += '\n⚠️ ' + toFa(skippedCount) + ' پیامک به‌دلیل مبلغ/جهت نامشخص رد شد.';
    alert(msg);

    if (typeof loadVoucherForEdit === 'function') loadVoucherForEdit(v);
    else if (typeof goToPage === 'function') goToPage('voucher-list');
}

/* ============================================================
   بخش ۲۰ — رندر تب الگوها
   ============================================================ */
function renderSmsPatternsTab() {
    var box = document.getElementById('sms-patterns-list');
    if (!box) return;

    var patterns = loadSmsPatterns();
    var countEl = document.getElementById('sms-patterns-count');
    if (countEl) countEl.textContent = toFa(patterns.length);

    var searchEl = document.getElementById('sms-patterns-search');
    var q = searchEl ? (searchEl.value || '').trim().toLowerCase() : '';

    if (patterns.length === 0) {
        box.innerHTML = '<div class="widget-empty">هنوز الگویی ثبت نشده. یک پیامک جدید اضافه کنید تا الگو یاد بگیرد.</div>';
        return;
    }

    var accounts = DB.load('bankAccounts', []);
    var accMap = {};
    accounts.forEach(function (a) { accMap[a.id] = a; });

    var sorted = patterns.slice().sort(function (a, b) {
        if (a.blocked !== b.blocked) return a.blocked ? 1 : -1;
        return (b.lastUsed || 0) - (a.lastUsed || 0);
    });

    var shown = 0;
    var html = '<div style="display:grid;gap:12px">';

    for (var i = 0; i < sorted.length; i++) {
        var p = sorted[i];
        var linkedAcc = accMap[p.linkedAccountId];
        var accLabel = linkedAcc ? ((linkedAcc.bank || '') + ' — ' + (linkedAcc.account || '')) : '— (تعیین نشده)';
        var dirLabel = p.direction === 'out' ? '🔴 برداشت'
                     : p.direction === 'in' ? '🟢 واریز' : '❔ نامشخص';
        var dirCls = p.direction === 'out' ? 'badge-draft'
                   : p.direction === 'in' ? 'badge-approved' : '';

        if (q) {
            var hay = ((p.label || '') + ' ' + (accLabel || '') + ' ' + (p.voucherDesc || '') + ' ' + (p.lineDesc || '')).toLowerCase();
            if (hay.indexOf(q) === -1) continue;
        }
        shown++;

        var preview = (p.tokens || []).join(' ');
        if (preview.length > 140) preview = preview.slice(0, 140) + '…';
        var blockedBadge = p.blocked ? ' <span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:8px;font-size:.66rem;font-weight:800">🚫 مسدود</span>' : '';
        var opacity = p.blocked ? 'opacity:.65;' : '';

        html += '<div class="card" style="margin:0;padding:14px;' + opacity + '">'
            + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;margin-bottom:8px">'
            +   '<div style="flex:1;min-width:0">'
            +     '<div style="font-weight:800;color:var(--primary-dark);font-size:.95rem">'
            +       esc(p.label || 'بدون نام') + blockedBadge + '</div>'
            +     '<div style="font-size:.74rem;color:var(--text-muted);margin-top:4px;display:flex;gap:8px;flex-wrap:wrap">'
            +       '<span>🏦 ' + esc(accLabel) + '</span>'
            +       '<span class="badge ' + dirCls + '">' + dirLabel + '</span>'
            +     '</div>'
            +   '</div>'
            +   '<div style="display:flex;gap:6px;flex-wrap:wrap">'
            +     '<button type="button" onclick="window.openEditSmsPattern(\'' + p.id + '\')" '
            +       'style="background:#dbeafe;color:#1e40af;border:none;border-radius:9px;padding:8px 12px;font-family:inherit;font-weight:800;font-size:.8rem;cursor:pointer">✏️ ویرایش</button>'
            +     '<button type="button" data-pattern-block="' + p.id + '" '
            +       'style="background:' + (p.blocked ? '#d1fae5;color:#065f46' : '#fef3c7;color:#92400e') + ';border:none;border-radius:9px;padding:8px 12px;font-family:inherit;font-weight:800;font-size:.8rem;cursor:pointer">'
            +       (p.blocked ? '✅ رفع' : '🚫 مسدود') + '</button>'
            +     '<button type="button" data-pattern-del="' + p.id + '" '
            +       'style="background:#fee2e2;color:#dc2626;border:none;border-radius:9px;padding:8px 12px;font-family:inherit;font-weight:800;font-size:.8rem;cursor:pointer">🗑</button>'
            +   '</div>'
            + '</div>'
            + '<div style="background:var(--card-alt);border:1px solid var(--border);border-radius:10px;padding:10px;font-size:.76rem;direction:rtl;line-height:1.8;margin-bottom:8px">'
            +   '<div style="color:var(--text-muted);margin-bottom:4px;font-weight:700">نمونهٔ الگو:</div>'
            +   '<div style="font-family:monospace;direction:rtl;white-space:pre-wrap;word-break:break-word;color:var(--primary-dark)">' + esc(preview) + '</div>'
            + '</div>'
            + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;font-size:.78rem">'
            +   '<div><span style="color:var(--text-muted);font-weight:700">شرح سند:</span> ' + esc(p.voucherDesc || '—') + '</div>'
            +   '<div><span style="color:var(--text-muted);font-weight:700">شرح قلم:</span> ' + esc(p.lineDesc || '—') + '</div>'
            + '</div>'
            + '<div style="display:flex;gap:12px;flex-wrap:wrap;font-size:.72rem;color:var(--text-muted)">'
            +   '<span>📊 ' + toFa(p.uses || 0) + ' بار</span>'
            +   '<span>📅 ' + (p.lastUsed ? toFa(tsToJalaliDate(p.lastUsed)) + ' ' + toFa(tsToJalaliTime(p.lastUsed)) : '—') + '</span>'
            + '</div>'
            + '</div>';
    }

    html += '</div>';

    if (shown === 0) {
        html = '<div class="widget-empty">🔍 نتیجه‌ای با این جستجو یافت نشد.</div>';
    }

    box.innerHTML = html;

    box.querySelectorAll('[data-pattern-del]').forEach(function (b) {
        b.onclick = function () {
            var id = this.getAttribute('data-pattern-del');
            var pat = loadSmsPatterns().find(function (x) { return x.id === id; });
            if (!pat) return;
            if (!confirm('الگوی «' + (pat.label || '') + '» حذف شود؟')) return;
            deleteSmsPattern(id);
            renderSmsPatternsTab();
            showToast('🗑 حذف شد');
        };
    });

    box.querySelectorAll('[data-pattern-block]').forEach(function (b) {
        b.onclick = function () {
            var id = this.getAttribute('data-pattern-block');
            var all = loadSmsPatterns();
            var idx = -1;
            for (var j = 0; j < all.length; j++) if (all[j].id === id) { idx = j; break; }
            if (idx === -1) return;
            all[idx].blocked = !all[idx].blocked;
            saveSmsPatterns(all);
            renderSmsPatternsTab();
            showToast(all[idx].blocked ? '🚫 مسدود شد' : '✅ رفع مسدودی');
        };
    });
}

/* ============================================================
   بخش ۲۱ — ویرایش الگو
   ============================================================ */
function openEditSmsPattern(patternId) {
    try {
        var patterns = loadSmsPatterns();
        var p = patterns.find(function (x) { return x.id === patternId; });
        if (!p) { showToast('الگو یافت نشد.'); return; }

        var old = document.getElementById('sms-edit-modal');
        if (old) old.remove();
        var oldO = document.getElementById('sms-edit-overlay');
        if (oldO) oldO.remove();

        var accounts = DB.load('bankAccounts', []);
        var accOpts = '<option value="">— تعیین نشده —</option>';
        for (var i = 0; i < accounts.length; i++) {
            var a = accounts[i];
            var sel = (p.linkedAccountId === a.id) ? ' selected' : '';
            accOpts += '<option value="' + a.id + '"' + sel + '>'
                + esc((a.bank || '') + ' — ' + (a.account || '')) + '</option>';
        }

        var dirIn  = p.direction === 'in'  ? 'checked' : '';
        var dirOut = p.direction === 'out' ? 'checked' : '';
        var preview = (p.tokens || []).join(' ');

        var html = ''
            + '<div id="sms-edit-overlay" class="overlay show" style="z-index:1400"></div>'
            + '<div id="sms-edit-modal" class="modal show" style="max-width:580px;z-index:1410">'
            +   '<div class="modal-head"><h2>✏️ ویرایش الگوی پیامک</h2>'
            +     '<button type="button" id="sms-edit-close" class="close-btn">×</button></div>'
            +   '<div class="modal-body">'
            +     '<div class="field"><label>نام الگو</label>'
            +       '<input type="text" id="se-label" value="' + esc(p.label || '') + '"></div>'
            +     '<div class="field"><label>حساب بانکی مرتبط</label>'
            +       '<select id="se-account">' + accOpts + '</select></div>'
            +     '<div class="field"><label>جهت تراکنش</label>'
            +       '<div style="display:flex;gap:8px">'
            +         '<label style="flex:1;display:flex;align-items:center;gap:6px;padding:10px;background:var(--card-alt);border-radius:10px;cursor:pointer;border:1.5px solid var(--border);justify-content:center">'
            +           '<input type="radio" name="se_dir" value="in" ' + dirIn + ' style="accent-color:#059669"> 📥 واریز</label>'
            +         '<label style="flex:1;display:flex;align-items:center;gap:6px;padding:10px;background:var(--card-alt);border-radius:10px;cursor:pointer;border:1.5px solid var(--border);justify-content:center">'
            +           '<input type="radio" name="se_dir" value="out" ' + dirOut + ' style="accent-color:#dc2626"> 📤 برداشت</label>'
            +       '</div></div>'
            +     '<div class="field"><label>📝 شرح سند</label>'
            +       '<input type="text" id="se-voucherDesc" value="' + esc(p.voucherDesc || '') + '" placeholder="مثلاً: برداشت بانک ملت"></div>'
            +     '<div class="field"><label>📝 شرح قلم</label>'
            +       '<input type="text" id="se-lineDesc" value="' + esc(p.lineDesc || '') + '" placeholder="مثلاً: خرید کالا"></div>'
            +     '<div class="field"><label>نمونه الگو</label>'
            +       '<div style="background:var(--card-alt);border:1px solid var(--border);border-radius:10px;padding:10px;font-family:monospace;font-size:.78rem;direction:rtl;line-height:1.8;max-height:150px;overflow-y:auto">'
            +         esc(preview) + '</div></div>'
            +     '<div class="field"><label style="display:flex;align-items:center;gap:8px;padding:10px;background:var(--card-alt);border-radius:10px;cursor:pointer">'
            +       '<input type="checkbox" id="se-blocked" ' + (p.blocked ? 'checked' : '') + '> '
            +       '<span style="font-size:.82rem">مسدود کردن این الگو</span></label></div>'
            +   '</div>'
            +   '<div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end">'
            +     '<button type="button" id="sms-edit-cancel" class="btn-secondary">انصراف</button>'
            +     '<button type="button" id="sms-edit-save" class="btn-primary">💾 ذخیره</button>'
            +   '</div>'
            + '</div>';

        document.body.insertAdjacentHTML('beforeend', html);

        var closeFn = function () {
            var m = document.getElementById('sms-edit-modal');
            if (m) m.remove();
            var o = document.getElementById('sms-edit-overlay');
            if (o) o.remove();
        };
        document.getElementById('sms-edit-close').onclick = closeFn;
        document.getElementById('sms-edit-cancel').onclick = closeFn;
        document.getElementById('sms-edit-overlay').onclick = closeFn;

        document.getElementById('sms-edit-save').onclick = function () {
            var all = loadSmsPatterns();
            var idx = -1;
            for (var j = 0; j < all.length; j++) if (all[j].id === patternId) { idx = j; break; }
            if (idx === -1) { closeFn(); return; }

            var newLabel = document.getElementById('se-label').value.trim();
            var newAcc = document.getElementById('se-account').value;
            var dirEl = document.querySelector('input[name="se_dir"]:checked');
            var newDir = dirEl ? dirEl.value : '';
            var blocked = document.getElementById('se-blocked').checked;
            var newVoucherDesc = document.getElementById('se-voucherDesc').value.trim();
            var newLineDesc = document.getElementById('se-lineDesc').value.trim();

            if (!newLabel) { alert('نام الگو اجباری است.'); return; }

            all[idx].label = newLabel;
            all[idx].linkedAccountId = newAcc;
            all[idx].direction = newDir;
            all[idx].blocked = blocked;
            all[idx].voucherDesc = newVoucherDesc || newLabel;
            all[idx].lineDesc = newLineDesc || newLabel;
            all[idx].lastEdited = Date.now();
            saveSmsPatterns(all);

            closeFn();
            renderSmsPatternsTab();
            showToast('✅ ذخیره شد' + (blocked ? ' (مسدود)' : ''));
        };
    } catch (err) {
        console.error('خطا در ویرایش الگو:', err);
        alert('خطا: ' + (err.message || err));
    }
}
window.openEditSmsPattern = openEditSmsPattern;

/* ============================================================
   بخش ۲۲ — تبدیل تک پیامک به سند (سازگاری با نسخه قبل)
   ============================================================ */
function convertSmsToVoucher(smsId) {
    console.log('🔄 [SMS] convertSmsToVoucher:', smsId);

    try {
        var list = getSmsInbox();
        var item = list.find(function (s) { return s.id === smsId; });
        if (!item) { showToast('پیامک یافت نشد.'); return; }

        var raw = normalizeDigits(item.rawText);
        var p = item.parsed || {};
        var amount = p.amount || 0;
        var direction = '';
        var bankAccountId = p.matchedAccountId || '';

        var amtRes = extractAmountWithSign(raw);
        if (amtRes.amount > 0 && amtRes.sign) {
            amount = amtRes.amount;
            direction = amtRes.sign === '+' ? 'in' : 'out';
        }

        var matched = findMatchingSmsPattern(item.rawText);
        var patternDirMatches = false;
        var patternLabel = '';
        var voucherDesc = '';
        var lineDesc = '';

        if (matched && matched.pattern) {
            if (!direction && matched.pattern.direction) {
                direction = matched.pattern.direction;
                patternDirMatches = true;
            } else if (direction && matched.pattern.direction === direction) {
                patternDirMatches = true;
            }
            if (!bankAccountId && matched.pattern.linkedAccountId) {
                bankAccountId = matched.pattern.linkedAccountId;
            }
            if (patternDirMatches) {
                patternLabel = matched.pattern.label || '';
                voucherDesc = matched.pattern.voucherDesc || patternLabel;
                lineDesc = matched.pattern.lineDesc || patternLabel;
            }
        }

        if (!direction) direction = detectSmsDirection(raw);

        if (!amount || amount > 1e12) {
            if (amtRes.amount > 0) amount = amtRes.amount;
            else {
                var mamt = raw.match(/مبلغ\s*[:ـ]?\s*([\d][\d,]*)/);
                if (mamt) amount = Number(mamt[1].replace(/,/g, ''));
            }
        }

        if (!amount || amount > 1e13) {
            alert('⚠️ مبلغ قابل تشخیص نیست.\nبرای این پیامک از باکس «ثبت نشده» الگو تعریف کن.');
            return;
        }

        if (!direction) {
            var d = prompt('نوع تراکنش:\n1 = برداشت\n2 = واریز', '1');
            if (d === '1') direction = 'out';
            else if (d === '2') direction = 'in';
            else return;
        }

        if (!bankAccountId) {
            var accounts = DB.load('bankAccounts', []);
            if (accounts.length === 0) { alert('⚠️ هیچ حساب بانکی تعریف نشده.'); return; }
            if (accounts.length === 1) { bankAccountId = accounts[0].id; }
            else {
                var opts = accounts.map(function (a, i) {
                    return (i + 1) + '. ' + (a.bank || '') + ' — ' + (a.account || '');
                }).join('\n');
                var ans = prompt('حساب بانکی:\n\n' + opts + '\n\nشماره:');
                if (!ans) return;
                var idx = Number(normalizeDigits(ans)) - 1;
                if (isNaN(idx) || idx < 0 || idx >= accounts.length) { alert('نامعتبر'); return; }
                bankAccountId = accounts[idx].id;
            }
        }

        var bankMoein = getBankMoeinId();
        if (!bankMoein) {
            var allAccounts = DB.load('accounts', []);
            var leaves = allAccounts.filter(function (a) {
                return !allAccounts.some(function (x) { return x.parent === a.id; });
            });
            if (leaves.length === 0) { alert('⚠️ چارت حساب‌ها خالی است.'); return; }
            var mOpts = leaves.map(function (a, i) { return (i + 1) + '. ' + a.code + ' — ' + a.name; }).join('\n');
            var mAns = prompt('⚠️ معین بانک تعریف نشده.\nلطفاً انتخاب کنید:\n\n' + mOpts + '\n\nشماره:', '1');
            if (!mAns) return;
            var mIdx = Number(normalizeDigits(mAns)) - 1;
            if (isNaN(mIdx) || mIdx < 0 || mIdx >= leaves.length) { alert('نامعتبر'); return; }
            bankMoein = leaves[mIdx].id;
        }

        /* ✅ استفاده از voucherDesc و lineDesc الگو */
        var finalVoucherDesc = voucherDesc || patternLabel || ((direction === 'in' ? 'واریز' : 'برداشت') + (p.bankName ? ' - ' + p.bankName : ''));
        var finalLineDesc = lineDesc || finalVoucherDesc;

        var bankDetail = { bank: bankAccountId };
        var lines = [];

        if (direction === 'out') {
            lines.push({ id: uid(), account: '', details: {}, debit: amount, credit: 0, description: finalLineDesc });
            lines.push({ id: uid(), account: bankMoein, details: bankDetail, debit: 0, credit: amount, description: finalLineDesc, locked: true });
        } else {
            lines.push({ id: uid(), account: bankMoein, details: bankDetail, debit: amount, credit: 0, description: finalLineDesc, locked: true });
            lines.push({ id: uid(), account: '', details: {}, debit: 0, credit: amount, description: finalLineDesc });
        }

        var vl = DB.load('vouchers', []);
        var v = {
            id: uid(),
            number: (typeof getNextVoucherNumberForPeriod === 'function')
                    ? getNextVoucherNumberForPeriod(state.activePeriodId || '')
                    : String(vl.length + 1),
            date: todayJalaliStr(),
            type: 'general',
            periodId: state.activePeriodId || '',
            desc: finalVoucherDesc,
            lines: lines,
            status: 'draft'
        };
        vl.push(v);
        DB.save('vouchers', vl);

        for (var i = 0; i < list.length; i++) {
            if (list[i].id === smsId) {
                list[i].status = 'converted';
                list[i].voucherId = v.id;
                list[i].parsed.amount = amount;
                list[i].parsed.direction = direction;
                list[i].parsed.matchedAccountId = bankAccountId;
            }
        }
        saveSmsInbox(list);

        renderSmsInbox();
        updateSmsBadge();

        if (typeof loadVoucherForEdit === 'function') loadVoucherForEdit(v);
        else if (typeof goToPage === 'function') goToPage('voucher-list');

        var dirLabel = direction === 'out' ? '🔴 برداشت' : '🟢 واریز';
        showToast('✅ پیش‌نویس — ' + dirLabel + (patternLabel ? ' | ' + patternLabel : ''));
    } catch (err) {
        console.error('❌ [SMS convert] خطا:', err);
        alert('⚠️ خطا در ساخت سند:\n\n' + (err.message || err));
    }
}

/* ============================================================
   بخش ۲۳ — Init
   ============================================================ */
function initSmsPatternSystem() {
    runSmsMigrations();

    // Render all three tabs
    renderPendingSmsBox();
    renderSmsInbox();
    renderSmsPatternsTab();
    checkClipboardSupport();
    updateSmsBadge();

    // ==== Bind search & filters ====
    var pSearch = document.getElementById('pending-sms-search');
    if (pSearch) pSearch.oninput = renderPendingSmsBox;

    var iSearch = document.getElementById('sms-inbox-search');
    if (iSearch) iSearch.oninput = renderSmsInbox;

    var iStatus = document.getElementById('sms-inbox-status-filter');
    if (iStatus) iStatus.onchange = renderSmsInbox;

    var patSearch = document.getElementById('sms-patterns-search');
    if (patSearch) patSearch.oninput = renderSmsPatternsTab;

    // ==== Bulk buttons ====
    var pClear = document.getElementById('pending-sms-clear');
    if (pClear) {
        pClear.onclick = function () {
            if (getPendingSmsCount() === 0) { showToast('باکس خالی است.'); return; }
            if (!confirm('همه پیامک‌های ثبت‌نشده حذف شوند؟')) return;
            clearPendingSms();
            renderPendingSmsBox();
            showToast('🗑 باکس خالی شد');
        };
    }

    var iBulk = document.getElementById('sms-bulk-create-voucher');
    if (iBulk) iBulk.onclick = convertMultipleSmsToVoucher;

    var iClear = document.getElementById('sms-clear-converted');
    if (iClear) {
        iClear.onclick = function () {
            if (!confirm('همه پیامک‌های تبدیل‌شده حذف شوند؟')) return;
            var l = getSmsInbox().filter(function (s) { return s.status !== 'converted'; });
            saveSmsInbox(l);
            renderSmsInbox();
            updateSmsBadge();
        };
    }

    var patDelAll = document.getElementById('sms-patterns-del-all');
    if (patDelAll) {
        patDelAll.onclick = function () {
            if (loadSmsPatterns().length === 0) { showToast('الگویی وجود ندارد.'); return; }
            if (!confirm('همه الگوها حذف شوند؟')) return;
            saveSmsPatterns([]);
            renderSmsPatternsTab();
            showToast('🗑 همه الگوها حذف شد');
        };
    }

    // ==== SMS input ====
    var parseSms = document.getElementById('parse-sms');
    if (parseSms) {
        parseSms.onclick = function () {
            var text = document.getElementById('sms-text').value;
            if (!text.trim()) return;
            var res = addSmsToInbox(text, 'paste');
            if (res.ok) {
                showToast('✅ اضافه شد');
                document.getElementById('sms-text').value = '';
                renderSmsInbox();
                updateSmsBadge();
            } else if (res.reason === 'duplicate') {
                showToast('قبلاً ثبت شده.');
            } else {
                showToast('پیامک بانکی شناسایی نشد.');
            }
        };
    }

    var clearSms = document.getElementById('clear-sms');
    if (clearSms) {
        clearSms.onclick = function () {
            document.getElementById('sms-text').value = '';
            document.getElementById('sms-result').innerHTML = '';
        };
    }

    var readClip = document.getElementById('sms-read-clip');
    if (readClip) readClip.onclick = function () { readClipboardAndAdd(false); };

    // ==== Auto-read checkbox ====
    var autoEl = document.getElementById('sms-auto-read');
    if (autoEl) autoEl.onchange = function () {
        state.smsAutoRead = this.checked;
        DB.save(LS_KEYS.SMS_AUTO_READ, this.checked);
    };
    if (autoEl) autoEl.checked = !!state.smsAutoRead;

    // ==== Tab switching — re-render on click ====
    document.querySelectorAll('[data-tab^="sms-"]').forEach(function (btn) {
        if (btn.dataset.smsTabBound) return;
        btn.dataset.smsTabBound = '1';
        btn.addEventListener('click', function () {
            var tn = this.getAttribute('data-tab');
            setTimeout(function () {
                if (tn === 'sms-pending') renderPendingSmsBox();
                else if (tn === 'sms-inbox') renderSmsInbox();
                else if (tn === 'sms-patterns') renderSmsPatternsTab();
            }, 50);
        });
    });

    console.log('🧠 SMS system — patterns:', loadSmsPatterns().length, '| pending:', getPendingSmsCount());
}

(function () {
    function boot() {
        initSmsPatternSystem();
        if (typeof renderDashboardOrderUI === 'function') {
            try { renderDashboardOrderUI(); } catch (e) {}
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 400); });
    } else {
        setTimeout(boot, 400);
    }
})();

/* ============================================================
   صادرسازی
   ============================================================ */
window.matchBankAccountByBankName  = matchBankAccountByBankName;
window.findMatchingBankAccount     = findMatchingBankAccount;
window.parseBankSms                = parseBankSms;
window.getSmsInbox                 = getSmsInbox;
window.saveSmsInbox                = saveSmsInbox;
window.getUnreadSmsCount           = getUnreadSmsCount;
window.updateSmsBadge              = updateSmsBadge;
window.addSmsToInbox               = addSmsToInbox;
window.renderSmsInbox              = renderSmsInbox;
window.readClipboardAndAdd         = readClipboardAndAdd;
window.checkClipboardSupport       = checkClipboardSupport;
window.loadSmsPatterns             = loadSmsPatterns;
window.saveSmsPatterns             = saveSmsPatterns;
window.getPendingSms               = getPendingSms;
window.savePendingSms              = savePendingSms;
window.getPendingSmsCount          = getPendingSmsCount;
window.parseSignNumber             = parseSignNumber;
window.extractAmountWithSign       = extractAmountWithSign;
window.detectSmsDirection          = detectSmsDirection;
window.smsNormalizeForPattern      = smsNormalizeForPattern;
window.buildSmsPattern             = buildSmsPattern;
window.smsTokenSimilarity          = smsTokenSimilarity;
window.findMatchingSmsPattern      = findMatchingSmsPattern;
window.isBankSms                   = isBankSms;
window.suggestAmount               = suggestAmount;
window.suggestDate                 = suggestDate;
window.suggestDescription          = suggestDescription;
window.suggestLabel                = suggestLabel;
window.addSmsPattern               = addSmsPattern;
window.bumpSmsPatternUsage         = bumpSmsPatternUsage;
window.deleteSmsPattern            = deleteSmsPattern;
window.addPendingSms               = addPendingSms;
window.removePendingSms            = removePendingSms;
window.clearPendingSms             = clearPendingSms;
window.renderPendingSmsBox         = renderPendingSmsBox;
window.bindPendingEventsNew        = bindPendingEventsNew;
window.savePendingAsPattern        = savePendingAsPattern;
window.createVoucherFromPending    = createVoucherFromPending;
window.extractValuesFromPattern    = extractValuesFromPattern;
window.handleIncomingSms           = handleIncomingSms;
window.convertSmsToVoucher         = convertSmsToVoucher;
window.convertMultipleSmsToVoucher = convertMultipleSmsToVoucher;
window.renderSmsPatternsTab        = renderSmsPatternsTab;
window.initSmsPatternSystem        = initSmsPatternSystem;

console.log('✅ [modules/sms.js] loaded — 3 tabs + bulk voucher + pattern descriptions');
