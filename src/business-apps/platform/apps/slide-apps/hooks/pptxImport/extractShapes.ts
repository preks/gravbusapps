// Extract shape elements from slide XML with fill, stroke, and geometry mapping.

import type {
  AnySlideElement,
  ShapeElement,
  ShapeImportMetadata,
  ShapeType,
  GradientConfig,
  PictureFill,
  PatternFill
} from '../../components/slideElements'
import { createShapeElement } from '../../components/slideElements'
import type { OoxmlTheme, SlideRelationships } from './types'
import { extractTextElements, extractShapeInTextForAutoshave } from './extractText'
import type { InheritedTextDefaultsResolver } from './extractInheritedTextDefaults'
import type { ParserMessage } from '../usePowerPointParser'
import {
  emuToPixels,
  rotationToAngle,
  extractTransform,
  getChild,
  isInsideGroup,
  nextImportUid,
  getOoxmlShapeId
} from './ooxmlUtils'
import { resolveShapeFill, resolveShapeLine, resolveShapeEffects } from './shapeStyleResolver'

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
  flowChartAlternateProcess: 'rounded-rectangle',
  roundRect6: 'rounded-rectangle',
  snip1Rect: 'rectangle',
  snip2SameRect: 'rectangle',
  snip2DiagRect: 'rectangle',
  snipRoundRect: 'rectangle',
  round1Rect: 'rounded-rectangle',
  round2SameRect: 'rounded-rectangle',
  round2DiagRect: 'rounded-rectangle',
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
  cross: 'rectangle',
  // Block arrows — all fall back to arrow-right/left/up/down when the Office
  // preset renderer is disabled. OfficeShapeRenderer does the actual drawing
  // for every one of these since A1, so these mappings are only used for the
  // "unsupported preset" warning + native ShapeType legacy code paths.
  bentArrow: 'arrow-right',
  bentUpArrow: 'arrow-up',
  uturnArrow: 'arrow-up',
  leftRightArrow: 'arrow-right',
  upDownArrow: 'arrow-up',
  quadArrow: 'arrow-right',
  leftRightUpArrow: 'arrow-up',
  circularArrow: 'arrow-right',
  curvedRightArrow: 'arrow-right',
  curvedLeftArrow: 'arrow-left',
  curvedUpArrow: 'arrow-up',
  curvedDownArrow: 'arrow-down',
  stripedRightArrow: 'arrow-right',
  swooshArrow: 'arrow-right',
  leftArrowCallout: 'arrow-left',
  rightArrowCallout: 'arrow-right',
  upArrowCallout: 'arrow-up',
  downArrowCallout: 'arrow-down',
  // Equation shapes
  mathPlus: 'rectangle',
  mathMinus: 'rectangle',
  mathMultiply: 'rectangle',
  mathDivide: 'rectangle',
  mathEqual: 'rectangle',
  mathNotEqual: 'rectangle',
  // Flowchart shapes (fallbacks — OfficeShapeRenderer draws the exact glyph)
  flowChartInputOutput: 'rectangle',
  flowChartDocument: 'rectangle',
  flowChartMultidocument: 'rectangle',
  flowChartConnector: 'circle',
  flowChartPunchedCard: 'rectangle',
  flowChartPunchedTape: 'rectangle',
  flowChartPreparation: 'hexagon',
  flowChartManualOperation: 'rectangle',
  flowChartManualInput: 'rectangle',
  flowChartInternalStorage: 'rectangle',
  flowChartDelay: 'rounded-rectangle',
  flowChartDisplay: 'rounded-rectangle',
  flowChartPredefinedProcess: 'rectangle',
  flowChartMagneticDisk: 'rounded-rectangle',
  flowChartOffpageConnector: 'rectangle',
  flowChartStoredData: 'rectangle',
  flowChartSummingJunction: 'circle',
  flowChartOr: 'circle',
  // Stars and banners
  star7: 'star',
  verticalScroll: 'rectangle',
  horizontalScroll: 'rectangle',
  wave: 'rectangle',
  doubleWave: 'rectangle',
  // Basic shapes
  heart: 'ellipse',
  sun: 'star',
  moon: 'ellipse',
  cloud: 'ellipse',
  lightningBolt: 'triangle',
  smileyFace: 'circle',
  teardrop: 'ellipse',
  pie: 'circle',
  chord: 'circle',
  arc: 'circle',
  noSmoking: 'circle',
  frame: 'rectangle',
  halfFrame: 'rectangle',
  corner: 'rectangle',
  diagStripe: 'rectangle',
  leftBracket: 'rectangle',
  rightBracket: 'rectangle',
  leftBrace: 'rectangle',
  rightBrace: 'rectangle',
  heptagon: 'hexagon',
  decagon: 'hexagon',
  dodecagon: 'hexagon',
  // Callouts
  lineCallout1: 'callout',
  lineCallout2: 'callout',
  lineCallout3: 'callout',
  accentCallout1: 'callout',
  accentCallout2: 'callout',
  accentCallout3: 'callout',
  // Phase 2a: basic primitives
  rectangle: 'rectangle',
  oval: 'ellipse',
  plaque: 'rounded-rectangle',
  pieWedge: 'circle',
  gear6: 'hexagon',
  gear9: 'hexagon',
  cornerTabs: 'rectangle',
  squareTabs: 'rectangle',
  plaqueTabs: 'rectangle',
  foldedCorner: 'rectangle',
  irregularSeal1: 'star',
  irregularSeal2: 'star',
  ellipseRibbon: 'rectangle',
  ellipseRibbon2: 'rectangle',
  nonIsoscelesTrapezoid: 'rectangle',
  // Phase 2b: flowchart variants
  flowChartCollate: 'rectangle',
  flowChartSort: 'diamond',
  flowChartExtract: 'triangle',
  flowChartMerge: 'triangle',
  flowChartMagneticTape: 'circle',
  flowChartOnlineStorage: 'rectangle',
  // Phase 2c: arrow variants
  leftRightArrowCallout: 'arrow-right',
  upDownArrowCallout: 'arrow-up',
  quadArrowCallout: 'rectangle',
  leftUpArrow: 'arrow-left',
  leftCircularArrow: 'arrow-left',
  leftRightCircularArrow: 'arrow-right',
  // Phase 2d: callout variants
  accentBorderCallout1: 'callout',
  accentBorderCallout2: 'callout',
  accentBorderCallout3: 'callout',
  callout1: 'callout',
  callout2: 'callout',
  callout3: 'callout',
  // Phase 2e: action buttons (all render as rounded-rectangle body fallback)
  actionButtonBlank: 'rectangle',
  actionButtonHome: 'rectangle',
  actionButtonHelp: 'rectangle',
  actionButtonInformation: 'rectangle',
  actionButtonBackPrevious: 'rectangle',
  actionButtonForwardNext: 'rectangle',
  actionButtonBeginning: 'rectangle',
  actionButtonEnd: 'rectangle',
  actionButtonReturn: 'rectangle',
  actionButtonDocument: 'rectangle',
  actionButtonSound: 'rectangle',
  actionButtonMovie: 'rectangle',
  // Phase 2f: connectors + lines
  lineInv: 'line',
  bentConnector2: 'line',
  bentConnector3: 'line',
  bentConnector4: 'line',
  bentConnector5: 'line',
  curvedConnector2: 'line',
  curvedConnector3: 'line',
  curvedConnector4: 'line',
  curvedConnector5: 'line',
  // Audit round: remaining ECMA-376 ST_ShapeType entries
  bracketPair: 'rectangle',
  bracePair: 'rectangle',
  leftRightRibbon: 'rectangle',
  flowChartOfflineStorage: 'triangle',
  flowChartMagneticDrum: 'rectangle',
  funnel: 'rectangle',
  chartX: 'rectangle',
  chartPlus: 'rectangle',
  chartStar: 'rectangle'
}

