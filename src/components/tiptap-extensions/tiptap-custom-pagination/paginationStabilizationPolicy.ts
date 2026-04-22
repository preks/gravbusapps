import type { PagesStorage } from './types'
import type { PaginationTransactionClassification } from './paginationTransactionClassifier'
import type { TablePaginationControllerResult } from '@/components/tiptap-extensions/tiptap-custom-tables/tablePaginationController'

interface TablePaginationHeuristicsResolution {
  allowMerge: boolean
  allowSplit: boolean
}

interface DeferredRepaginationPreflightResolution {
  tablePaginationHeuristics: TablePaginationHeuristicsResolution
  deferTableEvaluation: boolean
  tableMeasurementsPending: boolean
  isBlocked: boolean
  shouldRetry: boolean
}

interface DeferredRepaginationRefreshGateResolution {
  result: TablePaginationControllerResult
  effectiveMeasuredPageCount: number
  shouldApplyGrowthSuppression: boolean
  debug: null | {
    deferred: boolean
    nextPageCount: number
    hasSplitPressure: boolean
    fallbackOutcome: TablePaginationControllerResult['type']
    fallbackProgress: TablePaginationControllerResult['progress']
    fallbackReason: Extract<TablePaginationControllerResult, { type: 'none' }>['reason'] | null
  }
}

interface DeferredRepaginationControllerCycleResolution {
  executionPlan: Exclude<DeferredRepaginationExecutionPlan, { type: 'retry' | 'blocked' | 'proceed' }>
  refreshGateDebug: DeferredRepaginationRefreshGateResolution['debug']
  shouldApplyGrowthSuppression: boolean
}

type DeferredRepaginationActionPlan =
  | {
      type: 'refresh'
      result: Extract<TablePaginationControllerResult, { type: 'refresh' }>
      shouldScheduleFollowUp: boolean
    }
  | {
      type: 'request-refresh'
      result: Extract<TablePaginationControllerResult, { type: 'request-refresh' }>
      shouldScheduleFollowUp: boolean
    }
  | {
      type: 'dispatch'
      result: Extract<TablePaginationControllerResult, { type: 'dispatch' }>
      maxActionsPerPass: number
      immediateDecision: ReturnType<typeof resolveImmediateTableStabilizationDecision>
      shouldContinueBatch: boolean
      shouldScheduleFollowUp: boolean
    }
  | {
      type: 'none'
      result: Extract<TablePaginationControllerResult, { type: 'none' }>
    }

export type DeferredRepaginationExecutionPlan =
  | {
      type: 'proceed'
    }
  | {
      type: 'retry'
      shouldClearPreviousAddPagesMeasurement: true
      shouldDecrementStabilizationAttempts: true
      shouldScheduleEvaluation: true
      shouldRefreshLayoutBounds: true
      debug: {
        deferTableEvaluation: boolean
        tableMeasurementsPending: boolean
        stabilizationAttemptsRemaining: number
      }
    }
  | {
      type: 'blocked'
      shouldClearPreviousAddPagesMeasurement: true
      shouldRefreshLayoutBounds: true
      debug: {
        deferTableEvaluation: boolean
        tableMeasurementsPending: boolean
        stabilizationAttemptsRemaining: number
      }
    }
  | {
      type: 'refresh'
      result: Extract<TablePaginationControllerResult, { type: 'refresh' }>
      nextStoredPageCount: number
      refreshSource: 'table-pagination-refresh'
      shouldClearGrowthSuppression: true
      shouldScheduleEvaluation: boolean
      debug: {
        outcome: 'refresh'
        progress: Extract<TablePaginationControllerResult, { type: 'refresh' }>['progress']
        nextPageCount: number
        hasSplitPressure: boolean
        scheduleEvaluation: boolean
      }
    }
  | {
      type: 'request-refresh'
      result: Extract<TablePaginationControllerResult, { type: 'request-refresh' }>
      refreshSource: 'table-pagination-request-refresh'
      shouldScheduleEvaluation: boolean
      debug: {
        outcome: 'request-refresh'
        progress: Extract<TablePaginationControllerResult, { type: 'request-refresh' }>['progress']
        scheduleEvaluation: boolean
      }
    }
  | {
      type: 'dispatch'
      result: Extract<TablePaginationControllerResult, { type: 'dispatch' }>
      shouldClearPreviousAddPagesMeasurement: true
      shouldContinueBatch: boolean
      shouldScheduleEvaluation: boolean
      shouldRefreshLayoutBounds: boolean
      outcomeDebug: {
        outcome: 'dispatch'
        progress: Extract<TablePaginationControllerResult, { type: 'dispatch' }>['progress']
        dispatchType: Extract<TablePaginationControllerResult, { type: 'dispatch' }>['dispatchType']
        candidateKey: string
        maxActionsPerPass: number
        scheduleEvaluation: boolean
      }
      continueDebug: null | {
        structuralActionsPerformed: number
        maxActionsPerPass: number
        dispatchType: Extract<TablePaginationControllerResult, { type: 'dispatch' }>['dispatchType']
        candidateKey: string
      }
      scheduleDebug: null | {
        structuralActionsPerformed: number
        maxActionsPerPass: number
        dispatchType: Extract<TablePaginationControllerResult, { type: 'dispatch' }>['dispatchType']
        candidateKey: string
      }
    }
  | {
      type: 'none'
      result: Extract<TablePaginationControllerResult, { type: 'none' }>
      shouldClearGrowthSuppression: true
      shouldResetStabilizationAttempts: true
      shouldRefreshLayoutBounds: true
      debug: {
        outcome: 'none'
        progress: Extract<TablePaginationControllerResult, { type: 'none' }>['progress']
        reason: Extract<TablePaginationControllerResult, { type: 'none' }>['reason']
      }
    }

