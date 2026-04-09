import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import {
  INITIAL_LAYOUT_STABILIZATION_MAX_ATTEMPTS,
  createSafePaginationSelection,
  resolveRunawayPageGrowth,
  resolvePaginationWidgetTotalPages,
  resolvePaginationBodyClick,
  resolvePaginationSelectionBodyOverflow
} from '../PaginationPlus'
import {
  DEFAULT_TABLE_STABILIZATION_ACTIONS_PER_PASS,
  MAX_TABLE_STABILIZATION_ACTIONS_PER_PASS,
  resolveDeferredRepaginationActionPlan,
  resolveDeferredRepaginationControllerCycle,
  resolveDeferredRepaginationExecutionPlan,
  resolveDeferredRepaginationPreflight,
  resolveDeferredRepaginationRefreshGate,
  resolveDeferredRepaginationOutcome,
  resolveDeferredTableRefreshResult,
  resolveImmediateTableStabilizationDecision,
  resolveTablePaginationHeuristics,
  resolveTableStabilizationActionBudget,
  shouldDeferTablePaginationEvaluation,
  shouldDeferUpwardTableRefreshAcceptance,
  shouldRetryDeferredRepaginationStabilization,
  shouldScheduleDeferredRepaginationOnUpdate
} from '../paginationStabilizationPolicy'
import {
  resolveCurrentKnownPageCount,
  resolveDeferredRepaginationMeasurementState,
  resolvePaginationMeasurementState
} from '../paginationPageCountPolicy'
import * as paginationUtils from '../utils'
import { TablePaginationControllerResult } from '../../tiptap-custom-tables/tablePaginationController'

describe('resolveDeferredRepaginationOutcome', () => {
  it('refreshes first and only prefers a split on the next stable pass after page growth', () => {
    const heuristics = resolveTablePaginationHeuristics(null, false)
    const refreshOutcome = resolveDeferredRepaginationOutcome({
      currentPageCount: 1,
      measuredPageCount: 2,
      allowMerge: heuristics.allowMerge,
      allowSplit: heuristics.allowSplit,
      preferSplitAfterRefresh: false,
      splitCandidate: {
        tablePos: 12,
        splitRowIndex: 3
      },
      mergeCandidate: null,
      rejectedSplitKey: null,
      rejectedMergeKey: null
    })

    expect(refreshOutcome).toEqual({
      type: 'refresh',
      nextPreferSplitAfterRefresh: true
    })

    if (refreshOutcome.type !== 'refresh') {
      throw new Error('Expected a refresh outcome after page growth')
    }

    expect(
      resolveDeferredRepaginationOutcome({
        currentPageCount: 2,
        measuredPageCount: 2,
        allowMerge: heuristics.allowMerge,
        allowSplit: heuristics.allowSplit,
        preferSplitAfterRefresh: refreshOutcome.nextPreferSplitAfterRefresh,
        splitCandidate: {
          tablePos: 12,
          splitRowIndex: 3
        },
        mergeCandidate: {
          paginationSplitId: 'pagination-split-1',
          firstTablePos: 12,
          secondTablePos: 48
        },
        rejectedSplitKey: null,
        rejectedMergeKey: null
      })
    ).toMatchObject({
      type: 'split',
      candidateKey: 'split:12:3'
    })
  })

  it('still refreshes page growth when there is no safe split candidate yet', () => {
    const heuristics = resolveTablePaginationHeuristics(null, false)

    expect(
      resolveDeferredRepaginationOutcome({
        currentPageCount: 1,
        measuredPageCount: 2,
        allowMerge: heuristics.allowMerge,
        allowSplit: heuristics.allowSplit,
        preferSplitAfterRefresh: false,
        splitCandidate: null,
        mergeCandidate: null,
        rejectedSplitKey: null,
        rejectedMergeKey: null
      })
    ).toEqual({
      type: 'refresh',
      nextPreferSplitAfterRefresh: true
    })
  })

  it('merges immediately when page shrink makes adjacent fragments safe to reunify', () => {
    const heuristics = resolveTablePaginationHeuristics(null, false)

    expect(
      resolveDeferredRepaginationOutcome({
        currentPageCount: 2,
        measuredPageCount: 1,
        allowMerge: heuristics.allowMerge,
        allowSplit: heuristics.allowSplit,
        preferSplitAfterRefresh: false,
        splitCandidate: null,
        mergeCandidate: {
          paginationSplitId: 'pagination-split-2',
          firstTablePos: 20,
          secondTablePos: 56
        },
        rejectedSplitKey: null,
        rejectedMergeKey: null
      })
    ).toMatchObject({
      type: 'merge',
      candidateKey: 'pagination-split-2:20:56'
    })
  })

  it('still refreshes on page shrink when there is no safe merge candidate yet', () => {
    const heuristics = resolveTablePaginationHeuristics(null, false)

    expect(
      resolveDeferredRepaginationOutcome({
        currentPageCount: 2,
        measuredPageCount: 1,
        allowMerge: heuristics.allowMerge,
        allowSplit: heuristics.allowSplit,
        preferSplitAfterRefresh: false,
        splitCandidate: null,
        mergeCandidate: null,
        rejectedSplitKey: null,
        rejectedMergeKey: null
      })
    ).toEqual({
      type: 'refresh',
      nextPreferSplitAfterRefresh: false
    })
  })

  it('allows a row-return merge on the next stable pass when shrink refresh happened first', () => {
    const heuristics = resolveTablePaginationHeuristics(null, false)
    const refreshOutcome = resolveDeferredRepaginationOutcome({
      currentPageCount: 2,
      measuredPageCount: 1,
      allowMerge: heuristics.allowMerge,
      allowSplit: heuristics.allowSplit,
      preferSplitAfterRefresh: false,
      splitCandidate: null,
      mergeCandidate: null,
      rejectedSplitKey: null,
      rejectedMergeKey: null
    })

    expect(refreshOutcome).toEqual({
      type: 'refresh',
      nextPreferSplitAfterRefresh: false
    })

    if (refreshOutcome.type !== 'refresh') {
      throw new Error('Expected a refresh outcome before merge candidate appeared')
    }

    expect(
      resolveDeferredRepaginationOutcome({
        currentPageCount: 1,
        measuredPageCount: 1,
        allowMerge: heuristics.allowMerge,
        allowSplit: heuristics.allowSplit,
        preferSplitAfterRefresh: refreshOutcome.nextPreferSplitAfterRefresh,
        splitCandidate: null,
        mergeCandidate: {
          paginationSplitId: 'pagination-split-2',
          firstTablePos: 20,
          secondTablePos: 56
        },
        rejectedSplitKey: null,
        rejectedMergeKey: null
      })
    ).toMatchObject({
      type: 'merge',
      candidateKey: 'pagination-split-2:20:56'
    })
  })

  it('merges adjacent fragments after a border shrink once split pressure is gone', () => {
    const heuristics = resolveTablePaginationHeuristics(null, false)

    expect(
      resolveDeferredRepaginationOutcome({
        currentPageCount: 2,
        measuredPageCount: 2,
        allowMerge: heuristics.allowMerge,
        allowSplit: heuristics.allowSplit,
        preferSplitAfterRefresh: false,
        splitCandidate: null,
        mergeCandidate: {
          paginationSplitId: 'pagination-split-7',
          firstTablePos: 25,
          secondTablePos: 77
        },
        rejectedSplitKey: null,
        rejectedMergeKey: null
      })
    ).toMatchObject({
      type: 'merge',
      candidateKey: 'pagination-split-7:25:77'
    })
  })
})

describe('resolveRunawayPageGrowth', () => {
  it('caps runaway add-page growth when the gap does not shrink enough after a refresh', () => {
    expect(
      resolveRunawayPageGrowth(
        {
          currentPageCount: 2,
          measuredPageCount: 14,
          lastPageGap: 12000,
          pageContentHeight: 1000
        },
        null,
        14,
        26,
        {
          reason: 'add-pages',
          hasPaginationElement: true,
          currentPageCount: 14,
          resultPageCount: 26,
          contentBottom: 25000,
          documentBottom: 25000,
          selectionBottom: 0,
          measuredBottom: 25000,
          pageContentHeight: 1000,
          lastPageBodyBottom: 13040,
          lastPageGap: 11960,
          lowerBound: -976
        },
        false,
        false
      )
    ).toMatchObject({
      effectivePageCount: 14,
      cappedPageCount: 14,
      suppressionActive: true,
      runawayPageGrowthCheck: {
        shouldStabilize: true
      }
    })
  })
})

