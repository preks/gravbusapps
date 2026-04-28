import JSZip from 'jszip'
import { assembleSlide } from '../assembleSlide'
import { parseXML } from '../ooxmlUtils'
import type { SlideRelationships, OoxmlTheme } from '../types'
import type { ParserMessage } from '../../usePowerPointParser'
import type { TextElement, ShapeElement, ConnectorElement } from '../../../components/slideElements'

const theme: OoxmlTheme = {
  colors: new Map([['accent1', '#4472C4']]),
  majorFont: 'Calibri Light',
  minorFont: 'Calibri'
}

function slideXml(spTreeInner: string): Document {
  return parseXML(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld><p:spTree>${spTreeInner}</p:spTree></p:cSld>
</p:sld>`)
}

const emptyRels: SlideRelationships = {
  images: new Map(),
  hyperlinks: new Map(),
  chartPaths: new Map()
}

describe('assembleSlide', () => {
  it('assigns sequential zIndex and preserves document order', async () => {
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm>
          <a:prstGeom prst="rect"/>
        </p:spPr>
        <p:txBody/>
      </p:sp>
      <p:sp>
        <p:spPr>
          <a:xfrm><a:off x="914400" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:p><a:r><a:t>Later element</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    `)

    const messages: ParserMessage[] = []
    const slide = await assembleSlide(xml, emptyRels, new Map(), theme, new JSZip(), 0, messages)

    expect(slide.elements.length).toBe(2)
    expect(slide.elements[0].zIndex).toBe(1)
    expect(slide.elements[1].zIndex).toBe(2)

    const [first, second] = slide.elements
    expect(first.type).toBe('shape')
    expect((second as TextElement).content).toBe('Later element')
  })

  it('decorates slide with PPTX source metadata when layout path is present', async () => {
    const xml = slideXml(`
      <p:sp>
        <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm></p:spPr>
        <p:txBody><a:p><a:r><a:t>Body</a:t></a:r></a:p></p:txBody>
      </p:sp>
    `)

    const zip = new JSZip()
    const rels: SlideRelationships = {
      images: new Map(),
      hyperlinks: new Map(),
      chartPaths: new Map(),
      layoutPath: 'ppt/slideLayouts/slideLayout5.xml'
    }

    const slide = await assembleSlide(xml, rels, new Map(), theme, zip, 0, [])
    expect(slide.source?.sourceFormat).toBe('pptx')
    expect(slide.source?.layoutName).toBe('slideLayout5')
  })

  it('dispatches to connector extractor for p:cxnSp children', async () => {
    const xml = slideXml(`
      <p:cxnSp>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="914400" cy="0"/>
          </a:xfrm>
          <a:prstGeom prst="line"/>
        </p:spPr>
      </p:cxnSp>
    `)

    const slide = await assembleSlide(xml, emptyRels, new Map(), theme, new JSZip(), 0, [])
    expect(slide.elements).toHaveLength(1)
    expect(slide.elements[0].type).toBe('connector')
    expect((slide.elements[0] as ConnectorElement).lineType).toBe('straight')
  })

  it('falls back to shape extraction when text body is empty', async () => {
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm>
          <a:prstGeom prst="ellipse"/>
          <a:solidFill><a:srgbClr val="FF0000"/></a:solidFill>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p/>
        </p:txBody>
      </p:sp>
    `)

    const slide = await assembleSlide(xml, emptyRels, new Map(), theme, new JSZip(), 0, [])
    expect(slide.elements).toHaveLength(1)
    const shape = slide.elements[0] as ShapeElement
    expect(shape.type).toBe('shape')
    expect(shape.shapeType).toBe('circle')
  })

  it('imports explicit PowerPoint text boxes as text elements even when they have rect geometry', async () => {
    const xml = slideXml(`
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="1" name="TextBox 1"/>
          <p:cNvSpPr txBox="1"/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="1828800" cy="914400"/></a:xfrm>
          <a:prstGeom prst="rect"/>
          <a:solidFill><a:srgbClr val="5BC3E1"/></a:solidFill>
        </p:spPr>
        <p:txBody>
          <a:p><a:r><a:t>Text box content</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    `)

    const slide = await assembleSlide(xml, emptyRels, new Map(), theme, new JSZip(), 0, [])
    expect(slide.elements).toHaveLength(1)
    expect(slide.elements[0].type).toBe('text')
    expect((slide.elements[0] as TextElement).content).toBe('Text box content')
    expect((slide.elements[0] as TextElement).backgroundColor).toBe('#5BC3E1')
  })

  it('preserves decorated PowerPoint text boxes as shape elements with shapeText', async () => {
    const xml = slideXml(`
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="1" name="Styled TextBox 1"/>
          <p:cNvSpPr txBox="1"/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="1828800" cy="914400"/></a:xfrm>
          <a:prstGeom prst="roundRect"/>
          <a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>
          <a:ln w="25400"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln>
          <a:effectLst>
            <a:outerShdw blurRad="190500" dist="63500" dir="5400000" algn="t" rotWithShape="0">
              <a:prstClr val="black"><a:alpha val="15000"/></a:prstClr>
            </a:outerShdw>
          </a:effectLst>
        </p:spPr>
        <p:txBody>
          <a:bodyPr anchor="ctr"/>
          <a:p><a:r><a:t>Styled text box</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    `)

    const slide = await assembleSlide(xml, emptyRels, new Map(), theme, new JSZip(), 0, [])
    expect(slide.elements).toHaveLength(1)
    expect(slide.elements[0].type).toBe('shape')
    expect((slide.elements[0] as ShapeElement).shapeType).toBe('rounded-rectangle')
    expect((slide.elements[0] as ShapeElement).shapeText?.content).toBe('Styled text box')
    expect((slide.elements[0] as ShapeElement).shapeText?.allowOverflow).toBe(true)
    expect((slide.elements[0] as ShapeElement).strokeWidth).toBeGreaterThan(0)
    expect((slide.elements[0] as ShapeElement).effects?.outerShadow).toBeDefined()
  })

  it('keeps an empty explicit text box when it still has a visible filled layer', async () => {
    const xml = slideXml(`
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="1" name="TextBox 2"/>
          <p:cNvSpPr txBox="1"/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="914400" y="914400"/><a:ext cx="1828800" cy="914400"/></a:xfrm>
          <a:prstGeom prst="rect"/>
          <a:solidFill><a:srgbClr val="FFFFFF"><a:alpha val="65000"/></a:srgbClr></a:solidFill>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p/>
        </p:txBody>
      </p:sp>
    `)

    const slide = await assembleSlide(xml, emptyRels, new Map(), theme, new JSZip(), 0, [])
    expect(slide.elements).toHaveLength(1)
    expect(slide.elements[0].type).toBe('shape')
    expect((slide.elements[0] as ShapeElement).fill).toBe('rgba(255, 255, 255, 0.650)')
  })

  it('returns empty elements and preserves background when slide body is empty', async () => {
    const xml = slideXml('')
    const slide = await assembleSlide(xml, emptyRels, new Map(), theme, new JSZip(), 2, [])
    expect(slide.elements).toHaveLength(0)
    expect(slide.background).toBeDefined()
    expect(slide.id).toContain('slide-')
  })
})