type DeferredRepaginationOutcome =
  | {
      type: 'refresh'
      nextPreferSplitAfterRefresh: boolean
    }
  | {
      type: 'split'
      candidate: {
        tablePos: number
        splitRowIndex: number
      }
      candidateKey: string
    }
  | {
      type: 'merge'
      candidate: {
        firstTablePos: number
        secondTablePos: number
        paginationSplitId: string
      }
      candidateKey: string
    }
  | {
      type: 'none'
      nextPreferSplitAfterRefresh: boolean
    }

export const DEFAULT_TABLE_STABILIZATION_ACTIONS_PER_PASS = 4
export const MAX_TABLE_STABILIZATION_ACTIONS_PER_PASS = 6

function getTableSplitCandidateKey(
  candidate: { tablePos: number; splitRowIndex: number; mode?: 'split' | 'rebalance' } | null
) {
  return candidate ? `${candidate.mode ?? 'split'}:${candidate.tablePos}:${candidate.splitRowIndex}` : null
}

function getTableMergeCandidateKey(
  candidate: { paginationSplitId: string; firstTablePos: number; secondTablePos: number } | null
) {
  return candidate ? `${candidate.paginationSplitId}:${candidate.firstTablePos}:${candidate.secondTablePos}` : null
}

export function resolveTablePaginationHeuristics(
  cappedPageCount: number | null,
  hasActiveEditor: boolean
): TablePaginationHeuristicsResolution {
  if (hasActiveEditor) {
    return {
      allowMerge: false,
      allowSplit: false
    }
  }

  return {
    allowMerge: cappedPageCount === null,
    allowSplit: true
  }
}

export function shouldDeferTablePaginationEvaluation(options: {
  hasTables: boolean
  currentPageCount: number
  bodyBandCount: number
}) {
  const { hasTables, currentPageCount, bodyBandCount } = options
  return hasTables && currentPageCount > 0 && bodyBandCount < currentPageCount
}

export function shouldRetryDeferredRepaginationStabilization(options: {
  attemptsRemaining: number
  deferTableEvaluation: boolean
  tableMeasurementsPending: boolean
}) {
  const { attemptsRemaining, deferTableEvaluation, tableMeasurementsPending } = options
  return attemptsRemaining > 0 && (deferTableEvaluation || tableMeasurementsPending)
}

