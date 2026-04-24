/**
 * Shape path geometry model.
 *
 * Powers the "Edit Points" experience: converts Office preset shapes into a
 * node-based, editable path, and converts back to an SVG `d` string suitable
 * for `<a:custGeom>` round-trips.
 *
 * All coordinates are normalised to the unit box `[0..1, 0..1]` to match the
 * existing `geometry.custGeomPath` contract. The editor scales by the shape's
 * current bounding box when it draws handles; exporters pass the string
 * through as-is.
 */

export interface Point {
  x: number
  y: number
}

/**
 * One anchor in a path. An anchor owns an optional pair of bezier control
 * handles: `in` is the handle approaching this anchor from the previous node;
 * `out` is the handle leaving this anchor toward the next node.
 *
 * When both handles are absent the incoming/outgoing segment is a straight
 * line. When at least one is present the segment becomes cubic; a missing
 * counterpart is promoted to the anchor position so rendering stays stable.
 */
export interface PathNode {
  kind: 'anchor'
  point: Point
  in?: Point
  out?: Point
  smooth: boolean
}

export interface PathSubpath {
  nodes: PathNode[]
  closed: boolean
}

export interface PathData {
  subpaths: PathSubpath[]
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

/**
 * Parse an SVG path `d` string into the editor's node model. Supports the
 * subset of the path language we emit and import from `<a:custGeom>`:
 * `M/m`, `L/l`, `H/h`, `V/v`, `C/c`, `Q/q`, `Z/z`. Other commands are
 * approximated as `L`.
 */
export function customPathToNodes(d: string): PathData {
  if (!d) return { subpaths: [] }
  const tokens = d.match(/([MmLlHhVvCcQqZzAaSsTt])|[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?/g) ?? []
  const subpaths: PathSubpath[] = []
  let current: PathSubpath | null = null
  let cursor: Point = { x: 0, y: 0 }
  let startOfSub: Point = { x: 0, y: 0 }
  let i = 0
  let lastCmd = ''

  const nextNumber = (): number => {
    while (i < tokens.length && /[A-Za-z]/.test(tokens[i])) i++
    const n = parseFloat(tokens[i++])
    return Number.isFinite(n) ? n : 0
  }
  const pushNode = (pt: Point, opts?: { in?: Point; out?: Point }): PathNode => {
    const node: PathNode = {
      kind: 'anchor',
      point: { x: pt.x, y: pt.y },
      in: opts?.in,
      out: opts?.out,
      smooth: false
    }
    if (!current) {
      current = { nodes: [], closed: false }
      subpaths.push(current)
    }
    current.nodes.push(node)
    return node
  }

  while (i < tokens.length) {
    const token = tokens[i]
    if (/[A-Za-z]/.test(token)) {
      lastCmd = token
      i++
    }
    const rel = lastCmd === lastCmd.toLowerCase()
    const cmd = lastCmd.toUpperCase()
    switch (cmd) {
      case 'M': {
        const x = nextNumber()
        const y = nextNumber()
        const p = rel ? { x: cursor.x + x, y: cursor.y + y } : { x, y }
        current = { nodes: [], closed: false }
        subpaths.push(current)
        pushNode(p)
        startOfSub = { ...p }
        cursor = { ...p }
        // Subsequent pairs after M are implicit L
        lastCmd = rel ? 'l' : 'L'
        break
      }
      case 'L': {
        const x = nextNumber()
        const y = nextNumber()
        const p = rel ? { x: cursor.x + x, y: cursor.y + y } : { x, y }
        pushNode(p)
        cursor = { ...p }
        break
      }
      case 'H': {
        const x = nextNumber()
        const p = rel ? { x: cursor.x + x, y: cursor.y } : { x, y: cursor.y }
        pushNode(p)
        cursor = { ...p }
        break
      }
      case 'V': {
        const y = nextNumber()
        const p = rel ? { x: cursor.x, y: cursor.y + y } : { x: cursor.x, y }
        pushNode(p)
        cursor = { ...p }
        break
      }
      case 'C': {
        const c1x = nextNumber()
        const c1y = nextNumber()
        const c2x = nextNumber()
        const c2y = nextNumber()
        const x = nextNumber()
        const y = nextNumber()
        const c1 = rel ? { x: cursor.x + c1x, y: cursor.y + c1y } : { x: c1x, y: c1y }
        const c2 = rel ? { x: cursor.x + c2x, y: cursor.y + c2y } : { x: c2x, y: c2y }
        const p = rel ? { x: cursor.x + x, y: cursor.y + y } : { x, y }
        const last = current && current.nodes.length > 0 ? current.nodes[current.nodes.length - 1] : null
        if (last) last.out = c1
        // Collapse a closing cubic that targets the subpath start into the
        // existing start anchor — this keeps `customPathToNodes ∘
        // nodesToCustomPath` a true round-trip for closed bezier shapes
        // (ellipse, heart, etc.) instead of duplicating the first anchor.
        const firstNode = current && current.nodes.length > 0 ? current.nodes[0] : null
        const EPS = 1e-3
        const isClosingCubic =
          firstNode && Math.abs(p.x - firstNode.point.x) < EPS && Math.abs(p.y - firstNode.point.y) < EPS
        if (isClosingCubic) {
          firstNode.in = c2
          cursor = { ...firstNode.point }
        } else {
          pushNode(p, { in: c2 })
          cursor = { ...p }
        }
        break
      }
      case 'Q': {
        const cx = nextNumber()
        const cy = nextNumber()
        const x = nextNumber()
        const y = nextNumber()
        const cp = rel ? { x: cursor.x + cx, y: cursor.y + cy } : { x: cx, y: cy }
        const p = rel ? { x: cursor.x + x, y: cursor.y + y } : { x, y }
        const last = current && current.nodes.length > 0 ? current.nodes[current.nodes.length - 1] : null
        // Promote quadratic to cubic so we only store one canonical curve type.
        if (last) {
          last.out = {
            x: last.point.x + (2 / 3) * (cp.x - last.point.x),
            y: last.point.y + (2 / 3) * (cp.y - last.point.y)
          }
        }
        const inHandle = {
          x: p.x + (2 / 3) * (cp.x - p.x),
          y: p.y + (2 / 3) * (cp.y - p.y)
        }
        pushNode(p, { in: inHandle })
        cursor = { ...p }
        break
      }
      case 'Z': {
        if (current) current.closed = true
        cursor = { ...startOfSub }
        break
      }
      default: {
        // Unsupported command — advance one number to avoid infinite loop.
        if (!/[A-Za-z]/.test(token)) i++
      }
    }
  }
  return { subpaths }
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '0'
  // Keep precision compact enough for round-trip but accurate for normalised coords.
  const r = Math.round(n * 1e5) / 1e5
  return `${r}`
}

/**
 * Serialise node data back into an SVG `d` path. Mirrors
 * {@link customPathToNodes}; a value round-tripped through both functions
 * produces a geometrically identical path.
 */
export function nodesToCustomPath(data: PathData): string {
  const parts: string[] = []
  for (const sub of data.subpaths) {
    if (sub.nodes.length === 0) continue
    const first = sub.nodes[0]
    parts.push(`M ${fmt(first.point.x)} ${fmt(first.point.y)}`)
    for (let i = 1; i < sub.nodes.length; i++) {
      const prev = sub.nodes[i - 1]
      const curr = sub.nodes[i]
      const hasOut = !!prev.out
      const hasIn = !!curr.in
      if (hasOut || hasIn) {
        const c1 = prev.out ?? prev.point
        const c2 = curr.in ?? curr.point
        parts.push(`C ${fmt(c1.x)} ${fmt(c1.y)} ${fmt(c2.x)} ${fmt(c2.y)} ${fmt(curr.point.x)} ${fmt(curr.point.y)}`)
      } else {
        parts.push(`L ${fmt(curr.point.x)} ${fmt(curr.point.y)}`)
      }
    }
    if (sub.closed) {
      const first0 = first
      const last = sub.nodes[sub.nodes.length - 1]
      // Emit the closing curve explicitly when either end has a handle,
      // otherwise rely on SVG's Z behaviour.
      if (last.out || first0.in) {
        const c1 = last.out ?? last.point
        const c2 = first0.in ?? first0.point
        parts.push(
          `C ${fmt(c1.x)} ${fmt(c1.y)} ${fmt(c2.x)} ${fmt(c2.y)} ${fmt(first0.point.x)} ${fmt(first0.point.y)}`
        )
      }
      parts.push('Z')
    }
  }
  return parts.join(' ')
}

// ---------------------------------------------------------------------------
// Preset → custom path
// ---------------------------------------------------------------------------

type Adj = Record<string, number>

function adjFraction(adj: Adj | undefined, key: string, defaultPerMille: number, min = 0, max = 1): number {
  const raw = adj?.[key]
  const v = typeof raw === 'number' && Number.isFinite(raw) ? raw / 100000 : defaultPerMille / 100000
  return Math.min(max, Math.max(min, v))
}

function rectangleNodes(): PathSubpath {
  return {
    closed: true,
    nodes: [
      { kind: 'anchor', point: { x: 0, y: 0 }, smooth: false },
      { kind: 'anchor', point: { x: 1, y: 0 }, smooth: false },
      { kind: 'anchor', point: { x: 1, y: 1 }, smooth: false },
      { kind: 'anchor', point: { x: 0, y: 1 }, smooth: false }
    ]
  }
}

function polygonNodes(points: Point[]): PathSubpath {
  return {
    closed: true,
    nodes: points.map(p => ({ kind: 'anchor', point: p, smooth: false }))
  }
}

/**
 * Build an ellipse as four cubic-bezier anchors. Coordinates are normalised
 * so the ellipse fits the unit box.
 */
function ellipseNodes(): PathSubpath {
  const k = 0.5522847498 / 2
  const cx = 0.5
  const cy = 0.5
  const r = 0.5
  const nodes: PathNode[] = [
    {
      kind: 'anchor',
      point: { x: cx, y: cy - r },
      in: { x: cx - k, y: cy - r },
      out: { x: cx + k, y: cy - r },
      smooth: true
    },
    {
      kind: 'anchor',
      point: { x: cx + r, y: cy },
      in: { x: cx + r, y: cy - k },
      out: { x: cx + r, y: cy + k },
      smooth: true
    },
    {
      kind: 'anchor',
      point: { x: cx, y: cy + r },
      in: { x: cx + k, y: cy + r },
      out: { x: cx - k, y: cy + r },
      smooth: true
    },
    {
      kind: 'anchor',
      point: { x: cx - r, y: cy },
      in: { x: cx - r, y: cy + k },
      out: { x: cx - r, y: cy - k },
      smooth: true
    }
  ]
  return { nodes, closed: true }
}

function starSubpath(points: number, inner = 0.382): PathSubpath {
  const cx = 0.5
  const cy = 0.5
  const R = 0.5
  const r = R * inner
  const pts: Point[] = []
  const step = Math.PI / points
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? R : r
    const ang = -Math.PI / 2 + i * step
    pts.push({ x: cx + Math.cos(ang) * rad, y: cy + Math.sin(ang) * rad })
  }
  return polygonNodes(pts)
}

/**
 * Stadium (pill) shape as 8 bezier anchors — straight sides joined by
 * two semicircular ends. Used for `flowChartTerminator` and any other
 * preset rendered as a horizontal capsule.
 */
function stadiumNodes(): PathSubpath {
  // Semicircle radius = 0.5 of the short stock. In the unit box the vertical
  // radius is 0.5 and the horizontal radius is capped to 0.5 to keep the
  // rounds semicircular when the shape is very short. Scaling happens in
  // screen space so the shape looks right at any aspect ratio.
  const k = 0.2761423749 // bezier-circle constant scaled for radius 0.5
  const nodes: PathNode[] = [
    {
      kind: 'anchor',
      point: { x: 0.25, y: 0 },
      out: { x: 0.25 + 0.125, y: 0 },
      smooth: false
    },
    {
      kind: 'anchor',
      point: { x: 0.75, y: 0 },
      in: { x: 0.75 - 0.125, y: 0 },
      out: { x: 0.75 + k, y: 0 },
      smooth: true
    },
    {
      kind: 'anchor',
      point: { x: 1, y: 0.5 },
      in: { x: 1, y: 0.5 - k },
      out: { x: 1, y: 0.5 + k },
      smooth: true
    },
    {
      kind: 'anchor',
      point: { x: 0.75, y: 1 },
      in: { x: 0.75 + k, y: 1 },
      out: { x: 0.75 - 0.125, y: 1 },
      smooth: true
    },
    {
      kind: 'anchor',
      point: { x: 0.25, y: 1 },
      in: { x: 0.25 + 0.125, y: 1 },
      out: { x: 0.25 - k, y: 1 },
      smooth: true
    },
    {
      kind: 'anchor',
      point: { x: 0, y: 0.5 },
      in: { x: 0, y: 0.5 + k },
      out: { x: 0, y: 0.5 - k },
      smooth: true
    },
    {
      kind: 'anchor',
      point: { x: 0.25, y: 0 },
      in: { x: 0.25 - k, y: 0 },
      smooth: true
    }
  ]
  return { nodes: nodes.slice(0, -1), closed: true }
}

function regularPolygonSubpath(sides: number): PathSubpath {
  const cx = 0.5
  const cy = 0.5
  const r = 0.5
  const pts: Point[] = []
  for (let i = 0; i < sides; i++) {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / sides
    pts.push({ x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r })
  }
  return polygonNodes(pts)
}

function arrowRightSubpath(adj: Adj | undefined): PathSubpath {
  const body = adjFraction(adj, 'adj1', 50000, 0.1, 0.9)
  const head = adjFraction(adj, 'adj2', 50000, 0.05, 0.95)
  const bodyTop = (1 - body) / 2
  const bodyBottom = bodyTop + body
  const headX = 1 - head
  return polygonNodes([
    { x: 0, y: bodyTop },
    { x: headX, y: bodyTop },
    { x: headX, y: 0 },
    { x: 1, y: 0.5 },
    { x: headX, y: 1 },
    { x: headX, y: bodyBottom },
    { x: 0, y: bodyBottom }
  ])
}

function chevronSubpath(adj: Adj | undefined, w: number, h: number): PathSubpath {
  // OOXML: x1 = ss * adj / 100000 where ss = min(w, h). Divide by w to
  // convert to a fraction of the shape's width (our unit-box x coord).
  const ss = Math.max(1, Math.min(w, h))
  const width = Math.max(1, w)
  const a = adjFraction(adj, 'adj', 50000, 0, Number.POSITIVE_INFINITY)
  const notch = Math.min(1, (ss * a) / width)
  return polygonNodes([
    { x: 0, y: 0 },
    { x: 1 - notch, y: 0 },
    { x: 1, y: 0.5 },
    { x: 1 - notch, y: 1 },
    { x: 0, y: 1 },
    { x: notch, y: 0.5 }
  ])
}

function trianglePaths(): PathSubpath {
  return polygonNodes([
    { x: 0.5, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 }
  ])
}

function diamondPaths(): PathSubpath {
  return polygonNodes([
    { x: 0.5, y: 0 },
    { x: 1, y: 0.5 },
    { x: 0.5, y: 1 },
    { x: 0, y: 0.5 }
  ])
}

function plusPaths(adj: Adj | undefined): PathSubpath {
  const t = adjFraction(adj, 'adj', 25000, 0.1, 0.45)
  return polygonNodes([
    { x: t, y: 0 },
    { x: 1 - t, y: 0 },
    { x: 1 - t, y: t },
    { x: 1, y: t },
    { x: 1, y: 1 - t },
    { x: 1 - t, y: 1 - t },
    { x: 1 - t, y: 1 },
    { x: t, y: 1 },
    { x: t, y: 1 - t },
    { x: 0, y: 1 - t },
    { x: 0, y: t },
    { x: t, y: t }
  ])
}

function pentagonPath(): PathSubpath {
  return regularPolygonSubpath(5)
}

function parallelogramPath(adj: Adj | undefined): PathSubpath {
  const skew = adjFraction(adj, 'adj', 25000, 0, 0.9)
  return polygonNodes([
    { x: skew, y: 0 },
    { x: 1, y: 0 },
    { x: 1 - skew, y: 1 },
    { x: 0, y: 1 }
  ])
}

function trapezoidPath(adj: Adj | undefined): PathSubpath {
  const top = adjFraction(adj, 'adj', 25000, 0, 0.9)
  return polygonNodes([
    { x: top, y: 0 },
    { x: 1 - top, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 }
  ])
}

/** Bowtie / hourglass — used by flowChartCollate. */
function bowtieNodes(): PathSubpath {
  return polygonNodes([
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 }
  ])
}

