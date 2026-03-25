import type { Node as PMNode } from 'prosemirror-model'
import { Selection } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import { resolveCurrentKnownPageCount } from './paginationPageCountPolicy'
import type { PagesOptions, PagesStorage } from './types'
import {
  getExistingPageCount,
  getPageLayoutHeights,
  getPageSpacerHeight,
  measureHeaderFooterContentHeights,
  resolveDirectChildPaginationElement,
  resolvePageBodyWrapBands,
  resolveMountedPaginationPageNumbers,
  resolveViewportMountedPaginationRange
} from './utils'

export interface PageBodyBand {
  pageNumber: number
  left: number
  right: number
  top: number
  bottom: number
}

interface PaginationHeightMeasurementCache {
  headerHeights: Map<number, number>
  footerHeights: Map<number, number>
}

interface PaginationMeasuredWindowCache {
  measurementKey: string
  measured: {
    headerHeights: Map<number, number>
    footerHeights: Map<number, number>
    knownPageCount: number
  }
}

type PaginationBodyClickResolution = { action: 'allow' } | { action: 'block' } | { action: 'set'; position: number }
type SelectionNavigationDirection = 'forward' | 'backward' | null

const paginationHeightMeasurementCache = new WeakMap<HTMLElement, PaginationHeightMeasurementCache>()
const paginationMeasuredWindowCache = new WeakMap<HTMLElement, PaginationMeasuredWindowCache>()
const paginationStylePropertyCache = new WeakMap<HTMLElement, Map<string, string>>()
const documentHasTablesCache = new WeakMap<PMNode, boolean>()

function sortPageBodyBandsIfNeeded<T extends { pageNumber: number }>(bands: T[]): T[] {
  for (let index = 1; index < bands.length; index += 1) {
    if (bands[index - 1].pageNumber > bands[index].pageNumber) {
      return [...bands].sort((left, right) => left.pageNumber - right.pageNumber)
    }
  }

  return bands
}

function getOrCreatePaginationHeightMeasurementCache(editorDom: HTMLElement): PaginationHeightMeasurementCache {
  const existing = paginationHeightMeasurementCache.get(editorDom)
  if (existing) {
    return existing
  }

  const created: PaginationHeightMeasurementCache = {
    headerHeights: new Map(),
    footerHeights: new Map()
  }
  paginationHeightMeasurementCache.set(editorDom, created)
  return created
}

function getOrCreatePaginationStylePropertyCache(editorDom: HTMLElement): Map<string, string> {
  const existing = paginationStylePropertyCache.get(editorDom)
  if (existing) {
    return existing
  }

  const created = new Map<string, string>()
  paginationStylePropertyCache.set(editorDom, created)
  return created
}

function setCachedStyleProperty(editorDom: HTMLElement, name: string, value: string) {
  const stylePropertyCache = getOrCreatePaginationStylePropertyCache(editorDom)
  if (stylePropertyCache.get(name) === value) {
    return
  }

  editorDom.style.setProperty(name, value)
  stylePropertyCache.set(name, value)
}

function resolveSparseMountedMeasurementPageNumbers(editorDom: HTMLElement, pageCount: number): number[] | null {
  const paginationRoot = resolveDirectChildPaginationElement(editorDom)
  if (!(paginationRoot instanceof HTMLElement)) {
    return null
  }

  const mountedPageBreakCount = Array.from(paginationRoot.children).filter(
    child => child instanceof HTMLElement && child.classList.contains('rm-page-break')
  ).length
  const totalPages = Number(paginationRoot.dataset.rmTotalPages ?? '')
  const viewportMountedRange = resolveViewportMountedPaginationRange(editorDom)
  const mountedStartPage = viewportMountedRange?.startPage ?? Number(paginationRoot.dataset.rmMountedStartPage ?? '')
  const mountedEndPage = viewportMountedRange?.endPage ?? Number(paginationRoot.dataset.rmMountedEndPage ?? '')
  const mountedRangeLength =
    Number.isInteger(mountedStartPage) &&
    Number.isInteger(mountedEndPage) &&
    mountedStartPage > 0 &&
    mountedEndPage >= mountedStartPage
      ? mountedEndPage - mountedStartPage + 1
      : null

  const hasSparseMountedRange =
    mountedRangeLength !== null &&
    (viewportMountedRange !== null || mountedPageBreakCount === mountedRangeLength) &&
    (mountedStartPage > 1 || (Number.isInteger(totalPages) && totalPages > 0 && mountedEndPage < totalPages))

  if (!hasSparseMountedRange) {
    return null
  }

  const maxPageNumber =
    Number.isInteger(totalPages) && totalPages > 0
      ? Math.min(pageCount, totalPages, mountedEndPage + 1)
      : Math.min(pageCount, mountedEndPage + 1)
  const pageNumbers = mountedStartPage > 1 ? [1] : []
  for (let pageNumber = mountedStartPage; pageNumber <= maxPageNumber; pageNumber += 1) {
    pageNumbers.push(pageNumber)
  }

  return pageNumbers
}