describe('resolveCurrentKnownPageCount', () => {
  it('never drops below one and prefers the larger of DOM and stored counts', () => {
    expect(resolveCurrentKnownPageCount(0, 0)).toBe(1)
    expect(resolveCurrentKnownPageCount(3, 1)).toBe(3)
    expect(resolveCurrentKnownPageCount(2, 5)).toBe(5)
  })
})

describe('resolveDeferredRepaginationMeasurementState', () => {
  it('normalizes the current count, resolves the measured snapshot, and prepares the next add-pages snapshot', () => {
    const measured = {
      headerHeights: new Map([[1, 40]]),
      footerHeights: new Map([[1, 24]])
    }
    const resolveMeasuredSnapshot = jest.fn(() => ({
      rawMeasuredPageCount: 26,
      measuredPageCount: 14,
      pageCountDebugInfo: {
        reason: 'add-pages',
        lastPageGap: 120,
        pageContentHeight: 800
      } as never,
      runawayPageGrowthResolution: {
        effectivePageCount: 14,
        cappedPageCount: 14,
        suppressionActive: true,
        runawayPageGrowthCheck: {
          shouldStabilize: true,
          actualGapShrink: 80,
          expectedGapShrink: 160,
          gapShrinkRatio: 0.5
        }
      }
    }))

    const result = resolveDeferredRepaginationMeasurementState({
      view: {} as never,
      storage: { pageCount: 12 } as never,
      runtimeOptions: {} as never,
      previousAddPagesMeasurement: null,
      cappedPageCount: null,
      docChangedSinceLastUpdate: false,
      resetDueToDocChange: false,
      measureHeights: () => measured,
      resolveCurrentPageCount: () => 14,
      resolveMeasuredSnapshot
    })

    expect(result).toMatchObject({
      measured,
      currentPageCount: 14,
      rawMeasuredPageCount: 26,
      measuredPageCount: 14,
      pageCountReason: 'add-pages',
      lastMeasuredPageGap: 120,
      nextAddPagesMeasurement: {
        currentPageCount: 14,
        measuredPageCount: 26,
        lastPageGap: 120,
        pageContentHeight: 800
      },
      runawayPageGrowthResolution: {
        effectivePageCount: 14,
        cappedPageCount: 14,
        suppressionActive: true
      }
    })

    expect(resolveMeasuredSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        measured,
        currentPageCount: 14,
        cappedPageCount: null
      })
    )
  })
})

describe('resolvePaginationMeasurementState', () => {
  it('reuses the shared measurement-state pipeline for non-deferred callers', () => {
    const measured = {
      headerHeights: new Map([[1, 32]]),
      footerHeights: new Map([[1, 18]])
    }

    expect(
      resolvePaginationMeasurementState({
        view: {} as never,
        storage: { pageCount: 4 } as never,
        runtimeOptions: {} as never,
        previousAddPagesMeasurement: null,
        cappedPageCount: null,
        docChangedSinceLastUpdate: false,
        resetDueToDocChange: false,
        measureHeights: () => measured,
        resolveCurrentPageCount: () => 4,
        resolveMeasuredSnapshot: () => ({
          rawMeasuredPageCount: 5,
          measuredPageCount: 5,
          pageCountDebugInfo: null,
          runawayPageGrowthResolution: {
            effectivePageCount: 5,
            cappedPageCount: null,
            suppressionActive: false,
            runawayPageGrowthCheck: {
              shouldStabilize: false,
              actualGapShrink: null,
              expectedGapShrink: null,
              gapShrinkRatio: null
            }
          }
        })
      })
    ).toMatchObject({
      measured,
      currentPageCount: 4,
      rawMeasuredPageCount: 5,
      measuredPageCount: 5,
      pageCountReason: null,
      lastMeasuredPageGap: null,
      nextAddPagesMeasurement: null
    })
  })

  it('reuses known page count from measured heights before consulting the DOM', () => {
    const measured = {
      headerHeights: new Map([[1, 32]]),
      footerHeights: new Map([[1, 18]]),
      knownPageCount: 7
    }
    const getExistingPageCountSpy = jest.spyOn(paginationUtils, 'getExistingPageCount')

    expect(
      resolvePaginationMeasurementState({
        view: {} as never,
        storage: { pageCount: 4 } as never,
        runtimeOptions: {} as never,
        previousAddPagesMeasurement: null,
        cappedPageCount: null,
        docChangedSinceLastUpdate: false,
        resetDueToDocChange: false,
        measureHeights: () => measured,
        resolveMeasuredSnapshot: options => ({
          rawMeasuredPageCount: options.currentPageCount,
          measuredPageCount: options.currentPageCount,
          pageCountDebugInfo: null,
          runawayPageGrowthResolution: {
            effectivePageCount: options.currentPageCount,
            cappedPageCount: null,
            suppressionActive: false,
            runawayPageGrowthCheck: {
              shouldStabilize: false,
              actualGapShrink: null,
              expectedGapShrink: null,
              gapShrinkRatio: null
            }
          }
        })
      })
    ).toMatchObject({
      measured,
      currentPageCount: 7,
      rawMeasuredPageCount: 7,
      measuredPageCount: 7
    })

    expect(getExistingPageCountSpy).not.toHaveBeenCalled()
  })
})

describe('shouldDeferTablePaginationEvaluation', () => {
  it('defers table pagination while page body bands are still incomplete', () => {
    expect(
      shouldDeferTablePaginationEvaluation({
        hasTables: true,
        currentPageCount: 3,
        bodyBandCount: 2
      })
    ).toBe(true)
  })

  it('does not defer when there are no tables or when all page body bands are ready', () => {
    expect(
      shouldDeferTablePaginationEvaluation({
        hasTables: false,
        currentPageCount: 3,
        bodyBandCount: 0
      })
    ).toBe(false)

    expect(
      shouldDeferTablePaginationEvaluation({
        hasTables: true,
        currentPageCount: 3,
        bodyBandCount: 3
      })
    ).toBe(false)
  })
})

describe('shouldRetryDeferredRepaginationStabilization', () => {
  it('retries while bounded stabilization attempts remain and measurements are still pending', () => {
    expect(
      shouldRetryDeferredRepaginationStabilization({
        attemptsRemaining: INITIAL_LAYOUT_STABILIZATION_MAX_ATTEMPTS,
        deferTableEvaluation: false,
        tableMeasurementsPending: true
      })
    ).toBe(true)
  })

  it('stops retrying once the bounded stabilization budget is exhausted', () => {
    expect(
      shouldRetryDeferredRepaginationStabilization({
        attemptsRemaining: 0,
        deferTableEvaluation: true,
        tableMeasurementsPending: true
      })
    ).toBe(false)
  })
})

