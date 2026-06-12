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

const mockClient = {
  getAgentSkills: (...a: unknown[]) => mockGetAgentSkills(...a),
  getAgentDetail: (...a: unknown[]) => mockGetAgentDetail(...a),
  get: (...a: unknown[]) => mockGet(...a),
  getAgentPolicies: (...a: unknown[]) => mockGetAgentPolicies(...a),
  getWorkspacePolicies: (...a: unknown[]) => mockGetWorkspacePolicies(...a),
  updateAgentDetails: jest.fn()
}

jest.mock('@/common/network/ai/prompt-manager/usePromptManagerClient', () => ({
  usePromptManagerClient: () => mockClient
}))

const agent: FabricAgent = {
  id: 'agent-1',
  name: 'crm_sales',
  display_name: 'Sales Exit Agent',
  description: 'Handles sales exits',
  agent_type: 'general',
  specialty: 'Sales',
  avatar: null,
  color: null,
  is_public: true,
  tags: ['sales'],
  tools_count: 1,
  knowledge_sources_count: 0,
  skill_ids: [],
  skills_count: 0,
  source: 'prompt_odm',
  status: 'active',
  created_at: null
}

describe('AgentConfigView enterprise display_name', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetAgentSkills.mockResolvedValue({ skills: [] })
    mockGet.mockResolvedValue([])
    mockGetAgentPolicies.mockResolvedValue({ supported: true, policies: [], excluded_policy_refs: [] })
    mockGetWorkspacePolicies.mockResolvedValue({ workspace_id: null, workspace_name: null, policies: [] })
    mockGetAgentDetail.mockResolvedValue({
      id: 'agent-1',
      name: 'crm_sales',
      display_name: 'Sales Exit Agent',
      description: 'Handles sales exits',
      tags: ['sales'],
      specialty: 'Sales',
      system_prompt: 'You are a sales exit specialist with enough detail to pass validation checks easily.'
    })
  })

  it('shows display_name in the header and name field', async () => {
    render(
      <AgentConfigView
        agent={agent}
        accessToken="tok"
        isWorkforceEnabled={false}
        onBack={() => {}}
        onSkillsSaved={() => {}}
      />
    )

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sales Exit Agent')

    await waitFor(() => {
      expect(screen.getByLabelText('Name')).toHaveValue('Sales Exit Agent')
    })
  })
})
