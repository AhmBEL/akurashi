import type { ButtonHTMLAttributes } from "react";
import styles from "./PillButton.module.css";

interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  block?: boolean;
}

export function PillButton({ variant = "secondary", block, className, ...props }: PillButtonProps) {
  const variantClass = variant === "primary" ? styles.primary : variant === "ghost" ? styles.ghost : styles.secondary;
  return (
    <button
      className={[styles.pill, variantClass, block ? styles.block : "", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
