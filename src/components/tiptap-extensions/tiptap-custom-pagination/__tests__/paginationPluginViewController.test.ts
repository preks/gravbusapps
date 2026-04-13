import type { Node as PMNode } from 'prosemirror-model'
import {
  resolveSelectionNavigationDirection,
  runPaginationPluginViewUpdate,
  type PaginationPluginViewRuntimeState
} from '../paginationPluginViewController'

function createDoc(label: string) {
  return { label } as unknown as PMNode
}

function createBaseState(overrides?: Partial<PaginationPluginViewRuntimeState>): PaginationPluginViewRuntimeState {
  return {
    lastKnownDoc: null,
    lastKnownSelectionHead: null,
    previousAddPagesMeasurement: { currentPageCount: 1, measuredPageCount: 2, lastPageGap: 10, pageContentHeight: 100 },
    runawayGrowthCapPageCount: 5,
    pendingRefreshDrivenStabilization: false,
    lastDocChangeOrigin: null,
    lastDocChangeAnalysis: null,
    suppressPaginationOwnedDeferredScheduling: false,
    ...overrides
  }
}

function createHarness(options?: {
  state?: Partial<PaginationPluginViewRuntimeState>
  activeEditorType?: 'header' | 'footer' | null
  currentDoc?: PMNode
  currentSelectionHead?: number
  composing?: boolean
  selectionOverflow?: { position: number } | null
  measurementState?: { currentPageCount: number; measuredPageCount: number }
  hasTables?: boolean
}) {
  const currentDoc = options?.currentDoc ?? createDoc('next')
  const currentSelectionHead = options?.currentSelectionHead ?? 10
  const currentSelection = {
    head: currentSelectionHead,
    eq: jest.fn().mockReturnValue(false)
  }
  const view = {
    state: {
      doc: currentDoc,
      selection: currentSelection,
      tr: {
        setSelection: jest.fn().mockReturnThis()
      }
    },
    composing: options?.composing ?? false
  } as never

  const callbacks = {
    onDispatchSelection: jest.fn(),
    onResetTableController: jest.fn(),
    onClearGrowthSuppression: jest.fn(),
    onSetStoredPageCount: jest.fn(),
    onRequestRefresh: jest.fn(),
    onScheduleDeferredRepagination: jest.fn(),
    onRefreshLayoutBounds: jest.fn(),
    onLogSelectionOverflowRefresh: jest.fn()
  }

  const selectionFactory = (doc: PMNode, position: number, bias: 1 | -1) => ({
    doc,
    position,
    bias
  })

  return {
    view,
    currentDoc,
    currentSelection,
    state: createBaseState(options?.state),
    storage: {
      activeEditorType: options?.activeEditorType ?? null
    },
    selectionOverflow: options?.selectionOverflow ?? null,
    measurementState: options?.measurementState ?? { currentPageCount: 2, measuredPageCount: 2 },
    hasTables: options?.hasTables ?? false,
    callbacks,
    selectionFactory
  }
}

describe('resolveSelectionNavigationDirection', () => {
  it('returns null when the selection did not move', () => {
    expect(resolveSelectionNavigationDirection(5, 5)).toBeNull()
  })

  it('returns forward/backward when the selection moved', () => {
    expect(resolveSelectionNavigationDirection(5, 8)).toBe('forward')
    expect(resolveSelectionNavigationDirection(8, 5)).toBe('backward')
  })
})

