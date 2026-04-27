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
        level: 0,
        bulletType: 'none',
        runs: [{ text: 'Hello ', fontWeight: 'bold' }, { text: 'world' }]
      },
      {
        alignment: 'center',
        level: 0,
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
        level: 0,
        bulletType: 'none',
        runs: [{ text: 'go', hyperlink: 'https://example.com' }]
      }
    ]
    render(<RichTextContent element={makeFallback()} paragraphs={paragraphs} />)

    const link = screen.getByRole('link', { name: 'go' })
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('numbers paragraphs per indent level', () => {
    const paragraphs: RichTextParagraph[] = [
      { alignment: 'left', level: 0, bulletType: 'number', runs: [{ text: 'first' }] },
      { alignment: 'left', level: 0, bulletType: 'number', runs: [{ text: 'second' }] },
      {
        alignment: 'left',
        level: 0,
        bulletType: 'number',
        indentLevel: 1,
        runs: [{ text: 'second.a' }]
      }
    ]
    const { container } = render(<RichTextContent element={makeFallback()} paragraphs={paragraphs} />)
    expect(container.textContent).toContain('1.')
    expect(container.textContent).toContain('2.')
    // Nested counter resets on the new level
    expect(container.textContent).toContain('1.second.a')
  })

  it('falls back to default bullet glyph when no custom character is provided', () => {
    const paragraphs: RichTextParagraph[] = [
      { alignment: 'left', level: 0, bulletType: 'bullet', runs: [{ text: 'item' }] }
    ]
    const { container } = render(<RichTextContent element={makeFallback()} paragraphs={paragraphs} />)
    expect(container.textContent).toContain('•')
  })
})
