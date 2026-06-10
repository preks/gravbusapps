/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'

import { AgentConfigView } from '../AgentConfigView'
import type { FabricAgent } from '../agentTypes'

const mockGetAgentSkills = jest.fn()
const mockGetAgentDetail = jest.fn()
const mockGet = jest.fn()
const mockGetAgentPolicies = jest.fn()
const mockGetWorkspacePolicies = jest.fn()
const mockGetWorkforceAgent = jest.fn()
const mockListWorkforceTriggers = jest.fn()

const mockClient = {
  getAgentSkills: (...a: unknown[]) => mockGetAgentSkills(...a),
  getAgentDetail: (...a: unknown[]) => mockGetAgentDetail(...a),
  get: (...a: unknown[]) => mockGet(...a),
  getAgentPolicies: (...a: unknown[]) => mockGetAgentPolicies(...a),
  getWorkspacePolicies: (...a: unknown[]) => mockGetWorkspacePolicies(...a),
  getWorkforceAgent: (...a: unknown[]) => mockGetWorkforceAgent(...a),
  listWorkforceTriggers: (...a: unknown[]) => mockListWorkforceTriggers(...a)
}

jest.mock('@/common/network/ai/prompt-manager/usePromptManagerClient', () => ({
  usePromptManagerClient: () => mockClient
}))

const agent: FabricAgent = {
  id: 'wf-1',
  name: 'insurance_claims_specialist',
  description: 'Handles claims',
  agent_type: null,
  specialty: 'Claims',
  domain: 'Insurance',
  avatar: null,
  color: null,
  is_public: null,
  tags: ['insurance'],
  tools_count: 0,
  knowledge_sources_count: 0,
  skill_ids: [],
  skills_count: 0,
  source: 'autonomous_agent',
  isWorkforce: true,
  status: 'active',
  created_at: null
}

describe('AgentConfigView for workforce agents', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetAgentSkills.mockResolvedValue({ skills: [] })
    mockGet.mockResolvedValue([])
    mockGetAgentPolicies.mockResolvedValue({ supported: false, policies: [], excluded_policy_refs: [] })
    mockGetWorkspacePolicies.mockResolvedValue({ workspace_id: null, workspace_name: null, policies: [] })
    mockGetWorkforceAgent.mockResolvedValue({
      agent_id: 'wf-1',
      name: 'insurance_claims_specialist',
      display_name: 'Insurance Claims Specialist',
      description: 'Handles claims',
      domain: 'Insurance',
      surfaces: ['workforce'],
      is_active: true,
      status: 'active',
      tags: [],
      skill_ids: [],
      policy_refs: [],
      workforce_profile: {
        role: 'Claims',
        autonomy_level: 'approval_required',
        escalation: { notify_emails: [], confidence_threshold: 0.7, blocked_intents: [] },
        budget: { on_exceeded: 'pause' },
        knowledge_refs: [],
        instructions: ''
      },
      created_at: null,
      updated_at: null
    })
    mockListWorkforceTriggers.mockResolvedValue([])
  })

  it('does not call the registry detail endpoint and shows no 404', async () => {
    render(
      <AgentConfigView agent={agent} accessToken="tok" isWorkforceEnabled onBack={() => {}} onSkillsSaved={() => {}} />
    )

    expect(await screen.findByTestId('agent-config-workforce')).toBeInTheDocument()
    expect(mockGetAgentDetail).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByText(/Agent not found/i)).toBeNull())
  })
})