function resolveWindowedMeasurementPageNumbers(editorDom: HTMLElement, pageCount: number): number[] {
  const viewport = editorDom.closest('.document-editor-viewport')
  if (!(viewport instanceof HTMLElement) || viewport.dataset.layoutWindowMode !== 'windowed') {
    return resolveMountedPaginationPageNumbers(editorDom).filter(pageNumber => pageNumber <= pageCount)
  }

  const sparseMountedPageNumbers = resolveSparseMountedMeasurementPageNumbers(editorDom, pageCount)
  if (sparseMountedPageNumbers) {
    return sparseMountedPageNumbers
  }

  const startPage = Number(viewport.dataset.layoutWindowStart ?? '')
  const endPage = Number(viewport.dataset.layoutWindowEnd ?? '')
  if (!Number.isInteger(startPage) || !Number.isInteger(endPage) || startPage < 1 || endPage < startPage) {
    return resolveMountedPaginationPageNumbers(editorDom).filter(pageNumber => pageNumber <= pageCount)
  }

  const maxPageNumber = Math.min(endPage, pageCount)
  const pageNumbers = startPage > 1 ? [1] : []
  for (let pageNumber = startPage; pageNumber <= maxPageNumber; pageNumber += 1) {
    pageNumbers.push(pageNumber)
  }

  return pageNumbers
}

function createMeasuredWindowKey(
  storage: PagesStorage,
  options: PagesOptions,
  pageCount: number,
  pageNumbersToMeasure: number[]
): string {
  const {
    width,
    height,
    margins: { top, right, bottom, left }
  } = storage.pageFormat

  return [
    pageCount,
    pageNumbersToMeasure.join(','),
    width,
    height,
    top,
    right,
    bottom,
    left,
    storage.headerTopMargin,
    storage.footerBottomMargin,
    options.headerHeight,
    options.footerHeight,
    options.pageGap,
    options.differentFirstPage ? 'first' : 'shared',
    options.differentOddEven ? 'odd-even' : 'default',
    storage.activeEditorType ?? 'body'
  ].join('|')
}

