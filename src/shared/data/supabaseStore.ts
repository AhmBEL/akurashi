import { createBrowserClient } from "@supabase/ssr";
import { createChangeBus } from "./changeBus";
import type { BaseRow, DataStore, Filter, NewRow } from "./types";

function fail(message: string): never {
  throw new Error(message);
}

// Version finale (DEMO_MODE coupé) : même interface que le LocalStore, mais
// sur Supabase via le client navigateur — la session (cookies) et la RLS
// s'appliquent. Realtime viendra plus tard ; en attendant, seuls les
// changements faits depuis cet onglet notifient les abonnés.
export function createSupabaseStore(): DataStore {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const bus = createChangeBus();

  return {
    async list<T extends BaseRow>(table: string, filter?: Filter) {
      let query = supabase.from(table).select("*");
      for (const [field, value] of Object.entries(filter ?? {})) {
        query = value === null ? query.is(field, null) : query.eq(field, value);
      }
      const { data, error } = await query.order("created_at", { ascending: true });
      if (error) fail(error.message);
      return (data ?? []) as unknown as T[];
    },

    async get<T extends BaseRow>(table: string, id: string): Promise<T | null> {
      const { data, error } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
      if (error) fail(error.message);
      return (data as unknown as T) ?? null;
    },

    async create<T extends BaseRow>(table: string, row: NewRow<T>) {
      const { data, error } = await supabase.from(table).insert(row).select().single();
      if (error) fail(error.message);
      bus.emit(table);
      return data as unknown as T;
    },

    async update<T extends BaseRow>(table: string, id: string, patch: Partial<T>) {
      const { data, error } = await supabase.from(table).update(patch as never).eq("id", id).select().single();
      if (error) fail(error.message);
      bus.emit(table);
      return data as unknown as T;
    },

    async remove(table: string, id: string) {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) fail(error.message);
      bus.emit(table);
    },

    async removeWhere(table: string, filter: Filter) {
      let query = supabase.from(table).delete();
      for (const [field, value] of Object.entries(filter)) {
        query = value === null ? query.is(field, null) : query.eq(field, value);
      }
      const { error } = await query;
      if (error) fail(error.message);
      bus.emit(table);
    },

    subscribe: (table, callback) => bus.subscribe(table, callback),

    clearAll: () => fail("Réservé au mode démo"),
    exportAll: () => fail("Réservé au mode démo"),
    importAll: () => fail("Réservé au mode démo"),
  };
}