function resolveShapeType(preset: string, width: number, height: number): ShapeType {
  if (preset === 'ellipse') {
    const ratio = Math.abs(width - height) / Math.max(width, height, 1)
    return ratio < 0.1 ? 'circle' : 'ellipse'
  }
  return PRESET_TO_SHAPE[preset] || 'rectangle'
}

const emptyRels = (): SlideRelationships => ({
  images: new Map(),
  hyperlinks: new Map(),
  chartPaths: new Map()
})

function isExplicitTextBox(shape: Element): boolean {
  const nvSpPr = getChild(shape, 'p:nvSpPr')
  const cNvSpPr = nvSpPr ? getChild(nvSpPr, 'p:cNvSpPr') : undefined
  const txBox = cNvSpPr?.getAttribute('txBox')
  return txBox === '1' || txBox === 'true'
}

function hasVisibleShapeRendering(element: ShapeElement | null): element is ShapeElement {
  if (!element) return false
  return element.fill !== 'transparent' || !!element.gradient || element.strokeWidth > 0 || !!element.shapeText
}

/**
 * Parse `<a:avLst>` adjustment values into a `{ name: int }` record. Keys
 * are kept in OOXML form (`adj`, `adj1`, `adj2` ...) so the preset renderer
 * can look them up directly without a translation layer.
 */
