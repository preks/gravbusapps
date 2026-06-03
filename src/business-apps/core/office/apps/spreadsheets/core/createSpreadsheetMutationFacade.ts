import { SpreadsheetApiRequestError, SpreadsheetApiService } from '../services/SpreadsheetApiService'
import type { SpreadsheetApp, SpreadsheetSheet } from '../types'
import type { SpreadsheetReplayResponse } from './SpreadsheetCollaborationContract'
import { fetchSpreadsheetSheetReplaySince } from './spreadsheetMutationHttpHelpers'
import type {
  SpreadsheetColumnReorderRequest,
  SpreadsheetCreateSheetMutationRequest,
  SpreadsheetDuplicateSheetMutationRequest,
  SpreadsheetMutationBatchRequest,
  SpreadsheetMutationFacade,
  SpreadsheetMutationTraceMeta,
  SpreadsheetRowRangeUpdate
} from './SpreadsheetMutationFacade'
import {
  saveSpreadsheetSnapshotWithRetry,
  type SpreadsheetSaveWorkbookSnapshotInput
} from './spreadsheetSnapshotSaveWithRetry'
import type { SpreadsheetViewerRow } from './SpreadsheetSession'
import { createSpreadsheetMutationOperationId } from './spreadsheetMutationOperationId'

interface CreateSpreadsheetMutationFacadeOptions {
  appId: string
  submitBatch: (request: SpreadsheetMutationBatchRequest) => ReturnType<SpreadsheetMutationFacade['submitBatch']>
  fetchSheetChangesSince?: (sheetId: string, sinceVersion: number) => Promise<SpreadsheetReplayResponse>
  requestStructuralResync?: (sheetId?: string, options?: { immediate?: boolean }) => void
  onRowAdd?: (appId: string, sheetId: string, rowData: SpreadsheetViewerRow) => Promise<SpreadsheetViewerRow | null>
  onRowUpdate?: (
    appId: string,
    sheetId: string,
    rowId: string,
    rowData: SpreadsheetViewerRow
  ) => Promise<SpreadsheetViewerRow | null>
  onSheetAdd?: (
    appId: string,
    sheet?: Partial<SpreadsheetSheet> & { worksheetSnapshot?: Record<string, unknown> }
  ) => Promise<SpreadsheetSheet | null>
  onSheetDuplicate?: (
    appId: string,
    sourceSheetId: string,
    sheet: { id?: string; name: string; visualWorksheetSnapshot?: Record<string, unknown> }
  ) => Promise<SpreadsheetSheet | null>
  onSheetUpdate?: (
    appId: string,
    sheetId: string,
    updates: Partial<SpreadsheetSheet>
  ) => Promise<SpreadsheetSheet | null>
  onSheetDelete?: (appId: string, sheetId: string) => Promise<boolean>
}

const unsupportedMutation = (name: string) => (): Promise<never> =>
  Promise.reject(new Error(`Spreadsheet mutation '${name}' is not wired yet`))

const requireSheetResult = async (
  operation: Promise<SpreadsheetSheet | null>,
  errorMessage: string
): Promise<SpreadsheetSheet> => {
  const result = await operation
  if (!result) {
    throw new Error(errorMessage)
  }
  return result
}

const requireRowResult = async (
  operation: Promise<SpreadsheetViewerRow | null>,
  errorMessage: string
): Promise<SpreadsheetViewerRow> => {
  const result = await operation
  if (!result) {
    throw new Error(errorMessage)
  }
  return result
}

const buildTraceMeta = (
  traceMeta: SpreadsheetMutationTraceMeta | undefined,
  operationType: string
): SpreadsheetMutationTraceMeta => ({
  ...traceMeta,
  operationType: traceMeta?.operationType ?? operationType
})

