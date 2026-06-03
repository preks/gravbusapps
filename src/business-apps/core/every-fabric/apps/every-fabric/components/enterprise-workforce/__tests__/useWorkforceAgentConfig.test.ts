/** @jest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react'
import type { WorkforceAgent, WorkforceTrigger } from '../workforceTypes'

const mockGet = jest.fn()
const mockListTriggers = jest.fn()
const mockUpdate = jest.fn()
const mockCreateTrigger = jest.fn()
const mockUpdateTrigger = jest.fn()
const mockDeleteTrigger = jest.fn()

jest.mock('@/common/network/ai/prompt-manager/usePromptManagerClient', () => {
  const stable = {
    getWorkforceAgent: (...args: unknown[]) => mockGet(...args),
    listWorkforceTriggers: (...args: unknown[]) => mockListTriggers(...args),
    updateWorkforceAgent: (...args: unknown[]) => mockUpdate(...args),
    createWorkforceTrigger: (...args: unknown[]) => mockCreateTrigger(...args),
    updateWorkforceTrigger: (...args: unknown[]) => mockUpdateTrigger(...args),
    deleteWorkforceTrigger: (...args: unknown[]) => mockDeleteTrigger(...args)
  }
  return { usePromptManagerClient: () => stable }
})

import { useWorkforceAgentConfig } from '../useWorkforceAgentConfig'

function buildAgent(overrides: Partial<WorkforceAgent> = {}): WorkforceAgent {
  return {
    agent_id: 'a-1',
    name: 'helper',
    display_name: 'Helper',
    description: '',
    domain: '',
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
      instructions: ''
    },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides
  }
}

function buildTrigger(overrides: Partial<WorkforceTrigger> = {}): WorkforceTrigger {
  return {
    trigger_id: 't-1',
    agent_id: 'a-1',
    workspace_id: null,
    type: 'schedule',
    name: 'Nightly',
    enabled: true,
    config: { cron: '0 0 * * *' },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides
  }
}

beforeEach(() => {
  mockGet.mockReset()
  mockListTriggers.mockReset()
  mockUpdate.mockReset()
  mockCreateTrigger.mockReset()
  mockUpdateTrigger.mockReset()
  mockDeleteTrigger.mockReset()
})

describe('useWorkforceAgentConfig', () => {
  it('loads agent + triggers on mount', async () => {
    mockGet.mockResolvedValue(buildAgent())
    mockListTriggers.mockResolvedValue([buildTrigger()])

    const { result } = renderHook(() => useWorkforceAgentConfig({ accessToken: 't', agentId: 'a-1' }))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.agent?.agent_id).toBe('a-1')
    expect(result.current.triggers).toHaveLength(1)
    expect(result.current.error).toBeNull()
    expect(mockGet).toHaveBeenCalledWith('a-1')
    expect(mockListTriggers).toHaveBeenCalledWith('a-1')
  })

  it('clears state when agentId is null', async () => {
    const { result } = renderHook(() => useWorkforceAgentConfig({ accessToken: 't', agentId: null }))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.agent).toBeNull()
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('saveSection patches the agent and updates local state', async () => {
    mockGet.mockResolvedValue(buildAgent())
    mockListTriggers.mockResolvedValue([])
    const updated = buildAgent({ display_name: 'New Name' })
    mockUpdate.mockResolvedValue(updated)

    const { result } = renderHook(() => useWorkforceAgentConfig({ accessToken: 't', agentId: 'a-1' }))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.saveSection('identity', { display_name: 'New Name' })
    })

    expect(mockUpdate).toHaveBeenCalledWith('a-1', { display_name: 'New Name' })
    expect(result.current.agent?.display_name).toBe('New Name')
    expect(result.current.savingSection).toBeNull()
  })

  it('captures saveSection errors and rethrows', async () => {
    mockGet.mockResolvedValue(buildAgent())
    mockListTriggers.mockResolvedValue([])
    mockUpdate.mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useWorkforceAgentConfig({ accessToken: 't', agentId: 'a-1' }))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await expect(result.current.saveSection('identity', { display_name: 'X' })).rejects.toThrow('boom')
    })
    expect(result.current.error).toBe('boom')
  })

  it('creates, updates, and deletes triggers locally', async () => {
    mockGet.mockResolvedValue(buildAgent())
    mockListTriggers.mockResolvedValue([])
    const newTrigger = buildTrigger({ trigger_id: 't-new' })
    mockCreateTrigger.mockResolvedValue(newTrigger)
    mockUpdateTrigger.mockImplementation((id: string, patch: { enabled?: boolean }) =>
      Promise.resolve(buildTrigger({ trigger_id: id, enabled: patch.enabled ?? true }))
    )
    mockDeleteTrigger.mockResolvedValue(undefined)

    const { result } = renderHook(() => useWorkforceAgentConfig({ accessToken: 't', agentId: 'a-1' }))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.createTrigger({ type: 'schedule', config: { cron: '* * * * *' } })
    })
    expect(result.current.triggers).toHaveLength(1)
    expect(result.current.triggers[0].trigger_id).toBe('t-new')

    await act(async () => {
      await result.current.updateTrigger('t-new', { enabled: false })
    })
    expect(result.current.triggers[0].enabled).toBe(false)

    await act(async () => {
      await result.current.deleteTrigger('t-new')
    })
    expect(result.current.triggers).toHaveLength(0)
  })

  it('keeps the agent in place when the trigger list fails to load', async () => {
    mockGet.mockResolvedValue(buildAgent())
    mockListTriggers.mockRejectedValue(new Error('triggers down'))

    const { result } = renderHook(() => useWorkforceAgentConfig({ accessToken: 't', agentId: 'a-1' }))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.agent?.agent_id).toBe('a-1')
    expect(result.current.triggers).toEqual([])
    expect(result.current.error).toBeNull()
  })
})
