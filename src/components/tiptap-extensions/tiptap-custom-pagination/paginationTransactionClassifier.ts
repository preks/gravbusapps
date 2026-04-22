import type { Fragment, Node as PMNode } from '@tiptap/pm/model'
import type { Transaction } from '@tiptap/pm/state'
import { AddMarkStep, RemoveMarkStep, ReplaceStep, type Step } from '@tiptap/pm/transform'

const MAX_INTERVENING_TEXTBLOCKS_NEAR_TABLE = 5

export interface PaginationTransactionChangedRange {
  from: number
  to: number
}

export type PaginationTransactionChangeKind = 'selection' | 'mark' | 'local-text' | 'structure'

export interface PaginationTransactionClassification {
  kind: PaginationTransactionChangeKind
  changedRanges: PaginationTransactionChangedRange[]
  touchesTable: boolean
  touchesTableAdjacentContent: boolean
  touchesTableRegion: boolean
  isLayoutNeutral: boolean
  shouldScheduleSettledRefresh: boolean
}

function clampPosition(doc: PMNode, position: number) {
  return Math.max(0, Math.min(position, doc.content.size))
}

function resolveStepRange(step: Step): PaginationTransactionChangedRange | null {
  if ('from' in step && 'to' in step) {
    const from = (step as Step & { from?: unknown }).from
    const to = (step as Step & { to?: unknown }).to
    if (typeof from === 'number' && typeof to === 'number') {
      return {
        from: Math.min(from, to),
        to: Math.max(from, to)
      }
    }
  }

  if ('pos' in step) {
    const pos = (step as Step & { pos?: unknown }).pos
    if (typeof pos === 'number') {
      return {
        from: pos,
        to: pos
      }
    }
  }

  return null
}

function fragmentContainsInlineOnlyContent(fragment: Fragment) {
  for (let index = 0; index < fragment.childCount; index += 1) {
    if (!fragment.child(index).isInline) {
      return false
    }
  }

  return true
}

function isInlineTextReplaceStep(step: Step, previousDoc: PMNode | null) {
  if (!(step instanceof ReplaceStep) || previousDoc === null) {
    return false
  }

  const from = clampPosition(previousDoc, step.from)
  const to = clampPosition(previousDoc, step.to)
  const $from = previousDoc.resolve(from)
  const $to = previousDoc.resolve(to)

  return $from.sameParent($to) && $from.parent.isTextblock && fragmentContainsInlineOnlyContent(step.slice.content)
}

function isTableNodeName(name: string | undefined) {
  return name === 'table' || name === 'tableRow' || name === 'tableCell' || name === 'tableHeader'
}

function nodeContainsTable(node: PMNode | null | undefined) {
  if (!node) {
    return false
  }

  if (isTableNodeName(node.type.name)) {
    return true
  }

  let containsTable = false
  node.descendants(descendant => {
    if (isTableNodeName(descendant.type.name)) {
      containsTable = true
      return false
    }

    return true
  })

  return containsTable
}

function nodeContainsTextblock(node: PMNode | null | undefined) {
  if (!node) {
    return false
  }

  if (node.isTextblock) {
    return true
  }

  let containsTextblock = false
  node.descendants(descendant => {
    if (descendant.isTextblock) {
      containsTextblock = true
      return false
    }

    return true
  })

  return containsTextblock
}

function isTableAdjacencyBridgeNode(node: PMNode | null | undefined) {
  if (!node) {
    return false
  }

  if (node.isTextblock) {
    return true
  }

  return node.isBlock && !node.isAtom && !node.isLeaf && !nodeContainsTable(node) && nodeContainsTextblock(node)
}

function hasNearbyTableSibling(parent: PMNode, indexInParent: number, direction: -1 | 1) {
  let traversedTextblocks = 0

  for (
    let siblingIndex = indexInParent + direction;
    siblingIndex >= 0 && siblingIndex < parent.childCount;
    siblingIndex += direction
  ) {
    const sibling = parent.child(siblingIndex)
    if (nodeContainsTable(sibling)) {
      return true
    }

    if (!isTableAdjacencyBridgeNode(sibling)) {
      return false
    }

    traversedTextblocks += 1
    if (traversedTextblocks > MAX_INTERVENING_TEXTBLOCKS_NEAR_TABLE) {
      return false
    }
  }

  return false
}

