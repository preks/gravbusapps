/**
 * Tests for the Enterprise Agents typography gating in MarkdownWithChipsRenderer.
 *
 * Strategy: react-markdown is replaced with a smart mock that calls the
 * `components` map with representative children for each markdown primitive
 * we care about. This lets us assert which renderer variant got wired in
 * without depending on the real markdown parser at test time.
 */

import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ components }: any) => {
    const C = components || {}
    return (
      <div data-testid="rm-mock">
        {C.h1 ? <C.h1>Top Heading</C.h1> : null}
        {C.h2 ? <C.h2>Section Heading</C.h2> : null}
        {C.h3 ? <C.h3>Summary</C.h3> : null}
        {C.p ? <C.p>Body paragraph</C.p> : null}
        {C.strong ? <C.strong>bold word</C.strong> : null}
        {C.em ? <C.em>italic word</C.em> : null}
        {C.ul ? (
          <C.ul>
            {C.li ? <C.li>bullet one</C.li> : null}
            {C.li ? <C.li>bullet two</C.li> : null}
          </C.ul>
        ) : null}
        {C.ol ? <C.ol>{C.li ? <C.li>step one</C.li> : null}</C.ol> : null}
        {C.code ? <C.code>inline()</C.code> : null}
        {C.code ? <C.code className="language-ts">block code</C.code> : null}
        {C.pre ? <C.pre>preblock</C.pre> : null}
        {C.blockquote ? <C.blockquote>quoted</C.blockquote> : null}
        {C.a ? <C.a href="https://example.com">Visit</C.a> : null}
        {C.a ? <C.a href="/platform/content/intranet/content-record?contentId=abc">Open policy</C.a> : null}
        {C.table ? (
          <C.table>
            {C.thead ? <C.thead>{C.tr ? <C.tr>{C.th ? <C.th>Metric</C.th> : null}</C.tr> : null}</C.thead> : null}
            {C.tbody ? <C.tbody>{C.tr ? <C.tr>{C.td ? <C.td>Revenue</C.td> : null}</C.tr> : null}</C.tbody> : null}
          </C.table>
        ) : null}
      </div>
    )
  }
}))

jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: () => undefined
}))

jest.mock('@/business-apps/platform/apps/every-ai/components/links/EntityLink', () => ({
  __esModule: true,
  default: ({ href, children }: any) => (
    <span data-testid="entity-link" data-href={href}>
      {children}
    </span>
  ),
  SUPPORTED_PROTOCOLS: ['employee', 'account'],
  markdownUrlTransform: (url: string) => url
}))

import { MarkdownWithChipsRenderer } from './MarkdownWithChipsRenderer'

describe('MarkdownWithChipsRenderer (enterprise variant)', () => {
  it('renders the enterprise H3 typography when variant="enterprise"', () => {
    render(<MarkdownWithChipsRenderer content="ignored" variant="enterprise" />)

    const heading = screen.getByRole('heading', { level: 3, name: 'Summary' })
    // Enterprise H3 uses the explicit 1.05rem scale; the default variant
    // uses Tailwind's text-lg utility instead.
    expect(heading.className).toContain('gba:text-[1.05rem]')
    expect(heading.className).not.toContain('gba:text-lg')
  })

  it('keeps default-variant typography untouched when no enterprise variant is supplied', () => {
    render(<MarkdownWithChipsRenderer content="ignored" />)

    const heading = screen.getByRole('heading', { level: 3, name: 'Summary' })
    expect(heading.className).toContain('gba:text-lg')
    expect(heading.className).not.toContain('gba:text-[1.05rem]')
  })

  it('applies enterprise treatment to bold text', () => {
    render(<MarkdownWithChipsRenderer content="ignored" variant="enterprise" />)
    const strong = screen.getByText('bold word')
    expect(strong.tagName).toBe('STRONG')
    expect(strong.className).toContain('gba:tracking-[0.01em]')
  })

  it('keeps default-variant bold text without enterprise letter-spacing', () => {
    render(<MarkdownWithChipsRenderer content="ignored" />)
    const strong = screen.getByText('bold word')
    expect(strong.tagName).toBe('STRONG')
    expect(strong.className).not.toContain('gba:tracking-[0.01em]')
  })

  it('renders core markdown primitives under the enterprise variant', () => {
    render(<MarkdownWithChipsRenderer content="ignored" variant="enterprise" />)

    expect(screen.getByText('bullet one').tagName).toBe('LI')
    expect(screen.getByText('bullet two').tagName).toBe('LI')
    expect(screen.getByText('step one').tagName).toBe('LI')
    expect(screen.getByText('quoted').tagName).toBe('BLOCKQUOTE')
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('Metric').tagName).toBe('TH')
    // The td renderer wraps the cell content in a word-break <div>, so we
    // assert the text is somewhere inside a <td>.
    const revenueCell = screen.getByText('Revenue').closest('td')
    expect(revenueCell).not.toBeNull()
    const link = screen.getByText('Visit')
    expect(link.tagName).toBe('A')
    expect(link.getAttribute('href')).toBe('https://example.com')
  })

  it('renders root-relative platform links as clickable anchors instead of entity chips', () => {
    render(<MarkdownWithChipsRenderer content="ignored" variant="enterprise" />)

    const link = screen.getByText('Open policy')
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', '/platform/content/intranet/content-record?contentId=abc')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveAttribute('data-testid', 'markdown-platform-link')
    expect(screen.queryByTestId('entity-link')).not.toBeInTheDocument()
  })

  it('renders enterprise paragraphs with the larger leading scale', () => {
    render(<MarkdownWithChipsRenderer content="ignored" variant="enterprise" />)

    const para = screen.getByText('Body paragraph')
    expect(para.tagName).toBe('P')
    expect(para.className).toContain('gba:text-[15px]')
    expect(para.className).toContain('gba:leading-7')
  })
})
