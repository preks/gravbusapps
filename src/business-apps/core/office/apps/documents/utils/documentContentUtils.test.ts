import {
  containsPaginationRuntimeTableMarkup,
  normalizeDocumentHtmlForEditor,
  sanitizeDocumentHtmlForEditor,
  sanitizePaginationRuntimeHtml
} from './documentContentUtils'

describe('documentContentUtils pagination sanitization', () => {
  it('merges adjacent pagination table fragments and strips runtime attrs', () => {
    const html = [
      '<table data-pagination-chain-id="pagination-chain-1" data-pagination-split-id="pagination-split-1" data-pagination-row-groups="0-1">',
      '<tbody><tr><td>First</td></tr></tbody>',
      '</table>',
      '<table data-pagination-chain-id="pagination-chain-1" data-pagination-split-id="pagination-split-1" data-pagination-row-groups="0-0">',
      '<tbody><tr><td>Second</td></tr></tbody>',
      '</table>'
    ].join('')

    expect(sanitizePaginationRuntimeHtml(html)).toBe(
      '<table><tbody><tr><td>First</td></tr></tbody><tbody><tr><td>Second</td></tr></tbody></table>'
    )
  })

  it('drops runtime-only row-group metadata even when no split fragments are present', () => {
    const html =
      '<table data-pagination-chain-id="pagination-chain-2" data-pagination-row-groups="0-1"><tbody><tr><td>Cell</td></tr></tbody></table>'

    expect(sanitizePaginationRuntimeHtml(html)).toBe('<table><tbody><tr><td>Cell</td></tr></tbody></table>')
  })

  it('detects runtime pagination table markup before sanitization', () => {
    const html =
      '<table data-pagination-chain-id="pagination-chain-2" data-pagination-row-groups="0-1"><tbody><tr><td>Cell</td></tr></tbody></table>'

    expect(containsPaginationRuntimeTableMarkup(html)).toBe(true)
    expect(containsPaginationRuntimeTableMarkup(sanitizePaginationRuntimeHtml(html))).toBe(false)
  })

  it('keeps a normal second table separate while merging one split chain', () => {
    const html = [
      '<table data-pagination-chain-id="pagination-chain-3" data-pagination-split-id="pagination-split-3">',
      '<tbody><tr><td>Split one</td></tr></tbody>',
      '</table>',
      '<table data-pagination-chain-id="pagination-chain-3" data-pagination-split-id="pagination-split-3">',
      '<tbody><tr><td>Split two</td></tr></tbody>',
      '</table>',
      '<table data-pagination-chain-id="pagination-chain-4">',
      '<tbody><tr><td>Standalone</td></tr></tbody>',
      '</table>'
    ].join('')

    expect(sanitizePaginationRuntimeHtml(html)).toBe(
      '<table><tbody><tr><td>Split one</td></tr></tbody><tbody><tr><td>Split two</td></tr></tbody></table><table><tbody><tr><td>Standalone</td></tr></tbody></table>'
    )
  })

  it('normalizes custom document tags after pagination sanitization', () => {
    const html = [
      '<table data-pagination-split-id="pagination-split-2" data-pagination-row-groups="0-0">',
      '<tablerow><tablecell>One</tablecell></tablerow>',
      '</table>',
      '<table data-pagination-split-id="pagination-split-2">',
      '<tablerow><tablecell>Two</tablecell></tablerow>',
      '</table>'
    ].join('')

    expect(normalizeDocumentHtmlForEditor(html)).toBe(
      '<table><tbody><tr><td>One</td></tr><tr><td>Two</td></tr></tbody></table>'
    )
  })

  it('preserves data-id on paragraphs and tables (UniqueID / hydration)', () => {
    const html =
      '<p data-id="para-uuid-1">Text</p><table data-id="table-uuid-1"><tbody><tr data-id="row-uuid-1"><td>A</td></tr></tbody></table>'
    const sanitized = sanitizeDocumentHtmlForEditor(html)
    expect(sanitized).toContain('data-id="para-uuid-1"')
    expect(sanitized).toContain('data-id="table-uuid-1"')
    expect(sanitized).toContain('data-id="row-uuid-1"')
  })

  it('sanitizes executable markup while preserving editor-safe attributes', () => {
    const html = [
      '<p onclick="alert(1)" data-comment-id="comment-1">Safe text</p>',
      '<img src="javascript:alert(1)" data-image-id="image-1" />',
      '<script>alert("xss")</script>'
    ].join('')

    const sanitized = sanitizeDocumentHtmlForEditor(html)
    const doc = new DOMParser().parseFromString(sanitized, 'text/html')
    const paragraph = doc.body.querySelector('p')
    const image = doc.body.querySelector('img')

    expect(doc.body.querySelector('script')).toBeNull()
    expect(paragraph?.getAttribute('onclick')).toBeNull()
    expect(paragraph?.getAttribute('data-comment-id')).toBe('comment-1')
    expect(image?.getAttribute('src')).toBeNull()
    expect(image?.getAttribute('data-image-id')).toBe('image-1')
    expect(doc.body.textContent).toContain('Safe text')
  })

  it('wraps top-level custom image nodes in paragraphs for inline-image parsing', () => {
    const html = [
      '<p>Before</p>',
      '<figure data-node-type="custom-image" data-image-wrap="behind">',
      '<img src="https://example.com/image.png" width="120" height="80" />',
      '</figure>',
      '<p>After</p>'
    ].join('')

    const normalized = normalizeDocumentHtmlForEditor(html)
    const doc = new DOMParser().parseFromString(normalized, 'text/html')
    const imageContainer = doc.body.querySelector('[data-node-type="custom-image"]')

    expect(imageContainer?.parentElement?.tagName).toBe('P')
    expect(doc.body.querySelectorAll('p')).toHaveLength(3)
  })
})
