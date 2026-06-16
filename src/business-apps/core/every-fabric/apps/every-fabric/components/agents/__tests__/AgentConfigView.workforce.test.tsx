/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
const mockDeployWorkforce = jest.fn()
const mockGenerateAgentAvatar = jest.fn()

const mockClient = {
  getAgentSkills: (...a: unknown[]) => mockGetAgentSkills(...a),
  getAgentDetail: (...a: unknown[]) => mockGetAgentDetail(...a),
  get: (...a: unknown[]) => mockGet(...a),
  getAgentPolicies: (...a: unknown[]) => mockGetAgentPolicies(...a),
  getWorkspacePolicies: (...a: unknown[]) => mockGetWorkspacePolicies(...a),
  getWorkforceAgent: (...a: unknown[]) => mockGetWorkforceAgent(...a),
  listWorkforceTriggers: (...a: unknown[]) => mockListWorkforceTriggers(...a),
  deployWorkforce: (...a: unknown[]) => mockDeployWorkforce(...a),
  generateAgentAvatar: (...a: unknown[]) => mockGenerateAgentAvatar(...a)
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

const enterpriseAgent: FabricAgent = {
  ...agent,
  id: 'ent-1',
  name: 'billing_assistant',
  source: 'prompt_odm',
  isWorkforce: false
}

describe('AgentConfigView guided setup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetAgentSkills.mockResolvedValue({ skills: [] })
    mockGetAgentDetail.mockResolvedValue(null)
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
    mockGenerateAgentAvatar.mockResolvedValue({
      avatar: 'data:image/png;base64,ZmFrZS1wbmc=',
      model: 'gpt-image-2',
      size: '1024x1024',
      quality: 'low'
    })
  })

  it('renders guided steps with Profile active by default', async () => {
    render(<AgentConfigView agent={enterpriseAgent} accessToken="tok" onBack={() => {}} onSkillsSaved={() => {}} />)

    expect(screen.getByTestId('agent-config-progress')).toBeInTheDocument()
    expect(screen.getByTestId('agent-config-tab-profile')).toBeInTheDocument()
    expect(screen.getByTestId('agent-config-tab-capabilities')).toBeInTheDocument()
    expect(screen.getByTestId('agent-config-tab-deployment')).toBeInTheDocument()
    expect(screen.getByTestId('agent-config-tab-passport')).toBeInTheDocument()
    expect(screen.getByTestId('agent-config-tab-activation')).toBeInTheDocument()
    // Profile content is visible by default.
    expect(await screen.findByTestId('agent-config-details')).toBeInTheDocument()
  })

  it('shows the Passport worker cards on the Passport tab for a Worker', async () => {
    render(
      <AgentConfigView agent={agent} accessToken="tok" isWorkforceEnabled onBack={() => {}} onSkillsSaved={() => {}} />
    )

    await userEvent.click(screen.getByTestId('agent-config-tab-passport'))

    expect(await screen.findByTestId('agent-config-passport')).toBeInTheDocument()
    expect(await screen.findByTestId('workforce-config-section-role-ownership')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText(/Agent not found/i)).toBeNull())
  })

  it('shows the Passport empty state for a non-worker agent and routes to Deployment', async () => {
    render(<AgentConfigView agent={enterpriseAgent} accessToken="tok" onBack={() => {}} onSkillsSaved={() => {}} />)

    await userEvent.click(screen.getByTestId('agent-config-tab-passport'))
    expect(await screen.findByTestId('agent-config-passport-empty')).toBeInTheDocument()

    await userEvent.click(screen.getByTestId('agent-config-passport-goto-activation'))
    expect(await screen.findByTestId('agent-config-deployments')).toBeInTheDocument()
  })

  it('generates an avatar and reports the updated image to the parent list', async () => {
    const onAgentUpdated = jest.fn()
    render(
      <AgentConfigView
        agent={enterpriseAgent}
        accessToken="tok"
        onBack={() => {}}
        onSkillsSaved={() => {}}
        onAgentUpdated={onAgentUpdated}
      />
    )

    await userEvent.click(await screen.findByTestId('agent-avatar-generate'))

    await waitFor(() => {
      expect(mockGenerateAgentAvatar).toHaveBeenCalledWith('ent-1')
      expect(onAgentUpdated).toHaveBeenCalledWith('ent-1', {
        avatar: 'data:image/png;base64,ZmFrZS1wbmc='
      })
    })
    expect(screen.getAllByAltText('Billing Assistant avatar').length).toBeGreaterThan(0)
  })

  it('reveals the worker runtime config in the Activation tab right after deploying', async () => {
    mockGetAgentDetail.mockResolvedValue({ system_prompt: 'You are helpful.' })
    mockDeployWorkforce.mockResolvedValue({ agent_id: 'ent-1' })

    render(<AgentConfigView agent={enterpriseAgent} accessToken="tok" onBack={() => {}} onSkillsSaved={() => {}} />)

    await userEvent.click(screen.getByTestId('agent-config-tab-deployment'))

    // Worker runtime cards are hidden for an enterprise-only agent.
    await screen.findByTestId('agent-config-deployments')
    expect(screen.queryByTestId('agent-config-activation')).toBeNull()

    // Activate as a Worker with the minimal required fields.
    await userEvent.click(screen.getByTestId('add-workforce-deployment'))
    await userEvent.type(screen.getByTestId('wf-role-input'), 'Billing Agent')
    await userEvent.click(screen.getByTestId('wf-deploy-submit'))

    await userEvent.click(screen.getByTestId('agent-config-tab-activation'))

    // The worker runtime config appears immediately, without a reload.
    expect(await screen.findByTestId('agent-config-activation')).toBeInTheDocument()
    // Wait for the shared config to finish loading so its cards are rendered.
    expect(await screen.findByTestId('workforce-config-section-autonomy')).toBeInTheDocument()
    expect(mockDeployWorkforce).toHaveBeenCalledWith('ent-1', expect.objectContaining({ role: 'Billing Agent' }))
  })
})
