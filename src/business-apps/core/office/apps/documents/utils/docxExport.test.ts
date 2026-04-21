import JSZip from 'jszip'
import { resolveImageDimensions } from '@/components/tiptap-extensions/tiptap-custom-image/sizeUtils'
import { buildDocxBlob } from './docxExport'
import {
  DOCX_IMPORTED_ONLY_PICTURE_STATES,
  DOCX_NON_PERSISTED_PICTURE_STATES,
  DOCX_PICTURE_ATTR_SUPPORT,
  resolveDocxImageMeasurementContext
} from './docxImageExportUtils'
import { JSZipCompat, resolveJsZipConstructor } from './jsZipCompat'

const PX_TO_EMU = 9525
const BASE64_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sWwaP8AAAAASUVORK5CYII='

async function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })
}

async function loadZip(blob: Blob) {
  return await JSZipCompat.loadAsync(await readBlobAsArrayBuffer(blob))
}

async function readZipText(blob: Blob, entryPath: string): Promise<string | undefined> {
  const zip = await loadZip(blob)
  return zip.file(entryPath)?.async('string')
}

function expectXmlToParse(xml: string | undefined) {
  expect(xml).toBeTruthy()

  const parsed = new DOMParser().parseFromString(xml ?? '', 'application/xml')
  expect(parsed.getElementsByTagName('parsererror')).toHaveLength(0)
}

async function readDocumentXml(blob: Blob) {
  return await readZipText(blob, 'word/document.xml')
}

async function readStylesXml(blob: Blob) {
  return await readZipText(blob, 'word/styles.xml')
}

