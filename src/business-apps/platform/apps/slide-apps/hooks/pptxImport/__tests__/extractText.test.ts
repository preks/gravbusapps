import { extractTextElements, parseBodyAutofit, resolveTypeface } from '../extractText'
import { getChild } from '../ooxmlUtils'
import { parseXML } from '../ooxmlUtils'
import type { OoxmlTheme, SlideRelationships } from '../types'

const emptyRels: SlideRelationships = {
  images: new Map(),
  hyperlinks: new Map(),
  chartPaths: new Map()
}

const theme: OoxmlTheme = {
  colors: new Map([['accent1', '#4472C4']]),
  majorFont: 'Calibri Light',
  minorFont: 'Calibri'
}

function slideXml(spXml: string): Document {
  return parseXML(`
    <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
           xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
           xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <p:cSld><p:spTree>${spXml}</p:spTree></p:cSld>
    </p:sld>
  `)
}

describe('extractTextElements', () => {
  it('extracts plain text with position and size', () => {
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm>
            <a:off x="914400" y="457200"/>
            <a:ext cx="4572000" cy="914400"/>
          </a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:p>
            <a:r>
              <a:rPr lang="en-US"/>
              <a:t>Hello World</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    `)

    const elements = extractTextElements(xml, theme, emptyRels)

    expect(elements).toHaveLength(1)
    expect(elements[0].content).toBe('Hello World')
    expect(elements[0].position.x).toBeCloseTo(96, 0)
    expect(elements[0].position.y).toBeCloseTo(48, 0)
  })

  it('extracts bold and italic formatting', () => {
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="457200"/></a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:p>
            <a:r>
              <a:rPr b="1" i="1" sz="2400"/>
              <a:t>Bold Italic Text</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    `)

    const elements = extractTextElements(xml, theme, emptyRels)

    expect(elements).toHaveLength(1)
    expect(elements[0].fontWeight).toBe('bold')
    expect(elements[0].fontStyle).toBe('italic')
    expect(elements[0].fontSize).toBe(32)
  })

  it('extracts text color from srgb', () => {
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="457200"/></a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:p>
            <a:r>
              <a:rPr>
                <a:solidFill><a:srgbClr val="FF0000"/></a:solidFill>
              </a:rPr>
              <a:t>Red text</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    `)

    const elements = extractTextElements(xml, theme, emptyRels)
    expect(elements[0].color).toBe('#FF0000')
  })

  it('resolves hyperlinks from relationships', () => {
    const rels: SlideRelationships = {
      images: new Map(),
      hyperlinks: new Map([['rId5', 'https://example.com']]),
      chartPaths: new Map()
    }

    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="457200"/></a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:p>
            <a:r>
              <a:rPr>
                <a:hlinkClick r:id="rId5"/>
              </a:rPr>
              <a:t>Click here</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    `)

    const elements = extractTextElements(xml, theme, rels)
    expect(elements[0].links).toBeDefined()
    expect(elements[0].links![0].url).toBe('https://example.com')
  })

  it('skips shapes without text content', () => {
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="457200"/></a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:p></a:p>
        </p:txBody>
      </p:sp>
    `)

    const elements = extractTextElements(xml, theme, emptyRels)
    expect(elements).toHaveLength(0)
  })

  it('resolves +mj-lt to the theme major font on a run', () => {
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:p>
            <a:r>
              <a:rPr lang="en-US"><a:latin typeface="+mj-lt"/></a:rPr>
              <a:t>Title</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    `)
    const elements = extractTextElements(xml, theme, emptyRels)
    expect(elements[0].fontFamily).toBe('Calibri Light')
  })

  it('resolves +mn-lt on the paragraph default to the theme minor font', () => {
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:p>
            <a:pPr>
              <a:defRPr sz="2400"><a:latin typeface="+mn-lt"/></a:defRPr>
            </a:pPr>
            <a:r>
              <a:rPr lang="en-US"/>
              <a:t>Body text</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    `)
    const elements = extractTextElements(xml, theme, emptyRels)
    expect(elements[0].fontFamily).toBe('Calibri')
  })

  it('concatenates multiple paragraphs with newline', () => {
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:p><a:r><a:t>Line one</a:t></a:r></a:p>
          <a:p><a:r><a:t>Line two</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    `)

    const elements = extractTextElements(xml, theme, emptyRels)
    expect(elements[0].content).toBe('Line one\nLine two')
  })

  it('maps bodyPr anchor and insets onto text box vertical alignment and padding', () => {
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr anchor="b" lIns="190500" rIns="190500" tIns="95250" bIns="95250"/>
          <a:p><a:r><a:t>Bottom aligned text</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    `)

    const elements = extractTextElements(xml, theme, emptyRels)
    expect(elements[0].verticalAlign).toBe('bottom')
    expect(elements[0].padding).toBe(15)
  })

  it('does not override explicit tx1 run color with style fontRef fallback', () => {
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
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="1828800" cy="457200"/></a:xfrm>
        </p:spPr>
        <p:style>
          <a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef>
        </p:style>
        <p:txBody>
          <a:p>
            <a:r>
              <a:rPr><a:solidFill><a:schemeClr val="tx1"/></a:solidFill></a:rPr>
              <a:t>Should stay black</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    `)

    const elements = extractTextElements(xml, themed, emptyRels)
    expect(elements).toHaveLength(1)
    expect(elements[0].color).toBe('#000000')
    expect(elements[0].paragraphs?.[0].runs[0].color).toBe('#000000')
  })
})

