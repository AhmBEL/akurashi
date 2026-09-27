// Formats a Date as YYYY-MM-DD using its LOCAL calendar fields — never use
// `.toISOString()` for this: it converts to UTC first, which silently shifts
// the date by a day (or a whole month, near midnight) in any timezone ahead
// of UTC. Postgres `date` columns must be compared against local-calendar
// strings like these, not UTC-shifted ones.
export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// family_members.age is stored as a free integer (03-base-de-donnees.md), not
// a birthdate — onboarding collects a birthdate for a nicer picker UX, then
// this converts it once at submission time.
export function computeAgeFromBirthDate(birthDateStr: string): number | null {
  const birthDate = new Date(birthDateStr);
  if (Number.isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const hasNotHadBirthdayYetThisYear =
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());
  if (hasNotHadBirthdayYetThisYear) age -= 1;

  return age >= 0 ? age : null;
}
