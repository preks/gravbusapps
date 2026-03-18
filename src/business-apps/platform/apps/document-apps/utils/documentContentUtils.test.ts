import {
  containsCustomDocumentTags,
  isEffectivelyEmptyDocumentHtml,
  normalizeDocumentHtmlForEditor,
  sanitizePaginationRuntimeHtml
} from './documentContentUtils'

describe('documentContentUtils', () => {
  it('treats empty paragraph content as effectively empty', () => {
    expect(isEffectivelyEmptyDocumentHtml('<p></p>')).toBe(true)
    expect(isEffectivelyEmptyDocumentHtml('<p><br></p>')).toBe(true)
  })

  it('ignores zero-width spaces and whitespace-only text', () => {
    expect(isEffectivelyEmptyDocumentHtml('<p>\u200B</p>')).toBe(true)
    expect(isEffectivelyEmptyDocumentHtml('<p>   </p>')).toBe(true)
  })

  it('treats tables as non-empty even without text content', () => {
    expect(isEffectivelyEmptyDocumentHtml('<table><tbody><tr><td></td></tr></tbody></table>')).toBe(false)
  })

  it('treats actual text as non-empty', () => {
    expect(isEffectivelyEmptyDocumentHtml('<p>Hello</p>')).toBe(false)
  })

  it('detects custom document tags', () => {
    expect(containsCustomDocumentTags('<heading level="1">Title</heading>')).toBe(true)
    expect(containsCustomDocumentTags('<p>Regular HTML</p>')).toBe(false)
  })

  it('normalizes custom document markup to valid HTML', () => {
    const normalized = normalizeDocumentHtmlForEditor(
      '<heading level="2" textAlign="center">Title</heading><paragraph>Hello <bold>world</bold></paragraph>'
    )

    expect(normalized).toContain('<h2 style="text-align: center;">Title</h2>')
    expect(normalized).toContain('<p>Hello <strong>world</strong></p>')
  })

  it('normalizes custom table markup to HTML table rows and cells', () => {
    const normalized = normalizeDocumentHtmlForEditor(
      '<table><tablerow><tableheader colspan="1" rowspan="1"><paragraph>Aspect</paragraph></tableheader></tablerow><tablerow><tablecell colspan="1" rowspan="1"><paragraph>Value</paragraph></tablecell></tablerow></table>'
    )

    expect(normalized).toContain('<table>')
    expect(normalized).toContain('<tbody>')
    expect(normalized).toContain('<tr><th colspan="1" rowspan="1"><p>Aspect</p></th></tr>')
    expect(normalized).toContain('<tr><td colspan="1" rowspan="1"><p>Value</p></td></tr>')
  })

  it('preserves inline comments using TipTap-compatible data attributes', () => {
    const normalized = normalizeDocumentHtmlForEditor(
      '<paragraph><inlineComment commentId="comment-1" commentType="inline" createdAt="2026-02-24T10:32:55.413Z" createdBy="user-1"><textStyle color="" fontFamily="">Marked text</textStyle></inlineComment></paragraph>'
    )

    expect(normalized).toContain(
      '<p><span data-comment-id="comment-1" data-comment-type="inline" data-created-at="2026-02-24T10:32:55.413Z" data-created-by="user-1">Marked text</span></p>'
    )
  })

  it('merges adjacent pagination table fragments and strips runtime attrs from html', () => {
    const sanitized = sanitizePaginationRuntimeHtml(
      '<table data-pagination-split-id="pagination-split-9"><tbody><tr><td><p>First</p></td></tr></tbody></table><table data-pagination-split-id="pagination-split-9"><tbody><tr><td><p>Second</p></td></tr></tbody></table>'
    )

    expect(sanitized).toContain(
      '<table><tbody><tr><td><p>First</p></td></tr></tbody><tbody><tr><td><p>Second</p></td></tr></tbody></table>'
    )
    expect(sanitized).not.toContain('pagination-split-9')
  })

  it('merges custom document table fragments before editor normalization', () => {
    const normalized = normalizeDocumentHtmlForEditor(
      '<table paginationSplitId="pagination-split-4"><tablerow><tablecell colspan="1" rowspan="1"><paragraph>First</paragraph></tablecell></tablerow></table><table paginationSplitId="pagination-split-4"><tablerow><tablecell colspan="1" rowspan="1"><paragraph>Second</paragraph></tablecell></tablerow></table>'
    )

    expect(normalized).toContain(
      '<table><tbody><tr><td colspan="1" rowspan="1"><p>First</p></td></tr><tr><td colspan="1" rowspan="1"><p>Second</p></td></tr></tbody></table>'
    )
    expect(normalized).not.toContain('pagination-split-4')
  })
})
