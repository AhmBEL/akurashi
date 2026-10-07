import type { Database } from "@/shared/lib/supabase/database.types";
import type { DataStore, NewRow } from "@/shared/data/types";
import { now } from "@/shared/lib/clock";
import { startOfWeek, toDateString } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/money";
import { notify } from "@/domains/notifications/repository";
import { parseFamilySettings } from "@/domains/family/settings";
import { VARIABLE_AMOUNT_CHARGES } from "./defaults";
import { buildCharges, isFixedLine, monthStatus } from "./services/charges";
import { computeGauges, computeHomeBudgetSummary } from "./services/computeHomeBudgetSummary";
import { buildBilan, buildHistory, type Bilan, type PeriodRecap } from "./services/history";
import { daysUntil, periodBounds, shiftPeriod } from "./services/period";
import type {
  ChargeView,
  HomeBudgetGauge,
  HomeBudgetSummary,
  MonthStatus,
  Periodicity,
  RuleCategory,
  RuleCycle,
  RuleLine,
  ValidationStatus,
} from "./types";

// Le seul endroit autorisé à lire/écrire `budget_categories`, `budget_lines`
// et `budget_line_cycles`, toujours via le DataStore.

type Tables = Database["public"]["Tables"];
type CategoryRow = Tables["budget_categories"]["Row"];
type LineRow = Tables["budget_lines"]["Row"];
type CycleRow = Tables["budget_line_cycles"]["Row"];
type FamilyRow = Tables["families"]["Row"];
type MemberRow = Tables["family_members"]["Row"];

export type TargetPeriod = CategoryRow["target_period"];
export type ExpenseType = "variable_prevue" | "variable_imprevue";

interface BudgetContext {
  resetDay: number;
  currency: string;
  categories: CategoryRow[];
  lines: LineRow[];
  cycles: CycleRow[];
}

const nextWeek = (monday: Date) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7);

async function loadContext(store: DataStore, familyId: string): Promise<BudgetContext> {
  const [family, categories, lines, cycles] = await Promise.all([
    store.get<FamilyRow>("families", familyId),
    store.list<CategoryRow>("budget_categories", { family_id: familyId }),
    store.list<LineRow>("budget_lines", { family_id: familyId }),
    store.list<CycleRow>("budget_line_cycles"),
  ]);
  const lineIds = new Set(lines.map((line) => line.id));
  return {
    resetDay: parseFamilySettings(family?.settings).budgetResetDay,
    currency: family?.currency ?? "EUR",
    categories,
    lines,
    cycles: cycles.filter((cycle) => lineIds.has(cycle.budget_line_id)),
  };
}

const activeParents = async (store: DataStore, familyId: string): Promise<MemberRow[]> =>
  (await store.list<MemberRow>("family_members", { family_id: familyId })).filter((m) => !m.deleted_at && m.role === "parent");

function homeInput(context: BudgetContext, today: Date) {
  const period = periodBounds(today, context.resetDay);
  const monday = startOfWeek(today);
  return {
    categories: context.categories as RuleCategory[],
    lines: context.lines as RuleLine[],
    cycles: context.cycles as RuleCycle[],
    resetDay: context.resetDay,
    today: toDateString(today),
    periodStart: period.start,
    nextPeriodStart: period.nextStart,
    weekStart: toDateString(monday),
    nextWeekStart: toDateString(nextWeek(monday)),
  };
}

export async function getHomeBudgetSummary(store: DataStore, familyId: string, today: Date = now()): Promise<HomeBudgetSummary> {
  return computeHomeBudgetSummary(homeInput(await loadContext(store, familyId), today));
}

// ---------------------------------------------------------------- catégories

