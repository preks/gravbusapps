/**
 * ODF Parser Utilities
 *
 * Core conversion logic for parsing ODF (Open Document Format) files.
 * Extracts content.xml from the ZIP archive and converts ODF XML elements
 * to HTML for use in the TipTap editor.
 *
 * Uses jszip for ZIP extraction and the browser-native DOMParser for XML parsing.
 */

import JSZip from 'jszip'

export interface OdfParserMessage {
  type: 'error' | 'warning' | 'info'
  message: string
}

export interface OdfImage {
  contentType: string
  base64: string
  path: string
}

export interface OdfParseResult {
  html: string
  plainText: string
  images: OdfImage[]
  messages: OdfParserMessage[]
}

/** Map of automatic style names to their formatting properties */
interface StyleProperties {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  fontSize?: string
  fontFamily?: string
  color?: string
  backgroundColor?: string
  textAlign?: string
}

/**
 * Parse an ODF (.odt) file and convert its content to HTML.
 */
export async function parseOdfToHtml(arrayBuffer: ArrayBuffer): Promise<OdfParseResult> {
  const messages: OdfParserMessage[] = []
  const images: OdfImage[] = []

  // Unzip the ODF archive
  const zip = await JSZip.loadAsync(arrayBuffer)

  // Verify mimetype
  const mimetypeFile = zip.file('mimetype')
  if (mimetypeFile) {
    const mimetype = await mimetypeFile.async('text')
    if (!mimetype.startsWith('application/vnd.oasis.opendocument')) {
      messages.push({ type: 'warning', message: `Unexpected mimetype: ${mimetype.trim()}` })
    }
  }

  // Read content.xml (required)
  const contentFile = zip.file('content.xml')
  if (!contentFile) {
    throw new Error('Invalid ODF file: missing content.xml')
  }
  const contentXml = await contentFile.async('text')

  // Read styles.xml for automatic styles (optional)
  const stylesFile = zip.file('styles.xml')
  let stylesXml: string | null = null
  if (stylesFile) {
    stylesXml = await stylesFile.async('text')
  }

  // Extract embedded images
  const picturesFolder = zip.folder('Pictures')
  if (picturesFolder) {
    const imagePromises: Promise<void>[] = []
    picturesFolder.forEach((relativePath, file) => {
      if (!file.dir) {
        imagePromises.push(
          file.async('base64').then(base64Data => {
            const ext = relativePath.split('.').pop()?.toLowerCase() || 'png'
            const contentType = getImageContentType(ext)
            images.push({
              contentType,
              base64: base64Data,
              path: `Pictures/${relativePath}`
            })
          })
        )
      }
    })
    await Promise.all(imagePromises)
  }

  // Parse the XML
  const parser = new DOMParser()
  const doc = parser.parseFromString(contentXml, 'application/xml')

  // Check for parse errors
  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    throw new Error('Failed to parse content.xml: ' + parseError.textContent)
  }

  // Parse automatic styles from both content.xml and styles.xml
  const styleMap = parseAutomaticStyles(doc)
  if (stylesXml) {
    const stylesDoc = parser.parseFromString(stylesXml, 'application/xml')
    const extraStyles = parseAutomaticStyles(stylesDoc)
    for (const [key, value] of extraStyles.entries()) {
      if (!styleMap.has(key)) {
        styleMap.set(key, value)
      }
    }
  }

  // Find the document body
  const body = doc.getElementsByTagNameNS('urn:oasis:names:tc:opendocument:xmlns:office:1.0', 'body')[0]
  if (!body) {
    throw new Error('Invalid ODF file: missing office:body')
  }

  const textBody = body.getElementsByTagNameNS('urn:oasis:names:tc:opendocument:xmlns:office:1.0', 'text')[0]
  if (!textBody) {
    throw new Error('Invalid ODF file: missing office:text')
  }

  // Convert ODF elements to HTML
  const htmlParts: string[] = []
  const textParts: string[] = []

  const imageMap = new Map<string, OdfImage>()
  for (const img of images) {
    imageMap.set(img.path, img)
  }

  convertChildElements(textBody, htmlParts, textParts, styleMap, imageMap)

  const html = htmlParts.join('\n')
  const plainText = textParts
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return { html, plainText, images, messages }
}

