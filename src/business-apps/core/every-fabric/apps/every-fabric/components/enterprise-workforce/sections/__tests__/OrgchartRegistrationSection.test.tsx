/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'

import { OrgchartRegistrationSection, agentUsername, splitDisplayName } from '../OrgchartRegistrationSection'
import type { WorkforceAgent } from '../../workforceTypes'

const mockCreateKeycloakUser = jest.fn()
const mockCreateVirtualAssistant = jest.fn()
const mockSetAccessToken = jest.fn()

jest.mock('@/common/network/flowbot', () => ({
  flowbotClient: {
    setAccessToken: (...args: unknown[]) => mockSetAccessToken(...args),
    createVirtualAssistantKeycloakUser: (...args: unknown[]) => mockCreateKeycloakUser(...args),
    createVirtualAssistant: (...args: unknown[]) => mockCreateVirtualAssistant(...args)
  }
}))

function buildAgent(overrides: Partial<WorkforceAgent> = {}): WorkforceAgent {
  return {
    agent_id: 'a1',
    name: 'claims_bot',
    display_name: 'Claims Bot',
    description: '',
    domain: 'insurance',
    surfaces: ['workforce'],
    is_active: true,
    status: 'active',
    tags: [],
    skill_ids: [],
    policy_refs: [],
    workforce_profile: {
      role: 'Claims Analyst',
      department: null,
      owner_user_id: null,
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

describe('helpers', () => {
  it('agentUsername sanitizes the machine name', () => {
    expect(agentUsername('Claims Bot!')).toBe('agent-claims-bot')
    expect(agentUsername('customer_360_analyst')).toBe('agent-customer_360_analyst')
  })

  it('splitDisplayName splits into first/last with fallbacks', () => {
    expect(splitDisplayName('Claims Bot', 'x')).toEqual({ firstName: 'Claims', lastName: 'Bot' })
    expect(splitDisplayName('Ava', 'x')).toEqual({ firstName: 'Ava', lastName: 'Agent' })
    expect(splitDisplayName('', 'fallback_name')).toEqual({ firstName: 'fallback_name', lastName: 'Agent' })
  })
})

describe('OrgchartRegistrationSection', () => {
  beforeEach(() => {
    mockCreateKeycloakUser.mockReset()
    mockCreateVirtualAssistant.mockReset()
    mockSetAccessToken.mockReset()
  })

  it('registers a new identity end-to-end and saves the orgchart patch', async () => {
    mockCreateKeycloakUser.mockResolvedValue({ user_id: 'kc-1' })
    mockCreateVirtualAssistant.mockResolvedValue({
      employee_id: 'emp-1',
      user_id: 'kc-1',
      org_unit_id: 'ou-1',
      structure_id: 'st-1'
    })
    const onSave = jest.fn().mockResolvedValue(undefined)

    render(<OrgchartRegistrationSection agent={buildAgent()} accessToken="tok" isSaving={false} onSave={onSave} />)

    fireEvent.click(screen.getByTestId('workforce-orgchart-register'))

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(mockSetAccessToken).toHaveBeenCalledWith('tok')
    expect(mockCreateKeycloakUser).toHaveBeenCalledWith({
      username: 'agent-claims_bot',
      first_name: 'Claims',
      last_name: 'Bot',
      enabled: true
    })
    expect(mockCreateVirtualAssistant).toHaveBeenCalledWith({
      user_id: 'kc-1',
      first_name: 'Claims',
      last_name: 'Bot',
      display_name: 'Claims Bot',
      job_position_name: 'Claims Analyst'
    })
    const patch = onSave.mock.calls[0][0]
    expect(patch.orgchart).toMatchObject({
      keycloak_user_id: 'kc-1',
      employee_id: 'emp-1',
      org_unit_id: 'ou-1'
    })
  })

  it('skips Keycloak user creation when an existing user id is supplied', async () => {
    mockCreateVirtualAssistant.mockResolvedValue({
      employee_id: 'emp-2',
      user_id: 'kc-existing',
      org_unit_id: 'ou-1',
      structure_id: 'st-1'
    })
    const onSave = jest.fn().mockResolvedValue(undefined)

    render(<OrgchartRegistrationSection agent={buildAgent()} accessToken="tok" isSaving={false} onSave={onSave} />)

    fireEvent.change(screen.getByTestId('workforce-orgchart-existing-user-id'), {
      target: { value: 'kc-existing' }
    })
    fireEvent.click(screen.getByTestId('workforce-orgchart-register'))

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(mockCreateKeycloakUser).not.toHaveBeenCalled()
    expect(mockCreateVirtualAssistant).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'kc-existing' }))
  })

  it('surfaces a friendly message when user creation is disabled (503)', async () => {
    mockCreateKeycloakUser.mockRejectedValue(new Error('REST request failed: 503 - disabled'))
    const onSave = jest.fn()

    render(<OrgchartRegistrationSection agent={buildAgent()} accessToken="tok" isSaving={false} onSave={onSave} />)

    fireEvent.click(screen.getByTestId('workforce-orgchart-register'))

    expect(await screen.findByTestId('workforce-orgchart-error')).toHaveTextContent(
      'Keycloak user creation is disabled'
    )
    expect(onSave).not.toHaveBeenCalled()
  })

  it('shows the registered identity and unlinks via a null orgchart patch', async () => {
    const agent = buildAgent()
    agent.workforce_profile.orgchart = {
      keycloak_user_id: 'kc-9',
      employee_id: 'emp-9',
      org_unit_id: 'ou-9',
      registered_at: '2026-06-01T00:00:00Z'
    }
    const onSave = jest.fn().mockResolvedValue(undefined)

    render(<OrgchartRegistrationSection agent={agent} accessToken="tok" isSaving={false} onSave={onSave} />)

    expect(screen.getByTestId('workforce-orgchart-registered')).toHaveTextContent('emp-9')
    fireEvent.click(screen.getByTestId('workforce-orgchart-unlink'))

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ orgchart: null }))
  })
})
