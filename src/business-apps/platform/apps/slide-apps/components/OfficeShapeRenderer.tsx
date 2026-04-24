/**
 * Preset-aware renderer for Office shapes.
 *
 * When a shape carries {@link ShapeElement.importMeta.prst}, we render the
 * exact Office geometry (SVG path) scaled to the current bounding box. Flips
 * and adjustment values are honored where meaningful.
 *
 * Unsupported presets fall back to the caller's generic renderer so nothing
 * regresses — callers should only invoke `tryRenderOfficePresetShape` and
 * render their own shape when it returns null.
 */

import React from 'react'
import type { ShapeElement } from './slideElements'
import { getShapeGeometry } from './slideElements'

type Adj = Record<string, number>

interface PresetRenderContext {
  width: number
  height: number
  fillStyle: string
  strokeColor: string
  strokeWidth: number
  shadow: boolean
  adj: Adj
  flipH: boolean
  flipV: boolean
  /** Line cap for SVG strokes (`rnd`/`sq`/`flat`). */
  lineCap?: 'rnd' | 'sq' | 'flat'
  /** Line join for SVG strokes. */
  lineJoin?: 'miter' | 'round' | 'bevel'
  /** Compound outline (`a:ln cmpd`). Single by default. */
  lineCompound?: 'sng' | 'dbl' | 'thickThin' | 'thinThick' | 'tri'
}

type PresetRenderer = (ctx: PresetRenderContext) => React.ReactNode

/** Convert an OOXML per-mille adjustment (default + override) to fraction. */
function adjPct(adj: Adj, key: string, defaultPerMille: number): number {
  const v = adj[key]
  if (typeof v === 'number' && Number.isFinite(v)) return v / 100000
  return defaultPerMille / 100000
}

function polygonPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return ''
  const head = `M ${points[0].x} ${points[0].y}`
  const rest = points
    .slice(1)
    .map(p => `L ${p.x} ${p.y}`)
    .join(' ')
  return `${head} ${rest} Z`
}

function svgTransform(ctx: PresetRenderContext): string | undefined {
  const parts: string[] = []
  if (ctx.flipH) parts.push(`translate(${ctx.width} 0) scale(-1 1)`)
  if (ctx.flipV) parts.push(`translate(0 ${ctx.height}) scale(1 -1)`)
  return parts.length > 0 ? parts.join(' ') : undefined
}

/** Translate OOXML line cap/join attributes to their SVG stroke equivalents. */
function svgStrokeAttrs(ctx: PresetRenderContext): {
  strokeLinecap?: 'butt' | 'round' | 'square'
  strokeLinejoin?: 'miter' | 'round' | 'bevel'
} {
  const out: { strokeLinecap?: 'butt' | 'round' | 'square'; strokeLinejoin?: 'miter' | 'round' | 'bevel' } = {}
  if (ctx.lineCap === 'rnd') out.strokeLinecap = 'round'
  else if (ctx.lineCap === 'sq') out.strokeLinecap = 'square'
  else if (ctx.lineCap === 'flat') out.strokeLinecap = 'butt'
  if (ctx.lineJoin) out.strokeLinejoin = ctx.lineJoin
  return out
}

function shapeSvg(ctx: PresetRenderContext, path: string): React.ReactNode {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow, lineCompound } = ctx
  const strokeAttrs = svgStrokeAttrs(ctx)
  // Compound outlines are approximated via a second inner stroke offset by
  // the compound ratio. `dbl` draws an inner parallel stroke half the
  // width; `thickThin` draws a thin stroke half the thickness; `tri`
  // layers a third stroke at the midline. This is a visual approximation
  // that preserves the multi-stroke look without implementing the
  // OOXML-exact offset algebra.
  const compoundLayer = (() => {
    if (!lineCompound || lineCompound === 'sng' || strokeWidth <= 0) return null
    const innerWidth =
      lineCompound === 'thinThick'
        ? Math.max(1, strokeWidth * 0.33)
        : lineCompound === 'thickThin'
          ? Math.max(1, strokeWidth * 0.66)
          : Math.max(1, strokeWidth * 0.5)
    return <path d={path} fill="none" stroke={strokeColor} strokeWidth={innerWidth} {...strokeAttrs} />
  })()
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g transform={svgTransform(ctx)}>
        <path
          d={path}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
          {...strokeAttrs}
          style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
        />
        {compoundLayer}
      </g>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Preset renderers
// ---------------------------------------------------------------------------

/**
 * `can` — cylinder rendered as two ellipses + rectangle body.
 * `adj1` controls the top ellipse height (0..50% of shape height).
 */
const renderCan: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const topFraction = Math.min(0.45, Math.max(0.05, adjPct(ctx.adj, 'adj', 25000)))
  const topH = height * topFraction
  const bodyTop = topH / 2
  const bodyBottom = height - topH / 2
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path
          d={`M 0 ${bodyTop} L 0 ${bodyBottom} A ${width / 2} ${topH / 2} 0 0 0 ${width} ${bodyBottom} L ${width} ${bodyTop} Z`}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
        <ellipse
          cx={width / 2}
          cy={bodyTop}
          rx={width / 2}
          ry={topH / 2}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
      </g>
    </svg>
  )
}

/**
 * `chevron` — right-pointing chevron. Uses the OOXML formula where the
 * notch/tip depth scales by `min(w, h)` (the "short stock", `ss`), not by
 * `w`. Wide-and-short chevrons therefore keep a mostly-rectangular body with
 * a modest arrow tip, matching PowerPoint exactly. Scaling by `w` (our old
 * implementation) turned 3:1 chevrons into deep diamonds.
 *
 * Spec:
 *   ss = min(w, h)
 *   maxAdj = 100000 * w / ss
 *   a = clamp(adj, 0, maxAdj)
 *   x1 = ss * a / 100000   // left notch depth
 *   x2 = w - x1             // right tip x
 */
const renderChevron: PresetRenderer = ctx => {
  const { width, height } = ctx
  const ss = Math.max(1, Math.min(width, height))
  const maxAdjPct = width / ss // fraction form of maxAdj
  const aPct = Math.min(maxAdjPct, Math.max(0, adjPct(ctx.adj, 'adj', 50000)))
  const x1 = ss * aPct
  const x2 = width - x1
  const points = [
    { x: 0, y: 0 },
    { x: x2, y: 0 },
    { x: width, y: height / 2 },
    { x: x2, y: height },
    { x: 0, y: height },
    { x: x1, y: height / 2 }
  ]
  return shapeSvg(ctx, polygonPath(points))
}

/**
 * `homePlate` (pentagon pointing right). `adj1` controls the point depth.
 */
const renderHomePlate: PresetRenderer = ctx => {
  const { width, height } = ctx
  const notch = Math.min(0.9, Math.max(0.05, adjPct(ctx.adj, 'adj', 50000))) * width
  const points = [
    { x: 0, y: 0 },
    { x: width - notch, y: 0 },
    { x: width, y: height / 2 },
    { x: width - notch, y: height },
    { x: 0, y: height }
  ]
  return shapeSvg(ctx, polygonPath(points))
}

/**
 * `notchedRightArrow` (a:rightArrow with an arrow-notched body). Adjustments
 * adj1 = arrow thickness fraction; adj2 = head base ratio.
 */
const renderNotchedRightArrow: PresetRenderer = ctx => {
  const { width, height } = ctx
  const bodyThickness = Math.min(0.9, Math.max(0.1, adjPct(ctx.adj, 'adj1', 50000))) * height
  const headLength = Math.min(0.9, Math.max(0.05, adjPct(ctx.adj, 'adj2', 50000))) * width
  const bodyTop = (height - bodyThickness) / 2
  const bodyBottom = bodyTop + bodyThickness
  const points = [
    { x: 0, y: bodyTop },
    { x: width - headLength, y: bodyTop },
    { x: width - headLength, y: 0 },
    { x: width, y: height / 2 },
    { x: width - headLength, y: height },
    { x: width - headLength, y: bodyBottom },
    { x: 0, y: bodyBottom }
  ]
  return shapeSvg(ctx, polygonPath(points))
}

const renderRightArrow: PresetRenderer = ctx => {
  const { width, height } = ctx
  const bodyThickness = Math.min(0.9, Math.max(0.1, adjPct(ctx.adj, 'adj1', 50000))) * height
  const headLength = Math.min(0.95, Math.max(0.05, adjPct(ctx.adj, 'adj2', 50000))) * width
  const bodyTop = (height - bodyThickness) / 2
  const bodyBottom = bodyTop + bodyThickness
  const points = [
    { x: 0, y: bodyTop },
    { x: width - headLength, y: bodyTop },
    { x: width - headLength, y: 0 },
    { x: width, y: height / 2 },
    { x: width - headLength, y: height },
    { x: width - headLength, y: bodyBottom },
    { x: 0, y: bodyBottom }
  ]
  return shapeSvg(ctx, polygonPath(points))
}

const renderLeftArrow: PresetRenderer = ctx => {
  const { width, height } = ctx
  const bodyThickness = Math.min(0.9, Math.max(0.1, adjPct(ctx.adj, 'adj1', 50000))) * height
  const headLength = Math.min(0.95, Math.max(0.05, adjPct(ctx.adj, 'adj2', 50000))) * width
  const bodyTop = (height - bodyThickness) / 2
  const bodyBottom = bodyTop + bodyThickness
  const points = [
    { x: width, y: bodyTop },
    { x: headLength, y: bodyTop },
    { x: headLength, y: 0 },
    { x: 0, y: height / 2 },
    { x: headLength, y: height },
    { x: headLength, y: bodyBottom },
    { x: width, y: bodyBottom }
  ]
  return shapeSvg(ctx, polygonPath(points))
}

const renderUpArrow: PresetRenderer = ctx => {
  const { width, height } = ctx
  const bodyThickness = Math.min(0.9, Math.max(0.1, adjPct(ctx.adj, 'adj1', 50000))) * width
  const headLength = Math.min(0.95, Math.max(0.05, adjPct(ctx.adj, 'adj2', 50000))) * height
  const bodyLeft = (width - bodyThickness) / 2
  const bodyRight = bodyLeft + bodyThickness
  const points = [
    { x: bodyLeft, y: height },
    { x: bodyLeft, y: headLength },
    { x: 0, y: headLength },
    { x: width / 2, y: 0 },
    { x: width, y: headLength },
    { x: bodyRight, y: headLength },
    { x: bodyRight, y: height }
  ]
  return shapeSvg(ctx, polygonPath(points))
}

const renderDownArrow: PresetRenderer = ctx => {
  const { width, height } = ctx
  const bodyThickness = Math.min(0.9, Math.max(0.1, adjPct(ctx.adj, 'adj1', 50000))) * width
  const headLength = Math.min(0.95, Math.max(0.05, adjPct(ctx.adj, 'adj2', 50000))) * height
  const bodyLeft = (width - bodyThickness) / 2
  const bodyRight = bodyLeft + bodyThickness
  const points = [
    { x: bodyLeft, y: 0 },
    { x: bodyLeft, y: height - headLength },
    { x: 0, y: height - headLength },
    { x: width / 2, y: height },
    { x: width, y: height - headLength },
    { x: bodyRight, y: height - headLength },
    { x: bodyRight, y: 0 }
  ]
  return shapeSvg(ctx, polygonPath(points))
}

const renderParallelogram: PresetRenderer = ctx => {
  const { width, height } = ctx
  const skew = Math.min(0.9, Math.max(0.05, adjPct(ctx.adj, 'adj', 25000))) * width
  const points = [
    { x: skew, y: 0 },
    { x: width, y: 0 },
    { x: width - skew, y: height },
    { x: 0, y: height }
  ]
  return shapeSvg(ctx, polygonPath(points))
}

const renderTrapezoid: PresetRenderer = ctx => {
  const { width, height } = ctx
  const inset = Math.min(0.45, Math.max(0.05, adjPct(ctx.adj, 'adj', 25000))) * width
  const points = [
    { x: inset, y: 0 },
    { x: width - inset, y: 0 },
    { x: width, y: height },
    { x: 0, y: height }
  ]
  return shapeSvg(ctx, polygonPath(points))
}

const renderOctagon: PresetRenderer = ctx => {
  const { width, height } = ctx
  const inset = Math.min(0.45, Math.max(0.05, adjPct(ctx.adj, 'adj', 29289))) * Math.min(width, height)
  const points = [
    { x: inset, y: 0 },
    { x: width - inset, y: 0 },
    { x: width, y: inset },
    { x: width, y: height - inset },
    { x: width - inset, y: height },
    { x: inset, y: height },
    { x: 0, y: height - inset },
    { x: 0, y: inset }
  ]
  return shapeSvg(ctx, polygonPath(points))
}

const renderPentagon: PresetRenderer = ctx => {
  const { width, height } = ctx
  const cx = width / 2
  const topY = 0
  const points = [
    { x: cx, y: topY },
    { x: width, y: height * 0.4 },
    { x: width * 0.82, y: height },
    { x: width * 0.18, y: height },
    { x: 0, y: height * 0.4 }
  ]
  return shapeSvg(ctx, polygonPath(points))
}

const renderPlus: PresetRenderer = ctx => {
  const { width, height } = ctx
  const arm = Math.min(0.45, Math.max(0.1, adjPct(ctx.adj, 'adj', 25000)))
  const armW = width * arm
  const armH = height * arm
  const points = [
    { x: armW, y: 0 },
    { x: width - armW, y: 0 },
    { x: width - armW, y: armH },
    { x: width, y: armH },
    { x: width, y: height - armH },
    { x: width - armW, y: height - armH },
    { x: width - armW, y: height },
    { x: armW, y: height },
    { x: armW, y: height - armH },
    { x: 0, y: height - armH },
    { x: 0, y: armH },
    { x: armW, y: armH }
  ]
  return shapeSvg(ctx, polygonPath(points))
}

const renderCross = renderPlus

// ---------------------------------------------------------------------------
// Basic polygon helpers shared by the new presets.
// ---------------------------------------------------------------------------

/**
 * Regular n-gon centered in the bounding box. `rotationRad` rotates the first
 * vertex (0 puts it at the top). Used for heptagon / decagon / dodecagon so
 * we don't hard-code coordinates per side count.
 */
function regularPolygon(
  width: number,
  height: number,
  sides: number,
  rotationRad = -Math.PI / 2
): { x: number; y: number }[] {
  const cx = width / 2
  const cy = height / 2
  const rx = width / 2
  const ry = height / 2
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i < sides; i++) {
    const angle = rotationRad + (i * 2 * Math.PI) / sides
    pts.push({ x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) })
  }
  return pts
}

/**
 * N-pointed star. `innerRatio` is the ratio between inner and outer radius
 * (PowerPoint defaults: star4=0.38, star5=0.38, star6=0.28, star8=0.38,
 * star10=0.38, star12=0.32, star16=0.38, star24=0.38, star32=0.38). We use
 * 0.4 as a generic default when no adjustment is provided.
 */
function starPoints(width: number, height: number, points: number, innerRatio: number): { x: number; y: number }[] {
  const cx = width / 2
  const cy = height / 2
  const outerRx = width / 2
  const outerRy = height / 2
  const innerRx = outerRx * innerRatio
  const innerRy = outerRy * innerRatio
  const out: { x: number; y: number }[] = []
  for (let i = 0; i < points * 2; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / points
    const r = i % 2 === 0 ? { x: outerRx, y: outerRy } : { x: innerRx, y: innerRy }
    out.push({ x: cx + r.x * Math.cos(angle), y: cy + r.y * Math.sin(angle) })
  }
  return out
}

function starRenderer(n: number, defaultInnerRatio: number): PresetRenderer {
  return ctx => {
    const { width, height } = ctx
    const innerRatio = adjPct(ctx.adj, 'adj', defaultInnerRatio * 100000)
    const pts = starPoints(width, height, n, Math.max(0.05, Math.min(0.95, innerRatio)))
    return shapeSvg(ctx, polygonPath(pts))
  }
}

// ---------------------------------------------------------------------------
// Block arrows
// ---------------------------------------------------------------------------

/** `bentArrow` — right then down. Body thickness = adj1, head = adj2. */
const renderBentArrow: PresetRenderer = ctx => {
  const { width, height } = ctx
  const bodyT = Math.min(0.45, Math.max(0.05, adjPct(ctx.adj, 'adj1', 25000))) * Math.min(width, height)
  const head = Math.min(0.45, Math.max(0.05, adjPct(ctx.adj, 'adj2', 25000))) * Math.min(width, height)
  const headBase = Math.min(0.5, Math.max(bodyT / width, 0.15)) * Math.min(width, height)
  const points = [
    { x: 0, y: 0 },
    { x: width - head, y: 0 },
    { x: width - head, y: (height - headBase) / 2 },
    { x: width, y: height / 2 },
    { x: width - head, y: (height + headBase) / 2 },
    { x: width - head, y: bodyT },
    { x: bodyT, y: bodyT },
    { x: bodyT, y: height },
    { x: 0, y: height }
  ]
  return shapeSvg(ctx, polygonPath(points))
}

