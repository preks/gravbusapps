import DOMPurify from 'dompurify'

function collapseWhitespaceLinear(input: string): string {
  let result = ''
  let previousWasWhitespace = false

  for (const char of input) {
    const isWhitespace = /\s/.test(char)

    if (isWhitespace) {
      if (!previousWasWhitespace) {
        result += ' '
        previousWasWhitespace = true
      }
      continue
    }

    result += char
    previousWasWhitespace = false
  }

  return result.trim()
}

const CUSTOM_DOCUMENT_TAG_PATTERN =
  /<(?:heading|paragraph|orderedlist|bulletlist|listitem|horizontalrule|tablerow|tableheader|tablecell|inlinecomment|textstyle|bold|italic|underline|strikethrough|subscript|superscript)\b/i

const PRESERVED_HTML_TAGS = new Set([
  'a',
  'blockquote',
  'br',
  'code',
  'del',
  'div',
  'em',
  'figcaption',
  'figure',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  's',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul'
])

const PAGINATION_RUNTIME_ATTRIBUTE_PATTERN =
  /\b(?:paginationSplitId|data-pagination-split-id|paginationChainId|data-pagination-chain-id|paginationRowGroups|data-pagination-row-groups)=/i
const TABLE_SECTION_TAG_NAMES = new Set(['tbody', 'thead', 'tfoot', 'tr', 'tablerow'])
const DOCUMENT_EDITOR_FORBIDDEN_TAGS = ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea']

export function containsPaginationRuntimeTableMarkup(html: string): boolean {
  return PAGINATION_RUNTIME_ATTRIBUTE_PATTERN.test(html)
}

function getAttributeValue(element: Element, name: string): string | null {
  return element.getAttribute(name) ?? element.getAttribute(name.toLowerCase())
}

function getPaginationSplitId(element: Element): string | null {
  return (
    getAttributeValue(element, 'paginationSplitId') ??
    getAttributeValue(element, 'data-pagination-split-id') ??
    getAttributeValue(element, 'dataPaginationSplitId')
  )
}

function removePaginationRuntimeAttributes(element: Element) {
  element.removeAttribute('paginationSplitId')
  element.removeAttribute('paginationsplitid')
  element.removeAttribute('data-pagination-split-id')
  element.removeAttribute('dataPaginationSplitId')
  element.removeAttribute('paginationChainId')
  element.removeAttribute('paginationchainid')
  element.removeAttribute('data-pagination-chain-id')
  element.removeAttribute('dataPaginationChainId')
  element.removeAttribute('paginationRowGroups')
  element.removeAttribute('paginationrowgroups')
  element.removeAttribute('data-pagination-row-groups')
  element.removeAttribute('dataPaginationRowGroups')
}

function isWhitespaceTextNode(node: Node): boolean {
  return node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim().length === 0
}

function getAdjacentTableSibling(node: Node): Element | null {
  let sibling = node.nextSibling

  while (sibling) {
    if (isWhitespaceTextNode(sibling)) {
      sibling = sibling.nextSibling
      continue
    }

    if (sibling.nodeType !== Node.ELEMENT_NODE) {
      return null
    }

    const siblingElement = sibling as Element
    return siblingElement.tagName.toLowerCase() === 'table' ? siblingElement : null
  }

  return null
}

function mergeTableContentInto(targetTable: Element, continuationTable: Element) {
  Array.from(continuationTable.childNodes).forEach(childNode => {
    if (childNode.nodeType === Node.ELEMENT_NODE) {
      const childElement = childNode as Element
      if (!TABLE_SECTION_TAG_NAMES.has(childElement.tagName.toLowerCase())) {
        return
      }
    } else if (isWhitespaceTextNode(childNode)) {
      return
    }

    targetTable.appendChild(childNode)
  })
}

