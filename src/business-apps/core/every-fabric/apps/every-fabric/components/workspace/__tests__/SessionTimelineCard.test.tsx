import React from 'react'
import { render, screen } from '@testing-library/react'
import type { DecisionItem } from '../../../hooks/useFabricDecisions'
import type { ActivityEvent } from '../../../types/enterpriseAgent'
import { SessionTimelineCard } from '../SessionTimelineCard'

const decision: DecisionItem = {
  id: 'd-1',
  seq: 1,
  timestamp: '2026-06-01T12:00:00.000Z',
  category: 'reflection',
  title: 'Reflection: finalize',
  chosen: 'return',
  rationale: 'Output quality confirmed'
}

const activity: ActivityEvent = {
  id: 'a-1',
  timestamp: '2026-06-01T12:01:00.000Z',
  type: 'tool_call',
  toolName: 'search_web',
  summary: 'search_web — running'
}

describe('SessionTimelineCard', () => {
  it('renders unified timeline with both decisions and activity', () => {
    render(<SessionTimelineCard decisions={[decision]} activityEvents={[activity]} />)
    expect(screen.getByTestId('fabric-unified-session-timeline')).toBeInTheDocument()
    expect(screen.getByTestId('fabric-decision-d-1')).toBeInTheDocument()
    expect(screen.getByTestId('fabric-activity-a-1')).toBeInTheDocument()
    expect(screen.queryByTestId('fabric-timeline-tab-decisions')).not.toBeInTheDocument()
  })

  it('shows activity first when it is newer', () => {
    render(<SessionTimelineCard decisions={[decision]} activityEvents={[activity]} />)
    const timeline = screen.getByTestId('fabric-unified-session-timeline')
    const rows = timeline.querySelectorAll('[data-testid^="fabric-activity-"], [data-testid^="fabric-decision-"]')
    expect(rows[0]).toHaveAttribute('data-testid', 'fabric-activity-a-1')
    expect(rows[1]).toHaveAttribute('data-testid', 'fabric-decision-d-1')
  })

  it('shows empty state when no events', () => {
    render(<SessionTimelineCard decisions={[]} activityEvents={[]} />)
    expect(screen.getByText(/Session events will appear here/)).toBeInTheDocument()
  })
})
