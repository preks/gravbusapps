import { extractImageElements } from '../extractImages'
import { parseXML } from '../ooxmlUtils'
import type { SlideRelationships } from '../types'

function slideXml(spXml: string): Document {
  return parseXML(`
    <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
           xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
           xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
           xmlns:asvg="http://schemas.microsoft.com/office/drawing/2016/SVG/main">
      <p:cSld><p:spTree>${spXml}</p:spTree></p:cSld>
    </p:sld>
  `)
}

describe('extractImageElements', () => {
  const relationships: SlideRelationships = {
    images: new Map([['rId2', 'ppt/media/image1.png']]),
    hyperlinks: new Map(),
    chartPaths: new Map()
  }
  const imageData = new Map<string, string>([['image1.png', 'data:image/png;base64,AAA']])

  it('extracts a single picture with position, size, and src', () => {
    const xml = slideXml(`
      <p:pic>
        <p:nvPicPr/>
        <p:blipFill>
          <a:blip r:embed="rId2"/>
        </p:blipFill>
        <p:spPr>
          <a:xfrm>
            <a:off x="914400" y="457200"/>
            <a:ext cx="1828800" cy="914400"/>
          </a:xfrm>
        </p:spPr>
      </p:pic>
    `)

    const images = extractImageElements(xml, relationships, imageData)
    expect(images).toHaveLength(1)
    expect(images[0].src).toBe('data:image/png;base64,AAA')
    expect(images[0].position.x).toBeCloseTo(96, 0)
    expect(images[0].position.y).toBeCloseTo(48, 0)
    expect(images[0].size.width).toBeCloseTo(192, 0)
    expect(images[0].size.height).toBeCloseTo(96, 0)
    expect(images[0].objectFit).toBe('cover')
  })

  it('ignores pictures without a blip', () => {
    const xml = slideXml(`
      <p:pic>
        <p:blipFill/>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="914400" cy="914400"/>
          </a:xfrm>
        </p:spPr>
      </p:pic>
    `)
    expect(extractImageElements(xml, relationships, imageData)).toHaveLength(0)
  })

  it('ignores pictures whose relationship id is unknown', () => {
    const xml = slideXml(`
      <p:pic>
        <p:blipFill><a:blip r:embed="rIdMissing"/></p:blipFill>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="914400" cy="914400"/>
          </a:xfrm>
        </p:spPr>
      </p:pic>
    `)
    expect(extractImageElements(xml, relationships, imageData)).toHaveLength(0)
  })

  it('resolves embedded images when the relationship path is absolute or URI-escaped', () => {
    const xml = slideXml(`
      <p:pic>
        <p:blipFill><a:blip r:embed="rId2"/></p:blipFill>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="914400" cy="914400"/>
          </a:xfrm>
        </p:spPr>
      </p:pic>
    `)

    const absoluteEncodedRelationships: SlideRelationships = {
      images: new Map([['rId2', '/ppt/media/Brand%20Hero.png']]),
      hyperlinks: new Map(),
      chartPaths: new Map()
    }
    const packagePathMedia = new Map<string, string>([['ppt/media/Brand Hero.png', 'data:image/png;base64,BBB']])

    const images = extractImageElements(xml, absoluteEncodedRelationships, packagePathMedia)
    expect(images).toHaveLength(1)
    expect(images[0].src).toBe('data:image/png;base64,BBB')
  })

  it('preserves linked external image URLs', () => {
    const xml = slideXml(`
      <p:pic>
        <p:blipFill><a:blip r:link="rIdLinked"/></p:blipFill>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="914400" cy="914400"/>
          </a:xfrm>
        </p:spPr>
      </p:pic>
    `)

    const linkedRelationships: SlideRelationships = {
      images: new Map([['rIdLinked', 'https://example.com/linked-image.png']]),
      hyperlinks: new Map(),
      chartPaths: new Map()
    }

    const images = extractImageElements(xml, linkedRelationships, imageData)
    expect(images).toHaveLength(1)
    expect(images[0].src).toBe('https://example.com/linked-image.png')
  })

  it('ignores pictures nested inside groups (flattenGroups handles those)', () => {
    const xml = slideXml(`
      <p:grpSp>
        <p:grpSpPr><a:xfrm>
          <a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/>
          <a:chOff x="0" y="0"/><a:chExt cx="914400" cy="914400"/>
        </a:xfrm></p:grpSpPr>
        <p:pic>
          <p:blipFill><a:blip r:embed="rId2"/></p:blipFill>
          <p:spPr>
            <a:xfrm>
              <a:off x="0" y="0"/>
              <a:ext cx="457200" cy="457200"/>
            </a:xfrm>
          </p:spPr>
        </p:pic>
      </p:grpSp>
    `)
    expect(extractImageElements(xml, relationships, imageData)).toHaveLength(0)
  })

  it('captures <a:srcRect> crop as a normalized ImageCropRect', () => {
    const xml = slideXml(`
      <p:pic>
        <p:blipFill>
          <a:blip r:embed="rId2"/>
          <a:srcRect l="10000" t="20000" r="30000" b="0"/>
        </p:blipFill>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="914400" cy="914400"/>
          </a:xfrm>
        </p:spPr>
      </p:pic>
    `)

    const images = extractImageElements(xml, relationships, imageData)
    expect(images).toHaveLength(1)
    expect(images[0].cropRect).toEqual({
      left: 0.1,
      top: 0.2,
      right: 0.3,
      bottom: 0
    })
    // Cropped images must fill their frame like PowerPoint does.
    expect(images[0].objectFit).toBe('fill')
  })

  it('ignores <a:srcRect> with zero crop so unrelated images stay uncluttered', () => {
    const xml = slideXml(`
      <p:pic>
        <p:blipFill>
          <a:blip r:embed="rId2"/>
          <a:srcRect l="0" t="0" r="0" b="0"/>
        </p:blipFill>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="914400" cy="914400"/>
          </a:xfrm>
        </p:spPr>
      </p:pic>
    `)

    const images = extractImageElements(xml, relationships, imageData)
    expect(images[0].cropRect).toBeUndefined()
  })

  it('drops pathological <a:srcRect> that would leave nothing visible', () => {
    const xml = slideXml(`
      <p:pic>
        <p:blipFill>
          <a:blip r:embed="rId2"/>
          <a:srcRect l="60000" r="50000"/>
        </p:blipFill>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="914400" cy="914400"/>
          </a:xfrm>
        </p:spPr>
      </p:pic>
    `)

    const images = extractImageElements(xml, relationships, imageData)
    expect(images[0].cropRect).toBeUndefined()
  })

  it('prefers the <asvg:svgBlip> sibling over the EMF raster fallback', () => {
    // PowerPoint 2016+ stores vector pictures as a raster blip with an SVG
    // extension sibling. The SVG is the real content; the outer r:embed is a
    // legacy-viewer fallback. Without this preference every such picture
    // rendered as the "Vector image (EMF/WMF)" placeholder.
    const xml = slideXml(`
      <p:pic>
        <p:nvPicPr/>
        <p:blipFill>
          <a:blip r:embed="rIdEmf">
            <a:extLst>
              <a:ext uri="{96DAC541-7B7A-43D3-8B79-37D633B846F1}">
                <asvg:svgBlip r:embed="rIdSvg"/>
              </a:ext>
            </a:extLst>
          </a:blip>
        </p:blipFill>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="914400" cy="914400"/>
          </a:xfrm>
        </p:spPr>
      </p:pic>
    `)

    const svgAwareRelationships: SlideRelationships = {
      images: new Map([
        ['rIdEmf', 'ppt/media/image1.emf'],
        ['rIdSvg', 'ppt/media/image1.svg']
      ]),
      hyperlinks: new Map(),
      chartPaths: new Map()
    }
    const media = new Map<string, string>([
      ['ppt/media/image1.emf', 'data:image/svg+xml;base64,PLACEHOLDER'],
      ['ppt/media/image1.svg', 'data:image/svg+xml;base64,REAL']
    ])

    const images = extractImageElements(xml, svgAwareRelationships, media)
    expect(images).toHaveLength(1)
    expect(images[0].src).toBe('data:image/svg+xml;base64,REAL')
    // Vector sources (SVG / rendered metafile) must use 'contain' so logos
    // and diagrams are never cropped when the slide slot's aspect ratio
    // differs from the image's own aspect.
    expect(images[0].objectFit).toBe('contain')
  })

  it('falls back to the raster embed when the <asvg:svgBlip> rel is broken', () => {
    // Authoring tools occasionally reference a dangling SVG rel. In that case
    // we must not strand the picture as blank — fall back to whatever the
    // outer r:embed points at (could be a genuine PNG or a metafile preview).
    const xml = slideXml(`
      <p:pic>
        <p:nvPicPr/>
        <p:blipFill>
          <a:blip r:embed="rId2">
            <a:extLst>
              <a:ext uri="{96DAC541-7B7A-43D3-8B79-37D633B846F1}">
                <asvg:svgBlip r:embed="rIdMissing"/>
              </a:ext>
            </a:extLst>
          </a:blip>
        </p:blipFill>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="914400" cy="914400"/>
          </a:xfrm>
        </p:spPr>
      </p:pic>
    `)

    const images = extractImageElements(xml, relationships, imageData)
    expect(images).toHaveLength(1)
    expect(images[0].src).toBe('data:image/png;base64,AAA')
  })

  it('enforces a minimum size of 20px so tiny artifacts stay editable', () => {
    const xml = slideXml(`
      <p:pic>
        <p:blipFill><a:blip r:embed="rId2"/></p:blipFill>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="9525" cy="9525"/>
          </a:xfrm>
        </p:spPr>
      </p:pic>
    `)
    const images = extractImageElements(xml, relationships, imageData)
    expect(images[0].size.width).toBeGreaterThanOrEqual(20)
    expect(images[0].size.height).toBeGreaterThanOrEqual(20)
  })
})
