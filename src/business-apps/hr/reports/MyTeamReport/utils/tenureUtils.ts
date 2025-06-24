import dayjs from 'dayjs';

/**
 * Calculates the tenure period between startDate and exitDate in the format:
 * '1 year and 4 months' or 'N/A' if data is missing or invalid.
 * If exitDate is missing, returns 'N/A'.
 */
export function getEmployeeTenure(startDate?: string, exitDate?: string): string {
  if (!startDate || !exitDate) return 'N/A';
  const start = dayjs(startDate);
  const end = dayjs(exitDate);
  if (!start.isValid() || !end.isValid() || end.isBefore(start)) return 'N/A';

  const years = end.diff(start, 'year');
  const months = end.diff(start.add(years, 'year'), 'month');

  if (years === 0 && months === 0) return 'N/A';
  const yearsPart = years > 0 ? `${years} year${years > 1 ? 's' : ''}` : '';
  const monthsPart = months > 0 ? `${months} month${months > 1 ? 's' : ''}` : '';

  if (yearsPart && monthsPart) return `${yearsPart} and ${monthsPart}`;
  return yearsPart || monthsPart || 'N/A';
}
