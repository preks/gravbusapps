import type { Editor } from '@tiptap/core'
import type { Node as PMNode } from 'prosemirror-model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { DecorationSet, type EditorView } from '@tiptap/pm/view'
import { createDeferredRepaginationScheduler } from './deferredRepaginationScheduler'
import { createPaginationChromeDecorationSet, renderPaginationChromeWidget } from './paginationDecorationController'
import {
  applyMeasuredPageHeightsToView,
  createSafePaginationSelection,
  documentHasTables,
  resolvePaginationBodyClick,
  resolvePaginationSelectionBodyOverflow
} from './paginationLayoutHelpers'
import { buildHardBreakDecorations, shouldRebuildHardBreakDecorations } from './paginationHardBreakDecorationController'
import {
  clearPaginationOwnedGrowthSuppression,
  consumePaginationHydrationDocChange,
  getPaginationOwnedGrowthSuppressionPageCount,
  setPaginationOwnedGrowthSuppression
} from './paginationRuntimeBookkeeping'
import { getPaginationOverlayManager, getRuntimeOptions, getWindowedRenderer } from './paginationRuntimeRegistry'
import { runDeferredRepaginationEvaluationLoop } from './deferredRepaginationEvaluationController'
import { openManagedPaginationOverlay } from './overlayOpenController'
import { runPaginationPluginViewUpdate } from './paginationPluginViewController'
import { schedulePaginationOverlayReopen } from './overlayReopen'
import { createWindowedPaginationRenderer } from './windowedRenderer'
import { getMountedEditorView } from './paginationExtensionLifecycle'
import type { PagesOptions, PagesStorage } from './types'
import { getPageBodyMeasurementBands, getExistingPageCount, logPaginationDebug, syncStorageFromOptions } from './utils'
import { resolvePaginationMeasurementState, type AddPagesMeasurementSnapshot } from './paginationPageCountPolicy'
import { shouldScheduleDeferredRepaginationOnUpdate } from './paginationStabilizationPolicy'
import { hasPendingTableMeasurements } from '@/components/tiptap-extensions/tiptap-custom-tables/tablePaginationDetection'
import { createTablePaginationController } from '@/components/tiptap-extensions/tiptap-custom-tables/tablePaginationController'

type DocChangeOrigin = 'external' | 'pagination-owned' | 'hydration-owned' | null