/** `bentUpArrow` — right then up (mirror of bentArrow). */
const renderBentUpArrow: PresetRenderer = ctx => {
  const { width, height } = ctx
  const bodyT = Math.min(0.45, Math.max(0.05, adjPct(ctx.adj, 'adj1', 25000))) * Math.min(width, height)
  const head = Math.min(0.45, Math.max(0.05, adjPct(ctx.adj, 'adj2', 25000))) * Math.min(width, height)
  const points = [
    { x: 0, y: height },
    { x: 0, y: height - bodyT },
    { x: width - bodyT - head, y: height - bodyT },
    { x: width - bodyT - head, y: height - bodyT - head },
    { x: width - bodyT * 1.5, y: height - bodyT - head },
    { x: width - bodyT / 2, y: height - bodyT - head * 1.6 },
    { x: width, y: height - bodyT - head },
    { x: width - bodyT / 2, y: height - bodyT - head * 0.4 },
    { x: width - bodyT, y: height - bodyT },
    { x: width - bodyT, y: height }
  ]
  return shapeSvg(ctx, polygonPath(points))
}

/** `uturnArrow` — right, up, back left with arrow. */
const renderUturnArrow: PresetRenderer = ctx => {
  const { width, height } = ctx
  const t = Math.min(0.25, Math.max(0.05, adjPct(ctx.adj, 'adj1', 25000))) * height
  const head = Math.min(0.4, Math.max(0.1, adjPct(ctx.adj, 'adj2', 25000))) * width
  const r = Math.min(width * 0.3, height * 0.45)
  const leftX = width - 2 * r
  const points = [
    { x: 0, y: height },
    { x: 0, y: t },
    { x: leftX, y: t },
    { x: leftX, y: r },
    { x: width - head, y: r },
    { x: width - head, y: 0 },
    { x: width, y: r * 0.8 },
    { x: width - head, y: r * 1.6 },
    { x: width - head, y: r + t },
    { x: leftX + t, y: r + t },
    { x: leftX + t, y: height }
  ]
  return shapeSvg(ctx, polygonPath(points))
}

/** `leftRightArrow` — horizontal double arrow. */
const renderLeftRightArrow: PresetRenderer = ctx => {
  const { width, height } = ctx
  const bodyT = Math.min(0.9, Math.max(0.1, adjPct(ctx.adj, 'adj1', 50000))) * height
  const head = Math.min(0.45, Math.max(0.05, adjPct(ctx.adj, 'adj2', 25000))) * width
  const top = (height - bodyT) / 2
  const bot = top + bodyT
  const points = [
    { x: 0, y: height / 2 },
    { x: head, y: 0 },
    { x: head, y: top },
    { x: width - head, y: top },
    { x: width - head, y: 0 },
    { x: width, y: height / 2 },
    { x: width - head, y: height },
    { x: width - head, y: bot },
    { x: head, y: bot },
    { x: head, y: height }
  ]
  return shapeSvg(ctx, polygonPath(points))
}

/** `upDownArrow` — vertical double arrow. */
const renderUpDownArrow: PresetRenderer = ctx => {
  const { width, height } = ctx
  const bodyT = Math.min(0.9, Math.max(0.1, adjPct(ctx.adj, 'adj1', 50000))) * width
  const head = Math.min(0.45, Math.max(0.05, adjPct(ctx.adj, 'adj2', 25000))) * height
  const left = (width - bodyT) / 2
  const right = left + bodyT
  const points = [
    { x: width / 2, y: 0 },
    { x: width, y: head },
    { x: right, y: head },
    { x: right, y: height - head },
    { x: width, y: height - head },
    { x: width / 2, y: height },
    { x: 0, y: height - head },
    { x: left, y: height - head },
    { x: left, y: head },
    { x: 0, y: head }
  ]
  return shapeSvg(ctx, polygonPath(points))
}

/** `quadArrow` — 4-way cross arrow. */
const renderQuadArrow: PresetRenderer = ctx => {
  const { width, height } = ctx
  const bodyT = Math.min(0.4, Math.max(0.05, adjPct(ctx.adj, 'adj1', 22500))) * Math.min(width, height)
  const head = Math.min(0.3, Math.max(0.05, adjPct(ctx.adj, 'adj2', 22500))) * Math.min(width, height)
  const cx = width / 2
  const cy = height / 2
  const points = [
    { x: cx, y: 0 },
    { x: cx + head, y: head },
    { x: cx + bodyT / 2, y: head },
    { x: cx + bodyT / 2, y: cy - bodyT / 2 },
    { x: width - head, y: cy - bodyT / 2 },
    { x: width - head, y: cy - head },
    { x: width, y: cy },
    { x: width - head, y: cy + head },
    { x: width - head, y: cy + bodyT / 2 },
    { x: cx + bodyT / 2, y: cy + bodyT / 2 },
    { x: cx + bodyT / 2, y: height - head },
    { x: cx + head, y: height - head },
    { x: cx, y: height },
    { x: cx - head, y: height - head },
    { x: cx - bodyT / 2, y: height - head },
    { x: cx - bodyT / 2, y: cy + bodyT / 2 },
    { x: head, y: cy + bodyT / 2 },
    { x: head, y: cy + head },
    { x: 0, y: cy },
    { x: head, y: cy - head },
    { x: head, y: cy - bodyT / 2 },
    { x: cx - bodyT / 2, y: cy - bodyT / 2 },
    { x: cx - bodyT / 2, y: head },
    { x: cx - head, y: head }
  ]
  return shapeSvg(ctx, polygonPath(points))
}

/** `leftRightUpArrow` — 3-way arrow (left, right, up). */
const renderLeftRightUpArrow: PresetRenderer = ctx => {
  const { width, height } = ctx
  const bodyT = Math.min(0.35, Math.max(0.05, adjPct(ctx.adj, 'adj1', 25000))) * Math.min(width, height)
  const head = Math.min(0.3, Math.max(0.05, adjPct(ctx.adj, 'adj2', 25000))) * Math.min(width, height)
  const cx = width / 2
  const baseY = height - bodyT
  const points = [
    { x: cx, y: 0 },
    { x: cx + head, y: head },
    { x: cx + bodyT / 2, y: head },
    { x: cx + bodyT / 2, y: baseY - bodyT / 2 },
    { x: width - head, y: baseY - bodyT / 2 },
    { x: width - head, y: baseY - head },
    { x: width, y: baseY },
    { x: width - head, y: baseY + head },
    { x: width - head, y: baseY + bodyT / 2 },
    { x: head, y: baseY + bodyT / 2 },
    { x: head, y: baseY + head },
    { x: 0, y: baseY },
    { x: head, y: baseY - head },
    { x: head, y: baseY - bodyT / 2 },
    { x: cx - bodyT / 2, y: baseY - bodyT / 2 },
    { x: cx - bodyT / 2, y: head },
    { x: cx - head, y: head }
  ]
  return shapeSvg(ctx, polygonPath(points))
}

/** `circularArrow` — 3/4 circle with an arrowhead. Uses SVG arc. */
const renderCircularArrow: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const cx = width / 2
  const cy = height / 2
  const rx = width * 0.42
  const ry = height * 0.42
  const thickness = Math.min(rx, ry) * 0.4
  const startA = Math.PI * 0.3
  const endA = Math.PI * 1.8
  const s1 = { x: cx + rx * Math.cos(startA), y: cy + ry * Math.sin(startA) }
  const s2 = { x: cx + (rx - thickness) * Math.cos(startA), y: cy + (ry - thickness) * Math.sin(startA) }
  const e1 = { x: cx + rx * Math.cos(endA), y: cy + ry * Math.sin(endA) }
  const e2 = { x: cx + (rx - thickness) * Math.cos(endA), y: cy + (ry - thickness) * Math.sin(endA) }
  const tipA = endA + 0.25
  const tip = { x: cx + (rx + thickness * 0.6) * Math.cos(tipA), y: cy + (ry + thickness * 0.6) * Math.sin(tipA) }
  const d = [
    `M ${s1.x} ${s1.y}`,
    `A ${rx} ${ry} 0 1 1 ${e1.x} ${e1.y}`,
    `L ${tip.x} ${tip.y}`,
    `L ${e2.x} ${e2.y}`,
    `A ${rx - thickness} ${ry - thickness} 0 1 0 ${s2.x} ${s2.y}`,
    'Z'
  ].join(' ')
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path
          d={d}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
          fillRule="evenodd"
        />
      </g>
    </svg>
  )
}

/** Shared helper for curved directional arrows: arc + arrowhead pointing in `dir`. */
function curvedDirectionalArrow(ctx: PresetRenderContext, dir: 'right' | 'left' | 'up' | 'down'): React.ReactNode {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const thickness = Math.min(width, height) * 0.25
  const headLen = Math.min(width, height) * 0.28
  let d = ''
  if (dir === 'right') {
    d = [
      `M 0 ${height - thickness}`,
      `Q ${width / 2} ${height - thickness * 3} ${width - headLen} ${thickness}`,
      `L ${width - headLen} 0`,
      `L ${width} ${thickness + headLen / 2}`,
      `L ${width - headLen} ${thickness + headLen}`,
      `L ${width - headLen} ${thickness * 1.6}`,
      `Q ${width / 2} ${height - thickness * 1.2} ${thickness} ${height}`,
      'Z'
    ].join(' ')
  } else if (dir === 'left') {
    d = [
      `M ${width} ${height - thickness}`,
      `Q ${width / 2} ${height - thickness * 3} ${headLen} ${thickness}`,
      `L ${headLen} 0`,
      `L 0 ${thickness + headLen / 2}`,
      `L ${headLen} ${thickness + headLen}`,
      `L ${headLen} ${thickness * 1.6}`,
      `Q ${width / 2} ${height - thickness * 1.2} ${width - thickness} ${height}`,
      'Z'
    ].join(' ')
  } else if (dir === 'up') {
    d = [
      `M ${thickness} ${height}`,
      `Q ${width - thickness * 3} ${height / 2} ${thickness} ${headLen}`,
      `L 0 ${headLen}`,
      `L ${thickness + headLen / 2} 0`,
      `L ${thickness + headLen} ${headLen}`,
      `L ${thickness * 1.6} ${headLen}`,
      `Q ${width - thickness * 1.2} ${height / 2} ${width} ${height - thickness}`,
      'Z'
    ].join(' ')
  } else {
    d = [
      `M ${thickness} 0`,
      `Q ${width - thickness * 3} ${height / 2} ${thickness} ${height - headLen}`,
      `L 0 ${height - headLen}`,
      `L ${thickness + headLen / 2} ${height}`,
      `L ${thickness + headLen} ${height - headLen}`,
      `L ${thickness * 1.6} ${height - headLen}`,
      `Q ${width - thickness * 1.2} ${height / 2} ${width} ${thickness}`,
      'Z'
    ].join(' ')
  }
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={d} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
      </g>
    </svg>
  )
}

const renderCurvedRightArrow: PresetRenderer = ctx => curvedDirectionalArrow(ctx, 'right')
const renderCurvedLeftArrow: PresetRenderer = ctx => curvedDirectionalArrow(ctx, 'left')
const renderCurvedUpArrow: PresetRenderer = ctx => curvedDirectionalArrow(ctx, 'up')
const renderCurvedDownArrow: PresetRenderer = ctx => curvedDirectionalArrow(ctx, 'down')

/** `stripedRightArrow` — rightArrow with a thin striped decoration at the tail. */
const renderStripedRightArrow: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const bodyThickness = Math.min(0.9, Math.max(0.1, adjPct(ctx.adj, 'adj1', 50000))) * height
  const headLength = Math.min(0.95, Math.max(0.05, adjPct(ctx.adj, 'adj2', 50000))) * width
  const bodyTop = (height - bodyThickness) / 2
  const bodyBottom = bodyTop + bodyThickness
  const stripeW = width * 0.06
  const gap = stripeW * 0.6
  const mainStart = stripeW * 2 + gap * 2
  const points = [
    { x: mainStart, y: bodyTop },
    { x: width - headLength, y: bodyTop },
    { x: width - headLength, y: 0 },
    { x: width, y: height / 2 },
    { x: width - headLength, y: height },
    { x: width - headLength, y: bodyBottom },
    { x: mainStart, y: bodyBottom }
  ]
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path
          d={polygonPath(points)}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
        <rect x={0} y={bodyTop} width={stripeW} height={bodyThickness} fill={fillStyle} />
        <rect x={stripeW + gap} y={bodyTop} width={stripeW} height={bodyThickness} fill={fillStyle} />
      </g>
    </svg>
  )
}

/** `swooshArrow` — thin flowing arrow (approximated with a curve). */
const renderSwooshArrow: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const headLen = Math.min(width, height) * 0.28
  const d = [
    `M 0 ${height}`,
    `Q ${width * 0.2} ${height * 0.9} ${width * 0.5} ${height * 0.55}`,
    `Q ${width * 0.8} ${height * 0.2} ${width - headLen} ${headLen * 0.6}`,
    `L ${width - headLen} 0`,
    `L ${width} ${headLen / 2}`,
    `L ${width - headLen} ${headLen}`,
    `L ${width - headLen} ${headLen * 1.2}`,
    `Q ${width * 0.78} ${height * 0.35} ${width * 0.48} ${height * 0.68}`,
    `Q ${width * 0.2} ${height * 0.98} 0 ${height}`,
    'Z'
  ].join(' ')
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={d} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
      </g>
    </svg>
  )
}

/** Helper: arrow-callout renderer that draws a rectangle body with an arrow tail. */
function arrowCalloutRenderer(dir: 'right' | 'left' | 'up' | 'down'): PresetRenderer {
  return ctx => {
    const { width, height } = ctx
    const head =
      Math.min(0.5, Math.max(0.1, adjPct(ctx.adj, 'adj2', 35000))) * (dir === 'up' || dir === 'down' ? height : width)
    const bodyT =
      Math.min(0.6, Math.max(0.1, adjPct(ctx.adj, 'adj1', 35000))) * (dir === 'up' || dir === 'down' ? width : height)
    let points: { x: number; y: number }[] = []
    if (dir === 'right') {
      const top = (height - bodyT) / 2
      const bot = top + bodyT
      points = [
        { x: 0, y: 0 },
        { x: width - head, y: 0 },
        { x: width - head, y: top },
        { x: width, y: height / 2 },
        { x: width - head, y: bot },
        { x: width - head, y: height },
        { x: 0, y: height }
      ]
    } else if (dir === 'left') {
      const top = (height - bodyT) / 2
      const bot = top + bodyT
      points = [
        { x: width, y: 0 },
        { x: head, y: 0 },
        { x: head, y: top },
        { x: 0, y: height / 2 },
        { x: head, y: bot },
        { x: head, y: height },
        { x: width, y: height }
      ]
    } else if (dir === 'up') {
      const left = (width - bodyT) / 2
      const right = left + bodyT
      points = [
        { x: 0, y: height },
        { x: 0, y: head },
        { x: left, y: head },
        { x: width / 2, y: 0 },
        { x: right, y: head },
        { x: width, y: head },
        { x: width, y: height }
      ]
    } else {
      const left = (width - bodyT) / 2
      const right = left + bodyT
      points = [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height - head },
        { x: right, y: height - head },
        { x: width / 2, y: height },
        { x: left, y: height - head },
        { x: 0, y: height - head }
      ]
    }
    return shapeSvg(ctx, polygonPath(points))
  }
}

const renderLeftArrowCallout = arrowCalloutRenderer('left')
const renderRightArrowCallout = arrowCalloutRenderer('right')
const renderUpArrowCallout = arrowCalloutRenderer('up')
const renderDownArrowCallout = arrowCalloutRenderer('down')

// ---------------------------------------------------------------------------
// Equation shapes
// ---------------------------------------------------------------------------

const renderMathPlus: PresetRenderer = ctx => {
  const { width, height } = ctx
  const thick = Math.min(0.5, Math.max(0.1, adjPct(ctx.adj, 'adj', 23520))) * Math.min(width, height)
  const cx = width / 2
  const cy = height / 2
  const points = [
    { x: cx - thick / 2, y: 0 },
    { x: cx + thick / 2, y: 0 },
    { x: cx + thick / 2, y: cy - thick / 2 },
    { x: width, y: cy - thick / 2 },
    { x: width, y: cy + thick / 2 },
    { x: cx + thick / 2, y: cy + thick / 2 },
    { x: cx + thick / 2, y: height },
    { x: cx - thick / 2, y: height },
    { x: cx - thick / 2, y: cy + thick / 2 },
    { x: 0, y: cy + thick / 2 },
    { x: 0, y: cy - thick / 2 },
    { x: cx - thick / 2, y: cy - thick / 2 }
  ]
  return shapeSvg(ctx, polygonPath(points))
}

