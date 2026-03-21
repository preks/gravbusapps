import { renderHeaderFooterDisplayContent } from '../dom'

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
