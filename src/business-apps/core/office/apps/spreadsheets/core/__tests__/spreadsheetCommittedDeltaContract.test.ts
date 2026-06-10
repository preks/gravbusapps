import {
  buildCommittedBatchDedupeKey,
  getSpreadsheetDeltaReplayMode,
  normalizeCommittedBatchEnvelope,
  replayDeltasAsCommittedBatches,
  validateCommittedBatchForLiveApply
} from '../spreadsheetCommittedDeltaContract'

describe('spreadsheetCommittedDeltaContract', () => {
  it('normalizes legacy batch_operations data into a committed envelope', () => {
    const batch = normalizeCommittedBatchEnvelope({
      operation: {
        baseVersion: 4,
        version: 5,
        data: {
          sheetId: 'sheet-1',
          workbookId: 'workbook-1',
          batchId: 'batch-1',
          actorId: 'user-1',
          operations: [{ type: 'set_range', operationId: 'op-1', data: { cells: [] } }]
        }
      },
      incomingVersion: 5
    })

    expect(batch).toEqual(
      expect.objectContaining({
        sheetId: 'sheet-1',
        workbookId: 'workbook-1',
        batchId: 'batch-1',
        actorId: 'user-1',
        baseVersion: 4,
        appliedVersion: 5,
        payloadSchemaVersion: 1
      })
    )
    expect(batch?.operations[0]).toEqual(
      expect.objectContaining({ type: 'set_range', operationId: 'op-1', baseVersion: 4, appliedVersion: 5 })
    )
  })

  it('normalizes authoritative column structure from committed batch envelopes', () => {
    const batch = normalizeCommittedBatchEnvelope({
      operation: {
        baseVersion: 8,
        version: 9,
        data: {
          sheetId: 'sheet-1',
          batchId: 'batch-columns-1',
          visibleColumnIds: ['col-b', 'col-c'],
          gridColumnIndexByColumnId: { 'col-b': 0, 'col-c': 1 },
          columns: [
            {
              id: 'col-b',
              name: 'ColumnB',
              label: 'B',
              type: 'text',
              isVisible: true,
              isEditable: true,
              isRequired: false,
              isUnique: false,
              order: 0
            },
            {
              id: 'col-c',
              name: 'ColumnC',
              label: 'C',
              type: 'text',
              isVisible: true,
              isEditable: true,
              isRequired: false,
              isUnique: false,
              order: 1
            }
          ],
          operations: [{ type: 'column_add', operationId: 'op-col-1', data: { sheetId: 'sheet-1' } }]
        }
      }
    })

    expect(batch).toEqual(
      expect.objectContaining({
        visibleColumnIds: ['col-b', 'col-c'],
        gridColumnIndexByColumnId: { 'col-b': 0, 'col-c': 1 },
        columns: [
          expect.objectContaining({ id: 'col-b', order: 0 }),
          expect.objectContaining({ id: 'col-c', order: 1 })
        ]
      })
    )
  })

  it('normalizes worksheet metadata and comment anchor patches from committed batches', () => {
    const batch = normalizeCommittedBatchEnvelope({
      operation: {
        baseVersion: 9,
        version: 10,
        data: {
          sheetId: 'sheet-1',
          batchId: 'batch-patches-1',
          worksheetMetadataPatch: {
            sheetId: 'sheet-1',
            keys: {
              mergeData: [{ startRow: 3, endRow: 3, startColumn: 1, endColumn: 2 }]
            }
          },
          commentAnchorPatches: [
            { id: 'comment-1', cellReference: 'B4', sheetId: 'sheet-1' },
            { id: 'comment-2', cellReference: null, sheetId: 'sheet-1' }
          ],
          operations: [{ type: 'columns_reorder', operationId: 'op-1', data: { sheetId: 'sheet-1' } }]
        }
      }
    })

    expect(batch?.worksheetMetadataPatch).toEqual({
      sheetId: 'sheet-1',
      keys: {
        mergeData: [{ startRow: 3, endRow: 3, startColumn: 1, endColumn: 2 }]
      }
    })
    expect(batch?.commentAnchorPatches).toEqual([
      { id: 'comment-1', cellReference: 'B4', sheetId: 'sheet-1' },
      { id: 'comment-2', cellReference: null, sheetId: 'sheet-1' }
    ])
  })

  it('treats batches at or behind local applied version as stale', () => {
    const batch = normalizeCommittedBatchEnvelope({
      operation: {
        baseVersion: 4,
        version: 5,
        data: { sheetId: 'sheet-1', batchId: 'batch-1', operations: [{ type: 'set_range', data: { cells: [] } }] }
      }
    })

    expect(batch).not.toBeNull()
    expect(
      validateCommittedBatchForLiveApply({ batch: batch!, localAppliedVersion: 5, alreadyApplied: false })
    ).toEqual({
      ok: true
    })
    expect(validateCommittedBatchForLiveApply({ batch: batch!, localAppliedVersion: 5, alreadyApplied: true })).toEqual(
      {
        ok: false,
        reason: 'duplicate'
      }
    )
  })

  it('requires local version continuity for live apply', () => {
    const batch = normalizeCommittedBatchEnvelope({
      operation: {
        baseVersion: 4,
        version: 5,
        data: { sheetId: 'sheet-1', batchId: 'batch-1', operations: [{ type: 'set_range', data: { cells: [] } }] }
      }
    })

    expect(batch).not.toBeNull()
    expect(
      validateCommittedBatchForLiveApply({ batch: batch!, localAppliedVersion: 4, alreadyApplied: false })
    ).toEqual({
      ok: true
    })
    expect(
      validateCommittedBatchForLiveApply({ batch: batch!, localAppliedVersion: 3, alreadyApplied: false })
    ).toEqual({
      ok: false,
      reason: 'version_gap'
    })
    expect(
      validateCommittedBatchForLiveApply({ batch: batch!, localAppliedVersion: 6, alreadyApplied: false })
    ).toEqual({
      ok: true
    })
    expect(validateCommittedBatchForLiveApply({ batch: batch!, localAppliedVersion: 6, alreadyApplied: true })).toEqual(
      {
        ok: false,
        reason: 'duplicate'
      }
    )
  })

  it('builds idempotency keys from version and batch id', () => {
    const batch = normalizeCommittedBatchEnvelope({
      operation: {
        baseVersion: 7,
        version: 8,
        data: { sheetId: 'sheet-1', batchId: 'batch-1', operations: [{ type: 'set_range', data: { cells: [] } }] }
      }
    })

    expect(buildCommittedBatchDedupeKey(batch!)).toBe('sheet-1:8:batch-1')
  })

  it('groups replay deltas by version and batch identity in order', () => {
    const batches = replayDeltasAsCommittedBatches({
      sheetId: 'sheet-1',
      changes: [
        {
          operationType: 'set_cell',
          payload: { cellRef: 'A1', value: 'b' },
          appliedVersion: 6,
          baseVersion: 5,
          operationLogId: 'log-6'
        },
        {
          operationType: 'set_cell',
          payload: { cellRef: 'A2', value: 'a' },
          appliedVersion: 5,
          baseVersion: 4,
          operationLogId: 'log-5'
        },
        {
          operationType: 'insert_row_slots',
          payload: { startGridRowIndex: 1, count: 1 },
          appliedVersion: 6,
          baseVersion: 5,
          operationLogId: 'log-6b'
        }
      ]
    })

    expect(batches.map(batch => batch.appliedVersion)).toEqual([5, 6, 6])
    expect(batches[0]?.operations).toHaveLength(1)
    expect(batches[1]?.operations).toHaveLength(1)
    expect(batches[2]?.operations).toHaveLength(1)
    expect(batches[1]?.batchId).toBe('log-6')
  })

  it('builds the same dedupe key for live and replay envelopes of the same structural insert', () => {
    const liveBatch = normalizeCommittedBatchEnvelope({
      operation: {
        baseVersion: 33,
        version: 34,
        data: {
          sheetId: 'sheet-1',
          batchId: 'ws-batch-34',
          operations: [
            {
              type: 'insert_row_slots',
              operationId: 'insert-op-34',
              operationLogId: 'insert-log-34',
              data: { sheetId: 'sheet-1', startGridRowIndex: 8, count: 2, rows: [] }
            }
          ]
        }
      }
    })
    const replayBatch = replayDeltasAsCommittedBatches({
      sheetId: 'sheet-1',
      changes: [
        {
          operationType: 'insert_row_slots',
          payload: { sheetId: 'sheet-1', startGridRowIndex: 8, count: 2, rows: [] },
          appliedVersion: 34,
          baseVersion: 33,
          operationId: 'insert-op-34',
          operationLogId: 'insert-log-34'
        }
      ]
    })[0]

    expect(liveBatch).not.toBeNull()
    expect(replayBatch).toBeDefined()
    expect(buildCommittedBatchDedupeKey(liveBatch!)).toBe(buildCommittedBatchDedupeKey(replayBatch!))
    expect(buildCommittedBatchDedupeKey(liveBatch!)).toBe('sheet-1:34:insert-log-34')
  })

  it('collapses replayed multi-column inserts into the original committed batch identity', () => {
    const liveBatch = normalizeCommittedBatchEnvelope({
      operation: {
        baseVersion: 108,
        version: 109,
        data: {
          sheetId: 'sheet-1',
          batchId: 'ws-batch-column-add-109',
          operations: [
            {
              type: 'column_add',
              operationId: 'column-add-op-109-a',
              operationLogId: 'column-add-log-109-a',
              data: { sheetId: 'sheet-1', column: { id: 'col-i', name: 'I', order: 8, isVisible: true } }
            },
            {
              type: 'column_add',
              operationId: 'column-add-op-109-b',
              operationLogId: 'column-add-log-109-b',
              data: { sheetId: 'sheet-1', column: { id: 'col-j', name: 'J', order: 9, isVisible: true } }
            }
          ]
        }
      }
    })
    const replayBatch = replayDeltasAsCommittedBatches({
      sheetId: 'sheet-1',
      changes: [
        {
          operationType: 'column_add',
          payload: { sheetId: 'sheet-1', column: { id: 'col-i', name: 'I', order: 8, isVisible: true } },
          appliedVersion: 109,
          baseVersion: 108,
          operationId: 'column-add-op-109-a',
          operationLogId: 'column-add-log-109-a'
        },
        {
          operationType: 'column_add',
          payload: { sheetId: 'sheet-1', column: { id: 'col-j', name: 'J', order: 9, isVisible: true } },
          appliedVersion: 109,
          baseVersion: 108,
          operationId: 'column-add-op-109-b',
          operationLogId: 'column-add-log-109-b'
        }
      ]
    })[0]

    expect(liveBatch).not.toBeNull()
    expect(replayBatch).toBeDefined()
    expect(replayBatch?.operations).toHaveLength(2)
    expect(buildCommittedBatchDedupeKey(replayBatch!)).toBe(buildCommittedBatchDedupeKey(liveBatch!))
    expect(buildCommittedBatchDedupeKey(replayBatch!)).toBe('sheet-1:109:column-add-log-109-a,column-add-log-109-b')
  })

  it('hoists authoritative column structure from replay results onto reconstructed batches', () => {
    const replayBatch = replayDeltasAsCommittedBatches({
      sheetId: 'sheet-1',
      changes: [
        {
          operationType: 'columns_reorder',
          payload: { sheetId: 'sheet-1', columns: ['col-c', 'col-a'] },
          result: {
            visibleColumnIds: ['col-c', 'col-a'],
            gridColumnIndexByColumnId: { 'col-c': 0, 'col-a': 1 },
            columns: [
              {
                id: 'col-c',
                name: 'ColumnC',
                label: 'C',
                type: 'text',
                isVisible: true,
                isEditable: true,
                isRequired: false,
                isUnique: false,
                order: 0
              },
              {
                id: 'col-a',
                name: 'ColumnA',
                label: 'A',
                type: 'text',
                isVisible: true,
                isEditable: true,
                isRequired: false,
                isUnique: false,
                order: 1
              }
            ]
          },
          appliedVersion: 22,
          baseVersion: 21,
          operationId: 'column-reorder-op-22',
          operationLogId: 'column-reorder-log-22'
        }
      ]
    })[0]

    expect(replayBatch).toEqual(
      expect.objectContaining({
        visibleColumnIds: ['col-c', 'col-a'],
        gridColumnIndexByColumnId: { 'col-c': 0, 'col-a': 1 },
        columns: [
          expect.objectContaining({ id: 'col-c', order: 0 }),
          expect.objectContaining({ id: 'col-a', order: 1 })
        ]
      })
    )
  })

  it('defaults delta replay to enabled with explicit rollback and shadow overrides', () => {
    localStorage.removeItem('gba.spreadsheets.deltaReplay')
    expect(getSpreadsheetDeltaReplayMode()).toBe('enabled')

    localStorage.setItem('gba.spreadsheets.deltaReplay', 'off')
    expect(getSpreadsheetDeltaReplayMode()).toBe('off')

    localStorage.setItem('gba.spreadsheets.deltaReplay', 'shadow')
    expect(getSpreadsheetDeltaReplayMode()).toBe('shadow')

    localStorage.setItem('gba.spreadsheets.deltaReplay', 'unexpected')
    expect(getSpreadsheetDeltaReplayMode()).toBe('enabled')
  })
})
