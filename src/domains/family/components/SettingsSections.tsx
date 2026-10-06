"use client";

import type { ReactNode } from "react";
import { PALETTES } from "@/shared/design-tokens/palettes";
import { getStore } from "@/shared/data/getStore";
import { BlurInput, fieldStyle } from "@/shared/ui/BlurInput";
import { toMinorUnits } from "@/shared/lib/money";
import { useAppData } from "@/shared/session/AppDataContext";
import { useHomeCategories } from "@/domains/budget/hooks";
import { updateBudgetTarget, type TargetPeriod } from "@/domains/budget/repository";
import { saveRewardSystem } from "@/domains/child/repository";
import { useRewardSystems } from "@/domains/child/hooks";
import { DEFAULT_VISUAL_THEME, suggestRewardType } from "@/domains/child/defaults";
import {
  COMPENSATION_LABELS,
  COMPENSATION_TYPES,
  NO_REWARD,
  REWARD_TYPE_LABELS,
  REWARD_TYPES,
  VISUAL_THEMES,
  VISUAL_THEME_LABELS,
  type RewardConfig,
  type RewardType,
} from "@/domains/child/types";
import { ChoiceCard, Chip } from "@/domains/onboarding/components/steps/ui";
import { ThresholdsEditor } from "@/domains/child/components/ThresholdsEditor";
import { CURRENCY_OPTIONS, SECURITY_LEVEL_OPTIONS } from "../defaults";
import { generateInviteCode } from "../inviteCode";
import { updateFamily, updateMember, type MemberPatch } from "../repository";
import { MODULES, MODULE_LABELS, OTHER_PARENT_MODES, type FamilySettings } from "../settings";
import type { FamilyMember } from "../types";

const rowStyle = { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" } as const;
const labelStyle = { fontSize: 11.5, color: "var(--fa-muted)", margin: "10px 0 6px" } as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details style={{ background: "var(--fa-surface)", borderRadius: "24px 12px 22px 14px", padding: "14px 16px", marginBottom: 12 }}>
      <summary style={{ fontFamily: "var(--font-heading)", fontSize: 17, cursor: "pointer" }}>{title}</summary>
      <div style={{ marginTop: 12 }}>{children}</div>
    </details>
  );
}

export function SettingsSections() {
  const { family, members } = useAppData();
  const store = getStore();
  const children = members.filter((member) => member.role === "enfant");
  const rewards = useRewardSystems(children.map((child) => child.id)) ?? {};
  const homeCategories = useHomeCategories(family.id) ?? [];
  const { settings } = family;

  const saveSettings = (patch: Partial<FamilySettings>) =>
    updateFamily(store, family.id, { settings: { ...settings, ...patch } });

  const setOtherParent = (mode: FamilySettings["otherParent"]) =>
    saveSettings({ otherParent: mode, inviteCode: mode === "invite_now" ? (settings.inviteCode ?? generateInviteCode()) : null });

  const patchMember = (id: string, patch: MemberPatch) => updateMember(store, id, patch);
  const saveReward = (child: FamilyMember, config: RewardConfig) => saveRewardSystem(store, child.id, config);

  return (
    <div>
      <Section title="Famille">
        <div style={labelStyle}>Nom</div>
        <BlurInput label="Nom de la famille" value={family.name} onCommit={(name) => name.trim() && updateFamily(store, family.id, { name: name.trim() })} />
        <div style={labelStyle}>Devise</div>
        <select
          style={fieldStyle}
          aria-label="Devise"
          value={family.currency}
          onChange={(e) => updateFamily(store, family.id, { currency: e.target.value })}
        >
          {CURRENCY_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>{option.label}</option>
          ))}
        </select>
        <div style={labelStyle}>Famille recomposée</div>
        <div style={rowStyle}>
          <Chip active={settings.recomposedFamily} onClick={() => saveSettings({ recomposedFamily: true })}>Oui</Chip>
          <Chip active={!settings.recomposedFamily} onClick={() => saveSettings({ recomposedFamily: false })}>Non</Chip>
        </div>
      </Section>

      <Section title="Membres">
        {members.map((member) => (
          <MemberEditor
            key={member.id}
            member={member}
            reward={rewards[member.id] ?? NO_REWARD}
            currency={family.currency}
            onPatch={(patch) => patchMember(member.id, patch)}
            onReward={(config) => saveReward(member, config)}
          />
        ))}
      </Section>

      <Section title="Autre parent">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {OTHER_PARENT_MODES.map((mode) => (
            <ChoiceCard
              key={mode}
              title={{ invite_now: "Oui, invité maintenant", later: "Oui, plus tard", none: "Non" }[mode]}
              active={settings.otherParent === mode}
              onClick={() => setOtherParent(mode)}
            />
          ))}
        </div>
        {settings.inviteCode && (
          <p style={{ fontSize: 13.5, marginTop: 12 }}>
            Code d&rsquo;invitation : <strong style={{ letterSpacing: "0.1em" }}>{settings.inviteCode}</strong>
          </p>
        )}
      </Section>

      <Section title="Modules">
        <div style={rowStyle}>
          {MODULES.map((module) => (
            <Chip key={module} active={settings.modules[module]} onClick={() => saveSettings({ modules: { ...settings.modules, [module]: !settings.modules[module] } })}>
              {MODULE_LABELS[module]}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Budget">
        <div style={rowStyle}>
          <Chip active={settings.budgetEnabled} onClick={() => saveSettings({ budgetEnabled: true })}>Activé</Chip>
          <Chip active={!settings.budgetEnabled} onClick={() => saveSettings({ budgetEnabled: false })}>Désactivé</Chip>
        </div>
        {settings.budgetEnabled && (
          <>
            <div style={labelStyle}>Jour de remise à zéro</div>
            <select
              style={fieldStyle}
              aria-label="Jour de remise à zéro"
              value={settings.budgetResetDay}
              onChange={(e) => saveSettings({ budgetResetDay: Number(e.target.value) })}
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day}>Le {day}</option>
              ))}
            </select>
            {homeCategories.map((category) => (
              <div key={category.id}>
                <div style={labelStyle}>{category.name} — plafond ({category.targetPeriod === "week" ? "par semaine" : "par mois"})</div>
                <BlurInput
                  label={`Plafond ${category.name}`}
                  type="number"
                  value={category.targetAmount ? String(category.targetAmount / 100) : ""}
                  onCommit={(value) => {
                    const amount = Number(value);
                    return updateBudgetTarget(store, category.id, amount > 0 ? toMinorUnits(amount) : null, category.targetPeriod as TargetPeriod);
                  }}
                />
              </div>
            ))}
          </>
        )}
      </Section>

      <Section title="Sécurité">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {SECURITY_LEVEL_OPTIONS.map((option) => (
            <ChoiceCard
              key={option.value}
              title={option.label}
              description={option.hint}
              active={family.securityLevel === option.value}
              onClick={() => updateFamily(store, family.id, { securityLevel: option.value })}
            />
          ))}
        </div>
      </Section>
    </div>
  );
}

