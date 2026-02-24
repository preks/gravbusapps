import React from 'react'
import type { AnalyticsDataTableColumn } from './AnalyticsDataTable'
import type { AnalyticsTableData } from './analyticsTabTypes'

/**
 * Shared cell renderer for analytics tables with period + value (and optional change).
 * Renders period as bold; value as number (locale) or string; other columns undefined (badge/default).
 */
export function renderPeriodValueCell(item: AnalyticsTableData, col: AnalyticsDataTableColumn): React.ReactNode {
  if (col.key === 'period') return <span className="gba:font-medium">{item.period}</span>
  if (col.key === 'value') return typeof item.value === 'number' ? item.value.toLocaleString() : String(item.value)
  return undefined
}