const renderMathMinus: PresetRenderer = ctx => {
  const { width, height } = ctx
  const thick = Math.min(0.8, Math.max(0.1, adjPct(ctx.adj, 'adj', 23520))) * height
  const top = (height - thick) / 2
  return shapeSvg(
    ctx,
    polygonPath([
      { x: 0, y: top },
      { x: width, y: top },
      { x: width, y: top + thick },
      { x: 0, y: top + thick }
    ])
  )
}

const renderMathMultiply: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const thick = Math.min(0.45, Math.max(0.1, adjPct(ctx.adj, 'adj', 23520))) * Math.min(width, height)
  const cx = width / 2
  const cy = height / 2
  const ht = thick / Math.SQRT2
  const d = [
    `M ${ht} 0`,
    `L ${cx} ${cy - ht}`,
    `L ${width - ht} 0`,
    `L ${width} ${ht}`,
    `L ${cx + ht} ${cy}`,
    `L ${width} ${height - ht}`,
    `L ${width - ht} ${height}`,
    `L ${cx} ${cy + ht}`,
    `L ${ht} ${height}`,
    `L 0 ${height - ht}`,
    `L ${cx - ht} ${cy}`,
    `L 0 ${ht}`,
    'Z'
  ].join(' ')
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={d} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
      </g>
    </svg>
  )
}

const renderMathDivide: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const barThick = Math.min(0.3, Math.max(0.05, adjPct(ctx.adj, 'adj1', 11250))) * height
  const dotR = Math.min(0.2, Math.max(0.05, adjPct(ctx.adj, 'adj2', 11250))) * height
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <circle
          cx={width / 2}
          cy={height * 0.2}
          r={dotR}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
        <rect
          x={width * 0.15}
          y={(height - barThick) / 2}
          width={width * 0.7}
          height={barThick}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={width / 2}
          cy={height * 0.8}
          r={dotR}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
      </g>
    </svg>
  )
}

const renderMathEqual: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const bar = Math.min(0.3, Math.max(0.05, adjPct(ctx.adj, 'adj1', 18750))) * height
  const gap = Math.min(0.3, Math.max(0.05, adjPct(ctx.adj, 'adj2', 12500))) * height
  const y1 = (height - bar * 2 - gap) / 2
  const y2 = y1 + bar + gap
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <rect
          x={0}
          y={y1}
          width={width}
          height={bar}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
        <rect
          x={0}
          y={y2}
          width={width}
          height={bar}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
      </g>
    </svg>
  )
}

const renderMathNotEqual: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const bar = Math.min(0.3, Math.max(0.05, adjPct(ctx.adj, 'adj1', 18750))) * height
  const gap = Math.min(0.3, Math.max(0.05, adjPct(ctx.adj, 'adj2', 11111))) * height
  const y1 = (height - bar * 2 - gap) / 2
  const y2 = y1 + bar + gap
  const slashW = Math.min(width, height) * 0.08
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <rect
          x={0}
          y={y1}
          width={width}
          height={bar}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
        <rect
          x={0}
          y={y2}
          width={width}
          height={bar}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
        <line x1={width * 0.25} y1={height} x2={width * 0.75} y2={0} stroke={fillStyle} strokeWidth={slashW} />
      </g>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Flowchart shapes (the long tail)
// ---------------------------------------------------------------------------

const renderFlowChartInputOutput: PresetRenderer = ctx => {
  const { width, height } = ctx
  const skew = width * 0.15
  return shapeSvg(
    ctx,
    polygonPath([
      { x: skew, y: 0 },
      { x: width, y: 0 },
      { x: width - skew, y: height },
      { x: 0, y: height }
    ])
  )
}

const renderFlowChartDocument: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const waveH = height * 0.12
  const d = [
    `M 0 0`,
    `L ${width} 0`,
    `L ${width} ${height - waveH}`,
    `Q ${width * 0.75} ${height} ${width / 2} ${height - waveH}`,
    `Q ${width * 0.25} ${height - waveH * 2} 0 ${height - waveH}`,
    'Z'
  ].join(' ')
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={d} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
      </g>
    </svg>
  )
}

const renderFlowChartMultidocument: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const off = Math.min(width, height) * 0.08
  const waveH = height * 0.1
  const docPath = (offX: number, offY: number, w: number, h: number) =>
    [
      `M ${offX} ${offY}`,
      `L ${offX + w} ${offY}`,
      `L ${offX + w} ${offY + h - waveH}`,
      `Q ${offX + w * 0.75} ${offY + h} ${offX + w / 2} ${offY + h - waveH}`,
      `Q ${offX + w * 0.25} ${offY + h - waveH * 2} ${offX} ${offY + h - waveH}`,
      'Z'
    ].join(' ')
  const mainW = width - off * 2
  const mainH = height - off * 2
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path
          d={docPath(off * 2, 0, mainW, mainH)}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
        <path
          d={docPath(off, off, mainW, mainH)}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
        <path
          d={docPath(0, off * 2, mainW, mainH)}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
      </g>
    </svg>
  )
}

const renderFlowChartConnector: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <ellipse
          cx={width / 2}
          cy={height / 2}
          rx={width / 2}
          ry={height / 2}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
      </g>
    </svg>
  )
}

const renderFlowChartPunchedCard: PresetRenderer = ctx => {
  const { width, height } = ctx
  const cut = Math.min(width, height) * 0.2
  return shapeSvg(
    ctx,
    polygonPath([
      { x: cut, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height },
      { x: 0, y: cut }
    ])
  )
}

const renderFlowChartPunchedTape: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const waveH = height * 0.12
  const d = [
    `M 0 ${waveH}`,
    `Q ${width * 0.25} 0 ${width / 2} ${waveH}`,
    `Q ${width * 0.75} ${waveH * 2} ${width} ${waveH}`,
    `L ${width} ${height - waveH}`,
    `Q ${width * 0.75} ${height} ${width / 2} ${height - waveH}`,
    `Q ${width * 0.25} ${height - waveH * 2} 0 ${height - waveH}`,
    'Z'
  ].join(' ')
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={d} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
      </g>
    </svg>
  )
}

const renderFlowChartPreparation: PresetRenderer = ctx => {
  const { width, height } = ctx
  const inset = width * 0.2
  return shapeSvg(
    ctx,
    polygonPath([
      { x: inset, y: 0 },
      { x: width - inset, y: 0 },
      { x: width, y: height / 2 },
      { x: width - inset, y: height },
      { x: inset, y: height },
      { x: 0, y: height / 2 }
    ])
  )
}

const renderFlowChartManualOperation: PresetRenderer = ctx => {
  const { width, height } = ctx
  const inset = width * 0.15
  return shapeSvg(
    ctx,
    polygonPath([
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width - inset, y: height },
      { x: inset, y: height }
    ])
  )
}

const renderFlowChartManualInput: PresetRenderer = ctx => {
  const { width, height } = ctx
  const slope = height * 0.4
  return shapeSvg(
    ctx,
    polygonPath([
      { x: 0, y: slope },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height }
    ])
  )
}

const renderFlowChartInternalStorage: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const bandX = width * 0.12
  const bandY = height * 0.18
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
        <line
          x1={bandX}
          y1={0}
          x2={bandX}
          y2={height}
          stroke={strokeWidth > 0 ? strokeColor : '#0003'}
          strokeWidth={Math.max(1, strokeWidth)}
        />
        <line
          x1={0}
          y1={bandY}
          x2={width}
          y2={bandY}
          stroke={strokeWidth > 0 ? strokeColor : '#0003'}
          strokeWidth={Math.max(1, strokeWidth)}
        />
      </g>
    </svg>
  )
}

const renderFlowChartDelay: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const rx = height / 2
  const d = [`M 0 0`, `L ${width - rx} 0`, `A ${rx} ${rx} 0 0 1 ${width - rx} ${height}`, `L 0 ${height}`, 'Z'].join(
    ' '
  )
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={d} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
      </g>
    </svg>
  )
}

const renderFlowChartDisplay: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const leftCut = width * 0.15
  const rx = height / 2
  const d = [
    `M ${leftCut} 0`,
    `L ${width - rx} 0`,
    `A ${rx} ${rx} 0 0 1 ${width - rx} ${height}`,
    `L ${leftCut} ${height}`,
    `L 0 ${height / 2}`,
    'Z'
  ].join(' ')
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={d} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
      </g>
    </svg>
  )
}

const renderFlowChartPredefinedProcess: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const band = width * 0.08
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
        <line
          x1={band}
          y1={0}
          x2={band}
          y2={height}
          stroke={strokeWidth > 0 ? strokeColor : '#0003'}
          strokeWidth={Math.max(1, strokeWidth)}
        />
        <line
          x1={width - band}
          y1={0}
          x2={width - band}
          y2={height}
          stroke={strokeWidth > 0 ? strokeColor : '#0003'}
          strokeWidth={Math.max(1, strokeWidth)}
        />
      </g>
    </svg>
  )
}

const renderFlowChartMagneticDisk: PresetRenderer = renderCan

const renderFlowChartOffpageConnector: PresetRenderer = ctx => {
  const { width, height } = ctx
  const cut = height * 0.3
  return shapeSvg(
    ctx,
    polygonPath([
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height - cut },
      { x: width / 2, y: height },
      { x: 0, y: height - cut }
    ])
  )
}

const renderFlowChartStoredData: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const curve = width * 0.14
  const d = [
    `M ${curve} 0`,
    `L ${width} 0`,
    `Q ${width - curve * 2} ${height / 2} ${width} ${height}`,
    `L ${curve} ${height}`,
    `Q ${-curve} ${height / 2} ${curve} 0`,
    'Z'
  ].join(' ')
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={d} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
      </g>
    </svg>
  )
}

const renderFlowChartSummingJunction: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const off = Math.min(width, height) * 0.15
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <ellipse
          cx={width / 2}
          cy={height / 2}
          rx={width / 2}
          ry={height / 2}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
        <line
          x1={off}
          y1={off}
          x2={width - off}
          y2={height - off}
          stroke={strokeWidth > 0 ? strokeColor : 'var(--nw-border)'}
          strokeWidth={Math.max(1, strokeWidth)}
        />
        <line
          x1={width - off}
          y1={off}
          x2={off}
          y2={height - off}
          stroke={strokeWidth > 0 ? strokeColor : 'var(--nw-border)'}
          strokeWidth={Math.max(1, strokeWidth)}
        />
      </g>
    </svg>
  )
}

const renderFlowChartOr: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <ellipse
          cx={width / 2}
          cy={height / 2}
          rx={width / 2}
          ry={height / 2}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke={strokeWidth > 0 ? strokeColor : 'var(--nw-border)'}
          strokeWidth={Math.max(1, strokeWidth)}
        />
        <line
          x1={width / 2}
          y1={0}
          x2={width / 2}
          y2={height}
          stroke={strokeWidth > 0 ? strokeColor : 'var(--nw-border)'}
          strokeWidth={Math.max(1, strokeWidth)}
        />
      </g>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Stars and banners
// ---------------------------------------------------------------------------

const renderStar4 = starRenderer(4, 0.33)
const renderStar6 = starRenderer(6, 0.38)
const renderStar7 = starRenderer(7, 0.4)
const renderStar8 = starRenderer(8, 0.38)
const renderStar10 = starRenderer(10, 0.38)
const renderStar12 = starRenderer(12, 0.38)
const renderStar16 = starRenderer(16, 0.38)
const renderStar24 = starRenderer(24, 0.38)
const renderStar32 = starRenderer(32, 0.38)

/** Horizontal ribbon: rectangle with notched ends and a small fold at each side. */
const renderRibbon: PresetRenderer = ctx => {
  const { width, height } = ctx
  const fold = width * 0.12
  const notch = width * 0.06
  const t = height * 0.25
  const points = [
    { x: 0, y: 0 },
    { x: fold + notch, y: 0 },
    { x: fold, y: height / 2 },
    { x: fold + notch, y: height },
    { x: 0, y: height },
    { x: notch / 2, y: height - t },
    { x: fold, y: height - t },
    { x: fold, y: t },
    { x: notch / 2, y: t }
  ]
  const mirrored = points.map(p => ({ x: width - p.x, y: p.y }))
  const all = [...points, ...mirrored.reverse()]
  return shapeSvg(ctx, polygonPath(all))
}

const renderRibbon2 = renderRibbon

const renderVerticalScroll: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const roll = Math.min(width * 0.2, height * 0.15)
  const d = [
    `M ${roll} 0`,
    `L ${width - roll} 0`,
    `A ${roll} ${roll} 0 0 1 ${width} ${roll}`,
    `L ${width} ${height - roll}`,
    `A ${roll} ${roll} 0 0 1 ${width - roll} ${height}`,
    `L ${roll} ${height}`,
    `A ${roll} ${roll} 0 0 1 0 ${height - roll}`,
    `L 0 ${roll}`,
    `A ${roll} ${roll} 0 0 1 ${roll} 0`,
    'Z'
  ].join(' ')
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={d} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
      </g>
    </svg>
  )
}

/**
 * `horizontalScroll` — same curl geometry as `verticalScroll` but rotated 90°
 * so the rolls run along the top + bottom edges. Previously aliased to
 * `renderVerticalScroll`, which rendered identically in both directions.
 */
const renderHorizontalScroll: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const roll = Math.min(height * 0.2, width * 0.15)
  const d = [
    `M 0 ${roll}`,
    `L 0 ${height - roll}`,
    `A ${roll} ${roll} 0 0 0 ${roll} ${height}`,
    `L ${width - roll} ${height}`,
    `A ${roll} ${roll} 0 0 0 ${width} ${height - roll}`,
    `L ${width} ${roll}`,
    `A ${roll} ${roll} 0 0 0 ${width - roll} 0`,
    `L ${roll} 0`,
    `A ${roll} ${roll} 0 0 0 0 ${roll}`,
    'Z'
  ].join(' ')
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={d} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
      </g>
    </svg>
  )
}

const renderWave: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const amp = height * 0.2
  const d = [
    `M 0 ${amp}`,
    `Q ${width * 0.25} 0 ${width * 0.5} ${amp}`,
    `Q ${width * 0.75} ${amp * 2} ${width} ${amp}`,
    `L ${width} ${height - amp}`,
    `Q ${width * 0.75} ${height} ${width * 0.5} ${height - amp}`,
    `Q ${width * 0.25} ${height - amp * 2} 0 ${height - amp}`,
    'Z'
  ].join(' ')
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={d} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
      </g>
    </svg>
  )
}

const renderDoubleWave: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const amp = height * 0.14
  const d = [
    `M 0 ${amp}`,
    `Q ${width * 0.12} 0 ${width * 0.25} ${amp}`,
    `Q ${width * 0.38} ${amp * 2} ${width * 0.5} ${amp}`,
    `Q ${width * 0.62} 0 ${width * 0.75} ${amp}`,
    `Q ${width * 0.88} ${amp * 2} ${width} ${amp}`,
    `L ${width} ${height - amp}`,
    `Q ${width * 0.88} ${height} ${width * 0.75} ${height - amp}`,
    `Q ${width * 0.62} ${height - amp * 2} ${width * 0.5} ${height - amp}`,
    `Q ${width * 0.38} ${height} ${width * 0.25} ${height - amp}`,
    `Q ${width * 0.12} ${height - amp * 2} 0 ${height - amp}`,
    'Z'
  ].join(' ')
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={d} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
      </g>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Basic shapes (curved / exotic)
// ---------------------------------------------------------------------------

const renderHeart: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const d = [
    `M ${width / 2} ${height}`,
    `C ${-width * 0.05} ${height * 0.55} ${width * 0.2} ${-height * 0.1} ${width / 2} ${height * 0.3}`,
    `C ${width * 0.8} ${-height * 0.1} ${width * 1.05} ${height * 0.55} ${width / 2} ${height}`,
    'Z'
  ].join(' ')
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={d} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
      </g>
    </svg>
  )
}

const renderSun: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const cx = width / 2
  const cy = height / 2
  const rOuter = Math.min(width, height) / 2
  const rInner = rOuter * 0.55
  const rayInner = rOuter * 0.7
  const rays = 8
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i < rays * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / rays
    const r = i % 2 === 0 ? rOuter : rayInner
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
  }
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path
          d={polygonPath(pts)}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={cx}
          cy={cy}
          r={rInner}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
      </g>
    </svg>
  )
}

const renderMoon: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const d = [
    `M ${width * 0.85} 0`,
    `A ${width * 0.75} ${height / 2} 0 1 0 ${width * 0.85} ${height}`,
    `A ${width * 0.55} ${height * 0.4} 0 1 1 ${width * 0.85} 0`,
    'Z'
  ].join(' ')
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path
          d={d}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
          fillRule="evenodd"
        />
      </g>
    </svg>
  )
}

