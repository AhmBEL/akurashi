"use client";

import { useStoreQuery } from "@/shared/data/useStoreQuery";
import { getRewardSystems } from "./repository";
import type { RewardConfig } from "./types";

export function useRewardSystems(childIds: string[]): Record<string, RewardConfig> | undefined {
  return useStoreQuery(
    `reward-systems:${childIds.join(",")}`,
    (store) => getRewardSystems(store, childIds),
    ["reward_systems"]
  );
}
