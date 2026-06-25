import React from 'react'
import { act, render, screen } from '@testing-library/react'
import { AgentActivityTimeline } from '../AgentActivityTimeline'

describe('AgentActivityTimeline', () => {
  it('survives many parent rerenders with new activityLines array refs', () => {
    const { rerender } = render(
      <AgentActivityTimeline activityLines={['Collecting org data']} currentStatus={null} isStreaming />
    )

    for (let i = 0; i < 50; i += 1) {
      act(() => {
        rerender(
          <AgentActivityTimeline
            activityLines={[`Collecting org data (${i})`, `Delegating to expert (${i})`]}
            currentStatus={null}
            isStreaming
          />
        )
      })
    }
  })

  it('renders readable text steps for each activity line', () => {
    render(
      <AgentActivityTimeline
        activityLines={['Looking up information']}
        currentStatus="Preparing workspace"
        isStreaming
      />
    )

    expect(screen.getByTestId('agent-activity-timeline')).toHaveAttribute('aria-label', 'chat-activity-aria')
    expect(screen.getByText('Looking up information')).toBeTruthy()
    expect(screen.getByText('Preparing workspace')).toBeTruthy()
    expect(screen.getByTestId('agent-activity-dot-active')).toBeTruthy()
    expect(screen.getByTestId('shimmer-text')).toBeTruthy()
    expect(screen.queryByTestId('agent-thinking-wave')).toBeNull()
    expect(screen.queryByTestId('agent-activity-track')).toBeNull()
  })

  it('does not render a spinner', () => {
    const { container } = render(
      <AgentActivityTimeline activityLines={['Working…']} currentStatus={null} isStreaming />
    )
    expect(container.querySelector('.gba\\:animate-spin')).toBeNull()
  })

  it('runs exit animation when streaming ends without looping', () => {
    jest.useFakeTimers()
    try {
      const { rerender, queryByTestId } = render(
        <AgentActivityTimeline activityLines={['Working…']} currentStatus={null} isStreaming />
      )
      expect(queryByTestId('agent-activity-timeline')).toBeTruthy()

      rerender(<AgentActivityTimeline activityLines={[]} currentStatus={null} isStreaming={false} />)

      act(() => {
        jest.advanceTimersByTime(300)
      })

      expect(queryByTestId('agent-activity-timeline')).toBeNull()
    } finally {
      jest.useRealTimers()
    }
  })
})
