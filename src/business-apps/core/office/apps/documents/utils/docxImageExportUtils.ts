import {
  resolveImageDimensions,
  type ImageMeasurementContext,
  type ResolvedImageDimensions
} from '@/components/tiptap-extensions/tiptap-custom-image/sizeUtils'
import {
  CUSTOM_IMAGE_TAG,
  getImageFigureAttributesFromElement,
  normalizeImageAlign,
  normalizeImageBorderColor,
  normalizeImageBorderDash,
  normalizeImageBorderWidthPt,
  normalizeImageDisplay
} from '@/components/tiptap-extensions/tiptap-custom-image/styleUtils'
import type {
  CustomImageAttributes,
  ImageAlignment,
  ImageBorderDash,
  ImageDisplayMode
} from '@/components/tiptap-extensions/tiptap-custom-image/types'
import type { DocumentFormatting } from '../types'
import { getPaginationConfigFromFormatting } from './pageLayoutUtils'

export type DocxPictureOptionSupportStatus = 'supported' | 'normalized' | 'metadata' | 'unsupported'

export const DOCX_PICTURE_ATTR_SUPPORT: Record<keyof CustomImageAttributes, DocxPictureOptionSupportStatus> = {
  src: 'supported',
  alt: 'metadata',
  title: 'metadata',
  originalWidth: 'supported',
  originalHeight: 'supported',
  width: 'supported',
  height: 'supported',
  widthUnit: 'supported',
  heightUnit: 'supported',
  widthPercent: 'supported',
  heightPercent: 'supported',
  widthRelativeTo: 'supported',
  heightRelativeTo: 'supported',
  scaleWidthPercent: 'supported',
  scaleHeightPercent: 'supported',
  rotation: 'supported',
  cropTop: 'supported',
  cropRight: 'supported',
  cropBottom: 'supported',
  cropLeft: 'supported',
  align: 'supported',
  caption: 'supported',
  display: 'normalized',
  wrapMode: 'supported',
  wrapTextSide: 'supported',
  anchorMode: 'supported',
  lockAspectRatio: 'supported',
  distanceTop: 'supported',
  distanceRight: 'supported',
  distanceBottom: 'supported',
  distanceLeft: 'supported',
  offsetX: 'supported',
  offsetY: 'supported',
  allowOverlap: 'supported',
  zIndex: 'supported',
  borderVisible: 'supported',
  borderColor: 'supported',
  borderWidthPt: 'supported',
  borderDash: 'supported'
}

export const DOCX_NON_PERSISTED_PICTURE_STATES = [
  'crop-mode',
  'drag-preview',
  'resize-preview',
  'rotate-preview',
  'wrap-contour'
] as const

export const DOCX_IMPORTED_ONLY_PICTURE_STATES = ['wrapMode:tight', 'wrapMode:through', 'wrapMode:top-bottom'] as const

export const DOCX_IMAGE_EXPORT_DEFAULTS = {
  align: 'left' as const,
  wrapMode: 'inline' as const,
  anchorMode: 'inline' as const,
  display: 'inline' as const,
  distance: 0
}

export interface NormalizedDocxImageExport {
  src: string
  alt: string | null
  title: string | null
  caption: string | null
  layout: CustomImageAttributes
  resolvedDimensions: ResolvedImageDimensions
}

function parseStyleDeclarations(styleValue?: string | null): Record<string, string> {
  if (!styleValue?.trim()) {
    return {}
  }

  return styleValue
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, declaration) => {
      const separatorIndex = declaration.indexOf(':')
      if (separatorIndex <= 0) {
        return acc
      }
      const key = declaration.slice(0, separatorIndex).trim().toLowerCase()
      const value = declaration.slice(separatorIndex + 1).trim()
      if (key && value) {
        acc[key] = value
      }
      return acc
    }, {})
}

function parseCssLength(value?: string | null): { amount: number; unit: string } | null {
  if (!value) {
    return null
  }

  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)(px|pt|%|cm|mm|in)?$/i)
  if (!match) {
    return null
  }

  const amount = Number.parseFloat(match[1])
  if (!Number.isFinite(amount)) {
    return null
  }

  return {
    amount,
    unit: (match[2] ?? 'px').toLowerCase()
  }
}

function cssLengthToPx(length: { amount: number; unit: string } | null): number | null {
  if (!length || length.unit === '%') {
    return null
  }

  switch (length.unit) {
    case 'pt':
      return (length.amount * 96) / 72
    case 'cm':
      return (length.amount * 96) / 2.54
    case 'mm':
      return (length.amount * 96) / 25.4
    case 'in':
      return length.amount * 96
    case 'px':
    default:
      return length.amount
  }
}

