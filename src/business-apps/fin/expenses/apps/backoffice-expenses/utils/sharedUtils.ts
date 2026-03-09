import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { StatusDisplayConfig } from './utils'

export const extractCurrencyCode = (currencyRef: string | null | undefined, fallback = 'EUR'): string => {
  if (!currencyRef) return fallback
  return String(currencyRef).split(':').pop() || fallback
}

export const buildStatusDisplayName = (
  status: string,
  getStatusDisplay: (s: string) => StatusDisplayConfig
): string => {
  const config = getStatusDisplay(status)
  if (config.label.toLowerCase() === status.toLowerCase()) return config.label
  const formatted = status.charAt(0) + status.slice(1).toLowerCase()
  const translated = getTranslationFromI18nKeyAndLabel(`lowcoder:expense_statuses.${status.toLowerCase()}`, formatted)
  return `${config.label} (${translated})`
}

const MAX_QUERY_LIMIT = 1000
export const enforceQueryLimit = (limit: number): number => Math.min(limit, MAX_QUERY_LIMIT)

export const extractUniqueStatuses = (items: readonly any[], exclude: readonly string[] = ['CREATED']): string[] => {
  const statuses = new Set<string>()
  for (const item of items) {
    if (item.status) statuses.add(item.status)
  }
  return Array.from(statuses)
    .filter(s => !exclude.includes(s))
    .sort((a, b) => a.localeCompare(b))
}

export interface EmployeeInfo {
  readonly id: string
  readonly name: string
}

export const extractUniqueEmployees = (
  items: readonly any[],
  getEmployee: (item: any) => any,
  searchTerm: string
): EmployeeInfo[] => {
  const employees = new Map<string, EmployeeInfo>()
  const searchLower = searchTerm.trim().toLowerCase()

  for (const item of items) {
    const emp = getEmployee(item)
    if (!emp) continue

    const firstName = emp.firstName || ''
    const lastName = emp.lastName || ''
    const displayName = emp.displayName || ''
    const employeeId = emp.id
    const fullName = `${firstName} ${lastName}`.trim()

    const matchesSearch =
      fullName.toLowerCase().includes(searchLower) ||
      displayName.toLowerCase().includes(searchLower) ||
      firstName.toLowerCase().includes(searchLower) ||
      lastName.toLowerCase().includes(searchLower)

    if (matchesSearch && employeeId && (fullName || displayName)) {
      employees.set(employeeId, { id: employeeId, name: displayName || fullName })
    }
  }

  return Array.from(employees.values()).sort((a, b) => a.name.localeCompare(b.name))
}
