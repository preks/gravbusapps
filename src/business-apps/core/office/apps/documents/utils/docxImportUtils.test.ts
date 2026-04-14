import {
  enhanceImportedHtmlWithImageLayouts,
  parseDocumentXmlForImageLayouts,
  parseDocumentXmlForPageFormatting
} from './docxImportUtils'

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const WP_NS = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'
const PIC_NS = 'http://schemas.openxmlformats.org/drawingml/2006/picture'
const A_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main'
const R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

function minimalDocumentXml(bodyInner: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${W_NS}" xmlns:wp="${WP_NS}" xmlns:pic="${PIC_NS}" xmlns:a="${A_NS}" xmlns:r="${R_NS}">
  <w:body>
    ${bodyInner}
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr>
  </w:body>
</w:document>`
}

function pictureDrawing(inlineOrAnchor: string): string {
  return `<w:p><w:r><w:drawing>${inlineOrAnchor}</w:drawing></w:r></w:p>`
}

/** Minimal inline picture block (extent 400x300 px in EMU) */
function inlinePictureDrawing(): string {
  const cx = String(400 * 9525)
  const cy = String(300 * 9525)
  return pictureDrawing(
    `<wp:inline distT="0" distB="0" distL="0" distR="0">
      <wp:extent cx="${cx}" cy="${cy}"/>
      <wp:docPr id="1" name="Picture"/>
      <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
        <pic:pic>
          <pic:nvPicPr><pic:cNvPr id="0" name=""/></pic:nvPicPr>
          <pic:blipFill><a:blip r:embed="rId1"/></pic:blipFill>
          <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm></pic:spPr>
        </pic:pic>
      </a:graphicData></a:graphic>
    </wp:inline>`
  )
}

function inlinePictureDrawingWithBorder(): string {
  const cx = String(400 * 9525)
  const cy = String(300 * 9525)
  return pictureDrawing(
    `<wp:inline distT="0" distB="0" distL="0" distR="0">
      <wp:extent cx="${cx}" cy="${cy}"/>
      <wp:docPr id="3" name="Picture"/>
      <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
        <pic:pic>
          <pic:nvPicPr><pic:cNvPr id="0" name=""/></pic:nvPicPr>
          <pic:blipFill><a:blip r:embed="rId3"/></pic:blipFill>
          <pic:spPr>
            <a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
            <a:ln w="38100">
              <a:solidFill><a:srgbClr val="1F4E79"/></a:solidFill>
              <a:prstDash val="dashDotDot"/>
            </a:ln>
          </pic:spPr>
        </pic:pic>
      </a:graphicData></a:graphic>
    </wp:inline>`
  )
}

function anchorSquareRight(): string {
  const cx = String(200 * 9525)
  const cy = String(150 * 9525)
  return pictureDrawing(
    `<wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251658240" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1">
      <wp:simplePos x="0" y="0"/>
      <wp:positionH relativeFrom="margin"><wp:align>right</wp:align></wp:positionH>
      <wp:positionV relativeFrom="paragraph"><wp:posOffset>0</wp:posOffset></wp:positionV>
      <wp:extent cx="${cx}" cy="${cy}"/>
      <wp:effectExtent l="0" t="0" r="0" b="0"/>
      <wp:wrapSquare wrapText="right"/>
      <wp:docPr id="2" name="Picture"/>
      <wp:cNvGraphicFramePr/>
      <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
        <pic:pic>
          <pic:nvPicPr><pic:cNvPr id="0" name=""/></pic:nvPicPr>
          <pic:blipFill><a:blip r:embed="rId2"/></pic:blipFill>
          <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm></pic:spPr>
        </pic:pic>
      </a:graphicData></a:graphic>
    </wp:anchor>`
  )
}

describe('parseDocumentXmlForImageLayouts', () => {
  it('returns inline for wp:inline picture', () => {
    const xml = minimalDocumentXml(inlinePictureDrawing())
    const layouts = parseDocumentXmlForImageLayouts(xml)
    expect(layouts).toHaveLength(1)
    expect(layouts[0]?.wrapMode).toBe('inline')
    expect(layouts[0]?.widthPx).toBe(400)
    expect(layouts[0]?.heightPx).toBe(300)
  })

  it('maps wrapSquare wrapText=right to square with persisted text side', () => {
    const xml = minimalDocumentXml(anchorSquareRight())
    const layouts = parseDocumentXmlForImageLayouts(xml)
    expect(layouts).toHaveLength(1)
    expect(layouts[0]?.wrapMode).toBe('square')
    expect(layouts[0]?.wrapTextSide).toBe('right')
    expect(layouts[0]?.align).toBe('right')
    expect(layouts[0]?.widthPx).toBe(200)
    expect(layouts[0]?.heightPx).toBe(150)
  })

  it('parses picture border metadata from DrawingML line properties', () => {
    const xml = minimalDocumentXml(inlinePictureDrawingWithBorder())
    const layouts = parseDocumentXmlForImageLayouts(xml)

    expect(layouts).toHaveLength(1)
    expect(layouts[0]).toMatchObject({
      borderVisible: true,
      borderColor: '#1F4E79',
      borderWidthPt: 3,
      borderDash: 'dash-dot-dot'
    })
  })

  it('returns empty array for invalid XML', () => {
    expect(parseDocumentXmlForImageLayouts('not xml')).toEqual([])
  })
})

describe('parseDocumentXmlForPageFormatting', () => {
  it('parses Word section page size, orientation, margins, and header/footer distances', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${W_NS}">
  <w:body>
    <w:p><w:r><w:t>Layout</w:t></w:r></w:p>
    <w:sectPr>
      <w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>
      <w:pgMar w:top="567" w:right="1134" w:bottom="1701" w:left="2268" w:header="600" w:footer="840"/>
    </w:sectPr>
  </w:body>
</w:document>`

    expect(parseDocumentXmlForPageFormatting(xml)).toEqual({
      pageSize: 'A4',
      orientation: 'landscape',
      marginUnit: 'cm',
      margins: {
        top: 1,
        right: 2,
        bottom: 3,
        left: 4
      },
      pages: {
        headerTopMargin: 40,
        footerBottomMargin: 56
      }
    })
  })
})

