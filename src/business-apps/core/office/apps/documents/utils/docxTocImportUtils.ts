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

function parseFieldResultEntry(paragraph: ParsedParagraph) {
  const levelMatch = paragraph.styleId?.match(/^TOC([1-9])$/i)
  if (!levelMatch) return null

  const level = Math.max(1, Math.min(6, Number.parseInt(levelMatch[1] ?? '1', 10)))
  const [rawText, rawPageNumber] = paragraph.text.split('\t')
  const text = normalizeWhitespace(rawText ?? '')
  const pageNumber = normalizeWhitespace(rawPageNumber ?? '') || null
  if (!text) return null

  return {
    level,
    text,
    pos: -1,
    blockStart: -1,
    pageNumber
  }
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
    const entries: Array<ReturnType<typeof parseFieldResultEntry>> = []

    for (const paragraph of paragraphs) {
      if (paragraph.hasBegin) {
        inCandidate = true
        isTocField = false
        isReadingResult = false
        instruction = ''
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
          maxHeadingLevel: config.maxHeadingLevel
        }
      }

      if (isReadingResult && isTocField) {
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

function doesElementLookLikeTocRow(element: Element, entryText: string): boolean {
  const text = normalizeWhitespace(element.textContent ?? '')
  if (!text) return false
  return text.startsWith(normalizeWhitespace(entryText))
}

export function enhanceImportedHtmlWithTableOfContents(html: string, toc: ImportedDocxTableOfContents | null): string {
  if (!html || !toc || globalThis.DOMParser === undefined) return html

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const bodyChildren = Array.from(doc.body.children)
    const parsedEntries = JSON.parse(toc.snapshotJson) as { entries?: Array<{ text?: string }> }
    const firstEntryText = parsedEntries.entries?.[0]?.text?.trim()

    if (firstEntryText) {
      for (let index = 0; index < bodyChildren.length; index += 1) {
        const child = bodyChildren[index]
        if (!child || !doesElementLookLikeTocRow(child, firstEntryText)) {
          continue
        }

        let removeUntil = index
        for (let entryIndex = 1; entryIndex < (parsedEntries.entries?.length ?? 0); entryIndex += 1) {
          const candidate = bodyChildren[index + entryIndex]
          const entryText = parsedEntries.entries?.[entryIndex]?.text ?? ''
          if (!candidate || !doesElementLookLikeTocRow(candidate, entryText)) {
            break
          }
          removeUntil = index + entryIndex
        }

        const tocElement = buildTocElement(doc, toc)
        bodyChildren[index]?.before(tocElement)
        for (let removeIndex = index; removeIndex <= removeUntil; removeIndex += 1) {
          bodyChildren[removeIndex]?.remove()
        }
        return doc.body.innerHTML
      }
    }

    doc.body.prepend(buildTocElement(doc, toc))
    return doc.body.innerHTML
  } catch {
    return html
  }
}
