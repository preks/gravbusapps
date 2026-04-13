// DOCX table-of-contents import helpers for Word field results.

import JSZip from 'jszip'
import { createDocumentTocSnapshot, stringifyDocumentTocSnapshot } from './documentTocSnapshot'

export interface ImportedDocxTableOfContents {
  snapshotJson: string
  showPageNumbers: boolean
  rightAlignPageNumbers: boolean
  tabLeader: 'dot' | 'none'
  headingLinks: boolean
  maxHeadingLevel: number
  titleText?: string | null
}

type ParsedParagraph = {
  styleId: string | null
  text: string
  hasBegin: boolean
  hasSeparate: boolean
  hasEnd: boolean
  instrText: string
}

function elementLocalName(el: Element): string {
  if (typeof el.localName === 'string' && el.localName.length > 0) {
    return el.localName
  }
  const colon = el.tagName.indexOf(':')
  return colon >= 0 ? el.tagName.slice(colon + 1) : el.tagName
}

function descendantsByLocalName(root: Element, localName: string): Element[] {
  return Array.from(root.getElementsByTagName('*')).filter(el => elementLocalName(el) === localName)
}

function firstChildByLocalName(parent: Element, localName: string): Element | null {
  for (const child of Array.from(parent.children)) {
    if (elementLocalName(child) === localName) return child
  }
  return null
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function readParagraphText(paragraph: Element): string {
  let text = ''
  for (const element of Array.from(paragraph.getElementsByTagName('*'))) {
    const localName = elementLocalName(element)
    if (localName === 'tab') {
      text += '\t'
    } else if (localName === 't') {
      text += element.textContent ?? ''
    }
  }
  return text
    .replace(/[ \n\r]+/g, ' ')
    .replace(/\t+/g, '\t')
    .split('\t')
    .map(segment => normalizeWhitespace(segment))
    .join('\t')
    .trim()
}

function readParagraph(paragraph: Element): ParsedParagraph {
  const pPr = descendantsByLocalName(paragraph, 'pPr')[0]
  const pStyle = pPr ? firstChildByLocalName(pPr, 'pStyle') : null
  const fieldChars = descendantsByLocalName(paragraph, 'fldChar')
  const hasBegin = fieldChars.some(
    el => el.getAttribute('w:fldCharType') === 'begin' || el.getAttribute('fldCharType') === 'begin'
  )
  const hasSeparate = fieldChars.some(
    el => el.getAttribute('w:fldCharType') === 'separate' || el.getAttribute('fldCharType') === 'separate'
  )
  const hasEnd = fieldChars.some(
    el => el.getAttribute('w:fldCharType') === 'end' || el.getAttribute('fldCharType') === 'end'
  )
  const instrText = descendantsByLocalName(paragraph, 'instrText')
    .map(el => el.textContent ?? '')
    .join('')

  return {
    styleId: pStyle?.getAttribute('w:val') ?? pStyle?.getAttribute('val') ?? null,
    text: readParagraphText(paragraph),
    hasBegin,
    hasSeparate,
    hasEnd,
    instrText
  }
}

function parseTocInstruction(instrText: string) {
  const levelMatch = instrText.match(/\\o\s+"(\d+)-(\d+)"/)
  const maxHeadingLevel = levelMatch ? Math.max(1, Math.min(6, Number.parseInt(levelMatch[2] ?? '3', 10))) : 3
  const headingLinks = instrText.includes('\\h')
  const showPageNumbers = !instrText.includes('\\n')
  const separatorMatch = instrText.match(/\\p\s+"([^"]+)"/)
  const tabLeader = separatorMatch && separatorMatch[1] !== '.' ? 'none' : 'dot'

  return {
    maxHeadingLevel,
    headingLinks,
    showPageNumbers,
    tabLeader
  } as const
}

function extractTocTextAndPageNumber(
  rawText: string,
  explicitPageNumber?: string | null
): { text: string; pageNumber: string | null } {
  const normalizedText = normalizeWhitespace(rawText)
  const normalizedExplicitPageNumber = normalizeWhitespace(explicitPageNumber ?? '') || null

  if (!normalizedText) {
    return {
      text: '',
      pageNumber: normalizedExplicitPageNumber
    }
  }

  if (normalizedExplicitPageNumber) {
    const escapedPageNumber = normalizedExplicitPageNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const trailingPageNumberPattern = new RegExp(`(?:\\s|\\t)+${escapedPageNumber}$`)
    const textWithoutDuplicatedPageNumber = normalizeWhitespace(normalizedText.replace(trailingPageNumberPattern, ''))

    return {
      text: textWithoutDuplicatedPageNumber || normalizedText,
      pageNumber: normalizedExplicitPageNumber
    }
  }

  const trailingPageNumberMatch = normalizedText.match(/^(.*?)(?:\s+|\t)(\d+)$/)
  if (!trailingPageNumberMatch) {
    return {
      text: normalizedText,
      pageNumber: null
    }
  }

  return {
    text: normalizeWhitespace(trailingPageNumberMatch[1] ?? ''),
    pageNumber: trailingPageNumberMatch[2] ?? null
  }
}

