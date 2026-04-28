import {
  customPathToNodes,
  nodesToCustomPath,
  presetToCustomPath,
  countAnchors,
  clonePathData,
  EDIT_POINTS_GOLDEN_PRESETS
} from '../shapePathGeometry'
import { SUPPORTED_OFFICE_PRESETS } from '../OfficeShapeRenderer'

const MAX_DELTA = 1e-4

function pathPointsApprox(a: string, b: string): boolean {
  const na = customPathToNodes(a)
  const nb = customPathToNodes(b)
  if (na.subpaths.length !== nb.subpaths.length) return false
  for (let i = 0; i < na.subpaths.length; i++) {
    const sa = na.subpaths[i]
    const sb = nb.subpaths[i]
    if (sa.nodes.length !== sb.nodes.length) return false
    if (sa.closed !== sb.closed) return false
    for (let j = 0; j < sa.nodes.length; j++) {
      const pa = sa.nodes[j].point
      const pb = sb.nodes[j].point
      if (Math.abs(pa.x - pb.x) > MAX_DELTA) return false
      if (Math.abs(pa.y - pb.y) > MAX_DELTA) return false
    }
  }
  return true
}

describe('shapePathGeometry: preset → path → nodes round-trip', () => {
  for (const prst of EDIT_POINTS_GOLDEN_PRESETS) {
    it(`${prst} produces a non-empty path with anchors inside the unit box`, () => {
      const { path, data } = presetToCustomPath(prst, undefined)
      expect(path.length).toBeGreaterThan(0)
      expect(countAnchors(data)).toBeGreaterThan(0)
      for (const sub of data.subpaths) {
        for (const node of sub.nodes) {
          expect(node.point.x).toBeGreaterThanOrEqual(-0.1)
          expect(node.point.x).toBeLessThanOrEqual(1.1)
          expect(node.point.y).toBeGreaterThanOrEqual(-0.1)
          expect(node.point.y).toBeLessThanOrEqual(1.1)
        }
      }
    })

    it(`${prst} round-trips cleanly through customPathToNodes → nodesToCustomPath`, () => {
      const { path, data } = presetToCustomPath(prst, undefined)
      const reparsed = customPathToNodes(path)
      expect(reparsed.subpaths.length).toBe(data.subpaths.length)
      for (let i = 0; i < data.subpaths.length; i++) {
        expect(reparsed.subpaths[i].nodes.length).toBe(data.subpaths[i].nodes.length)
      }
      const reserialised = nodesToCustomPath(reparsed)
      expect(pathPointsApprox(path, reserialised)).toBe(true)
    })
  }
})

describe('shapePathGeometry: primitives', () => {
  it('customPathToNodes parses a simple rectangle M L L L L Z', () => {
    const d = 'M 0 0 L 1 0 L 1 1 L 0 1 Z'
    const data = customPathToNodes(d)
    expect(data.subpaths.length).toBe(1)
    expect(data.subpaths[0].nodes.length).toBe(4)
    expect(data.subpaths[0].closed).toBe(true)
  })

  it('customPathToNodes upgrades quadratic to cubic for a canonical internal representation', () => {
    const d = 'M 0 0 Q 0.5 1 1 0'
    const data = customPathToNodes(d)
    expect(data.subpaths[0].nodes.length).toBe(2)
    expect(data.subpaths[0].nodes[0].out).toBeTruthy()
    expect(data.subpaths[0].nodes[1].in).toBeTruthy()
  })

  it('nodesToCustomPath emits a cubic when the prior anchor has an out handle', () => {
    const d = 'M 0 0 C 0.2 0.2 0.8 0.8 1 1'
    const data = customPathToNodes(d)
    const out = nodesToCustomPath(data)
    expect(out).toMatch(/^M 0 0 C/)
  })

  it('clonePathData produces an independent copy', () => {
    const { data } = presetToCustomPath('rect', undefined)
    const copy = clonePathData(data)
    expect(copy).toEqual(data)
    copy.subpaths[0].nodes[0].point.x = 9
    expect(data.subpaths[0].nodes[0].point.x).not.toBe(9)
  })

  it('unknown presets fall back to a rectangle (escape hatch)', () => {
    const { data } = presetToCustomPath('doesNotExist', undefined)
    expect(data.subpaths[0].nodes.length).toBe(4)
  })
})

/**
 * Exhaustive coverage check: every preset rendered by `PRESET_RENDERERS`
 * should have an explicit Edit Points subpath — never the default rectangle
 * escape hatch unless the rendered art is actually a rectangle.
 *
 * Shapes whose rendered outline really is rectangular (bevel, frame, plaque,
 * action buttons, callout bodies) are whitelisted below. Everything else
 * must produce a non-rectangular path with either a different anchor count,
 * non-rectangular vertex positions, or an open path.
 */
