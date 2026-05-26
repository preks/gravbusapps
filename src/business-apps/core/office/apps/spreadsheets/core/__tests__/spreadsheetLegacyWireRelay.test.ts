import {
  isDeprecatedWsStructuralRelayOperation,
  isLegacyWsRelayOperation,
  synthesizeCommittedBatchFromWireOperation
} from '../spreadsheetLegacyWireRelay'

describe('spreadsheetLegacyWireRelay', () => {
  it('classifies legacy relay op types', () => {
    expect(isLegacyWsRelayOperation('cells_changed')).toBe(true)
    expect(isLegacyWsRelayOperation('set_cell')).toBe(true)
    expect(isDeprecatedWsStructuralRelayOperation('insert_row_slots')).toBe(true)
    expect(isLegacyWsRelayOperation('batch_operations')).toBe(false)
  })

  it('synthesizes set_cell into a committed envelope', () => {
    const envelope = synthesizeCommittedBatchFromWireOperation({
      operationType: 'set_cell',
      sheetId: 'sheet-1',
      appliedVersion: 4,
      data: { rowId: 'row-1', columnName: 'Name', value: 'x' }
    })
    expect(envelope).toEqual(
      expect.objectContaining({
        sheetId: 'sheet-1',
        baseVersion: 3,
        appliedVersion: 4,
        operations: [expect.objectContaining({ type: 'set_cell' })]
      })
    )
  })

  it('synthesizes cells_changed into set_range batch ops', () => {
    const envelope = synthesizeCommittedBatchFromWireOperation({
      operationType: 'cells_changed',
      sheetId: 'sheet-1',
      appliedVersion: 2,
      data: {
        sheetId: 'sheet-1',
        cells: [{ rowId: 'row-1', column: 'Name', value: 'new' }]
      }
    })
    expect(envelope?.operations[0]?.type).toBe('set_range')
  })
})
