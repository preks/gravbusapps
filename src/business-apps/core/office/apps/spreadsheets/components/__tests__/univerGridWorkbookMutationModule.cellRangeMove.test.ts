import { getCellRangeMoveMutation, isNativeCellRangeMoveCommand } from '../univerGridWorkbookMutationModule'

describe('isNativeCellRangeMoveCommand', () => {
  it('matches Univer cell-range move command and mutation ids', () => {
    expect(isNativeCellRangeMoveCommand('sheet.command.move-range')).toBe(true)
    expect(isNativeCellRangeMoveCommand('sheet.mutation.move-range')).toBe(true)
    expect(isNativeCellRangeMoveCommand('sheet.mutation.move-cell')).toBe(true)
  })

  it('does not match row or column structural move ids', () => {
    expect(isNativeCellRangeMoveCommand('sheet.mutation.move-row')).toBe(false)
    expect(isNativeCellRangeMoveCommand('sheet.command.move-rows')).toBe(false)
    expect(isNativeCellRangeMoveCommand('sheet.mutation.move-column')).toBe(false)
    expect(isNativeCellRangeMoveCommand('sheet.command.move-columns')).toBe(false)
  })

  it('does not match unrelated ids', () => {
    expect(isNativeCellRangeMoveCommand('sheet.command.move-selection')).toBe(false)
    expect(isNativeCellRangeMoveCommand('sheet.command.set-range-bold')).toBe(false)
    expect(isNativeCellRangeMoveCommand('')).toBe(false)
  })
})

describe('getCellRangeMoveMutation', () => {
  it('extracts fromRange/toRange for sheet.mutation.move-range payload', () => {
    const move = getCellRangeMoveMutation({
      fromRange: { startRow: 1, endRow: 3, startColumn: 2, endColumn: 4 },
      toRange: { startRow: 10, endRow: 12, startColumn: 5, endColumn: 7 }
    })
    expect(move).toEqual({
      fromRange: { startRow: 1, endRow: 3, startColumn: 2, endColumn: 4 },
      toRange: { startRow: 10, endRow: 12, startColumn: 5, endColumn: 7 }
    })
  })

  it('treats first entry of array-shaped fromRange as canonical', () => {
    const move = getCellRangeMoveMutation({
      fromRange: [
        { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
        { startRow: 9, endRow: 9, startColumn: 9, endColumn: 9 }
      ] as never,
      toRange: { startRow: 4, endRow: 4, startColumn: 4, endColumn: 4 }
    })
    expect(move?.fromRange.startRow).toBe(0)
    expect(move?.toRange.startRow).toBe(4)
  })

  it('falls back to sourceRange / targetRange aliases', () => {
    const move = getCellRangeMoveMutation({
      sourceRange: { startRow: 2, endRow: 2, startColumn: 2, endColumn: 2 },
      targetRange: { startRow: 7, endRow: 7, startColumn: 8, endColumn: 8 }
    })
    expect(move).toEqual({
      fromRange: { startRow: 2, endRow: 2, startColumn: 2, endColumn: 2 },
      toRange: { startRow: 7, endRow: 7, startColumn: 8, endColumn: 8 }
    })
  })

  it('builds 1x1 rectangles from sheet.mutation.move-cell from/to points', () => {
    const move = getCellRangeMoveMutation({
      from: { row: 3, column: 4 },
      to: { row: 6, column: 9 }
    })
    expect(move).toEqual({
      fromRange: { startRow: 3, endRow: 3, startColumn: 4, endColumn: 4 },
      toRange: { startRow: 6, endRow: 6, startColumn: 9, endColumn: 9 }
    })
  })

  it('returns null for incomplete payloads', () => {
    expect(getCellRangeMoveMutation({})).toBeNull()
    expect(
      getCellRangeMoveMutation({
        fromRange: { startRow: 1, endRow: 1, startColumn: 1, endColumn: 1 }
      } as never)
    ).toBeNull()
    expect(
      getCellRangeMoveMutation({
        from: { row: -1, column: 0 },
        to: { row: 1, column: 1 }
      } as never)
    ).toBeNull()
  })
})