function parseRotateDegrees(transform?: string | null): number | null {
  if (!transform) {
    return null
  }

  const match = transform.match(/rotate\((-?\d+(?:\.\d+)?)deg\)/i)
  if (!match) {
    return null
  }

  const degrees = Number.parseFloat(match[1])
  return Number.isFinite(degrees) ? degrees : null
}

function mapCssBorderDash(borderStyle?: string | null): ImageBorderDash | null {
  switch (borderStyle?.trim().toLowerCase()) {
    case 'solid':
      return 'solid'
    case 'dashed':
      return 'dash'
    case 'dotted':
      return 'dot'
    default:
      return null
  }
}

function resolveStyleAlignment(
  figureStyle: Record<string, string>,
  imageStyle: Record<string, string>,
  fallback: ImageAlignment
): ImageAlignment {
  const textAlign = normalizeImageAlign(figureStyle['text-align'], fallback)
  if (figureStyle['text-align']) {
    return textAlign
  }

  const marginLeft = imageStyle['margin-left'] ?? figureStyle['margin-left']
  const marginRight = imageStyle['margin-right'] ?? figureStyle['margin-right']

  if (marginLeft === 'auto' && marginRight === 'auto') {
    return 'center'
  }
  if (marginLeft === 'auto') {
    return 'right'
  }
  if (marginRight === 'auto') {
    return 'left'
  }

  return fallback
}

function applyCssFallbacks(
  layout: CustomImageAttributes,
  figureEl: HTMLElement,
  imgEl: HTMLElement
): CustomImageAttributes {
  const nextLayout = { ...layout }
  const figureStyle = parseStyleDeclarations(figureEl.getAttribute('style'))
  const imageStyle = parseStyleDeclarations(imgEl.getAttribute('style'))
  const widthLength = parseCssLength(imageStyle.width ?? figureStyle.width)
  const heightLength = parseCssLength(imageStyle.height ?? figureStyle.height)

  if (!figureEl.hasAttribute('data-image-align')) {
    nextLayout.align = resolveStyleAlignment(
      figureStyle,
      imageStyle,
      nextLayout.align ?? DOCX_IMAGE_EXPORT_DEFAULTS.align
    )
  }

  if (!imgEl.hasAttribute('width') && !figureEl.hasAttribute('data-image-width-percent') && widthLength) {
    if (widthLength.unit === '%') {
      nextLayout.widthUnit = 'percent'
      nextLayout.widthPercent = widthLength.amount
      nextLayout.widthRelativeTo = 'page'
    } else {
      nextLayout.width = Math.max(1, Math.round(cssLengthToPx(widthLength) ?? 0))
    }
  }

  if (!imgEl.hasAttribute('height') && !figureEl.hasAttribute('data-image-height-percent') && heightLength) {
    if (heightLength.unit === '%') {
      nextLayout.heightUnit = 'percent'
      nextLayout.heightPercent = heightLength.amount
      nextLayout.heightRelativeTo = 'page'
    } else {
      nextLayout.height = Math.max(1, Math.round(cssLengthToPx(heightLength) ?? 0))
    }
  }

  if (!figureEl.hasAttribute('data-image-display') && (imageStyle.display || figureStyle.display)) {
    nextLayout.display = normalizeImageDisplay(
      imageStyle.display ?? figureStyle.display,
      nextLayout.display ?? DOCX_IMAGE_EXPORT_DEFAULTS.display
    ) as ImageDisplayMode
  }

  if (!figureEl.hasAttribute('data-image-rotation')) {
    const rotation = parseRotateDegrees(imageStyle.transform ?? figureStyle.transform)
    if (rotation != null) {
      nextLayout.rotation = rotation
    }
  }

  if (!figureEl.hasAttribute('data-image-border-visible')) {
    const borderColor = normalizeImageBorderColor(imageStyle['border-color'] ?? figureStyle['border-color'], null)
    const borderWidth = normalizeImageBorderWidthPt(imageStyle['border-width'] ?? figureStyle['border-width'], null)
    const borderDash = normalizeImageBorderDash(
      mapCssBorderDash(imageStyle['border-style'] ?? figureStyle['border-style']),
      'solid'
    )
    if (borderColor || borderWidth || borderDash !== 'solid') {
      nextLayout.borderVisible = true
      nextLayout.borderColor = borderColor ?? nextLayout.borderColor
      nextLayout.borderWidthPt = borderWidth ?? nextLayout.borderWidthPt
      nextLayout.borderDash = borderDash
    }
  }

  return nextLayout
}

