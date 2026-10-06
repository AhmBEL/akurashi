import type { Database } from "@/shared/lib/supabase/database.types";
import type { DataStore } from "@/shared/data/types";
import { DEFAULT_THRESHOLDS } from "./defaults";
import type { RewardConfig, RewardThreshold, RewardType } from "./types";

// Le seul endroit autorisé à lire/écrire `reward_systems` et `reward_thresholds`,
// via le DataStore. Le système de motivation est indépendant de l'âge et du
// statut d'accès de l'enfant.

type RewardRow = Database["public"]["Tables"]["reward_systems"]["Row"];
type ThresholdRow = Database["public"]["Tables"]["reward_thresholds"]["Row"];

const toConfig = (row: RewardRow): RewardConfig => ({
  type: row.type,
  compensationType: row.compensation_type,
  visualTheme: row.visual_theme,
});

const toThreshold = (row: ThresholdRow): RewardThreshold => ({
  id: row.id,
  label: row.label,
  thresholdValue: row.threshold_value,
  amount: row.amount,
  sortOrder: row.sort_order,
});

// Une seule ligne par enfant (créée ou mise à jour). Les paliers par défaut du
// type choisi sont créés — et remplacés quand le type change.
export async function saveRewardSystem(store: DataStore, childId: string, config: RewardConfig): Promise<void> {
  const existing = (await store.list<RewardRow>("reward_systems", { child_id: childId }))[0];
  const fields = {
    type: config.type,
    compensation_type: config.compensationType,
    visual_theme: config.visualTheme,
  };

  const row = existing
    ? await store.update<RewardRow>("reward_systems", existing.id, fields)
    : await store.create<RewardRow>("reward_systems", { child_id: childId, unlock_mode: "progressif", ...fields });

  if (!existing || existing.type !== config.type) {
    await resetThresholds(store, row.id, config.type);
  }
}

export async function resetThresholds(store: DataStore, rewardSystemId: string, type: RewardType): Promise<void> {
  const current = await store.list<ThresholdRow>("reward_thresholds", { reward_system_id: rewardSystemId });
  for (const row of current) await store.remove("reward_thresholds", row.id);

  const templates = DEFAULT_THRESHOLDS[type];
  for (const [index, template] of templates.entries()) {
    await store.create<ThresholdRow>("reward_thresholds", {
      reward_system_id: rewardSystemId,
      label: template.label,
      threshold_value: template.thresholdValue,
      amount: null,
      sort_order: index,
    });
  }
}

export async function getRewardSystems(store: DataStore, childIds: string[]): Promise<Record<string, RewardConfig>> {
  const rows = await store.list<RewardRow>("reward_systems");
  const wanted = new Set(childIds);
  return Object.fromEntries(rows.filter((row) => wanted.has(row.child_id)).map((row) => [row.child_id, toConfig(row)]));
}

export interface ChildReward {
  rewardSystemId: string;
  config: RewardConfig;
  thresholds: RewardThreshold[]; // triés du plus bas au plus haut
}

export async function getChildReward(store: DataStore, childId: string): Promise<ChildReward | null> {
  const row = (await store.list<RewardRow>("reward_systems", { child_id: childId }))[0];
  if (!row) return null;

  const thresholds = (await store.list<ThresholdRow>("reward_thresholds", { reward_system_id: row.id }))
    .map(toThreshold)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.thresholdValue - b.thresholdValue);
  return { rewardSystemId: row.id, config: toConfig(row), thresholds };
}

export interface ThresholdPatch {
  label?: string;
  thresholdValue?: number;
  amount?: number | null;
}

// Le premier palier reste à 0 : l'enfant n'a jamais les mains vides.
export async function updateThreshold(store: DataStore, id: string, patch: ThresholdPatch): Promise<void> {
  const target = await store.get<ThresholdRow>("reward_thresholds", id);
  if (!target) return;

  const siblings = await store.list<ThresholdRow>("reward_thresholds", { reward_system_id: target.reward_system_id });
  const lowestSort = Math.min(...siblings.map((row) => row.sort_order));
  const isFirst = target.sort_order === lowestSort;

  await store.update<ThresholdRow>("reward_thresholds", id, {
    ...(patch.label !== undefined && { label: patch.label }),
    ...(patch.thresholdValue !== undefined && { threshold_value: isFirst ? 0 : Math.max(1, Math.round(patch.thresholdValue)) }),
    ...(patch.amount !== undefined && { amount: patch.amount }),
  });
}
