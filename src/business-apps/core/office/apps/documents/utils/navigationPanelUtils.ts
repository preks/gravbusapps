/**
 * Utilities for Navigation panel: headings extraction, find positions, replace.
 * Works with ProseMirror document (editor.state.doc).
 */

import type { Node as PMNode } from '@tiptap/pm/model'
import type { Transaction } from '@tiptap/pm/state'
import type { DocumentLayoutPageSpan } from '../types'

export interface HeadingItem {
  level: number
  text: string
  /** Cursor position inside the heading (for selection / scroll). */
  pos: number
  /** ProseMirror position immediately before the heading node. */
  blockStart: number
}

/**
 * Collect all heading nodes from the document (flat list with pos).
 */
export function getHeadingsFromDoc(doc: PMNode): HeadingItem[] {
  const items: HeadingItem[] = []
  doc.descendants((node: PMNode, pos: number) => {
    if (node.type.name === 'heading') {
      const rawLevel = (node.attrs?.level as number) ?? 1
      const level = Math.max(1, Math.min(6, Number.isFinite(rawLevel) ? rawLevel : 1))
      // Only real outline levels (1–6). Paragraph / “Normal” uses `paragraph`, not `heading`.
      // `pos` is the index before the heading node; cursor/text selection must be inside the block (pos + 1).
      // pos === 0 for the first doc child would resolve to parent `doc` and trigger PM TextSelection warnings.
      items.push({
        level,
        text: node.textContent,
        pos: pos + 1,
        blockStart: pos
      })
    }
  })
  return items
}

/**
 * Headings whose block starts at or after `minBlockStart` (e.g. after a table-of-contents block).
 */
export function getHeadingsForDocumentTableOfContents(doc: PMNode, minBlockStart: number): HeadingItem[] {
  return getHeadingsFromDoc(doc).filter(h => h.blockStart >= minBlockStart)
}

/**
 * Map a document position to a printed page number using layout spans (pagination).
 */
export function resolvePageNumberForDocPosition(
  pos: number,
  spans: Array<Pick<DocumentLayoutPageSpan, 'pageNumber' | 'startPos' | 'endPos'>> | undefined
): number | null {
  if (!Number.isInteger(pos) || pos < 0 || !spans?.length) {
    return null
  }
  const range = spans.find(candidate => pos >= candidate.startPos && pos <= candidate.endPos)
  return range?.pageNumber ?? null
}

export interface FindMatch {
  from: number
  to: number
}

const WORD_CHAR = /\w/

function isWordBoundaryAt(doc: PMNode, pos: number, side: 'before' | 'after'): boolean {
  const size = doc.content.size
  if (side === 'before') {
    if (pos <= 0) return true
    const char = doc.textBetween(pos - 1, pos)
    return char === '' || !WORD_CHAR.test(char)
  }
  if (pos >= size) return true
  const char = doc.textBetween(pos, pos + 1)
  return char === '' || !WORD_CHAR.test(char)
}

/**
 * Find all occurrences of searchTerm in the document. Returns sorted [from, to] ranges.
 * caseSensitive: if false, comparison is case-insensitive.
 * wholeWordsOnly: if true, only match when the term is bounded by non-word characters.
 */
export function findMatchesInDoc(
  doc: PMNode,
  searchTerm: string,
  caseSensitive: boolean,
  wholeWordsOnly = false
): FindMatch[] {
  const matches: FindMatch[] = []
  if (!searchTerm.trim()) return matches

  const needle = caseSensitive ? searchTerm : searchTerm.toLowerCase()

  doc.descendants((node: PMNode, pos: number) => {
    if (!node.isText || !node.text) return
    const text = node.text
    const haystack = caseSensitive ? text : text.toLowerCase()
    let start = 0
    let idx: number
    while ((idx = haystack.indexOf(needle, start)) !== -1) {
      const from = pos + idx
      const to = from + searchTerm.length
      if (wholeWordsOnly) {
        if (isWordBoundaryAt(doc, from, 'before') && isWordBoundaryAt(doc, to, 'after')) {
          matches.push({ from, to })
        }
      } else {
        matches.push({ from, to })
      }
      start = idx + 1
    }
  })

  return matches
}

const ELLIPSIS = '\u2026'

/**
 * Get a short snippet of text around a match for display in the matches list.
 * @param doc - ProseMirror document
 * @param from - match start position
 * @param to - match end position
 * @param maxContext - max chars of context on each side (default 30)
 */
export function getMatchSnippet(doc: PMNode, from: number, to: number, maxContext = 30): string {
  const size = doc.content.size
  const start = Math.max(0, from - maxContext)
  const end = Math.min(size, to + maxContext)
  let text = doc.textBetween(start, end).replace(/\s+/g, ' ').trim()
  if (start > 0) text = ELLIPSIS + text
  if (end < size) text = text + ELLIPSIS
  return text || ''
}

/**
 * Build a transaction that replaces a single range with replaceText.
 * Caller must dispatch the transaction.
 */
export function replaceRange(tr: Transaction, from: number, to: number, replaceText: string): Transaction {
  const schema = tr.doc.type.schema
  return tr.replaceWith(from, to, schema.text(replaceText))
}

/**
 * Build a transaction that replaces all given ranges with replaceText.
 * Ranges must be applied from end to start to avoid offset shifts.
 */
export function replaceAllRanges(tr: Transaction, ranges: FindMatch[], replaceText: string): Transaction {
  const sorted = [...ranges].sort((a, b) => b.from - a.from)
  for (const { from, to } of sorted) {
    tr = replaceRange(tr, from, to, replaceText)
  }
  return tr
}
