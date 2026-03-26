// Extract shape elements from slide XML with fill, stroke, and geometry mapping.

import type { ShapeElement, ShapeType, GradientConfig } from '../../components/slideElements'
import { createShapeElement } from '../../components/slideElements'
import type { OoxmlTheme } from './types'
import type { ParserMessage } from '../usePowerPointParser'
import {
  emuToPixels,
  rotationToAngle,
  extractTransform,
  getChild,
  parseSolidFill,
  parseGradientFill,
  isInsideGroup
} from './ooxmlUtils'

const PRESET_TO_SHAPE: Record<string, ShapeType> = {
  rect: 'rectangle',
  roundRect: 'rounded-rectangle',
  ellipse: 'ellipse',
  triangle: 'triangle',
  rtTriangle: 'triangle',
  diamond: 'diamond',
  rightArrow: 'arrow-right',
  leftArrow: 'arrow-left',
  upArrow: 'arrow-up',
  downArrow: 'arrow-down',
  star5: 'star',
  star4: 'star',
  star6: 'star',
  star8: 'star',
  star10: 'star',
  star12: 'star',
  star16: 'star',
  star24: 'star',
  star32: 'star',
  hexagon: 'hexagon',
  line: 'line',
  straightConnector1: 'line',
  wedgeRoundRectCallout: 'callout',
  wedgeRectCallout: 'callout',
  wedgeEllipseCallout: 'callout',
  cloudCallout: 'callout',
  borderCallout1: 'callout',
  borderCallout2: 'callout',
  borderCallout3: 'callout',
  flowChartProcess: 'rectangle',
  flowChartDecision: 'diamond',
  flowChartTerminator: 'rounded-rectangle',
  roundRect6: 'rounded-rectangle',
  snip1Rect: 'rectangle',
  snip2SameRect: 'rectangle',
  round1Rect: 'rounded-rectangle',
  round2SameRect: 'rounded-rectangle',
  octagon: 'hexagon',
  pentagon: 'hexagon',
  parallelogram: 'rectangle',
  trapezoid: 'rectangle',
  chevron: 'arrow-right',
  notchedRightArrow: 'arrow-right',
  homePlate: 'arrow-right',
  blockArc: 'circle',
  donut: 'circle',
  can: 'rounded-rectangle',
  cube: 'rectangle',
  bevel: 'rectangle',
  ribbon: 'rectangle',
  ribbon2: 'rectangle',
  plus: 'rectangle',
  cross: 'rectangle'
}

const DASH_MAP: Record<string, ShapeElement['strokeStyle']> = {
  solid: 'solid',
  dash: 'dashed',
  dot: 'dotted',
  lgDash: 'dashed',
  dashDot: 'dashed',
  lgDashDot: 'dashed',
  lgDashDotDot: 'dashed',
  sysDash: 'dashed',
  sysDot: 'dotted',
  sysDashDot: 'dashed',
  sysDashDotDot: 'dashed'
}

/**
 * Resolve fill color from <p:style> > <a:fillRef>.
 * Returns the resolved color, 'transparent' for idx=0, or undefined if not found.
 */
function resolveStyleFillRef(shapeEl: Element, theme: OoxmlTheme | undefined): string | undefined {
  const style = getChild(shapeEl, 'p:style')
  if (!style) return undefined

  const fillRef = getChild(style, 'a:fillRef')
  if (!fillRef) return undefined

  const idx = parseInt(fillRef.getAttribute('idx') || '0')
  if (idx === 0) return 'transparent'

  const color = parseSolidFill(fillRef, theme)
  if (color) return color

  if (theme) {
    const accent1 = theme.colors.get('accent1')
    if (accent1) return accent1.startsWith('#') ? accent1 : `#${accent1}`
  }

  return undefined
}

/**
 * Resolve line color from <p:style> > <a:lnRef>.
 */
function resolveStyleLnRef(shapeEl: Element, theme: OoxmlTheme | undefined): string | undefined {
  const style = getChild(shapeEl, 'p:style')
  if (!style) return undefined

  const lnRef = getChild(style, 'a:lnRef')
  if (!lnRef) return undefined

  const idx = parseInt(lnRef.getAttribute('idx') || '0')
  if (idx === 0) return undefined

  return parseSolidFill(lnRef, theme)
}

function resolveShapeType(preset: string, width: number, height: number): ShapeType {
  if (preset === 'ellipse') {
    const ratio = Math.abs(width - height) / Math.max(width, height, 1)
    return ratio < 0.1 ? 'circle' : 'ellipse'
  }
  return PRESET_TO_SHAPE[preset] || 'rectangle'
}

