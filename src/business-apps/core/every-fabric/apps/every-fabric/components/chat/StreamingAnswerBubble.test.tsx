/**
 * Tests for the Enterprise Agents wiring in StreamingAnswerBubble.
 *
 * Verifies that the streaming bubble forwards `presentationMode` to the
 * underlying StreamingMarkdown renderer as the right `variant`.
 */

import React from 'react'
import { render, screen } from '@testing-library/react'

const mockStreamingMarkdown = jest.fn()
const mockMarkdownWithChipsRenderer = jest.fn()

jest.mock('@/common/components/markdown/StreamingMarkdown', () => ({
  __esModule: true,
  StreamingMarkdown: (props: any) => {
    mockStreamingMarkdown(props)
    return (
      <div data-testid="streaming-markdown-mock" data-variant={props.variant ?? 'default'}>
        {props.content}
      </div>
    )
  }
}))

jest.mock('@/common/components/markdown/MarkdownWithChipsRenderer', () => ({
  __esModule: true,
  MarkdownWithChipsRenderer: (props: any) => {
    mockMarkdownWithChipsRenderer(props)
    return (
      <div data-testid="markdown-with-chips-renderer-mock" data-variant={props.variant ?? 'default'}>
        {props.content}
      </div>
    )
  }
}))

jest.mock('./AgentActivityTimeline', () => ({
  __esModule: true,
  AgentActivityTimeline: () => <div data-testid="agent-activity-timeline" />
}))

jest.mock('./AgentThinkingStream', () => ({
  __esModule: true,
  AgentThinkingStream: () => <div data-testid="agent-thinking-stream" />
}))

jest.mock('./useAnimatedGreeting', () => ({
  __esModule: true,
  useAnimatedGreeting: (greetingContent: string) => ({
    animatedGreetingContent: greetingContent,
    isGreetingAnimating: false
  })
}))

import { StreamingAnswerBubble } from './StreamingAnswerBubble'

describe('StreamingAnswerBubble presentation mode wiring', () => {
  beforeEach(() => {
    mockStreamingMarkdown.mockClear()
    mockMarkdownWithChipsRenderer.mockClear()
  })

  it('forwards variant="enterprise" to the answer markdown renderer when presentationMode="enterprise_agents"', () => {
    render(
      <StreamingAnswerBubble
        greetingContent=""
        responseContent="Streaming body"
        thinkingContent=""
        isStreaming={true}
        presentationMode="enterprise_agents"
      />
    )

    const md = screen.getByTestId('markdown-with-chips-renderer-mock')
    expect(md.getAttribute('data-variant')).toBe('enterprise')

    const wrapper = screen.getByTestId('enterprise-agent-streaming-answer')
    expect(wrapper.getAttribute('data-presentation-mode')).toBe('enterprise_agents')

    const lastCall = mockMarkdownWithChipsRenderer.mock.calls.at(-1)?.[0]
    expect(lastCall?.variant).toBe('enterprise')
    expect(lastCall?.content).toBe('Streaming body')
  })

  it('defaults to variant="default" when no presentationMode is provided', () => {
    render(
      <StreamingAnswerBubble
        greetingContent=""
        responseContent="Streaming body"
        thinkingContent=""
        isStreaming={true}
      />
    )

    const md = screen.getByTestId('markdown-with-chips-renderer-mock')
    expect(md.getAttribute('data-variant')).toBe('default')

    const wrapper = screen.getByTestId('enterprise-agent-streaming-answer')
    expect(wrapper.getAttribute('data-presentation-mode')).toBe('default')
  })

  it('returns null when there is no greeting, no response and not streaming', () => {
    const { container } = render(
      <StreamingAnswerBubble greetingContent="" responseContent="" thinkingContent="" isStreaming={false} />
    )
    expect(container.querySelector('[data-testid="enterprise-agent-streaming-answer"]')).toBeNull()
  })
})