describe('resolveDeferredRepaginationPreflight', () => {
  it('requests a retry while body-band measurement is still incomplete and stabilization budget remains', () => {
    expect(
      resolveDeferredRepaginationPreflight({
        cappedPageCount: null,
        hasActiveEditor: false,
        hasTables: true,
        currentPageCount: 4,
        bodyBandCount: 2,
        stabilizationAttemptsRemaining: INITIAL_LAYOUT_STABILIZATION_MAX_ATTEMPTS,
        tableMeasurementsPending: false
      })
    ).toMatchObject({
      deferTableEvaluation: true,
      tableMeasurementsPending: false,
      isBlocked: true,
      shouldRetry: true,
      tablePaginationHeuristics: {
        allowMerge: true,
        allowSplit: true
      }
    })
  })

  it('blocks without retry once stabilization budget is exhausted but table measurements are still pending', () => {
    expect(
      resolveDeferredRepaginationPreflight({
        cappedPageCount: null,
        hasActiveEditor: false,
        hasTables: true,
        currentPageCount: 4,
        bodyBandCount: 4,
        stabilizationAttemptsRemaining: 0,
        tableMeasurementsPending: true
      })
    ).toMatchObject({
      deferTableEvaluation: false,
      tableMeasurementsPending: true,
      isBlocked: true,
      shouldRetry: false
    })
  })

  it('disables split and merge heuristics while a header or footer editor is active', () => {
    expect(
      resolveDeferredRepaginationPreflight({
        cappedPageCount: null,
        hasActiveEditor: true,
        hasTables: true,
        currentPageCount: 4,
        bodyBandCount: 4,
        stabilizationAttemptsRemaining: INITIAL_LAYOUT_STABILIZATION_MAX_ATTEMPTS,
        tableMeasurementsPending: true
      })
    ).toMatchObject({
      deferTableEvaluation: false,
      tableMeasurementsPending: false,
      isBlocked: false,
      shouldRetry: false,
      tablePaginationHeuristics: {
        allowMerge: false,
        allowSplit: false
      }
    })
  })
})

describe('resolveDeferredRepaginationExecutionPlan', () => {
  it('returns a retry plan while stabilization should retry', () => {
    const preflight = resolveDeferredRepaginationPreflight({
      cappedPageCount: null,
      hasActiveEditor: false,
      hasTables: true,
      currentPageCount: 4,
      bodyBandCount: 2,
      stabilizationAttemptsRemaining: INITIAL_LAYOUT_STABILIZATION_MAX_ATTEMPTS,
      tableMeasurementsPending: false
    })

    expect(
      resolveDeferredRepaginationExecutionPlan({
        preflight,
        actionPlan: null,
        stabilizationAttemptsRemaining: INITIAL_LAYOUT_STABILIZATION_MAX_ATTEMPTS,
        structuralActionsPerformed: 0
      })
    ).toMatchObject({
      type: 'retry',
      shouldClearPreviousAddPagesMeasurement: true,
      shouldDecrementStabilizationAttempts: true,
      shouldScheduleEvaluation: true,
      shouldRefreshLayoutBounds: true,
      debug: {
        deferTableEvaluation: true,
        tableMeasurementsPending: false,
        stabilizationAttemptsRemaining: INITIAL_LAYOUT_STABILIZATION_MAX_ATTEMPTS
      }
    })
  })

  it('returns a neutral proceed plan before any table action plan exists', () => {
    const preflight = resolveDeferredRepaginationPreflight({
      cappedPageCount: null,
      hasActiveEditor: false,
      hasTables: true,
      currentPageCount: 4,
      bodyBandCount: 4,
      stabilizationAttemptsRemaining: INITIAL_LAYOUT_STABILIZATION_MAX_ATTEMPTS,
      tableMeasurementsPending: false
    })

    expect(
      resolveDeferredRepaginationExecutionPlan({
        preflight,
        actionPlan: null,
        stabilizationAttemptsRemaining: INITIAL_LAYOUT_STABILIZATION_MAX_ATTEMPTS,
        structuralActionsPerformed: 0
      })
    ).toEqual({
      type: 'proceed'
    })
  })

  it('maps dispatch action plans into dispatch execution plans with continue metadata', () => {
    const preflight = resolveDeferredRepaginationPreflight({
      cappedPageCount: null,
      hasActiveEditor: false,
      hasTables: true,
      currentPageCount: 4,
      bodyBandCount: 4,
      stabilizationAttemptsRemaining: INITIAL_LAYOUT_STABILIZATION_MAX_ATTEMPTS,
      tableMeasurementsPending: false
    })
    const actionPlan = resolveDeferredRepaginationActionPlan({
      result: {
        type: 'dispatch',
        dispatchType: 'split',
        candidateKey: 'split:10:2',
        progress: 'structural',
        transaction: {} as never,
        scheduleEvaluation: true
      },
      currentPageCount: 26,
      measuredPageCount: 26,
      structuralActionsPerformed: 1
    })

    expect(
      resolveDeferredRepaginationExecutionPlan({
        preflight,
        actionPlan,
        stabilizationAttemptsRemaining: INITIAL_LAYOUT_STABILIZATION_MAX_ATTEMPTS,
        structuralActionsPerformed: 2
      })
    ).toMatchObject({
      type: 'dispatch',
      shouldClearPreviousAddPagesMeasurement: true,
      shouldContinueBatch: false,
      shouldScheduleEvaluation: true,
      shouldRefreshLayoutBounds: true,
      outcomeDebug: {
        dispatchType: 'split',
        candidateKey: 'split:10:2'
      },
      continueDebug: null
    })
  })

  it('stops scheduling follow-up dispatch passes once stabilization attempts are exhausted', () => {
    const preflight = resolveDeferredRepaginationPreflight({
      cappedPageCount: null,
      hasActiveEditor: false,
      hasTables: true,
      currentPageCount: 4,
      bodyBandCount: 4,
      stabilizationAttemptsRemaining: 0,
      tableMeasurementsPending: false
    })
    const actionPlan = resolveDeferredRepaginationActionPlan({
      result: {
        type: 'dispatch',
        dispatchType: 'split',
        candidateKey: 'split:10:2',
        progress: 'structural',
        transaction: {} as never,
        scheduleEvaluation: true
      },
      currentPageCount: 26,
      measuredPageCount: 26,
      structuralActionsPerformed: 1
    })

    expect(
      resolveDeferredRepaginationExecutionPlan({
        preflight,
        actionPlan,
        stabilizationAttemptsRemaining: 0,
        structuralActionsPerformed: 2
      })
    ).toMatchObject({
      type: 'dispatch',
      shouldScheduleEvaluation: false,
      outcomeDebug: {
        dispatchType: 'split',
        candidateKey: 'split:10:2',
        scheduleEvaluation: false
      },
      scheduleDebug: null
    })
  })
})

describe('resolveDeferredRepaginationControllerCycle', () => {
  it('runs refresh-gate fallback and returns the final request-refresh execution plan', () => {
    const preflight = resolveDeferredRepaginationPreflight({
      cappedPageCount: null,
      hasActiveEditor: false,
      hasTables: true,
      currentPageCount: 14,
      bodyBandCount: 14,
      stabilizationAttemptsRemaining: INITIAL_LAYOUT_STABILIZATION_MAX_ATTEMPTS,
      tableMeasurementsPending: false
    })
    const evaluate = jest.fn<TablePaginationControllerResult, [number]>().mockImplementation(measuredPageCount =>
      measuredPageCount === 14
        ? {
            type: 'request-refresh',
            progress: 'refresh',
            scheduleEvaluation: true
          }
        : {
            type: 'refresh',
            pageCount: 26,
            hasSplitPressure: true,
            progress: 'refresh',
            scheduleEvaluation: true
          }
    )

    const result = resolveDeferredRepaginationControllerCycle({
      currentPageCount: 14,
      measuredPageCount: 26,
      structuralActionsPerformed: 0,
      preflight,
      stabilizationAttemptsRemaining: INITIAL_LAYOUT_STABILIZATION_MAX_ATTEMPTS,
      evaluate
    })

    expect(result).toMatchObject({
      shouldApplyGrowthSuppression: true,
      refreshGateDebug: {
        deferred: true,
        nextPageCount: 26,
        hasSplitPressure: true,
        fallbackOutcome: 'request-refresh'
      },
      executionPlan: {
        type: 'request-refresh',
        refreshSource: 'table-pagination-request-refresh',
        shouldScheduleEvaluation: true
      }
    })

    expect(evaluate).toHaveBeenCalledTimes(2)
    expect(evaluate).toHaveBeenNthCalledWith(1, 26)
    expect(evaluate).toHaveBeenNthCalledWith(2, 14)
  })

  it('returns a dispatch execution plan directly when no refresh gate is needed', () => {
    const preflight = resolveDeferredRepaginationPreflight({
      cappedPageCount: null,
      hasActiveEditor: false,
      hasTables: true,
      currentPageCount: 26,
      bodyBandCount: 26,
      stabilizationAttemptsRemaining: INITIAL_LAYOUT_STABILIZATION_MAX_ATTEMPTS,
      tableMeasurementsPending: false
    })

    const result = resolveDeferredRepaginationControllerCycle({
      currentPageCount: 26,
      measuredPageCount: 26,
      structuralActionsPerformed: 1,
      preflight,
      stabilizationAttemptsRemaining: INITIAL_LAYOUT_STABILIZATION_MAX_ATTEMPTS,
      evaluate: () => ({
        type: 'dispatch',
        dispatchType: 'split',
        candidateKey: 'split:10:2',
        progress: 'structural',
        transaction: {} as never,
        scheduleEvaluation: true
      })
    })

    expect(result).toMatchObject({
      shouldApplyGrowthSuppression: false,
      refreshGateDebug: null,
      executionPlan: {
        type: 'dispatch',
        shouldContinueBatch: false,
        shouldScheduleEvaluation: true,
        outcomeDebug: {
          dispatchType: 'split',
          candidateKey: 'split:10:2'
        }
      }
    })
  })
})

