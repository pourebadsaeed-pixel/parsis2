/* ============================================================
   پارسیس — پیامک بانکی (نسخه ۱۴)
   مسیر: js/modules/sms.js

   تغییرات v14:
     ✅ رفع کامل باگ دکمه «انتخاب همه» با Event Delegation
     ✅ افزودن شرح قلم مجزا برای «حساب بانک» و «حساب طرف مقابل»
     ✅ ادغام شرح اسناد ترکیبی با خط تیره (-)
     ✅ جایگذاری دقیق شرح‌ها روی سطرهای بدهکار/بستانکار سند
   ============================================================ */
'use strict';

/* ============================================================
   بخش ۱ — تطبیق بانک با نام
   ============================================================ */
function matchBankAccountByBankName(text) {
    if (!text) return null;
    var t = String(text).replace(/[يى]/g, 'ی').replace(/[ك]/g, 'ک');
    var ba = DB.load('bankAccounts', []);
    var best = null, bestScore = 0;
    for (var i = 0; i < ba.length; i++) {
        var b = ba[i];
        var bankName = String(b.bank || '').trim().replace(/[يى]/g, 'ی').replace(/[ك]/g, 'ک');
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
   بخش ۲ — پارس پیامک
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
        if (t.indexOf(knownBanks[b]) !== -1) { result.bankName = 'بانک ' + knownBanks[b]; break; }
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
   بخش ۳ — inbox + badge
   ============================================================ */
function getSmsInbox() { var l = DB.load('smsInbox', []); return Array.isArray(l) ? l : []; }
function saveSmsInbox(list) { DB.save('smsInbox', list); }
function getUnreadSmsCount() {
    var l = getSmsInbox(), c = 0;
    l.forEach(function (s) { if (s.status === 'new') c++; });
    return c;
}

function updateSmsBadge() {
    var total = getPendingSmsCount();
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
            if (typeof p.voucherDesc === 'undefined') { p.voucherDesc = p.label || ''; changed = true; }
            if (typeof p.bankLineDesc === 'undefined') { p.bankLineDesc = p.lineDesc || p.label || ''; changed = true; }
            if (typeof p.counterLineDesc === 'undefined') { p.counterLineDesc = p.lineDesc || p.label || ''; changed = true; }
            if (typeof p.lineDesc !== 'undefined') { delete p.lineDesc; changed = true; }
            if (typeof p.blocked === 'undefined') { p.blocked = false; changed = true; }
            if (typeof p.keywords === 'undefined') { p.keywords = extractKeywords(p.raw || ''); changed = true; }
            if (typeof p.counterAccount === 'undefined') { p.counterAccount = ''; changed = true; }
            if (typeof p.counterDetails === 'undefined') { p.counterDetails = {}; changed = true; }
        });
        if (changed) saveSmsPatterns(patterns);
    } catch (e) { console.warn('[sms migrations]', e); }

    try {
        var inbox = getSmsInbox();
        var inboxChanged = false;
        var pendingRaws = {};
        getPendingSms().forEach(function (p) { pendingRaws[p.raw] = true; });

        inbox.forEach(function (s) {
            if (s.status !== 'new') return;
            if (pendingRaws[s.rawText]) s.status = '_delete_';
            else s.status = 'ignored';
            inboxChanged = true;
        });

        if (inboxChanged) {
            var cleaned = inbox.filter(function (s) { return s.status !== '_delete_'; });
            saveSmsInbox(cleaned);
        }
    } catch (e) { console.warn('[sms inbox migration]', e); }
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
   بخش ۶ — نرمال‌سازی + توکن
   ============================================================ */
function smsNormalizeForPattern(text) {
    var s = normalizeDigits(String(text || ''));
    s = s.replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\u061C\uFEFF\u00AD]/g, '');
    s = s.replace(/[\u00A0\u2028\u2029\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ');
    s = s.replace(/[،,]/g, ' ');
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
            n++; var s = signBefore[1] === '−' ? '-' : signBefore[1];
            var slot = '#' + n;
            tokens.push(s + slot); mapping[slot] = p;
        } else if (signAfter) {
            n++; var s2 = signAfter[2] === '−' ? '-' : signAfter[2];
            var slot2 = '#' + n;
            tokens.push(slot2 + s2); mapping[slot2] = p;
        } else if (/\d/.test(p)) {
            n++; var slot3 = '#' + n;
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
        } else { out.push(tokens[i]); prevWild = false; }
    }
    return out;
}

function extractCardKey(raw) {
    var t = smsNormalizeForPattern(raw);

    var mAcc = t.match(/(?:حساب|کارت|سپرده|شماره\s*حساب|شماره\s*کارت)\s*(?:شماره)?\s*[:ـ]?\s*([\d*.\-_٫ـ]{4,})/i);
    if (mAcc) {
        var digits = mAcc[1].replace(/[^\d]/g, '');
        if (digits.length >= 4) return 'ACC:' + digits;
    }

    var mIban = t.match(/IR\s*([\d*]{22,26})/i);
    if (mIban) {
        var ib = mIban[1].replace(/[^\d]/g, '');
        if (ib.length >= 4) return 'IBAN:' + ib;
    }

    var groups = t.match(/\d[\d.\-_٫ـ]{6,}/g);
    if (groups && groups.length) {
        var best = '', bestLen = 0;
        for (var i = 0; i < groups.length; i++) {
            var d = groups[i].replace(/[^\d]/g, '');
            if (d.length > bestLen) { bestLen = d.length; best = d; }
        }
        if (bestLen >= 6) return 'CARD:' + (best.length > 10 ? best.slice(-10) : best);
    }
    return '';
}

function normalizeAccountKey(k) {
    if (!k) return '';
    return String(k).replace(/^(ACC|CARD|IBAN|NUM):/, '');
}

function extractKeywords(raw) {
    var cleaned = smsNormalizeForPattern(raw)
        .replace(/\d+/g, ' ')
        .replace(/[^\u0600-\u06FF\s]/g, ' ')
        .replace(/\s+/g, ' ').trim();
    if (!cleaned) return [];
    var words = cleaned.split(' ').filter(function(w) { return w.length >= 2; });
    var unique = [];
    for (var i = 0; i < words.length; i++) {
        if (unique.indexOf(words[i]) === -1) unique.push(words[i]);
    }
    return unique;
}

function countNumberGroups(tokens) {
    var count = 0, inGroup = false;
    for (var i = 0; i < tokens.length; i++) {
        if (isWild(tokens[i])) { if (!inGroup) { count++; inGroup = true; } }
        else { inGroup = false; }
    }
    return count;
}

/* ============================================================
   بخش ۷ — signatureMatch
   ============================================================ */
function compareAccountKeys(norm1, norm2) {
    if (!norm1 || !norm2) return { match: false, score: 0, reason: 'empty' };
    if (norm1 === norm2) return { match: true, score: 1.0, reason: 'exact' };

    var shorter = norm1.length <= norm2.length ? norm1 : norm2;
    var longer  = norm1.length <= norm2.length ? norm2 : norm1;

    if (shorter.length >= 5 && longer.slice(-shorter.length) === shorter) {
        return { match: true, score: 1.0, reason: 'suffix' };
    }
    if (shorter.length === 4 && longer.slice(-4) === shorter) {
        return { match: true, score: 0.85, reason: 'last4' };
    }
    return { match: false, score: 0, reason: 'mismatch' };
}

function signatureMatch(sig1, sig2) {
    var norm1 = normalizeAccountKey(sig1.card);
    var norm2 = normalizeAccountKey(sig2.card);

    var cardScore, cardReason = '';

    if (norm1 && norm2) {
        var cmp = compareAccountKeys(norm1, norm2);
        if (!cmp.match) {
            return { match: false, score: 0, reason: 'account-' + cmp.reason };
        }
        cardScore = cmp.score;
        cardReason = 'account-' + cmp.reason;
    } else if (!norm1 && !norm2) {
        cardScore = 0.5;
        cardReason = 'no-accounts';
    } else {
        cardScore = 0.3;
        cardReason = 'one-account-missing';
    }

    if (sig1.keywords.length === 0 && sig2.keywords.length === 0) {
        return { match: cardScore >= 1.0, score: cardScore, reason: cardReason + '|no-keywords' };
    }

    var common = 0;
    for (var i = 0; i < sig1.keywords.length; i++) {
        if (sig2.keywords.indexOf(sig1.keywords[i]) !== -1) common++;
    }
    var union = sig1.keywords.length + sig2.keywords.length - common;
    var jaccard = union > 0 ? common / union : 0;
    var numDiff = Math.abs((sig1.numberGroups || 0) - (sig2.numberGroups || 0));
    var numScore = numDiff <= 1 ? 1.0 : (numDiff === 2 ? 0.5 : 0.0);
    var totalScore = cardScore * 0.5 + jaccard * 0.4 + numScore * 0.1;

    var isMatch = false;
    if (cardScore >= 1.0) {
        isMatch = true;
    } else if (cardScore >= 0.5) {
        isMatch = jaccard >= 0.7;
    } else {
        isMatch = jaccard >= 0.9;
    }

    return { match: isMatch, score: totalScore, reason: cardReason + '|kw=' + jaccard.toFixed(2) + '|ng=' + numScore };
}

function findMatchingSmsPattern(raw) {
    var active = loadSmsPatterns().filter(function (p) { return !p.blocked; });
    if (active.length === 0) return null;

    var built = buildSmsPattern(raw);
    var liveCard = extractCardKey(raw);
    var liveKeywords = extractKeywords(raw);
    var liveNumGroups = countNumberGroups(built.tokens);
    var liveDir = detectSmsDirection(raw);
    var liveSig = { card: liveCard, keywords: liveKeywords, numberGroups: liveNumGroups };

    var best = null, bestScore = 0, bestReason = '';

    for (var i = 0; i < active.length; i++) {
        var p = active[i];
        var patDir = p.direction || '';
        if (patDir && liveDir && patDir !== liveDir) continue;

        var patSig = {
            card: p.cardKey || extractCardKey(p.raw || ''),
            keywords: (p.keywords && p.keywords.length > 0) ? p.keywords : extractKeywords(p.raw || ''),
            numberGroups: countNumberGroups(p.tokens || [])
        };
        var res = signatureMatch(liveSig, patSig);
        if (res.match && res.score > bestScore) {
            bestScore = res.score; best = p; bestReason = res.reason;
        }
    }

    return best ? { pattern: best, score: bestScore, built: built, reason: bestReason } : null;
}

