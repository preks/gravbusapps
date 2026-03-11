import { formatDateLocalized } from '../../../utils/dateUtils'
import { extractCurrencyCode } from '../../../utils/sharedUtils'
import type { Currency } from '../../../hooks/useFilterData'

export const getCurrencyLabel = (currencyRef: string, currencies?: readonly Currency[]): string => {
  if (!currencyRef) return 'Currency: All'
  const currency = currencies?.find(c => c.currencyRef === currencyRef)
  const currencyCode = currency?.code || extractCurrencyCode(currencyRef, currencyRef)
  return `Currency: ${currencyCode}`
}

export const getEffectiveDateLabel = (effectiveDateRange: any[] | null): string => {
  if (!effectiveDateRange || (!effectiveDateRange[0] && !effectiveDateRange[1])) return 'Effective Date: All'
  const fromLabel = effectiveDateRange[0] ? formatDateLocalized(effectiveDateRange[0]) : '-'
  const toLabel = effectiveDateRange[1] ? formatDateLocalized(effectiveDateRange[1]) : '-'
  return `Effective Date: ${fromLabel} → ${toLabel}`
}

export const getRequestDateLabel = (requestDateRange: any[] | null): string => {
  if (!requestDateRange || (!requestDateRange[0] && !requestDateRange[1])) return 'Creation Date: All'
  const fromLabel = requestDateRange[0] ? formatDateLocalized(requestDateRange[0]) : '-'
  const toLabel = requestDateRange[1] ? formatDateLocalized(requestDateRange[1]) : '-'
  return `Creation Date: ${fromLabel} → ${toLabel}`
}

export const getDepartmentLabel = (
  departmentId: string | undefined,
  departmentOptions: readonly { id: string; name: string }[]
): string => {
  if (!departmentId) return 'Department: All'
  const dept = departmentOptions.find(d => d.id === departmentId)
  return `Department: ${dept?.name || departmentId}`
}