function MemberEditor({
  member,
  reward,
  currency,
  onPatch,
  onReward,
}: {
  member: FamilyMember;
  reward: RewardConfig;
  currency: string;
  onPatch: (patch: MemberPatch) => void;
  onReward: (config: RewardConfig) => void;
}) {
  const isChild = member.role === "enfant";
  const autonomous = member.accessStatus === "invited_pending" || member.accessStatus === "linked";
  const hasReward = reward.type !== "aucun";
  const rewardType: RewardType = hasReward ? reward.type : suggestRewardType(member.age);

  const chooseType = (type: RewardType) =>
    onReward({ ...reward, type, visualTheme: type === "badge" ? (reward.visualTheme ?? DEFAULT_VISUAL_THEME) : null });

  return (
    <div style={{ borderTop: "1px solid var(--fa-line)", padding: "12px 0" }}>
      <div style={{ fontSize: 12, color: "var(--fa-muted)" }}>{isChild ? "Enfant" : "Parent"}</div>
      <div style={labelStyle}>Prénom</div>
      <BlurInput label={`Prénom (${member.name})`} value={member.name} onCommit={(name) => name.trim() && onPatch({ name: name.trim() })} />
      <div style={labelStyle}>Âge</div>
      <BlurInput
        label={`Âge (${member.name})`}
        type="number"
        value={member.age === null ? "" : String(member.age)}
        onCommit={(value) => onPatch({ age: value === "" ? null : Number(value) })}
      />

      {!isChild && (
        <>
          <div style={labelStyle}>Couleur</div>
          <div style={rowStyle}>
            {Object.values(PALETTES).map((palette) => (
              <button
                key={palette.key}
                title={palette.name}
                aria-label={`${palette.name} (${member.name})`}
                onClick={() => onPatch({ signatureColor: palette.key })}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  background: palette.soft,
                  border: member.signatureColor === palette.key ? "3px solid var(--fa-text)" : "3px solid transparent",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        </>
      )}

      {isChild && (
        <>
          <div style={labelStyle}>Accès</div>
          <div style={rowStyle}>
            <Chip active={!autonomous} onClick={() => onPatch({ accessStatus: "managed", rdvPriveAutorise: false })}>Accompagné</Chip>
            <Chip active={autonomous} onClick={() => onPatch({ accessStatus: member.accessStatus === "linked" ? "linked" : "invited_pending" })}>Autonome</Chip>
            {autonomous && (
              <Chip active={member.rdvPriveAutorise} onClick={() => onPatch({ rdvPriveAutorise: !member.rdvPriveAutorise })}>
                Peut bloquer des créneaux seul
              </Chip>
            )}
          </div>

          <div style={labelStyle}>Système de récompense</div>
          <div style={rowStyle}>
            <Chip active={hasReward} onClick={() => chooseType(rewardType)}>Oui</Chip>
            <Chip active={!hasReward} onClick={() => onReward(NO_REWARD)}>Non</Chip>
          </div>
          {hasReward && (
            <>
              <div style={labelStyle}>Compensation</div>
              <div style={rowStyle}>
                {COMPENSATION_TYPES.map((type) => (
                  <Chip key={type} active={reward.compensationType === type} onClick={() => onReward({ ...reward, compensationType: type })}>
                    {COMPENSATION_LABELS[type]}
                  </Chip>
                ))}
              </div>
              <div style={labelStyle}>Système visuel</div>
              <div style={rowStyle}>
                {REWARD_TYPES.filter((type) => type !== "aucun").map((type) => (
                  <Chip key={type} active={reward.type === type} onClick={() => chooseType(type)}>
                    {REWARD_TYPE_LABELS[type]}
                  </Chip>
                ))}
              </div>
              {member.role === "enfant" && <ThresholdsEditor childId={member.id} currency={currency} />}
              {reward.type === "badge" && (
                <div style={{ ...rowStyle, marginTop: 8 }}>
                  {VISUAL_THEMES.map((theme) => (
                    <Chip key={theme} active={reward.visualTheme === theme} onClick={() => onReward({ ...reward, visualTheme: theme })}>
                      {VISUAL_THEME_LABELS[theme]}
                    </Chip>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
