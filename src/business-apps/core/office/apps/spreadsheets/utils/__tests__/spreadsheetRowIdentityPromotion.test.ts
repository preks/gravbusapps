import { SpreadsheetIntentJournal } from '../../core/spreadsheetIntentJournal'
import { SpreadsheetVersionCausalOwnershipRegistry } from '../../core/spreadsheetVersionCausalOwnership'
import {
  protectSpreadsheetPendingLocalMutationCells,
  releaseSpreadsheetPendingLocalMutationCells,
  spreadsheetPendingLocalMutationSemanticCellKey
} from '../spreadsheetPendingMaterializationCells'
import { promoteSpreadsheetRowIdentities } from '../spreadsheetRowIdentityPromotion'

describe('promoteSpreadsheetRowIdentities', () => {
  it('promotes every row-identity sidecar together', () => {
    const journal = new SpreadsheetIntentJournal()
    const ownership = new SpreadsheetVersionCausalOwnershipRegistry()
    const rowMaterializationReadiness = { resolveMany: jest.fn() }
    const rowSlotIdentityRegistry = { bindBackendRowId: jest.fn() }
    const pendingLocalMutationCellsRef = { current: new Set<string>() }
    const promoteOwnershipSpy = jest.spyOn(ownership, 'promoteLogicalRowHandle')

    journal.captureIntent({
      sheetId: 'sheet-1',
      logicalRowHandle: 'client-row-1',
      columnName: 'ColumnA',
      value: 'local',
      baseVersion: 2
    })
    protectSpreadsheetPendingLocalMutationCells(pendingLocalMutationCellsRef, [
      {
        key: spreadsheetPendingLocalMutationSemanticCellKey('sheet-1', 'client-row-1', 'ColumnA'),
        ownerId: 'plan:client-row-1:ColumnA',
        expectedSignature: 's:local'
      }
    ])

    promoteSpreadsheetRowIdentities({
      sheetId: 'sheet-1',
      persistedIdByClientRowId: new Map([['client-row-1', 'backend-row-1']]),
      deps: {
        rowMaterializationReadiness,
        rowSlotIdentityRegistry,
        intentJournal: journal,
        versionCausalOwnership: ownership,
        pendingLocalMutationCellsRef
      }
    })

    expect(rowMaterializationReadiness.resolveMany).toHaveBeenCalledWith(
      'sheet-1',
      new Map([['client-row-1', 'backend-row-1']])
    )
    expect(rowSlotIdentityRegistry.bindBackendRowId).toHaveBeenCalledWith('sheet-1', 'client-row-1', 'backend-row-1')
    expect(promoteOwnershipSpy).toHaveBeenCalledWith('sheet-1', 'client-row-1', 'backend-row-1')
    expect(journal.listIntents('sheet-1')).toEqual([
      expect.objectContaining({
        logicalRowHandle: 'backend-row-1',
        state: 'ready'
      })
    ])
    expect(
      pendingLocalMutationCellsRef.current.has(
        spreadsheetPendingLocalMutationSemanticCellKey('sheet-1', 'client-row-1', 'ColumnA')
      )
    ).toBe(false)
    expect(
      pendingLocalMutationCellsRef.current.has(
        spreadsheetPendingLocalMutationSemanticCellKey('sheet-1', 'backend-row-1', 'ColumnA')
      )
    ).toBe(true)
  })

  it('allows migrated pending protection to be released by the original owner callback', () => {
    const pendingLocalMutationCellsRef = { current: new Set<string>() }
    const sourceKey = spreadsheetPendingLocalMutationSemanticCellKey('sheet-1', 'client-row-1', 'ColumnA')
    const targetKey = spreadsheetPendingLocalMutationSemanticCellKey('sheet-1', 'backend-row-1', 'ColumnA')
    const ownerId = `queue:sheet-1:${sourceKey}`

    protectSpreadsheetPendingLocalMutationCells(pendingLocalMutationCellsRef, [{ key: sourceKey, ownerId }])

    promoteSpreadsheetRowIdentities({
      sheetId: 'sheet-1',
      persistedIdByClientRowId: new Map([['client-row-1', 'backend-row-1']]),
      deps: {
        pendingLocalMutationCellsRef
      }
    })

    expect(pendingLocalMutationCellsRef.current.has(sourceKey)).toBe(false)
    expect(pendingLocalMutationCellsRef.current.has(targetKey)).toBe(true)

    releaseSpreadsheetPendingLocalMutationCells(pendingLocalMutationCellsRef, [{ key: sourceKey, ownerId }])

    expect(pendingLocalMutationCellsRef.current.has(targetKey)).toBe(false)
  })
})
