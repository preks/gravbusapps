/** @jest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react'
import type { WorkforceAgent } from '../workforceTypes'

const mockListAgents = jest.fn()
const mockRestore = jest.fn()

jest.mock('@/common/network/ai/prompt-manager/usePromptManagerClient', () => {
  const stable = {
    listWorkforceAgents: (...args: unknown[]) => mockListAgents(...args),
    restoreWorkforceAgent: (...args: unknown[]) => mockRestore(...args)
  }
  return { usePromptManagerClient: () => stable }
})

import { useArchivedWorkforceAgents } from '../useArchivedWorkforceAgents'

function buildAgent(overrides: Partial<WorkforceAgent> = {}): WorkforceAgent {
  return {
    agent_id: 'agent-1',
    name: 'helper',
    display_name: 'Helper',
    description: '',
    domain: 'support',
    surfaces: ['workforce'],
    is_active: false,
    status: 'archived',
    tags: [],
    skill_ids: [],
    policy_refs: [],
    workforce_profile: {
      role: 'Specialist',
      department: 'Ops',
      owner_user_id: null,
      autonomy_level: 'approval_required',
      escalation: {
        owner_user_id: null,
        ticket_queue: null,
        notify_emails: [],
        confidence_threshold: 0.6,
        blocked_intents: []
      },
      budget: {
        daily_credit_limit: null,
        weekly_credit_limit: null,
        monthly_credit_limit: null,
        on_exceeded: 'pause'
      },
      knowledge_refs: [],
      instructions: '',
      archived_at: '2026-05-27T12:00:00Z',
      archived_by_user_id: 'alice'
    },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-05-27T12:00:00Z',
    ...overrides
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('useArchivedWorkforceAgents', () => {
  it('skips fetching while disabled', async () => {
    const { result } = renderHook(() => useArchivedWorkforceAgents({ accessToken: 't', enabled: false }))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    expect(mockListAgents).not.toHaveBeenCalled()
    expect(result.current.agents).toEqual([])
  })

  it('fetches archived agents when enabled', async () => {
    mockListAgents.mockResolvedValueOnce({ data: [buildAgent()], total: 1 })

    const { result } = renderHook(() => useArchivedWorkforceAgents({ accessToken: 't', enabled: true }))

    await waitFor(() => {
      expect(result.current.agents).toHaveLength(1)
    })
    expect(mockListAgents).toHaveBeenCalledWith({ status: 'archived', limit: 200 })
  })

  it('captures fetch errors into the error field', async () => {
    mockListAgents.mockRejectedValueOnce(new Error('boom'))

    const { result } = renderHook(() => useArchivedWorkforceAgents({ accessToken: 't', enabled: true }))

    await waitFor(() => {
      expect(result.current.error).toBe('boom')
    })
  })

  it('restore calls the client and drops the agent from the local list', async () => {
    const archived = buildAgent()
    mockListAgents.mockResolvedValueOnce({ data: [archived], total: 1 })
    mockRestore.mockResolvedValueOnce({
      ...archived,
      status: 'paused',
      workforce_profile: { ...archived.workforce_profile, archived_at: null, archived_by_user_id: null }
    })

    const { result } = renderHook(() => useArchivedWorkforceAgents({ accessToken: 't', enabled: true }))

    await waitFor(() => {
      expect(result.current.agents).toHaveLength(1)
    })

    await act(async () => {
      await result.current.restore(archived)
    })

    expect(mockRestore).toHaveBeenCalledWith('agent-1')
    expect(result.current.agents).toHaveLength(0)
  })

  it('restore propagates client errors so the caller can react', async () => {
    const archived = buildAgent()
    mockListAgents.mockResolvedValueOnce({ data: [archived], total: 1 })
    mockRestore.mockRejectedValueOnce(new Error('nope'))

    const { result } = renderHook(() => useArchivedWorkforceAgents({ accessToken: 't', enabled: true }))

    await waitFor(() => {
      expect(result.current.agents).toHaveLength(1)
    })

    await act(async () => {
      await expect(result.current.restore(archived)).rejects.toThrow(/nope/)
    })

    await waitFor(() => expect(result.current.error).toBe('nope'))
    // The agent stays in the list when restore fails - operator can retry.
    expect(result.current.agents).toHaveLength(1)
  })
})
