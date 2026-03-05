import React from 'react'
import type { AnalyticsDataTableColumn } from './AnalyticsDataTable'
import type { AnalyticsTableData } from './analyticsTabTypes'

/**
 * Shared cell renderer for analytics tables with period + value (and optional change).
 * Only customizes value (locale number); period and other columns use table default/badge.
 */
export function renderPeriodValueCell(item: AnalyticsTableData, col: AnalyticsDataTableColumn): React.ReactNode {
  if (col.key === 'value') return typeof item.value === 'number' ? item.value.toLocaleString() : String(item.value)
  return undefined
}