/* ============================================================
   بخش ۸ — فیلتر
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

    var m1 = t.match(/(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
    if (m1) {
        var y1 = Number(m1[1]), mo1 = Number(m1[2]), d1 = Number(m1[3]);
        if (y1 > 1300 && y1 < 1500 && mo1 >= 1 && mo1 <= 12 && d1 >= 1 && d1 <= 31) {
            return y1 + '/' + pad2(mo1) + '/' + pad2(d1);
        }
    }

    var m2 = t.match(/(?:^|[^\d])(\d{2})[\/\-](\d{1,2})[\/\-](\d{1,2})(?![\d\/\-])/);
    if (m2) {
        var y2 = Number(m2[1]);
        var mo2 = Number(m2[2]), d2 = Number(m2[3]);
        if (mo2 >= 1 && mo2 <= 12 && d2 >= 1 && d2 <= 31) {
            var cy2 = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate())[0];
            if (y2 < 100) y2 += Math.floor(cy2 / 100) * 100;
            if (y2 > 1300 && y2 < 1500) return y2 + '/' + pad2(mo2) + '/' + pad2(d2);
        }
    }

    var m3 = t.match(/(?:^|[^\d])(\d{2})(\d{2})[\-\s]+(\d{1,2}):(\d{2})(?![\d:])/);
    if (m3) {
        var mm = Number(m3[1]), dd = Number(m3[2]);
        if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
            return _smsBuildDateFromMMDD(mm, dd);
        }
    }

    var m4 = t.match(/(?:^|[^\d])(\d{1,2})[\/\-](\d{1,2})(?![\d\/\-:])/);
    if (m4) {
        var a = Number(m4[1]), b = Number(m4[2]);
        if (a >= 1 && a <= 12 && b >= 1 && b <= 31) return _smsBuildDateFromMMDD(a, b);
        if (b >= 1 && b <= 12 && a >= 1 && a <= 31) return _smsBuildDateFromMMDD(b, a);
    }

    return todayJalaliStr();
}

function _smsBuildDateFromMMDD(mm, dd) {
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return todayJalaliStr();

    var today = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    var cy = today[0];
    var todayStr = cy + '/' + pad2(today[1]) + '/' + pad2(today[2]);
    var cand = cy + '/' + pad2(mm) + '/' + pad2(dd);

    if (cand > todayStr) {
        var diff = jalaliDiff(today[0], today[1], today[2], cy, mm, dd);
        var daysAhead = Math.abs(diff);
        if (daysAhead > 15) {
            return (cy - 1) + '/' + pad2(mm) + '/' + pad2(dd);
        }
    }

    return cand;
}

function suggestTime(text) {
    var t = normalizeDigits(String(text || ''));

    var m1 = t.match(/(?:^|[^\d])\d{4}[\-\s]+(\d{1,2}):(\d{2})(?![\d:])/);
    if (m1) {
        var h = Number(m1[1]), mn = Number(m1[2]);
        if (h >= 0 && h <= 23 && mn >= 0 && mn <= 59) return pad2(h) + ':' + pad2(mn);
    }

    var m2 = t.match(/(?:ساعت|ساعت\s*:?)\s*(\d{1,2})\s*[:.]\s*(\d{1,2})/);
    if (m2) {
        var h2 = Number(m2[1]), mn2 = Number(m2[2]);
        if (h2 >= 0 && h2 <= 23 && mn2 >= 0 && mn2 <= 59) return pad2(h2) + ':' + pad2(mn2);
    }

    var m3 = t.match(/(?:^|[^\d:])(\d{1,2}):(\d{2})(?![\d:])/);
    if (m3) {
        var h3 = Number(m3[1]), mn3 = Number(m3[2]);
        if (h3 >= 0 && h3 <= 23 && mn3 >= 0 && mn3 <= 59) return pad2(h3) + ':' + pad2(mn3);
    }

    return '';
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
    var newCardKey = extractCardKey(opts.raw || '');
    var newKeywords = extractKeywords(opts.raw || '');
    var newNumGroups = countNumberGroups(built.tokens);
    var newDir = opts.direction || '';

    var existing = patterns.find(function (p) { return p.key === (opts.key || built.key); });

    if (!existing && newCardKey) {
        existing = patterns.find(function (p) {
            var pDir = p.direction || '';
            if (pDir && newDir && pDir !== newDir) return false;

            var pCard = p.cardKey || extractCardKey(p.raw || '');
            var normP = normalizeAccountKey(pCard);
            var normN = normalizeAccountKey(newCardKey);
            var cmp = compareAccountKeys(normP, normN);
            if (!cmp.match) return false;

            var pKw = (p.keywords && p.keywords.length > 0) ? p.keywords : extractKeywords(p.raw || '');
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
        if (typeof opts.counterLineDesc !== 'undefined') existing.counterLineDesc = opts.counterLineDesc;
        if (typeof opts.bankLineDesc !== 'undefined') existing.bankLineDesc = opts.bankLineDesc;
        if (opts.counterAccount) {
            existing.counterAccount = opts.counterAccount;
            existing.counterDetails = JSON.parse(JSON.stringify(opts.counterDetails || {}));
        }
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
        counterLineDesc: (typeof opts.counterLineDesc === 'string') ? opts.counterLineDesc : (opts.label || ''),
        bankLineDesc: (typeof opts.bankLineDesc === 'string') ? opts.bankLineDesc : (opts.label || ''),
        counterAccount: opts.counterAccount || '',
        counterDetails: JSON.parse(JSON.stringify(opts.counterDetails || {})),
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
   بخش ۱۱ — pending CRUD
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
    var time      = suggestTime(text);
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
            amount: amount,
            direction: direction,
            date: date,
            time: time,
            description: desc,
            bankName: bankM ? 'بانک ' + bankM[1] : '',
            linkedAccountId: matched ? matched.id : '',
            voucherDesc: suggestLabel(text, bankM ? 'بانک ' + bankM[1] : '', direction),
            counterLineDesc: suggestLabel(text, bankM ? 'بانک ' + bankM[1] : '', direction),
            bankLineDesc: suggestLabel(text, bankM ? 'بانک ' + bankM[1] : '', direction),
            counterAccount: '',
            counterDetails: {},
            trackingNumber: '',
            trackingDate: '',
            detailComplete: false
        }
    };

    if (extraData) {
        if (extraData.patternMatchedId) rec.patternMatchedId = extraData.patternMatchedId;
        if (extraData.patternLabel) rec.patternLabel = extraData.patternLabel;
        if (extraData.amount) rec.suggestion.amount = extraData.amount;
        if (extraData.direction) rec.suggestion.direction = extraData.direction;
        if (extraData.linkedAccountId) rec.suggestion.linkedAccountId = extraData.linkedAccountId;
        if (typeof extraData.voucherDesc !== 'undefined') rec.suggestion.voucherDesc = extraData.voucherDesc;
        if (typeof extraData.counterLineDesc !== 'undefined')    rec.suggestion.counterLineDesc    = extraData.counterLineDesc;
        if (typeof extraData.bankLineDesc !== 'undefined')    rec.suggestion.bankLineDesc    = extraData.bankLineDesc;
        if (extraData.counterAccount) {
            rec.suggestion.counterAccount = extraData.counterAccount;
            rec.suggestion.counterDetails = JSON.parse(JSON.stringify(extraData.counterDetails || {}));
            if (extraData.counterAccount) rec.suggestion.detailComplete = true;
        }
        if (extraData.trackingNumber) rec.suggestion.trackingNumber = extraData.trackingNumber;
        if (extraData.trackingDate) rec.suggestion.trackingDate = extraData.trackingDate;
        if (typeof extraData.detailComplete !== 'undefined') rec.suggestion.detailComplete = !!extraData.detailComplete;
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
   بخش ۱۲ — splitMultipleSms
   ============================================================ */
function splitMultipleSms(text) {
    var t = String(text || '').trim();
    if (!t) return [];

    var blocks = t.split(/\r?\n\s*\r?\n+/)
        .map(function (b) { return b.trim(); })
        .filter(Boolean);

    var result = [];
    var headerRe = /\r?\n(?=\s*(?:\d{3}[.\-\s]?\d{3}[.\-\s]?\d{5,}|\d{16}|IR\s*\d{24}|\*{3,}\d{4}))/;

    blocks.forEach(function (block) {
        var parts = block.split(headerRe)
            .map(function (b) { return b.trim(); })
            .filter(Boolean);
        if (parts.length > 1) result = result.concat(parts);
        else result.push(block);
    });

    return result;
}

/* ============================================================
   بخش ۱۳ — handleMultipleIncomingSms
   ============================================================ */
function handleMultipleIncomingSms(text, source, force) {
    var blocks = splitMultipleSms(text);

    if (blocks.length === 0) {
        return { ok: false, reason: 'empty', total: 0, matched: 0, unmatched: 0, duplicate: 0, notBank: 0 };
    }

    if (blocks.length === 1) {
        var single = handleIncomingSms(blocks[0], source, force);
        return {
            ok: single.ok,
            reason: single.reason,
            total: 1,
            matched: single.ok && single.matched ? 1 : 0,
            unmatched: single.ok && !single.matched ? 1 : 0,
            duplicate: single.reason === 'duplicate' ? 1 : 0,
            notBank: single.reason === 'not-bank' ? 1 : 0,
            items: single.ok ? [single] : []
        };
    }

    var results = { ok: true, total: blocks.length, matched: 0, unmatched: 0, duplicate: 0, notBank: 0, items: [] };

    blocks.forEach(function (block) {
        var r = handleIncomingSms(block, source || 'paste-multi', force);
        if (r.ok) {
            if (r.matched) results.matched++;
            else results.unmatched++;
            results.items.push(r);
        } else if (r.reason === 'duplicate') results.duplicate++;
        else if (r.reason === 'not-bank') results.notBank++;
    });

    try { renderPendingSmsBox(); } catch (e) {}
    try { updateSmsBadge(); } catch (e) {}

    var totalAdded = results.matched + results.unmatched;
    if (totalAdded > 0) {
        showToast('✅ ' + toFa(totalAdded) + ' پیامک اضافه شد — از «ساخت سند ترکیبی» استفاده کنید', 4500);
    } else if (results.duplicate > 0) {
        showToast('⚠️ همه پیامک‌ها قبلاً ثبت شده بودند');
    } else if (results.notBank > 0) {
        showToast('❌ هیچ پیامک بانکی معتبری یافت نشد');
    }

    return results;
}

/* ============================================================
   بخش ۱۴ — رندر pending
   ============================================================ */