export function applyMeasuredPageHeightsToView(view: EditorView, storage: PagesStorage, options: PagesOptions) {
  const pageCount = resolveCurrentKnownPageCount(getExistingPageCount(view), storage.pageCount)
  const pageNumbersToMeasure = resolveWindowedMeasurementPageNumbers(view.dom, pageCount)
  const cachedMeasuredHeights = getOrCreatePaginationHeightMeasurementCache(view.dom)
  const measurementKey = createMeasuredWindowKey(storage, options, pageCount, pageNumbersToMeasure)
  const cachedWindowMeasurement = paginationMeasuredWindowCache.get(view.dom)
  const canReuseCachedMeasurement =
    storage.activeEditorType === null && cachedWindowMeasurement?.measurementKey === measurementKey

  if (!canReuseCachedMeasurement) {
    const measuredSubset = measureHeaderFooterContentHeights(
      view.dom,
      pageCount,
      storage.pageFormat,
      storage,
      pageNumbersToMeasure
    )

    measuredSubset.headerHeights.forEach((height, pageNumber) => {
      cachedMeasuredHeights.headerHeights.set(pageNumber, height)
    })
    measuredSubset.footerHeights.forEach((height, pageNumber) => {
      cachedMeasuredHeights.footerHeights.set(pageNumber, height)
    })
  }

  const measured =
    canReuseCachedMeasurement && cachedWindowMeasurement
      ? cachedWindowMeasurement.measured
      : {
          headerHeights: cachedMeasuredHeights.headerHeights,
          footerHeights: cachedMeasuredHeights.footerHeights,
          knownPageCount: pageCount
        }

  paginationMeasuredWindowCache.set(view.dom, {
    measurementKey,
    measured
  })

  let smallestBodyHeight = Number.POSITIVE_INFINITY

  pageNumbersToMeasure.forEach(pageNumber => {
    const headerHeight = measured.headerHeights.get(pageNumber) ?? options.headerHeight
    const footerHeight = measured.footerHeights.get(pageNumber) ?? options.footerHeight
    const layout = getPageLayoutHeights(storage.pageFormat, storage, headerHeight, footerHeight)

    smallestBodyHeight = Math.min(smallestBodyHeight, layout.bodyHeight)
    setCachedStyleProperty(view.dom, `--rm-page-body-${pageNumber}`, `${layout.bodyHeight}px`)
    setCachedStyleProperty(
      view.dom,
      `--rm-page-content-${pageNumber}`,
      `${getPageSpacerHeight(storage.pageFormat, storage, pageNumber, headerHeight, footerHeight)}px`
    )
  })

  const firstPageHeaderHeight = measured.headerHeights.get(1) ?? options.headerHeight
  const firstPageFooterHeight = measured.footerHeights.get(1) ?? options.footerHeight
  const generalPageNumber = Math.max(2, pageCount + 1)
  const generalHeaderHeight = measured.headerHeights.get(generalPageNumber) ?? options.headerHeight
  const generalFooterHeight = measured.footerHeights.get(generalPageNumber) ?? options.footerHeight

  setCachedStyleProperty(
    view.dom,
    '--rm-page-content-first',
    `${getPageSpacerHeight(storage.pageFormat, storage, 1, firstPageHeaderHeight, firstPageFooterHeight)}px`
  )
  setCachedStyleProperty(
    view.dom,
    '--rm-page-content-general',
    `${getPageSpacerHeight(storage.pageFormat, storage, generalPageNumber, generalHeaderHeight, generalFooterHeight)}px`
  )

  if (Number.isFinite(smallestBodyHeight)) {
    setCachedStyleProperty(view.dom, '--rm-max-content-child-height', `${Math.max(1, smallestBodyHeight - 10)}px`)
  }

  return measured
}

export function getPageBodyBands(editorDom: HTMLElement): PageBodyBand[] {
  return sortPageBodyBandsIfNeeded(resolvePageBodyWrapBands(editorDom, 'viewport'))
}

export function documentHasTables(doc: PMNode) {
  const cached = documentHasTablesCache.get(doc)
  if (cached !== undefined) {
    return cached
  }

  let hasTables = false

  doc.descendants(node => {
    if (node.type.name === 'table') {
      hasTables = true
      return false
    }

    return true
  })

  documentHasTablesCache.set(doc, hasTables)
  return hasTables
}

export function createSafePaginationSelection(doc: PMNode, position: number, bias: 1 | -1 = 1) {
  const clampedPosition = Math.max(0, Math.min(position, doc.content.size))

  try {
    return Selection.near(doc.resolve(clampedPosition), bias)
  } catch {
    return bias < 0 ? Selection.atEnd(doc) : Selection.atStart(doc)
  }
}

function isCaretRectWithinBand(
  caretRect: ReturnType<EditorView['coordsAtPos']>,
  bodyBand: PageBodyBand,
  tolerance = 1
) {
  const caretCenterX = (caretRect.left + caretRect.right) / 2
  return (
    caretRect.top >= bodyBand.top - tolerance &&
    caretRect.bottom <= bodyBand.bottom + tolerance &&
    caretCenterX >= bodyBand.left - tolerance &&
    caretCenterX <= bodyBand.right + tolerance
  )
}

function getPositionAtCoords(view: EditorView, left: number, top: number) {
  try {
    return view.posAtCoords({ left, top })?.pos ?? null
  } catch {
    return null
  }
}

function getCaretRectAtPosition(view: EditorView, position: number) {
  try {
    return view.coordsAtPos(position)
  } catch {
    return null
  }
}

function resolveBodyBandSearch(bodyBands: PageBodyBand[], offsetY: number) {
  let low = 0
  let high = bodyBands.length - 1

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const bodyBand = bodyBands[mid]
    if (offsetY < bodyBand.top) {
      high = mid - 1
      continue
    }

    if (offsetY > bodyBand.bottom) {
      low = mid + 1
      continue
    }

    return {
      containingIndex: mid,
      insertionIndex: mid
    }
  }

  return {
    containingIndex: null,
    insertionIndex: low
  }
}

