import { SpreadsheetSnapshotFallbackController } from '../spreadsheetSnapshotFallbackController'

describe('SpreadsheetSnapshotFallbackController', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('opens a per-sheet circuit after repeated scheduled fallbacks', () => {
    const schedule = jest.fn()
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    const controller = new SpreadsheetSnapshotFallbackController(schedule, 0, 3, 10_000)

    expect(controller.requestFallback({ sheetId: 's1', reason: 'requires_snapshot' })).toBe(true)
    jest.advanceTimersByTime(1)
    expect(controller.requestFallback({ sheetId: 's1', reason: 'version_gap' })).toBe(true)
    jest.advanceTimersByTime(1)
    expect(controller.requestFallback({ sheetId: 's1', reason: 'live_apply_failure' })).toBe(true)
    jest.advanceTimersByTime(1)
    expect(controller.requestFallback({ sheetId: 's1', reason: 'planning_failure' })).toBe(false)

    expect(schedule).toHaveBeenCalledTimes(3)
    expect(warn).toHaveBeenCalledWith(
      '[SpreadsheetAppViewer] snapshot fallback circuit open',
      expect.objectContaining({
        sheetId: 's1',
        reason: 'planning_failure',
        attemptCount: 3
      })
    )
  })

  it('does not count coalesced duplicate requests as circuit attempts', () => {
    const schedule = jest.fn()
    const controller = new SpreadsheetSnapshotFallbackController(schedule, 500, 1, 10_000)

    expect(controller.requestFallback({ sheetId: 's1', reason: 'requires_snapshot' })).toBe(true)
    expect(controller.requestFallback({ sheetId: 's1', reason: 'requires_snapshot' })).toBe(false)

    expect(schedule).toHaveBeenCalledTimes(1)
  })
})
