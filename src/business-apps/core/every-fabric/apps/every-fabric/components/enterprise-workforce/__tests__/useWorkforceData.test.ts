/** @jest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react'

const mockGetAgentRegistry = jest.fn()
const mockGetBuiltinSubagents = jest.fn()
const mockActivateAgent = jest.fn()
const mockArchiveAgent = jest.fn()

// IMPORTANT: usePromptManagerClient is a dependency of the hook's refetch
// callback. The mocked client must keep a stable identity across renders or
// useEffect would re-run forever. The factory below returns the same object
// on every call. It is defined inside the factory so jest.mock hoisting does
// not hit the temporal dead zone of any module-scoped const.
jest.mock('@/common/network/ai/prompt-manager/usePromptManagerClient', () => {
  const stableClient = {
    getAgentRegistry: (...args: unknown[]) => mockGetAgentRegistry(...args),
    getBuiltinSubagents: () => mockGetBuiltinSubagents(),
    activateAgent: (id: string) => mockActivateAgent(id),
    archiveAgent: (id: string) => mockArchiveAgent(id)
  }
  return {
    usePromptManagerClient: () => stableClient
  }
})

import { useWorkforceData } from '../useWorkforceData'

function buildEntry(id: string, name: string, extras: Record<string, unknown> = {}) {
  return {
    id,
    name,
    description: `${name} description`,
    agent_type: 'expert',
    specialty: 'general',
    avatar: null,
    color: '#6366f1',
    is_public: true,
    tags: [],
    tools_count: 0,
    knowledge_sources_count: 0,
    skill_ids: [],
    skills_count: 0,
    source: 'prompt_odm',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    ...extras
  }
}

beforeEach(() => {
  mockGetAgentRegistry.mockReset()
  mockGetBuiltinSubagents.mockReset()
  mockActivateAgent.mockReset()
  mockArchiveAgent.mockReset()
})

describe('useWorkforceData', () => {
  it('combines active, archived and built-in sources with correct counts', async () => {
    mockGetAgentRegistry.mockImplementation((params: { status?: string }) =>
      params?.status === 'archived'
        ? Promise.resolve([buildEntry('arc-1', 'Old Expert', { status: 'archived' })])
        : Promise.resolve([buildEntry('act-1', 'New Expert'), buildEntry('act-2', 'Another Expert')])
    )
    mockGetBuiltinSubagents.mockResolvedValue([
      {
        id: 'b-1',
        name: 'researcher',
        description: 'researches things',
        categories: ['web'],
        source: 'builtin_subagent'
      }
    ])

    const { result } = renderHook(() => useWorkforceData({ accessToken: 'token', filter: 'all', search: '' }))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.counts.active).toBe(2)
    expect(result.current.counts.archived).toBe(1)
    expect(result.current.counts.builtin).toBe(1)
    expect(result.current.counts.total).toBe(4)
    expect(result.current.filtered).toHaveLength(4)
  })

  it('filters by search query across name, description and tags', async () => {
    mockGetAgentRegistry.mockImplementation((params: { status?: string }) =>
      params?.status === 'archived'
        ? Promise.resolve([])
        : Promise.resolve([
            buildEntry('act-1', 'Marketing Expert', { tags: ['marketing'] }),
            buildEntry('act-2', 'Finance Expert', { tags: ['finance'] })
          ])
    )
    mockGetBuiltinSubagents.mockResolvedValue([])

    const { result, rerender } = renderHook(
      ({ search }: { search: string }) => useWorkforceData({ accessToken: 'token', filter: 'all', search }),
      { initialProps: { search: '' } }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.filtered).toHaveLength(2)

    rerender({ search: 'marketing' })
    expect(result.current.filtered).toHaveLength(1)
    expect(result.current.filtered[0].id).toBe('act-1')
  })

  it('moves an agent from active to archived after archive()', async () => {
    mockGetAgentRegistry.mockImplementation((params: { status?: string }) =>
      params?.status === 'archived' ? Promise.resolve([]) : Promise.resolve([buildEntry('act-1', 'Marketing Expert')])
    )
    mockGetBuiltinSubagents.mockResolvedValue([])
    mockArchiveAgent.mockResolvedValue({ agent_id: 'act-1', source: 'prompt_odm', status: 'archived' })

    const { result } = renderHook(() => useWorkforceData({ accessToken: 'token', filter: 'all', search: '' }))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.counts.active).toBe(1)

    await act(async () => {
      await result.current.archive(result.current.activeAgents[0])
    })

    expect(mockArchiveAgent).toHaveBeenCalledWith('act-1')
    expect(result.current.counts.active).toBe(0)
    expect(result.current.counts.archived).toBe(1)
  })

  it('moves an agent from archived to active after activate()', async () => {
    mockGetAgentRegistry.mockImplementation((params: { status?: string }) =>
      params?.status === 'archived'
        ? Promise.resolve([buildEntry('arc-1', 'Sleeping Expert', { status: 'archived' })])
        : Promise.resolve([])
    )
    mockGetBuiltinSubagents.mockResolvedValue([])
    mockActivateAgent.mockResolvedValue({ agent_id: 'arc-1', source: 'prompt_odm', status: 'active' })

    const { result } = renderHook(() => useWorkforceData({ accessToken: 'token', filter: 'all', search: '' }))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.counts.archived).toBe(1)

    await act(async () => {
      await result.current.activate(result.current.archivedAgents[0])
    })

    expect(mockActivateAgent).toHaveBeenCalledWith('arc-1')
    expect(result.current.counts.active).toBe(1)
    expect(result.current.counts.archived).toBe(0)
  })

  it('returns only active agents when filter is "active"', async () => {
    mockGetAgentRegistry.mockImplementation((params: { status?: string }) =>
      params?.status === 'archived'
        ? Promise.resolve([buildEntry('arc-1', 'Old', { status: 'archived' })])
        : Promise.resolve([buildEntry('act-1', 'New')])
    )
    mockGetBuiltinSubagents.mockResolvedValue([
      { id: 'b-1', name: 'researcher', description: '', categories: [], source: 'builtin_subagent' }
    ])

    const { result } = renderHook(() => useWorkforceData({ accessToken: 'token', filter: 'active', search: '' }))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.filtered).toHaveLength(1)
    expect(result.current.filtered[0].id).toBe('act-1')
  })
})
