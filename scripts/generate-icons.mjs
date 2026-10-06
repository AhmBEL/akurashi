// Génère les icônes PNG de la PWA depuis le glyphe d'icon.svg.
// À relancer seulement si le logo change : `node scripts/generate-icons.mjs`.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const BACKGROUND = "#3c5742";
const GLYPH = "M256 128c-64 40-128 40-128 104 0 96 96 152 128 176 32-24 128-80 128-176 0-64-64-64-128-104z";

// scale < 1 réduit le glyphe (zone de sécurité des icônes « maskable »).
const svg = ({ rounded, scale }) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" ${rounded ? 'rx="96"' : ""} fill="${BACKGROUND}"/>
  <path d="${GLYPH}" fill="#f2f0e5" transform="translate(256 256) scale(${scale}) translate(-256 -256)"/>
</svg>`;

const outputs = [
  { file: "icon-192.png", size: 192, rounded: true, scale: 1 },
  { file: "icon-512.png", size: 512, rounded: true, scale: 1 },
  { file: "icon-maskable-512.png", size: 512, rounded: false, scale: 0.7 },
  { file: "apple-touch-icon.png", size: 180, rounded: false, scale: 0.85 },
];

await mkdir("public/icons", { recursive: true });
for (const { file, size, rounded, scale } of outputs) {
  await sharp(Buffer.from(svg({ rounded, scale }))).resize(size, size).png().toFile(`public/icons/${file}`);
  console.log("généré", file);
}
