/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

import { AgentsScreen } from '../AgentsScreen'

const mockGetAgentRegistry = jest.fn()
const mockGetBuiltinSubagents = jest.fn()
const mockListWorkforceAgents = jest.fn()
const mockGet = jest.fn()

const mockClient = {
  getAgentRegistry: (...args: unknown[]) => mockGetAgentRegistry(...args),
  getBuiltinSubagents: (...args: unknown[]) => mockGetBuiltinSubagents(...args),
  listWorkforceAgents: (...args: unknown[]) => mockListWorkforceAgents(...args),
  get: (...args: unknown[]) => mockGet(...args),
  getWorkspaces: jest.fn().mockResolvedValue({
    data: [{ _id: 'workspace-1', name: 'Default workspace', default: true }]
  }),
  getAiModels: jest.fn().mockResolvedValue({
    data: [{ _id: 'model-1' }]
  })
}

jest.mock('@/common/network/ai/prompt-manager/usePromptManagerClient', () => ({
  usePromptManagerClient: () => mockClient
}))

function registryEntry(id: string, name: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name,
    description: `${name} description`,
    agent_type: 'expert',
    specialty: 'general',
    avatar: null,
    color: null,
    is_public: true,
    tags: [],
    tools_count: 0,
    knowledge_sources_count: 0,
    skill_ids: [],
    skills_count: 0,
    source: 'prompt_odm',
    status: 'active',
    created_at: null,
    ...overrides
  }
}

describe('AgentsScreen workforce merge', () => {
  beforeEach(() => {
    mockGetAgentRegistry.mockReset()
    mockGetBuiltinSubagents.mockReset()
    mockListWorkforceAgents.mockReset()
    mockGet.mockReset()

    mockGetBuiltinSubagents.mockResolvedValue([])
    mockGet.mockResolvedValue([])
    // Registry (PromptODM-only) returns just the enterprise agent; workforce
    // agents live in a different collection and arrive via listWorkforceAgents.
    mockGetAgentRegistry.mockImplementation((params: { status?: string }) =>
      params?.status === 'archived'
        ? Promise.resolve([])
        : Promise.resolve([registryEntry('ent-1', 'web_search_agent')])
    )
    mockListWorkforceAgents.mockResolvedValue({
      data: [
        {
          agent_id: 'wf-1',
          name: 'claims_bot',
          display_name: 'Claims Bot',
          description: 'Handles claims',
          domain: 'Insurance',
          surfaces: ['workforce'],
          is_active: true,
          status: 'active',
          tags: [],
          skill_ids: [],
          policy_refs: [],
          workforce_profile: { role: 'Claims', knowledge_refs: [] },
          created_at: null,
          updated_at: null
        }
      ],
      total: 1
    })
  })

  it("requests surface 'all' so workforce agents are included", async () => {
    render(<AgentsScreen accessToken="tok" onBack={() => {}} embedded />)

    await waitFor(() => expect(screen.getByTestId('agent-card-wf-1')).toBeInTheDocument())
    expect(mockGetAgentRegistry).toHaveBeenCalledWith(expect.objectContaining({ surface: 'all' }))
  })

  it('shows the Worker marker only on workforce-enabled agents', async () => {
    render(<AgentsScreen accessToken="tok" onBack={() => {}} embedded />)

    expect(await screen.findByTestId('agent-worker-label-wf-1')).toBeInTheDocument()
    expect(screen.queryByTestId('agent-worker-label-ent-1')).toBeNull()
  })

  it('groups ready workers, ready agents, and agents that need setup', async () => {
    mockGet.mockResolvedValue([{ skill_id: 'ready-skill', tool_refs: ['ready-tool'] }])
    mockGetAgentRegistry.mockImplementation((params: { status?: string }) =>
      params?.status === 'archived'
        ? Promise.resolve([])
        : Promise.resolve([
            registryEntry('ready-agent', 'ready_agent', {
              skill_ids: ['ready-skill'],
              skills_count: 1,
              system_prompt_length: 240
            }),
            registryEntry('draft-agent', 'draft_agent')
          ])
    )
    mockListWorkforceAgents.mockResolvedValue({
      data: [
        {
          agent_id: 'ready-worker',
          name: 'ready_worker',
          display_name: 'Ready Worker',
          description: 'Handles governed work',
          domain: 'Operations',
          surfaces: ['workforce'],
          is_active: true,
          status: 'active',
          tags: [],
          skill_ids: ['ready-skill'],
          policy_refs: [],
          workforce_profile: { role: 'Operations', knowledge_refs: [] },
          created_at: null,
          updated_at: null
        }
      ],
      total: 1
    })

    render(<AgentsScreen accessToken="tok" onBack={() => {}} embedded />)

    const needsSetupSection = await screen.findByTestId('needs-setup-agents-section')
    const workersSection = await screen.findByTestId('worker-agents-section')
    const standardAgentsSection = await screen.findByTestId('standard-agents-section')

    expect(needsSetupSection).toHaveTextContent('Draft Agent')
    expect(workersSection).toHaveTextContent('Ready Worker')
    expect(standardAgentsSection).toHaveTextContent('Ready Agent')
    expect(
      Boolean(workersSection.compareDocumentPosition(standardAgentsSection) & Node.DOCUMENT_POSITION_FOLLOWING)
    ).toBe(true)
    expect(
      Boolean(standardAgentsSection.compareDocumentPosition(needsSetupSection) & Node.DOCUMENT_POSITION_FOLLOWING)
    ).toBe(true)
  })

  it('searches archived agents and expands the archived section on match', async () => {
    mockGetAgentRegistry.mockImplementation((params: { status?: string }) =>
      params?.status === 'archived'
        ? Promise.resolve([registryEntry('arch-1', 'retired_hr_bot')])
        : Promise.resolve([registryEntry('ent-1', 'web_search_agent')])
    )

    render(<AgentsScreen accessToken="tok" onBack={() => {}} embedded />)

    await waitFor(() => expect(screen.getByTestId('archived-section')).toBeInTheDocument())
    expect(screen.queryByTestId('archived-card-arch-1')).toBeNull()

    const searchInput = screen.getByTestId('agents-search-input')
    await userEvent.type(searchInput, 'retired_hr')

    expect(await screen.findByTestId('archived-card-arch-1')).toBeInTheDocument()
    expect(screen.queryByTestId('agent-card-ent-1')).toBeNull()
  })

  it('shows a prominent create CTA without a plus icon in embedded mode', async () => {
    render(<AgentsScreen accessToken="tok" onBack={() => {}} embedded />)

    const createButton = await screen.findByTestId('agents-hire-button')
    expect(createButton).toHaveTextContent('Create agent or worker')
    expect(createButton).not.toHaveTextContent('+')
  })

  it('does not repeat an Agents page title when embedded', async () => {
    render(<AgentsScreen accessToken="tok" onBack={() => {}} embedded />)

    await waitFor(() => expect(screen.getByTestId('agents-tab-toolbar')).toBeInTheDocument())
    expect(screen.queryByRole('heading', { level: 2, name: 'Agents' })).not.toBeInTheDocument()
  })

  it('opens the create flow when the CTA is clicked', async () => {
    render(<AgentsScreen accessToken="tok" onBack={() => {}} embedded />)

    await userEvent.click(await screen.findByTestId('agents-hire-button'))
    expect(await screen.findByTestId('create-agent-screen')).toBeInTheDocument()
  })
})
