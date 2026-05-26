import { applyAutofillMutationCellPolicy, resolveSpreadsheetLocalMutationIntent } from '../univerMutationPlanner'
import {
  markSpreadsheetAutofillIntent,
  peekSpreadsheetAutofillIntent,
  resolveAutofillApplyTypeFromCommandParams
} from '../univerAutofillIntent'

describe('univerAutofillIntent', () => {
  it('resolves refill command apply type from params.type', () => {
    expect(resolveAutofillApplyTypeFromCommandParams({ type: 'SERIES' })).toBe('SERIES')
    expect(resolveAutofillApplyTypeFromCommandParams({ type: 'ONLY_FORMAT' })).toBe('ONLY_FORMAT')
  })

  it('defaults auto-fill drag to SERIES when apply type is omitted', () => {
    expect(resolveAutofillApplyTypeFromCommandParams({ sourceRange: {}, targetRange: {} })).toBe('SERIES')
  })

  it('peeks and expires autofill intent per sheet', () => {
    const intentRef = { current: null as import('../univerAutofillIntent').SpreadsheetAutofillIntent | null }
    markSpreadsheetAutofillIntent(intentRef, 'sheet-1', 'SERIES', 1_000)
    expect(peekSpreadsheetAutofillIntent(intentRef, 'sheet-1', 1_500)).toBe('SERIES')
    expect(peekSpreadsheetAutofillIntent(intentRef, 'sheet-2', 1_500)).toBeNull()
    expect(peekSpreadsheetAutofillIntent(intentRef, 'sheet-1', 5_000)).toBeNull()
  })
})

describe('autofill mutation routing', () => {
  it('maps fill series to autofill intent and keeps value + style cells', () => {
    expect(
      resolveSpreadsheetLocalMutationIntent({
        hasPersistableMutation: true,
        allowValueCarryingStylePayloads: true,
        commandId: 'sheet.mutation.set-range-values',
        mergedCellValue: { 1: { 1: { v: 2, s: 'style-1' } } },
        replaceRangeStyleIntent: false,
        pasteIntoNewRows: false,
        autofillApplyType: 'SERIES'
      })
    ).toBe('autofill')

    const cells = [
      {
        rowId: 'row-1',
        columnName: 'colA',
        rowIndex: 1,
        colIndex: 1,
        valueAction: 'set' as const,
        value: 2,
        stylePatch: { set: { bl: 1 } }
      },
      {
        rowId: 'row-2',
        columnName: 'colA',
        rowIndex: 2,
        colIndex: 1,
        valueAction: 'set' as const,
        value: 3,
        stylePatch: { set: { bl: 1 } }
      }
    ]

    expect(
      applyAutofillMutationCellPolicy({
        cells,
        intent: 'autofill',
        replaceRangeStyleIntent: false,
        source: 'sheet-value-changed',
        mutatedCellCount: 2,
        autofillApplyType: 'SERIES'
      })
    ).toEqual(cells)
  })

  it('maps format-only autofill dropdown to formatOnly intent', () => {
    expect(
      resolveSpreadsheetLocalMutationIntent({
        hasPersistableMutation: false,
        allowValueCarryingStylePayloads: true,
        commandId: 'sheet.mutation.set-range-values',
        mergedCellValue: { 1: { 1: { s: 'style-1' } } },
        replaceRangeStyleIntent: false,
        pasteIntoNewRows: false,
        autofillApplyType: 'ONLY_FORMAT'
      })
    ).toBe('formatOnly')
  })

  it('still strips incidental values for toolbar bold on multi-cell edit intent', () => {
    const cells = [
      {
        rowId: 'row-1',
        columnName: 'colA',
        rowIndex: 0,
        colIndex: 0,
        valueAction: 'set' as const,
        value: 1,
        stylePatch: { set: { bl: 1 } }
      },
      {
        rowId: 'row-2',
        columnName: 'colA',
        rowIndex: 1,
        colIndex: 0,
        valueAction: 'set' as const,
        value: 2,
        stylePatch: { set: { bl: 1 } }
      }
    ]

    expect(
      applyAutofillMutationCellPolicy({
        cells,
        intent: 'edit',
        replaceRangeStyleIntent: false,
        source: 'sheet-value-changed',
        mutatedCellCount: 2,
        autofillApplyType: null
      })
    ).toEqual([
      expect.objectContaining({ rowId: 'row-1', valueAction: 'none', stylePatch: { set: { bl: 1 } } }),
      expect.objectContaining({ rowId: 'row-2', valueAction: 'none', stylePatch: { set: { bl: 1 } } })
    ])
  })
})