/**
 * Parse automatic styles from the ODF document.
 */
function parseAutomaticStyles(doc: Document): Map<string, StyleProperties> {
  const styleMap = new Map<string, StyleProperties>()
  const ns = 'urn:oasis:names:tc:opendocument:xmlns:style:1.0'
  const foNs = 'urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0'

  // Look in both automatic-styles and styles sections
  const autoStyles = doc.getElementsByTagNameNS('urn:oasis:names:tc:opendocument:xmlns:office:1.0', 'automatic-styles')
  const namedStyles = doc.getElementsByTagNameNS('urn:oasis:names:tc:opendocument:xmlns:office:1.0', 'styles')

  const allContainers = [...Array.from(autoStyles), ...Array.from(namedStyles)]

  for (const container of allContainers) {
    const styles = container.getElementsByTagNameNS(ns, 'style')
    for (let i = 0; i < styles.length; i++) {
      const style = styles[i]
      const styleName = style.getAttributeNS(ns, 'name')
      if (!styleName) continue

      const props: StyleProperties = {}

      // Get text-properties
      const textProps = style.getElementsByTagNameNS(ns, 'text-properties')
      if (textProps.length > 0) {
        const tp = textProps[0]
        const fontWeight = tp.getAttributeNS(foNs, 'font-weight')
        if (fontWeight === 'bold') props.bold = true

        const fontStyle = tp.getAttributeNS(foNs, 'font-style')
        if (fontStyle === 'italic') props.italic = true

        const textDecoration = tp.getAttributeNS(ns, 'text-underline-style')
        if (textDecoration && textDecoration !== 'none') props.underline = true

        const lineThrough = tp.getAttributeNS(ns, 'text-line-through-style')
        if (lineThrough && lineThrough !== 'none') props.strikethrough = true

        const fontSize = tp.getAttributeNS(foNs, 'font-size')
        if (fontSize) props.fontSize = fontSize

        const color = tp.getAttributeNS(foNs, 'color')
        if (color) props.color = color
      }

      // Get paragraph-properties
      const paraProps = style.getElementsByTagNameNS(ns, 'paragraph-properties')
      if (paraProps.length > 0) {
        const pp = paraProps[0]
        const textAlign = pp.getAttributeNS(foNs, 'text-align')
        if (textAlign) props.textAlign = textAlign
      }

      styleMap.set(styleName, props)
    }
  }

  return styleMap
}

/**
 * Convert child elements of an ODF node to HTML.
 */
function convertChildElements(
  node: Element,
  htmlParts: string[],
  textParts: string[],
  styleMap: Map<string, StyleProperties>,
  imageMap: Map<string, OdfImage>
): void {
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i]
    if (child.nodeType !== Node.ELEMENT_NODE) continue

    const element = child as Element
    const localName = element.localName
    const namespaceURI = element.namespaceURI

    // text:p - paragraph
    if (localName === 'p' && isTextNs(namespaceURI)) {
      const content = convertInlineContent(element, styleMap, imageMap)
      htmlParts.push(`<p>${content}</p>`)
      textParts.push(extractPlainText(element))
    }
    // text:h - heading
    else if (localName === 'h' && isTextNs(namespaceURI)) {
      const level = element.getAttributeNS(isTextNs(namespaceURI) ? namespaceURI! : '', 'outline-level') || '1'
      const headingLevel = Math.min(Math.max(parseInt(level, 10) || 1, 1), 6)
      const content = convertInlineContent(element, styleMap, imageMap)
      htmlParts.push(`<h${headingLevel}>${content}</h${headingLevel}>`)
      textParts.push(extractPlainText(element))
    }
    // text:list - list
    else if (localName === 'list' && isTextNs(namespaceURI)) {
      convertList(element, htmlParts, textParts, styleMap, imageMap)
    }
    // table:table - table
    else if (localName === 'table' && isTableNs(namespaceURI)) {
      convertTable(element, htmlParts, textParts, styleMap, imageMap)
    }
    // text:section - just recurse into it
    else if (localName === 'section' && isTextNs(namespaceURI)) {
      convertChildElements(element, htmlParts, textParts, styleMap, imageMap)
    }
    // draw:frame - image or other embedded object
    else if (localName === 'frame' && isDrawNs(namespaceURI)) {
      const imgHtml = convertDrawFrame(element, imageMap)
      if (imgHtml) {
        htmlParts.push(imgHtml)
      }
    }
    // Fallback: try to recurse
    else {
      convertChildElements(element, htmlParts, textParts, styleMap, imageMap)
    }
  }
}

