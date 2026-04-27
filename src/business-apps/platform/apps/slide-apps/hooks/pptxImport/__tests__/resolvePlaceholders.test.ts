import { parseXML, getChild } from '../ooxmlUtils'
import { collectPlaceholders, inheritPlaceholderFromLayout } from '../resolvePlaceholders'

function docFrom(spTree: string): Document {
  return parseXML(`
    <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
           xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
           xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <p:cSld><p:spTree>${spTree}</p:spTree></p:cSld>
    </p:sld>
  `)
}

const LAYOUT_TITLE_SP = `
  <p:sp>
    <p:nvSpPr>
      <p:cNvPr id="2" name="Title 1"/>
      <p:nvPr><p:ph type="title" idx="0"/></p:nvPr>
    </p:nvSpPr>
    <p:spPr>
      <a:xfrm>
        <a:off x="914400" y="457200"/>
        <a:ext cx="8229600" cy="1143000"/>
      </a:xfrm>
    </p:spPr>
    <p:txBody>
      <a:bodyPr/>
      <a:p><a:r><a:t>Layout default title</a:t></a:r></a:p>
    </p:txBody>
  </p:sp>
`

describe('resolvePlaceholders', () => {
  it('collects layout placeholders by key, type, and idx', () => {
    const layout = docFrom(LAYOUT_TITLE_SP)
    const map = collectPlaceholders(layout)
    expect(map.byKey.has('title|0')).toBe(true)
    expect(map.byType.has('title')).toBe(true)
    expect(map.byIdx.has('0')).toBe(true)
  })

  it('inherits transform from layout when slide placeholder has none', () => {
    const slide = docFrom(`
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Title 1"/>
          <p:nvPr><p:ph type="title"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:p><a:r><a:t>Slide title content</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    `)
    const layout = docFrom(LAYOUT_TITLE_SP)
    const layoutMap = collectPlaceholders(layout)

    const slideSp = slide.getElementsByTagName('p:sp')[0]
    inheritPlaceholderFromLayout(slideSp, layoutMap, undefined)

    const spPr = getChild(slideSp, 'p:spPr')
    const xfrm = spPr ? getChild(spPr, 'a:xfrm') : undefined
    expect(xfrm).toBeTruthy()
    const off = xfrm ? getChild(xfrm, 'a:off') : undefined
    expect(off?.getAttribute('x')).toBe('914400')
  })

  it('inherits txBody from layout when slide placeholder has no text', () => {
    const slide = docFrom(`
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Title 1"/>
          <p:nvPr><p:ph type="title"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="1" y="2"/>
            <a:ext cx="3" cy="4"/>
          </a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:p><a:endParaRPr/></a:p>
        </p:txBody>
      </p:sp>
    `)
    const layout = docFrom(LAYOUT_TITLE_SP)
    const layoutMap = collectPlaceholders(layout)

    const slideSp = slide.getElementsByTagName('p:sp')[0]
    inheritPlaceholderFromLayout(slideSp, layoutMap, undefined)

    const txBody = getChild(slideSp, 'p:txBody')
    const text = txBody?.getElementsByTagName('a:t')[0]?.textContent
    expect(text).toBe('Layout default title')
  })

  it('does not overwrite slide text when it is already present', () => {
    const slide = docFrom(`
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Title 1"/>
          <p:nvPr><p:ph type="title"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:p><a:r><a:t>Slide-provided title</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    `)
    const layout = docFrom(LAYOUT_TITLE_SP)
    const layoutMap = collectPlaceholders(layout)

    const slideSp = slide.getElementsByTagName('p:sp')[0]
    inheritPlaceholderFromLayout(slideSp, layoutMap, undefined)

    const txBody = getChild(slideSp, 'p:txBody')
    const text = txBody?.getElementsByTagName('a:t')[0]?.textContent
    expect(text).toBe('Slide-provided title')
  })

  it('falls back to master placeholder when layout has no match', () => {
    const slide = docFrom(`
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Title 1"/>
          <p:nvPr><p:ph type="title"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:p><a:r><a:t>Slide title</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    `)
    const emptyLayout = docFrom('')
    const master = docFrom(LAYOUT_TITLE_SP)

    const slideSp = slide.getElementsByTagName('p:sp')[0]
    inheritPlaceholderFromLayout(slideSp, collectPlaceholders(emptyLayout), collectPlaceholders(master))

    const spPr = getChild(slideSp, 'p:spPr')
    const xfrm = spPr ? getChild(spPr, 'a:xfrm') : undefined
    expect(xfrm).toBeTruthy()
  })

  it('does NOT inherit layout fill/line onto text placeholders (titles, body, etc.)', () => {
    // Regression: a layout title with a solidFill used to bleed through onto
    // the slide title, giving every imported title an accent-colored box.
    // PowerPoint does not paint text placeholders from layout style, so we
    // must not either.
    const layoutWithVisuals = `
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Title 1"/>
          <p:nvPr><p:ph type="title" idx="0"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/><a:ext cx="914400" cy="457200"/>
          </a:xfrm>
          <a:solidFill><a:srgbClr val="FFAA00"/></a:solidFill>
          <a:ln w="19050"><a:solidFill><a:srgbClr val="123456"/></a:solidFill></a:ln>
        </p:spPr>
      </p:sp>
    `
    const slide = docFrom(`
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Title 1"/>
          <p:nvPr><p:ph type="title" idx="0"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="1" y="2"/><a:ext cx="3" cy="4"/>
          </a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:p><a:r><a:t>Slide title</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    `)
    const layoutMap = collectPlaceholders(docFrom(layoutWithVisuals))

    const slideSp = slide.getElementsByTagName('p:sp')[0]
    inheritPlaceholderFromLayout(slideSp, layoutMap, undefined)

    const spPr = getChild(slideSp, 'p:spPr')!
    expect(getChild(spPr, 'a:solidFill')).toBeFalsy()
    expect(getChild(spPr, 'a:ln')).toBeFalsy()
  })

  it('inherits fill/line/geometry from the layout for NON-text placeholders (obj/pic/chart)', () => {
    const layoutWithVisuals = `
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Content"/>
          <p:nvPr><p:ph type="obj" idx="1"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/><a:ext cx="914400" cy="457200"/>
          </a:xfrm>
          <a:prstGeom prst="roundRect"/>
          <a:solidFill><a:srgbClr val="FFAA00"/></a:solidFill>
          <a:ln w="19050"><a:solidFill><a:srgbClr val="123456"/></a:solidFill></a:ln>
        </p:spPr>
      </p:sp>
    `
    const slide = docFrom(`
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Content"/>
          <p:nvPr><p:ph type="obj" idx="1"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="1" y="2"/><a:ext cx="3" cy="4"/>
          </a:xfrm>
        </p:spPr>
      </p:sp>
    `)
    const layoutMap = collectPlaceholders(docFrom(layoutWithVisuals))

    const slideSp = slide.getElementsByTagName('p:sp')[0]
    inheritPlaceholderFromLayout(slideSp, layoutMap, undefined)

    const spPr = getChild(slideSp, 'p:spPr')!
    expect(getChild(spPr, 'a:solidFill')).toBeTruthy()
    expect(getChild(spPr, 'a:ln')).toBeTruthy()
    expect(getChild(spPr, 'a:prstGeom')?.getAttribute('prst')).toBe('roundRect')
  })

  it('inherits explicit fill/line/geometry for body placeholders with visible content boxes', () => {
    const layoutWithVisuals = `
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Content Placeholder"/>
          <p:nvPr><p:ph type="body" idx="1"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/><a:ext cx="914400" cy="457200"/>
          </a:xfrm>
          <a:prstGeom prst="rect"/>
          <a:solidFill>
            <a:srgbClr val="FFFFFF">
              <a:alpha val="65000"/>
            </a:srgbClr>
          </a:solidFill>
          <a:ln w="12700"><a:noFill/></a:ln>
        </p:spPr>
      </p:sp>
    `
    const slide = docFrom(`
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Content Placeholder"/>
          <p:nvPr><p:ph type="body" idx="1"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="1" y="2"/><a:ext cx="3" cy="4"/>
          </a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p/>
        </p:txBody>
      </p:sp>
    `)
    const layoutMap = collectPlaceholders(docFrom(layoutWithVisuals))

    const slideSp = slide.getElementsByTagName('p:sp')[0]
    inheritPlaceholderFromLayout(slideSp, layoutMap, undefined)

    const spPr = getChild(slideSp, 'p:spPr')!
    expect(getChild(spPr, 'a:solidFill')).toBeTruthy()
    expect(getChild(spPr, 'a:ln')).toBeTruthy()
    expect(getChild(spPr, 'a:prstGeom')?.getAttribute('prst')).toBe('rect')
  })

  it('is a no-op for non-placeholder shapes', () => {
    const slide = docFrom(`
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="5" name="Rectangle"/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr/>
      </p:sp>
    `)
    const layout = docFrom(LAYOUT_TITLE_SP)
    const layoutMap = collectPlaceholders(layout)

    const slideSp = slide.getElementsByTagName('p:sp')[0]
    expect(() => inheritPlaceholderFromLayout(slideSp, layoutMap, undefined)).not.toThrow()
    const spPr = getChild(slideSp, 'p:spPr')
    expect(spPr ? getChild(spPr, 'a:xfrm') : undefined).toBeUndefined()
  })
})
