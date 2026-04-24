// Integration-style smoke test that exercises the import pipeline against
// the actual `slide1.xml` fragment from the "20260414 - Enterprise AI -v1.3"
// deck. It pins the imported title color so the "white gradient-fade title
// rendered as black on a dark background" bug cannot regress silently.

import { extractTextElements } from '../extractText'
import {
  buildInheritedTextDefaultsResolver,
  extractMasterTextStylesAdvanced,
  extractPlaceholderStyles
} from '../extractInheritedTextDefaults'
import { parseXML } from '../ooxmlUtils'
import type { OoxmlTheme, SlideRelationships } from '../types'

// Theme colors captured verbatim from `ppt/theme/theme1.xml` of the Enterprise
// AI deck (clrScheme = NEWWORK: dk1 #000, lt1 #FFF, dk2 #0E1537, lt2 #F5A400,
// accent1-6 blues/purple/magenta/orange). clrMap = default, so `bg1 → lt1`
// (= pure white) and `tx1 → dk1` (= pure black). This is what makes the bug
// visible: before the fix, the title fell back to `dk1` (black) against the
// slide's dark gradient background.
const enterpriseTheme: OoxmlTheme = {
  colors: new Map([
    ['dk1', '#000000'],
    ['lt1', '#FFFFFF'],
    ['dk2', '#0E1537'],
    ['lt2', '#F5A400'],
    ['bg1', '#FFFFFF'],
    ['tx1', '#000000'],
    ['accent1', '#4472C4'],
    ['accent2', '#5B9BD5'],
    ['accent3', '#70AD47'],
    ['accent4', '#C00000'],
    ['accent5', '#7030A0'],
    ['accent6', '#ED7D31']
  ]),
  majorFont: 'Source Sans Pro',
  minorFont: 'Source Sans Pro'
}

const emptyRels: SlideRelationships = {
  images: new Map(),
  hyperlinks: new Map(),
  chartPaths: new Map()
}

// Verbatim slide1.xml body from the deck, minus `a:extLst` creation-id GUIDs
// which do not affect import.
const SLIDE1_XML = `
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Textplatzhalter 1"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="body" sz="quarter" idx="11"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="449999" y="3319081"/><a:ext cx="10696971" cy="2450347"/></a:xfrm></p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:pPr fontAlgn="base"><a:lnSpc><a:spcPts val="6000"/></a:lnSpc></a:pPr>
            <a:endParaRPr lang="en-US">
              <a:gradFill>
                <a:gsLst>
                  <a:gs pos="0"><a:schemeClr val="bg1"><a:alpha val="67000"/></a:schemeClr></a:gs>
                  <a:gs pos="100000"><a:schemeClr val="bg1"><a:alpha val="67000"/></a:schemeClr></a:gs>
                  <a:gs pos="31000"><a:schemeClr val="bg1"/></a:gs>
                </a:gsLst>
                <a:lin ang="0" scaled="0"/>
              </a:gradFill>
              <a:ea typeface="Dela Gothic One" pitchFamily="2" charset="-128"/>
              <a:cs typeface="Roboto"/>
            </a:endParaRPr>
          </a:p>
          <a:p>
            <a:pPr fontAlgn="base"><a:lnSpc><a:spcPts val="6000"/></a:lnSpc></a:pPr>
            <a:r>
              <a:rPr lang="en-US">
                <a:gradFill>
                  <a:gsLst>
                    <a:gs pos="0"><a:schemeClr val="bg1"><a:alpha val="67000"/></a:schemeClr></a:gs>
                    <a:gs pos="100000"><a:schemeClr val="bg1"><a:alpha val="67000"/></a:schemeClr></a:gs>
                    <a:gs pos="31000"><a:schemeClr val="bg1"/></a:gs>
                  </a:gsLst>
                  <a:lin ang="0" scaled="0"/>
                </a:gradFill>
                <a:ea typeface="Dela Gothic One" pitchFamily="2" charset="-128"/>
                <a:cs typeface="Roboto"/>
              </a:rPr>
              <a:t>The </a:t>
            </a:r>
          </a:p>
          <a:p>
            <a:pPr fontAlgn="base"><a:lnSpc><a:spcPts val="6000"/></a:lnSpc></a:pPr>
            <a:r>
              <a:rPr lang="en-US">
                <a:gradFill>
                  <a:gsLst>
                    <a:gs pos="0"><a:schemeClr val="bg1"><a:alpha val="67000"/></a:schemeClr></a:gs>
                    <a:gs pos="100000"><a:schemeClr val="bg1"><a:alpha val="67000"/></a:schemeClr></a:gs>
                    <a:gs pos="31000"><a:schemeClr val="bg1"/></a:gs>
                  </a:gsLst>
                  <a:lin ang="0" scaled="0"/>
                </a:gradFill>
                <a:ea typeface="Dela Gothic One" pitchFamily="2" charset="-128"/>
                <a:cs typeface="Roboto"/>
              </a:rPr>
              <a:t>NEWWORK Enterprise AI.</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>
`

