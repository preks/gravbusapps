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
 * - Each `pageBreak` is resolved against the page body where it currently
 *   lands after earlier manual break spacers are accounted for.
 * - The spacer that follows the break fills the remaining vertical space
 *   on that page's body, so that content after the break flows onto the
 *   next page.
 * - Consecutive page breaks are NOT collapsed. Two adjacent breaks both
 *   produce spacers: the first fills the current page, the second then
 *   fills the entire next page, producing the blank page between content
 *   that Word shows.
 *
 * Targeting uses live measured page body bands, not hardcoded page heights.
 * Because decorations are calculated before their spacer widgets are mounted,
 * later breaks are evaluated with the spacer height already planned for
 * earlier breaks. This keeps multiple imported/inserted breaks stable even
 * when content before them spans more pages than the number of manual breaks.
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
 * Resolve the page body band that contains, or immediately follows, the break
 * anchor after earlier manual-break spacers have been accounted for.
 */
function resolveTargetBandForAnchor(
  bandsByPageNumber: ReadonlyMap<number, PageBodyMeasurementBand>,
  anchorBottomInEditor: number,
  maxPageNumber: number
): PageBodyMeasurementBand | null {
  for (let pageNumber = 1; pageNumber <= maxPageNumber; pageNumber += 1) {
    const candidate = bandsByPageNumber.get(pageNumber)
    if (candidate && candidate.bottom > anchorBottomInEditor - BAND_MATCH_TOLERANCE_PX) {
      return candidate
    }
  }

  return null
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
   * True only when bootstrapping from a DOM that does not yet contain any page
   * break spacer widgets. In that case later breaks must account for the
   * spacer heights planned for earlier breaks. Once spacers already exist in
   * the live DOM, anchor coordinates already include those offsets and adding
   * them again would double count.
   */
  bootstrapWithPlannedSpacerOffsets?: boolean
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
  const bootstrapWithPlannedSpacerOffsets = options.bootstrapWithPlannedSpacerOffsets ?? true
  let accumulatedManualBreakSpacerHeight = 0
  const sampledBreaks: Array<{
    pos: number
    nodeBottomInEditor: number | null
    adjustedNodeBottomInEditor: number | null
    targetPageNumber: number | null
    targetBandBottom: number | null
    height: number
    nodeSelected: boolean | null
    nextBlockTag: string | null
    nextBlockTopInEditor: number | null
    nextContentTag: string | null
    nextContentTopInEditor: number | null
    modelNextSiblingType: string | null
    modelNextSiblingEmptyParagraph: boolean | null
    modelPreviousSiblingType: string | null
    modelNodeIsAtom: boolean
    modelNodeIsLeaf: boolean
  }> = []
  let nullAnchorCount = 0
  let noTargetBandCount = 0
  let zeroHeightCount = 0

  const resolveDomContext = (entry: PageBreakEntry) => {
    if (!view) {
      return {
        nodeSelected: null,
        nextBlockTag: null,
        nextBlockTopInEditor: null
      }
    }

    const nodeDom = view.nodeDOM(entry.pos)
    if (!(nodeDom instanceof HTMLElement)) {
      return {
        nodeSelected: null,
        nextBlockTag: null,
        nextBlockTopInEditor: null
      }
    }

    const nextBlock = nodeDom.nextElementSibling
    let nextContentSibling: Element | null = nextBlock
    while (
      nextContentSibling instanceof HTMLElement &&
      (nextContentSibling.classList.contains('ProseMirror-widget') ||
        nextContentSibling.classList.contains(PAGE_BREAK_SPACER_CLASS))
    ) {
      nextContentSibling = nextContentSibling.nextElementSibling
    }
    const editorRect = view.dom.getBoundingClientRect()
    const nextBlockTopInEditor =
      nextBlock instanceof HTMLElement
        ? nextBlock.getBoundingClientRect().top - editorRect.top + view.dom.scrollTop
        : null
    const nextContentTopInEditor =
      nextContentSibling instanceof HTMLElement
        ? nextContentSibling.getBoundingClientRect().top - editorRect.top + view.dom.scrollTop
        : null

    return {
      nodeSelected: nodeDom.classList.contains('ProseMirror-selectednode'),
      nextBlockTag: nextBlock instanceof HTMLElement ? nextBlock.tagName.toLowerCase() : null,
      nextBlockTopInEditor,
      nextContentTag: nextContentSibling instanceof HTMLElement ? nextContentSibling.tagName.toLowerCase() : null,
      nextContentTopInEditor
    }
  }

  for (const entry of entries) {
    const domContext = resolveDomContext(entry)
    const modelNextSibling =
      entry.parent.childCount > entry.indexInParent + 1 ? entry.parent.child(entry.indexInParent + 1) : null
    const modelPreviousSibling = entry.indexInParent > 0 ? entry.parent.child(entry.indexInParent - 1) : null
    const modelContext = {
      modelNextSiblingType: modelNextSibling?.type?.name ?? null,
      modelNextSiblingEmptyParagraph:
        modelNextSibling?.type?.name === 'paragraph' ? modelNextSibling.content.size === 0 : null,
      modelPreviousSiblingType: modelPreviousSibling?.type?.name ?? null,
      modelNodeIsAtom: entry.node.isAtom,
      modelNodeIsLeaf: entry.node.isLeaf
    }
    const nodeBottomInEditor = resolveNodeBottom(entry)
    if (nodeBottomInEditor === null || !Number.isFinite(nodeBottomInEditor)) {
      nullAnchorCount += 1
      if (sampledBreaks.length < 5) {
        sampledBreaks.push({
          pos: entry.pos,
          nodeBottomInEditor: null,
          adjustedNodeBottomInEditor: null,
          targetPageNumber: null,
          targetBandBottom: null,
          height: 0,
          ...domContext,
          ...modelContext
        })
      }
      continue
    }

    const adjustedNodeBottomInEditor = bootstrapWithPlannedSpacerOffsets
      ? nodeBottomInEditor + accumulatedManualBreakSpacerHeight
      : nodeBottomInEditor
    const targetBand = resolveTargetBandForAnchor(bandsByPageNumber, adjustedNodeBottomInEditor, maxPageNumber)
    if (!targetBand) {
      noTargetBandCount += 1
      if (sampledBreaks.length < 5) {
        sampledBreaks.push({
          pos: entry.pos,
          nodeBottomInEditor,
          adjustedNodeBottomInEditor,
          targetPageNumber: null,
          targetBandBottom: null,
          height: 0,
          ...domContext,
          ...modelContext
        })
      }
      continue
    }

    const height = Math.max(0, Math.round(targetBand.bottom - adjustedNodeBottomInEditor))
    if (height <= 0) {
      zeroHeightCount += 1
      if (sampledBreaks.length < 5) {
        sampledBreaks.push({
          pos: entry.pos,
          nodeBottomInEditor,
          adjustedNodeBottomInEditor,
          targetPageNumber: targetBand.pageNumber,
          targetBandBottom: targetBand.bottom,
          height,
          ...domContext,
          ...modelContext
        })
      }
      continue
    }

    if (sampledBreaks.length < 5) {
      sampledBreaks.push({
        pos: entry.pos,
        nodeBottomInEditor,
        adjustedNodeBottomInEditor,
        targetPageNumber: targetBand.pageNumber,
        targetBandBottom: targetBand.bottom,
        height,
        ...domContext,
        ...modelContext
      })
    }
    accumulatedManualBreakSpacerHeight += height
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

  // #region agent log
  if (typeof globalThis.fetch === 'function') {
    fetch('http://127.0.0.1:7702/ingest/91afea52-34bb-4fee-ae2c-a538b0bae61d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'a41470' },
      body: JSON.stringify({
        sessionId: 'a41470',
        runId: 'post-fix',
        hypothesisId: 'H2',
        location: 'paginationPageBreakDecorationController.ts:283',
        message: 'page-break spacer build summary',
        data: {
          entryCount: entries.length,
          bandCount: bands.length,
          maxPageNumber,
          bootstrapWithPlannedSpacerOffsets,
          nullAnchorCount,
          noTargetBandCount,
          zeroHeightCount,
          decorationCount: decorations.length,
          accumulatedManualBreakSpacerHeight,
          sampledBreaks
        },
        timestamp: Date.now()
      })
    }).catch(() => {})
  }
  // #endregion

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
