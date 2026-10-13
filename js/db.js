// ═══════════════ IndexedDB Wrapper ═══════════════

const DB_NAME = 'parsis2-db';
const DB_VERSION = 1;
let _db = null;

const DB = {
    async open() {
        if (_db) return _db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => { _db = request.result; resolve(_db); };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // اشخاص
                if (!db.objectStoreNames.contains('persons')) {
                    const s = db.createObjectStore('persons', { keyPath: 'id' });
                    s.createIndex('name', 'name', { unique: false });
                    s.createIndex('type', 'type', { unique: false });
                    s.createIndex('code', 'code', { unique: false });
                }

                // کالا و خدمات
                if (!db.objectStoreNames.contains('products')) {
                    const s = db.createObjectStore('products', { keyPath: 'id' });
                    s.createIndex('name', 'name', { unique: false });
                    s.createIndex('code', 'code', { unique: false });
                }

                // حساب‌ها (کدینگ حسابداری)
                if (!db.objectStoreNames.contains('accounts')) {
                    const s = db.createObjectStore('accounts', { keyPath: 'id' });
                    s.createIndex('code', 'code', { unique: false });
                    s.createIndex('parentId', 'parentId', { unique: false });
                }

                // اسناد حسابداری
                if (!db.objectStoreNames.contains('vouchers')) {
                    const s = db.createObjectStore('vouchers', { keyPath: 'id' });
                    s.createIndex('number', 'number', { unique: false });
                    s.createIndex('date', 'date', { unique: false });
                }

                // فاکتورها (فروش و خرید)
                if (!db.objectStoreNames.contains('invoices')) {
                    const s = db.createObjectStore('invoices', { keyPath: 'id' });
                    s.createIndex('number', 'number', { unique: false });
                    s.createIndex('date', 'date', { unique: false });
                    s.createIndex('type', 'type', { unique: false });
                    s.createIndex('personId', 'personId', { unique: false });
                }

                // دریافت/پرداخت
                if (!db.objectStoreNames.contains('receipts')) {
                    const s = db.createObjectStore('receipts', { keyPath: 'id' });
                    s.createIndex('number', 'number', { unique: false });
                    s.createIndex('date', 'date', { unique: false });
                    s.createIndex('type', 'type', { unique: false });
                    s.createIndex('personId', 'personId', { unique: false });
                }

                // تنظیمات
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    },

    async _tx(store, mode = 'readonly') {
        const db = await this.open();
        return db.transaction(store, mode).objectStore(store);
    },

    async add(store, item) {
        if (!item.id) item.id = Utils.uid();
        const s = await this._tx(store, 'readwrite');
        return new Promise((res, rej) => {
            const r = s.add(item);
            r.onsuccess = () => res(item.id);
            r.onerror = () => rej(r.error);
        });
    },

    async put(store, item) {
        const s = await this._tx(store, 'readwrite');
        return new Promise((res, rej) => {
            const r = s.put(item);
            r.onsuccess = () => res(item.id);
            r.onerror = () => rej(r.error);
        });
    },

    async get(store, id) {
        const s = await this._tx(store);
        return new Promise((res, rej) => {
            const r = s.get(id);
            r.onsuccess = () => res(r.result);
            r.onerror = () => rej(r.error);
        });
    },

    async all(store) {
        const s = await this._tx(store);
        return new Promise((res, rej) => {
            const r = s.getAll();
            r.onsuccess = () => res(r.result || []);
            r.onerror = () => rej(r.error);
        });
    },

    async delete(store, id) {
        const s = await this._tx(store, 'readwrite');
        return new Promise((res, rej) => {
            const r = s.delete(id);
            r.onsuccess = () => res();
            r.onerror = () => rej(r.error);
        });
    },

    async clear(store) {
        const s = await this._tx(store, 'readwrite');
        return new Promise((res, rej) => {
            const r = s.clear();
            r.onsuccess = () => res();
            r.onerror = () => rej(r.error);
        });
    },

    async count(store) {
        const s = await this._tx(store);
        return new Promise((res, rej) => {
            const r = s.count();
            r.onsuccess = () => res(r.result);
            r.onerror = () => rej(r.error);
        });
    },

    // ─────── تنظیمات ───────
    async getSetting(key, defaultValue = null) {
        const item = await this.get('settings', key);
        return item ? item.value : defaultValue;
    },

    async setSetting(key, value) {
        return this.put('settings', { key, value });
    },

    // ─────── پشتیبان‌گیری ───────
    async exportAll() {
        const data = {};
        for (const store of ['persons','products','accounts','vouchers','invoices','receipts','settings']) {
            data[store] = await this.all(store);
        }
        return {
            version: DB_VERSION,
            exportedAt: new Date().toISOString(),
            data
        };
    },

    async importAll(backup) {
        if (!backup || !backup.data) throw new Error('فایل پشتیبان نامعتبر است');
        for (const store of Object.keys(backup.data)) {
            await this.clear(store);
            for (const item of backup.data[store]) {
                await this.put(store, item);
            }
        }
    }
};