describe('resolveTypeface', () => {
  it('maps +mj-* to the theme major font', () => {
    expect(resolveTypeface('+mj-lt', theme)).toBe('Calibri Light')
    expect(resolveTypeface('+mj-ea', theme)).toBe('Calibri Light')
  })

  it('maps +mn-* to the theme minor font', () => {
    expect(resolveTypeface('+mn-lt', theme)).toBe('Calibri')
  })

  it('returns undefined for theme references when no theme is provided', () => {
    expect(resolveTypeface('+mj-lt', undefined)).toBeUndefined()
  })

  it('passes literal font names through untouched', () => {
    expect(resolveTypeface('Aptos Display', theme)).toBe('Aptos Display')
  })

  it('returns undefined for null/empty input', () => {
    expect(resolveTypeface(null, theme)).toBeUndefined()
    expect(resolveTypeface('', theme)).toBeUndefined()
    expect(resolveTypeface('   ', theme)).toBeUndefined()
  })
})

describe('extractTextElements caps + autofit', () => {
  it('translates cap="all" on a run to RichTextRun.textTransform = uppercase', () => {
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:p>
            <a:r>
              <a:rPr lang="en-US" cap="all" sz="4400"/>
              <a:t>Solution Requirements</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    `)

    const elements = extractTextElements(xml, theme, emptyRels)
    expect(elements).toHaveLength(1)
    expect(elements[0].content).toBe('Solution Requirements')
    // Stored text keeps original casing — display-only transform.
    expect(elements[0].textTransform).toBe('uppercase')
    expect(elements[0].paragraphs?.[0].runs[0].textTransform).toBe('uppercase')
  })

  it('inherits cap from paragraph defRPr when a run omits it', () => {
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:p>
            <a:pPr><a:defRPr sz="2400" cap="small"/></a:pPr>
            <a:r>
              <a:rPr lang="en-US"/>
              <a:t>SubTitle Line</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    `)
    const elements = extractTextElements(xml, theme, emptyRels)
    expect(elements[0].textTransform).toBe('small-caps')
  })

  it('does not promote cap to element-level when runs disagree', () => {
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:p>
            <a:r><a:rPr cap="all"/><a:t>Loud </a:t></a:r>
            <a:r><a:rPr/><a:t>whisper</a:t></a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    `)
    const elements = extractTextElements(xml, theme, emptyRels)
    expect(elements[0].textTransform).toBeUndefined()
    expect(elements[0].paragraphs?.[0].runs[0].textTransform).toBe('uppercase')
    expect(elements[0].paragraphs?.[0].runs[1].textTransform).toBeUndefined()
  })

  it('scales imported run font sizes when <a:normAutofit fontScale> is present', () => {
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr><a:normAutofit fontScale="50000" lnSpcReduction="10000"/></a:bodyPr>
          <a:p>
            <a:r>
              <a:rPr lang="en-US" sz="4400"/>
              <a:t>Huge title shrunk to fit</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    `)
    const elements = extractTextElements(xml, theme, emptyRels)
    // sz=4400 (44pt) × 50% scale = 22pt ≈ 29.3px (22 * 1.333).
    expect(elements[0].fontSize).toBe(29)
    expect(Math.round(elements[0].paragraphs![0].runs[0].fontSize!)).toBe(29)
  })

  it('parseBodyAutofit reads fontScale/lineSpaceReduction as ratios', () => {
    const xml = new DOMParser().parseFromString(
      `<a:bodyPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <a:normAutofit fontScale="92500" lnSpcReduction="20000"/>
      </a:bodyPr>`,
      'application/xml'
    )
    const bodyPr = xml.documentElement
    const autofit = parseBodyAutofit(bodyPr)
    expect(autofit.mode).toBe('normal')
    expect(autofit.fontScale).toBeCloseTo(0.925, 3)
    expect(autofit.lineSpaceReduction).toBeCloseTo(0.2, 3)
  })

  it('parseBodyAutofit falls back to mode=none when no autofit child is present', () => {
    // Use a wrapper element so getChild/helpers work regardless of namespace default.
    const xml = new DOMParser().parseFromString(
      `<a:bodyPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"/>`,
      'application/xml'
    )
    const autofit = parseBodyAutofit(xml.documentElement)
    expect(autofit.mode).toBe('none')
    expect(autofit.fontScale).toBe(1)
  })

  // Sanity: getChild is re-exported so tests can still reach into fixture XML.
  it('getChild finds direct a:normAutofit child', () => {
    const xml = new DOMParser().parseFromString(
      `<a:bodyPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <a:normAutofit/>
      </a:bodyPr>`,
      'application/xml'
    )
    expect(getChild(xml.documentElement, 'a:normAutofit')).toBeDefined()
  })
})
