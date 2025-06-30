/**
 * Date utilities for the Expense Manager module
 */
import dayjs from 'dayjs';
import { formatDate } from '@/common/utils/windowUtils';

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
  
  try {
    // First try the global formatDate function
    const formattedDate = formatDate(dateValue, 'date.short');
    
    // If the result is still in ISO format, format it manually
    if (formattedDate && formattedDate.includes('T')) {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return '-';
      
      return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
    }
    
    return formattedDate || '-';
  } catch (error) {
    // Fallback to manual formatting if anything goes wrong
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return '-';
      
      return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
    } catch {
      return '-';
    }
  }
};
