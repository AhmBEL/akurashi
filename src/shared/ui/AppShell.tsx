import type { ReactNode } from "react";
import { GrainBackground } from "./GrainBackground";
import styles from "./AppShell.module.css";

interface AppShellProps {
  themeVars: Record<string, string>;
  children: ReactNode;
}

export function AppShell({ themeVars, children }: AppShellProps) {
  const style = { ...themeVars } as React.CSSProperties;

  return (
    <div className={styles.shell} style={style}>
      <GrainBackground />
      {children}
    </div>
  );
}
