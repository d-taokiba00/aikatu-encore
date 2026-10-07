
const DB_NAME = "AikatsuEncoreDB";
const DB_VERSION = 1;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains("userCards")) {
        db.createObjectStore("userCards", {keyPath: "cardId"});
      }
      if (!db.objectStoreNames.contains("customCards")) {
        db.createObjectStore("customCards", {keyPath: "cardId"});
      }
      if (!db.objectStoreNames.contains("customImages")) {
        db.createObjectStore("customImages", {keyPath: "cardId"});
      }
      if (!db.objectStoreNames.contains("cardOverrides")) {
        db.createObjectStore("cardOverrides", {keyPath: "cardId"});
      }
      if (!db.objectStoreNames.contains("outfits")) {
        db.createObjectStore("outfits", {keyPath: "id"});
      }
      if (!db.objectStoreNames.contains("offlineSets")) {
        db.createObjectStore("offlineSets", {keyPath: "setId"});
      }
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", {keyPath: "key"});
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDBを開けませんでした"));
  });
  return dbPromise;
}

function request(storeName, mode, action) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result;
    try {
      result = action(store);
    } catch (e) {
      reject(e);
      return;
    }
    if (result && typeof result.onsuccess !== "undefined") {
      result.onsuccess = () => resolve(result.result);
      result.onerror = () => reject(result.error || tx.error);
    } else {
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || new Error("IndexedDB transaction failed"));
    }
  }));
}

export async function getUserCard(cardId) {
  return request("userCards", "readonly", s => s.get(cardId));
}

export async function putUserCard(card) {
  const normalized = {
    cardId: String(card.cardId),
    ownedCount: Math.max(0, Number.isInteger(card.ownedCount) ? card.ownedCount : Number(card.ownedCount) || 0),
    favorite: !!card.favorite
  };
  return request("userCards", "readwrite", s => s.put(normalized));
}

export async function deleteUserCard(cardId) {
  return request("userCards", "readwrite", s => s.delete(cardId));
}

export async function getAllUserCards() {
  return request("userCards", "readonly", s => s.getAll());
}

export async function getCustomCard(cardId) {
  return request("customCards", "readonly", s => s.get(cardId));
}

export async function putCustomCard(card) {
  const normalized = {
    cardId: String(card.cardId),
    name: card.name ?? null,
    character: card.character ?? null,
    brand: card.brand ?? null,
    type: card.type ?? null,
    rarity: card.rarity ?? null,
    category: card.category ?? null,
    appealPoint: card.appealPoint === null || card.appealPoint === undefined || card.appealPoint === ""
      ? null
      : Number(card.appealPoint)
  };
  return request("customCards", "readwrite", s => s.put(normalized));
}

export async function deleteCustomCard(cardId) {
  return request("customCards", "readwrite", s => s.delete(cardId));
}

export async function getAllCustomCards() {
  return request("customCards", "readonly", s => s.getAll());
}

export async function getCustomImage(cardId) {
  return request("customImages", "readonly", s => s.get(cardId));
}

export async function putCustomImage(cardId, blob, mimeType = blob?.type || "image/jpeg") {
  if (!(blob instanceof Blob)) throw new Error("画像データが不正です");
  return request("customImages", "readwrite", s =>
    s.put({cardId: String(cardId), blob, mimeType})
  );
}

export async function deleteCustomImage(cardId) {
  return request("customImages", "readwrite", s => s.delete(cardId));
}

export async function getAllCustomImages() {
  return request("customImages", "readonly", s => s.getAll());
}

export async function getCardOverride(cardId) {
  return request("cardOverrides", "readonly", s => s.get(cardId));
}

