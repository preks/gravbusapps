import {
  applyColumnWidthsFromDimensions,
  areColumnWidthPatchesEquivalent,
  buildDimensionDeltaOps,
  extractDimensionBaselineFromSnapshot
} from '../spreadsheetViewerDimensions'
import type { CellDimensionsPayload } from '../../components/UniverSheetGrid.types'
import type { SpreadsheetColumn } from '../../types'

describe('spreadsheetViewerDimensions', () => {
  const columns: SpreadsheetColumn[] = [
    { id: 'c1', name: 'a', label: 'A', type: 'text', order: 0 },
    { id: 'c2', name: 'b', label: 'B', type: 'text', order: 1 }
  ]

  it('applyColumnWidthsFromDimensions detects width changes for visible columns', () => {
    const payload: CellDimensionsPayload = {
      sheetId: 's1',
      defaultColWidth: 73,
      defaultRowHeight: 23,
      columnData: { 0: { w: 120 }, 1: { w: 80 } },
      rowData: {},
      rowHeaderWidth: 48,
      columnHeaderHeight: 28,
      zoomRatio: 1
    }
    const result = applyColumnWidthsFromDimensions(columns, payload)
    expect(result).not.toBeNull()
    expect(result?.changedColumns.map(c => c.columnId)).toEqual(['c1', 'c2'])
  })

  it('areColumnWidthPatchesEquivalent respects pending overrides', () => {
    const pending = { c1: 120 }
    const changed = [{ columnId: 'c1', width: 120 }]
    expect(areColumnWidthPatchesEquivalent(columns, pending, changed)).toBe(true)
  })

  it('buildDimensionDeltaOps emits row height delta', () => {
    const baseline = extractDimensionBaselineFromSnapshot(null, 's1')
    const payload: CellDimensionsPayload = {
      sheetId: 's1',
      defaultColWidth: 73,
      defaultRowHeight: 23,
      columnData: {},
      rowData: { 0: { h: 40 } },
      rowHeaderWidth: 48,
      columnHeaderHeight: 28,
      zoomRatio: 1
    }
    const ops = buildDimensionDeltaOps(payload, baseline, new Set())
    expect(ops.some(o => o.type === 'set_row_height')).toBe(true)
  })

  it('buildDimensionDeltaOps does not convert visibility metadata into resize ops', () => {
    const baseline = extractDimensionBaselineFromSnapshot(null, 's1')
    const payload: CellDimensionsPayload = {
      sheetId: 's1',
      defaultColWidth: 73,
      defaultRowHeight: 23,
      columnData: { 0: { w: 0, hd: 1 } },
      rowData: { 0: { h: 0, hd: 1 } },
      rowHeaderWidth: 48,
      columnHeaderHeight: 28,
      zoomRatio: 1
    }

    const ops = buildDimensionDeltaOps(payload, baseline, new Set())

    expect(ops).toEqual([])
  })

  it('does not fall back to the first sheet when the requested sheet is missing', () => {
    const baseline = extractDimensionBaselineFromSnapshot(
      {
        sheetOrder: ['sheet-1'],
        sheets: {
          'sheet-1': {
            defaultColumnWidth: 144,
            defaultRowHeight: 33,
            columnData: { 0: { w: 144 } },
            rowData: { 0: { h: 33 } }
          }
        }
      },
      'sheet-2'
    )

    expect(baseline.defaultColWidth).toBe(73)
    expect(baseline.defaultRowHeight).toBe(23)
    expect(baseline.colWidths.size).toBe(0)
    expect(baseline.rowHeights.size).toBe(0)
  })
})
