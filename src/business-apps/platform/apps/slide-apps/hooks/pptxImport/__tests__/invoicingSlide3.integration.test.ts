// Integration-style smoke test that exercises the import pipeline against
// the actual `slide3.xml` fragment from the "Invoicing" deck. It documents
// what PowerPoint authored on that slide and pins down the editor's
// interpretation so future regressions (color, text layout, connector
// binding) fail loudly with a concrete expected value.

import { extractShapeElements } from '../extractShapes'
import { extractConnectorElements } from '../extractConnectors'
import { parseXML } from '../ooxmlUtils'
import type { OoxmlTheme, SlideRelationships } from '../types'
import type { ParserMessage } from '../../usePowerPointParser'
import type { ShapeElement } from '../../../components/slideElements'

// Theme colors captured verbatim from `ppt/theme/theme1.xml` of the deck.
const invoicingTheme: OoxmlTheme = {
  colors: new Map([
    ['dk1', '#000000'],
    ['lt1', '#FFFFFF'],
    ['dk2', '#0E1537'],
    ['lt2', '#F5A400'],
    ['accent1', '#63BCE1'],
    ['accent2', '#648ECA'],
    ['accent3', '#376399'],
    ['accent4', '#A2519A'],
    ['accent5', '#C92559'],
    ['accent6', '#DB4315']
  ]),
  majorFont: 'Inter',
  minorFont: 'Inter'
}

const emptyRels: SlideRelationships = { images: new Map(), hyperlinks: new Map(), chartPaths: new Map() }

// Trimmed slide fragment — same shapes/connectors as the real file but
// without the a16 creationId GUIDs that do not influence import.
const SLIDE3_XML = `
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Arrow: Chevron 1"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="1403927" y="2364510"/><a:ext cx="2780146" cy="1005840"/></a:xfrm>
          <a:prstGeom prst="snip2DiagRect"><a:avLst/></a:prstGeom>
          <a:solidFill><a:schemeClr val="accent5"/></a:solidFill>
          <a:ln><a:noFill/></a:ln>
        </p:spPr>
        <p:style>
          <a:lnRef idx="2"><a:schemeClr val="accent1"><a:shade val="50000"/></a:schemeClr></a:lnRef>
          <a:fillRef idx="1"><a:schemeClr val="accent1"/></a:fillRef>
          <a:effectRef idx="0"><a:schemeClr val="accent1"/></a:effectRef>
          <a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef>
        </p:style>
        <p:txBody>
          <a:bodyPr rtlCol="0" anchor="ctr"/>
          <a:lstStyle/>
          <a:p><a:pPr algn="ctr"/>
            <a:r><a:rPr lang="en-US"><a:solidFill><a:schemeClr val="bg1"/></a:solidFill></a:rPr><a:t>Quotes</a:t></a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="4" name="Arrow: Chevron 3"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="4308763" y="2364510"/><a:ext cx="2780146" cy="969818"/></a:xfrm>
          <a:prstGeom prst="chevron"><a:avLst/></a:prstGeom>
          <a:solidFill><a:schemeClr val="tx2"/></a:solidFill>
        </p:spPr>
        <p:txBody>
          <a:bodyPr rtlCol="0" anchor="ctr"/>
          <a:p><a:pPr algn="ctr"/>
            <a:r><a:rPr lang="en-US"><a:solidFill><a:schemeClr val="bg1"/></a:solidFill></a:rPr><a:t>Sales Orders</a:t></a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="5" name="Arrow: Chevron 4"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="7213599" y="2364510"/><a:ext cx="2780146" cy="969818"/></a:xfrm>
          <a:prstGeom prst="chevron"><a:avLst/></a:prstGeom>
          <a:solidFill><a:schemeClr val="tx2"/></a:solidFill>
        </p:spPr>
        <p:txBody>
          <a:bodyPr rtlCol="0" anchor="ctr"/>
          <a:p><a:pPr algn="ctr"/>
            <a:r><a:rPr lang="en-US"><a:solidFill><a:schemeClr val="bg1"/></a:solidFill></a:rPr><a:t>Invoices</a:t></a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="6" name="Rectangle: Rounded Corners 5"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="4246418" y="4708838"/><a:ext cx="2904836" cy="794328"/></a:xfrm>
          <a:prstGeom prst="roundRect"><a:avLst/></a:prstGeom>
          <a:solidFill><a:schemeClr val="tx2"/></a:solidFill>
        </p:spPr>
        <p:txBody>
          <a:bodyPr rtlCol="0" anchor="ctr"/>
          <a:p><a:pPr algn="ctr"/>
            <a:r><a:rPr lang="en-US"/><a:t>Products</a:t></a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:cxnSp>
        <p:nvCxnSpPr>
          <p:cNvPr id="11" name="Straight Arrow Connector 10"/>
          <p:cNvCxnSpPr><a:stCxn id="6" idx="0"/></p:cNvCxnSpPr>
          <p:nvPr/>
        </p:nvCxnSpPr>
        <p:spPr>
          <a:xfrm flipV="1"><a:off x="5698836" y="3334328"/><a:ext cx="0" cy="1374510"/></a:xfrm>
          <a:prstGeom prst="straightConnector1"><a:avLst/></a:prstGeom>
          <a:ln w="19050"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:tailEnd type="triangle"/></a:ln>
        </p:spPr>
      </p:cxnSp>
    </p:spTree>
  </p:cSld>
</p:sld>
`

