/** @jest-environment jsdom */
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { WorkforceAgentTile } from '../WorkforceAgentTile'
import type { WorkforceAgentSummary } from '../useWorkforceData'
import { emptyMetricsTotals, type WorkforceAgent } from '../workforceTypes'

function buildAgent(overrides: Partial<WorkforceAgent> = {}): WorkforceAgent {
  return {
    agent_id: 'a-1',
    name: 'claims_triage',
    display_name: 'Claims Triage',
    description: 'Triages inbound claims using the policy library.',
    domain: 'insurance',
    surfaces: ['workforce'],
    is_active: true,
    status: 'active',
    tags: [],
    skill_ids: [],
    policy_refs: [],
    workforce_profile: {
      role: 'Claims agent',
      department: 'Insurance Ops',
      owner_user_id: null,
      autonomy_level: 'approval_required',
      escalation: {
        owner_user_id: null,
        ticket_queue: null,
        notify_emails: [],
        confidence_threshold: 0.7,
        blocked_intents: []
      },
      budget: {
        daily_credit_limit: null,
        weekly_credit_limit: null,
        monthly_credit_limit: null,
        on_exceeded: 'pause'
      },
      knowledge_refs: [],
      instructions: ''
    },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides
  }
}

function buildSummary(
  agentOverrides: Partial<WorkforceAgent> = {},
  summaryOverrides: Partial<Omit<WorkforceAgentSummary, 'agent'>> = {}
): WorkforceAgentSummary {
  return {
    agent: buildAgent(agentOverrides),
    triggerCount: 0,
    activeTriggerCount: 0,
    metrics: emptyMetricsTotals(),
    creditsThisWeek: 0,
    runsThisWeek: 0,
    lastCompletedAt: null,
    ...summaryOverrides
  }
}

describe('WorkforceAgentTile', () => {
  it('renders role, department, status pill and stats', () => {
    const summary = buildSummary({}, { triggerCount: 3, activeTriggerCount: 2, creditsThisWeek: 42 })
    render(<WorkforceAgentTile summary={summary} />)

    expect(screen.getByText('Claims Triage')).toBeInTheDocument()
    expect(screen.getByText(/Claims agent · Insurance Ops/)).toBeInTheDocument()
    expect(screen.getByTestId('workforce-agent-status-a-1')).toHaveTextContent('tile-status-active')
    expect(screen.getByTestId('workforce-agent-triggers-a-1')).toHaveTextContent('tile-triggers-stat')
    expect(screen.getByTestId('workforce-agent-credits-a-1')).toHaveTextContent('tile-credits-stat')
    expect(screen.getByTestId('workforce-agent-lastrun-a-1')).toHaveTextContent('tile-last-run-stat')
  })

  it('shows the Pause action for active agents and Activate for paused ones', () => {
    const onPause = jest.fn()
    const onActivate = jest.fn()
    const { rerender } = render(
      <WorkforceAgentTile summary={buildSummary()} onPause={onPause} onActivate={onActivate} />
    )
    fireEvent.click(screen.getByTestId('workforce-agent-pause-a-1'))
    expect(onPause).toHaveBeenCalledTimes(1)

    rerender(
      <WorkforceAgentTile
        summary={buildSummary({ status: 'paused', is_active: false })}
        onPause={onPause}
        onActivate={onActivate}
      />
    )
    fireEvent.click(screen.getByTestId('workforce-agent-activate-a-1'))
    expect(onActivate).toHaveBeenCalledTimes(1)
  })

  it('renders the archive control when a handler is provided', () => {
    const onArchive = jest.fn()
    render(<WorkforceAgentTile summary={buildSummary()} onArchive={onArchive} />)

    expect(screen.queryByTestId('workforce-agent-configure-a-1')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('workforce-agent-archive-a-1'))
    expect(onArchive).toHaveBeenCalledTimes(1)
  })

  it('opens the agent when the card body is clicked', () => {
    const onConfigure = jest.fn()
    render(<WorkforceAgentTile summary={buildSummary()} onConfigure={onConfigure} />)

    fireEvent.click(screen.getByTestId('workforce-agent-tile-a-1'))
    expect(onConfigure).toHaveBeenCalledTimes(1)
  })

  it('does not double-open the agent when an action button is clicked', () => {
    const onConfigure = jest.fn()
    const onArchive = jest.fn()
    render(<WorkforceAgentTile summary={buildSummary()} onConfigure={onConfigure} onArchive={onArchive} />)

    fireEvent.click(screen.getByTestId('workforce-agent-archive-a-1'))
    expect(onArchive).toHaveBeenCalledTimes(1)
    expect(onConfigure).not.toHaveBeenCalled()
  })

  it('formats last-run timestamp relative to now', () => {
    const nowMs = Date.parse('2026-06-01T14:00:00.000Z')
    jest.spyOn(Date, 'now').mockReturnValue(nowMs)
    render(<WorkforceAgentTile summary={buildSummary({}, { lastCompletedAt: '2026-06-01T12:00:00.000Z' })} />)
    expect(screen.getByTestId('workforce-agent-lastrun-a-1')).toHaveTextContent('tile-last-run-stat')
    jest.restoreAllMocks()
  })
})
