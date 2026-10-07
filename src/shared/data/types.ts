// Couche d'accès unique (brief §3) : aucun écran ne lit ni n'écrit dans
// IndexedDB ou Supabase directement, tout passe par un DataStore.
// Les lignes ont la forme des colonnes de la base (snake_case, family_id…)
// pour que le passage démo → Supabase soit transparent.

// Certaines tables n'ont pas created_at / updated_at (tables de suivi, logs) :
// seul `id` est garanti.
export interface BaseRow {
  id: string;
  created_at?: string;
  updated_at?: string;
}

export type FilterValue = string | number | boolean | null;
// Filtre d'égalité uniquement (le seul commun aux deux implémentations).
export type Filter = Record<string, FilterValue>;

export type NewRow<T extends BaseRow> = Omit<T, "id" | "created_at" | "updated_at"> & { id?: string };

export interface ExportBlob {
  version: 1;
  exportedAt: string;
  records: Array<{ table: string; data: Record<string, unknown> }>;
}

export interface DataStore {
  list<T extends BaseRow>(table: string, filter?: Filter): Promise<T[]>;
  get<T extends BaseRow>(table: string, id: string): Promise<T | null>;
  create<T extends BaseRow>(table: string, data: NewRow<T>): Promise<T>;
  update<T extends BaseRow>(table: string, id: string, patch: Partial<T>): Promise<T>;
  remove(table: string, id: string): Promise<void>;
  // Suppression par filtre d'égalité : seule façon de retirer une ligne d'une table de liaison (clé composite, pas d'id).
  removeWhere(table: string, filter: Filter): Promise<void>;
  subscribe(table: string, callback: () => void): () => void;
  // Outils développeur (démo uniquement).
  clearAll(): Promise<void>;
  exportAll(): Promise<ExportBlob>;
  importAll(blob: ExportBlob): Promise<void>;
}