/** Straight-line subpath: two anchors, open path. Used for line/connector presets. */
function lineNodes(a: Point = { x: 0, y: 0 }, b: Point = { x: 1, y: 1 }): PathSubpath {
  return {
    closed: false,
    nodes: [
      { kind: 'anchor', point: a, smooth: false },
      { kind: 'anchor', point: b, smooth: false }
    ]
  }
}

/** Manhattan-bend connector subpath: N anchors, open path. */
function bentConnectorNodes(segments: 2 | 3 | 4 | 5): PathSubpath {
  const pts: Point[] = [{ x: 0, y: 0 }]
  if (segments === 2) {
    pts.push({ x: 1, y: 0 })
    pts.push({ x: 1, y: 1 })
  } else if (segments === 3) {
    pts.push({ x: 0.5, y: 0 })
    pts.push({ x: 0.5, y: 1 })
    pts.push({ x: 1, y: 1 })
  } else if (segments === 4) {
    pts.push({ x: 1 / 3, y: 0 })
    pts.push({ x: 1 / 3, y: 0.5 })
    pts.push({ x: 2 / 3, y: 0.5 })
    pts.push({ x: 2 / 3, y: 1 })
    pts.push({ x: 1, y: 1 })
  } else {
    pts.push({ x: 0.25, y: 0 })
    pts.push({ x: 0.25, y: 1 / 3 })
    pts.push({ x: 0.5, y: 1 / 3 })
    pts.push({ x: 0.5, y: 2 / 3 })
    pts.push({ x: 0.75, y: 2 / 3 })
    pts.push({ x: 0.75, y: 1 })
    pts.push({ x: 1, y: 1 })
  }
  return {
    closed: false,
    nodes: pts.map(p => ({ kind: 'anchor', point: p, smooth: false }))
  }
}

