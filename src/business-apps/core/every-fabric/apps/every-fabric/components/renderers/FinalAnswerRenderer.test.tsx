/**
 * Tests for the Enterprise Agents wiring in FinalAnswerRenderer.
 *
 * Verifies:
 *   - When `presentationMode="enterprise_agents"`, the markdown body is
 *     rendered through MarkdownWithChipsRenderer with `variant="enterprise"`.
 *   - When `presentationMode` is omitted/default, the markdown body is
 *     rendered with the default variant.
 *   - Wrapping artifact card and bubble chrome stay intact.
 */

import React from 'react'
import { render, screen } from '@testing-library/react'

const mockMarkdownWithChipsRenderer = jest.fn()

jest.mock('@/common/components/markdown/MarkdownWithChipsRenderer', () => ({
  __esModule: true,
  MarkdownWithChipsRenderer: (props: any) => {
    mockMarkdownWithChipsRenderer(props)
    return <div data-testid="markdown-with-chips-mock" data-variant={props.variant ?? 'default'} />
  }
}))

jest.mock('../artifacts/HtmlPreviewCard', () => ({
  __esModule: true,
  default: () => <div data-testid="html-preview-card" />
}))

jest.mock('@phosphor-icons/react', () => {
  const Stub = (props: any) => <span {...props} />
  return new Proxy(
    {},
    {
      get: () => Stub
    }
  )
})

import { FinalAnswerRenderer } from './FinalAnswerRenderer'

describe('FinalAnswerRenderer presentation mode wiring', () => {
  beforeEach(() => {
    mockMarkdownWithChipsRenderer.mockClear()
  })

  const SAMPLE_OUTPUT = '### Summary\nDone.'

  it('renders the markdown body with the enterprise variant when presentationMode="enterprise_agents"', () => {
    render(<FinalAnswerRenderer output={SAMPLE_OUTPUT} presentationMode="enterprise_agents" />)

    const md = screen.getByTestId('markdown-with-chips-mock')
    expect(md.getAttribute('data-variant')).toBe('enterprise')

    const wrapper = screen.getByTestId('enterprise-agent-final-answer')
    expect(wrapper.getAttribute('data-presentation-mode')).toBe('enterprise_agents')

    const lastCall = mockMarkdownWithChipsRenderer.mock.calls.at(-1)?.[0]
    expect(lastCall?.variant).toBe('enterprise')
    expect(lastCall?.content).toBe(SAMPLE_OUTPUT)
  })

  it('renders the markdown body with the default variant when presentationMode is omitted', () => {
    render(<FinalAnswerRenderer output={SAMPLE_OUTPUT} />)

    const md = screen.getByTestId('markdown-with-chips-mock')
    expect(md.getAttribute('data-variant')).toBe('default')

    const wrapper = screen.getByTestId('enterprise-agent-final-answer')
    expect(wrapper.getAttribute('data-presentation-mode')).toBe('default')

    const lastCall = mockMarkdownWithChipsRenderer.mock.calls.at(-1)?.[0]
    expect(lastCall?.variant).toBe('default')
  })
})
