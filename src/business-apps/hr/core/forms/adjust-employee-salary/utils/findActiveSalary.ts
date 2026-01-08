import type { EmployeeSalaryRecord } from '../types'

/**
 * Find active salary from a list of employee salaries
 *
 * NOTE: As of the latest update, the GraphQL query (EMPLOYEE_COMPENSATION_QUERY) now performs
 * server-side filtering and returns at most 1 approved active salary (limit: 1).
 *
 * Server-side filters applied:
 * - requestStatus = "APPROVED_SALARY_ADJUSTMENT" (only approved salaries)
 * - startDate <= today AND (endDate IS NULL OR endDate >= today)
 * - isDeleted = false
 * - Ordered by startDate DESC (most recent first)
 *
 * This function now simply returns the first element (which is already the active salary)
 * or null if no salary exists.
 */
export const findActiveSalary = (salaries: EmployeeSalaryRecord[]): EmployeeSalaryRecord | null => {
  if (!salaries || salaries.length === 0) {
    return null
  }

  // Server already filtered and limited to 1 approved active salary
  // Just return the first (and only) element
  return salaries[0] || null
}