/**
 * Convert inline content within a paragraph or heading.
 */
function convertInlineContent(
  element: Element,
  styleMap: Map<string, StyleProperties>,
  imageMap: Map<string, OdfImage>
): string {
  let html = ''

  for (let i = 0; i < element.childNodes.length; i++) {
    const child = element.childNodes[i]

    if (child.nodeType === Node.TEXT_NODE) {
      html += escapeHtml(child.textContent || '')
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element
      const localName = el.localName

      // text:span - styled text
      if (localName === 'span' && isTextNs(el.namespaceURI)) {
        const innerContent = convertInlineContent(el, styleMap, imageMap)
        const styleName = el.getAttributeNS('urn:oasis:names:tc:opendocument:xmlns:text:1.0', 'style-name')
        const props = styleName ? styleMap.get(styleName) : undefined

        html += applyStyleWrapping(innerContent, props)
      }
      // text:a - hyperlink
      else if (localName === 'a' && isTextNs(el.namespaceURI)) {
        const href = el.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || el.getAttribute('xlink:href') || ''
        const innerContent = convertInlineContent(el, styleMap, imageMap)
        html += `<a href="${escapeAttr(href)}">${innerContent}</a>`
      }
      // text:line-break
      else if (localName === 'line-break' && isTextNs(el.namespaceURI)) {
        html += '<br>'
      }
      // text:tab
      else if (localName === 'tab' && isTextNs(el.namespaceURI)) {
        html += '&emsp;'
      }
      // text:s - spaces
      else if (localName === 's' && isTextNs(el.namespaceURI)) {
        const count = parseInt(el.getAttributeNS(isTextNs(el.namespaceURI) ? el.namespaceURI! : '', 'c') || '1', 10)
        html += '&nbsp;'.repeat(Math.max(count, 1))
      }
      // draw:frame - inline image
      else if (localName === 'frame' && isDrawNs(el.namespaceURI)) {
        const imgHtml = convertDrawFrame(el, imageMap)
        if (imgHtml) html += imgHtml
      }
      // Fallback: recurse into unknown inline elements
      else {
        html += convertInlineContent(el, styleMap, imageMap)
      }
    }
  }

  return html
}

/**
 * Apply bold/italic/underline/strikethrough wrapping based on style properties.
 */
function applyStyleWrapping(content: string, props?: StyleProperties): string {
  if (!props) return content

  let result = content

  if (props.bold) result = `<strong>${result}</strong>`
  if (props.italic) result = `<em>${result}</em>`
  if (props.underline) result = `<u>${result}</u>`
  if (props.strikethrough) result = `<s>${result}</s>`

  return result
}

/**
 * Convert a text:list element to HTML <ul> or <ol>.
 */
