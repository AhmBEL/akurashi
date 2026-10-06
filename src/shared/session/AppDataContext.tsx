"use client";

import { createContext, useContext } from "react";
import type { FamilyState } from "@/domains/family/types";

const AppDataContext = createContext<FamilyState | null>(null);

export const AppDataProvider = AppDataContext.Provider;

// Profil courant, famille et membres — disponibles pour tous les écrans
// une fois le démarrage (AppBootstrap) terminé.
export function useAppData(): FamilyState {
  const state = useContext(AppDataContext);
  if (!state) throw new Error("useAppData doit être utilisé sous AppBootstrap");
  return state;
}