describe('docxExport image layout', () => {
  it('resolves JSZip constructors from raw and default-wrapped module shapes', () => {
    expect(resolveJsZipConstructor(JSZip)).toBe(JSZip)
    expect(resolveJsZipConstructor({ default: JSZip })).toBe(JSZip)
  })

  it('wraps figure drawings in runs and emits the required DOCX package parts', async () => {
    const html = [
      '<figure data-node-type="custom-image" data-image-wrap="front">',
      '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sWwaP8AAAAASUVORK5CYII=" width="240" height="120" />',
      '</figure>'
    ].join('')

    const blob = await buildDocxBlob('Figure doc', html)
    const zip = await loadZip(blob)
    const documentXml = await readDocumentXml(blob)
    const documentRelsXml = await readZipText(blob, 'word/_rels/document.xml.rels')
    const contentTypesXml = await readZipText(blob, '[Content_Types].xml')

    expect(zip.file('_rels/.rels')).toBeTruthy()
    expect(zip.file('word/document.xml')).toBeTruthy()
    expect(zip.file('word/styles.xml')).toBeTruthy()
    expect(zip.file('word/numbering.xml')).toBeTruthy()
    expect(zip.file('word/_rels/document.xml.rels')).toBeTruthy()
    expect(zip.file('[Content_Types].xml')).toBeTruthy()

    expectXmlToParse(documentXml)
    expectXmlToParse(documentRelsXml)
    expectXmlToParse(contentTypesXml)

    expect(documentXml).toContain(
      '<w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:drawing>'
    )
    expect(documentXml).not.toContain('<w:p><w:drawing>')
    expect(documentXml).not.toContain('mc:Ignorable=')
    expect(documentRelsXml).toContain('Target="media/body-image1.png"')
    expect(contentTypesXml).toContain('<Default Extension="png" ContentType="image/png"/>')
    expect(contentTypesXml).toContain(
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
    )
  })

  it('exports header and footer parts with first-page and odd-even references plus Word page fields', async () => {
    const blob = await buildDocxBlob('Quarterly Report', '<p>Body</p>', {
      pages: {
        differentFirstPage: true,
        differentOddEven: true,
        headerFirstPage: '<p>Cover {title}</p>',
        headerOdd: '<p>Odd chapter</p>',
        headerEven: '<p>Even chapter</p>',
        footerFirstPage: '<p>First footer</p>',
        footerOdd: '<p>Odd footer {page} of {total}</p>',
        footerEven: '<p>Even footer {title}</p>',
        pageNumberRegion: 'header',
        pageNumberAlignment: 'outside',
        pageNumberShowOnFirstPage: true,
        pageNumberStartAt: 5,
        pageNumberNumeralStyle: 'upperRoman'
      }
    })
    const documentXml = await readDocumentXml(blob)
    const documentRelsXml = await readZipText(blob, 'word/_rels/document.xml.rels')
    const settingsXml = await readZipText(blob, 'word/settings.xml')
    const headerFirstXml = await readZipText(blob, 'word/header1.xml')
    const headerDefaultXml = await readZipText(blob, 'word/header2.xml')
    const headerEvenXml = await readZipText(blob, 'word/header3.xml')
    const footerFirstXml = await readZipText(blob, 'word/footer1.xml')
    const footerDefaultXml = await readZipText(blob, 'word/footer2.xml')
    const footerEvenXml = await readZipText(blob, 'word/footer3.xml')
    const contentTypesXml = await readZipText(blob, '[Content_Types].xml')

    expectXmlToParse(documentXml)
    expectXmlToParse(documentRelsXml)
    expectXmlToParse(settingsXml)
    expectXmlToParse(headerFirstXml)
    expectXmlToParse(headerDefaultXml)
    expectXmlToParse(headerEvenXml)
    expectXmlToParse(footerFirstXml)
    expectXmlToParse(footerDefaultXml)
    expectXmlToParse(footerEvenXml)
    expectXmlToParse(contentTypesXml)

    expect(documentXml).toContain('<w:titlePg/>')
    expect(documentXml).toContain('<w:pgNumType w:start="5" w:fmt="upperRoman"/>')
    expect(documentXml).toContain('<w:headerReference w:type="first" r:id="rIdHeader1"/>')
    expect(documentXml).toContain('<w:headerReference w:type="default" r:id="rIdHeader2"/>')
    expect(documentXml).toContain('<w:headerReference w:type="even" r:id="rIdHeader3"/>')
    expect(documentXml).toContain('<w:footerReference w:type="first" r:id="rIdFooter1"/>')
    expect(documentXml).toContain('<w:footerReference w:type="default" r:id="rIdFooter2"/>')
    expect(documentXml).toContain('<w:footerReference w:type="even" r:id="rIdFooter3"/>')

    expect(documentRelsXml).toContain('Target="settings.xml"')
    expect(documentRelsXml).toContain('Target="header1.xml"')
    expect(documentRelsXml).toContain('Target="header2.xml"')
    expect(documentRelsXml).toContain('Target="header3.xml"')
    expect(documentRelsXml).toContain('Target="footer1.xml"')
    expect(documentRelsXml).toContain('Target="footer2.xml"')
    expect(documentRelsXml).toContain('Target="footer3.xml"')

    expect(settingsXml).toContain('<w:evenAndOddHeaders/>')

    expect(headerFirstXml).toContain('Quarterly Report')
    expect(headerFirstXml).toContain('w:instr="PAGE \\* ROMAN"')
    expect(headerFirstXml).toContain('<w:jc w:val="right"/>')
    expect(headerDefaultXml).toContain('Odd chapter')
    expect(headerDefaultXml).toContain('<w:jc w:val="right"/>')
    expect(headerEvenXml).toContain('Even chapter')
    expect(headerEvenXml).toContain('<w:jc w:val="left"/>')

    expect(footerFirstXml).toContain('First footer')
    expect(footerDefaultXml).toContain('Odd footer ')
    expect(footerDefaultXml).toContain('w:instr="PAGE \\* ROMAN"')
    expect(footerDefaultXml).toContain('w:instr="NUMPAGES"')
    expect(footerEvenXml).toContain('Quarterly Report')

    expect(contentTypesXml).toContain(
      '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>'
    )
    expect(contentTypesXml).toContain(
      '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>'
    )
    expect(contentTypesXml).toContain(
      '<Override PartName="/word/footer3.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>'
    )
  })

  it('preserves image crop and rotation in generated drawing xml', async () => {
    const html = [
      '<figure data-node-type="custom-image"',
      ' data-image-wrap="front"',
      ' data-image-anchor="fixed"',
      ' data-image-rotation="30"',
      ' data-image-crop-top="0.1"',
      ' data-image-crop-right="0.2"',
      ' data-image-crop-bottom="0.05"',
      ' data-image-crop-left="0.15">',
      '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sWwaP8AAAAASUVORK5CYII=" width="240" height="120" />',
      '</figure>'
    ].join('')

    const blob = await buildDocxBlob('Picture doc', html)
    const documentXml = await readDocumentXml(blob)

    expect(documentXml).toContain('<a:srcRect l="15000" t="10000" r="20000" b="5000"/>')
    expect(documentXml).toContain('rot="1800000"')
    expect(documentXml).toContain('<wp:anchor')
  })

  it('emits picture border line properties when a border is configured', async () => {
    const html = [
      '<figure data-node-type="custom-image"',
      ' data-image-border-visible="true"',
      ' data-image-border-color="#1F4E79"',
      ' data-image-border-width-pt="2.25"',
      ' data-image-border-dash="dash-dot">',
      '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sWwaP8AAAAASUVORK5CYII=" width="240" height="120" />',
      '</figure>'
    ].join('')

    const blob = await buildDocxBlob('Border doc', html)
    const documentXml = await readDocumentXml(blob)

    expect(documentXml).toContain('<a:ln w="28575">')
    expect(documentXml).toContain('<a:srgbClr val="1F4E79"/>')
    expect(documentXml).toContain('<a:prstDash val="dashDot"/>')
  })

  it('exports each wrap mode with the matching WordprocessingML wrapping element', async () => {
    const base64Image =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sWwaP8AAAAASUVORK5CYII='
    const html = [
      `<figure data-node-type="custom-image" data-image-wrap="tight"><img src="${base64Image}" width="120" height="80" /></figure>`,
      `<figure data-node-type="custom-image" data-image-wrap="through"><img src="${base64Image}" width="120" height="80" /></figure>`,
      `<figure data-node-type="custom-image" data-image-wrap="top-bottom"><img src="${base64Image}" width="120" height="80" /></figure>`,
      `<figure data-node-type="custom-image" data-image-wrap="square" data-image-wrap-text-side="right"><img src="${base64Image}" width="120" height="80" /></figure>`,
      `<figure data-node-type="custom-image" data-image-wrap="square" data-image-wrap-text-side="left" data-image-align="right"><img src="${base64Image}" width="120" height="80" /></figure>`
    ].join('')

    const blob = await buildDocxBlob('Wrap doc', html)
    const documentXml = await readDocumentXml(blob)

    expect(documentXml).toContain('<wp:wrapTight wrapText="bothSides">')
    expect(documentXml).toContain('<wp:wrapThrough wrapText="bothSides">')
    expect(documentXml).toContain('<wp:wrapTopAndBottom/>')
    expect(documentXml).toContain('<wp:wrapSquare wrapText="right"/>')
    expect(documentXml).toContain('<wp:wrapSquare wrapText="left"/>')
    expect(documentXml).toContain('<wp:wrapPolygon edited="0">')
    expect(documentXml).toContain('<wp:start x="0" y="0"/>')
    expect(documentXml).toContain('<wp:lineTo x="21600" y="21600"/>')
  })

  it('exports behind-text images as behindDoc anchors without text wrapping exclusion', async () => {
    const html = [
      '<figure data-node-type="custom-image"',
      ' data-image-wrap="behind"',
      ' data-image-anchor="move-with-text">',
      '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sWwaP8AAAAASUVORK5CYII=" width="180" height="90" />',
      '</figure>'
    ].join('')

    const blob = await buildDocxBlob('Behind doc', html)
    const documentXml = await readDocumentXml(blob)

    expect(documentXml).toContain('<wp:anchor')
    expect(documentXml).toContain('behindDoc="1"')
    expect(documentXml).toContain('<wp:wrapNone/>')
  })

  it('classifies persisted, imported-only, and non-persisted picture states explicitly', () => {
    expect(DOCX_PICTURE_ATTR_SUPPORT.src).toBe('supported')
    expect(DOCX_PICTURE_ATTR_SUPPORT.display).toBe('normalized')
    expect(DOCX_PICTURE_ATTR_SUPPORT.alt).toBe('metadata')
    expect(DOCX_PICTURE_ATTR_SUPPORT.title).toBe('metadata')
    expect(DOCX_IMPORTED_ONLY_PICTURE_STATES).toEqual(
      expect.arrayContaining(['wrapMode:tight', 'wrapMode:through', 'wrapMode:top-bottom'])
    )
    expect(DOCX_NON_PERSISTED_PICTURE_STATES).toEqual(
      expect.arrayContaining(['crop-mode', 'drag-preview', 'resize-preview', 'rotate-preview', 'wrap-contour'])
    )
  })

  it('exports centered inline figures with picture metadata and caption paragraphs', async () => {
    const html = [
      '<figure data-node-type="custom-image" data-image-align="center" data-image-wrap="inline" data-image-caption="Centered caption">',
      `<img src="${BASE64_PNG}" alt="Inline alt text" title="Inline title" width="240" height="120" />`,
      '</figure>'
    ].join('')

    const blob = await buildDocxBlob('Inline figure doc', html)
    const documentXml = await readDocumentXml(blob)

    expect(documentXml).toContain(
      '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:drawing>'
    )
    expect(documentXml).toContain('<wp:inline')
    expect(documentXml).toContain('title="Inline title"')
    expect(documentXml).toContain('descr="Inline alt text"')
    expect(documentXml).toContain('Centered caption')
    expect(documentXml).toContain('<w:spacing w:before="0" w:after="120"/>')
  })

  it('preserves rich picture styling from the real inline custom-image editor markup', async () => {
    const html = [
      '<p>',
      '<span',
      ' data-node-type="custom-image"',
      ' data-image-wrap="inline"',
      ' data-image-align="left"',
      ' data-image-rotation="30"',
      ' data-image-crop-top="0.1"',
      ' data-image-crop-right="0.2"',
      ' data-image-crop-bottom="0.05"',
      ' data-image-crop-left="0.15"',
      ' data-image-border-visible="true"',
      ' data-image-border-color="#1F4E79"',
      ' data-image-border-width-pt="2.25"',
      ' data-image-border-dash="dash-dot"',
      ' data-image-caption="Sample image">',
      `<img src="${BASE64_PNG}" alt="Inline editor alt" title="Inline editor title" width="240" height="120" class="editor-image" />`,
      '<span class="editor-image-caption" data-image-caption-text="true">Sample image</span>',
      '</span>',
      '</p>'
    ].join('')

    const blob = await buildDocxBlob('Inline editor markup doc', html)
    const documentXml = await readDocumentXml(blob)

    expect(documentXml).toContain('<a:srcRect l="15000" t="10000" r="20000" b="5000"/>')
    expect(documentXml).toContain('rot="1800000"')
    expect(documentXml).toContain('<a:srgbClr val="1F4E79"/>')
    expect(documentXml).toContain('<a:prstDash val="dashDot"/>')
    expect(documentXml).toContain('title="Inline editor title"')
    expect(documentXml).toContain('descr="Inline editor alt"')
    expect(documentXml).toContain('Sample image')
  })

  it('exports floating picture spacing, offsets, overlap, z-order, and wrap-side settings', async () => {
    const html = [
      '<figure data-node-type="custom-image"',
      ' data-image-wrap="square"',
      ' data-image-wrap-text-side="left"',
      ' data-image-anchor="fixed"',
      ' data-image-distance-top="12"',
      ' data-image-distance-right="18"',
      ' data-image-distance-bottom="24"',
      ' data-image-distance-left="30"',
      ' data-image-offset-x="10"',
      ' data-image-offset-y="20"',
      ' data-image-allow-overlap="true"',
      ' data-image-z-index="7"',
      ' data-image-align="right">',
      `<img src="${BASE64_PNG}" alt="Floating alt" title="Floating title" width="180" height="90" />`,
      '</figure>'
    ].join('')

    const blob = await buildDocxBlob('Floating figure doc', html)
    const documentXml = await readDocumentXml(blob)

    expect(documentXml).toContain('<wp:anchor')
    expect(documentXml).toContain('distT="114300"')
    expect(documentXml).toContain('distR="171450"')
    expect(documentXml).toContain('distB="228600"')
    expect(documentXml).toContain('distL="285750"')
    expect(documentXml).toContain('relativeHeight="7000"')
    expect(documentXml).toContain('allowOverlap="1"')
    expect(documentXml).toContain('<wp:positionH relativeFrom="page"><wp:posOffset>95250</wp:posOffset></wp:positionH>')
    expect(documentXml).toContain(
      '<wp:positionV relativeFrom="page"><wp:posOffset>190500</wp:posOffset></wp:positionV>'
    )
    expect(documentXml).toContain('<wp:wrapSquare wrapText="left"/>')
    expect(documentXml).toContain('title="Floating title"')
    expect(documentXml).toContain('descr="Floating alt"')
  })

  it('uses page-relative measurement context for percent-based picture sizing', async () => {
    const html = [
      '<figure data-node-type="custom-image"',
      ' data-image-wrap="inline"',
      ' data-image-width-unit="percent"',
      ' data-image-width-percent="50"',
      ' data-image-width-relative-to="page"',
      ' data-image-height-unit="percent"',
      ' data-image-height-percent="25"',
      ' data-image-height-relative-to="page">',
      `<img src="${BASE64_PNG}" width="400" height="200" />`,
      '</figure>'
    ].join('')

    const measurementContext = resolveDocxImageMeasurementContext(undefined)
    const resolved = resolveImageDimensions(
      {
        width: 400,
        height: 200,
        widthUnit: 'percent',
        heightUnit: 'percent',
        widthPercent: 50,
        heightPercent: 25,
        widthRelativeTo: 'page',
        heightRelativeTo: 'page',
        scaleWidthPercent: 100,
        scaleHeightPercent: 100,
        wrapMode: 'inline',
        align: 'left',
        anchorMode: 'inline',
        display: 'inline'
      },
      measurementContext
    )
    const blob = await buildDocxBlob('Percent figure doc', html)
    const documentXml = await readDocumentXml(blob)

    expect(documentXml).toContain(
      `<wp:extent cx="${(resolved.width ?? 0) * PX_TO_EMU}" cy="${(resolved.height ?? 0) * PX_TO_EMU}"/>`
    )
  })

  it('keeps plain inline image fallback intentionally limited to size and metadata', async () => {
    const html = `<p>Before <img src="${BASE64_PNG}" alt="Plain alt" title="Plain title" width="48" height="24" style="border: 2pt solid #1F4E79; transform: rotate(45deg);" /> after</p>`

    const blob = await buildDocxBlob('Plain img doc', html)
    const documentXml = await readDocumentXml(blob)

    expect(documentXml).toContain('title="Plain title"')
    expect(documentXml).toContain('descr="Plain alt"')
    expect(documentXml).toContain(`<wp:extent cx="${48 * PX_TO_EMU}" cy="${24 * PX_TO_EMU}"/>`)
    expect(documentXml).not.toContain('<a:prstDash val="dash"/>')
    expect(documentXml).not.toContain('<a:srgbClr val="1F4E79"/>')
    expect(documentXml).not.toContain('rot="2700000"')
  })

  it('normalizes common inline style fallbacks for custom-image figures', async () => {
    const html = [
      '<figure data-node-type="custom-image" style="text-align: center; border-color: #1F4E79; border-width: 2pt; border-style: dashed;">',
      `<img src="${BASE64_PNG}" alt="Styled alt" title="Styled title" width="160" height="80" />`,
      '</figure>'
    ].join('')

    const blob = await buildDocxBlob('Styled figure doc', html)
    const documentXml = await readDocumentXml(blob)

    expect(documentXml).toContain(
      '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:drawing>'
    )
    expect(documentXml).toContain('<a:srgbClr val="1F4E79"/>')
    expect(documentXml).toContain('<a:prstDash val="dash"/>')
    expect(documentXml).toContain('title="Styled title"')
    expect(documentXml).toContain('descr="Styled alt"')
  })

  it('exports document ToC blocks as native Word fields with cached result paragraphs', async () => {
    const html = `
      <div
        data-document-toc=""
        data-toc-snapshot='{"version":2,"entries":[{"level":1,"text":"Overview","pos":12,"blockStart":11,"pageNumber":"3"}],"updatedAt":"2026-04-14T10:00:00.000Z","updateMode":"entire","layoutVersion":1}'
        data-toc-styles='{"title":{"fontFamily":"Arial","fontSizePt":14,"bold":false,"italic":true,"color":"#990000"},"entries":{"fontFamily":"Calibri","fontSizePt":11,"bold":true,"italic":false,"color":"#123456"}}'
        data-toc-show-page-numbers="true"
        data-toc-right-align-page-numbers="true"
        data-toc-tab-leader="dot"
        data-toc-heading-links="true"
        data-toc-max-heading-level="3"
      >
        <div class="document-toc-print-inner">
          <div class="document-toc-print-title">Table of contents</div>
        </div>
      </div>
      <h1>Overview</h1>
    `

    const blob = await buildDocxBlob('ToC doc', html)
    const documentXml = await readDocumentXml(blob)
    const stylesXml = await readStylesXml(blob)

    expect(documentXml).toContain('Table of contents')
    expect(documentXml).toContain('Overview')
    expect(documentXml).toContain('<w:pStyle w:val="TOCHeading"/>')
    expect(documentXml).toContain('<w:fldChar w:fldCharType="begin"/>')
    expect(documentXml).toContain('<w:instrText xml:space="preserve"> TOC \\o "1-3" \\h </w:instrText>')
    expect(documentXml).toContain('<w:fldChar w:fldCharType="separate"/>')
    expect(documentXml).toContain('<w:pStyle w:val="TOC1"/>')
    expect(documentXml).toContain('<w:tab/>')
    expect(documentXml).toContain('<w:fldChar w:fldCharType="end"/>')
    expect(documentXml).toContain('<w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>')
    expect(documentXml).toContain('<w:sz w:val="28"/>')
    expect(documentXml).toContain('<w:i/>')
    expect(documentXml).toContain('<w:color w:val="990000"/>')
    expect(documentXml).toContain('<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>')
    expect(documentXml).toContain('<w:sz w:val="22"/>')
    expect(documentXml).toContain('<w:b/>')
    expect(documentXml).toContain('<w:color w:val="123456"/>')
    expect(documentXml).toContain('<w:pStyle w:val="Heading1"/>')
    expect(documentXml).toContain('<w:bookmarkStart w:id="1" w:name="_Toc1"/>')
    expect(documentXml).toContain('<w:bookmarkEnd w:id="1"/>')
    expect(stylesXml).toContain('<w:style w:type="paragraph" w:styleId="TOCHeading">')
    expect(stylesXml).toContain('<w:style w:type="paragraph" w:styleId="TOC1">')
    expect(stylesXml).toContain('<w:style w:type="paragraph" w:styleId="TOC6">')
    expect(stylesXml).toContain('<w:basedOn w:val="Normal"/>')
    expect(stylesXml).toContain('<w:tabs><w:tab w:val="right" w:leader="dot" w:pos="9350"/></w:tabs>')
    expect(stylesXml).toContain('<w:ind w:left="1800"/>')
    expect(stylesXml).toContain(
      '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:outlineLvl w:val="0"/>'
    )
  })

  it('maps Word TOC field switches from current block settings', async () => {
    const html = `
      <div
        data-document-toc=""
        data-toc-snapshot='{"version":2,"entries":[],"updatedAt":"2026-04-14T10:00:00.000Z","updateMode":"entire","layoutVersion":1}'
        data-toc-styles='{"title":{"fontFamily":"Arial","fontSizePt":14,"bold":false,"italic":true,"color":"#990000"},"entries":{"fontFamily":"Calibri","fontSizePt":11,"bold":true,"italic":false,"color":"#123456"}}'
        data-toc-show-page-numbers="false"
        data-toc-right-align-page-numbers="true"
        data-toc-tab-leader="none"
        data-toc-heading-links="false"
        data-toc-max-heading-level="2"
      >
        <div class="document-toc-print-inner">
          <div class="document-toc-print-title">Contents</div>
        </div>
      </div>
    `

    const blob = await buildDocxBlob('ToC doc', html)
    const documentXml = await readDocumentXml(blob)
    const stylesXml = await readStylesXml(blob)
    const settingsXml = await readZipText(blob, 'word/settings.xml')

    expect(documentXml).toContain('<w:instrText xml:space="preserve"> TOC \\o "1-2" \\n </w:instrText>')
    expect(documentXml).not.toContain(' TOC \\o "1-2" \\h ')
    expect(stylesXml).toContain('<w:style w:type="paragraph" w:styleId="TOC1">')
    expect(stylesXml).not.toContain('<w:tabs><w:tab w:val="right" w:pos="9350"/></w:tabs>')
    expect(settingsXml).not.toContain('<w:updateFields w:val="true"/>')
  })

  it('writes live page setup values into the DOCX section properties', async () => {
    const blob = await buildDocxBlob('Layout doc', '<p>Layout</p>', {
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
    const documentXml = await readDocumentXml(blob)

    expect(documentXml).toContain('<w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>')
    expect(documentXml).toContain(
      '<w:pgMar w:top="567" w:right="1134" w:bottom="1701" w:left="2268" w:header="600" w:footer="840" w:gutter="0"/>'
    )
  })

  it('writes body typography and zero paragraph spacing into styles xml', async () => {
    const blob = await buildDocxBlob('Typography doc', '<p>Text</p>', {
      fontFamily: '"Aptos", Arial, sans-serif',
      fontSize: 16,
      lineHeight: 1.15
    })
    const stylesXml = await readStylesXml(blob)

    expect(stylesXml).toContain('<w:style w:type="paragraph" w:default="1" w:styleId="Normal">')
    expect(stylesXml).toContain('<w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>')
    expect(stylesXml).toContain('<w:sz w:val="24"/>')
    expect(stylesXml).toContain('<w:spacing w:before="0" w:after="0" w:line="276" w:lineRule="auto"/>')
    expect(stylesXml).toContain('<w:style w:type="paragraph" w:styleId="Heading1">')
    expect(stylesXml).toContain('<w:spacing w:before="0" w:after="320" w:line="288" w:lineRule="auto"/>')
  })

  it('uses tighter table paragraph typography to match editor table density', async () => {
    const blob = await buildDocxBlob('Table doc', '<table><tr><th>Head</th><td>Cell</td></tr></table>', {
      fontFamily: '"Aptos", Arial, sans-serif',
      fontSize: 16,
      lineHeight: 1.15
    })
    const documentXml = await readDocumentXml(blob)

    expect(documentXml).toContain('<w:spacing w:before="0" w:after="0" w:line="312" w:lineRule="auto"/>')
    expect(documentXml).toContain('<w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="21"/><w:b/>')
    expect(documentXml).toContain('<w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="21"/>')
  })

  it('maps explicit table and cell styling into Word table OOXML', async () => {
    const html = `
      <table data-table-width="75%" data-table-align="center" data-table-background-color="#EE1B1B">
        <colgroup>
          <col style="width: 120px" />
          <col style="width: 240px" />
        </colgroup>
        <tr>
          <td
            data-cell-background="#FFEEAA"
            data-cell-text-align="center"
            data-cell-vertical-align="middle"
            data-cell-border-top-style="dashed"
            data-cell-border-top-width="2pt"
            data-cell-border-top-color="#123456"
          >
            <span
              style="color: #AA0000; background-color: #00FF00; font-size: 18pt; font-family: Calibri; font-style: italic; font-weight: 700; text-decoration: underline line-through;"
            >
              Styled
            </span>
          </td>
          <td>Plain</td>
        </tr>
      </table>
    `
    const blob = await buildDocxBlob('Styled table doc', html)
    const documentXml = await readDocumentXml(blob)

    expect(documentXml).toContain(
      '<w:tblW w:w="3750" w:type="pct"/><w:tblLayout w:type="fixed"/><w:jc w:val="center"/>'
    )
    expect(documentXml).toContain('<w:tblGrid><w:gridCol w:w="1800"/><w:gridCol w:w="3600"/></w:tblGrid>')
    expect(documentXml).toContain('<w:shd w:val="clear" w:fill="FFEEAA"/>')
    expect(documentXml).toContain('<w:shd w:val="clear" w:fill="EE1B1B"/><w:tcW w:w="3600" w:type="dxa"/>')
    expect(documentXml).toContain(
      '<w:tcMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar>'
    )
    expect(documentXml).toContain('<w:vAlign w:val="center"/>')
    expect(documentXml).toContain('<w:tcW w:w="1800" w:type="dxa"/>')
    expect(documentXml).toContain('<w:top w:val="dashed" w:sz="16" w:space="0" w:color="123456"/>')
    expect(documentXml).toContain(
      '<w:pPr><w:spacing w:before="0" w:after="0" w:line="312" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>'
    )
    expect(documentXml).toContain('<w:color w:val="AA0000"/>')
    expect(documentXml).toContain('<w:shd w:val="clear" w:fill="00FF00"/>')
    expect(documentXml).toContain('<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>')
    expect(documentXml).toContain('<w:sz w:val="36"/>')
    expect(documentXml).toContain('<w:i/>')
    expect(documentXml).toContain('<w:u w:val="single"/>')
    expect(documentXml).toContain('<w:strike/>')
  })

  it('exports merged cells and theme-driven table styling fallbacks', async () => {
    const html = `
      <table
        data-table-theme="purple"
        data-table-style-header-row="true"
        data-table-style-banded-rows="true"
        data-table-background-color="#FFFFFF"
      >
        <tr>
          <td colspan="2">Head</td>
        </tr>
        <tr>
          <td rowspan="2">Merged</td>
          <td>Row A</td>
        </tr>
        <tr>
          <td>Row B</td>
        </tr>
      </table>
    `
    const blob = await buildDocxBlob('Merged table doc', html)
    const documentXml = await readDocumentXml(blob)

    expect(documentXml).toContain('<w:gridSpan w:val="2"/>')
    expect(documentXml).toContain('<w:vMerge w:val="restart"/>')
    expect(documentXml).toContain('<w:vMerge/>')
    expect(documentXml).toContain('<w:shd w:val="clear" w:fill="7C3AED"/>')
    expect(documentXml).toContain('<w:color w:val="FFFFFF"/>')
    expect(documentXml).toContain('<w:shd w:val="clear" w:fill="F5F3FF"/>')
  })

  it('preserves multiple paragraphs inside a single table cell', async () => {
    const html = '<table><tr><td><p>Line 1</p><p>Line 2</p></td></tr></table>'
    const blob = await buildDocxBlob('Cell paragraph doc', html)
    const documentXml = await readDocumentXml(blob)

    expect(documentXml).toContain(
      '<w:tc><w:tcPr><w:tcMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="312" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="21"/></w:rPr><w:t xml:space="preserve">Line 1</w:t></w:r></w:p><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="312" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="21"/></w:rPr><w:t xml:space="preserve">Line 2</w:t></w:r></w:p></w:tc>'
    )
  })

  it('uses fixed layout and fallback grid widths for min-width sized tables', async () => {
    const html = `
      <table style="min-width: 480px">
        <tr>
          <td>A</td>
          <td>B</td>
          <td>C</td>
        </tr>
      </table>
    `
    const blob = await buildDocxBlob('Width doc', html)
    const documentXml = await readDocumentXml(blob)

    expect(documentXml).toContain('<w:tblW w:w="7200" w:type="dxa"/><w:tblLayout w:type="fixed"/>')
    expect(documentXml).toContain(
      '<w:tblGrid><w:gridCol w:w="2400"/><w:gridCol w:w="2400"/><w:gridCol w:w="2400"/></w:tblGrid>'
    )
    expect(documentXml).toContain('<w:tcW w:w="2400" w:type="dxa"/>')
  })

  it('prefers resized grid width over default 100 percent table width', async () => {
    const html = `
      <table data-table-width="100%" data-table-width-mode="manual">
        <colgroup>
          <col style="width: 110px" />
          <col style="width: 150px" />
          <col style="width: 170px" />
        </colgroup>
        <tr>
          <td>A</td>
          <td>B</td>
          <td>C</td>
        </tr>
      </table>
    `
    const blob = await buildDocxBlob('Grid width doc', html)
    const documentXml = await readDocumentXml(blob)

    expect(documentXml).toContain('<w:tblW w:w="6450" w:type="dxa"/><w:tblLayout w:type="fixed"/>')
    expect(documentXml).toContain(
      '<w:tblGrid><w:gridCol w:w="1650"/><w:gridCol w:w="2250"/><w:gridCol w:w="2550"/></w:tblGrid>'
    )
  })
})