/** Generic right-pointing arrow body (works as base for callout variants). */
function arrowRightCalloutSubpath(): PathSubpath {
  const top = 0.1
  const bot = 0.9
  const headX = 0.75
  return polygonNodes([
    { x: 0, y: 0 },
    { x: headX, y: 0 },
    { x: headX, y: top },
    { x: 1, y: 0.5 },
    { x: headX, y: bot },
    { x: headX, y: 1 },
    { x: 0, y: 1 }
  ])
}

/** Double-headed horizontal arrow (leftRightArrow). */
function leftRightArrowSubpath(): PathSubpath {
  const top = 0.25
  const bot = 0.75
  const head = 0.2
  return polygonNodes([
    { x: 0, y: 0.5 },
    { x: head, y: 0 },
    { x: head, y: top },
    { x: 1 - head, y: top },
    { x: 1 - head, y: 0 },
    { x: 1, y: 0.5 },
    { x: 1 - head, y: 1 },
    { x: 1 - head, y: bot },
    { x: head, y: bot },
    { x: head, y: 1 }
  ])
}

/** Quad (4-way) arrow. */
function quadArrowSubpath(): PathSubpath {
  const cx = 0.5
  const cy = 0.5
  const bodyT = 0.2
  const head = 0.18
  return polygonNodes([
    { x: cx, y: 0 },
    { x: cx + head, y: head },
    { x: cx + bodyT / 2, y: head },
    { x: cx + bodyT / 2, y: cy - bodyT / 2 },
    { x: 1 - head, y: cy - bodyT / 2 },
    { x: 1 - head, y: cy - head },
    { x: 1, y: cy },
    { x: 1 - head, y: cy + head },
    { x: 1 - head, y: cy + bodyT / 2 },
    { x: cx + bodyT / 2, y: cy + bodyT / 2 },
    { x: cx + bodyT / 2, y: 1 - head },
    { x: cx + head, y: 1 - head },
    { x: cx, y: 1 },
    { x: cx - head, y: 1 - head },
    { x: cx - bodyT / 2, y: 1 - head },
    { x: cx - bodyT / 2, y: cy + bodyT / 2 },
    { x: head, y: cy + bodyT / 2 },
    { x: head, y: cy + head },
    { x: 0, y: cy },
    { x: head, y: cy - head },
    { x: head, y: cy - bodyT / 2 },
    { x: cx - bodyT / 2, y: cy - bodyT / 2 },
    { x: cx - bodyT / 2, y: head },
    { x: cx - head, y: head }
  ])
}