function _buildMatchedCardHtml(p, s) {
    var pid = p.id;
    var liveDir = detectSmsDirection(p.raw) || s.direction || '';
    var liveAmt = extractAmountWithSign(p.raw).amount || s.amount || 0;
    var accountId = s.linkedAccountId || '';
    var accounts = DB.load('bankAccounts', []);
    var account = accounts.find(function (a) { return a.id === accountId; });
    var accountLabel = account ? ((account.bank || '') + ' — ' + (account.account || '')) : '—';
    var date = s.date || todayJalaliStr();
    var dirLabel = liveDir === 'in' ? '📥 واریز' : (liveDir === 'out' ? '📤 برداشت' : '❔ نامشخص');
    var patternLabel = p.patternLabel || 'شناسایی‌شده';

    var isComplete = !!s.detailComplete && !!s.counterAccount;
    var completeBadge = isComplete
        ? '<span style="background:#fff; color:#059669; padding:2px 8px; border-radius:8px; font-size:.68rem; font-weight:800">✅ تکمیل شد</span>'
        : '<span style="background:rgba(255,255,255,0.25); color:#fff; padding:2px 8px; border-radius:8px; font-size:.68rem; font-weight:800">⏳ تکمیل نشده</span>';

    return '<div class="pending-sms-card psm-matched" data-pid="' + pid + '" ' +
        'style="border:2px solid #10b981; background:linear-gradient(180deg,#ecfdf5 0%,#ffffff 100%); border-radius:16px; overflow:hidden; margin-bottom:14px; box-shadow:0 4px 16px rgba(16,185,129,0.12);">' +
        '<div style="background:linear-gradient(135deg,#10b981,#059669); color:#fff; padding:12px 16px; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">' +
            '<input type="checkbox" class="psm-select-cb" data-pid="' + pid + '" ' +
            'style="width:20px; height:20px; cursor:pointer; accent-color:#fff; flex-shrink:0;">' +
            '<div style="flex:1; min-width:0;">' +
                '<div style="font-weight:900; font-size:.95rem; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">🧠 الگو: «' + esc(patternLabel) + '» ' + completeBadge + '</div>' +
                '<div style="font-size:.72rem; opacity:.9; margin-top:2px;">📅 ' + toFa(tsToJalaliDate(p.createdAt)) + ' — ' + toFa(tsToJalaliTime(p.createdAt)) + '</div>' +
            '</div>' +
            '<button type="button" class="psm-detail-btn" data-action="open-detail" data-id="' + pid + '" ' +
                'style="background:#fff; color:#059669; border:none; padding:8px 14px; border-radius:10px; font-family:inherit; font-weight:800; font-size:.82rem; cursor:pointer; flex-shrink:0">' +
                (isComplete ? '✏️ ویرایش' : '📝 تکمیل جزئیات') +
            '</button>' +
        '</div>' +
        '<div style="padding:14px;">' +
            '<details style="margin-bottom:10px;">' +
                '<summary style="cursor:pointer; font-size:.8rem; font-weight:700; color:var(--primary-dark); padding:4px 0; user-select:none;">📄 متن پیامک</summary>' +
                '<div style="background:var(--card-alt); padding:10px; border-radius:8px; font-size:.75rem; margin-top:6px; direction:rtl; white-space:pre-wrap; word-break:break-word; border:1px solid var(--border); max-height:120px; overflow-y:auto;">' + esc(p.raw) + '</div>' +
            '</details>' +
            '<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; background:var(--card-alt); padding:12px; border-radius:10px; border:1px solid var(--border); font-size:.85rem;">' +
                '<div><b>💰 مبلغ:</b> ' + formatMoney(liveAmt) + ' ریال</div>' +
                '<div><b>' + dirLabel + '</b></div>' +
                '<div style="grid-column:1/-1;"><b>🏦 حساب:</b> ' + esc(accountLabel) + '</div>' +
                '<div style="grid-column:1/-1;"><b>📅 تاریخ:</b> ' + toFa(date) + '</div>' +
                (s.counterAccount
                    ? '<div style="grid-column:1/-1; color:#059669;"><b>🎯 معین طرف مقابل:</b> ' + esc(getAccountLabel(s.counterAccount, DB.load('accounts', []))) + '</div>'
                    : '') +
            '</div>' +
            '<details style="margin-top:10px;">' +
                '<summary style="cursor:pointer; font-size:.8rem; font-weight:700; color:#1e40af; padding:4px 0; user-select:none;">✎ ویرایش سریع (اختیاری)</summary>' +
                '<div style="margin-top:10px; padding:10px; background:#f8fafc; border:1px solid var(--border); border-radius:10px;">' +
                    '<div class="psm-dir-box">' +
                        '<button type="button" class="psm-dir-btn' + (liveDir === 'in' ? ' active-in' : '') + '" data-dir="in" data-pid="' + pid + '"><span class="icon">📥</span><span class="lbl">واریز</span></button>' +
                        '<button type="button" class="psm-dir-btn' + (liveDir === 'out' ? ' active-out' : '') + '" data-dir="out" data-pid="' + pid + '"><span class="icon">📤</span><span class="lbl">برداشت</span></button>' +
                    '</div>' +
                    '<input type="hidden" data-field="direction" value="' + liveDir + '">' +
                    '<div class="psm-field"><label>💰 مبلغ (ریال)</label>' +
                        '<input type="text" class="amount-input" inputmode="numeric" dir="ltr" data-field="amount" value="' + (liveAmt ? formatRaw(liveAmt) : '') + '">' +
                    '</div>' +
                    '<div class="psm-field"><label>🏦 حساب بانکی</label>' +
                        '<select data-field="account">' + _buildPendingBankOptions(accountId) + '</select>' +
                    '</div>' +
                    '<div class="psm-row-2">' +
                        '<div class="psm-field"><label>📅 تاریخ</label>' +
                            '<input type="text" dir="ltr" class="date-picker" data-field="date" value="' + esc(date) + '"></div>' +
                        '<div class="psm-field"><label>📝 شرح سند</label>' +
                            '<input type="text" data-field="voucherDesc" value="' + esc(s.voucherDesc || '') + '"></div>' +
                    '</div>' +
                    '<div class="psm-row-2">' +
                        '<div class="psm-field"><label>📝 شرح قلم (طرف مقابل)</label>' +
                            '<input type="text" data-field="counterLineDesc" value="' + esc(s.counterLineDesc || '') + '"></div>' +
                        '<div class="psm-field"><label>📝 شرح قلم (بانک)</label>' +
                            '<input type="text" data-field="bankLineDesc" value="' + esc(s.bankLineDesc || '') + '"></div>' +
                    '</div>' +
                    '<input type="hidden" data-field="label" value="' + esc(patternLabel) + '">' +
                '</div>' +
            '</details>' +
        '</div>' +
        '<div style="padding:12px 14px; background:var(--card-alt); border-top:1px solid var(--border); display:flex; gap:8px;">' +
            '<button class="psm-btn-primary" data-action="save-with-voucher" data-id="' + pid + '" ' +
            'style="flex:1; font-size:.95rem; padding:12px; background:linear-gradient(135deg,#10b981,#059669);">✅ تأیید و ساخت سند</button>' +
            '<button class="psm-btn-danger" data-action="drop" data-id="' + pid + '" title="حذف">🗑</button>' +
        '</div>' +
    '</div>';
}

function _buildUnmatchedCardHtml(p, s) {
    var pid = p.id;
    var liveDir = detectSmsDirection(p.raw);
    var effectiveDir = liveDir || s.direction || '';
    var liveAmt = extractAmountWithSign(p.raw);
    var accounts = DB.load('bankAccounts', []);

    var clsIn = (effectiveDir === 'in') ? ' active-in' : '';
    var clsOut = (effectiveDir === 'out') ? ' active-out' : '';
    var forcedBadge = p.forced ? '<span class="badge">دستی</span>' : '';
    var meta = '📅 ' + toFa(tsToJalaliDate(p.createdAt)) + ' — ' + toFa(tsToJalaliTime(p.createdAt));

    var voucherDescVal = (typeof s.voucherDesc === 'string') ? s.voucherDesc : suggestLabel(p.raw, s.bankName, effectiveDir);
    var counterLineDescVal = (typeof s.counterLineDesc === 'string') ? s.counterLineDesc : suggestLabel(p.raw, s.bankName, effectiveDir);
    var bankLineDescVal = (typeof s.bankLineDesc === 'string') ? s.bankLineDesc : suggestLabel(p.raw, s.bankName, effectiveDir);

    var isComplete = !!s.detailComplete && !!s.counterAccount;
    var completeBadge = isComplete
        ? '<span style="background:#d1fae5; color:#065f46; padding:2px 8px; border-radius:8px; font-size:.68rem; font-weight:800">✅ تکمیل شد</span>'
        : '<span style="background:#fef3c7; color:#92400e; padding:2px 8px; border-radius:8px; font-size:.68rem; font-weight:800">⏳ تکمیل نشده</span>';

    return '<div class="pending-sms-card psm-new" data-pid="' + pid + '">' +
        '<div class="psm-head">' +
            '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;flex:1">' +
                '<input type="checkbox" class="psm-select-cb" data-pid="' + pid + '" style="width:20px;height:20px;accent-color:var(--primary);cursor:pointer">' +
                '<div style="flex:1">' +
                    '<div class="title">🔔 پیامک جدید' + forcedBadge + ' ' + completeBadge + '</div>' +
                    '<div class="meta">' + esc(meta) + '</div>' +
                '</div>' +
            '</label>' +
            '<button type="button" class="psm-detail-btn" data-action="open-detail" data-id="' + pid + '" ' +
                'style="background:linear-gradient(135deg,#6366f1,#4f46e5); color:#fff; border:none; padding:8px 14px; border-radius:10px; font-family:inherit; font-weight:800; font-size:.82rem; cursor:pointer; flex-shrink:0">' +
                (isComplete ? '✏️ ویرایش' : '📝 تکمیل جزئیات') +
            '</button>' +
        '</div>' +
        '<div class="psm-text-wrap">' +
            '<div class="psm-text-toggle" data-toggle="text"><span>📄 متن پیامک</span><span class="arrow">◀</span></div>' +
            '<div class="psm-text-body">' + esc(p.raw) + '</div>' +
        '</div>' +
        '<div class="psm-body">' +
            '<div class="psm-dir-box">' +
                '<button type="button" class="psm-dir-btn' + clsIn + '" data-dir="in" data-pid="' + pid + '"><span class="icon">📥</span><span class="lbl">واریز</span></button>' +
                '<button type="button" class="psm-dir-btn' + clsOut + '" data-dir="out" data-pid="' + pid + '"><span class="icon">📤</span><span class="lbl">برداشت</span></button>' +
            '</div>' +
            '<input type="hidden" data-field="direction" value="' + effectiveDir + '">' +
            '<div class="psm-field"><label>💰 مبلغ (ریال)</label>' +
                '<input type="text" class="amount-input" inputmode="numeric" dir="ltr" data-field="amount" value="' + ((liveAmt.amount || s.amount) ? formatRaw(liveAmt.amount || s.amount) : '') + '">' +
            '</div>' +
            '<div class="psm-field"><label>🏦 حساب بانکی</label>' +
                '<select data-field="account">' + _buildPendingBankOptions(s.linkedAccountId || '') + '</select>' +
            '</div>' +
            '<div class="psm-row-2">' +
                '<div class="psm-field"><label>📅 تاریخ</label>' +
                    '<input type="text" dir="ltr" class="date-picker" data-field="date" value="' + esc(s.date || todayJalaliStr()) + '"></div>' +
                '<div class="psm-field"><label>📝 شرح سند</label>' +
                    '<input type="text" data-field="voucherDesc" value="' + esc(voucherDescVal) + '"></div>' +
            '</div>' +
            '<div class="psm-row-2">' +
                '<div class="psm-field"><label>📝 شرح قلم (طرف مقابل)</label>' +
                    '<input type="text" data-field="counterLineDesc" value="' + esc(counterLineDescVal) + '"></div>' +
                '<div class="psm-field"><label>📝 شرح قلم (بانک)</label>' +
                    '<input type="text" data-field="bankLineDesc" value="' + esc(bankLineDescVal) + '"></div>' +
            '</div>' +
            '<div class="psm-field"><label>🏷 نام الگو (اختیاری — برای شناسایی خودکار بعدی)</label>' +
                '<input type="text" data-field="label" value="' + esc(suggestLabel(p.raw, s.bankName, effectiveDir)) + '">' +
            '</div>' +
        '</div>' +
        '<div class="psm-actions">' +
            '<button class="psm-btn-primary" data-action="save-with-voucher" data-id="' + pid + '">✅ ثبت + ساخت سند</button>' +
            '<button class="psm-btn-secondary" data-action="save-pattern-only" data-id="' + pid + '">🧠 فقط ثبت الگو</button>' +
            '<button class="psm-btn-danger" data-action="drop" data-id="' + pid + '">🗑</button>' +
        '</div>' +
    '</div>';
}

