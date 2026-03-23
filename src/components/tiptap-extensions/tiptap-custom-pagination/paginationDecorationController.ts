import type { Node as PMNode } from 'prosemirror-model'
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view'
import {
  resolvePaginationMeasurementState,
  resolvePaginationWidgetTotalPages,
  type AddPagesMeasurementSnapshot,
  type PaginationMeasuredHeights
} from './paginationPageCountPolicy'
import type { HeaderFooterEditorType, PagesOptions, PagesStorage } from './types'

interface PaginationChromeWidgetState {
  rawMeasuredPageCount: number
  measuredPageCount: number
  storedPageCount: number
  totalPages: number
  pageCountReason: ReturnType<typeof resolvePaginationMeasurementState>['pageCountReason']
  lastMeasuredPageGap: ReturnType<typeof resolvePaginationMeasurementState>['lastMeasuredPageGap']
  cappedPageCount: number | null
}

export function resolvePaginationChromeWidgetState(options: {
  view: EditorView
  storage: PagesStorage
  runtimeOptions: PagesOptions
  previousAddPagesMeasurement: AddPagesMeasurementSnapshot | null
  cappedPageCount: number | null
  growthSuppressionPageCount: number | null
  measureHeights: () => PaginationMeasuredHeights
  resolveMeasurementState?: typeof resolvePaginationMeasurementState
}) {
  const measurementState = (options.resolveMeasurementState ?? resolvePaginationMeasurementState)({
    view: options.view,
    storage: options.storage,
    runtimeOptions: options.runtimeOptions,
    previousAddPagesMeasurement: options.previousAddPagesMeasurement,
    cappedPageCount: options.cappedPageCount,
    docChangedSinceLastUpdate: false,
    resetDueToDocChange: false,
    measureHeights: options.measureHeights
  })
  const storedPageCount =
    measurementState.runawayPageGrowthResolution.cappedPageCount === null
      ? options.storage.pageCount
      : Math.min(options.storage.pageCount, measurementState.runawayPageGrowthResolution.cappedPageCount)
  const totalPages = resolvePaginationWidgetTotalPages({
    storedPageCount,
    measuredPageCount: measurementState.measuredPageCount,
    growthSuppressionPageCount: options.growthSuppressionPageCount
  })

  return {
    measurementState,
    widgetState: {
      rawMeasuredPageCount: measurementState.rawMeasuredPageCount,
      measuredPageCount: measurementState.measuredPageCount,
      storedPageCount,
      totalPages,
      pageCountReason: measurementState.pageCountReason,
      lastMeasuredPageGap: measurementState.lastMeasuredPageGap,
      cappedPageCount: measurementState.runawayPageGrowthResolution.cappedPageCount
    } satisfies PaginationChromeWidgetState
  }
}

export function renderPaginationChromeWidget(options: {
  view: EditorView
  storage: PagesStorage
  runtimeOptions: PagesOptions
  previousAddPagesMeasurement: AddPagesMeasurementSnapshot | null
  cappedPageCount: number | null
  growthSuppressionPageCount: number | null
  measureHeights: () => PaginationMeasuredHeights
  widgetPassId: number
  renderChrome: (params: {
    editorDom: HTMLElement
    options: PagesOptions
    storage: PagesStorage
    onOpenEditor: (
      type: HeaderFooterEditorType,
      pageNumber: number,
      target: HTMLElement,
      clickPosition?: { clientX: number; clientY: number }
    ) => void
  }) => HTMLElement
  onOpenEditor: (
    type: HeaderFooterEditorType,
    pageNumber: number,
    target: HTMLElement,
    clickPosition?: { clientX: number; clientY: number }
  ) => void
  onLogDebug?: (event: string, payload: Record<string, unknown>) => void
  resolveChromeWidgetState?: typeof resolvePaginationChromeWidgetState
}) {
  const { widgetState } = (options.resolveChromeWidgetState ?? resolvePaginationChromeWidgetState)({
    view: options.view,
    storage: options.storage,
    runtimeOptions: options.runtimeOptions,
    previousAddPagesMeasurement: options.previousAddPagesMeasurement,
    cappedPageCount: options.cappedPageCount,
    growthSuppressionPageCount: options.growthSuppressionPageCount,
    measureHeights: options.measureHeights
  })

  options.storage.pageCount = widgetState.totalPages

  options.onLogDebug?.('header-total-pages', {
    widgetPassId: options.widgetPassId,
    rawTotalPages: widgetState.rawMeasuredPageCount,
    cappedTotalPages: widgetState.measuredPageCount,
    storedPageCount: widgetState.storedPageCount,
    storagePageCount: options.storage.pageCount,
    totalPages: widgetState.totalPages,
    growthSuppressionPageCount: options.growthSuppressionPageCount,
    cappedPageCount: widgetState.cappedPageCount,
    pageCountReason: widgetState.pageCountReason,
    lastPageGap: widgetState.lastMeasuredPageGap
  })

  return options.renderChrome({
    editorDom: options.view.dom,
    options: options.runtimeOptions,
    storage: options.storage,
    onOpenEditor: options.onOpenEditor
  })
}

export function createPaginationChromeDecorationSet(options: {
  doc: PMNode
  renderWidget: (view: EditorView) => HTMLElement
}) {
  return DecorationSet.create(options.doc, [
    Decoration.widget(0, options.renderWidget, {
      side: -1
    })
  ])
}