export function resolveDocxImageMeasurementContext(formatting?: DocumentFormatting | null): ImageMeasurementContext {
  const paginationConfig = formatting?.pageless
    ? getPaginationConfigFromFormatting({ ...formatting, pageless: false })
    : getPaginationConfigFromFormatting(formatting)

  if (!paginationConfig) {
    return {}
  }

  return {
    containerWidth: Math.max(
      1,
      paginationConfig.pageWidth - paginationConfig.marginLeft - paginationConfig.marginRight
    ),
    containerHeight: Math.max(
      1,
      paginationConfig.pageHeight - paginationConfig.marginTop - paginationConfig.marginBottom
    )
  }
}

export function normalizeDocxCustomImageForExport(
  figureEl: HTMLElement,
  measurementContext: ImageMeasurementContext = {}
): NormalizedDocxImageExport | null {
  const imgEl = figureEl.querySelector('img[src]')
  if (!(imgEl instanceof HTMLElement)) {
    return null
  }

  const layout = applyCssFallbacks(
    getImageFigureAttributesFromElement(figureEl, DOCX_IMAGE_EXPORT_DEFAULTS),
    figureEl,
    imgEl
  )
  const src = layout.src?.trim() || imgEl.getAttribute('src')?.trim() || ''
  if (!src) {
    return null
  }

  return {
    src,
    alt: layout.alt?.trim() || null,
    title: layout.title?.trim() || null,
    caption: layout.caption?.trim() || null,
    layout,
    resolvedDimensions: resolveImageDimensions(layout, measurementContext)
  }
}

export function normalizeDocxInlineImageForExport(imgEl: HTMLElement): NormalizedDocxImageExport | null {
  const src = imgEl.getAttribute('src')?.trim() || ''
  if (!src) {
    return null
  }

  const layout = getImageFigureAttributesFromElement(imgEl, DOCX_IMAGE_EXPORT_DEFAULTS)
  return {
    src,
    alt: layout.alt?.trim() || null,
    title: layout.title?.trim() || null,
    caption: null,
    layout,
    resolvedDimensions: resolveImageDimensions(layout)
  }
}

function nodeIsIgnorableText(node: ChildNode): boolean {
  return node.nodeType === Node.TEXT_NODE && !(node.textContent ?? '').trim()
}

function paragraphContainsOnlyCustomImageSpan(paragraph: HTMLElement, imageSpan: HTMLElement): boolean {
  return Array.from(paragraph.childNodes).every(node => node === imageSpan || nodeIsIgnorableText(node))
}

function moveCaptionChildrenToFigure(source: HTMLElement, figure: HTMLElement, doc: Document): void {
  const childNodes = Array.from(source.childNodes)
  for (const child of childNodes) {
    if (!(child instanceof HTMLElement)) {
      if (!nodeIsIgnorableText(child)) {
        figure.appendChild(child)
      }
      continue
    }

    const isCaptionNode =
      child.tagName.toLowerCase() === 'figcaption' || child.getAttribute('data-image-caption-text') === 'true'

    if (isCaptionNode) {
      const figcaption = doc.createElement('figcaption')
      figcaption.className = child.className
      figcaption.textContent = child.textContent ?? ''
      figure.appendChild(figcaption)
      continue
    }

    figure.appendChild(child)
  }
}

function buildFigureFromInlineCustomImage(imageSpan: HTMLElement, doc: Document): HTMLElement {
  const figure = doc.createElement('figure')
  for (const attribute of Array.from(imageSpan.attributes)) {
    figure.setAttribute(attribute.name, attribute.value)
  }
  moveCaptionChildrenToFigure(imageSpan, figure, doc)
  return figure
}

export function normalizeDocxCustomImageMarkup(root: ParentNode): void {
  const inlineImages = Array.from(root.querySelectorAll(`span[data-node-type="${CUSTOM_IMAGE_TAG}"]`))

  for (const imageSpan of inlineImages) {
    if (!(imageSpan instanceof HTMLElement)) {
      continue
    }

    const parentParagraph = imageSpan.parentElement
    if (!(parentParagraph instanceof HTMLParagraphElement)) {
      continue
    }

    if (!paragraphContainsOnlyCustomImageSpan(parentParagraph, imageSpan)) {
      continue
    }

    const figure = buildFigureFromInlineCustomImage(imageSpan, parentParagraph.ownerDocument)
    parentParagraph.replaceWith(figure)
  }
}