describe('Invoicing slide 3 import (integration)', () => {
  const xml = parseXML(SLIDE3_XML)
  const messages: ParserMessage[] = []
  const shapes = extractShapeElements(xml, invoicingTheme, messages, 2, emptyRels)

  it('imports all four shapes (Quotes + two chevrons + Products box)', () => {
    expect(shapes).toHaveLength(4)
  })

  it('imports Quotes as a snip2DiagRect (rectangle with diagonal corner snips) filled in accent5 pink (#C92559)', () => {
    const quotes = shapes.find(s => s.shapeText?.content?.includes('Quotes')) as ShapeElement
    expect(quotes).toBeDefined()
    expect(quotes.geometry?.prst).toBe('snip2DiagRect')
    expect(quotes.fill.toUpperCase()).toBe('#C92559')
    // Must be a rectangle (no chevron fallback), so the Office renderer
    // treats it as a rectangle variant rather than an arrow.
    expect(quotes.shapeType).toBe('rectangle')
  })

  it('resolves tx2 scheme color on the remaining two chevrons to the theme dk2 value (#0E1537)', () => {
    const chevrons = shapes.filter(s => s.geometry?.prst === 'chevron')
    expect(chevrons).toHaveLength(2)
    for (const chevron of chevrons) {
      expect(chevron.fill.toUpperCase()).toBe('#0E1537')
    }
  })

  it('retains original chevron preset metadata on Sales Orders / Invoices', () => {
    const chevrons = shapes.filter(s => s.geometry?.prst === 'chevron')
    expect(chevrons.map(c => c.shapeText?.content)).toEqual(expect.arrayContaining(['Sales Orders', 'Invoices']))
  })

  it('resolves chevron in-shape label text color from bg1 scheme (=> white)', () => {
    const chevrons = shapes.filter(s => s.geometry?.prst === 'chevron') as ShapeElement[]
    for (const chevron of chevrons) {
      expect(chevron.shapeText?.content).toBeTruthy()
      // Per-run bg1 fill must override the default dk1 fallback so labels
      // are readable against the dark chevron body.
      expect(chevron.shapeText?.color?.toUpperCase()).toBe('#FFFFFF')
    }
  })

  it('centers chevron labels vertically via bodyPr anchor="ctr"', () => {
    const chevrons = shapes.filter(s => s.geometry?.prst === 'chevron') as ShapeElement[]
    for (const chevron of chevrons) {
      expect(chevron.shapeText?.verticalAlign).toBe('middle')
    }
  })

  it('binds connector start endpoints to their target shape via <a:stCxn>', () => {
    // Build a shape-id registry just like assembleSlide does so the connector
    // extractor can resolve OOXML id=6 (Products) to its generated element id.
    const registry = new Map<string, string>()
    // Register by index since the helper normally does this during
    // assembleSlide; we call the connector extractor directly here.
    const productsShape = shapes[3]
    registry.set('6', productsShape.id)

    const connectors = extractConnectorElements(xml, invoicingTheme, registry)
    expect(connectors).toHaveLength(1)
    expect(connectors[0].startBinding?.elementId).toBe(productsShape.id)
    expect(connectors[0].startBinding?.site).toBe('top')
    expect(connectors[0].endBinding).toBeUndefined()
  })
})
