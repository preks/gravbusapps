import type { Dispatch, SetStateAction } from 'react'
import { SpreadsheetApiService } from '../services/SpreadsheetApiService'

type Row = Record<string, unknown> & {
  _id?: string
  id?: string
  _rowUuid?: string
  _formulas?: Record<string, string>
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function isMatchingRow(row: Record<string, unknown>, rowId: string): boolean {
  return row._id === rowId || row.id === rowId
}

function upsertFormulaMetadata(row: Row, columnName: string, value: unknown, isFormulaValue: boolean): void {
  if (isFormulaValue) {
    const formulas = (row._formulas as Record<string, string>) || {}
    formulas[columnName] = value as string
    row._formulas = formulas
    return
  }

  const formulas = row._formulas as Record<string, string> | undefined
  if (!formulas) return

  delete formulas[columnName]
  if (Object.keys(formulas).length === 0) {
    delete row._formulas
  } else {
    row._formulas = formulas
  }
}

export interface ComputeNextLocalSheetDataParams {
  localSheetData: Record<string, unknown>[]
  rowId: string
  columnName: string
  value: unknown
  isFormulaValue: boolean
  isEntityDataSource: boolean
}

export interface ComputeNextLocalSheetDataResult {
  nextData: Record<string, unknown>[]
  localRow: Row | undefined
}

export function computeNextLocalSheetData(params: ComputeNextLocalSheetDataParams): ComputeNextLocalSheetDataResult {
  const { localSheetData, rowId, columnName, value, isFormulaValue, isEntityDataSource } = params

  if (isEntityDataSource) {
    const existingRowIndex = localSheetData.findIndex(row => isMatchingRow(row, rowId))
    if (existingRowIndex < 0) {
      const newRow: Row = {
        _id: rowId,
        _updatedAt: new Date().toISOString(),
        [columnName]: value
      }
      if (isFormulaValue) {
        newRow._formulas = { [columnName]: value as string }
      }
      const nextData = [...localSheetData, newRow]
      return { nextData, localRow: newRow }
    }

    const nextData = localSheetData.map(row => {
      if (!isMatchingRow(row, rowId)) return row
      const updatedRow: Row = { ...(row as Row), _updatedAt: new Date().toISOString(), [columnName]: value }
      upsertFormulaMetadata(updatedRow, columnName, value, isFormulaValue)
      return updatedRow
    })
    const localRow = nextData.find(r => (r._id as string | undefined) === rowId) as Row | undefined
    return { nextData, localRow }
  }

  // Standard behavior when no entity data source: update existing row only.
  const nextData = localSheetData.map(row => {
    if (!isMatchingRow(row, rowId)) return row

    const updatedRow: Row = { ...(row as Row), _updatedAt: new Date().toISOString(), [columnName]: value }
    upsertFormulaMetadata(updatedRow, columnName, value, isFormulaValue)
    return updatedRow
  })

  const localRow = nextData.find(r => (r._id as string | undefined) === rowId) as Row | undefined
  return { nextData, localRow }
}

export interface PersistCellChangeParams {
  appId: string
  sheetId: string
  rowId: string
  columnName: string
  value: unknown
  localRow: Row | undefined
  pendingBackingRowCreate: Set<string>
  setLocalSheetData: Dispatch<SetStateAction<Record<string, unknown>[]>>
}

export function persistCellChangeToBackend(params: PersistCellChangeParams): void {
  const { appId, sheetId, rowId, columnName, value, localRow, pendingBackingRowCreate, setLocalSheetData } = params

  const backendRowUuid = localRow?._rowUuid
  const isBackendUuid = Boolean(backendRowUuid && isUuid(backendRowUuid))
  const isRowIdUuid = isUuid(rowId)

  const patchRow = (rowUuid: string) => {
    SpreadsheetApiService.updateRow(appId, sheetId, rowUuid, { [columnName]: value }).catch(err =>
      console.error('[SpreadsheetAppViewer] Failed to update cell:', err)
    )
  }

  if (isRowIdUuid) {
    patchRow(rowId)
    return
  }

  if (isBackendUuid && backendRowUuid) {
    patchRow(backendRowUuid)
    return
  }

  if (!localRow) return

  if (pendingBackingRowCreate.has(rowId)) return
  pendingBackingRowCreate.add(rowId)

  const payload: Record<string, unknown> = { _clientRowId: rowId }
  for (const [k, v] of Object.entries(localRow)) {
    if (k === '_id' || k === '_rowUuid' || k === 'id') continue
    if (k === '_entityType' || k === '_fetchedAt') continue
    payload[k] = v
  }

  SpreadsheetApiService.addRow(appId, sheetId, payload)
    .then(saved => {
      const savedRowUuid = (saved as Record<string, unknown>)._rowUuid as string | undefined
      if (!savedRowUuid || !isUuid(savedRowUuid)) return

      setLocalSheetData(prev =>
        prev.map(r => ((r._id as string | undefined) === rowId ? { ...r, _rowUuid: savedRowUuid } : r))
      )
      patchRow(savedRowUuid)
    })
    .catch(err => console.error('[SpreadsheetAppViewer] Failed to create backing row:', err))
    .finally(() => {
      pendingBackingRowCreate.delete(rowId)
    })
}
