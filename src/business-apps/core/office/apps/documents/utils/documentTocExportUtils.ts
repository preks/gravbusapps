/**
 * Enriches exported HTML for in-document Table of Contents blocks so print/PDF/Word
 * match the stored Word-style field result used inside the editor.
 */

import type { Editor } from '@tiptap/core'
import type { Node as PMNode } from '@tiptap/pm/model'
import { parseDocumentTocSnapshot } from './documentTocSnapshot'
import { escapeHtmlText } from './exportUtils'

const DOCUMENT_TOC_NODE = 'documentTableOfContents'

export type DocumentTocExportLabels = {
  blockTitle: string
  emptyMessage: string
  untitledHeading: string
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

function buildTocInnerHtml(attrs: Record<string, unknown>, labels: DocumentTocExportLabels): string {
  const showPageNumbers = attrs.showPageNumbers !== false
  const rightAlignPageNumbers = attrs.rightAlignPageNumbers !== false
  const tabLeader = attrs.tabLeader === 'none' ? 'none' : 'dot'
  const headings = parseDocumentTocSnapshot(String(attrs.snapshotJson ?? '[]')).entries

  const titleHtml = `<div class="document-toc-print-title">${escapeHtmlText(labels.blockTitle)}</div>`

  if (headings.length === 0) {
    return `<div class="document-toc-print-inner">${titleHtml}<p class="document-toc-print-empty">${escapeHtmlText(labels.emptyMessage)}</p></div>`
  }

  const rows: string[] = [titleHtml]
  for (const entry of headings) {
    const pageLabel = showPageNumbers ? (entry.pageNumber ?? '') : ''
    const text = escapeHtmlText(entry.text?.trim() ? entry.text : labels.untitledHeading)
    const levelClass = `document-toc-print-level document-toc-level-${Math.min(Math.max(entry.level, 1), 6)}`

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
      el.innerHTML = buildTocInnerHtml(inst.attrs, labels)
    })

    return doc.body.innerHTML
  } catch {
    return html
  }
}
