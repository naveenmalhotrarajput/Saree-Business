// Lightweight IndexedDB wrapper
const DB_NAME = 'SareeBusinessDB';
const DB_VERSION = 1;
const STORES = ['shops', 'orders', 'work', 'helpers', 'helperWork', 'helperPayments', 'expenses', 'loans', 'loanPayments'];
let dbInstance = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      STORES.forEach(s => {
        if (!db.objectStoreNames.contains(s)) {
          db.createObjectStore(s, { keyPath: 'id', autoIncrement: true });
        }
      });
    };
    req.onsuccess = (e) => { dbInstance = e.target.result; resolve(dbInstance); };
    req.onerror = (e) => reject(e.target.error);
  });
}

async function dbAdd(store, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).add({ ...data, createdAt: Date.now() });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGetAll(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(store, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function dbUpdate(store, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(data);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function dbClearAll() {
  const db = await openDB();
  return Promise.all(STORES.map(s => new Promise((res, rej) => {
    const tx = db.transaction(s, 'readwrite');
    tx.objectStore(s).clear().onsuccess = () => res();
  })));
}

async function exportAllData() {
  const data = {};
  for (const s of STORES) data[s] = await dbGetAll(s);
  return data;
}

async function importAllData(data) {
  await dbClearAll();
  for (const s of STORES) {
    if (data[s]) {
      for (const item of data[s]) {
        const { id, ...rest } = item;
        await dbAdd(s, rest);
      }
    }
  }
}