function _buildPendingBankOptions(selectedId) {
    var accounts = DB.load('bankAccounts', []);
    var html = '<option value="">— انتخاب —</option>';
    accounts.forEach(function (acc) {
        var sel = (selectedId === acc.id) ? ' selected' : '';
        html += '<option value="' + acc.id + '"' + sel + '>' + esc((acc.bank || '') + ' — ' + (acc.account || '')) + '</option>';
    });
    return html;
}

function renderPendingSmsBox() {
    var box = document.getElementById('pending-sms-list');
    if (!box) return;

    var list = getPendingSms();
    var countEl = document.getElementById('pending-sms-count');
    if (countEl) countEl.textContent = toFa(list.length);

    var searchEl = document.getElementById('pending-sms-search');
    var q = searchEl ? (searchEl.value || '').trim().toLowerCase() : '';

    if (list.length === 0) {
        box.innerHTML = '<div class="widget-empty">📭 پیامک ثبت‌نشده‌ای وجود ندارد.<br><span style="font-size:.72rem;opacity:.8">یک یا چند پیامک را در کادر بالا پیست کن.</span></div>';
        updateSmsBadge();
        return;
    }

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
        if (p.patternMatchedId) html += _buildMatchedCardHtml(p, s);
        else html += _buildUnmatchedCardHtml(p, s);
    }

    if (shown === 0) html = '<div class="widget-empty">🔍 نتیجه‌ای با این جستجو یافت نشد.</div>';

    box.innerHTML = html;
    if (typeof attachDatePickers === 'function') attachDatePickers();
    bindPendingEventsNew(box);
    updateSmsBadge();
    
    // ✅ فراخوانی برای اطمینان از حضور دکمه
    _injectPendingSelectAllBtn();
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
            var pid = card.getAttribute('data-pid');
            var list = getPendingSms();
            var pending = list.find(function(x) { return x.id === pid; });
            if (pending) {
                if (!pending.suggestion) pending.suggestion = {};
                pending.suggestion.direction = dir;
                savePendingSms(list);
            }
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
            if (action === 'open-detail') { openPendingSmsDetailModal(pid); return; }
            if (action === 'drop') {
                if (!confirm('این پیامک حذف شود؟')) return;
                removePendingSms(pid); renderPendingSmsBox(); return;
            }
            if (action === 'save-pattern-only') return savePendingAsPattern(pid, false);
            if (action === 'save-with-voucher')  return savePendingAsPattern(pid, true);
        };
    });
}

/* ============================================================
   ✅ بخش ۱۵ — مودال تکمیل جزئیات
   ============================================================ */
function openPendingSmsDetailModal(pid) {
    var pending = getPendingSms().find(function (p) { return p.id === pid; });
    if (!pending) { alert('پیامک یافت نشد'); return; }

    var s = pending.suggestion || {};
    var ctx = {
        pid: pid,
        account: s.counterAccount || '',
        details: JSON.parse(JSON.stringify(s.counterDetails || {})),
        counterLineDesc: s.counterLineDesc || '',
        bankLineDesc: s.bankLineDesc || '',
        voucherDesc: s.voucherDesc || '',
        trackingNumber: s.trackingNumber || '',
        trackingDate: s.trackingDate || '',
        date: s.date || todayJalaliStr(),
        time: s.time || '',
        amount: Number(s.amount) || 0,
        direction: s.direction || detectSmsDirection(pending.raw) || '',
        bankAccountId: s.linkedAccountId || ''
    };
    window._pmsDetailCtx = ctx;

    var old = document.getElementById('pms-detail-modal');
    if (old) old.remove();
    var oldO = document.getElementById('pms-detail-overlay');
    if (oldO) oldO.remove();

    var html = ''
        + '<div id="pms-detail-overlay" class="overlay show" style="z-index:2500"></div>'
        + '<div id="pms-detail-modal" class="modal show" style="max-width:680px;z-index:2510">'
        +   '<div class="modal-head" style="background:linear-gradient(135deg,#6366f1,#4f46e5)">'
        +     '<h2>📝 تکمیل جزئیات سند</h2>'
        +     '<button class="close-btn" id="pms-detail-close" type="button">×</button>'
        +   '</div>'
        +   '<div class="modal-body" style="max-height:75vh;overflow-y:auto" id="pms-detail-body"></div>'
        +   '<div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end">'
        +     '<button class="btn-secondary" id="pms-detail-cancel" type="button">انصراف</button>'
        +     '<button class="btn-primary" id="pms-detail-save" type="button">💾 ذخیره</button>'
        +   '</div>'
        + '</div>';

    document.body.insertAdjacentHTML('beforeend', html);

    renderPendingSmsDetailBody();

    document.getElementById('pms-detail-close').onclick = closePendingSmsDetailModal;
    document.getElementById('pms-detail-cancel').onclick = closePendingSmsDetailModal;
    document.getElementById('pms-detail-overlay').onclick = closePendingSmsDetailModal;
    document.getElementById('pms-detail-save').onclick = function () {
        savePendingSmsDetail(pid);
    };

    setTimeout(function () {
        if (typeof attachDatePickers === 'function') attachDatePickers();
        if (typeof refreshStdDescDatalist === 'function') refreshStdDescDatalist();
    }, 100);
}

function renderPendingSmsDetailBody() {
    var ctx = window._pmsDetailCtx;
    if (!ctx) return;

    var box = document.getElementById('pms-detail-body');
    if (!box) return;

    var accounts = DB.load('accounts', []);
    var leaves = accounts.filter(function (a) {
        return !accounts.some(function (x) { return x.parent === a.id; });
    });
    var accItems = leaves.map(function (a) {
        return { value: a.id, text: getAccountLabel(a.id, accounts) };
    });

    var html = '';

    var pending = getPendingSms().find(function (p) { return p.id === ctx.pid; });
    if (pending) {
        html += '<details style="margin-bottom:12px"><summary style="cursor:pointer;font-size:.8rem;color:var(--primary-dark);font-weight:700;padding:6px 0">📄 متن اصلی پیامک</summary>'
             +  '<div style="background:var(--card-alt);padding:10px;border-radius:8px;font-size:.75rem;margin-top:6px;direction:rtl;white-space:pre-wrap;border:1px solid var(--border);max-height:100px;overflow-y:auto">' + esc(pending.raw) + '</div></details>';
    }

    // جهت
    html += '<div class="field"><label>جهت تراکنش</label>'
         +  '<div style="display:flex;gap:8px">'
         +    '<button type="button" class="pms-dir-btn2" data-dir2="in" style="flex:1;padding:12px;border:2px solid ' + (ctx.direction === 'in' ? '#059669' : 'var(--border)') + ';border-radius:10px;background:' + (ctx.direction === 'in' ? '#d1fae5' : '#fff') + ';font-family:inherit;font-weight:800;cursor:pointer;color:' + (ctx.direction === 'in' ? '#065f46' : 'inherit') + '">📥 واریز</button>'
         +    '<button type="button" class="pms-dir-btn2" data-dir2="out" style="flex:1;padding:12px;border:2px solid ' + (ctx.direction === 'out' ? '#dc2626' : 'var(--border)') + ';border-radius:10px;background:' + (ctx.direction === 'out' ? '#fee2e2' : '#fff') + ';font-family:inherit;font-weight:800;cursor:pointer;color:' + (ctx.direction === 'out' ? '#991b1b' : 'inherit') + '">📤 برداشت</button>'
         +  '</div></div>';

    // مبلغ + بانک
    html += '<div class="grid-2">'
         +    '<div class="field"><label>مبلغ (ریال)</label>'
         +      '<input type="text" id="pms-d-amount" inputmode="numeric" dir="ltr" value="' + (ctx.amount ? formatRaw(ctx.amount) : '') + '" style="text-align:center;font-weight:800">'
         +    '</div>'
         +    '<div class="field"><label>حساب بانکی</label>'
         +      '<select id="pms-d-bank">' + _buildPendingBankOptions(ctx.bankAccountId) + '</select>'
         +    '</div>'
         +  '</div>';

    // تاریخ و ساعت
    html += '<div class="grid-2">'
         +    '<div class="field"><label>تاریخ</label>'
         +      '<input type="text" id="pms-d-date" class="date-picker" dir="ltr" value="' + esc(ctx.date) + '">'
         +    '</div>'
         +    '<div class="field"><label>ساعت</label>'
         +      '<input type="text" id="pms-d-time" dir="ltr" placeholder="HH:MM" value="' + esc(ctx.time) + '" style="text-align:center;font-family:monospace">'
         +    '</div>'
         +  '</div>';

    // حساب معین طرف مقابل (searchable)
    html += '<div class="field" style="padding:12px;background:#eef2ff;border:1.5px solid #818cf8;border-radius:12px">'
         +    '<label style="color:#3730a3;font-weight:900;font-size:.88rem;margin-bottom:8px">🎯 حساب معین طرف مقابل * <span style="font-size:.72rem;font-weight:600;color:#64748b">(طرف بدهکار/بستانکار سند)</span></label>'
         +    '<div id="pms-d-account-wrap"></div>'
         +  '</div>';

    // تفصیلی
    html += '<div id="pms-d-details-wrap"></div>';

    // شرح قلم‌ها (تفکیک شده)
    html += '<div class="grid-2" style="margin-top:12px">'
         +    '<div class="field"><label>📝 شرح قلم (طرف مقابل) *</label>'
         +      '<input type="text" id="pms-d-counterdesc" value="' + esc(ctx.counterLineDesc) + '" list="std-desc-list" placeholder="مثلاً: خرید ملزومات">'
         +    '</div>'
         +    '<div class="field"><label>📝 شرح قلم (حساب بانک)</label>'
         +      '<input type="text" id="pms-d-bankdesc" value="' + esc(ctx.bankLineDesc) + '" list="std-desc-list" placeholder="مثلاً: برداشت از بانک ملی">'
         +    '</div>'
         +  '</div>';

    // شرح سند
    html += '<div class="field"><label>📝 شرح سند (بالای سند)</label>'
         +  '<input type="text" id="pms-d-voucherdesc" value="' + esc(ctx.voucherDesc) + '" list="std-desc-list" placeholder="مثلاً: هزینه‌های جاری">'
         +  '</div>';

    // پیگیری
    html += '<div class="grid-2">'
         +    '<div class="field"><label>شماره پیگیری</label>'
         +      '<input type="text" id="pms-d-tracking" dir="ltr" value="' + esc(ctx.trackingNumber) + '" placeholder="اختیاری">'
         +    '</div>'
         +    '<div class="field"><label>تاریخ پیگیری</label>'
         +      '<input type="text" id="pms-d-trackingdate" class="date-picker" dir="ltr" value="' + esc(ctx.trackingDate) + '">'
         +    '</div>'
         +  '</div>';

    box.innerHTML = html;

    // رندر searchable حساب
    setTimeout(function () {
        _renderPmsAccountSearchable(accItems);
        _renderPmsDetailsSearchable(accounts);
        if (typeof attachDatePickers === 'function') attachDatePickers();
    }, 50);

    // بایند دکمه‌های جهت
    box.querySelectorAll('.pms-dir-btn2').forEach(function (btn) {
        btn.onclick = function () {
            ctx.direction = this.getAttribute('data-dir2');
            renderPendingSmsDetailBody();
        };
    });

    // مبلغ
    var amtInp = document.getElementById('pms-d-amount');
    if (amtInp) {
        amtInp.addEventListener('input', function () {
            var v = normalizeDigits(this.value).replace(/[^\d]/g, '');
            this.value = v;
            ctx.amount = Number(v) || 0;
        });
        amtInp.addEventListener('blur', function () {
            var v = Number(normalizeDigits(this.value).replace(/[^\d]/g, '')) || 0;
            this.value = v ? formatRaw(v) : '';
            ctx.amount = v;
        });
    }

    var bankSel = document.getElementById('pms-d-bank');
    if (bankSel) bankSel.onchange = function () { ctx.bankAccountId = this.value; };

    var dInp = document.getElementById('pms-d-date');
    if (dInp) dInp.addEventListener('input', function () { ctx.date = normalizeDigits(this.value); });
    var tInp = document.getElementById('pms-d-time');
    if (tInp) tInp.addEventListener('input', function () { ctx.time = this.value; });

    var cInp = document.getElementById('pms-d-counterdesc');
    if (cInp) cInp.addEventListener('input', function () { ctx.counterLineDesc = this.value; });
    var bInp = document.getElementById('pms-d-bankdesc');
    if (bInp) bInp.addEventListener('input', function () { ctx.bankLineDesc = this.value; });
    
    var vInp = document.getElementById('pms-d-voucherdesc');
    if (vInp) vInp.addEventListener('input', function () { ctx.voucherDesc = this.value; });

    var trInp = document.getElementById('pms-d-tracking');
    if (trInp) trInp.addEventListener('input', function () { ctx.trackingNumber = this.value; });
    var trdInp = document.getElementById('pms-d-trackingdate');
    if (trdInp) trdInp.addEventListener('input', function () { ctx.trackingDate = normalizeDigits(this.value); });
}

