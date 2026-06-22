import React from 'react'
import { render, screen } from '@testing-library/react'
import type { DecisionItem } from '../../../hooks/useFabricDecisions'
import type { ActivityEvent } from '../../../types/enterpriseAgent'
import { SessionTimelineCard } from '../SessionTimelineCard'

jest.mock('@newwork/nw-design-system', () => ({
  ...jest.requireActual('@newwork/nw-design-system'),
  useTranslation: () => ({ t: (key: string) => key })
}))

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

  it('shows events in chronological order with newest at the bottom', () => {
    render(<SessionTimelineCard decisions={[decision]} activityEvents={[activity]} />)
    const timeline = screen.getByTestId('fabric-unified-session-timeline')
    const rows = timeline.querySelectorAll('[data-testid^="fabric-activity-"], [data-testid^="fabric-decision-"]')
    expect(rows[0]).toHaveAttribute('data-testid', 'fabric-decision-d-1')
    expect(rows[1]).toHaveAttribute('data-testid', 'fabric-activity-a-1')
  })

  it('hides runtime_scope decisions from the end-user timeline', () => {
    const runtimeDecision = {
      id: 'd-runtime',
      seq: 10,
      timestamp: '2026-06-08T17:09:46.000Z',
      category: 'runtime_scope',
      title: 'Runtime owner resolved',
      chosen: 'router',
      rationale: 'owner=router runtime_type=direct_agent reason=no_skill_router (observe-only; no behavior change)'
    } as DecisionItem
    const delegation: ActivityEvent = {
      id: 'a-delegate',
      timestamp: '2026-06-08T17:09:48.000Z',
      type: 'subagent_spawn',
      agent: 'HR_General_Agent',
      summary: 'Working on a delegated task',
      durationMs: 11130
    }
    const policyLoad: ActivityEvent = {
      id: 'a-policy',
      timestamp: '2026-06-08T17:09:51.000Z',
      type: 'tool_call',
      toolName: 'policy_load',
      summary: 'policy_load — done',
      durationMs: 230
    }

    render(<SessionTimelineCard decisions={[runtimeDecision]} activityEvents={[policyLoad, delegation]} />)

    expect(screen.queryByTestId('fabric-decision-d-runtime')).not.toBeInTheDocument()
    expect(screen.queryByText('Runtime owner resolved')).not.toBeInTheDocument()

    const rows = screen
      .getByTestId('fabric-unified-session-timeline')
      .querySelectorAll('[data-testid^="fabric-activity-"], [data-testid^="fabric-decision-"]')
    expect(rows[0]).toHaveAttribute('data-testid', 'fabric-activity-a-delegate')
    expect(rows[1]).toHaveAttribute('data-testid', 'fabric-activity-a-policy')
  })

  it('shows empty state when no events', () => {
    render(<SessionTimelineCard decisions={[]} activityEvents={[]} />)
    expect(screen.getByText('workspace-timeline-empty')).toBeInTheDocument()
  })

  it('keeps long sub-agent task prompts concise in the timeline', () => {
    const longTask =
      'Assess the current health of HR operations for the product team across hiring, retention, performance reviews, and exits, and provide a concise expert readout of the main risks, gaps, and likely operational weak points.'

    render(
      <SessionTimelineCard
        decisions={[]}
        activityEvents={[
          {
            id: 'subagent-1',
            timestamp: '2026-06-01T12:02:00.000Z',
            type: 'subagent_spawn',
            agent: 'HR_General_Agent',
            summary: longTask
          }
        ]}
      />
    )

    expect(screen.getByText('HR_General_Agent')).toBeInTheDocument()
    expect(screen.getByText('workspace-delegated-task')).toBeInTheDocument()
    expect(screen.queryByText(longTask)).not.toBeInTheDocument()
  })
})