const renderCloud: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const d = [
    `M ${width * 0.2} ${height * 0.75}`,
    `Q 0 ${height * 0.7} 0 ${height * 0.5}`,
    `Q 0 ${height * 0.3} ${width * 0.2} ${height * 0.3}`,
    `Q ${width * 0.2} ${height * 0.05} ${width * 0.45} ${height * 0.1}`,
    `Q ${width * 0.55} ${-height * 0.05} ${width * 0.7} ${height * 0.15}`,
    `Q ${width * 0.95} ${height * 0.15} ${width} ${height * 0.4}`,
    `Q ${width * 1.05} ${height * 0.65} ${width * 0.85} ${height * 0.75}`,
    `Q ${width * 0.85} ${height * 1.0} ${width * 0.6} ${height * 0.9}`,
    `Q ${width * 0.45} ${height * 1.05} ${width * 0.3} ${height * 0.9}`,
    `Q ${width * 0.15} ${height * 0.95} ${width * 0.2} ${height * 0.75}`,
    'Z'
  ].join(' ')
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={d} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
      </g>
    </svg>
  )
}

const renderLightningBolt: PresetRenderer = ctx => {
  const { width, height } = ctx
  const points = [
    { x: width * 0.4, y: 0 },
    { x: width * 0.1, y: height * 0.55 },
    { x: width * 0.45, y: height * 0.55 },
    { x: width * 0.25, y: height },
    { x: width * 0.9, y: height * 0.4 },
    { x: width * 0.55, y: height * 0.4 },
    { x: width * 0.8, y: 0 }
  ]
  return shapeSvg(ctx, polygonPath(points))
}

const renderSmileyFace: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const cx = width / 2
  const cy = height / 2
  const rx = width / 2
  const ry = height / 2
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
        <circle cx={cx - rx * 0.35} cy={cy - ry * 0.2} r={Math.min(rx, ry) * 0.08} fill="var(--nw-foreground)" />
        <circle cx={cx + rx * 0.35} cy={cy - ry * 0.2} r={Math.min(rx, ry) * 0.08} fill="var(--nw-foreground)" />
        <path
          d={`M ${cx - rx * 0.4} ${cy + ry * 0.2} Q ${cx} ${cy + ry * 0.65} ${cx + rx * 0.4} ${cy + ry * 0.2}`}
          stroke="var(--nw-foreground)"
          strokeWidth={Math.max(1, strokeWidth)}
          fill="none"
        />
      </g>
    </svg>
  )
}

const renderTeardrop: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const d = [
    `M ${width / 2} 0`,
    `Q ${width} 0 ${width} ${height / 2}`,
    `A ${width / 2} ${height / 2} 0 1 1 0 ${height / 2}`,
    `Q 0 0 ${width / 2} 0`,
    'Z'
  ].join(' ')
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={d} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
      </g>
    </svg>
  )
}

const renderPie: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const cx = width / 2
  const cy = height / 2
  const startA = -Math.PI / 2
  const endA = Math.PI * 0.25
  const p1 = { x: cx + (width / 2) * Math.cos(startA), y: cy + (height / 2) * Math.sin(startA) }
  const p2 = { x: cx + (width / 2) * Math.cos(endA), y: cy + (height / 2) * Math.sin(endA) }
  const d = `M ${cx} ${cy} L ${p1.x} ${p1.y} A ${width / 2} ${height / 2} 0 1 1 ${p2.x} ${p2.y} Z`
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={d} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
      </g>
    </svg>
  )
}

const renderChord: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const cx = width / 2
  const cy = height / 2
  const startA = -Math.PI / 4
  const endA = Math.PI * 0.75
  const p1 = { x: cx + (width / 2) * Math.cos(startA), y: cy + (height / 2) * Math.sin(startA) }
  const p2 = { x: cx + (width / 2) * Math.cos(endA), y: cy + (height / 2) * Math.sin(endA) }
  const d = `M ${p1.x} ${p1.y} A ${width / 2} ${height / 2} 0 0 0 ${p2.x} ${p2.y} Z`
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={d} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
      </g>
    </svg>
  )
}

const renderDonut: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const ringFrac = Math.min(0.45, Math.max(0.05, adjPct(ctx.adj, 'adj', 25000)))
  const rxO = width / 2
  const ryO = height / 2
  const rxI = rxO * (1 - 2 * ringFrac)
  const ryI = ryO * (1 - 2 * ringFrac)
  const cx = width / 2
  const cy = height / 2
  const d = [
    `M ${cx - rxO} ${cy}`,
    `A ${rxO} ${ryO} 0 1 0 ${cx + rxO} ${cy}`,
    `A ${rxO} ${ryO} 0 1 0 ${cx - rxO} ${cy}`,
    `M ${cx - rxI} ${cy}`,
    `A ${rxI} ${ryI} 0 1 1 ${cx + rxI} ${cy}`,
    `A ${rxI} ${ryI} 0 1 1 ${cx - rxI} ${cy}`
  ].join(' ')
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path
          d={d}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
          fillRule="evenodd"
        />
      </g>
    </svg>
  )
}

const renderArc: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const cx = width / 2
  const cy = height / 2
  const startA = -Math.PI / 2
  const endA = 0
  const p1 = { x: cx + (width / 2) * Math.cos(startA), y: cy + (height / 2) * Math.sin(startA) }
  const p2 = { x: cx + (width / 2) * Math.cos(endA), y: cy + (height / 2) * Math.sin(endA) }
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path
          d={`M ${p1.x} ${p1.y} A ${width / 2} ${height / 2} 0 0 1 ${p2.x} ${p2.y}`}
          fill="none"
          stroke={strokeColor || fillStyle}
          strokeWidth={Math.max(1, strokeWidth)}
        />
      </g>
    </svg>
  )
}

const renderNoSmoking: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const ringFrac = 0.14
  const rxO = width / 2
  const ryO = height / 2
  const rxI = rxO * (1 - 2 * ringFrac)
  const ryI = ryO * (1 - 2 * ringFrac)
  const cx = width / 2
  const cy = height / 2
  const ringD = [
    `M ${cx - rxO} ${cy}`,
    `A ${rxO} ${ryO} 0 1 0 ${cx + rxO} ${cy}`,
    `A ${rxO} ${ryO} 0 1 0 ${cx - rxO} ${cy}`,
    `M ${cx - rxI} ${cy}`,
    `A ${rxI} ${ryI} 0 1 1 ${cx + rxI} ${cy}`,
    `A ${rxI} ${ryI} 0 1 1 ${cx - rxI} ${cy}`
  ].join(' ')
  const slashT = Math.min(width, height) * 0.08
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path
          d={ringD}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
          fillRule="evenodd"
        />
        <line
          x1={width * 0.2}
          y1={height * 0.8}
          x2={width * 0.8}
          y2={height * 0.2}
          stroke={fillStyle}
          strokeWidth={slashT}
        />
      </g>
    </svg>
  )
}

const renderFrame: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const t = Math.min(width, height) * Math.min(0.3, Math.max(0.02, adjPct(ctx.adj, 'adj', 12500)))
  const d = [
    `M 0 0`,
    `L ${width} 0`,
    `L ${width} ${height}`,
    `L 0 ${height}`,
    'Z',
    `M ${t} ${t}`,
    `L ${t} ${height - t}`,
    `L ${width - t} ${height - t}`,
    `L ${width - t} ${t}`,
    'Z'
  ].join(' ')
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path
          d={d}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
          fillRule="evenodd"
        />
      </g>
    </svg>
  )
}

const renderHalfFrame: PresetRenderer = ctx => {
  const { width, height } = ctx
  const t = Math.min(width, height) * 0.15
  const points = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width - t, y: t },
    { x: t, y: t },
    { x: t, y: height - t },
    { x: 0, y: height }
  ]
  return shapeSvg(ctx, polygonPath(points))
}

const renderCorner: PresetRenderer = ctx => {
  const { width, height } = ctx
  const t = Math.min(width, height) * 0.3
  const points = [
    { x: 0, y: 0 },
    { x: t, y: 0 },
    { x: t, y: height - t },
    { x: width, y: height - t },
    { x: width, y: height },
    { x: 0, y: height }
  ]
  return shapeSvg(ctx, polygonPath(points))
}

const renderDiagStripe: PresetRenderer = ctx => {
  const { width, height } = ctx
  const points = [
    { x: 0, y: height * 0.6 },
    { x: width * 0.4, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height * 0.4 },
    { x: width * 0.6, y: height },
    { x: 0, y: height }
  ]
  return shapeSvg(ctx, polygonPath(points))
}

function bracketRenderer(side: 'left' | 'right'): PresetRenderer {
  return ctx => {
    const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
    const t = Math.min(width * 0.25, height * 0.08)
    const sc = strokeColor || fillStyle
    const sw = Math.max(1, strokeWidth || Math.min(width, height) * 0.06)
    const d =
      side === 'left'
        ? `M ${width} ${sw / 2} L ${t} ${sw / 2} L ${t} ${height - sw / 2} L ${width} ${height - sw / 2}`
        : `M 0 ${sw / 2} L ${width - t} ${sw / 2} L ${width - t} ${height - sw / 2} L 0 ${height - sw / 2}`
    return (
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ overflow: 'visible' }}
      >
        <g
          transform={svgTransform(ctx)}
          style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
        >
          <path d={d} fill="none" stroke={sc} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="miter" />
        </g>
      </svg>
    )
  }
}

const renderLeftBracket = bracketRenderer('left')
const renderRightBracket = bracketRenderer('right')

function braceRenderer(side: 'left' | 'right'): PresetRenderer {
  return ctx => {
    const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
    const sc = strokeColor || fillStyle
    const sw = Math.max(1, strokeWidth || Math.min(width, height) * 0.06)
    const t = width * 0.35
    const mid = height / 2
    const d =
      side === 'left'
        ? [
            `M ${width} ${sw}`,
            `Q ${t} ${sw} ${t} ${mid * 0.5}`,
            `Q ${t} ${mid} 0 ${mid}`,
            `Q ${t} ${mid} ${t} ${mid + mid * 0.5}`,
            `Q ${t} ${height - sw} ${width} ${height - sw}`
          ].join(' ')
        : [
            `M 0 ${sw}`,
            `Q ${width - t} ${sw} ${width - t} ${mid * 0.5}`,
            `Q ${width - t} ${mid} ${width} ${mid}`,
            `Q ${width - t} ${mid} ${width - t} ${mid + mid * 0.5}`,
            `Q ${width - t} ${height - sw} 0 ${height - sw}`
          ].join(' ')
    return (
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ overflow: 'visible' }}
      >
        <g
          transform={svgTransform(ctx)}
          style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
        >
          <path d={d} fill="none" stroke={sc} strokeWidth={sw} strokeLinecap="round" />
        </g>
      </svg>
    )
  }
}

const renderLeftBrace = braceRenderer('left')
const renderRightBrace = braceRenderer('right')

/**
 * `bracketPair` — a pair of square brackets on the left and right, e.g.
 * `[   ]`. OOXML renders these as an open stroke pair; we draw both arms
 * at once inside a single SVG so the shape obeys flipH/flipV correctly.
 */
const renderBracketPair: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const t = Math.min(width * 0.08, height * 0.16)
  const sc = strokeColor || fillStyle
  const sw = Math.max(1, strokeWidth || Math.min(width, height) * 0.05)
  const left = `M ${t} ${sw / 2} L 0 ${sw / 2} L 0 ${height - sw / 2} L ${t} ${height - sw / 2}`
  const right = `M ${width - t} ${sw / 2} L ${width} ${sw / 2} L ${width} ${height - sw / 2} L ${width - t} ${height - sw / 2}`
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={left} fill="none" stroke={sc} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="miter" />
        <path d={right} fill="none" stroke={sc} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="miter" />
      </g>
    </svg>
  )
}

/** `bracePair` — `{   }` pair, same construction as bracketPair. */
const renderBracePair: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const t = width * 0.12
  const mid = height / 2
  const sc = strokeColor || fillStyle
  const sw = Math.max(1, strokeWidth || Math.min(width, height) * 0.05)
  const left = [
    `M ${t} ${sw}`,
    `Q ${t * 0.3} ${sw} ${t * 0.3} ${mid * 0.5}`,
    `Q ${t * 0.3} ${mid} 0 ${mid}`,
    `Q ${t * 0.3} ${mid} ${t * 0.3} ${mid + mid * 0.5}`,
    `Q ${t * 0.3} ${height - sw} ${t} ${height - sw}`
  ].join(' ')
  const right = [
    `M ${width - t} ${sw}`,
    `Q ${width - t * 0.3} ${sw} ${width - t * 0.3} ${mid * 0.5}`,
    `Q ${width - t * 0.3} ${mid} ${width} ${mid}`,
    `Q ${width - t * 0.3} ${mid} ${width - t * 0.3} ${mid + mid * 0.5}`,
    `Q ${width - t * 0.3} ${height - sw} ${width - t} ${height - sw}`
  ].join(' ')
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={left} fill="none" stroke={sc} strokeWidth={sw} strokeLinecap="round" />
        <path d={right} fill="none" stroke={sc} strokeWidth={sw} strokeLinecap="round" />
      </g>
    </svg>
  )
}

const renderHeptagon: PresetRenderer = ctx => shapeSvg(ctx, polygonPath(regularPolygon(ctx.width, ctx.height, 7)))
const renderDecagon: PresetRenderer = ctx => shapeSvg(ctx, polygonPath(regularPolygon(ctx.width, ctx.height, 10)))
const renderDodecagon: PresetRenderer = ctx => shapeSvg(ctx, polygonPath(regularPolygon(ctx.width, ctx.height, 12)))

// ---------------------------------------------------------------------------
// Callouts (beyond the generic wedge variants already supported)
// ---------------------------------------------------------------------------

const renderCloudCallout: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const bodyH = height * 0.72
  const cloudD = [
    `M ${width * 0.2} ${bodyH * 0.85}`,
    `Q 0 ${bodyH * 0.75} 0 ${bodyH * 0.5}`,
    `Q 0 ${bodyH * 0.25} ${width * 0.18} ${bodyH * 0.25}`,
    `Q ${width * 0.22} 0 ${width * 0.5} ${bodyH * 0.05}`,
    `Q ${width * 0.65} ${-bodyH * 0.1} ${width * 0.8} ${bodyH * 0.15}`,
    `Q ${width * 1.0} ${bodyH * 0.15} ${width} ${bodyH * 0.45}`,
    `Q ${width * 1.05} ${bodyH * 0.7} ${width * 0.85} ${bodyH * 0.85}`,
    `Q ${width * 0.85} ${bodyH} ${width * 0.6} ${bodyH * 0.9}`,
    `Q ${width * 0.45} ${bodyH * 1.05} ${width * 0.3} ${bodyH * 0.9}`,
    `Q ${width * 0.15} ${bodyH * 0.95} ${width * 0.2} ${bodyH * 0.85}`,
    'Z'
  ].join(' ')
  // Tail: three descending bubbles
  const t1cx = width * 0.22
  const t1cy = bodyH * 0.95
  const t2cx = width * 0.15
  const t2cy = bodyH + (height - bodyH) * 0.4
  const t3cx = width * 0.08
  const t3cy = height - 2
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={cloudD} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
        <circle
          cx={t1cx}
          cy={t1cy}
          r={height * 0.06}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={t2cx}
          cy={t2cy}
          r={height * 0.04}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={t3cx}
          cy={t3cy}
          r={height * 0.03}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
      </g>
    </svg>
  )
}

/** Line-callout family: rectangle body + a straight/angled leader line to a label target. */
function lineCalloutRenderer(segments: 1 | 2 | 3): PresetRenderer {
  return ctx => {
    const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
    const sc = strokeColor || '#64748b'
    const sw = Math.max(1, strokeWidth)
    // Label box occupies the right 60% of the bounding box; the line points
    // from the lower-left corner of the box to a target at (0, height).
    const boxX = width * 0.4
    const boxY = 0
    const boxW = width * 0.6
    const boxH = height * 0.6
    const leader: { x: number; y: number }[] =
      segments === 1
        ? [
            { x: 0, y: height },
            { x: boxX, y: boxY + boxH }
          ]
        : segments === 2
          ? [
              { x: 0, y: height },
              { x: boxX * 0.55, y: boxY + boxH },
              { x: boxX, y: boxY + boxH }
            ]
          : [
              { x: 0, y: height },
              { x: boxX * 0.3, y: height * 0.85 },
              { x: boxX * 0.7, y: boxY + boxH },
              { x: boxX, y: boxY + boxH }
            ]
    const leaderD =
      `M ${leader[0].x} ${leader[0].y} ` +
      leader
        .slice(1)
        .map(p => `L ${p.x} ${p.y}`)
        .join(' ')
    return (
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ overflow: 'visible' }}
      >
        <g
          transform={svgTransform(ctx)}
          style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
        >
          <rect
            x={boxX}
            y={boxY}
            width={boxW}
            height={boxH}
            fill={fillStyle}
            stroke={strokeWidth > 0 ? strokeColor : 'none'}
            strokeWidth={strokeWidth}
          />
          <path d={leaderD} fill="none" stroke={sc} strokeWidth={sw} />
        </g>
      </svg>
    )
  }
}