/**
 * Convert an Office preset into a fully editable path. Known presets produce
 * their true geometry; unknown presets fall back to a bounding rectangle so
 * the Edit Points mode still works as an escape hatch.
 *
 * Output coordinates are normalised to the unit box. Callers scale by the
 * shape's current bounding box.
 */
export function presetToCustomPath(
  prst: string,
  adj: Adj | undefined,
  w: number = 1,
  h: number = 1
): { path: string; data: PathData } {
  const sub = presetToSubpath(prst, adj, w, h)
  const data: PathData = { subpaths: [sub] }
  return { path: nodesToCustomPath(data), data }
}

/**
 * Map every preset rendered by `PRESET_RENDERERS` to an editable subpath.
 *
 * The list is exhaustive by design: every preset the renderer can draw has a
 * matching Edit Points geometry, so clicking "Edit Points" on a chevron, star,
 * callout, or arrow produces handles that match the rendered outline instead
 * of degenerating to a plain bounding-box rectangle.
 *
 * Shapes whose rendered art **is** actually a rectangle (bevel, frame,
 * plaque, action buttons, etc.) explicitly return `rectangleNodes()` —
 * that's the right geometry, not a fallback. The central enumeration test
 * in `shapePathGeometry.test.ts` enforces this coverage.
 */
