import { SpreadsheetVersionCausalOwnershipRegistry } from '../spreadsheetVersionCausalOwnership'

describe('SpreadsheetVersionCausalOwnershipRegistry', () => {
  it('does not suppress remote paint based on version or client row handles', () => {
    const registry = new SpreadsheetVersionCausalOwnershipRegistry()
    registry.registerIntent({
      sheetId: 'sheet-1',
      logicalRowHandle: 'backend-row-1',
      columnName: 'ColumnA',
      baseVersion: 10
    })
    registry.markSubmitted('sheet-1', 'backend-row-1', 'ColumnA')

    expect(
      registry.shouldSuppressRemotePaint({
        sheetId: 'sheet-1',
        rowId: 'backend-row-1',
        columnName: 'ColumnA',
        remoteAppliedVersion: 10
      })
    ).toBe(false)
  })

  it('tracks client row intents without row-wide remote paint suppression', () => {
    const registry = new SpreadsheetVersionCausalOwnershipRegistry()
    registry.registerIntent({
      sheetId: 'sheet-1',
      logicalRowHandle: 'client_row_9',
      columnName: 'ColumnA',
      baseVersion: 4
    })

    expect(
      registry.shouldSuppressRemotePaint({
        sheetId: 'sheet-1',
        rowId: 'client_row_9',
        columnName: 'ColumnB',
        remoteAppliedVersion: 4
      })
    ).toBe(false)

    registry.promoteLogicalRowHandle('sheet-1', 'client_row_9', 'backend-row-9')
    registry.markAcknowledged('sheet-1', 'backend-row-9', 'ColumnA', 5)

    expect(registry.hasUnresolvedIntents('sheet-1')).toBe(false)
  })
})