export function resolveDeferredRepaginationPreflight(options: {
  cappedPageCount: number | null
  hasActiveEditor: boolean
  hasTables: boolean
  currentPageCount: number
  bodyBandCount: number
  stabilizationAttemptsRemaining: number
  tableMeasurementsPending: boolean
}): DeferredRepaginationPreflightResolution {
  const {
    cappedPageCount,
    hasActiveEditor,
    hasTables,
    currentPageCount,
    bodyBandCount,
    stabilizationAttemptsRemaining,
    tableMeasurementsPending
  } = options

  const tablePaginationHeuristics = resolveTablePaginationHeuristics(cappedPageCount, hasActiveEditor)
  const deferTableEvaluation =
    tablePaginationHeuristics.allowSplit &&
    shouldDeferTablePaginationEvaluation({
      hasTables,
      currentPageCount,
      bodyBandCount
    })
  const effectiveTableMeasurementsPending =
    hasTables &&
    (tablePaginationHeuristics.allowSplit || tablePaginationHeuristics.allowMerge) &&
    !deferTableEvaluation &&
    tableMeasurementsPending
  const shouldRetry = shouldRetryDeferredRepaginationStabilization({
    attemptsRemaining: stabilizationAttemptsRemaining,
    deferTableEvaluation,
    tableMeasurementsPending: effectiveTableMeasurementsPending
  })

  return {
    tablePaginationHeuristics,
    deferTableEvaluation,
    tableMeasurementsPending: effectiveTableMeasurementsPending,
    isBlocked: deferTableEvaluation || effectiveTableMeasurementsPending,
    shouldRetry
  }
}

export function resolveImmediateTableStabilizationDecision(options: {
  result: TablePaginationControllerResult
  actionsPerformed: number
  maxActionsPerPass: number
}) {
  const { result } = options

  if (result.type !== 'dispatch' || result.progress !== 'structural') {
    return 'stop' as const
  }

  if (!result.scheduleEvaluation) {
    return 'stop' as const
  }

  return 'schedule' as const
}

export function resolveDeferredRepaginationActionPlan(options: {
  result: TablePaginationControllerResult
  currentPageCount: number
  measuredPageCount: number
  structuralActionsPerformed: number
}): DeferredRepaginationActionPlan {
  const { result, currentPageCount, measuredPageCount, structuralActionsPerformed } = options

  if (result.type === 'refresh') {
    return {
      type: 'refresh',
      result,
      shouldScheduleFollowUp: result.scheduleEvaluation
    }
  }

  if (result.type === 'request-refresh') {
    return {
      type: 'request-refresh',
      result,
      shouldScheduleFollowUp: result.scheduleEvaluation
    }
  }

  if (result.type === 'dispatch') {
    const maxActionsPerPass = resolveTableStabilizationActionBudget({
      currentPageCount,
      measuredPageCount,
      result
    })
    const immediateDecision = resolveImmediateTableStabilizationDecision({
      result,
      actionsPerformed: structuralActionsPerformed,
      maxActionsPerPass
    })

    return {
      type: 'dispatch',
      result,
      maxActionsPerPass,
      immediateDecision,
      shouldContinueBatch: false,
      shouldScheduleFollowUp: immediateDecision === 'schedule' || result.scheduleEvaluation
    }
  }

  if (result.reason === 'candidate-parity-mismatch' && measuredPageCount > currentPageCount) {
    return {
      type: 'refresh',
      result: {
        type: 'refresh',
        pageCount: measuredPageCount,
        hasSplitPressure: false,
        progress: 'refresh',
        scheduleEvaluation: true
      },
      shouldScheduleFollowUp: true
    }
  }

  return {
    type: 'none',
    result
  }
}

