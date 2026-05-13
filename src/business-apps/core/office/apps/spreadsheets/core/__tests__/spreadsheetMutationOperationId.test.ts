import { createSpreadsheetMutationOperationId } from '../spreadsheetMutationOperationId'

describe('createSpreadsheetMutationOperationId', () => {
  it('prefixes an opaque suffix', () => {
    const id = createSpreadsheetMutationOperationId('set_cell')
    expect(id.startsWith('set_cell_')).toBe(true)
    expect(id.length).toBeGreaterThan('set_cell_'.length + 4)
  })
})
