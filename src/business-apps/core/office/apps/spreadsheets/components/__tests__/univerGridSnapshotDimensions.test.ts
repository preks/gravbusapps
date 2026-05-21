import { areSnapshotDimensionsEqual, extractDimensionsFromSnapshot } from '../univerGridSnapshotDimensions'

describe('univerGridSnapshotDimensions', () => {
  it('extracts Univer row and column hidden metadata', () => {
    const dimensions = extractDimensionsFromSnapshot({
      sheetOrder: ['sheet-1'],
      sheets: {
        'sheet-1': {
          defaultColumnWidth: 73,
          defaultRowHeight: 23,
          columnData: { 1: { w: 88, hd: 1 } },
          rowData: { 2: { h: 30, hd: 1 } },
          rowHeader: { width: 48 },
          columnHeader: { height: 28 }
        }
      }
    })

    expect(dimensions?.columnData[1]).toEqual({ w: 88, hd: 1 })
    expect(dimensions?.rowData[2]).toEqual({ h: 30, hd: 1 })
  })

  it('treats hidden metadata changes as dimension changes', () => {
    const base = {
      defaultColWidth: 73,
      defaultRowHeight: 23,
      columnData: { 1: { w: 88, hd: 1 } },
      rowData: {},
      rowHeaderWidth: 48,
      columnHeaderHeight: 28,
      zoomRatio: 1
    }

    expect(
      areSnapshotDimensionsEqual(base, {
        ...base,
        columnData: { 1: { w: 88, hd: 0 } }
      })
    ).toBe(false)
  })
})

describe('extractDimensionsFromSnapshot', () => {
  it('reads dimensions from the requested sheet instead of always using the first sheet', () => {
    const snapshot = {
      sheetOrder: ['sheet-1', 'sheet-2'],
      sheets: {
        'sheet-1': {
          id: 'sheet-1',
          defaultColumnWidth: 73,
          defaultRowHeight: 23,
          columnData: { 1: { w: 0 } },
          rowData: {},
          rowHeader: { width: 48 },
          columnHeader: { height: 28 }
        },
        'sheet-2': {
          id: 'sheet-2',
          defaultColumnWidth: 90,
          defaultRowHeight: 30,
          columnData: { 4: { w: 120 } },
          rowData: {},
          rowHeader: { width: 50 },
          columnHeader: { height: 32 }
        }
      }
    } as Record<string, unknown>

    const dimensions = extractDimensionsFromSnapshot(snapshot, 'sheet-2')

    expect(dimensions).toMatchObject({
      defaultColWidth: 90,
      defaultRowHeight: 30,
      columnData: { 4: { w: 120 } },
      rowHeaderWidth: 50,
      columnHeaderHeight: 32
    })
  })
})
