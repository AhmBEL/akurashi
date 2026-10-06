"use client";

import { SECURITY_LEVEL_OPTIONS } from "@/domains/family/defaults";
import { DEFAULT_FAMILY_SETTINGS, MODULES, MODULE_LABELS } from "@/domains/family/settings";
import { DEFAULT_TASK_CATEGORIES } from "@/domains/tasks/defaults";
import { bodyClass, ChoiceCard, Chip, rowClass, StepHeader, type StepProps } from "./ui";

export function ModulesStep({ draft, update }: StepProps) {
  const isOn = (module: (typeof MODULES)[number]) => draft.modules?.[module] ?? DEFAULT_FAMILY_SETTINGS.modules[module];
  return (
    <>
      <StepHeader title="Quels modules veux-tu ?" subtitle="La navigation et l'accueil ne montrent que les modules actifs. Par défaut : tous." />
      <div className={rowClass}>
        {MODULES.map((module) => (
          <Chip key={module} active={isOn(module)} onClick={() => update({ modules: { ...draft.modules, [module]: !isOn(module) } })}>
            {MODULE_LABELS[module]}
          </Chip>
        ))}
      </div>
    </>
  );
}

export function TaskCategoriesStep({ draft, update }: StepProps) {
  const allNames = DEFAULT_TASK_CATEGORIES.map((category) => category.name);
  const selected = draft.taskCategories ?? allNames;
  const toggle = (name: string) =>
    update({ taskCategories: selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name] });

  return (
    <>
      <StepHeader title="Quels types de tâches ?" subtitle="Des modèles proposés à la création d'une tâche. Par défaut : tous." />
      <div className={rowClass}>
        {allNames.map((name) => (
          <Chip key={name} active={selected.includes(name)} onClick={() => toggle(name)}>
            {name}
          </Chip>
        ))}
      </div>
    </>
  );
}

export function SecurityStep({ draft, update }: StepProps) {
  const selected = draft.securityLevel ?? "libre";
  return (
    <>
      <StepHeader title="Comment l'app se verrouille ?" subtitle="Enregistré maintenant ; le verrou réel arrive en phase finale." />
      <div className={bodyClass}>
        {SECURITY_LEVEL_OPTIONS.map((option) => (
          <ChoiceCard
            key={option.value}
            title={option.label}
            description={option.hint}
            active={selected === option.value}
            onClick={() => update({ securityLevel: option.value })}
          />
        ))}
      </div>
    </>
  );
}

export function RecomposedStep({ draft, update }: StepProps) {
  const recomposed = draft.recomposedFamily ?? false;
  return (
    <>
      <StepHeader title="Famille recomposée ?" subtitle="Simplement noté pour plus tard : aucune fonction n'en dépend pour l'instant." />
      <div className={rowClass}>
        <Chip active={recomposed} onClick={() => update({ recomposedFamily: true })}>Oui</Chip>
        <Chip active={!recomposed} onClick={() => update({ recomposedFamily: false })}>Non</Chip>
      </div>
    </>
  );
}