describe('resolveImmediateTableStabilizationDecision', () => {
  it('schedules a follow-up pass after structural progress so the browser can yield', () => {
    expect(
      resolveImmediateTableStabilizationDecision({
        result: {
          type: 'dispatch',
          dispatchType: 'split',
          candidateKey: 'split:10:2',
          progress: 'structural',
          transaction: {} as never,
          scheduleEvaluation: true
        },
        actionsPerformed: 1,
        maxActionsPerPass: MAX_TABLE_STABILIZATION_ACTIONS_PER_PASS
      })
    ).toBe('schedule')
  })

  it('schedules a follow-up pass once the bounded action budget is exhausted', () => {
    expect(
      resolveImmediateTableStabilizationDecision({
        result: {
          type: 'dispatch',
          dispatchType: 'merge',
          candidateKey: 'pagination-split-1:10:20',
          progress: 'structural',
          transaction: {} as never,
          scheduleEvaluation: true
        },
        actionsPerformed: MAX_TABLE_STABILIZATION_ACTIONS_PER_PASS,
        maxActionsPerPass: MAX_TABLE_STABILIZATION_ACTIONS_PER_PASS
      })
    ).toBe('schedule')
  })

  it('stops immediately for bookkeeping-only outcomes', () => {
    expect(
      resolveImmediateTableStabilizationDecision({
        result: {
          type: 'none',
          progress: 'none',
          reason: 'repeat-successful-split-candidate'
        },
        actionsPerformed: 1,
        maxActionsPerPass: MAX_TABLE_STABILIZATION_ACTIONS_PER_PASS
      })
    ).toBe('stop')
  })
})

describe('resolveDeferredRepaginationActionPlan', () => {
  it('keeps refresh outcomes as follow-up refresh plans', () => {
    expect(
      resolveDeferredRepaginationActionPlan({
        result: {
          type: 'refresh',
          pageCount: 26,
          hasSplitPressure: true,
          progress: 'refresh',
          scheduleEvaluation: true
        },
        currentPageCount: 14,
        measuredPageCount: 26,
        structuralActionsPerformed: 0
      })
    ).toMatchObject({
      type: 'refresh',
      shouldScheduleFollowUp: true,
      result: {
        pageCount: 26,
        hasSplitPressure: true
      }
    })
  })

  it('converts structural dispatch outcomes into scheduled follow-up plans', () => {
    expect(
      resolveDeferredRepaginationActionPlan({
        result: {
          type: 'dispatch',
          dispatchType: 'split',
          candidateKey: 'split:10:2',
          progress: 'structural',
          transaction: {} as never,
          scheduleEvaluation: true
        },
        currentPageCount: 26,
        measuredPageCount: 26,
        structuralActionsPerformed: 1
      })
    ).toMatchObject({
      type: 'dispatch',
      maxActionsPerPass: MAX_TABLE_STABILIZATION_ACTIONS_PER_PASS,
      immediateDecision: 'schedule',
      shouldContinueBatch: false,
      shouldScheduleFollowUp: true
    })
  })

  it('converts structural dispatch outcomes into follow-up scheduling plans once budget is exhausted', () => {
    expect(
      resolveDeferredRepaginationActionPlan({
        result: {
          type: 'dispatch',
          dispatchType: 'merge',
          candidateKey: 'pagination-split-1:10:20',
          progress: 'structural',
          transaction: {} as never,
          scheduleEvaluation: true
        },
        currentPageCount: 26,
        measuredPageCount: 26,
        structuralActionsPerformed: MAX_TABLE_STABILIZATION_ACTIONS_PER_PASS
      })
    ).toMatchObject({
      type: 'dispatch',
      maxActionsPerPass: MAX_TABLE_STABILIZATION_ACTIONS_PER_PASS,
      immediateDecision: 'schedule',
      shouldContinueBatch: false,
      shouldScheduleFollowUp: true
    })
  })

  it('preserves terminal none outcomes without follow-up scheduling', () => {
    expect(
      resolveDeferredRepaginationActionPlan({
        result: {
          type: 'none',
          progress: 'none',
          reason: 'no-eligible-candidates'
        },
        currentPageCount: 26,
        measuredPageCount: 26,
        structuralActionsPerformed: 0
      })
    ).toMatchObject({
      type: 'none',
      result: {
        reason: 'no-eligible-candidates'
      }
    })
  })
})

describe('resolveTableStabilizationActionBudget', () => {
  it('keeps the default budget while page count is still unstable', () => {
    expect(
      resolveTableStabilizationActionBudget({
        currentPageCount: 14,
        measuredPageCount: 26,
        result: {
          type: 'dispatch',
          dispatchType: 'split',
          candidateKey: 'split:10:2',
          progress: 'structural',
          transaction: {} as never,
          scheduleEvaluation: true
        }
      })
    ).toBe(DEFAULT_TABLE_STABILIZATION_ACTIONS_PER_PASS)
  })

  it('raises the budget for stable structural table work', () => {
    expect(
      resolveTableStabilizationActionBudget({
        currentPageCount: 26,
        measuredPageCount: 26,
        result: {
          type: 'dispatch',
          dispatchType: 'split',
          candidateKey: 'split:10:2',
          progress: 'structural',
          transaction: {} as never,
          scheduleEvaluation: true
        }
      })
    ).toBe(MAX_TABLE_STABILIZATION_ACTIONS_PER_PASS)
  })

  it('falls back to the default budget for non-structural outcomes', () => {
    expect(
      resolveTableStabilizationActionBudget({
        currentPageCount: 13,
        measuredPageCount: 13,
        result: {
          type: 'none',
          progress: 'none',
          reason: 'no-eligible-candidates'
        }
      })
    ).toBe(DEFAULT_TABLE_STABILIZATION_ACTIONS_PER_PASS)
  })
})

describe('shouldDeferUpwardTableRefreshAcceptance', () => {
  it('defers upward refresh acceptance while split pressure still exists', () => {
    expect(
      shouldDeferUpwardTableRefreshAcceptance({
        currentPageCount: 14,
        result: {
          type: 'refresh',
          pageCount: 26,
          hasSplitPressure: true,
          progress: 'refresh',
          scheduleEvaluation: true
        }
      })
    ).toBe(true)
  })

  it('keeps immediate refresh acceptance when growth has no split pressure', () => {
    expect(
      shouldDeferUpwardTableRefreshAcceptance({
        currentPageCount: 14,
        result: {
          type: 'refresh',
          pageCount: 26,
          hasSplitPressure: false,
          progress: 'refresh',
          scheduleEvaluation: true
        }
      })
    ).toBe(false)
  })

  it('keeps downward refreshes immediate even when split heuristics are enabled', () => {
    expect(
      shouldDeferUpwardTableRefreshAcceptance({
        currentPageCount: 26,
        result: {
          type: 'refresh',
          pageCount: 14,
          hasSplitPressure: false,
          progress: 'refresh',
          scheduleEvaluation: true
        }
      })
    ).toBe(false)
  })
})

