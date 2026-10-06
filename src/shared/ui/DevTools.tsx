"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getStore } from "@/shared/data/getStore";
import type { ExportBlob } from "@/shared/data/types";
import { useAppData } from "@/shared/session/AppDataContext";
import { setStoredMemberId } from "@/shared/session/session";
import { toDateString } from "@/shared/lib/date";
import { PillButton } from "./PillButton";

const sectionTitle = {
  fontSize: 11.5,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--fa-muted)",
  margin: "22px 0 10px",
} as const;

// Réglages développeur du mode démo (brief §3) : toujours visibles, jamais
// déclenchés automatiquement.
export function DevTools() {
  const router = useRouter();
  const { member, members } = useAppData();
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const wipeAndRestart = async (confirmation: string) => {
    if (!window.confirm(confirmation)) return;
    await getStore().clearAll();
    setStoredMemberId(null);
    router.replace("/onboarding");
  };

  const exportJson = async () => {
    const blob = await getStore().exportAll();
    const url = URL.createObjectURL(new Blob([JSON.stringify(blob, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `akurashi-export-${toDateString(new Date())}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Export téléchargé.");
  };

  const importJson = async (file: File) => {
    try {
      const blob = JSON.parse(await file.text()) as ExportBlob;
      await getStore().importAll(blob);
      setStoredMemberId(null);
      setMessage("Import terminé.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Import impossible.");
    }
  };

  return (
    <div>
      <div style={{ ...sectionTitle, marginTop: 0 }}>Profil</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {members.map((candidate) => (
          <PillButton
            key={candidate.id}
            variant={candidate.id === member.id ? "primary" : "secondary"}
            onClick={() => setStoredMemberId(candidate.id)}
          >
            {candidate.name} · {candidate.role}
          </PillButton>
        ))}
      </div>

      <div style={sectionTitle}>Données</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <PillButton onClick={exportJson}>Exporter en JSON</PillButton>
        <PillButton onClick={() => fileInput.current?.click()}>Importer un JSON</PillButton>
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importJson(file);
            e.target.value = "";
          }}
        />
        <PillButton onClick={() => wipeAndRestart("Recommencer l'onboarding ? La famille et toutes ses données seront effacées.")}>
          Recommencer l&rsquo;onboarding
        </PillButton>
        <PillButton onClick={() => wipeAndRestart("Réinitialiser toutes les données ? Cette action est définitive.")}>
          Réinitialiser toutes les données
        </PillButton>
      </div>

      {message && <p style={{ fontSize: 13, color: "var(--fa-muted)", marginTop: 14 }}>{message}</p>}
    </div>
  );
}
