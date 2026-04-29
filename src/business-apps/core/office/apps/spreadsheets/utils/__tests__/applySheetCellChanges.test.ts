import type { SpreadsheetColumn } from '../../types'
import { applySheetCellChanges } from '../applySheetCellChanges'

const textCol = (id: string, name: string, order: number): SpreadsheetColumn => ({
  id,
  name,
  label: name,
  type: 'text',
  isVisible: true,
  isEditable: true,
  isRequired: false,
  isUnique: false,
  order
})

describe('applySheetCellChanges', () => {
  it('updates matching rows through column aliases', () => {
    const rows = [{ _rowUuid: 'row-1', name: 'before', 'col-name': 'stale-alias' }]
    const columns = [textCol('col-name', 'name', 0)]

    const result = applySheetCellChanges(rows, [{ rowId: 'row-1', columnName: 'col-name', value: 'after' }], columns)

    expect(result.mutatedAnyRow).toBe(true)
    expect(result.nextRows[0]).toMatchObject({ _rowUuid: 'row-1', name: 'after' })
    expect(result.nextRows[0]['col-name']).toBeUndefined()
    expect(typeof result.nextRows[0]._updatedAt).toBe('string')
  })

  it('leaves rows untouched when no row id matches', () => {
    const rows = [{ _rowUuid: 'row-1', name: 'before' }]
    const result = applySheetCellChanges(rows, [{ rowId: 'row-2', columnName: 'name', value: 'after' }], [])

    expect(result.mutatedAnyRow).toBe(false)
    expect(result.nextRows).toStrictEqual(rows)
  })
})
