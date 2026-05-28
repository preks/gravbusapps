import { SpreadsheetVersionCausalOwnershipRegistry } from '../../core/spreadsheetVersionCausalOwnership'
import {
  buildSpreadsheetLocalCellPaintGuard,
  isGridCellLocallyOwned,
  protectDeferredLocalUserMutationCells
} from '../spreadsheetLocalCellPaintGuard'

const columns = [
  {
    id: 'col-a',
    name: 'column_a',
    label: 'A',
    type: 'text',
    isVisible: true,
    isEditable: true,
    isRequired: false,
    isUnique: false,
    order: 0
  }
] as const

describe('spreadsheetLocalCellPaintGuard', () => {
  it('treats cells with version-causal ownership as locally owned', () => {
    const ownership = new SpreadsheetVersionCausalOwnershipRegistry()
    ownership.registerIntent({
      sheetId: 'sheet-1',
      logicalRowHandle: 'row-1',
      columnName: 'column_a',
      baseVersion: 5
    })
    const guard = buildSpreadsheetLocalCellPaintGuard({
      sheetId: 'sheet-1',
      rows: [{ _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 0, column_a: 'x' }],
      columns: columns as never,
      versionCausalOwnershipRef: { current: ownership },
      resolveKnownSheetVersion: () => 4
    })
    expect(isGridCellLocallyOwned(guard, 0, 0)).toBe(true)
    expect(isGridCellLocallyOwned(guard, 1, 0)).toBe(false)
  })

  it('protects deferred local-user coordinates and registers staged ownership', () => {
    const ownership = new SpreadsheetVersionCausalOwnershipRegistry()
    const pending = { current: new Set<string>() }
    const guard = buildSpreadsheetLocalCellPaintGuard({
      sheetId: 'sheet-1',
      rows: [{ _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 3, column_a: 'local' }],
      columns: columns as never,
      versionCausalOwnershipRef: { current: ownership },
      pendingLocalMutationCellsRef: pending,
      resolveKnownSheetVersion: () => 2
    })
    protectDeferredLocalUserMutationCells(guard, [{ globalRowIndex: 3, globalColIndex: 0 }])
    expect(pending.current.size).toBeGreaterThan(0)
    expect(isGridCellLocallyOwned(guard, 3, 0)).toBe(true)
  })
})
