/**
 * Forced pagination boundaries derived from manual pageBreak nodes.
 *
 * Manual page breaks in Word should be respected as hard page boundaries,
 * independently of what the measured DOM layout says. This module provides a
 * pure helper that inspects a ProseMirror document and returns the number of
 * forced page boundaries and the minimum page count they imply.
 *
 * Consecutive page breaks (separated only by empty blocks) still collapse to a
 * single blank page, mirroring the existing spacer collapse semantic in
 * `paginationPageBreakDecorationController.ts`.
 */

import type { Node as PMNode } from '@tiptap/pm/model'

export const PAGE_BREAK_NODE_NAME = 'pageBreak'

export interface ForcedPageBreakEntry {
  pos: number
  indexInParent: number
  /**
   * True when the very next non-empty sibling in the same parent is another
   * `pageBreak`. The spacer widget uses this to avoid drawing multiple
   * overlapping spacer bands; the page-count floor below still counts these
   * breaks, so two adjacent `pageBreak` nodes intentionally produce a blank
   * page between the surrounding content (Word-like semantics).
   */
  followedByAnotherBreak: boolean
}

export interface ForcedPageBoundarySummary {
  /** Every `pageBreak` node we saw, in document order. */
  breaks: ForcedPageBreakEntry[]
  /**
   * Number of forced boundaries implied by the manual breaks. Each `pageBreak`
   * node counts once - consecutive breaks therefore produce blank pages.
   */
  forcedBoundaryCount: number
  /**
   * Minimum number of pages the paginator must show to honor the manual page
   * breaks. Equal to `forcedBoundaryCount + 1`, clamped to at least 1.
   */
  minimumPageCount: number
}

function isEffectivelyEmptyBlock(node: PMNode): boolean {
  if (!node.isBlock) {
    return false
  }
  return node.content.size === 0
}

function isFollowedByAnotherBreak(parent: PMNode, indexInParent: number): boolean {
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
 * Derive the forced pagination boundary summary from a ProseMirror doc.
 *
 * Pure and side-effect free. Safe to call on every measurement pass - it does
 * not touch the DOM. Test harnesses that pass stubbed doc objects without a
 * `descendants` method receive an empty summary, mirroring a doc with no
 * manual page breaks.
 */
export function collectForcedPageBoundarySummary(doc: PMNode | null | undefined): ForcedPageBoundarySummary {
  const breaks: ForcedPageBreakEntry[] = []

  if (doc && typeof (doc as PMNode).descendants === 'function') {
    doc.descendants((node, pos, parent, index) => {
      if (node.type?.name !== PAGE_BREAK_NODE_NAME) {
        return
      }
      if (!parent) {
        return
      }
      breaks.push({
        pos,
        indexInParent: index,
        followedByAnotherBreak: isFollowedByAnotherBreak(parent, index)
      })
    })
  }

  const forcedBoundaryCount = breaks.length

  return {
    breaks,
    forcedBoundaryCount,
    minimumPageCount: Math.max(1, forcedBoundaryCount + 1)
  }
}

/**
 * Clamp a candidate page count so it never falls below the minimum implied by
 * the document's forced page boundaries.
 */
export function applyForcedPageBoundaryFloor(candidatePageCount: number, summary: ForcedPageBoundarySummary): number {
  if (!Number.isFinite(candidatePageCount)) {
    return summary.minimumPageCount
  }

  return Math.max(candidatePageCount, summary.minimumPageCount)
}
