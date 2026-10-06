"use client";

import type { ReactNode } from "react";
import type { OnboardingDraft } from "../../answers";
import styles from "../OnboardingWizard.module.css";

export interface StepProps {
  draft: OnboardingDraft;
  update: (patch: Partial<OnboardingDraft>) => void;
}

export function StepHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <>
      <div className={styles.title}>{title}</div>
      {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
    </>
  );
}

export function ChoiceCard({
  title,
  description,
  active,
  onClick,
}: {
  title: string;
  description?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button className={[styles.choiceCard, active ? styles.choiceCardActive : ""].join(" ")} onClick={onClick}>
      <div className={styles.choiceTitle}>{title}</div>
      {description && <div className={styles.choiceSub}>{description}</div>}
    </button>
  );
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button className={[styles.tag, active ? styles.tagActive : ""].join(" ")} onClick={onClick}>
      {children}
    </button>
  );
}

export function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}

export const inputClass = styles.input;
export const rowClass = styles.tagGrid;
export const hintClass = styles.hint;
export const sectionLabelClass = styles.sectionLabel;
export const bodyClass = styles.body;
