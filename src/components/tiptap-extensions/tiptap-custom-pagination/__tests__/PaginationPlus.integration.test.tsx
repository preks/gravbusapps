import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import {
  DEFAULT_TABLE_STABILIZATION_ACTIONS_PER_PASS,
  INITIAL_LAYOUT_STABILIZATION_MAX_ATTEMPTS,
  MAX_TABLE_STABILIZATION_ACTIONS_PER_PASS,
  createSafePaginationSelection,
  resolveRunawayPageGrowth,
  resolveDeferredRepaginationOutcome,
  resolveDeferredTableRefreshResult,
  resolveImmediateTableStabilizationDecision,
  resolvePaginationWidgetTotalPages,
  resolveTableStabilizationActionBudget,
  resolvePaginationBodyClick,
  resolvePaginationSelectionBodyOverflow,
  resolveTablePaginationHeuristics,
  shouldDeferUpwardTableRefreshAcceptance,
  shouldRetryDeferredRepaginationStabilization,
  shouldScheduleDeferredRepaginationOnUpdate,
  shouldDeferTablePaginationEvaluation
} from '../PaginationPlus'

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

describe('resolveImmediateTableStabilizationDecision', () => {
  it('continues batching while structural progress stays within the bounded action budget', () => {
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
    ).toBe('continue')
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

  it('still preserves the existing page count until a downward refresh is explicitly accepted', () => {
    expect(
      resolvePaginationWidgetTotalPages({
        storedPageCount: 14,
        measuredPageCount: 13,
        growthSuppressionPageCount: 14
      })
    ).toBe(14)
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
        externalDocChange: false,
        paginationOwnedDocChange: false,
        hydrationOwnedDocChange: true
      })
    ).toBe(true)
  })

  it('does not schedule while a header or footer editor is active', () => {
    expect(
      shouldScheduleDeferredRepaginationOnUpdate({
        activeEditorType: 'header',
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