function convertList(
  listElement: Element,
  htmlParts: string[],
  textParts: string[],
  styleMap: Map<string, StyleProperties>,
  imageMap: Map<string, OdfImage>
): void {
  // Determine list type by checking if items have numbered style
  const isOrdered = isOrderedList(listElement)
  const tag = isOrdered ? 'ol' : 'ul'

  const itemsHtml: string[] = []

  for (let i = 0; i < listElement.childNodes.length; i++) {
    const child = listElement.childNodes[i]
    if (child.nodeType !== Node.ELEMENT_NODE) continue
    const el = child as Element

    if (el.localName === 'list-item') {
      const itemContent: string[] = []
      const itemText: string[] = []

      for (let j = 0; j < el.childNodes.length; j++) {
        const itemChild = el.childNodes[j]
        if (itemChild.nodeType !== Node.ELEMENT_NODE) continue
        const itemEl = itemChild as Element

        if (itemEl.localName === 'p' && isTextNs(itemEl.namespaceURI)) {
          itemContent.push(convertInlineContent(itemEl, styleMap, imageMap))
          itemText.push(extractPlainText(itemEl))
        } else if (itemEl.localName === 'list' && isTextNs(itemEl.namespaceURI)) {
          // Nested list
          const nestedParts: string[] = []
          convertList(itemEl, nestedParts, itemText, styleMap, imageMap)
          itemContent.push(nestedParts.join('\n'))
        }
      }

      itemsHtml.push(`<li>${itemContent.join('')}</li>`)
      textParts.push(...itemText)
    }
  }

  htmlParts.push(`<${tag} class="document-list">${itemsHtml.join('')}</${tag}>`)
}

/**
 * Check if a list is ordered by examining its style or content.
 */
function isOrderedList(listElement: Element): boolean {
  // Check for xml:id or continue numbering attributes as heuristic
  const continueNumbering = listElement.getAttribute('text:continue-numbering')
  if (continueNumbering === 'true') return true

  // Check style name for number-related keywords
  const styleName = listElement.getAttributeNS('urn:oasis:names:tc:opendocument:xmlns:text:1.0', 'style-name') || ''
  if (/number|ordered|decimal|roman|alpha/i.test(styleName)) return true

  return false
}

/**
 * Convert a table:table element to HTML.
 */
function convertTable(
  tableElement: Element,
  htmlParts: string[],
  textParts: string[],
  styleMap: Map<string, StyleProperties>,
  imageMap: Map<string, OdfImage>
): void {
  const rows: string[] = []
  let isFirstRow = true

  for (let i = 0; i < tableElement.childNodes.length; i++) {
    const child = tableElement.childNodes[i]
    if (child.nodeType !== Node.ELEMENT_NODE) continue
    const el = child as Element

    // table:table-header-rows
    if (el.localName === 'table-header-rows' && isTableNs(el.namespaceURI)) {
      for (let j = 0; j < el.childNodes.length; j++) {
        const headerChild = el.childNodes[j]
        if (headerChild.nodeType === Node.ELEMENT_NODE) {
          const headerEl = headerChild as Element
          if (headerEl.localName === 'table-row') {
            rows.push(convertTableRow(headerEl, true, styleMap, imageMap, textParts))
          }
        }
      }
      isFirstRow = false
    }
    // table:table-row
    else if (el.localName === 'table-row' && isTableNs(el.namespaceURI)) {
      rows.push(convertTableRow(el, isFirstRow, styleMap, imageMap, textParts))
      isFirstRow = false
    }
  }

  htmlParts.push(`<table class="document-table">${rows.join('')}</table>`)
}

/**
 * Convert a table row to HTML.
 */
