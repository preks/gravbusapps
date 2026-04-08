/**
 * DOCX import helpers: read OOXML image wrap metadata from raw .docx and
 * upgrade Mammoth HTML to custom-image figures the editor understands.
 */

import JSZip from 'jszip'
import type {
  ImageAlignment,
  ImageBorderDash,
  ImageWrapMode,
  ImageWrapTextSide
} from '@/components/tiptap-extensions/tiptap-custom-image/types'
import {
  CUSTOM_IMAGE_FIGURE_CLASS,
  CUSTOM_IMAGE_TAG
} from '@/components/tiptap-extensions/tiptap-custom-image/styleUtils'
import {
  DEFAULT_IMAGE_BORDER_COLOR,
  DEFAULT_IMAGE_BORDER_DASH,
  DEFAULT_IMAGE_BORDER_WIDTH_PT
} from '@/components/tiptap-extensions/tiptap-custom-image/types'
import {
  normalizeImageBorderColor,
  normalizeImageBorderDash,
  normalizeImageBorderWidthPt
} from '@/components/tiptap-extensions/tiptap-custom-image/styleUtils'

const PX_TO_EMU = 9525
const POINT_TO_OOXML_LINE_WIDTH = 12700

const OOXML_SCHEME_COLOR_MAP: Readonly<Record<string, string>> = {
  tx1: '#000000',
  bg1: '#FFFFFF',
  tx2: '#1F497D',
  bg2: '#EEECE1',
  accent1: '#4F81BD',
  accent2: '#C0504D',
  accent3: '#9BBB59',
  accent4: '#8064A2',
  accent5: '#4BACC6',
  accent6: '#F79646'
}

interface DocxImageBorder {
  borderVisible: boolean
  borderColor: string
  borderWidthPt: number
  borderDash: ImageBorderDash
}

export interface DocxImageLayout {
  wrapMode: ImageWrapMode
  wrapTextSide?: ImageWrapTextSide | null
  align: ImageAlignment
  widthPx: number | null
  heightPx: number | null
  borderVisible?: boolean
  borderColor?: string | null
  borderWidthPt?: number | null
  borderDash?: ImageBorderDash | null
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

function lineWidthToPoints(value: string | null | undefined): number {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_IMAGE_BORDER_WIDTH_PT
  }

  return Math.round((parsed / POINT_TO_OOXML_LINE_WIDTH) * 100) / 100
}

function mapOoxmlDashToImageBorderDash(value: string | null | undefined): ImageBorderDash {
  switch ((value ?? '').trim()) {
    case 'dash':
    case 'lgDash':
    case 'sysDash':
      return 'dash'
    case 'dot':
    case 'sysDot':
      return 'dot'
    case 'dashDot':
    case 'lgDashDot':
    case 'sysDashDot':
      return 'dash-dot'
    case 'dashDotDot':
    case 'lgDashDotDot':
    case 'sysDashDotDot':
      return 'dash-dot-dot'
    case 'solid':
    default:
      return DEFAULT_IMAGE_BORDER_DASH
  }
}

function resolveLineColor(line: Element): string {
  const solidFill = firstChildByLocalName(line, 'solidFill')
  const srgbColor = solidFill ? firstChildByLocalName(solidFill, 'srgbClr') : null
  const schemeColor = solidFill ? firstChildByLocalName(solidFill, 'schemeClr') : null

  if (srgbColor) {
    return (
      normalizeImageBorderColor(srgbColor.getAttribute('val'), DEFAULT_IMAGE_BORDER_COLOR) ?? DEFAULT_IMAGE_BORDER_COLOR
    )
  }

  if (schemeColor) {
    const mappedColor = OOXML_SCHEME_COLOR_MAP[schemeColor.getAttribute('val') ?? '']
    return normalizeImageBorderColor(mappedColor, DEFAULT_IMAGE_BORDER_COLOR) ?? DEFAULT_IMAGE_BORDER_COLOR
  }

  return DEFAULT_IMAGE_BORDER_COLOR
}

function readPictureBorder(drawing: Element): DocxImageBorder {
  const picture = descendantsByLocalName(drawing, 'pic')[0]
  const shapeProps = picture ? firstChildByLocalName(picture, 'spPr') : null
  const line = shapeProps ? firstChildByLocalName(shapeProps, 'ln') : null

  if (!line || firstChildByLocalName(line, 'noFill')) {
    return {
      borderVisible: false,
      borderColor: DEFAULT_IMAGE_BORDER_COLOR,
      borderWidthPt: DEFAULT_IMAGE_BORDER_WIDTH_PT,
      borderDash: DEFAULT_IMAGE_BORDER_DASH
    }
  }

  const presetDash = firstChildByLocalName(line, 'prstDash')

  return {
    borderVisible: true,
    borderColor: resolveLineColor(line),
    borderWidthPt:
      normalizeImageBorderWidthPt(lineWidthToPoints(line.getAttribute('w')), DEFAULT_IMAGE_BORDER_WIDTH_PT) ??
      DEFAULT_IMAGE_BORDER_WIDTH_PT,
    borderDash: normalizeImageBorderDash(
      mapOoxmlDashToImageBorderDash(presetDash?.getAttribute('val')),
      DEFAULT_IMAGE_BORDER_DASH
    )
  }
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
      const pictureBorder = readPictureBorder(drawing)

      if (inline) {
        const { widthPx, heightPx } = readExtentPx(inline)
        layouts.push({ wrapMode: 'inline', align: 'left', widthPx, heightPx, ...pictureBorder })
        continue
      }

      if (anchor) {
        layouts.push({
          ...resolveAnchorLayout(anchor),
          ...pictureBorder
        })
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
  figure.setAttribute('data-image-border-visible', String(layout.borderVisible ?? false))
  if (layout.wrapTextSide) {
    figure.setAttribute('data-image-wrap-text-side', layout.wrapTextSide)
  }
  if (layout.borderColor) {
    figure.setAttribute('data-image-border-color', layout.borderColor)
  }
  if (layout.borderWidthPt != null) {
    figure.setAttribute('data-image-border-width-pt', String(layout.borderWidthPt))
  }
  if (layout.borderDash) {
    figure.setAttribute('data-image-border-dash', layout.borderDash)
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
