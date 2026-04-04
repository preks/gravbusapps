/**
 * DOCX import helpers: read OOXML image wrap metadata from raw .docx and
 * upgrade Mammoth HTML to custom-image figures the editor understands.
 */

import JSZip from 'jszip'
import type {
  ImageAlignment,
  ImageWrapMode,
  ImageWrapTextSide
} from '@/components/tiptap-extensions/tiptap-custom-image/types'
import {
  CUSTOM_IMAGE_FIGURE_CLASS,
  CUSTOM_IMAGE_TAG
} from '@/components/tiptap-extensions/tiptap-custom-image/styleUtils'

const PX_TO_EMU = 9525

export interface DocxImageLayout {
  wrapMode: ImageWrapMode
  wrapTextSide?: ImageWrapTextSide | null
  align: ImageAlignment
  widthPx: number | null
  heightPx: number | null
}

function emuToPx(emu: string | null | undefined): number | null {
  if (emu == null || emu === '') return null
  const n = Number.parseInt(emu, 10)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.max(1, Math.round(n / PX_TO_EMU))
}

/** OOXML uses prefixed tags; some DOM parsers omit `localName` for prefixed nodes. */
function elementLocalName(el: Element): string {
  if (typeof el.localName === 'string' && el.localName.length > 0) {
    return el.localName
  }
  const tag = el.tagName
  const colon = tag.indexOf(':')
  return colon >= 0 ? tag.slice(colon + 1) : tag
}

function firstChildByLocalName(parent: Element, localName: string): Element | null {
  for (const child of Array.from(parent.children)) {
    if (elementLocalName(child) === localName) return child
  }
  return null
}

function descendantsByLocalName(root: Element, localName: string): Element[] {
  return Array.from(root.getElementsByTagName('*')).filter(el => elementLocalName(el) === localName)
}

function readExtentPx(container: Element | null): { widthPx: number | null; heightPx: number | null } {
  if (!container) return { widthPx: null, heightPx: null }
  const extent = descendantsByLocalName(container, 'extent')[0]
  if (!extent) return { widthPx: null, heightPx: null }
  return {
    widthPx: emuToPx(extent.getAttribute('cx')),
    heightPx: emuToPx(extent.getAttribute('cy'))
  }
}

function readHorizontalAlign(anchor: Element): ImageAlignment {
  const positionH = descendantsByLocalName(anchor, 'positionH')[0]
  const alignEl = positionH ? firstChildByLocalName(positionH, 'align') : null
  const text = alignEl?.textContent?.trim().toLowerCase() ?? ''
  if (text === 'center' || text === 'right') return text
  return 'left'
}

function normalizeSquareWrapTextSide(
  wrapText: string | null | undefined,
  horizontalAlign: ImageAlignment
): ImageWrapTextSide {
  const wt = (wrapText ?? 'bothSides').toLowerCase()
  if (wt === 'left') return 'left'
  if (wt === 'right') return 'right'
  if (wt === 'bothSides' || wt === 'largest') {
    return 'bothSides'
  }

  return horizontalAlign === 'right' ? 'left' : 'right'
}

function resolveAnchorLayout(anchor: Element): DocxImageLayout {
  const align = readHorizontalAlign(anchor)
  const { widthPx, heightPx } = readExtentPx(anchor)
  const behindDoc = anchor.getAttribute('behindDoc') === '1'

  if (descendantsByLocalName(anchor, 'wrapTopAndBottom').length > 0) {
    return { wrapMode: 'top-bottom', align, widthPx, heightPx }
  }

  if (descendantsByLocalName(anchor, 'wrapTight').length > 0) {
    return { wrapMode: 'tight', align, widthPx, heightPx }
  }

  if (descendantsByLocalName(anchor, 'wrapThrough').length > 0) {
    return { wrapMode: 'through', align, widthPx, heightPx }
  }

  const wrapSquare = descendantsByLocalName(anchor, 'wrapSquare')[0]
  if (wrapSquare) {
    const wrapText = wrapSquare.getAttribute('wrapText')
    return {
      wrapMode: 'square',
      wrapTextSide: normalizeSquareWrapTextSide(wrapText, align),
      align,
      widthPx,
      heightPx
    }
  }

  if (descendantsByLocalName(anchor, 'wrapNone').length > 0) {
    return {
      wrapMode: behindDoc ? 'behind' : 'front',
      align,
      widthPx,
      heightPx
    }
  }

  return { wrapMode: 'inline', align: 'left', widthPx, heightPx }
}

