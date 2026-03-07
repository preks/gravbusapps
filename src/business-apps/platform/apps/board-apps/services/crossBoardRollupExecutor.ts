/**
 * Cross-Board Rollup Executor - computes rollup aggregations across
 * related board sheets using relation/rollup column configurations.
 *
 * Fetches rows from the target board/sheet, performs the join via the
 * relation column, and aggregates using the rollup config.
 */

import { BoardApiService } from './BoardApiService'
import type { BoardRow, BoardColumn, RollupConfig } from '../types'

export interface RollupResult {
  /** Map from source row ID -> computed rollup value */
  values: Map<string, number>
  targetSheetRowCount: number
}

const ROLLUP_CACHE = new Map<string, { rows: BoardRow[]; timestamp: number }>()
const CACHE_TTL = 60_000

async function fetchTargetRows(targetAppId: string, targetSheetId: string): Promise<BoardRow[]> {
  const cacheKey = `${targetAppId}:${targetSheetId}`
  const cached = ROLLUP_CACHE.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.rows
  }

  const allRows: BoardRow[] = []
  let page = 1
  const PAGE_SIZE = 200
  let hasMore = true

  while (hasMore && allRows.length < 5000) {
    const result = await BoardApiService.getRows(targetAppId, targetSheetId, {
      page,
      limit: PAGE_SIZE
    })
    allRows.push(...result.items)
    hasMore = result.items.length === PAGE_SIZE
    page++
  }

  ROLLUP_CACHE.set(cacheKey, { rows: allRows, timestamp: Date.now() })
  return allRows
}

function computeRollupValue(values: number[], aggregation: RollupConfig['aggregation']): number {
  if (values.length === 0) return 0
  switch (aggregation) {
    case 'count':
      return values.length
    case 'sum':
      return values.reduce((a, b) => a + b, 0)
    case 'avg':
      return values.reduce((a, b) => a + b, 0) / values.length
    case 'min':
      return Math.min(...values)
    case 'max':
      return Math.max(...values)
    case 'percent_done': {
      const done = values.filter(v => v === 1).length
      return values.length > 0 ? Math.round((done / values.length) * 100) : 0
    }
    default:
      return values.length
  }
}

/**
 * Execute a cross-board rollup for a set of source rows.
 *
 * Given a rollup column config:
 * 1. Find the relation column it references
 * 2. Fetch rows from the target board/sheet
 * 3. For each source row, find matching target rows via the relation
 * 4. Aggregate the target column values
 */
export async function executeCrossBoardRollup(
  sourceRows: BoardRow[],
  columns: BoardColumn[],
  rollupColumnId: string
): Promise<RollupResult | null> {
  const rollupCol = columns.find(c => c.id === rollupColumnId)
  if (!rollupCol?.rollupConfig) return null

  const { relationColumnId, targetColumnId, aggregation } = rollupCol.rollupConfig
  const relationCol = columns.find(c => c.id === relationColumnId)
  if (!relationCol?.relationConfig) return null

  const { targetAppId, targetSheetId } = relationCol.relationConfig

  try {
    const targetRows = await fetchTargetRows(targetAppId, targetSheetId)
    const targetById = new Map<string, BoardRow>()
    for (const row of targetRows) {
      targetById.set(row.id, row)
    }

    const values = new Map<string, number>()

    for (const sourceRow of sourceRows) {
      const relValue = sourceRow.data[relationCol.name]
      if (!relValue) {
        values.set(sourceRow.id, 0)
        continue
      }

      const relatedIds = Array.isArray(relValue) ? relValue.map(String) : [String(relValue)]
      const relatedValues: number[] = []

      for (const relId of relatedIds) {
        const targetRow = targetById.get(relId)
        if (!targetRow) continue
        const val = Number(targetRow.data[targetColumnId])
        if (!isNaN(val)) relatedValues.push(val)
      }

      values.set(sourceRow.id, computeRollupValue(relatedValues, aggregation))
    }

    return { values, targetSheetRowCount: targetRows.length }
  } catch {
    return null
  }
}

/**
 * Compute aggregate rollup stats across all source rows for a dashboard widget.
 * Returns total, average, min, max of the rollup values.
 */
export async function computeRollupStats(
  sourceRows: BoardRow[],
  columns: BoardColumn[],
  rollupColumnId: string
): Promise<{ total: number; avg: number; min: number; max: number; count: number } | null> {
  const result = await executeCrossBoardRollup(sourceRows, columns, rollupColumnId)
  if (!result) return null

  const vals = [...result.values.values()].filter(v => v !== 0 || result.values.size > 0)
  if (vals.length === 0) return null

  return {
    total: vals.reduce((a, b) => a + b, 0),
    avg: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100,
    min: Math.min(...vals),
    max: Math.max(...vals),
    count: vals.length
  }
}

export function clearRollupCache(): void {
  ROLLUP_CACHE.clear()
}