const renderLineCallout1 = lineCalloutRenderer(1)
const renderLineCallout2 = lineCalloutRenderer(2)
const renderLineCallout3 = lineCalloutRenderer(3)
const renderAccentCallout1 = lineCalloutRenderer(1)
const renderAccentCallout2 = lineCalloutRenderer(2)
const renderAccentCallout3 = lineCalloutRenderer(3)

const renderBevel: PresetRenderer = ctx => {
  const { width, height, strokeColor, strokeWidth, fillStyle, shadow } = ctx
  const inset = Math.min(0.45, Math.max(0.05, adjPct(ctx.adj, 'adj', 12500))) * Math.min(width, height)
  const outer = polygonPath([
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height }
  ])
  const inner = polygonPath([
    { x: inset, y: inset },
    { x: width - inset, y: inset },
    { x: width - inset, y: height - inset },
    { x: inset, y: height - inset }
  ])
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={outer} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
        <path d={inner} fill="none" stroke="var(--nw-border)" strokeWidth={1} />
      </g>
    </svg>
  )
}

const renderFlowChartProcess: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
      </g>
    </svg>
  )
}

const renderFlowChartTerminator: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const r = height / 2
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          rx={r}
          ry={r}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
      </g>
    </svg>
  )
}

const renderFlowChartDecision: PresetRenderer = ctx => {
  const { width, height } = ctx
  const points = [
    { x: width / 2, y: 0 },
    { x: width, y: height / 2 },
    { x: width / 2, y: height },
    { x: 0, y: height / 2 }
  ]
  return shapeSvg(ctx, polygonPath(points))
}

const renderFlowChartAltProcess: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const r = Math.min(width, height) * 0.12
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          rx={r}
          ry={r}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
      </g>
    </svg>
  )
}

const renderRoundRect: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  // OOXML default adj for roundRect is 16667 (≈16.67% of the min dimension).
  const fraction = Math.min(0.5, Math.max(0, adjPct(ctx.adj, 'adj', 16667)))
  const r = Math.min(width, height) * fraction
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          rx={r}
          ry={r}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
      </g>
    </svg>
  )
}

/**
 * OOXML snip/round helpers. The preset shape definitions (ECMA-376) describe
 * each variant by adjustment values measured in `ss = min(w, h)` units. All
 * variants share the same maths; only which corners receive the cut or
 * round differ:
 *
 *   round1Rect      round top-right (single adj)
 *   round2SameRect  round top-left + top-right (adj1 top, adj2 bottom)
 *   round2DiagRect  round top-left + bottom-right (adj1); top-right + bottom-left (adj2)
 *   snip1Rect       snip top-right (single adj)
 *   snip2SameRect   snip top-left + top-right (adj1 top, adj2 bottom)
 *   snip2DiagRect   snip top-left + bottom-right (adj1); top-right + bottom-left (adj2)
 *   snipRoundRect   snip top-left (adj1) + round top-right (adj2)
 *
 * Earlier the single "renderSnipRect" helper incorrectly snipped top-left +
 * bottom-right for every variant (that's actually `snip2DiagRect` geometry),
 * so importing e.g. a `snip1Rect` from PowerPoint produced the wrong outline.
 * Earlier the round1/round2Same variants all aliased `renderRoundRect`,
 * which rounds **all four** corners equally — losing the "only these
 * specific corners are rounded" signal the preset encodes.
 */
function snipDepth(adj: Adj | undefined, key: string, defaultPerMille: number, ss: number): number {
  const pct = Math.max(0, Math.min(0.5, adjPct(adj, key, defaultPerMille)))
  return pct * ss
}

/** `round1Rect` — round *only* the top-right corner. */
const renderRound1Rect: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const ss = Math.min(width, height)
  const r = snipDepth(ctx.adj, 'adj', 16667, ss)
  const d = [
    `M 0 0`,
    `L ${width - r} 0`,
    r > 0 ? `A ${r} ${r} 0 0 1 ${width} ${r}` : '',
    `L ${width} ${height}`,
    `L 0 ${height}`,
    'Z'
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={d} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
      </g>
    </svg>
  )
}

/**
 * `round2SameRect` — round both top corners (adj1) or both bottom corners
 * (adj2). OOXML defaults: adj1 = 16667 (top rounded), adj2 = 0 (bottom sharp).
 */
const renderRound2SameRect: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const ss = Math.min(width, height)
  const top = snipDepth(ctx.adj, 'adj1', 16667, ss)
  const bot = snipDepth(ctx.adj, 'adj2', 0, ss)
  const d = [
    `M ${top} 0`,
    `L ${width - top} 0`,
    top > 0 ? `A ${top} ${top} 0 0 1 ${width} ${top}` : '',
    `L ${width} ${height - bot}`,
    bot > 0 ? `A ${bot} ${bot} 0 0 1 ${width - bot} ${height}` : '',
    `L ${bot} ${height}`,
    bot > 0 ? `A ${bot} ${bot} 0 0 1 0 ${height - bot}` : '',
    `L 0 ${top}`,
    top > 0 ? `A ${top} ${top} 0 0 1 ${top} 0` : '',
    'Z'
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={d} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
      </g>
    </svg>
  )
}

const renderSnip1Rect: PresetRenderer = ctx => {
  const { width, height } = ctx
  const ss = Math.min(width, height)
  const cut = snipDepth(ctx.adj, 'adj', 16667, ss)
  const points = [
    { x: 0, y: 0 },
    { x: width - cut, y: 0 },
    { x: width, y: cut },
    { x: width, y: height },
    { x: 0, y: height }
  ]
  return shapeSvg(ctx, polygonPath(points))
}

const renderSnip2SameRect: PresetRenderer = ctx => {
  const { width, height } = ctx
  const ss = Math.min(width, height)
  const top = snipDepth(ctx.adj, 'adj1', 16667, ss)
  const bottom = snipDepth(ctx.adj, 'adj2', 0, ss)
  const points = [
    { x: top, y: 0 },
    { x: width - top, y: 0 },
    { x: width, y: top },
    { x: width, y: height - bottom },
    { x: width - bottom, y: height },
    { x: bottom, y: height },
    { x: 0, y: height - bottom },
    { x: 0, y: top }
  ]
  return shapeSvg(ctx, polygonPath(points))
}

/**
 * `snip2DiagRect` — snips two corners on *opposite* diagonals:
 *   - adj1 controls top-left & bottom-right
 *   - adj2 controls top-right & bottom-left
 *
 * PowerPoint's actual preset defaults (when `<a:avLst/>` is empty) are
 * `adj1 = 0`, `adj2 = 16667` (≈16.67% of the short stock). This matches the
 * rendering in Microsoft PowerPoint where a freshly-inserted
 * `snip2DiagRect` already shows TR + BL snips. Matching these defaults is
 * essential for faithful import — the spec's "0 / 0" fallback produces a
 * plain rectangle that PowerPoint never renders.
 */
const renderSnip2DiagRect: PresetRenderer = ctx => {
  const { width, height } = ctx
  const ss = Math.min(width, height)
  const a = snipDepth(ctx.adj, 'adj1', 0, ss) // TL + BR
  const b = snipDepth(ctx.adj, 'adj2', 16667, ss) // TR + BL
  const points = [
    { x: a, y: 0 },
    { x: width - b, y: 0 },
    { x: width, y: b },
    { x: width, y: height - a },
    { x: width - a, y: height },
    { x: b, y: height },
    { x: 0, y: height - b },
    { x: 0, y: a }
  ]
  return shapeSvg(ctx, polygonPath(points))
}

/**
 * `snipRoundRect` — snip top-left (adj1) + round top-right (adj2). Emitted as
 * an SVG path with a quarter-arc for the rounded corner.
 */
const renderSnipRoundRect: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const ss = Math.min(width, height)
  const snip = snipDepth(ctx.adj, 'adj1', 16667, ss)
  const round = snipDepth(ctx.adj, 'adj2', 16667, ss)
  const d =
    `M ${snip} 0 ` +
    `L ${width - round} 0 ` +
    `A ${round} ${round} 0 0 1 ${width} ${round} ` +
    `L ${width} ${height} ` +
    `L 0 ${height} ` +
    `L 0 ${snip} Z`
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={d} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
      </g>
    </svg>
  )
}

/**
 * `round2DiagRect` — round corners on the same diagonal as snip2DiagRect but
 * with quarter-arcs instead of straight snips.
 */
const renderRound2DiagRect: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const ss = Math.min(width, height)
  const a = snipDepth(ctx.adj, 'adj1', 16667, ss) // TL + BR
  const b = snipDepth(ctx.adj, 'adj2', 0, ss) // TR + BL
  const d =
    `M ${a} 0 ` +
    `L ${width - b} 0 ` +
    (b > 0 ? `A ${b} ${b} 0 0 1 ${width} ${b} ` : `L ${width} 0 `) +
    `L ${width} ${height - a} ` +
    (a > 0 ? `A ${a} ${a} 0 0 1 ${width - a} ${height} ` : `L ${width} ${height} `) +
    `L ${b} ${height} ` +
    (b > 0 ? `A ${b} ${b} 0 0 1 0 ${height - b} ` : `L 0 ${height} `) +
    `L 0 ${a} ` +
    (a > 0 ? `A ${a} ${a} 0 0 1 ${a} 0 ` : `L 0 0 `) +
    `Z`
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={d} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
      </g>
    </svg>
  )
}

const renderCallout: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const bodyH = height * 0.7
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path
          d={`M 0 0 L ${width} 0 L ${width} ${bodyH} L ${width * 0.4} ${bodyH} L ${width * 0.25} ${height} L ${width * 0.3} ${bodyH} L 0 ${bodyH} Z`}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
      </g>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Phase 2a: basic primitive shapes (ECMA-376 ST_ShapeType)
// ---------------------------------------------------------------------------

/** `rect` — plain rectangle. */
const renderRect: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
      </g>
    </svg>
  )
}

/** `ellipse` — plain ellipse filling the bounding box. */
const renderEllipse: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <ellipse
          cx={width / 2}
          cy={height / 2}
          rx={width / 2}
          ry={height / 2}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
      </g>
    </svg>
  )
}

/** `triangle` — isosceles triangle pointing up. */
const renderTriangle: PresetRenderer = ctx => {
  const { width, height } = ctx
  const adj = Math.min(1, Math.max(0, adjPct(ctx.adj, 'adj', 50000)))
  const apex = width * adj
  return shapeSvg(
    ctx,
    polygonPath([
      { x: apex, y: 0 },
      { x: width, y: height },
      { x: 0, y: height }
    ])
  )
}

/** `rtTriangle` — right triangle (right angle at bottom-left). */
const renderRtTriangle: PresetRenderer = ctx => {
  const { width, height } = ctx
  return shapeSvg(
    ctx,
    polygonPath([
      { x: 0, y: 0 },
      { x: width, y: height },
      { x: 0, y: height }
    ])
  )
}

/** `diamond` — rhombus. */
const renderDiamond: PresetRenderer = ctx => {
  const { width, height } = ctx
  return shapeSvg(
    ctx,
    polygonPath([
      { x: width / 2, y: 0 },
      { x: width, y: height / 2 },
      { x: width / 2, y: height },
      { x: 0, y: height / 2 }
    ])
  )
}

/** `hexagon` — regular-ish hexagon stretched to fill the bounding box. */
const renderHexagon: PresetRenderer = ctx => {
  const { width, height } = ctx
  const adj = Math.min(0.5, Math.max(0, adjPct(ctx.adj, 'adj', 25000)))
  const off = width * adj
  return shapeSvg(
    ctx,
    polygonPath([
      { x: off, y: 0 },
      { x: width - off, y: 0 },
      { x: width, y: height / 2 },
      { x: width - off, y: height },
      { x: off, y: height },
      { x: 0, y: height / 2 }
    ])
  )
}

/** `star5` — 5-point star (toolbar default). */
const renderStar5: PresetRenderer = ctx => {
  const { width, height } = ctx
  const cx = width / 2
  const cy = height / 2
  const R = Math.min(width, height) / 2
  const r = R * 0.382
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? R : r
    const ang = -Math.PI / 2 + i * (Math.PI / 5)
    pts.push({
      x: cx + Math.cos(ang) * rad * (width / Math.min(width, height)),
      y: cy + Math.sin(ang) * rad * (height / Math.min(width, height))
    })
  }
  return shapeSvg(ctx, polygonPath(pts))
}

/** `blockArc` — annular sector (ring segment with angular span). */
const renderBlockArc: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  // OOXML: adj1 = start angle (60000ths of a deg), adj2 = end angle, adj3 = inner radius ratio.
  const toDeg = (v: number | undefined, def: number): number => {
    const n = typeof v === 'number' ? v / 60000 : def
    return ((n % 360) + 360) % 360
  }
  const startDeg = toDeg(ctx.adj?.adj1, 180)
  const endDeg = toDeg(ctx.adj?.adj2, 0)
  const ringPct = Math.min(0.5, Math.max(0, adjPct(ctx.adj, 'adj3', 25000)))
  const cx = width / 2
  const cy = height / 2
  const rxOuter = width / 2
  const ryOuter = height / 2
  const rxInner = rxOuter * (1 - ringPct)
  const ryInner = ryOuter * (1 - ringPct)
  const sweep = (endDeg - startDeg + 360) % 360 || 360
  const largeArc = sweep > 180 ? 1 : 0
  const rad = (d: number): number => (d * Math.PI) / 180
  const po = { x: cx + rxOuter * Math.cos(rad(startDeg)), y: cy + ryOuter * Math.sin(rad(startDeg)) }
  const qo = { x: cx + rxOuter * Math.cos(rad(endDeg)), y: cy + ryOuter * Math.sin(rad(endDeg)) }
  const qi = { x: cx + rxInner * Math.cos(rad(endDeg)), y: cy + ryInner * Math.sin(rad(endDeg)) }
  const pi = { x: cx + rxInner * Math.cos(rad(startDeg)), y: cy + ryInner * Math.sin(rad(startDeg)) }
  const d = [
    `M ${po.x} ${po.y}`,
    `A ${rxOuter} ${ryOuter} 0 ${largeArc} 1 ${qo.x} ${qo.y}`,
    `L ${qi.x} ${qi.y}`,
    `A ${rxInner} ${ryInner} 0 ${largeArc} 0 ${pi.x} ${pi.y}`,
    'Z'
  ].join(' ')
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path
          d={d}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
          fillRule="evenodd"
        />
      </g>
    </svg>
  )
}

/** `cube` — 2.5D cube (front face + top + right side). */
const renderCube: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const depth = Math.min(width, height) * Math.min(0.5, Math.max(0, adjPct(ctx.adj, 'adj', 25000)))
  const front = `M 0 ${depth} L ${width - depth} ${depth} L ${width - depth} ${height} L 0 ${height} Z`
  const top = `M 0 ${depth} L ${depth} 0 L ${width} 0 L ${width - depth} ${depth} Z`
  const side = `M ${width - depth} ${depth} L ${width} 0 L ${width} ${height - depth} L ${width - depth} ${height} Z`
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={front} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
        <path
          d={top}
          fill={fillStyle}
          opacity={0.85}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
        <path
          d={side}
          fill={fillStyle}
          opacity={0.7}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
      </g>
    </svg>
  )
}

/** `plaque` — rectangle with concave (inward) rounded corners. */
const renderPlaque: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const r = Math.min(width, height) * Math.min(0.5, Math.max(0, adjPct(ctx.adj, 'adj', 16667)))
  const d = [
    `M ${r} 0`,
    `L ${width - r} 0`,
    `A ${r} ${r} 0 0 0 ${width} ${r}`,
    `L ${width} ${height - r}`,
    `A ${r} ${r} 0 0 0 ${width - r} ${height}`,
    `L ${r} ${height}`,
    `A ${r} ${r} 0 0 0 0 ${height - r}`,
    `L 0 ${r}`,
    `A ${r} ${r} 0 0 0 ${r} 0`,
    'Z'
  ].join(' ')
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={d} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
      </g>
    </svg>
  )
}

/** `pieWedge` — quarter (or arbitrary-sweep) pie slice. */
const renderPieWedge: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const d = [`M 0 ${height}`, `L 0 0`, `A ${width} ${height} 0 0 1 ${width} ${height}`, 'Z'].join(' ')
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={d} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
      </g>
    </svg>
  )
}

