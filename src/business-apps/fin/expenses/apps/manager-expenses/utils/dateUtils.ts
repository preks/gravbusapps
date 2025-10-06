/**
 * Date utilities for the Expense Manager module
 */
import dayjs from 'dayjs';
import { getDateFormat, formatDate } from '@/common/utils/windowUtils';

/**
 * Ensures consistent date formatting in DD.MM.YYYY format
 * This acts as a wrapper around formatDate to ensure consistent formatting
 * while keeping the door open for future integration with the global function
 * 
 * @param dateValue - Date value to format
 * @returns Formatted date string in DD.MM.YYYY format or fallback value
 */
export const ensureShortDateFormat = (dateValue: string | Date | undefined | null): string => {
  if (!dateValue) return '-';

  // Prefer platform formatter when available to ensure parity with other tabs
  try {
    const platformFormatted = formatDate(dateValue as any, 'date.short');
    if (platformFormatted && typeof platformFormatted === 'string' && !platformFormatted.includes('T')) {
      return platformFormatted;
    }
  } catch {}

  // Fallback to dayjs using the platform-provided pattern
  const d = dayjs(dateValue);
  if (!d.isValid()) return '-';
  return d.format(getDateFormat('date.short'));
};
