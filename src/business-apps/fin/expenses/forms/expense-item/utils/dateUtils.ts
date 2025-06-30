/**
 * Date utilities for the Expense Item module
 */
/**
 * Formats a date string to DD.MM.YYYY format
 * @param dateString - ISO date string
 * @returns Formatted date string in DD.MM.YYYY format
 */
export const formatDateToDDMMYYYY = (dateString: string): string => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

/**
 * Gets the current date as an ISO string (YYYY-MM-DD)
 * @returns Current date in YYYY-MM-DD format
 */
export const getCurrentDateAsISOString = (): string => {
  return new Date().toISOString().split("T")[0];
};

/**
 * Formats a date object or string to ISO date string (YYYY-MM-DD)
 * @param date - Date object or string
 * @returns Formatted date in YYYY-MM-DD format or current date if input is invalid
 */
export const formatDateToISOString = (date: Date | string | undefined): string => {
  if (!date) {
    return getCurrentDateAsISOString();
  }
  
  if (date instanceof Date) {
    return date.toISOString().split("T")[0];
  }
  
  try {
    return new Date(date).toISOString().split("T")[0];
  } catch (error) {
    return getCurrentDateAsISOString();
  }
};