function _renderPmsAccountSearchable(accItems) {
    var wrap = document.getElementById('pms-d-account-wrap');
    if (!wrap) return;
    wrap.innerHTML = '';
    var ctx = window._pmsDetailCtx;

    if (typeof createSearchableSelect === 'function') {
        var sel = createSearchableSelect(accItems, ctx.account, '— انتخاب معین —', function (val) {
            ctx.account = val;
            ctx.details = {};
            _renderPmsDetailsSearchable(DB.load('accounts', []));
        });
        wrap.appendChild(sel);
    } else {
        var nativeSel = document.createElement('select');
        nativeSel.innerHTML = '<option value="">— انتخاب معین —</option>';
        accItems.forEach(function (it) {
            var o = document.createElement('option');
            o.value = it.value; o.textContent = it.text;
            if (it.value === ctx.account) o.selected = true;
            nativeSel.appendChild(o);
        });
        nativeSel.style.cssText = 'width:100%;padding:11px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit';
        nativeSel.addEventListener('change', function () {
            ctx.account = this.value;
            ctx.details = {};
            _renderPmsDetailsSearchable(DB.load('accounts', []));
        });
        wrap.appendChild(nativeSel);
    }
}

function _renderPmsDetailsSearchable(accounts) {
    var wrap = document.getElementById('pms-d-details-wrap');
    if (!wrap) return;
    wrap.innerHTML = '';
    var ctx = window._pmsDetailCtx;
    if (!ctx || !ctx.account) return;

    var acc = accounts.find(function (a) { return a.id === ctx.account; });
    if (!acc || !acc.links || acc.links.length === 0) return;

    var uniqueLinks = [];
    acc.links.forEach(function (lt) { if (uniqueLinks.indexOf(lt) === -1) uniqueLinks.push(lt); });

    var combined = [];
    uniqueLinks.forEach(function (lt) {
        getLinkedItems(lt).forEach(function (it) {
            combined.push({
                value: lt + '::' + it.id,
                text: linkTypeName(lt) + ': ' + getLinkedItemLabel(lt, it)
            });
        });
    });

    if (combined.length === 0) return;

    var curVal = null;
    uniqueLinks.forEach(function (lt) { if (ctx.details[lt]) curVal = lt + '::' + ctx.details[lt]; });

    var fieldDiv = document.createElement('div');
    fieldDiv.className = 'field';
    var lbl = document.createElement('label');
    lbl.textContent = '🏷 تفصیلی (' + uniqueLinks.map(linkTypeName).join(' / ') + ')';
    fieldDiv.appendChild(lbl);

    if (typeof createSearchableSelect === 'function') {
        var detSel = createSearchableSelect(combined, curVal, '— انتخاب تفصیلی —', function (val) {
            ctx.details = {};
            if (val) {
                var parts = val.split('::');
                ctx.details[parts[0]] = parts[1];
            }
        });
        fieldDiv.appendChild(detSel);
    } else {
        var nativeSel = document.createElement('select');
        nativeSel.innerHTML = '<option value="">— انتخاب تفصیلی —</option>';
        combined.forEach(function (it) {
            var o = document.createElement('option');
            o.value = it.value; o.textContent = it.text;
            if (it.value === curVal) o.selected = true;
            nativeSel.appendChild(o);
        });
        nativeSel.style.cssText = 'width:100%;padding:11px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit';
        nativeSel.addEventListener('change', function () {
            ctx.details = {};
            if (this.value) {
                var parts = this.value.split('::');
                ctx.details[parts[0]] = parts[1];
            }
        });
        fieldDiv.appendChild(nativeSel);
    }
    wrap.appendChild(fieldDiv);
}

function savePendingSmsDetail(pid) {
    var ctx = window._pmsDetailCtx;
    if (!ctx) return;

    if (!ctx.amount || ctx.amount <= 0) { alert('⚠️ مبلغ را وارد کنید'); return; }
    if (!ctx.direction) { alert('⚠️ جهت تراکنش را انتخاب کنید'); return; }
    if (!ctx.account) { alert('⚠️ حساب معین طرف مقابل را انتخاب کنید'); return; }

    var list = getPendingSms();
    var pending = list.find(function (p) { return p.id === pid; });
    if (!pending) { alert('پیامک یافت نشد'); return; }

    if (!pending.suggestion) pending.suggestion = {};
    pending.suggestion.counterAccount = ctx.account;
    pending.suggestion.counterDetails = JSON.parse(JSON.stringify(ctx.details));
    pending.suggestion.counterLineDesc = ctx.counterLineDesc;
    pending.suggestion.bankLineDesc = ctx.bankLineDesc;
    pending.suggestion.voucherDesc = ctx.voucherDesc;
    pending.suggestion.trackingNumber = ctx.trackingNumber;
    pending.suggestion.trackingDate = ctx.trackingDate;
    pending.suggestion.date = ctx.date;
    pending.suggestion.time = ctx.time;
    pending.suggestion.amount = ctx.amount;
    pending.suggestion.direction = ctx.direction;
    pending.suggestion.linkedAccountId = ctx.bankAccountId;
    pending.suggestion.detailComplete = true;

    savePendingSms(list);
    closePendingSmsDetailModal();
    renderPendingSmsBox();
    showToast('✅ جزئیات ذخیره شد — آماده سند گروهی');
}

function closePendingSmsDetailModal() {
    var m = document.getElementById('pms-detail-modal');
    if (m) m.remove();
    var o = document.getElementById('pms-detail-overlay');
    if (o) o.remove();
    window._pmsDetailCtx = null;
}

/* ============================================================
   بخش ۱۶ — ذخیره pending
   ============================================================ */
function savePendingAsPattern(pid, withVoucher) {
    var card = document.querySelector('.pending-sms-card[data-pid="' + pid + '"]');
    var pending = getPendingSms().find(function (p) { return p.id === pid; });
    if (!pending) return;

    var accountId   = '';
    var amountStr   = '';
    var dirHidden   = '';
    var dateStr     = '';
    var voucherDesc = '';
    var counterLineDesc = '';
    var bankLineDesc = '';
    var labelStr    = '';

    if (card) {
        accountId   = (card.querySelector('[data-field="account"]') || {}).value || '';
        amountStr   = (card.querySelector('[data-field="amount"]') || {}).value || '';
        dirHidden   = (card.querySelector('[data-field="direction"]') || {}).value || '';
        dateStr     = (card.querySelector('[data-field="date"]') || {}).value || '';
        voucherDesc = (card.querySelector('[data-field="voucherDesc"]') || {}).value || '';
        counterLineDesc = (card.querySelector('[data-field="counterLineDesc"]') || {}).value || '';
        bankLineDesc = (card.querySelector('[data-field="bankLineDesc"]') || {}).value || '';
        labelStr    = (card.querySelector('[data-field="label"]') || {}).value || '';
    }

    var s = pending.suggestion || {};
    var amount = Number(normalizeDigits(amountStr).replace(/[^\d]/g, '')) || Number(s.amount) || 0;
    var direction = dirHidden || s.direction || '';
    if (!amount)    { alert('⚠️ مبلغ را وارد کنید.'); return; }
    if (!direction) { alert('⚠️ واریز یا برداشت را انتخاب کنید.'); return; }
    if (withVoucher && !accountId) {
        accountId = s.linkedAccountId || '';
    }
    if (withVoucher && !accountId) { alert('⚠️ برای ساخت سند، حساب بانکی را انتخاب کنید.'); return; }

    if (pending.patternMatchedId) {
        var allPatterns = loadSmsPatterns();
        var matched = allPatterns.find(function (p2) { return p2.id === pending.patternMatchedId; });
        if (matched) {
            if (labelStr.trim()) matched.label = labelStr.trim();
            matched.direction = direction;
            matched.linkedAccountId = accountId;
            matched.voucherDesc = voucherDesc.trim() || s.voucherDesc || '';
            matched.counterLineDesc = counterLineDesc.trim() || s.counterLineDesc || '';
            matched.bankLineDesc = bankLineDesc.trim() || s.bankLineDesc || '';
            matched.lastUsed = Date.now();
            matched.uses = (matched.uses || 0) + 1;

            if (s.counterAccount) {
                matched.counterAccount = s.counterAccount;
                matched.counterDetails = JSON.parse(JSON.stringify(s.counterDetails || {}));
            }

            var built = buildSmsPattern(pending.raw);
            var amountSlot = null;
            for (var slot in built.mapping) {
                var numVal = Number(String(built.mapping[slot]).replace(/[^\d]/g, ''));
                if (numVal === amount) { amountSlot = parseInt(slot.slice(1), 10); break; }
            }
            if (amountSlot !== null) {
                matched.slots = matched.slots || {};
                matched.slots.amount = amountSlot;
            }

            saveSmsPatterns(allPatterns);
        }
    } else if (labelStr.trim()) {
        var built2 = buildSmsPattern(pending.raw);
        var amountSlot2 = null;
        for (var slot2 in built2.mapping) {
            var numVal2 = Number(String(built2.mapping[slot2]).replace(/[^\d]/g, ''));
            if (numVal2 === amount) { amountSlot2 = parseInt(slot2.slice(1), 10); break; }
        }
        addSmsPattern({
            raw: pending.raw, key: built2.key, tokens: built2.tokens, mapping: built2.mapping,
            slots: { amount: amountSlot2 },
            label: labelStr.trim(), direction: direction, linkedAccountId: accountId,
            voucherDesc: voucherDesc.trim(),
            counterLineDesc: counterLineDesc.trim(),
            bankLineDesc: bankLineDesc.trim(),
            counterAccount: s.counterAccount || '',
            counterDetails: s.counterDetails || {}
        });
    }

    if (withVoucher) {
        var inbox = getSmsInbox();
        var parsed = parseBankSms(pending.raw);
        var inboxItem = {
            id: uid(), rawText: pending.raw, source: pending.source,
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
            status: 'converted', voucherId: ''
        };
        inbox.unshift(inboxItem);

        var voucherResult = _createVoucherSmart({
            bankAccountId: accountId, amount: amount, direction: direction,
            date: normalizeDigits(dateStr).trim() || s.date || todayJalaliStr(),
            time: s.time || '',
            voucherDesc: voucherDesc.trim() || s.voucherDesc || '',
            counterLineDesc: counterLineDesc.trim() || s.counterLineDesc || '',
            bankLineDesc: bankLineDesc.trim() || s.bankLineDesc || '',
            counterAccount: s.counterAccount || '',
            counterDetails: s.counterDetails || {},
            trackingNumber: s.trackingNumber || '',
            trackingDate: s.trackingDate || ''
        });

        if (voucherResult && voucherResult.voucher) inboxItem.voucherId = voucherResult.voucher.id;
        saveSmsInbox(inbox);
    }

    removePendingSms(pid);
    renderPendingSmsBox();
    renderSmsInbox();
    renderSmsPatternsTab();
    updateSmsBadge();

    if (!withVoucher) { showToast('🧠 الگو ثبت شد (پیامک از لیست انتظار حذف شد)', 3500); return; }

    var wasApproved = true;
    try {
        var lastV = DB.load('vouchers', []).slice(-1)[0];
        if (lastV && lastV.status === 'draft') wasApproved = false;
    } catch (e) {}

    if (!wasApproved) showToast('📝 سند به‌عنوان پیش‌نویس باز شد — لطفاً تکمیل و تأیید کنید', 4000);
    else showToast('✅ سند تأیید شد');
}

