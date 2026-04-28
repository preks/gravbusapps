import JSZip from 'jszip'
import { renderHook, act } from '@testing-library/react'
import { usePowerPointParser } from '../usePowerPointParser'
import type { ImageElement, TextElement } from '../../components/slideElements'
import { sanitizeSlideImageUrl } from '../../utils/slideMediaUrl'

const PRESENTATION_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
    <p:sldId id="256" r:id="rSlide1"/>
    <p:sldId id="257" r:id="rSlide2"/>
  </p:sldIdLst>
</p:presentation>`

const SLIDE1_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:spPr>
          <a:xfrm>
            <a:off x="914400" y="457200"/>
            <a:ext cx="6096000" cy="914400"/>
          </a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr sz="4400" b="1"/>
              <a:t>Fixture Title</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:spPr>
          <a:xfrm>
            <a:off x="914400" y="2057400"/>
            <a:ext cx="6096000" cy="914400"/>
          </a:xfrm>
          <a:prstGeom prst="rect"/>
          <a:solidFill><a:srgbClr val="4472C4"/></a:solidFill>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p/>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`

const SLIDE2_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:spPr>
          <a:xfrm>
            <a:off x="914400" y="914400"/>
            <a:ext cx="6096000" cy="914400"/>
          </a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:p>
            <a:r><a:t>Slide two content</a:t></a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`

const PRESENTATION_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rSlide1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
  <Relationship Id="rSlide2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide2.xml"/>
</Relationships>`

const THEME_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme">
  <a:themeElements>
    <a:clrScheme name="Office">
      <a:dk1><a:srgbClr val="000000"/></a:dk1>
      <a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="44546A"/></a:dk2>
      <a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>
      <a:accent1><a:srgbClr val="4472C4"/></a:accent1>
      <a:accent2><a:srgbClr val="ED7D31"/></a:accent2>
      <a:accent3><a:srgbClr val="A5A5A5"/></a:accent3>
      <a:accent4><a:srgbClr val="FFC000"/></a:accent4>
      <a:accent5><a:srgbClr val="5B9BD5"/></a:accent5>
      <a:accent6><a:srgbClr val="70AD47"/></a:accent6>
      <a:hlink><a:srgbClr val="0563C1"/></a:hlink>
      <a:folHlink><a:srgbClr val="954F72"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Office">
      <a:majorFont><a:latin typeface="Calibri Light"/></a:majorFont>
      <a:minorFont><a:latin typeface="Calibri"/></a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Office"/>
  </a:themeElements>
