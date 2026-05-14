import type { SpreadsheetBatchOperation } from '../services/SpreadsheetApiService'
import type { SpreadsheetStylePatch } from './SpreadsheetCollaborationContract'
import type { SpreadsheetRowRef } from '../utils/spreadsheetRowIdentity'

export const SPREADSHEET_MAX_SET_STYLE_CELLS_PER_OPERATION = 2000

/** Max cells per `set_range` op to keep HTTP JSON under body limits with rich pastes. */
export const SPREADSHEET_MAX_SET_RANGE_CELLS_PER_OPERATION = 2000

export interface SpreadsheetCellUpdate {
  rowId: string
  rowRef?: SpreadsheetRowRef
  columnName: string
  value: unknown
}

export interface SpreadsheetCellClear {
  rowId: string
  rowRef?: SpreadsheetRowRef
  columnName: string
}

export interface SpreadsheetMutationPlannedCell {
  rowId: string
  rowRef?: SpreadsheetRowRef
  columnName: string
  rowIndex: number
  colIndex: number
  cellRef?: string
  valueAction: 'none' | 'set' | 'clear'
  value?: unknown
  stylePatch?: SpreadsheetStylePatch
}

/** Bounded rectangle in Univer sheet coordinates (same shape as collaboration clear ops). */
export interface SpreadsheetMutationPlanRange {
  startRow: number
  endRow: number
  startColumn: number
  endColumn: number
}

export interface SpreadsheetMutationPlan {
  sheetId: string
  traceId?: string
  cells: SpreadsheetMutationPlannedCell[]
  styles?: Record<string, unknown>
  /** Optional range clears merged into the same batch as cell ops (ordered before cell persistence ops). */
  clearAllRanges?: SpreadsheetMutationPlanRange[]
  clearFormatRanges?: SpreadsheetMutationPlanRange[]
}

export const flattenUpdatesToCells = (
  updatesByIdentity: Map<string, { rowId: string; rowRef?: SpreadsheetRowRef; updates: Record<string, unknown> }>
): SpreadsheetCellUpdate[] =>
  Array.from(updatesByIdentity.values()).flatMap(({ rowId, rowRef, updates }) =>
    Object.entries(updates).map(([columnName, value]) => ({
      rowId,
      rowRef,
      columnName,
      value
    }))
  )

export const normalizeCellValueForBatchPersistence = (value: unknown): unknown => {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.startsWith('=') ? { f: trimmed } : value
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  const obj = value as Record<string, unknown>
  if (typeof obj.f === 'string') {
    const trimmed = obj.f.trim()
    return { ...obj, f: trimmed.startsWith('=') ? trimmed : `=${trimmed}` }
  }
  return value
}

export const buildCellPersistenceOperations = ({
  setUpdatesByIdentity,
  setUpdatesByBackendRowId,
  clearCells,
  createOperationId,
  maxIndividualClearCellOps
}: {
  setUpdatesByIdentity?: Map<string, { rowId: string; rowRef?: SpreadsheetRowRef; updates: Record<string, unknown> }>
  setUpdatesByBackendRowId?: Map<string, Record<string, unknown>>
  clearCells: SpreadsheetCellClear[]
  createOperationId: (prefix: string) => string
  maxIndividualClearCellOps: number
}): SpreadsheetBatchOperation[] => {
  const normalizedUpdatesByIdentity =
    setUpdatesByIdentity ??
    new Map(
      Array.from(setUpdatesByBackendRowId?.entries() ?? []).map(([rowId, updates]) => [rowId, { rowId, updates }])
    )
  const setCellsToPersist = flattenUpdatesToCells(normalizedUpdatesByIdentity).map(cell => ({
    ...cell,
    value: normalizeCellValueForBatchPersistence(cell.value)
  }))
  const shouldCollapseClearCellsIntoSetRange = clearCells.length > maxIndividualClearCellOps
  const collapsedClearCells = shouldCollapseClearCellsIntoSetRange
    ? clearCells.map(cell => ({
        ...cell,
        value: null as unknown
      }))
    : []
  const setRangeCells = [...setCellsToPersist, ...collapsedClearCells]
  const operations: SpreadsheetBatchOperation[] = []
  if (setRangeCells.length > 0) {
    for (const cellChunk of chunkArray(setRangeCells, SPREADSHEET_MAX_SET_RANGE_CELLS_PER_OPERATION)) {
      operations.push({
        operationId: createOperationId('set_range'),
        type: 'set_range',
        data: {
          cells: cellChunk.map(cell => ({
            ...(cell.rowRef?.kind === 'clientHandle' ? { rowRef: cell.rowRef } : { rowId: cell.rowId }),
            ...(cell.rowRef?.kind === 'backendUuid' ? { rowRef: cell.rowRef } : {}),
            columnName: cell.columnName,
            value: cell.value
          }))
        }
      })
    }
  }
  if (!shouldCollapseClearCellsIntoSetRange) {
    operations.push(
      ...clearCells.map(cell => ({
        operationId: createOperationId('clear_cell'),
        type: 'clear_cell' as const,
        data: {
          ...(cell.rowRef?.kind === 'clientHandle' ? { rowRef: cell.rowRef } : { rowId: cell.rowId }),
          ...(cell.rowRef?.kind === 'backendUuid' ? { rowRef: cell.rowRef } : {}),
          columnName: cell.columnName
        }
      }))
    )
  }
  return operations
}

