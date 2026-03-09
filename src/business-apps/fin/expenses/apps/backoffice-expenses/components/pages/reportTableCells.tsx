import React from 'react'
import { formatCurrency, extractCurrencyCode } from '../../utils/currencyUtils'
import { formatDateLocalized } from '../../utils/dateUtils'
import { isDateKey } from './backofficeExpenseReportsPage.utils'

export const renderReportTableCell = (columnKey: string, rowOriginal: any): React.ReactNode => {
  const value = rowOriginal?.[columnKey]
  if (columnKey.includes('amount') || columnKey.includes('Amount')) {
    const currency = extractCurrencyCode(rowOriginal?.currency || '') || 'EUR'
    return <span className="gba:text-sm">{formatCurrency(Number(value) || 0, currency)}</span>
  }
  if (isDateKey(columnKey)) {
    return <span className="gba:text-sm">{value ? formatDateLocalized(value, 'L') : '-'}</span>
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
