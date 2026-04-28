import type { Editor } from '@tiptap/core'
import type { Node as PMNode } from 'prosemirror-model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { DecorationSet, type EditorView } from '@tiptap/pm/view'
import { createDeferredRepaginationScheduler } from './deferredRepaginationScheduler'
import { createPaginationChromeDecorationSet, renderPaginationChromeWidget } from './paginationDecorationController'
import { buildSquareWrapDecorations } from './squareWrapDecorationController'
import {
  applyMeasuredPageHeightsToView,
  createSafePaginationSelection,
  documentHasTables,
  resolvePaginationBodyClick,
  resolvePaginationSelectionBodyOverflow
} from './paginationLayoutHelpers'
import { buildHardBreakDecorations, shouldRebuildHardBreakDecorations } from './paginationHardBreakDecorationController'
import {
  buildPageBreakSpacerDecorations,
  collectPageBreakEntries,
  shouldRebuildPageBreakSpacerDecorations
} from './paginationPageBreakDecorationController'
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
import {
  incrementPaginationInstrumentationCounter,
  recordPaginationInstrumentationEvent
} from './paginationInstrumentation'
import { classifyPaginationTransaction } from './paginationTransactionClassifier'
import type { PagesOptions, PagesStorage } from './types'
import { getPageBodyMeasurementBands, getExistingPageCount, logPaginationDebug, syncStorageFromOptions } from './utils'
import {
  resolvePaginationMeasurementState,
  type AddPagesMeasurementSnapshot,
  PAGE_COUNT_HARD_CAP
} from './paginationPageCountPolicy'
import { shouldScheduleDeferredRepaginationOnUpdate } from './paginationStabilizationPolicy'
import { isYjsInboundSyncTransaction } from '@/components/tiptap-extensions/yjsProsemirrorSync'
import { hasPendingTableMeasurements } from '@/components/tiptap-extensions/tiptap-custom-tables/tablePaginationDetection'
import { createTablePaginationController } from '@/components/tiptap-extensions/tiptap-custom-tables/tablePaginationController'
import { TABLE_METADATA_OWNED_DOC_CHANGE_META } from '@/components/tiptap-extensions/tiptap-custom-tables/tableMetadataOwnedDocChange'

type DocChangeOrigin =
  | 'external'
  | 'pagination-owned'
  | 'hydration-owned'
  | 'table-metadata-owned'
  | 'collaboration-remote'
  | null

