"use client";

export const fieldStyle = {
  width: "100%",
  background: "var(--fa-surface)",
  border: "1px solid var(--fa-line)",
  borderRadius: "20px 10px 20px 10px",
  padding: "11px 14px",
  font: "inherit",
  fontSize: 14,
  color: "var(--fa-text)",
} as const;

interface BlurInputProps {
  value: string;
  onCommit: (value: string) => void;
  label: string;
  type?: string;
  disabled?: boolean;
}

// Enregistre à la perte de focus ; `key` recharge le champ quand la valeur enregistrée change.
export function BlurInput({ value, onCommit, label, type = "text", disabled }: BlurInputProps) {
  return (
    <input
      key={value}
      style={{ ...fieldStyle, opacity: disabled ? 0.6 : 1 }}
      type={type}
      aria-label={label}
      defaultValue={value}
      disabled={disabled}
      onBlur={(e) => e.target.value !== value && onCommit(e.target.value)}
    />
  );
}