function mergeAdjacentPaginationTables(root: Element | DocumentFragment) {
  let childNode = root.firstChild

  while (childNode) {
    const currentNode = childNode

    if (currentNode.nodeType === Node.ELEMENT_NODE) {
      const childElement = currentNode as Element
      mergeAdjacentPaginationTables(childElement)

      if (childElement.tagName.toLowerCase() === 'table') {
        let continuationTable = getAdjacentTableSibling(childElement)

        while (continuationTable) {
          const currentSplitId = getPaginationSplitId(childElement)
          const continuationSplitId = getPaginationSplitId(continuationTable)

          if (!currentSplitId || currentSplitId !== continuationSplitId) {
            break
          }

          mergeTableContentInto(childElement, continuationTable)
          continuationTable.remove()
          continuationTable = getAdjacentTableSibling(childElement)
        }
      }

      removePaginationRuntimeAttributes(childElement)
    }

    childNode = currentNode.nextSibling
  }
}

function escapeBareAmpersands(input: string): string {
  return input.replace(/&(?!(?:[a-zA-Z][\w.-]*|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;')
}

function appendConvertedChildren(source: Element, target: Element | DocumentFragment, documentRef: Document) {
  Array.from(source.childNodes).forEach(childNode => {
    const convertedNode = convertDocumentContentNode(childNode, documentRef)
    if (convertedNode) {
      target.appendChild(convertedNode)
    }
  })
}

function applyCommonAttributes(source: Element, target: Element) {
  Array.from(source.attributes).forEach(attribute => {
    const name = attribute.name.toLowerCase()
    if (name === 'class' || name === 'style' || name.startsWith('data-')) {
      target.setAttribute(name, attribute.value)
    }
  })
}

function applyTextAlignStyle(source: Element, target: HTMLElement) {
  const textAlign = getAttributeValue(source, 'textAlign')
  if (textAlign) {
    target.style.textAlign = textAlign
  }
}

function applyTableCellAttributes(source: Element, target: HTMLTableCellElement) {
  const colspan = getAttributeValue(source, 'colspan')
  const rowspan = getAttributeValue(source, 'rowspan')

  if (colspan) {
    target.setAttribute('colspan', colspan)
  }
  if (rowspan) {
    target.setAttribute('rowspan', rowspan)
  }
}

function buildTextStyleElement(source: Element, documentRef: Document): HTMLElement | null {
  const span = documentRef.createElement('span')
  const color = getAttributeValue(source, 'color')
  const fontFamily = getAttributeValue(source, 'fontFamily')
  const fontSize = getAttributeValue(source, 'fontSize')

  if (color) {
    span.style.color = color
  }
  if (fontFamily) {
    span.style.fontFamily = fontFamily
  }
  if (fontSize) {
    span.style.fontSize = fontSize
  }

  appendConvertedChildren(source, span, documentRef)

  return span.getAttribute('style') || span.childNodes.length !== 1 ? span : null
}

function buildInlineCommentElement(source: Element, documentRef: Document): HTMLSpanElement {
  const span = documentRef.createElement('span')
  const commentId = getAttributeValue(source, 'commentId')
  const commentType = getAttributeValue(source, 'commentType')
  const createdAt = getAttributeValue(source, 'createdAt')
  const createdBy = getAttributeValue(source, 'createdBy')

  if (commentId) span.setAttribute('data-comment-id', commentId)
  if (commentType) span.setAttribute('data-comment-type', commentType)
  if (createdAt) span.setAttribute('data-created-at', createdAt)
  if (createdBy) span.setAttribute('data-created-by', createdBy)

  appendConvertedChildren(source, span, documentRef)

  return span
}

function buildTableElement(source: Element, documentRef: Document): HTMLTableElement {
  const table = documentRef.createElement('table')
  const tbody = documentRef.createElement('tbody')
  let hasRows = false

  applyCommonAttributes(source, table)

  Array.from(source.childNodes).forEach(childNode => {
    const convertedNode = convertDocumentContentNode(childNode, documentRef)
    if (!convertedNode) return

    if (convertedNode instanceof HTMLElement && convertedNode.tagName.toLowerCase() === 'tr') {
      tbody.appendChild(convertedNode)
      hasRows = true
      return
    }

    table.appendChild(convertedNode)
  })

  if (hasRows) {
    table.appendChild(tbody)
  }

  return table
}

function createConvertedElement(source: Element, tagName: string, documentRef: Document): HTMLElement {
  const element = documentRef.createElement(tagName)
  applyCommonAttributes(source, element)
  appendConvertedChildren(source, element, documentRef)
  return element
}

function convertDocumentContentNode(node: Node, documentRef: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return documentRef.createTextNode(node.textContent ?? '')
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null
  }

  const source = node as Element
  const sourceTagName = source.tagName.toLowerCase()

  switch (sourceTagName) {
    case 'heading': {
      const level = Number.parseInt(getAttributeValue(source, 'level') ?? '1', 10)
      const headingTag = `h${Math.min(6, Math.max(1, Number.isFinite(level) ? level : 1))}`
      const heading = createConvertedElement(source, headingTag, documentRef)
      applyTextAlignStyle(source, heading)
      return heading
    }
    case 'paragraph': {
      const paragraph = createConvertedElement(source, 'p', documentRef)
      applyTextAlignStyle(source, paragraph)
      return paragraph
    }
    case 'orderedlist': {
      const orderedList = createConvertedElement(source, 'ol', documentRef)
      const start = getAttributeValue(source, 'start')
      if (start) {
        orderedList.setAttribute('start', start)
      }
      return orderedList
    }
    case 'bulletlist':
      return createConvertedElement(source, 'ul', documentRef)
    case 'listitem':
      return createConvertedElement(source, 'li', documentRef)
    case 'horizontalrule':
      return documentRef.createElement('hr')
    case 'tablerow':
      return createConvertedElement(source, 'tr', documentRef)
    case 'tableheader': {
      const tableHeader = createConvertedElement(source, 'th', documentRef) as HTMLTableCellElement
      applyTableCellAttributes(source, tableHeader)
      return tableHeader
    }
    case 'tablecell': {
      const tableCell = createConvertedElement(source, 'td', documentRef) as HTMLTableCellElement
      applyTableCellAttributes(source, tableCell)
      return tableCell
    }
    case 'table':
      return buildTableElement(source, documentRef)
    case 'inlinecomment':
      return buildInlineCommentElement(source, documentRef)
    case 'textstyle': {
      const styledElement = buildTextStyleElement(source, documentRef)
      if (styledElement) {
        return styledElement
      }
      const fragment = documentRef.createDocumentFragment()
      appendConvertedChildren(source, fragment, documentRef)
      return fragment
    }
    case 'bold':
      return createConvertedElement(source, 'strong', documentRef)
    case 'italic':
      return createConvertedElement(source, 'em', documentRef)
    case 'underline':
      return createConvertedElement(source, 'u', documentRef)
    case 'strikethrough':
      return createConvertedElement(source, 's', documentRef)
    case 'subscript':
      return createConvertedElement(source, 'sub', documentRef)
    case 'superscript':
      return createConvertedElement(source, 'sup', documentRef)
    default: {
      if (PRESERVED_HTML_TAGS.has(sourceTagName)) {
        return sourceTagName === 'table'
          ? buildTableElement(source, documentRef)
          : createConvertedElement(source, sourceTagName, documentRef)
      }

      const fragment = documentRef.createDocumentFragment()
      appendConvertedChildren(source, fragment, documentRef)
      return fragment
    }
  }
}

export function containsCustomDocumentTags(html: string): boolean {
  return CUSTOM_DOCUMENT_TAG_PATTERN.test(html)
}

export function sanitizePaginationRuntimeHtml(html: string): string {
  if (!html.trim() || !containsPaginationRuntimeTableMarkup(html)) {
    return html
  }

  // Canonical persistence stays as standard merged HTML tables without runtime pagination metadata.

  try {
    if (globalThis.DOMParser === undefined || globalThis.document === undefined) {
      return html
    }

    if (containsCustomDocumentTags(html)) {
      const parser = new globalThis.DOMParser()
      const wrappedXml = `<document-content-root>${escapeBareAmpersands(html)}</document-content-root>`
      let parsed = parser.parseFromString(wrappedXml, 'application/xml')
      let sourceRoot: Element | null = parsed.documentElement

      if (parsed.getElementsByTagName('parsererror').length > 0 || sourceRoot.tagName === 'parsererror') {
        parsed = parser.parseFromString(`<div data-document-content-root>${html}</div>`, 'text/html')
        sourceRoot = parsed.body.firstElementChild
      }

      if (!sourceRoot) {
        return html
      }

      mergeAdjacentPaginationTables(sourceRoot)
      const outputRoot = globalThis.document.createElement('div')
      appendConvertedChildren(sourceRoot, outputRoot, globalThis.document)
      return outputRoot.innerHTML.trim() || '<p></p>'
    }

    const doc = new globalThis.DOMParser().parseFromString(html, 'text/html')
    mergeAdjacentPaginationTables(doc.body)
    return doc.body.innerHTML.trim() || '<p></p>'
  } catch {
    return html
  }
}

function normalizeDocumentHtmlMarkupForEditor(html: string): string {
  const sanitizedHtml = sanitizePaginationRuntimeHtml(html)

  if (!sanitizedHtml.trim() || !containsCustomDocumentTags(sanitizedHtml)) {
    return sanitizedHtml
  }

  try {
    if (globalThis.DOMParser === undefined || globalThis.document === undefined) {
      return sanitizedHtml
    }

    const parser = new globalThis.DOMParser()
    const wrappedXml = `<document-content-root>${escapeBareAmpersands(sanitizedHtml)}</document-content-root>`
    let parsed = parser.parseFromString(wrappedXml, 'application/xml')
    let sourceRoot: Element | null = parsed.documentElement

    if (parsed.getElementsByTagName('parsererror').length > 0 || sourceRoot.tagName === 'parsererror') {
      parsed = parser.parseFromString(`<div data-document-content-root>${sanitizedHtml}</div>`, 'text/html')
      sourceRoot = parsed.body.firstElementChild
    }

    if (!sourceRoot) {
      return sanitizedHtml
    }

    const outputRoot = globalThis.document.createElement('div')
    appendConvertedChildren(sourceRoot, outputRoot, globalThis.document)

    return outputRoot.innerHTML.trim() || '<p></p>'
  } catch {
    return sanitizedHtml
  }
}

export function sanitizeDocumentHtmlForEditor(html: string): string {
  const normalizedHtml = normalizeDocumentHtmlMarkupForEditor(html)

  if (!normalizedHtml.trim()) {
    return '<p></p>'
  }

  if (globalThis.window === undefined) {
    return normalizedHtml
  }

  try {
    const sanitized = DOMPurify.sanitize(normalizedHtml, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: DOCUMENT_EDITOR_FORBIDDEN_TAGS,
      ALLOW_DATA_ATTR: true
    })

    return sanitized.trim() || '<p></p>'
  } catch {
    return normalizedHtml
  }
}

export function normalizeDocumentHtmlForEditor(html: string): string {
  return sanitizeDocumentHtmlForEditor(html)
}

export function isEffectivelyEmptyDocumentHtml(html: string): boolean {
  if (!html.trim()) return true

  try {
    if (globalThis.DOMParser !== undefined) {
      const doc = new globalThis.DOMParser().parseFromString(html, 'text/html')
      if (doc.body.querySelector('table, img, video, audio, iframe, canvas, svg, hr, ul[data-type="taskList"]')) {
        return false
      }

      const text = collapseWhitespaceLinear((doc.body.textContent || '').split('\u200B').join(''))
      return text.length === 0
    }
  } catch {
    // Fall back to a lightweight string-based check below.
  }

  return (
    collapseWhitespaceLinear(
      html
        .replace(/<[^>]*>/g, '')
        .split('\u200B')
        .join('')
    ).length === 0
  )
}

/** Cap HTML sent to AI flows to limit peak memory and payload size. */
export const AI_CONTEXT_HTML_MAX_CHARS = 80_000

export function truncateHtmlForAiContext(html: string, maxChars: number = AI_CONTEXT_HTML_MAX_CHARS): string {
  if (html.length <= maxChars) return html
  return `${html.slice(0, maxChars)}<!-- truncated-for-ai-context -->`
}
