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
export { useBackofficeExpensesOverview } from './useBackofficeExpensesOverview'
export { useBackofficeExpenseReportData } from './useBackofficeExpenseReportData'
export { useBackofficeTeamSpendingAnalytics } from './useBackofficeTeamSpendingAnalytics'

export { default } from './HooksComponent'
