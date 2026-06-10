/** @jest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react'
import type {
  WorkforceAgent,
  WorkforceAgentPage,
  WorkforceAutonomyLevel,
  WorkforceTrigger,
  WorkforceWorkspaceMetrics
} from '../workforceTypes'

const mockListWorkforceAgents = jest.fn()
const mockListWorkforceTriggers = jest.fn()
const mockListWorkforceRuns = jest.fn()
const mockActivateWorkforceAgent = jest.fn()
const mockPauseWorkforceAgent = jest.fn()
const mockArchiveWorkforceAgent = jest.fn()
const mockGetWorkforceWorkspaceMetrics = jest.fn()
const mockGetWorkforceAgentMetrics = jest.fn()

// IMPORTANT: usePromptManagerClient is a dependency of refetch. The mocked
// client must keep a stable identity across renders, otherwise useEffect
// would re-run forever.
jest.mock('@/common/network/ai/prompt-manager/usePromptManagerClient', () => {
  const stableClient = {
    listWorkforceAgents: (...args: unknown[]) => mockListWorkforceAgents(...args),
    listWorkforceTriggers: (...args: unknown[]) => mockListWorkforceTriggers(...args),
    listWorkforceRuns: (...args: unknown[]) => mockListWorkforceRuns(...args),
    activateWorkforceAgent: (...args: unknown[]) => mockActivateWorkforceAgent(...args),
    pauseWorkforceAgent: (...args: unknown[]) => mockPauseWorkforceAgent(...args),
    archiveWorkforceAgent: (...args: unknown[]) => mockArchiveWorkforceAgent(...args),
    getWorkforceWorkspaceMetrics: (...args: unknown[]) => mockGetWorkforceWorkspaceMetrics(...args),
    getWorkforceAgentMetrics: (...args: unknown[]) => mockGetWorkforceAgentMetrics(...args)
  }
  return {
    usePromptManagerClient: () => stableClient
  }
})

import { useWorkforceData } from '../useWorkforceData'

function buildAgent(agentId: string, displayName: string, overrides: Partial<WorkforceAgent> = {}): WorkforceAgent {
  return {
    agent_id: agentId,
    name: displayName.toLowerCase().replace(/\s+/g, '_'),
    display_name: displayName,
    description: `${displayName} description`,
    domain: 'workforce',
    surfaces: ['workforce'],
    is_active: true,
    status: 'active',
    tags: [],
    skill_ids: [],
    policy_refs: [],
    workforce_profile: {
      role: 'Specialist',
      department: 'Ops',
      owner_user_id: null,
      autonomy_level: 'approval_required' as WorkforceAutonomyLevel,
      escalation: {
        owner_user_id: null,
        ticket_queue: null,
        notify_emails: [],
        confidence_threshold: 0.7,
        blocked_intents: []
      },
      budget: {
        daily_credit_limit: null,
        weekly_credit_limit: null,
        monthly_credit_limit: null,
        on_exceeded: 'pause'
      },
      knowledge_refs: [],
      instructions: ''
    },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides
  }
}

function buildPage(agents: WorkforceAgent[]): WorkforceAgentPage {
  return { data: agents, total: agents.length }
}

function buildTrigger(agentId: string, enabled = true): WorkforceTrigger {
  return {
    trigger_id: `t-${agentId}-${Math.random()}`,
    agent_id: agentId,
    workspace_id: null,
    type: 'schedule',
    name: 'Daily',
    enabled,
    config: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  }
}

function emptyMetrics(): WorkforceWorkspaceMetrics {
  return {
    workspace_id: '',
    window: 'week',
    from_date: '2026-05-24',
    to_date: '2026-05-30',
    totals: {
      runs: 0,
      completed_runs: 0,
      failed_runs: 0,
      cancelled_runs: 0,
      total_tokens: 0,
      total_credits: 0,
      estimated_cost_usd: 0
    },
    daily_buckets: [],
    by_agent: [],
    runs_today: 0
  }
}

beforeEach(() => {
  mockListWorkforceAgents.mockReset()
  mockListWorkforceTriggers.mockReset()
  mockListWorkforceRuns.mockReset()
  mockActivateWorkforceAgent.mockReset()
  mockPauseWorkforceAgent.mockReset()
  mockArchiveWorkforceAgent.mockReset()
  mockGetWorkforceWorkspaceMetrics.mockReset()
  mockGetWorkforceAgentMetrics.mockReset()
  // Sensible defaults.
  mockListWorkforceTriggers.mockResolvedValue([])
  mockListWorkforceRuns.mockResolvedValue({ data: [], total: 0 })
  mockGetWorkforceWorkspaceMetrics.mockResolvedValue(emptyMetrics())
})

describe('useWorkforceData', () => {
  it('combines active and paused agents with correct counts', async () => {
    mockListWorkforceAgents.mockImplementation((params: { status?: string }) =>
      Promise.resolve(
        params?.status === 'paused'
          ? buildPage([buildAgent('p-1', 'Paused One', { status: 'paused', is_active: false })])
          : buildPage([buildAgent('a-1', 'Active One'), buildAgent('a-2', 'Active Two')])
      )
    )

    const { result } = renderHook(() => useWorkforceData({ accessToken: 'token', filter: 'all', search: '' }))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.counts.active).toBe(2)
    expect(result.current.counts.paused).toBe(1)
    expect(result.current.counts.total).toBe(3)
    expect(result.current.filtered).toHaveLength(3)
  })

  it('derives KPIs from the workspace metrics endpoint (no N+1 runs fetch)', async () => {
    mockListWorkforceAgents.mockImplementation((params: { status?: string }) =>
      Promise.resolve(params?.status === 'paused' ? buildPage([]) : buildPage([buildAgent('a-1', 'Solo Agent')]))
    )
    mockListWorkforceTriggers.mockResolvedValue([buildTrigger('a-1', true), buildTrigger('a-1', false)])
    mockGetWorkforceWorkspaceMetrics.mockResolvedValue({
      ...emptyMetrics(),
      totals: {
        runs: 4,
        completed_runs: 4,
        failed_runs: 0,
        cancelled_runs: 0,
        total_tokens: 2500,
        total_credits: 3,
        estimated_cost_usd: 0
      },
      runs_today: 2,
      by_agent: [
        {
          agent_id: 'a-1',
          totals: {
            runs: 4,
            completed_runs: 4,
            failed_runs: 0,
            cancelled_runs: 0,
            total_tokens: 2500,
            total_credits: 3,
            estimated_cost_usd: 0
          },
          last_completed_at: '2026-05-30T11:00:00Z'
        }
      ]
    })

    const { result } = renderHook(() => useWorkforceData({ accessToken: 'token', filter: 'all', search: '' }))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(mockListWorkforceRuns).not.toHaveBeenCalled()
    expect(result.current.counts.activeTriggers).toBe(1)
    expect(result.current.counts.creditsThisWeek).toBe(3)
    expect(result.current.counts.runsToday).toBe(2)
    expect(result.current.agents[0].activeTriggerCount).toBe(1)
    expect(result.current.agents[0].triggerCount).toBe(2)
    expect(result.current.agents[0].creditsThisWeek).toBe(3)
    expect(result.current.agents[0].runsThisWeek).toBe(4)
    expect(result.current.agents[0].lastCompletedAt).toBe('2026-05-30T11:00:00Z')
  })

  it('filters by search across name, role, and department', async () => {
    mockListWorkforceAgents.mockImplementation((params: { status?: string }) =>
      Promise.resolve(
        params?.status === 'paused'
          ? buildPage([])
          : buildPage([
              buildAgent('a-1', 'Insurance Claims', {
                workforce_profile: {
                  ...buildAgent('a-1', 'Insurance Claims').workforce_profile,
                  role: 'Claims agent',
                  department: 'Insurance Ops'
                }
              }),
              buildAgent('a-2', 'Marketing Helper', {
                workforce_profile: {
                  ...buildAgent('a-2', 'Marketing Helper').workforce_profile,
                  role: 'Copy writer',
                  department: 'Marketing'
                }
              })
            ])
      )
    )

    const { result, rerender } = renderHook(
      ({ search }: { search: string }) => useWorkforceData({ accessToken: 'token', filter: 'all', search }),
      { initialProps: { search: '' } }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.filtered).toHaveLength(2)

    rerender({ search: 'insurance' })
    expect(result.current.filtered).toHaveLength(1)
    expect(result.current.filtered[0].agent.agent_id).toBe('a-1')

    rerender({ search: 'marketing' })
    expect(result.current.filtered).toHaveLength(1)
    expect(result.current.filtered[0].agent.agent_id).toBe('a-2')
  })

  it('flips an agent from active to paused after pause()', async () => {
    mockListWorkforceAgents.mockImplementation((params: { status?: string }) =>
      Promise.resolve(params?.status === 'paused' ? buildPage([]) : buildPage([buildAgent('a-1', 'Solo')]))
    )
    mockPauseWorkforceAgent.mockImplementation((agentId: string) =>
      Promise.resolve(buildAgent(agentId, 'Solo', { status: 'paused', is_active: false }))
    )

    const { result } = renderHook(() => useWorkforceData({ accessToken: 'token', filter: 'all', search: '' }))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.counts.active).toBe(1)

    await act(async () => {
      await result.current.pause(result.current.agents[0].agent)
    })

    expect(mockPauseWorkforceAgent).toHaveBeenCalledWith('a-1')
    expect(result.current.counts.active).toBe(0)
    expect(result.current.counts.paused).toBe(1)
  })

  it('flips an agent from paused to active after activate()', async () => {
    mockListWorkforceAgents.mockImplementation((params: { status?: string }) =>
      Promise.resolve(
        params?.status === 'paused'
          ? buildPage([buildAgent('a-1', 'Sleeping', { status: 'paused', is_active: false })])
          : buildPage([])
      )
    )
    mockActivateWorkforceAgent.mockImplementation((agentId: string) =>
      Promise.resolve(buildAgent(agentId, 'Sleeping', { status: 'active', is_active: true }))
    )

    const { result } = renderHook(() => useWorkforceData({ accessToken: 'token', filter: 'all', search: '' }))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.counts.paused).toBe(1)

    await act(async () => {
      await result.current.activate(result.current.agents[0].agent)
    })

    expect(mockActivateWorkforceAgent).toHaveBeenCalledWith('a-1')
    expect(result.current.counts.active).toBe(1)
    expect(result.current.counts.paused).toBe(0)
  })

  it('removes the agent from the list after archive()', async () => {
    mockListWorkforceAgents.mockImplementation((params: { status?: string }) =>
      Promise.resolve(params?.status === 'paused' ? buildPage([]) : buildPage([buildAgent('a-1', 'Soon Gone')]))
    )
    mockArchiveWorkforceAgent.mockImplementation((agentId: string) =>
      Promise.resolve(buildAgent(agentId, 'Soon Gone', { surfaces: ['enterprise'] }))
    )

    const { result } = renderHook(() => useWorkforceData({ accessToken: 'token', filter: 'all', search: '' }))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.counts.total).toBe(1)

    await act(async () => {
      await result.current.archive(result.current.agents[0].agent)
    })

    expect(mockArchiveWorkforceAgent).toHaveBeenCalledWith('a-1')
    expect(result.current.counts.total).toBe(0)
  })

  it('returns only paused agents when filter is "paused"', async () => {
    mockListWorkforceAgents.mockImplementation((params: { status?: string }) =>
      Promise.resolve(
        params?.status === 'paused'
          ? buildPage([buildAgent('p-1', 'Quiet', { status: 'paused', is_active: false })])
          : buildPage([buildAgent('a-1', 'Loud')])
      )
    )

    const { result } = renderHook(() => useWorkforceData({ accessToken: 'token', filter: 'paused', search: '' }))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.filtered).toHaveLength(1)
    expect(result.current.filtered[0].agent.agent_id).toBe('p-1')
  })

  it('surfaces an error when the agent list call fails', async () => {
    mockListWorkforceAgents.mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useWorkforceData({ accessToken: 'token', filter: 'all', search: '' }))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).toBe('boom')
    expect(result.current.agents).toHaveLength(0)
  })
})
