"use client";

import { useState, useTransition } from "react";
import { getStore } from "@/shared/data/getStore";
import { addExpense } from "../repository";
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

const today = () => toDateString(new Date());

export function AddExpenseSheet({ open, onClose, familyId, categories, members }: AddExpenseSheetProps) {
  const [amount, setAmount] = useState("");
  const [chosenCategoryId, setCategoryId] = useState("");
  const [chosenResponsibleId, setResponsibleId] = useState("");
  const categoryId = chosenCategoryId || categories[0]?.id || "";
  const responsibleId = chosenResponsibleId || members[0]?.id || "";
  const [spentOn, setSpentOn] = useState(today());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  const reset = () => {
    setAmount("");
    setNote("");
    setSpentOn(today());
    setError(null);
  };

  const handleSubmit = () => {
    const parsed = addExpenseFormSchema.safeParse({
      amount,
      categoryId,
      responsibleId: responsibleId || null,
      spentOn,
      note: note || null,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await addExpense(getStore(), {
          familyId,
          categoryId: parsed.data.categoryId,
          amountMinorUnits: toMinorUnits(parsed.data.amount),
          responsibleId: parsed.data.responsibleId,
          spentOn: parsed.data.spentOn,
          note: parsed.data.note,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Impossible d'enregistrer la dépense");
        return;
      }
      reset();
      onClose();
    });
  };

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
          </select>
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

        {error ? <div className={styles.error}>{error}</div> : null}

        <button className={styles.submit} onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
