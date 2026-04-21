import JSZip from 'jszip'
import { buildDocxBlob } from './docxExport'
import { JSZipCompat, resolveJsZipConstructor } from './jsZipCompat'

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

    expect(documentXml).toContain('<w:p><w:r><w:drawing>')
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

  it('exports document ToC blocks as static Word paragraphs without live fields', async () => {
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
    expect(documentXml).toContain('<w:pStyle w:val="TOC1"/>')
    expect(documentXml).toContain('<w:tab/>')
    expect(documentXml).not.toContain('TOC \\o')
    expect(documentXml).not.toContain('fldCharType=')
    expect(documentXml).not.toContain('<w:instrText')
    expect(documentXml).toContain('<w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>')
    expect(documentXml).toContain('<w:sz w:val="28"/>')
    expect(documentXml).toContain('<w:i/>')
    expect(documentXml).toContain('<w:color w:val="990000"/>')
    expect(documentXml).toContain('<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>')
    expect(documentXml).toContain('<w:sz w:val="22"/>')
    expect(documentXml).toContain('<w:b/>')
    expect(documentXml).toContain('<w:color w:val="123456"/>')
    expect(documentXml).toContain('<w:pStyle w:val="Heading1"/>')
    expect(stylesXml).toContain('<w:style w:type="paragraph" w:styleId="TOCHeading">')
    expect(stylesXml).toContain('<w:style w:type="paragraph" w:styleId="TOC1">')
    expect(stylesXml).toContain('<w:style w:type="paragraph" w:styleId="TOC6">')
    expect(stylesXml).toContain('<w:basedOn w:val="Normal"/>')
    expect(stylesXml).toContain('<w:tabs><w:tab w:val="right" w:leader="dot" w:pos="9350"/></w:tabs>')
    expect(stylesXml).toContain('<w:ind w:left="1800"/>')
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
