import { findSessionGridDivergences } from '../spreadsheetSessionGridDivergence'
import type { SpreadsheetColumn } from '../../types/spreadsheet'

const col = (id: string, name: string, order: number): SpreadsheetColumn => ({
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

describe('findSessionGridDivergences', () => {
  const columns = [col('col-a', 'A', 0), col('col-b', 'B', 1)]

  it('returns no divergences when session and grid agree', () => {
    const result = findSessionGridDivergences({
      sessionRows: [{ _rowUuid: 'row-1', _gridRowIndex: 0, A: 'hello', B: 'world' }],
      visibleColumns: columns,
      gridValues: { 0: { 0: 'hello', 1: 'world' } },
      touchedCells: [
        { gridRowIndex: 0, colIndex: 0, rowId: 'row-1' },
        { gridRowIndex: 0, colIndex: 1, rowId: 'row-1' }
      ]
    })
    expect(result).toEqual([])
  })

  it('treats scalar and Univer cell-object values as equal', () => {
    const result = findSessionGridDivergences({
      sessionRows: [{ _rowUuid: 'row-1', _gridRowIndex: 0, A: 1 }],
      visibleColumns: columns,
      gridValues: { 0: { 0: { v: 1 } } },
      touchedCells: [{ gridRowIndex: 0, colIndex: 0, rowId: 'row-1' }]
    })
    expect(result).toEqual([])
  })

  it('reports a divergence when the grid still shows a stale value', () => {
    const result = findSessionGridDivergences({
      sessionRows: [{ _rowUuid: 'row-1', _gridRowIndex: 0, A: 'peer-wins' }],
      visibleColumns: columns,
      gridValues: { 0: { 0: 'local-stale' } },
      touchedCells: [{ gridRowIndex: 0, colIndex: 0, rowId: 'row-1' }]
    })
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      rowId: 'row-1',
      columnName: 'A',
      gridRowIndex: 0,
      colIndex: 0,
      sessionSignature: 's:peer-wins',
      gridSignature: 's:local-stale'
    })
  })

  it('detects a peer clear that the grid did not paint empty', () => {
    const result = findSessionGridDivergences({
      sessionRows: [{ _rowUuid: 'row-1', _gridRowIndex: 0, A: '' }],
      visibleColumns: columns,
      gridValues: { 0: { 0: 'still-here' } },
      touchedCells: [{ gridRowIndex: 0, colIndex: 0, rowId: 'row-1' }]
    })
    expect(result).toHaveLength(1)
    expect(result[0].sessionSignature).toBe('s:')
    expect(result[0].gridSignature).toBe('s:still-here')
  })

  it('matches the session row by durable rowId even if the grid index shifted', () => {
    const result = findSessionGridDivergences({
      sessionRows: [
        { _rowUuid: 'row-a', _gridRowIndex: 0, A: 'a' },
        { _rowUuid: 'row-b', _gridRowIndex: 1, A: 'b' }
      ],
      visibleColumns: columns,
      // Grid row 1 = "b"; session matched by rowId, not by visual index.
      gridValues: { 1: { 0: 'b' } },
      touchedCells: [{ gridRowIndex: 1, colIndex: 0, rowId: 'row-b' }]
    })
    expect(result).toEqual([])
  })

  it('skips touched cells whose column index is out of range', () => {
    const result = findSessionGridDivergences({
      sessionRows: [{ _rowUuid: 'row-1', _gridRowIndex: 0, A: 'x' }],
      visibleColumns: columns,
      gridValues: { 0: { 0: 'x' } },
      touchedCells: [{ gridRowIndex: 0, colIndex: 5, rowId: 'row-1' }]
    })
    expect(result).toEqual([])
  })

  it('deduplicates repeated coordinates', () => {
    const result = findSessionGridDivergences({
      sessionRows: [{ _rowUuid: 'row-1', _gridRowIndex: 0, A: 'peer' }],
      visibleColumns: columns,
      gridValues: { 0: { 0: 'stale' } },
      touchedCells: [
        { gridRowIndex: 0, colIndex: 0, rowId: 'row-1' },
        { gridRowIndex: 0, colIndex: 0, rowId: 'row-1' }
      ]
    })
    expect(result).toHaveLength(1)
  })
})
