import React from 'react'
import { formatCurrency, extractCurrencyCode } from '../../utils/currencyUtils'
import { formatDateLocalized } from '../../utils/dateUtils'
import { isDateKey } from './backofficeExpenseReportsPage.utils'
import type { TranslateFn } from '../../utils/utils'

export function isAmountColumnKey(columnKey: string): boolean {
  return /amount/i.test(columnKey)
}

export const renderReportTableCell = (columnKey: string, rowOriginal: any, t: TranslateFn): React.ReactNode => {
  const value =
    columnKey === 'status' ? rowOriginal?.statusLabel || rowOriginal?.status || '' : rowOriginal?.[columnKey]
  if (isAmountColumnKey(columnKey)) {
    const currency = extractCurrencyCode(rowOriginal?.currency || '') || 'EUR'
    return (
      <span className="gba:block gba:min-w-0 gba:text-right gba:text-sm">
        {formatCurrency(Number(value) || 0, currency)}
      </span>
    )
  }
  if (isDateKey(columnKey)) {
    return <span className="gba:text-sm">{value ? formatDateLocalized(value, t, 'L') : '-'}</span>
  }
  if (columnKey === 'title' || columnKey === 'employeeName') {
    const displayValue = value || '-'
    return (
      <span className="gba:block gba:truncate gba:text-sm" title={displayValue}>
        {displayValue}
      </span>
    )
  }
  return (
    <span className="gba:text-sm">{value === null || value === undefined || value === '' ? '-' : String(value)}</span>
  )
}
