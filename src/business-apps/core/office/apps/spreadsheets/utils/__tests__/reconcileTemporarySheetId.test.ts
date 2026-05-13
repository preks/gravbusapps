import {
  areCanonicalSheetIdsEqual,
  isSheetCreationAwaitingPersistedId,
  reconcileTemporarySheetIdReferences,
  resolveReconciledSheetId
} from '../reconcileTemporarySheetId'

describe('reconcileTemporarySheetId', () => {
  it('rewires cached rows, pending work, and latest workbook data to the persisted sheet id', () => {
    const peerSheetDataCache = new Map<string, Record<string, unknown>[]>([
      ['temp-sheet', [{ _rowUuid: 'row-1', name: 'draft' }]]
    ])
    const pendingUniverRowsBySheet = new Map([
      [
        'temp-sheet',
        {
          data: [{ _rowUuid: 'row-1', name: 'draft' }],
          persistedRows: []
        }
      ]
    ])
    const pendingSnapshotClearCells = new Map<string, Set<string>>([
      ['temp-sheet', new Set(['0:0'])],
      ['real-sheet', new Set(['1:1'])]
    ])
    const pendingSnapshotCheckpoints = new Map([
      ['temp-sheet', { requestedAt: 20 }],
      ['real-sheet', { requestedAt: 10 }]
    ])
    const knownSheetVersions = new Map([
      ['temp-sheet', { version: 7, fetchedAt: 20 }],
      ['real-sheet', { version: 3, fetchedAt: 10 }]
    ])
    const pendingCellChanges = [
      { rowId: 'row-1', columnName: 'name', value: 'draft', sheetId: 'temp-sheet' },
      { rowId: 'row-2', columnName: 'name', value: 'other', sheetId: 'real-sheet' }
    ]
    const pendingCellBatches = [
      { batchId: 'batch-1', targetSheetId: 'temp-sheet', operations: [] },
      { batchId: 'batch-2', targetSheetId: 'real-sheet', operations: [] }
    ]

    const latestUniverData = reconcileTemporarySheetIdReferences({
      temporarySheetId: 'temp-sheet',
      persistedSheetId: 'real-sheet',
      peerSheetDataCache,
      pendingUniverRowsBySheet,
      pendingSnapshotClearCells,
      pendingSnapshotCheckpoints,
      knownSheetVersions,
      pendingCellChanges,
      pendingCellBatches,
      latestUniverData: {
        sheetId: 'temp-sheet',
        data: [{ _rowUuid: 'row-1', name: 'draft' }]
      }
    })

    expect(peerSheetDataCache.has('temp-sheet')).toBe(false)
    expect(peerSheetDataCache.get('real-sheet')).toEqual([{ _rowUuid: 'row-1', name: 'draft' }])
    expect(pendingUniverRowsBySheet.has('temp-sheet')).toBe(false)
    expect(pendingUniverRowsBySheet.get('real-sheet')?.data).toEqual([{ _rowUuid: 'row-1', name: 'draft' }])
    expect(Array.from(pendingSnapshotClearCells.get('real-sheet') ?? [])).toEqual(
      expect.arrayContaining(['0:0', '1:1'])
    )
    expect(pendingSnapshotCheckpoints.get('real-sheet')).toEqual({ requestedAt: 20 })
    expect(knownSheetVersions.get('real-sheet')).toEqual({ version: 7, fetchedAt: 20 })
    expect(pendingCellChanges[0].sheetId).toBe('real-sheet')
    expect(pendingCellBatches[0].targetSheetId).toBe('real-sheet')
    expect(latestUniverData).toEqual({
      sheetId: 'real-sheet',
      data: [{ _rowUuid: 'row-1', name: 'draft' }]
    })
  })

  it('resolves aliased sheet ids to their persisted id', () => {
    const aliases = new Map([['temp-sheet', 'real-sheet']])
    expect(resolveReconciledSheetId('temp-sheet', aliases)).toBe('real-sheet')
    expect(resolveReconciledSheetId('other-sheet', aliases)).toBe('other-sheet')
  })

  it('areCanonicalSheetIdsEqual respects aliases on either side', () => {
    const aliases = new Map([['temp-sheet', 'real-sheet']])
    expect(areCanonicalSheetIdsEqual('temp-sheet', 'real-sheet', aliases)).toBe(true)
    expect(areCanonicalSheetIdsEqual('real-sheet', 'temp-sheet', aliases)).toBe(true)
    expect(areCanonicalSheetIdsEqual('a', 'b', aliases)).toBe(false)
  })

  it('isSheetCreationAwaitingPersistedId gates only matching temp sheet without persisted id', () => {
    const aliases = new Map<string, string>()
    expect(
      isSheetCreationAwaitingPersistedId({
        pendingCreatedSheetSelection: { temporarySheetId: 'temp-a', persistedSheetId: null },
        effectiveSheetId: 'temp-a',
        aliases
      })
    ).toBe(true)
    expect(
      isSheetCreationAwaitingPersistedId({
        pendingCreatedSheetSelection: { temporarySheetId: 'temp-a', persistedSheetId: 'real-a' },
        effectiveSheetId: 'temp-a',
        aliases
      })
    ).toBe(false)
    expect(
      isSheetCreationAwaitingPersistedId({
        pendingCreatedSheetSelection: { temporarySheetId: 'temp-a', persistedSheetId: null },
        effectiveSheetId: 'other',
        aliases
      })
    ).toBe(false)
  })
})