function extractAdjustments(prstGeom: Element | undefined): Record<string, number> | undefined {
  if (!prstGeom) return undefined
  const avLst = getChild(prstGeom, 'a:avLst')
  if (!avLst) return undefined
  const gds = avLst.getElementsByTagName('a:gd')
  if (gds.length === 0) return undefined
  const adj: Record<string, number> = {}
  for (let i = 0; i < gds.length; i++) {
    const gd = gds[i]
    const name = gd.getAttribute('name')
    const fmla = gd.getAttribute('fmla') || ''
    if (!name) continue
    const match = /val\s+(-?\d+)/.exec(fmla)
    if (match) {
      const val = parseInt(match[1])
      if (Number.isFinite(val)) adj[name] = val
    }
  }
  return Object.keys(adj).length > 0 ? adj : undefined
}

/**
 * Normalise a {@code <a:custGeom>} path into a single SVG `d` string in the
 * unit box `[0..1, 0..1]`. Only the most common commands are honored; more
 * exotic primitives (arcTo, quadBezTo) fall through as straight segments
 * so the shape still has a visible silhouette.
 *
 * This is intentionally lossy — the editor's renderer does not need pixel
 * fidelity for custom geometries yet, just a recognizable outline. Future
 * upgrades can replace this with a full OOXML path parser without touching
 * callers.
 */
function extractCustomGeometryPath(custGeom: Element | undefined): string | undefined {
  if (!custGeom) return undefined
  const pathLst = getChild(custGeom, 'a:pathLst')
  if (!pathLst) return undefined
  const path = getChild(pathLst, 'a:path')
  if (!path) return undefined

  const pathW = parseInt(path.getAttribute('w') || '1') || 1
  const pathH = parseInt(path.getAttribute('h') || '1') || 1

  const commands: string[] = []
  const pushPt = (cmd: string, raw: Element) => {
    const pt = getChild(raw, 'a:pt')
    if (!pt) return
    const x = parseInt(pt.getAttribute('x') || '0') / pathW
    const y = parseInt(pt.getAttribute('y') || '0') / pathH
    commands.push(`${cmd} ${x.toFixed(4)} ${y.toFixed(4)}`)
  }

  for (let i = 0; i < path.childNodes.length; i++) {
    const child = path.childNodes[i] as Element
    if (!child.tagName) continue
    switch (child.tagName) {
      case 'a:moveTo':
        pushPt('M', child)
        break
      case 'a:lnTo':
        pushPt('L', child)
        break
      case 'a:close':
        commands.push('Z')
        break
      case 'a:cubicBezTo': {
        // 3 <a:pt>
        const pts = child.getElementsByTagName('a:pt')
        if (pts.length >= 3) {
          const xs: number[] = []
          const ys: number[] = []
          for (let k = 0; k < 3; k++) {
            xs.push(parseInt(pts[k].getAttribute('x') || '0') / pathW)
            ys.push(parseInt(pts[k].getAttribute('y') || '0') / pathH)
          }
          commands.push(
            `C ${xs[0].toFixed(4)} ${ys[0].toFixed(4)} ${xs[1].toFixed(4)} ${ys[1].toFixed(4)} ${xs[2].toFixed(4)} ${ys[2].toFixed(4)}`
          )
        }
        break
      }
      case 'a:quadBezTo': {
        const pts = child.getElementsByTagName('a:pt')
        if (pts.length >= 2) {
          const xs: number[] = []
          const ys: number[] = []
          for (let k = 0; k < 2; k++) {
            xs.push(parseInt(pts[k].getAttribute('x') || '0') / pathW)
            ys.push(parseInt(pts[k].getAttribute('y') || '0') / pathH)
          }
          commands.push(`Q ${xs[0].toFixed(4)} ${ys[0].toFixed(4)} ${xs[1].toFixed(4)} ${ys[1].toFixed(4)}`)
        }
        break
      }
    }
  }

  if (commands.length === 0) return undefined
  return commands.join(' ')
}

