const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O/1/I, lisible à voix haute

// Code d'invitation du second parent. En démo il est seulement affiché ; la
// vraie jonction (« Rejoindre ») arrive avec la version finale.
export function generateInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}