/* ============================================================
   بخش ۱۷ — Try Approve
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
   بخش ۱۸ — _createVoucherSmart
   ============================================================ */
function _createVoucherSmart(data) {
    var bankMoein = getBankMoeinId();
    if (!bankMoein) { alert('⚠️ معین بانک تعریف نشده.'); return null; }

    var bankDetail = data.bankAccountId ? { bank: data.bankAccountId } : {};
    var lines = [];
    var vDesc = (typeof data.voucherDesc === 'string') ? data.voucherDesc : '';
    var cDesc = (typeof data.counterLineDesc === 'string') ? data.counterLineDesc : vDesc;
    var bDesc = (typeof data.bankLineDesc === 'string') ? data.bankLineDesc : vDesc;

    var counterAccount = data.counterAccount || '';
    var counterDetails = data.counterDetails || {};

    if (data.direction === 'out') {
        lines.push({
            id: uid(), account: counterAccount,
            details: JSON.parse(JSON.stringify(counterDetails)),
            debit: data.amount, credit: 0, description: cDesc,
            trackingNumber: data.trackingNumber || '',
            trackingDate: data.trackingDate || ''
        });
        lines.push({ id: uid(), account: bankMoein, details: bankDetail, debit: 0, credit: data.amount, description: bDesc, locked: true });
    } else {
        lines.push({ id: uid(), account: bankMoein, details: bankDetail, debit: data.amount, credit: 0, description: bDesc, locked: true });
        lines.push({
            id: uid(), account: counterAccount,
            details: JSON.parse(JSON.stringify(counterDetails)),
            debit: 0, credit: data.amount, description: cDesc,
            trackingNumber: data.trackingNumber || '',
            trackingDate: data.trackingDate || ''
        });
    }

    var vl = DB.load('vouchers', []);
    var num = (typeof getNextVoucherNumberForPeriod === 'function')
        ? getNextVoucherNumberForPeriod(state.activePeriodId || '')
        : String(vl.length + 1);

    var v = {
        id: uid(), number: num,
        date: data.date || todayJalaliStr(),
        time: data.time || '',
        type: 'general', periodId: state.activePeriodId || '',
        desc: vDesc, lines: lines, status: 'draft'
    };

    var res = _tryCreateApprovedVoucher(v);
    vl.push(v); DB.save('vouchers', vl);

    if (res.approved) setTimeout(function () { goToPage('voucher-list'); }, 100);
    else setTimeout(function () { if (typeof loadVoucherForEdit === 'function') loadVoucherForEdit(v); }, 100);

    return res;
}

/* ============================================================
   ✅ بخش ۱۹ — سند ترکیبی از pending
   ============================================================ */
function convertMultiplePendingToVoucher() {
    var checked = document.querySelectorAll('.psm-select-cb:checked');
    if (checked.length === 0) { alert('⚠️ ابتدا یک یا چند پیامک را تیک بزنید.'); return; }

    var bankMoein = getBankMoeinId();
    if (!bankMoein) { alert('⚠️ معین بانک تعریف نشده.'); return; }

    var allPending = getPendingSms();
    var lines = [], usedIds = [], descSet = {}, skippedCount = 0;

    var checkedArr = Array.prototype.slice.call(checked);
    for (var i = 0; i < checkedArr.length; i++) {
        var pid = checkedArr[i].getAttribute('data-pid');
        var s = allPending.find(function (x) { return x.id === pid; });
        if (!s) continue;

        var card = document.querySelector('.pending-sms-card[data-pid="' + pid + '"]');
        var sug = s.suggestion || {};

        var amountStr = '';
        var dirHidden = '';
        var accountId = '';
        var cLineDescEl = null;
        var bLineDescEl = null;
        var voucherDescEl = null;

        if (card) {
            amountStr = (card.querySelector('[data-field="amount"]') || {}).value || '';
            dirHidden = (card.querySelector('[data-field="direction"]') || {}).value || '';
            accountId = (card.querySelector('[data-field="account"]') || {}).value || '';
            cLineDescEl = card.querySelector('[data-field="counterLineDesc"]');
            bLineDescEl = card.querySelector('[data-field="bankLineDesc"]');
            voucherDescEl = card.querySelector('[data-field="voucherDesc"]');
        }

        var amount = Number(normalizeDigits(amountStr).replace(/[^\d]/g, '')) || Number(sug.amount) || 0;
        var direction = dirHidden || sug.direction || detectSmsDirection(s.raw);
        var counterLineDesc = cLineDescEl ? cLineDescEl.value.trim() : (sug.counterLineDesc || '');
        var bankLineDesc = bLineDescEl ? bLineDescEl.value.trim() : (sug.bankLineDesc || '');
        var voucherDesc = voucherDescEl ? voucherDescEl.value.trim() : (sug.voucherDesc || '');
        
        var counterAccount = sug.counterAccount || '';
        var counterDetails = sug.counterDetails || {};
        var dateVal = sug.date || todayJalaliStr();
        var timeVal = sug.time || '';

        if (card) {
            var dateEl = card.querySelector('[data-field="date"]');
            if (dateEl && dateEl.value) dateVal = normalizeDigits(dateEl.value.trim());
        }

        if (!amount) { skippedCount++; continue; }
        if (!direction) direction = detectSmsDirection(s.raw);
        if (!direction) { skippedCount++; continue; }

        var bankDetail = accountId ? { bank: accountId } : {};

        if (direction === 'out') {
            lines.push({
                id: uid(), account: counterAccount,
                details: JSON.parse(JSON.stringify(counterDetails)),
                debit: amount, credit: 0, description: counterLineDesc,
                trackingNumber: sug.trackingNumber || '',
                trackingDate: sug.trackingDate || ''
            });
            lines.push({ id: uid(), account: bankMoein, details: bankDetail, debit: 0, credit: amount, description: bankLineDesc, locked: true });
        } else {
            lines.push({ id: uid(), account: bankMoein, details: bankDetail, debit: amount, credit: 0, description: bankLineDesc, locked: true });
            lines.push({
                id: uid(), account: counterAccount,
                details: JSON.parse(JSON.stringify(counterDetails)),
                debit: 0, credit: amount, description: counterLineDesc,
                trackingNumber: sug.trackingNumber || '',
                trackingDate: sug.trackingDate || ''
            });
        }

        if (voucherDesc) descSet[voucherDesc] = true;
        usedIds.push(pid);
    }

    if (lines.length === 0) { alert('⚠️ هیچ‌کدام قابل تبدیل نیستند.'); return; }

    // ✅ ادغام شرح اسناد با خط تیره
    var descArr = Object.keys(descSet);
    var voucherDescFinal = descArr.length > 0 ? descArr.join(' - ') : '';

    var vl = DB.load('vouchers', []);
    var num = (typeof getNextVoucherNumberForPeriod === 'function') ? getNextVoucherNumberForPeriod(state.activePeriodId || '') : String(vl.length + 1);

    var v = { id: uid(), number: num, date: todayJalaliStr(), type: 'general', periodId: state.activePeriodId || '', desc: voucherDescFinal, lines: lines, status: 'draft' };
    var res = _tryCreateApprovedVoucher(v);
    vl.push(v); DB.save('vouchers', vl);

    var inbox = getSmsInbox();
    usedIds.forEach(function (pid) {
        var p = allPending.find(function (x) { return x.id === pid; });
        if (!p) return;
        var parsed = parseBankSms(p.raw);
        inbox.unshift({
            id: uid(), rawText: p.raw, source: p.source,
            receivedAt: p.createdAt || Date.now(),
            parsed: {
                amount: parsed.amount, direction: parsed.direction, balance: parsed.balance,
                bankName: parsed.bankName,
                matchedAccountId: parsed.matchedAccount ? parsed.matchedAccount.id : '',
                matchedAccountTitle: parsed.matchedAccount ? ((parsed.matchedAccount.bank || '') + ' - ' + (parsed.matchedAccount.account || '')) : '',
                matchedField: parsed.matchedField || '',
                accountCandidates: parsed.accountCandidates
            },
            status: 'converted', voucherId: v.id
        });
    });
    saveSmsInbox(inbox);

    var newPending = allPending.filter(function (p) { return usedIds.indexOf(p.id) === -1; });
    savePendingSms(newPending);

    renderPendingSmsBox(); renderSmsInbox(); updateSmsBadge();

    var msg = '✅ سند ' + (res.approved ? 'تأیید' : 'پیش‌نویس') + ' ساخته شد — ' + toFa(usedIds.length) + ' پیامک';
    if (skippedCount > 0) msg += '\n⚠️ ' + toFa(skippedCount) + ' پیامک رد شد.';
    alert(msg);

    if (res.approved) setTimeout(function () { goToPage('voucher-list'); }, 200);
    else setTimeout(function () { if (typeof loadVoucherForEdit === 'function') loadVoucherForEdit(v); }, 200);
}

/* ============================================================
   بخش ۲۰ — استخراج از الگو
   ============================================================ */
function extractValuesFromPattern(newRaw, pattern) {
    var built = buildSmsPattern(newRaw);
    var result = {
        amount: 0,
        direction: '',
        date: '',
        time: '',
        bankAccountId: pattern.linkedAccountId || '',
        counterAccount: pattern.counterAccount || '',
        counterDetails: JSON.parse(JSON.stringify(pattern.counterDetails || {})),
        trackingNumber: '',
        trackingDate: ''
    };
    if (pattern.slots && pattern.slots.amount) {
        var rawVal = built.mapping['#' + pattern.slots.amount];
        if (rawVal) result.amount = Number(String(rawVal).replace(/[^\d]/g, '')) || 0;
    }
    if (!result.amount) result.amount = suggestAmount(newRaw);
    result.direction = pattern.direction || detectSmsDirection(newRaw);
    result.date = suggestDate(newRaw);
    result.time = suggestTime(newRaw);
    return result;
}

