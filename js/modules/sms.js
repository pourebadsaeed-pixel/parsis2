/* ============================================================
   پارسیس — پیامک بانکی (نسخه ۸ — Card + Keywords Matching)
   مسیر: js/modules/sms.js
   
   تغییرات v8:
     ✅ smsNormalizeForPattern: حذف کامل کاراکترهای نامرئی/کنترلی
        (ZWJ, NBSP, BOM, bidi, ALM, ...)
     ✅ الگوریتم جدید: شماره کارت + کلمات کلیدی
     ✅ findMatchingSmsPattern با signatureMatch
     ✅ ذخیره cardKey و keywords در الگو
     ✅ Backward-compatible با الگوهای قدیمی
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
                    if (score > bestScore) { bestScore = score; best = bj; }
                    break;
                }
            }
        }
    }
    return best;
}

/* ============================================================
   بخش ۲ — پارس پیامک بانکی
   ============================================================ */
function parseBankSms(text) {
    var result = {
        amount: 0, direction: '', balance: 0,
        accountCandidates: [], matchedAccount: null, bankName: '', raw: text
    };
    if (!text) return result;
    var t = normalizeDigits(text);

    var knownBanks = ['ملی','پاسارگاد','صادرات','تجارت','ملت','سپه','کشاورزی','مسکن','پارسیان','سامان','رفاه','اقتصاد نوین','آینده','شهر','دی','سینا','گردشگری','صنعت و معدن','توسعه صادرات','قوامین','حکمت','ایران زمین','مهر ایران','خاورمیانه','کارآفرین','پست بانک','رسالت','بلو','سرمایه'];
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
    var keywords = ['مبلغ','برداشت','واریز','خرید','پرداخت','انتقال','مانده‌گیری','برداشت وجه','کسر'];
    for (var k = 0; k < bigNums.length; k++) {
        var bn = bigNums[k];
        var ctx = t.substring(Math.max(0, bn.idx - 30), Math.min(t.length, bn.idx + 30));
        var score = 0;
        for (var ki = 0; ki < keywords.length; ki++) if (ctx.indexOf(keywords[ki]) !== -1) score += 10;
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
        if (s.length < 3 || seen[s]) return;
        seen[s] = true;
        candidates.push({ value: s });
    }
    var labelRe = /(?:حساب|کارت|شبا|شماره\s*حساب|شماره\s*کارت|IR)\s*[:ـ]?\s*([\d*.\-]{3,30})/gi, lm;
    while ((lm = labelRe.exec(t)) !== null) addC(lm[1]);
    var pasRe = /(\d{3})[.\-](\d{3})[.\-](\d{5,})(?:[.\-](\d{1,3}))?/g, pm;
    while ((pm = pasRe.exec(t)) !== null) { addC(pm[3]); addC(pm[1] + pm[2] + pm[3] + (pm[4] || '')); }
    var allD = t.match(/\d{5,25}/g) || [];
    for (var ad = 0; ad < allD.length; ad++) {
        if (Number(allD[ad]) === result.balance || Number(allD[ad]) === result.amount) continue;
        addC(allD[ad]);
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
                if (sc > bestMS) { bestMS = sc; bestAcc = { account: bak, matchedField: fields[fi].name }; }
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
   بخش ۳ — صندوق‌ها و inbox
   ============================================================ */
function getSmsInbox() { var l = DB.load('smsInbox', []); return Array.isArray(l) ? l : []; }
function saveSmsInbox(list) { DB.save('smsInbox', list); }
function getUnreadSmsCount() {
    var l = getSmsInbox(), c = 0;
    l.forEach(function (s) { if (s.status === 'new') c++; });
    return c;
}

function updateSmsBadge() {
    var total = getUnreadSmsCount() + getPendingSmsCount();
    var b = document.getElementById('sms-nav-badge');
    if (!b) return;
    if (total > 0) { b.textContent = toFa(total); b.classList.remove('hidden'); }
    else { b.classList.add('hidden'); }
}

function addSmsToInbox(rawText, source) {
    var text = String(rawText || '').trim();
    if (!text) return { ok: false, reason: 'empty' };
    var list = getSmsInbox();
    if (list.some(function (s) { return s.rawText === text; })) return { ok: false, reason: 'duplicate' };
    var parsed = parseBankSms(text);
    if (!parsed.bankName && !parsed.amount && parsed.accountCandidates.length === 0) return { ok: false, reason: 'not-bank' };
    var item = {
        id: uid(), rawText: text, source: source || 'manual', receivedAt: Date.now(),
        parsed: {
            amount: parsed.amount, direction: parsed.direction, balance: parsed.balance, bankName: parsed.bankName,
            matchedAccountId: parsed.matchedAccount ? parsed.matchedAccount.id : '',
            matchedAccountTitle: parsed.matchedAccount ? ((parsed.matchedAccount.bank || '') + ' - ' + (parsed.matchedAccount.account || '')) : '',
            matchedField: parsed.matchedField || '', accountCandidates: parsed.accountCandidates
        },
        status: 'new', voucherId: ''
    };
    list.unshift(item);
    saveSmsInbox(list);
    return { ok: true, item: item };
}

/* ============================================================
   بخش ۴ — الگوها و pending
   ============================================================ */
var SMS_PATTERNS_KEY = 'smsPatterns';
var SMS_PENDING_KEY = 'smsPending';
var SMS_PENDING_MAX = 200;
var SMS_PATTERN_THRESHOLD = 0.65;

function loadSmsPatterns() { var l = DB.load(SMS_PATTERNS_KEY, []); return Array.isArray(l) ? l : []; }
function saveSmsPatterns(list) { DB.save(SMS_PATTERNS_KEY, list); }
function getPendingSms() { var l = DB.load(SMS_PENDING_KEY, []); return Array.isArray(l) ? l : []; }
function savePendingSms(list) { DB.save(SMS_PENDING_KEY, list.slice(-SMS_PENDING_MAX)); }
function getPendingSmsCount() { return getPendingSms().length; }

function runSmsMigrations() {
    try {
        var patterns = loadSmsPatterns();
        var changed = false;
        patterns.forEach(function (p) {
            if (typeof p.voucherDesc === 'undefined') { p.voucherDesc = p.label || 'تراکنش بانکی'; changed = true; }
            if (typeof p.lineDesc === 'undefined') { p.lineDesc = p.label || 'تراکنش بانکی'; changed = true; }
            if (typeof p.blocked === 'undefined') { p.blocked = false; changed = true; }
            if (typeof p.cardKey === 'undefined') { p.cardKey = ''; changed = true; }
            if (typeof p.keywords === 'undefined') { p.keywords = []; changed = true; }
        });
        if (changed) saveSmsPatterns(patterns);
    } catch (e) { console.warn('[sms migrations]', e); }
}

/* ============================================================
   بخش ۵ — جهت و مبلغ
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
    if (labeled) { var res = parseSignNumber(labeled[1]); if (res.amount > 0) return res; }
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
    if (/واریز\s*به/.test(t)) return 'in';
    if (/برداشت\s*از/.test(t)) return 'out';
    if (/پرداخت\s*از/.test(t)) return 'out';
    if (/انتقال\s*به\s*حساب/.test(t)) return 'in';
    if (/انتقال\s*از\s*حساب/.test(t)) return 'out';
    if (/انتقال\s*به/.test(t)) return 'in';
    if (/انتقال\s*از/.test(t)) return 'out';
    if (/افزایش\s*موجودی/.test(t)) return 'in';
    if (/کسر\s*از/.test(t)) return 'out';
    if (/دریافت\s*از/.test(t)) return 'in';
    if (/بستانکار/.test(t) && !/بدهکار/.test(t)) return 'in';
    if (/بدهکار/.test(t) && !/بستانکار/.test(t)) return 'out';
    if (/واریز|افزایش|دریافت|حقوق|سود\s*بانکی/.test(t)) return 'in';
    if (/برداشت|خرید|کسر|قسط|پرداخت/.test(t)) return 'out';
    return '';
}

/* ============================================================
   ✅ بخش ۶ — نرمال‌سازی (نسخه ۸ — حذف کامل نامرئی‌ها)
   ============================================================ */
function smsNormalizeForPattern(text) {
    var s = normalizeDigits(String(text || ''));
    // حذف تمام کاراکترهای نامرئی و کنترلی Unicode
    s = s.replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\u061C\uFEFF\u00AD]/g, '');
    // فاصله‌های خاص → فاصله معمولی
    s = s.replace(/[\u00A0\u2028\u2029\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ');
    // ویرگول عربی/فارسی → فاصله
    s = s.replace(/[،,]/g, ' ');
    // فاصله‌های متوالی
    s = s.replace(/\s+/g, ' ').trim();
    return s;
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
            tokens.push(s + slot); mapping[slot] = p;
        } else if (signAfter) {
            n++;
            var s2 = signAfter[2] === '−' ? '-' : signAfter[2];
            var slot2 = '#' + n;
            tokens.push(slot2 + s2); mapping[slot2] = p;
        } else if (/\d/.test(p)) {
            n++;
            var slot3 = '#' + n;
            tokens.push(slot3); mapping[slot3] = p;
        } else {
            tokens.push(p);
        }
    }
    return { raw: normalized, tokens: tokens, mapping: mapping, key: tokens.join(' ') };
}

