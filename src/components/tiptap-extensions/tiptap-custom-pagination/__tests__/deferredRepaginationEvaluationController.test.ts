import type { EditorView } from '@tiptap/pm/view'
import {
  LARGE_DOC_PAGE_YIELD_THRESHOLD,
  resolveDeferredRepaginationLoopTableState,
  runDeferredRepaginationEvaluationLoop
} from '../deferredRepaginationEvaluationController'
import { writePaginationLayoutTableFragments } from '../layoutTableFragmentsBridge'
import type { AddPagesMeasurementSnapshot, PaginationMeasuredHeights } from '../paginationPageCountPolicy'

function createMeasuredHeights(seed: number): PaginationMeasuredHeights {
  return {
    headerHeights: new Map([[1, seed]]),
    footerHeights: new Map([[1, seed + 1]])
  }
}

function createMeasurementState(options: {
  measured: PaginationMeasuredHeights
  currentPageCount: number
  rawMeasuredPageCount: number
  measuredPageCount: number
  cappedPageCount: number | null
  suppressionActive?: boolean
  pageCountReason?: 'add-pages' | 'trim-pages' | null
  lastMeasuredPageGap?: number | null
  nextAddPagesMeasurement?: AddPagesMeasurementSnapshot | null
}) {
  return {
    measured: options.measured,
    currentPageCount: options.currentPageCount,
    rawMeasuredPageCount: options.rawMeasuredPageCount,
    measuredPageCount: options.measuredPageCount,
    pageCountDebugInfo: null,
    runawayPageGrowthResolution: {
      effectivePageCount: options.measuredPageCount,
      cappedPageCount: options.cappedPageCount,
      suppressionActive: options.suppressionActive ?? false,
      runawayPageGrowthCheck: {
        shouldStabilize: options.suppressionActive ?? false,
        actualGapShrink: null,
        expectedGapShrink: null,
        gapShrinkRatio: null
      }
    },
    nextAddPagesMeasurement: options.nextAddPagesMeasurement ?? null,
    pageCountReason: options.pageCountReason ?? null,
    lastMeasuredPageGap: options.lastMeasuredPageGap ?? null
  }
}

function createBaseOptions() {
  const storage = {
    pageCount: 2,
    activeEditorType: null
  } as never
  const view = {
    isDestroyed: false,
    dom: document.createElement('div'),
    state: {
      doc: {},
      tr: {},
      selection: {}
    }
  } as never as EditorView
  let previousAddPagesMeasurement: AddPagesMeasurementSnapshot | null = null
  let runawayGrowthCapPageCount: number | null = null

  return {
    storage,
    view,
    getPreviousAddPagesMeasurement: () => previousAddPagesMeasurement,
    getRunawayGrowthCapPageCount: () => runawayGrowthCapPageCount,
    onSetPreviousAddPagesMeasurement: (next: AddPagesMeasurementSnapshot | null) => {
      previousAddPagesMeasurement = next
    },
    setRunawayGrowthCapPageCount: (pageCount: number | null) => {
      runawayGrowthCapPageCount = pageCount
    }
  }
}

describe('resolveDeferredRepaginationLoopTableState', () => {
  it('derives measured table page count and blocked preflight from the current body bands', () => {
    const result = resolveDeferredRepaginationLoopTableState({
      hasActiveEditor: false,
      hasTables: true,
      currentPageCount: 22,
      bodyBands: [
        { pageNumber: 1, top: 0, bottom: 800 },
        { pageNumber: 1, top: 0, bottom: 800 },
        { pageNumber: 2, top: 800, bottom: 1600 }
      ],
      stabilizationAttemptsRemaining: 2,
      getHasPendingTableMeasurements: () => false,
      cappedPageCount: null
    })

    expect(result.measuredTablePageCount).toBe(2)
    expect(result.preflight).toMatchObject({
      deferTableEvaluation: true,
      tableMeasurementsPending: false,
      isBlocked: true,
      shouldRetry: true
    })
  })

  it('turns table stabilization off while a header or footer editor is active', () => {
    const result = resolveDeferredRepaginationLoopTableState({
      hasActiveEditor: true,
      hasTables: true,
      currentPageCount: 22,
      bodyBands: [{ pageNumber: 1, top: 0, bottom: 800 }],
      stabilizationAttemptsRemaining: 2,
      getHasPendingTableMeasurements: () => true,
      cappedPageCount: null
    })

    expect(result.preflight).toMatchObject({
      tablePaginationHeuristics: {
        allowMerge: false,
        allowSplit: false
      },
      deferTableEvaluation: false,
      tableMeasurementsPending: false,
      isBlocked: false,
      shouldRetry: false
    })
  })
})

