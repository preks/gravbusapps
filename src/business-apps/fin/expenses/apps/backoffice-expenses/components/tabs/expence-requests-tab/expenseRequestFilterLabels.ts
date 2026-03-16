import { formatDateLocalized } from '../../../utils/dateUtils'
import { extractCurrencyCode } from '../../../utils/sharedUtils'
import type { Currency } from '../../../hooks/useFilterData'
import type { TranslateFn } from '../../../utils/utils'

export const getCurrencyLabel = (currencyRef: string, currencies?: readonly Currency[], t?: TranslateFn): string => {
  if (!currencyRef) return t ? t('chip-currency-all') : 'Currency: All'
  const currency = currencies?.find(c => c.currencyRef === currencyRef)
  const currencyCode = currency?.code || extractCurrencyCode(currencyRef, currencyRef)
  return t ? t('chip-currency', { code: currencyCode }) : `Currency: ${currencyCode}`
}

export const getEffectiveDateLabel = (effectiveDateRange: any[] | null, t?: TranslateFn): string => {
  if (!effectiveDateRange || (!effectiveDateRange[0] && !effectiveDateRange[1])) {
    return t ? t('chip-effective-date-all') : 'Effective Date: All'
  }
  const fromLabel = effectiveDateRange[0] ? formatDateLocalized(effectiveDateRange[0], t ?? ((k: string) => k)) : '-'
  const toLabel = effectiveDateRange[1] ? formatDateLocalized(effectiveDateRange[1], t ?? ((k: string) => k)) : '-'
  return t ? t('chip-effective-date', { from: fromLabel, to: toLabel }) : `Effective Date: ${fromLabel} → ${toLabel}`
}

export const getRequestDateLabel = (requestDateRange: any[] | null, t?: TranslateFn): string => {
  if (!requestDateRange || (!requestDateRange[0] && !requestDateRange[1])) {
    return t ? t('chip-creation-date-all') : 'Creation Date: All'
  }
  const fromLabel = requestDateRange[0] ? formatDateLocalized(requestDateRange[0], t ?? ((k: string) => k)) : '-'
  const toLabel = requestDateRange[1] ? formatDateLocalized(requestDateRange[1], t ?? ((k: string) => k)) : '-'
  return t ? t('chip-creation-date', { from: fromLabel, to: toLabel }) : `Creation Date: ${fromLabel} → ${toLabel}`
}

export const getDepartmentLabel = (
  departmentId: string | undefined,
  departmentOptions: readonly { id: string; name: string }[],
  t?: TranslateFn
): string => {
  if (!departmentId) return t ? t('chip-department-all') : 'Department: All'
  const dept = departmentOptions.find(d => d.id === departmentId)
  return t ? t('chip-department', { name: dept?.name || departmentId }) : `Department: ${dept?.name || departmentId}`
}