const chunkArray = <T>(items: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = []
  for (let start = 0; start < items.length; start += chunkSize) {
    chunks.push(items.slice(start, start + chunkSize))
  }
  return chunks
}

const pickStylesForStyleCells = (
  styles: Record<string, unknown> | undefined,
  styleCells: Array<{ stylePatch: SpreadsheetStylePatch }>
): Record<string, unknown> | undefined => {
  if (!styles || Object.keys(styles).length === 0) return undefined
  const picked: Record<string, unknown> = {}
  for (const cell of styleCells) {
    const styleId =
      cell.stylePatch.set && typeof cell.stylePatch.set === 'object' && typeof cell.stylePatch.set.s === 'string'
        ? cell.stylePatch.set.s
        : ''
    if (styleId && styles[styleId] !== undefined) {
      picked[styleId] = styles[styleId]
    }
  }
  return Object.keys(picked).length > 0 ? picked : undefined
}

export const buildOperationsFromMutationPlan = ({
  plan,
  createOperationId,
  maxIndividualClearCellOps
}: {
  plan: SpreadsheetMutationPlan
  createOperationId: (prefix: string) => string
  maxIndividualClearCellOps: number
}): SpreadsheetBatchOperation[] => {
  const operations: SpreadsheetBatchOperation[] = []

  if (plan.clearAllRanges && plan.clearAllRanges.length > 0) {
    operations.push({
      operationId: createOperationId('clear_all'),
      type: 'clear_all',
      data: {
        sheetId: plan.sheetId,
        ranges: plan.clearAllRanges
      }
    })
  }
  if (plan.clearFormatRanges && plan.clearFormatRanges.length > 0) {
    operations.push({
      operationId: createOperationId('clear_format'),
      type: 'clear_format',
      data: {
        sheetId: plan.sheetId,
        ranges: plan.clearFormatRanges
      }
    })
  }

  const setUpdatesByIdentity = new Map<
    string,
    { rowId: string; rowRef?: SpreadsheetRowRef; updates: Record<string, unknown> }
  >()
  const clearCells: SpreadsheetCellClear[] = []
  const styleCells: Array<{ row: number; col: number; cellRef?: string; stylePatch: SpreadsheetStylePatch }> = []

  for (const cell of plan.cells) {
    const identityKey =
      cell.rowRef?.kind === 'clientHandle'
        ? `client:${cell.rowRef.clientRowId}`
        : cell.rowRef?.kind === 'backendUuid'
          ? `backend-ref:${cell.rowRef.rowUuid}`
          : `row:${cell.rowId}`
    if (cell.valueAction === 'set') {
      const entry = setUpdatesByIdentity.get(identityKey) ?? { rowId: cell.rowId, rowRef: cell.rowRef, updates: {} }
      entry.updates[cell.columnName] = normalizeCellValueForBatchPersistence(cell.value)
      setUpdatesByIdentity.set(identityKey, entry)
    } else if (cell.valueAction === 'clear') {
      clearCells.push({
        rowId: cell.rowId,
        rowRef: cell.rowRef,
        columnName: cell.columnName
      })
    }
    if (cell.stylePatch) {
      styleCells.push({
        row: cell.rowIndex,
        col: cell.colIndex,
        cellRef: cell.cellRef,
        stylePatch: cell.stylePatch
      })
    }
  }

  operations.push(
    ...buildCellPersistenceOperations({
      setUpdatesByIdentity,
      clearCells,
      createOperationId,
      maxIndividualClearCellOps
    })
  )

  const styleChunks = chunkArray(styleCells, SPREADSHEET_MAX_SET_STYLE_CELLS_PER_OPERATION)
  for (const styleChunk of styleChunks) {
    const chunkStyles = pickStylesForStyleCells(plan.styles, styleChunk)
    operations.push({
      operationId: createOperationId('set_style'),
      type: 'set_style',
      data: {
        sheetId: plan.sheetId,
        ...(plan.traceId ? { traceId: plan.traceId } : {}),
        ...(chunkStyles ? { styles: chunkStyles } : {}),
        cells: styleChunk
      }
    })
  }

  return operations
}
