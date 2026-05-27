import React from 'react'
import { act, render } from '@testing-library/react'
import { StreamingPreviewBubble } from '../StreamingPreviewBubble'

describe('StreamingPreviewBubble', () => {
  it('survives many parent rerenders with new activityLines array refs', () => {
    const { rerender } = render(<StreamingPreviewBubble activityLines={['Collecting org data']} isStreaming />)

    for (let i = 0; i < 50; i += 1) {
      act(() => {
        rerender(
          <StreamingPreviewBubble
            activityLines={[`Collecting org data (${i})`, `Delegating to expert (${i})`]}
            isStreaming
          />
        )
      })
    }
  })

  it('runs exit animation when streaming ends without looping', () => {
    jest.useFakeTimers()
    try {
      const { rerender, queryByTestId } = render(<StreamingPreviewBubble activityLines={['Working…']} isStreaming />)
      expect(queryByTestId('agent-streaming-preview')).toBeTruthy()

      rerender(<StreamingPreviewBubble activityLines={[]} isStreaming={false} />)

      act(() => {
        jest.advanceTimersByTime(300)
      })

      expect(queryByTestId('agent-streaming-preview')).toBeNull()
    } finally {
      jest.useRealTimers()
    }
  })
})
