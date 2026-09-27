import styles from "./ProgressBar.module.css";

interface ProgressBarProps {
  label: string;
  pct: number;
  fillColor: string;
  onAccent?: boolean;
}

export function ProgressBar({ label, pct, fillColor, onAccent }: ProgressBarProps) {
  return (
    <div>
      <div className={styles.row} style={{ opacity: onAccent ? 0.9 : 1 }}>
        <span>{label}</span>
        <span style={{ opacity: 0.72 }}>{pct}%</span>
      </div>
      <div className={[styles.track, onAccent ? "" : styles.trackMuted].filter(Boolean).join(" ")}>
        <div className={styles.fill} style={{ width: `${pct}%`, background: fillColor }} />
      </div>
    </div>
  );
}
