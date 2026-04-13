// Word TOC field export helpers for refreshable .docx output.

import { parseDocumentTocSnapshot } from './documentTocSnapshot'

function escapeXml(text: string): string {
  return (text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function normalizeMaxHeadingLevel(value: string | null): number {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return 3
  return Math.max(1, Math.min(6, parsed))
}

function buildTocInstruction(element: HTMLElement): string {
  const maxHeadingLevel = normalizeMaxHeadingLevel(element.getAttribute('data-toc-max-heading-level'))
  const showPageNumbers = element.getAttribute('data-toc-show-page-numbers') !== 'false'
  const headingLinks = element.getAttribute('data-toc-heading-links') !== 'false'

  const switches = [` TOC \\o "1-${maxHeadingLevel}"`]
  if (headingLinks) {
    switches.push(' \\h')
  }
  if (!showPageNumbers) {
    switches.push(' \\n')
  }

  return switches.join('')
}

function buildRightTabXml(element: HTMLElement): string {
  if (element.getAttribute('data-toc-show-page-numbers') === 'false') {
    return ''
  }

  const tabLeader = element.getAttribute('data-toc-tab-leader') === 'none' ? '' : ' w:leader="dot"'
  return `<w:tabs><w:tab w:val="right"${tabLeader} w:pos="9350"/></w:tabs>`
}

function buildIndentXml(level: number): string {
  const left = Math.max(0, level - 1) * 360
  return left > 0 ? `<w:ind w:left="${left}"/>` : ''
}

function buildTitleParagraph(title: string): string {
  if (!title.trim()) return ''
  return `<w:p><w:pPr><w:spacing w:after="120"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${escapeXml(title)}</w:t></w:r></w:p>`
}

function buildEmptyParagraph(message: string): string {
  if (!message.trim()) return '<w:p/>'
  return `<w:p><w:r><w:t xml:space="preserve">${escapeXml(message)}</w:t></w:r></w:p>`
}

function buildCachedEntryParagraph(
  element: HTMLElement,
  level: number,
  text: string,
  pageNumber: string | null
): string {
  const pPr = `${buildRightTabXml(element)}${buildIndentXml(level)}`
  const pageRuns =
    pageNumber && element.getAttribute('data-toc-show-page-numbers') !== 'false'
      ? `<w:r><w:tab/></w:r><w:r><w:t xml:space="preserve">${escapeXml(pageNumber)}</w:t></w:r>`
      : ''
  return `<w:p><w:pPr>${pPr}</w:pPr><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>${pageRuns}</w:p>`
}

export function buildWordTocFieldXmlFromElement(element: HTMLElement): string[] {
  const snapshot = parseDocumentTocSnapshot(element.getAttribute('data-toc-snapshot') ?? '[]')
  const title = element.querySelector('.document-toc-print-title')?.textContent?.trim() ?? ''
  const emptyMessage = element.querySelector('.document-toc-print-empty')?.textContent?.trim() ?? ''
  const parts: string[] = []

  const titleParagraph = buildTitleParagraph(title)
  if (titleParagraph) {
    parts.push(titleParagraph)
  }

  parts.push(
    `<w:p><w:r><w:fldChar w:fldCharType="begin" w:dirty="true"/></w:r><w:r><w:instrText xml:space="preserve">${escapeXml(buildTocInstruction(element))}</w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r></w:p>`
  )

  if (snapshot.entries.length === 0) {
    parts.push(buildEmptyParagraph(emptyMessage))
  } else {
    snapshot.entries.forEach(entry => {
      parts.push(buildCachedEntryParagraph(element, entry.level, entry.text || '', entry.pageNumber))
    })
  }

  parts.push('<w:p><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>')

  return parts
}