export function extractShapeElements(
  slideXml: Document,
  theme: OoxmlTheme | undefined,
  messages: ParserMessage[],
  slideIndex: number
): ShapeElement[] {
  const elements: ShapeElement[] = []
  const shapes = slideXml.getElementsByTagName('p:sp')

  for (let i = 0; i < shapes.length; i++) {
    const shape = shapes[i]

    if (isInsideGroup(shape)) continue

    const txBody = getChild(shape, 'p:txBody')
    if (txBody) {
      const paragraphs = txBody.getElementsByTagName('a:p')
      let hasText = false
      for (let j = 0; j < paragraphs.length && !hasText; j++) {
        const runs = paragraphs[j].getElementsByTagName('a:t')
        for (let k = 0; k < runs.length && !hasText; k++) {
          if ((runs[k].textContent || '').trim()) hasText = true
        }
      }
      if (hasText) continue
    }

    const spPr = getChild(shape, 'p:spPr')
    if (!spPr) continue

    const transform = extractTransform(shape)
    if (!transform) continue

    const width = emuToPixels(transform.cx)
    const height = emuToPixels(transform.cy)

    const prstGeom = getChild(spPr, 'a:prstGeom')
    const custGeom = getChild(spPr, 'a:custGeom')
    const preset = prstGeom?.getAttribute('prst')

    if (!preset && !custGeom) continue

    const shapeType = preset ? resolveShapeType(preset, width, height) : 'rectangle'

    if (preset && !PRESET_TO_SHAPE[preset]) {
      messages.push({
        type: 'warning',
        message: 'parser-shape-unsupported',
        params: { type: preset, slide: String(slideIndex + 1) }
      })
    }

    let fill = 'transparent'
    let gradient: GradientConfig | undefined
    let hasFillDefined = false

    const solidFill = getChild(spPr, 'a:solidFill')
    if (solidFill) {
      fill = parseSolidFill(solidFill, theme) || '#d1d5db'
      hasFillDefined = true
    }

    const gradFill = getChild(spPr, 'a:gradFill')
    if (gradFill) {
      const parsed = parseGradientFill(gradFill, theme)
      if (parsed) {
        gradient = parsed
        fill = parsed.stops[0]?.color || '#d1d5db'
        hasFillDefined = true
      }
    }

    const noFill = getChild(spPr, 'a:noFill')
    if (noFill) {
      fill = 'transparent'
      hasFillDefined = true
    }

    if (!hasFillDefined) {
      const resolved = resolveStyleFillRef(shape, theme)
      if (resolved !== undefined) {
        fill = resolved
        hasFillDefined = true
      }
    }

    if (!hasFillDefined && theme) {
      const accent1 = theme.colors.get('accent1')
      if (accent1) fill = accent1.startsWith('#') ? accent1 : `#${accent1}`
    }

    let strokeColor = '#000000'
    let strokeWidth = 0
    let strokeStyle: ShapeElement['strokeStyle'] = 'solid'
    let hasExplicitLine = false

    const ln = getChild(spPr, 'a:ln')
    if (ln) {
      hasExplicitLine = true
      const lnW = ln.getAttribute('w')
      if (lnW) strokeWidth = Math.round(emuToPixels(parseInt(lnW)))

      const lnSolidFill = getChild(ln, 'a:solidFill')
      if (lnSolidFill) strokeColor = parseSolidFill(lnSolidFill, theme) || strokeColor

      const prstDash = getChild(ln, 'a:prstDash')
      if (prstDash) {
        const dashVal = prstDash.getAttribute('val') || 'solid'
        strokeStyle = DASH_MAP[dashVal] || 'solid'
      }

      const lnNoFill = getChild(ln, 'a:noFill')
      if (lnNoFill) strokeWidth = 0
    }

    if (!hasExplicitLine) {
      const styleLnColor = resolveStyleLnRef(shape, theme)
      if (styleLnColor) {
        strokeColor = styleLnColor
        strokeWidth = strokeWidth || 1
      }
    }

    elements.push(
      createShapeElement(shapeType, {
        id: `shape-import-${Date.now()}-${i}`,
        position: { x: Math.max(0, emuToPixels(transform.x)), y: Math.max(0, emuToPixels(transform.y)) },
        size: { width: Math.max(10, width), height: Math.max(10, height) },
        fill,
        gradient,
        strokeColor,
        strokeWidth,
        strokeStyle,
        rotation: rotationToAngle(transform.rotation),
        cornerRadius: shapeType === 'rounded-rectangle' ? 12 : 0
      })
    )
  }

  return elements
}
