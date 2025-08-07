/**
 * Utility functions for Expense Management Overview
 *
 * @version 1.0
 * @date 2025-06-05
 */

import { PillType } from "@/components/pill/Pill";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";

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
    case ExpenseStatus.CREATED:
      return {
        label: getTranslationFromI18nKeyAndLabel(
          "lowcoder:expense_statuses.draft",
          "Draft"
        ),
        type: "draft",
      };

    case ExpenseStatus.PREPARED:
      return {
        label: getTranslationFromI18nKeyAndLabel(
          "lowcoder:expense_statuses.prepared",
          "Prepared"
        ),
        type: "preparing",
      };

    case ExpenseStatus.ASSIGNED:
      return {
        label: getTranslationFromI18nKeyAndLabel(
          "lowcoder:expense_statuses.assigned",
          "Assigned"
        ),
        type: "task",
      };

    case ExpenseStatus.PENDING:
      return {
        label: getTranslationFromI18nKeyAndLabel(
          "lowcoder:expense_statuses.in_approval",
          "In Approval"
        ),
        type: "waiting",
      };

    case ExpenseStatus.APPROVED:
      return {
        label: getTranslationFromI18nKeyAndLabel(
          "lowcoder:expense_statuses.verification_required",
          "Verification Required"
        ),
        type: "task",
      };

    case ExpenseStatus.VERIFIED:
      return {
        label: getTranslationFromI18nKeyAndLabel(
          "lowcoder:expense_statuses.booking_required",
          "Booking Required"
        ),
        type: "task",
      };

    case ExpenseStatus.BOOKED:
      return {
        label: getTranslationFromI18nKeyAndLabel(
          "lowcoder:expense_statuses.transfer_required",
          "Transfer Required"
        ),
        type: "task",
      };

    case ExpenseStatus.CLOSED:
      return {
        label: getTranslationFromI18nKeyAndLabel(
          "lowcoder:expense_statuses.closed",
          "Closed"
        ),
        type: "completed",
      };

    case ExpenseStatus.PAID:
      return {
        label: getTranslationFromI18nKeyAndLabel(
          "lowcoder:expense_statuses.paid",
          "Paid"
        ),
        type: "completed",
      };
    case ExpenseStatus.REJECTED:
      return {
        label: getTranslationFromI18nKeyAndLabel(
          "lowcoder:expense_statuses.rejected",
          "Rejected"
        ),
        type: "error",
      };

    default:
      return {
        label: getTranslationFromI18nKeyAndLabel(
          "lowcoder:expense_statuses.draft",
          "Draft"
        ),
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
        label: getTranslationFromI18nKeyAndLabel(
          "lowcoder:expense_statuses.in_approval",
          "In Approval"
        ),
        type: "waiting",
      };
    case ExpenseStatus.APPROVED:
      return {
        label: getTranslationFromI18nKeyAndLabel(
          "lowcoder:expense_statuses.approved",
          "Approved"
        ),
        type: "completed",
      };
    case ExpenseStatus.BOOKED:
      return {
        label: getTranslationFromI18nKeyAndLabel(
          "lowcoder:expense_statuses.transfer_required",
          "Transfer Required"
        ),
        type: "task",
      };
    case ExpenseStatus.PREPARED:
      return {
        label: getTranslationFromI18nKeyAndLabel(
          "lowcoder:expense_statuses.prepared",
          "Prepared"
        ),
        type: "preparing",
      };
    case ExpenseStatus.REJECTED:
      return {
        label: getTranslationFromI18nKeyAndLabel(
          "lowcoder:expense_statuses.rejected",
          "Rejected"
        ),
        type: "error",
      };
    case ExpenseStatus.TRANSFERRED:
      return {
        label: getTranslationFromI18nKeyAndLabel(
          "lowcoder:expense_statuses.payment_required",
          "Payment Required"
        ),
        type: "task",
      };
    case ExpenseStatus.VERIFIED:
      return {
        label: getTranslationFromI18nKeyAndLabel(
          "lowcoder:expense_statuses.booking_required",
          "Booking Required"
        ),
        type: "task",
      };
    case ExpenseStatus.PAID:
      return {
        label: getTranslationFromI18nKeyAndLabel(
          "lowcoder:expense_statuses.paid",
          "Paid"
        ),
        type: "completed",
      };
    default:
      return {
        label: getTranslationFromI18nKeyAndLabel(
          "lowcoder:expense_statuses.draft",
          "Draft"
        ),
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
    year: currentYear,
  };
};

/**
 * Formats a date string to YYYY-MM-DD format
 *
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export const formatDate = (dateString: string) => {
  if (!dateString) return "N/A";
  return dateString.split("T")[0];
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
    expense.status.toLowerCase() === "paid" &&
    expense.currency === "EUR"
  );
};
