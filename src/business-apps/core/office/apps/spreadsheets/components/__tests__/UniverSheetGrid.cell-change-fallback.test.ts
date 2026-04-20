import { deriveCellMatrixFromRanges, isClearLikeMutationCommand } from '../UniverSheetGrid'

describe('UniverSheetGrid fallback cell derivation', () => {
  it('treats clear-like commands as nulling mutations', () => {
    expect(isClearLikeMutationCommand('sheet.clear-range')).toBe(true)
    expect(isClearLikeMutationCommand('DeleteSelectionCommand')).toBe(true)
    expect(isClearLikeMutationCommand('SetRangeValuesMutation')).toBe(false)
  })

  it('preserves cleared cells as null when worksheet values are undefined', () => {
    const worksheet = {
      getRange: () => ({
        getValue: () => undefined
      })
    }

    const derived = deriveCellMatrixFromRanges(
      worksheet,
      [{ startRow: 39, endRow: 40, startColumn: 0, endColumn: 1 }],
      10000,
      true
    )

    expect(derived).toEqual({
      39: { 0: null, 1: null },
      40: { 0: null, 1: null }
    })
  })

  it('still skips undefined cells for non-clear fallback mutations', () => {
    const worksheet = {
      getRange: () => ({
        getValue: () => undefined
      })
    }

    const derived = deriveCellMatrixFromRanges(worksheet, [{ startRow: 39, endRow: 39, startColumn: 0, endColumn: 1 }])

    expect(derived).toBeUndefined()
  })
})
