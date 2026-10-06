"use client";

import { isDemoMode } from "@/shared/config";
import { useAppData } from "@/shared/session/AppDataContext";
import { DevTools } from "@/shared/ui/DevTools";
import { SettingsSections } from "@/domains/family/components/SettingsSections";

export default function ReglagesPage() {
  const { member, family } = useAppData();

  return (
    <div>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 22, marginBottom: 4 }}>Réglages</div>
      <p style={{ fontSize: 13.5, color: "var(--fa-muted)", marginBottom: 20 }}>
        {family.name} · connecté en tant que {member.name}
      </p>

      {member.role === "parent" ? (
        <SettingsSections />
      ) : (
        <p style={{ fontSize: 13.5, color: "var(--fa-muted)" }}>Les réglages de la famille sont gérés par les parents.</p>
      )}

      {isDemoMode() && (
        <details style={{ marginTop: 24 }}>
          <summary style={{ fontFamily: "var(--font-heading)", fontSize: 17, cursor: "pointer" }}>Outils développeur</summary>
          <div style={{ marginTop: 12 }}>
            <DevTools />
          </div>
        </details>
      )}
    </div>
  );
}