/* ============================================================
   بخش ۲۱ — ورودی تک پیامک
   ============================================================ */
function handleIncomingSms(text, source, force) {
    var t = String(text || '').trim();
    if (!t) return { ok: false, reason: 'empty' };
    if (!force && !isBankSms(t)) return { ok: false, reason: 'not-bank' };

    var existingPending = getPendingSms();
    if (existingPending.some(function (p) { return p.raw === t; })) return { ok: false, reason: 'duplicate' };

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
            voucherDesc: (typeof m.pattern.voucherDesc === 'string') ? m.pattern.voucherDesc : '',
            counterLineDesc: (typeof m.pattern.counterLineDesc === 'string') ? m.pattern.counterLineDesc : '',
            bankLineDesc: (typeof m.pattern.bankLineDesc === 'string') ? m.pattern.bankLineDesc : '',
            counterAccount: vals.counterAccount,
            counterDetails: vals.counterDetails,
            detailComplete: !!vals.counterAccount
        };
        bumpSmsPatternUsage(m.pattern.id);
    }

    var added = addPendingSms(t, source || 'clipboard', force, extraData);
    if (!added) return { ok: false, reason: 'duplicate' };

    return { ok: true, matched: matched, pattern: m ? m.pattern : null, pending: added };
}

/* ============================================================
   بخش ۲۲ — کلیپ‌بورد
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

        var res = handleMultipleIncomingSms(t, auto ? 'auto' : 'clipboard', false);
        if (res.ok && (res.matched + res.unmatched) > 0) { _lastClipboardText = t; return; }
        if (res.duplicate > 0) { if (!auto) showToast('قبلاً ثبت شده.'); return; }
        if (res.notBank > 0) {
            if (auto) return;
            var preview = t.length > 300 ? t.slice(0, 300) + '…' : t;
            if (confirm('❌ این متن به‌عنوان پیامک بانکی شناسایی نشد.\n\n' + preview + '\n\n«OK» = افزودن به‌عنوان پیامک بانکی')) {
                handleMultipleIncomingSms(t, 'manual', true);
                _lastClipboardText = t;
            }
        }
    }).catch(function () { if (!auto) alert('دسترسی به کلیپ‌بورد داده نشد.'); });
}

function checkClipboardSupport() {
    var el = document.getElementById('clip-status');
    if (!el) return;
    if (navigator.clipboard && navigator.clipboard.readText) {
        el.textContent = 'در دسترس'; el.className = 'method-status ok';
    } else { el.textContent = 'ندارد'; el.className = 'method-status no'; }
}

/* ============================================================
   بخش ۲۳ — رندر inbox
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
    var statusF = statusEl ? statusEl.value : 'converted';
    if (!statusF) statusF = 'converted';

    if (list.length === 0) {
        box.innerHTML = '<div class="widget-empty">📭 هنوز پیامکی به سند تبدیل نشده.<br><span style="font-size:.72rem;opacity:.8">پیامک‌های تأییدشده اینجا نمایش داده می‌شوند.</span></div>';
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

    if (filtered.length === 0) { box.innerHTML = '<div class="widget-empty">🔍 نتیجه‌ای یافت نشد.</div>'; return; }

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
                saveSmsInbox(l); renderSmsInbox(); updateSmsBadge(); return;
            }
            if (action === 'delete') {
                if (!confirm('این پیامک از صندوق حذف شود؟')) return;
                var l2 = getSmsInbox().filter(function (x) { return x.id !== id; });
                saveSmsInbox(l2); renderSmsInbox(); updateSmsBadge(); return;
            }
        };
    });
}

/* ============================================================
   بخش ۲۴ — سند ترکیبی از inbox
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
        var voucherDesc = (matched && typeof matched.pattern.voucherDesc === 'string') ? matched.pattern.voucherDesc : '';
        var cLineDesc = (matched && typeof matched.pattern.counterLineDesc === 'string') ? matched.pattern.counterLineDesc : voucherDesc;
        var bLineDesc = (matched && typeof matched.pattern.bankLineDesc === 'string') ? matched.pattern.bankLineDesc : voucherDesc;
        var counterAccount = (matched && matched.pattern.counterAccount) ? matched.pattern.counterAccount : '';
        var counterDetails = (matched && matched.pattern.counterDetails) ? matched.pattern.counterDetails : {};

        var bankDetail = bankAccId ? { bank: bankAccId } : {};

        if (direction === 'out') {
            lines.push({
                id: uid(), account: counterAccount,
                details: JSON.parse(JSON.stringify(counterDetails)),
                debit: amount, credit: 0, description: cLineDesc
            });
            lines.push({ id: uid(), account: bankMoein, details: bankDetail, debit: 0, credit: amount, description: bLineDesc, locked: true });
        } else {
            lines.push({ id: uid(), account: bankMoein, details: bankDetail, debit: amount, credit: 0, description: bLineDesc, locked: true });
            lines.push({
                id: uid(), account: counterAccount,
                details: JSON.parse(JSON.stringify(counterDetails)),
                debit: 0, credit: amount, description: cLineDesc
            });
        }

        if (voucherDesc) descSet[voucherDesc] = true;
        usedIds.push(s.id);
    });

    if (lines.length === 0) { alert('⚠️ هیچ‌کدام قابل تبدیل نیستند.'); return; }

    var descArr = Object.keys(descSet);
    var voucherDescFinal = descArr.length > 0 ? descArr.join(' - ') : '';

    var vl = DB.load('vouchers', []);
    var num = (typeof getNextVoucherNumberForPeriod === 'function') ? getNextVoucherNumberForPeriod(state.activePeriodId || '') : String(vl.length + 1);

    var v = { id: uid(), number: num, date: todayJalaliStr(), type: 'general', periodId: state.activePeriodId || '', desc: voucherDescFinal, lines: lines, status: 'draft' };
    var res = _tryCreateApprovedVoucher(v);
    vl.push(v); DB.save('vouchers', vl);

    var inbox = getSmsInbox();
    for (var i = 0; i < inbox.length; i++) {
        if (usedIds.indexOf(inbox[i].id) !== -1) {
            inbox[i].status = 'converted';
            inbox[i].voucherId = v.id;
        }
    }
    saveSmsInbox(inbox);

    renderSmsInbox(); updateSmsBadge();

    var msg = '✅ سند ' + (res.approved ? 'تأیید' : 'پیش‌نویس') + ' — ' + toFa(usedIds.length) + ' پیامک';
    if (skipped > 0) msg += '\n⚠️ ' + toFa(skipped) + ' پیامک رد شد.';
    alert(msg);

    if (res.approved) setTimeout(function () { goToPage('voucher-list'); }, 200);
    else setTimeout(function () { if (typeof loadVoucherForEdit === 'function') loadVoucherForEdit(v); }, 200);
}

/* ============================================================
   بخش ۲۵ — رندر الگوها
   ============================================================ */
function renderSmsPatternsTab() {
    var box = document.getElementById('sms-patterns-list');
    if (!box) return;
    var patterns = loadSmsPatterns();
    var countEl = document.getElementById('sms-patterns-count');
    if (countEl) countEl.textContent = toFa(patterns.length);

    var searchEl = document.getElementById('sms-patterns-search');
    var q = searchEl ? (searchEl.value || '').trim().toLowerCase() : '';

    if (patterns.length === 0) { box.innerHTML = '<div class="widget-empty">هنوز الگویی ثبت نشده.</div>'; return; }

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
            var hay = ((p.label || '') + ' ' + (accLabel || '') + ' ' + (p.voucherDesc || '') + ' ' + (p.counterLineDesc || '')).toLowerCase();
            if (hay.indexOf(q) === -1) continue;
        }
        shown++;

        var preview = (p.tokens || []).join(' ');
        if (preview.length > 140) preview = preview.slice(0, 140) + '…';
        var blockedBadge = p.blocked ? ' <span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:8px;font-size:.66rem;font-weight:800">🚫 مسدود</span>' : '';
        var opacity = p.blocked ? 'opacity:.65;' : '';

        var vDescShow = (typeof p.voucherDesc === 'string' && p.voucherDesc !== '') ? esc(p.voucherDesc) : '<span style="color:#cbd5e1;font-style:italic">(خالی)</span>';
        var cDescShow = (typeof p.counterLineDesc === 'string' && p.counterLineDesc !== '') ? esc(p.counterLineDesc) : '<span style="color:#cbd5e1;font-style:italic">(خالی)</span>';
        var bDescShow = (typeof p.bankLineDesc === 'string' && p.bankLineDesc !== '') ? esc(p.bankLineDesc) : '<span style="color:#cbd5e1;font-style:italic">(خالی)</span>';
        var cardKeyShow = p.cardKey || extractCardKey(p.raw || '') || '—';
        var kwList = (p.keywords && p.keywords.length > 0) ? p.keywords : extractKeywords(p.raw || '');
        var kwStr = kwList.length > 0 ? kwList.join(' ، ') : '—';
        var counterAccShow = p.counterAccount ? getAccountLabel(p.counterAccount, DB.load('accounts', [])) : '—';

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
            +   '<div style="margin-top:6px;padding-top:6px;border-top:1px dashed var(--border);color:var(--text-muted)"><b>شناسه حساب:</b> <span style="font-family:monospace">' + esc(cardKeyShow) + '</span></div>'
            +   '<div style="margin-top:2px;color:var(--text-muted)"><b>کلمات کلیدی:</b> ' + esc(kwStr) + '</div>'
            + '</div>'
            + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;font-size:.78rem">'
            +   '<div style="grid-column:1/-1"><span style="color:var(--text-muted);font-weight:700">شرح سند:</span> ' + vDescShow + '</div>'
            +   '<div><span style="color:var(--text-muted);font-weight:700">شرح قلم (مقابل):</span> ' + cDescShow + '</div>'
            +   '<div><span style="color:var(--text-muted);font-weight:700">شرح قلم (بانک):</span> ' + bDescShow + '</div>'
            +   '<div style="grid-column:1/-1"><span style="color:var(--text-muted);font-weight:700">🎯 معین طرف مقابل:</span> ' + esc(counterAccShow) + '</div>'
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
            deleteSmsPattern(id); renderSmsPatternsTab(); showToast('🗑 حذف شد');
        };
    });
    box.querySelectorAll('[data-pattern-block]').forEach(function (b) {
        b.onclick = function () {
            var id = this.getAttribute('data-pattern-block');
            var all = loadSmsPatterns();
            for (var j = 0; j < all.length; j++) if (all[j].id === id) { all[j].blocked = !all[j].blocked; break; }
            saveSmsPatterns(all); renderSmsPatternsTab(); showToast('✅ ذخیره شد');
        };
    });
}