function isWild(t) { return typeof t === 'string' && t.indexOf('#') !== -1; }

function tokensShapeCollapsed(tokens) {
    var out = [], prevWild = false;
    for (var i = 0; i < tokens.length; i++) {
        if (isWild(tokens[i])) {
            if (!prevWild) { out.push('#'); prevWild = true; }
        } else {
            out.push(tokens[i]);
            prevWild = false;
        }
    }
    return out;
}

/* ============================================================
   ✅ بخش ۷ — توابع استخراج کارت و کلمات کلیدی (نسخه ۸)
   ============================================================ */

/* شماره کارت = ۸ رقم آخر اولین عدد بلند (۱۰ رقم یا بیشتر با .) */
function extractCardKey(raw) {
    var normalized = normalizeDigits(String(raw || ''));
    // پیدا کردن اولین توکن بلند عددی
    var matches = normalized.match(/\d[\d.\-_]{8,}/g);
    if (!matches || matches.length === 0) return '';
    for (var i = 0; i < matches.length; i++) {
        var digits = matches[i].replace(/[^\d]/g, '');
        if (digits.length >= 8) {
            return digits.slice(-8);
        }
    }
    return '';
}

/* کلمات کلیدی = کلمات غیرعددی با طول >= 2 (بدون تکرار) */
function extractKeywords(raw) {
    var cleaned = smsNormalizeForPattern(raw)
        .replace(/\d+/g, ' ')
        .replace(/[^\u0600-\u06FF\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!cleaned) return [];

    var words = cleaned.split(' ').filter(function(w) {
        return w.length >= 2;
    });

    var unique = [];
    for (var i = 0; i < words.length; i++) {
        if (unique.indexOf(words[i]) === -1) unique.push(words[i]);
    }
    return unique;
}

/* تعداد گروه‌های عددی متوالی */
function countNumberGroups(tokens) {
    var count = 0, inGroup = false;
    for (var i = 0; i < tokens.length; i++) {
        if (isWild(tokens[i])) {
            if (!inGroup) { count++; inGroup = true; }
        } else {
            inGroup = false;
        }
    }
    return count;
}

/* ============================================================
   ✅ بخش ۸ — تطبیق امضا (نسخه ۸)
   معیارها:
   ۱. شماره کارت (اگر هر دو دارن → باید دقیقاً یکی باشه)
   ۲. کلمات کلیدی (حداقل ۵۰٪ مشترک)
   ۳. تعداد گروه‌های عددی (تفاوت کمتر از ۲)
   ============================================================ */
function signatureMatch(sig1, sig2) {
    /* معیار ۱: شماره کارت */
    var cardScore;
    var cardReason = '';
    if (sig1.card && sig2.card) {
        if (sig1.card !== sig2.card) {
            return { match: false, score: 0, reason: 'card-mismatch' };
        }
        cardScore = 1.0;
        cardReason = 'card-exact';
    } else if (!sig1.card && !sig2.card) {
        cardScore = 0.5;
        cardReason = 'no-cards';
    } else {
        cardScore = 0.3;
        cardReason = 'one-card-missing';
    }

    /* معیار ۲: کلمات کلیدی */
    if (sig1.keywords.length === 0 && sig2.keywords.length === 0) {
        return {
            match: cardScore >= 1.0,
            score: cardScore,
            reason: cardReason + '|no-keywords'
        };
    }

    var common = 0;
    for (var i = 0; i < sig1.keywords.length; i++) {
        if (sig2.keywords.indexOf(sig1.keywords[i]) !== -1) common++;
    }
    var union = sig1.keywords.length + sig2.keywords.length - common;
    var jaccard = union > 0 ? common / union : 0;

    /* معیار ۳: تعداد گروه‌های عددی */
    var numDiff = Math.abs((sig1.numberGroups || 0) - (sig2.numberGroups || 0));
    var numScore = numDiff <= 1 ? 1.0 : (numDiff === 2 ? 0.5 : 0.0);

    /* امتیاز نهایی */
    var totalScore = cardScore * 0.5 + jaccard * 0.4 + numScore * 0.1;

    /* تصمیم نهایی */
    var isMatch = false;
    if (cardScore >= 1.0) {
        /* اگر کارت یکسانه، کلمات کلیدی حداقل ۳۰٪ */
        isMatch = jaccard >= 0.3;
    } else if (cardScore >= 0.5) {
        /* هر دو کارت خالی، کلمات کلیدی حداقل ۷۰٪ */
        isMatch = jaccard >= 0.7;
    } else {
        /* یکی کارت داره یکی نداره → سخت‌گیرانه */
        isMatch = jaccard >= 0.9;
    }

    return {
        match: isMatch,
        score: totalScore,
        reason: cardReason + '|kw=' + jaccard.toFixed(2) + '|ng=' + numScore
    };
}

/* ============================================================
   ✅ findMatchingSmsPattern — نسخه ۸
   ============================================================ */
function findMatchingSmsPattern(raw) {
    var active = loadSmsPatterns().filter(function (p) { return !p.blocked; });
    if (active.length === 0) return null;

    var built = buildSmsPattern(raw);
    var liveCard = extractCardKey(raw);
    var liveKeywords = extractKeywords(raw);
    var liveNumGroups = countNumberGroups(built.tokens);

    var liveSig = {
        card: liveCard,
        keywords: liveKeywords,
        numberGroups: liveNumGroups
    };

    var best = null, bestScore = 0, bestReason = '';

    for (var i = 0; i < active.length; i++) {
        var p = active[i];
        var patCard = p.cardKey || extractCardKey(p.raw || '');
        var patKeywords = (p.keywords && p.keywords.length > 0) ? p.keywords : extractKeywords(p.raw || '');
        var patNumGroups = countNumberGroups(p.tokens || []);

        var patSig = {
            card: patCard,
            keywords: patKeywords,
            numberGroups: patNumGroups
        };

        var res = signatureMatch(liveSig, patSig);
        if (res.match && res.score > bestScore) {
            bestScore = res.score;
            best = p;
            bestReason = res.reason;
        }
    }

    if (best) {
        return { pattern: best, score: bestScore, built: built, reason: bestReason };
    }

    return null;
}

/* ============================================================
   بخش ۹ — فیلتر هوشمند
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
    try { if (findMatchingBankAccount(t)) return true; } catch (e) {}
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
   بخش ۱۰ — پیشنهادها
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
   بخش ۱۱ — addSmsPattern با cardKey + keywords
   ============================================================ */
function addSmsPattern(opts) {
    var patterns = loadSmsPatterns();
    var built = buildSmsPattern(opts.raw || '');
    var newCardKey = extractCardKey(opts.raw || '');
    var newKeywords = extractKeywords(opts.raw || '');
    var newNumGroups = countNumberGroups(built.tokens);

    /* جستجو با key دقیق */
    var existing = patterns.find(function (p) { return p.key === (opts.key || built.key); });

    /* جستجو با cardKey + keywords */
    if (!existing && newCardKey) {
        existing = patterns.find(function (p) {
            var pCard = p.cardKey || extractCardKey(p.raw || '');
            var pKw = (p.keywords && p.keywords.length > 0) ? p.keywords : extractKeywords(p.raw || '');
            if (pCard !== newCardKey) return false;
            // کلمات کلیدی حداقل ۵۰٪ مشترک
            var common = 0;
            for (var i = 0; i < newKeywords.length; i++) {
                if (pKw.indexOf(newKeywords[i]) !== -1) common++;
            }
            var union = newKeywords.length + pKw.length - common;
            var jaccard = union > 0 ? common / union : 0;
            return jaccard >= 0.5;
        });
    }

    if (existing) {
        existing.uses = (existing.uses || 0) + 1;
        existing.lastUsed = Date.now();
        if (opts.label) existing.label = opts.label;
        if (opts.direction) existing.direction = opts.direction;
        if (opts.linkedAccountId) existing.linkedAccountId = opts.linkedAccountId;
        if (opts.slots) existing.slots = opts.slots;
        if (typeof opts.voucherDesc !== 'undefined') existing.voucherDesc = opts.voucherDesc;
        if (typeof opts.lineDesc !== 'undefined') existing.lineDesc = opts.lineDesc;
        if (!existing.cardKey && newCardKey) existing.cardKey = newCardKey;
        if ((!existing.keywords || existing.keywords.length === 0) && newKeywords.length > 0) {
            existing.keywords = newKeywords;
        }
        saveSmsPatterns(patterns);
        return existing;
    }

    var rec = {
        id: 'sp_' + uid(), key: opts.key || built.key, raw: built.raw, tokens: built.tokens,
        mapping: opts.mapping || built.mapping, slots: opts.slots || {},
        label: opts.label || 'الگوی پیامک', direction: opts.direction || '',
        linkedAccountId: opts.linkedAccountId || '', blocked: false,
        cardKey: newCardKey, keywords: newKeywords, numberGroups: newNumGroups,
        voucherDesc: (typeof opts.voucherDesc === 'string') ? opts.voucherDesc : (opts.label || ''),
        lineDesc:    (typeof opts.lineDesc    === 'string') ? opts.lineDesc    : (opts.label || ''),
        uses: 1, createdAt: Date.now(), lastUsed: Date.now()
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
   بخش ۱۲ — pending CRUD
   ============================================================ */
function addPendingSms(raw, source, force, extraData) {
    var text = String(raw || '').trim();
    if (!text) return null;
    var list = getPendingSms();
    if (list.some(function (p) { return p.raw === text; })) return null;
    if (!force && !isBankSms(text)) return null;

    var amount    = suggestAmount(text);
    var direction = detectSmsDirection(text) || '';
    var date      = suggestDate(text);
    var desc      = suggestDescription(text);
    var matched   = findMatchingBankAccount(text);
    var bankM     = text.match(/بانک\s+([^\s*،,\n]+)/);

    var rec = {
        id: 'pd_' + uid(),
        raw: text,
        source: source || 'clipboard',
        createdAt: Date.now(),
        forced: !!force,
        suggestion: {
            amount: amount, direction: direction, date: date, description: desc,
            bankName: bankM ? 'بانک ' + bankM[1] : '',
            linkedAccountId: matched ? matched.id : '',
            voucherDesc: suggestLabel(text, bankM ? 'بانک ' + bankM[1] : '', direction),
            lineDesc: suggestLabel(text, bankM ? 'بانک ' + bankM[1] : '', direction)
        }
    };

    if (extraData) {
        if (extraData.patternMatchedId) rec.patternMatchedId = extraData.patternMatchedId;
        if (extraData.patternLabel) rec.patternLabel = extraData.patternLabel;
        if (extraData.amount) rec.suggestion.amount = extraData.amount;
        if (extraData.direction) rec.suggestion.direction = extraData.direction;
        if (extraData.linkedAccountId) rec.suggestion.linkedAccountId = extraData.linkedAccountId;
        if (typeof extraData.voucherDesc !== 'undefined') rec.suggestion.voucherDesc = extraData.voucherDesc;
        if (typeof extraData.lineDesc !== 'undefined')    rec.suggestion.lineDesc    = extraData.lineDesc;
    }

    list.push(rec);
    savePendingSms(list);
    return rec;
}

function removePendingSms(id) {
    savePendingSms(getPendingSms().filter(function (p) { return p.id !== id; }));
}

function clearPendingSms() { savePendingSms([]); }

/* ============================================================
   بخش ۱۳ — رندر pending
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
        box.innerHTML = '<div class="widget-empty">📭 پیامک ثبت‌نشده‌ای وجود ندارد.<br><span style="font-size:.72rem;opacity:.8">یک پیامک را در کادر پایین پیست کن.</span></div>';
        updateSmsBadge();
        return;
    }

    var accounts = DB.load('bankAccounts', []);
    var sorted = list.slice().sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });

    var shown = 0, html = '';
    for (var i = 0; i < sorted.length; i++) {
        var p = sorted[i];
        if (q) {
            var hay = ((p.raw || '') + ' ' + ((p.suggestion && p.suggestion.description) || '') + ' ' + ((p.suggestion && p.suggestion.bankName) || '') + ' ' + (p.patternLabel || '')).toLowerCase();
            if (hay.indexOf(q) === -1) continue;
        }
        shown++;

        var s = p.suggestion || {};
        var pid = p.id;
        var liveDir = detectSmsDirection(p.raw);
        var effectiveDir = liveDir || s.direction || '';
        var liveAmt = extractAmountWithSign(p.raw);
        var isMatched = !!p.patternMatchedId;

        var accountOpts = '<option value="">— انتخاب حساب —</option>';
        for (var a = 0; a < accounts.length; a++) {
            var acc = accounts[a];
            var sel = (s.linkedAccountId === acc.id) ? ' selected' : '';
            accountOpts += '<option value="' + acc.id + '"' + sel + '>' + esc((acc.bank || '') + ' — ' + (acc.account || '')) + '</option>';
        }

        var clsIn = (effectiveDir === 'in') ? ' active-in' : '';
        var clsOut = (effectiveDir === 'out') ? ' active-out' : '';
        var forcedBadge = p.forced ? '<span class="badge">دستی</span>' : '';
        var meta = '📅 ' + toFa(tsToJalaliDate(p.createdAt)) + ' — ' + toFa(tsToJalaliTime(p.createdAt));

        var voucherDescVal = (typeof s.voucherDesc === 'string') ? s.voucherDesc : suggestLabel(p.raw, s.bankName, effectiveDir);
        var lineDescVal    = (typeof s.lineDesc    === 'string') ? s.lineDesc    : suggestLabel(p.raw, s.bankName, effectiveDir);

        /* ⭐ کارت سبز + بنر وقتی شناسایی شده */
        var cardStyle = isMatched
            ? 'border:2px solid #10b981;background:linear-gradient(180deg,#ecfdf5 0%,#ffffff 100%);box-shadow:0 4px 16px rgba(16,185,129,0.15);'
            : '';

        var matchedBanner = '';
        if (isMatched) {
            matchedBanner = '<div style="background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:14px 16px;border-radius:12px;margin-bottom:14px;font-weight:900;display:flex;align-items:center;gap:12px;box-shadow:0 4px 12px rgba(16,185,129,0.35)">'
                + '<span style="font-size:1.8rem;line-height:1">🧠</span>'
                + '<div style="flex:1;min-width:0">'
                +   '<div style="font-size:.95rem">الگو شناسایی شد: «' + esc(p.patternLabel || 'شناسایی‌شده') + '»</div>'
                +   '<div style="font-size:.72rem;opacity:.9;margin-top:3px">اطلاعات از الگو پر شده — فقط بررسی و تأیید کنید</div>'
                + '</div>'
                + '</div>';
        }

        var headerTitle = isMatched
            ? '🔔 پیامک' + forcedBadge + ' <span style="background:#10b981;color:#fff;padding:2px 10px;border-radius:8px;font-size:.7rem;font-weight:800">✓ شناسایی‌شده</span>'
            : '🔔 پیامک' + forcedBadge;

        /* فیلد نام الگو فقط وقتی unmatched باشد */
        var patternLabelField = isMatched
            ? '<input type="hidden" data-field="label" value="' + esc(p.patternLabel || '') + '">'
            : '<div class="psm-field"><label>🏷 نام الگو (اختیاری — برای شناسایی خودکار بعدی)</label>'
              + '<input type="text" data-field="label" value="' + esc(suggestLabel(p.raw, s.bankName, effectiveDir)) + '">'
              + '</div>';

        /* دکمه‌ها */
        var buttonsHtml = isMatched
            ? '<button class="psm-btn-primary" data-action="save-with-voucher" data-id="' + pid + '" style="flex:3;font-size:1rem;padding:14px">✅ تأیید و ساخت سند</button>'
              + '<button class="psm-btn-danger" data-action="drop" data-id="' + pid + '" title="حذف">🗑</button>'
            : '<button class="psm-btn-primary" data-action="save-with-voucher" data-id="' + pid + '">✅ ثبت + ساخت سند</button>'
              + '<button class="psm-btn-secondary" data-action="save-pattern-only" data-id="' + pid + '">🧠 فقط ثبت الگو</button>'
              + '<button class="psm-btn-danger" data-action="drop" data-id="' + pid + '">🗑</button>';

        html += '<div class="pending-sms-card psm-new" data-pid="' + pid + '" style="' + cardStyle + '">'
            +   '<div class="psm-head">'
            +     '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;flex:1">'
            +       '<input type="checkbox" class="psm-select-cb" data-pid="' + pid + '" style="width:20px;height:20px;accent-color:var(--primary);cursor:pointer">'
            +       '<div style="flex:1"><div class="title">' + headerTitle + '</div>'
            +       '<div class="meta">' + esc(meta) + '</div></div>'
            +     '</label>'
            +   '</div>'
            +   '<div class="psm-body">'
            +     matchedBanner
            +     '<div class="psm-text-wrap" style="margin-bottom:12px;background:var(--card-alt);border:1px solid var(--border);border-radius:10px;overflow:hidden">'
            +       '<div class="psm-text-toggle" data-toggle="text"><span>📄 متن پیامک</span><span class="arrow">◀</span></div>'
            +       '<div class="psm-text-body">' + esc(p.raw) + '</div>'
            +     '</div>'
            +     '<div class="psm-dir-box">'
            +       '<button type="button" class="psm-dir-btn' + clsIn + '" data-dir="in" data-pid="' + pid + '"><span class="icon">📥</span><span class="lbl">واریز</span></button>'
            +       '<button type="button" class="psm-dir-btn' + clsOut + '" data-dir="out" data-pid="' + pid + '"><span class="icon">📤</span><span class="lbl">برداشت</span></button>'
            +     '</div>'
            +     '<input type="hidden" data-field="direction" value="' + effectiveDir + '">'
            +     '<div class="psm-field"><label>💰 مبلغ (ریال)</label>'
            +       '<input type="text" class="amount-input" inputmode="numeric" dir="ltr" data-field="amount" value="' + ((liveAmt.amount || s.amount) ? formatRaw(liveAmt.amount || s.amount) : '') + '">'
            +     '</div>'
            +     '<div class="psm-field"><label>🏦 حساب بانکی</label>'
            +       '<select data-field="account">' + accountOpts + '</select>'
            +     '</div>'
            +     '<div class="psm-row-2">'
            +       '<div class="psm-field"><label>📅 تاریخ</label>'
            +         '<input type="text" dir="ltr" class="date-picker" data-field="date" value="' + esc(s.date || todayJalaliStr()) + '"></div>'
            +       '<div class="psm-field"><label>📝 شرح سند</label>'
            +         '<input type="text" data-field="voucherDesc" value="' + esc(voucherDescVal) + '"></div>'
            +     '</div>'
            +     '<div class="psm-field"><label>📝 شرح قلم</label>'
            +       '<input type="text" data-field="lineDesc" value="' + esc(lineDescVal) + '">'
            +     '</div>'
            +     patternLabelField
            +   '</div>'
            +   '<div class="psm-actions">'
            +     buttonsHtml
            +   '</div>'
            + '</div>';
    }

    if (shown === 0) html = '<div class="widget-empty">🔍 نتیجه‌ای با این جستجو یافت نشد.</div>';

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
            card.querySelectorAll('.psm-dir-btn').forEach(function (b) { b.classList.remove('active-in', 'active-out'); });
            this.classList.add(dir === 'in' ? 'active-in' : 'active-out');
            var hidden = card.querySelector('[data-field="direction"]');
            if (hidden) hidden.value = dir;
        };
    });
    box.querySelectorAll('[data-field="amount"]').forEach(function (inp) {
        inp.oninput = function () { this.value = normalizeDigits(this.value).replace(/[^\d]/g, ''); };
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
   بخش ۱۴ — ذخیره pending
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
    if (withVoucher && !accountId) { alert('⚠️ برای ساخت سند، حساب بانکی را انتخاب کنید.'); return; }

    if (pending.patternMatchedId) {
        var allPatterns = loadSmsPatterns();
        var matched = allPatterns.find(function (p2) { return p2.id === pending.patternMatchedId; });
        if (matched) {
            if (labelStr.trim()) matched.label = labelStr.trim();
            matched.direction = direction;
            matched.linkedAccountId = accountId;
            matched.voucherDesc = voucherDesc.trim();
            matched.lineDesc    = lineDesc.trim();
            matched.lastUsed = Date.now();
            matched.uses = (matched.uses || 0) + 1;
            saveSmsPatterns(allPatterns);
        }
    } else if (labelStr.trim()) {
        var built = buildSmsPattern(pending.raw);
        var amountSlot = null;
        for (var slot in built.mapping) {
            var numVal = Number(String(built.mapping[slot]).replace(/[^\d]/g, ''));
            if (numVal === amount) { amountSlot = parseInt(slot.slice(1), 10); break; }
        }
        addSmsPattern({
            raw: pending.raw, key: built.key, tokens: built.tokens, mapping: built.mapping,
            slots: { amount: amountSlot },
            label: labelStr.trim(), direction: direction, linkedAccountId: accountId,
            voucherDesc: voucherDesc.trim(),
            lineDesc: lineDesc.trim()
        });
    }

    var inbox = getSmsInbox();
    var parsed = parseBankSms(pending.raw);
    inbox.unshift({
        id: uid(),
        rawText: pending.raw,
        source: pending.source,
        receivedAt: pending.createdAt || Date.now(),
        parsed: {
            amount: amount, direction: direction, balance: parsed.balance, bankName: parsed.bankName,
            matchedAccountId: accountId,
            matchedAccountTitle: (function () {
                var acc = DB.load('bankAccounts', []).find(function (b) { return b.id === accountId; });
                return acc ? ((acc.bank || '') + ' - ' + (acc.account || '')) : '';
            })(),
            matchedField: '', accountCandidates: parsed.accountCandidates
        },
        status: withVoucher ? 'converted' : 'new',
        voucherId: ''
    });

    if (withVoucher) {
        var voucherResult = _createVoucherSmart({
            bankAccountId: accountId,
            amount: amount,
            direction: direction,
            date: normalizeDigits(dateStr).trim() || todayJalaliStr(),
            voucherDesc: voucherDesc.trim(),
            lineDesc: lineDesc.trim()
        });
        if (voucherResult && voucherResult.voucher) {
            inbox[0].voucherId = voucherResult.voucher.id;
            if (voucherResult.approved) inbox[0].status = 'converted';
        }
    }

    saveSmsInbox(inbox);
    removePendingSms(pid);
    renderPendingSmsBox();
    renderSmsInbox();
    renderSmsPatternsTab();
    updateSmsBadge();

    if (!withVoucher) {
        showToast('🧠 الگو ثبت شد');
        return;
    }

    var wasApproved = true;
    try {
        var lastV = DB.load('vouchers', []).slice(-1)[0];
        if (lastV && lastV.status === 'draft') wasApproved = false;
    } catch (e) {}

    if (!wasApproved) {
        showToast('📝 سند به‌عنوان پیش‌نویس باز شد — لطفاً تکمیل و تأیید کنید', 4000);
    } else {
        showToast('✅ سند تأیید شد');
    }
}

/* ============================================================
   بخش ۱۵ — Try Approve
   ============================================================ */
function _tryCreateApprovedVoucher(voucher) {
    try {
        if (typeof getVoucherIssues === 'function') {
            var issues = getVoucherIssues(voucher);
            if (issues.length === 0) { voucher.status = 'approved'; return { approved: true, voucher: voucher }; }
            voucher.status = 'draft';
            return { approved: false, voucher: voucher, issues: issues };
        }
    } catch (e) {}
    voucher.status = 'draft';
    return { approved: false, voucher: voucher };
}

/* ============================================================
   بخش ۱۶ — _createVoucherSmart
   ============================================================ */
function _createVoucherSmart(data) {
    var bankMoein = getBankMoeinId();
    if (!bankMoein) { alert('⚠️ معین بانک تعریف نشده.'); return null; }

    var bankDetail = data.bankAccountId ? { bank: data.bankAccountId } : {};
    var lines = [];
    var vDesc = (typeof data.voucherDesc === 'string') ? data.voucherDesc : '';
    var lDesc = (typeof data.lineDesc    === 'string') ? data.lineDesc    : vDesc;

    if (data.direction === 'out') {
        lines.push({ id: uid(), account: '', details: {}, debit: data.amount, credit: 0, description: lDesc });
        lines.push({ id: uid(), account: bankMoein, details: bankDetail, debit: 0, credit: data.amount, description: lDesc, locked: true });
    } else {
        lines.push({ id: uid(), account: bankMoein, details: bankDetail, debit: data.amount, credit: 0, description: lDesc, locked: true });
        lines.push({ id: uid(), account: '', details: {}, debit: 0, credit: data.amount, description: lDesc });
    }

    var vl = DB.load('vouchers', []);
    var num = (typeof getNextVoucherNumberForPeriod === 'function')
        ? getNextVoucherNumberForPeriod(state.activePeriodId || '')
        : String(vl.length + 1);

    var v = {
        id: uid(), number: num,
        date: data.date || todayJalaliStr(),
        type: 'general', periodId: state.activePeriodId || '',
        desc: vDesc, lines: lines, status: 'draft'
    };

    var res = _tryCreateApprovedVoucher(v);
    vl.push(v);
    DB.save('vouchers', vl);

    if (res.approved) {
        setTimeout(function () { goToPage('voucher-list'); }, 100);
    } else {
        setTimeout(function () {
            if (typeof loadVoucherForEdit === 'function') loadVoucherForEdit(v);
        }, 100);
    }

    return res;
}

/* ============================================================
   بخش ۱۷ — سند ترکیبی از pending
   ============================================================ */
function convertMultiplePendingToVoucher() {
    var checked = document.querySelectorAll('.psm-select-cb:checked');
    if (checked.length === 0) { alert('⚠️ ابتدا یک یا چند پیامک را تیک بزنید.'); return; }

    var bankMoein = getBankMoeinId();
    if (!bankMoein) { alert('⚠️ معین بانک تعریف نشده.'); return; }

    var allPending = getPendingSms();
    var lines = [];
    var usedIds = [];
    var descSet = {};
    var skippedCount = 0;

    var checkedArr = Array.prototype.slice.call(checked);
    for (var i = 0; i < checkedArr.length; i++) {
        var pid = checkedArr[i].getAttribute('data-pid');
        var s = allPending.find(function (x) { return x.id === pid; });
        if (!s) continue;

        var card = document.querySelector('.pending-sms-card[data-pid="' + pid + '"]');
        if (!card) { skippedCount++; continue; }

        var amountStr = (card.querySelector('[data-field="amount"]') || {}).value || '';
        var dirHidden = (card.querySelector('[data-field="direction"]') || {}).value || '';
        var accountId = (card.querySelector('[data-field="account"]') || {}).value || '';
        var lineDescEl = card.querySelector('[data-field="lineDesc"]');
        var voucherDescEl = card.querySelector('[data-field="voucherDesc"]');
        var lineDesc = lineDescEl ? lineDescEl.value.trim() : '';
        var voucherDesc = voucherDescEl ? voucherDescEl.value.trim() : '';

        var amount = Number(normalizeDigits(amountStr).replace(/[^\d]/g, '')) || 0;
        var direction = dirHidden;
        if (!amount) { skippedCount++; continue; }
        if (!direction) direction = detectSmsDirection(s.raw);
        if (!direction) { skippedCount++; continue; }

        var bankDetail = accountId ? { bank: accountId } : {};
        var desc = lineDesc || voucherDesc;

        if (direction === 'out') {
            lines.push({ id: uid(), account: '', details: {}, debit: amount, credit: 0, description: desc });
            lines.push({ id: uid(), account: bankMoein, details: bankDetail, debit: 0, credit: amount, description: desc, locked: true });
        } else {
            lines.push({ id: uid(), account: bankMoein, details: bankDetail, debit: amount, credit: 0, description: desc, locked: true });
            lines.push({ id: uid(), account: '', details: {}, debit: 0, credit: amount, description: desc });
        }

        if (voucherDesc) descSet[voucherDesc] = true;
        usedIds.push(pid);
    }

    if (lines.length === 0) { alert('⚠️ هیچ‌کدام از پیامک‌های انتخاب‌شده قابل تبدیل نیستند.'); return; }

    var descArr = Object.keys(descSet);
    var voucherDesc = (descArr.length > 0 && descArr.length <= 3) ? descArr.join(' + ') : '';

    var vl = DB.load('vouchers', []);
    var num = (typeof getNextVoucherNumberForPeriod === 'function') ? getNextVoucherNumberForPeriod(state.activePeriodId || '') : String(vl.length + 1);

    var v = { id: uid(), number: num, date: todayJalaliStr(), type: 'general', periodId: state.activePeriodId || '', desc: voucherDesc, lines: lines, status: 'draft' };
    var res = _tryCreateApprovedVoucher(v);
    vl.push(v);
    DB.save('vouchers', vl);

    var inbox = getSmsInbox();
    usedIds.forEach(function (pid) {
        var p = allPending.find(function (x) { return x.id === pid; });
        if (!p) return;
        var parsed = parseBankSms(p.raw);
        inbox.unshift({
            id: uid(),
            rawText: p.raw,
            source: p.source,
            receivedAt: p.createdAt || Date.now(),
            parsed: {
                amount: parsed.amount, direction: parsed.direction, balance: parsed.balance,
                bankName: parsed.bankName,
                matchedAccountId: parsed.matchedAccount ? parsed.matchedAccount.id : '',
                matchedAccountTitle: parsed.matchedAccount ? ((parsed.matchedAccount.bank || '') + ' - ' + (parsed.matchedAccount.account || '')) : '',
                matchedField: parsed.matchedField || '',
                accountCandidates: parsed.accountCandidates
            },
            status: 'converted',
            voucherId: v.id
        });
    });
    saveSmsInbox(inbox);

    var newPending = allPending.filter(function (p) { return usedIds.indexOf(p.id) === -1; });
    savePendingSms(newPending);

    renderPendingSmsBox();
    renderSmsInbox();
    updateSmsBadge();

    var msg = '✅ سند ' + (res.approved ? 'تأیید' : 'پیش‌نویس') + ' ساخته شد — ' + toFa(usedIds.length) + ' پیامک';
    if (skippedCount > 0) msg += '\n⚠️ ' + toFa(skippedCount) + ' پیامک رد شد.';
    alert(msg);

    if (res.approved) {
        setTimeout(function () { goToPage('voucher-list'); }, 200);
    } else {
        setTimeout(function () {
            if (typeof loadVoucherForEdit === 'function') loadVoucherForEdit(v);
        }, 200);
    }
}

/* ============================================================
   بخش ۱۸ — استخراج از الگو
   ============================================================ */
function extractValuesFromPattern(newRaw, pattern) {
    var built = buildSmsPattern(newRaw);
    var result = { amount: 0, direction: '', date: '', bankAccountId: pattern.linkedAccountId || '' };
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
   بخش ۱۹ — ورودی پیامک
   ============================================================ */
function handleIncomingSms(text, source, force) {
    var t = String(text || '').trim();
    if (!t) return { ok: false, reason: 'empty' };
    if (!force && !isBankSms(t)) return { ok: false, reason: 'not-bank' };

    var existingPending = getPendingSms();
    if (existingPending.some(function (p) { return p.raw === t; })) {
        return { ok: false, reason: 'duplicate' };
    }

    var m = findMatchingSmsPattern(t);
    var extraData = null;
    var matched = false;

    if (m) {
        matched = true;
        var vals = extractValuesFromPattern(t, m.pattern);
        extraData = {
            patternMatchedId: m.pattern.id,
            patternLabel: m.pattern.label,
            amount: vals.amount,
            direction: vals.direction,
            linkedAccountId: vals.bankAccountId,
            voucherDesc: (typeof m.pattern.voucherDesc === 'string') ? m.pattern.voucherDesc : (m.pattern.label || ''),
            lineDesc:    (typeof m.pattern.lineDesc    === 'string') ? m.pattern.lineDesc    : (m.pattern.label || '')
        };
        bumpSmsPatternUsage(m.pattern.id);
    }

    var added = addPendingSms(t, source || 'clipboard', force, extraData);
    if (!added) return { ok: false, reason: 'duplicate' };

    renderPendingSmsBox();
    updateSmsBadge();

    if (matched) {
        showToast('🧠 شناسایی شد — بازبینی و ثبت (' + m.pattern.label + ')', 3500);
        return { ok: true, matched: true, pattern: m.pattern, pending: added };
    }
    showToast('🔔 به لیست ثبت‌نشده اضافه شد');
    return { ok: true, matched: false, pending: added };
}

/* ============================================================
   بخش ۲۰ — کلیپ‌بورد
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
            var ok = confirm('❌ این متن به‌عنوان پیامک بانکی شناسایی نشد.\n\n' + preview + '\n\n«OK» = افزودن به‌عنوان پیامک بانکی');
            if (!ok) return;
            var forced = handleIncomingSms(t, 'manual', true);
            if (forced.ok) _lastClipboardText = t;
            return;
        }
    }).catch(function () { if (!auto) alert('دسترسی به کلیپ‌بورد داده نشد.'); });
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
   بخش ۲۱ — تب inbox
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
        if (s.status === 'converted') { statusBadge = '✓ تبدیل‌شده'; statusClass = 'status-converted'; }
        else if (s.status === 'ignored') { statusBadge = '— نادیده'; statusClass = 'status-ignored'; }
        else { statusBadge = '🔔 در انتظار تبدیل'; statusClass = 'status-new'; }

        var meta = '📅 ' + toFa(tsToJalaliDate(s.receivedAt)) + ' — ' + toFa(tsToJalaliTime(s.receivedAt));

        var parsedHtml = '';
        if (p.bankName) parsedHtml += '<span class="pill">🏦 ' + esc(p.bankName) + '</span>';
        if (p.amount) parsedHtml += '<span class="pill ' + dirClass + '">' + dirLabel + ': ' + formatMoney(p.amount) + ' ' + currencyLabel() + '</span>';
        else parsedHtml += '<span class="pill">' + dirLabel + '</span>';
        if (p.matchedAccountTitle) parsedHtml += '<span class="pill" style="background:#d1fae5;color:#065f46">🎯 ' + esc(p.matchedAccountTitle) + '</span>';

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
            +    '<button class="btn-convert" data-action="convert" data-id="' + s.id + '"' + (canConvert ? '' : ' disabled') + '>📝 ساخت سند</button>'
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
   بخش ۲۲ — سند ترکیبی از inbox
   ============================================================ */
function convertMultipleSmsToVoucher() {
    var checked = document.querySelectorAll('.sms-select-cb:checked');
    if (checked.length === 0) { alert('⚠️ ابتدا یک یا چند پیامک را انتخاب کنید.'); return; }

    var bankMoein = getBankMoeinId();
    if (!bankMoein) { alert('⚠️ معین بانک تعریف نشده.'); return; }

    var allInbox = getSmsInbox();
    var lines = [], usedIds = [], descSet = {}, skipped = 0;

    checked.forEach(function (cb) {
        var sid = cb.getAttribute('data-sid');
        var s = allInbox.find(function (x) { return x.id === sid; });
        if (!s) return;
        var p = s.parsed || {};
        var amount = Number(p.amount) || 0;
        var direction = p.direction || '';
        var bankAccId = p.matchedAccountId || '';

        if (!amount) amount = suggestAmount(s.rawText);
        if (!direction) direction = detectSmsDirection(s.rawText);

        if (!amount || !direction) { skipped++; return; }

        var matched = findMatchingSmsPattern(s.rawText);
        var voucherDesc = (matched && typeof matched.pattern.voucherDesc === 'string')
            ? matched.pattern.voucherDesc
            : '';
        var lineDesc = (matched && typeof matched.pattern.lineDesc === 'string')
            ? matched.pattern.lineDesc
            : voucherDesc;

        var bankDetail = bankAccId ? { bank: bankAccId } : {};

        if (direction === 'out') {
            lines.push({ id: uid(), account: '', details: {}, debit: amount, credit: 0, description: lineDesc });
            lines.push({ id: uid(), account: bankMoein, details: bankDetail, debit: 0, credit: amount, description: lineDesc, locked: true });
        } else {
            lines.push({ id: uid(), account: bankMoein, details: bankDetail, debit: amount, credit: 0, description: lineDesc, locked: true });
            lines.push({ id: uid(), account: '', details: {}, debit: 0, credit: amount, description: lineDesc });
        }

        if (voucherDesc) descSet[voucherDesc] = true;
        usedIds.push(s.id);
    });

    if (lines.length === 0) { alert('⚠️ هیچ‌کدام از پیامک‌های انتخاب‌شده قابل تبدیل نیستند.'); return; }

    var descArr = Object.keys(descSet);
    var voucherDesc = (descArr.length > 0 && descArr.length <= 3) ? descArr.join(' + ') : '';

    var vl = DB.load('vouchers', []);
    var num = (typeof getNextVoucherNumberForPeriod === 'function') ? getNextVoucherNumberForPeriod(state.activePeriodId || '') : String(vl.length + 1);

    var v = { id: uid(), number: num, date: todayJalaliStr(), type: 'general', periodId: state.activePeriodId || '', desc: voucherDesc, lines: lines, status: 'draft' };
    var res = _tryCreateApprovedVoucher(v);
    vl.push(v);
    DB.save('vouchers', vl);

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

    var msg = '✅ سند ' + (res.approved ? 'تأیید' : 'پیش‌نویس') + ' — ' + toFa(usedIds.length) + ' پیامک';
    if (skipped > 0) msg += '\n⚠️ ' + toFa(skipped) + ' پیامک رد شد.';
    alert(msg);

    if (res.approved) setTimeout(function () { goToPage('voucher-list'); }, 200);
    else setTimeout(function () { if (typeof loadVoucherForEdit === 'function') loadVoucherForEdit(v); }, 200);
}

/* ============================================================
   بخش ۲۳ — رندر الگوها
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
        box.innerHTML = '<div class="widget-empty">هنوز الگویی ثبت نشده.</div>';
        return;
    }

    var accounts = DB.load('bankAccounts', []);
    var accMap = {}; accounts.forEach(function (a) { accMap[a.id] = a; });

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
        var dirLabel = p.direction === 'out' ? '🔴 برداشت' : p.direction === 'in' ? '🟢 واریز' : '❔ نامشخص';
        var dirCls = p.direction === 'out' ? 'badge-draft' : p.direction === 'in' ? 'badge-approved' : '';

        if (q) {
            var hay = ((p.label || '') + ' ' + (accLabel || '') + ' ' + (p.voucherDesc || '') + ' ' + (p.lineDesc || '')).toLowerCase();
            if (hay.indexOf(q) === -1) continue;
        }
        shown++;

        var preview = (p.tokens || []).join(' ');
        if (preview.length > 140) preview = preview.slice(0, 140) + '…';
        var blockedBadge = p.blocked ? ' <span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:8px;font-size:.66rem;font-weight:800">🚫 مسدود</span>' : '';
        var opacity = p.blocked ? 'opacity:.65;' : '';

        var vDescShow = (typeof p.voucherDesc === 'string' && p.voucherDesc !== '')
            ? esc(p.voucherDesc)
            : '<span style="color:#cbd5e1;font-style:italic">(خالی)</span>';
        var lDescShow = (typeof p.lineDesc === 'string' && p.lineDesc !== '')
            ? esc(p.lineDesc)
            : '<span style="color:#cbd5e1;font-style:italic">(خالی)</span>';

        var cardKeyShow = p.cardKey || extractCardKey(p.raw || '') || '—';
        var kwShow = (p.keywords && p.keywords.length > 0) ? p.keywords : extractKeywords(p.raw || '');
        var kwStr = kwShow.length > 0 ? kwShow.join(' ، ') : '—';

        html += '<div class="card" style="margin:0;padding:14px;' + opacity + '">'
            + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;margin-bottom:8px">'
            +   '<div style="flex:1;min-width:0">'
            +     '<div style="font-weight:800;color:var(--primary-dark);font-size:.95rem">' + esc(p.label || 'بدون نام') + blockedBadge + '</div>'
            +     '<div style="font-size:.74rem;color:var(--text-muted);margin-top:4px;display:flex;gap:8px;flex-wrap:wrap">'
            +       '<span>🏦 ' + esc(accLabel) + '</span>'
            +       '<span class="badge ' + dirCls + '">' + dirLabel + '</span>'
            +     '</div>'
            +   '</div>'
            +   '<div style="display:flex;gap:6px;flex-wrap:wrap">'
            +     '<button type="button" onclick="window.openEditSmsPattern(\'' + p.id + '\')" style="background:#dbeafe;color:#1e40af;border:none;border-radius:9px;padding:8px 12px;font-family:inherit;font-weight:800;font-size:.8rem;cursor:pointer">✏️ ویرایش</button>'
            +     '<button type="button" data-pattern-block="' + p.id + '" style="background:' + (p.blocked ? '#d1fae5;color:#065f46' : '#fef3c7;color:#92400e') + ';border:none;border-radius:9px;padding:8px 12px;font-family:inherit;font-weight:800;font-size:.8rem;cursor:pointer">' + (p.blocked ? '✅ رفع' : '🚫 مسدود') + '</button>'
            +     '<button type="button" data-pattern-del="' + p.id + '" style="background:#fee2e2;color:#dc2626;border:none;border-radius:9px;padding:8px 12px;font-family:inherit;font-weight:800;font-size:.8rem;cursor:pointer">🗑</button>'
            +   '</div>'
            + '</div>'
            + '<div style="background:var(--card-alt);border:1px solid var(--border);border-radius:10px;padding:10px;font-size:.76rem;direction:rtl;line-height:1.8;margin-bottom:8px">'
            +   '<div style="color:var(--text-muted);margin-bottom:4px;font-weight:700">نمونهٔ الگو:</div>'
            +   '<div style="font-family:monospace;direction:rtl;white-space:pre-wrap;word-break:break-word;color:var(--primary-dark)">' + esc(preview) + '</div>'
            +   '<div style="margin-top:6px;padding-top:6px;border-top:1px dashed var(--border);color:var(--text-muted)"><b>کارت:</b> <span style="font-family:monospace">' + esc(cardKeyShow) + '</span></div>'
            +   '<div style="margin-top:2px;color:var(--text-muted)"><b>کلمات کلیدی:</b> ' + esc(kwStr) + '</div>'
            + '</div>'
            + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;font-size:.78rem">'
            +   '<div><span style="color:var(--text-muted);font-weight:700">شرح سند:</span> ' + vDescShow + '</div>'
            +   '<div><span style="color:var(--text-muted);font-weight:700">شرح قلم:</span> ' + lDescShow + '</div>'
            + '</div>'
            + '<div style="display:flex;gap:12px;flex-wrap:wrap;font-size:.72rem;color:var(--text-muted)">'
            +   '<span>📊 ' + toFa(p.uses || 0) + ' بار</span>'
            +   '<span>📅 ' + (p.lastUsed ? toFa(tsToJalaliDate(p.lastUsed)) + ' ' + toFa(tsToJalaliTime(p.lastUsed)) : '—') + '</span>'
            + '</div>'
            + '</div>';
    }
    html += '</div>';

    if (shown === 0) html = '<div class="widget-empty">🔍 نتیجه‌ای یافت نشد.</div>';

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
            for (var j = 0; j < all.length; j++) if (all[j].id === id) { all[j].blocked = !all[j].blocked; break; }
            saveSmsPatterns(all);
            renderSmsPatternsTab();
            showToast('✅ ذخیره شد');
        };
    });
}

/* ============================================================
   بخش ۲۴ — ویرایش الگو
   ============================================================ */
function openEditSmsPattern(patternId) {
    try {
        var p = loadSmsPatterns().find(function (x) { return x.id === patternId; });
        if (!p) { showToast('الگو یافت نشد.'); return; }

        var old = document.getElementById('sms-edit-modal'); if (old) old.remove();
        var oldO = document.getElementById('sms-edit-overlay'); if (oldO) oldO.remove();

        var accounts = DB.load('bankAccounts', []);
        var accOpts = '<option value="">— تعیین نشده —</option>';
        accounts.forEach(function (a) {
            var sel = (p.linkedAccountId === a.id) ? ' selected' : '';
            accOpts += '<option value="' + a.id + '"' + sel + '>' + esc((a.bank || '') + ' — ' + (a.account || '')) + '</option>';
        });

        var dirIn = p.direction === 'in' ? 'checked' : '';
        var dirOut = p.direction === 'out' ? 'checked' : '';
        var preview = (p.tokens || []).join(' ');
        var cardShow = p.cardKey || extractCardKey(p.raw || '') || '—';
        var kwList = (p.keywords && p.keywords.length > 0) ? p.keywords : extractKeywords(p.raw || '');
        var kwShow = kwList.length > 0 ? kwList.join(' ، ') : '—';

        var voucherDescValue = (typeof p.voucherDesc === 'string') ? p.voucherDesc : '';
        var lineDescValue    = (typeof p.lineDesc    === 'string') ? p.lineDesc    : '';

        var html = ''
            + '<div id="sms-edit-overlay" class="overlay show" style="z-index:1400"></div>'
            + '<div id="sms-edit-modal" class="modal show" style="max-width:580px;z-index:1410">'
            +   '<div class="modal-head"><h2>✏️ ویرایش الگو</h2><button type="button" id="sms-edit-close" class="close-btn">×</button></div>'
            +   '<div class="modal-body">'
            +     '<div class="field"><label>نام الگو</label><input type="text" id="se-label" value="' + esc(p.label || '') + '"></div>'
            +     '<div class="field"><label>حساب بانکی</label><select id="se-account">' + accOpts + '</select></div>'
            +     '<div class="field"><label>جهت تراکنش</label><div style="display:flex;gap:8px">'
            +       '<label style="flex:1;padding:10px;background:var(--card-alt);border-radius:10px;cursor:pointer;border:1.5px solid var(--border);text-align:center"><input type="radio" name="se_dir" value="in" ' + dirIn + '> 📥 واریز</label>'
            +       '<label style="flex:1;padding:10px;background:var(--card-alt);border-radius:10px;cursor:pointer;border:1.5px solid var(--border);text-align:center"><input type="radio" name="se_dir" value="out" ' + dirOut + '> 📤 برداشت</label>'
            +     '</div></div>'
            +     '<div class="field"><label>📝 شرح سند</label><input type="text" id="se-voucherDesc" value="' + esc(voucherDescValue) + '" placeholder="(اختیاری — می‌تواند خالی باشد)"></div>'
            +     '<div class="field"><label>📝 شرح قلم</label><input type="text" id="se-lineDesc" value="' + esc(lineDescValue) + '" placeholder="(اختیاری — می‌تواند خالی باشد)"></div>'
            +     '<div class="field"><label>نمونه الگو</label><div style="background:var(--card-alt);border:1px solid var(--border);border-radius:10px;padding:10px;font-family:monospace;font-size:.78rem;line-height:1.8;max-height:150px;overflow-y:auto">' + esc(preview) + '<br><b>کارت:</b> ' + esc(cardShow) + '<br><b>کلمات کلیدی:</b> ' + esc(kwShow) + '</div></div>'
            +     '<div class="field"><label style="padding:10px;background:var(--card-alt);border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:8px"><input type="checkbox" id="se-blocked" ' + (p.blocked ? 'checked' : '') + '> <span>مسدود</span></label></div>'
            +   '</div>'
            +   '<div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end">'
            +     '<button type="button" id="sms-edit-cancel" class="btn-secondary">انصراف</button>'
            +     '<button type="button" id="sms-edit-save" class="btn-primary">💾 ذخیره</button>'
            +   '</div>'
            + '</div>';

        document.body.insertAdjacentHTML('beforeend', html);

        var closeFn = function () {
            var m = document.getElementById('sms-edit-modal'); if (m) m.remove();
            var o = document.getElementById('sms-edit-overlay'); if (o) o.remove();
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
            if (!newLabel) { alert('نام الگو اجباری است.'); return; }

            var dirEl = document.querySelector('input[name="se_dir"]:checked');
            all[idx].label = newLabel;
            all[idx].linkedAccountId = document.getElementById('se-account').value;
            all[idx].direction = dirEl ? dirEl.value : '';
            all[idx].blocked = document.getElementById('se-blocked').checked;
            all[idx].voucherDesc = document.getElementById('se-voucherDesc').value.trim();
            all[idx].lineDesc    = document.getElementById('se-lineDesc').value.trim();
            all[idx].lastEdited = Date.now();
            saveSmsPatterns(all);

            closeFn();
            renderSmsPatternsTab();
            showToast('✅ ذخیره شد');
        };
    } catch (err) {
        console.error(err);
        alert('خطا: ' + (err.message || err));
    }
}
window.openEditSmsPattern = openEditSmsPattern;

/* ============================================================
   بخش ۲۵ — تبدیل تک پیامک
   ============================================================ */
function convertSmsToVoucher(smsId) {
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
        var voucherDesc = '', lineDesc = '';
        if (matched && matched.pattern) {
            if (!direction && matched.pattern.direction) direction = matched.pattern.direction;
            if (!bankAccountId && matched.pattern.linkedAccountId) bankAccountId = matched.pattern.linkedAccountId;
            voucherDesc = (typeof matched.pattern.voucherDesc === 'string') ? matched.pattern.voucherDesc : '';
            lineDesc    = (typeof matched.pattern.lineDesc    === 'string') ? matched.pattern.lineDesc    : voucherDesc;
        }

        if (!direction) direction = detectSmsDirection(raw);
        if (!amount) amount = suggestAmount(raw);

        if (!amount) { alert('⚠️ مبلغ قابل تشخیص نیست.'); return; }

        if (!direction) {
            var d = prompt('نوع تراکنش:\n1 = برداشت\n2 = واریز', '1');
            if (d === '1') direction = 'out';
            else if (d === '2') direction = 'in';
            else return;
        }

        if (!bankAccountId) {
            var accounts = DB.load('bankAccounts', []);
            if (accounts.length === 0) { alert('⚠️ حساب بانکی تعریف نشده.'); return; }
            if (accounts.length === 1) bankAccountId = accounts[0].id;
            else {
                var opts = accounts.map(function (a, i) { return (i + 1) + '. ' + (a.bank || '') + ' — ' + (a.account || ''); }).join('\n');
                var ans = prompt('حساب بانکی:\n\n' + opts + '\n\nشماره:');
                if (!ans) return;
                var idx = Number(normalizeDigits(ans)) - 1;
                if (isNaN(idx) || idx < 0 || idx >= accounts.length) { alert('نامعتبر'); return; }
                bankAccountId = accounts[idx].id;
            }
        }

        var finalVoucherDesc = voucherDesc;
        var finalLineDesc = lineDesc || voucherDesc;

        var res = _createVoucherSmart({
            bankAccountId: bankAccountId, amount: amount, direction: direction,
            date: todayJalaliStr(),
            voucherDesc: finalVoucherDesc, lineDesc: finalLineDesc
        });

        if (!res) return;

        for (var i = 0; i < list.length; i++) {
            if (list[i].id === smsId) {
                list[i].status = 'converted';
                list[i].voucherId = res.voucher.id;
            }
        }
        saveSmsInbox(list);
        renderSmsInbox();
        updateSmsBadge();

        if (res.approved) {
            showToast('✅ سند تأیید شد');
        } else {
            showToast('📝 سند پیش‌نویس باز شد — تکمیل و تأیید کنید', 4000);
        }
    } catch (err) {
        console.error(err);
        alert('⚠️ خطا: ' + (err.message || err));
    }
}

/* ============================================================
   بخش ۲۶ — Init + Delegation
   ============================================================ */
function bindSmsDelegation() {
    if (window._smsDelegationBound) return;
    window._smsDelegationBound = true;

    document.addEventListener('input', function (e) {
        if (!e.target || !e.target.id) return;
        if (e.target.id === 'pending-sms-search') { renderPendingSmsBox(); return; }
        if (e.target.id === 'sms-inbox-search') { renderSmsInbox(); return; }
        if (e.target.id === 'sms-patterns-search') { renderSmsPatternsTab(); return; }
    });

    document.addEventListener('change', function (e) {
        if (!e.target || !e.target.id) return;
        if (e.target.id === 'sms-inbox-status-filter') { renderSmsInbox(); return; }
        if (e.target.id === 'sms-auto-read') {
            state.smsAutoRead = e.target.checked;
            DB.save(LS_KEYS.SMS_AUTO_READ, e.target.checked);
            return;
        }
    });

    document.addEventListener('click', function (e) {
        if (!e.target || !e.target.closest) return;

        var tab = e.target.closest('.tab-btn[data-tab^="sms-"]');
        if (tab) {
            var tn = tab.getAttribute('data-tab');
            setTimeout(function () {
                if (tn === 'sms-pending') renderPendingSmsBox();
                else if (tn === 'sms-inbox') renderSmsInbox();
                else if (tn === 'sms-patterns') renderSmsPatternsTab();
            }, 50);
            return;
        }

        if (e.target.closest('#pending-sms-bulk-voucher')) { convertMultiplePendingToVoucher(); return; }

        if (e.target.closest('#pending-sms-clear')) {
            if (getPendingSmsCount() === 0) { showToast('باکس خالی است.'); return; }
            if (!confirm('همه پیامک‌های ثبت‌نشده حذف شوند؟')) return;
            clearPendingSms();
            renderPendingSmsBox();
            updateSmsBadge();
            showToast('🗑 باکس خالی شد');
            return;
        }

        if (e.target.closest('#sms-bulk-create-voucher')) { convertMultipleSmsToVoucher(); return; }

        if (e.target.closest('#sms-clear-converted')) {
            if (!confirm('همه پیامک‌های تبدیل‌شده حذف شوند؟')) return;
            var l = getSmsInbox().filter(function (s) { return s.status !== 'converted'; });
            saveSmsInbox(l);
            renderSmsInbox();
            updateSmsBadge();
            return;
        }

        if (e.target.closest('#sms-patterns-del-all')) {
            if (loadSmsPatterns().length === 0) { showToast('الگویی وجود ندارد.'); return; }
            if (!confirm('همه الگوها حذف شوند؟')) return;
            saveSmsPatterns([]);
            renderSmsPatternsTab();
            showToast('🗑 حذف شد');
            return;
        }

        if (e.target.closest('#parse-sms')) {
            var page = e.target.closest('.page');
            var textInp = page ? page.querySelector('#sms-text') : null;
            var text = textInp ? textInp.value : '';
            if (!text.trim()) return;
            var res = handleIncomingSms(text, 'paste', false);
            if (res.ok) {
                textInp.value = '';
            } else if (res.reason === 'duplicate') {
                showToast('قبلاً ثبت شده.');
            } else if (res.reason === 'not-bank') {
                if (confirm('این پیامک بانکی شناسایی نشد. به‌عنوان پیامک دستی اضافه شود؟')) {
                    var f = handleIncomingSms(text, 'paste', true);
                    if (f.ok) textInp.value = '';
                }
            }
            return;
        }

        if (e.target.closest('#clear-sms')) {
            var pg = e.target.closest('.page');
            var inp = pg ? pg.querySelector('#sms-text') : null;
            if (inp) inp.value = '';
            var resBox = pg ? pg.querySelector('#sms-result') : null;
            if (resBox) resBox.innerHTML = '';
            return;
        }

        if (e.target.closest('#sms-read-clip')) { readClipboardAndAdd(false); return; }
    });
}

function initSmsPatternSystem() {
    runSmsMigrations();

    bindSmsDelegation();

    renderPendingSmsBox();
    renderSmsInbox();
    renderSmsPatternsTab();
    checkClipboardSupport();
    updateSmsBadge();

    var autoEl = document.getElementById('sms-auto-read');
    if (autoEl) autoEl.checked = !!state.smsAutoRead;

    console.log('🧠 SMS — patterns:', loadSmsPatterns().length, '| pending:', getPendingSmsCount());
}

(function () {
    function boot() {
        try { initSmsPatternSystem(); } catch (e) { console.error('SMS init:', e); }
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
window.tokensShapeCollapsed        = tokensShapeCollapsed;
window.extractCardKey              = extractCardKey;
window.extractKeywords             = extractKeywords;
window.countNumberGroups           = countNumberGroups;
window.signatureMatch              = signatureMatch;
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
window.extractValuesFromPattern    = extractValuesFromPattern;
window.handleIncomingSms           = handleIncomingSms;
window.convertSmsToVoucher         = convertSmsToVoucher;
window.convertMultipleSmsToVoucher = convertMultipleSmsToVoucher;
window.convertMultiplePendingToVoucher = convertMultiplePendingToVoucher;
window.renderSmsPatternsTab        = renderSmsPatternsTab;
window.initSmsPatternSystem        = initSmsPatternSystem;
window.bindSmsDelegation           = bindSmsDelegation;

console.log('✅ [modules/sms.js] loaded — v8 (card + keywords matching)');
