import type { DeferredRepaginationExecutionPlan } from './paginationStabilizationPolicy'

interface ApplyDeferredRepaginationExecutionPlanResult {
  handled: boolean
  shouldContinueLoop: boolean
  structuralActionsDelta: number
}

export function applyDeferredRepaginationExecutionPlan(options: {
  plan: DeferredRepaginationExecutionPlan
  evaluationId: number
  loopIteration: number
  onLogDebug: (event: string, payload: Record<string, unknown>) => void
  onClearPreviousAddPagesMeasurement: () => void
  onDecrementStabilizationAttempts: () => void
  onScheduleEvaluation: () => void
  onRefreshLayoutBounds: () => void
  onClearGrowthSuppression: () => void
  onResetStabilizationAttempts: () => void
  onRequestRefresh: (source: 'table-pagination-refresh' | 'table-pagination-request-refresh') => void
  onDispatch: (
    transaction: Extract<DeferredRepaginationExecutionPlan, { type: 'dispatch' }>['result']['transaction']
  ) => void
}): ApplyDeferredRepaginationExecutionPlanResult {
  const {
    plan,
    evaluationId,
    loopIteration,
    onLogDebug,
    onClearPreviousAddPagesMeasurement,
    onDecrementStabilizationAttempts,
    onScheduleEvaluation,
    onRefreshLayoutBounds,
    onClearGrowthSuppression,
    onResetStabilizationAttempts,
    onRequestRefresh,
    onDispatch
  } = options

  if (plan.type === 'proceed') {
    return {
      handled: false,
      shouldContinueLoop: false,
      structuralActionsDelta: 0
    }
  }

  if (plan.type === 'retry') {
    onLogDebug('deferred-repagination-retry', {
      evaluationId,
      loopIteration,
      ...plan.debug
    })

    if (plan.shouldClearPreviousAddPagesMeasurement) {
      onClearPreviousAddPagesMeasurement()
    }

    if (plan.shouldDecrementStabilizationAttempts) {
      onDecrementStabilizationAttempts()
    }

    if (plan.shouldScheduleEvaluation) {
      onScheduleEvaluation()
    }

    if (plan.shouldRefreshLayoutBounds) {
      onRefreshLayoutBounds()
    }

    return {
      handled: true,
      shouldContinueLoop: false,
      structuralActionsDelta: 0
    }
  }

  if (plan.type === 'blocked') {
    onLogDebug('deferred-repagination-blocked', {
      evaluationId,
      loopIteration,
      ...plan.debug
    })

    if (plan.shouldClearPreviousAddPagesMeasurement) {
      onClearPreviousAddPagesMeasurement()
    }

    if (plan.shouldRefreshLayoutBounds) {
      onRefreshLayoutBounds()
    }

    return {
      handled: true,
      shouldContinueLoop: false,
      structuralActionsDelta: 0
    }
  }

  if (plan.type === 'refresh' || plan.type === 'request-refresh') {
    onLogDebug('deferred-repagination-outcome', {
      evaluationId,
      loopIteration,
      ...plan.debug
    })

    if (plan.type === 'refresh' && plan.shouldClearGrowthSuppression) {
      onClearGrowthSuppression()
    }

    onRequestRefresh(plan.refreshSource)

    if (plan.shouldScheduleEvaluation) {
      onScheduleEvaluation()
    }

    return {
      handled: true,
      shouldContinueLoop: false,
      structuralActionsDelta: 0
    }
  }

  if (plan.type === 'dispatch') {
    onLogDebug('deferred-repagination-outcome', {
      evaluationId,
      loopIteration,
      ...plan.outcomeDebug
    })

    onDispatch(plan.result.transaction)

    if (plan.shouldClearPreviousAddPagesMeasurement) {
      onClearPreviousAddPagesMeasurement()
    }

    if (plan.shouldContinueBatch) {
      onLogDebug('deferred-repagination-batch-continue', {
        evaluationId,
        loopIteration,
        ...plan.continueDebug
      })

      return {
        handled: true,
        shouldContinueLoop: true,
        structuralActionsDelta: 1
      }
    }

    if (plan.shouldScheduleEvaluation) {
      onLogDebug('deferred-repagination-batch-schedule', {
        evaluationId,
        loopIteration,
        ...plan.scheduleDebug
      })
      onScheduleEvaluation()
    }

    if (plan.shouldRefreshLayoutBounds) {
      onRefreshLayoutBounds()
    }

    return {
      handled: true,
      shouldContinueLoop: false,
      structuralActionsDelta: 1
    }
  }

  onLogDebug('deferred-repagination-outcome', {
    evaluationId,
    loopIteration,
    ...plan.debug
  })

  if (plan.shouldClearGrowthSuppression) {
    onClearGrowthSuppression()
  }

  if (plan.shouldResetStabilizationAttempts) {
    onResetStabilizationAttempts()
  }

  if (plan.shouldRefreshLayoutBounds) {
    onRefreshLayoutBounds()
  }

  return {
    handled: true,
    shouldContinueLoop: false,
    structuralActionsDelta: 0
  }
}
