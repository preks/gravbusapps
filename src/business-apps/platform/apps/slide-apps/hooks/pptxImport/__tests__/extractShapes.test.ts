import { extractPSpToSingleElement, extractShapeElements } from '../extractShapes'
import { parseXML } from '../ooxmlUtils'
import type { OoxmlTheme, SlideRelationships } from '../types'
import type { ParserMessage } from '../../usePowerPointParser'

const theme: OoxmlTheme = {
  colors: new Map([['accent1', '#4472C4']]),
  majorFont: 'Calibri Light',
  minorFont: 'Calibri'
}

const emptyRels: SlideRelationships = { images: new Map(), hyperlinks: new Map(), chartPaths: new Map() }

function slideXml(spXml: string): Document {
  return parseXML(`
    <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
           xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
           xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <p:cSld><p:spTree>${spXml}</p:spTree></p:cSld>
    </p:sld>
  `)
}

describe('extractShapeElements', () => {
  it('extracts rectangle shape with fill', () => {
    const messages: ParserMessage[] = []
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm>
            <a:off x="914400" y="914400"/>
            <a:ext cx="1828800" cy="914400"/>
          </a:xfrm>
          <a:prstGeom prst="rect"/>
          <a:solidFill><a:srgbClr val="3B82F6"/></a:solidFill>
        </p:spPr>
      </p:sp>
    `)

    const elements = extractShapeElements(xml, theme, messages, 0, emptyRels)

    expect(elements).toHaveLength(1)
    expect(elements[0].shapeType).toBe('rectangle')
    expect(elements[0].fill).toBe('#3B82F6')
  })

  it('maps ellipse to circle when aspect ratio is 1:1', () => {
    const messages: ParserMessage[] = []
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="914400" cy="914400"/>
          </a:xfrm>
          <a:prstGeom prst="ellipse"/>
          <a:solidFill><a:srgbClr val="FF0000"/></a:solidFill>
        </p:spPr>
      </p:sp>
    `)

    const elements = extractShapeElements(xml, theme, messages, 0, emptyRels)
    expect(elements[0].shapeType).toBe('circle')
  })

  it('keeps fillRef idx=0 transparent because that OOXML slot is "no fill"', () => {
    // Regression: we used to paint accent1 here so the shape was always
    // visible, but that turned a lot of decks into walls of accent-colored
    // boxes (titles, placeholder wrappers, etc.). The correct OOXML reading
    // is: `<a:fillRef idx="0"/>` explicitly selects the no-fill slot of the
    // theme format matrix, so we leave the shape transparent — matching what
    // PowerPoint renders.
    const messages: ParserMessage[] = []
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="914400" cy="457200"/>
          </a:xfrm>
          <a:prstGeom prst="rightArrow"/>
        </p:spPr>
        <p:style>
          <a:fillRef idx="0"/>
        </p:style>
      </p:sp>
    `)

    const elements = extractShapeElements(xml, theme, messages, 0, emptyRels)
    expect(elements[0].fill).toBe('transparent')
  })

  it('resolves fillRef idx>0 to the theme color (e.g. accent1)', () => {
    const messages: ParserMessage[] = []
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="914400" cy="457200"/>
          </a:xfrm>
          <a:prstGeom prst="rightArrow"/>
        </p:spPr>
        <p:style>
          <a:fillRef idx="1"><a:schemeClr val="accent1"/></a:fillRef>
        </p:style>
      </p:sp>
    `)

    const elements = extractShapeElements(xml, theme, messages, 0, emptyRels)
    expect(elements[0].fill).toBe('#4472C4')
  })

  it('expands fillRef idx=3 through fmtScheme, applying lumMod/shade to the accent override', () => {
    // Simulates a chevron that uses `<a:fillRef idx="3"><a:schemeClr val="accent2"/></a:fillRef>`
    // with a fmtScheme whose idx=3 template darkens phClr via <a:shade val="75000"/>.
    // The final fill should be the shaded accent2 (C24472 darkened to ~6a2a44),
    // not the raw accent1 fallback we used to emit when the template was ignored.
    const themeXml = new DOMParser().parseFromString(
      `<root xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
         <a:fillStyleLst>
           <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
           <a:solidFill><a:schemeClr val="phClr"><a:lumMod val="110000"/></a:schemeClr></a:solidFill>
           <a:solidFill><a:schemeClr val="phClr"><a:shade val="50000"/></a:schemeClr></a:solidFill>
         </a:fillStyleLst>
       </root>`,
      'text/xml'
    )
    const fmtFillStyles = Array.from(themeXml.getElementsByTagName('a:fillStyleLst')[0].childNodes).filter(
      (n): n is Element => (n as Element).tagName !== undefined
    )
    const templatedTheme: OoxmlTheme = {
      colors: new Map([
        ['accent1', '#4472C4'],
        ['accent2', '#C24472']
      ]),
      majorFont: 'Calibri Light',
      minorFont: 'Calibri',
      fmtFillStyles
    }
    const messages: ParserMessage[] = []
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="914400" cy="457200"/>
          </a:xfrm>
          <a:prstGeom prst="chevron"/>
        </p:spPr>
        <p:style>
          <a:fillRef idx="3"><a:schemeClr val="accent2"/></a:fillRef>
        </p:style>
      </p:sp>
    `)

    const elements = extractShapeElements(xml, templatedTheme, messages, 0, emptyRels)
    expect(elements).toHaveLength(1)
    // The expanded template shades accent2 toward black; the result must
    // differ from the raw accent2 and must not collapse to accent1.
    expect(elements[0].fill).not.toBe('#4472C4')
    expect(elements[0].fill.toLowerCase()).not.toBe('#c24472')
  })

  it('includes in-shape text on autoshave as shapeText', () => {
    const messages: ParserMessage[] = []
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="914400" cy="457200"/>
          </a:xfrm>
          <a:prstGeom prst="rect"/>
        </p:spPr>
        <p:txBody>
          <a:p><a:r><a:t>Text inside</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    `)

    const elements = extractShapeElements(xml, theme, messages, 0, emptyRels)
    expect(elements).toHaveLength(1)
    expect(elements[0].shapeText?.content).toBe('Text inside')
  })

  it('respects bodyPr anchor and insets for in-shape text', () => {
    const messages: ParserMessage[] = []
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="914400" cy="457200"/>
          </a:xfrm>
          <a:prstGeom prst="rect"/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr anchor="t" lIns="95250" rIns="95250" tIns="95250" bIns="95250"/>
          <a:p><a:r><a:t>Top label</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    `)

    const elements = extractShapeElements(xml, theme, messages, 0, emptyRels)
    expect(elements).toHaveLength(1)
    expect(elements[0].shapeText?.verticalAlign).toBe('top')
    expect(elements[0].shapeText?.padding).toBe(10)
  })

  it('skips explicit PowerPoint text boxes even when they carry rectangle geometry', () => {
    const messages: ParserMessage[] = []
    const xml = slideXml(`
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="1" name="TextBox 1"/>
          <p:cNvSpPr txBox="1"/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="914400" cy="457200"/>
          </a:xfrm>
          <a:prstGeom prst="rect"/>
          <a:solidFill><a:srgbClr val="5BC3E1"/></a:solidFill>
        </p:spPr>
        <p:txBody>
          <a:p><a:r><a:t>Imported text box</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    `)

    const elements = extractShapeElements(xml, theme, messages, 0, emptyRels)
    expect(elements).toHaveLength(0)
  })

  it('keeps simple explicit text boxes on the plain text path', () => {
    const messages: ParserMessage[] = []
    const xml = slideXml(`
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="1" name="TextBox 1"/>
          <p:cNvSpPr txBox="1"/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="914400" cy="457200"/>
          </a:xfrm>
          <a:prstGeom prst="rect"/>
          <a:solidFill><a:srgbClr val="5BC3E1"/></a:solidFill>
        </p:spPr>
        <p:txBody>
          <a:p><a:r><a:t>Imported text box</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    `)

    const element = extractPSpToSingleElement(xml, theme, emptyRels, messages, 0)
    expect(element?.type).toBe('text')
  })

  it('preserves decorated explicit text boxes as shapes with shapeText', () => {
    const messages: ParserMessage[] = []
    const themed: OoxmlTheme = {
      colors: new Map([
        ['dk1', '#000000'],
        ['lt1', '#FFFFFF']
      ]),
      majorFont: 'Calibri Light',
      minorFont: 'Calibri'
    }
    const xml = slideXml(`
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="1" name="Styled TextBox"/>
          <p:cNvSpPr txBox="1"/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="1828800" cy="457200"/>
          </a:xfrm>
          <a:prstGeom prst="roundRect"/>
          <a:solidFill><a:schemeClr val="bg1"/></a:solidFill>
          <a:ln w="25400">
            <a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>
          </a:ln>
          <a:effectLst>
            <a:outerShdw blurRad="190500" dist="63500" dir="5400000" algn="t" rotWithShape="0">
              <a:prstClr val="black"><a:alpha val="15000"/></a:prstClr>
            </a:outerShdw>
          </a:effectLst>
        </p:spPr>
        <p:txBody>
          <a:bodyPr anchor="ctr"/>
          <a:p>
            <a:r>
              <a:rPr><a:solidFill><a:schemeClr val="tx1"/></a:solidFill></a:rPr>
              <a:t>Styled label</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    `)

    const element = extractPSpToSingleElement(xml, themed, emptyRels, messages, 0)
    expect(element?.type).toBe('shape')
    expect(element && 'shapeText' in element ? element.shapeText?.content : undefined).toBe('Styled label')
    expect(element && 'shapeText' in element ? element.shapeText?.color : undefined).toBe('#000000')
  })

  it('falls back to rectangle for unsupported presets and adds warning', () => {
    const messages: ParserMessage[] = []
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="914400" cy="457200"/>
          </a:xfrm>
          <a:prstGeom prst="unknownGeometry123"/>
        </p:spPr>
      </p:sp>
    `)

    const elements = extractShapeElements(xml, theme, messages, 0, emptyRels)
    expect(elements).toHaveLength(1)
    expect(elements[0].shapeType).toBe('rectangle')
    expect(messages.some(m => m.message === 'parser-shape-unsupported')).toBe(true)
  })

  describe('Office geometry metadata', () => {
    it('captures preset id, adjustments and flipH/flipV on importMeta', () => {
      const messages: ParserMessage[] = []
      const xml = slideXml(`
        <p:sp>
          <p:spPr>
            <a:xfrm flipH="1" flipV="1">
              <a:off x="0" y="0"/>
              <a:ext cx="914400" cy="457200"/>
            </a:xfrm>
            <a:prstGeom prst="chevron">
              <a:avLst>
                <a:gd name="adj" fmla="val 62000"/>
              </a:avLst>
            </a:prstGeom>
            <a:solidFill><a:srgbClr val="112233"/></a:solidFill>
          </p:spPr>
        </p:sp>
      `)
      const elements = extractShapeElements(xml, theme, messages, 0, emptyRels)
      expect(elements[0].importMeta?.prst).toBe('chevron')
      expect(elements[0].importMeta?.adjustments).toEqual({ adj: 62000 })
      expect(elements[0].importMeta?.flipH).toBe(true)
      expect(elements[0].importMeta?.flipV).toBe(true)
      expect(elements[0].importMeta?.sourceFormat).toBe('pptx')
    })

    it('normalises custom geometry into an SVG d path in the unit box', () => {
      const messages: ParserMessage[] = []
      const xml = slideXml(`
        <p:sp>
          <p:spPr>
            <a:xfrm>
              <a:off x="0" y="0"/>
              <a:ext cx="914400" cy="914400"/>
            </a:xfrm>
            <a:custGeom>
              <a:pathLst>
                <a:path w="100" h="100">
                  <a:moveTo><a:pt x="0" y="0"/></a:moveTo>
                  <a:lnTo><a:pt x="100" y="0"/></a:lnTo>
                  <a:lnTo><a:pt x="50" y="100"/></a:lnTo>
                  <a:close/>
                </a:path>
              </a:pathLst>
            </a:custGeom>
            <a:solidFill><a:srgbClr val="112233"/></a:solidFill>
          </p:spPr>
        </p:sp>
      `)
      const elements = extractShapeElements(xml, theme, messages, 0, emptyRels)
      const d = elements[0].importMeta?.custGeomPath
      expect(d).toBeDefined()
      expect(d).toContain('M 0')
      expect(d).toContain('L 1.0000')
      expect(d!.trim().endsWith('Z')).toBe(true)
    })

    it('emits a picture-fill warning and lets the background show through', () => {
      // Picture fills aren't rasterised onto autoshapes yet. Instead of
      // painting a flat accent color (which looked like the shape had a wrong
      // solid background), we leave the shape transparent so layout/slide
      // artwork behind it is visible. The parser surfaces a warning so the
      // user can decide how to proceed.
      const messages: ParserMessage[] = []
      const xml = slideXml(`
        <p:sp>
          <p:spPr>
            <a:xfrm>
              <a:off x="0" y="0"/>
              <a:ext cx="914400" cy="457200"/>
            </a:xfrm>
            <a:prstGeom prst="rect"/>
            <a:blipFill><a:blip r:embed="rId1"/></a:blipFill>
          </p:spPr>
        </p:sp>
      `)
      const elements = extractShapeElements(xml, theme, messages, 0, emptyRels)
      expect(elements[0].fill).toBe('transparent')
      expect(messages.some(m => m.message === 'parser-shape-picture-fill-unsupported')).toBe(true)
    })
  })

  it('extracts stroke properties', () => {
    const messages: ParserMessage[] = []
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="914400" cy="457200"/>
          </a:xfrm>
          <a:prstGeom prst="rect"/>
          <a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>
          <a:ln w="19050">
            <a:solidFill><a:srgbClr val="000000"/></a:solidFill>
            <a:prstDash val="dash"/>
          </a:ln>
        </p:spPr>
      </p:sp>
    `)

    const elements = extractShapeElements(xml, theme, messages, 0, emptyRels)
    expect(elements[0].strokeWidth).toBe(2)
    expect(elements[0].strokeColor).toBe('#000000')
    expect(elements[0].strokeStyle).toBe('dashed')
  })

  it('does not treat line noFill as shape fill transparency', () => {
    const messages: ParserMessage[] = []
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="914400" cy="457200"/>
          </a:xfrm>
          <a:prstGeom prst="rect"/>
          <a:solidFill>
            <a:srgbClr val="FFFFFF">
              <a:alpha val="65000"/>
            </a:srgbClr>
          </a:solidFill>
          <a:ln w="12700">
            <a:noFill/>
          </a:ln>
        </p:spPr>
      </p:sp>
    `)

    const elements = extractShapeElements(xml, theme, messages, 0, emptyRels)
    expect(elements).toHaveLength(1)
    expect(elements[0].fill).toBe('rgba(255, 255, 255, 0.650)')
    expect(elements[0].strokeWidth).toBe(0)
  })

  // ---------------------------------------------------------------------
  // Track A round-trip smoke tests — one representative preset per family
  // that landed in the shape-library expansion. We're not verifying the
  // final SVG silhouette here (covered by OfficeShapeRenderer tests) —
  // just that every new preset is recognised, does NOT trip the
  // "parser-shape-unsupported" warning, and survives import with its
  // OOXML preset id intact on the geometry metadata.
  // ---------------------------------------------------------------------

  describe('extended preset library (Track A)', () => {
    const categoryPresets: Array<[string, string]> = [
      ['block-arrows', 'bentArrow'],
      ['block-arrows', 'leftRightArrow'],
      ['block-arrows', 'circularArrow'],
      ['equation', 'mathPlus'],
      ['equation', 'mathNotEqual'],
      ['flowchart', 'flowChartDocument'],
      ['flowchart', 'flowChartPunchedTape'],
      ['flowchart', 'flowChartSummingJunction'],
      ['stars-banners', 'star8'],
      ['stars-banners', 'ribbon'],
      ['stars-banners', 'wave'],
      ['basic-shapes', 'heart'],
      ['basic-shapes', 'cloud'],
      ['basic-shapes', 'donut'],
      ['callouts', 'cloudCallout'],
      ['callouts', 'lineCallout1']
    ]

    for (const [category, prst] of categoryPresets) {
      it(`imports ${category}:${prst} with matching geometry.prst and no unsupported warning`, () => {
        const messages: ParserMessage[] = []
        const xml = slideXml(`
          <p:sp>
            <p:spPr>
              <a:xfrm>
                <a:off x="0" y="0"/>
                <a:ext cx="914400" cy="914400"/>
              </a:xfrm>
              <a:prstGeom prst="${prst}"/>
              <a:solidFill><a:srgbClr val="3B82F6"/></a:solidFill>
            </p:spPr>
          </p:sp>
        `)

        const elements = extractShapeElements(xml, theme, messages, 0, emptyRels)

        expect(elements).toHaveLength(1)
        const shape = elements[0]
        // Preset id is preserved end-to-end so OfficeShapeRenderer picks it
        // up and pptxExport sends it back through pptxgen unchanged.
        expect(shape.importMeta?.prst).toBe(prst)
        expect(shape.geometry?.prst).toBe(prst)
        // No "parser-shape-unsupported" warning for any of the new presets.
        expect(messages.some(m => m.type === 'warning' && m.message === 'parser-shape-unsupported')).toBe(false)
      })
    }
  })
})
