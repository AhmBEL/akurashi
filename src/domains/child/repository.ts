import type { Database } from "@/shared/lib/supabase/database.types";
import type { DataStore } from "@/shared/data/types";
import type { RewardConfig } from "./types";

// Le seul endroit autorisé à lire/écrire `reward_systems`, via le DataStore.
// Le système de motivation est indépendant de l'âge et du statut d'accès.

type RewardRow = Database["public"]["Tables"]["reward_systems"]["Row"];

const toConfig = (row: RewardRow): RewardConfig => ({
  type: row.type,
  compensationType: row.compensation_type,
  visualTheme: row.visual_theme,
});

// Une seule ligne par enfant (créée ou mise à jour).
export async function saveRewardSystem(store: DataStore, childId: string, config: RewardConfig): Promise<void> {
  const existing = (await store.list<RewardRow>("reward_systems", { child_id: childId }))[0];
  const fields = {
    type: config.type,
    compensation_type: config.compensationType,
    visual_theme: config.visualTheme,
  };

  if (existing) {
    await store.update<RewardRow>("reward_systems", existing.id, fields);
    return;
  }
  await store.create<RewardRow>("reward_systems", { child_id: childId, unlock_mode: "progressif", ...fields });
}

export async function getRewardSystems(store: DataStore, childIds: string[]): Promise<Record<string, RewardConfig>> {
  const rows = await store.list<RewardRow>("reward_systems");
  const wanted = new Set(childIds);
  return Object.fromEntries(rows.filter((row) => wanted.has(row.child_id)).map((row) => [row.child_id, toConfig(row)]));
}
