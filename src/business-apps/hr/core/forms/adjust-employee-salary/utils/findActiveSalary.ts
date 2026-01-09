import type { EmployeeSalaryRecord } from '../types'

/**
 * Find active salary from a list of employee salaries
 *
 * HYBRID APPROACH (Server-side + Client-side filtering):
 *
 * Server-side filters (EMPLOYEE_COMPENSATION_QUERY):
 * - requestStatus = "APPROVED_SALARY_ADJUSTMENT" (only approved salaries)
 * - isDeleted = false (exclude soft-deleted records)
 * - startDate <= today (salary has started)
 * - Ordered by startDate DESC (most recent first)
 * - Limit: 5 records (for client-side filtering)
 *
 * Client-side filtering (this function):
 * - Find first salary where: startDate <= today AND (endDate IS NULL OR endDate >= today)
 * - Returns null if no active salary found
 *
 * Why client-side filtering?
 * - GraphQL doesn't handle null comparison properly with _not operator
 * - Ensures 100% accuracy for null endDate values
 * - Covers edge cases (expired salaries with recent startDate)
 */
export const findActiveSalary = (salaries: EmployeeSalaryRecord[]): EmployeeSalaryRecord | null => {
  if (!salaries || salaries.length === 0) {
    return null
  }

  // Get today's date in ISO format (YYYY-MM-DD) for string comparison
  const today = new Date().toISOString().split('T')[0]

  // Find active salary: startDate <= today (guaranteed by server) AND (endDate IS NULL OR endDate >= today)
  // Server query already filtered by startDate <= today, so we only check endDate
  // Use string comparison to avoid timezone issues (YYYY-MM-DD format)
  const activeSalary = salaries.find(salary => {
    // Server guarantees startDate <= today, so we only need to check endDate
    const isNotExpired = !salary.endDate || salary.endDate >= today

    return isNotExpired
  })

  // Return active salary, or null if no active salary found
  return activeSalary || null
}