/** Shared gear renderer. `teeth` = tooth count; `toothDepth` = fraction of radius. */
function gearRenderer(teeth: number): PresetRenderer {
  return ctx => {
    const { width, height } = ctx
    const cx = width / 2
    const cy = height / 2
    const rxOuter = width / 2
    const ryOuter = height / 2
    const toothDepth = 0.18
    const rxInner = rxOuter * (1 - toothDepth)
    const ryInner = ryOuter * (1 - toothDepth)
    const toothHalf = Math.PI / (teeth * 2) / 2
    const pts: { x: number; y: number }[] = []
    for (let i = 0; i < teeth; i++) {
      const base = -Math.PI / 2 + (i * 2 * Math.PI) / teeth
      pts.push({ x: cx + rxOuter * Math.cos(base - toothHalf * 3), y: cy + ryOuter * Math.sin(base - toothHalf * 3) })
      pts.push({ x: cx + rxOuter * Math.cos(base - toothHalf), y: cy + ryOuter * Math.sin(base - toothHalf) })
      pts.push({ x: cx + rxInner * Math.cos(base + toothHalf), y: cy + ryInner * Math.sin(base + toothHalf) })
      pts.push({ x: cx + rxInner * Math.cos(base + toothHalf * 3), y: cy + ryInner * Math.sin(base + toothHalf * 3) })
    }
    return shapeSvg(ctx, polygonPath(pts))
  }
}

const renderGear6 = gearRenderer(6)
const renderGear9 = gearRenderer(9)

/** `cornerTabs` — rectangle with triangular tabs jutting out from each corner. */
const renderCornerTabs: PresetRenderer = ctx => {
  const { width, height } = ctx
  const t = Math.min(width, height) * 0.12
  const pts: { x: number; y: number }[] = [
    { x: t, y: 0 },
    { x: t, y: t },
    { x: 0, y: t },
    { x: 0, y: height - t },
    { x: t, y: height - t },
    { x: t, y: height },
    { x: width - t, y: height },
    { x: width - t, y: height - t },
    { x: width, y: height - t },
    { x: width, y: t },
    { x: width - t, y: t },
    { x: width - t, y: 0 }
  ]
  return shapeSvg(ctx, polygonPath(pts))
}

/** `squareTabs` — rectangle with square tabs at the midpoint of each side. */
const renderSquareTabs: PresetRenderer = ctx => {
  const { width, height } = ctx
  const t = Math.min(width, height) * 0.1
  const midX = width / 2
  const midY = height / 2
  const pts: { x: number; y: number }[] = [
    { x: 0, y: 0 },
    { x: midX - t, y: 0 },
    { x: midX - t, y: -t },
    { x: midX + t, y: -t },
    { x: midX + t, y: 0 },
    { x: width, y: 0 },
    { x: width, y: midY - t },
    { x: width + t, y: midY - t },
    { x: width + t, y: midY + t },
    { x: width, y: midY + t },
    { x: width, y: height },
    { x: midX + t, y: height },
    { x: midX + t, y: height + t },
    { x: midX - t, y: height + t },
    { x: midX - t, y: height },
    { x: 0, y: height },
    { x: 0, y: midY + t },
    { x: -t, y: midY + t },
    { x: -t, y: midY - t },
    { x: 0, y: midY - t }
  ]
  return shapeSvg(ctx, polygonPath(pts))
}

/** `plaqueTabs` — rectangle with concave rounded tabs at each corner. */
const renderPlaqueTabs: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const r = Math.min(width, height) * 0.1
  const d = [
    `M ${r} 0`,
    `L ${width - r} 0`,
    `A ${r} ${r} 0 0 0 ${width} ${r}`,
    `L ${width} ${height - r}`,
    `A ${r} ${r} 0 0 0 ${width - r} ${height}`,
    `L ${r} ${height}`,
    `A ${r} ${r} 0 0 0 0 ${height - r}`,
    `L 0 ${r}`,
    `A ${r} ${r} 0 0 0 ${r} 0`,
    'Z'
  ].join(' ')
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={d} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
      </g>
    </svg>
  )
}

/** `foldedCorner` — rectangle with a single folded top-right corner. */
const renderFoldedCorner: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const fold = Math.min(width, height) * Math.min(0.5, Math.max(0.05, adjPct(ctx.adj, 'adj', 12500)))
  const bodyPath = `M 0 0 L ${width - fold} 0 L ${width} ${fold} L ${width} ${height} L 0 ${height} Z`
  const foldPath = `M ${width - fold} 0 L ${width - fold} ${fold} L ${width} ${fold} Z`
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={bodyPath} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
        <path
          d={foldPath}
          fill={fillStyle}
          opacity={0.6}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
        />
      </g>
    </svg>
  )
}

/** Shared irregular-seal renderer with a deterministic spike pattern (seed-based). */
function irregularSealRenderer(seed: number): PresetRenderer {
  return ctx => {
    const { width, height } = ctx
    const cx = width / 2
    const cy = height / 2
    const spikes = 24
    const rxOuter = width / 2
    const ryOuter = height / 2
    const pts: { x: number; y: number }[] = []
    for (let i = 0; i < spikes; i++) {
      // Pseudo-random jitter based on seed + index for a repeatable shape.
      const jitter = 0.65 + 0.35 * Math.abs(Math.sin((i + seed) * 12.9898))
      const r = i % 2 === 0 ? 1 : 0.58 * jitter
      const ang = -Math.PI / 2 + (i * 2 * Math.PI) / spikes + (seed % 2 === 0 ? 0 : Math.PI / spikes / 2)
      pts.push({ x: cx + rxOuter * r * Math.cos(ang), y: cy + ryOuter * r * Math.sin(ang) })
    }
    return shapeSvg(ctx, polygonPath(pts))
  }
}

const renderIrregularSeal1 = irregularSealRenderer(1)
const renderIrregularSeal2 = irregularSealRenderer(2)

/** `ellipseRibbon` — curved banner with a dip in the middle (points downward). */
const renderEllipseRibbon: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const bandH = height * 0.55
  const dip = height * 0.15
  const tail = width * 0.08
  const d = [
    `M 0 ${bandH}`,
    `Q ${width / 2} ${-dip} ${width} ${bandH}`,
    `L ${width} ${bandH + tail}`,
    `L ${width - tail} ${bandH + tail * 0.5}`,
    `L ${width - tail} ${height}`,
    `Q ${width / 2} ${height * 0.5} ${tail} ${height}`,
    `L ${tail} ${bandH + tail * 0.5}`,
    `L 0 ${bandH + tail}`,
    'Z'
  ].join(' ')
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={d} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
      </g>
    </svg>
  )
}

/** `ellipseRibbon2` — curved banner pointing upward (mirror of ellipseRibbon). */
const renderEllipseRibbon2: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const bandH = height * 0.45
  const dip = height * 0.15
  const tail = width * 0.08
  const d = [
    `M 0 ${bandH}`,
    `Q ${width / 2} ${height + dip} ${width} ${bandH}`,
    `L ${width} ${bandH - tail}`,
    `L ${width - tail} ${bandH - tail * 0.5}`,
    `L ${width - tail} 0`,
    `Q ${width / 2} ${height * 0.5} ${tail} 0`,
    `L ${tail} ${bandH - tail * 0.5}`,
    `L 0 ${bandH - tail}`,
    'Z'
  ].join(' ')
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={d} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
      </g>
    </svg>
  )
}

/** `nonIsoscelesTrapezoid` — trapezoid with an asymmetric top. */
const renderNonIsoscelesTrapezoid: PresetRenderer = ctx => {
  const { width, height } = ctx
  const topL = width * Math.min(0.5, Math.max(0, adjPct(ctx.adj, 'adj1', 25000)))
  const topR = width * Math.min(0.5, Math.max(0, adjPct(ctx.adj, 'adj2', 12500)))
  return shapeSvg(
    ctx,
    polygonPath([
      { x: topL, y: 0 },
      { x: width - topR, y: 0 },
      { x: width, y: height },
      { x: 0, y: height }
    ])
  )
}

// ---------------------------------------------------------------------------
// Phase 2b: missing flowchart variants
// ---------------------------------------------------------------------------

/** `flowChartCollate` — hourglass / bowtie. */
const renderFlowChartCollate: PresetRenderer = ctx => {
  const { width, height } = ctx
  return shapeSvg(
    ctx,
    polygonPath([
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: 0, y: height },
      { x: width, y: height }
    ])
  )
}

/** `flowChartSort` — diamond stretched vertically with a horizontal divider line. */
const renderFlowChartSort: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const d = `M ${width / 2} 0 L ${width} ${height / 2} L ${width / 2} ${height} L 0 ${height / 2} Z`
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={d} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke={strokeWidth > 0 ? strokeColor : 'currentColor'}
          strokeWidth={Math.max(1, strokeWidth)}
        />
      </g>
    </svg>
  )
}

/** `flowChartExtract` — upward-pointing triangle. */
const renderFlowChartExtract: PresetRenderer = ctx => {
  const { width, height } = ctx
  return shapeSvg(
    ctx,
    polygonPath([
      { x: width / 2, y: 0 },
      { x: width, y: height },
      { x: 0, y: height }
    ])
  )
}

/** `flowChartMerge` — downward-pointing triangle. */
const renderFlowChartMerge: PresetRenderer = ctx => {
  const { width, height } = ctx
  return shapeSvg(
    ctx,
    polygonPath([
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width / 2, y: height }
    ])
  )
}

/** `flowChartMagneticTape` — circle with a tangent line at the bottom-right. */
const renderFlowChartMagneticTape: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const rx = width / 2
  const ry = height / 2
  const cx = width / 2
  const cy = height / 2
  const d = [
    `M ${cx} ${cy - ry}`,
    `A ${rx} ${ry} 0 1 0 ${cx - rx * 0.2} ${cy + ry * 0.98}`,
    `L ${width} ${height}`,
    `L ${width} ${cy}`,
    `A ${rx} ${ry} 0 0 0 ${cx} ${cy - ry}`,
    'Z'
  ].join(' ')
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={d} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
      </g>
    </svg>
  )
}

/** `flowChartOnlineStorage` — rectangle with a curved left edge (cylinder-ish). */
const renderFlowChartOnlineStorage: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const curve = width * 0.15
  const d = [
    `M ${curve} 0`,
    `L ${width} 0`,
    `L ${width - curve} ${height / 2}`,
    `L ${width} ${height}`,
    `L ${curve} ${height}`,
    `A ${curve} ${height / 2} 0 1 1 ${curve} 0`,
    'Z'
  ].join(' ')
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={d} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
      </g>
    </svg>
  )
}

/**
 * `flowChartOfflineStorage` — inverted triangle on top of a horizontal line.
 * OOXML draws a downward-pointing triangle with an accent stripe near the
 * apex to denote "offline" storage.
 */
const renderFlowChartOfflineStorage: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const tri = polygonPath([
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width / 2, y: height }
  ])
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={tri} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
        <line
          x1={width * 0.25}
          y1={height * 0.5}
          x2={width * 0.75}
          y2={height * 0.5}
          stroke={strokeWidth > 0 ? strokeColor : 'currentColor'}
          strokeWidth={Math.max(1, strokeWidth)}
        />
      </g>
    </svg>
  )
}

/**
 * `flowChartMagneticDrum` — horizontal cylinder. Body rectangle with
 * left-side and right-side ellipse caps, matching OOXML's drum preset.
 */
const renderFlowChartMagneticDrum: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const capW = width * 0.18
  const body = `M ${capW} 0 L ${width - capW} 0 A ${capW} ${height / 2} 0 0 1 ${width - capW} ${height} L ${capW} ${height} A ${capW} ${height / 2} 0 0 1 ${capW} 0 Z`
  const leftCap = `M ${capW} 0 A ${capW} ${height / 2} 0 0 0 ${capW} ${height}`
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path d={body} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
        <path
          d={leftCap}
          fill="none"
          stroke={strokeWidth > 0 ? strokeColor : 'currentColor'}
          strokeWidth={Math.max(1, strokeWidth)}
        />
      </g>
    </svg>
  )
}

/**
 * `leftRightRibbon` — horizontal bidirectional ribbon with a centre band.
 * OOXML mirrors the vertical ribbon set on the X axis; we reuse the same
 * polygonal construction swapped across axes.
 */
const renderLeftRightRibbon: PresetRenderer = ctx => {
  const { width, height } = ctx
  const band = height * 0.3
  const bandTop = (height - band) / 2
  const bandBottom = bandTop + band
  const notch = Math.min(width * 0.06, height * 0.12)
  return shapeSvg(
    ctx,
    polygonPath([
      { x: 0, y: bandTop },
      { x: width * 0.12, y: bandTop },
      { x: width * 0.15, y: 0 },
      { x: width * 0.85, y: 0 },
      { x: width * 0.88, y: bandTop },
      { x: width, y: bandTop },
      { x: width - notch, y: height / 2 },
      { x: width, y: bandBottom },
      { x: width * 0.88, y: bandBottom },
      { x: width * 0.85, y: height },
      { x: width * 0.15, y: height },
      { x: width * 0.12, y: bandBottom },
      { x: 0, y: bandBottom },
      { x: notch, y: height / 2 }
    ])
  )
}

/**
 * `funnel` — inverted open funnel. OOXML renders this as two stacked
 * trapezoids with a neck; we approximate with a single polygon.
 */
const renderFunnel: PresetRenderer = ctx => {
  const { width, height } = ctx
  const neckT = width * 0.3
  const neckB = width * 0.4
  const waist = height * 0.55
  return shapeSvg(
    ctx,
    polygonPath([
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width / 2 + neckB / 2, y: waist },
      { x: width / 2 + neckT / 2, y: height },
      { x: width / 2 - neckT / 2, y: height },
      { x: width / 2 - neckB / 2, y: waist }
    ])
  )
}

/** Shared chart-marker renderer. Used by chartX / chartStar / chartPlus. */
function chartMarkerRenderer(kind: 'x' | 'plus' | 'star'): PresetRenderer {
  return ctx => {
    const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
    const cx = width / 2
    const cy = height / 2
    const r = Math.min(width, height) / 2
    const sw = Math.max(1, strokeWidth || r * 0.22)
    const sc = strokeColor || fillStyle || 'currentColor'
    const strokes: { x1: number; y1: number; x2: number; y2: number }[] = []
    if (kind === 'plus' || kind === 'star') {
      strokes.push({ x1: cx - r, y1: cy, x2: cx + r, y2: cy })
      strokes.push({ x1: cx, y1: cy - r, x2: cx, y2: cy + r })
    }
    if (kind === 'x' || kind === 'star') {
      const d = r * Math.SQRT1_2
      strokes.push({ x1: cx - d, y1: cy - d, x2: cx + d, y2: cy + d })
      strokes.push({ x1: cx - d, y1: cy + d, x2: cx + d, y2: cy - d })
    }
    return (
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ overflow: 'visible' }}
      >
        <g
          transform={svgTransform(ctx)}
          style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
        >
          {strokes.map((s, i) => (
            <line key={i} {...s} stroke={sc} strokeWidth={sw} strokeLinecap="round" />
          ))}
        </g>
      </svg>
    )
  }
}

const renderChartX = chartMarkerRenderer('x')
const renderChartPlus = chartMarkerRenderer('plus')
const renderChartStar = chartMarkerRenderer('star')

// ---------------------------------------------------------------------------
// Phase 2c: missing arrow variants
// ---------------------------------------------------------------------------

/** `leftRightArrowCallout` — rectangle body with arrow heads on left AND right. */
const renderLeftRightArrowCallout: PresetRenderer = ctx => {
  const { width, height } = ctx
  const head = Math.min(width * 0.2, height * 0.4)
  const bodyT = height * Math.min(0.8, Math.max(0.2, adjPct(ctx.adj, 'adj1', 48000)))
  const rectT = (height - bodyT) / 2
  const rectB = rectT + bodyT
  return shapeSvg(
    ctx,
    polygonPath([
      { x: 0, y: height / 2 },
      { x: head, y: rectT },
      { x: head, y: 0 },
      { x: width - head, y: 0 },
      { x: width - head, y: rectT },
      { x: width, y: height / 2 },
      { x: width - head, y: rectB },
      { x: width - head, y: height },
      { x: head, y: height },
      { x: head, y: rectB }
    ])
  )
}

/** `upDownArrowCallout` — rectangle body with arrows on top AND bottom. */
const renderUpDownArrowCallout: PresetRenderer = ctx => {
  const { width, height } = ctx
  const head = Math.min(height * 0.2, width * 0.4)
  const bodyT = width * Math.min(0.8, Math.max(0.2, adjPct(ctx.adj, 'adj1', 48000)))
  const rectL = (width - bodyT) / 2
  const rectR = rectL + bodyT
  return shapeSvg(
    ctx,
    polygonPath([
      { x: width / 2, y: 0 },
      { x: rectR, y: head },
      { x: width, y: head },
      { x: width, y: height - head },
      { x: rectR, y: height - head },
      { x: width / 2, y: height },
      { x: rectL, y: height - head },
      { x: 0, y: height - head },
      { x: 0, y: head },
      { x: rectL, y: head }
    ])
  )
}

