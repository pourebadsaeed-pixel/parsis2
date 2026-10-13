// ═══════════════════════════════════════════════════════════
//  Parsis 2 — Utils
//  توابع کمکی عمومی
// ═══════════════════════════════════════════════════════════

const Utils = {

    // ═══════════════ اعداد ═══════════════

    /**
     * تبدیل اعداد انگلیسی به فارسی
     * @param {string|number} num
     * @returns {string}
     */
    toPersianDigits(num) {
        if (num === null || num === undefined) return '';
        const digits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return String(num).replace(/\d/g, d => digits[d]);
    },

    /**
     * تبدیل اعداد فارسی/عربی به انگلیسی
     * @param {string} str
     * @returns {string}
     */
    toEnglishDigits(str) {
        if (str === null || str === undefined) return '';
        const persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        const arabic = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        let result = String(str);
        result = result.replace(/[۰-۹]/g, d => persian.indexOf(d));
        result = result.replace(/[٠-٩]/g, d => arabic.indexOf(d));
        return result;
    },

    /**
     * فرمت عدد با جداکننده هزارگان (فارسی)
     * @param {number|string} num
     * @returns {string}
     */
    formatNumber(num) {
        if (num === null || num === undefined || num === '' || isNaN(num)) return '۰';
        const n = Number(num);
        if (!isFinite(n)) return '۰';
        return n.toLocaleString('fa-IR');
    },

    /**
     * فرمت مبلغ به ریال
     * @param {number} num
     * @returns {string}
     */
    formatMoney(num) {
        return this.formatNumber(Math.round(num || 0)) + ' ریال';
    },

    /**
     * فرمت مبلغ به تومان
     * @param {number} num
     * @returns {string}
     */
    formatToman(num) {
        return this.formatNumber(Math.round((num || 0) / 10)) + ' تومان';
    },

    /**
     * تبدیل مبلغ به حروف (فارسی)
     * @param {number} num
     * @returns {string}
     */
    numberToPersianWords(num) {
        num = Math.round(Number(num) || 0);
        if (num === 0) return 'صفر';

        const yekan = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
        const dahgan = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
        const dah = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
        const sadgan = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
        const scales = ['', ' هزار', ' میلیون', ' میلیارد', ' بیلیون', ' بیلیارد'];

        const threeDigit = (n) => {
            const parts = [];
            const s = Math.floor(n / 100);
            const r = n % 100;
            if (s > 0) parts.push(sadgan[s]);
            if (r >= 10 && r < 20) parts.push(dah[r - 10]);
            else {
                const d = Math.floor(r / 10);
                const y = r % 10;
                if (d > 0) parts.push(dahgan[d]);
                if (y > 0) parts.push(yekan[y]);
            }
            return parts.join(' و ');
        };

        const groups = [];
        let temp = num;
        let scaleIdx = 0;
        while (temp > 0) {
            const g = temp % 1000;
            if (g > 0) {
                groups.unshift(threeDigit(g) + scales[scaleIdx]);
            }
            temp = Math.floor(temp / 1000);
            scaleIdx++;
        }
        return groups.join(' و ');
    },

    // ═══════════════ تاریخ ═══════════════

    /**
     * تاریخ امروز به شمسی
     * @returns {string} مانند "1403/05/20"
     */
    todayPersian() {
        return new Intl.DateTimeFormat('fa-IR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date()).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
    },

    /**
     * تبدیل Date به تاریخ شمسی
     * @param {Date|string|number} date
     * @returns {string}
     */
    toPersianDate(date) {
        if (!date) return '';
        return new Intl.DateTimeFormat('fa-IR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date(date));
    },

    /**
     * تاریخ و ساعت شمسی
     * @param {Date|string|number} date
     * @returns {string}
     */
    toPersianDateTime(date) {
        if (!date) return '';
        return new Intl.DateTimeFormat('fa-IR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    },

    /**
     * نام روز هفته شمسی
     * @param {Date} date
     * @returns {string}
     */
    getPersianWeekday(date = new Date()) {
        return new Intl.DateTimeFormat('fa-IR', { weekday: 'long' }).format(date);
    },

    /**
     * نام ماه شمسی
     * @param {Date} date
     * @returns {string}
     */
    getPersianMonth(date = new Date()) {
        return new Intl.DateTimeFormat('fa-IR', { month: 'long' }).format(date);
    },

    /**
     * تبدیل تاریخ شمسی به میلادی
     * @param {string} persianDate فرمت: 1403/05/20
     * @returns {Date|null}
     */
    persianToGregorian(persianDate) {
        if (!persianDate) return null;
        const parts = this.toEnglishDigits(persianDate).split('/');
        if (parts.length !== 3) return null;

        const [jy, jm, jd] = parts.map(Number);
        if (!jy || !jm || !jd) return null;

        const jy2 = jy - 979;
        const jm2 = jm - 1;
        const jd2 = jd - 1;

        let j_day_no = 365 * jy2 + Math.floor(jy2 / 33) * 8 + Math.floor((jy2 % 33 + 3) / 4);
        for (let i = 0; i < jm2; ++i) {
            j_day_no += [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29][i];
        }
        j_day_no += jd2;

        let g_day_no = j_day_no + 79;

        let gy = 1600 + 400 * Math.floor(g_day_no / 146097);
        g_day_no = g_day_no % 146097;

        let leap = true;
        if (g_day_no >= 36525) {
            g_day_no--;
            gy += 100 * Math.floor(g_day_no / 36524);
            g_day_no = g_day_no % 36524;
            if (g_day_no >= 365) g_day_no++;
            else leap = false;
        }

        gy += 4 * Math.floor(g_day_no / 1461);
        g_day_no %= 1461;

        if (g_day_no >= 366) {
            leap = false;
            g_day_no--;
            gy += Math.floor(g_day_no / 365);
            g_day_no = g_day_no % 365;
        }

        const g_days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        let gm = 1;
        for (let i = 0; g_day_no >= g_days_in_month[i] + (i === 1 && leap ? 1 : 0); i++) {
            g_day_no -= g_days_in_month[i] + (i === 1 && leap ? 1 : 0);
            gm = i + 2;
        }
        const gd = g_day_no + 1;

        return new Date(gy, gm - 1, gd);
    },

    /**
     * افزودن روز به تاریخ شمسی
     * @param {string} persianDate
     * @param {number} days
     * @returns {string}
     */
    addDaysToPersianDate(persianDate, days) {
        const g = this.persianToGregorian(persianDate);
        if (!g) return persianDate;
        g.setDate(g.getDate() + days);
        return this.toPersianDate(g);
    },

    /**
     * اعتبارسنجی فرمت تاریخ شمسی
     * @param {string} str
     * @returns {boolean}
     */
    isValidPersianDate(str) {
        if (!str) return false;
        const s = this.toEnglishDigits(str);
        if (!/^\d{4}\/\d{2}\/\d{2}$/.test(s)) return false;
        const [y, m, d] = s.split('/').map(Number);
        if (m < 1 || m > 12) return false;
        if (d < 1 || d > 31) return false;
        if (m > 6 && d > 30) return false;
        return true;
    },

    // ═══════════════ شناسه و اعتبارسنجی ═══════════════

    /**
     * تولید شناسه یکتا
     * @returns {string}
     */
    uid() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    },

    /**
     * اعتبارسنجی کد ملی ایرانی
     * @param {string} code
     * @returns {boolean}
     */
    validateNationalId(code) {
        code = this.toEnglishDigits(String(code || ''));
        if (!/^\d{10}$/.test(code)) return false;
        if (/^(\d)\1{9}$/.test(code)) return false;

        let sum = 0;
        for (let i = 0; i < 9; i++) sum += parseInt(code[i]) * (10 - i);
        const r = sum % 11;
        const check = parseInt(code[9]);

        return r < 2 ? check === r : check === 11 - r;
    },

    /**
     * اعتبارسنجی شماره موبایل ایرانی
     * @param {string} mobile
     * @returns {boolean}
     */
    validateMobile(mobile) {
        const m = this.toEnglishDigits(String(mobile || ''));
        return /^09\d{9}$/.test(m);
    },

    /**
     * اعتبارسنجی ایمیل
     * @param {string} email
     * @returns {boolean}
     */
    validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
    },

    /**
     * اعتبارسنجی کد اقتصادی
     * @param {string} code
     * @returns {boolean}
     */
    validateEconomicCode(code) {
        const c = this.toEnglishDigits(String(code || ''));
        return /^\d{11,12}$/.test(c);
    },

    // ═══════════════ رشته ═══════════════

    /**
     * فرار دادن HTML
     * @param {string} str
     * @returns {string}
     */
    escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    /**
     * کوتاه کردن متن
     * @param {string} str
     * @param {number} len
     * @returns {string}
     */
    truncate(str, len = 50) {
        if (!str) return '';
        const s = String(str);
        return s.length > len ? s.slice(0, len) + '…' : s;
    },

    /**
     * برجسته‌سازی عبارت جستجو در متن
     * @param {string} text
     * @param {string} query
     * @returns {string}
     */
    highlight(text, query) {
        if (!query) return this.escapeHtml(text);
        const safeText = this.escapeHtml(text);
        const safeQuery = this.escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`(${safeQuery})`, 'gi');
        return safeText.replace(re, '<mark style="background:#fef7e0; padding:0 2px; border-radius:3px;">$1</mark>');
    },

    // ═══════════════ فایل ═══════════════

    /**
     * خواندن فایل به‌صورت Data URL (Base64)
     * @param {File} file
     * @returns {Promise<string>}
     */
    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    },

    /**
     * خواندن فایل به‌صورت متن با حذف BOM
     * @param {File} file
     * @returns {Promise<string>}
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                let text = reader.result;
                if (typeof text === 'string' && text.charCodeAt(0) === 0xFEFF) {
                    text = text.slice(1);
                }
                resolve(text);
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file, 'UTF-8');
        });
    },

    /**
     * دانلود محتوا به‌عنوان فایل
     * @param {string} filename
     * @param {string|Blob} content
     * @param {string} type
     */
    download(filename, content, type = 'application/json;charset=utf-8') {
        const blob = content instanceof Blob ? content : new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    },

    /**
     * خروجی CSV با BOM برای Excel فارسی
     * @param {string} filename
     * @param {Array<Array>} rows
     */
    downloadCSV(filename, rows) {
        let csv = '\uFEFF';
        rows.forEach(row => {
            csv += row.map(cell => {
                const s = String(cell === null || cell === undefined ? '' : cell);
                return `"${s.replace(/"/g, '""')}"`;
            }).join(',') + '\n';
        });
        this.download(filename, new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    },

    // ═══════════════ زمان‌بندی ═══════════════

    /**
     * تأخیر اجرای تابع تا توقف ورودی
     * @param {Function} fn
     * @param {number} delay
     * @returns {Function}
     */
    debounce(fn, delay = 300) {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), delay);
        };
    },

    /**
     * محدود کردن تعداد اجرای تابع
     * @param {Function} fn
     * @param {number} limit ms
     * @returns {Function}
     */
    throttle(fn, limit = 200) {
        let lastCall = 0;
        return (...args) => {
            const now = Date.now();
            if (now - lastCall >= limit) {
                lastCall = now;
                fn(...args);
            }
        };
    },

    /**
     * توقف اجرا
     * @param {number} ms
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // ═══════════════ آرایه و آبجکت ═══════════════

    /**
     * گروه‌بندی آرایه بر اساس کلید
     * @param {Array} arr
     * @param {string|Function} key
     * @returns {Object}
     */
    groupBy(arr, key) {
        return arr.reduce((acc, item) => {
            const k = typeof key === 'function' ? key(item) : item[key];
            (acc[k] = acc[k] || []).push(item);
            return acc;
        }, {});
    },

    /**
     * جمع یک فیلد
     * @param {Array} arr
     * @param {string|Function} key
     * @returns {number}
     */
    sumBy(arr, key) {
        return arr.reduce((s, item) => s + (Number(typeof key === 'function' ? key(item) : item[key]) || 0), 0);
    },

    /**
     * یکتاسازی آرایه
     * @param {Array} arr
     * @param {string} key
     * @returns {Array}
     */
    uniqueBy(arr, key) {
        const seen = new Set();
        return arr.filter(item => {
            const k = item[key];
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
        });
    },

    /**
     * کپی عمیق
     * @param {*} obj
     * @returns {*}
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (typeof structuredClone === 'function') {
            try { return structuredClone(obj); } catch (e) { /* fallback */ }
        }
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * مقایسه دو آبجکت
     * @param {*} a
     * @param {*} b
     * @returns {boolean}
     */
    isEqual(a, b) {
        return JSON.stringify(a) === JSON.stringify(b);
    },

    // ═══════════════ رنگ‌ها ═══════════════

    /**
     * تولید رنگ بر اساس رشته
     * @param {string} str
     * @returns {string} hsl color
     */
    stringToColor(str) {
        let hash = 0;
        str = String(str || '');
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h = Math.abs(hash) % 360;
        return `hsl(${h}, 65%, 55%)`;
    },

    /**
     * حرف اول برای آواتار
     * @param {string} name
     * @returns {string}
     */
    getInitial(name) {
        return String(name || '?').trim().charAt(0).toUpperCase();
    },

    // ═══════════════ کوکی و ذخیره‌سازی ═══════════════

    /**
     * ذخیره در localStorage
     * @param {string} key
     * @param {*} value
     */
    setLocal(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn('localStorage setItem failed:', e);
        }
    },

    /**
     * خواندن از localStorage
     * @param {string} key
     * @param {*} defaultValue
     * @returns {*}
     */
    getLocal(key, defaultValue = null) {
        try {
            const v = localStorage.getItem(key);
            return v === null ? defaultValue : JSON.parse(v);
        } catch (e) {
            return defaultValue;
        }
    },

    /**
     * حذف از localStorage
     * @param {string} key
     */
    removeLocal(key) {
        try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
    },

    // ═══════════════ اعتبارسنجی و فرم ═══════════════

    /**
     * بررسی خالی بودن
     * @param {*} v
     * @returns {boolean}
     */
    isEmpty(v) {
        if (v === null || v === undefined) return true;
        if (typeof v === 'string') return v.trim() === '';
        if (Array.isArray(v)) return v.length === 0;
        if (typeof v === 'object') return Object.keys(v).length === 0;
        return false;
    },

    /**
     * پاک‌سازی ورودی عددی
     * @param {string|number} v
     * @returns {number}
     */
    toNumber(v) {
        if (typeof v === 'number') return isFinite(v) ? v : 0;
        const s = this.toEnglishDigits(String(v || '')).replace(/[^\d.-]/g, '');
        const n = Number(s);
        return isFinite(n) ? n : 0;
    },

    /**
     * گرد کردن به تعداد اعشار
     * @param {number} n
     * @param {number} decimals
     * @returns {number}
     */
    round(n, decimals = 0) {
        const f = Math.pow(10, decimals);
        return Math.round((Number(n) || 0) * f) / f;
    },

    // ═══════════════ URL و مسیر ═══════════════

    /**
     * دریافت پارامتر از URL
     * @param {string} name
     * @returns {string|null}
     */
    getQueryParam(name) {
        const url = new URL(window.location.href);
        return url.searchParams.get(name);
    },

    /**
     * ساخت Query String
     * @param {Object} params
     * @returns {string}
     */
    buildQuery(params) {
        const usp = new URLSearchParams();
        Object.entries(params || {}).forEach(([k, v]) => {
            if (v !== null && v !== undefined && v !== '') usp.append(k, v);
        });
        return usp.toString();
    },

    // ═══════════════ تشخیص امکانات مرورگر ═══════════════

    features: {
        hasIndexedDB() { return 'indexedDB' in window; },
        hasServiceWorker() { return 'serviceWorker' in navigator; },
        hasNotifications() { return 'Notification' in window; },
        hasStorageEstimate() { return navigator.storage && typeof navigator.storage.estimate === 'function'; },
        hasClipboard() { return navigator.clipboard && typeof navigator.clipboard.writeText === 'function'; },
        isOnline() { return navigator.onLine; },
        isPWA() {
            return window.matchMedia('(display-mode: standalone)').matches ||
                window.navigator.standalone === true;
        },
        isMobile() {
            return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
        }
    },

    /**
     * کپی در کلیپ‌بورد
     * @param {string} text
     * @returns {Promise<boolean>}
     */
    async copyToClipboard(text) {
        try {
            if (this.features.hasClipboard()) {
                await navigator.clipboard.writeText(text);
                return true;
            }
            // fallback
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            return true;
        } catch (e) {
            console.warn('copy failed:', e);
            return false;
        }
    },

    // ═══════════════ لاگ ═══════════════

    log(...args) {
        if (localStorage.getItem('parsis-debug') === '1') {
            console.log('[Parsis]', ...args);
        }
    },

    warn(...args) {
        console.warn('[Parsis]', ...args);
    },

    error(...args) {
        console.error('[Parsis]', ...args);
    }

};

// ═══════════════ قفل کردن Utils در برابر تغییر تصادفی ═══════════════
// (اختیاری - برای جلوگیری از بازنویسی ناخواسته)
// Object.freeze(Utils);
