import {
  clearPendingSnapshotClearCoordinates,
  clearSnapshotCellsByCoordinate,
  cloneSnapshotCellRecordAt,
  countLiveWorksheetSnapshotValues,
  getKnownCellValueCount,
  getPendingSnapshotClearCoordinates,
  readSnapshotCellValue
} from '../spreadsheetSnapshotWorkbookUtils'

describe('spreadsheetSnapshotWorkbookUtils', () => {
  it('counts only meaningful viewer row values', () => {
    expect(
      getKnownCellValueCount({
        _id: 'row-1',
        id: 'server-row-1',
        Name: 'Alice',
        Title: '',
        Age: 32,
        Optional: null,
        Active: false,
        _rowUuid: 'server-row-1'
      })
    ).toBe(3)
  })

  it('reads formulas and value fallbacks from snapshot cells', () => {
    expect(readSnapshotCellValue({ f: 'SUM(A1:A2)' })).toBe('=SUM(A1:A2)')
    expect(readSnapshotCellValue({ f: '=A1' })).toBe('=A1')
    expect(readSnapshotCellValue({ v: 42 })).toBe(42)
    expect(readSnapshotCellValue({ m: 'display' })).toBe('display')
    expect(readSnapshotCellValue({ p: 'plain' })).toBe('plain')
    expect(readSnapshotCellValue(undefined)).toBeUndefined()
  })

  it('counts only non-blank snapshot cell values on the requested sheet', () => {
    const snapshot = {
      sheets: {
        'sheet-a': {
          id: 'sheet-a',
          cellData: {
            0: {
              0: { v: 'Alice' },
              1: { v: '' },
              2: { f: 'SUM(A1:A2)' }
            },
            1: {
              0: { v: null },
              1: { m: 'rendered' }
            }
          }
        },
        other: {
          id: 'other',
          cellData: {
            0: {
              0: { v: 'ignored' }
            }
          }
        }
      }
    }

    expect(countLiveWorksheetSnapshotValues(snapshot, 'sheet-a')).toBe(3)
  })

  it('clears snapshot value keys while preserving formatting metadata', () => {
    const snapshot = {
      sheets: {
        'sheet-a': {
          id: 'sheet-a',
          cellData: {
            0: {
              0: { v: 'Alice', s: 7 },
              1: { v: 'remove me' }
            }
          }
        }
      }
    }

    const result = clearSnapshotCellsByCoordinate(snapshot, 'sheet-a', [
      { row: 0, col: 0 },
      { row: 0, col: 1 }
    ]) as typeof snapshot

    expect(result.sheets['sheet-a'].cellData['0']['0']).toEqual({ s: 7 })
    expect(result.sheets['sheet-a'].cellData['0']['1']).toBeUndefined()
  })

  it('clones a single cell record from snapshot by row/col', () => {
    const snapshot = {
      sheets: {
        'sheet-a': {
          id: 'sheet-a',
          cellData: {
            1: {
              2: { s: 'style-1', v: 99 }
            }
          }
        }
      }
    } as unknown as Record<string, unknown>
    const cell = cloneSnapshotCellRecordAt(snapshot, 'sheet-a', 1, 2)
    expect(cell).toEqual({ s: 'style-1', v: 99 })
    const raw = (snapshot.sheets as Record<string, { cellData: Record<number, Record<number, unknown>> }>)['sheet-a']
      .cellData[1][2]
    expect(cell).not.toBe(raw)
  })

  it('parses and clears pending snapshot clear coordinates', () => {
    const pending = new Map<string, Set<string>>([
      ['sheet-a', new Set(['1:2', 'bad', '3:4'])],
      ['sheet-b', new Set(['9:9'])]
    ])

    expect(getPendingSnapshotClearCoordinates(pending, 'sheet-a')).toEqual([
      { row: 1, col: 2 },
      { row: 3, col: 4 }
    ])

    clearPendingSnapshotClearCoordinates(pending, 'sheet-a')

    expect(getPendingSnapshotClearCoordinates(pending, 'sheet-a')).toEqual([])
    expect(getPendingSnapshotClearCoordinates(pending, 'sheet-b')).toEqual([{ row: 9, col: 9 }])
  })
})
