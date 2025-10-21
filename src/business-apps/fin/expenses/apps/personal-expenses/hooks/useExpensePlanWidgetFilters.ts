// Combines selectedFilters and activeWidget into a single array of filters for ExpensePlansTab
// This follows the same pattern as useExpenseItemsTabFilters

import { useMemo } from 'react'
import { ExpenseStatus } from '../utils'

export function useExpensePlanWidgetFilters(selectedFilters: string[], activeWidget: string | null): string[] {
  return useMemo(() => {
    // If no widget is active, return the original filters
    if (!activeWidget) {
      return selectedFilters
    }

    // If total-plans widget is active, filter for closed status and current month
    if (activeWidget === 'total-plans') {
      const closedFilters = [ExpenseStatus.CLOSED]

      // If we already have these filters, return them
      if (selectedFilters.length === 1 && selectedFilters.includes(ExpenseStatus.CLOSED)) {
        return selectedFilters
      }

      // Return only closed filters
      return closedFilters
    }

    // If total-estimated widget is active, filter for all statuses except CREATED (Draft) and PAID
    if (activeWidget === 'total-estimated') {
      const estimatedFilters = [
        ExpenseStatus.PREPARED,
        ExpenseStatus.ASSIGNED,
        ExpenseStatus.PENDING,
        ExpenseStatus.APPROVED,
        ExpenseStatus.RETURNED,
        ExpenseStatus.REJECTED,
        ExpenseStatus.VERIFIED,
        ExpenseStatus.BOOKED,
        ExpenseStatus.CLOSED,
        ExpenseStatus.TRANSFERRED
      ]

      // If we already have these filters, return them
      if (
        selectedFilters.length === estimatedFilters.length &&
        estimatedFilters.every(filter => selectedFilters.includes(filter))
      ) {
        return selectedFilters
      }

      // Return estimated filters
      return estimatedFilters
    }

    // If pending-approval widget is active, filter for PENDING status only
    if (activeWidget === 'pending-approval') {
      const pendingFilters = [ExpenseStatus.PENDING]

      // If we already have these filters, return them
      if (selectedFilters.length === 1 && selectedFilters.includes(ExpenseStatus.PENDING)) {
        return selectedFilters
      }

      // Return only pending filters
      return pendingFilters
    }

    // If top-destinations widget is active, don't apply status filters
    // (destination filtering is handled by the GraphQL query)
    if (activeWidget === 'top-destinations') {
      // Return empty array to show all statuses for the destination
      return []
    }

    // For other widgets, return original filters
    return selectedFilters
  }, [selectedFilters, activeWidget])
}

// Helper function to determine if a widget should be active based on current filters
export function getActiveWidgetFromFilters(selectedFilters: string[]): string | null {
  // Helper: any date range (effective or plan)
  const hasAnyDateRange = selectedFilters.includes('effectiveDateRange') || selectedFilters.includes('planDateRange')

  // Consider only status filters for widget detection
  const statusFiltersOnly = selectedFilters.filter(f => (Object.values(ExpenseStatus) as string[]).includes(f))

  const totalPlansFilters = [ExpenseStatus.CLOSED, ExpenseStatus.PAID]

  // Check for total-estimated widget pattern (all statuses except CREATED and PAID)
  const estimatedStatusFilters = [
    ExpenseStatus.PREPARED,
    ExpenseStatus.ASSIGNED,
    ExpenseStatus.PENDING,
    ExpenseStatus.APPROVED,
    ExpenseStatus.REJECTED,
    ExpenseStatus.VERIFIED,
    ExpenseStatus.BOOKED,
    ExpenseStatus.TRANSFERRED
  ]

  const hasEstimatedPattern =
    estimatedStatusFilters.every(filter => statusFiltersOnly.includes(filter)) &&
    hasAnyDateRange &&
    !selectedFilters.includes(ExpenseStatus.CREATED) &&
    !selectedFilters.includes(ExpenseStatus.PAID)

  const hasTotalPattern = totalPlansFilters.every(filter => statusFiltersOnly.includes(filter)) && hasAnyDateRange

  // Check for pending-approval widget pattern (only PENDING status)
  const hasPendingOnly = statusFiltersOnly.length === 1 && statusFiltersOnly.includes(ExpenseStatus.PENDING)

  // If only closed status is selected, activate total-plans widget
  if (hasTotalPattern) {
    return 'total-plans'
  }

  // If estimated pattern is detected, activate total-estimated widget
  if (hasEstimatedPattern) {
    return 'total-estimated'
  }

  // If only pending status is selected, activate pending-approval widget
  if (hasPendingOnly) {
    return 'pending-approval'
  }

  // Note: top-destinations widget is activated by clicking the widget
  // and doesn't have a specific filter pattern since it filters by destination
  // rather than status

  // If no specific pattern or mixed filters, no widget should be active
  return null
}
