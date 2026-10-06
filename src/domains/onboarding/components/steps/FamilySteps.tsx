"use client";

import { PALETTES } from "@/shared/design-tokens/palettes";
import { CURRENCY_OPTIONS, DEFAULT_CURRENCY } from "@/domains/family/defaults";
import { OTHER_PARENT_MODES, type OtherParentMode } from "@/domains/family/settings";
import { DEFAULT_VISUAL_THEME, suggestRewardType } from "@/domains/child/defaults";
import {
  COMPENSATION_LABELS,
  COMPENSATION_TYPES,
  REWARD_TYPE_LABELS,
  REWARD_TYPES,
  VISUAL_THEMES,
  VISUAL_THEME_LABELS,
} from "@/domains/child/types";
import type { ChildDraft } from "../../answers";
import styles from "../OnboardingWizard.module.css";
import { bodyClass, ChoiceCard, Chip, Field, hintClass, inputClass, rowClass, sectionLabelClass, StepHeader, type StepProps } from "./ui";

export function FamilyStep({ draft, update }: StepProps) {
  return (
    <>
      <StepHeader title="Comment s'appelle ta famille ?" subtitle="Le nom affiché dans l'app. Par défaut : « Ma famille »." />
      <div className={bodyClass}>
        <Field label="Nom de la famille" htmlFor="family-name">
          <input
            id="family-name"
            className={inputClass}
            value={draft.familyName ?? ""}
            onChange={(e) => update({ familyName: e.target.value })}
            placeholder="Ma famille"
          />
        </Field>
        <Field label="Devise" htmlFor="currency">
          <select
            id="currency"
            className={inputClass}
            value={draft.currency ?? DEFAULT_CURRENCY}
            onChange={(e) => update({ currency: e.target.value })}
          >
            {CURRENCY_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </>
  );
}

export function ParentStep({ draft, update }: StepProps) {
  const selected = draft.parentColor ?? "sauge";
  return (
    <>
      <StepHeader title="Et toi ?" subtitle="Ton prénom et ta couleur — l'espace enfant en affiche une version plus vive." />
      <div className={bodyClass}>
        <Field label="Prénom" htmlFor="parent-name">
          <input
            id="parent-name"
            className={inputClass}
            value={draft.parentName ?? ""}
            onChange={(e) => update({ parentName: e.target.value })}
            placeholder="Ton prénom"
          />
        </Field>
        <div className={styles.paletteGrid}>
          {Object.values(PALETTES).map((palette) => (
            <button
              key={palette.key}
              className={[styles.swatch, selected === palette.key ? styles.swatchActive : ""].join(" ")}
              style={{ background: palette.soft }}
              title={palette.name}
              aria-label={palette.name}
              onClick={() => update({ parentColor: palette.key })}
            />
          ))}
        </div>
      </div>
    </>
  );
}

const OTHER_PARENT_COPY: Record<OtherParentMode, { title: string; description: string }> = {
  invite_now: { title: "Oui, je l'invite maintenant", description: "Tu obtiens un code d'invitation à lui envoyer." },
  later: { title: "Oui, plus tard", description: "Messagerie et assignation entre parents disponibles, invitation à faire quand tu veux." },
  none: { title: "Non", description: "La messagerie entre parents et l'assignation à l'autre parent sont masquées." },
};

export function OtherParentStep({ draft, update }: StepProps) {
  const selected = draft.otherParent ?? "later";
  return (
    <>
      <StepHeader title="Y a-t-il un autre parent ?" />
      <div className={bodyClass}>
        {OTHER_PARENT_MODES.map((mode) => (
          <ChoiceCard
            key={mode}
            title={OTHER_PARENT_COPY[mode].title}
            description={OTHER_PARENT_COPY[mode].description}
            active={selected === mode}
            onClick={() => update({ otherParent: mode })}
          />
        ))}
      </div>
    </>
  );
}

export function ChildrenStep({ draft, update }: StepProps) {
  const children = draft.children ?? [];

  const setCount = (count: number) => {
    const clamped = Math.max(0, Math.min(6, count));
    update({ children: Array.from({ length: clamped }, (_, i) => children[i] ?? {}) });
  };
  const updateChild = (index: number, patch: Partial<ChildDraft>) =>
    update({ children: children.map((child, i) => (i === index ? { ...child, ...patch } : child)) });

  return (
    <>
      <StepHeader title="Combien d'enfants ?" subtitle="Tu pourras en ajouter d'autres plus tard. Aucun enfant : aucun module enfant dans l'app." />
      <div className={styles.stepper}>
        <button className={styles.stepperButton} onClick={() => setCount(children.length - 1)} aria-label="Moins">−</button>
        <div className={styles.stepperValue}>{children.length}</div>
        <button className={styles.stepperButton} onClick={() => setCount(children.length + 1)} aria-label="Plus">+</button>
      </div>
      <div className={bodyClass}>
        {children.map((child, i) => (
          <div key={i} className={styles.childBlock}>
            <div className={styles.childBlockTitle}>Enfant {i + 1}</div>
            <Field label="Prénom" htmlFor={`child-name-${i}`}>
              <input
                id={`child-name-${i}`}
                className={inputClass}
                value={child.name ?? ""}
                onChange={(e) => updateChild(i, { name: e.target.value })}
                placeholder={`Enfant ${i + 1}`}
              />
            </Field>
            <Field label="Âge" htmlFor={`child-age-${i}`}>
              <input
                id={`child-age-${i}`}
                className={inputClass}
                type="number"
                inputMode="numeric"
                min={0}
                max={25}
                value={child.age ?? ""}
                onChange={(e) => updateChild(i, { age: e.target.value === "" ? null : Number(e.target.value) })}
                placeholder="Âge (libre)"
              />
            </Field>
          </div>
        ))}
      </div>
    </>
  );
}

export function ChildStep({ draft, update, index }: StepProps & { index: number }) {
  const children = draft.children ?? [];
  const child = children[index] ?? {};
  const label = child.name?.trim() || `Enfant ${index + 1}`;
  const patch = (changes: Partial<ChildDraft>) =>
    update({ children: children.map((c, i) => (i === index ? { ...c, ...changes } : c)) });

  const age = typeof child.age === "number" ? child.age : null;
  const rewardType = child.rewardType ?? suggestRewardType(age);
  const compensation = child.compensation ?? "aucune";

  return (
    <>
      <StepHeader title={`Pour ${label}`} subtitle="Accès, créneaux et système de récompense." />
      <div className={bodyClass}>
        <div className={sectionLabelClass}>Accès</div>
        <ChoiceCard
          title="Accompagné"
          description="Pas de téléphone propre (ex. tablette familiale) : une page unique, tout passe par un parent."
          active={!child.autonomous}
          onClick={() => patch({ autonomous: false })}
        />
        <ChoiceCard
          title="Autonome"
          description="Compte propre : agenda, demandes, Sujets concernés. Une invitation sera à envoyer."
          active={child.autonomous === true}
          onClick={() => patch({ autonomous: true })}
        />
        {child.autonomous && (
          <div className={rowClass}>
            <Chip active={child.rdvPrive === true} onClick={() => patch({ rdvPrive: !child.rdvPrive })}>
              Peut bloquer des créneaux seul
            </Chip>
            <div className={hintClass}>Sinon, tout créneau proposé passe par validation parentale.</div>
          </div>
        )}

        <div className={sectionLabelClass}>Système de récompense</div>
        <div className={rowClass}>
          <Chip active={child.reward === true} onClick={() => patch({ reward: true })}>Oui</Chip>
          <Chip active={child.reward !== true} onClick={() => patch({ reward: false })}>Non</Chip>
        </div>

        {child.reward === true && (
          <>
            <div className={sectionLabelClass}>Compensation</div>
            <div className={rowClass}>
              {COMPENSATION_TYPES.map((type) => (
                <Chip key={type} active={compensation === type} onClick={() => patch({ compensation: type })}>
                  {COMPENSATION_LABELS[type]}
                </Chip>
              ))}
            </div>

            <div className={sectionLabelClass}>Système visuel</div>
            <div className={rowClass}>
              {REWARD_TYPES.filter((type) => type !== "aucun").map((type) => (
                <Chip key={type} active={rewardType === type} onClick={() => patch({ rewardType: type as ChildDraft["rewardType"] })}>
                  {REWARD_TYPE_LABELS[type]}
                </Chip>
              ))}
            </div>
            <div className={hintClass}>Suggestion selon l&rsquo;âge, jamais imposée.</div>

            {rewardType === "badge" && (
              <div className={rowClass}>
                {VISUAL_THEMES.map((theme) => (
                  <Chip key={theme} active={(child.theme ?? DEFAULT_VISUAL_THEME) === theme} onClick={() => patch({ theme })}>
                    {VISUAL_THEME_LABELS[theme]}
                  </Chip>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
