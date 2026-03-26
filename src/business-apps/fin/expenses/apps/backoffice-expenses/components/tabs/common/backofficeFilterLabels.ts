import { formatDateLocalized } from '../../../utils/dateUtils'
import { extractCurrencyCode } from '../../../utils/sharedUtils'
import type { Currency } from '../../../hooks/useFilterData'
import type { DepartmentOption } from '../../../utils/departmentOptions'
import type { TranslateFn } from '../../../utils/utils'

type DateRangeValue = [Date | null, Date | null] | null

export const getCurrencyLabel = (currencyRef: string, currencies?: readonly Currency[], t?: TranslateFn): string => {
  if (!currencyRef) return t ? t('chip-currency-all') : 'Currency: All'
  const currency = currencies?.find(item => item.currencyRef === currencyRef)
  const currencyCode = currency?.code || extractCurrencyCode(currencyRef, currencyRef)
  return t ? t('chip-currency', { code: currencyCode }) : `Currency: ${currencyCode}`
}

export const getEffectiveDateLabel = (effectiveDateRange: DateRangeValue, t?: TranslateFn): string => {
  if (!effectiveDateRange || (!effectiveDateRange[0] && !effectiveDateRange[1])) {
    return t ? t('chip-effective-date-all') : 'Effective Date: All'
  }

  const translate = t ?? ((key: string) => key)
  const fromLabel = effectiveDateRange[0] ? formatDateLocalized(effectiveDateRange[0], translate) : '-'
  const toLabel = effectiveDateRange[1] ? formatDateLocalized(effectiveDateRange[1], translate) : '-'

  return t ? t('chip-effective-date', { from: fromLabel, to: toLabel }) : `Effective Date: ${fromLabel} -> ${toLabel}`
}

export const getRequestDateLabel = (requestDateRange: DateRangeValue, t?: TranslateFn): string => {
  if (!requestDateRange || (!requestDateRange[0] && !requestDateRange[1])) {
    return t ? t('chip-creation-date-all') : 'Creation Date: All'
  }

  const translate = t ?? ((key: string) => key)
  const fromLabel = requestDateRange[0] ? formatDateLocalized(requestDateRange[0], translate) : '-'
  const toLabel = requestDateRange[1] ? formatDateLocalized(requestDateRange[1], translate) : '-'

  return t ? t('chip-creation-date', { from: fromLabel, to: toLabel }) : `Creation Date: ${fromLabel} -> ${toLabel}`
}

export const getDepartmentLabel = (
  departmentId: string | undefined,
  departmentOptions: readonly DepartmentOption[],
  t?: TranslateFn
): string => {
  if (!departmentId) return t ? t('chip-department-all') : 'Department: All'
  const department = departmentOptions.find(option => option.id === departmentId)
  return t
    ? t('chip-department', { name: department?.name || departmentId })
    : `Department: ${department?.name || departmentId}`
}
