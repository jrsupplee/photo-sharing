// Event dates are stored as date-only strings (YYYY-MM-DD). Parsing them with
// new Date() yields UTC midnight, so formatting in the viewer's local timezone
// can shift the calendar date. Formatting in UTC keeps the date as entered.
export function formatEventDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
