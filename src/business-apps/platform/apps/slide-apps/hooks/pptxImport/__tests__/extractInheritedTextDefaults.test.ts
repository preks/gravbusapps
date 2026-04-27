import { parseXML } from '../ooxmlUtils'
import type { OoxmlTheme } from '../types'
import {
  buildInheritedTextDefaultsResolver,
  extractMasterTextStylesAdvanced,
  extractPlaceholderStyles
} from '../extractInheritedTextDefaults'
import { extractTextElements } from '../extractText'

const theme: OoxmlTheme = {
  colors: new Map([['accent1', '#4472C4']]),
  majorFont: 'Calibri Light',
  minorFont: 'Calibri'
}

const emptyRels = {
  images: new Map<string, string>(),
  hyperlinks: new Map<string, string>(),
  chartPaths: new Map<string, string>()
}

function masterXml(styles: string): Document {
  return parseXML(`
    <p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                 xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <p:cSld><p:spTree></p:spTree></p:cSld>
      <p:txStyles>${styles}</p:txStyles>
    </p:sldMaster>
  `)
}

function layoutXml(sps: string): Document {
  return parseXML(`
    <p:sldLayout xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                 xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <p:cSld><p:spTree>${sps}</p:spTree></p:cSld>
    </p:sldLayout>
  `)
}

function slideXml(spXml: string): Document {
  return parseXML(`
    <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
           xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <p:cSld><p:spTree>${spXml}</p:spTree></p:cSld>
    </p:sld>
  `)
}

describe('extractMasterTextStylesAdvanced', () => {
  it('reads lvl1 sz from p:titleStyle', () => {
    const xml = masterXml(`
      <p:titleStyle><a:lvl1pPr><a:defRPr sz="8400"/></a:lvl1pPr></p:titleStyle>
      <p:bodyStyle><a:lvl1pPr><a:defRPr sz="2800"/></a:lvl1pPr></p:bodyStyle>
    `)
    const styles = extractMasterTextStylesAdvanced(xml, theme)
    expect(styles.title.get(0)?.fontSize).toBe(8400)
    expect(styles.body.get(0)?.fontSize).toBe(2800)
  })

  it('handles multi-level body style', () => {
    const xml = masterXml(`
      <p:bodyStyle>
        <a:lvl1pPr><a:defRPr sz="2800"/></a:lvl1pPr>
        <a:lvl2pPr><a:defRPr sz="2400"/></a:lvl2pPr>
        <a:lvl3pPr><a:defRPr sz="2000"/></a:lvl3pPr>
      </p:bodyStyle>
    `)
    const styles = extractMasterTextStylesAdvanced(xml, theme)
    expect(styles.body.get(0)?.fontSize).toBe(2800)
    expect(styles.body.get(1)?.fontSize).toBe(2400)
    expect(styles.body.get(2)?.fontSize).toBe(2000)
  })

  it('resolves +mj-lt typefaces via the theme', () => {
    const xml = masterXml(`
      <p:titleStyle><a:lvl1pPr><a:defRPr sz="4400"><a:latin typeface="+mj-lt"/></a:defRPr></a:lvl1pPr></p:titleStyle>
    `)
    const styles = extractMasterTextStylesAdvanced(xml, theme)
    expect(styles.title.get(0)?.fontFamily).toBe('Calibri Light')
  })
})

describe('extractPlaceholderStyles', () => {
  it('reads lstStyle defaults on a layout title placeholder', () => {
    const xml = layoutXml(`
      <p:sp>
        <p:nvSpPr><p:nvSpPr/><p:nvPr><p:ph type="title" idx="0"/></p:nvPr></p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle>
            <a:lvl1pPr><a:defRPr sz="7200" b="1"><a:latin typeface="Source Sans Pro"/></a:defRPr></a:lvl1pPr>
          </a:lstStyle>
          <a:p/>
        </p:txBody>
      </p:sp>
    `)
    const styles = extractPlaceholderStyles(xml, theme)
    const lvl = styles.byType.get('title')?.get(0)
    expect(lvl?.fontSize).toBe(7200)
    expect(lvl?.bold).toBe(true)
    expect(lvl?.fontFamily).toBe('Source Sans Pro')
  })
})