/** `quadArrowCallout` — rectangle body with 4-way arrows. */
const renderQuadArrowCallout: PresetRenderer = ctx => {
  const { width, height } = ctx
  const cx = width / 2
  const cy = height / 2
  const head = Math.min(width, height) * 0.18
  const bodyT = Math.min(width, height) * 0.35
  const boxL = cx - bodyT
  const boxR = cx + bodyT
  const boxT = cy - bodyT
  const boxB = cy + bodyT
  const armT = Math.min(width, height) * 0.14
  return shapeSvg(
    ctx,
    polygonPath([
      { x: cx, y: 0 },
      { x: cx + head, y: head },
      { x: cx + armT, y: head },
      { x: cx + armT, y: boxT },
      { x: boxR, y: boxT },
      { x: boxR, y: cy - armT },
      { x: width - head, y: cy - armT },
      { x: width - head, y: cy - head },
      { x: width, y: cy },
      { x: width - head, y: cy + head },
      { x: width - head, y: cy + armT },
      { x: boxR, y: cy + armT },
      { x: boxR, y: boxB },
      { x: cx + armT, y: boxB },
      { x: cx + armT, y: height - head },
      { x: cx + head, y: height - head },
      { x: cx, y: height },
      { x: cx - head, y: height - head },
      { x: cx - armT, y: height - head },
      { x: cx - armT, y: boxB },
      { x: boxL, y: boxB },
      { x: boxL, y: cy + armT },
      { x: head, y: cy + armT },
      { x: head, y: cy + head },
      { x: 0, y: cy },
      { x: head, y: cy - head },
      { x: head, y: cy - armT },
      { x: boxL, y: cy - armT },
      { x: boxL, y: boxT },
      { x: cx - armT, y: boxT },
      { x: cx - armT, y: head },
      { x: cx - head, y: head }
    ])
  )
}

/** `leftUpArrow` — L-shaped arrow pointing up-left. */
const renderLeftUpArrow: PresetRenderer = ctx => {
  const { width, height } = ctx
  const t = Math.min(width, height) * Math.min(0.45, Math.max(0.05, adjPct(ctx.adj, 'adj1', 25000)))
  const head = Math.min(width, height) * Math.min(0.45, Math.max(0.05, adjPct(ctx.adj, 'adj2', 25000)))
  return shapeSvg(
    ctx,
    polygonPath([
      { x: 0, y: height },
      { x: 0, y: height - t },
      { x: width - t - head, y: height - t },
      { x: width - t - head, y: height - t - head },
      { x: width - t * 1.5, y: height - t - head },
      { x: width - t / 2, y: height - t - head * 1.6 },
      { x: width, y: height - t - head },
      { x: width - t / 2, y: height - t - head * 0.4 },
      { x: width - t, y: height - t },
      { x: width - t, y: height }
    ])
  )
}

/** `leftCircularArrow` — 3/4 circle arrow pointing counter-clockwise (mirror of circularArrow). */
const renderLeftCircularArrow: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const cx = width / 2
  const cy = height / 2
  const rx = width * 0.42
  const ry = height * 0.42
  const thickness = Math.min(rx, ry) * 0.4
  const startA = Math.PI * 0.7
  const endA = Math.PI * -0.8
  const s1 = { x: cx + rx * Math.cos(startA), y: cy + ry * Math.sin(startA) }
  const s2 = { x: cx + (rx - thickness) * Math.cos(startA), y: cy + (ry - thickness) * Math.sin(startA) }
  const e1 = { x: cx + rx * Math.cos(endA), y: cy + ry * Math.sin(endA) }
  const e2 = { x: cx + (rx - thickness) * Math.cos(endA), y: cy + (ry - thickness) * Math.sin(endA) }
  const tipA = endA - 0.25
  const tip = { x: cx + (rx + thickness * 0.6) * Math.cos(tipA), y: cy + (ry + thickness * 0.6) * Math.sin(tipA) }
  const d = [
    `M ${s1.x} ${s1.y}`,
    `A ${rx} ${ry} 0 1 0 ${e1.x} ${e1.y}`,
    `L ${tip.x} ${tip.y}`,
    `L ${e2.x} ${e2.y}`,
    `A ${rx - thickness} ${ry - thickness} 0 1 1 ${s2.x} ${s2.y}`,
    'Z'
  ].join(' ')
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path
          d={d}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
          fillRule="evenodd"
        />
      </g>
    </svg>
  )
}

/** `leftRightCircularArrow` — 3/4 circle arrow with heads on both ends. */
const renderLeftRightCircularArrow: PresetRenderer = ctx => {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
  const cx = width / 2
  const cy = height / 2
  const rx = width * 0.42
  const ry = height * 0.42
  const thickness = Math.min(rx, ry) * 0.32
  const startA = Math.PI * 0.3
  const endA = Math.PI * 1.8
  const headSize = thickness * 0.8
  const s1 = { x: cx + rx * Math.cos(startA), y: cy + ry * Math.sin(startA) }
  const s2 = { x: cx + (rx - thickness) * Math.cos(startA), y: cy + (ry - thickness) * Math.sin(startA) }
  const e1 = { x: cx + rx * Math.cos(endA), y: cy + ry * Math.sin(endA) }
  const e2 = { x: cx + (rx - thickness) * Math.cos(endA), y: cy + (ry - thickness) * Math.sin(endA) }
  const startTip = {
    x: cx + (rx + headSize) * Math.cos(startA - 0.25),
    y: cy + (ry + headSize) * Math.sin(startA - 0.25)
  }
  const endTip = { x: cx + (rx + headSize) * Math.cos(endA + 0.25), y: cy + (ry + headSize) * Math.sin(endA + 0.25) }
  const d = [
    `M ${s1.x} ${s1.y}`,
    `L ${startTip.x} ${startTip.y}`,
    `L ${s2.x} ${s2.y}`,
    `A ${rx - thickness} ${ry - thickness} 0 1 1 ${e2.x} ${e2.y}`,
    `L ${endTip.x} ${endTip.y}`,
    `L ${e1.x} ${e1.y}`,
    `A ${rx} ${ry} 0 1 0 ${s1.x} ${s1.y}`,
    'Z'
  ].join(' ')
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g
        transform={svgTransform(ctx)}
        style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
      >
        <path
          d={d}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
          fillRule="evenodd"
        />
      </g>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Phase 2d: missing callout variants (line-only and accent-border)
// ---------------------------------------------------------------------------

/**
 * `callout1`/`callout2`/`callout3` — leader-line-only callout with no
 * filled rectangle body. Distinct from `lineCalloutRenderer` above which
 * draws a rectangle label plus a leader line (used by `lineCallout1` and
 * `accentCallout1`).
 */
function plainCalloutLineRenderer(segments: number): PresetRenderer {
  return ctx => {
    const { width, height, strokeColor, strokeWidth } = ctx
    const w = Math.max(1, width)
    const h = Math.max(1, height)
    const sw = Math.max(1, strokeWidth)
    // Leader line starts at the body-anchor (top-left by default) and
    // ends at the callout target. Segment count controls intermediate
    // kinks: 1 = straight, 2 = one bend, 3 = two bends.
    const pts: { x: number; y: number }[] = []
    pts.push({ x: w * 0.25, y: h * 0.4 })
    if (segments >= 3) pts.push({ x: w * 0.5, y: h * 0.4 })
    if (segments >= 2) pts.push({ x: w * 0.75, y: h * 0.75 })
    pts.push({ x: w, y: h })
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    return (
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        style={{ overflow: 'visible' }}
      >
        <g transform={svgTransform(ctx)}>
          <path d={d} fill="none" stroke={strokeColor} strokeWidth={sw} />
        </g>
      </svg>
    )
  }
}

const renderCallout1Line = plainCalloutLineRenderer(1)
const renderCallout2Line = plainCalloutLineRenderer(2)
const renderCallout3Line = plainCalloutLineRenderer(3)

/** Helper: accent-border callout — rectangle body + vertical accent on the anchor side + leader line. */
function accentBorderCalloutRenderer(segments: number): PresetRenderer {
  return ctx => {
    const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
    const bodyH = height * 0.55
    const accentW = width * 0.025
    const sw = Math.max(1, strokeWidth)
    // Leader line kinks
    const lead: { x: number; y: number }[] = []
    lead.push({ x: 0, y: bodyH })
    if (segments >= 3) lead.push({ x: -width * 0.1, y: bodyH })
    if (segments >= 2) lead.push({ x: -width * 0.2, y: height * 0.9 })
    lead.push({ x: -width * 0.25, y: height })
    const leadD = lead.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    return (
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ overflow: 'visible' }}
      >
        <g
          transform={svgTransform(ctx)}
          style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
        >
          <rect
            x={0}
            y={0}
            width={width}
            height={bodyH}
            fill={fillStyle}
            stroke={strokeWidth > 0 ? strokeColor : 'none'}
            strokeWidth={strokeWidth}
          />
          <rect x={0} y={0} width={accentW} height={bodyH} fill={strokeColor} />
          <path d={leadD} fill="none" stroke={strokeColor} strokeWidth={sw} />
        </g>
      </svg>
    )
  }
}

const renderAccentBorderCallout1 = accentBorderCalloutRenderer(1)
const renderAccentBorderCallout2 = accentBorderCalloutRenderer(2)
const renderAccentBorderCallout3 = accentBorderCalloutRenderer(3)

// ---------------------------------------------------------------------------
// Phase 2e: action buttons (12 variants on a shared beveled square base)
// ---------------------------------------------------------------------------

/** Shared helper: beveled-square button background. */
function actionButtonBackground(ctx: PresetRenderContext): string {
  const { width, height } = ctx
  const bev = Math.min(width, height) * 0.08
  return [
    `M ${bev} ${bev}`,
    `L ${width - bev} ${bev}`,
    `L ${width - bev} ${height - bev}`,
    `L ${bev} ${height - bev}`,
    'Z'
  ].join(' ')
}

/** Factory: render a bevelled square button with an overlaid glyph path. */
function actionButtonRenderer(glyph: (w: number, h: number) => string | null): PresetRenderer {
  return ctx => {
    const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = ctx
    const bev = Math.min(width, height) * 0.08
    // 3D-ish bevel: outer ring + inner face. The outer path is the full
    // rectangle; the inner path is the smaller beveled square. The four
    // trapezoids between them are the bevels.
    const outer = `M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z`
    const inner = actionButtonBackground(ctx)
    const bevels: { d: string; opacity: number }[] = [
      { d: `M 0 0 L ${width} 0 L ${width - bev} ${bev} L ${bev} ${bev} Z`, opacity: 1.15 },
      {
        d: `M ${width} 0 L ${width} ${height} L ${width - bev} ${height - bev} L ${width - bev} ${bev} Z`,
        opacity: 0.85
      },
      {
        d: `M 0 ${height} L ${width} ${height} L ${width - bev} ${height - bev} L ${bev} ${height - bev} Z`,
        opacity: 0.7
      },
      { d: `M 0 0 L 0 ${height} L ${bev} ${height - bev} L ${bev} ${bev} Z`, opacity: 0.95 }
    ]
    const glyphD = glyph(width, height)
    return (
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ overflow: 'visible' }}
      >
        <g
          transform={svgTransform(ctx)}
          style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}
        >
          <path d={outer} fill={fillStyle} opacity={0.9} />
          {bevels.map(b => (
            <path key={b.d} d={b.d} fill={fillStyle} opacity={b.opacity * 0.9} />
          ))}
          <path d={inner} fill={fillStyle} stroke={strokeWidth > 0 ? strokeColor : 'none'} strokeWidth={strokeWidth} />
          {glyphD ? <path d={glyphD} fill={strokeColor} stroke="none" /> : null}
        </g>
      </svg>
    )
  }
}

const renderActionButtonBlank = actionButtonRenderer(() => null)

const renderActionButtonHome = actionButtonRenderer((w, h) => {
  const cx = w / 2
  const cy = h / 2
  const s = Math.min(w, h) * 0.24
  return `M ${cx - s} ${cy} L ${cx} ${cy - s} L ${cx + s} ${cy} L ${cx + s * 0.75} ${cy} L ${cx + s * 0.75} ${cy + s * 0.8} L ${cx - s * 0.75} ${cy + s * 0.8} L ${cx - s * 0.75} ${cy} Z`
})

const renderActionButtonHelp = actionButtonRenderer((w, h) => {
  // Question mark glyph — approximated as an outlined shape via text path.
  // Simpler: draw a circle for the dot + curve for the hook.
  const cx = w / 2
  const cy = h / 2
  const r = Math.min(w, h) * 0.05
  return `M ${cx} ${cy + r * 2} m ${-r} 0 a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0 Z`
})

const renderActionButtonInformation = actionButtonRenderer((w, h) => {
  const cx = w / 2
  const cy = h / 2
  const r = Math.min(w, h) * 0.2
  return `M ${cx} ${cy - r} m ${-r / 6} 0 a ${r / 6} ${r / 6} 0 1 0 ${r / 3} 0 a ${r / 6} ${r / 6} 0 1 0 ${-r / 3} 0 Z M ${cx - r / 3} ${cy - r * 0.3} L ${cx + r / 3} ${cy - r * 0.3} L ${cx + r / 3} ${cy + r} L ${cx - r / 3} ${cy + r} Z`
})

const renderActionButtonBackPrevious = actionButtonRenderer((w, h) => {
  const cx = w / 2
  const cy = h / 2
  const s = Math.min(w, h) * 0.22
  return `M ${cx - s} ${cy} L ${cx + s * 0.5} ${cy - s} L ${cx + s * 0.5} ${cy + s} Z`
})

const renderActionButtonForwardNext = actionButtonRenderer((w, h) => {
  const cx = w / 2
  const cy = h / 2
  const s = Math.min(w, h) * 0.22
  return `M ${cx + s} ${cy} L ${cx - s * 0.5} ${cy - s} L ${cx - s * 0.5} ${cy + s} Z`
})

const renderActionButtonBeginning = actionButtonRenderer((w, h) => {
  const cx = w / 2
  const cy = h / 2
  const s = Math.min(w, h) * 0.22
  return `M ${cx + s * 0.6} ${cy - s} L ${cx - s * 0.3} ${cy} L ${cx + s * 0.6} ${cy + s} Z M ${cx - s * 0.5} ${cy - s} L ${cx - s * 0.8} ${cy - s} L ${cx - s * 0.8} ${cy + s} L ${cx - s * 0.5} ${cy + s} Z`
})

const renderActionButtonEnd = actionButtonRenderer((w, h) => {
  const cx = w / 2
  const cy = h / 2
  const s = Math.min(w, h) * 0.22
  return `M ${cx - s * 0.6} ${cy - s} L ${cx + s * 0.3} ${cy} L ${cx - s * 0.6} ${cy + s} Z M ${cx + s * 0.5} ${cy - s} L ${cx + s * 0.8} ${cy - s} L ${cx + s * 0.8} ${cy + s} L ${cx + s * 0.5} ${cy + s} Z`
})

const renderActionButtonReturn = actionButtonRenderer((w, h) => {
  const cx = w / 2
  const cy = h / 2
  const s = Math.min(w, h) * 0.22
  // Curved arrow returning
  return `M ${cx - s} ${cy + s * 0.2} L ${cx - s / 2} ${cy - s * 0.5} L ${cx} ${cy + s * 0.2} L ${cx - s / 4} ${cy + s * 0.2} Q ${cx + s} ${cy + s * 0.2} ${cx + s} ${cy + s} L ${cx + s * 0.5} ${cy + s} Q ${cx + s * 0.5} ${cy + s * 0.4} ${cx - s / 4} ${cy + s * 0.4} L ${cx - s} ${cy + s * 0.4} Z`
})

const renderActionButtonDocument = actionButtonRenderer((w, h) => {
  const cx = w / 2
  const cy = h / 2
  const sw = Math.min(w, h) * 0.2
  const sh = Math.min(w, h) * 0.26
  const corner = sw * 0.3
  return `M ${cx - sw} ${cy - sh} L ${cx + sw - corner} ${cy - sh} L ${cx + sw} ${cy - sh + corner} L ${cx + sw} ${cy + sh} L ${cx - sw} ${cy + sh} Z M ${cx + sw - corner} ${cy - sh} L ${cx + sw - corner} ${cy - sh + corner} L ${cx + sw} ${cy - sh + corner}`
})

const renderActionButtonSound = actionButtonRenderer((w, h) => {
  const cx = w / 2
  const cy = h / 2
  const s = Math.min(w, h) * 0.22
  // Speaker glyph
  return `M ${cx - s} ${cy - s * 0.3} L ${cx - s * 0.3} ${cy - s * 0.3} L ${cx + s * 0.3} ${cy - s} L ${cx + s * 0.3} ${cy + s} L ${cx - s * 0.3} ${cy + s * 0.3} L ${cx - s} ${cy + s * 0.3} Z`
})