describe('runDeferredRepaginationEvaluationLoop', () => {
  it('returns immediately for destroyed views', () => {
    const base = createBaseOptions()
    ;(base.view as EditorView & { isDestroyed?: boolean }).isDestroyed = true

    expect(
      runDeferredRepaginationEvaluationLoop({
        view: base.view,
        evaluationId: 1,
        storage: base.storage,
        getRuntimeOptions: () => ({}) as never,
        syncStorageFromOptions: jest.fn(),
        syncRootPresentation: jest.fn(),
        getPreviousAddPagesMeasurement: base.getPreviousAddPagesMeasurement,
        getRunawayGrowthCapPageCount: base.getRunawayGrowthCapPageCount,
        setRunawayGrowthCapPageCount: base.setRunawayGrowthCapPageCount,
        setMeasuredHeights: jest.fn(),
        measureHeights: jest.fn(() => createMeasuredHeights(10)),
        documentHasTables: jest.fn(() => false),
        getBodyMeasurementBands: jest.fn(() => []),
        hasPendingTableMeasurements: jest.fn(() => false),
        getStabilizationAttemptsRemaining: jest.fn(() => 1),
        evaluateTablePagination: jest.fn(() => ({ type: 'none' as const })),
        onLogDebug: jest.fn(),
        onSetPreviousAddPagesMeasurement: base.onSetPreviousAddPagesMeasurement,
        onClearPreviousAddPagesMeasurement: jest.fn(),
        onSetGrowthSuppression: jest.fn(),
        onClearGrowthSuppression: jest.fn(),
        onDecrementStabilizationAttempts: jest.fn(),
        onScheduleEvaluation: jest.fn(),
        onRefreshLayoutBounds: jest.fn(),
        onResetStabilizationAttempts: jest.fn(),
        onRequestRefresh: jest.fn(),
        onDispatch: jest.fn()
      })
    ).toEqual({
      handled: false,
      iterations: 0,
      structuralActionsPerformed: 0
    })
  })

  it('avoids body-band scans when the document has no tables', () => {
    const base = createBaseOptions()
    const getBodyMeasurementBands = jest.fn(() => [{ pageNumber: 1, top: 0, bottom: 800 }])

    const result = runDeferredRepaginationEvaluationLoop({
      view: base.view,
      evaluationId: 11,
      storage: base.storage,
      getRuntimeOptions: () => ({}) as never,
      syncStorageFromOptions: jest.fn(),
      syncRootPresentation: jest.fn(),
      resolveMeasurementState: jest.fn(() =>
        createMeasurementState({
          measured: createMeasuredHeights(12),
          currentPageCount: 2,
          rawMeasuredPageCount: 2,
          measuredPageCount: 2,
          cappedPageCount: null
        })
      ),
      getPreviousAddPagesMeasurement: base.getPreviousAddPagesMeasurement,
      getRunawayGrowthCapPageCount: base.getRunawayGrowthCapPageCount,
      setRunawayGrowthCapPageCount: base.setRunawayGrowthCapPageCount,
      setMeasuredHeights: jest.fn(),
      measureHeights: jest.fn(() => createMeasuredHeights(12)),
      documentHasTables: jest.fn(() => false),
      getBodyMeasurementBands,
      hasPendingTableMeasurements: jest.fn(() => false),
      getStabilizationAttemptsRemaining: jest.fn(() => 1),
      runPass: jest.fn(() => ({
        handled: true,
        shouldContinueLoop: false,
        structuralActionsDelta: 0
      })),
      evaluateTablePagination: jest.fn(() => ({ type: 'none' as const })),
      onLogDebug: jest.fn(),
      onSetPreviousAddPagesMeasurement: base.onSetPreviousAddPagesMeasurement,
      onClearPreviousAddPagesMeasurement: jest.fn(),
      onSetGrowthSuppression: jest.fn(),
      onClearGrowthSuppression: jest.fn(),
      onDecrementStabilizationAttempts: jest.fn(),
      onScheduleEvaluation: jest.fn(),
      onRefreshLayoutBounds: jest.fn(),
      onResetStabilizationAttempts: jest.fn(),
      onRequestRefresh: jest.fn(),
      onDispatch: jest.fn()
    })

    expect(result.handled).toBe(true)
    expect(getBodyMeasurementBands).not.toHaveBeenCalled()
  })

  it('avoids pending table measurement scans while table evaluation is already deferred', () => {
    const base = createBaseOptions()
    const hasPendingTableMeasurements = jest.fn(() => true)

    const result = runDeferredRepaginationEvaluationLoop({
      view: base.view,
      evaluationId: 12,
      storage: base.storage,
      getRuntimeOptions: () => ({}) as never,
      syncStorageFromOptions: jest.fn(),
      syncRootPresentation: jest.fn(),
      resolveMeasurementState: jest.fn(() =>
        createMeasurementState({
          measured: createMeasuredHeights(14),
          currentPageCount: 3,
          rawMeasuredPageCount: 3,
          measuredPageCount: 3,
          cappedPageCount: null
        })
      ),
      getPreviousAddPagesMeasurement: base.getPreviousAddPagesMeasurement,
      getRunawayGrowthCapPageCount: base.getRunawayGrowthCapPageCount,
      setRunawayGrowthCapPageCount: base.setRunawayGrowthCapPageCount,
      setMeasuredHeights: jest.fn(),
      measureHeights: jest.fn(() => createMeasuredHeights(14)),
      documentHasTables: jest.fn(() => true),
      getBodyMeasurementBands: jest.fn(() => [{ pageNumber: 1, top: 0, bottom: 800 }]),
      hasPendingTableMeasurements,
      getStabilizationAttemptsRemaining: jest.fn(() => 1),
      runPass: jest.fn(() => ({
        handled: true,
        shouldContinueLoop: false,
        structuralActionsDelta: 0
      })),
      evaluateTablePagination: jest.fn(() => ({ type: 'none' as const })),
      onLogDebug: jest.fn(),
      onSetPreviousAddPagesMeasurement: base.onSetPreviousAddPagesMeasurement,
      onClearPreviousAddPagesMeasurement: jest.fn(),
      onSetGrowthSuppression: jest.fn(),
      onClearGrowthSuppression: jest.fn(),
      onDecrementStabilizationAttempts: jest.fn(),
      onScheduleEvaluation: jest.fn(),
      onRefreshLayoutBounds: jest.fn(),
      onResetStabilizationAttempts: jest.fn(),
      onRequestRefresh: jest.fn(),
      onDispatch: jest.fn()
    })

    expect(result.handled).toBe(true)
    expect(hasPendingTableMeasurements).not.toHaveBeenCalled()
  })

  it('avoids table layout scans while a header or footer editor is active', () => {
    const base = createBaseOptions()
    base.storage.activeEditorType = 'header'
    const getBodyMeasurementBands = jest.fn(() => [{ pageNumber: 1, top: 0, bottom: 800 }])
    const hasPendingTableMeasurements = jest.fn(() => true)

    const result = runDeferredRepaginationEvaluationLoop({
      view: base.view,
      evaluationId: 13,
      storage: base.storage,
      getRuntimeOptions: () => ({}) as never,
      syncStorageFromOptions: jest.fn(),
      syncRootPresentation: jest.fn(),
      resolveMeasurementState: jest.fn(() =>
        createMeasurementState({
          measured: createMeasuredHeights(16),
          currentPageCount: 3,
          rawMeasuredPageCount: 3,
          measuredPageCount: 3,
          cappedPageCount: null
        })
      ),
      getPreviousAddPagesMeasurement: base.getPreviousAddPagesMeasurement,
      getRunawayGrowthCapPageCount: base.getRunawayGrowthCapPageCount,
      setRunawayGrowthCapPageCount: base.setRunawayGrowthCapPageCount,
      setMeasuredHeights: jest.fn(),
      measureHeights: jest.fn(() => createMeasuredHeights(16)),
      documentHasTables: jest.fn(() => true),
      getBodyMeasurementBands,
      hasPendingTableMeasurements,
      getStabilizationAttemptsRemaining: jest.fn(() => 1),
      runPass: jest.fn(() => ({
        handled: true,
        shouldContinueLoop: false,
        structuralActionsDelta: 0
      })),
      evaluateTablePagination: jest.fn(() => ({ type: 'none' as const })),
      onLogDebug: jest.fn(),
      onSetPreviousAddPagesMeasurement: base.onSetPreviousAddPagesMeasurement,
      onClearPreviousAddPagesMeasurement: jest.fn(),
      onSetGrowthSuppression: jest.fn(),
      onClearGrowthSuppression: jest.fn(),
      onDecrementStabilizationAttempts: jest.fn(),
      onScheduleEvaluation: jest.fn(),
      onRefreshLayoutBounds: jest.fn(),
      onResetStabilizationAttempts: jest.fn(),
      onRequestRefresh: jest.fn(),
      onDispatch: jest.fn()
    })

    expect(result.handled).toBe(true)
    expect(getBodyMeasurementBands).not.toHaveBeenCalled()
    expect(hasPendingTableMeasurements).not.toHaveBeenCalled()
  })

  it('forwards layout table fragments into table pagination evaluation', () => {
    const base = createBaseOptions()
    const viewport = document.createElement('div')
    viewport.className = 'document-editor-viewport'
    viewport.appendChild(base.view.dom)
    writePaginationLayoutTableFragments(base.view.dom, {
      fragments: [
        {
          tablePos: 22,
          pageNumbers: [1, 2],
          rowCount: 8,
          paginationChainKey: 'chain-fragment-stable',
          paginationSplitId: null,
          fragmentIndex: 0,
          fragmentCount: 1
        }
      ],
      doc: base.view.state.doc as object,
      documentVersion: 2,
      layoutVersion: 3
    })
    const evaluateTablePagination = jest.fn(
      ({
        layoutTableFragmentsState
      }: {
        layoutTableFragmentsState: {
          fragments: Array<{ paginationChainKey: string; pageNumbers: number[] }>
          status: string
        }
      }) => {
        expect(layoutTableFragmentsState.status).toBe('ready')
        expect(layoutTableFragmentsState.fragments).toEqual([
          expect.objectContaining({
            tablePos: 22,
            pageNumbers: [1, 2],
            paginationChainKey: 'chain-fragment-stable',
            fragmentCount: 1
          })
        ])

        return {
          type: 'none' as const,
          progress: 'none' as const,
          reason: 'layout-fragment-pagination-satisfied' as const
        }
      }
    )

    const result = runDeferredRepaginationEvaluationLoop({
      view: base.view,
      evaluationId: 14,
      storage: base.storage,
      getRuntimeOptions: () => ({}) as never,
      syncStorageFromOptions: jest.fn(),
      syncRootPresentation: jest.fn(),
      resolveMeasurementState: jest.fn(() =>
        createMeasurementState({
          measured: createMeasuredHeights(18),
          currentPageCount: 2,
          rawMeasuredPageCount: 2,
          measuredPageCount: 2,
          cappedPageCount: null
        })
      ),
      getPreviousAddPagesMeasurement: base.getPreviousAddPagesMeasurement,
      getRunawayGrowthCapPageCount: base.getRunawayGrowthCapPageCount,
      setRunawayGrowthCapPageCount: base.setRunawayGrowthCapPageCount,
      setMeasuredHeights: jest.fn(),
      measureHeights: jest.fn(() => createMeasuredHeights(18)),
      documentHasTables: jest.fn(() => true),
      getBodyMeasurementBands: jest.fn(() => [{ pageNumber: 1, top: 0, bottom: 800 }]),
      hasPendingTableMeasurements: jest.fn(() => false),
      getStabilizationAttemptsRemaining: jest.fn(() => 1),
      runPass: jest.fn(({ evaluate }) => {
        evaluate(2)
        return {
          handled: true,
          shouldContinueLoop: false,
          structuralActionsDelta: 0
        }
      }),
      evaluateTablePagination,
      onLogDebug: jest.fn(),
      onSetPreviousAddPagesMeasurement: base.onSetPreviousAddPagesMeasurement,
      onClearPreviousAddPagesMeasurement: jest.fn(),
      onSetGrowthSuppression: jest.fn(),
      onClearGrowthSuppression: jest.fn(),
      onDecrementStabilizationAttempts: jest.fn(),
      onScheduleEvaluation: jest.fn(),
      onRefreshLayoutBounds: jest.fn(),
      onResetStabilizationAttempts: jest.fn(),
      onRequestRefresh: jest.fn(),
      onDispatch: jest.fn()
    })

    expect(result.handled).toBe(true)
    expect(evaluateTablePagination).toHaveBeenCalledTimes(1)
  })

  it('ignores bridged layout fragments when they belong to a stale document snapshot', () => {
    const base = createBaseOptions()
    const viewport = document.createElement('div')
    viewport.className = 'document-editor-viewport'
    viewport.appendChild(base.view.dom)
    writePaginationLayoutTableFragments(base.view.dom, {
      fragments: [
        {
          tablePos: 22,
          pageNumbers: [1, 2],
          rowCount: 8,
          paginationChainKey: 'chain-fragment-stale',
          paginationSplitId: null,
          fragmentIndex: 0,
          fragmentCount: 1
        }
      ],
      doc: {} as object,
      documentVersion: 2,
      layoutVersion: 3
    })
    const evaluateTablePagination = jest.fn(
      ({
        layoutTableFragmentsState
      }: {
        layoutTableFragmentsState: { fragments: Array<{ paginationChainKey: string }>; status: string }
      }) => {
        expect(layoutTableFragmentsState.status).toBe('stale-doc')
        expect(layoutTableFragmentsState.fragments).toEqual([])

        return {
          type: 'none' as const,
          progress: 'none' as const,
          reason: 'no-eligible-candidates' as const
        }
      }
    )

    const result = runDeferredRepaginationEvaluationLoop({
      view: base.view,
      evaluationId: 15,
      storage: base.storage,
      getRuntimeOptions: () => ({}) as never,
      syncStorageFromOptions: jest.fn(),
      syncRootPresentation: jest.fn(),
      resolveMeasurementState: jest.fn(() =>
        createMeasurementState({
          measured: createMeasuredHeights(20),
          currentPageCount: 2,
          rawMeasuredPageCount: 2,
          measuredPageCount: 2,
          cappedPageCount: null
        })
      ),
      getPreviousAddPagesMeasurement: base.getPreviousAddPagesMeasurement,
      getRunawayGrowthCapPageCount: base.getRunawayGrowthCapPageCount,
      setRunawayGrowthCapPageCount: base.setRunawayGrowthCapPageCount,
      setMeasuredHeights: jest.fn(),
      measureHeights: jest.fn(() => createMeasuredHeights(20)),
      documentHasTables: jest.fn(() => true),
      getBodyMeasurementBands: jest.fn(() => [{ pageNumber: 1, top: 0, bottom: 800 }]),
      hasPendingTableMeasurements: jest.fn(() => false),
      getStabilizationAttemptsRemaining: jest.fn(() => 1),
      runPass: jest.fn(({ evaluate }) => {
        evaluate(2)
        return {
          handled: true,
          shouldContinueLoop: false,
          structuralActionsDelta: 0
        }
      }),
      evaluateTablePagination,
      onLogDebug: jest.fn(),
      onSetPreviousAddPagesMeasurement: base.onSetPreviousAddPagesMeasurement,
      onClearPreviousAddPagesMeasurement: jest.fn(),
      onSetGrowthSuppression: jest.fn(),
      onClearGrowthSuppression: jest.fn(),
      onDecrementStabilizationAttempts: jest.fn(),
      onScheduleEvaluation: jest.fn(),
      onRefreshLayoutBounds: jest.fn(),
      onResetStabilizationAttempts: jest.fn(),
      onRequestRefresh: jest.fn(),
      onDispatch: jest.fn()
    })

    expect(result.handled).toBe(true)
    expect(evaluateTablePagination).toHaveBeenCalledTimes(1)
  })

  it('ignores bridged layout fragments when the viewport has moved to a newer layout version', () => {
    const base = createBaseOptions()
    const viewport = document.createElement('div')
    viewport.className = 'document-editor-viewport'
    viewport.dataset.layoutVersion = '4'
    viewport.dataset.layoutDocumentVersion = '2'
    viewport.appendChild(base.view.dom)
    writePaginationLayoutTableFragments(base.view.dom, {
      fragments: [
        {
          tablePos: 22,
          pageNumbers: [1, 2],
          rowCount: 8,
          paginationChainKey: 'chain-fragment-stale-layout',
          paginationSplitId: null,
          fragmentIndex: 0,
          fragmentCount: 1
        }
      ],
      doc: base.view.state.doc as object,
      documentVersion: 2,
      layoutVersion: 3
    })
    const evaluateTablePagination = jest.fn(
      ({
        layoutTableFragmentsState
      }: {
        layoutTableFragmentsState: {
          fragments: Array<{ paginationChainKey: string }>
          status: string
          layoutVersion: number | null
        }
      }) => {
        expect(layoutTableFragmentsState.status).toBe('stale-layout')
        expect(layoutTableFragmentsState.layoutVersion).toBe(3)
        expect(layoutTableFragmentsState.fragments).toEqual([])

        return {
          type: 'none' as const,
          progress: 'none' as const,
          reason: 'no-eligible-candidates' as const
        }
      }
    )

    const result = runDeferredRepaginationEvaluationLoop({
      view: base.view,
      evaluationId: 16,
      storage: base.storage,
      getRuntimeOptions: () => ({}) as never,
      syncStorageFromOptions: jest.fn(),
      syncRootPresentation: jest.fn(),
      resolveMeasurementState: jest.fn(() =>
        createMeasurementState({
          measured: createMeasuredHeights(22),
          currentPageCount: 2,
          rawMeasuredPageCount: 2,
          measuredPageCount: 2,
          cappedPageCount: null
        })
      ),
      getPreviousAddPagesMeasurement: base.getPreviousAddPagesMeasurement,
      getRunawayGrowthCapPageCount: base.getRunawayGrowthCapPageCount,
      setRunawayGrowthCapPageCount: base.setRunawayGrowthCapPageCount,
      setMeasuredHeights: jest.fn(),
      measureHeights: jest.fn(() => createMeasuredHeights(22)),
      documentHasTables: jest.fn(() => true),
      getBodyMeasurementBands: jest.fn(() => [{ pageNumber: 1, top: 0, bottom: 800 }]),
      hasPendingTableMeasurements: jest.fn(() => false),
      getStabilizationAttemptsRemaining: jest.fn(() => 1),
      runPass: jest.fn(({ evaluate }) => {
        evaluate(2)
        return {
          handled: true,
          shouldContinueLoop: false,
          structuralActionsDelta: 0
        }
      }),
      evaluateTablePagination,
      onLogDebug: jest.fn(),
      onSetPreviousAddPagesMeasurement: base.onSetPreviousAddPagesMeasurement,
      onClearPreviousAddPagesMeasurement: jest.fn(),
      onSetGrowthSuppression: jest.fn(),
      onClearGrowthSuppression: jest.fn(),
      onDecrementStabilizationAttempts: jest.fn(),
      onScheduleEvaluation: jest.fn(),
      onRefreshLayoutBounds: jest.fn(),
      onResetStabilizationAttempts: jest.fn(),
      onRequestRefresh: jest.fn(),
      onDispatch: jest.fn()
    })

    expect(result.handled).toBe(true)
    expect(evaluateTablePagination).toHaveBeenCalledTimes(1)
  })

  it('loops across structural passes and keeps controller state in sync', () => {
    const base = createBaseOptions()
    const measuredHeights: PaginationMeasuredHeights[] = []
    const syncStorageFromOptions = jest.fn()
    const syncRootPresentation = jest.fn()
    const onLogDebug = jest.fn()
    const resolveMeasurementState = jest
      .fn()
      .mockReturnValueOnce(
        createMeasurementState({
          measured: createMeasuredHeights(20),
          currentPageCount: 4,
          rawMeasuredPageCount: 6,
          measuredPageCount: 5,
          cappedPageCount: 5,
          suppressionActive: true,
          pageCountReason: 'add-pages',
          lastMeasuredPageGap: 120,
          nextAddPagesMeasurement: {
            currentPageCount: 4,
            measuredPageCount: 6,
            lastPageGap: 120,
            pageContentHeight: 800
          }
        })
      )
      .mockReturnValueOnce(
        createMeasurementState({
          measured: createMeasuredHeights(30),
          currentPageCount: 5,
          rawMeasuredPageCount: 5,
          measuredPageCount: 5,
          cappedPageCount: null
        })
      )
    const runPass = jest
      .fn()
      .mockReturnValueOnce({
        handled: false,
        shouldContinueLoop: true,
        structuralActionsDelta: 1
      })
      .mockReturnValueOnce({
        handled: true,
        shouldContinueLoop: false,
        structuralActionsDelta: 0
      })

    const result = runDeferredRepaginationEvaluationLoop({
      view: base.view,
      evaluationId: 7,
      storage: base.storage,
      getRuntimeOptions: () => ({ foo: 'bar' }) as never,
      syncStorageFromOptions,
      syncRootPresentation,
      resolveMeasurementState,
      getPreviousAddPagesMeasurement: base.getPreviousAddPagesMeasurement,
      getRunawayGrowthCapPageCount: base.getRunawayGrowthCapPageCount,
      setRunawayGrowthCapPageCount: base.setRunawayGrowthCapPageCount,
      setMeasuredHeights: measured => {
        measuredHeights.push(measured)
      },
      measureHeights: jest.fn(() => createMeasuredHeights(99)),
      documentHasTables: jest.fn(() => true),
      getBodyMeasurementBands: jest.fn(() => [
        { pageNumber: 1, top: 0, bottom: 800 },
        { pageNumber: 2, top: 800, bottom: 1600 }
      ]),
      hasPendingTableMeasurements: jest.fn(() => false),
      getStabilizationAttemptsRemaining: jest.fn(() => 3),
      runPass,
      evaluateTablePagination: jest.fn(() => ({ type: 'none' as const })),
      onLogDebug,
      onSetPreviousAddPagesMeasurement: base.onSetPreviousAddPagesMeasurement,
      onClearPreviousAddPagesMeasurement: jest.fn(),
      onSetGrowthSuppression: jest.fn(),
      onClearGrowthSuppression: jest.fn(),
      onDecrementStabilizationAttempts: jest.fn(),
      onScheduleEvaluation: jest.fn(),
      onRefreshLayoutBounds: jest.fn(),
      onResetStabilizationAttempts: jest.fn(),
      onRequestRefresh: jest.fn(),
      onDispatch: jest.fn()
    })

    expect(result).toEqual({
      handled: true,
      iterations: 2,
      structuralActionsPerformed: 1
    })
    expect(syncStorageFromOptions).toHaveBeenCalledTimes(2)
    expect(syncRootPresentation).toHaveBeenCalledTimes(2)
    expect(measuredHeights).toEqual([createMeasuredHeights(20), createMeasuredHeights(30)])
    expect(base.storage.pageCount).toBe(5)
    expect(base.getRunawayGrowthCapPageCount()).toBeNull()
    expect(onLogDebug).toHaveBeenCalledWith(
      'deferred-repagination-evaluation',
      expect.objectContaining({
        evaluationId: 7,
        loopIteration: 1,
        structuralActionsPerformed: 0,
        currentPageCount: 4
      })
    )
    expect(onLogDebug).toHaveBeenCalledWith(
      'deferred-repagination-evaluation',
      expect.objectContaining({
        evaluationId: 7,
        loopIteration: 2,
        structuralActionsPerformed: 1,
        currentPageCount: 5
      })
    )
    expect(runPass).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        evaluationId: 7,
        loopIteration: 2,
        structuralActionsPerformed: 1,
        currentPageCount: 5
      })
    )
  })

  it('settles after one structural table dispatch when the next stable pass reports layout-fragment satisfaction', () => {
    const base = createBaseOptions()
    const dispatchedTransaction = { steps: [] } as never
    const onDispatch = jest.fn()
    const evaluateTablePagination = jest
      .fn()
      .mockReturnValueOnce({
        type: 'dispatch' as const,
        dispatchType: 'split' as const,
        candidateKey: 'chain-fragment-split:split:22:4',
        progress: 'structural' as const,
        transaction: dispatchedTransaction,
        scheduleEvaluation: true
      })
      .mockReturnValueOnce({
        type: 'none' as const,
        progress: 'none' as const,
        reason: 'layout-fragment-pagination-satisfied' as const
      })
    const runPass = jest.fn(({ evaluate, onDispatch: passOnDispatch }) => {
      const result = evaluate(2)

      if (result.type === 'dispatch') {
        passOnDispatch(result.transaction)
        return {
          handled: false,
          shouldContinueLoop: true,
          structuralActionsDelta: 1
        }
      }

      return {
        handled: true,
        shouldContinueLoop: false,
        structuralActionsDelta: 0
      }
    })

    const result = runDeferredRepaginationEvaluationLoop({
      view: base.view,
      evaluationId: 17,
      storage: base.storage,
      getRuntimeOptions: () => ({}) as never,
      syncStorageFromOptions: jest.fn(),
      syncRootPresentation: jest.fn(),
      resolveMeasurementState: jest.fn(() =>
        createMeasurementState({
          measured: createMeasuredHeights(24),
          currentPageCount: 2,
          rawMeasuredPageCount: 2,
          measuredPageCount: 2,
          cappedPageCount: null
        })
      ),
      getPreviousAddPagesMeasurement: base.getPreviousAddPagesMeasurement,
      getRunawayGrowthCapPageCount: base.getRunawayGrowthCapPageCount,
      setRunawayGrowthCapPageCount: base.setRunawayGrowthCapPageCount,
      setMeasuredHeights: jest.fn(),
      measureHeights: jest.fn(() => createMeasuredHeights(24)),
      documentHasTables: jest.fn(() => true),
      getBodyMeasurementBands: jest.fn(() => [{ pageNumber: 1, top: 0, bottom: 800 }]),
      hasPendingTableMeasurements: jest.fn(() => false),
      getStabilizationAttemptsRemaining: jest.fn(() => 2),
      runPass,
      evaluateTablePagination,
      onLogDebug: jest.fn(),
      onSetPreviousAddPagesMeasurement: base.onSetPreviousAddPagesMeasurement,
      onClearPreviousAddPagesMeasurement: jest.fn(),
      onSetGrowthSuppression: jest.fn(),
      onClearGrowthSuppression: jest.fn(),
      onDecrementStabilizationAttempts: jest.fn(),
      onScheduleEvaluation: jest.fn(),
      onRefreshLayoutBounds: jest.fn(),
      onResetStabilizationAttempts: jest.fn(),
      onRequestRefresh: jest.fn(),
      onDispatch
    })

    expect(result).toEqual({
      handled: true,
      iterations: 2,
      structuralActionsPerformed: 1
    })
    expect(evaluateTablePagination).toHaveBeenCalledTimes(2)
    expect(onDispatch).toHaveBeenCalledTimes(1)
    expect(onDispatch).toHaveBeenCalledWith(dispatchedTransaction)
    expect(runPass).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        evaluationId: 17,
        loopIteration: 2,
        structuralActionsPerformed: 1,
        currentPageCount: 2
      })
    )
  })

  it('forwards growth suppression and refresh callbacks through the pass runtime', () => {
    const base = createBaseOptions()
    const onSetGrowthSuppression = jest.fn()
    const onRequestRefresh = jest.fn()

    runDeferredRepaginationEvaluationLoop({
      view: base.view,
      evaluationId: 9,
      storage: base.storage,
      getRuntimeOptions: () => ({}) as never,
      syncStorageFromOptions: jest.fn(),
      syncRootPresentation: jest.fn(),
      resolveMeasurementState: jest.fn(() =>
        createMeasurementState({
          measured: createMeasuredHeights(12),
          currentPageCount: 4,
          rawMeasuredPageCount: 7,
          measuredPageCount: 6,
          cappedPageCount: null
        })
      ),
      getPreviousAddPagesMeasurement: base.getPreviousAddPagesMeasurement,
      getRunawayGrowthCapPageCount: base.getRunawayGrowthCapPageCount,
      setRunawayGrowthCapPageCount: base.setRunawayGrowthCapPageCount,
      setMeasuredHeights: jest.fn(),
      measureHeights: jest.fn(() => createMeasuredHeights(12)),
      documentHasTables: jest.fn(() => true),
      getBodyMeasurementBands: jest.fn(() => [{ pageNumber: 1, top: 0, bottom: 800 }]),
      hasPendingTableMeasurements: jest.fn(() => false),
      getStabilizationAttemptsRemaining: jest.fn(() => 2),
      runPass: jest.fn(runPassOptions => {
        runPassOptions.onSetGrowthSuppression()
        runPassOptions.onRequestRefresh('table-pagination-refresh', 9)
        return {
          handled: true,
          shouldContinueLoop: false,
          structuralActionsDelta: 0
        }
      }),
      evaluateTablePagination: jest.fn(() => ({ type: 'none' as const })),
      onLogDebug: jest.fn(),
      onSetPreviousAddPagesMeasurement: base.onSetPreviousAddPagesMeasurement,
      onClearPreviousAddPagesMeasurement: jest.fn(),
      onSetGrowthSuppression,
      onClearGrowthSuppression: jest.fn(),
      onDecrementStabilizationAttempts: jest.fn(),
      onScheduleEvaluation: jest.fn(),
      onRefreshLayoutBounds: jest.fn(),
      onResetStabilizationAttempts: jest.fn(),
      onRequestRefresh,
      onDispatch: jest.fn()
    })

    expect(onSetGrowthSuppression).toHaveBeenCalledWith(4)
    expect(onRequestRefresh).toHaveBeenCalledWith(base.view, 'table-pagination-refresh', 9)
  })

  it('yields to onScheduleEvaluation after one iteration when shouldContinueLoop and page count is large', () => {
    const base = createBaseOptions()
    base.storage.pageCount = LARGE_DOC_PAGE_YIELD_THRESHOLD
    const onScheduleEvaluation = jest.fn()
    const runPass = jest.fn(() => ({
      handled: false,
      shouldContinueLoop: true,
      structuralActionsDelta: 0
    }))

    const result = runDeferredRepaginationEvaluationLoop({
      view: base.view,
      evaluationId: 99,
      storage: base.storage,
      getRuntimeOptions: () => ({}) as never,
      syncStorageFromOptions: jest.fn(),
      syncRootPresentation: jest.fn(),
      resolveMeasurementState: jest.fn(() =>
        createMeasurementState({
          measured: createMeasuredHeights(30),
          currentPageCount: LARGE_DOC_PAGE_YIELD_THRESHOLD,
          rawMeasuredPageCount: LARGE_DOC_PAGE_YIELD_THRESHOLD,
          measuredPageCount: LARGE_DOC_PAGE_YIELD_THRESHOLD,
          cappedPageCount: null
        })
      ),
      getPreviousAddPagesMeasurement: base.getPreviousAddPagesMeasurement,
      getRunawayGrowthCapPageCount: base.getRunawayGrowthCapPageCount,
      setRunawayGrowthCapPageCount: base.setRunawayGrowthCapPageCount,
      setMeasuredHeights: jest.fn(),
      measureHeights: jest.fn(() => createMeasuredHeights(30)),
      documentHasTables: jest.fn(() => false),
      getBodyMeasurementBands: jest.fn(() => []),
      hasPendingTableMeasurements: jest.fn(() => false),
      getStabilizationAttemptsRemaining: jest.fn(() => 2),
      runPass,
      evaluateTablePagination: jest.fn(() => ({ type: 'none' as const })),
      onLogDebug: jest.fn(),
      onSetPreviousAddPagesMeasurement: base.onSetPreviousAddPagesMeasurement,
      onClearPreviousAddPagesMeasurement: jest.fn(),
      onSetGrowthSuppression: jest.fn(),
      onClearGrowthSuppression: jest.fn(),
      onDecrementStabilizationAttempts: jest.fn(),
      onScheduleEvaluation,
      onRefreshLayoutBounds: jest.fn(),
      onResetStabilizationAttempts: jest.fn(),
      onRequestRefresh: jest.fn(),
      onDispatch: jest.fn()
    })

    expect(result).toEqual({
      handled: false,
      iterations: 1,
      structuralActionsPerformed: 0,
      deferred: true
    })
    expect(runPass).toHaveBeenCalledTimes(1)
    expect(onScheduleEvaluation).toHaveBeenCalledTimes(1)
    expect(onScheduleEvaluation).toHaveBeenCalledWith(base.view)
  })

  it('does not yield for small documents when shouldContinueLoop', () => {
    const base = createBaseOptions()
    const onScheduleEvaluation = jest.fn()
    let calls = 0
    const runPass = jest.fn(() => {
      calls += 1
      if (calls >= 3) {
        return { handled: true, shouldContinueLoop: false, structuralActionsDelta: 0 }
      }
      return { handled: false, shouldContinueLoop: true, structuralActionsDelta: 0 }
    })

    const result = runDeferredRepaginationEvaluationLoop({
      view: base.view,
      evaluationId: 100,
      storage: base.storage,
      getRuntimeOptions: () => ({}) as never,
      syncStorageFromOptions: jest.fn(),
      syncRootPresentation: jest.fn(),
      resolveMeasurementState: jest.fn(() =>
        createMeasurementState({
          measured: createMeasuredHeights(10),
          currentPageCount: 2,
          rawMeasuredPageCount: 2,
          measuredPageCount: 2,
          cappedPageCount: null
        })
      ),
      getPreviousAddPagesMeasurement: base.getPreviousAddPagesMeasurement,
      getRunawayGrowthCapPageCount: base.getRunawayGrowthCapPageCount,
      setRunawayGrowthCapPageCount: base.setRunawayGrowthCapPageCount,
      setMeasuredHeights: jest.fn(),
      measureHeights: jest.fn(() => createMeasuredHeights(10)),
      documentHasTables: jest.fn(() => false),
      getBodyMeasurementBands: jest.fn(() => []),
      hasPendingTableMeasurements: jest.fn(() => false),
      getStabilizationAttemptsRemaining: jest.fn((): number => 5),
      runPass,
      evaluateTablePagination: jest.fn(() => ({ type: 'none' as const })),
      onLogDebug: jest.fn(),
      onSetPreviousAddPagesMeasurement: base.onSetPreviousAddPagesMeasurement,
      onClearPreviousAddPagesMeasurement: jest.fn(),
      onSetGrowthSuppression: jest.fn(),
      onClearGrowthSuppression: jest.fn(),
      onDecrementStabilizationAttempts: jest.fn(),
      onScheduleEvaluation,
      onRefreshLayoutBounds: jest.fn(),
      onResetStabilizationAttempts: jest.fn(),
      onRequestRefresh: jest.fn(),
      onDispatch: jest.fn()
    })

    expect(result.handled).toBe(true)
    expect(result.iterations).toBe(3)
    expect(result.deferred).toBeUndefined()
    expect(onScheduleEvaluation).not.toHaveBeenCalled()
    expect(runPass).toHaveBeenCalledTimes(3)
  })
})
