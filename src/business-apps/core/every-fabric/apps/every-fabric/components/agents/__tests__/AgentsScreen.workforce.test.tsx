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
  get: (...args: unknown[]) => mockGet(...args)
}

jest.mock('@/common/network/ai/prompt-manager/usePromptManagerClient', () => ({
  usePromptManagerClient: () => mockClient
}))

function registryEntry(id: string, name: string) {
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
    created_at: null
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

  it('shows the Workforce badge only on workforce-enabled agents', async () => {
    render(<AgentsScreen accessToken="tok" onBack={() => {}} embedded />)

    expect(await screen.findByTestId('agent-workforce-badge-wf-1')).toBeInTheDocument()
    expect(screen.queryByTestId('agent-workforce-badge-ent-1')).toBeNull()
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
})
