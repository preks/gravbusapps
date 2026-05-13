import { useCallback, type MutableRefObject } from 'react'

import type { SpreadsheetColumn } from '../types'

interface GridRangeReader {
  getVisibleRangeValues?: (rowCount: number, colCount: number) => Record<number, Record<number, unknown>> | null
}

export interface UseSpreadsheetGridDataReadersParams {
  spreadsheetGridRef: MutableRefObject<GridRangeReader | null>
  activeSheetColumns: SpreadsheetColumn[]
  sheetDataLength: number
}

export interface UseSpreadsheetGridDataReadersResult {
  getHeaderRowFromGrid: () => Map<string, string> | null
  getSheetDataFromGrid: () => Record<string, unknown>[] | null
}

export function useSpreadsheetGridDataReaders(
  params: UseSpreadsheetGridDataReadersParams
): UseSpreadsheetGridDataReadersResult {
  const { spreadsheetGridRef, activeSheetColumns, sheetDataLength } = params

  const getHeaderRowFromGrid = useCallback((): Map<string, string> | null => {
    const grid = spreadsheetGridRef.current
    const visibleColumns = activeSheetColumns.filter(column => column.isVisible !== false)
    if (!grid?.getVisibleRangeValues || !visibleColumns.length) return null
    const values = grid.getVisibleRangeValues(1, visibleColumns.length)
    if (!values || !values[0]) return null
    const row0 = values[0]
    const map = new Map<string, string>()
    const extract = (value: unknown): string => {
      if (value == null || value === '') return ''
      if (typeof value === 'string') return String(value).trim()
      if (typeof value === 'number' && Number.isFinite(value)) return String(value)
      if (typeof value === 'object' && !Array.isArray(value)) {
        const obj = value as Record<string, unknown>
        const extracted = obj.v ?? obj.m ?? obj.url ?? obj.src
        if (typeof extracted === 'string') return String(extracted).trim()
        if (typeof extracted === 'number' && Number.isFinite(extracted)) return String(extracted)
      }
      return String(value).trim()
    }
    visibleColumns.forEach((column, index) => {
      const raw = row0[index]
      const label = extract(raw)
      if (label) map.set(column.name, label)
    })
    return map.size > 0 ? map : null
  }, [activeSheetColumns, spreadsheetGridRef])

  const getSheetDataFromGrid = useCallback((): Record<string, unknown>[] | null => {
    const grid = spreadsheetGridRef.current
    const visibleColumns = activeSheetColumns.filter(column => column.isVisible !== false)
    if (!grid?.getVisibleRangeValues || !visibleColumns.length) return null
    const rowCount = Math.min(Math.max(sheetDataLength, 500), 5000)
    const colCount = visibleColumns.length
    const values = grid.getVisibleRangeValues(rowCount, colCount)
    if (!values || Object.keys(values).length === 0) return null
    const extractValue = (value: unknown): unknown => {
      if (value == null) return value
      if (typeof value === 'object' && !Array.isArray(value)) {
        const obj = value as Record<string, unknown>
        const extracted = obj.v ?? obj.m ?? obj.url ?? obj.src
        return extracted !== undefined ? extracted : value
      }
      return value
    }
    const rows: Record<string, unknown>[] = []
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const rowCells = values[rowIndex]
      if (!rowCells || typeof rowCells !== 'object') {
        rows.push({})
        continue
      }
      const row: Record<string, unknown> = {}
      visibleColumns.forEach((column, colIndex) => {
        const raw = rowCells[colIndex]
        const cellValue = extractValue(raw)
        if (cellValue !== undefined) row[column.name] = cellValue
      })
      rows.push(row)
    }
    return rows.length > 0 ? rows : null
  }, [activeSheetColumns, sheetDataLength, spreadsheetGridRef])

  return { getHeaderRowFromGrid, getSheetDataFromGrid }
}
