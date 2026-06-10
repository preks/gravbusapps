/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'

import { WorkforceConfigSections } from '../WorkforceConfigSections'
import type { WorkforceAgent } from '../../enterprise-workforce/workforceTypes'

const mockGetWorkforceAgent = jest.fn()
const mockListWorkforceTriggers = jest.fn()
const mockUpdateWorkforceAgent = jest.fn()

const mockClient = {
  getWorkforceAgent: (...args: unknown[]) => mockGetWorkforceAgent(...args),
  listWorkforceTriggers: (...args: unknown[]) => mockListWorkforceTriggers(...args),
  updateWorkforceAgent: (...args: unknown[]) => mockUpdateWorkforceAgent(...args)
}

jest.mock('@/common/network/ai/prompt-manager/usePromptManagerClient', () => ({
  usePromptManagerClient: () => mockClient
}))

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
  }
}

describe('WorkforceConfigSections', () => {
  beforeEach(() => {
    mockGetWorkforceAgent.mockReset()
    mockListWorkforceTriggers.mockReset()
    mockUpdateWorkforceAgent.mockReset()
    mockListWorkforceTriggers.mockResolvedValue([])
  })

  it('renders the workforce-only cards once the agent loads', async () => {
    mockGetWorkforceAgent.mockResolvedValue(buildAgent())

    render(<WorkforceConfigSections agentId="a1" accessToken="tok" />)

    expect(await screen.findByTestId('workforce-config-section-role-ownership')).toBeInTheDocument()
    expect(screen.getByTestId('workforce-config-section-autonomy')).toBeInTheDocument()
    expect(screen.getByTestId('workforce-config-section-knowledge')).toBeInTheDocument()
    expect(screen.getByTestId('workforce-config-section-escalation')).toBeInTheDocument()
    expect(screen.getByTestId('workforce-config-section-budget')).toBeInTheDocument()
  })

  it('saves role/department/owner through the workforce update endpoint', async () => {
    mockGetWorkforceAgent.mockResolvedValue(buildAgent())
    mockUpdateWorkforceAgent.mockResolvedValue(
      buildAgent({ workforce_profile: { ...buildAgent().workforce_profile, role: 'Senior Analyst' } })
    )

    render(<WorkforceConfigSections agentId="a1" accessToken="tok" />)

    const roleInput = await screen.findByTestId('workforce-role-ownership-role')
    fireEvent.change(roleInput, { target: { value: 'Senior Analyst' } })
    fireEvent.click(screen.getByTestId('workforce-config-section-save-role-ownership'))

    await waitFor(() =>
      expect(mockUpdateWorkforceAgent).toHaveBeenCalledWith('a1', {
        role: 'Senior Analyst',
        department: 'Operations',
        owner_user_id: 'user-1'
      })
    )
  })

  it('shows an error banner and no cards when the workforce fetch fails', async () => {
    mockGetWorkforceAgent.mockRejectedValue(new Error('boom'))

    render(<WorkforceConfigSections agentId="a1" accessToken="tok" />)

    expect(await screen.findByTestId('agent-config-workforce-error')).toHaveTextContent('boom')
    expect(screen.queryByTestId('workforce-config-section-autonomy')).toBeNull()
  })
})
