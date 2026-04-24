import type { Node as PMNode } from 'prosemirror-model'
import type { EditorView } from '@tiptap/pm/view'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { ReplaceAroundStep, ReplaceStep } from '@tiptap/pm/transform'
import { getPageBodyMeasurementBands, type PageBodyMeasurementBand } from './utils'

export const PAGE_BREAK_NODE_NAME = 'pageBreak'
export const PAGE_BREAK_SPACER_CLASS = 'rm-page-break-spacer'

/**
 * NOTE ON ROLE:
 *
 * The spacer widget is a *presentation* aid that visually aligns content
 * flow with the pagination chrome. Hard page boundaries (the minimum
 * number of pages) are enforced independently by `paginationForcedBoundaries.ts`.
 *
 * Targeting model (Word-like):
 * - Each `pageBreak` at ordinal i (0-indexed in document order) is the
 *   boundary that ends page (i + 1) and starts page (i + 2).
 * - The spacer that follows break[i] fills the remaining vertical space
 *   on page (i + 1)'s body, so that content after the break flows onto
 *   page (i + 2).
 * - Consecutive page breaks are NOT collapsed. Two adjacent breaks both
 *   produce spacers: the first fills the current page, the second then
 *   fills the entire next page, producing the blank page between content
 *   that Word shows.
 *
 * Targeting is strictly ordinal - NOT based on where the break currently
 * renders in the DOM. This keeps the spacer stable when cumulative
 * measurement errors would otherwise push later breaks past their
 * expected page body. When a break has drifted past its ordinal target
 * (e.g. because of a tall table on the preceding page), we fall forward
 * to the next available band whose bottom is beyond the break's current
 * position so the spacer can still push content onto a later page boundary.
 */

const BAND_MATCH_TOLERANCE_PX = 0.5

interface PageBreakEntry {
  pos: number
  node: PMNode
  parent: PMNode
  indexInParent: number
}

export function shouldRebuildPageBreakSpacerDecorations(transaction: {
  docChanged: boolean
  steps: readonly unknown[]
}): boolean {
  if (!transaction.docChanged) {
    return false
  }

  return (
    transaction.steps.length === 0 ||
    transaction.steps.some(step => step instanceof ReplaceStep || step instanceof ReplaceAroundStep)
  )
}

export function collectPageBreakEntries(doc: PMNode): PageBreakEntry[] {
  const entries: PageBreakEntry[] = []

  doc.descendants((node, pos, parent, index) => {
    if (node.type.name !== PAGE_BREAK_NODE_NAME) {
      return
    }
    if (!parent) {
      return
    }
    entries.push({ pos, node, parent, indexInParent: index })
  })

  return entries
}

function isEffectivelyEmptyBlock(node: PMNode): boolean {
  if (!node.isBlock) {
    return false
  }
  return node.content.size === 0
}

/**
 * A pageBreak is considered "followed by another pageBreak" if the next
 * sibling in the same parent is a pageBreak, ignoring any empty block nodes
 * (e.g. empty paragraphs) in between. This implements the "one blank page
 * between" collapse semantic for consecutive manual breaks and must match
 * the rule used by the forced-boundary floor in paginationForcedBoundaries.ts.
 */
export function isFollowedByAnotherPageBreak(entry: PageBreakEntry): boolean {
  const { parent, indexInParent } = entry
  for (let idx = indexInParent + 1; idx < parent.childCount; idx += 1) {
    const sibling = parent.child(idx)
    if (sibling.type.name === PAGE_BREAK_NODE_NAME) {
      return true
    }
    if (!isEffectivelyEmptyBlock(sibling)) {
      return false
    }
  }
  return false
}

/**
 * Resolve the target band for a break at a given ordinal.
 *
 * Primary strategy: use the band whose pageNumber matches the break's ordinal
 * (break[i] targets page i + 1). When the break has already rendered past
 * that page's body bottom (drifted forward due to tall preceding content),
 * fall forward to the earliest later band whose bottom is beyond the break's
 * current position so the spacer still pushes content onto a new page.
 */
function resolveTargetBandForOrdinal(
  bandsByPageNumber: ReadonlyMap<number, PageBodyMeasurementBand>,
  targetPageNumber: number,
  nodeBottomInEditor: number,
  maxPageNumber: number
): PageBodyMeasurementBand | null {
  const preferredBand = bandsByPageNumber.get(targetPageNumber) ?? null

  if (preferredBand && preferredBand.bottom > nodeBottomInEditor - BAND_MATCH_TOLERANCE_PX) {
    return preferredBand
  }

  for (let pageNumber = targetPageNumber + 1; pageNumber <= maxPageNumber; pageNumber += 1) {
    const candidate = bandsByPageNumber.get(pageNumber)
    if (candidate && candidate.bottom > nodeBottomInEditor) {
      return candidate
    }
  }

  return preferredBand
}

