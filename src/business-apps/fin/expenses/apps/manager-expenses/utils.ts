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
 * Maps technical expense plan statuses to user-friendly display configurations
 * @param status - The technical status from the API
 * @returns StatusDisplayConfig with label and styling information
 */
export const getExpensePlanStatusDisplay = (status: string): StatusDisplayConfig => {
  switch (status) {
    case ExpenseStatus.PREPARED:
      return {
        label: getTranslationFromI18nKeyAndLabel("lowcoder:expense_statuses.prepared", "Prepared"),
        type: "draft",
      };
    case ExpenseStatus.CREATED:
      return {
        label: getTranslationFromI18nKeyAndLabel("lowcoder:expense_statuses.draft", "Draft"),
        type: "draft",
      };
    case ExpenseStatus.ASSIGNED:
      return {
        label: getTranslationFromI18nKeyAndLabel("lowcoder:expense_statuses.assigned", "Assigned"),
        type: "waiting",
      };
    case ExpenseStatus.PENDING:
      return {
        label: getTranslationFromI18nKeyAndLabel(
          "lowcoder:expense_statuses.in_approval",
          "In Approval",
        ),
        type: "waiting",
      };
    case ExpenseStatus.APPROVED:
      return {
        label: getTranslationFromI18nKeyAndLabel("lowcoder:expense_statuses.approved", "Approved"),
        type: "completed",
      };
    case ExpenseStatus.RETURNED:
      return {
        label: getTranslationFromI18nKeyAndLabel("lowcoder:expense_statuses.returned", "Returned"),
        type: "waiting",
      };
    case ExpenseStatus.REJECTED:
      return {
        label: getTranslationFromI18nKeyAndLabel(
          "lowcoder:expense_statuses.revision_required",
          "Revision Required",
        ),
        type: "task",
      };
    case ExpenseStatus.VERIFIED:
      return {
        label: getTranslationFromI18nKeyAndLabel("lowcoder:expense_statuses.verified", "Verified"),
        type: "waiting",
      };
    case ExpenseStatus.BOOKED:
      return {
        label: getTranslationFromI18nKeyAndLabel("lowcoder:expense_statuses.booked", "Booked"),
        type: "waiting",
      };
    case ExpenseStatus.PAID:
      return {
        label: getTranslationFromI18nKeyAndLabel("lowcoder:expense_statuses.paid", "Paid"),
        type: "completed",
      };
    case ExpenseStatus.CLOSED:
      return {
        label: getTranslationFromI18nKeyAndLabel("lowcoder:expense_statuses.closed", "Closed"),
        type: "completed",
      };
    case ExpenseStatus.DISCARDED:
      return {
        label: getTranslationFromI18nKeyAndLabel(
          "lowcoder:expense_statuses.discarded",
          "Discarded",
        ),
        type: "error",
      };
    case ExpenseStatus.TRANSFERRED:
      return {
        label: getTranslationFromI18nKeyAndLabel(
          "lowcoder:expense_statuses.transferred",
          "Transferred",
        ),
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
 * Maps technical expense request statuses to user-friendly display configurations
 * @param status - The technical status from the API
 * @returns StatusDisplayConfig with label and styling information
 */
export const getExpenseRequestStatusDisplay = (status: string): StatusDisplayConfig => {
  switch (status) {
    case ExpenseStatus.CREATED:
      return {
        label: "Draft",
        type: "draft",
      };
    case ExpenseStatus.PENDING:
      return {
        label: "Approval Required",
        type: "task",
      };
    case ExpenseStatus.APPROVED:
      return {
        label: "Verification Required",
        type: "waiting",
      };
    case ExpenseStatus.VERIFIED:
      return {
        label: "Booking Required",
        type: "waiting",
      };
    case ExpenseStatus.BOOKED:
      return {
        label: "Transfer Required",
        type: "waiting",
      };
    case ExpenseStatus.TRANSFERRED:
      return {
        label: "Payment Required",
        type: "waiting",
      };
    case ExpenseStatus.PAID:
      return {
        label: "Paid",
        type: "completed",
      };
    case ExpenseStatus.RETURNED:
      return {
        label: "In Revision",
        type: "waiting",
      };
    case ExpenseStatus.CLOSED:
      return {
        label: "Closed",
        type: "completed",
      };
    case ExpenseStatus.REJECTED:
      return {
        label: "Revision Required",
        type: "error",
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
export const getAdvancePaymentStatusDisplay = (status: string): StatusDisplayConfig => {
  switch (status) {
    case ExpenseStatus.PREPARED:
      return {
        label: "Prepared",
        type: "draft",
      };
    case ExpenseStatus.APPROVED:
      return {
        label: "Approved",
        type: "completed",
      };
    case ExpenseStatus.BOOKED:
      return {
        label: "In Transit (Booked)",
        type: "waiting",
      };
    case ExpenseStatus.PAID:
      return {
        label: "Paid",
        type: "completed",
      };
    case ExpenseStatus.PENDING:
      return {
        label: "Approval Required",
        type: "task",
      };
    case ExpenseStatus.REJECTED:
      return {
        label: "Revision Required",
        type: "error",
      };
    case ExpenseStatus.TRANSFERRED:
      return {
        label: "Transferred",
        type: "completed",
      };
    case ExpenseStatus.VERIFIED:
      return {
        label: "In Transit (Verified)",
        type: "waiting",
      };
    default:
      return {
        label: status,
        type: "draft",
      };
  }
};
