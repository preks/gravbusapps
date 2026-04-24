import React from 'react'
import { render } from '@testing-library/react'
import { tryRenderOfficePresetShape, SUPPORTED_OFFICE_PRESETS, isOfficePresetSupported } from '../OfficeShapeRenderer'
import type { ShapeElement } from '../slideElements'

function makeShape(prst: string, width = 200, height = 120): ShapeElement {
  return {
    id: 'sp',
    type: 'shape',
    position: { x: 0, y: 0 },
    size: { width, height },
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 1,
    shapeType: 'rectangle',
    fill: '#3b82f6',
    strokeColor: '#1e40af',
    strokeWidth: 0,
    strokeStyle: 'solid',
    cornerRadius: 0,
    shadow: false,
    geometry: { sourceFormat: 'native', prst }
  }
}

function renderPreset(prst: string, width = 200, height = 120): HTMLElement {
  const node = tryRenderOfficePresetShape({
    element: makeShape(prst, width, height),
    fillStyle: '#3b82f6',
    strokeColor: '#1e40af',
    strokeWidth: 1,
    shadow: false,
    width,
    height
  })
  const { container } = render(<div>{node as React.ReactNode}</div>)
  return container
}

/**
 * Baseline: the preset library keeps growing toward full ECMA-376 parity
 * (~187 `ST_ShapeType` values). This guard keeps the supported list from
 * shrinking silently if a refactor drops a preset, and tracks concrete
 * progress toward parity instead of a loose "at least 60" floor.
 */
describe('OfficeShapeRenderer preset coverage', () => {
  it('supports at least 120 Office presets end-to-end', () => {
    expect(SUPPORTED_OFFICE_PRESETS.length).toBeGreaterThanOrEqual(120)
  })

  it('recognises every supported preset via isOfficePresetSupported', () => {
    for (const prst of SUPPORTED_OFFICE_PRESETS) {
      expect(isOfficePresetSupported(prst)).toBe(true)
    }
    expect(isOfficePresetSupported('thisIsNotARealPresetId')).toBe(false)
  })
})

/**
 * Per-category smoke tests. For each representative preset we:
 *   1. Confirm the renderer produces a non-empty SVG payload.
 *   2. Confirm it emits at least one primitive (`<path>`, `<circle>`,
 *      `<ellipse>`, `<rect>`, or `<line>`) — catches silent null renders or
 *      empty paths that would collapse to invisible shapes on the canvas.
 *   3. Re-render at a tiny and a large bounding box to make sure the
 *      renderer doesn't emit NaN coordinates (common failure mode for
 *      adjustment math at extreme aspect ratios).
 */