function resolveBodyBandAtOffset(bodyBands: PageBodyBand[], offsetY: number): PageBodyBand | null {
  const { containingIndex } = resolveBodyBandSearch(bodyBands, offsetY)
  return containingIndex === null ? null : (bodyBands[containingIndex] ?? null)
}

function resolveCaretContainingBodyBand(
  bodyBands: PageBodyBand[],
  caretRect: ReturnType<EditorView['coordsAtPos']>
): PageBodyBand | null {
  const caretCenterY = (caretRect.top + caretRect.bottom) / 2
  const { containingIndex, insertionIndex } = resolveBodyBandSearch(bodyBands, caretCenterY)
  const candidateIndexes =
    containingIndex === null
      ? [insertionIndex - 1, insertionIndex]
      : [containingIndex, containingIndex - 1, containingIndex + 1]

  for (const index of candidateIndexes) {
    const bodyBand = bodyBands[index]
    if (bodyBand && isCaretRectWithinBand(caretRect, bodyBand)) {
      return bodyBand
    }
  }

  return null
}

function resolveDocumentPosition(view: EditorView, position: number) {
  try {
    return view.state.doc.resolve(position)
  } catch {
    return null
  }
}

function isParagraphNodeEmpty(node: PMNode | null | undefined) {
  return !!node && node.type.name === 'paragraph' && node.content.size === 0
}

function isEmptyParagraphPosition(view: EditorView, position: number) {
  const resolvedPosition = resolveDocumentPosition(view, position)
  return (
    !!resolvedPosition &&
    resolvedPosition.parent.type.name === 'paragraph' &&
    resolvedPosition.parent.content.size === 0
  )
}

function resolveEmptyFirstParagraphClick(
  view: EditorView,
  bodyBand: PageBodyBand | null,
  clickX: number,
  clickY: number
) {
  const firstNode = view.state.doc.firstChild
  if (firstNode?.type.name !== 'paragraph' || firstNode.content.size !== 0) {
    return null
  }

  const firstParagraphPosition = 1
  const caretRect = getCaretRectAtPosition(view, firstParagraphPosition)
  if (!caretRect) {
    return null
  }

  const horizontalLeft = bodyBand?.left ?? caretRect.left - 1
  const horizontalRight = bodyBand?.right ?? caretRect.right + 1
  if (clickX < horizontalLeft || clickX > horizontalRight) {
    return null
  }

  const lineHeight = Math.max(1, caretRect.bottom - caretRect.top)
  const verticalTolerance = Math.max(10, Math.min(36, lineHeight * 1.5))
  if (clickY < caretRect.top - verticalTolerance || clickY > caretRect.bottom + verticalTolerance) {
    return null
  }

  return firstParagraphPosition
}

function isStableBodyPosition(
  view: EditorView,
  bodyBand: PageBodyBand,
  position: number,
  clickX: number,
  clickY: number
) {
  const caretRect = getCaretRectAtPosition(view, position)
  if (!caretRect || !isCaretRectWithinBand(caretRect, bodyBand)) return false

  const resolvedPosition = resolveDocumentPosition(view, position)
  if (!resolvedPosition) return false

  const lineHeight = Math.max(1, caretRect.bottom - caretRect.top)
  const verticalTolerance = Math.max(6, Math.min(24, lineHeight))
  if (clickY < caretRect.top - verticalTolerance || clickY > caretRect.bottom + verticalTolerance) {
    return false
  }

  if (resolvedPosition.parent.type.name !== 'paragraph') {
    return true
  }

  if (resolvedPosition.parent.content.size === 0) {
    return true
  }

  const isParagraphBoundary =
    resolvedPosition.parentOffset === 0 || resolvedPosition.parentOffset === resolvedPosition.parent.content.size

  if (!isParagraphBoundary) {
    return true
  }

  if (isParagraphNodeEmpty(resolvedPosition.nodeBefore) || isParagraphNodeEmpty(resolvedPosition.nodeAfter)) {
    return false
  }

  const boundaryX = resolvedPosition.parentOffset === 0 ? caretRect.left : caretRect.right
  const horizontalTolerance = Math.max(8, Math.min(24, lineHeight))
  return Math.abs(clickX - boundaryX) <= horizontalTolerance
}

