"use client";

import { useState, useTransition } from "react";
import { getStore } from "@/shared/data/getStore";
import { now } from "@/shared/lib/clock";
import { useAppData } from "@/shared/session/AppDataContext";
import { hasOtherParent } from "@/domains/family/settings";
import { Chip } from "@/domains/onboarding/components/steps/ui";
import { addExpense, type ExpenseType } from "../repository";
import { addExpenseFormSchema } from "../validation";
import { toMinorUnits } from "@/shared/lib/money";
import { toDateString } from "@/shared/lib/date";
import styles from "./AddExpenseSheet.module.css";

interface CategoryOption {
  id: string;
  name: string;
}

interface MemberOption {
  id: string;
  name: string;
}

interface AddExpenseSheetProps {
  open: boolean;
  onClose: () => void;
  familyId: string;
  categories: CategoryOption[];
  members: MemberOption[];
}

const today = () => toDateString(now());
const NEW_CATEGORY = "__new__";

// Ajout rapide d'une dépense : raccourcis en un tap, type prévue / imprévue,
// catégorie libre, et « à faire valider » par l'autre parent.
export function AddExpenseSheet({ open, onClose, familyId, categories, members }: AddExpenseSheetProps) {
  const { member, family, members: familyMembers } = useAppData();
  const [amount, setAmount] = useState("");
  const [chosenCategoryId, setCategoryId] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [chosenResponsibleId, setResponsibleId] = useState("");
  const [type, setType] = useState<ExpenseType>("variable_prevue");
  const [needsValidation, setNeedsValidation] = useState(false);
  const categoryId = chosenCategoryId || categories[0]?.id || NEW_CATEGORY;
  const responsibleId = chosenResponsibleId || members[0]?.id || "";
  const [spentOn, setSpentOn] = useState(today());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  const canRequestValidation =
    member.role === "parent" &&
    hasOtherParent(family.settings) &&
    familyMembers.some((candidate) => candidate.role === "parent" && candidate.id !== member.id);
  const creatingCategory = categoryId === NEW_CATEGORY;

  const reset = () => {
    setAmount("");
    setNote("");
    setSpentOn(today());
    setNewCategoryName("");
    setNeedsValidation(false);
    setError(null);
  };

  const handleSubmit = () => {
    const parsed = addExpenseFormSchema.safeParse({
      amount,
      categoryId: creatingCategory ? "" : categoryId,
      newCategoryName: creatingCategory ? newCategoryName.trim() || null : null,
      responsibleId: responsibleId || null,
      spentOn,
      note: note.trim() || null,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide");
      return;
    }
    if (!parsed.data.categoryId && !parsed.data.newCategoryName) {
      setError("Choisis ou crée une catégorie");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await addExpense(getStore(), {
          familyId,
          actorId: member.id,
          categoryId: parsed.data.categoryId || null,
          newCategoryName: parsed.data.newCategoryName,
          amountMinorUnits: toMinorUnits(parsed.data.amount),
          financialType: type,
          responsibleId: parsed.data.responsibleId,
          spentOn: parsed.data.spentOn,
          note: parsed.data.note,
          requestValidation: canRequestValidation && needsValidation,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Impossible d'enregistrer la dépense");
        return;
      }
      reset();
      onClose();
    });
  };

  const shortcuts = family.settings.expenseShortcuts;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <button className={styles.cancel} onClick={onClose}>
            Annuler
          </button>
          <div className={styles.headTitle}>Nouvelle dépense</div>
          <span style={{ width: 44 }} />
        </div>

        {shortcuts.length > 0 && (
          <div className={styles.field}>
            <label>Raccourcis</label>
            <div className={styles.chips}>
              {shortcuts.map((shortcut) => (
                <Chip key={shortcut} active={note === shortcut} onClick={() => setNote(note === shortcut ? "" : shortcut)}>
                  {shortcut}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <div className={styles.field}>
          <label htmlFor="expense-amount">Montant</label>
          <input
            id="expense-amount"
            className={styles.input}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />
        </div>

        <div className={styles.field}>
          <label>Type</label>
          <div className={styles.chips}>
            <Chip active={type === "variable_prevue"} onClick={() => setType("variable_prevue")}>Prévue</Chip>
            <Chip active={type === "variable_imprevue"} onClick={() => setType("variable_imprevue")}>Imprévue</Chip>
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="expense-category">Catégorie</label>
          <select
            id="expense-category"
            className={styles.select}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value={NEW_CATEGORY}>Autre catégorie…</option>
          </select>
          {creatingCategory && (
            <input
              aria-label="Nom de la nouvelle catégorie"
              className={styles.input}
              style={{ marginTop: 8 }}
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Nom de la catégorie"
            />
          )}
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="expense-date">Date</label>
            <input
              id="expense-date"
              className={styles.input}
              type="date"
              value={spentOn}
              onChange={(e) => setSpentOn(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="expense-payer">Payé par</label>
            <select
              id="expense-payer"
              className={styles.select}
              value={responsibleId}
              onChange={(e) => setResponsibleId(e.target.value)}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="expense-note">Note (optionnel)</label>
          <input
            id="expense-note"
            className={styles.input}
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="optionnel"
          />
        </div>

        {canRequestValidation && (
          <div className={styles.field}>
            <div className={styles.chips}>
              <Chip active={needsValidation} onClick={() => setNeedsValidation(!needsValidation)}>
                À faire valider par l&rsquo;autre parent
              </Chip>
            </div>
            {needsValidation && <div className={styles.hint}>Elle ne comptera dans les jauges qu&rsquo;une fois validée.</div>}
          </div>
        )}

        {error ? <div className={styles.error}>{error}</div> : null}

        <button className={styles.submit} onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