function toEditorRelativeBottom(view: EditorView, coords: { bottom: number }): number {
  const editorRect = view.dom.getBoundingClientRect()
  return coords.bottom - editorRect.top + view.dom.scrollTop
}

/**
 * Manual page breaks should anchor to the boundary immediately before the
 * break, not to wherever the rendered page-break block happened to drift. When
 * the block itself is pushed onto the next page, using the earliest available
 * coordinate keeps the spacer attached to the preceding page body.
 */
export function resolvePageBreakAnchorInEditor(view: EditorView, entry: PageBreakEntry): number | null {
  const editorRect = view.dom.getBoundingClientRect()
  const candidates: number[] = []

  const nodeDom = view.nodeDOM(entry.pos)
  if (nodeDom instanceof HTMLElement) {
    const rect = nodeDom.getBoundingClientRect()
    if (rect.height > 0 || rect.width > 0) {
      candidates.push(rect.top - editorRect.top + view.dom.scrollTop)
    }
  }

  try {
    candidates.push(toEditorRelativeBottom(view, view.coordsAtPos(entry.pos)))
  } catch {
    // Ignore positions that cannot be resolved while DOM/layout is updating.
  }

  try {
    candidates.push(toEditorRelativeBottom(view, view.coordsAtPos(entry.pos + entry.node.nodeSize)))
  } catch {
    // Ignore positions that cannot be resolved while DOM/layout is updating.
  }

  if (candidates.length === 0) {
    return null
  }

  return Math.min(...candidates)
}

export interface BuildPageBreakSpacerDecorationsOptions {
  view: EditorView | null
  /**
   * Optional override for measured bands, used primarily in tests to avoid a
   * real DOM. When omitted the bands are read from the live editor DOM via
   * getPageBodyMeasurementBands.
   */
  bandsOverride?: readonly PageBodyMeasurementBand[]
  /**
   * Optional override for resolving the bottom of each pageBreak node in
   * editor-relative coordinates. Used in tests.
   */
  resolveNodeBottomOverride?: (entry: PageBreakEntry) => number | null
}

export function buildPageBreakSpacerDecorations(
  doc: PMNode,
  options: BuildPageBreakSpacerDecorationsOptions
): DecorationSet {
  const entries = collectPageBreakEntries(doc)
  if (entries.length === 0) {
    return DecorationSet.empty
  }

  const view = options.view
  const bands = options.bandsOverride ?? (view ? getPageBodyMeasurementBands(view.dom) : [])
  if (!bands || bands.length === 0) {
    return DecorationSet.empty
  }

  const bandsByPageNumber = new Map<number, PageBodyMeasurementBand>()
  let maxPageNumber = 0
  for (const band of bands) {
    bandsByPageNumber.set(band.pageNumber, band)
    if (band.pageNumber > maxPageNumber) {
      maxPageNumber = band.pageNumber
    }
  }

  const resolveNodeBottom =
    options.resolveNodeBottomOverride ??
    ((entry: PageBreakEntry) => (view ? resolvePageBreakAnchorInEditor(view, entry) : null))

  const decorations: Decoration[] = []

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]!

    const nodeBottomInEditor = resolveNodeBottom(entry)
    if (nodeBottomInEditor === null || !Number.isFinite(nodeBottomInEditor)) {
      continue
    }

    const targetPageNumber = index + 1
    const targetBand = resolveTargetBandForOrdinal(
      bandsByPageNumber,
      targetPageNumber,
      nodeBottomInEditor,
      maxPageNumber
    )
    if (!targetBand) {
      continue
    }

    const height = Math.max(0, Math.round(targetBand.bottom - nodeBottomInEditor))
    if (height <= 0) {
      continue
    }

    const widgetPosition = entry.pos + entry.node.nodeSize
    const decorationKey = `page-break-spacer:${entry.pos}:${height}`

    decorations.push(
      Decoration.widget(widgetPosition, () => createPageBreakSpacerElement(height), {
        side: -1,
        ignoreSelection: true,
        key: decorationKey
      })
    )
  }

  if (decorations.length === 0) {
    return DecorationSet.empty
  }

  return DecorationSet.create(doc, decorations)
}

export function createPageBreakSpacerElement(heightPx: number): HTMLElement {
  const element = document.createElement('span')
  element.className = PAGE_BREAK_SPACER_CLASS
  element.style.display = 'block'
  element.style.width = '100%'
  element.style.height = `${heightPx}px`
  element.style.pointerEvents = 'none'
  element.style.userSelect = 'none'
  element.setAttribute('aria-hidden', 'true')
  element.setAttribute('contenteditable', 'false')
  element.dataset.rmPageBreakSpacer = 'true'
  return element
}
