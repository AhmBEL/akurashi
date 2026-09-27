// The 6 selectable signature colors (MASTER_Design_App_Famille_Belhadj.md §2:
// a predefined palette, never a free color picker). Each carries a "soft" value
// for the parent space and a "vivid" value for the child space — the same hue,
// two intensities, so switching space is visible even when parent and child
// happen to share a color family.
export type PaletteKey = "sauge" | "ardoise" | "olive" | "prune" | "argile" | "bleu";

export interface Palette {
  key: PaletteKey;
  name: string;
  soft: string;
  vivid: string;
  onVivid: string;
}

export const PALETTES: Record<PaletteKey, Palette> = {
  sauge: { key: "sauge", name: "Sauge", soft: "#3c5742", vivid: "#8cba57", onVivid: "#1c2a10" },
  ardoise: { key: "ardoise", name: "Ardoise", soft: "#3f4f5e", vivid: "#6fa8d0", onVivid: "#0d1c27" },
  olive: { key: "olive", name: "Olive", soft: "#6b7340", vivid: "#b3c258", onVivid: "#242a09" },
  prune: { key: "prune", name: "Prune", soft: "#6d4f63", vivid: "#c882b4", onVivid: "#2c1226" },
  argile: { key: "argile", name: "Argile", soft: "#8a6a4c", vivid: "#d9a473", onVivid: "#2f1d0c" },
  bleu: { key: "bleu", name: "Bleu nuit", soft: "#3a5b78", vivid: "#5fb6d4", onVivid: "#082733" },
};

export const DEFAULT_PALETTE: PaletteKey = "sauge";

export function isPaletteKey(value: string): value is PaletteKey {
  return value in PALETTES;
}
