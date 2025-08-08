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
  color?: string; // Optional color for custom styling
}

/**
 * Color configurations based on status screen mapping
 */
const STATUS_COLORS = {
  // Draft/Prepared statuses - Blue
  DRAFT: 'rgba(55, 99, 153, 0.55)',
  PREPARED: 'rgba(55, 99, 153, 0.55)',
  
  // In Transit/Assigned statuses - Light Blue
  IN_TRANSIT: 'rgba(0, 148, 209, 0.55)',
  ASSIGNED: 'rgba(0, 148, 209, 0.55)',
  
  // Completed/Paid/Approved statuses - Green
  COMPLETED: 'rgba(13, 188, 123, 0.55)',
  PAID: 'rgba(13, 188, 123, 0.55)',
  APPROVED: 'rgba(13, 188, 123, 0.55)',
  
  // Action Required/Task statuses - Orange
  ACTION_REQUIRED: 'rgba(255, 158, 2, 0.55)',
  TASK: 'rgba(255, 158, 2, 0.55)',
  
  // Rejected status - Red
  REJECTED: 'rgba(222, 29, 73, 0.55)',
  
  // In Revision status - Dark Blue
  IN_REVISION: 'rgba(0, 148, 209, 1)',
  
  // Cancelled status - Gray
  CANCELLED: 'rgba(141, 145, 153, 0.55)'
};

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
        type: "draft",
        color: STATUS_COLORS.DRAFT
      };
    case ExpenseStatus.ASSIGNED:
      return {
        label: 'Assigned',
        type: "waiting",
        color: STATUS_COLORS.ASSIGNED
      };
    case ExpenseStatus.PENDING:
      return {
        label: 'In Approval',
        type: "waiting",
        color: STATUS_COLORS.IN_TRANSIT
      };
    case ExpenseStatus.APPROVED:
    case ExpenseStatus.VERIFIED:
    case ExpenseStatus.BOOKED:
    case ExpenseStatus.TRANSFERRED:
      return {
        label: 'In Transit',
        type: "waiting",
        color: STATUS_COLORS.IN_TRANSIT
      };
    case ExpenseStatus.PAID:
      return {
        label: 'Paid',
        type: "completed",
        color: STATUS_COLORS.PAID
      };
    case ExpenseStatus.REJECTED:
      return {
        label: 'Revision Required',
        type: "task",
        color: STATUS_COLORS.TASK
      };
    case ExpenseStatus.CLOSED:
      return {
        label: 'Closed',
        type: "completed",
        color: STATUS_COLORS.COMPLETED
      };
    default:
      return {
        label: status.charAt(0) + status.slice(1).toLowerCase(),
        type: "error",
        color: STATUS_COLORS.REJECTED
      };
  }
};

/**
 * Maps technical expense plan statuses to user-friendly display configurations
 * Based on srn_expensePlanList status mapping
 * @param status - The technical status from the API
 * @returns StatusDisplayConfig with label and styling information
 */
export const getExpensePlanStatusDisplay = (status: string): StatusDisplayConfig => {
  switch (status) {
    case ExpenseStatus.CREATED:
      return {
        label: 'Draft',
        type: "draft",
        color: STATUS_COLORS.DRAFT
      };
    case ExpenseStatus.ASSIGNED:
      return {
        label: 'Assigned',
        type: "waiting",
        color: STATUS_COLORS.ASSIGNED
      };
    case ExpenseStatus.PENDING:
      return {
        label: 'In Approval',
        type: "waiting",
        color: STATUS_COLORS.IN_TRANSIT
      };
    case ExpenseStatus.APPROVED:
      return {
        label: 'Approved',
        type: "completed",
        color: STATUS_COLORS.APPROVED
      };
    case ExpenseStatus.REJECTED:
      return {
        label: 'Revision Required',
        type: "task",
        color: STATUS_COLORS.TASK
      };
    case ExpenseStatus.CLOSED:
      return {
        label: 'Closed',
        type: "completed",
        color: STATUS_COLORS.COMPLETED
      };
    default:
      return {
        label: status,
        type: "draft",
        color: STATUS_COLORS.DRAFT
      };
  }
};

