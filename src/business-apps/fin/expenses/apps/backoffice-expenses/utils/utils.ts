/**
 * Utility functions for Expense Management Overview
 * 
 * @version 1.0
 * @date 2025-06-05
 */

/**
 * Determines the fiscal year date range based on current date
 * Assumes fiscal year is calendar year (Jan 1 - Dec 31)
 * 
 * @returns Object with start and end dates of the current fiscal year
 */
export const getCurrentFiscalYearRange = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  
  const fiscalYearStart = new Date(`${currentYear}-01-01T00:00:00.000Z`);
  const fiscalYearEnd = new Date(`${currentYear}-12-31T23:59:59.999Z`);
  
  return {
    start: fiscalYearStart,
    end: fiscalYearEnd,
    startISOString: fiscalYearStart.toISOString(),
    endISOString: fiscalYearEnd.toISOString(),
    year: currentYear
  };
};

/**
 * Formats a date string to YYYY-MM-DD format
 * 
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  return dateString.split('T')[0];
};

/**
 * Determines if an expense request is part of the YTD calculation
 * 
 * @param expense - Expense data object
 * @returns Boolean indicating if expense is part of YTD
 */
export const isExpenseInYTD = (expense: any) => {
  const fiscalYear = getCurrentFiscalYearRange();
  const expenseDate = new Date(expense.date);
  
  return (
    expenseDate >= fiscalYear.start && 
    expenseDate <= fiscalYear.end && 
    expense.status.toLowerCase() === 'paid' && 
    expense.currency === 'EUR'
  );
};
