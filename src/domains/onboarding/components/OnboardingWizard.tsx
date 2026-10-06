"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PillButton } from "@/shared/ui/PillButton";
import { PALETTES, type PaletteKey } from "@/shared/design-tokens/palettes";
import { getStore } from "@/shared/data/getStore";
import { getAuthUserId } from "@/shared/session/session";
import { DEFAULT_CURRENCY } from "@/domains/family/defaults";
import { createFamilyFromOnboarding } from "../createFamily";
import { PAIN_POINT_OPTIONS } from "../types";
import styles from "./OnboardingWizard.module.css";

type StepKey = "choice" | "name" | "birthdate" | "childrenCount" | "childrenDetails" | "color" | "painPoints";

interface ChildDraft {
  name: string;
  birthDate: string;
}

export function OnboardingWizard() {
  const router = useRouter();
  const [flow, setFlow] = useState<"undecided" | "create" | "join">("undecided");
  const [stepIndex, setStepIndex] = useState(0);
  const [parentName, setParentName] = useState("");
  const [parentBirthDate, setParentBirthDate] = useState("");
  const [childrenCount, setChildrenCount] = useState(0);
  const [children, setChildren] = useState<ChildDraft[]>([]);
  const [paletteKey, setPaletteKey] = useState<PaletteKey>("sauge");
  const [painPoints, setPainPoints] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const steps: StepKey[] = useMemo(() => {
    const base: StepKey[] = ["choice", "name", "birthdate", "childrenCount"];
    if (childrenCount > 0) base.push("childrenDetails");
    base.push("color", "painPoints");
    return base;
  }, [childrenCount]);

  const step = steps[stepIndex];

  const setChildrenCountAndSync = (count: number) => {
    const clamped = Math.max(0, Math.min(6, count));
    setChildrenCount(clamped);
    setChildren((prev) => {
      const next = prev.slice(0, clamped);
      while (next.length < clamped) next.push({ name: "", birthDate: "" });
      return next;
    });
  };

  const updateChild = (index: number, patch: Partial<ChildDraft>) => {
    setChildren((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  const canGoNext = (): boolean => {
    if (step === "name") return parentName.trim().length > 0;
    if (step === "birthdate") return parentBirthDate.length > 0;
    if (step === "childrenDetails") return children.every((c) => c.name.trim().length > 0 && c.birthDate.length > 0);
    return true;
  };

  const goNext = () => {
    setError(null);
    if (!canGoNext()) {
      setError("Merci de remplir ce champ avant de continuer.");
      return;
    }
    setStepIndex((i) => Math.min(steps.length - 1, i + 1));
  };

  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));

  const togglePainPoint = (tag: string) => {
    setPainPoints((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await createFamilyFromOnboarding(
        getStore(),
        { parentName, parentBirthDate, paletteKey, painPoints, children },
        await getAuthUserId(),
        DEFAULT_CURRENCY
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      router.replace("/");
    });
  };

  const progressCount = steps.length;
  const progressIndex = stepIndex;

  return (
    <div className={styles.screen}>
      <div className={styles.progress}>
        {Array.from({ length: progressCount }, (_, i) => (
          <div key={i} className={[styles.progressDash, i <= progressIndex ? styles.progressDashActive : ""].join(" ")} />
        ))}
      </div>

      {step === "choice" && (
        <>
          <div className={styles.title}>Bienvenue</div>
          <div className={styles.subtitle}>Comment veux-tu commencer ?</div>
          <div className={styles.body}>
            <button className={styles.choiceCard} onClick={() => { setFlow("create"); goNext(); }}>
              <div className={styles.choiceTitle}>S&rsquo;inscrire</div>
              <div className={styles.choiceSub}>Créer une nouvelle famille sur Akurashi</div>
            </button>
            <button className={styles.choiceCard} onClick={() => setFlow("join")}>
              <div className={styles.choiceTitle}>Rejoindre</div>
              <div className={styles.choiceSub}>Via un code ou un lien envoyé par un proche</div>
            </button>
            {flow === "join" && (
              <div className={styles.subtitle}>
                Cette option arrive bientôt. Choisis &laquo;&nbsp;S&rsquo;inscrire&nbsp;&raquo; pour continuer.
              </div>
            )}
          </div>
        </>
      )}

      {step === "name" && (
        <>
          <div className={styles.stepLabel}>Étape {stepIndex} sur {steps.length - 1}</div>
          <div className={styles.title}>Comment tu t&rsquo;appelles&nbsp;?</div>
          <div className={styles.subtitle}>Ton prénom, tel qu&rsquo;il apparaîtra dans l&rsquo;app.</div>
          <div className={styles.body}>
            <div className={styles.field}>
              <label htmlFor="parent-name">Prénom</label>
              <input
                id="parent-name"
                className={styles.input}
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="Ton prénom"
              />
            </div>
          </div>
        </>
      )}

      {step === "birthdate" && (
        <>
          <div className={styles.stepLabel}>Étape {stepIndex} sur {steps.length - 1}</div>
          <div className={styles.title}>Ta date de naissance</div>
          <div className={styles.body}>
            <div className={styles.field}>
              <label htmlFor="parent-birthdate">Date de naissance</label>
              <input
                id="parent-birthdate"
                type="date"
                className={styles.input}
                value={parentBirthDate}
                onChange={(e) => setParentBirthDate(e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      {step === "childrenCount" && (
        <>
          <div className={styles.stepLabel}>Étape {stepIndex} sur {steps.length - 1}</div>
          <div className={styles.title}>Combien d&rsquo;enfants&nbsp;?</div>
          <div className={styles.subtitle}>Tu pourras en ajouter d&rsquo;autres plus tard.</div>
          <div className={styles.stepper}>
            <button className={styles.stepperButton} onClick={() => setChildrenCountAndSync(childrenCount - 1)} aria-label="Moins">−</button>
            <div className={styles.stepperValue}>{childrenCount}</div>
            <button className={styles.stepperButton} onClick={() => setChildrenCountAndSync(childrenCount + 1)} aria-label="Plus">+</button>
          </div>
        </>
      )}

      {step === "childrenDetails" && (
        <>
          <div className={styles.stepLabel}>Étape {stepIndex} sur {steps.length - 1}</div>
          <div className={styles.title}>Tes enfants</div>
          <div className={styles.body}>
            {children.map((child, i) => (
              <div key={i} className={styles.childBlock}>
                <div className={styles.childBlockTitle}>Enfant {i + 1}</div>
                <div className={styles.field}>
                  <label htmlFor={`child-name-${i}`}>Prénom</label>
                  <input
                    id={`child-name-${i}`}
                    className={styles.input}
                    value={child.name}
                    onChange={(e) => updateChild(i, { name: e.target.value })}
                    placeholder={`Enfant ${i + 1}`}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor={`child-birthdate-${i}`}>Date de naissance</label>
                  <input
                    id={`child-birthdate-${i}`}
                    type="date"
                    className={styles.input}
                    value={child.birthDate}
                    onChange={(e) => updateChild(i, { birthDate: e.target.value })}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {step === "color" && (
        <>
          <div className={styles.stepLabel}>Étape {stepIndex} sur {steps.length - 1}</div>
          <div className={styles.title}>Ta couleur signature</div>
          <div className={styles.subtitle}>Chaque parent choisit la sienne — l&rsquo;espace enfant en affiche une version plus vive.</div>
          <div className={styles.paletteGrid}>
            {Object.values(PALETTES).map((p) => (
              <button
                key={p.key}
                className={[styles.swatch, paletteKey === p.key ? styles.swatchActive : ""].join(" ")}
                style={{ background: p.soft }}
                title={p.name}
                onClick={() => setPaletteKey(p.key)}
                aria-label={p.name}
              />
            ))}
          </div>
        </>
      )}

      {step === "painPoints" && (
        <>
          <div className={styles.stepLabel}>Dernière étape</div>
          <div className={styles.title}>Qu&rsquo;est-ce qui pèse le plus au quotidien&nbsp;?</div>
          <div className={styles.subtitle}>Ça nous aide à donner le bon ton aux bilans. Optionnel.</div>
          <div className={styles.tagGrid}>
            {PAIN_POINT_OPTIONS.map((tag) => (
              <button
                key={tag}
                className={[styles.tag, painPoints.includes(tag) ? styles.tagActive : ""].join(" ")}
                onClick={() => togglePainPoint(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {step !== "choice" && (
        <div className={styles.actions}>
          <PillButton onClick={goBack}>Retour</PillButton>
          {step === "painPoints" ? (
            <PillButton variant="primary" block onClick={submit} disabled={isPending}>
              {isPending ? "Création…" : "Créer ma famille"}
            </PillButton>
          ) : (
            <PillButton variant="primary" block onClick={goNext}>
              Continuer
            </PillButton>
          )}
        </div>
      )}
    </div>
  );
}
