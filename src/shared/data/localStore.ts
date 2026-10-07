import { openDB, type IDBPDatabase } from "idb";
import { createChangeBus } from "./changeBus";
import type { BaseRow, DataStore, ExportBlob, Filter, NewRow } from "./types";

const STORE = "records";

interface StoredRecord {
  key: string;
  table: string;
  data: Record<string, unknown>;
}

function matches(data: Record<string, unknown>, filter?: Filter): boolean {
  if (!filter) return true;
  return Object.entries(filter).every(([field, value]) => (data[field] ?? null) === value);
}

// Stockage local persistant pour le mode démo : un seul object store, une
// ligne par enregistrement (clé "table:id"), filtres appliqués en JS.
export function createLocalStore(dbName = "akurashi"): DataStore {
  const bus = createChangeBus(`${dbName}-changes`);
  let dbPromise: Promise<IDBPDatabase> | null = null;

  // Horodatages de création strictement croissants : deux lignes créées dans la
  // même milliseconde gardent leur ordre d'insertion au tri par `created_at`.
  let lastCreatedAt = 0;
  const nextCreatedAt = () => {
    lastCreatedAt = Math.max(Date.now(), lastCreatedAt + 1);
    return new Date(lastCreatedAt).toISOString();
  };

  const getDb = () => {
    dbPromise ??= openDB(dbName, 1, {
      upgrade(db) {
        const store = db.createObjectStore(STORE, { keyPath: "key" });
        store.createIndex("table", "table");
      },
    });
    return dbPromise;
  };

  const byCreation = (a: BaseRow, b: BaseRow) => (a.created_at ?? "").localeCompare(b.created_at ?? "");

  return {
    async list<T extends BaseRow>(table: string, filter?: Filter) {
      const db = await getDb();
      const records: StoredRecord[] = await db.getAllFromIndex(STORE, "table", table);
      return records
        .map((record) => record.data as unknown as T)
        .filter((row) => matches(row as unknown as Record<string, unknown>, filter))
        .sort(byCreation);
    },

    async get<T extends BaseRow>(table: string, id: string) {
      const db = await getDb();
      const record: StoredRecord | undefined = await db.get(STORE, `${table}:${id}`);
      return record ? (record.data as unknown as T) : null;
    },

    async create<T extends BaseRow>(table: string, data: NewRow<T>) {
      const now = nextCreatedAt();
      const row = { ...data, id: data.id ?? crypto.randomUUID(), created_at: now, updated_at: now } as unknown as T;
      const db = await getDb();
      await db.put(STORE, { key: `${table}:${row.id}`, table, data: row as unknown as Record<string, unknown> } satisfies StoredRecord);
      bus.emit(table);
      return row;
    },

    async update<T extends BaseRow>(table: string, id: string, patch: Partial<T>) {
      const db = await getDb();
      const existing: StoredRecord | undefined = await db.get(STORE, `${table}:${id}`);
      if (!existing) throw new Error(`${table}:${id} introuvable`);
      const row = { ...existing.data, ...patch, id, updated_at: new Date().toISOString() } as unknown as T;
      await db.put(STORE, { key: existing.key, table, data: row as unknown as Record<string, unknown> } satisfies StoredRecord);
      bus.emit(table);
      return row;
    },

    async remove(table: string, id: string) {
      const db = await getDb();
      await db.delete(STORE, `${table}:${id}`);
      bus.emit(table);
    },

    async removeWhere(table: string, filter: Filter) {
      const db = await getDb();
      const records: StoredRecord[] = await db.getAllFromIndex(STORE, "table", table);
      for (const record of records.filter((candidate) => matches(candidate.data, filter))) await db.delete(STORE, record.key);
      bus.emit(table);
    },

    subscribe: (table, callback) => bus.subscribe(table, callback),

    async clearAll() {
      const db = await getDb();
      const records: StoredRecord[] = await db.getAll(STORE);
      const tables = new Set(records.map((record) => record.table));
      await db.clear(STORE);
      tables.forEach((table) => bus.emit(table));
    },

    async exportAll(): Promise<ExportBlob> {
      const db = await getDb();
      const records: StoredRecord[] = await db.getAll(STORE);
      return {
        version: 1,
        exportedAt: new Date().toISOString(),
        records: records.map(({ table, data }) => ({ table, data })),
      };
    },

    async importAll(blob: ExportBlob) {
      if (blob?.version !== 1 || !Array.isArray(blob.records)) {
        throw new Error("Fichier d'export invalide");
      }
      const db = await getDb();
      const previous: StoredRecord[] = await db.getAll(STORE);
      const tx = db.transaction(STORE, "readwrite");
      await tx.store.clear();
      for (const { table, data } of blob.records) {
        await tx.store.put({ key: `${table}:${String(data.id)}`, table, data } satisfies StoredRecord);
      }
      await tx.done;
      const tables = new Set([...previous.map((record) => record.table), ...blob.records.map((record) => record.table)]);
      tables.forEach((table) => bus.emit(table));
    },
  };
}
