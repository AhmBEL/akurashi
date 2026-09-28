import type { Family, FamilyMember } from "@/domains/family/types";
import type { HomeTask } from "@/domains/tasks/types";
import type { HomeBudgetSummary } from "@/domains/budget/types";

// Fixture data for mock mode (see mockMode.ts). Never used when
// NEXT_PUBLIC_MOCK_MODE is unset — purely a dev/demo scaffold.

export const MOCK_FAMILY: Family = {
  id: "mock-family",
  name: "Famille de démonstration",
  currency: "EUR",
  securityLevel: "accueil_protege",
};

export const MOCK_MEMBERS: FamilyMember[] = [
  { id: "mock-parent-1", familyId: "mock-family", name: "Parent 1", role: "parent", signatureColor: "sauge", darkModeEnabled: false, linkedAccountId: "mock" },
  { id: "mock-parent-2", familyId: "mock-family", name: "Parent 2", role: "parent", signatureColor: "ardoise", darkModeEnabled: false, linkedAccountId: "mock" },
  { id: "mock-child-1", familyId: "mock-family", name: "Enfant 1", role: "enfant", signatureColor: "prune", darkModeEnabled: false, linkedAccountId: null },
];

export const MOCK_CURRENT_MEMBER: FamilyMember = MOCK_MEMBERS[0];

export const MOCK_TASKS: HomeTask[] = [
  { id: "mock-task-1", title: "Sortir les poubelles", dueDate: "2026-09-28", completedAt: null, subject: { id: "mock-parent-1", name: "Parent 1", signatureColor: "sauge" } },
  { id: "mock-task-2", title: "Relevé bancaire", dueDate: "2026-09-28", completedAt: null, subject: { id: "mock-parent-2", name: "Parent 2", signatureColor: "ardoise" } },
  { id: "mock-task-3", title: "Devoirs de lecture", dueDate: "2026-09-27", completedAt: null, subject: { id: "mock-child-1", name: "Enfant 1", signatureColor: "prune" } },
];

export const MOCK_BUDGET_SUMMARY: HomeBudgetSummary = {
  fixedChargesStatus: "orange",
  gauges: [
    { categoryId: "mock-courses", label: "Courses", spentAmount: 8500, targetAmount: 12000, pct: 71 },
    { categoryId: "mock-loisirs", label: "Loisirs", spentAmount: 6000, targetAmount: 15000, pct: 40 },
  ],
};

export const MOCK_BUDGET_CATEGORIES = [
  { id: "mock-courses", name: "Courses" },
  { id: "mock-loisirs", name: "Loisirs" },
  { id: "mock-logement", name: "Logement" },
];
