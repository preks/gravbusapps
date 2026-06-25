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

jest.mock('./useSmoothStreamingText', () => ({
  __esModule: true,
  useSmoothStreamingText: (target: string) => ({ revealed: target, isCatchingUp: false })
}))

import { StreamingAnswerBubble } from './StreamingAnswerBubble'

describe('StreamingAnswerBubble presentation mode wiring', () => {
  beforeEach(() => {
    mockStreamingMarkdown.mockClear()
    mockMarkdownWithChipsRenderer.mockClear()
  })

  it('forwards variant="enterprise" to the streaming markdown renderer when presentationMode="enterprise_agents"', () => {
    render(
      <StreamingAnswerBubble
        greetingContent=""
        responseContent="Streaming body"
        thinkingContent=""
        isStreaming={true}
        presentationMode="enterprise_agents"
      />
    )

    const md = screen.getByTestId('streaming-markdown-mock')
    expect(md.getAttribute('data-variant')).toBe('enterprise')

    const wrapper = screen.getByTestId('enterprise-agent-streaming-answer')
    expect(wrapper.getAttribute('data-presentation-mode')).toBe('enterprise_agents')

    const lastCall = mockStreamingMarkdown.mock.calls.at(-1)?.[0]
    expect(lastCall?.variant).toBe('enterprise')
    expect(lastCall?.content).toBe('Streaming body')
    expect(lastCall?.isStreaming).toBe(true)
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

    const md = screen.getByTestId('streaming-markdown-mock')
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

  it('shows working chrome before answer text, then collapses it once the reply streams', () => {
    const { rerender } = render(
      <StreamingAnswerBubble
        greetingContent=""
        responseContent=""
        thinkingContent="Checking policy docs…"
        isStreaming
        statusMessage="Searching"
        activityLines={['Retrieving context']}
      />
    )

    expect(screen.getByTestId('agent-activity-timeline')).toBeInTheDocument()
    expect(screen.getByTestId('agent-thinking-stream')).toBeInTheDocument()
    expect(screen.getByText('Generating response')).toBeInTheDocument()
    expect(screen.getByTestId('enterprise-agent-streaming-answer')).toHaveAttribute('data-answer-streaming', 'false')

    rerender(
      <StreamingAnswerBubble
        greetingContent=""
        responseContent="Here is the answer so far."
        thinkingContent="Checking policy docs…"
        isStreaming
        statusMessage="Searching"
        activityLines={['Retrieving context']}
      />
    )

    expect(screen.queryByTestId('agent-activity-timeline')).not.toBeInTheDocument()
    expect(screen.queryByTestId('agent-thinking-stream')).not.toBeInTheDocument()
    expect(screen.queryByText('Generating response')).not.toBeInTheDocument()
    expect(screen.getByTestId('enterprise-agent-streaming-answer')).toHaveAttribute('data-answer-streaming', 'true')
    expect(screen.getByText('Here is the answer so far.')).toBeInTheDocument()
  })
})