function drawingContainsPicture(drawing: Element): boolean {
  return descendantsByLocalName(drawing, 'pic').length > 0
}

/**
 * Parse `word/document.xml` text and return one layout per picture drawing, in document order.
 * Exported for unit tests.
 */
export function parseDocumentXmlForImageLayouts(xml: string): DocxImageLayout[] {
  if (!xml || globalThis.DOMParser === undefined) return []

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'application/xml')
    if (doc.getElementsByTagName('parsererror').length > 0) {
      return []
    }

    const drawings = descendantsByLocalName(doc.documentElement, 'drawing')
    const layouts: DocxImageLayout[] = []

    for (const drawing of drawings) {
      if (!drawingContainsPicture(drawing)) continue

      const inline = descendantsByLocalName(drawing, 'inline')[0]
      const anchor = descendantsByLocalName(drawing, 'anchor')[0]

      if (inline) {
        const { widthPx, heightPx } = readExtentPx(inline)
        layouts.push({ wrapMode: 'inline', align: 'left', widthPx, heightPx })
        continue
      }

      if (anchor) {
        layouts.push(resolveAnchorLayout(anchor))
        continue
      }
    }

    return layouts
  } catch {
    return []
  }
}

/**
 * Read ordered image wrap layouts from a .docx file (OOXML).
 */
export async function parseDocxImageLayouts(arrayBuffer: ArrayBuffer): Promise<DocxImageLayout[]> {
  try {
    const zip = await JSZip.loadAsync(arrayBuffer)
    const entry = zip.file('word/document.xml')
    if (!entry) return []
    const xml = await entry.async('string')
    return parseDocumentXmlForImageLayouts(xml)
  } catch {
    return []
  }
}

function isInsideCustomImageFigure(img: HTMLImageElement): boolean {
  return Boolean(img.closest(`figure[data-node-type="${CUSTOM_IMAGE_TAG}"]`))
}

function paragraphOnlyContainsImg(p: HTMLParagraphElement, img: HTMLImageElement): boolean {
  for (const child of Array.from(p.childNodes)) {
    if (child === img) continue
    if (child.nodeType === Node.TEXT_NODE) {
      if (child.textContent?.trim()) return false
      continue
    }
    if (child.nodeType === Node.ELEMENT_NODE) return false
  }
  return p.contains(img) && p.querySelectorAll('img').length === 1
}

function applyLayoutToFigure(figure: HTMLElement, layout: DocxImageLayout): void {
  figure.setAttribute('data-node-type', CUSTOM_IMAGE_TAG)
  figure.classList.add(CUSTOM_IMAGE_FIGURE_CLASS)
  figure.setAttribute('data-image-wrap', layout.wrapMode)
  figure.setAttribute('data-image-align', layout.align)
  if (layout.wrapTextSide) {
    figure.setAttribute('data-image-wrap-text-side', layout.wrapTextSide)
  }

  if (layout.wrapMode !== 'inline') {
    figure.setAttribute('data-image-anchor', 'move-with-text')
    figure.setAttribute('data-image-display', 'block')
  }
}

/**
 * Wrap Mammoth `<img>` tags in custom-image figures using layouts from OOXML.
 * Positional matching: Nth layout applies to Nth eligible `<img>`.
 */
export function enhanceImportedHtmlWithImageLayouts(html: string, layouts: DocxImageLayout[]): string {
  if (!html || layouts.length === 0 || globalThis.DOMParser === undefined) {
    return html
  }

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const imgs = Array.from(doc.body.querySelectorAll('img')).filter((img): img is HTMLImageElement => {
      if (img.tagName.toLowerCase() !== 'img') return false
      return !isInsideCustomImageFigure(img as HTMLImageElement)
    })

    const n = Math.min(imgs.length, layouts.length)
    for (let i = 0; i < n; i++) {
      const img = imgs[i]
      const layout = layouts[i]
      if (!img || !layout) continue

      const figure = doc.createElement('figure')
      applyLayoutToFigure(figure, layout)

      if (layout.widthPx != null) {
        img.setAttribute('width', String(layout.widthPx))
      }
      if (layout.heightPx != null) {
        img.setAttribute('height', String(layout.heightPx))
      }

      const parent = img.parentElement
      if (parent?.tagName.toLowerCase() === 'p' && parent instanceof HTMLParagraphElement) {
        if (paragraphOnlyContainsImg(parent, img)) {
          parent.replaceWith(figure)
          figure.appendChild(img)
          continue
        }
      }

      img.replaceWith(figure)
      figure.appendChild(img)
    }

    return doc.body.innerHTML
  } catch {
    return html
  }
}
