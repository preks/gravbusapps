// Filter utilities for Team Spending Analytics

import {
  EXCLUDE_ITEM_STATUSES,
  EXCLUDE_REQUEST_STATUSES,
  EXCLUDE_PLAN_STATUSES,
  EXCLUDE_ADV_PAYMENT_STATUSES
} from '../../constants/expenseStatus'
import type { AnalyticsData } from './types'

/**
 * Apply location, department, and currency filters to items
 */
export function applyFilters(
  item: any,
  getEmployee: (item: any) => any,
  selectedLocationIds: string[],
  selectedDepartmentIds: string[]
): boolean {
  const employee = getEmployee(item)
  const locationId = employee?.employeePosition?.siteLocation?.id
  const departmentId = employee?.employeePosition?.organizationalUnit?.id

  if (locationId && selectedLocationIds.length > 0 && !selectedLocationIds.includes(locationId)) {
    return false
  }
  if (departmentId && selectedDepartmentIds.length > 0 && !selectedDepartmentIds.includes(departmentId)) {
    return false
  }
  // NOTE: Currency filtering is NOT done here because the GraphQL query already filters by currency
  // The data returned from GET_EXPENSE_ANALYTICS_DATA is already filtered by currencyRef
  return true
}

/**
 * Filter all data types with status exclusions
 */
export function filterAllData(
  rawData: AnalyticsData,
  selectedLocationIds: string[],
  selectedDepartmentIds: string[],
  currencyFilter?: string | null
) {
  const filteredExpenseItems =
    rawData.expenseItems?.filter(
      item =>
        applyFilters(item, i => i.employee, selectedLocationIds, selectedDepartmentIds, currencyFilter) &&
        (!item.status || !EXCLUDE_ITEM_STATUSES.has(item.status))
    ) || []

  const filteredExpenseRequests =
    rawData.expenseRequests?.filter(
      item =>
        applyFilters(item, i => i.employee, selectedLocationIds, selectedDepartmentIds, currencyFilter) &&
        (!item.status || !EXCLUDE_REQUEST_STATUSES.has(item.status))
    ) || []

  const filteredExpensePlans =
    rawData.expensePlans?.filter(
      item =>
        applyFilters(item, i => i.employee, selectedLocationIds, selectedDepartmentIds, currencyFilter) &&
        (!item.status || !EXCLUDE_PLAN_STATUSES.has(item.status))
    ) || []

  const filteredAdvancePayments =
    rawData.advancePayments?.filter(
      item =>
        applyFilters(item, i => i.expensePlan?.employee, selectedLocationIds, selectedDepartmentIds, currencyFilter) &&
        (!item.status || !EXCLUDE_ADV_PAYMENT_STATUSES.has(item.status))
    ) || []

  return {
    filteredExpenseItems,
    filteredExpenseRequests,
    filteredExpensePlans,
    filteredAdvancePayments
  }
}