/**
 * Import a single `p:sp` that has `p:spPr` with preset or custom geometry.
 * When the shape has text, it is stored in {@link ShapeElement.shapeText}.
 */
export function importAutoshaveFromPSpElement(
  shape: Element,
  theme: OoxmlTheme | undefined,
  messages: ParserMessage[],
  slideIndex: number,
  relationships: SlideRelationships,
  inheritedResolver?: InheritedTextDefaultsResolver
): ShapeElement | null {
  const spPr = getChild(shape, 'p:spPr')
  if (!spPr) return null

  const transform = extractTransform(shape)
  if (!transform) return null

  const width = emuToPixels(transform.cx)
  const height = emuToPixels(transform.cy)

  const prstGeom = getChild(spPr, 'a:prstGeom')
  const custGeom = getChild(spPr, 'a:custGeom')
  const preset = prstGeom?.getAttribute('prst') || undefined

  if (!preset && !custGeom) return null

  const shapeType = preset ? resolveShapeType(preset, width, height) : 'rectangle'

  if (preset && !PRESET_TO_SHAPE[preset]) {
    messages.push({
      type: 'warning',
      message: 'parser-shape-unsupported',
      params: { type: preset, slide: String(slideIndex + 1) }
    })
  }

  // Unified fill/line resolution. `resolveShapeFill` handles explicit
  // solidFill/gradFill/noFill/blipFill, then falls back to <p:style>'s
  // a:fillRef. When no fill can be resolved anywhere we leave the shape
  // transparent — PowerPoint itself does not draw a fill in that case, so
  // forcing an accent tint here turned every un-styled placeholder into a
  // visible colored box (titles, content wrappers, etc.).
  const resolvedFill = resolveShapeFill(shape, theme)
  let fill: string = resolvedFill.color
  const gradient: GradientConfig | undefined = resolvedFill.gradient
  let pictureFill: PictureFill | undefined
  let patternFill: PatternFill | undefined

  if (resolvedFill.kind === 'blip' && resolvedFill.picture) {
    // Resolve the blip relId → actual image src via the slide's relationship
    // map. When the ref can be resolved we pass it through as pictureFill so
    // renderers can paint the bitmap; if not, we fall back to transparent +
    // warning so the user knows a blip was dropped.
    const relId = resolvedFill.picture.relId
    const src = relId ? relationships.images.get(relId) : undefined
    if (src) {
      pictureFill = {
        kind: 'picture',
        src,
        stretch: resolvedFill.picture.stretch,
        tile: resolvedFill.picture.tile
      }
      fill = 'transparent'
    } else {
      fill = 'transparent'
      messages.push({
        type: 'warning',
        message: 'parser-shape-picture-fill-unsupported',
        params: { slide: String(slideIndex + 1) }
      })
    }
  } else if (resolvedFill.kind === 'pattern' && resolvedFill.pattern) {
    patternFill = {
      kind: 'pattern',
      preset: resolvedFill.pattern.preset,
      fgColor: resolvedFill.pattern.fgColor,
      bgColor: resolvedFill.pattern.bgColor
    }
    fill = resolvedFill.pattern.fgColor
  } else if (resolvedFill.kind === 'none') {
    // No fill declared anywhere (neither p:spPr nor p:style > a:fillRef).
    // PowerPoint renders this as transparent; we do the same.
    fill = 'transparent'
  }

  const resolvedLine = resolveShapeLine(shape, theme)
  const resolvedEffects = resolveShapeEffects(shape, theme)

  // Accessibility, hyperlink, and lock metadata live under `p:nvSpPr`.
  // Import these even when the shape has no text — they attach to the
  // container and drive export round-tripping.
  const nvSpPrEl = getChild(shape, 'p:nvSpPr')
  const cNvPr = nvSpPrEl ? getChild(nvSpPrEl, 'p:cNvPr') : undefined
  const cNvSpPrEl = nvSpPrEl ? getChild(nvSpPrEl, 'p:cNvSpPr') : undefined
  const altTitle = cNvPr?.getAttribute('title') || undefined
  const altDescr = cNvPr?.getAttribute('descr') || undefined
  const altText = altTitle || altDescr ? { title: altTitle, description: altDescr } : undefined

  let hyperlink: string | undefined
  const hlinkClick = cNvPr ? getChild(cNvPr, 'a:hlinkClick') : undefined
  if (hlinkClick) {
    const relId = hlinkClick.getAttribute('r:id')
    if (relId) {
      const url = relationships.hyperlinks.get(relId)
      if (url) hyperlink = url
    }
  }

  let spLocks: ShapeElement['spLocks']
  const spLocksEl = cNvSpPrEl ? getChild(cNvSpPrEl, 'a:spLocks') : undefined
  if (spLocksEl) {
    const readLock = (name: string) => spLocksEl.getAttribute(name) === '1'
    const locks = {
      noGrp: readLock('noGrp'),
      noSelect: readLock('noSelect'),
      noRot: readLock('noRot'),
      noChangeAspect: readLock('noChangeAspect'),
      noMove: readLock('noMove'),
      noResize: readLock('noResize'),
      noEditPoints: readLock('noEditPoints'),
      noAdjustHandles: readLock('noAdjustHandles'),
      noChangeArrowheads: readLock('noChangeArrowheads'),
      noChangeShapeType: readLock('noChangeShapeType'),
      noTextEdit: readLock('noTextEdit')
    }
    if (Object.values(locks).some(Boolean)) spLocks = locks
  }

  const shapeText = extractShapeInTextForAutoshave(shape, theme, relationships, inheritedResolver)

  const xfrm = getChild(spPr, 'a:xfrm')
  const flipH = xfrm?.getAttribute('flipH') === '1'
  const flipV = xfrm?.getAttribute('flipV') === '1'
  const adjustments = extractAdjustments(prstGeom)
  const custGeomPath = extractCustomGeometryPath(custGeom)

  const importMeta: ShapeImportMetadata = {
    sourceFormat: 'pptx',
    ...(preset ? { prst: preset } : {}),
    ...(adjustments ? { adjustments } : {}),
    ...(flipH ? { flipH: true } : {}),
    ...(flipV ? { flipV: true } : {}),
    ...(custGeomPath ? { custGeomPath } : {})
  }

  return createShapeElement(shapeType, {
    id: nextImportUid('shape-import'),
    position: { x: Math.max(0, emuToPixels(transform.x)), y: Math.max(0, emuToPixels(transform.y)) },
    size: { width: Math.max(10, width), height: Math.max(10, height) },
    fill,
    gradient,
    ...(pictureFill ? { pictureFill } : {}),
    ...(patternFill ? { patternFill } : {}),
    strokeColor: resolvedLine.color,
    strokeWidth: resolvedLine.width,
    strokeStyle: resolvedLine.style,
    ...(resolvedLine.compound ? { lineCompound: resolvedLine.compound } : {}),
    ...(resolvedLine.cap ? { lineCap: resolvedLine.cap } : {}),
    ...(resolvedLine.join ? { lineJoin: resolvedLine.join } : {}),
    ...(resolvedLine.headEnd ? { lineHeadEnd: resolvedLine.headEnd } : {}),
    ...(resolvedLine.tailEnd ? { lineTailEnd: resolvedLine.tailEnd } : {}),
    rotation: rotationToAngle(transform.rotation),
    cornerRadius: shapeType === 'rounded-rectangle' ? 12 : 0,
    ...(shapeText ? { shapeText } : {}),
    ...(resolvedEffects ? { effects: resolvedEffects } : {}),
    ...(altText ? { altText } : {}),
    ...(hyperlink ? { hyperlink } : {}),
    ...(spLocks ? { spLocks } : {}),
    ...(spLocks?.noMove || spLocks?.noSelect ? { locked: true } : {}),
    geometry: importMeta,
    importMeta
  })
}

