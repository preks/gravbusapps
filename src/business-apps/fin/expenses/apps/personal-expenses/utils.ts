import React from 'react';
import { PillType } from '@/components/pill/Pill';
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale, formatNumberFunction } from '@/common/utils/windowUtils';

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
  
  // Closed/Paid/Approved statuses - Green
  CLOSED: 'rgba(13, 188, 123, 0.55)',
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
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.draft','Draft'),
        type: "draft",
        color: STATUS_COLORS.DRAFT
      };
    case ExpenseStatus.ASSIGNED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.assigned','Assigned'),
        type: "waiting",
        color: STATUS_COLORS.ASSIGNED
      };
    case ExpenseStatus.PENDING:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_approval','In Approval'),
        type: "waiting",
        color: STATUS_COLORS.IN_TRANSIT
      };
    case ExpenseStatus.APPROVED:
    case ExpenseStatus.VERIFIED:
    case ExpenseStatus.BOOKED:
    case ExpenseStatus.TRANSFERRED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_transit','In Transit'),
        type: "waiting",
        color: STATUS_COLORS.IN_TRANSIT
      };
    case ExpenseStatus.PAID:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.paid','Paid'),
        type: "completed",
        color: STATUS_COLORS.PAID
      };
    case ExpenseStatus.REJECTED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.revision_required','Revision Required'),
        type: "task",
        color: STATUS_COLORS.TASK
      };
    case ExpenseStatus.CLOSED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.closed','Closed'),
        type: "completed",
        color: STATUS_COLORS.CLOSED
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
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.draft','Draft'),
        type: "draft",
        color: STATUS_COLORS.DRAFT
      };
    case ExpenseStatus.ASSIGNED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.assigned','Assigned'),
        type: "waiting",
        color: STATUS_COLORS.ASSIGNED
      };
    case ExpenseStatus.PENDING:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_approval','In Approval'),
        type: "waiting",
        color: STATUS_COLORS.IN_TRANSIT
      };
    case ExpenseStatus.APPROVED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.approved','Approved'),
        type: "completed",
        color: STATUS_COLORS.APPROVED
      };
    case ExpenseStatus.REJECTED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.revision_required','Revision Required'),
        type: "task",
        color: STATUS_COLORS.TASK
      };
    case ExpenseStatus.CLOSED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.closed','Closed'),
        type: "completed",
        color: STATUS_COLORS.CLOSED
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
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.draft', 'Draft'),
        type: "draft",
        color: STATUS_COLORS.DRAFT
      };
    case ExpenseStatus.PENDING:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_approval', 'In Approval'),
        type: "waiting",
        color: STATUS_COLORS.IN_TRANSIT
      };
    case ExpenseStatus.APPROVED:
    case ExpenseStatus.VERIFIED:
    case ExpenseStatus.BOOKED:
    case ExpenseStatus.TRANSFERRED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_transit', 'In Transit'),
        type: "waiting",
        color: STATUS_COLORS.IN_TRANSIT
      };
    case ExpenseStatus.PREPARED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.prepared', 'Prepared'),
        type: "draft",
        color: STATUS_COLORS.PREPARED
      };
    case ExpenseStatus.ASSIGNED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.assigned', 'Assigned'),
        type: "waiting",
        color: STATUS_COLORS.ASSIGNED
      };
    case ExpenseStatus.PAID:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.paid', 'Paid'),
        type: "completed",
        color: STATUS_COLORS.PAID
      };
    case ExpenseStatus.REJECTED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.revision_required', 'Revision Required'),
        type: "task",
        color: STATUS_COLORS.TASK
      };
    case ExpenseStatus.CLOSED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.closed', 'Closed'),
        type: "completed",
        color: STATUS_COLORS.CLOSED
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
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.draft', 'Draft'),
        type: "draft",
        color: STATUS_COLORS.DRAFT
      };
    case ExpenseStatus.PREPARED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.prepared', 'Prepared'),
        type: "draft",
        color: STATUS_COLORS.PREPARED
      };
    case ExpenseStatus.ASSIGNED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.assigned', 'Assigned'),
        type: "waiting",
        color: STATUS_COLORS.ASSIGNED
      };
    case ExpenseStatus.PENDING:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_approval', 'In Approval'),
        type: "waiting",
        color: STATUS_COLORS.IN_TRANSIT
      };
    case ExpenseStatus.APPROVED:
    case ExpenseStatus.VERIFIED:
    case ExpenseStatus.BOOKED:
    case ExpenseStatus.TRANSFERRED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_transit', 'In Transit'),
        type: "waiting",
        color: STATUS_COLORS.IN_TRANSIT
      };
    case ExpenseStatus.PAID:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.paid', 'Paid'),
        type: "completed",
        color: STATUS_COLORS.PAID
      };
    case ExpenseStatus.REJECTED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.revision_required', 'Revision Required'),
        type: "task",
        color: STATUS_COLORS.TASK
      };
    case ExpenseStatus.CLOSED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.closed', 'Closed'),
        type: "completed",
        color: STATUS_COLORS.CLOSED
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
 * Formats currency display based on active user locale
 * - English (en-US): EUR 1,234
 * - German (de-DE): 1.234 EUR  
 * - Romanian (fr-FR): 1 234 EUR
 * @param amount - The amount to format
 * @param currencyCode - The currency code (e.g., 'EUR', 'USD')
 * @returns Formatted currency string based on user locale
 */
