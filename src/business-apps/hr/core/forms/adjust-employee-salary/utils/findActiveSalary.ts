import type { EmployeeSalaryRecord } from '../types'

/**
 * Find active salary from a list of employee salaries
 * Logic: activeFrom <= now AND (activeTo >= now OR activeTo IS NULL)
 * Falls back to most recent salary if no active salary found
 *
 * Note: Uses Date object comparison for consistency with useCurrentCompensation.ts
 */
export const findActiveSalary = (salaries: EmployeeSalaryRecord[]): EmployeeSalaryRecord | null => {
  if (!salaries || salaries.length === 0) {
    return null
  }

  const nowDate = new Date()

  // Find active salary based on date range
  const activeSalary = salaries.find(salary => {
    const activeFrom = salary.activeFrom ? new Date(salary.activeFrom) : null
    const activeTo = salary.activeTo ? new Date(salary.activeTo) : null

    // Null activeFrom means always valid from beginning
    // Null activeTo means never expires
    const isActiveFrom = !activeFrom || activeFrom <= nowDate
    const isActiveTo = !activeTo || activeTo >= nowDate

    return isActiveFrom && isActiveTo
  })

  // Fallback to most recent salary (first in array since ordered by activeFrom DESC, createdAt DESC)
  return activeSalary || salaries[0] || null
}
