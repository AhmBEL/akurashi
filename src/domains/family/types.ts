import type { FamilySettings } from "./settings";

export interface Family {
  id: string;
  name: string;
  currency: string;
  securityLevel: "libre" | "accueil_protege" | "tout_protege";
  settings: FamilySettings;
}

export type AccessStatus = "managed" | "invited_pending" | "linked";

export interface FamilyMember {
  id: string;
  familyId: string;
  name: string;
  role: "parent" | "enfant";
  age: number | null;
  accessStatus: AccessStatus | null;
  rdvPriveAutorise: boolean;
  signatureColor: string;
  darkModeEnabled: boolean;
  linkedAccountId: string | null;
}

export interface FamilyState {
  member: FamilyMember;
  family: Family;
  members: FamilyMember[];
}
