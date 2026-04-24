// Extract connector elements from slide XML (<p:cxnSp>).
//
// Connectors in PowerPoint are represented as connection shapes with preset
// geometry (straight, bent, curved). Each endpoint may carry an
// {@code <a:stCxn>}/{@code <a:endCxn>} reference that glues the endpoint to a
// specific site on another shape. We translate those references into the
// editor's {@link ConnectorBinding} model so connectors track moves/resizes
// of their target shapes, matching PowerPoint's behavior.

import type {
  ConnectorElement,
  ConnectorLineType,
  ConnectorBindSite,
  ConnectorBinding,
  Position
} from '../../components/slideElements'
import { createConnectorElement } from '../../components/slideElements'
import type { OoxmlTheme } from './types'
import { emuToPixels, extractTransform, getChild, parseSolidFill, isInsideGroup, nextImportUid } from './ooxmlUtils'
import type { OoxmlShapeIdRegistry } from './extractShapes'

const PRESET_TO_LINE_TYPE: Record<string, ConnectorLineType> = {
  line: 'straight',
  straightConnector1: 'straight',
  bentConnector2: 'elbow',
  bentConnector3: 'elbow',
  bentConnector4: 'elbow',
  bentConnector5: 'elbow',
  curvedConnector2: 'curved',
  curvedConnector3: 'curved',
  curvedConnector4: 'curved',
  curvedConnector5: 'curved'
}

const DASH_MAP: Record<string, ConnectorElement['strokeStyle']> = {
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

function resolveEndpoints(
  xfrm: Element,
  xEmu: number,
  yEmu: number,
  cxEmu: number,
  cyEmu: number
): {
  start: Position
  end: Position
} {
  const flipH = xfrm.getAttribute('flipH') === '1'
  const flipV = xfrm.getAttribute('flipV') === '1'

  let startX = xEmu
  let startY = yEmu
  let endX = xEmu + cxEmu
  let endY = yEmu + cyEmu

  if (flipH) {
    const tmp = startX
    startX = endX
    endX = tmp
  }
  if (flipV) {
    const tmp = startY
    startY = endY
    endY = tmp
  }

  return {
    start: { x: Math.max(0, emuToPixels(startX)), y: Math.max(0, emuToPixels(startY)) },
    end: { x: Math.max(0, emuToPixels(endX)), y: Math.max(0, emuToPixels(endY)) }
  }
}

/**
 * Map PowerPoint's cardinal connection-site indices to our {@link ConnectorBindSite}
 * tokens. PowerPoint shapes expose ordered sites (top, right, bottom, left,
 * and sometimes interior sites for arrows / stars / callouts); we support
 * the four-cardinal-sites set today — anything outside that range falls back
 * to 'center', which still lets the shape move-tracking keep the endpoint
 * roughly glued without over-committing to a specific edge.
 */
const CARDINAL_SITES: ConnectorBindSite[] = ['top', 'right', 'bottom', 'left']

function parseCxnRef(
  cNvCxnSpPr: Element | undefined,
  tag: 'a:stCxn' | 'a:endCxn',
  shapeIdRegistry: OoxmlShapeIdRegistry | undefined
): ConnectorBinding | undefined {
  if (!cNvCxnSpPr || !shapeIdRegistry) return undefined
  const ref = getChild(cNvCxnSpPr, tag)
  if (!ref) return undefined
  const rawId = ref.getAttribute('id')
  if (!rawId) return undefined
  const elementId = shapeIdRegistry.get(rawId)
  if (!elementId) return undefined
  const idxAttr = ref.getAttribute('idx')
  const idx = idxAttr ? parseInt(idxAttr) : 0
  const site = CARDINAL_SITES[idx] ?? 'center'
  return { elementId, site }
}

export function extractConnectorElements(
  slideXml: Document,
  theme: OoxmlTheme | undefined,
  shapeIdRegistry?: OoxmlShapeIdRegistry
): ConnectorElement[] {
  const elements: ConnectorElement[] = []
  const connectors = slideXml.getElementsByTagName('p:cxnSp')

  for (let i = 0; i < connectors.length; i++) {
    const cxnSp = connectors[i]
    if (isInsideGroup(cxnSp)) continue

    const spPr = getChild(cxnSp, 'p:spPr')
    if (!spPr) continue

    const xfrm = getChild(spPr, 'a:xfrm')
    if (!xfrm) continue

    const transform = extractTransform(cxnSp)
    if (!transform) continue

    const { start, end } = resolveEndpoints(xfrm, transform.x, transform.y, transform.cx, transform.cy)

    const prstGeom = getChild(spPr, 'a:prstGeom')
    const preset = prstGeom?.getAttribute('prst') || 'line'
    const lineType: ConnectorLineType = PRESET_TO_LINE_TYPE[preset] || 'straight'

    let strokeColor = '#64748b'
    let strokeWidth = 2
    let strokeStyle: ConnectorElement['strokeStyle'] = 'solid'
    let endArrow = true
    let startArrow = false

    const ln = getChild(spPr, 'a:ln')
    if (ln) {
      const lnW = ln.getAttribute('w')
      if (lnW) strokeWidth = Math.max(1, Math.round(emuToPixels(parseInt(lnW))))

      const lnSolidFill = getChild(ln, 'a:solidFill')
      if (lnSolidFill) {
        const color = parseSolidFill(lnSolidFill, theme)
        if (color) strokeColor = color
      }

      const prstDash = getChild(ln, 'a:prstDash')
      if (prstDash) {
        const dashVal = prstDash.getAttribute('val') || 'solid'
        strokeStyle = DASH_MAP[dashVal] || 'solid'
      }

      const tailEnd = getChild(ln, 'a:tailEnd')
      if (tailEnd) {
        const type = tailEnd.getAttribute('type')
        endArrow = !!type && type !== 'none'
      }
      const headEnd = getChild(ln, 'a:headEnd')
      if (headEnd) {
        const type = headEnd.getAttribute('type')
        startArrow = !!type && type !== 'none'
      }
    }

    // Endpoint bindings live on the non-visual connector properties, not on
    // p:spPr. When either side is glued to a shape we capture it so
    // downstream connector refresh logic (shapeOperations#refreshConnectorFromBindings)
    // can re-snap the endpoint whenever the target shape is moved or resized.
    const nvCxnSpPr = getChild(cxnSp, 'p:nvCxnSpPr')
    const cNvCxnSpPr = nvCxnSpPr ? getChild(nvCxnSpPr, 'p:cNvCxnSpPr') : undefined
    const startBinding = parseCxnRef(cNvCxnSpPr, 'a:stCxn', shapeIdRegistry)
    const endBinding = parseCxnRef(cNvCxnSpPr, 'a:endCxn', shapeIdRegistry)

    elements.push(
      createConnectorElement(start, end, {
        id: nextImportUid('connector-import'),
        lineType,
        strokeColor,
        strokeWidth,
        strokeStyle,
        endArrow,
        startArrow,
        ...(startBinding ? { startBinding } : {}),
        ...(endBinding ? { endBinding } : {})
      })
    )
  }

  return elements
}
