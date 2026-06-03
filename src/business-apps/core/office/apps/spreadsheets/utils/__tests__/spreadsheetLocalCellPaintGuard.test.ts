import { SpreadsheetVersionCausalOwnershipRegistry } from '../../core/spreadsheetVersionCausalOwnership'
import {
  protectSpreadsheetPendingLocalMutationCells,
  spreadsheetPendingLocalMutationSemanticCellKey
} from '../spreadsheetPendingMaterializationCells'
import { promoteSpreadsheetRowIdentities } from '../spreadsheetRowIdentityPromotion'
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
  it('treats semantic pending-local protection as locally owned', () => {
    const pending = { current: new Set<string>() }
    protectSpreadsheetPendingLocalMutationCells(pending, [
      {
        key: spreadsheetPendingLocalMutationSemanticCellKey('sheet-1', 'row-1', 'column_a'),
        ownerId: 'plan:row-1:column_a'
      }
    ])
    const guard = buildSpreadsheetLocalCellPaintGuard({
      sheetId: 'sheet-1',
      rows: [{ _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 0, column_a: 'x' }],
      columns: columns as never,
      pendingLocalMutationCellsRef: pending,
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

  it('migrates deferred semantic protection from client row ids to backend ids', () => {
    const ownership = new SpreadsheetVersionCausalOwnershipRegistry()
    const pending = { current: new Set<string>() }
    const guard = buildSpreadsheetLocalCellPaintGuard({
      sheetId: 'sheet-1',
      rows: [{ _id: 'client-row-1', _clientRowId: 'client-row-1', _gridRowIndex: 3, column_a: 'local' }],
      columns: columns as never,
      versionCausalOwnershipRef: { current: ownership },
      pendingLocalMutationCellsRef: pending,
      resolveKnownSheetVersion: () => 2
    })

    protectDeferredLocalUserMutationCells(guard, [{ globalRowIndex: 3, globalColIndex: 0 }])

    expect(
      pending.current.has(spreadsheetPendingLocalMutationSemanticCellKey('sheet-1', 'client-row-1', 'column_a'))
    ).toBe(true)

    promoteSpreadsheetRowIdentities({
      sheetId: 'sheet-1',
      persistedIdByClientRowId: new Map([['client-row-1', 'backend-row-1']]),
      deps: {
        versionCausalOwnership: ownership,
        pendingLocalMutationCellsRef: pending
      }
    })

    expect(
      pending.current.has(spreadsheetPendingLocalMutationSemanticCellKey('sheet-1', 'client-row-1', 'column_a'))
    ).toBe(false)
    expect(
      pending.current.has(spreadsheetPendingLocalMutationSemanticCellKey('sheet-1', 'backend-row-1', 'column_a'))
    ).toBe(true)

    const promotedGuard = buildSpreadsheetLocalCellPaintGuard({
      sheetId: 'sheet-1',
      rows: [
        {
          _id: 'backend-row-1',
          _rowUuid: 'backend-row-1',
          _clientRowId: 'client-row-1',
          _gridRowIndex: 3,
          column_a: 'local'
        }
      ],
      columns: columns as never,
      versionCausalOwnershipRef: { current: ownership },
      pendingLocalMutationCellsRef: pending,
      resolveKnownSheetVersion: () => 2
    })

    expect(isGridCellLocallyOwned(promotedGuard, 3, 0)).toBe(true)
  })
})