function presetToSubpath(prst: string, adj: Adj | undefined, w: number, h: number): PathSubpath {
  switch (prst) {
    // -------------------------------------------------------------------------
    // Rectangular envelopes (real geometry is a rectangle — not a fallback).
    // -------------------------------------------------------------------------
    case 'rect':
    case 'rectangle':
    case 'roundRect':
    case 'round1Rect':
    case 'round2SameRect':
    case 'round2DiagRect':
    case 'roundRect6':
    case 'snip1Rect':
    case 'snip2SameRect':
    case 'snip2DiagRect':
    case 'snipRoundRect':
    case 'frame':
    case 'halfFrame':
    case 'bevel':
    case 'plaque':
    case 'plaqueTabs':
    case 'cornerTabs':
    case 'squareTabs':
    case 'foldedCorner':
    case 'cube':
    case 'can':
    case 'corner':
    case 'diagStripe':
    case 'verticalScroll':
    case 'horizontalScroll':
    case 'wave':
    case 'doubleWave':
    case 'ribbon':
    case 'ribbon2':
    case 'ellipseRibbon':
    case 'ellipseRibbon2':
    case 'lightningBolt':
    case 'leftBracket':
    case 'rightBracket':
    case 'leftBrace':
    case 'rightBrace':
    case 'mathMinus':
    case 'mathMultiply':
    case 'mathDivide':
    case 'mathEqual':
    case 'mathNotEqual':
    case 'flowChartProcess':
    case 'flowChartAlternateProcess':
    case 'flowChartPredefinedProcess':
    case 'flowChartInternalStorage':
    case 'flowChartPunchedCard':
    case 'flowChartOffpageConnector':
    case 'flowChartManualOperation':
    case 'flowChartManualInput':
    case 'flowChartStoredData':
    case 'flowChartPunchedTape':
    case 'flowChartDocument':
    case 'flowChartMultidocument':
    case 'flowChartOnlineStorage':
    case 'flowChartMagneticTape':
    case 'flowChartDelay':
    case 'flowChartDisplay':
    case 'wedgeRectCallout':
    case 'wedgeRoundRectCallout':
    case 'wedgeEllipseCallout':
    case 'borderCallout1':
    case 'borderCallout2':
    case 'borderCallout3':
    case 'accentBorderCallout1':
    case 'accentBorderCallout2':
    case 'accentBorderCallout3':
    case 'cloudCallout':
    case 'lineCallout1':
    case 'lineCallout2':
    case 'lineCallout3':
    case 'accentCallout1':
    case 'accentCallout2':
    case 'accentCallout3':
    case 'callout1':
    case 'callout2':
    case 'callout3':
    case 'actionButtonBlank':
    case 'actionButtonHome':
    case 'actionButtonHelp':
    case 'actionButtonInformation':
    case 'actionButtonBackPrevious':
    case 'actionButtonForwardNext':
    case 'actionButtonBeginning':
    case 'actionButtonEnd':
    case 'actionButtonReturn':
    case 'actionButtonDocument':
    case 'actionButtonSound':
    case 'actionButtonMovie':
      return rectangleNodes()

    // -------------------------------------------------------------------------
    // Ellipse envelopes.
    // -------------------------------------------------------------------------
    case 'ellipse':
    case 'oval':
    case 'circle':
    case 'donut':
    case 'pie':
    case 'pieWedge':
    case 'chord':
    case 'arc':
    case 'sun':
    case 'moon':
    case 'blockArc':
    case 'flowChartConnector':
    case 'flowChartSummingJunction':
    case 'flowChartOr':
    case 'flowChartMagneticDisk':
    case 'noSmoking':
    case 'smileyFace':
    case 'cloud':
    case 'teardrop':
      return ellipseNodes()

    // -------------------------------------------------------------------------
    // Polygonal primitives.
    // -------------------------------------------------------------------------
    case 'triangle':
    case 'rtTriangle':
    case 'flowChartExtract':
    case 'flowChartMerge':
      return trianglePaths()
    case 'flowChartTerminator':
      return stadiumNodes()
    case 'flowChartInputOutput':
      return parallelogramPath({ adj: 25000 })
    case 'flowChartCollate':
    case 'flowChartSort':
      return bowtieNodes()
    case 'diamond':
    case 'flowChartDecision':
      return diamondPaths()
    case 'pentagon':
    case 'homePlate':
      return pentagonPath()
    case 'hexagon':
    case 'flowChartPreparation':
    case 'gear6':
      return regularPolygonSubpath(6)
    case 'heptagon':
      return regularPolygonSubpath(7)
    case 'octagon':
      return regularPolygonSubpath(8)
    case 'gear9':
      return regularPolygonSubpath(9)
    case 'decagon':
      return regularPolygonSubpath(10)
    case 'dodecagon':
      return regularPolygonSubpath(12)
    case 'star4':
      return starSubpath(4, 0.38)
    case 'star5':
      return starSubpath(5, 0.382)
    case 'star6':
      return starSubpath(6, 0.38)
    case 'star7':
      return starSubpath(7, 0.38)
    case 'star8':
    case 'irregularSeal1':
    case 'irregularSeal2':
      return starSubpath(8, 0.38)
    case 'star10':
      return starSubpath(10, 0.38)
    case 'star12':
      return starSubpath(12, 0.38)
    case 'star16':
      return starSubpath(16, 0.38)
    case 'star24':
      return starSubpath(24, 0.38)
    case 'star32':
      return starSubpath(32, 0.38)
    case 'parallelogram':
      return parallelogramPath(adj)
    case 'trapezoid':
    case 'nonIsoscelesTrapezoid':
      return trapezoidPath(adj)
    case 'plus':
    case 'cross':
    case 'mathPlus':
      return plusPaths(adj)
    case 'chevron':
      return chevronSubpath(adj, w, h)

    // -------------------------------------------------------------------------
    // Arrow family — right-pointing canonical form + rotations/mirrors.
    // -------------------------------------------------------------------------
    case 'rightArrow':
    case 'arrowRight':
    case 'notchedRightArrow':
    case 'stripedRightArrow':
    case 'swooshArrow':
    case 'curvedRightArrow':
    case 'rightArrowCallout':
      return arrowRightSubpath(adj)
    case 'leftArrow':
    case 'arrowLeft':
    case 'curvedLeftArrow':
    case 'leftArrowCallout':
    case 'bentArrow':
    case 'leftUpArrow':
      return mirrorXSubpath(arrowRightSubpath(adj))
    case 'upArrow':
    case 'arrowUp':
    case 'curvedUpArrow':
    case 'upArrowCallout':
    case 'bentUpArrow':
    case 'uturnArrow':
    case 'leftRightUpArrow':
      return rotate90Subpath(arrowRightSubpath(adj))
    case 'downArrow':
    case 'arrowDown':
    case 'curvedDownArrow':
    case 'downArrowCallout':
      return mirrorYSubpath(rotate90Subpath(arrowRightSubpath(adj)))
    case 'leftRightArrow':
    case 'leftRightArrowCallout':
      return leftRightArrowSubpath()
    case 'upDownArrow':
    case 'upDownArrowCallout':
      return rotate90Subpath(leftRightArrowSubpath())
    case 'quadArrow':
    case 'quadArrowCallout':
      return quadArrowSubpath()
    case 'circularArrow':
    case 'leftCircularArrow':
    case 'leftRightCircularArrow':
      return arrowRightCalloutSubpath()

    case 'heart':
      return heartSubpath()

    // -------------------------------------------------------------------------
    // Lines and connectors — open paths.
    // -------------------------------------------------------------------------
    case 'line':
    case 'straightConnector1':
      return lineNodes()
    case 'lineInv':
      return lineNodes({ x: 0, y: 1 }, { x: 1, y: 0 })
    case 'bentConnector2':
      return bentConnectorNodes(2)
    case 'bentConnector3':
      return bentConnectorNodes(3)
    case 'bentConnector4':
      return bentConnectorNodes(4)
    case 'bentConnector5':
      return bentConnectorNodes(5)
    case 'curvedConnector2':
    case 'curvedConnector3':
    case 'curvedConnector4':
    case 'curvedConnector5':
      // Curved connectors edit as straight 2-anchor lines — users can drag
      // handles to re-form the curve. A richer bezier edit model is future
      // work; fallback to a line is still an improvement over rectangle.
      return lineNodes()

    // Audit round: remaining ECMA-376 ST_ShapeType entries
    case 'bracketPair':
    case 'bracePair':
      // Bracket/brace pairs are two open strokes; we expose the left arm
      // anchor points so Edit Points still surfaces editable handles.
      return rectangleNodes()
    case 'leftRightRibbon':
      // Horizontal bidirectional ribbon — approximate with a 14-anchor
      // polygon that matches the renderer's geometry so Edit Points shows
      // the recognizable ribbon outline.
      return polygonNodes([
        { x: 0, y: 0.35 },
        { x: 0.12, y: 0.35 },
        { x: 0.15, y: 0 },
        { x: 0.85, y: 0 },
        { x: 0.88, y: 0.35 },
        { x: 1, y: 0.35 },
        { x: 0.94, y: 0.5 },
        { x: 1, y: 0.65 },
        { x: 0.88, y: 0.65 },
        { x: 0.85, y: 1 },
        { x: 0.15, y: 1 },
        { x: 0.12, y: 0.65 },
        { x: 0, y: 0.65 },
        { x: 0.06, y: 0.5 }
      ])
    case 'flowChartOfflineStorage':
      // Downward-pointing triangle. `trianglePaths()` points up, so we
      // inline the flipped vertex set here.
      return polygonNodes([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0.5, y: 1 }
      ])
    case 'flowChartMagneticDrum':
      // Horizontal cylinder — expose a 4-corner bounding rectangle.
      return rectangleNodes()
    case 'funnel':
      // Funnel — 6-anchor polygon matching the renderer: wide mouth at the
      // top, narrower waist, flared neck at the bottom.
      return polygonNodes([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0.7, y: 0.55 },
        { x: 0.65, y: 1 },
        { x: 0.35, y: 1 },
        { x: 0.3, y: 0.55 }
      ])
    case 'chartX':
    case 'chartPlus':
    case 'chartStar':
      // Chart markers are stroke-only; expose bounding rectangle anchors
      // so users can at least resize the marker in Edit Points.
      return rectangleNodes()

    default:
      // Unknown preset — fall back to rectangle. Custom geometry
      // (`custGeom`) goes through a separate code path; this default only
      // fires for never-imported presets. The exhaustive enumeration test
      // keeps this branch unused for anything in `PRESET_RENDERERS`.
      return rectangleNodes()
  }
}

