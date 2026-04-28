import { flattenGroupedShapes } from '../flattenGroups'
import { parseXML } from '../ooxmlUtils'
import type { OoxmlTheme, SlideRelationships } from '../types'
import type { ParserMessage } from '../../usePowerPointParser'
import type { ImageElement, TextElement } from '../../../components/slideElements'

const theme: OoxmlTheme = {
  colors: new Map([['accent1', '#4472C4']]),
  majorFont: 'Calibri Light',
  minorFont: 'Calibri'
}

const emptyRels: SlideRelationships = {
  images: new Map(),
  hyperlinks: new Map(),
  chartPaths: new Map()
}

function wrapInSpTree(inner: string): Document {
  return parseXML(`
    <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
           xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
           xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <p:cSld><p:spTree>${inner}</p:spTree></p:cSld>
    </p:sld>
  `)
}

describe('flattenGroupedShapes', () => {
  it('flattens a single group and transforms children into slide-absolute coordinates', () => {
    const xml = wrapInSpTree(`
      <p:grpSp>
        <p:grpSpPr>
          <a:xfrm>
            <a:off x="914400" y="457200"/>
            <a:ext cx="1828800" cy="914400"/>
            <a:chOff x="0" y="0"/>
            <a:chExt cx="1828800" cy="914400"/>
          </a:xfrm>
        </p:grpSpPr>
        <p:sp>
          <p:spPr>
            <a:xfrm>
              <a:off x="0" y="0"/>
              <a:ext cx="914400" cy="457200"/>
            </a:xfrm>
          </p:spPr>
          <p:txBody>
            <a:p><a:r><a:t>Grouped label</a:t></a:r></a:p>
          </p:txBody>
        </p:sp>
      </p:grpSp>
    `)

    const messages: ParserMessage[] = []
    const elements = flattenGroupedShapes(xml, theme, emptyRels, new Map(), messages, 0)

    expect(elements).toHaveLength(1)
    const txt = elements[0] as TextElement
    expect(txt.content).toBe('Grouped label')
    expect(txt.position.x).toBeCloseTo(96, 0)
    expect(txt.position.y).toBeCloseTo(48, 0)

    expect(messages.some(m => m.message === 'parser-group-flattened')).toBe(true)
  })

  it('flattens nested groups into the top-level slide coordinate space', () => {
    // Outer group is 1" x 1" starting at origin. Inner group is ½" x ½"
    // starting at the same origin. The inner shape fills the inner group.
    // Result: one TextElement at (0,0) sized 48x48 px (½" at 96 DPI).
    const xml = wrapInSpTree(`
      <p:grpSp>
        <p:grpSpPr>
          <a:xfrm>
            <a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/>
            <a:chOff x="0" y="0"/><a:chExt cx="914400" cy="914400"/>
          </a:xfrm>
        </p:grpSpPr>
        <p:grpSp>
          <p:grpSpPr>
            <a:xfrm>
              <a:off x="0" y="0"/><a:ext cx="457200" cy="457200"/>
              <a:chOff x="0" y="0"/><a:chExt cx="457200" cy="457200"/>
            </a:xfrm>
          </p:grpSpPr>
          <p:sp>
            <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="457200" cy="457200"/></a:xfrm></p:spPr>
            <p:txBody><a:p><a:r><a:t>Nested</a:t></a:r></a:p></p:txBody>
          </p:sp>
        </p:grpSp>
      </p:grpSp>
    `)

    const messages: ParserMessage[] = []
    const elements = flattenGroupedShapes(xml, theme, emptyRels, new Map(), messages, 0)
    expect(elements).toHaveLength(1)
    const el = elements[0] as TextElement
    expect(el.content).toBe('Nested')
    expect(el.position.x).toBeCloseTo(0, 0)
    expect(el.position.y).toBeCloseTo(0, 0)
    expect(el.size.width).toBeCloseTo(48, 0)
    expect(el.size.height).toBeCloseTo(48, 0)
  })

  it('composes group rotation onto children', () => {
    // Group is rotated 90° clockwise (5,400,000 OOXML units). The child sits
    // at the group's upper-left and should keep its own local width/height,
    // but its rotation should pick up the group rotation.
    const xml = wrapInSpTree(`
      <p:grpSp>
        <p:grpSpPr>
          <a:xfrm rot="5400000">
            <a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/>
            <a:chOff x="0" y="0"/><a:chExt cx="914400" cy="914400"/>
          </a:xfrm>
        </p:grpSpPr>
        <p:sp>
          <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="457200" cy="457200"/></a:xfrm></p:spPr>
          <p:txBody><a:p><a:r><a:t>Rot</a:t></a:r></a:p></p:txBody>
        </p:sp>
      </p:grpSp>
    `)

    const messages: ParserMessage[] = []
    const elements = flattenGroupedShapes(xml, theme, emptyRels, new Map(), messages, 0)
    expect(elements).toHaveLength(1)
    const el = elements[0] as TextElement
    expect(el.rotation).toBe(90)
  })

  it('propagates group flipH onto imported shape importMeta', () => {
    const xml = wrapInSpTree(`
      <p:grpSp>
        <p:grpSpPr>
          <a:xfrm flipH="1">
            <a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/>
            <a:chOff x="0" y="0"/><a:chExt cx="914400" cy="914400"/>
          </a:xfrm>
        </p:grpSpPr>
        <p:sp>
          <p:spPr>
            <a:xfrm><a:off x="0" y="0"/><a:ext cx="457200" cy="457200"/></a:xfrm>
            <a:prstGeom prst="rightArrow"/>
            <a:solidFill><a:srgbClr val="112233"/></a:solidFill>
          </p:spPr>
        </p:sp>
      </p:grpSp>
    `)
    const messages: ParserMessage[] = []
    const elements = flattenGroupedShapes(xml, theme, emptyRels, new Map(), messages, 0)
    expect(elements).toHaveLength(1)
    const shape = elements[0] as { type: string; importMeta?: { flipH?: boolean; prst?: string } }
    expect(shape.type).toBe('shape')
    expect(shape.importMeta?.prst).toBe('rightArrow')
    expect(shape.importMeta?.flipH).toBe(true)
  })

  it('emits info message exactly once per slide when multiple groups are present', () => {
    const xml = wrapInSpTree(`
      <p:grpSp>
        <p:grpSpPr>
          <a:xfrm>
            <a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/>
            <a:chOff x="0" y="0"/><a:chExt cx="914400" cy="914400"/>
          </a:xfrm>
        </p:grpSpPr>
        <p:sp>
          <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="457200" cy="457200"/></a:xfrm></p:spPr>
          <p:txBody><a:p><a:r><a:t>A</a:t></a:r></a:p></p:txBody>
        </p:sp>
      </p:grpSp>
      <p:grpSp>
        <p:grpSpPr>
          <a:xfrm>
            <a:off x="914400" y="0"/><a:ext cx="914400" cy="914400"/>
            <a:chOff x="0" y="0"/><a:chExt cx="914400" cy="914400"/>
          </a:xfrm>
        </p:grpSpPr>
        <p:sp>
          <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="457200" cy="457200"/></a:xfrm></p:spPr>
          <p:txBody><a:p><a:r><a:t>B</a:t></a:r></a:p></p:txBody>
        </p:sp>
      </p:grpSp>
    `)

    const messages: ParserMessage[] = []
    const elements = flattenGroupedShapes(xml, theme, emptyRels, new Map(), messages, 0)
    expect(elements).toHaveLength(2)
    const infoCount = messages.filter(m => m.message === 'parser-group-flattened').length
    expect(infoCount).toBe(1)
  })

  it('dims duplicated background pictures inside groups after group transforms are applied', () => {
    const onePxPng =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0uoAAAAASUVORK5CYII='
    const rels: SlideRelationships = {
      images: new Map([
        ['rId1', 'ppt/media/galaxy.png'],
        ['rId2', 'ppt/media/galaxy.png']
      ]),
      hyperlinks: new Map(),
      chartPaths: new Map()
    }
    const imageData = new Map([['ppt/media/galaxy.png', onePxPng]])
    const xml = wrapInSpTree(`
      <p:grpSp>
        <p:grpSpPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="12192000" cy="6858000"/>
            <a:chOff x="0" y="0"/>
            <a:chExt cx="12192000" cy="6858000"/>
          </a:xfrm>
        </p:grpSpPr>
        <p:pic>
          <p:nvPicPr/>
          <p:blipFill><a:blip r:embed="rId1"/></p:blipFill>
          <p:spPr>
            <a:xfrm>
              <a:off x="0" y="1905000"/>
              <a:ext cx="6858000" cy="4762500"/>
            </a:xfrm>
          </p:spPr>
        </p:pic>
        <p:pic>
          <p:nvPicPr/>
          <p:blipFill><a:blip r:embed="rId2"/></p:blipFill>
          <p:spPr>
            <a:xfrm>
              <a:off x="5143500" y="1905000"/>
              <a:ext cx="6858000" cy="4762500"/>
            </a:xfrm>
          </p:spPr>
        </p:pic>
      </p:grpSp>
    `)

    const elements = flattenGroupedShapes(xml, theme, rels, imageData, [], 0)
    expect(elements).toHaveLength(2)
    const images = elements as ImageElement[]
    expect(images.every(image => image.type === 'image')).toBe(true)
    expect(images[0].opacity).toBe(0.5)
    expect(images[1].opacity).toBe(0.5)
  })

  it('dims large duplicated decorative strips inside groups even below full-slide coverage', () => {
    const onePxPng =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0uoAAAAASUVORK5CYII='
    const rels: SlideRelationships = {
      images: new Map([
        ['rId1', 'ppt/media/nebula.png'],
        ['rId2', 'ppt/media/nebula.png']
      ]),
      hyperlinks: new Map(),
      chartPaths: new Map()
    }
    const imageData = new Map([['ppt/media/nebula.png', onePxPng]])
    const xml = wrapInSpTree(`
      <p:grpSp>
        <p:grpSpPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="12192000" cy="6858000"/>
            <a:chOff x="0" y="0"/>
            <a:chExt cx="12192000" cy="6858000"/>
          </a:xfrm>
        </p:grpSpPr>
        <p:pic>
          <p:nvPicPr/>
          <p:blipFill><a:blip r:embed="rId1"/></p:blipFill>
          <p:spPr>
            <a:xfrm>
              <a:off x="3048000" y="2127250"/>
              <a:ext cx="3476625" cy="2460625"/>
            </a:xfrm>
          </p:spPr>
        </p:pic>
        <p:pic>
          <p:nvPicPr/>
          <p:blipFill><a:blip r:embed="rId2"/></p:blipFill>
          <p:spPr>
            <a:xfrm>
              <a:off x="3048000" y="4445000"/>
              <a:ext cx="3476625" cy="2460625"/>
            </a:xfrm>
          </p:spPr>
        </p:pic>
      </p:grpSp>
    `)

    const elements = flattenGroupedShapes(xml, theme, rels, imageData, [], 0)
    expect(elements).toHaveLength(2)
    const images = elements as ImageElement[]
    expect(images.every(image => image.type === 'image')).toBe(true)
    expect(images[0].opacity).toBe(0.5)
    expect(images[1].opacity).toBe(0.5)
  })
})