export const formatCurrencyDisplay = (amount: number | string | null | undefined, currencyCode: string | null | undefined): string => {
  // Handle null/undefined amounts
  if (amount === null || amount === undefined) {
    return `0 ${currencyCode || 'EUR'}`;
  }
  
  // Handle empty string or invalid amounts
  if (amount === '' || isNaN(Number(amount))) {
    return `0 ${currencyCode || 'EUR'}`;
  }
  
  // Handle null/undefined currency codes - use amount as default if available
  if (currencyCode === null || currencyCode === undefined || currencyCode === '') {
    // Try to extract currency from amount if it's a string containing currency info
    if (typeof amount === 'string' && amount.includes(' ')) {
      const parts = amount.split(' ');
      const lastPart = parts[parts.length - 1];
      // Check if last part looks like a currency code (3 letters, uppercase)
      if (/^[A-Z]{3}$/.test(lastPart)) {
        currencyCode = lastPart;
      } else {
        currencyCode = 'EUR'; // Fallback to EUR
      }
    } else {
      currencyCode = 'EUR'; // Default to EUR if no currency provided
    }
  }
  
  const userLocale = getCurrentActiveUserLocale();
  
  // Fallback formatting if formatNumberFunction is not available
  let formattedAmount: string;
  try {
    if (formatNumberFunction && typeof formatNumberFunction === 'function') {
      const result = formatNumberFunction(String(amount));
      // Handle case where formatNumberFunction returns undefined, null, or empty string
      if (result !== undefined && result !== null && result !== '') {
        formattedAmount = result;
      } else {
        // Use native number formatting as fallback
        formattedAmount = new Intl.NumberFormat(userLocale).format(Number(amount));
      }
    } else {
      // Use native number formatting if formatNumberFunction is not available
      formattedAmount = new Intl.NumberFormat(userLocale).format(Number(amount));
    }
  } catch (error) {
    // If anything fails, use basic string conversion
    formattedAmount = String(amount);
  }
  
  // Final safety check - ensure we always have a valid string
  if (!formattedAmount || formattedAmount === 'undefined' || formattedAmount === 'null') {
    formattedAmount = new Intl.NumberFormat(userLocale).format(Number(amount));
  }
  
  // Extract language from locale (e.g., 'en' from 'en-US')
  const language = userLocale.split('-')[0].toLowerCase();
  
  switch (language) {
    case 'de':
      // German format: 1.234 EUR
      return `${formattedAmount} ${currencyCode}`;
    case 'ro':
      // Romanian format: 1 234 EUR 
      return `${formattedAmount} ${currencyCode}`;
    case 'en':
      // English format: EUR 1,234
      return `${currencyCode} ${formattedAmount}`;
    default:
      // Default to English format for any unsupported locale
      return `${formattedAmount} ${currencyCode}`;
  }
};