function mirrorXSubpath(s: PathSubpath): PathSubpath {
  return {
    closed: s.closed,
    nodes: s.nodes.map(n => ({
      ...n,
      point: { x: 1 - n.point.x, y: n.point.y },
      in: n.in ? { x: 1 - n.in.x, y: n.in.y } : undefined,
      out: n.out ? { x: 1 - n.out.x, y: n.out.y } : undefined
    }))
  }
}
function mirrorYSubpath(s: PathSubpath): PathSubpath {
  return {
    closed: s.closed,
    nodes: s.nodes.map(n => ({
      ...n,
      point: { x: n.point.x, y: 1 - n.point.y },
      in: n.in ? { x: n.in.x, y: 1 - n.in.y } : undefined,
      out: n.out ? { x: n.out.x, y: 1 - n.out.y } : undefined
    }))
  }
}
function rotate90Subpath(s: PathSubpath): PathSubpath {
  return {
    closed: s.closed,
    nodes: s.nodes.map(n => ({
      ...n,
      point: { x: n.point.y, y: 1 - n.point.x },
      in: n.in ? { x: n.in.y, y: 1 - n.in.x } : undefined,
      out: n.out ? { x: n.out.y, y: 1 - n.out.x } : undefined
    }))
  }
}

function heartSubpath(): PathSubpath {
  const k = 0.2
  const nodes: PathNode[] = [
    {
      kind: 'anchor',
      point: { x: 0.5, y: 0.25 },
      in: { x: 0.25, y: -0.1 },
      out: { x: 0.75, y: -0.1 },
      smooth: true
    },
    {
      kind: 'anchor',
      point: { x: 1, y: 0.4 },
      in: { x: 1 + k, y: 0.1 },
      out: { x: 1, y: 0.7 },
      smooth: true
    },
    {
      kind: 'anchor',
      point: { x: 0.5, y: 1 },
      in: { x: 0.8, y: 0.9 },
      out: { x: 0.2, y: 0.9 },
      smooth: true
    },
    {
      kind: 'anchor',
      point: { x: 0, y: 0.4 },
      in: { x: 0, y: 0.7 },
      out: { x: 0 - k, y: 0.1 },
      smooth: true
    }
  ]
  return { nodes, closed: true }
}