describe('resolveDeferredTableRefreshResult', () => {
  it('uses the fallback structural outcome before accepting upward growth', () => {
    const refreshResult = {
      type: 'refresh' as const,
      pageCount: 26,
      hasSplitPressure: true,
      progress: 'refresh' as const,
      scheduleEvaluation: true
    }
    const fallbackResult = {
      type: 'request-refresh' as const,
      progress: 'refresh' as const,
      scheduleEvaluation: true
    }

    expect(
      resolveDeferredTableRefreshResult({
        currentPageCount: 14,
        refreshResult,
        fallbackResult
      })
    ).toEqual({
      deferred: true,
      effectiveMeasuredPageCount: 14,
      result: fallbackResult
    })
  })

  it('accepts the larger page count once the bounded fallback pass cannot make progress', () => {
    const refreshResult = {
      type: 'refresh' as const,
      pageCount: 26,
      hasSplitPressure: true,
      progress: 'refresh' as const,
      scheduleEvaluation: true
    }

    expect(
      resolveDeferredTableRefreshResult({
        currentPageCount: 14,
        refreshResult,
        fallbackResult: {
          type: 'none',
          progress: 'none',
          reason: 'repeat-successful-split-candidate'
        }
      })
    ).toEqual({
      deferred: false,
      effectiveMeasuredPageCount: 26,
      result: refreshResult
    })
  })
})

describe('resolveDeferredRepaginationRefreshGate', () => {
  it('evaluates a fallback and applies growth suppression for upward refresh with split pressure', () => {
    const evaluateFallback = jest.fn(() => ({
      type: 'request-refresh' as const,
      progress: 'refresh' as const,
      scheduleEvaluation: true
    }))

    expect(
      resolveDeferredRepaginationRefreshGate({
        currentPageCount: 14,
        refreshResult: {
          type: 'refresh',
          pageCount: 26,
          hasSplitPressure: true,
          progress: 'refresh',
          scheduleEvaluation: true
        },
        evaluateFallback
      })
    ).toMatchObject({
      effectiveMeasuredPageCount: 14,
      shouldApplyGrowthSuppression: true,
      result: {
        type: 'request-refresh',
        scheduleEvaluation: true
      },
      debug: {
        deferred: true,
        fallbackOutcome: 'request-refresh',
        fallbackProgress: 'refresh',
        fallbackReason: null
      }
    })

    expect(evaluateFallback).toHaveBeenCalledTimes(1)
  })

  it('skips fallback evaluation when upward growth is not under split pressure', () => {
    const evaluateFallback = jest.fn(() => ({
      type: 'none' as const,
      progress: 'none' as const,
      reason: 'no-eligible-candidates' as const
    }))

    expect(
      resolveDeferredRepaginationRefreshGate({
        currentPageCount: 14,
        refreshResult: {
          type: 'refresh',
          pageCount: 26,
          hasSplitPressure: false,
          progress: 'refresh',
          scheduleEvaluation: true
        },
        evaluateFallback
      })
    ).toMatchObject({
      effectiveMeasuredPageCount: 26,
      shouldApplyGrowthSuppression: false,
      result: {
        type: 'refresh',
        pageCount: 26
      },
      debug: null
    })

    expect(evaluateFallback).not.toHaveBeenCalled()
  })
})

describe('resolvePaginationWidgetTotalPages', () => {
  it('holds the current page count when pagination-owned stabilization suppresses upward growth', () => {
    expect(
      resolvePaginationWidgetTotalPages({
        storedPageCount: 14,
        measuredPageCount: 26,
        growthSuppressionPageCount: 14
      })
    ).toBe(14)
  })

  it('clamps a previously promoted stored count back to the suppressed page count', () => {
    expect(
      resolvePaginationWidgetTotalPages({
        storedPageCount: 26,
        measuredPageCount: 26,
        growthSuppressionPageCount: 14
      })
    ).toBe(14)
  })

  it('allows the widget total to shrink under suppression when the measured page count drops', () => {
    expect(
      resolvePaginationWidgetTotalPages({
        storedPageCount: 14,
        measuredPageCount: 13,
        growthSuppressionPageCount: 14
      })
    ).toBe(13)
  })

  it('allows normal upward growth once suppression is cleared', () => {
    expect(
      resolvePaginationWidgetTotalPages({
        storedPageCount: 14,
        measuredPageCount: 26,
        growthSuppressionPageCount: null
      })
    ).toBe(26)
  })
})

describe('shouldScheduleDeferredRepaginationOnUpdate', () => {
  it('schedules deferred repagination after hydration-owned content loads', () => {
    expect(
      shouldScheduleDeferredRepaginationOnUpdate({
        activeEditorType: null,
        hasTables: true,
        externalDocChange: false,
        paginationOwnedDocChange: false,
        hydrationOwnedDocChange: true
      })
    ).toBe(true)
  })

  it('does not schedule deferred repagination for non-table pagination-owned changes', () => {
    expect(
      shouldScheduleDeferredRepaginationOnUpdate({
        activeEditorType: null,
        hasTables: false,
        externalDocChange: false,
        paginationOwnedDocChange: true,
        hydrationOwnedDocChange: false
      })
    ).toBe(false)
  })

  it('schedules deferred repagination for external doc changes regardless of tables', () => {
    expect(
      shouldScheduleDeferredRepaginationOnUpdate({
        activeEditorType: null,
        hasTables: false,
        externalDocChange: true,
        paginationOwnedDocChange: false,
        hydrationOwnedDocChange: false
      })
    ).toBe(true)
  })

  it('schedules deferred repagination for collaboration-remote changes', () => {
    expect(
      shouldScheduleDeferredRepaginationOnUpdate({
        activeEditorType: null,
        hasTables: false,
        externalDocChange: false,
        collaborationRemoteDocChange: true,
        paginationOwnedDocChange: false,
        hydrationOwnedDocChange: false
      })
    ).toBe(true)
  })

  it('does not schedule while a header or footer editor is active', () => {
    expect(
      shouldScheduleDeferredRepaginationOnUpdate({
        activeEditorType: 'header',
        hasTables: true,
        externalDocChange: true,
        paginationOwnedDocChange: false,
        hydrationOwnedDocChange: true
      })
    ).toBe(false)
  })
})