const renderActionButtonMovie = actionButtonRenderer((w, h) => {
  const cx = w / 2
  const cy = h / 2
  const s = Math.min(w, h) * 0.22
  return `M ${cx - s} ${cy - s * 0.6} L ${cx + s * 0.3} ${cy - s * 0.6} L ${cx + s * 0.3} ${cy - s * 0.2} L ${cx + s} ${cy - s * 0.8} L ${cx + s} ${cy + s * 0.8} L ${cx + s * 0.3} ${cy + s * 0.2} L ${cx + s * 0.3} ${cy + s * 0.6} L ${cx - s} ${cy + s * 0.6} Z`
})

// ---------------------------------------------------------------------------
// Phase 2f: connector + line presets (stroke-only; body rendered via pipeline)
// ---------------------------------------------------------------------------

/** Straight connector / line — diagonal from top-left to bottom-right. */
const renderStraightConnector: PresetRenderer = ctx => {
  const { width, height, strokeColor, strokeWidth } = ctx
  const sw = Math.max(1, strokeWidth)
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g transform={svgTransform(ctx)}>
        <line x1={0} y1={0} x2={width} y2={height} stroke={strokeColor} strokeWidth={sw} />
      </g>
    </svg>
  )
}

/** Line inverted (bottom-left → top-right). */
const renderLineInv: PresetRenderer = ctx => {
  const { width, height, strokeColor, strokeWidth } = ctx
  const sw = Math.max(1, strokeWidth)
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <g transform={svgTransform(ctx)}>
        <line x1={0} y1={height} x2={width} y2={0} stroke={strokeColor} strokeWidth={sw} />
      </g>
    </svg>
  )
}

/** Factory: bent connector with N segments — right-angled Manhattan-style. */
function bentConnectorRenderer(segments: 2 | 3 | 4 | 5): PresetRenderer {
  return ctx => {
    const { width, height, strokeColor, strokeWidth } = ctx
    const sw = Math.max(1, strokeWidth)
    const pts: { x: number; y: number }[] = []
    pts.push({ x: 0, y: 0 })
    if (segments === 2) {
      pts.push({ x: width, y: 0 })
      pts.push({ x: width, y: height })
    } else if (segments === 3) {
      pts.push({ x: width / 2, y: 0 })
      pts.push({ x: width / 2, y: height })
      pts.push({ x: width, y: height })
    } else if (segments === 4) {
      pts.push({ x: width * 0.33, y: 0 })
      pts.push({ x: width * 0.33, y: height / 2 })
      pts.push({ x: width * 0.66, y: height / 2 })
      pts.push({ x: width * 0.66, y: height })
      pts.push({ x: width, y: height })
    } else {
      pts.push({ x: width * 0.25, y: 0 })
      pts.push({ x: width * 0.25, y: height / 3 })
      pts.push({ x: width * 0.5, y: height / 3 })
      pts.push({ x: width * 0.5, y: (2 * height) / 3 })
      pts.push({ x: width * 0.75, y: (2 * height) / 3 })
      pts.push({ x: width * 0.75, y: height })
      pts.push({ x: width, y: height })
    }
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    return (
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ overflow: 'visible' }}
      >
        <g transform={svgTransform(ctx)}>
          <path d={d} fill="none" stroke={strokeColor} strokeWidth={sw} />
        </g>
      </svg>
    )
  }
}

const renderBentConnector2 = bentConnectorRenderer(2)
const renderBentConnector3 = bentConnectorRenderer(3)
const renderBentConnector4 = bentConnectorRenderer(4)
const renderBentConnector5 = bentConnectorRenderer(5)

/** Factory: curved connector with N control points. */
function curvedConnectorRenderer(segments: 2 | 3 | 4 | 5): PresetRenderer {
  return ctx => {
    const { width, height, strokeColor, strokeWidth } = ctx
    const sw = Math.max(1, strokeWidth)
    let d = ''
    if (segments === 2) {
      d = `M 0 0 Q ${width * 0.7} ${height * 0.3} ${width} ${height}`
    } else if (segments === 3) {
      d = `M 0 0 C ${width * 0.3} 0 ${width * 0.3} ${height} ${width * 0.5} ${height * 0.5} S ${width} ${height} ${width} ${height}`
    } else if (segments === 4) {
      d = `M 0 0 C ${width * 0.25} ${height * 0.2} ${width * 0.25} ${height * 0.5} ${width * 0.5} ${height * 0.5} S ${width * 0.75} ${height * 0.8} ${width} ${height}`
    } else {
      d = `M 0 0 Q ${width * 0.2} ${height * 0.1} ${width * 0.4} ${height * 0.4} T ${width * 0.6} ${height * 0.6} T ${width} ${height}`
    }
    return (
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ overflow: 'visible' }}
      >
        <g transform={svgTransform(ctx)}>
          <path d={d} fill="none" stroke={strokeColor} strokeWidth={sw} />
        </g>
      </svg>
    )
  }
}

const renderCurvedConnector2 = curvedConnectorRenderer(2)
const renderCurvedConnector3 = curvedConnectorRenderer(3)
const renderCurvedConnector4 = curvedConnectorRenderer(4)
const renderCurvedConnector5 = curvedConnectorRenderer(5)

/** Map of OOXML preset id → renderer. Grow on demand as decks use more. */
const PRESET_RENDERERS: Record<string, PresetRenderer> = {
  can: renderCan,
  chevron: renderChevron,
  homePlate: renderHomePlate,
  notchedRightArrow: renderNotchedRightArrow,
  rightArrow: renderRightArrow,
  leftArrow: renderLeftArrow,
  upArrow: renderUpArrow,
  downArrow: renderDownArrow,
  parallelogram: renderParallelogram,
  trapezoid: renderTrapezoid,
  octagon: renderOctagon,
  pentagon: renderPentagon,
  plus: renderPlus,
  cross: renderCross,
  bevel: renderBevel,
  roundRect: renderRoundRect,
  round1Rect: renderRound1Rect,
  round2SameRect: renderRound2SameRect,
  roundRect6: renderRoundRect,
  snip1Rect: renderSnip1Rect,
  snip2SameRect: renderSnip2SameRect,
  snip2DiagRect: renderSnip2DiagRect,
  snipRoundRect: renderSnipRoundRect,
  round2DiagRect: renderRound2DiagRect,
  flowChartProcess: renderFlowChartProcess,
  flowChartTerminator: renderFlowChartTerminator,
  flowChartDecision: renderFlowChartDecision,
  flowChartAlternateProcess: renderFlowChartAltProcess,
  wedgeRectCallout: renderCallout,
  wedgeRoundRectCallout: renderCallout,
  wedgeEllipseCallout: renderCallout,
  borderCallout1: renderCallout,
  borderCallout2: renderCallout,
  borderCallout3: renderCallout,
  // Block arrows
  bentArrow: renderBentArrow,
  bentUpArrow: renderBentUpArrow,
  uturnArrow: renderUturnArrow,
  leftRightArrow: renderLeftRightArrow,
  upDownArrow: renderUpDownArrow,
  quadArrow: renderQuadArrow,
  leftRightUpArrow: renderLeftRightUpArrow,
  circularArrow: renderCircularArrow,
  curvedRightArrow: renderCurvedRightArrow,
  curvedLeftArrow: renderCurvedLeftArrow,
  curvedUpArrow: renderCurvedUpArrow,
  curvedDownArrow: renderCurvedDownArrow,
  stripedRightArrow: renderStripedRightArrow,
  swooshArrow: renderSwooshArrow,
  leftArrowCallout: renderLeftArrowCallout,
  rightArrowCallout: renderRightArrowCallout,
  upArrowCallout: renderUpArrowCallout,
  downArrowCallout: renderDownArrowCallout,
  // Equation
  mathPlus: renderMathPlus,
  mathMinus: renderMathMinus,
  mathMultiply: renderMathMultiply,
  mathDivide: renderMathDivide,
  mathEqual: renderMathEqual,
  mathNotEqual: renderMathNotEqual,
  // Flowchart
  flowChartInputOutput: renderFlowChartInputOutput,
  flowChartDocument: renderFlowChartDocument,
  flowChartMultidocument: renderFlowChartMultidocument,
  flowChartConnector: renderFlowChartConnector,
  flowChartPunchedCard: renderFlowChartPunchedCard,
  flowChartPunchedTape: renderFlowChartPunchedTape,
  flowChartPreparation: renderFlowChartPreparation,
  flowChartManualOperation: renderFlowChartManualOperation,
  flowChartManualInput: renderFlowChartManualInput,
  flowChartInternalStorage: renderFlowChartInternalStorage,
  flowChartDelay: renderFlowChartDelay,
  flowChartDisplay: renderFlowChartDisplay,
  flowChartPredefinedProcess: renderFlowChartPredefinedProcess,
  flowChartMagneticDisk: renderFlowChartMagneticDisk,
  flowChartOffpageConnector: renderFlowChartOffpageConnector,
  flowChartStoredData: renderFlowChartStoredData,
  flowChartSummingJunction: renderFlowChartSummingJunction,
  flowChartOr: renderFlowChartOr,
  // Stars and banners
  star4: renderStar4,
  star6: renderStar6,
  star7: renderStar7,
  star8: renderStar8,
  star10: renderStar10,
  star12: renderStar12,
  star16: renderStar16,
  star24: renderStar24,
  star32: renderStar32,
  ribbon: renderRibbon,
  ribbon2: renderRibbon2,
  verticalScroll: renderVerticalScroll,
  horizontalScroll: renderHorizontalScroll,
  wave: renderWave,
  doubleWave: renderDoubleWave,
  // Basic shapes
  heart: renderHeart,
  sun: renderSun,
  moon: renderMoon,
  cloud: renderCloud,
  lightningBolt: renderLightningBolt,
  smileyFace: renderSmileyFace,
  teardrop: renderTeardrop,
  pie: renderPie,
  chord: renderChord,
  donut: renderDonut,
  arc: renderArc,
  noSmoking: renderNoSmoking,
  frame: renderFrame,
  halfFrame: renderHalfFrame,
  corner: renderCorner,
  diagStripe: renderDiagStripe,
  leftBracket: renderLeftBracket,
  rightBracket: renderRightBracket,
  leftBrace: renderLeftBrace,
  rightBrace: renderRightBrace,
  heptagon: renderHeptagon,
  decagon: renderDecagon,
  dodecagon: renderDodecagon,
  // Callouts
  cloudCallout: renderCloudCallout,
  lineCallout1: renderLineCallout1,
  lineCallout2: renderLineCallout2,
  lineCallout3: renderLineCallout3,
  accentCallout1: renderAccentCallout1,
  accentCallout2: renderAccentCallout2,
  accentCallout3: renderAccentCallout3,
  // Phase 2a: basic shapes
  rect: renderRect,
  rectangle: renderRect,
  ellipse: renderEllipse,
  oval: renderEllipse,
  triangle: renderTriangle,
  rtTriangle: renderRtTriangle,
  diamond: renderDiamond,
  hexagon: renderHexagon,
  star5: renderStar5,
  blockArc: renderBlockArc,
  cube: renderCube,
  plaque: renderPlaque,
  pieWedge: renderPieWedge,
  gear6: renderGear6,
  gear9: renderGear9,
  cornerTabs: renderCornerTabs,
  squareTabs: renderSquareTabs,
  plaqueTabs: renderPlaqueTabs,
  foldedCorner: renderFoldedCorner,
  irregularSeal1: renderIrregularSeal1,
  irregularSeal2: renderIrregularSeal2,
  ellipseRibbon: renderEllipseRibbon,
  ellipseRibbon2: renderEllipseRibbon2,
  nonIsoscelesTrapezoid: renderNonIsoscelesTrapezoid,
  // Phase 2b: flowchart
  flowChartCollate: renderFlowChartCollate,
  flowChartSort: renderFlowChartSort,
  flowChartExtract: renderFlowChartExtract,
  flowChartMerge: renderFlowChartMerge,
  flowChartMagneticTape: renderFlowChartMagneticTape,
  flowChartOnlineStorage: renderFlowChartOnlineStorage,
  // Phase 2c: arrows
  leftRightArrowCallout: renderLeftRightArrowCallout,
  upDownArrowCallout: renderUpDownArrowCallout,
  quadArrowCallout: renderQuadArrowCallout,
  leftUpArrow: renderLeftUpArrow,
  leftCircularArrow: renderLeftCircularArrow,
  leftRightCircularArrow: renderLeftRightCircularArrow,
  // Phase 2d: callouts
  accentBorderCallout1: renderAccentBorderCallout1,
  accentBorderCallout2: renderAccentBorderCallout2,
  accentBorderCallout3: renderAccentBorderCallout3,
  callout1: renderCallout1Line,
  callout2: renderCallout2Line,
  callout3: renderCallout3Line,
  // Phase 2e: action buttons
  actionButtonBlank: renderActionButtonBlank,
  actionButtonHome: renderActionButtonHome,
  actionButtonHelp: renderActionButtonHelp,
  actionButtonInformation: renderActionButtonInformation,
  actionButtonBackPrevious: renderActionButtonBackPrevious,
  actionButtonForwardNext: renderActionButtonForwardNext,
  actionButtonBeginning: renderActionButtonBeginning,
  actionButtonEnd: renderActionButtonEnd,
  actionButtonReturn: renderActionButtonReturn,
  actionButtonDocument: renderActionButtonDocument,
  actionButtonSound: renderActionButtonSound,
  actionButtonMovie: renderActionButtonMovie,
  // Phase 2f: connectors and lines
  line: renderStraightConnector,
  lineInv: renderLineInv,
  straightConnector1: renderStraightConnector,
  bentConnector2: renderBentConnector2,
  bentConnector3: renderBentConnector3,
  bentConnector4: renderBentConnector4,
  bentConnector5: renderBentConnector5,
  curvedConnector2: renderCurvedConnector2,
  curvedConnector3: renderCurvedConnector3,
  curvedConnector4: renderCurvedConnector4,
  curvedConnector5: renderCurvedConnector5,
  // Audit round: remaining ECMA-376 ST_ShapeType presets
  bracketPair: renderBracketPair,
  bracePair: renderBracePair,
  leftRightRibbon: renderLeftRightRibbon,
  flowChartOfflineStorage: renderFlowChartOfflineStorage,
  flowChartMagneticDrum: renderFlowChartMagneticDrum,
  funnel: renderFunnel,
  chartX: renderChartX,
  chartPlus: renderChartPlus,
  chartStar: renderChartStar
}

export interface TryRenderOfficePresetInput {
  element: ShapeElement
  fillStyle: string
  strokeColor: string
  strokeWidth: number
  shadow: boolean
  width: number
  height: number
}

/**
 * Try to render the shape using its Office preset metadata. Returns `null`
 * when the shape has no importMeta or the preset is not implemented yet, so
 * callers can keep their fallback pipeline.
 */
export function tryRenderOfficePresetShape(input: TryRenderOfficePresetInput): React.ReactNode | null {
  const meta = getShapeGeometry(input.element)
  if (!meta?.prst) return null

  // Try direct match, then graceful approximations for related presets.
  const renderer = PRESET_RENDERERS[meta.prst]
  if (!renderer) {
    // Any `cust*` / `bent*` / `curvedConnector*` etc. we do not specialise yet;
    // returning null lets the caller fall back to the generic shapeType path.
    // Custom path geometry is also handled here (supported below).
    if (meta.custGeomPath) {
      return renderCustomPath(input, meta.custGeomPath)
    }
    return null
  }

  const ctx: PresetRenderContext = {
    width: Math.max(1, input.width),
    height: Math.max(1, input.height),
    fillStyle: input.fillStyle,
    strokeColor: input.strokeColor,
    strokeWidth: input.strokeWidth,
    shadow: input.shadow,
    adj: meta.adjustments ?? {},
    flipH: !!meta.flipH,
    flipV: !!meta.flipV,
    ...(input.element.lineCap ? { lineCap: input.element.lineCap } : {}),
    ...(input.element.lineJoin ? { lineJoin: input.element.lineJoin } : {}),
    ...(input.element.lineCompound ? { lineCompound: input.element.lineCompound } : {})
  }
  return renderer(ctx)
}

function renderCustomPath(input: TryRenderOfficePresetInput, normalisedPath: string): React.ReactNode {
  const { width, height, fillStyle, strokeColor, strokeWidth, shadow } = input
  // Custom paths are stored in the unit box [0..1, 0..1]; we scale by applying
  // an SVG transform so the path language stays readable.
  return (
    <svg width="100%" height="100%" viewBox={`0 0 1 1`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <g style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : undefined }}>
        <path
          d={normalisedPath}
          fill={fillStyle}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth / Math.max(width, height)}
        />
      </g>
    </svg>
  )
}

/** Public list of supported presets for parity/reporting. */
export const SUPPORTED_OFFICE_PRESETS: string[] = Object.keys(PRESET_RENDERERS).sort()

/** True when the given preset has a dedicated renderer. */
export function isOfficePresetSupported(prst: string | undefined | null): boolean {
  if (!prst) return false
  return Object.prototype.hasOwnProperty.call(PRESET_RENDERERS, prst)
}
