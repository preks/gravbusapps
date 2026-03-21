import { ensurePagesStyles, renderHeaderFooterDisplayContent } from '../dom'

describe('renderHeaderFooterDisplayContent', () => {
  it('preserves trailing empty paragraphs as visible blank lines', () => {
    const content = document.createElement('div')

    renderHeaderFooterDisplayContent(content, '<p>Header text</p><p></p>', 'Header')

    expect(content.dataset.rmEmpty).toBe('false')
    expect(content.querySelectorAll('p')).toHaveLength(2)
    expect(content.querySelectorAll('br[data-rm-display-empty-line="true"]')).toHaveLength(1)
  })

  it('keeps empty content collapsed', () => {
    const content = document.createElement('div')

    renderHeaderFooterDisplayContent(content, '', 'Header')

    expect(content.dataset.rmEmpty).toBe('true')
    expect(content.innerHTML).toBe('')
  })
})

describe('ensurePagesStyles', () => {
  it('includes shared header footer table wrapper, theme, and inline resize styles', () => {
    const targetDocument = document.implementation.createHTMLDocument('pagination-styles')

    ensurePagesStyles(targetDocument)

    const style = targetDocument.head.querySelector('style[data-rm-pages-style]')

    expect(style?.textContent).toContain('.rm-pages-root .rm-page-header-content .tableWrapper')
    expect(style?.textContent).toContain('.rm-pages-root .rm-page-header-content table[data-table-theme="blue"]')
    expect(style?.textContent).toContain('table[data-table-style-header-row="true"] > tbody > tr:first-child > td')
    expect(style?.textContent).toContain('.rm-pages-root .rm-page-inline-editor .ProseMirror .tableWrapper')
    expect(style?.textContent).toContain('.rm-pages-root .rm-page-inline-editor .ProseMirror .column-resize-handle')
    expect(style?.textContent).toContain('.rm-pages-root .rm-page-inline-editor .ProseMirror .selectedCell:after')
  })
})
