import { readSpreadsheetRowCellValue } from '../core'
import type { SpreadsheetColumn } from '../types/spreadsheet'
import { getViewerRowVisualIndex } from '../utils/spreadsheetPeerRowHydration'

export function normalizeValueForEchoSignature(value: unknown): unknown {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.startsWith('=')) return { f: trimmed }
    return value
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  const obj = value as Record<string, unknown>
  if (typeof obj.f === 'string') {
    const trimmed = obj.f.trim()
    return { f: trimmed.startsWith('=') ? trimmed : `=${trimmed}` }
  }
  if (obj.v !== undefined) return obj.v
  if (obj.m !== undefined) return obj.m
  return value
}

export function toEchoSignature(value: unknown): string {
  const normalized = normalizeValueForEchoSignature(value)
  if (normalized === undefined) return 'u:'
  if (normalized === null) return 'n:'
  if (typeof normalized === 'string') return `s:${normalized}`
  if (typeof normalized === 'number') return `d:${normalized}`
  if (typeof normalized === 'boolean') return `b:${normalized ? 1 : 0}`
  try {
    return `j:${JSON.stringify(normalized)}`
  } catch {
    return `x:${String(normalized)}`
  }
}

export function remoteEchoKey(row: number, col: number): string {
  return `${row}:${col}`
}

export function buildAuthoritativeRowsByGridIndex(
  data: Record<string, unknown>[]
): Map<number, Record<string, unknown>> {
  const rowsByGridIndex = new Map<number, Record<string, unknown>>()
  data.forEach((row, index) => {
    rowsByGridIndex.set(getViewerRowVisualIndex(row, index), row)
  })
  return rowsByGridIndex
}

/**
 * Resolves the viewer row for a Univer 0-based grid row index.
 * Uses `_gridRowIndex` when present so mutation planning matches collaboration
 * and authoritative signatures (array index alone can point at the wrong row).
 */
export function getSpreadsheetRowAtUniverGridIndex(
  data: Record<string, unknown>[],
  gridRowIndex: number
): Record<string, unknown> | undefined {
  return buildAuthoritativeRowsByGridIndex(data).get(gridRowIndex)
}

export function getAuthoritativeGridRowExtent(data: Record<string, unknown>[]): number {
  return data.reduce((max, row, index) => Math.max(max, getViewerRowVisualIndex(row, index) + 1), 0)
}

export function buildAuthoritativeCellSignatureMap(
  data: Record<string, unknown>[],
  columns: SpreadsheetColumn[]
): Map<string, string> {
  const visibleColumns = columns.filter(column => column.isVisible !== false)
  const signatures = new Map<string, string>()
  for (const [rowIndex, row] of buildAuthoritativeRowsByGridIndex(data).entries()) {
    for (let colIndex = 0; colIndex < visibleColumns.length; colIndex++) {
      const value = readSpreadsheetRowCellValue(row, visibleColumns[colIndex]) ?? ''
      signatures.set(remoteEchoKey(rowIndex, colIndex), toEchoSignature(value))
    }
  }
  return signatures
}