describe('resolvePaginationSelectionBodyOverflow', () => {
  function setRect(element: HTMLElement, rect: { top: number; bottom: number; left?: number; right?: number }) {
    Object.defineProperty(element, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: rect.left ?? 0,
        y: rect.top,
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left ?? 0,
        right: rect.right ?? 100,
        width: (rect.right ?? 100) - (rect.left ?? 0),
        height: rect.bottom - rect.top,
        toJSON: () => ''
      })
    })
  }

  it('returns null when the caret already sits inside the page body', () => {
    const editorDom = document.createElement('div')
    const bodyBand = document.createElement('div')

    bodyBand.className = 'rm-page-body-layer'
    bodyBand.dataset.rmPageNumber = '1'
    editorDom.appendChild(bodyBand)
    document.body.appendChild(editorDom)

    setRect(bodyBand, { top: 100, bottom: 300, left: 20, right: 180 })

    const view = {
      dom: editorDom,
      state: {
        selection: {
          empty: true,
          head: 5
        }
      },
      coordsAtPos: () => ({
        top: 140,
        bottom: 160,
        left: 60,
        right: 60
      })
    } as never

    expect(resolvePaginationSelectionBodyOverflow(view)).toBeNull()
  })

  it('clamps an empty-paragraph caret back into the nearest valid body band', () => {
    const editorDom = document.createElement('div')
    const bodyBand = document.createElement('div')

    bodyBand.className = 'rm-page-body-layer'
    bodyBand.dataset.rmPageNumber = '1'
    editorDom.appendChild(bodyBand)
    document.body.appendChild(editorDom)

    setRect(bodyBand, { top: 100, bottom: 300, left: 20, right: 180 })

    const view = {
      dom: editorDom,
      state: {
        selection: {
          empty: true,
          head: 5
        },
        doc: {
          resolve: (position: number) => ({
            parent: {
              type: {
                name: position === 8 ? 'doc' : 'paragraph'
              },
              content: {
                size: 0
              }
            },
            parentOffset: 0,
            nodeBefore: null,
            nodeAfter: null
          })
        }
      },
      coordsAtPos: (position: number) =>
        position === 8
          ? {
              top: 150,
              bottom: 170,
              left: 70,
              right: 70
            }
          : {
              top: 320,
              bottom: 338,
              left: 70,
              right: 70
            },
      posAtCoords: () => ({
        pos: 8
      })
    } as never

    expect(resolvePaginationSelectionBodyOverflow(view)).toEqual({ position: 8 })
  })

  it('routes footer-gap overflow to the next page body instead of snapping back to the previous page', () => {
    const editorDom = document.createElement('div')
    const firstBodyBand = document.createElement('div')
    const secondBodyBand = document.createElement('div')

    firstBodyBand.className = 'rm-page-body-layer'
    firstBodyBand.dataset.rmPageNumber = '1'
    secondBodyBand.className = 'rm-page-body-layer'
    secondBodyBand.dataset.rmPageNumber = '2'
    editorDom.append(firstBodyBand, secondBodyBand)
    document.body.appendChild(editorDom)

    setRect(firstBodyBand, { top: 100, bottom: 300, left: 20, right: 180 })
    setRect(secondBodyBand, { top: 380, bottom: 580, left: 20, right: 180 })

    const view = {
      dom: editorDom,
      state: {
        selection: {
          empty: true,
          head: 5
        },
        doc: {
          resolve: (position: number) => ({
            parent: {
              type: {
                name: position === 12 ? 'doc' : 'paragraph'
              },
              content: {
                size: 0
              }
            },
            parentOffset: 0,
            nodeBefore: null,
            nodeAfter: null
          })
        }
      },
      coordsAtPos: (position: number) =>
        position === 12
          ? {
              top: 430,
              bottom: 448,
              left: 70,
              right: 70
            }
          : {
              top: 330,
              bottom: 348,
              left: 70,
              right: 70
            },
      posAtCoords: ({ top }: { top: number }) => ({
        pos: top > 380 ? 12 : 7
      })
    } as never

    expect(resolvePaginationSelectionBodyOverflow(view, 'forward')).toEqual({ position: 12 })
  })

  it('waits for the next page body instead of snapping forward overflow back into the last visible page', () => {
    const editorDom = document.createElement('div')
    const firstBodyBand = document.createElement('div')

    firstBodyBand.className = 'rm-page-body-layer'
    firstBodyBand.dataset.rmPageNumber = '1'
    editorDom.append(firstBodyBand)
    document.body.appendChild(editorDom)

    setRect(firstBodyBand, { top: 100, bottom: 300, left: 20, right: 180 })

    const view = {
      dom: editorDom,
      state: {
        selection: {
          empty: true,
          head: 10
        },
        doc: {
          resolve: () => ({
            parent: {
              type: {
                name: 'paragraph'
              },
              content: {
                size: 5
              }
            },
            parentOffset: 2,
            nodeBefore: {
              textContent: 'a'
            },
            nodeAfter: {
              textContent: 'b'
            }
          })
        }
      },
      coordsAtPos: () => ({
        top: 330,
        bottom: 348,
        left: 70,
        right: 70
      }),
      posAtCoords: () => ({
        pos: 7
      })
    } as never

    expect(resolvePaginationSelectionBodyOverflow(view, 'forward')).toBeNull()
  })

  it('routes footer-gap overflow back to the previous page body when navigating backward', () => {
    const editorDom = document.createElement('div')
    const firstBodyBand = document.createElement('div')
    const secondBodyBand = document.createElement('div')

    firstBodyBand.className = 'rm-page-body-layer'
    firstBodyBand.dataset.rmPageNumber = '1'
    secondBodyBand.className = 'rm-page-body-layer'
    secondBodyBand.dataset.rmPageNumber = '2'
    editorDom.append(firstBodyBand, secondBodyBand)
    document.body.appendChild(editorDom)

    setRect(firstBodyBand, { top: 100, bottom: 300, left: 20, right: 180 })
    setRect(secondBodyBand, { top: 380, bottom: 580, left: 20, right: 180 })

    const view = {
      dom: editorDom,
      state: {
        selection: {
          empty: true,
          head: 15
        },
        doc: {
          resolve: (position: number) => ({
            parent: {
              type: {
                name: position === 7 ? 'doc' : 'paragraph'
              },
              content: {
                size: 0
              }
            },
            parentOffset: 0,
            nodeBefore: null,
            nodeAfter: null
          })
        }
      },
      coordsAtPos: (position: number) =>
        position === 7
          ? {
              top: 250,
              bottom: 268,
              left: 70,
              right: 70
            }
          : {
              top: 330,
              bottom: 348,
              left: 70,
              right: 70
            },
      posAtCoords: ({ top }: { top: number }) => ({
        pos: top < 320 ? 7 : 12
      })
    } as never

    expect(resolvePaginationSelectionBodyOverflow(view, 'backward')).toEqual({ position: 7 })
  })

  it('clamps overflow away from the excluded side of a square-right wrapped image', () => {
    const editorDom = document.createElement('div')
    const bodyBand = document.createElement('div')
    const imageAnchor = document.createElement('div')

    bodyBand.className = 'rm-page-body-layer'
    bodyBand.dataset.rmPageNumber = '1'
    imageAnchor.dataset.imageExclusionMode = 'square'
    imageAnchor.dataset.imageWrapTextSide = 'left'
    editorDom.append(bodyBand, imageAnchor)
    document.body.appendChild(editorDom)

    setRect(bodyBand, { top: 100, bottom: 300, left: 20, right: 180 })
    setRect(imageAnchor, { top: 140, bottom: 220, left: 120, right: 180 })

    const view = {
      dom: editorDom,
      state: {
        selection: {
          empty: true,
          head: 10
        },
        doc: {
          resolve: () => ({
            parent: {
              type: {
                name: 'paragraph'
              },
              content: {
                size: 5
              }
            },
            parentOffset: 2,
            nodeBefore: {
              textContent: 'a'
            },
            nodeAfter: {
              textContent: 'b'
            }
          })
        }
      },
      coordsAtPos: (position: number) =>
        position === 8
          ? {
              top: 170,
              bottom: 188,
              left: 72,
              right: 72
            }
          : {
              top: 170,
              bottom: 188,
              left: 150,
              right: 150
            },
      posAtCoords: ({ left }: { left: number }) => ({
        pos: left < 120 ? 8 : 9
      })
    } as never

    expect(resolvePaginationSelectionBodyOverflow(view)).toEqual({ position: 8 })
  })

  it('lands on the first line of the next page body when navigating forward across a page boundary', () => {
    const editorDom = document.createElement('div')
    const firstBodyBand = document.createElement('div')
    const secondBodyBand = document.createElement('div')

    firstBodyBand.className = 'rm-page-body-layer'
    firstBodyBand.dataset.rmPageNumber = '1'
    secondBodyBand.className = 'rm-page-body-layer'
    secondBodyBand.dataset.rmPageNumber = '2'
    editorDom.append(firstBodyBand, secondBodyBand)
    document.body.appendChild(editorDom)

    setRect(firstBodyBand, { top: 100, bottom: 300, left: 20, right: 180 })
    setRect(secondBodyBand, { top: 380, bottom: 580, left: 20, right: 180 })

    const view = {
      dom: editorDom,
      state: {
        selection: {
          empty: true,
          head: 10
        }
      },
      coordsAtPos: (position: number) =>
        position === 12
          ? {
              top: 384,
              bottom: 402,
              left: 70,
              right: 70
            }
          : position === 13
            ? {
                top: 414,
                bottom: 432,
                left: 70,
                right: 70
              }
            : {
                top: 330,
                bottom: 348,
                left: 70,
                right: 70
              },
      posAtCoords: ({ top }: { top: number }) => ({
        pos: top < 408 ? 12 : 13
      })
    } as never

    expect(resolvePaginationSelectionBodyOverflow(view, 'forward')).toEqual({ position: 12 })
  })

  it('lands on the last line of the previous page body when navigating backward across a page boundary', () => {
    const editorDom = document.createElement('div')
    const firstBodyBand = document.createElement('div')
    const secondBodyBand = document.createElement('div')

    firstBodyBand.className = 'rm-page-body-layer'
    firstBodyBand.dataset.rmPageNumber = '1'
    secondBodyBand.className = 'rm-page-body-layer'
    secondBodyBand.dataset.rmPageNumber = '2'
    editorDom.append(firstBodyBand, secondBodyBand)
    document.body.appendChild(editorDom)

    setRect(firstBodyBand, { top: 100, bottom: 300, left: 20, right: 180 })
    setRect(secondBodyBand, { top: 380, bottom: 580, left: 20, right: 180 })

    const view = {
      dom: editorDom,
      state: {
        selection: {
          empty: true,
          head: 15
        }
      },
      coordsAtPos: (position: number) =>
        position === 7
          ? {
              top: 280,
              bottom: 298,
              left: 70,
              right: 70
            }
          : position === 6
            ? {
                top: 250,
                bottom: 268,
                left: 70,
                right: 70
              }
            : {
                top: 330,
                bottom: 348,
                left: 70,
                right: 70
              },
      posAtCoords: ({ top }: { top: number }) => ({
        pos: top > 274 ? 7 : 6
      })
    } as never

    expect(resolvePaginationSelectionBodyOverflow(view, 'backward')).toEqual({ position: 7 })
  })
})