describe('OfficeShapeRenderer per-preset smoke tests', () => {
  const groups: Record<string, string[]> = {
    'block-arrows': [
      'bentArrow',
      'bentUpArrow',
      'uturnArrow',
      'leftRightArrow',
      'upDownArrow',
      'quadArrow',
      'leftRightUpArrow',
      'circularArrow',
      'curvedRightArrow',
      'curvedLeftArrow',
      'curvedUpArrow',
      'curvedDownArrow',
      'stripedRightArrow',
      'swooshArrow',
      'leftArrowCallout',
      'rightArrowCallout',
      'upArrowCallout',
      'downArrowCallout'
    ],
    equation: ['mathPlus', 'mathMinus', 'mathMultiply', 'mathDivide', 'mathEqual', 'mathNotEqual'],
    flowchart: [
      'flowChartInputOutput',
      'flowChartDocument',
      'flowChartMultidocument',
      'flowChartConnector',
      'flowChartPunchedCard',
      'flowChartPunchedTape',
      'flowChartPreparation',
      'flowChartManualOperation',
      'flowChartManualInput',
      'flowChartInternalStorage',
      'flowChartDelay',
      'flowChartDisplay',
      'flowChartPredefinedProcess',
      'flowChartMagneticDisk',
      'flowChartOffpageConnector',
      'flowChartStoredData',
      'flowChartSummingJunction',
      'flowChartOr'
    ],
    'stars-banners': [
      'star4',
      'star6',
      'star7',
      'star8',
      'star10',
      'star12',
      'star16',
      'star24',
      'star32',
      'ribbon',
      'ribbon2',
      'verticalScroll',
      'horizontalScroll',
      'wave',
      'doubleWave'
    ],
    'basic-shapes': [
      'heart',
      'sun',
      'moon',
      'cloud',
      'lightningBolt',
      'smileyFace',
      'teardrop',
      'pie',
      'chord',
      'donut',
      'arc',
      'noSmoking',
      'frame',
      'halfFrame',
      'corner',
      'diagStripe',
      'leftBracket',
      'rightBracket',
      'leftBrace',
      'rightBrace',
      'heptagon',
      'decagon',
      'dodecagon'
    ],
    callouts: [
      'cloudCallout',
      'lineCallout1',
      'lineCallout2',
      'lineCallout3',
      'accentCallout1',
      'accentCallout2',
      'accentCallout3'
    ]
  }

  for (const [group, presets] of Object.entries(groups)) {
    describe(group, () => {
      for (const prst of presets) {
        it(`${prst} renders a non-empty SVG primitive at multiple sizes`, () => {
          for (const [w, h] of [
            [12, 8],
            [200, 120],
            [800, 600]
          ] as const) {
            const container = renderPreset(prst, w, h)
            const svg = container.querySelector('svg')
            expect(svg).not.toBeNull()

            const primitives = container.querySelectorAll('path, circle, ellipse, rect, line')
            expect(primitives.length).toBeGreaterThan(0)

            // Paths must not contain NaN or undefined coordinates — that
            // would render nothing, or worse, break SVG parsing in some
            // browsers.
            for (const p of Array.from(container.querySelectorAll('path'))) {
              const d = p.getAttribute('d') || ''
              expect(d).not.toMatch(/NaN|undefined/)
              expect(d.length).toBeGreaterThan(0)
            }
          }
        })
      }
    })
  }
})

/**
 * Regression for the "Sales Orders / Invoices" slide in `Invoicing copy.pptx`:
 * the PPTX uses `prst="chevron"` with default `adj=50%` on a wide-and-short
 * box (~291×101 px). PowerPoint scales the notch/tip by `min(w, h)` — the
 * "short stock" (`ss`) in OOXML — so the body stays mostly rectangular with
 * a modest arrow tip. Our old renderer scaled by `w`, turning these chevrons
 * into deep diamonds that visibly overlapped each other. These assertions
 * lock the correct formula so the regression can't come back.
 */
