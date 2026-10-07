"use client";

import { useStoreQuery } from "@/shared/data/useStoreQuery";
import { getSujetDetail, getSujets } from "./repository";
import type { SujetCardView, SujetDetailView } from "./types";

const SUJET_TABLES = [
  "sujets",
  "sujet_participants",
  "sujet_links",
  "task_comments",
  "tasks",
  "task_participants",
  "budget_lines",
  "family_members",
];

export function useSujets(familyId: string, viewerId: string): SujetCardView[] | undefined {
  return useStoreQuery(`sujets:${familyId}:${viewerId}`, (store) => getSujets(store, familyId, viewerId), SUJET_TABLES);
}

// `null` : Sujet introuvable ou non visible ; `undefined` : chargement.
export function useSujetDetail(familyId: string, sujetId: string, viewerId: string): SujetDetailView | null | undefined {
  return useStoreQuery(
    `sujet:${familyId}:${sujetId}:${viewerId}`,
    (store) => getSujetDetail(store, familyId, sujetId, viewerId),
    SUJET_TABLES
  );
}
