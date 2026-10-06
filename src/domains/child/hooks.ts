"use client";

import { useStoreQuery } from "@/shared/data/useStoreQuery";
import { getChildReward, getRewardSystems, type ChildReward } from "./repository";
import type { RewardConfig } from "./types";

export function useRewardSystems(childIds: string[]): Record<string, RewardConfig> | undefined {
  return useStoreQuery(
    `reward-systems:${childIds.join(",")}`,
    (store) => getRewardSystems(store, childIds),
    ["reward_systems"]
  );
}

// `null` = pas de système de récompense pour cet enfant ; `undefined` = chargement.
export function useChildReward(childId: string): ChildReward | null | undefined {
  return useStoreQuery(`child-reward:${childId}`, (store) => getChildReward(store, childId), [
    "reward_systems",
    "reward_thresholds",
  ]);
}