export async function putCardOverride(cardId, override) {
  const clean = {};
  for (const field of ["name","character","brand","type","rarity","category","appealPoint"]) {
    if (Object.prototype.hasOwnProperty.call(override || {}, field)) {
      clean[field] = override[field];
    }
  }
  if (Object.keys(clean).length === 0) {
    await deleteCardOverride(cardId);
    return;
  }
  return request("cardOverrides", "readwrite", s =>
    s.put({cardId: String(cardId), ...clean})
  );
}

export async function deleteCardOverride(cardId) {
  return request("cardOverrides", "readwrite", s => s.delete(cardId));
}

export async function resetCardOverrideField(cardId, field) {
  const current = await getCardOverride(cardId);
  if (!current) return;
  delete current[field];
  delete current.cardId;
  await putCardOverride(cardId, current);
}

export async function getAllCardOverrides() {
  return request("cardOverrides", "readonly", s => s.getAll());
}

export async function getOutfit(id) {
  return request("outfits", "readonly", s => s.get(id));
}

export async function putOutfit(outfit) {
  return request("outfits", "readwrite", s =>
    s.put({
      id: String(outfit.id),
      name: String(outfit.name || ""),
      cardIds: Array.isArray(outfit.cardIds) ? outfit.cardIds.map(String) : []
    })
  );
}

export async function deleteOutfit(id) {
  return request("outfits", "readwrite", s => s.delete(id));
}

export async function getAllOutfits() {
  return request("outfits", "readonly", s => s.getAll());
}

export async function getOfflineSet(setId) {
  return request("offlineSets", "readonly", s => s.get(setId));
}

export async function putOfflineSet(record) {
  return request("offlineSets", "readwrite", s =>
    s.put({
      setId: String(record.setId),
      dataVersion: Number(record.dataVersion) || 1,
      savedAt: record.savedAt || new Date().toISOString()
    })
  );
}

export async function deleteOfflineSet(setId) {
  return request("offlineSets", "readwrite", s => s.delete(setId));
}

export async function getAllOfflineSets() {
  return request("offlineSets", "readonly", s => s.getAll());
}

export async function getSetting(key) {
  return request("settings", "readonly", s => s.get(key));
}

export async function putSetting(key, value) {
  return request("settings", "readwrite", s =>
    s.put({key: String(key), value})
  );
}

export async function deleteSetting(key) {
  return request("settings", "readwrite", s => s.delete(key));
}

export async function getAllSettings() {
  return request("settings", "readonly", s => s.getAll());
}

export async function clearStore(storeName) {
  return request(storeName, "readwrite", s => s.clear());
}

export async function exportUserData() {
  const [
    userCards, customCards, cardOverrides, outfits, offlineSets, settings
  ] = await Promise.all([
    getAllUserCards(),
    getAllCustomCards(),
    getAllCardOverrides(),
    getAllOutfits(),
    getAllOfflineSets(),
    getAllSettings()
  ]);

  // offlineSets are app cache metadata, not user-created card data,
  // so they are intentionally excluded from backup.
  return {
    backupVersion: 1,
    exportedAt: new Date().toISOString(),
    userCards,
    customCards,
    cardOverrides,
    outfits,
    settings
  };
}

export async function importUserData(data, {replace = true} = {}) {
  if (!data || typeof data !== "object") throw new Error("バックアップデータが不正です");

  const stores = ["userCards","customCards","cardOverrides","outfits","settings"];

  if (replace) {
    for (const name of stores) await clearStore(name);
  }

  for (const item of data.userCards || []) await putUserCard(item);
  for (const item of data.customCards || []) await putCustomCard(item);
  for (const item of data.cardOverrides || []) await putCardOverride(item.cardId, item);
  for (const item of data.outfits || []) await putOutfit(item);
  for (const item of data.settings || []) await putSetting(item.key, item.value);
}

export async function deleteAllUserData() {
  await Promise.all([
    clearStore("userCards"),
    clearStore("customCards"),
    clearStore("customImages"),
    clearStore("cardOverrides"),
    clearStore("outfits"),
    clearStore("settings")
  ]);
}
