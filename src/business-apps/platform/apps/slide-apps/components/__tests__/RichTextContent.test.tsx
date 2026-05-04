import React from 'react'
import { render, screen } from '@testing-library/react'
import { RichTextContent } from '../RichTextContent'
import type { RichTextParagraph, TextElement } from '../slideElements'

function makeFallback(overrides: Partial<TextElement> = {}): TextElement {
  return {
    id: 'txt',
    type: 'text',
    position: { x: 0, y: 0 },
    size: { width: 100, height: 50 },
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 1,
    content: '',
    fontSize: 16,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    color: '#000',
    fontFamily: 'sans-serif',
    textAlign: 'left',
    verticalAlign: 'top',
    lineHeight: 1.4,
    letterSpacing: 0,
    backgroundColor: 'transparent',
    ...overrides
  }
}

describe('RichTextContent', () => {
  it('renders each paragraph and run', () => {
    const paragraphs: RichTextParagraph[] = [
      {
        alignment: 'left',
        bulletType: 'none',
        runs: [{ text: 'Hello ', fontWeight: 'bold' }, { text: 'world' }]
      },
      {
        alignment: 'center',
        bulletType: 'none',
        runs: [{ text: 'second paragraph' }]
      }
    ]

    render(<RichTextContent element={makeFallback()} paragraphs={paragraphs} />)

    expect(screen.getByTestId('rich-text-content-paragraph-0')).toBeInTheDocument()
    expect(screen.getByTestId('rich-text-content-paragraph-1')).toBeInTheDocument()
    expect(screen.getByTestId('rich-text-content-run-0-0')).toHaveTextContent('Hello')
    expect(screen.getByTestId('rich-text-content-run-1-0')).toHaveTextContent('second paragraph')
  })

  it('renders hyperlinks as anchor tags', () => {
    const paragraphs: RichTextParagraph[] = [
      {
        alignment: 'left',
        bulletType: 'none',
        runs: [{ text: 'go', hyperlink: 'https://example.com' }]
      }
    ]
    render(<RichTextContent element={makeFallback()} paragraphs={paragraphs} />)

    const link = screen.getByRole('link', { name: 'go' })
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('renders numbering styles and explicit start values', () => {
    const paragraphs: RichTextParagraph[] = [
      {
        alignment: 'left',
        bulletType: 'number',
        numberingStyle: 'alphaLcParenR',
        numberStartAt: 3,
        runs: [{ text: 'first' }]
      },
      { alignment: 'left', bulletType: 'number', numberingStyle: 'alphaLcParenR', runs: [{ text: 'second' }] },
      {
        alignment: 'left',
        bulletType: 'number',
        numberingStyle: 'romanUcPeriod',
        indentLevel: 1,
        runs: [{ text: 'second.a' }]
      }
    ]
    const { container } = render(<RichTextContent element={makeFallback()} paragraphs={paragraphs} />)
    expect(container.textContent).toContain('c)')
    expect(container.textContent).toContain('d)')
    // Nested counter resets on the new level
    expect(container.textContent).toContain('I.second.a')
  })

  it('falls back to default bullet glyph when no custom character is provided', () => {
    const paragraphs: RichTextParagraph[] = [{ alignment: 'left', bulletType: 'bullet', runs: [{ text: 'item' }] }]
    const { container } = render(<RichTextContent element={makeFallback()} paragraphs={paragraphs} />)
    expect(container.textContent).toContain('•')
  })

  it('applies indentation for nested list paragraphs', () => {
    const paragraphs: RichTextParagraph[] = [
      { alignment: 'left', bulletType: 'bullet', indentLevel: 2, runs: [{ text: 'nested item' }] }
    ]

    render(<RichTextContent element={makeFallback()} paragraphs={paragraphs} />)

    expect(screen.getByTestId('rich-text-content-paragraph-0')).toHaveStyle({ paddingLeft: '36px', display: 'flex' })
  })

  it('does not render bullet glyphs for empty list paragraphs', () => {
    const paragraphs: RichTextParagraph[] = [{ alignment: 'left', bulletType: 'bullet', runs: [{ text: '' }] }]

    render(<RichTextContent element={makeFallback()} paragraphs={paragraphs} />)

    const paragraph = screen.getByTestId('rich-text-content-paragraph-0')
    expect(paragraph).toHaveStyle({ display: 'block' })
    expect(paragraph.textContent).toBe('')
  })

  it('uses imported list geometry for hanging indent layout', () => {
    const paragraphs: RichTextParagraph[] = [
      {
        alignment: 'left',
        bulletType: 'bullet',
        bulletChar: '◆',
        listLeftMargin: 48,
        listIndent: -18,
        runs: [{ text: 'custom geometry' }]
      }
    ]

    render(<RichTextContent element={makeFallback()} paragraphs={paragraphs} />)

    expect(screen.getByTestId('rich-text-content-paragraph-0')).toHaveStyle({ paddingLeft: '30px', display: 'flex' })
  })
})