export function resolveDeferredRepaginationExecutionPlan(options: {
  preflight: DeferredRepaginationPreflightResolution
  actionPlan: DeferredRepaginationActionPlan | null
  stabilizationAttemptsRemaining: number
  structuralActionsPerformed: number
}): DeferredRepaginationExecutionPlan {
  const { preflight, actionPlan, stabilizationAttemptsRemaining, structuralActionsPerformed } = options
  const canScheduleFollowUp = stabilizationAttemptsRemaining > 0

  if (preflight.shouldRetry) {
    return {
      type: 'retry',
      shouldClearPreviousAddPagesMeasurement: true,
      shouldDecrementStabilizationAttempts: true,
      shouldScheduleEvaluation: true,
      shouldRefreshLayoutBounds: true,
      debug: {
        deferTableEvaluation: preflight.deferTableEvaluation,
        tableMeasurementsPending: preflight.tableMeasurementsPending,
        stabilizationAttemptsRemaining
      }
    }
  }

  if (preflight.isBlocked) {
    return {
      type: 'blocked',
      shouldClearPreviousAddPagesMeasurement: true,
      shouldRefreshLayoutBounds: true,
      debug: {
        deferTableEvaluation: preflight.deferTableEvaluation,
        tableMeasurementsPending: preflight.tableMeasurementsPending,
        stabilizationAttemptsRemaining
      }
    }
  }

  if (actionPlan === null) {
    return {
      type: 'proceed'
    }
  }

  if (actionPlan.type === 'refresh') {
    return {
      type: 'refresh',
      result: actionPlan.result,
      nextStoredPageCount: actionPlan.result.pageCount,
      refreshSource: 'table-pagination-refresh',
      shouldClearGrowthSuppression: true,
      shouldScheduleEvaluation: actionPlan.shouldScheduleFollowUp && canScheduleFollowUp,
      debug: {
        outcome: 'refresh',
        progress: actionPlan.result.progress,
        nextPageCount: actionPlan.result.pageCount,
        hasSplitPressure: actionPlan.result.hasSplitPressure,
        scheduleEvaluation: actionPlan.result.scheduleEvaluation && canScheduleFollowUp
      }
    }
  }

  if (actionPlan.type === 'request-refresh') {
    return {
      type: 'request-refresh',
      result: actionPlan.result,
      refreshSource: 'table-pagination-request-refresh',
      shouldScheduleEvaluation: actionPlan.shouldScheduleFollowUp && canScheduleFollowUp,
      debug: {
        outcome: 'request-refresh',
        progress: actionPlan.result.progress,
        scheduleEvaluation: actionPlan.result.scheduleEvaluation && canScheduleFollowUp
      }
    }
  }

  if (actionPlan.type === 'dispatch') {
    return {
      type: 'dispatch',
      result: actionPlan.result,
      shouldClearPreviousAddPagesMeasurement: true,
      shouldContinueBatch: actionPlan.shouldContinueBatch,
      shouldScheduleEvaluation: actionPlan.shouldScheduleFollowUp && canScheduleFollowUp,
      shouldRefreshLayoutBounds: !actionPlan.shouldContinueBatch,
      outcomeDebug: {
        outcome: 'dispatch',
        progress: actionPlan.result.progress,
        dispatchType: actionPlan.result.dispatchType,
        candidateKey: actionPlan.result.candidateKey,
        maxActionsPerPass: actionPlan.maxActionsPerPass,
        scheduleEvaluation: actionPlan.result.scheduleEvaluation && canScheduleFollowUp
      },
      continueDebug: actionPlan.shouldContinueBatch
        ? {
            structuralActionsPerformed,
            maxActionsPerPass: actionPlan.maxActionsPerPass,
            dispatchType: actionPlan.result.dispatchType,
            candidateKey: actionPlan.result.candidateKey
          }
        : null,
      scheduleDebug:
        actionPlan.shouldScheduleFollowUp && canScheduleFollowUp
          ? {
              structuralActionsPerformed,
              maxActionsPerPass: actionPlan.maxActionsPerPass,
              dispatchType: actionPlan.result.dispatchType,
              candidateKey: actionPlan.result.candidateKey
            }
          : null
    }
  }

  return {
    type: 'none',
    result: actionPlan.result,
    shouldClearGrowthSuppression: true,
    shouldResetStabilizationAttempts: true,
    shouldRefreshLayoutBounds: true,
    debug: {
      outcome: 'none',
      progress: actionPlan.result.progress,
      reason: actionPlan.result.reason
    }
  }
}

