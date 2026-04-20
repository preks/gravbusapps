/**
 * Deterministic data profiler for board rows.
 * Produces ColumnProfile + DataProfile used by AI Analyst and smart defaults.
 */

import type { BoardRow, BoardColumn } from '../types'
import type { ColumnProfile, DataProfile } from '../types/analytics'

const DATE_TYPES = new Set(['date', 'datetime'])
const NUMERIC_TYPES = new Set(['number', 'currency', 'percentage'])
const CATEGORICAL_TYPES = new Set(['select', 'multiselect', 'status', 'boolean', 'tags'])

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function stddev(values: number[], mean: number): number {
  if (values.length < 2) return 0
  const sumSq = values.reduce((s, v) => s + (v - mean) ** 2, 0)
  return Math.sqrt(sumSq / (values.length - 1))
}

function pearsonR(xs: number[], ys: number[]): number {
  const n = xs.length
  if (n < 3) return 0
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let dx2 = 0
  let dy2 = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx
    const dy = ys[i] - my
    num += dx * dy
    dx2 += dx * dx
    dy2 += dy * dy
  }
  const denom = Math.sqrt(dx2 * dy2)
  return denom === 0 ? 0 : num / denom
}

function profileColumn(col: BoardColumn, rows: BoardRow[]): ColumnProfile {
  const values: unknown[] = rows.map(r => r.data[col.name])
  const nonNull = values.filter(v => v != null && v !== '')
  const nonNullCount = nonNull.length
  const nullCount = values.length - nonNullCount
  const uniqueVals = new Set(nonNull.map(String))

  const isNumeric = NUMERIC_TYPES.has(col.type)
  const isDate = DATE_TYPES.has(col.type)
  const isCategorical =
    CATEGORICAL_TYPES.has(col.type) ||
    (col.type === 'text' && uniqueVals.size <= 30 && uniqueVals.size < rows.length * 0.5)

  const profile: ColumnProfile = {
    column: col.name,
    type: col.type,
    label: col.label,
    nonNullCount,
    nullCount,
    uniqueCount: uniqueVals.size,
    isNumeric,
    isDate,
    isCategorical
  }

  if (isNumeric && nonNullCount > 0) {
    const nums = nonNull
      .map(Number)
      .filter(n => !isNaN(n))
      .sort((a, b) => a - b)
    if (nums.length > 0) {
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length
      profile.numericStats = {
        min: nums[0],
        max: nums[nums.length - 1],
        mean: Math.round(mean * 100) / 100,
        median: Math.round(median(nums) * 100) / 100,
        stddev: Math.round(stddev(nums, mean) * 100) / 100
      }
    }
  }

  if (isDate && nonNullCount > 0) {
    const dates = nonNull
      .map(String)
      .filter(d => !isNaN(new Date(d).getTime()))
      .sort()
    if (dates.length > 0) {
      profile.dateRange = { min: dates[0], max: dates[dates.length - 1] }
    }
  }

  if (isCategorical || (!isNumeric && !isDate)) {
    const freq = new Map<string, number>()
    for (const v of nonNull) {
      const s = String(v)
      freq.set(s, (freq.get(s) || 0) + 1)
    }
    profile.topValues = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([value, count]) => ({ value, count }))
  }

  return profile
}

export function profileData(columns: BoardColumn[], rows: BoardRow[]): DataProfile {
  const visibleCols = columns.filter(c => c.isVisible)
  const columnProfiles = visibleCols.map(c => profileColumn(c, rows))

  const dateCols = columnProfiles.filter(p => p.isDate && p.nonNullCount > 0)
  const categoryCols = columnProfiles.filter(p => p.isCategorical && p.uniqueCount >= 2)
  const metricCols = columnProfiles.filter(p => p.isNumeric && p.nonNullCount > 0)

  const suggestedDateColumn = dateCols.sort((a, b) => b.nonNullCount - a.nonNullCount)[0]?.column

  const numericPairs: Array<{ col1: string; col2: string; r: number }> = []
  if (metricCols.length >= 2 && rows.length >= 5) {
    for (let i = 0; i < metricCols.length && i < 5; i++) {
      for (let j = i + 1; j < metricCols.length && j < 5; j++) {
        const xs: number[] = []
        const ys: number[] = []
        for (const row of rows) {
          const x = Number(row.data[metricCols[i].column])
          const y = Number(row.data[metricCols[j].column])
          if (!isNaN(x) && !isNaN(y)) {
            xs.push(x)
            ys.push(y)
          }
        }
        const r = Math.round(pearsonR(xs, ys) * 1000) / 1000
        if (Math.abs(r) > 0.3) {
          numericPairs.push({ col1: metricCols[i].column, col2: metricCols[j].column, r })
        }
      }
    }
  }

  return {
    totalRows: rows.length,
    columnProfiles,
    suggestedDateColumn,
    suggestedCategoryColumns: categoryCols.map(c => c.column),
    suggestedMetricColumns: metricCols.map(c => c.column),
    correlations: numericPairs.length > 0 ? numericPairs : undefined
  }
}