describe('OfficeShapeRenderer chevron follows OOXML short-stock scaling', () => {
  function pointsFromPath(container: HTMLElement): Array<[number, number]> {
    const path = container.querySelector('path')
    const d = path?.getAttribute('d') || ''
    const tokens = d
      .replace(/[MLZz,]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
    const pts: Array<[number, number]> = []
    for (let i = 0; i + 1 < tokens.length; i += 2) {
      pts.push([Number.parseFloat(tokens[i]), Number.parseFloat(tokens[i + 1])])
    }
    return pts
  }

  it('scales the notch by min(w, h) on a wide chevron, not by width', () => {
    const width = 291
    const height = 101
    const container = renderPreset('chevron', width, height)
    const pts = pointsFromPath(container)
    expect(pts.length).toBeGreaterThanOrEqual(6)
    const expectedNotch = Math.min(width, height) * 0.5 // adj=50%
    // The rightmost tip must sit exactly at x = width, and the body corner
    // immediately before it must be at (width - expectedNotch, 0).
    const tip = pts.find(([, y]) => Math.abs(y - height / 2) < 0.5 && Math.abs(pts[0][1] - 0) < 0.5)
    expect(tip).toBeDefined()
    const topRightCorner = pts.find(([x, y]) => Math.abs(y) < 0.5 && x > width / 2)
    expect(topRightCorner).toBeDefined()
    expect(topRightCorner![0]).toBeCloseTo(width - expectedNotch, 0)
    // Left notch vertex must sit at x = expectedNotch (not at width * 0.5).
    const leftNotch = pts.find(([x, y]) => Math.abs(y - height / 2) < 0.5 && x < width / 2)
    expect(leftNotch).toBeDefined()
    expect(leftNotch![0]).toBeCloseTo(expectedNotch, 0)
    // Old buggy implementation would have placed the notch at width/2 (~145).
    expect(leftNotch![0]).toBeLessThan(width * 0.3)
  })

  it('still produces a full chevron when w == h (square case unchanged)', () => {
    const container = renderPreset('chevron', 100, 100)
    const pts = pointsFromPath(container)
    // Middle Y anchors: one on the right at x=100 (tip) and one on the left
    // at x=50 (notch). We look for the left one explicitly.
    const midPoints = pts.filter(([, y]) => Math.abs(y - 50) < 0.5)
    expect(midPoints.length).toBeGreaterThanOrEqual(2)
    const leftNotchX = Math.min(...midPoints.map(([x]) => x))
    expect(leftNotchX).toBeCloseTo(50, 0)
  })
})

/**
 * Snip/round rectangle parity. The `Invoicing.pptx` "Quotes" shape uses
 * `prst="snip2DiagRect"` with an empty `<a:avLst/>`. PowerPoint's *actual*
 * preset defaults for `snip2DiagRect` are `adj1 = 0, adj2 = 16667` (≈16.67%
 * of the short stock), which snip the top-right + bottom-left corners.
 * Previously we rendered a plain rectangle for this case, which mis-imported
 * Quotes as a flat-cornered block instead of the diagonally-snipped shape
 * PowerPoint draws. These tests lock the correct per-variant geometry.
 */
describe('OfficeShapeRenderer snip / round rectangle variants', () => {
  function commandLetters(container: HTMLElement): string[] {
    const d = container.querySelector('path')?.getAttribute('d') || ''
    return (d.match(/[MLAZ]/g) || []).filter(c => c !== 'Z')
  }

  it('snip2DiagRect with default adjustments snips top-right + bottom-left', () => {
    // Use a square so the short stock equals both dimensions.
    const w = 200
    const h = 200
    const ss = Math.min(w, h)
    const expectedCut = ss * (16667 / 100000)
    const container = renderPreset('snip2DiagRect', w, h)
    const d = container.querySelector('path')?.getAttribute('d') || ''
    // Top-left and bottom-right remain at the bounding box corners (adj1 = 0).
    expect(d).toContain(`0 0`)
    expect(d).toContain(`${w} ${h}`)
    // Top-right replaced by two snip anchors: (w - cut, 0) and (w, cut).
    expect(d).toContain(`${w - expectedCut} 0`)
    expect(d).toContain(`${w} ${expectedCut}`)
    // Bottom-left replaced by (cut, h) and (0, h - cut).
    expect(d).toContain(`${expectedCut} ${h}`)
    expect(d).toContain(`0 ${h - expectedCut}`)
    // Still a pure polygon — no arcs.
    expect(commandLetters(container)).not.toContain('A')
  })

  it('snip1Rect snips only the top-right corner', () => {
    const container = renderPreset('snip1Rect', 100, 100)
    const d = container.querySelector('path')?.getAttribute('d') || ''
    // Top-left and both bottom corners untouched.
    expect(d).toContain(`0 0`)
    expect(d).toContain(`100 100`)
    expect(d).toContain(`0 100`)
    // Top-right replaced by two points: (100 - cut, 0) and (100, cut).
    expect(d).not.toMatch(/L\s*100\s*0/)
  })

  it('snip2SameRect snips both top corners (and not the bottom corners by default)', () => {
    const container = renderPreset('snip2SameRect', 100, 100)
    const d = container.querySelector('path')?.getAttribute('d') || ''
    // Bottom corners untouched at default adj2 = 0.
    expect(d).toContain(`100 100`)
    expect(d).toContain(`0 100`)
    // Top-left replaced by (cut, 0) / (0, cut); top-right by (100-cut, 0) / (100, cut).
    expect(d).not.toMatch(/M\s*0\s*0/)
    expect(d).not.toMatch(/L\s*100\s*0/)
  })

  it('snipRoundRect produces a quarter-arc (A command) for the rounded corner', () => {
    const container = renderPreset('snipRoundRect', 100, 100)
    expect(commandLetters(container)).toContain('A')
  })

  it('round1Rect rounds only the top-right corner', () => {
    const container = renderPreset('round1Rect', 100, 100)
    const d = container.querySelector('path')?.getAttribute('d') || ''
    // Exactly one arc command in the path.
    const arcs = (d.match(/A/g) || []).length
    expect(arcs).toBe(1)
    // Bottom-left untouched.
    expect(d).toContain(`0 100`)
  })

  it('round2SameRect rounds both top corners by default', () => {
    const container = renderPreset('round2SameRect', 100, 100)
    const d = container.querySelector('path')?.getAttribute('d') || ''
    const arcs = (d.match(/A/g) || []).length
    expect(arcs).toBe(2)
    // Bottom corners stay sharp.
    expect(d).toContain(`100 100`)
    expect(d).toContain(`0 100`)
  })
})

/**
 * Phase 2 expansion: spot-check the new preset families ship a non-empty SVG
 * for every family representative. The `renderPreset` helper already bails
 * out with an empty container if the renderer returns `null`, so this both
 * verifies wiring (renderer → PRESET_RENDERERS) and that the path is
 * non-trivial.
 */
describe('OfficeShapeRenderer phase 2 preset families', () => {
  const families: Record<string, string[]> = {
    'phase-2a-basic': [
      'rect',
      'ellipse',
      'triangle',
      'rtTriangle',
      'diamond',
      'hexagon',
      'star5',
      'blockArc',
      'cube',
      'plaque',
      'pieWedge',
      'gear6',
      'gear9',
      'cornerTabs',
      'squareTabs',
      'plaqueTabs',
      'foldedCorner',
      'irregularSeal1',
      'irregularSeal2',
      'ellipseRibbon',
      'ellipseRibbon2',
      'nonIsoscelesTrapezoid'
    ],
    'phase-2b-flowchart': [
      'flowChartCollate',
      'flowChartSort',
      'flowChartExtract',
      'flowChartMerge',
      'flowChartMagneticTape',
      'flowChartOnlineStorage'
    ],
    'phase-2c-arrows': [
      'leftRightArrowCallout',
      'upDownArrowCallout',
      'quadArrowCallout',
      'leftUpArrow',
      'leftCircularArrow',
      'leftRightCircularArrow'
    ],
    'phase-2d-callouts': [
      'accentBorderCallout1',
      'accentBorderCallout2',
      'accentBorderCallout3',
      'callout1',
      'callout2',
      'callout3'
    ],
    'phase-2e-action-buttons': [
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
      'actionButtonMovie'
    ],
    'phase-2f-connectors-lines': [
      'line',
      'lineInv',
      'straightConnector1',
      'bentConnector2',
      'bentConnector3',
      'bentConnector4',
      'bentConnector5',
      'curvedConnector2',
      'curvedConnector3',
      'curvedConnector4',
      'curvedConnector5'
    ]
  }

  for (const [family, presets] of Object.entries(families)) {
    describe(family, () => {
      for (const prst of presets) {
        it(`${prst} renders a non-empty SVG primitive`, () => {
          const c = renderPreset(prst, 200, 120)
          const hasPrimitive = c.querySelector('path, circle, ellipse, rect, line') !== null
          expect(hasPrimitive).toBe(true)
          // Supported via public API.
          expect(isOfficePresetSupported(prst)).toBe(true)
        })

        it(`${prst} survives tiny + large bounding boxes without NaN`, () => {
          for (const [w, h] of [
            [8, 8],
            [1024, 768]
          ]) {
            const c = renderPreset(prst, w as number, h as number)
            const markup = c.innerHTML
            expect(markup).not.toContain('NaN')
            expect(markup.length).toBeGreaterThan(0)
          }
        })
      }
    })
  }
})
