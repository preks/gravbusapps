/**
 * Tests for the Enterprise Agents typography gating in StreamingMarkdown,
 * and for streaming-vs-final rendering parity.
 *
 * Strategy: react-markdown is replaced with a smart mock that calls the
 * `components` map with representative children for each markdown primitive
 * we care about. This lets us verify the variant-aware components map
 * without depending on the real markdown parser at test time.
 */

import React from 'react'
import { render, screen, act } from '@testing-library/react'

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ components }: any) => {
    const C = components || {}
    return (
      <div data-testid="rm-mock">
        {C.h3 ? <C.h3>Summary</C.h3> : null}
        {C.p ? <C.p>Body paragraph</C.p> : null}
        {C.strong ? <C.strong>bold word</C.strong> : null}
        {C.ul ? <C.ul>{C.li ? <C.li>impact one</C.li> : null}</C.ul> : null}
        {C.code ? <C.code className="language-ts">block code</C.code> : null}
        {C.pre ? <C.pre>preblock</C.pre> : null}
        {C.blockquote ? <C.blockquote>quoted</C.blockquote> : null}
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
    <a href={href} data-testid="entity-link">
      {children}
    </a>
  ),
  markdownUrlTransform: (url: string) => url
}))

import { StreamingMarkdown } from './StreamingMarkdown'

describe('StreamingMarkdown (enterprise variant)', () => {
  beforeEach(() => {
    // requestAnimationFrame in jsdom defers writes; align it with timers
    // so the streaming render loop ticks deterministically.
    ;(globalThis as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 0)
    ;(globalThis as any).cancelAnimationFrame = (id: any) => clearTimeout(id)
  })

  it('uses enterprise H3 typography under variant="enterprise"', async () => {
    render(<StreamingMarkdown content="### Summary" isStreaming={false} variant="enterprise" />)
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    const heading = screen.getByRole('heading', { level: 3, name: 'Summary' })
    expect(heading.className).toContain('gba:text-[1.05rem]')
  })

  it('keeps default streaming H3 typography untouched when no variant is supplied', async () => {
    render(<StreamingMarkdown content="### Heading" isStreaming={false} />)
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    const heading = screen.getByRole('heading', { level: 3, name: 'Summary' })
    expect(heading.className).toContain('gba:text-lg')
    expect(heading.className).not.toContain('gba:text-[1.05rem]')
  })

  it('applies enterprise styling to bold, code, pre, and blockquote', async () => {
    render(<StreamingMarkdown content="### Summary" isStreaming variant="enterprise" />)
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    const strong = screen.getByText('bold word')
    expect(strong.tagName).toBe('STRONG')
    expect(strong.className).toContain('gba:tracking-[0.01em]')

    const blockCode = screen.getByText('block code')
    expect(blockCode.className).toContain('gba:bg-slate-950')

    const pre = screen.getByText('preblock')
    expect(pre.tagName).toBe('PRE')
    expect(pre.className).toContain('gba:bg-slate-950')

    const quote = screen.getByText('quoted')
    expect(quote.tagName).toBe('BLOCKQUOTE')
    expect(quote.className).toContain('gba:my-5')
  })

  it('default streaming variant keeps the legacy code/blockquote treatment', async () => {
    render(<StreamingMarkdown content="### Heading" isStreaming />)
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    const blockCode = screen.getByText('block code')
    expect(blockCode.className).not.toContain('gba:bg-slate-950')

    const pre = screen.getByText('preblock')
    expect(pre.className).not.toContain('gba:bg-slate-950')

    const strong = screen.getByText('bold word')
    expect(strong.className).not.toContain('gba:tracking-[0.01em]')
  })

  it('streaming and final-committed enterprise rendering produce the same hierarchy', async () => {
    const { rerender } = render(<StreamingMarkdown content="### Summary" isStreaming variant="enterprise" />)
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    const streamingHeading = screen.getByRole('heading', { level: 3, name: 'Summary' })
    const streamingStrong = screen.getByText('bold word')
    const streamingHeadingClass = streamingHeading.className
    const streamingStrongClass = streamingStrong.className

    rerender(<StreamingMarkdown content="### Summary\nFinal answer." isStreaming={false} variant="enterprise" />)
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    const finalHeading = screen.getByRole('heading', { level: 3, name: 'Summary' })
    const finalStrong = screen.getByText('bold word')
    expect(finalHeading.className).toBe(streamingHeadingClass)
    expect(finalStrong.className).toBe(streamingStrongClass)
  })
})
