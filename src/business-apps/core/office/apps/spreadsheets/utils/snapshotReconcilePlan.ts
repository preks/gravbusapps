import type { SpreadsheetColumn } from '../types'

type ViewerRow = Record<string, unknown>

type SnapshotCellMatrix = Record<string, Record<string, unknown>> | undefined

export type SnapshotReconcileCell = { rowId: string; columnName: string; value: unknown }

export type SnapshotReconcilePlan = {
  hasCellData: boolean
  updatesByRowIndex: Map<number, Record<string, unknown>>
  reconcileCells: SnapshotReconcileCell[]
}

type BuildSnapshotReconcilePlanArgs = {
  cellData: SnapshotCellMatrix
  visibleColumns: SpreadsheetColumn[]
  currentRows: ViewerRow[]
  persistedBaseline: ViewerRow[]
  getBackendRowId: (row: ViewerRow) => string | undefined
  treatMissingCellsAsNull?: boolean
}

const toComparableCellValue = (value: unknown): string => {
  if (value === undefined) return 'u:'
  if (value === null) return 'n:'
  if (typeof value === 'string') return `s:${value}`
  if (typeof value === 'number') return `d:${value}`
  if (typeof value === 'boolean') return `b:${value ? 1 : 0}`
  try {
    return `j:${JSON.stringify(value)}`
  } catch {
    return `x:${String(value)}`
  }
}

const collectReconcileCell = ({
  rowIndex,
  columnName,
  nextValue,
  persistedValue,
  backendRowId,
  updatesByRowIndex,
  reconcileCells
}: {
  rowIndex: number
  columnName: string
  nextValue: unknown
  persistedValue: unknown
  backendRowId: string | undefined
  updatesByRowIndex: Map<number, Record<string, unknown>>
  reconcileCells: SnapshotReconcileCell[]
}) => {
  if (toComparableCellValue(persistedValue) === toComparableCellValue(nextValue)) {
    return
  }

  const rowUpdates = updatesByRowIndex.get(rowIndex) ?? {}
  rowUpdates[columnName] = nextValue
  updatesByRowIndex.set(rowIndex, rowUpdates)

  if (backendRowId) {
    reconcileCells.push({ rowId: backendRowId, columnName, value: nextValue })
  }
}

export const buildSnapshotReconcilePlan = ({
  cellData,
  visibleColumns,
  currentRows,
  persistedBaseline,
  getBackendRowId,
  treatMissingCellsAsNull = false
}: BuildSnapshotReconcilePlanArgs): SnapshotReconcilePlan => {
  const hasCellData = Boolean(cellData && typeof cellData === 'object')
  const updatesByRowIndex = new Map<number, Record<string, unknown>>()
  const reconcileCells: SnapshotReconcileCell[] = []

  if (!hasCellData || !cellData) {
    return { hasCellData, updatesByRowIndex, reconcileCells }
  }

  if (treatMissingCellsAsNull) {
    for (let rowIndex = 0; rowIndex < currentRows.length; rowIndex += 1) {
      const row = currentRows[rowIndex]
      if (!row) continue

      const rowCells = cellData[String(rowIndex)] as Record<string, unknown> | undefined
      const backendRowId = getBackendRowId(row)

      visibleColumns.forEach((column, columnIndex) => {
        const hasExplicitValue = Boolean(
          rowCells && Object.prototype.hasOwnProperty.call(rowCells, String(columnIndex))
        )
        const persistedValue = (persistedBaseline[rowIndex] as Record<string, unknown> | undefined)?.[column.name]

        if (!hasExplicitValue && (persistedValue === undefined || persistedValue === null)) {
          return
        }

        const nextValue = hasExplicitValue ? rowCells?.[String(columnIndex)] : null
        collectReconcileCell({
          rowIndex,
          columnName: column.name,
          nextValue,
          persistedValue,
          backendRowId,
          updatesByRowIndex,
          reconcileCells
        })
      })
    }

    return { hasCellData, updatesByRowIndex, reconcileCells }
  }

  for (const rowKey of Object.keys(cellData)) {
    const rowIndex = Number(rowKey)
    if (Number.isNaN(rowIndex) || rowIndex < 0) continue

    const row = currentRows[rowIndex]
    if (!row) continue

    const rowCells = cellData[rowKey]
    if (!rowCells || typeof rowCells !== 'object') continue

    const backendRowId = getBackendRowId(row)

    for (const colKey of Object.keys(rowCells)) {
      const colIndex = Number(colKey)
      if (Number.isNaN(colIndex) || colIndex < 0) continue

      const columnName = visibleColumns[colIndex]?.name
      if (!columnName) continue

      const nextValue = rowCells[colKey]
      const persistedValue = (persistedBaseline[rowIndex] as Record<string, unknown> | undefined)?.[columnName]

      collectReconcileCell({
        rowIndex,
        columnName,
        nextValue,
        persistedValue,
        backendRowId,
        updatesByRowIndex,
        reconcileCells
      })
    }
  }

  return { hasCellData, updatesByRowIndex, reconcileCells }
}
