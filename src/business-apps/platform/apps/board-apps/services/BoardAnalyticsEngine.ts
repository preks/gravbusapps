/**
 * BoardAnalyticsEngine - central computation layer for dashboard widgets.
 *
 * Accepts an AnalyticsQuery, resolves column names, picks the best execution
 * strategy (all rows client-side, entity aggregates, or cross-board rollups),
 * and returns a typed AnalyticsResult.
 */

import type { BoardRow, BoardColumn } from '../types'
import type { AnalyticsQuery, AnalyticsResult } from '../types/analytics'
import {
  aggregateRows,
  computeTimeSeries,
  computeScatter,
  computeHistogram,
  resolveColumnName
} from './analyticsAggregators'
import type { DataProfile } from '../types/analytics'
import { profileData } from './dataProfiler'

function resolveQueryColumns(columns: BoardColumn[], query: AnalyticsQuery): AnalyticsQuery {
  const r = (ref: string) => resolveColumnName(columns, ref)

  switch (query.type) {
    case 'aggregate':
      return {
        type: 'aggregate',
        query: {
          ...query.query,
          groupBy: r(query.query.groupBy),
          breakdown: query.query.breakdown ? r(query.query.breakdown) : undefined,
          metrics: query.query.metrics.map(m => ({ ...m, column: r(m.column) }))
        }
      }
    case 'timeseries':
      return {
        type: 'timeseries',
        query: {
          ...query.query,
          dateColumn: r(query.query.dateColumn),
          breakdown: query.query.breakdown ? r(query.query.breakdown) : undefined,
          metrics: query.query.metrics.map(m => ({ ...m, column: r(m.column) }))
        }
      }
    case 'scatter':
      return {
        type: 'scatter',
        query: {
          ...query.query,
          xColumn: r(query.query.xColumn),
          yColumn: r(query.query.yColumn),
          labelColumn: query.query.labelColumn ? r(query.query.labelColumn) : undefined,
          sizeColumn: query.query.sizeColumn ? r(query.query.sizeColumn) : undefined,
          colorColumn: query.query.colorColumn ? r(query.query.colorColumn) : undefined
        }
      }
    case 'histogram':
      return {
        type: 'histogram',
        query: { ...query.query, column: r(query.query.column) }
      }
  }
}

const SAMPLE_THRESHOLD = 10_000

export function executeQuery(rows: BoardRow[], columns: BoardColumn[], rawQuery: AnalyticsQuery): AnalyticsResult {
  const query = resolveQueryColumns(columns, rawQuery)
  const isSampled = rows.length > SAMPLE_THRESHOLD
  const sampleRows = isSampled ? rows.slice(0, SAMPLE_THRESHOLD) : rows

  switch (query.type) {
    case 'aggregate':
      return {
        data: aggregateRows(sampleRows, query.query),
        totalRows: rows.length,
        isSampled,
        sampleSize: isSampled ? SAMPLE_THRESHOLD : undefined
      }
    case 'timeseries':
      return {
        data: computeTimeSeries(sampleRows, query.query),
        totalRows: rows.length,
        isSampled,
        sampleSize: isSampled ? SAMPLE_THRESHOLD : undefined
      }
    case 'scatter':
      return {
        data: computeScatter(sampleRows, query.query),
        totalRows: rows.length,
        isSampled,
        sampleSize: isSampled ? SAMPLE_THRESHOLD : undefined
      }
    case 'histogram':
      return {
        data: computeHistogram(sampleRows, query.query),
        totalRows: rows.length,
        isSampled,
        sampleSize: isSampled ? SAMPLE_THRESHOLD : undefined
      }
  }
}

export function computeProfile(columns: BoardColumn[], rows: BoardRow[]): DataProfile {
  return profileData(columns, rows)
}