export function resolveDeferredRepaginationControllerCycle(options: {
  currentPageCount: number
  measuredPageCount: number
  structuralActionsPerformed: number
  preflight: DeferredRepaginationPreflightResolution
  stabilizationAttemptsRemaining: number
  evaluate: (measuredPageCount: number) => TablePaginationControllerResult
}): DeferredRepaginationControllerCycleResolution {
  const {
    currentPageCount,
    measuredPageCount,
    structuralActionsPerformed,
    preflight,
    stabilizationAttemptsRemaining,
    evaluate
  } = options

  let tablePaginationResult = evaluate(measuredPageCount)
  let tablePaginationMeasuredPageCount = measuredPageCount
  let refreshGateDebug: DeferredRepaginationRefreshGateResolution['debug'] = null
  let shouldApplyGrowthSuppression = false

  if (tablePaginationResult.type === 'refresh') {
    const deferredRefreshGate = resolveDeferredRepaginationRefreshGate({
      currentPageCount,
      refreshResult: tablePaginationResult,
      evaluateFallback: () => evaluate(currentPageCount)
    })

    refreshGateDebug = deferredRefreshGate.debug
    shouldApplyGrowthSuppression = deferredRefreshGate.shouldApplyGrowthSuppression
    tablePaginationResult = deferredRefreshGate.result
    tablePaginationMeasuredPageCount = deferredRefreshGate.effectiveMeasuredPageCount
  }

  const actionPlan = resolveDeferredRepaginationActionPlan({
    result: tablePaginationResult,
    currentPageCount,
    measuredPageCount: tablePaginationMeasuredPageCount,
    structuralActionsPerformed:
      tablePaginationResult.type === 'dispatch' ? structuralActionsPerformed + 1 : structuralActionsPerformed
  })
  const executionPlan = resolveDeferredRepaginationExecutionPlan({
    preflight,
    actionPlan,
    stabilizationAttemptsRemaining,
    structuralActionsPerformed:
      actionPlan.type === 'dispatch' ? structuralActionsPerformed + 1 : structuralActionsPerformed
  })

  if (executionPlan.type === 'retry' || executionPlan.type === 'blocked' || executionPlan.type === 'proceed') {
    throw new Error('Controller cycle must resolve to an actionable execution plan')
  }

  return {
    executionPlan,
    refreshGateDebug,
    shouldApplyGrowthSuppression
  }
}

export function resolveTableStabilizationActionBudget(options: {
  currentPageCount: number
  measuredPageCount: number
  result: TablePaginationControllerResult
}) {
  const { currentPageCount, measuredPageCount, result } = options

  if (result.type !== 'dispatch' || result.progress !== 'structural') {
    return DEFAULT_TABLE_STABILIZATION_ACTIONS_PER_PASS
  }

  if (measuredPageCount !== currentPageCount) {
    return DEFAULT_TABLE_STABILIZATION_ACTIONS_PER_PASS
  }

  return MAX_TABLE_STABILIZATION_ACTIONS_PER_PASS
}

export function shouldDeferUpwardTableRefreshAcceptance(options: {
  currentPageCount: number
  result: TablePaginationControllerResult
}) {
  const { currentPageCount, result } = options

  return result.type === 'refresh' && result.pageCount > currentPageCount && result.hasSplitPressure
}

export function resolveDeferredRepaginationRefreshGate(options: {
  currentPageCount: number
  refreshResult: Extract<TablePaginationControllerResult, { type: 'refresh' }>
  evaluateFallback: () => TablePaginationControllerResult
}): DeferredRepaginationRefreshGateResolution {
  const { currentPageCount, refreshResult, evaluateFallback } = options
  const shouldEvaluateFallback = shouldDeferUpwardTableRefreshAcceptance({
    currentPageCount,
    result: refreshResult
  })
  const fallbackResult = shouldEvaluateFallback ? evaluateFallback() : null
  const deferredRefreshResult = resolveDeferredTableRefreshResult({
    currentPageCount,
    refreshResult,
    fallbackResult
  })

  return {
    result: deferredRefreshResult.result,
    effectiveMeasuredPageCount: deferredRefreshResult.effectiveMeasuredPageCount,
    shouldApplyGrowthSuppression: deferredRefreshResult.deferred,
    debug:
      fallbackResult === null
        ? null
        : {
            deferred: deferredRefreshResult.deferred,
            nextPageCount: refreshResult.pageCount,
            hasSplitPressure: refreshResult.hasSplitPressure,
            fallbackOutcome: fallbackResult.type,
            fallbackProgress: fallbackResult.progress,
            fallbackReason: fallbackResult.type === 'none' ? fallbackResult.reason : null
          }
  }
}

