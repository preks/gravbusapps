import {
  getSheetIdFromPendingLocalMutationProtectionKey,
  protectSpreadsheetPendingLocalMutationCells,
  spreadsheetPendingLocalMutationCoordinateCellKey,
  spreadsheetPendingLocalMutationSemanticCellKey,
  summarizeSpreadsheetPendingLocalMutationProtection
} from '../spreadsheetPendingMaterializationCells'

describe('spreadsheetPendingMaterializationCells summary helpers', () => {
  it('extracts sheet ids from supported protection keys', () => {
    expect(getSheetIdFromPendingLocalMutationProtectionKey('coord\u0000sheet-1\u00000\u00000')).toBe('sheet-1')
    expect(getSheetIdFromPendingLocalMutationProtectionKey('semantic\u0000sheet-2\u0000row-1\u0000column_a')).toBe(
      'sheet-2'
    )
    expect(getSheetIdFromPendingLocalMutationProtectionKey('weird-key')).toBeNull()
  })

  it('summarizes protected keys by target sheet, owner kind, and owner class', () => {
    const pendingLocalMutationCellsRef = { current: new Set<string>() }

    protectSpreadsheetPendingLocalMutationCells(
      pendingLocalMutationCellsRef,
      [
        {
          key: spreadsheetPendingLocalMutationCoordinateCellKey('sheet-1', 0, 0),
          ownerId: 'queue:sheet-1:coord:0:0'
        },
        {
          key: spreadsheetPendingLocalMutationSemanticCellKey('sheet-1', 'row-1', 'column_a'),
          ownerId: 'plan:trace:sheet-1:row-1:column_a'
        },
        {
          key: spreadsheetPendingLocalMutationCoordinateCellKey('sheet-2', 4, 2),
          ownerId: 'materialization:sheet-2:4:2',
          kind: 'materialization_adoption'
        }
      ],
      { ttlMs: 0 }
    )

    const summary = summarizeSpreadsheetPendingLocalMutationProtection(pendingLocalMutationCellsRef, 'sheet-1')

    expect(summary.globalKeyCount).toBe(3)
    expect(summary.targetSheetKeyCount).toBe(2)
    expect(summary.globalOwnerCount).toBe(3)
    expect(summary.targetSheetOwnerCount).toBe(2)
    expect(summary.keysBySheet).toEqual({ 'sheet-1': 2, 'sheet-2': 1 })
    expect(summary.ownerKinds).toEqual({
      local_user_edit: 2,
      materialization_adoption: 1
    })
    expect(summary.ownerClasses).toEqual({
      queue: 1,
      plan: 1,
      deferred: 0,
      materialization: 1,
      other: 0
    })
  })
})
