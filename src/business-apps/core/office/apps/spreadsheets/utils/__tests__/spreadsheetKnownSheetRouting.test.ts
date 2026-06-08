import { resolveSpreadsheetKnownSheetRouting } from '../spreadsheetKnownSheetRouting'

describe('resolveSpreadsheetKnownSheetRouting', () => {
  it('marks mismatched known sheets as warned_and_submitted', () => {
    expect(
      resolveSpreadsheetKnownSheetRouting({
        producerSheetId: 'sheet-2',
        reactActiveSheetId: 'sheet-1',
        sheets: [{ id: 'sheet-1' }, { id: 'sheet-2' }] as never,
        aliases: new Map()
      })
    ).toEqual(
      expect.objectContaining({
        targetSheetId: 'sheet-2',
        canonicalActiveSheetId: 'sheet-1',
        knownTargetSheet: true,
        hasRoutingMismatch: true,
        outcome: 'warned_and_submitted'
      })
    )
  })

  it('marks orphan producer sheets as warned_and_dropped when they also mismatch the active sheet', () => {
    expect(
      resolveSpreadsheetKnownSheetRouting({
        producerSheetId: 'ghost-sheet',
        reactActiveSheetId: 'sheet-1',
        sheets: [{ id: 'sheet-1' }] as never,
        aliases: new Map()
      })
    ).toEqual(
      expect.objectContaining({
        targetSheetId: 'ghost-sheet',
        canonicalActiveSheetId: 'sheet-1',
        knownTargetSheet: false,
        hasRoutingMismatch: true,
        outcome: 'warned_and_dropped'
      })
    )
  })

  it('treats aliased temporary sheet ids as known canonical sheets', () => {
    expect(
      resolveSpreadsheetKnownSheetRouting({
        producerSheetId: 'temp-sheet',
        reactActiveSheetId: 'persisted-sheet',
        sheets: [{ id: 'persisted-sheet' }] as never,
        aliases: new Map([['temp-sheet', 'persisted-sheet']])
      })
    ).toEqual(
      expect.objectContaining({
        targetSheetId: 'persisted-sheet',
        canonicalActiveSheetId: 'persisted-sheet',
        knownTargetSheet: true,
        hasRoutingMismatch: false,
        outcome: 'matched'
      })
    )
  })
})
