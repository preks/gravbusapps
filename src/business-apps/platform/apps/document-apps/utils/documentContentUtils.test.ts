import { normalizeDocumentHtmlForEditor, sanitizePaginationRuntimeHtml } from './documentContentUtils'

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
})