function findClampedBodyPosition(view: EditorView, bodyBand: PageBodyBand, clickX: number, clickY: number) {
  const minY = bodyBand.top + 1
  const maxY = Math.max(minY, bodyBand.bottom - 1)
  const clampedY = Math.min(Math.max(clickY, minY), maxY)
  const minX = bodyBand.left + 1
  const maxX = Math.max(minX, bodyBand.right - 1)
  const clampedX = Math.min(Math.max(clickX, minX), maxX)
  const middleX = Math.round((bodyBand.left + bodyBand.right) / 2)
  const probeXs = Array.from(
    new Set([clampedX, minX + 12, middleX, maxX - 12].map(value => Math.min(Math.max(value, minX), maxX)))
  )
  const probeYs: number[] = []
  const step = 18

  for (let delta = 0; delta <= bodyBand.bottom - bodyBand.top; delta += step) {
    const downward = Math.min(clampedY + delta, maxY)
    const upward = Math.max(clampedY - delta, minY)
    if (!probeYs.includes(downward)) probeYs.push(downward)
    if (!probeYs.includes(upward)) probeYs.push(upward)
  }

  let bestCandidate: { position: number; score: number } | null = null

  for (const probeY of probeYs) {
    for (const probeX of probeXs) {
      const position = getPositionAtCoords(view, probeX, probeY)
      if (position == null) continue
      if (!isStableBodyPosition(view, bodyBand, position, probeX, probeY)) continue

      const caretRect = getCaretRectAtPosition(view, position)
      if (!caretRect) continue

      const caretCenterY = (caretRect.top + caretRect.bottom) / 2
      const score = Math.abs(caretCenterY - clickY) + Math.abs(probeX - clickX) * 0.1

      if (!bestCandidate || score < bestCandidate.score) {
        bestCandidate = { position, score }
      }
    }
  }

  return bestCandidate?.position ?? null
}

export function resolvePaginationBodyClick(
  view: EditorView,
  clientX: number,
  clientY: number
): PaginationBodyClickResolution {
  const bodyBands = getPageBodyBands(view.dom)
  if (!bodyBands.length) return { action: 'allow' }
  const hasRangeSelection = !view.state.selection.empty

  const firstPageBodyBand = bodyBands[0] ?? null
  const emptyFirstParagraphPosition = resolveEmptyFirstParagraphClick(view, firstPageBodyBand, clientX, clientY)
  if (emptyFirstParagraphPosition != null) {
    return { action: 'set', position: emptyFirstParagraphPosition }
  }

  const bodyBand = resolveBodyBandAtOffset(bodyBands, clientY)
  if (!bodyBand) {
    return hasRangeSelection ? { action: 'allow' } : { action: 'block' }
  }

  const initialPosition = getPositionAtCoords(view, clientX, clientY)
  if (initialPosition != null) {
    if (isStableBodyPosition(view, bodyBand, initialPosition, clientX, clientY)) {
      if (isEmptyParagraphPosition(view, initialPosition)) {
        return { action: 'set', position: initialPosition }
      }
      return hasRangeSelection ? { action: 'set', position: initialPosition } : { action: 'allow' }
    }
  }

  const clampedPosition = findClampedBodyPosition(view, bodyBand, clientX, clientY)
  if (clampedPosition != null) {
    return { action: 'set', position: clampedPosition }
  }

  return hasRangeSelection ? { action: 'allow' } : { action: 'block' }
}

function getBodyBandProbeXs(bodyBand: PageBodyBand, preferredX: number) {
  const minX = bodyBand.left + 1
  const maxX = Math.max(minX, bodyBand.right - 1)
  const clampedX = Math.min(Math.max(preferredX, minX), maxX)
  const middleX = Math.round((bodyBand.left + bodyBand.right) / 2)

  return Array.from(
    new Set([clampedX, minX + 12, middleX, maxX - 12].map(value => Math.min(Math.max(value, minX), maxX)))
  )
}

