import {
  cellRangeRectsSameDimensions,
  isNativeCutPasteCommand,
  resolveCutPasteCellRangeMove
} from '../spreadsheetCutPasteMove'

describe('spreadsheetCutPasteMove', () => {
  it('detects native cut-paste command ids', () => {
    expect(isNativeCutPasteCommand('sheet.command.cut-paste')).toBe(true)
    expect(isNativeCutPasteCommand('sheet.command.paste')).toBe(false)
  })

  it('requires matching dimensions between source and destination', () => {
    expect(
      cellRangeRectsSameDimensions(
        { startRow: 0, endRow: 1, startColumn: 0, endColumn: 2 },
        { startRow: 5, endRow: 6, startColumn: 4, endColumn: 6 }
      )
    ).toBe(true)
    expect(
      cellRangeRectsSameDimensions(
        { startRow: 0, endRow: 1, startColumn: 0, endColumn: 2 },
        { startRow: 5, endRow: 7, startColumn: 4, endColumn: 6 }
      )
    ).toBe(false)
  })

  it('resolves move from command params when Univer includes fromRange and toRange', () => {
    const move = resolveCutPasteCellRangeMove({
      commandParams: {
        fromRange: { startRow: 1, endRow: 2, startColumn: 3, endColumn: 4 },
        toRange: { startRow: 8, endRow: 9, startColumn: 5, endColumn: 6 }
      },
      pendingCut: null,
      activeSheetId: 'sheet-1',
      workbook: null
    })
    expect(move).toEqual({
      fromRange: { startRow: 1, endRow: 2, startColumn: 3, endColumn: 4 },
      toRange: { startRow: 8, endRow: 9, startColumn: 5, endColumn: 6 }
    })
  })

  it('falls back to pending cut selection and active paste destination', () => {
    const workbook = {
      getActiveSheet: () => ({
        getSelection: () => ({
          getActiveRange: () => ({
            startRow: 10,
            endRow: 11,
            startColumn: 2,
            endColumn: 3
          })
        })
      })
    }
    const move = resolveCutPasteCellRangeMove({
      commandParams: {},
      pendingCut: {
        sheetId: 'sheet-1',
        fromRange: { startRow: 1, endRow: 2, startColumn: 0, endColumn: 1 },
        capturedAt: Date.now()
      },
      activeSheetId: 'sheet-1',
      workbook
    })
    expect(move).toEqual({
      fromRange: { startRow: 1, endRow: 2, startColumn: 0, endColumn: 1 },
      toRange: { startRow: 10, endRow: 11, startColumn: 2, endColumn: 3 }
    })
  })
})
