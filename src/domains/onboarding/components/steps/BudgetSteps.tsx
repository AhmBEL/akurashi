"use client";

import { FIXED_CHARGE_OPTIONS } from "@/domains/budget/defaults";
import type { FixedChargeDraft } from "../../answers";
import styles from "../OnboardingWizard.module.css";
import { bodyClass, Chip, Field, hintClass, inputClass, rowClass, StepHeader, type StepProps } from "./ui";

export function BudgetStep({ draft, update }: StepProps) {
  const enabled = draft.budgetEnabled ?? true;
  return (
    <>
      <StepHeader title="Activer le budget ?" subtitle="Désactivé, l'onglet et la carte Budget disparaissent de l'app." />
      <div className={bodyClass}>
        <div className={rowClass}>
          <Chip active={enabled} onClick={() => update({ budgetEnabled: true })}>Oui</Chip>
          <Chip active={!enabled} onClick={() => update({ budgetEnabled: false })}>Non</Chip>
        </div>
        {enabled && (
          <Field label="Jour de remise à zéro du mois" htmlFor="reset-day">
            <select
              id="reset-day"
              className={inputClass}
              value={draft.budgetResetDay ?? 1}
              onChange={(e) => update({ budgetResetDay: Number(e.target.value) })}
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day}>
                  Le {day}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
    </>
  );
}

export function ChargesStep({ draft, update }: StepProps) {
  const charges = draft.fixedCharges ?? [];
  const find = (name: string) => charges.find((charge) => charge.name === name);

  const toggle = (name: string) =>
    update({ fixedCharges: find(name) ? charges.filter((c) => c.name !== name) : [...charges, { name }] });
  const setAmount = (name: string, amount: number | null) =>
    update({ fixedCharges: charges.map((c): FixedChargeDraft => (c.name === name ? { ...c, amount } : c)) });

  return (
    <>
      <StepHeader
        title="Tes charges fixes"
        subtitle="Coche celles qui te concernent, avec un montant si tu veux. Elles démarrent « à faire » (rouge) chaque mois."
      />
      <div className={bodyClass}>
        {FIXED_CHARGE_OPTIONS.map((name) => {
          const charge = find(name);
          return (
            <div key={name} className={styles.chargeRow}>
              <button
                className={[styles.tag, charge ? styles.tagActive : ""].join(" ")}
                onClick={() => toggle(name)}
              >
                {name}
              </button>
              {charge && (
                <input
                  className={inputClass}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  aria-label={`Montant ${name}`}
                  placeholder="Montant"
                  value={charge.amount ?? ""}
                  onChange={(e) => setAmount(name, e.target.value === "" ? null : Number(e.target.value))}
                />
              )}
            </div>
          );
        })}
        <div className={hintClass}>Sans montant, la charge est créée à 0 et tu pourras la renseigner plus tard.</div>
      </div>
    </>
  );
}

export function TargetsStep({ draft, update }: StepProps) {
  return (
    <>
      <StepHeader
        title="Tes plafonds"
        subtitle="Deux jauges sur l'accueil : courses (par semaine) et loisirs (par mois). Sans plafond, la jauge reste à 0 %."
      />
      <div className={bodyClass}>
        <Field label="Courses — plafond par semaine" htmlFor="courses-target">
          <input
            id="courses-target"
            className={inputClass}
            type="number"
            inputMode="decimal"
            min={0}
            value={draft.coursesTarget ?? ""}
            onChange={(e) => update({ coursesTarget: e.target.value === "" ? null : Number(e.target.value) })}
            placeholder="Sans plafond"
          />
        </Field>
        <Field label="Loisirs — plafond par mois" htmlFor="loisirs-target">
          <input
            id="loisirs-target"
            className={inputClass}
            type="number"
            inputMode="decimal"
            min={0}
            value={draft.loisirsTarget ?? ""}
            onChange={(e) => update({ loisirsTarget: e.target.value === "" ? null : Number(e.target.value) })}
            placeholder="Sans plafond"
          />
        </Field>
      </div>
    </>
  );
}
