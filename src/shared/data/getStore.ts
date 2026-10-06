import { isDemoMode } from "@/shared/config";
import { createLocalStore } from "./localStore";
import { createSupabaseStore } from "./supabaseStore";
import type { DataStore } from "./types";

let store: DataStore | undefined;

// Seul endroit qui choisit l'implémentation. Les écrans et les domaines
// reçoivent un DataStore sans savoir lequel.
export function getStore(): DataStore {
  store ??= isDemoMode() ? createLocalStore() : createSupabaseStore();
  return store;
}
