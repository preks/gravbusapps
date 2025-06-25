/**
 * Utility functions for Expense Management Overview
 * 
 * @version 1.0
 * @date 2025-06-05
 */

import { PillType } from "@/components/pill/Pill";

/**
 * Enum representing the technical statuses for expenses
 */
export enum ExpenseStatus {
  PREPARED = "PREPARED",
  CREATED = "CREATED",
  ASSIGNED = "ASSIGNED",
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  RETURNED = "RETURNED",
  REJECTED = "REJECTED",
  VERIFIED = "VERIFIED",
  BOOKED = "BOOKED",
  PAID = "PAID",
  CLOSED = "CLOSED",
  DISCARDED = "DISCARDED",
  TRANSFERRED = "TRANSFERRED",
}

/**
 * Type for status display configuration
 */
export interface StatusDisplayConfig {
  label: string;
  type: PillType;
}

/**
 * Maps technical expense request statuses to user-friendly display configurations
 * @param status - The technical status from the API
 * @returns StatusDisplayConfig with label and styling information
 */
export const getExpenseRequestStatusDisplay = (
  status: string
): StatusDisplayConfig => {
  switch (status) {
    case ExpenseStatus.PENDING:
      return {
        label: "Pending Approval",
        type: "task",
      };
    case ExpenseStatus.APPROVED:
    case ExpenseStatus.VERIFIED:
      return {
        label: "Approved",
        type: "completed",
      };
    case ExpenseStatus.BOOKED:
      return {
        label: "Booked",
        type: "completed",
      };
    case ExpenseStatus.REJECTED:
      return {
        label: "Rejected",
        type: "error",
      };
    case ExpenseStatus.RETURNED:
      return {
        label: "Returned",
        type: "waiting",
      };
    case ExpenseStatus.PAID:
      return {
        label: "Paid",
        type: "completed",
      };
    default:
      return {
        label: status,
        type: "draft",
      };
  }
};

/**
 * Maps technical advance payment statuses to user-friendly display configurations
 * @param status - The technical status from the API
 * @returns StatusDisplayConfig with label and styling information
 */
export const getAdvancePaymentStatusDisplay = (
  status: string
): StatusDisplayConfig => {
  switch (status) {
    case ExpenseStatus.PENDING:
      return {
        label: "Pending",
        type: "task",
      };
    case ExpenseStatus.APPROVED:
      return {
        label: "Approved",
        type: "completed",
      };
    case ExpenseStatus.REJECTED:
      return {
        label: "Rejected",
        type: "error",
      };
    case ExpenseStatus.PAID:
      return {
        label: "Paid",
        type: "completed",
      };
    default:
      return {
        label: status,
        type: "draft",
      };
  }
};

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
