import { applyDeferredRepaginationExecutionPlan } from '../deferredRepaginationExecutionRunner'
import type { DeferredRepaginationExecutionPlan } from '../paginationStabilizationPolicy'

function createCallbacks() {
  return {
    onLogDebug: jest.fn(),
    onClearPreviousAddPagesMeasurement: jest.fn(),
    onDecrementStabilizationAttempts: jest.fn(),
    onScheduleEvaluation: jest.fn(),
    onRefreshLayoutBounds: jest.fn(),
    onClearGrowthSuppression: jest.fn(),
    onResetStabilizationAttempts: jest.fn(),
    onRequestRefresh: jest.fn(),
    onDispatch: jest.fn()
  }
}

describe('applyDeferredRepaginationExecutionPlan', () => {
  it('leaves proceed plans untouched', () => {
    const callbacks = createCallbacks()

    expect(
      applyDeferredRepaginationExecutionPlan({
        plan: { type: 'proceed' },
        evaluationId: 1,
        loopIteration: 2,
        ...callbacks
      })
    ).toEqual({
      handled: false,
      shouldContinueLoop: false,
      structuralActionsDelta: 0
    })

    expect(callbacks.onLogDebug).not.toHaveBeenCalled()
  })

  it('applies retry plans with reschedule and layout refresh side effects', () => {
    const callbacks = createCallbacks()
    const plan: DeferredRepaginationExecutionPlan = {
      type: 'retry',
      shouldClearPreviousAddPagesMeasurement: true,
      shouldDecrementStabilizationAttempts: true,
      shouldScheduleEvaluation: true,
      shouldRefreshLayoutBounds: true,
      debug: {
        deferTableEvaluation: true,
        tableMeasurementsPending: false,
        stabilizationAttemptsRemaining: 3
      }
    }

    expect(
      applyDeferredRepaginationExecutionPlan({
        plan,
        evaluationId: 1,
        loopIteration: 2,
        ...callbacks
      })
    ).toEqual({
      handled: true,
      shouldContinueLoop: false,
      structuralActionsDelta: 0
    })

    expect(callbacks.onLogDebug).toHaveBeenCalledWith(
      'deferred-repagination-retry',
      expect.objectContaining({
        evaluationId: 1,
        loopIteration: 2,
        stabilizationAttemptsRemaining: 3
      })
    )
    expect(callbacks.onClearPreviousAddPagesMeasurement).toHaveBeenCalledTimes(1)
    expect(callbacks.onDecrementStabilizationAttempts).toHaveBeenCalledTimes(1)
    expect(callbacks.onScheduleEvaluation).toHaveBeenCalledTimes(1)
    expect(callbacks.onRefreshLayoutBounds).toHaveBeenCalledTimes(1)
  })

  it('applies dispatch plans and signals loop continuation when batching continues', () => {
    const callbacks = createCallbacks()
    const plan: DeferredRepaginationExecutionPlan = {
      type: 'dispatch',
      result: {
        type: 'dispatch',
        dispatchType: 'split',
        candidateKey: 'split:10:2',
        progress: 'structural',
        transaction: {} as never,
        scheduleEvaluation: true
      },
      shouldClearPreviousAddPagesMeasurement: true,
      shouldContinueBatch: true,
      shouldScheduleEvaluation: true,
      shouldRefreshLayoutBounds: false,
      outcomeDebug: {
        outcome: 'dispatch',
        progress: 'structural',
        dispatchType: 'split',
        candidateKey: 'split:10:2',
        maxActionsPerPass: 6,
        scheduleEvaluation: true
      },
      continueDebug: {
        structuralActionsPerformed: 2,
        maxActionsPerPass: 6,
        dispatchType: 'split',
        candidateKey: 'split:10:2'
      },
      scheduleDebug: {
        structuralActionsPerformed: 2,
        maxActionsPerPass: 6,
        dispatchType: 'split',
        candidateKey: 'split:10:2'
      }
    }

    expect(
      applyDeferredRepaginationExecutionPlan({
        plan,
        evaluationId: 4,
        loopIteration: 5,
        ...callbacks
      })
    ).toEqual({
      handled: true,
      shouldContinueLoop: true,
      structuralActionsDelta: 1
    })

    expect(callbacks.onDispatch).toHaveBeenCalledTimes(1)
    expect(callbacks.onScheduleEvaluation).not.toHaveBeenCalled()
    expect(callbacks.onRefreshLayoutBounds).not.toHaveBeenCalled()
    expect(callbacks.onLogDebug).toHaveBeenCalledWith(
      'deferred-repagination-batch-continue',
      expect.objectContaining({
        evaluationId: 4,
        loopIteration: 5,
        structuralActionsPerformed: 2
      })
    )
  })

  it('decrements stabilization attempts before scheduling a follow-up refresh pass', () => {
    const callbacks = createCallbacks()
    const plan: DeferredRepaginationExecutionPlan = {
      type: 'refresh',
      result: {
        type: 'refresh',
        pageCount: 9,
        hasSplitPressure: true,
        progress: 'refresh',
        scheduleEvaluation: true
      },
      nextStoredPageCount: 9,
      refreshSource: 'table-pagination-refresh',
      shouldClearGrowthSuppression: true,
      shouldScheduleEvaluation: true,
      debug: {
        outcome: 'refresh',
        progress: 'refresh',
        nextPageCount: 9,
        hasSplitPressure: true,
        scheduleEvaluation: true
      }
    }

    applyDeferredRepaginationExecutionPlan({
      plan,
      evaluationId: 8,
      loopIteration: 3,
      ...callbacks
    })

    expect(callbacks.onDecrementStabilizationAttempts).toHaveBeenCalledTimes(1)
    expect(callbacks.onScheduleEvaluation).toHaveBeenCalledTimes(1)
  })

  it('decrements stabilization attempts before scheduling a follow-up structural pass', () => {
    const callbacks = createCallbacks()
    const plan: DeferredRepaginationExecutionPlan = {
      type: 'dispatch',
      result: {
        type: 'dispatch',
        dispatchType: 'split',
        candidateKey: 'split:10:2',
        progress: 'structural',
        transaction: {} as never,
        scheduleEvaluation: true
      },
      shouldClearPreviousAddPagesMeasurement: true,
      shouldContinueBatch: false,
      shouldScheduleEvaluation: true,
      shouldRefreshLayoutBounds: true,
      outcomeDebug: {
        outcome: 'dispatch',
        progress: 'structural',
        dispatchType: 'split',
        candidateKey: 'split:10:2',
        maxActionsPerPass: 6,
        scheduleEvaluation: true
      },
      continueDebug: null,
      scheduleDebug: {
        structuralActionsPerformed: 1,
        maxActionsPerPass: 6,
        dispatchType: 'split',
        candidateKey: 'split:10:2'
      }
    }

    applyDeferredRepaginationExecutionPlan({
      plan,
      evaluationId: 9,
      loopIteration: 1,
      ...callbacks
    })

    expect(callbacks.onDecrementStabilizationAttempts).toHaveBeenCalledTimes(1)
    expect(callbacks.onScheduleEvaluation).toHaveBeenCalledTimes(1)
  })

  it('applies terminal none plans with cleanup side effects', () => {
    const callbacks = createCallbacks()
    const plan: DeferredRepaginationExecutionPlan = {
      type: 'none',
      result: {
        type: 'none',
        progress: 'none',
        reason: 'no-eligible-candidates'
      },
      shouldClearGrowthSuppression: true,
      shouldResetStabilizationAttempts: true,
      shouldRefreshLayoutBounds: true,
      debug: {
        outcome: 'none',
        progress: 'none',
        reason: 'no-eligible-candidates'
      }
    }

    expect(
      applyDeferredRepaginationExecutionPlan({
        plan,
        evaluationId: 7,
        loopIteration: 1,
        ...callbacks
      })
    ).toEqual({
      handled: true,
      shouldContinueLoop: false,
      structuralActionsDelta: 0
    })

    expect(callbacks.onClearGrowthSuppression).toHaveBeenCalledTimes(1)
    expect(callbacks.onResetStabilizationAttempts).toHaveBeenCalledTimes(1)
    expect(callbacks.onRefreshLayoutBounds).toHaveBeenCalledTimes(1)
  })
})