export async function getCategoryOptions(store: DataStore, familyId: string): Promise<Array<{ id: string; name: string }>> {
  const [categories, lines] = await Promise.all([
    store.list<CategoryRow>("budget_categories", { family_id: familyId }),
    store.list<LineRow>("budget_lines", { family_id: familyId }),
  ]);
  // Les catégories propres à une charge fixe (« Mobile »…) ne servent pas aux dépenses.
  const chargeCategories = new Set(lines.filter((line) => isFixedLine(line)).map((line) => line.category_id));
  return categories
    .filter((category) => !chargeCategories.has(category.id))
    .map(({ id, name }) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export interface CreateCategoryInput {
  familyId: string;
  name: string;
  showOnHome: boolean;
  targetAmount: number | null;
  targetPeriod: TargetPeriod;
}

export async function createBudgetCategory(store: DataStore, input: CreateCategoryInput): Promise<string> {
  const row = await store.create<CategoryRow>("budget_categories", {
    family_id: input.familyId,
    name: input.name,
    target_amount: input.targetAmount,
    target_period: input.targetPeriod,
    show_on_home: input.showOnHome,
  } satisfies NewRow<CategoryRow>);
  return row.id;
}

const sameName = (a: string, b: string) => a.trim().toLocaleLowerCase("fr") === b.trim().toLocaleLowerCase("fr");

// ------------------------------------------------------------------- dépenses

export interface AddExpenseInput {
  familyId: string;
  actorId: string | null;
  // Une catégorie existante, ou le nom d'une nouvelle (créée si elle n'existe pas).
  categoryId: string | null;
  newCategoryName?: string | null;
  amountMinorUnits: number;
  financialType?: ExpenseType;
  responsibleId: string | null;
  spentOn: string;
  note: string | null;
  taskId?: string | null;
  // Faire valider par l'autre parent. Sans autre parent, la dépense est validée directement.
  requestValidation?: boolean;
}

export async function addExpense(store: DataStore, input: AddExpenseInput): Promise<{ id: string; status: ValidationStatus }> {
  let categoryId = input.categoryId;
  let categoryName: string | null = null;
  if (!categoryId) {
    const name = input.newCategoryName?.trim();
    if (!name) throw new Error("Choisis ou crée une catégorie.");
    const existing = (await store.list<CategoryRow>("budget_categories", { family_id: input.familyId })).find((c) => sameName(c.name, name));
    categoryId = existing
      ? existing.id
      : await createBudgetCategory(store, { familyId: input.familyId, name, showOnHome: false, targetAmount: null, targetPeriod: "month" });
    categoryName = existing?.name ?? name;
  }

  const otherParents = input.actorId ? (await activeParents(store, input.familyId)).filter((p) => p.id !== input.actorId) : [];
  const proposed = Boolean(input.requestValidation) && input.actorId !== null && otherParents.length > 0;
  const status: ValidationStatus = proposed ? "proposee" : "validee";

  const row = await store.create<LineRow>("budget_lines", {
    family_id: input.familyId,
    category_id: categoryId,
    financial_type: input.financialType ?? "variable_prevue",
    amount: input.amountMinorUnits,
    periodicity: null,
    spent_on: input.spentOn,
    responsible_id: input.responsibleId,
    visibility: "family",
    validation_status: status,
    proposed_by: proposed ? input.actorId : null,
    task_id: input.taskId ?? null,
    receipt_photo_url: null,
    note: input.note,
    is_direct_debit: false,
    debit_day: null,
  } satisfies NewRow<LineRow>);

  if (proposed && input.actorId) {
    const [family, proposer] = await Promise.all([
      store.get<FamilyRow>("families", input.familyId),
      store.get<MemberRow>("family_members", input.actorId),
    ]);
    if (!categoryName) categoryName = (await store.get<CategoryRow>("budget_categories", categoryId))?.name ?? "";
    for (const parent of otherParents) {
      await notify(store, {
        familyId: input.familyId,
        recipientId: parent.id,
        category: "depense_a_valider",
        title: `${proposer?.name ?? "Un parent"} propose une dépense de ${formatMoney(input.amountMinorUnits, family?.currency ?? "EUR")}`,
        body: input.note || categoryName,
      });
    }
  }
  return { id: row.id, status };
}

export interface ValidateExpenseInput {
  lineId: string;
  actorId: string;
  decision: "validee" | "ajustee" | "refusee";
  amountMinorUnits?: number;
}

// L'autre parent valide, ajuste (nouveau montant) ou refuse une dépense proposée.
export async function validateExpense(store: DataStore, input: ValidateExpenseInput): Promise<void> {
  const line = await store.get<LineRow>("budget_lines", input.lineId);
  if (!line || line.validation_status !== "proposee") throw new Error("Cette dépense n'est plus à valider.");
  const actor = await store.get<MemberRow>("family_members", input.actorId);
  if (!actor || actor.role !== "parent" || actor.id === line.proposed_by) throw new Error("Seul l'autre parent peut valider cette dépense.");
  if (input.decision === "ajustee" && !(input.amountMinorUnits && input.amountMinorUnits > 0)) throw new Error("Indique le nouveau montant.");

  const amount = input.decision === "ajustee" ? (input.amountMinorUnits as number) : line.amount;
  await store.update<LineRow>("budget_lines", line.id, { validation_status: input.decision, amount });

  if (line.proposed_by) {
    const [family, category] = await Promise.all([
      store.get<FamilyRow>("families", line.family_id),
      store.get<CategoryRow>("budget_categories", line.category_id),
    ]);
    const currency = family?.currency ?? "EUR";
    const label = line.note || category?.name || "dépense";
    const title = {
      validee: `${actor.name} a validé « ${label} »`,
      ajustee: `${actor.name} a ajusté « ${label} » à ${formatMoney(amount, currency)}`,
      refusee: `${actor.name} a refusé « ${label} »`,
    }[input.decision];
    await notify(store, { familyId: line.family_id, recipientId: line.proposed_by, category: "depense_decidee", title });
  }
}

// -------------------------------------------------------------------- charges

export interface CreateFixedChargeInput {
  familyId: string;
  name: string;
  amountMinorUnits: number | null;
  responsibleId: string | null;
  periodicity?: Periodicity;
  // Par défaut : montant variable pour les charges connues comme telles (électricité, eau…).
  isVariableAmount?: boolean;
  isDirectDebit?: boolean;
  debitDay?: number | null;
  today?: Date;
}

function checkDebitDay(isDirectDebit: boolean, debitDay: number | null): number | null {
  if (!isDirectDebit) return null;
  if (!debitDay || !Number.isInteger(debitDay) || debitDay < 1 || debitDay > 28) throw new Error("Choisis un jour de prélèvement entre 1 et 28.");
  return debitDay;
}

// Une charge fixe = sa catégorie + sa ligne + le cycle de la période en cours
// « non payé » (rouge tant qu'elle n'est pas cochée, ni prélevée).
export async function createFixedCharge(store: DataStore, input: CreateFixedChargeInput): Promise<void> {
  const today = input.today ?? now();
  const isDirectDebit = Boolean(input.isDirectDebit);
  const debitDay = checkDebitDay(isDirectDebit, input.debitDay ?? null);
  const context = await loadContext(store, input.familyId);
  if (context.categories.some((category) => sameName(category.name, input.name))) {
    throw new Error(`« ${input.name.trim()} » existe déjà.`);
  }

  const categoryId = await createBudgetCategory(store, {
    familyId: input.familyId,
    name: input.name.trim(),
    showOnHome: false,
    targetAmount: null,
    targetPeriod: "month",
  });

  const variable = input.isVariableAmount ?? VARIABLE_AMOUNT_CHARGES.includes(input.name);
  const line = await store.create<LineRow>("budget_lines", {
    family_id: input.familyId,
    category_id: categoryId,
    financial_type: variable ? "fixe_variable" : "fixe_fixe",
    amount: input.amountMinorUnits ?? 0,
    periodicity: input.periodicity ?? "mensuel",
    spent_on: toDateString(today),
    responsible_id: input.responsibleId,
    visibility: "family",
    validation_status: "validee",
    proposed_by: null,
    task_id: null,
    receipt_photo_url: null,
    note: null,
    is_direct_debit: isDirectDebit,
    debit_day: debitDay,
  } satisfies NewRow<LineRow>);

  await store.create<CycleRow>("budget_line_cycles", {
    budget_line_id: line.id,
    period_month: periodBounds(today, context.resetDay).start,
    status: "non_paye",
    paid_at: null,
    amount: null,
  } satisfies NewRow<CycleRow>);
}

export interface UpdateChargeInput {
  amountMinorUnits?: number;
  periodicity?: Periodicity;
  isDirectDebit?: boolean;
  debitDay?: number | null;
}

export async function updateCharge(store: DataStore, lineId: string, patch: UpdateChargeInput): Promise<void> {
  const line = await store.get<LineRow>("budget_lines", lineId);
  if (!line) throw new Error("Charge introuvable.");
  const isDirectDebit = patch.isDirectDebit ?? line.is_direct_debit;
  const debitDay = checkDebitDay(isDirectDebit, patch.debitDay !== undefined ? patch.debitDay : line.debit_day);
  await store.update<LineRow>("budget_lines", lineId, {
    ...(patch.amountMinorUnits !== undefined ? { amount: patch.amountMinorUnits } : {}),
    ...(patch.periodicity ? { periodicity: patch.periodicity } : {}),
    is_direct_debit: isDirectDebit,
    debit_day: debitDay,
  });
}

// Supprime une charge, ses cycles et sa catégorie si plus rien ne s'y rattache.
export async function removeCharge(store: DataStore, lineId: string): Promise<void> {
  const line = await store.get<LineRow>("budget_lines", lineId);
  if (!line) return;
  for (const cycle of await store.list<CycleRow>("budget_line_cycles", { budget_line_id: lineId })) {
    await store.remove("budget_line_cycles", cycle.id);
  }
  await store.remove("budget_lines", lineId);
  const stillUsed = (await store.list<LineRow>("budget_lines", { category_id: line.category_id })).length > 0;
  const category = await store.get<CategoryRow>("budget_categories", line.category_id);
  if (!stillUsed && category && !category.show_on_home) await store.remove("budget_categories", category.id);
}

async function upsertCycle(
  store: DataStore,
  lineId: string,
  periodStart: string,
  patch: Partial<Pick<CycleRow, "status" | "paid_at" | "amount">>
): Promise<void> {
  const existing = (await store.list<CycleRow>("budget_line_cycles", { budget_line_id: lineId })).find(
    (cycle) => cycle.period_month === periodStart
  );
  if (existing) {
    await store.update<CycleRow>("budget_line_cycles", existing.id, patch);
    return;
  }
  await store.create<CycleRow>("budget_line_cycles", {
    budget_line_id: lineId,
    period_month: periodStart,
    status: "non_paye",
    paid_at: null,
    amount: null,
    ...patch,
  } satisfies NewRow<CycleRow>);
}

// Cocher / décocher une charge « à faire » pour la période.
export async function toggleChargePaid(store: DataStore, lineId: string, periodStart: string, paid: boolean, today: Date = now()): Promise<void> {
  await upsertCycle(store, lineId, periodStart, { status: paid ? "paye" : "non_paye", paid_at: paid ? today.toISOString() : null });
}

// Montant réel de la période (électricité, eau… : il change chaque fois).
export async function setChargeAmount(store: DataStore, lineId: string, periodStart: string, amountMinorUnits: number | null): Promise<void> {
  await upsertCycle(store, lineId, periodStart, { amount: amountMinorUnits });
}

// Valide les prélèvements dont le jour est arrivé (idempotent). L'état affiché
// est de toute façon dérivé par la règle pure ; ceci le rend aussi durable.
export async function settleDirectDebits(store: DataStore, familyId: string, today: Date = now()): Promise<number> {
  const context = await loadContext(store, familyId);
  const period = periodBounds(today, context.resetDay);
  const charges = buildCharges({
    lines: context.lines as RuleLine[],
    cycles: context.cycles as RuleCycle[],
    resetDay: context.resetDay,
    periodStart: period.start,
    today: toDateString(today),
  });
  const due = charges.filter((charge) => charge.autoPaid && !charge.cyclePaid);
  for (const charge of due) {
    await upsertCycle(store, charge.lineId, period.start, { status: "paye", paid_at: today.toISOString() });
  }
  return due.length;
}

// ------------------------------------------------------------ jauges d'accueil

export interface HomeCategory {
  id: string;
  name: string;
  targetAmount: number | null;
  targetPeriod: TargetPeriod;
}

// Catégories qui alimentent les jauges de l'accueil (plafond modifiable dans Réglages).
export async function getHomeCategories(store: DataStore, familyId: string): Promise<HomeCategory[]> {
  const categories = await store.list<CategoryRow>("budget_categories", { family_id: familyId });
  return categories
    .filter((category) => category.show_on_home)
    .map((category) => ({
      id: category.id,
      name: category.name,
      targetAmount: category.target_amount,
      targetPeriod: category.target_period,
    }));
}

export async function updateBudgetTarget(
  store: DataStore,
  categoryId: string,
  targetAmount: number | null,
  targetPeriod: TargetPeriod
): Promise<void> {
  await store.update<CategoryRow>("budget_categories", categoryId, {
    target_amount: targetAmount,
    target_period: targetPeriod,
  });
}

// ---------------------------------------------------------------- écran Budget

export interface ChargeRowView extends ChargeView {
  name: string;
}

export interface ExpenseView {
  id: string;
  label: string;
  categoryName: string;
  amount: number;
  spentOn: string;
  status: ValidationStatus;
  financialType: ExpenseType;
  proposedById: string | null;
  proposedByName: string | null;
  linkedToTask: boolean;
}

export interface BudgetPageData {
  currency: string;
  resetDay: number;
  periodStart: string;
  nextPeriodStart: string;
  daysLeft: number;
  status: MonthStatus | null;
  fixedCharges: ChargeRowView[];
  variableCharges: ChargeRowView[];
  plannedExpenses: ExpenseView[];
  unplannedExpenses: ExpenseView[];
  toValidate: ExpenseView[];
  gauges: HomeBudgetGauge[];
  history: PeriodRecap[];
  bilan: Bilan | null;
  hasOtherParent: boolean;
}

export async function getBudgetPage(store: DataStore, familyId: string, memberId: string, today: Date = now()): Promise<BudgetPageData> {
  const context = await loadContext(store, familyId);
  const members = await store.list<MemberRow>("family_members", { family_id: familyId });
  const memberName = new Map(members.map((member) => [member.id, member.name]));
  const categoryName = new Map(context.categories.map((category) => [category.id, category.name]));

  const input = homeInput(context, today);
  const charges = buildCharges(input);
  const named = (charge: ChargeView): ChargeRowView => ({ ...charge, name: categoryName.get(charge.categoryId) ?? "Charge" });
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "fr");

  const toExpense = (line: LineRow): ExpenseView => ({
    id: line.id,
    label: line.note || categoryName.get(line.category_id) || "Dépense",
    categoryName: categoryName.get(line.category_id) ?? "",
    amount: line.amount,
    spentOn: line.spent_on,
    status: line.validation_status,
    financialType: line.financial_type as ExpenseType,
    proposedById: line.proposed_by,
    proposedByName: line.proposed_by ? (memberName.get(line.proposed_by) ?? null) : null,
    linkedToTask: line.task_id !== null,
  });
  const newestFirst = (a: ExpenseView, b: ExpenseView) => b.spentOn.localeCompare(a.spentOn);

  const expenses = context.lines.filter((line) => !isFixedLine(line as RuleLine) && line.validation_status !== "refusee");
  const inPeriod = expenses.filter(
    (line) => line.validation_status !== "proposee" && line.spent_on >= input.periodStart && line.spent_on < input.nextPeriodStart
  );

  const history = buildHistory({
    lines: input.lines,
    cycles: input.cycles,
    resetDay: context.resetDay,
    currentPeriodStart: input.periodStart,
    today: input.today,
  });
  const previousStart = shiftPeriod(input.periodStart, -1);
  const previous = history[0]?.start === previousStart.start ? history[0] : null;
  const previousSpends = computeGauges({
    ...input,
    categories: input.categories.filter((category) => category.target_period === "month"),
    periodStart: previousStart.start,
    nextPeriodStart: previousStart.nextStart,
  }).map((gauge) => ({ name: gauge.label, spent: gauge.spentAmount, target: gauge.targetAmount }));

  const hasOtherParent = (await activeParents(store, familyId)).some((parent) => parent.id !== memberId);

  return {
    currency: context.currency,
    resetDay: context.resetDay,
    periodStart: input.periodStart,
    nextPeriodStart: input.nextPeriodStart,
    daysLeft: daysUntil(input.nextPeriodStart, input.today),
    status: monthStatus(charges),
    fixedCharges: charges.filter((charge) => charge.financialType === "fixe_fixe").map(named).sort(byName),
    variableCharges: charges.filter((charge) => charge.financialType === "fixe_variable").map(named).sort(byName),
    plannedExpenses: inPeriod.filter((line) => line.financial_type === "variable_prevue").map(toExpense).sort(newestFirst),
    unplannedExpenses: inPeriod.filter((line) => line.financial_type === "variable_imprevue").map(toExpense).sort(newestFirst),
    toValidate: expenses.filter((line) => line.validation_status === "proposee").map(toExpense).sort(newestFirst),
    gauges: computeGauges(input),
    history,
    bilan: buildBilan(previous, previousSpends),
    hasOtherParent,
  };
}
