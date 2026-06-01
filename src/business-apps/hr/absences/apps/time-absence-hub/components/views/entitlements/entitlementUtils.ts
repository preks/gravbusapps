import { OrgEntitlementRow } from '../../../queries/OrgEntitlementQueries'

export const formatEntitlementNumber = (value?: number | null): string => {
  if (value === null || value === undefined) {
    return '-'
  }

  return value.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

export const getEntitlementRemaining = (row: OrgEntitlementRow): number | null | undefined =>
  row.remaining ?? row.available

export const isEntitlementExpiringSoon = (validTo?: string | null, todayIso?: string): boolean => {
  if (!validTo || !todayIso) {
    return false
  }

  const today = new Date(todayIso)
  const end = new Date(validTo)
  const diffDays = (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)

  return diffDays >= 0 && diffDays <= 30
}

export const getEntitlementEmployeeName = (row: OrgEntitlementRow, unknownEmployeeLabel: string): string => {
  const displayName = row.employee?.displayName?.trim()

  if (displayName) {
    return displayName
  }

  const name = `${row.employee?.firstName ?? ''} ${row.employee?.lastName ?? ''}`.trim()

  return name || unknownEmployeeLabel
}
