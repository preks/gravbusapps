// Word TOC export helpers for static .docx output.

import { parseDocumentTocSnapshot } from './documentTocSnapshot'
import { type DocumentTocTextStyle, parseDocumentTocStyles } from './documentTocStyleUtils'

function escapeXml(text: string): string {
  return (text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildRightTabXml(element: HTMLElement): string {
  if (element.getAttribute('data-toc-show-page-numbers') === 'false') {
    return ''
  }

  const tabLeader = element.getAttribute('data-toc-tab-leader') === 'none' ? '' : ' w:leader="dot"'
  return `<w:tabs><w:tab w:val="right"${tabLeader} w:pos="9350"/></w:tabs>`
}

function buildParagraphStyleXml(styleId: string): string {
  return `<w:pStyle w:val="${escapeXml(styleId)}"/>`
}

function buildIndentXml(level: number): string {
  const left = Math.max(0, level - 1) * 360
  return left > 0 ? `<w:ind w:left="${left}"/>` : ''
}

function ptToHalfPoints(fontSizePt: number): number {
  return Math.max(2, Math.round(fontSizePt * 2))
}

function buildRunProps(style: DocumentTocTextStyle): string {
  const parts: string[] = []

  if (style.fontFamily) {
    const escapedFamily = escapeXml(style.fontFamily)
    parts.push(`<w:rFonts w:ascii="${escapedFamily}" w:hAnsi="${escapedFamily}"/>`)
  }
  if (style.fontSizePt !== null) {
    const halfPoints = ptToHalfPoints(style.fontSizePt)
    parts.push(`<w:sz w:val="${halfPoints}"/>`)
    parts.push(`<w:szCs w:val="${halfPoints}"/>`)
  }
  if (style.bold) {
    parts.push('<w:b/>')
  }
  if (style.italic) {
    parts.push('<w:i/>')
  }
  if (style.color) {
    parts.push(`<w:color w:val="${escapeXml(style.color.replace('#', ''))}"/>`)
  }

  return parts.length > 0 ? `<w:rPr>${parts.join('')}</w:rPr>` : ''
}

function buildTitleParagraph(title: string, style: DocumentTocTextStyle): string {
  if (!title.trim()) return ''
  const runProps = buildRunProps(style)
  return `<w:p><w:pPr>${buildParagraphStyleXml('TOCHeading')}<w:spacing w:after="120"/></w:pPr><w:r>${runProps}<w:t xml:space="preserve">${escapeXml(title)}</w:t></w:r></w:p>`
}

function buildEmptyParagraph(message: string, style: DocumentTocTextStyle): string {
  if (!message.trim()) return '<w:p/>'
  const runProps = buildRunProps(style)
  return `<w:p><w:pPr>${buildParagraphStyleXml('TOC1')}</w:pPr><w:r>${runProps}<w:t xml:space="preserve">${escapeXml(message)}</w:t></w:r></w:p>`
}

function buildCachedEntryParagraph(
  element: HTMLElement,
  level: number,
  text: string,
  pageNumber: string | null,
  style: DocumentTocTextStyle
): string {
  const boundedLevel = Math.min(Math.max(level, 1), 6)
  const pPr = `${buildParagraphStyleXml(`TOC${boundedLevel}`)}${buildRightTabXml(element)}${buildIndentXml(boundedLevel)}`
  const runProps = buildRunProps(style)
  const pageRuns =
    pageNumber && element.getAttribute('data-toc-show-page-numbers') !== 'false'
      ? `<w:r>${runProps}<w:tab/></w:r><w:r>${runProps}<w:t xml:space="preserve">${escapeXml(pageNumber)}</w:t></w:r>`
      : ''
  return `<w:p><w:pPr>${pPr}</w:pPr><w:r>${runProps}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>${pageRuns}</w:p>`
}

export function buildWordTocXmlFromElement(element: HTMLElement): string[] {
  const snapshot = parseDocumentTocSnapshot(element.getAttribute('data-toc-snapshot') ?? '[]')
  const styles = parseDocumentTocStyles(element.getAttribute('data-toc-styles'))
  const title = element.querySelector('.document-toc-print-title')?.textContent?.trim() ?? ''
  const emptyMessage = element.querySelector('.document-toc-print-empty')?.textContent?.trim() ?? ''
  const parts: string[] = []

  const titleParagraph = buildTitleParagraph(title, styles.title)
  if (titleParagraph) {
    parts.push(titleParagraph)
  }

  if (snapshot.entries.length === 0) {
    parts.push(buildEmptyParagraph(emptyMessage, styles.entries))
  } else {
    snapshot.entries.forEach(entry => {
      parts.push(buildCachedEntryParagraph(element, entry.level, entry.text || '', entry.pageNumber, styles.entries))
    })
  }

  return parts
}