/* ============================================================
   بخش ۲۶ — ویرایش الگو
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
        var counterLineDescValue = (typeof p.counterLineDesc === 'string') ? p.counterLineDesc : '';
        var bankLineDescValue = (typeof p.bankLineDesc === 'string') ? p.bankLineDesc : '';

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
            +     '<div class="field"><label>📝 شرح سند</label><input type="text" id="se-voucherDesc" value="' + esc(voucherDescValue) + '" placeholder="(اختیاری)"></div>'
            +     '<div class="grid-2">'
            +       '<div class="field"><label>📝 شرح قلم (طرف مقابل)</label><input type="text" id="se-counterDesc" value="' + esc(counterLineDescValue) + '" placeholder="(اختیاری)"></div>'
            +       '<div class="field"><label>📝 شرح قلم (بانک)</label><input type="text" id="se-bankDesc" value="' + esc(bankLineDescValue) + '" placeholder="(اختیاری)"></div>'
            +     '</div>'
            +     '<div class="field"><label>نمونه الگو</label><div style="background:var(--card-alt);border:1px solid var(--border);border-radius:10px;padding:10px;font-family:monospace;font-size:.78rem;line-height:1.8;max-height:150px;overflow-y:auto">' + esc(preview) + '<br><b>شناسه حساب:</b> ' + esc(cardShow) + '<br><b>کلمات کلیدی:</b> ' + esc(kwShow) + '</div></div>'
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
            all[idx].counterLineDesc = document.getElementById('se-counterDesc').value.trim();
            all[idx].bankLineDesc = document.getElementById('se-bankDesc').value.trim();
            all[idx].lastEdited = Date.now();
            saveSmsPatterns(all);

            closeFn(); renderSmsPatternsTab(); showToast('✅ ذخیره شد');
        };
    } catch (err) { console.error(err); alert('خطا: ' + (err.message || err)); }
}
window.openEditSmsPattern = openEditSmsPattern;

/* ============================================================
   بخش ۲۷ — تبدیل تک پیامک
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
        var voucherDesc = '', cLineDesc = '', bLineDesc = '', counterAccount = '', counterDetails = {};
        if (matched && matched.pattern) {
            if (!direction && matched.pattern.direction) direction = matched.pattern.direction;
            if (!bankAccountId && matched.pattern.linkedAccountId) bankAccountId = matched.pattern.linkedAccountId;
            voucherDesc = (typeof matched.pattern.voucherDesc === 'string') ? matched.pattern.voucherDesc : '';
            cLineDesc   = (typeof matched.pattern.counterLineDesc === 'string') ? matched.pattern.counterLineDesc : voucherDesc;
            bLineDesc   = (typeof matched.pattern.bankLineDesc === 'string') ? matched.pattern.bankLineDesc : voucherDesc;
            counterAccount = matched.pattern.counterAccount || '';
            counterDetails = matched.pattern.counterDetails || {};
        }

        if (!direction) direction = detectSmsDirection(raw);
        if (!amount) amount = suggestAmount(raw);
        if (!amount) { alert('⚠️ مبلغ قابل تشخیص نیست.'); return; }

        if (!direction) {
            var d = prompt('نوع تراکنش:\n1 = برداشت\n2 = واریز', '1');
            if (d === '1') direction = 'out'; else if (d === '2') direction = 'in'; else return;
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

        var res = _createVoucherSmart({
            bankAccountId: bankAccountId, amount: amount, direction: direction,
            date: todayJalaliStr(),
            voucherDesc: voucherDesc, 
            counterLineDesc: cLineDesc, 
            bankLineDesc: bLineDesc,
            counterAccount: counterAccount, 
            counterDetails: counterDetails
        });

        if (!res) return;

        for (var i = 0; i < list.length; i++) {
            if (list[i].id === smsId) { list[i].status = 'converted'; list[i].voucherId = res.voucher.id; }
        }
        saveSmsInbox(list); renderSmsInbox(); updateSmsBadge();

        if (res.approved) showToast('✅ سند تأیید شد');
        else showToast('📝 سند پیش‌نویس باز شد — تکمیل و تأیید کنید', 4000);
    } catch (err) { console.error(err); alert('⚠️ خطا: ' + (err.message || err)); }
}

/* ============================================================
   ✅ بخش ۲۸ — دکمه انتخاب همه
   ============================================================ */
function _injectPendingSelectAllBtn() {
    var tab = document.getElementById('tab-sms-pending');
    if (!tab) return;
    var header = tab.querySelector('.list-header');
    if (!header) return;
    if (header.querySelector('#pending-sms-select-all')) return;

    var btn = document.createElement('button');
    btn.id = 'pending-sms-select-all';
    btn.className = 'export-btn';
    btn.type = 'button';
    btn.style.cssText = 'background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none;font-weight:800;padding:9px 14px;border-radius:10px;cursor:pointer;font-family:inherit;font-size:0.8rem';
    btn.textContent = '☑️ انتخاب همه';

    var bulkBtn = header.querySelector('#pending-sms-bulk-voucher');
    if (bulkBtn && bulkBtn.parentNode) {
        bulkBtn.parentNode.insertBefore(btn, bulkBtn);
    } else {
        header.appendChild(btn);
    }
}

// Event delegation برای دکمه انتخاب همه (مقاوم در برابر رندر مجدد)
document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'pending-sms-select-all') {
        e.preventDefault();
        e.stopPropagation();
        var cbs = document.querySelectorAll('#pending-sms-list .psm-select-cb');
        if (cbs.length === 0) { 
            showToast('پیامکی برای انتخاب نیست.'); 
            return; 
        }
        var allChecked = Array.from(cbs).every(function (c) { return c.checked; });
        cbs.forEach(function (cb) { cb.checked = !allChecked; });
        e.target.textContent = !allChecked ? '☐ لغو انتخاب' : '☑️ انتخاب همه';
    }
});

/* ============================================================
   بخش ۲۹ — Delegation
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
                if (tn === 'sms-pending') { _injectPendingSelectAllBtn(); renderPendingSmsBox(); }
                else if (tn === 'sms-inbox') renderSmsInbox();
                else if (tn === 'sms-patterns') renderSmsPatternsTab();
            }, 50);
            return;
        }

        if (e.target.closest('#pending-sms-bulk-voucher')) { convertMultiplePendingToVoucher(); return; }

        if (e.target.closest('#pending-sms-clear')) {
            if (getPendingSmsCount() === 0) { showToast('باکس خالی است.'); return; }
            if (!confirm('همه پیامک‌های ثبت‌نشده حذف شوند؟')) return;
            clearPendingSms(); renderPendingSmsBox(); updateSmsBadge(); showToast('🗑 باکس خالی شد'); return;
        }

        if (e.target.closest('#sms-bulk-create-voucher')) { convertMultipleSmsToVoucher(); return; }

        if (e.target.closest('#sms-clear-converted')) {
            if (!confirm('همه پیامک‌های تبدیل‌شده حذف شوند؟')) return;
            var l = getSmsInbox().filter(function (s) { return s.status !== 'converted'; });
            saveSmsInbox(l); renderSmsInbox(); updateSmsBadge(); return;
        }

        if (e.target.closest('#sms-patterns-del-all')) {
            if (loadSmsPatterns().length === 0) { showToast('الگویی وجود ندارد.'); return; }
            if (!confirm('همه الگوها حذف شوند؟')) return;
            saveSmsPatterns([]); renderSmsPatternsTab(); showToast('🗑 حذف شد'); return;
        }

        if (e.target.closest('#parse-sms')) {
            var page = e.target.closest('.page');
            var textInp = page ? page.querySelector('#sms-text') : null;
            var text = textInp ? textInp.value : '';
            if (!text.trim()) return;

            var res = handleMultipleIncomingSms(text, 'paste', false);

            if (res.total > 1 || (res.matched + res.unmatched) > 1) {
                if (textInp) textInp.value = '';
            } else if (res.total === 1) {
                if (res.ok) {
                    if (textInp) textInp.value = '';
                    if (res.matched) showToast('🧠 شناسایی شد — بازبینی و تأیید', 3500);
                    else showToast('🔔 به لیست ثبت‌نشده اضافه شد');
                } else if (res.duplicate > 0) {
                    showToast('قبلاً ثبت شده.');
                } else if (res.notBank > 0) {
                    if (confirm('این پیامک بانکی شناسایی نشد. به‌عنوان پیامک دستی اضافه شود؟')) {
                        handleMultipleIncomingSms(text, 'paste', true);
                        if (textInp) textInp.value = '';
                    }
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

/* ============================================================
   بخش ۳۰ — Init
   ============================================================ */
function initSmsPatternSystem() {
    runSmsMigrations();
    bindSmsDelegation();

    try {
        var tab = document.getElementById('tab-sms-pending');
        if (tab) {
            var formCard = tab.querySelector('#sms-text') ? tab.querySelector('#sms-text').closest('.card') : null;
            var listCard = tab.querySelector('#pending-sms-list') ? tab.querySelector('#pending-sms-list').closest('.card') : null;
            if (formCard && listCard && formCard !== listCard) tab.insertBefore(formCard, listCard);
        }
    } catch (e) { console.warn('reorder pending tab:', e); }

    try {
        var statusFilter = document.getElementById('sms-inbox-status-filter');
        if (statusFilter) {
            statusFilter.value = 'converted';
            var newOpt = statusFilter.querySelector('option[value="new"]');
            if (newOpt) newOpt.style.display = 'none';
        }
    } catch (e) {}

    _injectPendingSelectAllBtn();

    renderPendingSmsBox();
    renderSmsInbox();
    renderSmsPatternsTab();
    checkClipboardSupport();
    updateSmsBadge();

    var autoEl = document.getElementById('sms-auto-read');
    if (autoEl) autoEl.checked = !!state.smsAutoRead;

    console.log('🧠 SMS v14 — patterns:', loadSmsPatterns().length, '| pending:', getPendingSmsCount());
}

(function () {
    function boot() {
        try { initSmsPatternSystem(); } catch (e) { console.error('SMS init:', e); }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 400); });
    } else { setTimeout(boot, 400); }
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
window.normalizeAccountKey         = normalizeAccountKey;
window.extractKeywords             = extractKeywords;
window.countNumberGroups           = countNumberGroups;
window.compareAccountKeys          = compareAccountKeys;
window.signatureMatch              = signatureMatch;
window.findMatchingSmsPattern      = findMatchingSmsPattern;
window.isBankSms                   = isBankSms;
window.suggestAmount               = suggestAmount;
window.suggestDate                 = suggestDate;
window.suggestTime                 = suggestTime;
window.suggestDescription          = suggestDescription;
window.suggestLabel                = suggestLabel;
window.addSmsPattern               = addSmsPattern;
window.bumpSmsPatternUsage         = bumpSmsPatternUsage;
window.deleteSmsPattern            = deleteSmsPattern;
window.addPendingSms               = addPendingSms;
window.removePendingSms            = removePendingSms;
window.clearPendingSms             = clearPendingSms;
window.splitMultipleSms            = splitMultipleSms;
window.handleMultipleIncomingSms   = handleMultipleIncomingSms;
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
window.openPendingSmsDetailModal   = openPendingSmsDetailModal;
window.savePendingSmsDetail        = savePendingSmsDetail;
window.closePendingSmsDetailModal  = closePendingSmsDetailModal;
window._injectPendingSelectAllBtn  = _injectPendingSelectAllBtn;

console.log('✅ [modules/sms.js] loaded — v14 (select-all fixed + dual descriptions + merged voucher descs)');