function parseFieldResultEntry(paragraph: ParsedParagraph) {
  const levelMatch = paragraph.styleId?.match(/^TOC([1-9])$/i)
  if (!levelMatch) return null

  const level = Math.max(1, Math.min(6, Number.parseInt(levelMatch[1] ?? '1', 10)))
  const [rawText, rawPageNumber] = paragraph.text.split('\t')
  const { text, pageNumber } = extractTocTextAndPageNumber(rawText ?? '', rawPageNumber ?? null)
  if (!text) return null

  return {
    level,
    text,
    pos: -1,
    blockStart: -1,
    pageNumber
  }
}

function isTocTitleParagraph(paragraph: ParsedParagraph): boolean {
  return paragraph.styleId?.toLowerCase() === 'tocheading'
}

export function parseDocumentXmlForTableOfContents(xml: string): ImportedDocxTableOfContents | null {
  if (!xml || globalThis.DOMParser === undefined) return null

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'application/xml')
    if (doc.getElementsByTagName('parsererror').length > 0) {
      return null
    }

    const paragraphs = descendantsByLocalName(doc.documentElement, 'p').map(readParagraph)
    let inCandidate = false
    let isTocField = false
    let isReadingResult = false
    let instruction = ''
    let titleText: string | null = null
    const entries: Array<ReturnType<typeof parseFieldResultEntry>> = []

    for (const paragraph of paragraphs) {
      if (paragraph.hasBegin) {
        inCandidate = true
        isTocField = false
        isReadingResult = false
        instruction = ''
        titleText = null
        entries.length = 0
      }

      if (!inCandidate) {
        continue
      }

      instruction += paragraph.instrText
      if (instruction.includes('TOC')) {
        isTocField = true
      }

      if (paragraph.hasSeparate && isTocField) {
        isReadingResult = true
        continue
      }

      if (paragraph.hasEnd) {
        if (!isTocField) {
          inCandidate = false
          continue
        }

        const config = parseTocInstruction(instruction)
        const snapshot = createDocumentTocSnapshot(
          entries.filter((entry): entry is NonNullable<typeof entry> => entry !== null),
          {
            updateMode: 'imported',
            layoutVersion: null
          }
        )

        return {
          snapshotJson: stringifyDocumentTocSnapshot(snapshot),
          showPageNumbers: config.showPageNumbers,
          rightAlignPageNumbers: true,
          tabLeader: config.tabLeader,
          headingLinks: config.headingLinks,
          maxHeadingLevel: config.maxHeadingLevel,
          titleText
        }
      }

      if (isReadingResult && isTocField) {
        if (isTocTitleParagraph(paragraph) && paragraph.text.trim()) {
          titleText = paragraph.text.trim()
          continue
        }
        entries.push(parseFieldResultEntry(paragraph))
      }
    }

    return null
  } catch {
    return null
  }
}

export async function parseDocxTableOfContents(arrayBuffer: ArrayBuffer): Promise<ImportedDocxTableOfContents | null> {
  try {
    const zip = await JSZip.loadAsync(arrayBuffer)
    const entry = zip.file('word/document.xml')
    if (!entry) return null
    return parseDocumentXmlForTableOfContents(await entry.async('string'))
  } catch {
    return null
  }
}

function buildTocElement(doc: Document, toc: ImportedDocxTableOfContents): HTMLElement {
  const element = doc.createElement('div')
  element.setAttribute('data-document-toc', '')
  element.className = 'document-table-of-contents'
  element.setAttribute('data-toc-snapshot', toc.snapshotJson)
  element.setAttribute('data-toc-show-page-numbers', String(toc.showPageNumbers))
  element.setAttribute('data-toc-right-align-page-numbers', String(toc.rightAlignPageNumbers))
  element.setAttribute('data-toc-tab-leader', toc.tabLeader)
  element.setAttribute('data-toc-heading-links', String(toc.headingLinks))
  element.setAttribute('data-toc-max-heading-level', String(toc.maxHeadingLevel))
  return element
}

function normalizeTocTitleKey(text: string): string {
  return normalizeWhitespace(text).toLowerCase()
}

function doesElementLookLikeTocRow(element: Element, entryText: string): boolean {
  const text = normalizeWhitespace(element.textContent ?? '')
  if (!text) return false
  const entryKey = normalizeWhitespace(entryText)
  if (!entryKey) return false
  if (text === entryKey || text.startsWith(entryKey) || text.includes(entryKey)) {
    return true
  }

  const firstLinkText = normalizeWhitespace(element.querySelector('a')?.textContent ?? '')
  return firstLinkText === entryKey
}

function looksLikeTocTitle(element: Element, toc: ImportedDocxTableOfContents): boolean {
  const text = normalizeTocTitleKey(element.textContent ?? '')
  if (!text) return false

  const explicitTitle = normalizeTocTitleKey(toc.titleText ?? '')
  if (explicitTitle && text === explicitTitle) {
    return true
  }

  return ['table of contents', 'contents', 'inhaltsverzeichnis', 'cuprins'].includes(text)
}