// Trimmed slideLayout6.xml idx=11 body placeholder. Only the `a:lstStyle`
// matters for inheritance — slide 1 itself leaves `<a:lstStyle/>` empty so
// all run defaults come from here (and the gradFill needs to resolve to a
// visible stop to cover bare `<a:rPr lang="..."/>` runs as well).
const LAYOUT6_XML = `
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="14" name="Textplatzhalter 13"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="body" sz="quarter" idx="11" hasCustomPrompt="1"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="450000" y="3319082"/><a:ext cx="9330020" cy="1468380"/></a:xfrm></p:spPr>
        <p:txBody>
          <a:bodyPr lIns="0" tIns="0" rIns="0" bIns="0"><a:noAutofit/></a:bodyPr>
          <a:lstStyle>
            <a:lvl1pPr marL="0" indent="0" hangingPunct="1">
              <a:lnSpc><a:spcPts val="6400"/></a:lnSpc>
              <a:spcBef><a:spcPts val="0"/></a:spcBef>
              <a:buNone/>
              <a:defRPr sz="6000">
                <a:gradFill>
                  <a:gsLst>
                    <a:gs pos="0"><a:schemeClr val="bg1"><a:alpha val="50000"/></a:schemeClr></a:gs>
                    <a:gs pos="100000"><a:schemeClr val="bg1"><a:alpha val="50000"/></a:schemeClr></a:gs>
                    <a:gs pos="50000"><a:schemeClr val="bg1"/></a:gs>
                  </a:gsLst>
                  <a:lin ang="0" scaled="0"/>
                </a:gradFill>
                <a:latin typeface="Funnel Display" pitchFamily="2" charset="0"/>
              </a:defRPr>
            </a:lvl1pPr>
          </a:lstStyle>
          <a:p><a:r><a:rPr lang="de-DE" sz="6000"/><a:t>Title here</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sldLayout>
`

describe('Enterprise AI slide 1 integration', () => {
  it('imports the title with a visible white color (not dk1 black)', () => {
    const slide = parseXML(SLIDE1_XML)
    const layout = parseXML(LAYOUT6_XML)

    const placeholderStyles = extractPlaceholderStyles(layout, enterpriseTheme)
    const resolver = buildInheritedTextDefaultsResolver(
      placeholderStyles,
      undefined,
      extractMasterTextStylesAdvanced(
        parseXML(
          '<p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree/></p:cSld></p:sldMaster>'
        ),
        enterpriseTheme
      )
    )

    const elements = extractTextElements(slide, enterpriseTheme, emptyRels, resolver)
    expect(elements).toHaveLength(1)

    const title = elements[0]
    // The whole title text survived the import.
    expect(title.content).toContain('The')
    expect(title.content).toContain('NEWWORK Enterprise AI.')

    // Element-level color must be the gradient's opaque center stop (pure
    // white), NOT the theme's dk1 (#000000) — which is what the old
    // solidFill-only path silently fell back to.
    expect(title.color?.toLowerCase()).toBe('#ffffff')

    // Every run in every paragraph that has text should also be white.
    const runColors = (title.paragraphs || [])
      .flatMap(p => p.runs)
      .filter(r => r.text.length > 0)
      .map(r => r.color?.toLowerCase())

    expect(runColors.length).toBeGreaterThan(0)
    for (const color of runColors) {
      expect(color).toBe('#ffffff')
    }
  })

  // Regression: `<a:lnSpc><a:spcPts val="6000"/></a:lnSpc>` (absolute 60 pt)
  // used to bleed through to CSS `lineHeight: 60` as a unitless multiplier,
  // which the renderer interpreted as "60 × font-size" and clipped every
  // paragraph outside the `overflow: hidden` box. The fix converts absolute
  // points into a multiplier using the paragraph's font size (from the
  // layout's `defRPr sz="6000"`). 60 pt over 60 pt font = 1.0× — i.e.
  // single-spaced, the value PowerPoint actually intended.
  it('converts absolute spcPts line-height to a unitless CSS multiplier', () => {
    const slide = parseXML(SLIDE1_XML)
    const layout = parseXML(LAYOUT6_XML)

    const placeholderStyles = extractPlaceholderStyles(layout, enterpriseTheme)
    const resolver = buildInheritedTextDefaultsResolver(
      placeholderStyles,
      undefined,
      extractMasterTextStylesAdvanced(
        parseXML(
          '<p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree/></p:cSld></p:sldMaster>'
        ),
        enterpriseTheme
      )
    )

    const [title] = extractTextElements(slide, enterpriseTheme, emptyRels, resolver)

    const paragraphLineHeights = (title.paragraphs || []).map(p => p.lineHeight)
    expect(paragraphLineHeights.length).toBeGreaterThan(0)
    for (const lh of paragraphLineHeights) {
      // Must be a reasonable relative multiplier (PowerPoint's 60 pt over
      // 60 pt font), not the raw 60 that would blow up the line box.
      expect(lh).toBeDefined()
      expect(lh as number).toBeLessThanOrEqual(3)
      expect(lh as number).toBeGreaterThan(0)
    }
  })
})
