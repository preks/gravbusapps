/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'

import { SkillsAndPoliciesSection } from '../sections/SkillsAndPoliciesSection'
import type { WorkforceAgent } from '../workforceTypes'

const mockGetAgentSkills = jest.fn()
const mockGet = jest.fn()
const mockGetAgentPolicies = jest.fn()
const mockGetWorkspacePolicies = jest.fn()
const mockSetAgentPolicies = jest.fn()

// Stable client reference (mirrors the real memoized singleton) so the embedded
// policy editor's effect does not re-fire every render.
const mockClient = {
  getAgentSkills: (...args: unknown[]) => mockGetAgentSkills(...args),
  get: (...args: unknown[]) => mockGet(...args),
  getAgentPolicies: (...args: unknown[]) => mockGetAgentPolicies(...args),
  getWorkspacePolicies: (...args: unknown[]) => mockGetWorkspacePolicies(...args),
  setAgentPolicies: (...args: unknown[]) => mockSetAgentPolicies(...args)
}

jest.mock('@/common/network/ai/prompt-manager/usePromptManagerClient', () => ({
  usePromptManagerClient: () => mockClient
}))

function buildAgent(overrides: Partial<WorkforceAgent> = {}): WorkforceAgent {
  return {
    agent_id: 'agent-123',
    name: 'insurance_claims_specialist',
    display_name: 'Insurance Claims Specialist',
    description: 'Handles inbound insurance emails',
    domain: 'insurance',
    surfaces: [],
    is_active: true,
    status: 'active',
    tags: [],
    skill_ids: ['insurance-crm-workflow'],
    policy_refs: [],
    workforce_profile: {
      role: 'Insurance specialist',
      department: null,
      owner_user_id: null,
      autonomy_level: 'approval_required',
      escalation: {
        on_low_confidence: 'escalate',
        on_compliance_concern: 'escalate',
        on_value_threshold: null
      },
      budget: {
        daily_credit_cap: 50,
        monthly_credit_cap: 1000,
        on_exceeded: 'escalate'
      },
      knowledge_refs: [],
      instructions: ''
    } as WorkforceAgent['workforce_profile'],
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-06-01T10:00:00Z',
    ...overrides
  }
}

describe('SkillsAndPoliciesSection', () => {
  beforeEach(() => {
    mockGetAgentSkills.mockReset()
    mockGet.mockReset()
    mockGetAgentPolicies.mockReset()
    mockGetWorkspacePolicies.mockReset()
    mockSetAgentPolicies.mockReset()
    // The embedded AgentPoliciesEditor loads policies on mount; default to a
    // supported-but-empty response so the skills assertions stay isolated.
    mockGetAgentPolicies.mockResolvedValue({ supported: true, policies: [], excluded_policy_refs: [] })
    mockGetWorkspacePolicies.mockResolvedValue({ workspace_id: null, workspace_name: null, policies: [] })
    mockSetAgentPolicies.mockResolvedValue({})
  })

  it('renders the resolved skill name and attached tool refs', async () => {
    mockGetAgentSkills.mockResolvedValue({
      agent_id: 'agent-123',
      source: 'odm',
      skills: [
        {
          skill_id: 'insurance-crm-workflow',
          name: 'Insurance CRM workflow',
          description: 'CRM playbook for inbound insurance claim emails.',
          status: 'approved'
        }
      ]
    })
    mockGet.mockResolvedValue([
      {
        skill_id: 'insurance-crm-workflow',
        tool_refs: ['functions.search_crm_entity', 'functions.create_crm_entity', 'functions.add_crm_note']
      }
    ])

    render(<SkillsAndPoliciesSection agent={buildAgent()} accessToken="tok" isSaving={false} onSave={async () => {}} />)

    await waitFor(() => {
      expect(screen.getByTestId('workforce-skill-detail-insurance-crm-workflow')).toHaveTextContent(
        'Insurance CRM workflow'
      )
    })

    const detail = screen.getByTestId('workforce-skill-detail-insurance-crm-workflow')
    expect(detail).toHaveTextContent('CRM playbook for inbound insurance claim emails.')

    const tools = screen.getByTestId('workforce-skill-tools-insurance-crm-workflow')
    expect(tools).toHaveTextContent('functions.search_crm_entity')
    expect(tools).toHaveTextContent('functions.create_crm_entity')
    expect(tools).toHaveTextContent('functions.add_crm_note')
  })

  it('falls back to the skill_id when manifest and catalog are unreachable', async () => {
    mockGetAgentSkills.mockRejectedValue(new Error('boom'))
    mockGet.mockRejectedValue(new Error('boom'))

    render(<SkillsAndPoliciesSection agent={buildAgent()} accessToken="tok" isSaving={false} onSave={async () => {}} />)

    await waitFor(() => {
      expect(screen.getByTestId('workforce-skill-detail-insurance-crm-workflow')).toHaveTextContent(
        'No tools attached by this skill.'
      )
    })

    const detail = screen.getByTestId('workforce-skill-detail-insurance-crm-workflow')
    expect(detail).toHaveTextContent('insurance-crm-workflow')
  })

  it('renders an attached intranet policy as a deep-link', async () => {
    const policyId = '11111111-1111-1111-1111-111111111111'
    mockGetAgentSkills.mockResolvedValue({ agent_id: 'agent-123', source: 'odm', skills: [] })
    mockGet.mockResolvedValue([])
    mockGetAgentPolicies.mockResolvedValue({
      supported: true,
      policies: [{ policy_id: policyId, title: 'Insurance Claim Triage Policy' }],
      excluded_policy_refs: []
    })

    render(
      <SkillsAndPoliciesSection
        agent={buildAgent({ skill_ids: [] })}
        accessToken="tok"
        isSaving={false}
        onSave={async () => {}}
      />
    )

    const chip = await screen.findByTestId(`workforce-policy-${policyId}`)
    const link = chip.querySelector('a')
    expect(link).not.toBeNull()
    expect(link?.getAttribute('href')).toContain(policyId)
  })

  it('does not call the resolver when no skills are assigned', async () => {
    render(
      <SkillsAndPoliciesSection
        agent={buildAgent({ skill_ids: [] })}
        accessToken="tok"
        isSaving={false}
        onSave={async () => {}}
      />
    )

    expect(screen.queryByTestId('workforce-skill-details')).not.toBeInTheDocument()
    expect(mockGetAgentSkills).not.toHaveBeenCalled()
    expect(mockGet).not.toHaveBeenCalled()
  })
})
