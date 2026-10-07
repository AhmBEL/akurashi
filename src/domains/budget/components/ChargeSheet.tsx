"use client";

import { useState, useTransition } from "react";
import { getStore } from "@/shared/data/getStore";
import { toMinorUnits } from "@/shared/lib/money";
import { useAppData } from "@/shared/session/AppDataContext";
import { Chip } from "@/domains/onboarding/components/steps/ui";
import { FIXED_CHARGE_OPTIONS, VARIABLE_AMOUNT_CHARGES } from "../defaults";
import { createFixedCharge } from "../repository";
import type { Periodicity } from "../types";
import styles from "./AddExpenseSheet.module.css";

const PERIODICITIES: Array<{ value: Periodicity; label: string }> = [
  { value: "mensuel", label: "Chaque mois" },
  { value: "trimestriel", label: "Tous les 3 mois" },
  { value: "annuel", label: "Chaque année" },
];

// Ajout d'une charge fixe : montant fixe ou variable, périodicité, et soit « à
// faire » (cochée à la main), soit prélèvement à un jour donné (validé seul).
export function ChargeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { member, family } = useAppData();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [periodicity, setPeriodicity] = useState<Periodicity>("mensuel");
  const [variable, setVariable] = useState(false);
  const [directDebit, setDirectDebit] = useState(false);
  const [debitDay, setDebitDay] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  const chooseName = (value: string) => {
    setName(value);
    setVariable(VARIABLE_AMOUNT_CHARGES.includes(value));
  };

  const submit = () => {
    if (!name.trim()) {
      setError("Donne un nom à la charge");
      return;
    }
    const parsedAmount = amount === "" ? null : Number(amount);
    if (parsedAmount !== null && !(parsedAmount >= 0)) {
      setError("Le montant ne peut pas être négatif");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await createFixedCharge(getStore(), {
          familyId: family.id,
          name,
          amountMinorUnits: parsedAmount === null ? null : toMinorUnits(parsedAmount),
          responsibleId: member.id,
          periodicity,
          isVariableAmount: variable,
          isDirectDebit: directDebit,
          debitDay: directDebit ? debitDay : null,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Impossible d'enregistrer la charge");
        return;
      }
      setName("");
      setAmount("");
      setPeriodicity("mensuel");
      setVariable(false);
      setDirectDebit(false);
      onClose();
    });
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <button className={styles.cancel} onClick={onClose}>Annuler</button>
          <div className={styles.headTitle}>Nouvelle charge fixe</div>
          <span style={{ width: 44 }} />
        </div>

        <div className={styles.field}>
          <label htmlFor="charge-name">Nom</label>
          <input id="charge-name" className={styles.input} value={name} onChange={(e) => chooseName(e.target.value)} placeholder="Téléphone, streaming…" />
          <div className={styles.chips} style={{ marginTop: 8 }}>
            {FIXED_CHARGE_OPTIONS.map((option) => (
              <Chip key={option} active={name === option} onClick={() => chooseName(option)}>{option}</Chip>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label>Montant</label>
          <div className={styles.chips}>
            <Chip active={!variable} onClick={() => setVariable(false)}>Toujours le même</Chip>
            <Chip active={variable} onClick={() => setVariable(true)}>Change chaque fois</Chip>
          </div>
          <input
            aria-label="Montant de la charge"
            className={styles.input}
            style={{ marginTop: 8 }}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={variable ? "Montant habituel (optionnel)" : "0"}
          />
        </div>

        <div className={styles.field}>
          <label>Fréquence</label>
          <div className={styles.chips}>
            {PERIODICITIES.map((option) => (
              <Chip key={option.value} active={periodicity === option.value} onClick={() => setPeriodicity(option.value)}>{option.label}</Chip>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label>Comment elle est réglée</label>
          <div className={styles.chips}>
            <Chip active={!directDebit} onClick={() => setDirectDebit(false)}>À faire à la main</Chip>
            <Chip active={directDebit} onClick={() => setDirectDebit(true)}>Prélèvement</Chip>
          </div>
          {directDebit && (
            <>
              <select aria-label="Jour de prélèvement" className={styles.select} style={{ marginTop: 8 }} value={debitDay} onChange={(e) => setDebitDay(Number(e.target.value))}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>Prélevée le {day}</option>
                ))}
              </select>
              <div className={styles.hint}>Elle restera « à venir » jusqu&rsquo;à ce jour, puis se validera toute seule.</div>
            </>
          )}
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <button className={styles.submit} onClick={submit} disabled={isPending}>
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