describe('enhanceImportedHtmlWithImageLayouts', () => {
  it('wraps images with figure and data-image-wrap from layouts', () => {
    const html = '<p><img src="data:image/png;base64,xx" alt=""></p>'
    const out = enhanceImportedHtmlWithImageLayouts(html, [
      { wrapMode: 'square', wrapTextSide: 'right', align: 'right', widthPx: 200, heightPx: 150 }
    ])
    expect(out).toContain('data-node-type="custom-image"')
    expect(out).toContain('data-image-wrap="square"')
    expect(out).toContain('data-image-wrap-text-side="right"')
    expect(out).toContain('data-image-align="right"')
    expect(out).toContain('width="200"')
    expect(out).toContain('height="150"')
  })

  it('preserves data-uri image sources when upgrading Mammoth html', () => {
    const html = '<p><img src="data:image/png;base64,abc123" alt="Imported"></p>'
    const out = enhanceImportedHtmlWithImageLayouts(html, [
      { wrapMode: 'top-bottom', align: 'center', widthPx: 240, heightPx: 120 }
    ])
    const doc = new DOMParser().parseFromString(out, 'text/html')
    const figure = doc.body.querySelector('figure[data-node-type="custom-image"]')
    const image = figure?.querySelector('img')

    expect(figure).not.toBeNull()
    expect(figure?.getAttribute('data-image-wrap')).toBe('top-bottom')
    expect(figure?.getAttribute('data-image-anchor')).toBe('move-with-text')
    expect(figure?.getAttribute('data-image-display')).toBe('block')
    expect(image?.getAttribute('src')).toBe('data:image/png;base64,abc123')
    expect(image?.getAttribute('width')).toBe('240')
    expect(image?.getAttribute('height')).toBe('120')
  })

  it('persists imported border attrs on the upgraded custom-image figure', () => {
    const html = '<p><img src="data:image/png;base64,xx" alt=""></p>'
    const out = enhanceImportedHtmlWithImageLayouts(html, [
      {
        wrapMode: 'inline',
        align: 'left',
        widthPx: 200,
        heightPx: 150,
        borderVisible: true,
        borderColor: '#1F4E79',
        borderWidthPt: 3,
        borderDash: 'dash-dot-dot'
      }
    ])

    expect(out).toContain('data-image-border-visible="true"')
    expect(out).toContain('data-image-border-color="#1F4E79"')
    expect(out).toContain('data-image-border-width-pt="3"')
    expect(out).toContain('data-image-border-dash="dash-dot-dot"')
  })

  it('returns original html when layouts empty', () => {
    const html = '<p><img src="data:image/png;base64,xx"></p>'
    expect(enhanceImportedHtmlWithImageLayouts(html, [])).toBe(html)
  })
})
