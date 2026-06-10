import {
  clearDimensionUserIntent,
  consumeDimensionUserIntent,
  isAutoFitDimensionCommand,
  isDimensionApplyMutation,
  isManualDimensionCommand,
  markDimensionUserIntent,
  peekDimensionUserIntent,
  resolveDimensionIntentKindFromCommandId,
  UNIVER_COL_WIDTH_MUTATION,
  UNIVER_SET_COL_AUTO_WIDTH_COMMAND,
  UNIVER_SET_ROW_AUTO_HEIGHT_COMMAND
} from '../univerDimensionUserIntent'

describe('univerDimensionUserIntent', () => {
  it('resolves row and column kinds from known command ids', () => {
    expect(resolveDimensionIntentKindFromCommandId(UNIVER_SET_ROW_AUTO_HEIGHT_COMMAND)).toBe('row')
    expect(resolveDimensionIntentKindFromCommandId(UNIVER_SET_COL_AUTO_WIDTH_COMMAND)).toBe('column')
    expect(resolveDimensionIntentKindFromCommandId(UNIVER_COL_WIDTH_MUTATION)).toBe('column')
    expect(resolveDimensionIntentKindFromCommandId('sheet.command.unknown')).toBeNull()
  })

  it('classifies auto-fit, manual, and apply dimension commands', () => {
    expect(isAutoFitDimensionCommand(UNIVER_SET_ROW_AUTO_HEIGHT_COMMAND)).toBe(true)
    expect(isAutoFitDimensionCommand(UNIVER_SET_COL_AUTO_WIDTH_COMMAND)).toBe(true)
    expect(isAutoFitDimensionCommand('sheet.command.set-row-height')).toBe(false)

    expect(isManualDimensionCommand('sheet.command.set-row-height')).toBe(true)
    expect(isManualDimensionCommand('sheet.command.delta-column-width')).toBe(true)
    expect(isManualDimensionCommand(UNIVER_SET_COL_AUTO_WIDTH_COMMAND)).toBe(false)

    expect(isDimensionApplyMutation('sheet.mutation.set-worksheet-row-auto-height')).toBe(true)
    expect(isDimensionApplyMutation(UNIVER_COL_WIDTH_MUTATION)).toBe(true)
    expect(isDimensionApplyMutation('sheet.command.set-column-width')).toBe(false)
  })

  it('peeks and expires user intent per sheet and kind', () => {
    const intentRef = {
      current: null as import('../univerDimensionUserIntent').SpreadsheetDimensionUserIntent | null
    }

    markDimensionUserIntent(intentRef, 'sheet-1', 'row', 1_000)

    expect(peekDimensionUserIntent(intentRef, 'sheet-1', 'row', 1_500)).toBe('row')
    expect(peekDimensionUserIntent(intentRef, 'sheet-1', 'column', 1_500)).toBeNull()
    expect(peekDimensionUserIntent(intentRef, 'sheet-2', 'row', 1_500)).toBeNull()
    expect(peekDimensionUserIntent(intentRef, 'sheet-1', 'row', 5_000)).toBeNull()
  })

  it('consumes and clears dimension user intent', () => {
    const intentRef = {
      current: null as import('../univerDimensionUserIntent').SpreadsheetDimensionUserIntent | null
    }

    markDimensionUserIntent(intentRef, 'sheet-1', 'column', 1_000)

    expect(consumeDimensionUserIntent(intentRef, 'sheet-1', 'column', 1_500)).toBe('column')
    expect(peekDimensionUserIntent(intentRef, 'sheet-1', 'column', 1_600)).toBeNull()

    markDimensionUserIntent(intentRef, 'sheet-2', 'row', 2_000)
    clearDimensionUserIntent(intentRef, 'sheet-1')
    expect(peekDimensionUserIntent(intentRef, 'sheet-2', 'row', 2_100)).toBe('row')

    clearDimensionUserIntent(intentRef, 'sheet-2')
    expect(peekDimensionUserIntent(intentRef, 'sheet-2', 'row', 2_200)).toBeNull()
  })
})
