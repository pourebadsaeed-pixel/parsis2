// ═══════════════ IndexedDB Wrapper (Fixed) ═══════════════

const DB_NAME = 'parsis2-db';
const DB_VERSION = 1;
const ALL_STORES = ['persons', 'products', 'accounts', 'vouchers', 'invoices', 'receipts', 'settings'];

let _db = null;
let _openPromise = null;

const DB = {
    open() {
        if (_db) return Promise.resolve(_db);
        if (_openPromise) return _openPromise;

        _openPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                _db = request.result;
                // مدیریت بسته شدن ناگهانی
                _db.onclose = () => { _db = null; _openPromise = null; };
                _db.onversionchange = () => {
                    _db.close();
                    _db = null;
                    _openPromise = null;
                    alert('پایگاه داده در حال به‌روزرسانی است. لطفاً صفحه را رفرش کنید.');
                };
                resolve(_db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains('persons')) {
                    const s = db.createObjectStore('persons', { keyPath: 'id' });
                    s.createIndex('name', 'name', { unique: false });
                    s.createIndex('type', 'type', { unique: false });
                    s.createIndex('code', 'code', { unique: false });
                }
                if (!db.objectStoreNames.contains('products')) {
                    const s = db.createObjectStore('products', { keyPath: 'id' });
                    s.createIndex('name', 'name', { unique: false });
                    s.createIndex('code', 'code', { unique: false });
                }
                if (!db.objectStoreNames.contains('accounts')) {
                    const s = db.createObjectStore('accounts', { keyPath: 'id' });
                    s.createIndex('code', 'code', { unique: false });
                    s.createIndex('parentId', 'parentId', { unique: false });
                }
                if (!db.objectStoreNames.contains('vouchers')) {
                    const s = db.createObjectStore('vouchers', { keyPath: 'id' });
                    s.createIndex('number', 'number', { unique: false });
                    s.createIndex('date', 'date', { unique: false });
                }
                if (!db.objectStoreNames.contains('invoices')) {
                    const s = db.createObjectStore('invoices', { keyPath: 'id' });
                    s.createIndex('number', 'number', { unique: false });
                    s.createIndex('date', 'date', { unique: false });
                    s.createIndex('type', 'type', { unique: false });
                    s.createIndex('personId', 'personId', { unique: false });
                }
                if (!db.objectStoreNames.contains('receipts')) {
                    const s = db.createObjectStore('receipts', { keyPath: 'id' });
                    s.createIndex('number', 'number', { unique: false });
                    s.createIndex('date', 'date', { unique: false });
                    s.createIndex('type', 'type', { unique: false });
                    s.createIndex('personId', 'personId', { unique: false });
                }
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
        return _openPromise;
    },

    // ════════════ CRUD — همه در یک تراکنش زنده ════════════

    async add(store, item) {
        const db = await this.open();
        if (!item.id) item.id = Utils.uid();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(store, 'readwrite');
            const req = tx.objectStore(store).add(item);
            req.onsuccess = () => resolve(item.id);
            req.onerror = () => reject(req.error);
            tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
        });
    },

    async put(store, item) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(store, 'readwrite');
            const req = tx.objectStore(store).put(item);
            req.onsuccess = () => resolve(item.id || item.key);
            req.onerror = () => reject(req.error);
            tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
        });
    },

    async get(store, id) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(store, 'readonly');
            const req = tx.objectStore(store).get(id);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    async all(store) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(store, 'readonly');
            const req = tx.objectStore(store).getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
        });
    },

    async delete(store, id) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(store, 'readwrite');
            const req = tx.objectStore(store).delete(id);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    },

    async clear(store) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(store, 'readwrite');
            const req = tx.objectStore(store).clear();
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    },

    async count(store) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(store, 'readonly');
            const req = tx.objectStore(store).count();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    // ════════════ تنظیمات ════════════

    async getSetting(key, defaultValue = null) {
        const item = await this.get('settings', key);
        return item ? item.value : defaultValue;
    },

    async setSetting(key, value) {
        return this.put('settings', { key, value });
    },

    // ════════════ پشتیبان‌گیری ════════════

    async exportAll() {
        const data = {};
        const counts = {};
        for (const store of ALL_STORES) {
            const items = await this.all(store);
            data[store] = items;
            counts[store] = items.length;
        }
        return {
            app: 'parsis-2',
            formatVersion: 1,
            dbVersion: DB_VERSION,
            exportedAt: new Date().toISOString(),
            exportedAtPersian: Utils.todayPersian(),
            counts,
            data
        };
    },

    // بازیابی امن — ابتدا اعتبارسنجی، سپس در یک تراکنش واحد
    async importAll(backup, options = {}) {
        const { merge = false, onProgress = null } = options;

        // ─── ۱. اعتبارسنجی ───
        if (!backup || typeof backup !== 'object') {
            throw new Error('فایل پشتیبان نامعتبر است (ساختار JSON اشتباه)');
        }
        if (!backup.data || typeof backup.data !== 'object') {
            throw new Error('فایل پشتیبان فاقد بخش «data» است');
        }

        const errors = [];
        const validData = {};

        for (const store of ALL_STORES) {
            if (!Array.isArray(backup.data[store])) {
                if (backup.data[store] !== undefined) {
                    errors.push(`مخزن «${store}» ساختار آرایه‌ای ندارد`);
                }
                validData[store] = [];
                continue;
            }
            // اعتبارسنجی هر آیتم
            const cleaned = [];
            for (let i = 0; i < backup.data[store].length; i++) {
                const item = backup.data[store][i];
                if (!item || typeof item !== 'object') {
                    errors.push(`آیتم ${i} در «${store}» نامعتبر است`);
                    continue;
                }
                // settings از key استفاده می‌کند، بقیه از id
                if (store === 'settings') {
                    if (!item.key) { errors.push(`رکورد ${i} «settings» بدون کلید key`); continue; }
                } else {
                    if (!item.id) { errors.push(`رکورد ${i} «${store}» بدون id`); continue; }
                }
                cleaned.push(item);
            }
            validData[store] = cleaned;
        }

        if (errors.length > 0) {
            console.warn('هشدارهای اعتبارسنجی:', errors);
        }

        // ─── ۲. پشتیبان‌گیری از داده فعلی (برای rollback) ───
        const rollback = merge ? null : await this.exportAll();

        // ─── ۳. بازیابی در یک تراکنش per-store ───
        const results = { restored: {}, errors: errors };
        for (const store of ALL_STORES) {
            try {
                if (onProgress) onProgress(store, 'start');

                // اگر merge نیست، ابتدا پاک کن
                if (!merge) {
                    await this.clear(store);
                }

                const items = validData[store];
                if (items.length > 0) {
                    // ─── درج دسته‌ای در یک تراکنش واحد ───
                    const db = await this.open();
                    await new Promise((resolve, reject) => {
                        const tx = db.transaction(store, 'readwrite');
                        const os = tx.objectStore(store);
                        for (const item of items) {
                            try { os.put(item); } catch (e) { /* skip invalid */ }
                        }
                        tx.oncomplete = () => resolve();
                        tx.onerror = () => reject(tx.error);
                        tx.onabort = () => reject(tx.error || new Error('aborted'));
                    });
                }
                results.restored[store] = items.length;
                if (onProgress) onProgress(store, 'done', items.length);
            } catch (e) {
                console.error(`خطا در بازیابی مخزن ${store}:`, e);
                errors.push(`مخزن «${store}»: ${e.message}`);

                // ─── rollback در صورت خطا ───
                if (!merge && rollback) {
                    try {
                        await this._restoreFromRollback(rollback);
                        throw new Error('بازیابی با خطا مواجه شد؛ داده‌های قبلی بازگردانده شد.');
                    } catch (rbErr) {
                        console.error('Rollback failed:', rbErr);
                    }
                }
                throw new Error(`بازیابی «${store}» ناموفق: ${e.message}`);
            }
        }

        return results;
    },

    async _restoreFromRollback(rollback) {
        for (const store of ALL_STORES) {
            await this.clear(store);
            const items = rollback.data[store] || [];
            if (items.length === 0) continue;
            const db = await this.open();
            await new Promise((resolve, reject) => {
                const tx = db.transaction(store, 'readwrite');
                const os = tx.objectStore(store);
                items.forEach(it => os.put(it));
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
            });
        }
    }
};
