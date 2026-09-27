import { PALETTES, DEFAULT_PALETTE, type PaletteKey } from "./palettes";

export interface ThemeInput {
  paletteKey: PaletteKey | string;
  isChildSpace: boolean;
  isDark: boolean;
}

/**
 * Derives every `--fa-*` color token from one signature color + two booleans.
 * Formula lifted verbatim from the Claude Design handoff prototype
 * (App Famille v2.dc.html, applyTheme()) — it's the concrete mechanism behind
 * the "soft parent / vivid child, same hue" rule already decided in
 * MASTER_Design_App_Famille_Belhadj.md §2. Never hardcode a --fa-* value
 * anywhere else; always go through this function.
 */
export function getThemeVars({ paletteKey, isChildSpace, isDark }: ThemeInput): Record<string, string> {
  const palette = PALETTES[paletteKey as PaletteKey] ?? PALETTES[DEFAULT_PALETTE];
  const accent = isChildSpace ? palette.vivid : palette.soft;
  const child = isChildSpace;
  const dark = isDark;

  return {
    "--fa-accent": accent,
    "--fa-tint": `color-mix(in srgb, ${accent} ${child ? 26 : 18}%, transparent)`,
    "--fa-on-accent": child ? palette.onVivid : "#f2f0e5",
    "--fa-bg": dark ? "#1a1c18" : `color-mix(in srgb, ${accent} ${child ? 11 : 9}%, #efeade)`,
    "--fa-surface": dark
      ? `color-mix(in srgb, ${accent} 10%, #242720)`
      : `color-mix(in srgb, ${accent} ${child ? 6 : 5}%, #f2f0e5)`,
    "--fa-text": dark ? "#f3ede3" : "#201e1d",
    "--fa-muted": dark ? "rgba(243,237,227,.6)" : "rgba(32,30,29,.58)",
    "--fa-line": dark ? "rgba(255,255,255,.12)" : `color-mix(in srgb, ${accent} 22%, transparent)`,
    "--fa-ok": dark ? "#aebf92" : "#5d7a48",
    "--fa-ok-tint": dark ? "rgba(174,191,146,.18)" : "rgba(111,131,71,.2)",
    "--fa-warn": dark ? "#e8b463" : "#c1832a",
    "--fa-alert": dark ? "#e57f6b" : "#c0523c",
    "--fa-accent-fg": dark
      ? `color-mix(in srgb, ${accent} 55%, #f3ede3)`
      : `color-mix(in srgb, ${accent} 78%, #201e1d)`,
  };
}

export function themeVarsToCssString(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([key, value]) => `${key}:${value}`)
    .join(";");
}
