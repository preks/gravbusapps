import { extractConnectorElements } from '../extractConnectors'
import { parseXML } from '../ooxmlUtils'
import type { OoxmlTheme } from '../types'

const theme: OoxmlTheme = {
  colors: new Map([['accent1', '#4472C4']]),
  majorFont: 'Calibri Light',
  minorFont: 'Calibri'
}

function slideXml(spXml: string): Document {
  return parseXML(`
    <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
           xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <p:cSld><p:spTree>${spXml}</p:spTree></p:cSld>
    </p:sld>
  `)
}

describe('extractConnectorElements', () => {
  it('extracts straight connector with default arrow', () => {
    const xml = slideXml(`
      <p:cxnSp>
        <p:nvCxnSpPr/>
        <p:spPr>
          <a:xfrm>
            <a:off x="914400" y="457200"/>
            <a:ext cx="1828800" cy="0"/>
          </a:xfrm>
          <a:prstGeom prst="straightConnector1"/>
        </p:spPr>
      </p:cxnSp>
    `)

    const connectors = extractConnectorElements(xml, theme)
    expect(connectors).toHaveLength(1)
    expect(connectors[0].lineType).toBe('straight')
    expect(connectors[0].strokeStyle).toBe('solid')
    expect(connectors[0].endArrow).toBe(true)
    expect(connectors[0].startPoint.x).toBeCloseTo(96, 0)
    expect(connectors[0].endPoint.x).toBeCloseTo(288, 0)
  })

  it('maps bent connectors to elbow line type', () => {
    const xml = slideXml(`
      <p:cxnSp>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="914400" cy="914400"/>
          </a:xfrm>
          <a:prstGeom prst="bentConnector3"/>
        </p:spPr>
      </p:cxnSp>
    `)

    const connectors = extractConnectorElements(xml, theme)
    expect(connectors[0].lineType).toBe('elbow')
  })

  it('honors flip attributes when resolving endpoints', () => {
    const xml = slideXml(`
      <p:cxnSp>
        <p:spPr>
          <a:xfrm flipH="1">
            <a:off x="0" y="0"/>
            <a:ext cx="914400" cy="0"/>
          </a:xfrm>
          <a:prstGeom prst="line"/>
        </p:spPr>
      </p:cxnSp>
    `)

    const connectors = extractConnectorElements(xml, theme)
    expect(connectors[0].startPoint.x).toBeGreaterThan(connectors[0].endPoint.x)
  })

  it('parses stroke color from theme scheme color', () => {
    const xml = slideXml(`
      <p:cxnSp>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="914400" cy="0"/>
          </a:xfrm>
          <a:prstGeom prst="line"/>
          <a:ln w="38100">
            <a:solidFill><a:schemeClr val="accent1"/></a:solidFill>
            <a:prstDash val="dash"/>
            <a:tailEnd type="none"/>
          </a:ln>
        </p:spPr>
      </p:cxnSp>
    `)

    const connectors = extractConnectorElements(xml, theme)
    expect(connectors[0].strokeColor).toBe('#4472C4')
    expect(connectors[0].strokeStyle).toBe('dashed')
    expect(connectors[0].strokeWidth).toBeGreaterThanOrEqual(4)
    expect(connectors[0].endArrow).toBe(false)
  })

  it('translates <a:stCxn>/<a:endCxn> references into startBinding/endBinding', () => {
    // Given two shapes (ids 42 and 43) we expect the connector to record
    // bindings pointing to our internal element ids instead of only absolute
    // endpoint coordinates. This is the hook that lets connectors stay glued
    // to shapes as they are moved or resized.
    const xml = slideXml(`
      <p:cxnSp>
        <p:nvCxnSpPr>
          <p:cNvPr id="50" name="Straight Arrow Connector 50"/>
          <p:cNvCxnSpPr>
            <a:stCxn id="42" idx="1"/>
            <a:endCxn id="43" idx="3"/>
          </p:cNvCxnSpPr>
          <p:nvPr/>
        </p:nvCxnSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="914400" y="457200"/>
            <a:ext cx="914400" cy="0"/>
          </a:xfrm>
          <a:prstGeom prst="straightConnector1"/>
        </p:spPr>
      </p:cxnSp>
    `)

    const registry = new Map<string, string>([
      ['42', 'shape-start-id'],
      ['43', 'shape-end-id']
    ])

    const connectors = extractConnectorElements(xml, theme, registry)
    expect(connectors).toHaveLength(1)
    expect(connectors[0].startBinding).toEqual({ elementId: 'shape-start-id', site: 'right' })
    expect(connectors[0].endBinding).toEqual({ elementId: 'shape-end-id', site: 'left' })
  })

  it('drops binding when the referenced OOXML id is unknown in the registry', () => {
    // A connector to a shape that was not imported (e.g. dropped for being
    // invisible) must not fabricate a bogus binding — the endpoint falls
    // back to absolute coordinates so the connector still renders.
    const xml = slideXml(`
      <p:cxnSp>
        <p:nvCxnSpPr>
          <p:cNvPr id="60" name="Connector"/>
          <p:cNvCxnSpPr>
            <a:stCxn id="999" idx="0"/>
          </p:cNvCxnSpPr>
          <p:nvPr/>
        </p:nvCxnSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="914400" cy="0"/>
          </a:xfrm>
          <a:prstGeom prst="line"/>
        </p:spPr>
      </p:cxnSp>
    `)

    const connectors = extractConnectorElements(xml, theme, new Map())
    expect(connectors[0].startBinding).toBeUndefined()
    expect(connectors[0].endBinding).toBeUndefined()
  })

  it('skips connectors without a transform', () => {
    const xml = slideXml(`
      <p:cxnSp>
        <p:spPr><a:prstGeom prst="line"/></p:spPr>
      </p:cxnSp>
    `)
    const connectors = extractConnectorElements(xml, theme)
    expect(connectors).toHaveLength(0)
  })
})
