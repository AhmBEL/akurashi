"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PillButton } from "@/shared/ui/PillButton";
import { getStore } from "@/shared/data/getStore";
import { getAuthUserId } from "@/shared/session/session";
import type { OnboardingDraft } from "../answers";
import { createFamilyFromOnboarding } from "../createFamily";
import { BudgetStep, ChargesStep, TargetsStep } from "./steps/BudgetSteps";
import { ChildStep, ChildrenStep, FamilyStep, OtherParentStep, ParentStep } from "./steps/FamilySteps";
import { ModulesStep, RecomposedStep, SecurityStep, TaskCategoriesStep } from "./steps/PreferenceSteps";
import styles from "./OnboardingWizard.module.css";

type Step =
  | { kind: "family" | "parent" | "otherParent" | "children" | "budget" | "charges" | "targets" }
  | { kind: "modules" | "taskCategories" | "security" | "recomposed" }
  | { kind: "child"; index: number };

// Les étapes dépendent des réponses : une page par enfant, et les étapes
// budget disparaissent si le budget est désactivé.
function buildSteps(draft: OnboardingDraft): Step[] {
  const steps: Step[] = [{ kind: "family" }, { kind: "parent" }, { kind: "otherParent" }, { kind: "children" }];
  (draft.children ?? []).forEach((_, index) => steps.push({ kind: "child", index }));
  steps.push({ kind: "budget" });
  if (draft.budgetEnabled !== false) steps.push({ kind: "charges" }, { kind: "targets" });
  steps.push({ kind: "modules" }, { kind: "taskCategories" }, { kind: "security" }, { kind: "recomposed" });
  return steps;
}

// « Passer » efface les réponses de l'écran : les valeurs par défaut s'appliquent.
function skipPatch(step: Step, draft: OnboardingDraft): Partial<OnboardingDraft> {
  switch (step.kind) {
    case "family": return { familyName: undefined, currency: undefined };
    case "parent": return { parentName: undefined, parentColor: undefined };
    case "otherParent": return { otherParent: undefined };
    case "children": return { children: [] };
    case "child":
      return {
        children: (draft.children ?? []).map((child, i) =>
          i === step.index ? { name: child.name, age: child.age } : child
        ),
      };
    case "budget": return { budgetEnabled: undefined, budgetResetDay: undefined };
    case "charges": return { fixedCharges: undefined };
    case "targets": return { coursesTarget: undefined, loisirsTarget: undefined };
    case "modules": return { modules: undefined };
    case "taskCategories": return { taskCategories: undefined };
    case "security": return { securityLevel: undefined };
    case "recomposed": return { recomposedFamily: undefined };
  }
}

export function OnboardingWizard() {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [joinSelected, setJoinSelected] = useState(false);
  const [draft, setDraft] = useState<OnboardingDraft>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const steps = useMemo(() => buildSteps(draft), [draft]);
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isLast = stepIndex >= steps.length - 1;

  const update = (patch: Partial<OnboardingDraft>) => setDraft((current) => ({ ...current, ...patch }));

  const submit = (finalDraft: OnboardingDraft) => {
    setError(null);
    startTransition(async () => {
      const result = await createFamilyFromOnboarding(getStore(), finalDraft, await getAuthUserId());
      if (result.error) {
        setError(result.error);
        return;
      }
      router.replace("/");
    });
  };

  const next = () => (isLast ? submit(draft) : setStepIndex((i) => i + 1));
  const skip = () => {
    const patch = skipPatch(step, draft);
    const patched = { ...draft, ...patch };
    setDraft(patched);
    if (isLast) submit(patched);
    else setStepIndex((i) => i + 1);
  };

  if (!started) {
    return (
      <div className={styles.screen}>
        <div className={styles.title}>Bienvenue</div>
        <div className={styles.subtitle}>Comment veux-tu commencer ? Toutes les questions sont facultatives.</div>
        <div className={styles.body}>
          <button className={styles.choiceCard} onClick={() => setStarted(true)}>
            <div className={styles.choiceTitle}>S&rsquo;inscrire</div>
            <div className={styles.choiceSub}>Créer une nouvelle famille sur Akurashi</div>
          </button>
          <button className={styles.choiceCard} onClick={() => setJoinSelected(true)}>
            <div className={styles.choiceTitle}>Rejoindre</div>
            <div className={styles.choiceSub}>Via un code ou un lien envoyé par un proche</div>
          </button>
          {joinSelected && (
            <div className={styles.subtitle}>Cette option arrive avec la version finale. Choisis « S&rsquo;inscrire » pour continuer.</div>
          )}
        </div>
      </div>
    );
  }

  const props = { draft, update };

  return (
    <div className={styles.screen}>
      <div className={styles.progress}>
        {steps.map((_, i) => (
          <div key={i} className={[styles.progressDash, i <= stepIndex ? styles.progressDashActive : ""].join(" ")} />
        ))}
      </div>
      <div className={styles.stepLabel}>
        Étape {stepIndex + 1} sur {steps.length}
      </div>

      {step.kind === "family" && <FamilyStep {...props} />}
      {step.kind === "parent" && <ParentStep {...props} />}
      {step.kind === "otherParent" && <OtherParentStep {...props} />}
      {step.kind === "children" && <ChildrenStep {...props} />}
      {step.kind === "child" && <ChildStep {...props} index={step.index} />}
      {step.kind === "budget" && <BudgetStep {...props} />}
      {step.kind === "charges" && <ChargesStep {...props} />}
      {step.kind === "targets" && <TargetsStep {...props} />}
      {step.kind === "modules" && <ModulesStep {...props} />}
      {step.kind === "taskCategories" && <TaskCategoriesStep {...props} />}
      {step.kind === "security" && <SecurityStep {...props} />}
      {step.kind === "recomposed" && <RecomposedStep {...props} />}

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.actions}>
        {stepIndex > 0 && <PillButton onClick={() => setStepIndex((i) => i - 1)}>Retour</PillButton>}
        <PillButton variant="primary" block onClick={next} disabled={isPending}>
          {isLast ? (isPending ? "Création…" : "Créer ma famille") : "Continuer"}
        </PillButton>
        <button className={styles.skip} onClick={skip} disabled={isPending}>
          Passer
        </button>
      </div>
    </div>
  );
}
