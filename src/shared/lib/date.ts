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
