import JSZip from 'jszip'
import { parseOdfToHtml } from './odfParserUtils'

const CONTENT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0">
  <office:automatic-styles>
    <style:style style:name="table1" style:family="table">
      <style:table-properties style:width="8cm"/>
    </style:style>
    <style:style style:name="cell1" style:family="table-cell">
      <style:table-cell-properties
        fo:background-color="#FFEEAA"
        style:vertical-align="middle"
        fo:border="0.75pt solid #123456"/>
    </style:style>
    <style:style style:name="text1" style:family="text">
      <style:text-properties fo:font-size="14pt" fo:color="#123456" fo:font-family="Calibri"/>
    </style:style>
  </office:automatic-styles>
  <office:body>
    <office:text>
      <table:table table:style-name="table1">
        <table:table-row>
          <table:table-cell table:style-name="cell1" table:number-rows-spanned="2">
            <text:p>Line 1</text:p>
            <text:p><text:span text:style-name="text1">Line 2</text:span></text:p>
          </table:table-cell>
          <table:table-cell>
            <text:p>Side A</text:p>
          </table:table-cell>
        </table:table-row>
        <table:table-row>
          <table:covered-table-cell />
          <table:table-cell>
            <text:p>Side B</text:p>
          </table:table-cell>
        </table:table-row>
      </table:table>
    </office:text>
  </office:body>
</office:document-content>`

async function createMinimalOdf(contentXml: string): Promise<ArrayBuffer> {
  const zip = new JSZip()
  zip.file('mimetype', 'application/vnd.oasis.opendocument.text')
  zip.file('content.xml', contentXml)
  return zip.generateAsync({ type: 'arraybuffer' })
}

describe('parseOdfToHtml tables', () => {
  it('preserves table rowspan and paragraph structure inside cells', async () => {
    const result = await parseOdfToHtml(await createMinimalOdf(CONTENT_XML))

    expect(result.html).toContain('<table class="document-table" style="width: 8cm">')
    expect(result.html).toContain('rowspan="2"')
    expect(result.html).toContain('<p>Line 1</p><p>')
    expect(result.html).toContain('Side B')
  })

  it('preserves cell styles and inline text formatting from ODF styles', async () => {
    const result = await parseOdfToHtml(await createMinimalOdf(CONTENT_XML))

    expect(result.html).toContain('background-color: #FFEEAA')
    expect(result.html).toContain('vertical-align: middle')
    expect(result.html).toContain('border: 0.75pt solid #123456')
    expect(result.html).toContain('font-size: 14pt')
    expect(result.html).toContain('color: #123456')
    expect(result.html).toContain('font-family: Calibri')
  })
})
