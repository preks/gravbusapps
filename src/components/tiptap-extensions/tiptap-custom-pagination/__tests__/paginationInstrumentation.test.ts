import {
  getPaginationInstrumentationSnapshot,
  incrementPaginationInstrumentationCounter,
  isPaginationDebugEnabled,
  recordPaginationInstrumentationDuration,
  recordPaginationInstrumentationEvent,
  resetPaginationInstrumentation,
  startPaginationInstrumentationTimer
} from '../paginationInstrumentation'

const PAGINATION_DEBUG_FLAG = '__RM_PAGINATION_DEBUG' as const

describe('paginationInstrumentation', () => {
  const originalDebugFlag = (globalThis as typeof globalThis & { [PAGINATION_DEBUG_FLAG]?: boolean })[
    PAGINATION_DEBUG_FLAG
  ]
  let consoleLogSpy: jest.SpyInstance

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    ;(globalThis as typeof globalThis & { [PAGINATION_DEBUG_FLAG]?: boolean })[PAGINATION_DEBUG_FLAG] = true
    resetPaginationInstrumentation()
  })

  afterEach(() => {
    resetPaginationInstrumentation()
    ;(globalThis as typeof globalThis & { [PAGINATION_DEBUG_FLAG]?: boolean })[PAGINATION_DEBUG_FLAG] =
      originalDebugFlag
    consoleLogSpy.mockRestore()
  })

  it('tracks events, counters, and durations while debug mode is enabled', () => {
    expect(isPaginationDebugEnabled()).toBe(true)

    incrementPaginationInstrumentationCounter('refresh-total')
    recordPaginationInstrumentationEvent('refresh-requested', { source: 'selection-overflow' })
    recordPaginationInstrumentationDuration('layout-pass', 12.5, { pageCount: 100 })

    const finishTimer = startPaginationInstrumentationTimer('deferred-loop', { evaluationId: 7 })
    finishTimer({ iterations: 2 })

    const snapshot = getPaginationInstrumentationSnapshot()

    expect(snapshot?.counters['refresh-total']).toBe(1)
    expect(snapshot?.durations['layout-pass']?.count).toBe(1)
    expect(snapshot?.durations['layout-pass']?.lastDurationMs).toBe(12.5)
    expect(snapshot?.durations['deferred-loop']?.count).toBe(1)
    expect(snapshot?.recentEvents.map(event => event.event)).toEqual([
      'refresh-requested',
      'layout-pass',
      'deferred-loop'
    ])
    expect(consoleLogSpy).toHaveBeenCalled()
  })

  it('does nothing when debug mode is disabled', () => {
    ;(globalThis as typeof globalThis & { [PAGINATION_DEBUG_FLAG]?: boolean })[PAGINATION_DEBUG_FLAG] = false
    resetPaginationInstrumentation()

    incrementPaginationInstrumentationCounter('refresh-total')
    recordPaginationInstrumentationEvent('refresh-requested', { source: 'selection-overflow' })
    recordPaginationInstrumentationDuration('layout-pass', 12.5)

    expect(getPaginationInstrumentationSnapshot()).toBeNull()
    expect(consoleLogSpy).not.toHaveBeenCalled()
  })
})
