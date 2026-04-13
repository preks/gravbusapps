import { enhanceImportedHtmlWithTableOfContents, parseDocumentXmlForTableOfContents } from './docxTocImportUtils'

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

function minimalDocumentXml(bodyInner: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${W_NS}">
  <w:body>
    ${bodyInner}
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr>
  </w:body>
</w:document>`
}

describe('docxTocImportUtils', () => {
  it('parses a Word TOC field into stored snapshot attrs', () => {
    const xml = minimalDocumentXml(`
      <w:p>
        <w:r><w:fldChar w:fldCharType="begin"/></w:r>
        <w:r><w:instrText xml:space="preserve"> TOC \\o "1-3" \\h </w:instrText></w:r>
        <w:r><w:fldChar w:fldCharType="separate"/></w:r>
      </w:p>
      <w:p>
        <w:pPr><w:pStyle w:val="TOC1"/></w:pPr>
        <w:r><w:t>Overview</w:t></w:r>
        <w:r><w:tab/></w:r>
        <w:r><w:t>4</w:t></w:r>
      </w:p>
      <w:p>
        <w:r><w:fldChar w:fldCharType="end"/></w:r>
      </w:p>
    `)

    const toc = parseDocumentXmlForTableOfContents(xml)

    expect(toc).not.toBeNull()
    expect(toc?.showPageNumbers).toBe(true)
    expect(toc?.headingLinks).toBe(true)
    expect(toc?.maxHeadingLevel).toBe(3)
    expect(toc?.snapshotJson).toContain('Overview')
    expect(toc?.snapshotJson).toContain('"pageNumber":"4"')
  })

  it('injects a document-toc block into imported html', () => {
    const toc = parseDocumentXmlForTableOfContents(
      minimalDocumentXml(`
        <w:p>
          <w:r><w:fldChar w:fldCharType="begin"/></w:r>
          <w:r><w:instrText xml:space="preserve"> TOC \\o "1-2" </w:instrText></w:r>
          <w:r><w:fldChar w:fldCharType="separate"/></w:r>
        </w:p>
        <w:p>
          <w:pPr><w:pStyle w:val="TOC1"/></w:pPr>
          <w:r><w:t>Imported section</w:t></w:r>
        </w:p>
        <w:p>
          <w:r><w:fldChar w:fldCharType="end"/></w:r>
        </w:p>
      `)
    )

    const html = '<p>Imported section</p><h1>Imported section</h1>'
    const enhanced = enhanceImportedHtmlWithTableOfContents(html, toc)

    expect(enhanced).toContain('data-document-toc')
    expect(enhanced).toContain('data-toc-snapshot')
  })
})
