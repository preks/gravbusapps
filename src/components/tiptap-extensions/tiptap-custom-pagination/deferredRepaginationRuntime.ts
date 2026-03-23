import type { EditorView } from '@tiptap/pm/view'
import { applyDeferredRepaginationExecutionPlan } from './deferredRepaginationExecutionRunner'
import type { AddPagesMeasurementSnapshot } from './paginationPageCountPolicy'
import {
  resolveDeferredRepaginationControllerCycle,
  resolveDeferredRepaginationExecutionPlan,
  resolveDeferredRepaginationPreflight
} from './paginationStabilizationPolicy'
import type { TablePaginationControllerResult } from '@/components/tiptap-extensions/tiptap-custom-tables/tablePaginationController'

interface RunDeferredRepaginationPassResult {
  handled: boolean
  shouldContinueLoop: boolean
  structuralActionsDelta: number
}

export function runDeferredRepaginationPass(options: {
  view: EditorView
  evaluationId: number
  loopIteration: number
  structuralActionsPerformed: number
  currentPageCount: number
  measuredPageCount: number
  nextAddPagesMeasurement: AddPagesMeasurementSnapshot | null
  shouldPersistNextAddPagesMeasurement: boolean
  preflight: ReturnType<typeof resolveDeferredRepaginationPreflight>
  stabilizationAttemptsRemaining: number
  evaluate: (measuredPageCount: number) => TablePaginationControllerResult
  onLogDebug: (event: string, payload: Record<string, unknown>) => void
  onSetPreviousAddPagesMeasurement: (next: AddPagesMeasurementSnapshot | null) => void
  onClearPreviousAddPagesMeasurement: () => void
  onSetGrowthSuppression: () => void
  onClearGrowthSuppression: () => void
  onDecrementStabilizationAttempts: () => void
  onResetStabilizationAttempts: () => void
  onScheduleEvaluation: () => void
  onRefreshLayoutBounds: () => void
  onRequestRefresh: (
    source: 'table-pagination-refresh' | 'table-pagination-request-refresh',
    nextStoredPageCount?: number
  ) => void
  onDispatch: (transaction: Extract<TablePaginationControllerResult, { type: 'dispatch' }>['transaction']) => void
}): RunDeferredRepaginationPassResult {
  const {
    evaluationId,
    loopIteration,
    structuralActionsPerformed,
    currentPageCount,
    measuredPageCount,
    nextAddPagesMeasurement,
    shouldPersistNextAddPagesMeasurement,
    preflight,
    stabilizationAttemptsRemaining,
    evaluate,
    onLogDebug,
    onSetPreviousAddPagesMeasurement,
    onClearPreviousAddPagesMeasurement,
    onSetGrowthSuppression,
    onClearGrowthSuppression,
    onDecrementStabilizationAttempts,
    onResetStabilizationAttempts,
    onScheduleEvaluation,
    onRefreshLayoutBounds,
    onRequestRefresh,
    onDispatch
  } = options

  const preflightExecutionPlan = resolveDeferredRepaginationExecutionPlan({
    preflight,
    actionPlan: null,
    stabilizationAttemptsRemaining,
    structuralActionsPerformed
  })

  const preflightExecutionResult = applyDeferredRepaginationExecutionPlan({
    plan: preflightExecutionPlan,
    evaluationId,
    loopIteration,
    onLogDebug,
    onClearPreviousAddPagesMeasurement,
    onDecrementStabilizationAttempts,
    onScheduleEvaluation,
    onRefreshLayoutBounds,
    onClearGrowthSuppression,
    onResetStabilizationAttempts,
    onRequestRefresh: source => {
      throw new Error(`Unexpected refresh request during deferred repagination preflight: ${source}`)
    },
    onDispatch: () => {
      throw new Error('Dispatch should not occur during deferred repagination preflight')
    }
  })

  if (preflightExecutionResult.handled) {
    return preflightExecutionResult
  }

  onSetPreviousAddPagesMeasurement(shouldPersistNextAddPagesMeasurement ? nextAddPagesMeasurement : null)

  const controllerCycle = resolveDeferredRepaginationControllerCycle({
    currentPageCount,
    measuredPageCount,
    structuralActionsPerformed,
    preflight,
    stabilizationAttemptsRemaining,
    evaluate
  })

  if (controllerCycle.refreshGateDebug !== null) {
    onLogDebug('deferred-repagination-refresh-gate', {
      evaluationId,
      loopIteration,
      currentPageCount,
      measuredPageCount,
      nextPageCount: controllerCycle.refreshGateDebug.nextPageCount,
      hasSplitPressure: controllerCycle.refreshGateDebug.hasSplitPressure,
      deferred: controllerCycle.refreshGateDebug.deferred,
      fallbackOutcome: controllerCycle.refreshGateDebug.fallbackOutcome,
      fallbackProgress: controllerCycle.refreshGateDebug.fallbackProgress,
      fallbackReason: controllerCycle.refreshGateDebug.fallbackReason
    })
  }

  if (controllerCycle.shouldApplyGrowthSuppression) {
    onSetGrowthSuppression()
  }

  return applyDeferredRepaginationExecutionPlan({
    plan: controllerCycle.executionPlan,
    evaluationId,
    loopIteration,
    onLogDebug,
    onClearPreviousAddPagesMeasurement,
    onDecrementStabilizationAttempts,
    onScheduleEvaluation,
    onRefreshLayoutBounds,
    onClearGrowthSuppression,
    onResetStabilizationAttempts,
    onRequestRefresh: source => {
      if (controllerCycle.executionPlan.type === 'refresh') {
        onRequestRefresh(source, controllerCycle.executionPlan.nextStoredPageCount)
        return
      }

      onRequestRefresh(source)
    },
    onDispatch
  })
}