function findTocEntryRange(
  bodyChildren: Element[],
  entryTexts: string[]
): { firstRowIndex: number; lastRowIndex: number } | null {
  if (entryTexts.length === 0) return null

  for (let startIndex = 0; startIndex < bodyChildren.length; startIndex += 1) {
    if (!doesElementLookLikeTocRow(bodyChildren[startIndex], entryTexts[0] ?? '')) {
      continue
    }

    let matchedRows = 1
    let cursor = startIndex + 1
    let lastRowIndex = startIndex

    while (matchedRows < entryTexts.length && cursor < bodyChildren.length) {
      const nextEntryText = entryTexts[matchedRows] ?? ''
      if (doesElementLookLikeTocRow(bodyChildren[cursor], nextEntryText)) {
        lastRowIndex = cursor
        matchedRows += 1
      } else if (normalizeWhitespace(bodyChildren[cursor]?.textContent ?? '')) {
        break
      }
      cursor += 1
    }

    if (matchedRows === entryTexts.length) {
      return {
        firstRowIndex: startIndex,
        lastRowIndex
      }
    }
  }

  return null
}

function parseHtmlFallbackEntry(element: Element) {
  const firstLink = normalizeWhitespace(element.querySelector('a')?.textContent ?? '')
  const pageMatch = normalizeWhitespace(element.textContent ?? '').match(/(\d+)\s*$/)
  const { text, pageNumber } = extractTocTextAndPageNumber(
    firstLink || normalizeWhitespace(element.textContent ?? ''),
    pageMatch ? (pageMatch[1] ?? null) : null
  )
  if (!text) return null

  return {
    level: 1,
    text,
    pos: -1,
    blockStart: -1,
    pageNumber
  }
}

function inferTableOfContentsFromHtml(html: string): ImportedDocxTableOfContents | null {
  if (!html || globalThis.DOMParser === undefined) return null

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const bodyChildren = Array.from(doc.body.children)

    for (let index = 0; index < bodyChildren.length; index += 1) {
      const titleCandidate = bodyChildren[index]
      if (!titleCandidate) continue

      const titleText = normalizeWhitespace(titleCandidate.textContent ?? '')
      if (!['table of contents', 'contents', 'inhaltsverzeichnis', 'cuprins'].includes(titleText.toLowerCase())) {
        continue
      }

      const rowElements: Element[] = []
      for (let cursor = index + 1; cursor < bodyChildren.length; cursor += 1) {
        const candidate = bodyChildren[cursor]
        if (!candidate) break
        if (candidate.querySelector('a')) {
          rowElements.push(candidate)
          continue
        }
        if (rowElements.length > 0) {
          break
        }
      }

      if (rowElements.length === 0) {
        continue
      }

      const entries = rowElements
        .map(parseHtmlFallbackEntry)
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null)

      if (entries.length === 0) {
        continue
      }

      return {
        snapshotJson: stringifyDocumentTocSnapshot(
          createDocumentTocSnapshot(entries, {
            updateMode: 'imported',
            layoutVersion: null
          })
        ),
        showPageNumbers: entries.some(entry => Boolean(entry.pageNumber)),
        rightAlignPageNumbers: true,
        tabLeader: 'dot',
        headingLinks: true,
        maxHeadingLevel: 3,
        titleText
      }
    }

    return null
  } catch {
    return null
  }
}

export function enhanceImportedHtmlWithTableOfContents(html: string, toc: ImportedDocxTableOfContents | null): string {
  if (!html || globalThis.DOMParser === undefined) return html

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const bodyChildren = Array.from(doc.body.children)
    const resolvedToc = toc ?? inferTableOfContentsFromHtml(html)
    if (!resolvedToc) return html

    const parsedSnapshot = JSON.parse(resolvedToc.snapshotJson) as { entries?: Array<{ text?: string }> }
    const entryTexts = (parsedSnapshot.entries ?? []).map(entry => entry.text?.trim() ?? '').filter(Boolean)
    const matchedRange = findTocEntryRange(bodyChildren, entryTexts)
    const tocElement = buildTocElement(doc, resolvedToc)

    if (matchedRange) {
      const titleIndex =
        matchedRange.firstRowIndex > 0 && looksLikeTocTitle(bodyChildren[matchedRange.firstRowIndex - 1]!, resolvedToc)
          ? matchedRange.firstRowIndex - 1
          : matchedRange.firstRowIndex

      bodyChildren[titleIndex]?.before(tocElement)
      for (let removeIndex = titleIndex; removeIndex <= matchedRange.lastRowIndex; removeIndex += 1) {
        bodyChildren[removeIndex]?.remove()
      }
      return doc.body.innerHTML
    }

    doc.body.prepend(tocElement)
    return doc.body.innerHTML
  } catch {
    return html
  }
}
