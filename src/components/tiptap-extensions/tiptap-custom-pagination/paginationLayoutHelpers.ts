import type { Node as PMNode } from 'prosemirror-model'
import { Selection } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import { resolveCurrentKnownPageCount } from './paginationPageCountPolicy'
import type { PagesOptions, PagesStorage } from './types'
import {
  getExistingPageCount,
  getPageLayoutHeights,
  getPageSpacerHeight,
  measureHeaderFooterContentHeights
} from './utils'

export interface PageBodyBand {
  pageNumber: number
  left: number
  right: number
  top: number
  bottom: number
}

type PaginationBodyClickResolution = { action: 'allow' } | { action: 'block' } | { action: 'set'; position: number }
type SelectionNavigationDirection = 'forward' | 'backward' | null

export function applyMeasuredPageHeightsToView(view: EditorView, storage: PagesStorage, options: PagesOptions) {
  const pageCount = resolveCurrentKnownPageCount(getExistingPageCount(view), storage.pageCount)
  const measured = measureHeaderFooterContentHeights(view.dom, pageCount, storage.pageFormat, storage)
  let smallestBodyHeight = Number.POSITIVE_INFINITY

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const headerHeight = measured.headerHeights.get(pageNumber) ?? options.headerHeight
    const footerHeight = measured.footerHeights.get(pageNumber) ?? options.footerHeight
    const layout = getPageLayoutHeights(storage.pageFormat, storage, headerHeight, footerHeight)

    smallestBodyHeight = Math.min(smallestBodyHeight, layout.bodyHeight)
    view.dom.style.setProperty(`--rm-page-body-${pageNumber}`, `${layout.bodyHeight}px`)
    view.dom.style.setProperty(
      `--rm-page-content-${pageNumber}`,
      `${getPageSpacerHeight(storage.pageFormat, storage, pageNumber, headerHeight, footerHeight)}px`
    )
  }

  const firstPageHeaderHeight = measured.headerHeights.get(1) ?? options.headerHeight
  const firstPageFooterHeight = measured.footerHeights.get(1) ?? options.footerHeight
  const generalPageNumber = Math.max(2, pageCount + 1)
  const generalHeaderHeight = measured.headerHeights.get(generalPageNumber) ?? options.headerHeight
  const generalFooterHeight = measured.footerHeights.get(generalPageNumber) ?? options.footerHeight

  view.dom.style.setProperty(
    '--rm-page-content-first',
    `${getPageSpacerHeight(storage.pageFormat, storage, 1, firstPageHeaderHeight, firstPageFooterHeight)}px`
  )
  view.dom.style.setProperty(
    '--rm-page-content-general',
    `${getPageSpacerHeight(storage.pageFormat, storage, generalPageNumber, generalHeaderHeight, generalFooterHeight)}px`
  )

  if (Number.isFinite(smallestBodyHeight)) {
    view.dom.style.setProperty('--rm-max-content-child-height', `${Math.max(1, smallestBodyHeight - 10)}px`)
  }

  return measured
}

export function getPageBodyBands(editorDom: HTMLElement): PageBodyBand[] {
  return Array.from(editorDom.querySelectorAll('.rm-page-body-layer[data-rm-page-number]'))
    .filter((element): element is HTMLElement => element instanceof HTMLElement)
    .map(element => {
      const rect = element.getBoundingClientRect()
      return {
        pageNumber: Number(element.dataset.rmPageNumber ?? '0'),
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom
      }
    })
    .filter(band => Number.isFinite(band.pageNumber) && band.pageNumber > 0 && band.bottom > band.top)
    .sort((left, right) => left.pageNumber - right.pageNumber)
}

export function documentHasTables(doc: PMNode) {
  let hasTables = false

  doc.descendants(node => {
    if (node.type.name === 'table') {
      hasTables = true
      return false
    }

    return true
  })

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
  return caretRect.top >= bodyBand.top - tolerance && caretRect.bottom <= bodyBand.bottom + tolerance
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
  if (!firstNode || firstNode.type.name !== 'paragraph' || firstNode.content.size !== 0) {
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

  const firstPageBodyBand = bodyBands.find(band => band.pageNumber === 1) ?? bodyBands[0] ?? null
  const emptyFirstParagraphPosition = resolveEmptyFirstParagraphClick(view, firstPageBodyBand, clientX, clientY)
  if (emptyFirstParagraphPosition != null) {
    return { action: 'set', position: emptyFirstParagraphPosition }
  }

  const bodyBand = bodyBands.find(band => clientY >= band.top && clientY <= band.bottom)
  if (!bodyBand) return { action: 'block' }

  const initialPosition = getPositionAtCoords(view, clientX, clientY)
  if (initialPosition != null) {
    if (isStableBodyPosition(view, bodyBand, initialPosition, clientX, clientY)) {
      if (isEmptyParagraphPosition(view, initialPosition)) {
        return { action: 'set', position: initialPosition }
      }
      return { action: 'allow' }
    }
  }

  const clampedPosition = findClampedBodyPosition(view, bodyBand, clientX, clientY)
  return clampedPosition == null ? { action: 'block' } : { action: 'set', position: clampedPosition }
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
  let previousBodyBand: PageBodyBand | null = null

  for (const bodyBand of bodyBands) {
    if (caretCenterY < bodyBand.top) {
      return direction === 'backward' && previousBodyBand ? previousBodyBand : bodyBand
    }

    previousBodyBand = bodyBand
  }

  for (let index = 0; index < bodyBands.length - 1; index += 1) {
    if (caretCenterY <= bodyBands[index].bottom) {
      return direction === 'backward' ? bodyBands[index] : bodyBands[index + 1]
    }
  }

  if (direction === 'forward' && previousBodyBand && caretCenterY > previousBodyBand.bottom) {
    return null
  }

  return bodyBands[bodyBands.length - 1]
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

  if (bodyBands.some(bodyBand => isCaretRectWithinBand(caretRect, bodyBand))) {
    return null
  }

  const targetBand = resolveOverflowTargetBodyBand(bodyBands, caretRect, direction)
  if (!targetBand) return null

  const targetX = Math.min(
    Math.max((caretRect.left + caretRect.right) / 2, targetBand.left + 1),
    Math.max(targetBand.left + 1, targetBand.right - 1)
  )
  const targetY =
    caretRect.bottom < targetBand.top
      ? targetBand.top + 1
      : caretRect.top > targetBand.bottom
        ? targetBand.bottom - 1
        : Math.min(
            Math.max((caretRect.top + caretRect.bottom) / 2, targetBand.top + 1),
            Math.max(targetBand.top + 1, targetBand.bottom - 1)
          )

  const clampedPosition =
    (direction ? findDirectionalBodyPosition(view, targetBand, direction, targetX) : null) ??
    findClampedBodyPosition(view, targetBand, targetX, targetY)
  return clampedPosition == null || clampedPosition === view.state.selection.head ? null : { position: clampedPosition }
}
