import type { CSSProperties, ReactNode } from "react";
import styles from "./Card.module.css";

interface CardProps {
  children: ReactNode;
  variant?: "surface" | "accent";
  radius?: string;
  rotate?: string;
  style?: CSSProperties;
  className?: string;
}

// Radii are intentionally asymmetric one-offs (see MASTER_Technique's "Formes,
// rayons, ombres" note: "aucun rayon uniforme, varier d'une carte à l'autre").
// Callers pass their own 4-value radius rather than reusing a single token.
export function Card({ children, variant = "surface", radius = "28px 14px 26px 16px", rotate, style, className }: CardProps) {
  return (
    <div
      className={[styles.card, variant === "accent" ? styles.accent : "", className].filter(Boolean).join(" ")}
      style={{ borderRadius: radius, transform: rotate ? `rotate(${rotate})` : undefined, ...style }}
    >
      {children}
    </div>
  );
}
