// ═══════════════ توابع کمکی ═══════════════

const Utils = {
    // تبدیل اعداد به فارسی
    toPersianDigits(num) {
        const digits = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
        return String(num).replace(/\d/g, d => digits[d]);
    },

    // تبدیل اعداد فارسی به انگلیسی
    toEnglishDigits(str) {
        const digits = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
        return String(str).replace(/[۰-۹]/g, d => digits.indexOf(d));
    },

    // فرمت عدد با جداکننده
    formatNumber(num) {
        if (num === null || num === undefined || isNaN(num)) return '۰';
        return Number(num).toLocaleString('fa-IR');
    },

    // فرمت مبلغ ریال
    formatMoney(num) {
        return this.formatNumber(Math.round(num || 0)) + ' ریال';
    },

    // تاریخ شمسی امروز
    todayPersian() {
        return new Intl.DateTimeFormat('fa-IR', {
            year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(new Date());
    },

    // تاریخ شمسی از Date
    toPersianDate(date) {
        if (!date) return '';
        return new Intl.DateTimeFormat('fa-IR', {
            year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(new Date(date));
    },

    // تاریخ و ساعت
    toPersianDateTime(date) {
        if (!date) return '';
        return new Intl.DateTimeFormat('fa-IR', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        }).format(new Date(date));
    },

    // تبدیل تاریخ شمسی به میلادی (ساده)
    persianToGregorian(persianDate) {
        // فرمت ورودی: 1403/05/20
        const parts = this.toEnglishDigits(persianDate).split('/');
        if (parts.length !== 3) return null;
        const [jy, jm, jd] = parts.map(Number);
        // الگوریتم تبدیل
        let gy, gm, gd;
        const jy2 = jy - 979;
        const jm2 = jm - 1;
        const jd2 = jd - 1;
        let j_day_no = 365 * jy2 + Math.floor(jy2 / 33) * 8 +
            Math.floor((jy2 % 33 + 3) / 4);
        for (let i = 0; i < jm2; ++i) {
            j_day_no += [31,31,31,31,31,31,30,30,30,30,30,29][i];
        }
        j_day_no += jd2;
        let g_day_no = j_day_no + 79;
        gy = 1600 + 400 * Math.floor(g_day_no / 146097);
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
        const g_days_in_month = [31,28,31,30,31,30,31,31,30,31,30,31];
        for (let i = 0; g_day_no >= g_days_in_month[i] + (i === 1 && leap ? 1 : 0); i++) {
            g_day_no -= g_days_in_month[i] + (i === 1 && leap ? 1 : 0);
            gm = i + 1;
        }
        gm = (gm || 0) + 1;
        gd = g_day_no + 1;
        return new Date(gy, gm - 1, gd);
    },

    // تولید شناسه یکتا
    uid() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    },

    // اعتبارسنجی کد ملی
    validateNationalId(code) {
        code = this.toEnglishDigits(String(code));
        if (!/^\d{10}$/.test(code)) return false;
        if (/^(\d)\1{9}$/.test(code)) return false;
        let sum = 0;
        for (let i = 0; i < 9; i++) sum += parseInt(code[i]) * (10 - i);
        const r = sum % 11;
        const check = parseInt(code[9]);
        return r < 2 ? check === r : check === 11 - r;
    },

    // خواندن فایل به عنوان Base64
    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    // دانلود فایل
    download(filename, content, type = 'application/json') {
        const blob = content instanceof Blob ? content : new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    },

    // Escape HTML
    escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    // دیبانس
    debounce(fn, delay = 300) {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), delay);
        };
    }
};
