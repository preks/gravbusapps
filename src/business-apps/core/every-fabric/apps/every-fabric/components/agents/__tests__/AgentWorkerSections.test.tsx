/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'

import { AgentWorkerSections } from '../AgentWorkerSections'
import type { WorkforceAgent } from '../../enterprise-workforce/workforceTypes'
import type { WorkforceAgentConfigState } from '../../enterprise-workforce/useWorkforceAgentConfig'

function buildAgent(overrides: Partial<WorkforceAgent> = {}): WorkforceAgent {
  return {
    agent_id: 'a1',
    name: 'claims_bot',
    display_name: 'Claims Bot',
    description: 'Handles claims',
    domain: 'insurance',
    surfaces: ['workforce'],
    is_active: true,
    status: 'active',
    tags: [],
    skill_ids: [],
    policy_refs: [],
    workforce_profile: {
      role: 'Claims Analyst',
      department: 'Operations',
      owner_user_id: 'user-1',
      autonomy_level: 'approval_required',
      escalation: {
        owner_user_id: null,
        ticket_queue: null,
        notify_emails: [],
        confidence_threshold: 0.5,
        blocked_intents: []
      },
      budget: { daily_credit_limit: null, weekly_credit_limit: null, monthly_credit_limit: null, on_exceeded: 'pause' },
      knowledge_refs: [],
      instructions: ''
    },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides
  } as WorkforceAgent
}

function buildConfig(overrides: Partial<WorkforceAgentConfigState> = {}): WorkforceAgentConfigState {
  return {
    agent: buildAgent(),
    triggers: [],
    isLoading: false,
    error: null,
    savingSection: null,
    pendingTriggerId: null,
    refetch: jest.fn().mockResolvedValue(undefined),
    saveSection: jest.fn().mockResolvedValue(undefined),
    createTrigger: jest.fn().mockResolvedValue(undefined),
    updateTrigger: jest.fn().mockResolvedValue(undefined),
    deleteTrigger: jest.fn().mockResolvedValue(undefined),
    clearError: jest.fn(),
    ...overrides
  }
}

describe('AgentWorkerSections', () => {
  it('renders only the passport cards for group="passport"', () => {
    render(<AgentWorkerSections accessToken="tok" group="passport" config={buildConfig()} />)

    expect(screen.getByTestId('workforce-config-section-role-ownership')).toBeInTheDocument()
    expect(screen.getByTestId('workforce-config-section-escalation')).toBeInTheDocument()
    expect(screen.getByTestId('workforce-config-section-budget')).toBeInTheDocument()
    // Activation-only cards are not rendered in the passport group.
    expect(screen.queryByTestId('workforce-config-section-autonomy')).toBeNull()
    expect(screen.queryByTestId('workforce-config-section-knowledge')).toBeNull()
  })

  it('renders only the activation cards for group="activation"', () => {
    render(<AgentWorkerSections accessToken="tok" group="activation" config={buildConfig()} />)

    expect(screen.getByTestId('workforce-config-section-autonomy')).toBeInTheDocument()
    expect(screen.getByTestId('workforce-config-section-knowledge')).toBeInTheDocument()
    // Passport-only cards are not rendered in the activation group.
    expect(screen.queryByTestId('workforce-config-section-role-ownership')).toBeNull()
    expect(screen.queryByTestId('workforce-config-section-escalation')).toBeNull()
    expect(screen.queryByTestId('workforce-config-section-budget')).toBeNull()
  })

  it('saves role/department/owner through the shared saveSection callback', async () => {
    const config = buildConfig()

    render(<AgentWorkerSections accessToken="tok" group="passport" config={config} />)

    fireEvent.change(screen.getByTestId('workforce-role-ownership-role'), { target: { value: 'Senior Analyst' } })
    fireEvent.click(screen.getByTestId('workforce-config-section-save-role-ownership'))

    await waitFor(() =>
      expect(config.saveSection).toHaveBeenCalledWith('identity', {
        role: 'Senior Analyst',
        department: 'Operations',
        owner_user_id: 'user-1'
      })
    )
  })

  it('shows an error banner and no cards when the config errored', () => {
    render(
      <AgentWorkerSections accessToken="tok" group="activation" config={buildConfig({ agent: null, error: 'boom' })} />
    )

    expect(screen.getByTestId('agent-worker-sections-activation-error')).toHaveTextContent('boom')
    expect(screen.queryByTestId('workforce-config-section-autonomy')).toBeNull()
  })
})