function positionHasTableAncestor(doc: PMNode | null, position: number) {
  if (doc === null) {
    return false
  }

  const $pos = doc.resolve(clampPosition(doc, position))
  for (let depth = $pos.depth; depth >= 0; depth -= 1) {
    if (isTableNodeName($pos.node(depth).type.name)) {
      return true
    }
  }

  return false
}

function rangeTouchesTable(doc: PMNode | null, range: PaginationTransactionChangedRange) {
  if (doc === null) {
    return false
  }

  if (positionHasTableAncestor(doc, range.from) || positionHasTableAncestor(doc, range.to)) {
    return true
  }

  const from = clampPosition(doc, range.from)
  const to = clampPosition(doc, range.to)
  let foundTable = false

  doc.nodesBetween(from, to, node => {
    if (isTableNodeName(node.type.name)) {
      foundTable = true
      return false
    }

    return true
  })

  return foundTable
}

function isTableAdjacentAtPosition(doc: PMNode | null, position: number) {
  if (doc === null) {
    return false
  }

  const $pos = doc.resolve(clampPosition(doc, position))
  if (hasNearbyTableSibling($pos.node(0), $pos.index(0), -1) || hasNearbyTableSibling($pos.node(0), $pos.index(0), 1)) {
    return true
  }

  for (let depth = $pos.depth; depth > 1; depth -= 1) {
    const parent = $pos.node(depth - 1)
    const indexInParent = $pos.index(depth - 1)
    if (hasNearbyTableSibling(parent, indexInParent, -1) || hasNearbyTableSibling(parent, indexInParent, 1)) {
      return true
    }
  }

  return false
}

export function classifyPaginationTransaction(options: {
  transaction: Pick<Transaction, 'docChanged' | 'steps'>
  previousDoc?: PMNode | null
  nextDoc?: PMNode | null
}): PaginationTransactionClassification {
  if (!options.transaction.docChanged) {
    return {
      kind: 'selection',
      changedRanges: [],
      touchesTable: false,
      touchesTableAdjacentContent: false,
      touchesTableRegion: false,
      isLayoutNeutral: false,
      shouldScheduleSettledRefresh: false
    }
  }

  const previousDoc = options.previousDoc ?? null
  const nextDoc = options.nextDoc ?? null
  const steps = options.transaction.steps ?? []
  const changedRanges = steps
    .map(step => resolveStepRange(step))
    .filter((range): range is PaginationTransactionChangedRange => range !== null)
  const isMarkOnlyChange =
    steps.length > 0 && steps.every(step => step instanceof AddMarkStep || step instanceof RemoveMarkStep)
  const isLocalTextChange =
    !isMarkOnlyChange && steps.length > 0 && steps.every(step => isInlineTextReplaceStep(step, previousDoc))
  const touchesTable = changedRanges.some(
    range => rangeTouchesTable(previousDoc, range) || rangeTouchesTable(nextDoc, range)
  )
  const touchesTableAdjacentContent =
    !touchesTable &&
    changedRanges.some(
      range =>
        isTableAdjacentAtPosition(previousDoc, range.from) ||
        isTableAdjacentAtPosition(previousDoc, range.to) ||
        isTableAdjacentAtPosition(nextDoc, range.from) ||
        isTableAdjacentAtPosition(nextDoc, range.to)
    )
  const kind: PaginationTransactionChangeKind = isMarkOnlyChange
    ? 'mark'
    : isLocalTextChange
      ? 'local-text'
      : 'structure'
  const touchesTableRegion = touchesTable || touchesTableAdjacentContent
  const isLayoutNeutral = kind === 'mark' && !touchesTableRegion

  return {
    kind,
    changedRanges,
    touchesTable,
    touchesTableAdjacentContent,
    touchesTableRegion,
    isLayoutNeutral,
    shouldScheduleSettledRefresh: kind === 'structure' || touchesTableRegion
  }
}