</a:theme>`

async function buildMinimalPptx(presentationXml: string = PRESENTATION_XML): Promise<File> {
  const zip = new JSZip()
  zip.file('ppt/presentation.xml', presentationXml)
  zip.file('ppt/_rels/presentation.xml.rels', PRESENTATION_RELS)
  zip.file('ppt/slides/slide1.xml', SLIDE1_XML)
  zip.file('ppt/slides/slide2.xml', SLIDE2_XML)
  zip.file('ppt/theme/theme1.xml', THEME_XML)

  const arrayBuffer = await zip.generateAsync({ type: 'arraybuffer' })
  const file = new File([arrayBuffer], 'fixture.pptx', {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  })
  // jsdom's File does not implement arrayBuffer(); back-fill the bytes we zipped.
  if (typeof (file as { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer !== 'function') {
    Object.defineProperty(file, 'arrayBuffer', {
      value: () => Promise.resolve(arrayBuffer)
    })
  }
  return file
}

async function buildPptxFromZip(zip: JSZip, fileName = 'fixture.pptx'): Promise<File> {
  const arrayBuffer = await zip.generateAsync({ type: 'arraybuffer' })
  const file = new File([arrayBuffer], fileName, {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  })
  if (typeof (file as { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer !== 'function') {
    Object.defineProperty(file, 'arrayBuffer', {
      value: () => Promise.resolve(arrayBuffer)
    })
  }
  return file
}

/** Inject a <p:sldSz> element right before the closing </p:presentation>. */
function withSlideSize(cx: number, cy: number, type = 'screen16x9'): string {
  return PRESENTATION_XML.replace(
    '</p:presentation>',
    `<p:sldSz cx="${cx}" cy="${cy}" type="${type}"/></p:presentation>`
  )
}

describe('usePowerPointParser integration', () => {
  it('parses a two-slide deck end-to-end', async () => {
    const file = await buildMinimalPptx()
    const { result } = renderHook(() => usePowerPointParser())

    let parsed
    await act(async () => {
      parsed = await result.current.parseFile(file)
    })

    expect(parsed).toBeDefined()
    expect(parsed!.slideCount).toBe(2)
    expect(result.current.error).toBeNull()
    expect(result.current.isLoading).toBe(false)

    const [slide1, slide2] = parsed!.slides
    expect(slide1.elements.length).toBeGreaterThanOrEqual(2)

    const titleText = slide1.elements.find(
      el => el.type === 'text' && (el as TextElement).content === 'Fixture Title'
    ) as TextElement | undefined
    expect(titleText).toBeDefined()
    expect(titleText!.fontWeight).toBe('bold')

    const slide2Text = slide2.elements.find(
      el => el.type === 'text' && (el as TextElement).content === 'Slide two content'
    )
    expect(slide2Text).toBeDefined()

    expect(parsed!.messages.some(m => m.message === 'parser-theme-mapped')).toBe(true)
  })

  it('rejects a file with the wrong extension or mime', async () => {
    const textFile = new File(['not a pptx'], 'junk.txt', { type: 'text/plain' })
    const { result } = renderHook(() => usePowerPointParser())
    let parsed: unknown
    await act(async () => {
      parsed = await result.current.parseFile(textFile)
    })
    expect(parsed).toBeNull()
    expect(result.current.error).toBe('parser-invalid-type')
  })

  it('defaults every slide to the legacy 16:9 canvas when <p:sldSz> is absent', async () => {
    const file = await buildMinimalPptx()
    const { result } = renderHook(() => usePowerPointParser())
    let parsed
    await act(async () => {
      parsed = await result.current.parseFile(file)
    })
    expect(parsed!.canvasSize).toEqual({ width: 1280, height: 720 })
    for (const slide of parsed!.slides) {
      expect(slide.canvasSize).toEqual({ width: 1280, height: 720 })
    }
    // No slide-size message should be emitted when the deck omits sldSz.
    expect(parsed!.messages.every(m => m.message !== 'parser-slide-size-detected')).toBe(true)
  })

  it('imports the deck-level <p:sldSz> and threads it onto every slide', async () => {
    // 4:3 on-screen show: 9144000 x 6858000 EMU -> 960 x 720 px.
    const file = await buildMinimalPptx(withSlideSize(9144000, 6858000, 'screen4x3'))
    const { result } = renderHook(() => usePowerPointParser())
    let parsed
    await act(async () => {
      parsed = await result.current.parseFile(file)
    })
    expect(parsed!.canvasSize).toEqual({ width: 960, height: 720 })
    expect(parsed!.slideSizePreset).toBe('screen4x3')
    expect(parsed!.slides).toHaveLength(2)
    for (const slide of parsed!.slides) {
      expect(slide.canvasSize).toEqual({ width: 960, height: 720 })
    }
    const sizeMsg = parsed!.messages.find(m => m.message === 'parser-slide-size-detected')
    expect(sizeMsg?.params).toMatchObject({ width: '960', height: '720', preset: 'screen4x3' })
  })

  it('imports embedded images when the relationship target is absolute and URI-escaped', async () => {
    const zip = new JSZip()
    zip.file(
      'ppt/presentation.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldIdLst>
    <p:sldId id="256" r:id="rSlide1"/>
  </p:sldIdLst>
</p:presentation>`
    )
    zip.file(
      'ppt/slides/slide1.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      <p:pic>
        <p:nvPicPr/>
        <p:blipFill>
          <a:blip r:embed="rIdImage1"/>
        </p:blipFill>
        <p:spPr>
          <a:xfrm>
            <a:off x="914400" y="457200"/>
            <a:ext cx="1828800" cy="914400"/>
          </a:xfrm>
        </p:spPr>
      </p:pic>
    </p:spTree>
  </p:cSld>
</p:sld>`
    )
    zip.file(
      'ppt/slides/_rels/slide1.xml.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdImage1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="/ppt/media/Brand%20Hero.png"/>
</Relationships>`
    )
    zip.file('ppt/theme/theme1.xml', THEME_XML)
    zip.file('ppt/media/Brand Hero.png', new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0]))

    const file = await buildPptxFromZip(zip, 'image-fixture.pptx')
    const { result } = renderHook(() => usePowerPointParser())

    let parsed
    await act(async () => {
      parsed = await result.current.parseFile(file)
    })

    expect(parsed).toBeDefined()
    expect(parsed!.slides).toHaveLength(1)
    const image = parsed!.slides[0].elements.find(el => el.type === 'image') as ImageElement | undefined
    expect(image).toBeDefined()
    expect(image!.src).toMatch(/^data:image\/png;base64,/)
  })

  it('imports extension-less media as image/<type> so the renderer sanitizer accepts it', async () => {
    // Regression: the importer used to fall back to
    // `data:application/octet-stream` for extension-less files, which
    // SlideCanvas then rejected, showing the image as blank. We now sniff
    // magic bytes and always produce a data:image/... URL.
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
    const zip = new JSZip()
    zip.file(
      'ppt/presentation.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldIdLst>
    <p:sldId id="256" r:id="rSlide1"/>
  </p:sldIdLst>
</p:presentation>`
    )
    zip.file(
      'ppt/slides/slide1.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      <p:pic>
        <p:nvPicPr/>
        <p:blipFill>
          <a:blip r:embed="rIdImg"/>
        </p:blipFill>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="914400" cy="914400"/>
          </a:xfrm>
        </p:spPr>
      </p:pic>
    </p:spTree>
  </p:cSld>
</p:sld>`
    )
    zip.file(
      'ppt/slides/_rels/slide1.xml.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdImg" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/mystery"/>
</Relationships>`
    )
    zip.file('ppt/theme/theme1.xml', THEME_XML)
    zip.file('ppt/media/mystery', pngBytes)

    const file = await buildPptxFromZip(zip, 'extless.pptx')
    const { result } = renderHook(() => usePowerPointParser())

    let parsed
    await act(async () => {
      parsed = await result.current.parseFile(file)
    })

    const image = parsed!.slides[0].elements.find(el => el.type === 'image') as ImageElement | undefined
    expect(image).toBeDefined()
    expect(image!.src.startsWith('data:image/')).toBe(true)
    // Contract guarantee: the imported src must survive the exact sanitizer
    // used by the editor / thumbnail / export renderer. Without this, an
    // import could look fine in preview and render as a blank frame later.
    expect(sanitizeSlideImageUrl(image!.src)).toBe(image!.src)
  })

  it('emits a warning (rather than a silent blank) when a picture uses r:link instead of r:embed', async () => {
    const zip = new JSZip()
    zip.file(
      'ppt/presentation.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldIdLst>
    <p:sldId id="256" r:id="rSlide1"/>
  </p:sldIdLst>
</p:presentation>`
    )
    zip.file(
      'ppt/slides/slide1.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      <p:pic>
        <p:nvPicPr/>
        <p:blipFill>
          <a:blip r:link="rIdLinked"/>
        </p:blipFill>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="914400" cy="914400"/>
          </a:xfrm>
        </p:spPr>
      </p:pic>
    </p:spTree>
  </p:cSld>
</p:sld>`
    )
    zip.file(
      'ppt/slides/_rels/slide1.xml.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdLinked" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="https://example.com/external.png" TargetMode="External"/>
</Relationships>`
    )
    zip.file('ppt/theme/theme1.xml', THEME_XML)

    const file = await buildPptxFromZip(zip, 'linked-image.pptx')
    const { result } = renderHook(() => usePowerPointParser())

    let parsed
    await act(async () => {
      parsed = await result.current.parseFile(file)
    })

    const image = parsed!.slides[0].elements.find(el => el.type === 'image') as ImageElement | undefined
    expect(image?.src).toBe('https://example.com/external.png')
    expect(parsed!.messages.some(m => m.message === 'parser-image-linked-unsupported')).toBe(false)
  })

  it('imports images that live inside nested groups (not just top-level pictures)', async () => {
    // Regression: flattenGroups used to stop at the first <p:grpSp> layer,
    // so images nested two levels deep silently vanished from the deck.
    const zip = new JSZip()
    zip.file(
      'ppt/presentation.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldIdLst>
    <p:sldId id="256" r:id="rSlide1"/>
  </p:sldIdLst>
</p:presentation>`
    )
    zip.file(
      'ppt/slides/slide1.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      <p:grpSp>
        <p:nvGrpSpPr/>
        <p:grpSpPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="1828800" cy="1828800"/>
            <a:chOff x="0" y="0"/>
            <a:chExt cx="1828800" cy="1828800"/>
          </a:xfrm>
        </p:grpSpPr>
        <p:grpSp>
          <p:nvGrpSpPr/>
          <p:grpSpPr>
            <a:xfrm>
              <a:off x="0" y="0"/>
              <a:ext cx="1828800" cy="1828800"/>
              <a:chOff x="0" y="0"/>
              <a:chExt cx="1828800" cy="1828800"/>
            </a:xfrm>
          </p:grpSpPr>
          <p:pic>
            <p:nvPicPr/>
            <p:blipFill>
              <a:blip r:embed="rIdNested"/>
            </p:blipFill>
            <p:spPr>
              <a:xfrm>
                <a:off x="228600" y="228600"/>
                <a:ext cx="914400" cy="914400"/>
              </a:xfrm>
            </p:spPr>
          </p:pic>
        </p:grpSp>
      </p:grpSp>
    </p:spTree>
  </p:cSld>
</p:sld>`
    )
    zip.file(
      'ppt/slides/_rels/slide1.xml.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdNested" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/nested.png"/>
</Relationships>`
    )
    zip.file('ppt/theme/theme1.xml', THEME_XML)
    zip.file('ppt/media/nested.png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]))

    const file = await buildPptxFromZip(zip, 'nested-image.pptx')
    const { result } = renderHook(() => usePowerPointParser())

    let parsed
    await act(async () => {
      parsed = await result.current.parseFile(file)
    })

    const image = parsed!.slides[0].elements.find(el => el.type === 'image') as ImageElement | undefined
    expect(image).toBeDefined()
    expect(image!.src.startsWith('data:image/')).toBe(true)
  })

  it('resets state on demand', async () => {
    const file = await buildMinimalPptx()
    const { result } = renderHook(() => usePowerPointParser())
    await act(async () => {
      await result.current.parseFile(file)
    })
    expect(result.current.parsedDocument).not.toBeNull()

    act(() => {
      result.current.reset()
    })
    expect(result.current.parsedDocument).toBeNull()
    expect(result.current.progress).toBe(0)
    expect(result.current.error).toBeNull()
  })
})