function findDirectionalBodyPosition(
  view: EditorView,
  bodyBand: PageBodyBand,
  direction: Exclude<SelectionNavigationDirection, null>,
  preferredX: number
) {
  const minY = bodyBand.top + 1
  const maxY = Math.max(minY, bodyBand.bottom - 1)
  const probeXs = getBodyBandProbeXs(bodyBand, preferredX)
  const probeYs: number[] = []
  const step = 8

  if (direction === 'forward') {
    for (let probeY = minY; probeY <= maxY; probeY += step) {
      probeYs.push(probeY)
    }
    if (probeYs[probeYs.length - 1] !== maxY) {
      probeYs.push(maxY)
    }
  } else {
    for (let probeY = maxY; probeY >= minY; probeY -= step) {
      probeYs.push(probeY)
    }
    if (probeYs[probeYs.length - 1] !== minY) {
      probeYs.push(minY)
    }
  }

  let bestCandidate: { position: number; score: number } | null = null

  for (const probeY of probeYs) {
    for (const probeX of probeXs) {
      const position = getPositionAtCoords(view, probeX, probeY)
      if (position == null) continue

      const caretRect = getCaretRectAtPosition(view, position)
      if (!caretRect || !isCaretRectWithinBand(caretRect, bodyBand)) continue

      const edgeDistance =
        direction === 'forward'
          ? Math.max(0, caretRect.top - bodyBand.top)
          : Math.max(0, bodyBand.bottom - caretRect.bottom)
      const horizontalDistance = Math.abs((caretRect.left + caretRect.right) / 2 - preferredX)
      const score = edgeDistance * 1000 + horizontalDistance

      if (!bestCandidate || score < bestCandidate.score) {
        bestCandidate = { position, score }
      }
    }
  }

  return bestCandidate?.position ?? null
}

function resolveOverflowTargetBodyBand(
  bodyBands: PageBodyBand[],
  caretRect: ReturnType<EditorView['coordsAtPos']>,
  direction: SelectionNavigationDirection
): PageBodyBand | null {
  const caretCenterY = (caretRect.top + caretRect.bottom) / 2
  const { containingIndex, insertionIndex } = resolveBodyBandSearch(bodyBands, caretCenterY)

  if (containingIndex !== null) {
    if (direction === null) {
      return bodyBands[containingIndex] ?? null
    }

    if (containingIndex >= bodyBands.length - 1) {
      return bodyBands[bodyBands.length - 1] ?? null
    }

    return direction === 'backward' ? (bodyBands[containingIndex] ?? null) : (bodyBands[containingIndex + 1] ?? null)
  }

  if (insertionIndex <= 0) {
    return bodyBands[0] ?? null
  }

  if (insertionIndex >= bodyBands.length) {
    return direction === 'forward' ? null : (bodyBands[bodyBands.length - 1] ?? null)
  }

  return direction === 'backward' ? (bodyBands[insertionIndex - 1] ?? null) : (bodyBands[insertionIndex] ?? null)
}

export function resolvePaginationSelectionBodyOverflow(
  view: EditorView,
  direction: SelectionNavigationDirection = null
): { position: number } | null {
  if (!view.state.selection.empty) return null

  const bodyBands = getPageBodyBands(view.dom)
  if (!bodyBands.length) return null

  const caretRect = getCaretRectAtPosition(view, view.state.selection.head)
  if (!caretRect) return null

  if (resolveCaretContainingBodyBand(bodyBands, caretRect)) {
    return null
  }

  const targetBand = resolveOverflowTargetBodyBand(bodyBands, caretRect, direction)
  if (!targetBand) return null

  const targetX = Math.min(
    Math.max((caretRect.left + caretRect.right) / 2, targetBand.left + 1),
    Math.max(targetBand.left + 1, targetBand.right - 1)
  )
  let targetY = Math.min(
    Math.max((caretRect.top + caretRect.bottom) / 2, targetBand.top + 1),
    Math.max(targetBand.top + 1, targetBand.bottom - 1)
  )
  if (caretRect.bottom < targetBand.top) {
    targetY = targetBand.top + 1
  } else if (caretRect.top > targetBand.bottom) {
    targetY = targetBand.bottom - 1
  }

  const clampedPosition =
    (direction ? findDirectionalBodyPosition(view, targetBand, direction, targetX) : null) ??
    findClampedBodyPosition(view, targetBand, targetX, targetY)
  return clampedPosition == null || clampedPosition === view.state.selection.head ? null : { position: clampedPosition }
}
