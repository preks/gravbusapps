import { planVisibleColumnReorderMoves } from '../spreadsheetColumnReorderMoves'
import type { SpreadsheetColumn } from '../../types/spreadsheet'

const column = (id: string, order: number, isVisible = true): SpreadsheetColumn => ({
  id,
  name: id,
  label: id,
  type: 'text',
  order,
  isVisible,
  isEditable: true,
  isRequired: false,
  isUnique: false,
  width: 100
})

describe('planVisibleColumnReorderMoves', () => {
  it('returns no moves when visible order is unchanged', () => {
    const columns = [column('a', 0), column('b', 1), column('c', 2)]
    expect(planVisibleColumnReorderMoves(columns, columns)).toEqual([])
  })

  it('plans a single swap between adjacent visible columns', () => {
    const previous = [column('a', 0), column('b', 1), column('c', 2)]
    const next = [column('a', 0), column('c', 1), column('b', 2)]
    expect(planVisibleColumnReorderMoves(previous, next)).toEqual([
      { sourceStartColumn: 2, count: 1, destinationStartColumn: 1 }
    ])
  })

  it('ignores hidden columns when planning visible grid moves', () => {
    const previous = [column('a', 0), column('b', 1), column('hidden', 2, false), column('c', 3)]
    const next = [column('a', 0), column('c', 1), column('hidden', 2, false), column('b', 3)]
    expect(planVisibleColumnReorderMoves(previous, next)).toEqual([
      { sourceStartColumn: 2, count: 1, destinationStartColumn: 1 }
    ])
  })
})
