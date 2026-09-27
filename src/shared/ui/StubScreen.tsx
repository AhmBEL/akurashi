interface StubScreenProps {
  title: string;
}

// Placeholder for a screen not yet built in this pass — keeps navigation
// working without pretending the module is finished.
export function StubScreen({ title }: StubScreenProps) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 22, marginBottom: 8 }}>{title}</div>
      <p style={{ fontSize: 13.5, color: "var(--fa-muted)" }}>À construire dans une prochaine itération.</p>
    </div>
  );
}
