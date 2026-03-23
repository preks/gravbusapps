import type { EditorView } from '@tiptap/pm/view'
import { runDeferredRepaginationPass } from '../deferredRepaginationRuntime'
import { resolveDeferredRepaginationPreflight } from '../paginationStabilizationPolicy'

function createCallbacks() {
  return {
    onLogDebug: jest.fn(),
    onSetPreviousAddPagesMeasurement: jest.fn(),
    onClearPreviousAddPagesMeasurement: jest.fn(),
    onSetGrowthSuppression: jest.fn(),
    onClearGrowthSuppression: jest.fn(),
    onDecrementStabilizationAttempts: jest.fn(),
    onResetStabilizationAttempts: jest.fn(),
    onScheduleEvaluation: jest.fn(),
    onRefreshLayoutBounds: jest.fn(),
    onRequestRefresh: jest.fn(),
    onDispatch: jest.fn()
  }
}

describe('runDeferredRepaginationPass', () => {
  it('handles retry preflight without invoking the controller', () => {
    const callbacks = createCallbacks()
    const preflight = resolveDeferredRepaginationPreflight({
      cappedPageCount: null,
      hasActiveEditor: false,
      hasTables: true,
      currentPageCount: 4,
      bodyBandCount: 2,
      stabilizationAttemptsRemaining: 3,
      tableMeasurementsPending: false
    })
    const evaluate = jest.fn()

    expect(
      runDeferredRepaginationPass({
        view: {} as EditorView,
        evaluationId: 1,
        loopIteration: 2,
        structuralActionsPerformed: 0,
        currentPageCount: 4,
        measuredPageCount: 4,
        nextAddPagesMeasurement: null,
        shouldPersistNextAddPagesMeasurement: false,
        preflight,
        stabilizationAttemptsRemaining: 3,
        evaluate,
        ...callbacks
      })
    ).toEqual({
      handled: true,
      shouldContinueLoop: false,
      structuralActionsDelta: 0
    })

    expect(evaluate).not.toHaveBeenCalled()
    expect(callbacks.onClearPreviousAddPagesMeasurement).toHaveBeenCalledTimes(1)
    expect(callbacks.onDecrementStabilizationAttempts).toHaveBeenCalledTimes(1)
    expect(callbacks.onScheduleEvaluation).toHaveBeenCalledTimes(1)
    expect(callbacks.onRefreshLayoutBounds).toHaveBeenCalledTimes(1)
  })

  it('persists the next add-pages snapshot and continues batching for dispatch plans', () => {
    const callbacks = createCallbacks()
    const preflight = resolveDeferredRepaginationPreflight({
      cappedPageCount: null,
      hasActiveEditor: false,
      hasTables: true,
      currentPageCount: 26,
      bodyBandCount: 26,
      stabilizationAttemptsRemaining: 3,
      tableMeasurementsPending: false
    })
    const nextAddPagesMeasurement = {
      currentPageCount: 26,
      measuredPageCount: 28,
      lastPageGap: 120,
      pageContentHeight: 800
    }

    expect(
      runDeferredRepaginationPass({
        view: {} as EditorView,
        evaluationId: 3,
        loopIteration: 1,
        structuralActionsPerformed: 1,
        currentPageCount: 26,
        measuredPageCount: 26,
        nextAddPagesMeasurement,
        shouldPersistNextAddPagesMeasurement: true,
        preflight,
        stabilizationAttemptsRemaining: 3,
        evaluate: () => ({
          type: 'dispatch',
          dispatchType: 'split',
          candidateKey: 'split:10:2',
          progress: 'structural',
          transaction: {} as never,
          scheduleEvaluation: true
        }),
        ...callbacks
      })
    ).toEqual({
      handled: true,
      shouldContinueLoop: true,
      structuralActionsDelta: 1
    })

    expect(callbacks.onSetPreviousAddPagesMeasurement).toHaveBeenCalledWith(nextAddPagesMeasurement)
    expect(callbacks.onDispatch).toHaveBeenCalledTimes(1)
    expect(callbacks.onScheduleEvaluation).not.toHaveBeenCalled()
    expect(callbacks.onRefreshLayoutBounds).not.toHaveBeenCalled()
  })

  it('applies growth suppression and logs refresh-gate fallback decisions', () => {
    const callbacks = createCallbacks()
    const preflight = resolveDeferredRepaginationPreflight({
      cappedPageCount: null,
      hasActiveEditor: false,
      hasTables: true,
      currentPageCount: 14,
      bodyBandCount: 14,
      stabilizationAttemptsRemaining: 3,
      tableMeasurementsPending: false
    })
    const evaluate = jest.fn((measuredPageCount: number) =>
      measuredPageCount === 14
        ? {
            type: 'request-refresh' as const,
            progress: 'refresh' as const,
            scheduleEvaluation: true
          }
        : {
            type: 'refresh' as const,
            pageCount: 26,
            hasSplitPressure: true,
            progress: 'refresh' as const,
            scheduleEvaluation: true
          }
    )

    expect(
      runDeferredRepaginationPass({
        view: {} as EditorView,
        evaluationId: 5,
        loopIteration: 2,
        structuralActionsPerformed: 0,
        currentPageCount: 14,
        measuredPageCount: 26,
        nextAddPagesMeasurement: null,
        shouldPersistNextAddPagesMeasurement: false,
        preflight,
        stabilizationAttemptsRemaining: 3,
        evaluate,
        ...callbacks
      })
    ).toEqual({
      handled: true,
      shouldContinueLoop: false,
      structuralActionsDelta: 0
    })

    expect(callbacks.onSetGrowthSuppression).toHaveBeenCalledTimes(1)
    expect(callbacks.onRequestRefresh).toHaveBeenCalledWith('table-pagination-request-refresh')
    expect(callbacks.onLogDebug).toHaveBeenCalledWith(
      'deferred-repagination-refresh-gate',
      expect.objectContaining({
        evaluationId: 5,
        loopIteration: 2,
        nextPageCount: 26,
        hasSplitPressure: true,
        fallbackOutcome: 'request-refresh'
      })
    )
  })
})
