import React from 'react';
import { PillType } from '@/components/pill/Pill';

/**
 * Enum representing the technical statuses for expenses
 */
export enum ExpenseStatus {
  PREPARED = 'PREPARED',
  CREATED = 'CREATED',
  ASSIGNED = 'ASSIGNED',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  RETURNED = 'RETURNED',
  REJECTED = 'REJECTED',
  VERIFIED = 'VERIFIED',
  BOOKED = 'BOOKED',
  PAID = 'PAID',
  CLOSED = 'CLOSED',
  DISCARDED = 'DISCARDED',
  TRANSFERRED = 'TRANSFERRED'
}

/**
 * Type for status display configuration
 */
export interface StatusDisplayConfig {
  label: string;
  type: PillType;
}

/**
 * Maps technical expense item statuses to user-friendly display configurations
 * Based on srn_expenseItemList status mapping
 * @param status - The technical status from the API
 * @returns StatusDisplayConfig with label and styling information
 */
export const getExpenseItemStatusDisplay = (status: string): StatusDisplayConfig => {
  switch (status) {
    case ExpenseStatus.CREATED:
      return {
        label: 'Draft',
        type: "draft"
      };
    case ExpenseStatus.ASSIGNED:
      return {
        label: 'Assigned',
        type: "waiting"
      };
    case ExpenseStatus.PENDING:
      return {
        label: 'In Approval',
        type: "waiting"
      };
    case ExpenseStatus.APPROVED:
    case ExpenseStatus.VERIFIED:
    case ExpenseStatus.BOOKED:
    case ExpenseStatus.TRANSFERRED:
      return {
        label: 'In Transit',
        type: "waiting"
      };
    case ExpenseStatus.PAID:
      return {
        label: 'Paid',
        type: "completed"
      };
    case ExpenseStatus.REJECTED:
      return {
        label: 'Revision Required',
        type: "task"
      };
    case ExpenseStatus.CLOSED:
      return {
        label: 'Closed',
        type: "completed"
      };
    default:
      return {
        label: status.charAt(0) + status.slice(1).toLowerCase(),
        type: "error"
      };
  }
};

/**
 * Maps technical expense plan statuses to user-friendly display configurations
 * @param status - The technical status from the API
 * @returns StatusDisplayConfig with label and styling information
 */
export const getExpensePlanStatusDisplay = (status: string): StatusDisplayConfig => {
  switch (status) {
    case ExpenseStatus.CREATED:
      return {
        label: 'Draft',
        type: "draft"
      };
    case ExpenseStatus.ASSIGNED:
      return {
        label: 'Assigned',
        type: "waiting"
      };
    case ExpenseStatus.PENDING:
      return {
        label: 'In Approval',
        type: "waiting"
      };
    case ExpenseStatus.APPROVED:
      return {
        label: 'Approved',
        type: "completed"
      };
    case ExpenseStatus.REJECTED:
      return {
        label: 'Revision Required',
        type: "task"
      };
    case ExpenseStatus.CLOSED:
      return {
        label: 'Closed',
        type: "completed"
      };
    // case ExpenseStatus.REJECTED:
    //   return {
    //     label: 'Rejected',
    //     type: "error"
    //   };
    default:
      return {
        label: status,
        type: "draft"
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
        label: 'Draft',
        type: "draft"
      };
    case ExpenseStatus.PENDING:
      return {
        label: 'In Approval',
        type: "waiting"
      };
    case ExpenseStatus.APPROVED:
    case ExpenseStatus.VERIFIED:
    case ExpenseStatus.BOOKED:
    case ExpenseStatus.TRANSFERRED:
      return {
        label: 'In Transit',
        type: "waiting"
      };
      case ExpenseStatus.PREPARED:
      return {
        label: 'Prepared',
        type: "draft"
      };
    case ExpenseStatus.ASSIGNED:
      return {
        label: 'Assigned',
        type: "waiting"
      };
    case ExpenseStatus.PAID:
      return {
        label: 'Paid',
        type: "completed"
      };
    case ExpenseStatus.REJECTED:
      return {
        label: 'Revision Required',
        type: "task"
      };
    case ExpenseStatus.CLOSED:
      return {
        label: 'Closed',
        type: "completed"
      };
    // case ExpenseStatus.REJECTED:
    //   return {
    //     label: 'Rejected',
    //     type: "error"
    //   };
    default:
      return {
        label: status,
        type: "draft"
      };
  }
};

/**
 * Maps technical advance payment statuses to user-friendly display configurations
 * @param status - The technical status from the API
 * @returns StatusDisplayConfig with label and styling information
 */
export const getAdvancePaymentStatusDisplay = (status: string): StatusDisplayConfig => {
  // Advance payments use the same status display configuration as expense requests
  return getExpenseRequestStatusDisplay(status);
};