/**
 * Registry that maps an OOXML drawing id (`<p:cNvPr id="…">`) to the element
 * id we generate during import. Connector endpoint bindings reference those
 * raw ids so we need to translate them once we know what element id each
 * shape was assigned.
 */
export type OoxmlShapeIdRegistry = Map<string, string>

export function registerShapeId(registry: OoxmlShapeIdRegistry | undefined, shape: Element, elementId: string): void {
  if (!registry) return
  const raw = getOoxmlShapeId(shape)
  if (raw) registry.set(raw, elementId)
}

/**
 * For one wrapped slide document containing a single `p:sp` (or one logical shape):
 * autoshave with geometry + optional in-shape text, or a plain text box.
 */
export function extractPSpToSingleElement(
  doc: Document,
  theme: OoxmlTheme | undefined,
  relationships: SlideRelationships,
  messages: ParserMessage[],
  slideIndex: number,
  inheritedResolver?: InheritedTextDefaultsResolver,
  shapeIdRegistry?: OoxmlShapeIdRegistry
): AnySlideElement | null {
  const sh = doc.getElementsByTagName('p:sp')[0]
  if (!sh) return null
  if (isExplicitTextBox(sh)) {
    const textElement = extractTextElements(doc, theme, relationships, inheritedResolver)[0]
    if (textElement) {
      registerShapeId(shapeIdRegistry, sh, textElement.id)
      return textElement
    }

    const shapeFallback = importAutoshaveFromPSpElement(
      sh,
      theme,
      messages,
      slideIndex,
      relationships,
      inheritedResolver
    )
    if (hasVisibleShapeRendering(shapeFallback)) {
      registerShapeId(shapeIdRegistry, sh, shapeFallback.id)
      return shapeFallback
    }
    return null
  }
  const spPr = getChild(sh, 'p:spPr')
  const hasGeom = spPr && (getChild(spPr, 'a:prstGeom') || getChild(spPr, 'a:custGeom'))
  if (hasGeom) {
    const el = importAutoshaveFromPSpElement(sh, theme, messages, slideIndex, relationships, inheritedResolver)
    if (el) registerShapeId(shapeIdRegistry, sh, el.id)
    return el
  }
  const text = extractTextElements(doc, theme, relationships, inheritedResolver)[0] ?? null
  if (text) registerShapeId(shapeIdRegistry, sh, text.id)
  return text
}

export function extractShapeElements(
  slideXml: Document,
  theme: OoxmlTheme | undefined,
  messages: ParserMessage[],
  slideIndex: number,
  relationships: SlideRelationships = emptyRels(),
  inheritedResolver?: InheritedTextDefaultsResolver
): ShapeElement[] {
  const elements: ShapeElement[] = []
  const shapes = slideXml.getElementsByTagName('p:sp')

  for (let i = 0; i < shapes.length; i++) {
    const shape = shapes[i]
    if (isInsideGroup(shape)) continue
    if (isExplicitTextBox(shape)) continue
    const el = importAutoshaveFromPSpElement(shape, theme, messages, slideIndex, relationships, inheritedResolver)
    if (el) elements.push(el)
  }

  return elements
}