export function resolveDeferredTableRefreshResult(options: {
  currentPageCount: number
  refreshResult: Extract<TablePaginationControllerResult, { type: 'refresh' }>
  fallbackResult: TablePaginationControllerResult | null
}) {
  const { currentPageCount, refreshResult, fallbackResult } = options
  const canUseFallback =
    shouldDeferUpwardTableRefreshAcceptance({
      currentPageCount,
      result: refreshResult
    }) &&
    fallbackResult !== null &&
    fallbackResult.type !== 'none' &&
    fallbackResult.type !== 'refresh'

  if (!canUseFallback) {
    return {
      deferred: false,
      effectiveMeasuredPageCount: refreshResult.pageCount,
      result: refreshResult as TablePaginationControllerResult
    }
  }

  return {
    deferred: true,
    effectiveMeasuredPageCount: currentPageCount,
    result: fallbackResult
  }
}

export function shouldScheduleDeferredRepaginationOnUpdate(options: {
  activeEditorType: PagesStorage['activeEditorType']
  hasTables: boolean
  externalDocChange: boolean
  collaborationRemoteDocChange?: boolean
  paginationOwnedDocChange: boolean
  hydrationOwnedDocChange: boolean
  docChangeAnalysis: PaginationTransactionClassification | null
}) {
  const {
    activeEditorType,
    hasTables,
    externalDocChange,
    collaborationRemoteDocChange,
    paginationOwnedDocChange,
    hydrationOwnedDocChange,
    docChangeAnalysis
  } = options

  if (activeEditorType !== null) {
    return false
  }

  if (collaborationRemoteDocChange) {
    return true
  }

  if (!hasTables) {
    return false
  }

  if (externalDocChange) {
    return docChangeAnalysis?.touchesTableRegion ?? true
  }

  return paginationOwnedDocChange || hydrationOwnedDocChange
}

export function resolveDeferredRepaginationOutcome(options: {
  currentPageCount: number
  measuredPageCount: number
  allowMerge: boolean
  allowSplit: boolean
  preferSplitAfterRefresh: boolean
  splitCandidate: { tablePos: number; splitRowIndex: number } | null
  mergeCandidate: {
    paginationSplitId: string
    firstTablePos: number
    secondTablePos: number
  } | null
  rejectedSplitKey: string | null
  rejectedMergeKey: string | null
}): DeferredRepaginationOutcome {
  const {
    currentPageCount,
    measuredPageCount,
    allowMerge,
    allowSplit,
    preferSplitAfterRefresh,
    splitCandidate,
    mergeCandidate,
    rejectedSplitKey,
    rejectedMergeKey
  } = options

  const splitCandidateKey = getTableSplitCandidateKey(splitCandidate)
  const mergeCandidateKey = getTableMergeCandidateKey(mergeCandidate)
  const canSplit =
    allowSplit && splitCandidate !== null && splitCandidateKey !== null && splitCandidateKey !== rejectedSplitKey
  const canMerge =
    allowMerge && mergeCandidate !== null && mergeCandidateKey !== null && mergeCandidateKey !== rejectedMergeKey

  if (measuredPageCount < currentPageCount && canMerge && splitCandidateKey === null) {
    return {
      type: 'merge',
      candidate: mergeCandidate,
      candidateKey: mergeCandidateKey
    }
  }

  if (measuredPageCount !== currentPageCount) {
    return {
      type: 'refresh',
      nextPreferSplitAfterRefresh: measuredPageCount > currentPageCount
    }
  }

  if (preferSplitAfterRefresh) {
    if (canSplit) {
      return {
        type: 'split',
        candidate: splitCandidate,
        candidateKey: splitCandidateKey
      }
    }

    return {
      type: 'none',
      nextPreferSplitAfterRefresh: false
    }
  }

  if (canMerge && splitCandidateKey === null) {
    return {
      type: 'merge',
      candidate: mergeCandidate,
      candidateKey: mergeCandidateKey
    }
  }

  if (canSplit) {
    return {
      type: 'split',
      candidate: splitCandidate,
      candidateKey: splitCandidateKey
    }
  }

  return {
    type: 'none',
    nextPreferSplitAfterRefresh: false
  }
}