export const createSpreadsheetMutationFacade = (
  options: CreateSpreadsheetMutationFacadeOptions
): SpreadsheetMutationFacade => ({
  submitBatch: options.submitBatch,

  async createSheet(request: SpreadsheetCreateSheetMutationRequest): Promise<SpreadsheetSheet> {
    if (options.onSheetAdd) {
      return requireSheetResult(
        options.onSheetAdd(options.appId, {
          id: request.id,
          name: request.name,
          description: request.description,
          columns: request.columns,
          data: request.data,
          worksheetSnapshot: request.worksheetSnapshot
        }),
        'Failed to create sheet'
      )
    }

    return SpreadsheetApiService.createSheet(options.appId, {
      id: request.id,
      name: request.name,
      description: request.description,
      columns: request.columns,
      data: request.data,
      worksheetSnapshot: request.worksheetSnapshot
    })
  },

  async duplicateSheet(request: SpreadsheetDuplicateSheetMutationRequest): Promise<SpreadsheetSheet> {
    if (options.onSheetDuplicate) {
      return requireSheetResult(
        options.onSheetDuplicate(options.appId, request.sourceSheetId, {
          id: request.targetSheetId,
          name: request.name,
          visualWorksheetSnapshot: request.visualWorksheetSnapshot
        }),
        'Failed to duplicate sheet'
      )
    }

    return SpreadsheetApiService.duplicateSheet(options.appId, request.sourceSheetId, {
      id: request.targetSheetId,
      name: request.name,
      visualWorksheetSnapshot: request.visualWorksheetSnapshot
    })
  },

  async renameSheet(sheetId: string, name: string): Promise<SpreadsheetSheet> {
    return this.updateSheetMetadata(sheetId, { name })
  },

  async deleteSheet(sheetId: string): Promise<void> {
    if (options.onSheetDelete) {
      const ok = await options.onSheetDelete(options.appId, sheetId)
      if (!ok) {
        throw new Error('Failed to delete sheet')
      }
      return
    }

    const ok = await SpreadsheetApiService.deleteSheet(options.appId, sheetId)
    if (!ok) {
      throw new Error('Failed to delete sheet')
    }
  },

  async updateSheetMetadata(sheetId: string, patch: Partial<SpreadsheetSheet>): Promise<SpreadsheetSheet> {
    if (options.onSheetUpdate) {
      return requireSheetResult(options.onSheetUpdate(options.appId, sheetId, patch), 'Failed to update sheet metadata')
    }

    return SpreadsheetApiService.updateSheet(options.appId, sheetId, patch)
  },

  async createRow(sheetId: string, row: SpreadsheetViewerRow): Promise<SpreadsheetViewerRow> {
    if (options.onRowAdd) {
      return requireRowResult(options.onRowAdd(options.appId, sheetId, row), 'Failed to create row')
    }

    return SpreadsheetApiService.addRow(options.appId, sheetId, row)
  },

  async createRows(sheetId: string, rows: SpreadsheetViewerRow[]): Promise<SpreadsheetViewerRow[]> {
    if (options.onRowAdd) {
      const createdRows: SpreadsheetViewerRow[] = []
      for (const row of rows) {
        createdRows.push(await requireRowResult(options.onRowAdd(options.appId, sheetId, row), 'Failed to create row'))
      }
      return createdRows
    }

    try {
      return await SpreadsheetApiService.bulkAddRows(options.appId, sheetId, rows)
    } catch (error) {
      if (!(error instanceof SpreadsheetApiRequestError) || (error.status !== 404 && error.status !== 405)) {
        throw error
      }
    }

    const createdRows: SpreadsheetViewerRow[] = []
    for (const row of rows) {
      createdRows.push(await SpreadsheetApiService.addRow(options.appId, sheetId, row))
    }
    return createdRows
  },

  async updateRow(sheetId: string, rowId: string, patch: SpreadsheetViewerRow): Promise<SpreadsheetViewerRow> {
    if (options.onRowUpdate) {
      return requireRowResult(options.onRowUpdate(options.appId, sheetId, rowId, patch), 'Failed to update row')
    }

    return SpreadsheetApiService.updateRow(options.appId, sheetId, rowId, patch)
  },

  appendRows(sheetId: string, rows: SpreadsheetViewerRow[]) {
    return options.submitBatch({
      sheetId,
      operations: [
        {
          operationId: createSpreadsheetMutationOperationId('add_rows'),
          type: 'add_rows',
          data: { rows }
        }
      ],
      batchIdPrefix: 'add_rows',
      traceMeta: buildTraceMeta(undefined, 'add_rows')
    })
  },

  insertRowsAt(sheetId: string, rowIndex: number, rows: SpreadsheetViewerRow[]) {
    return options.submitBatch({
      sheetId,
      operations: [
        {
          operationId: createSpreadsheetMutationOperationId('insert_rows_at'),
          type: 'insert_rows_at',
          data: { insertAt: rowIndex, rows }
        }
      ],
      batchIdPrefix: 'insert_rows_at',
      traceMeta: buildTraceMeta(undefined, 'insert_rows_at')
    })
  },

  insertRowSlots(
    sheetId: string,
    startGridRowIndex: number,
    count: number,
    materializedRows: SpreadsheetViewerRow[] = []
  ) {
    return options.submitBatch({
      sheetId,
      operations: [
        {
          operationId: createSpreadsheetMutationOperationId('insert_row_slots'),
          type: 'insert_row_slots',
          data: { startGridRowIndex, count, materializedRows }
        }
      ],
      batchIdPrefix: 'insert_row_slots',
      traceMeta: buildTraceMeta(undefined, 'insert_row_slots')
    })
  },

  deleteRow(sheetId: string, rowId: string) {
    return SpreadsheetApiService.deleteRow(options.appId, sheetId, rowId)
  },

  deleteRows(sheetId: string, rowIds: string[]) {
    return options.submitBatch({
      sheetId,
      operations: [
        {
          operationId: createSpreadsheetMutationOperationId('delete_rows'),
          type: 'delete_rows',
          data: { rowIds }
        }
      ],
      batchIdPrefix: 'delete_rows',
      traceMeta: buildTraceMeta(undefined, 'delete_rows')
    })
  },

  deleteRowSlots(sheetId: string, startGridRowIndex: number, count: number) {
    return options.submitBatch({
      sheetId,
      operations: [
        {
          operationId: createSpreadsheetMutationOperationId('delete_row_slots'),
          type: 'delete_row_slots',
          data: { startGridRowIndex, count }
        }
      ],
      batchIdPrefix: 'delete_row_slots',
      traceMeta: buildTraceMeta(undefined, 'delete_row_slots')
    })
  },

  moveRowSlots(sheetId: string, sourceStartGridRowIndex: number, count: number, destinationGridRowIndex: number) {
    return options.submitBatch({
      sheetId,
      operations: [
        {
          operationId: createSpreadsheetMutationOperationId('move_row_slots'),
          type: 'move_row_slots',
          data: { sourceStartGridRowIndex, count, destinationGridRowIndex }
        }
      ],
      batchIdPrefix: 'move_row_slots',
      traceMeta: buildTraceMeta(undefined, 'move_row_slots')
    })
  },

  moveCellRange(
    sheetId: string,
    fromRange: { startRow: number; endRow: number; startColumn: number; endColumn: number },
    toRange: { startRow: number; endRow: number; startColumn: number; endColumn: number }
  ) {
    return options.submitBatch({
      sheetId,
      operations: [
        {
          operationId: createSpreadsheetMutationOperationId('move_cell_range'),
          type: 'move_cell_range',
          data: { sheetId, fromRange, toRange }
        }
      ],
      batchIdPrefix: 'move_cell_range',
      traceMeta: buildTraceMeta(undefined, 'move_cell_range')
    })
  },

  moveRows: unsupportedMutation('moveRows'),
  reorderRows: unsupportedMutation('reorderRows'),

  updateRowViaRange(sheetId: string, cells: SpreadsheetRowRangeUpdate[]) {
    return this.setRange(sheetId, cells)
  },

  setCell(sheetId: string, cell: SpreadsheetRowRangeUpdate) {
    return options.submitBatch({
      sheetId,
      operations: [
        {
          operationId: createSpreadsheetMutationOperationId('set_cell'),
          type: 'set_cell',
          data: { ...cell }
        }
      ],
      batchIdPrefix: 'set_cell',
      traceMeta: buildTraceMeta(undefined, 'set_cell')
    })
  },

  setRange(sheetId: string, cells: SpreadsheetRowRangeUpdate[]) {
    return options.submitBatch({
      sheetId,
      operations: [
        {
          operationId: createSpreadsheetMutationOperationId('set_range'),
          type: 'set_range',
          data: { cells }
        }
      ],
      batchIdPrefix: 'set_range',
      traceMeta: buildTraceMeta(undefined, 'set_range')
    })
  },

  clearCell(sheetId: string, rowId: string, columnName: string) {
    return options.submitBatch({
      sheetId,
      operations: [
        {
          operationId: createSpreadsheetMutationOperationId('set_range'),
          type: 'set_range',
          data: { cells: [{ rowId, columnName, value: null }] }
        }
      ],
      batchIdPrefix: 'set_range',
      traceMeta: buildTraceMeta(undefined, 'set_range')
    })
  },

  appendColumns(sheetId: string, columns) {
    return options.submitBatch({
      sheetId,
      operations: columns.map(column => ({
        operationId: createSpreadsheetMutationOperationId('column_add'),
        type: 'column_add' as const,
        data: { sheetId, column }
      })),
      batchIdPrefix: 'column_add',
      traceMeta: buildTraceMeta(undefined, 'column_add')
    })
  },

  insertColumnsAt: unsupportedMutation('insertColumnsAt'),

  updateColumn(sheetId: string, columnId: string, patch) {
    return options.submitBatch({
      sheetId,
      operations: [
        {
          operationId: createSpreadsheetMutationOperationId('column_update'),
          type: 'column_update',
          data: { sheetId, columnId, columnPatch: patch }
        }
      ],
      batchIdPrefix: 'column_update',
      traceMeta: buildTraceMeta(undefined, 'column_update')
    })
  },

  deleteColumns(sheetId: string, columnIds: string[]) {
    return options.submitBatch({
      sheetId,
      operations: columnIds.map(columnId => ({
        operationId: createSpreadsheetMutationOperationId('column_delete'),
        type: 'column_delete' as const,
        data: { sheetId, columnId }
      })),
      batchIdPrefix: 'column_delete',
      traceMeta: buildTraceMeta(undefined, 'column_delete')
    })
  },

  moveColumns: unsupportedMutation('moveColumns'),

  reorderColumns(request: SpreadsheetColumnReorderRequest) {
    return options.submitBatch({
      sheetId: request.sheetId,
      operations: [
        {
          operationId: createSpreadsheetMutationOperationId('columns_reorder'),
          type: 'columns_reorder',
          data: { sheetId: request.sheetId, columns: request.columns }
        }
      ],
      batchIdPrefix: 'columns_reorder',
      traceMeta: buildTraceMeta(undefined, 'columns_reorder')
    })
  },

  setStyle(sheetId: string, payload: Record<string, unknown>) {
    return options.submitBatch({
      sheetId,
      operations: [
        {
          operationId: createSpreadsheetMutationOperationId('set_style'),
          type: 'set_style',
          data: { sheetId, ...payload }
        }
      ],
      batchIdPrefix: 'set_style',
      traceMeta: buildTraceMeta(undefined, 'set_style')
    })
  },

  setRowHeight(sheetId: string, rowIndex: number, height: number) {
    return options.submitBatch({
      sheetId,
      operations: [
        {
          operationId: createSpreadsheetMutationOperationId('set_row_height'),
          type: 'set_row_height',
          data: { sheetId, rowIndex, height }
        }
      ],
      batchIdPrefix: 'set_row_height',
      traceMeta: buildTraceMeta(undefined, 'set_row_height')
    })
  },

  setColWidth(sheetId: string, colIndex: number, width: number) {
    return options.submitBatch({
      sheetId,
      operations: [
        {
          operationId: createSpreadsheetMutationOperationId('set_col_width'),
          type: 'set_col_width',
          data: { sheetId, colIndex, width }
        }
      ],
      batchIdPrefix: 'set_col_width',
      traceMeta: buildTraceMeta(undefined, 'set_col_width')
    })
  },

  async saveWorkbookSnapshotWithRetry(input: SpreadsheetSaveWorkbookSnapshotInput) {
    return saveSpreadsheetSnapshotWithRetry({
      ...input,
      appId: options.appId
    })
  },

  async updateAppMetadata(updates: Partial<SpreadsheetApp>) {
    return SpreadsheetApiService.updateApp(options.appId, updates)
  },

  async fetchSheetChangesSince(sheetId: string, sinceVersion: number): Promise<SpreadsheetReplayResponse> {
    if (options.fetchSheetChangesSince) {
      return options.fetchSheetChangesSince(sheetId, sinceVersion)
    }

    return fetchSpreadsheetSheetReplaySince(options.appId, sheetId, sinceVersion)
  },

  requestStructuralResync(sheetId?: string, optionsArg?: { immediate?: boolean }): void {
    options.requestStructuralResync?.(sheetId, optionsArg)
  }
})