export function createPaginationExtensionPlugins(options: {
  editor: Editor
  storage: PagesStorage
  extensionOptions: PagesOptions
  defaultOptions: PagesOptions
  paginationKey: PluginKey<DecorationSet>
  hardBreakKey: PluginKey<DecorationSet>
  refreshMeta: string
  refreshAndStabilizeMeta: string
  paginationOwnedDocChangeMeta: string
  initialLayoutStabilizationMaxAttempts: number
}) {
  const editor = options.editor
  const storage = options.storage
  const extensionOptions = options.extensionOptions
  const windowedRenderer = getWindowedRenderer(editor, () =>
    createWindowedPaginationRenderer({
      resolveCurrentEditorDom: () => getMountedEditorView(editor)?.dom ?? null
    })
  )
  let measuredHeaderHeights = new Map<number, number>()
  let measuredFooterHeights = new Map<number, number>()
  let lastKnownDoc: PMNode | null = null
  let lastKnownSelectionHead: number | null = null
  let lastDocChangeOrigin: DocChangeOrigin = null
  let previousAddPagesMeasurement: AddPagesMeasurementSnapshot | null = null
  let runawayGrowthCapPageCount: number | null = null
  let pendingRefreshDrivenStabilization = false
  let deferredRepaginationPassId = 0
  let headerPageCountPassId = 0
  let suppressPaginationOwnedDeferredScheduling = false
  const tablePaginationController = createTablePaginationController(options.paginationOwnedDocChangeMeta)
  const getDeferredStabilizationAttemptCount = (view: EditorView) =>
    documentHasTables(view.state.doc) ? options.initialLayoutStabilizationMaxAttempts : 1

  const getEditorRuntimeOptions = (targetEditor: Editor) =>
    getRuntimeOptions(targetEditor, extensionOptions, options.defaultOptions)

  const requestRefresh = (view: EditorView, source = 'unknown') => {
    logPaginationDebug('request-refresh', {
      source,
      existingPageCount: getExistingPageCount(view),
      storedPageCount: storage.pageCount,
      stabilizationAttemptsRemaining: deferredRepaginationScheduler.getStabilizationAttemptsRemaining()
    })
    deferredRepaginationScheduler.clear()
    const transaction = view.state.tr.setMeta(options.refreshMeta, true)
    view.dispatch(transaction)
  }

  const runDeferredRepaginationEvaluation = (view: EditorView) => {
    runDeferredRepaginationEvaluationLoop({
      view,
      evaluationId: ++deferredRepaginationPassId,
      storage,
      getRuntimeOptions: () => getEditorRuntimeOptions(editor),
      syncStorageFromOptions,
      syncRootPresentation: params => {
        windowedRenderer.syncRootPresentation(params)
      },
      getPreviousAddPagesMeasurement: () => previousAddPagesMeasurement,
      getRunawayGrowthCapPageCount: () => runawayGrowthCapPageCount,
      setRunawayGrowthCapPageCount: pageCount => {
        runawayGrowthCapPageCount = pageCount
      },
      setMeasuredHeights: measured => {
        measuredHeaderHeights = measured.headerHeights
        measuredFooterHeights = measured.footerHeights
      },
      measureHeights: (currentView, currentStorage, runtimeOptions) =>
        applyMeasuredPageHeightsToView(currentView, currentStorage, runtimeOptions),
      documentHasTables: currentView => documentHasTables(currentView.state.doc),
      getBodyMeasurementBands: editorDom => getPageBodyMeasurementBands(editorDom),
      hasPendingTableMeasurements,
      getStabilizationAttemptsRemaining: () => deferredRepaginationScheduler.getStabilizationAttemptsRemaining(),
      evaluateTablePagination: params => tablePaginationController.evaluate(params),
      onLogDebug: logPaginationDebug,
      onSetPreviousAddPagesMeasurement: nextMeasurement => {
        previousAddPagesMeasurement = nextMeasurement
      },
      onClearPreviousAddPagesMeasurement: () => {
        previousAddPagesMeasurement = null
      },
      onSetGrowthSuppression: currentPageCount => {
        setPaginationOwnedGrowthSuppression(editor, currentPageCount)
      },
      onClearGrowthSuppression: () => {
        clearPaginationOwnedGrowthSuppression(editor)
      },
      onDecrementStabilizationAttempts: () => {
        deferredRepaginationScheduler.decrementStabilizationAttempts()
      },
      onScheduleEvaluation: scheduledView => {
        deferredRepaginationScheduler.schedule(scheduledView)
      },
      onRefreshLayoutBounds: editorDom => {
        windowedRenderer.refreshLayoutBounds(editorDom)
      },
      onResetStabilizationAttempts: () => {
        deferredRepaginationScheduler.resetStabilizationAttempts()
      },
      onRequestRefresh: (currentView, source, nextStoredPageCount) => {
        if (typeof nextStoredPageCount === 'number') {
          storage.pageCount = nextStoredPageCount
        }
        requestRefresh(currentView, source)
      },
      onDispatch: transaction => {
        suppressPaginationOwnedDeferredScheduling = true
        try {
          view.dispatch(transaction)
        } finally {
          suppressPaginationOwnedDeferredScheduling = false
        }
      }
    })
  }

  const deferredRepaginationScheduler = createDeferredRepaginationScheduler({
    runEvaluation: scheduledView => {
      runDeferredRepaginationEvaluation(scheduledView)
    }
  })

  const openEditor = (
    type: 'header' | 'footer',
    pageNumber: number,
    target: HTMLElement,
    clickPosition?: { clientX: number; clientY: number }
  ) => {
    const runtimeOptions = getEditorRuntimeOptions(editor)
    const overlayManager = getPaginationOverlayManager({
      editor,
      getRuntimeOptions: () => getEditorRuntimeOptions(editor),
      getStorage: () => storage
    })
    const activeEditor = { type, pageNumber } as const

    openManagedPaginationOverlay({
      overlayManager,
      storage,
      runtimeOptions,
      activeEditor,
      target,
      clickPosition,
      measure: () => {
        const mountedView = getMountedEditorView(editor)
        if (!mountedView) return null

        const measurementState = resolvePaginationMeasurementState({
          view: mountedView,
          storage,
          runtimeOptions,
          previousAddPagesMeasurement,
          cappedPageCount: runawayGrowthCapPageCount,
          docChangedSinceLastUpdate: false,
          resetDueToDocChange: false,
          measureHeights: () => applyMeasuredPageHeightsToView(mountedView, storage, runtimeOptions)
        })

        return {
          currentPageCount: measurementState.currentPageCount,
          measuredPageCount: measurementState.measuredPageCount,
          context: {
            editorDom: mountedView.dom,
            measured: measurementState.measured
          }
        }
      },
      onMeasured: ({ measured }) => {
        measuredHeaderHeights = measured.headerHeights
        measuredFooterHeights = measured.footerHeights
      },
      onSetStoredPageCount: pageCount => {
        storage.pageCount = pageCount
      },
      onClearGrowthSuppression: () => {
        clearPaginationOwnedGrowthSuppression(editor)
      },
      onCloseOverlay: () => {
        overlayManager.close()
      },
      onReopenOverlay: () => {
        schedulePaginationOverlayReopen({
          activeEditor,
          resolveEditorDom: () => getMountedEditorView(editor)?.dom ?? null,
          reopen: refreshedTarget => {
            openEditor(activeEditor.type, activeEditor.pageNumber, refreshedTarget)
          }
        })
      },
      onRefreshPresentation: ({ editorDom }) => {
        windowedRenderer.refreshPresentation({
          editorDom,
          options: runtimeOptions,
          storage
        })
      },
      onClose: () => {
        const mountedView = getMountedEditorView(editor)
        if (!mountedView) return
        requestRefresh(mountedView, 'overlay-close')
      }
    })
  }

  const buildPageDecorations = (): DecorationSet =>
    createPaginationChromeDecorationSet({
      doc: editor.state.doc,
      renderWidget: view => {
        const runtimeOptions = getEditorRuntimeOptions(editor)
        syncStorageFromOptions(storage, runtimeOptions)

        return renderPaginationChromeWidget({
          view,
          storage,
          runtimeOptions,
          previousAddPagesMeasurement,
          cappedPageCount: runawayGrowthCapPageCount,
          growthSuppressionPageCount: getPaginationOwnedGrowthSuppressionPageCount(editor),
          measureHeights: () => ({
            headerHeights: measuredHeaderHeights,
            footerHeights: measuredFooterHeights
          }),
          widgetPassId: ++headerPageCountPassId,
          renderChrome: params => windowedRenderer.renderChrome(params),
          onOpenEditor: openEditor,
          onLogDebug: logPaginationDebug
        })
      }
    })

  return [
    new Plugin({
      key: options.paginationKey,
      state: {
        init: () => buildPageDecorations(),
        apply: (tr, oldValue) => {
          if (tr.docChanged) {
            if (tr.getMeta(options.paginationOwnedDocChangeMeta) === true) {
              lastDocChangeOrigin = 'pagination-owned'
            } else if (consumePaginationHydrationDocChange(editor)) {
              lastDocChangeOrigin = 'hydration-owned'
            } else {
              lastDocChangeOrigin = 'external'
            }
          } else if (tr.getMeta(options.refreshMeta)) {
            lastDocChangeOrigin = null
            if (tr.getMeta(options.refreshAndStabilizeMeta) === true) {
              pendingRefreshDrivenStabilization = true
            }
          }

          if (tr.getMeta(options.refreshMeta)) {
            return buildPageDecorations()
          }

          if (tr.docChanged) {
            return oldValue.map(tr.mapping, tr.doc)
          }

          return oldValue
        }
      },
      props: {
        decorations(state) {
          return options.paginationKey.getState(state) ?? DecorationSet.empty
        },
        handleDOMEvents: {
          mousedown: (view, event) => {
            const mouseEvent = event as MouseEvent
            if (mouseEvent.defaultPrevented) return false
            if (mouseEvent.button !== 0) return false
            if (mouseEvent.metaKey || mouseEvent.ctrlKey || mouseEvent.altKey || mouseEvent.shiftKey) return false
            if (storage.activeEditorType !== null) return false

            const resolution = resolvePaginationBodyClick(view, mouseEvent.clientX, mouseEvent.clientY)
            if (resolution.action === 'allow') return false

            mouseEvent.preventDefault()
            mouseEvent.stopPropagation()

            if (resolution.action === 'set') {
              const selection = createSafePaginationSelection(view.state.doc, resolution.position)
              if (!selection.eq(view.state.selection)) {
                view.dispatch(view.state.tr.setSelection(selection))
              }
              view.focus()
            }

            return true
          }
        }
      },
      view: () => ({
        update: updatedView => {
          const runtimeOptions = getEditorRuntimeOptions(editor)
          syncStorageFromOptions(storage, runtimeOptions)
          windowedRenderer.syncRootPresentation({
            editorDom: updatedView.dom,
            options: runtimeOptions,
            storage
          })
          const measured = applyMeasuredPageHeightsToView(updatedView, storage, runtimeOptions)
          measuredHeaderHeights = measured.headerHeights
          measuredFooterHeights = measured.footerHeights
          const nextPluginViewState = runPaginationPluginViewUpdate({
            view: updatedView,
            storage,
            state: {
              lastKnownDoc,
              lastKnownSelectionHead,
              previousAddPagesMeasurement,
              runawayGrowthCapPageCount,
              pendingRefreshDrivenStabilization,
              lastDocChangeOrigin,
              suppressPaginationOwnedDeferredScheduling
            },
            documentHasTables,
            resolveSelectionOverflow: resolvePaginationSelectionBodyOverflow,
            resolveMeasurementState: pluginViewState => {
              const measurementState = resolvePaginationMeasurementState({
                view: updatedView,
                storage,
                runtimeOptions,
                previousAddPagesMeasurement: pluginViewState.previousAddPagesMeasurement,
                cappedPageCount: pluginViewState.runawayGrowthCapPageCount,
                docChangedSinceLastUpdate: false,
                resetDueToDocChange: false,
                measureHeights: () => measured
              })

              return {
                currentPageCount: measurementState.currentPageCount,
                measuredPageCount: measurementState.measuredPageCount
              }
            },
            currentSelection: updatedView.state.selection,
            createSelection: createSafePaginationSelection,
            selectionsEqual: (left, right) => left.eq(right),
            onDispatchSelection: selection => {
              updatedView.dispatch(updatedView.state.tr.setSelection(selection))
            },
            onResetTableController: () => {
              tablePaginationController.reset()
            },
            onClearGrowthSuppression: () => {
              clearPaginationOwnedGrowthSuppression(editor)
            },
            onSetStoredPageCount: pageCount => {
              storage.pageCount = pageCount
            },
            onRequestRefresh: source => {
              requestRefresh(updatedView, source)
            },
            onScheduleDeferredRepagination: minimumAttempts => {
              deferredRepaginationScheduler.schedule(updatedView, minimumAttempts)
            },
            getDeferredStabilizationAttemptCount,
            shouldScheduleDeferredRepaginationOnUpdate,
            onRefreshLayoutBounds: () => {
              windowedRenderer.refreshLayoutBounds(updatedView.dom)
            },
            onLogSelectionOverflowRefresh: payload => {
              logPaginationDebug('selection-overflow-refresh', {
                currentPageCount: payload.currentPageCount,
                rawMeasuredPageCount: payload.measuredPageCount,
                selectionHead: payload.selectionHead
              })
            }
          })

          lastKnownDoc = nextPluginViewState.lastKnownDoc
          lastKnownSelectionHead = nextPluginViewState.lastKnownSelectionHead
          previousAddPagesMeasurement = nextPluginViewState.previousAddPagesMeasurement
          runawayGrowthCapPageCount = nextPluginViewState.runawayGrowthCapPageCount
          pendingRefreshDrivenStabilization = nextPluginViewState.pendingRefreshDrivenStabilization
        },
        destroy: () => {
          deferredRepaginationScheduler.destroy()
          windowedRenderer.destroy()
        }
      })
    }),
    new Plugin({
      key: options.hardBreakKey,
      state: {
        init: (_, state) => buildHardBreakDecorations(state.doc),
        apply(tr, oldValue) {
          if (shouldRebuildHardBreakDecorations(tr)) {
            return buildHardBreakDecorations(tr.doc)
          }

          return oldValue
        }
      },
      props: {
        decorations(state) {
          return options.hardBreakKey.getState(state) ?? DecorationSet.empty
        }
      }
    })
  ]
}
