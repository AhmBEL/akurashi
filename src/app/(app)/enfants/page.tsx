"use client";

import { useAppData } from "@/shared/session/AppDataContext";
import { ChildCard } from "@/domains/motivation/components/ChildCard";

// Vue parent sur l'espace enfant : actions de l'enfant, progression, annulation.
export default function EnfantsPage() {
  const { member, members } = useAppData();
  const children = members.filter((candidate) => candidate.role === "enfant");

  if (member.role !== "parent") {
    return <p style={{ fontSize: 13.5, color: "var(--fa-muted)" }}>Cette page est réservée aux parents.</p>;
  }

  return (
    <div>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 22, marginBottom: 16 }}>Enfants</div>
      {children.length === 0 && <p style={{ fontSize: 13.5, color: "var(--fa-muted)" }}>Aucun enfant dans la famille.</p>}
      {children.map((child) => (
        <ChildCard key={child.id} child={child} />
      ))}
    </div>
  );
}