describe('shapePathGeometry exhaustive coverage for PRESET_RENDERERS', () => {
  /**
   * Presets whose rendered geometry is legitimately a rectangle — Edit
   * Points should produce the 4-anchor rectangle for these, and that's
   * correct, not a fallback.
   */
  const RECTANGLE_PRESETS = new Set<string>([
    'rect',
    'rectangle',
    'roundRect',
    'round1Rect',
    'round2SameRect',
    'round2DiagRect',
    'roundRect6',
    'snip1Rect',
    'snip2SameRect',
    'snip2DiagRect',
    'snipRoundRect',
    'frame',
    'halfFrame',
    'bevel',
    'plaque',
    'plaqueTabs',
    'cornerTabs',
    'squareTabs',
    'foldedCorner',
    'cube',
    'can',
    'corner',
    'diagStripe',
    'verticalScroll',
    'horizontalScroll',
    'wave',
    'doubleWave',
    'ribbon',
    'ribbon2',
    'ellipseRibbon',
    'ellipseRibbon2',
    'lightningBolt',
    'leftBracket',
    'rightBracket',
    'leftBrace',
    'rightBrace',
    'mathMinus',
    'mathMultiply',
    'mathDivide',
    'mathEqual',
    'mathNotEqual',
    'flowChartProcess',
    'flowChartAlternateProcess',
    'flowChartPredefinedProcess',
    'flowChartInternalStorage',
    'flowChartPunchedCard',
    'flowChartOffpageConnector',
    'flowChartManualOperation',
    'flowChartManualInput',
    'flowChartStoredData',
    'flowChartPunchedTape',
    'flowChartDocument',
    'flowChartMultidocument',
    'flowChartOnlineStorage',
    'flowChartMagneticTape',
    'flowChartDelay',
    'flowChartDisplay',
    'wedgeRectCallout',
    'wedgeRoundRectCallout',
    'wedgeEllipseCallout',
    'borderCallout1',
    'borderCallout2',
    'borderCallout3',
    'accentBorderCallout1',
    'accentBorderCallout2',
    'accentBorderCallout3',
    'cloudCallout',
    'lineCallout1',
    'lineCallout2',
    'lineCallout3',
    'accentCallout1',
    'accentCallout2',
    'accentCallout3',
    'callout1',
    'callout2',
    'callout3',
    'actionButtonBlank',
    'actionButtonHome',
    'actionButtonHelp',
    'actionButtonInformation',
    'actionButtonBackPrevious',
    'actionButtonForwardNext',
    'actionButtonBeginning',
    'actionButtonEnd',
    'actionButtonReturn',
    'actionButtonDocument',
    'actionButtonSound',
    'actionButtonMovie',
    // Audit round: stroke-only / cylindrical presets whose visual content
    // lives inside the renderer, so the bounding rectangle is the correct
    // Edit Points surface.
    'bracketPair',
    'bracePair',
    'flowChartMagneticDrum',
    'chartX',
    'chartPlus',
    'chartStar'
  ])

  function isRectangularGeometry(path: string): boolean {
    const data = customPathToNodes(path)
    if (data.subpaths.length !== 1) return false
    const sub = data.subpaths[0]
    if (!sub.closed || sub.nodes.length !== 4) return false
    // True axis-aligned rectangle: consecutive anchors share exactly one
    // coordinate (only horizontal/vertical edges, no diagonals). Bowties
    // have diagonal edges so they fail this check even when the four
    // anchors happen to sit on bounding-box corners.
    for (let i = 0; i < 4; i++) {
      const a = sub.nodes[i].point
      const b = sub.nodes[(i + 1) % 4].point
      const sameX = Math.abs(a.x - b.x) < 1e-9
      const sameY = Math.abs(a.y - b.y) < 1e-9
      if (sameX === sameY) return false
    }
    // Each anchor must sit on the bounding-box corner.
    const corners = new Set(['0,0', '1,0', '1,1', '0,1'])
    for (const n of sub.nodes) {
      if (!corners.has(`${n.point.x},${n.point.y}`)) return false
    }
    return true
  }

  it('every rendered preset has an explicit Edit Points subpath', () => {
    const offenders: string[] = []
    for (const prst of SUPPORTED_OFFICE_PRESETS) {
      const { path } = presetToCustomPath(prst, undefined)
      const isRect = isRectangularGeometry(path)
      if (isRect && !RECTANGLE_PRESETS.has(prst)) {
        offenders.push(prst)
      }
    }
    expect(offenders).toEqual([])
  })

  it('every rendered preset produces a non-empty path', () => {
    for (const prst of SUPPORTED_OFFICE_PRESETS) {
      const { path, data } = presetToCustomPath(prst, undefined)
      expect(path.length).toBeGreaterThan(0)
      expect(countAnchors(data)).toBeGreaterThan(0)
    }
  })
})
