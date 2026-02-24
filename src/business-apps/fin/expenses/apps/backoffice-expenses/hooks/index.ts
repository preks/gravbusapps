/**
 * Hooks index file
 * Export all hooks for easy importing
 */

import { default as useDashboardStats } from './useDashboardStats'
import { useExpenseRequests } from './useExpenseRequests'
import { default as useExpenseRequestDetails } from './useExpenseRequestDetails'
import { useAdvancePayments } from './useAdvancePayment'

export { useDashboardStats }
export { useExpenseRequests }
export { useExpenseRequestDetails }
export { useAdvancePayments }
export { useBackofficeExpensesOverview }
export { useBackofficeExpenseReportData }
export { useBackofficeTeamSpendingAnalytics }

export { default } from './HooksComponent'