/**
 * Maps technical expense request statuses to user-friendly display configurations
 * Based on srn_expenseRequest status mapping
 * @param status - The technical status from the API
 * @returns StatusDisplayConfig with label and styling information
 */
export const getExpenseRequestStatusDisplay = (status: string): StatusDisplayConfig => {
  switch (status) {
    case ExpenseStatus.CREATED:
      return {
        label: 'Draft',
        type: "draft",
        color: STATUS_COLORS.DRAFT
      };
    case ExpenseStatus.PENDING:
      return {
        label: 'In Approval',
        type: "waiting",
        color: STATUS_COLORS.IN_TRANSIT
      };
    case ExpenseStatus.APPROVED:
    case ExpenseStatus.VERIFIED:
    case ExpenseStatus.BOOKED:
    case ExpenseStatus.TRANSFERRED:
      return {
        label: 'In Transit',
        type: "waiting",
        color: STATUS_COLORS.IN_TRANSIT
      };
    case ExpenseStatus.PREPARED:
      return {
        label: 'Prepared',
        type: "draft",
        color: STATUS_COLORS.PREPARED
      };
    case ExpenseStatus.ASSIGNED:
      return {
        label: 'Assigned',
        type: "waiting",
        color: STATUS_COLORS.ASSIGNED
      };
    case ExpenseStatus.PAID:
      return {
        label: 'Paid',
        type: "completed",
        color: STATUS_COLORS.PAID
      };
    case ExpenseStatus.REJECTED:
      return {
        label: 'Revision Required',
        type: "task",
        color: STATUS_COLORS.TASK
      };
    case ExpenseStatus.CLOSED:
      return {
        label: 'Closed',
        type: "completed",
        color: STATUS_COLORS.COMPLETED
      };
    default:
      return {
        label: status,
        type: "draft",
        color: STATUS_COLORS.DRAFT
      };
  }
};

/**
 * Maps technical advance payment statuses to user-friendly display configurations
 * Based on srn_myAdvancePayments status mapping
 * @param status - The technical status from the API
 * @returns StatusDisplayConfig with label and styling information
 */
export const getAdvancePaymentStatusDisplay = (status: string): StatusDisplayConfig => {
  switch (status) {
    case ExpenseStatus.CREATED:
      return {
        label: 'Draft',
        type: "draft",
        color: STATUS_COLORS.DRAFT
      };
    case ExpenseStatus.PREPARED:
      return {
        label: 'Prepared',
        type: "draft",
        color: STATUS_COLORS.PREPARED
      };
    case ExpenseStatus.ASSIGNED:
      return {
        label: 'Assigned',
        type: "waiting",
        color: STATUS_COLORS.ASSIGNED
      };
    case ExpenseStatus.PENDING:
      return {
        label: 'In Approval',
        type: "waiting",
        color: STATUS_COLORS.IN_TRANSIT
      };
    case ExpenseStatus.APPROVED:
    case ExpenseStatus.VERIFIED:
    case ExpenseStatus.BOOKED:
    case ExpenseStatus.TRANSFERRED:
      return {
        label: 'In Transit',
        type: "waiting",
        color: STATUS_COLORS.IN_TRANSIT
      };
    case ExpenseStatus.PAID:
      return {
        label: 'Paid',
        type: "completed",
        color: STATUS_COLORS.PAID
      };
    case ExpenseStatus.REJECTED:
      return {
        label: 'Revision Required',
        type: "task",
        color: STATUS_COLORS.TASK
      };
    case ExpenseStatus.CLOSED:
      return {
        label: 'Closed',
        type: "completed",
        color: STATUS_COLORS.COMPLETED
      };
    default:
      return {
        label: status,
        type: "draft",
        color: STATUS_COLORS.DRAFT
      };
  }
};