/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { ArchivedAgentsPanel } from '../ArchivedAgentsPanel'
import type { WorkforceAgent } from '../workforceTypes'

function buildArchivedAgent(overrides: Partial<WorkforceAgent> = {}): WorkforceAgent {
  return {
    agent_id: 'agent-1',
    name: 'helper',
    display_name: 'Helper',
    description: '',
    domain: 'support',
    surfaces: ['workforce'],
    is_active: false,
    status: 'archived',
    tags: [],
    skill_ids: [],
    policy_refs: [],
    workforce_profile: {
      role: 'Specialist',
      department: 'Ops',
      owner_user_id: null,
      autonomy_level: 'approval_required',
      escalation: {
        owner_user_id: null,
        ticket_queue: null,
        notify_emails: [],
        confidence_threshold: 0.6,
        blocked_intents: []
      },
      budget: {
        daily_credit_limit: null,
        weekly_credit_limit: null,
        monthly_credit_limit: null,
        on_exceeded: 'pause'
      },
      knowledge_refs: [],
      instructions: '',
      archived_at: '2026-05-27T12:00:00Z',
      archived_by_user_id: 'alice'
    },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-05-27T12:00:00Z',
    ...overrides
  }
}

describe('ArchivedAgentsPanel', () => {
  it('renders the empty state when there are no archived agents', () => {
    render(
      <ArchivedAgentsPanel agents={[]} isLoading={false} isRestoring={null} onRefresh={() => {}} onRestore={() => {}} />
    )
    expect(screen.getByTestId('workforce-archived-empty')).toBeInTheDocument()
  })

  it('renders the loading state on first fetch', () => {
    render(<ArchivedAgentsPanel agents={[]} isLoading isRestoring={null} onRefresh={() => {}} onRestore={() => {}} />)
    expect(screen.getByText(/Loading archived agents/i)).toBeInTheDocument()
  })

  it('lists archived agents with role and archived-by metadata', () => {
    render(
      <ArchivedAgentsPanel
        agents={[buildArchivedAgent()]}
        isLoading={false}
        isRestoring={null}
        onRefresh={() => {}}
        onRestore={() => {}}
      />
    )
    expect(screen.getByText('Helper')).toBeInTheDocument()
    expect(screen.getByText(/Specialist · Ops/)).toBeInTheDocument()
    expect(screen.getByText(/by alice/)).toBeInTheDocument()
  })

  it('fires onRestore with the agent when the restore button is clicked', () => {
    const onRestore = jest.fn()
    const agent = buildArchivedAgent()
    render(
      <ArchivedAgentsPanel
        agents={[agent]}
        isLoading={false}
        isRestoring={null}
        onRefresh={() => {}}
        onRestore={onRestore}
      />
    )
    fireEvent.click(screen.getByTestId(`workforce-archived-restore-${agent.agent_id}`))
    expect(onRestore).toHaveBeenCalledWith(agent)
  })

  it('disables the restore button while the agent is being restored', () => {
    const agent = buildArchivedAgent()
    render(
      <ArchivedAgentsPanel
        agents={[agent]}
        isLoading={false}
        isRestoring={agent.agent_id}
        onRefresh={() => {}}
        onRestore={() => {}}
      />
    )
    expect(screen.getByTestId(`workforce-archived-restore-${agent.agent_id}`)).toBeDisabled()
  })

  it('surfaces the inline error banner when provided', () => {
    render(
      <ArchivedAgentsPanel
        agents={[]}
        isLoading={false}
        isRestoring={null}
        errorMessage="boom"
        onRefresh={() => {}}
        onRestore={() => {}}
      />
    )
    expect(screen.getByTestId('workforce-archived-error')).toHaveTextContent('boom')
  })

  it('fires onRefresh when the refresh button is clicked', () => {
    const onRefresh = jest.fn()
    render(
      <ArchivedAgentsPanel
        agents={[]}
        isLoading={false}
        isRestoring={null}
        onRefresh={onRefresh}
        onRestore={() => {}}
      />
    )
    fireEvent.click(screen.getByTestId('workforce-archived-refresh'))
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })
})
