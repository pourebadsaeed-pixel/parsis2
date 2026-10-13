const DB_NAME = 'parsis2-db';
const DB_VERSION = 1;

let db = null;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            // مخزن اشخاص
            if (!database.objectStoreNames.contains('persons')) {
                const personStore = database.createObjectStore('persons', {
                    keyPath: 'id',
                    autoIncrement: true
                });
                personStore.createIndex('name', 'name', { unique: false });
                personStore.createIndex('nationalId', 'nationalId', { unique: false });
            }

            // مخزن شرکت‌ها
            if (!database.objectStoreNames.contains('companies')) {
                const companyStore = database.createObjectStore('companies', {
                    keyPath: 'id',
                    autoIncrement: true
                });
                companyStore.createIndex('name', 'name', { unique: false });
            }

            // مخزن اسناد حسابداری
            if (!database.objectStoreNames.contains('vouchers')) {
                const voucherStore = database.createObjectStore('vouchers', {
                    keyPath: 'id',
                    autoIncrement: true
                });
                voucherStore.createIndex('date', 'date', { unique: false });
                voucherStore.createIndex('type', 'type', { unique: false });
            }

            // مخزن تنظیمات
            if (!database.objectStoreNames.contains('settings')) {
                database.createObjectStore('settings', { keyPath: 'key' });
            }
        };
    });
}

async function addItem(storeName, item) {
    if (!db) await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(item);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getItem(storeName, id) {
    if (!db) await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getAllItems(storeName) {
    if (!db) await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function updateItem(storeName, item) {
    if (!db) await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(item);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function deleteItem(storeName, id) {
    if (!db) await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}