describe('extractTextElements (integration with inherited defaults)', () => {
  it('applies master p:titleStyle sz when the slide run has none', () => {
    const master = masterXml(`
      <p:titleStyle><a:lvl1pPr><a:defRPr sz="8400"/></a:lvl1pPr></p:titleStyle>
    `)
    const masterStyles = extractMasterTextStylesAdvanced(master, theme)
    const resolver = buildInheritedTextDefaultsResolver(undefined, undefined, masterStyles)

    const slide = slideXml(`
      <p:sp>
        <p:nvSpPr><p:nvSpPr/><p:nvPr><p:ph type="title" idx="0"/></p:nvPr></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="9144000" cy="1371600"/></a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:r><a:rPr lang="en-US"/><a:t>Solution Requirements</a:t></a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    `)

    const elements = extractTextElements(slide, theme, emptyRels, resolver)
    expect(elements).toHaveLength(1)
    // 8400 in hundredths of points = 84pt × 1.333 ≈ 112px.
    expect(elements[0].fontSize).toBe(112)
  })

  it('layout placeholder lstStyle overrides master txStyles', () => {
    const master = masterXml(`
      <p:titleStyle><a:lvl1pPr><a:defRPr sz="4400"/></a:lvl1pPr></p:titleStyle>
    `)
    const layout = layoutXml(`
      <p:sp>
        <p:nvSpPr><p:nvSpPr/><p:nvPr><p:ph type="title" idx="0"/></p:nvPr></p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle>
            <a:lvl1pPr><a:defRPr sz="8400"/></a:lvl1pPr>
          </a:lstStyle>
          <a:p/>
        </p:txBody>
      </p:sp>
    `)
    const resolver = buildInheritedTextDefaultsResolver(
      extractPlaceholderStyles(layout, theme),
      undefined,
      extractMasterTextStylesAdvanced(master, theme)
    )

    const slide = slideXml(`
      <p:sp>
        <p:nvSpPr><p:nvSpPr/><p:nvPr><p:ph type="title" idx="0"/></p:nvPr></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="9144000" cy="1371600"/></a:xfrm></p:spPr>
        <p:txBody>
          <a:bodyPr/><a:lstStyle/>
          <a:p><a:r><a:t>Hello</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    `)

    const elements = extractTextElements(slide, theme, emptyRels, resolver)
    // 8400 (layout) should win over 4400 (master).
    expect(elements[0].fontSize).toBe(112)
  })

  it('per-run sz wins over every inherited default', () => {
    const master = masterXml(`
      <p:titleStyle><a:lvl1pPr><a:defRPr sz="8400"/></a:lvl1pPr></p:titleStyle>
    `)
    const resolver = buildInheritedTextDefaultsResolver(
      undefined,
      undefined,
      extractMasterTextStylesAdvanced(master, theme)
    )

    const slide = slideXml(`
      <p:sp>
        <p:nvSpPr><p:nvSpPr/><p:nvPr><p:ph type="title" idx="0"/></p:nvPr></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="9144000" cy="1371600"/></a:xfrm></p:spPr>
        <p:txBody>
          <a:bodyPr/><a:lstStyle/>
          <a:p><a:r><a:rPr sz="2400"/><a:t>Hello</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    `)

    const elements = extractTextElements(slide, theme, emptyRels, resolver)
    // 2400 in hundredths of points = 24pt × 1.333 = 32px.
    expect(elements[0].fontSize).toBe(32)
  })

  it('free-floating `txBox="1"` shapes with no `sz` anywhere render at 18pt (24px)', () => {
    // This reproduces the shape that rendered clipped in the "CREDIT MEMO
    // CREATION" slide: a `<p:cNvSpPr txBox="1"/>` with `<a:spAutoFit/>`,
    // zero body insets, bold text, and no explicit font size in any of
    // `<a:rPr>`, `<a:pPr>/<a:defRPr>`, or `<a:endParaRPr>`. Before the
    // fix we fell back to 32px which overflowed the 29px auto-fit box;
    // OOXML's presentation-default is 18pt, giving 24px.
    const slide = slideXml(`
      <p:sp>
        <p:nvSpPr><p:cNvPr id="1" name="TextBox 1"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="558233" y="1785443"/><a:ext cx="4273743" cy="276999"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:noFill/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0"><a:spAutoFit/></a:bodyPr>
          <a:lstStyle/>
          <a:p>
            <a:pPr><a:defRPr/></a:pPr>
            <a:r><a:rPr lang="en-US" b="1"/><a:t>New Credit Memo</a:t></a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    `)
    const elements = extractTextElements(slide, theme, emptyRels)
    expect(elements[0].fontSize).toBe(24)
    expect(elements[0].fontWeight).toBe('bold')
  })

  it('falls back to the OOXML presentation default (18pt / 24px) when no resolver is provided', () => {
    const slide = slideXml(`
      <p:sp>
        <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="9144000" cy="1371600"/></a:xfrm></p:spPr>
        <p:txBody>
          <a:bodyPr/><a:lstStyle/>
          <a:p><a:r><a:t>Hello</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    `)
    const elements = extractTextElements(slide, theme, emptyRels)
    // No <a:rPr sz>, no resolver, no pPr/defRPr → PowerPoint resolves
    // against `ppt/presentation.xml > <p:defaultTextStyle>`, whose spec
    // default is `sz="1800"` (18pt). 18pt × 96/72 = 24px. The previous
    // 32px fallback clipped bold text in auto-fit boxes that matched
    // PowerPoint's 29px default height.
    expect(elements[0].fontSize).toBe(24)
  })

  it('preserves lumMod/lumOff on run-level schemeClr colors (the "OLD MODEL" regression)', () => {
    // Slide 15 of the Enterprise AI deck uses
    //   <a:rPr b="1" sz="900">
    //     <a:solidFill><a:schemeClr val="bg1"><a:lumMod val="50000"/></a:schemeClr></a:solidFill>
    // to render the "OLD MODEL" micro-label as 50% grey. With the theme's
    // `bg1` = pure white (`#FFFFFF`), applying `lumMod=50000` (50%) must
    // produce ~#7f7f7f. Regression guard: an earlier code path used to
    // read only `schemeClr@val` and dropped the transforms, which made the
    // text render as pure white and vanish against the white card.
    const whiteTheme: OoxmlTheme = {
      colors: new Map([
        ['bg1', '#FFFFFF'],
        ['lt1', '#FFFFFF']
      ]),
      majorFont: 'Calibri Light',
      minorFont: 'Calibri'
    }

    const slide = slideXml(`
      <p:sp>
        <p:nvSpPr><p:cNvPr id="1" name="Text"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="228600"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:noFill/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0"/>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr b="1" sz="900">
                <a:solidFill>
                  <a:schemeClr val="bg1"><a:lumMod val="50000"/></a:schemeClr>
                </a:solidFill>
              </a:rPr>
              <a:t>OLD MODEL</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    `)

    const elements = extractTextElements(slide, whiteTheme, emptyRels)
    expect(elements).toHaveLength(1)
    // 50% lumMod on white → mid-grey (~#7f7f7f / #808080 depending on
    // rounding). The exact value is not what matters — what matters is
    // that the resolved color is *not* pure white. Before the audit the
    // legacy path returned `#ffffff` because the `lumMod` transform was
    // dropped, making the text invisible on the card.
    const color = elements[0].color?.toLowerCase()
    expect(color).toBeDefined()
    expect(color).not.toBe('#ffffff')
    expect(color).toMatch(/^#[78][0-9a-f]{5}$/)
  })

  it('preserves lumMod on inherited placeholder colors coming from master txStyles', () => {
    // Same transform, but now the color comes from the master's
    // `<p:bodyStyle><a:lvl1pPr><a:defRPr><a:solidFill><a:schemeClr val="bg1">
    //   <a:lumMod val="50000"/></a:schemeClr></a:solidFill></a:defRPr></a:lvl1pPr>`.
    // The slide's run is bare, so its color is filled by
    // `extractInheritedTextDefaults.parseDefRPr` → `resolveColor`, which
    // must still apply lumMod. Regression guard for the audit.
    const whiteTheme: OoxmlTheme = {
      colors: new Map([
        ['bg1', '#FFFFFF'],
        ['lt1', '#FFFFFF']
      ]),
      majorFont: 'Calibri Light',
      minorFont: 'Calibri'
    }

    const master = masterXml(`
      <p:bodyStyle>
        <a:lvl1pPr>
          <a:defRPr sz="900" b="1">
            <a:solidFill>
              <a:schemeClr val="bg1"><a:lumMod val="50000"/></a:schemeClr>
            </a:solidFill>
          </a:defRPr>
        </a:lvl1pPr>
      </p:bodyStyle>
    `)
    const resolver = buildInheritedTextDefaultsResolver(
      undefined,
      undefined,
      extractMasterTextStylesAdvanced(master, whiteTheme)
    )

    const slide = slideXml(`
      <p:sp>
        <p:nvSpPr><p:nvSpPr/><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="228600"/></a:xfrm></p:spPr>
        <p:txBody>
          <a:bodyPr/><a:lstStyle/>
          <a:p><a:r><a:t>OLD MODEL</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    `)

    const elements = extractTextElements(slide, whiteTheme, emptyRels, resolver)
    const color = elements[0].color?.toLowerCase()
    expect(color).toBeDefined()
    expect(color).not.toBe('#ffffff')
    expect(color).toMatch(/^#[78][0-9a-f]{5}$/)
  })

  it('resolves <a:gradFill> on run-level text fill to the most opaque stop (slide-1 regression)', () => {
    // Slide 1 of the Enterprise AI deck colors "The NEWWORK Enterprise AI."
    // with a three-stop gradient — bg1@67% opacity at 0 %, bg1 fully opaque
    // at 31 %, bg1@67% opacity at 100 % — instead of a solid fill. The old
    // code path only read <a:solidFill>, left the run color undefined, and
    // made `determineDominantFormatting` fall back to the theme's `dk1`
    // (= #000) so the title rendered as black on a dark background and
    // disappeared. We now collapse gradient text fills to the most opaque
    // stop, which for this "fade in → solid → fade out" pattern lands on
    // the pure white center.
    const whiteTheme: OoxmlTheme = {
      colors: new Map([
        ['bg1', '#FFFFFF'],
        ['lt1', '#FFFFFF'],
        ['dk1', '#000000']
      ]),
      majorFont: 'Calibri Light',
      minorFont: 'Calibri'
    }

    const slide = slideXml(`
      <p:sp>
        <p:nvSpPr><p:cNvPr id="1" name="Title"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="449999" y="3319081"/><a:ext cx="10696971" cy="2450347"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:noFill/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="en-US" sz="6000">
                <a:gradFill>
                  <a:gsLst>
                    <a:gs pos="0"><a:schemeClr val="bg1"><a:alpha val="67000"/></a:schemeClr></a:gs>
                    <a:gs pos="100000"><a:schemeClr val="bg1"><a:alpha val="67000"/></a:schemeClr></a:gs>
                    <a:gs pos="31000"><a:schemeClr val="bg1"/></a:gs>
                  </a:gsLst>
                  <a:lin ang="0" scaled="0"/>
                </a:gradFill>
              </a:rPr>
              <a:t>The NEWWORK Enterprise AI.</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    `)

    const elements = extractTextElements(slide, whiteTheme, emptyRels)
    expect(elements).toHaveLength(1)
    const color = elements[0].color?.toLowerCase()
    expect(color).toBeDefined()
    expect(color).toBe('#ffffff')
  })

  it('resolves <a:gradFill> on inherited layout defRPr to a visible stop', () => {
    // Layout 6 of the Enterprise AI deck sets its idx=11 body placeholder
    // default run color via `<a:lstStyle><a:lvl1pPr><a:defRPr><a:gradFill>
    // <a:gsLst>... bg1@50%, bg1@50%, bg1 ...` — i.e. the defaults, not the
    // run, carry the gradient. Slide 1's actual runs were bare and the old
    // inherited path only read solidFill, so the run color ended up
    // undefined again. We want the inherited defaults to pick a visible
    // opaque stop so bare runs on gradient-default placeholders still
    // resolve to a sensible color.
    const whiteTheme: OoxmlTheme = {
      colors: new Map([
        ['bg1', '#FFFFFF'],
        ['lt1', '#FFFFFF'],
        ['dk1', '#000000']
      ]),
      majorFont: 'Calibri Light',
      minorFont: 'Calibri'
    }

    const layout = layoutXml(`
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="14" name="Textplatzhalter 13"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="body" sz="quarter" idx="11"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="450000" y="3319082"/><a:ext cx="9330020" cy="1468380"/></a:xfrm></p:spPr>
        <p:txBody>
          <a:bodyPr lIns="0" tIns="0" rIns="0" bIns="0"><a:noAutofit/></a:bodyPr>
          <a:lstStyle>
            <a:lvl1pPr marL="0" indent="0">
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
                <a:latin typeface="Funnel Display"/>
              </a:defRPr>
            </a:lvl1pPr>
          </a:lstStyle>
          <a:p><a:r><a:rPr lang="de-DE" sz="6000"/><a:t>Title here</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    `)

    const placeholderStyles = extractPlaceholderStyles(layout, whiteTheme, undefined)
    const resolver = buildInheritedTextDefaultsResolver(placeholderStyles, undefined, {
      title: new Map(),
      body: new Map(),
      other: new Map()
    })

    const slide = slideXml(`
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Textplatzhalter 1"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="body" sz="quarter" idx="11"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="449999" y="3319081"/><a:ext cx="10696971" cy="2450347"/></a:xfrm></p:spPr>
        <p:txBody>
          <a:bodyPr/><a:lstStyle/>
          <a:p><a:r><a:rPr lang="en-US"/><a:t>The NEWWORK Enterprise AI.</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    `)

    const elements = extractTextElements(slide, whiteTheme, emptyRels, resolver)
    expect(elements).toHaveLength(1)
    const color = elements[0].color?.toLowerCase()
    expect(color).toBeDefined()
    // The bare run should inherit the gradient's opaque center stop, i.e.
    // plain white, not the theme's dk1 (#000).
    expect(color).toBe('#ffffff')
  })

  it('honors cap="all" arriving via master txStyles lvl1pPr defRPr', () => {
    const master = masterXml(`
      <p:titleStyle><a:lvl1pPr><a:defRPr sz="8400" cap="all"/></a:lvl1pPr></p:titleStyle>
    `)
    const resolver = buildInheritedTextDefaultsResolver(
      undefined,
      undefined,
      extractMasterTextStylesAdvanced(master, theme)
    )

    const slide = slideXml(`
      <p:sp>
        <p:nvSpPr><p:nvSpPr/><p:nvPr><p:ph type="title" idx="0"/></p:nvPr></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="9144000" cy="1371600"/></a:xfrm></p:spPr>
        <p:txBody>
          <a:bodyPr/><a:lstStyle/>
          <a:p><a:r><a:t>Solution Requirements</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    `)

    const elements = extractTextElements(slide, theme, emptyRels, resolver)
    expect(elements[0].textTransform).toBe('uppercase')
  })
})
