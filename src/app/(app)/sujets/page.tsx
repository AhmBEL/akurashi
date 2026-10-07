"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppData } from "@/shared/session/AppDataContext";
import { PillButton } from "@/shared/ui/PillButton";
import { isModuleActive } from "@/domains/family/settings";
import { Chip } from "@/domains/onboarding/components/steps/ui";
import { SujetCard } from "@/domains/sujets/components/SujetCard";
import { SujetSheet } from "@/domains/sujets/components/SujetSheet";
import { useSujets } from "@/domains/sujets/hooks";

// Liste des Sujets : cartes des Sujets ouverts, onglet Archives, « + Nouveau Sujet ».
export default function SujetsPage() {
  const router = useRouter();
  const { member, family } = useAppData();
  const sujets = useSujets(family.id, member.id);
  const [tab, setTab] = useState<"ouvert" | "archive">("ouvert");
  const [creating, setCreating] = useState(false);

  if (!isModuleActive(family.settings, "sujets")) {
    return (
      <p style={{ fontSize: 13.5, color: "var(--fa-muted)" }}>
        Les Sujets sont désactivés. Tu peux les réactiver dans <Link href="/reglages">Réglages</Link>.
      </p>
    );
  }

  const shown = (sujets ?? []).filter((sujet) => sujet.status === tab);

  return (
    <div>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 24, marginBottom: 12 }}>Sujets</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Chip active={tab === "ouvert"} onClick={() => setTab("ouvert")}>Ouverts</Chip>
        <Chip active={tab === "archive"} onClick={() => setTab("archive")}>Archives</Chip>
      </div>

      {sujets && shown.length === 0 && (
        <p style={{ fontSize: 13.5, color: "var(--fa-muted)", marginBottom: 16 }}>
          {tab === "ouvert" ? "Aucun Sujet ouvert pour l'instant." : "Aucun Sujet clôturé."}
        </p>
      )}

      {shown.map((sujet) => (
        <SujetCard key={sujet.id} sujet={sujet} />
      ))}

      {member.role === "parent" && tab === "ouvert" && (
        <PillButton variant="primary" block onClick={() => setCreating(true)}>
          + Nouveau Sujet
        </PillButton>
      )}
      <SujetSheet open={creating} onClose={() => setCreating(false)} onCreated={(id) => router.push(`/sujets/${id}`)} />
    </div>
  );
}
