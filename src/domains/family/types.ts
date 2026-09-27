export interface Family {
  id: string;
  name: string;
  currency: string;
  securityLevel: "libre" | "accueil_protege" | "tout_protege";
}

export interface FamilyMember {
  id: string;
  familyId: string;
  name: string;
  role: "parent" | "enfant";
  signatureColor: string;
  darkModeEnabled: boolean;
  linkedAccountId: string | null;
}
