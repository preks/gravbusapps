import { SpreadsheetVersionCausalOwnershipRegistry } from '../spreadsheetVersionCausalOwnership'

describe('SpreadsheetVersionCausalOwnershipRegistry', () => {
  it('suppresses remote paint at or below the intent base version', () => {
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
    ).toBe(true)
    expect(
      registry.shouldSuppressRemotePaint({
        sheetId: 'sheet-1',
        rowId: 'backend-row-1',
        columnName: 'ColumnA',
        remoteAppliedVersion: 11
      })
    ).toBe(false)
  })

  it('escalates row ownership for unresolved client row handles', () => {
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
        columnName: 'ColumnA',
        remoteAppliedVersion: 4
      })
    ).toBe(true)
    expect(
      registry.shouldSuppressRemotePaint({
        sheetId: 'sheet-1',
        rowId: 'client_row_9',
        columnName: 'ColumnB',
        remoteAppliedVersion: 4
      })
    ).toBe(true)

    registry.promoteLogicalRowHandle('sheet-1', 'client_row_9', 'backend-row-9')
    registry.markAcknowledged('sheet-1', 'backend-row-9', 'ColumnA', 5)

    expect(
      registry.shouldSuppressRemotePaint({
        sheetId: 'sheet-1',
        rowId: 'backend-row-9',
        columnName: 'ColumnB',
        remoteAppliedVersion: 5
      })
    ).toBe(false)
  })

  it('does not suppress a different column on the same backend row while another column is pending', () => {
    const registry = new SpreadsheetVersionCausalOwnershipRegistry()
    registry.registerIntent({
      sheetId: 'sheet-1',
      logicalRowHandle: 'backend-row-1',
      columnName: 'ColumnB',
      baseVersion: 10
    })
    registry.markSubmitted('sheet-1', 'backend-row-1', 'ColumnB')

    expect(
      registry.shouldSuppressRemotePaint({
        sheetId: 'sheet-1',
        rowId: 'backend-row-1',
        columnName: 'ColumnA',
        remoteAppliedVersion: 10
      })
    ).toBe(false)
    expect(
      registry.shouldSuppressRemotePaint({
        sheetId: 'sheet-1',
        rowId: 'backend-row-1',
        columnName: 'ColumnB',
        remoteAppliedVersion: 10
      })
    ).toBe(true)
  })
})
