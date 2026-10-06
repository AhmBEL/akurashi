"use client";

import { isDemoMode } from "@/shared/config";
import { useAppData } from "@/shared/session/AppDataContext";
import { DevTools } from "@/shared/ui/DevTools";

export default function ReglagesPage() {
  const { member, family } = useAppData();

  return (
    <div>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 22, marginBottom: 4 }}>Réglages</div>
      <p style={{ fontSize: 13.5, color: "var(--fa-muted)", marginBottom: 20 }}>
        {family.name} · connecté en tant que {member.name}
      </p>
      {isDemoMode() ? (
        <DevTools />
      ) : (
        <p style={{ fontSize: 13.5, color: "var(--fa-muted)" }}>Les autres réglages arrivent dans une prochaine tranche.</p>
      )}
    </div>
  );
}