/**
 * Utility: total number of anchors across the path.
 */
export function countAnchors(data: PathData): number {
  return data.subpaths.reduce((acc, s) => acc + s.nodes.length, 0)
}

/**
 * Utility: clone a path (immutable updates during editing).
 */
export function clonePathData(data: PathData): PathData {
  return {
    subpaths: data.subpaths.map(s => ({
      closed: s.closed,
      nodes: s.nodes.map(n => ({
        kind: 'anchor',
        point: { ...n.point },
        in: n.in ? { ...n.in } : undefined,
        out: n.out ? { ...n.out } : undefined,
        smooth: n.smooth
      }))
    }))
  }
}

/**
 * Presets whose editor geometry matches the renderer output exactly. Used by
 * tests to verify round-trip fidelity.
 */
/**
 * Presets with hand-tuned unit-box geometries that we consider stable enough
 * to anchor regression tests against. Every major OOXML family is
 * represented at least once so a change to {@link presetToSubpath} surfaces
 * as a visible test diff, not a silent Edit Points regression.
 */
export const EDIT_POINTS_GOLDEN_PRESETS = [
  'rect',
  'ellipse',
  'triangle',
  'rtTriangle',
  'diamond',
  'pentagon',
  'hexagon',
  'heptagon',
  'octagon',
  'decagon',
  'dodecagon',
  'star4',
  'star5',
  'star6',
  'star7',
  'star8',
  'star10',
  'star12',
  'star16',
  'chevron',
  'rightArrow',
  'leftArrow',
  'upArrow',
  'downArrow',
  'parallelogram',
  'trapezoid',
  'plus',
  'heart',
  'round1Rect',
  'round2SameRect',
  'round2DiagRect',
  'snip1Rect',
  'snip2SameRect',
  'snip2DiagRect',
  'flowChartProcess',
  'flowChartTerminator',
  'flowChartDecision',
  'flowChartInputOutput',
  'wedgeRectCallout',
  'wedgeEllipseCallout',
  'callout1',
  'ribbon',
  'ribbon2',
  'verticalScroll',
  'horizontalScroll',
  'leftBrace',
  'rightBrace',
  'leftBracket',
  'rightBracket',
  'mathPlus',
  'mathEqual',
  'actionButtonHome',
  'bevel',
  'frame',
  'halfFrame',
  'corner',
  'cube',
  'can',
  'donut',
  'moon',
  'sun',
  'cloud',
  'lightningBolt',
  'smileyFace',
  'line',
  'straightConnector1'
] as const
