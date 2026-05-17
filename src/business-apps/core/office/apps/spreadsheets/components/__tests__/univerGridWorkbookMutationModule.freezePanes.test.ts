import { getFreezePanesMutation, isNativeFreezePanesCommand } from '../univerGridWorkbookMutationModule'

describe('isNativeFreezePanesCommand', () => {
  it('matches documented Univer freeze command ids', () => {
    expect(isNativeFreezePanesCommand('sheet.command.set-selection-frozen')).toBe(true)
    expect(isNativeFreezePanesCommand('sheet.command.set-row-frozen')).toBe(true)
    expect(isNativeFreezePanesCommand('sheet.command.set-col-frozen')).toBe(true)
    expect(isNativeFreezePanesCommand('sheet.command.cancel-frozen')).toBe(true)
  })

  it('keeps legacy sheet.command.freeze compatibility', () => {
    expect(isNativeFreezePanesCommand('sheet.command.freeze')).toBe(true)
  })

  it('matches first-freeze and direct frozen state commands', () => {
    expect(isNativeFreezePanesCommand('sheet.command.set-first-row-frozen')).toBe(true)
    expect(isNativeFreezePanesCommand('sheet.command.set-first-column-frozen')).toBe(true)
    expect(isNativeFreezePanesCommand('sheet.command.set-frozen')).toBe(true)
    expect(isNativeFreezePanesCommand('sheet.mutation.set-frozen')).toBe(true)
  })

  it('does not match unrelated commands', () => {
    expect(isNativeFreezePanesCommand('sheet.command.move-range')).toBe(false)
    expect(isNativeFreezePanesCommand('sheet.command.set-range-bold')).toBe(false)
    expect(isNativeFreezePanesCommand('')).toBe(false)
  })
})

describe('getFreezePanesMutation', () => {
  it('returns cleared for cancel freeze', () => {
    expect(getFreezePanesMutation('sheet.command.cancel-frozen', {}, [])).toEqual({ cleared: true })
  })

  it('uses explicit normalized split values when provided', () => {
    expect(
      getFreezePanesMutation(
        'sheet.command.set-selection-frozen',
        {
          startRow: 3,
          startColumn: 2,
          ySplit: 3,
          xSplit: 2
        },
        []
      )
    ).toEqual({
      startRow: 3,
      startColumn: 2,
      ySplit: 3,
      xSplit: 2
    })
  })

  it('derives selection freeze dimensions from the selected range', () => {
    expect(
      getFreezePanesMutation('sheet.command.set-selection-frozen', {}, [
        { startRow: 0, endRow: 1, startColumn: 0, endColumn: 2 }
      ])
    ).toEqual({
      startRow: 2,
      startColumn: 3,
      ySplit: 2,
      xSplit: 3,
      range: { startRow: 0, endRow: 1, startColumn: 0, endColumn: 2 }
    })
  })

  it('preserves the -1 sentinel for row-only freezes', () => {
    expect(
      getFreezePanesMutation('sheet.command.set-row-frozen', { startColumn: -1, xSplit: 0 }, [
        { startRow: 4, endRow: 4, startColumn: 0, endColumn: 0 }
      ])
    ).toEqual({
      startRow: 4,
      startColumn: -1,
      ySplit: 4,
      xSplit: 0
    })
  })

  it('normalizes freeze-first-row to a real boundary instead of clear-like zeroes', () => {
    expect(
      getFreezePanesMutation('sheet.command.set-row-frozen', { startColumn: -1, xSplit: 0 }, [
        { startRow: 0, endRow: 0, startColumn: 0, endColumn: 99 }
      ])
    ).toEqual({
      startRow: 1,
      startColumn: -1,
      ySplit: 1,
      xSplit: 0
    })
  })

  it('preserves the -1 sentinel for column-only freezes', () => {
    expect(
      getFreezePanesMutation('sheet.command.set-col-frozen', { startRow: -1, ySplit: 0 }, [
        { startRow: 0, endRow: 0, startColumn: 2, endColumn: 2 }
      ])
    ).toEqual({
      startRow: -1,
      startColumn: 2,
      ySplit: 0,
      xSplit: 2
    })
  })

  it('normalizes freeze-first-column to a real boundary instead of clear-like zeroes', () => {
    expect(
      getFreezePanesMutation('sheet.command.set-col-frozen', { startRow: -1, ySplit: 0 }, [
        { startRow: 0, endRow: 1011, startColumn: 0, endColumn: 0 }
      ])
    ).toEqual({
      startRow: -1,
      startColumn: 1,
      ySplit: 0,
      xSplit: 1
    })
  })

  it('coerces explicit zero-valued first-column freeze params to a persisted first-column boundary', () => {
    expect(
      getFreezePanesMutation('sheet.command.set-col-frozen', { startRow: -1, ySplit: 0, startColumn: 0, xSplit: 0 }, [
        { startRow: 0, endRow: 1011, startColumn: 0, endColumn: 0 }
      ])
    ).toEqual({
      startRow: -1,
      startColumn: 1,
      ySplit: 0,
      xSplit: 1
    })
  })

  it('normalizes special first-column and first-row commands', () => {
    expect(getFreezePanesMutation('sheet.command.set-first-column-frozen', {}, [])).toEqual({
      startRow: -1,
      startColumn: 1,
      ySplit: 0,
      xSplit: 1
    })

    expect(getFreezePanesMutation('sheet.command.set-first-row-frozen', {}, [])).toEqual({
      startRow: 1,
      startColumn: -1,
      ySplit: 1,
      xSplit: 0
    })
  })

  it('normalizes explicit frozen-state commands with direct split params', () => {
    expect(
      getFreezePanesMutation('sheet.mutation.set-frozen', { startRow: -1, startColumn: 1, ySplit: 0, xSplit: 1 }, [])
    ).toEqual({
      startRow: -1,
      startColumn: 1,
      ySplit: 0,
      xSplit: 1
    })
  })

  it('derives row and column freeze boundaries from the selected index, not selection size', () => {
    expect(
      getFreezePanesMutation('sheet.command.set-row-frozen', { startColumn: -1, xSplit: 0 }, [
        { startRow: 4, endRow: 4, startColumn: 0, endColumn: 99 }
      ])
    ).toEqual({
      startRow: 4,
      startColumn: -1,
      ySplit: 4,
      xSplit: 0
    })

    expect(
      getFreezePanesMutation('sheet.command.set-col-frozen', { startRow: -1, ySplit: 0 }, [
        { startRow: 0, endRow: 1011, startColumn: 2, endColumn: 2 }
      ])
    ).toEqual({
      startRow: -1,
      startColumn: 2,
      ySplit: 0,
      xSplit: 2
    })
  })

  it('returns null when it cannot determine a deterministic freeze state', () => {
    expect(getFreezePanesMutation('sheet.command.set-row-frozen', {}, [])).toBeNull()
  })

  it('ignores set-selection-frozen wrapper commands that only carry a type discriminator', () => {
    expect(
      getFreezePanesMutation('sheet.command.set-selection-frozen', { type: 2 }, [
        { startRow: 0, endRow: 1011, startColumn: 2, endColumn: 2 }
      ])
    ).toBeNull()
  })
})
