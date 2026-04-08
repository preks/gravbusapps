/**
 * Enriches exported HTML for in-document Table of Contents blocks so print/PDF/Word
 * match the Word-style layout (title, leaders, page numbers) from the live editor.
 */

import type { Editor } from '@tiptap/core'
import type { Node as PMNode } from '@tiptap/pm/model'
import { escapeHtmlText } from './exportUtils'
import {
  getHeadingsForDocumentTableOfContents,
  resolvePageNumberForDocPosition,
  type HeadingItem
} from './navigationPanelUtils'
import { getDocumentTocLayoutHints } from './tocLayoutBridge'
import type { DocumentLayoutPageSpan } from '../types'

const DOCUMENT_TOC_NODE = 'documentTableOfContents'

export type DocumentTocExportLabels = {
  blockTitle: string
  emptyMessage: string
  untitledHeading: string
  /**
   * When set, headings whose text matches this (case-insensitive, normalized whitespace)
   * are omitted from the export ToC — avoids listing the document title again as a section.
   */
  duplicateHeadingFilterDocumentTitle?: string
}

function normalizeTocHeadingKey(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase()
}

function shouldIncludeHeadingInExportToc(h: HeadingItem, labels: DocumentTocExportLabels): boolean {
  const raw = h.text?.trim() ? h.text : ''
  const key = normalizeTocHeadingKey(raw)
  if (!key) return true
  if (key === normalizeTocHeadingKey(labels.blockTitle)) return false
  const docTitle = labels.duplicateHeadingFilterDocumentTitle?.trim()
  if (docTitle && key === normalizeTocHeadingKey(docTitle)) return false
  return true
}

function normalizeMaxHeadingLevel(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return 3
  return Math.max(1, Math.min(6, parsed))
}

function resolveSpansForExport():
  | Array<Pick<DocumentLayoutPageSpan, 'pageNumber' | 'startPos' | 'endPos'>>
  | undefined {
  const hints = getDocumentTocLayoutHints()
  if (!hints) return undefined
  if (hints.pageSpans && hints.pageSpans.length > 0) {
    return hints.pageSpans
  }
  if (hints.retainedPageSpans && hints.retainedPageSpans.length > 0) {
    return hints.retainedPageSpans
  }
  return hints.pagePositionRanges
}

function resolveFallbackPageNumber(doc: PMNode, pos: number): number {
  let pageNumber = 1
  doc.descendants((node, nodePos) => {
    if (nodePos >= pos) return false
    if (node.type.name === 'pageBreak') {
      pageNumber += 1
    }
    return true
  })
  return pageNumber
}

function collectDocumentTocInstances(doc: PMNode): { pos: number; nodeSize: number; attrs: Record<string, unknown> }[] {
  const out: { pos: number; nodeSize: number; attrs: Record<string, unknown> }[] = []
  doc.descendants((node, pos) => {
    if (node.type.name === DOCUMENT_TOC_NODE) {
      out.push({ pos, nodeSize: node.nodeSize, attrs: { ...node.attrs } })
    }
    return true
  })
  return out
}

function buildTocInnerHtml(
  doc: PMNode,
  afterPos: number,
  attrs: Record<string, unknown>,
  labels: DocumentTocExportLabels
): string {
  const maxLevel = normalizeMaxHeadingLevel(attrs.maxHeadingLevel)
  const showPageNumbers = attrs.showPageNumbers !== false
  const rightAlignPageNumbers = attrs.rightAlignPageNumbers !== false
  const tabLeader = attrs.tabLeader === 'none' ? 'none' : 'dot'
  const rawHeadings = getHeadingsForDocumentTableOfContents(doc, afterPos)
    .filter(h => h.level <= maxLevel)
    .filter(h => shouldIncludeHeadingInExportToc(h, labels))
  const seenStarts = new Set<number>()
  const headings = rawHeadings.filter(h => {
    if (seenStarts.has(h.blockStart)) return false
    seenStarts.add(h.blockStart)
    return true
  })
  const spans = resolveSpansForExport()

  const titleHtml = `<div class="document-toc-print-title">${escapeHtmlText(labels.blockTitle)}</div>`

  if (headings.length === 0) {
    return `<div class="document-toc-print-inner">${titleHtml}<p class="document-toc-print-empty">${escapeHtmlText(labels.emptyMessage)}</p></div>`
  }

  const rows: string[] = [titleHtml]
  for (const h of headings) {
    const pageNum = resolvePageNumberForDocPosition(h.blockStart, spans)
    let pageLabel = ''
    if (showPageNumbers) {
      if (pageNum !== null) {
        pageLabel = String(pageNum)
      } else {
        pageLabel = String(resolveFallbackPageNumber(doc, h.blockStart))
      }
    }
    const text = escapeHtmlText(h.text?.trim() ? h.text : labels.untitledHeading)
    const levelClass = `document-toc-print-level document-toc-level-${Math.min(Math.max(h.level, 1), 6)}`

    if (rightAlignPageNumbers) {
      const leaderInner =
        tabLeader === 'dot' && pageLabel !== ''
          ? '<span class="document-toc-print-leader-fill document-toc-print-leader-fill-dot"></span>'
          : '<span class="document-toc-print-leader-fill document-toc-print-leader-fill-gap"></span>'
      const pageCell =
        pageLabel !== ''
          ? `<div class="document-toc-print-page-cell">${escapeHtmlText(pageLabel)}</div>`
          : '<div class="document-toc-print-page-cell"></div>'
      rows.push(
        `<div class="document-toc-print-row ${levelClass}">` +
          `<div class="document-toc-print-line document-toc-print-line-flex" role="presentation">` +
          `<div class="document-toc-print-title-cell">${text}</div>` +
          `<div class="document-toc-print-leader-cell" aria-hidden="true">${leaderInner}</div>` +
          `${pageCell}` +
          `</div></div>`
      )
    } else {
      const leaderHtml =
        tabLeader === 'dot' && pageLabel !== ''
          ? '<span class="document-toc-print-leader-inline" aria-hidden="true"></span>'
          : ''
      const pageHtml =
        pageLabel !== ''
          ? `<span class="document-toc-print-page document-toc-print-page-inline">${escapeHtmlText(pageLabel)}</span>`
          : ''
      rows.push(
        `<div class="document-toc-print-row ${levelClass}">` +
          `<div class="document-toc-print-row-inline">` +
          `<span class="document-toc-print-text document-toc-print-text-wrap">${text}</span>` +
          leaderHtml +
          pageHtml +
          `</div></div>`
      )
    }
  }

  return `<div class="document-toc-print-inner">${rows.join('')}</div>`
}

/**
 * Replaces each `[data-document-toc]` block's inner HTML with print-oriented markup
 * derived from the live document and layout hints. No-op if counts mismatch or DOM is unavailable.
 */
export function enrichDocumentTableOfContentsForExport(
  editor: Editor,
  html: string,
  labels: DocumentTocExportLabels
): string {
  if (typeof DOMParser === 'undefined' || !html) return html

  const pmDoc = editor.state?.doc
  if (!pmDoc) return html

  const instances = collectDocumentTocInstances(pmDoc)
  if (instances.length === 0) return html

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const elements = doc.body.querySelectorAll('[data-document-toc]')
    if (elements.length !== instances.length) {
      return html
    }

    elements.forEach((el, index) => {
      const inst = instances[index]
      if (!inst) return
      const afterPos = inst.pos + inst.nodeSize
      el.innerHTML = buildTocInnerHtml(pmDoc, afterPos, inst.attrs, labels)
    })

    return doc.body.innerHTML
  } catch {
    return html
  }
}