describe('runPaginationPluginViewUpdate', () => {
  it('refreshes via page-count-grow when measurement detects page growth', () => {
    const harness = createHarness({
      state: {
        lastKnownDoc: createDoc('prev'),
        lastKnownSelectionHead: 4
      },
      selectionOverflow: { position: 15 },
      measurementState: { currentPageCount: 2, measuredPageCount: 3 }
    })

    const nextState = runPaginationPluginViewUpdate({
      view: harness.view,
      storage: harness.storage,
      state: harness.state,
      documentHasTables: () => false,
      resolveSelectionOverflow: () => harness.selectionOverflow,
      resolveMeasurementState: () => harness.measurementState,
      currentSelection: harness.currentSelection,
      createSelection: harness.selectionFactory,
      selectionsEqual: () => false,
      getDeferredStabilizationAttemptCount: () => 4,
      shouldScheduleDeferredRepaginationOnUpdate: () => false,
      ...harness.callbacks
    })

    expect(harness.callbacks.onClearGrowthSuppression).toHaveBeenCalledTimes(2)
    expect(harness.callbacks.onSetStoredPageCount).toHaveBeenCalledWith(3)
    expect(harness.callbacks.onRequestRefresh).toHaveBeenCalledWith('page-count-grow')
    expect(harness.callbacks.onRefreshLayoutBounds).not.toHaveBeenCalled()
    expect(nextState.lastKnownDoc).toBe(harness.currentDoc)
    expect(nextState.lastKnownSelectionHead).toBe(10)
  })

  it('defers selection-overflow growth refreshes for table documents', () => {
    const sameDoc = createDoc('same')
    const harness = createHarness({
      state: {
        lastKnownDoc: sameDoc,
        lastKnownSelectionHead: 4
      },
      currentDoc: sameDoc,
      currentSelectionHead: 10,
      selectionOverflow: { position: 15 },
      measurementState: { currentPageCount: 2, measuredPageCount: 3 },
      hasTables: true
    })

    const nextState = runPaginationPluginViewUpdate({
      view: harness.view,
      storage: harness.storage,
      state: harness.state,
      documentHasTables: () => true,
      resolveSelectionOverflow: () => harness.selectionOverflow,
      resolveMeasurementState: () => harness.measurementState,
      currentSelection: harness.currentSelection,
      createSelection: harness.selectionFactory,
      selectionsEqual: () => false,
      getDeferredStabilizationAttemptCount: () => 4,
      shouldScheduleDeferredRepaginationOnUpdate: () => false,
      ...harness.callbacks
    })

    expect(harness.callbacks.onSetStoredPageCount).not.toHaveBeenCalled()
    expect(harness.callbacks.onRequestRefresh).not.toHaveBeenCalled()
    expect(harness.callbacks.onScheduleDeferredRepagination).toHaveBeenCalledWith(4)
    expect(harness.callbacks.onRefreshLayoutBounds).toHaveBeenCalledTimes(1)
    expect(nextState.lastKnownDoc).toBe(harness.currentDoc)
    expect(nextState.lastKnownSelectionHead).toBe(10)
  })

  it('repositions the selection and schedules deferred repagination when overflow stays within page count', () => {
    const harness = createHarness({
      state: {
        lastKnownDoc: createDoc('prev'),
        lastKnownSelectionHead: 14,
        lastDocChangeOrigin: 'hydration-owned'
      },
      currentSelectionHead: 12,
      selectionOverflow: { position: 7 },
      measurementState: { currentPageCount: 2, measuredPageCount: 2 }
    })

    const nextState = runPaginationPluginViewUpdate({
      view: harness.view,
      storage: harness.storage,
      state: harness.state,
      documentHasTables: () => false,
      resolveSelectionOverflow: () => harness.selectionOverflow,
      resolveMeasurementState: () => harness.measurementState,
      currentSelection: harness.currentSelection,
      createSelection: harness.selectionFactory,
      selectionsEqual: () => false,
      getDeferredStabilizationAttemptCount: () => 4,
      shouldScheduleDeferredRepaginationOnUpdate: () => false,
      ...harness.callbacks
    })

    expect(harness.callbacks.onDispatchSelection).toHaveBeenCalledWith({
      doc: harness.currentDoc,
      position: 7,
      bias: -1
    })
    expect(harness.callbacks.onScheduleDeferredRepagination).toHaveBeenCalledWith()
    expect(harness.callbacks.onRefreshLayoutBounds).toHaveBeenCalledTimes(1)
    expect(nextState.lastKnownSelectionHead).toBe(12)
  })

  it('updates the selection head bookkeeping even when overflow resolves without dispatching', () => {
    const harness = createHarness({
      state: {
        lastKnownDoc: createDoc('prev'),
        lastKnownSelectionHead: 4
      },
      currentSelectionHead: 11,
      selectionOverflow: { position: 11 },
      measurementState: { currentPageCount: 2, measuredPageCount: 2 }
    })

    const nextState = runPaginationPluginViewUpdate({
      view: harness.view,
      storage: harness.storage,
      state: harness.state,
      documentHasTables: () => false,
      resolveSelectionOverflow: () => harness.selectionOverflow,
      resolveMeasurementState: () => harness.measurementState,
      currentSelection: harness.currentSelection,
      createSelection: harness.selectionFactory,
      selectionsEqual: () => true,
      getDeferredStabilizationAttemptCount: () => 4,
      shouldScheduleDeferredRepaginationOnUpdate: () => false,
      ...harness.callbacks
    })

    expect(harness.callbacks.onDispatchSelection).not.toHaveBeenCalled()
    expect(harness.callbacks.onRefreshLayoutBounds).toHaveBeenCalledTimes(1)
    expect(nextState.lastKnownSelectionHead).toBe(11)
  })

  it('resets controller state on external doc changes and consumes pending stabilization', () => {
    const previousDoc = createDoc('prev')
    const harness = createHarness({
      state: {
        lastKnownDoc: previousDoc,
        lastKnownSelectionHead: 3,
        pendingRefreshDrivenStabilization: true,
        runawayGrowthCapPageCount: 9
      },
      hasTables: false
    })

    const nextState = runPaginationPluginViewUpdate({
      view: harness.view,
      storage: harness.storage,
      state: harness.state,
      documentHasTables: () => false,
      resolveSelectionOverflow: () => null,
      resolveMeasurementState: () => harness.measurementState,
      currentSelection: harness.currentSelection,
      createSelection: harness.selectionFactory,
      selectionsEqual: () => false,
      getDeferredStabilizationAttemptCount: () => 6,
      shouldScheduleDeferredRepaginationOnUpdate: () => false,
      ...harness.callbacks
    })

    expect(harness.callbacks.onResetTableController).toHaveBeenCalledTimes(1)
    expect(harness.callbacks.onClearGrowthSuppression).toHaveBeenCalledTimes(1)
    expect(harness.callbacks.onScheduleDeferredRepagination).toHaveBeenCalledWith(6)
    expect(nextState.previousAddPagesMeasurement).toBeNull()
    expect(nextState.runawayGrowthCapPageCount).toBeNull()
    expect(nextState.pendingRefreshDrivenStabilization).toBe(false)
    expect(nextState.lastKnownSelectionHead).toBe(10)
    expect(harness.callbacks.onRefreshLayoutBounds).toHaveBeenCalledTimes(1)
  })

  it('does not reset controller state for table-metadata-owned layout-neutral doc changes', () => {
    const previousDoc = createDoc('prev')
    const harness = createHarness({
      state: {
        lastKnownDoc: previousDoc,
        lastKnownSelectionHead: 3,
        lastDocChangeOrigin: 'table-metadata-owned',
        lastDocChangeAnalysis: {
          kind: 'structure',
          changedRanges: [{ from: 5, to: 8 }],
          touchesTable: false,
          touchesTableAdjacentContent: false,
          touchesTableRegion: false,
          isLayoutNeutral: true,
          shouldScheduleSettledRefresh: false
        }
      },
      currentDoc: createDoc('next'),
      currentSelectionHead: 3,
      hasTables: true
    })

    const nextState = runPaginationPluginViewUpdate({
      view: harness.view,
      storage: harness.storage,
      state: harness.state,
      documentHasTables: () => true,
      resolveSelectionOverflow: () => null,
      resolveMeasurementState: () => harness.measurementState,
      currentSelection: harness.currentSelection,
      createSelection: harness.selectionFactory,
      selectionsEqual: () => false,
      getDeferredStabilizationAttemptCount: () => 6,
      shouldScheduleDeferredRepaginationOnUpdate: () => false,
      ...harness.callbacks
    })

    expect(harness.callbacks.onResetTableController).not.toHaveBeenCalled()
    expect(harness.callbacks.onClearGrowthSuppression).not.toHaveBeenCalled()
    expect(harness.callbacks.onScheduleDeferredRepagination).not.toHaveBeenCalled()
    expect(harness.callbacks.onRefreshLayoutBounds).not.toHaveBeenCalled()
    expect(nextState.previousAddPagesMeasurement).toEqual(harness.state.previousAddPagesMeasurement)
    expect(nextState.runawayGrowthCapPageCount).toBe(harness.state.runawayGrowthCapPageCount)
  })

  it('passes doc-change-reset state into overflow measurement resolution', () => {
    const previousDoc = createDoc('prev')
    const harness = createHarness({
      state: {
        lastKnownDoc: previousDoc,
        lastKnownSelectionHead: 3,
        previousAddPagesMeasurement: {
          currentPageCount: 2,
          measuredPageCount: 5,
          lastPageGap: 12,
          pageContentHeight: 300
        },
        runawayGrowthCapPageCount: 7
      },
      selectionOverflow: { position: 11 },
      measurementState: { currentPageCount: 2, measuredPageCount: 2 }
    })
    const resolveMeasurementState = jest.fn(() => harness.measurementState)

    runPaginationPluginViewUpdate({
      view: harness.view,
      storage: harness.storage,
      state: harness.state,
      documentHasTables: () => false,
      resolveSelectionOverflow: () => harness.selectionOverflow,
      resolveMeasurementState,
      currentSelection: harness.currentSelection,
      createSelection: harness.selectionFactory,
      selectionsEqual: () => true,
      getDeferredStabilizationAttemptCount: () => 6,
      shouldScheduleDeferredRepaginationOnUpdate: () => false,
      ...harness.callbacks
    })

    expect(resolveMeasurementState).toHaveBeenCalledWith(
      expect.objectContaining({
        previousAddPagesMeasurement: null,
        runawayGrowthCapPageCount: null
      })
    )
  })

  it('accepts immediate page-count shrink on doc changes and refreshes pagination', () => {
    const previousDoc = createDoc('prev')
    const harness = createHarness({
      state: {
        lastKnownDoc: previousDoc,
        lastKnownSelectionHead: 3
      },
      currentDoc: createDoc('next'),
      measurementState: { currentPageCount: 14, measuredPageCount: 13 }
    })

    const nextState = runPaginationPluginViewUpdate({
      view: harness.view,
      storage: harness.storage,
      state: harness.state,
      documentHasTables: () => false,
      resolveSelectionOverflow: () => null,
      resolveMeasurementState: () => harness.measurementState,
      currentSelection: harness.currentSelection,
      createSelection: harness.selectionFactory,
      selectionsEqual: () => false,
      getDeferredStabilizationAttemptCount: () => 6,
      shouldScheduleDeferredRepaginationOnUpdate: () => false,
      ...harness.callbacks
    })

    expect(harness.callbacks.onSetStoredPageCount).toHaveBeenCalledWith(13)
    expect(harness.callbacks.onRequestRefresh).toHaveBeenCalledWith('page-count-shrink')
    expect(harness.callbacks.onRefreshLayoutBounds).not.toHaveBeenCalled()
    expect(nextState.lastKnownSelectionHead).toBe(10)
  })

  it('defers overflow correction while a doc change settles without caret navigation', () => {
    const previousDoc = createDoc('prev')
    const harness = createHarness({
      state: {
        lastKnownDoc: previousDoc,
        lastKnownSelectionHead: 10
      },
      currentDoc: createDoc('next'),
      currentSelectionHead: 10,
      selectionOverflow: { position: 7 }
    })
    const resolveSelectionOverflow = jest.fn(() => harness.selectionOverflow)

    runPaginationPluginViewUpdate({
      view: harness.view,
      storage: harness.storage,
      state: harness.state,
      documentHasTables: () => false,
      resolveSelectionOverflow,
      resolveMeasurementState: () => harness.measurementState,
      currentSelection: harness.currentSelection,
      createSelection: harness.selectionFactory,
      selectionsEqual: () => false,
      getDeferredStabilizationAttemptCount: () => 6,
      shouldScheduleDeferredRepaginationOnUpdate: () => false,
      ...harness.callbacks
    })

    expect(resolveSelectionOverflow).not.toHaveBeenCalled()
    expect(harness.callbacks.onDispatchSelection).not.toHaveBeenCalled()
    expect(harness.callbacks.onRequestRefresh).not.toHaveBeenCalled()
    expect(harness.callbacks.onRefreshLayoutBounds).toHaveBeenCalledTimes(1)
  })

  it('refreshes via page-count-grow on the initial view update when a non-table document opens with a stale low page count', () => {
    const harness = createHarness({
      state: {
        lastKnownDoc: null,
        lastKnownSelectionHead: null
      },
      measurementState: { currentPageCount: 41, measuredPageCount: 42 },
      hasTables: false
    })

    const nextState = runPaginationPluginViewUpdate({
      view: harness.view,
      storage: harness.storage,
      state: harness.state,
      documentHasTables: () => false,
      resolveSelectionOverflow: () => null,
      resolveMeasurementState: () => harness.measurementState,
      currentSelection: harness.currentSelection,
      createSelection: harness.selectionFactory,
      selectionsEqual: () => false,
      getDeferredStabilizationAttemptCount: () => 5,
      shouldScheduleDeferredRepaginationOnUpdate: () => false,
      ...harness.callbacks
    })

    expect(harness.callbacks.onSetStoredPageCount).toHaveBeenCalledWith(42)
    expect(harness.callbacks.onRequestRefresh).toHaveBeenCalledWith('page-count-grow')
    expect(harness.callbacks.onScheduleDeferredRepagination).not.toHaveBeenCalled()
    expect(harness.callbacks.onRefreshLayoutBounds).not.toHaveBeenCalled()
    expect(nextState.lastKnownSelectionHead).toBe(10)
  })

  it('refreshes via page-count-shrink on the initial view update when a non-table document opens with a stale high page count', () => {
    const harness = createHarness({
      state: {
        lastKnownDoc: null,
        lastKnownSelectionHead: null
      },
      measurementState: { currentPageCount: 42, measuredPageCount: 41 },
      hasTables: false
    })

    const nextState = runPaginationPluginViewUpdate({
      view: harness.view,
      storage: harness.storage,
      state: harness.state,
      documentHasTables: () => false,
      resolveSelectionOverflow: () => null,
      resolveMeasurementState: () => harness.measurementState,
      currentSelection: harness.currentSelection,
      createSelection: harness.selectionFactory,
      selectionsEqual: () => false,
      getDeferredStabilizationAttemptCount: () => 5,
      shouldScheduleDeferredRepaginationOnUpdate: () => false,
      ...harness.callbacks
    })

    expect(harness.callbacks.onSetStoredPageCount).toHaveBeenCalledWith(41)
    expect(harness.callbacks.onRequestRefresh).toHaveBeenCalledWith('page-count-shrink')
    expect(harness.callbacks.onScheduleDeferredRepagination).not.toHaveBeenCalled()
    expect(harness.callbacks.onRefreshLayoutBounds).not.toHaveBeenCalled()
    expect(nextState.lastKnownSelectionHead).toBe(10)
  })

  it('keeps the initial non-table view update passive when the measured page count already matches', () => {
    const harness = createHarness({
      state: {
        lastKnownDoc: null,
        lastKnownSelectionHead: null
      },
      measurementState: { currentPageCount: 41, measuredPageCount: 41 },
      hasTables: false
    })

    runPaginationPluginViewUpdate({
      view: harness.view,
      storage: harness.storage,
      state: harness.state,
      documentHasTables: () => false,
      resolveSelectionOverflow: () => null,
      resolveMeasurementState: () => harness.measurementState,
      currentSelection: harness.currentSelection,
      createSelection: harness.selectionFactory,
      selectionsEqual: () => false,
      getDeferredStabilizationAttemptCount: () => 5,
      shouldScheduleDeferredRepaginationOnUpdate: () => false,
      ...harness.callbacks
    })

    expect(harness.callbacks.onSetStoredPageCount).not.toHaveBeenCalled()
    expect(harness.callbacks.onRequestRefresh).not.toHaveBeenCalled()
    expect(harness.callbacks.onScheduleDeferredRepagination).not.toHaveBeenCalled()
    expect(harness.callbacks.onRefreshLayoutBounds).toHaveBeenCalledTimes(1)
  })

  it('schedules initial stabilization for first view update with tables', () => {
    const harness = createHarness({
      state: {
        lastKnownDoc: null,
        lastKnownSelectionHead: null
      },
      hasTables: true
    })

    runPaginationPluginViewUpdate({
      view: harness.view,
      storage: harness.storage,
      state: harness.state,
      documentHasTables: () => true,
      resolveSelectionOverflow: () => null,
      resolveMeasurementState: () => harness.measurementState,
      currentSelection: harness.currentSelection,
      createSelection: harness.selectionFactory,
      selectionsEqual: () => false,
      getDeferredStabilizationAttemptCount: () => 5,
      shouldScheduleDeferredRepaginationOnUpdate: () => false,
      ...harness.callbacks
    })

    expect(harness.callbacks.onScheduleDeferredRepagination).toHaveBeenCalledWith(5)
    expect(harness.callbacks.onRefreshLayoutBounds).toHaveBeenCalledTimes(1)
  })

  it('keeps reopen recovery on the deferred table stabilization path when the initial count is stale low', () => {
    const harness = createHarness({
      state: {
        lastKnownDoc: null,
        lastKnownSelectionHead: null
      },
      measurementState: { currentPageCount: 22, measuredPageCount: 43 },
      hasTables: true
    })

    runPaginationPluginViewUpdate({
      view: harness.view,
      storage: harness.storage,
      state: harness.state,
      documentHasTables: () => true,
      resolveSelectionOverflow: () => null,
      resolveMeasurementState: () => harness.measurementState,
      currentSelection: harness.currentSelection,
      createSelection: harness.selectionFactory,
      selectionsEqual: () => false,
      getDeferredStabilizationAttemptCount: () => 5,
      shouldScheduleDeferredRepaginationOnUpdate: () => false,
      ...harness.callbacks
    })

    expect(harness.callbacks.onSetStoredPageCount).not.toHaveBeenCalled()
    expect(harness.callbacks.onRequestRefresh).not.toHaveBeenCalled()
    expect(harness.callbacks.onScheduleDeferredRepagination).toHaveBeenCalledWith(5)
    expect(harness.callbacks.onRefreshLayoutBounds).toHaveBeenCalledTimes(1)
  })

  it('does not schedule deferred repagination on external doc changes when there are no tables', () => {
    const previousDoc = createDoc('prev')
    const harness = createHarness({
      state: {
        lastKnownDoc: previousDoc,
        lastKnownSelectionHead: 3
      },
      currentDoc: createDoc('next'),
      hasTables: false
    })

    runPaginationPluginViewUpdate({
      view: harness.view,
      storage: harness.storage,
      state: harness.state,
      documentHasTables: () => false,
      resolveSelectionOverflow: () => null,
      resolveMeasurementState: () => harness.measurementState,
      currentSelection: harness.currentSelection,
      createSelection: harness.selectionFactory,
      selectionsEqual: () => false,
      getDeferredStabilizationAttemptCount: () => 6,
      shouldScheduleDeferredRepaginationOnUpdate: ({ hasTables, externalDocChange }) => hasTables && externalDocChange,
      ...harness.callbacks
    })

    expect(harness.callbacks.onScheduleDeferredRepagination).not.toHaveBeenCalled()
  })

  it('skips layout bound refresh on no-op updates', () => {
    const sameDoc = createDoc('same')
    const harness = createHarness({
      state: {
        lastKnownDoc: sameDoc,
        lastKnownSelectionHead: 10
      },
      currentDoc: sameDoc,
      currentSelectionHead: 10
    })

    runPaginationPluginViewUpdate({
      view: harness.view,
      storage: harness.storage,
      state: harness.state,
      documentHasTables: () => false,
      resolveSelectionOverflow: () => null,
      resolveMeasurementState: () => harness.measurementState,
      currentSelection: harness.currentSelection,
      createSelection: harness.selectionFactory,
      selectionsEqual: () => false,
      getDeferredStabilizationAttemptCount: () => 5,
      shouldScheduleDeferredRepaginationOnUpdate: () => false,
      ...harness.callbacks
    })

    expect(harness.callbacks.onRefreshLayoutBounds).not.toHaveBeenCalled()
    expect(harness.callbacks.onScheduleDeferredRepagination).not.toHaveBeenCalled()
  })

  it('does not inspect tables on no-op updates', () => {
    const sameDoc = createDoc('same')
    const harness = createHarness({
      state: {
        lastKnownDoc: sameDoc,
        lastKnownSelectionHead: 10
      },
      currentDoc: sameDoc,
      currentSelectionHead: 10,
      hasTables: true
    })
    const documentHasTables = jest.fn(() => true)

    runPaginationPluginViewUpdate({
      view: harness.view,
      storage: harness.storage,
      state: harness.state,
      documentHasTables,
      resolveSelectionOverflow: () => null,
      resolveMeasurementState: () => harness.measurementState,
      currentSelection: harness.currentSelection,
      createSelection: harness.selectionFactory,
      selectionsEqual: () => false,
      getDeferredStabilizationAttemptCount: () => 5,
      shouldScheduleDeferredRepaginationOnUpdate: () => false,
      ...harness.callbacks
    })

    expect(documentHasTables).not.toHaveBeenCalled()
  })
})