describe('resolvePaginationBodyClick', () => {
  function setRect(element: HTMLElement, rect: { top: number; bottom: number; left?: number; right?: number }) {
    Object.defineProperty(element, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: rect.left ?? 0,
        y: rect.top,
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left ?? 0,
        right: rect.right ?? 100,
        width: (rect.right ?? 100) - (rect.left ?? 0),
        height: rect.bottom - rect.top,
        toJSON: () => ''
      })
    })
  }

  it('maps a blank first-line click to the first paragraph even when coords lookup misses', () => {
    const editorDom = document.createElement('div')
    const bodyBand = document.createElement('div')

    bodyBand.className = 'rm-page-body-layer'
    bodyBand.dataset.rmPageNumber = '1'
    editorDom.appendChild(bodyBand)
    document.body.appendChild(editorDom)

    setRect(bodyBand, { top: 100, bottom: 300, left: 20, right: 180 })

    const view = {
      dom: editorDom,
      state: {
        selection: {
          empty: true
        },
        doc: {
          firstChild: {
            type: {
              name: 'paragraph'
            },
            content: {
              size: 0
            }
          },
          resolve: () => ({
            parent: {
              type: {
                name: 'paragraph'
              },
              content: {
                size: 0
              }
            },
            parentOffset: 0,
            nodeBefore: null,
            nodeAfter: null
          })
        }
      },
      coordsAtPos: () => ({
        top: 150,
        bottom: 168,
        left: 72,
        right: 72
      }),
      posAtCoords: () => null
    } as never

    expect(resolvePaginationBodyClick(view, 72, 158)).toEqual({ action: 'set', position: 1 })
  })

  it('maps a blank first-line click to the first paragraph even when it sits above the body band', () => {
    const editorDom = document.createElement('div')
    const bodyBand = document.createElement('div')

    bodyBand.className = 'rm-page-body-layer'
    bodyBand.dataset.rmPageNumber = '1'
    editorDom.appendChild(bodyBand)
    document.body.appendChild(editorDom)

    setRect(bodyBand, { top: 180, bottom: 320, left: 20, right: 180 })

    const view = {
      dom: editorDom,
      state: {
        selection: {
          empty: true
        },
        doc: {
          firstChild: {
            type: {
              name: 'paragraph'
            },
            content: {
              size: 0
            }
          },
          resolve: () => ({
            parent: {
              type: {
                name: 'paragraph'
              },
              content: {
                size: 0
              }
            },
            parentOffset: 0,
            nodeBefore: null,
            nodeAfter: null
          })
        }
      },
      coordsAtPos: () => ({
        top: 150,
        bottom: 168,
        left: 72,
        right: 72
      }),
      posAtCoords: () => null
    } as never

    expect(resolvePaginationBodyClick(view, 72, 158)).toEqual({ action: 'set', position: 1 })
  })

  it('collapses an existing range to the first paragraph when clicking an empty first line', () => {
    const editorDom = document.createElement('div')
    const bodyBand = document.createElement('div')

    bodyBand.className = 'rm-page-body-layer'
    bodyBand.dataset.rmPageNumber = '1'
    editorDom.appendChild(bodyBand)
    document.body.appendChild(editorDom)

    setRect(bodyBand, { top: 100, bottom: 300, left: 20, right: 180 })

    const view = {
      dom: editorDom,
      state: {
        selection: {
          empty: false,
          from: 1,
          to: 4
        },
        doc: {
          firstChild: {
            type: {
              name: 'paragraph'
            },
            content: {
              size: 0
            }
          },
          resolve: () => ({
            parent: {
              type: {
                name: 'paragraph'
              },
              content: {
                size: 0
              }
            },
            parentOffset: 0,
            nodeBefore: null,
            nodeAfter: null
          })
        }
      },
      coordsAtPos: () => ({
        top: 150,
        bottom: 168,
        left: 72,
        right: 72
      }),
      posAtCoords: () => ({
        pos: 2
      })
    } as never

    expect(resolvePaginationBodyClick(view, 72, 158)).toEqual({ action: 'set', position: 1 })
  })

  it('collapses an existing range to the clicked position inside the body band', () => {
    const editorDom = document.createElement('div')
    const bodyBand = document.createElement('div')

    bodyBand.className = 'rm-page-body-layer'
    bodyBand.dataset.rmPageNumber = '1'
    editorDom.appendChild(bodyBand)
    document.body.appendChild(editorDom)

    setRect(bodyBand, { top: 100, bottom: 300, left: 20, right: 180 })

    const view = {
      dom: editorDom,
      state: {
        selection: {
          empty: false
        },
        doc: {
          firstChild: {
            type: {
              name: 'paragraph'
            },
            content: {
              size: 5
            }
          },
          resolve: () => ({
            parent: {
              type: {
                name: 'paragraph'
              },
              content: {
                size: 5
              }
            },
            parentOffset: 2,
            nodeBefore: {
              textContent: 'a'
            },
            nodeAfter: {
              textContent: 'b'
            }
          })
        }
      },
      coordsAtPos: () => ({
        top: 150,
        bottom: 168,
        left: 72,
        right: 72
      }),
      posAtCoords: () => ({
        pos: 3
      })
    } as never

    expect(resolvePaginationBodyClick(view, 72, 158)).toEqual({ action: 'set', position: 3 })
  })

  it('maps a top-line click to the first line even when a non-empty paragraph sits above the body band', () => {
    const editorDom = document.createElement('div')
    const bodyBand = document.createElement('div')

    bodyBand.className = 'rm-page-body-layer'
    bodyBand.dataset.rmPageNumber = '1'
    editorDom.appendChild(bodyBand)
    document.body.appendChild(editorDom)

    setRect(bodyBand, { top: 180, bottom: 320, left: 20, right: 180 })

    const view = {
      dom: editorDom,
      state: {
        selection: {
          empty: true
        },
        doc: {
          firstChild: {
            type: {
              name: 'paragraph'
            },
            content: {
              size: 5
            }
          },
          resolve: () => ({
            parent: {
              type: {
                name: 'paragraph'
              },
              content: {
                size: 5
              }
            },
            parentOffset: 2,
            nodeBefore: {
              textContent: 'a'
            },
            nodeAfter: {
              textContent: 'b'
            }
          })
        }
      },
      coordsAtPos: () => ({
        top: 150,
        bottom: 168,
        left: 72,
        right: 72
      }),
      posAtCoords: ({ top }: { top: number }) => (top >= 150 && top <= 168 ? { pos: 3 } : null)
    } as never

    expect(resolvePaginationBodyClick(view, 72, 158)).toEqual({ action: 'set', position: 3 })
  })

  it('maps a click in the second visual line of the leading paragraph above the body band', () => {
    const editorDom = document.createElement('div')
    const bodyBand = document.createElement('div')

    bodyBand.className = 'rm-page-body-layer'
    bodyBand.dataset.rmPageNumber = '1'
    editorDom.appendChild(bodyBand)
    document.body.appendChild(editorDom)

    setRect(bodyBand, { top: 190, bottom: 320, left: 20, right: 180 })

    const view = {
      dom: editorDom,
      state: {
        selection: {
          empty: true
        },
        doc: {
          firstChild: {
            type: {
              name: 'paragraph'
            },
            content: {
              size: 5
            }
          },
          content: {
            size: 6
          },
          resolve: (position: number) => ({
            parent: {
              type: {
                name: 'paragraph'
              },
              content: {
                size: 5
              }
            },
            parentOffset: position <= 3 ? 2 : 5,
            nodeBefore: {
              textContent: 'a'
            },
            nodeAfter: position >= 6 ? null : { textContent: 'b' }
          })
        }
      },
      coordsAtPos: (position: number) =>
        position >= 6
          ? {
              top: 170,
              bottom: 188,
              left: 72,
              right: 72
            }
          : {
              top: 150,
              bottom: 168,
              left: 72,
              right: 72
            },
      posAtCoords: ({ top }: { top: number }) => {
        if (top >= 150 && top <= 168) {
          return { pos: 3 }
        }

        if (top >= 170 && top <= 188) {
          return { pos: 6 }
        }

        return null
      }
    } as never

    expect(resolvePaginationBodyClick(view, 72, 178)).toEqual({ action: 'set', position: 6 })
  })

  it('falls back to the first document position when top-line hit testing resolves to a lower line', () => {
    const editorDom = document.createElement('div')
    const bodyBand = document.createElement('div')

    bodyBand.className = 'rm-page-body-layer'
    bodyBand.dataset.rmPageNumber = '1'
    editorDom.appendChild(bodyBand)
    document.body.appendChild(editorDom)

    setRect(bodyBand, { top: 180, bottom: 320, left: 20, right: 180 })

    const view = {
      dom: editorDom,
      state: {
        selection: {
          empty: true
        },
        doc: {
          firstChild: {
            type: {
              name: 'paragraph'
            },
            content: {
              size: 5
            }
          },
          resolve: (position: number) => ({
            parent: {
              type: {
                name: 'paragraph'
              },
              content: {
                size: 5
              }
            },
            parentOffset: position === 1 ? 0 : 4,
            nodeBefore: position === 1 ? null : { textContent: 'a' },
            nodeAfter: position === 1 ? { textContent: 'b' } : null
          })
        }
      },
      coordsAtPos: (position: number) =>
        position === 1
          ? {
              top: 150,
              bottom: 168,
              left: 72,
              right: 72
            }
          : {
              top: 188,
              bottom: 206,
              left: 72,
              right: 72
            },
      posAtCoords: () => ({
        pos: 5
      })
    } as never

    expect(resolvePaginationBodyClick(view, 72, 158)).toEqual({ action: 'set', position: 1 })
  })

  it('allows native click handling for an existing text range even when no body band resolves', () => {
    const editorDom = document.createElement('div')
    const bodyBand = document.createElement('div')

    bodyBand.className = 'rm-page-body-layer'
    bodyBand.dataset.rmPageNumber = '1'
    editorDom.appendChild(bodyBand)
    document.body.appendChild(editorDom)

    setRect(bodyBand, { top: 100, bottom: 300, left: 20, right: 180 })

    const view = {
      dom: editorDom,
      state: {
        selection: {
          empty: false
        },
        doc: {
          firstChild: {
            type: {
              name: 'paragraph'
            },
            content: {
              size: 5
            }
          },
          resolve: () => ({
            parent: {
              type: {
                name: 'paragraph'
              },
              content: {
                size: 5
              }
            },
            parentOffset: 2,
            nodeBefore: {
              textContent: 'a'
            },
            nodeAfter: {
              textContent: 'b'
            }
          })
        }
      },
      coordsAtPos: () => ({
        top: 150,
        bottom: 168,
        left: 72,
        right: 72
      }),
      posAtCoords: () => ({
        pos: 3
      })
    } as never

    expect(resolvePaginationBodyClick(view, 72, 320)).toEqual({ action: 'allow' })
  })

  it('maps a blank last-page click to the document end when coords lookup misses', () => {
    const editorDom = document.createElement('div')
    const pageThirteenBodyBand = document.createElement('div')
    const pageFourteenBodyBand = document.createElement('div')

    pageThirteenBodyBand.className = 'rm-page-body-layer'
    pageThirteenBodyBand.dataset.rmPageNumber = '13'
    pageFourteenBodyBand.className = 'rm-page-body-layer'
    pageFourteenBodyBand.dataset.rmPageNumber = '14'
    editorDom.append(pageThirteenBodyBand, pageFourteenBodyBand)
    document.body.appendChild(editorDom)

    setRect(pageThirteenBodyBand, { top: 100, bottom: 220, left: 20, right: 180 })
    setRect(pageFourteenBodyBand, { top: 240, bottom: 360, left: 20, right: 180 })

    const view = {
      dom: editorDom,
      state: {
        selection: {
          empty: true
        },
        doc: {
          firstChild: {
            type: {
              name: 'paragraph'
            },
            content: {
              size: 5
            }
          },
          content: {
            size: 42
          },
          resolve: () => ({
            parent: {
              type: {
                name: 'paragraph'
              },
              content: {
                size: 5
              }
            },
            parentOffset: 5,
            nodeBefore: {
              textContent: 'a'
            },
            nodeAfter: null
          })
        }
      },
      coordsAtPos: (position: number) =>
        position === 42
          ? {
              top: 180,
              bottom: 198,
              left: 72,
              right: 72
            }
          : {
              top: 120,
              bottom: 138,
              left: 72,
              right: 72
            },
      posAtCoords: () => null
    } as never

    expect(resolvePaginationBodyClick(view, 72, 300)).toEqual({ action: 'set', position: 42 })
  })

  it('clamps clicks away from the excluded side of a square-right wrapped image', () => {
    const editorDom = document.createElement('div')
    const bodyBand = document.createElement('div')
    const imageAnchor = document.createElement('div')

    bodyBand.className = 'rm-page-body-layer'
    bodyBand.dataset.rmPageNumber = '1'
    imageAnchor.dataset.imageExclusionMode = 'square'
    imageAnchor.dataset.imageWrapTextSide = 'left'
    editorDom.append(bodyBand, imageAnchor)
    document.body.appendChild(editorDom)

    setRect(bodyBand, { top: 100, bottom: 300, left: 20, right: 180 })
    setRect(imageAnchor, { top: 140, bottom: 220, left: 120, right: 180 })

    const view = {
      dom: editorDom,
      state: {
        selection: {
          empty: true
        },
        doc: {
          firstChild: {
            type: {
              name: 'paragraph'
            },
            content: {
              size: 5
            }
          },
          resolve: () => ({
            parent: {
              type: {
                name: 'paragraph'
              },
              content: {
                size: 5
              }
            },
            parentOffset: 2,
            nodeBefore: {
              textContent: 'a'
            },
            nodeAfter: {
              textContent: 'b'
            }
          })
        }
      },
      coordsAtPos: (position: number) =>
        position === 3
          ? {
              top: 170,
              bottom: 188,
              left: 72,
              right: 72
            }
          : {
              top: 170,
              bottom: 188,
              left: 150,
              right: 150
            },
      posAtCoords: ({ left }: { left: number }) => ({
        pos: left < 120 ? 3 : 4
      })
    } as never

    expect(resolvePaginationBodyClick(view, 150, 176)).toEqual({ action: 'set', position: 3 })
  })
})

describe('createSafePaginationSelection', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('falls back to a valid paragraph selection when given a root-level position', () => {
    const element = document.createElement('div')
    document.body.appendChild(element)

    const editor = new Editor({
      element,
      extensions: [StarterKit],
      content: '<p>alpha</p>'
    })

    const selection = createSafePaginationSelection(editor.state.doc, 0)

    expect(selection.$from.parent.type.name).toBe('paragraph')
    expect(selection.from).toBeGreaterThanOrEqual(1)

    editor.destroy()
  })
})