function convertTableRow(
  rowElement: Element,
  isHeader: boolean,
  styleMap: Map<string, StyleProperties>,
  imageMap: Map<string, OdfImage>,
  textParts: string[]
): string {
  const cellTag = isHeader ? 'th' : 'td'
  const cells: string[] = []

  for (let i = 0; i < rowElement.childNodes.length; i++) {
    const child = rowElement.childNodes[i]
    if (child.nodeType !== Node.ELEMENT_NODE) continue
    const el = child as Element

    if (el.localName === 'table-cell' && isTableNs(el.namespaceURI)) {
      const cellContent: string[] = []

      // Handle column span
      const colSpan = el.getAttributeNS('urn:oasis:names:tc:opendocument:xmlns:table:1.0', 'number-columns-spanned')
      const spanAttr = colSpan && parseInt(colSpan, 10) > 1 ? ` colspan="${colSpan}"` : ''

      for (let j = 0; j < el.childNodes.length; j++) {
        const cellChild = el.childNodes[j]
        if (cellChild.nodeType !== Node.ELEMENT_NODE) continue
        const cellEl = cellChild as Element

        if (cellEl.localName === 'p' && isTextNs(cellEl.namespaceURI)) {
          cellContent.push(convertInlineContent(cellEl, styleMap, imageMap))
          textParts.push(extractPlainText(cellEl))
        }
      }

      cells.push(`<${cellTag}${spanAttr}>${cellContent.join('<br>')}</${cellTag}>`)

      // Handle repeated empty cells
      const repeat = el.getAttributeNS('urn:oasis:names:tc:opendocument:xmlns:table:1.0', 'number-columns-repeated')
      if (repeat) {
        const repeatCount = Math.min(parseInt(repeat, 10) - 1, 50) // Safety limit
        for (let r = 0; r < repeatCount; r++) {
          cells.push(`<${cellTag}>${cellContent.join('<br>')}</${cellTag}>`)
        }
      }
    }
  }

  return `<tr>${cells.join('')}</tr>`
}

/**
 * Convert a draw:frame element to an HTML img tag.
 */
function convertDrawFrame(frameElement: Element, imageMap: Map<string, OdfImage>): string | null {
  const drawNs = 'urn:oasis:names:tc:opendocument:xmlns:drawing:1.0'

  const imageElements = frameElement.getElementsByTagNameNS(drawNs, 'image')
  if (imageElements.length === 0) return null

  const imageEl = imageElements[0]
  const href =
    imageEl.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || imageEl.getAttribute('xlink:href') || ''

  if (!href) return null

  // Look up the image in our extracted images
  const image = imageMap.get(href)
  if (image) {
    return `<img src="data:${image.contentType};base64,${image.base64}" alt="Document image">`
  }

  // External image reference
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return `<img src="${escapeAttr(href)}" alt="Document image">`
  }

  return null
}

/**
 * Extract plain text from an element recursively.
 */
function extractPlainText(element: Element): string {
  let text = ''

  for (let i = 0; i < element.childNodes.length; i++) {
    const child = element.childNodes[i]
    if (child.nodeType === Node.TEXT_NODE) {
      text += child.textContent || ''
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element
      if (el.localName === 'line-break') {
        text += '\n'
      } else if (el.localName === 'tab') {
        text += '\t'
      } else if (el.localName === 's') {
        const count = parseInt(el.getAttribute('text:c') || '1', 10)
        text += ' '.repeat(Math.max(count, 1))
      } else {
        text += extractPlainText(el)
      }
    }
  }

  return text
}

// --- Namespace helpers ---

const TEXT_NS = 'urn:oasis:names:tc:opendocument:xmlns:text:1.0'
const TABLE_NS = 'urn:oasis:names:tc:opendocument:xmlns:table:1.0'
const DRAW_NS = 'urn:oasis:names:tc:opendocument:xmlns:drawing:1.0'

function isTextNs(ns: string | null): boolean {
  return ns === TEXT_NS
}

function isTableNs(ns: string | null): boolean {
  return ns === TABLE_NS
}

function isDrawNs(ns: string | null): boolean {
  return ns === DRAW_NS
}

// --- HTML escape helpers ---

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function escapeAttr(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// --- Image content type helper ---

function getImageContentType(ext: string): string {
  const types: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    bmp: 'image/bmp',
    tiff: 'image/tiff',
    tif: 'image/tiff'
  }
  return types[ext] || 'image/png'
}