export function createPaginationExtensionPlugins(options: {
  editor: Editor
  storage: PagesStorage
  extensionOptions: PagesOptions
  defaultOptions: PagesOptions
  paginationKey: PluginKey<DecorationSet>
  hardBreakKey: PluginKey<DecorationSet>
  squareWrapKey: PluginKey<DecorationSet>
  pageBreakSpacerKey: PluginKey<DecorationSet>
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
  const clampPageCount = (value: number) => Math.max(1, Math.min(PAGE_COUNT_HARD_CAP, value))
  let measuredHeaderHeights = new Map<number, number>()
  let measuredFooterHeights = new Map<number, number>()
  let lastKnownDoc: PMNode | null = null
  let lastKnownSelectionHead: number | null = null
  let lastDocChangeOrigin: DocChangeOrigin = null
  let lastDocChangeAnalysis: ReturnType<typeof classifyPaginationTransaction> | null = null
  let previousAddPagesMeasurement: AddPagesMeasurementSnapshot | null = null
  let runawayGrowthCapPageCount: number | null = null
  let pendingRefreshDrivenStabilization = false
  let deferredRepaginationPassId = 0
  let headerPageCountPassId = 0
  let contentChangeDebounceTimer: ReturnType<typeof setTimeout> | null = null
  let lastBuiltDecorationPageCount: number | null = null
  let pendingChromePresentationRefresh = false
  const COLLABORATION_REPAGINATION_DELAY_MS = 800
  const LOCAL_REPAGINATION_DELAY_MS = 150
  let suppressPaginationOwnedDeferredScheduling = false
  const tablePaginationController = createTablePaginationController(options.paginationOwnedDocChangeMeta)
  const getDeferredStabilizationAttemptCount = (view: EditorView) =>
    documentHasTables(view.state.doc) ? options.initialLayoutStabilizationMaxAttempts : 1

  const getEditorRuntimeOptions = (targetEditor: Editor) =>
    getRuntimeOptions(targetEditor, extensionOptions, options.defaultOptions)

  const requestRefresh = (view: EditorView, source = 'unknown', shouldStabilize = false) => {
    incrementPaginationInstrumentationCounter('pagination-refresh-request-total')
    incrementPaginationInstrumentationCounter(`pagination-refresh-request-source:${source}`)
    if (shouldStabilize) {
      incrementPaginationInstrumentationCounter('pagination-refresh-request-stabilized')
    }
    recordPaginationInstrumentationEvent('pagination-refresh-request', {
      source,
      existingPageCount: getExistingPageCount(view),
      storedPageCount: storage.pageCount,
      stabilizationAttemptsRemaining: deferredRepaginationScheduler.getStabilizationAttemptsRemaining(),
      shouldStabilize
    })
    logPaginationDebug('request-refresh', {
      source,
      existingPageCount: getExistingPageCount(view),
      storedPageCount: storage.pageCount,
      stabilizationAttemptsRemaining: deferredRepaginationScheduler.getStabilizationAttemptsRemaining(),
      shouldStabilize
    })
    deferredRepaginationScheduler.clear()
    const transaction = view.state.tr.setMeta(options.refreshMeta, true)
    if (shouldStabilize) {
      transaction.setMeta(options.refreshAndStabilizeMeta, true)
    }
    view.dispatch(transaction)
  }

  const queuePluginViewRefresh = (view: EditorView, source: string) => {
    queueMicrotask(() => {
      if ((view as EditorView & { isDestroyed?: boolean }).isDestroyed) {
        return
      }

      requestRefresh(view, source)
    })
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
        const clamped = Math.max(1, Math.min(PAGE_COUNT_HARD_CAP, currentPageCount))
        setPaginationOwnedGrowthSuppression(editor, clamped)
        runawayGrowthCapPageCount = clamped
      },
      onClearGrowthSuppression: () => {
        runawayGrowthCapPageCount = null
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
          storage.pageCount = clampPageCount(nextStoredPageCount)
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

  const buildPageDecorations = (): DecorationSet => {
    lastBuiltDecorationPageCount = clampPageCount(storage.pageCount)
    pendingChromePresentationRefresh = false
    return createPaginationChromeDecorationSet({
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
  }

  return [
    new Plugin({
      key: options.paginationKey,
      state: {
        init: () => buildPageDecorations(),
        apply: (tr, oldValue) => {
          if (tr.docChanged) {
            const tableMetadataOwnedDocChange = tr.getMeta(TABLE_METADATA_OWNED_DOC_CHANGE_META) === true
            const classifiedDocChange = classifyPaginationTransaction({
              transaction: tr,
              previousDoc: tr.before ?? null,
              nextDoc: tr.doc ?? null
            })
            lastDocChangeAnalysis = tableMetadataOwnedDocChange
              ? {
                  ...classifiedDocChange,
                  isLayoutNeutral: true,
                  shouldScheduleSettledRefresh: false,
                  touchesTable: false,
                  touchesTableAdjacentContent: false,
                  touchesTableRegion: false
                }
              : classifiedDocChange
            incrementPaginationInstrumentationCounter(`pagination-transaction-kind:${lastDocChangeAnalysis.kind}`)
            if (lastDocChangeAnalysis.touchesTableRegion) {
              incrementPaginationInstrumentationCounter('pagination-transaction-table-region')
            }
            if (lastDocChangeAnalysis.isLayoutNeutral) {
              incrementPaginationInstrumentationCounter('pagination-transaction-layout-neutral')
            }
            if (tr.getMeta(options.paginationOwnedDocChangeMeta) === true) {
              lastDocChangeOrigin = 'pagination-owned'
            } else if (tableMetadataOwnedDocChange) {
              lastDocChangeOrigin = 'table-metadata-owned'
            } else if (consumePaginationHydrationDocChange(editor)) {
              lastDocChangeOrigin = 'hydration-owned'
            } else if (isYjsInboundSyncTransaction(tr)) {
              lastDocChangeOrigin = 'collaboration-remote'
            } else {
              lastDocChangeOrigin = 'external'
            }
          } else if (tr.getMeta(options.refreshMeta)) {
            lastDocChangeOrigin = null
            lastDocChangeAnalysis = null
            if (tr.getMeta(options.refreshAndStabilizeMeta) === true) {
              pendingRefreshDrivenStabilization = true
            }
          }

          if (tr.getMeta(options.refreshMeta)) {
            if (lastBuiltDecorationPageCount === clampPageCount(storage.pageCount)) {
              pendingChromePresentationRefresh = true
              return oldValue
            }

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
            if (event.defaultPrevented) return false
            if (event.button !== 0) return false
            if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return false
            if (storage.activeEditorType !== null) return false
            const targetElement =
              event.target instanceof Element
                ? event.target
                : event.target instanceof Node
                  ? event.target.parentElement
                  : null
            const clickedEditableContent =
              targetElement?.closest('.ProseMirror[contenteditable="true"]') !== null &&
              targetElement?.closest('.rm-page-inline-editor') === null
            const resolution = resolvePaginationBodyClick(view, event.clientX, event.clientY)
            if (clickedEditableContent && resolution.action !== 'set') {
              return false
            }
            if (clickedEditableContent && resolution.action === 'set') {
              const selection = createSafePaginationSelection(view.state.doc, resolution.position)
              view.focus()
              view.dispatch(view.state.tr.setSelection(selection).scrollIntoView())
              return false
            }
            if (resolution.action === 'allow') return false

            event.preventDefault()
            event.stopPropagation()

            if (resolution.action === 'set') {
              const selection = createSafePaginationSelection(view.state.doc, resolution.position)
              view.focus()
              view.dispatch(view.state.tr.setSelection(selection).scrollIntoView())
              view.focus()
            }

            return true
          },
          click: (view, event) => {
            if (event.defaultPrevented) return false
            if (event.button !== 0) return false
            if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return false
            if (storage.activeEditorType !== null) return false
            const targetElement =
              event.target instanceof Element
                ? event.target
                : event.target instanceof Node
                  ? event.target.parentElement
                  : null
            const clickedEditableContent =
              targetElement?.closest('.ProseMirror[contenteditable="true"]') !== null &&
              targetElement?.closest('.rm-page-inline-editor') === null
            if (!clickedEditableContent) {
              return false
            }

            const resolution = resolvePaginationBodyClick(view, event.clientX, event.clientY)
            if (resolution.action !== 'set') {
              return false
            }

            view.focus()
            return false
          }
        }
      },
      view: () => ({
        update: updatedView => {
          if (lastDocChangeOrigin === 'collaboration-remote' || lastDocChangeOrigin === 'external') {
            const docChangeAnalysis = lastDocChangeAnalysis
            const shouldStabilizeOnSettle =
              lastDocChangeOrigin === 'collaboration-remote' ||
              (lastDocChangeOrigin === 'external' && (docChangeAnalysis?.touchesTableRegion ?? false))
            const shouldScheduleSettledRefresh =
              lastDocChangeOrigin === 'collaboration-remote' ||
              (docChangeAnalysis?.shouldScheduleSettledRefresh ?? true)
            const delayMs =
              lastDocChangeOrigin === 'collaboration-remote'
                ? COLLABORATION_REPAGINATION_DELAY_MS
                : LOCAL_REPAGINATION_DELAY_MS
            previousAddPagesMeasurement = null
            runawayGrowthCapPageCount = null
            pendingRefreshDrivenStabilization = false
            tablePaginationController.reset()
            clearPaginationOwnedGrowthSuppression(editor)
            lastKnownDoc = updatedView.state.doc
            lastKnownSelectionHead = updatedView.state.selection.head
            lastDocChangeOrigin = null
            lastDocChangeAnalysis = null
            if (contentChangeDebounceTimer !== null) {
              clearTimeout(contentChangeDebounceTimer)
            }
            if (shouldScheduleSettledRefresh) {
              contentChangeDebounceTimer = setTimeout(() => {
                contentChangeDebounceTimer = null
                const mounted = getMountedEditorView(editor)
                if (mounted && !(mounted as EditorView & { isDestroyed?: boolean }).isDestroyed) {
                  requestRefresh(mounted, 'content-change-settle', shouldStabilizeOnSettle)
                }
              }, delayMs)
            }
            return
          }

          const runtimeOptions = getEditorRuntimeOptions(editor)
          syncStorageFromOptions(storage, runtimeOptions)
          getPaginationOverlayManager({
            editor,
            getRuntimeOptions: () => getEditorRuntimeOptions(editor),
            getStorage: () => storage
          }).recoverStaleOverlayState(updatedView.dom)

          windowedRenderer.syncRootPresentation({
            editorDom: updatedView.dom,
            options: runtimeOptions,
            storage
          })
          const measured = applyMeasuredPageHeightsToView(updatedView, storage, runtimeOptions)
          measuredHeaderHeights = measured.headerHeights
          measuredFooterHeights = measured.footerHeights
          if (pendingChromePresentationRefresh) {
            pendingChromePresentationRefresh = false
            windowedRenderer.refreshPresentation({
              editorDom: updatedView.dom,
              options: runtimeOptions,
              storage
            })
          }
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
              lastDocChangeAnalysis,
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
              queuePluginViewRefresh(updatedView, source)
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
          lastDocChangeAnalysis = nextPluginViewState.lastDocChangeAnalysis
        },
        destroy: () => {
          if (contentChangeDebounceTimer !== null) {
            clearTimeout(contentChangeDebounceTimer)
            contentChangeDebounceTimer = null
          }
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
            return oldValue.map(tr.mapping, tr.doc)
          }

          return oldValue
        }
      },
      props: {
        decorations(state) {
          return options.hardBreakKey.getState(state) ?? DecorationSet.empty
        }
      }
    }),
    new Plugin({
      key: options.squareWrapKey,
      state: {
        init: (_, state) => buildSquareWrapDecorations(state.doc),
        apply(tr, oldValue) {
          if (tr.getMeta(options.refreshMeta)) {
            return buildSquareWrapDecorations(tr.doc)
          }
          if (tr.docChanged) {
            return oldValue.map(tr.mapping, tr.doc)
          }

          return oldValue
        }
      },
      props: {
        decorations(state) {
          return options.squareWrapKey.getState(state) ?? DecorationSet.empty
        }
      }
    }),
    new Plugin({
      key: options.pageBreakSpacerKey,
      state: {
        init: () => DecorationSet.empty,
        apply(tr, oldValue) {
          const mountedView = getMountedEditorView(editor)
          const pageBreakCount = collectPageBreakEntries(tr.doc).length
          const shouldRebuild = shouldRebuildPageBreakSpacerDecorations(tr)
          const oldDecorationCount = oldValue.find().length
          const bootstrapWithPlannedSpacerOffsets = oldDecorationCount === 0

          if (tr.getMeta(options.refreshMeta)) {
            if (pageBreakCount > 0) {
              // #region agent log
              if (typeof globalThis.fetch === 'function') {
                fetch('http://127.0.0.1:7702/ingest/91afea52-34bb-4fee-ae2c-a538b0bae61d', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'a41470' },
                  body: JSON.stringify({
                    sessionId: 'a41470',
                    runId: 'post-fix',
                    hypothesisId: 'H3',
                    location: 'paginationExtensionPlugins.ts:666',
                    message: 'page-break spacer plugin refresh rebuild',
                    data: {
                      cause: 'refresh-meta',
                      pageBreakCount,
                      hasMountedView: Boolean(mountedView),
                      oldDecorationCount,
                      bootstrapWithPlannedSpacerOffsets
                    },
                    timestamp: Date.now()
                  })
                }).catch(() => {})
              }
              // #endregion
            }
            return buildPageBreakSpacerDecorations(tr.doc, {
              view: mountedView,
              bootstrapWithPlannedSpacerOffsets
            })
          }

          if (shouldRebuild) {
            if (pageBreakCount > 0) {
              // #region agent log
              if (typeof globalThis.fetch === 'function') {
                fetch('http://127.0.0.1:7702/ingest/91afea52-34bb-4fee-ae2c-a538b0bae61d', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'a41470' },
                  body: JSON.stringify({
                    sessionId: 'a41470',
                    runId: 'post-fix',
                    hypothesisId: 'H3',
                    location: 'paginationExtensionPlugins.ts:678',
                    message: 'page-break spacer plugin structural rebuild',
                    data: {
                      cause: 'doc-changed',
                      pageBreakCount,
                      hasMountedView: Boolean(mountedView),
                      oldDecorationCount,
                      bootstrapWithPlannedSpacerOffsets,
                      stepCount: tr.steps.length
                    },
                    timestamp: Date.now()
                  })
                }).catch(() => {})
              }
              // #endregion
            }
            return buildPageBreakSpacerDecorations(tr.doc, {
              view: mountedView,
              bootstrapWithPlannedSpacerOffsets
            })
          }

          if (tr.docChanged) {
            return oldValue.map(tr.mapping, tr.doc)
          }

          return oldValue
        }
      },
      props: {
        decorations(state) {
          return options.pageBreakSpacerKey.getState(state) ?? DecorationSet.empty
        }
      },
      view: () => {
        let lastPageBreakSignature: string | null = null
        return {
          update: updatedView => {
            const signature = collectPageBreakEntries(updatedView.state.doc)
              .map(entry => entry.pos)
              .join(',')
            if (signature === lastPageBreakSignature) {
              return
            }
            lastPageBreakSignature = signature
            if (signature.length === 0) {
              return
            }
            queuePluginViewRefresh(updatedView, 'page-break-spacer-change')
          }
        }
      }
    })
  ]
}
