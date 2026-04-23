import {
  deriveCellMatrixFromRanges,
  enrichCellMatrixWithLiveFormulas,
  isClearLikeMutationCommand
} from '../UniverSheetGrid'

const makeWorksheet = (cells: Record<string, { v?: unknown; f?: string }>) => ({
  getRange: (row: number, col: number) => {
    const cell = cells[`${row}:${col}`]
    return {
      getValue: () => cell?.v,
      getCellData: () => cell
    }
  }
})

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

  it('preserves formulas when range-derived cells carry a formula', () => {
    const worksheet = makeWorksheet({
      '0:2': { v: 5, f: '=A1+B1' }
    })

    const derived = deriveCellMatrixFromRanges(worksheet, [{ startRow: 0, endRow: 0, startColumn: 2, endColumn: 2 }])

    expect(derived).toEqual({ 0: { 2: { v: 5, f: '=A1+B1' } } })
  })

  it('still returns scalar values for plain (non-formula) cells', () => {
    const worksheet = makeWorksheet({
      '0:0': { v: 7 }
    })

    const derived = deriveCellMatrixFromRanges(worksheet, [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }])

    expect(derived).toEqual({ 0: { 0: 7 } })
  })
})

describe('enrichCellMatrixWithLiveFormulas', () => {
  it('promotes value-only entries to include the live formula on recompute', () => {
    const worksheet = makeWorksheet({
      '0:2': { v: 5, f: '=A1+B1' }
    })

    const enriched = enrichCellMatrixWithLiveFormulas(worksheet, { 0: { 2: { v: 5 } } })

    expect(enriched).toEqual({ 0: { 2: { v: 5, f: '=A1+B1' } } })
  })

  it('promotes scalar entries when the live cell has a formula', () => {
    const worksheet = makeWorksheet({
      '0:2': { v: 5, f: '=A1+B1' }
    })

    const enriched = enrichCellMatrixWithLiveFormulas(worksheet, { 0: { 2: 5 } })

    expect(enriched).toEqual({ 0: { 2: { v: 5, f: '=A1+B1' } } })
  })

  it('respects explicit f:null so user-driven formula clears persist', () => {
    const worksheet = makeWorksheet({
      '0:2': { v: 7 }
    })

    const input = { 0: { 2: { f: null as unknown as string, v: 7 } } }
    const enriched = enrichCellMatrixWithLiveFormulas(worksheet, input)

    expect(enriched).toBe(input)
    expect(enriched).toEqual({ 0: { 2: { f: null, v: 7 } } })
  })

  it('does nothing when the live cell has no formula', () => {
    const worksheet = makeWorksheet({
      '0:0': { v: 5 }
    })

    const input = { 0: { 0: { v: 5 } } }
    const enriched = enrichCellMatrixWithLiveFormulas(worksheet, input)

    expect(enriched).toBe(input)
  })

  it('leaves null entries untouched (intentional clears)', () => {
    const worksheet = makeWorksheet({
      '0:0': { v: 5, f: '=A1+B1' }
    })

    const input = { 0: { 0: null as unknown } } as unknown as Parameters<typeof enrichCellMatrixWithLiveFormulas>[1]
    const enriched = enrichCellMatrixWithLiveFormulas(worksheet, input)

    expect(enriched).toBe(input)
  })

  it('promotes value-only entries from payload formula when live cell lacks one', () => {
    // Mirrors the user-typed-formula path: live cell only exposes the rendered
    // scalar via getCellData(), but the original SetRangeValuesMutation payload
    // carried `{f, v}`. We must not drop `f`.
    const worksheet = makeWorksheet({
      '0:2': { v: 70 }
    })
    const payload = { 0: { 2: { f: '=B50+B51', v: 70 } } }

    const enriched = enrichCellMatrixWithLiveFormulas(worksheet, { 0: { 2: 70 } }, payload)

    expect(enriched).toEqual({ 0: { 2: { v: 70, f: '=B50+B51' } } })
  })

  it('promotes scalar entries from a string formula in the payload', () => {
    const worksheet = makeWorksheet({
      '0:2': { v: 70 }
    })
    const payload = { 0: { 2: '=B50+B51' as unknown } }

    const enriched = enrichCellMatrixWithLiveFormulas(worksheet, { 0: { 2: 70 } }, payload)

    expect(enriched).toEqual({ 0: { 2: { v: 70, f: '=B50+B51' } } })
  })

  it('prefers payload formula over live worksheet formula', () => {
    // Defensive: if both sources disagree, the just-mutated payload wins —
    // it represents the actual user intent for this mutation.
    const worksheet = makeWorksheet({
      '0:2': { v: 5, f: '=A1+B1' }
    })
    const payload = { 0: { 2: { f: '=B50+B51', v: 70 } } }

    const enriched = enrichCellMatrixWithLiveFormulas(worksheet, { 0: { 2: 70 } }, payload)

    expect(enriched).toEqual({ 0: { 2: { v: 70, f: '=B50+B51' } } })
  })
})
