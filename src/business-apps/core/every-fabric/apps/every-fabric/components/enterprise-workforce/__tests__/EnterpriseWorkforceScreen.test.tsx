/** @jest-environment jsdom */
import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { WorkforceAgent, WorkforceAgentPage } from '../workforceTypes'

const mockListWorkforceAgents = jest.fn()
const mockListWorkforceTriggers = jest.fn()
const mockListWorkforceRuns = jest.fn()
const mockActivate = jest.fn()
const mockPause = jest.fn()
const mockArchive = jest.fn()
const mockRestore = jest.fn()
const mockCreate = jest.fn()
const mockGetWorkforceAgent = jest.fn()
const mockUpdateWorkforceAgent = jest.fn()
const mockCreateWorkforceTrigger = jest.fn()
const mockUpdateWorkforceTrigger = jest.fn()
const mockDeleteWorkforceTrigger = jest.fn()
const mockGetWorkforceAgentMetricsSummary = jest.fn()
const mockGetWorkforceAgentMetrics = jest.fn()
const mockListActiveWorkforceRuns = jest.fn()
const mockGetWorkforceWorkspaceMetrics = jest.fn()

jest.mock('@/common/network/ai/prompt-manager/usePromptManagerClient', () => {
  const stableClient = {
    listWorkforceAgents: (...args: unknown[]) => mockListWorkforceAgents(...args),
    listWorkforceTriggers: (...args: unknown[]) => mockListWorkforceTriggers(...args),
    listWorkforceRuns: (...args: unknown[]) => mockListWorkforceRuns(...args),
    activateWorkforceAgent: (...args: unknown[]) => mockActivate(...args),
    pauseWorkforceAgent: (...args: unknown[]) => mockPause(...args),
    archiveWorkforceAgent: (...args: unknown[]) => mockArchive(...args),
    restoreWorkforceAgent: (...args: unknown[]) => mockRestore(...args),
    createWorkforceAgent: (...args: unknown[]) => mockCreate(...args),
    getWorkforceAgent: (...args: unknown[]) => mockGetWorkforceAgent(...args),
    updateWorkforceAgent: (...args: unknown[]) => mockUpdateWorkforceAgent(...args),
    createWorkforceTrigger: (...args: unknown[]) => mockCreateWorkforceTrigger(...args),
    updateWorkforceTrigger: (...args: unknown[]) => mockUpdateWorkforceTrigger(...args),
    deleteWorkforceTrigger: (...args: unknown[]) => mockDeleteWorkforceTrigger(...args),
    getWorkforceAgentMetricsSummary: (...args: unknown[]) => mockGetWorkforceAgentMetricsSummary(...args),
    getWorkforceAgentMetrics: (...args: unknown[]) => mockGetWorkforceAgentMetrics(...args),
    listActiveWorkforceRuns: (...args: unknown[]) => mockListActiveWorkforceRuns(...args),
    getWorkforceWorkspaceMetrics: (...args: unknown[]) => mockGetWorkforceWorkspaceMetrics(...args),
    // Config tab policies: benign empty sets so useAgentPolicies resolves
    // without hitting the network when the Config tab mounts.
    getAgentPolicies: () => Promise.resolve({ policies: [], excluded_policy_refs: [], supported: true }),
    getWorkspacePolicies: () => Promise.resolve({ workspace_id: null, workspace_name: null, policies: [] }),
    listMarketplacePackages: () => Promise.reject(new Error('offline'))
  }
  return {
    usePromptManagerClient: () => stableClient
  }
})

import { EnterpriseWorkforceScreen } from '../EnterpriseWorkforceScreen'

function buildAgent(id: string, displayName: string, overrides: Partial<WorkforceAgent> = {}): WorkforceAgent {
  return {
    agent_id: id,
    name: id,
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
      autonomy_level: 'approval_required',
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

beforeEach(() => {
  // Reset jsdom URL between tests — the detail screen pushes ?agentId=... on
  // navigation and that state would otherwise bleed into the next test and
  // force the screen into the detail view from the first render.
  if (typeof window !== 'undefined' && window.history?.replaceState) {
    window.history.replaceState({}, '', '/')
  }
  mockListWorkforceAgents.mockReset()
  mockListWorkforceTriggers.mockReset()
  mockListWorkforceRuns.mockReset()
  mockActivate.mockReset()
  mockPause.mockReset()
  mockArchive.mockReset()
  mockRestore.mockReset()
  mockCreate.mockReset()
  mockGetWorkforceAgent.mockReset()
  mockUpdateWorkforceAgent.mockReset()
  mockCreateWorkforceTrigger.mockReset()
  mockUpdateWorkforceTrigger.mockReset()
  mockDeleteWorkforceTrigger.mockReset()
  mockGetWorkforceAgentMetricsSummary.mockReset()
  mockGetWorkforceAgentMetrics.mockReset()
  mockListActiveWorkforceRuns.mockReset()
  mockGetWorkforceWorkspaceMetrics.mockReset()
  // Live activity + workspace insights: default to an idle workforce so the
  // overview hub renders without the live strip / per-agent charts.
  mockListActiveWorkforceRuns.mockResolvedValue({
    count: 0,
    status_counts: { running: 0, pending: 0, waiting_for_human: 0 },
    agents_working: [],
    by_agent: {},
    runs: [],
    recent_completed: []
  })
  mockGetWorkforceWorkspaceMetrics.mockResolvedValue({
    workspace_id: 'ws',
    window: 'week',
    from_date: '2026-05-26',
    to_date: '2026-06-01',
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
    runs_today: 0,
    business: {
      cases_handled: 0,
      measured_runs: 0,
      avg_duration_ms: 0,
      p50_duration_ms: 0,
      p90_duration_ms: 0,
      sla_target_ms: 0,
      under_sla_runs: 0,
      escalated_runs: 0,
      autonomous_runs: 0,
      guardrail_stops: 0,
      audited_runs: 0
    }
  })
  mockListWorkforceTriggers.mockResolvedValue([])
  mockListWorkforceRuns.mockResolvedValue({ data: [], total: 0 })
  mockGetWorkforceAgentMetricsSummary.mockResolvedValue({
    today: {
      window: 'today',
      runs_total: 0,
      runs_succeeded: 0,
      runs_failed: 0,
      runs_waiting_human: 0,
      success_rate: 0,
      hitl_rate: 0,
      p50_duration_ms: null,
      p95_duration_ms: null,
      credits_spent: 0,
      generated_at: '2026-01-01T00:00:00Z'
    },
    week: {
      window: 'week',
      runs_total: 0,
      runs_succeeded: 0,
      runs_failed: 0,
      runs_waiting_human: 0,
      success_rate: 0,
      hitl_rate: 0,
      p50_duration_ms: null,
      p95_duration_ms: null,
      credits_spent: 0,
      generated_at: '2026-01-01T00:00:00Z'
    },
    month: {
      window: 'month',
      runs_total: 0,
      runs_succeeded: 0,
      runs_failed: 0,
      runs_waiting_human: 0,
      success_rate: 0,
      hitl_rate: 0,
      p50_duration_ms: null,
      p95_duration_ms: null,
      credits_spent: 0,
      generated_at: '2026-01-01T00:00:00Z'
    },
    source_breakdown: { window: 'month', entries: [], generated_at: '2026-01-01T00:00:00Z' }
  })
  mockGetWorkforceAgentMetrics.mockResolvedValue({
    window: 'today',
    runs_total: 0,
    runs_succeeded: 0,
    runs_failed: 0,
    runs_waiting_human: 0,
    success_rate: 0,
    hitl_rate: 0,
    p50_duration_ms: null,
    p95_duration_ms: null,
    credits_spent: 0,
    generated_at: '2026-01-01T00:00:00Z'
  })
})

describe('EnterpriseWorkforceScreen', () => {
  it('renders KPIs and the workforce grid for active and paused agents', async () => {
    mockListWorkforceAgents.mockImplementation((params: { status?: string }) =>
      Promise.resolve(
        params?.status === 'paused'
          ? buildPage([buildAgent('p-1', 'Paused One', { status: 'paused', is_active: false })])
          : buildPage([buildAgent('a-1', 'Active One'), buildAgent('a-2', 'Active Two')])
      )
    )

    render(<EnterpriseWorkforceScreen accessToken="t" onBack={jest.fn()} />)

    await waitFor(() => expect(screen.queryByTestId('workforce-loading')).not.toBeInTheDocument())

    expect(screen.getByTestId('workforce-kpi-active')).toHaveTextContent('2')
    expect(screen.getByTestId('workforce-kpi-paused')).toHaveTextContent('1')
    expect(screen.getByTestId('workforce-deck')).toBeInTheDocument()
    expect(screen.getByTestId('workforce-agent-card-a-1')).toBeInTheDocument()
    expect(screen.getByTestId('workforce-agent-card-a-2')).toBeInTheDocument()
    expect(screen.getByTestId('workforce-agent-card-p-1')).toBeInTheDocument()
  })

  it('filters the grid to active agents when the Active filter is selected', async () => {
    mockListWorkforceAgents.mockImplementation((params: { status?: string }) =>
      Promise.resolve(
        params?.status === 'paused'
          ? buildPage([buildAgent('p-1', 'Paused', { status: 'paused', is_active: false })])
          : buildPage([buildAgent('a-1', 'Active')])
      )
    )

    render(<EnterpriseWorkforceScreen accessToken="t" onBack={jest.fn()} />)
    await waitFor(() => expect(screen.queryByTestId('workforce-loading')).not.toBeInTheDocument())

    fireEvent.click(screen.getByTestId('workforce-filter-active'))
    expect(screen.queryByTestId('workforce-agent-card-p-1')).not.toBeInTheDocument()
    expect(screen.getByTestId('workforce-agent-card-a-1')).toBeInTheDocument()
  })

  it('shows the empty state and CTA when no agents exist', async () => {
    mockListWorkforceAgents.mockResolvedValue(buildPage([]))

    render(<EnterpriseWorkforceScreen accessToken="t" onBack={jest.fn()} />)
    await waitFor(() => expect(screen.queryByTestId('workforce-loading')).not.toBeInTheDocument())

    expect(screen.getByTestId('workforce-empty')).toBeInTheDocument()
    expect(screen.getByTestId('workforce-empty-cta')).toBeInTheDocument()
  })

  it('opens the hire chooser from the hero CTA and routes to the create dialog', async () => {
    mockListWorkforceAgents.mockResolvedValue(buildPage([]))

    render(<EnterpriseWorkforceScreen accessToken="t" onBack={jest.fn()} />)
    await waitFor(() => expect(screen.queryByTestId('workforce-loading')).not.toBeInTheDocument())

    fireEvent.click(screen.getByTestId('workforce-hire-button'))
    expect(screen.getByTestId('hire-options-dialog')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('hire-options-create'))
    expect(screen.getByTestId('hire-workforce-agent-modal')).toBeInTheDocument()
  })

  it('opens the marketplace from the hire chooser and hires a template into a prefilled create dialog', async () => {
    mockListWorkforceAgents.mockResolvedValue(buildPage([]))

    render(<EnterpriseWorkforceScreen accessToken="t" onBack={jest.fn()} />)
    await waitFor(() => expect(screen.queryByTestId('workforce-loading')).not.toBeInTheDocument())

    fireEvent.click(screen.getByTestId('workforce-hire-button'))
    fireEvent.click(screen.getByTestId('hire-options-marketplace'))
    await waitFor(() => expect(screen.getByTestId('agent-marketplace-modal')).toBeInTheDocument())

    // Open a known template, then hire it.
    await waitFor(() => expect(screen.getByTestId('marketplace-card-recruiting-coordinator')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('marketplace-detail-hire'))

    // The create dialog opens prefilled with the template's role.
    expect(screen.getByTestId('hire-workforce-agent-modal')).toBeInTheDocument()
    expect(screen.getByTestId('hire-workforce-role')).toHaveValue('Recruiting Coordinator')
  })

  it('opens the agent detail screen when configure is clicked', async () => {
    const agent = buildAgent('a-1', 'Active One')
    mockListWorkforceAgents.mockImplementation((params: { status?: string }) =>
      Promise.resolve(params?.status === 'paused' ? buildPage([]) : buildPage([agent]))
    )
    mockGetWorkforceAgent.mockResolvedValue(agent)

    render(<EnterpriseWorkforceScreen accessToken="t" onBack={jest.fn()} />)
    await waitFor(() => expect(screen.queryByTestId('workforce-loading')).not.toBeInTheDocument())

    // Clicking anywhere on the deck card navigates into the detail screen
    // (the deck card is fully clickable).
    fireEvent.click(screen.getByTestId('workforce-agent-card-a-1'))

    await waitFor(() => expect(mockGetWorkforceAgent).toHaveBeenCalledWith('a-1'))
    expect(screen.getByTestId('workforce-detail-back')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('workforce-detail-title')).toHaveTextContent('Active One'))
    expect(screen.getByTestId('workforce-detail-tab-config')).toBeInTheDocument()

    // Switching to the Config tab should surface the identity section that
    // used to be visible by default in the old config view.
    fireEvent.click(screen.getByTestId('workforce-detail-tab-config'))
    await waitFor(() => expect(screen.getByTestId('workforce-config-section-identity')).toBeInTheDocument())
  })

  it('returns to the overview when the detail back button is clicked', async () => {
    const agent = buildAgent('a-1', 'Active One')
    mockListWorkforceAgents.mockImplementation((params: { status?: string }) =>
      Promise.resolve(params?.status === 'paused' ? buildPage([]) : buildPage([agent]))
    )
    mockGetWorkforceAgent.mockResolvedValue(agent)

    render(<EnterpriseWorkforceScreen accessToken="t" onBack={jest.fn()} />)
    await waitFor(() => expect(screen.queryByTestId('workforce-loading')).not.toBeInTheDocument())

    fireEvent.click(screen.getByTestId('workforce-agent-card-a-1'))
    await waitFor(() => expect(screen.getByTestId('workforce-detail-back')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('workforce-detail-back'))
    await waitFor(() => expect(screen.getByTestId('workforce-deck')).toBeInTheDocument())
  })

  describe('archive confirmation + restore flow', () => {
    function buildArchivedAgent(id: string, displayName: string): WorkforceAgent {
      return buildAgent(id, displayName, {
        status: 'archived',
        is_active: false,
        workforce_profile: {
          ...buildAgent(id, displayName).workforce_profile,
          archived_at: '2026-05-27T12:00:00Z',
          archived_by_user_id: 'alice'
        }
      })
    }

    it('opens the confirm modal on archive click but does not call the client yet', async () => {
      mockListWorkforceAgents.mockImplementation((params: { status?: string }) =>
        Promise.resolve(params?.status === 'paused' ? buildPage([]) : buildPage([buildAgent('a-1', 'Active One')]))
      )

      render(<EnterpriseWorkforceScreen accessToken="t" onBack={jest.fn()} />)
      await waitFor(() => expect(screen.queryByTestId('workforce-loading')).not.toBeInTheDocument())

      fireEvent.click(screen.getByTestId('workforce-agent-archive-a-1'))

      expect(screen.getByTestId('workforce-archive-confirm-modal')).toBeInTheDocument()
      expect(mockArchive).not.toHaveBeenCalled()
    })

    it('cancelling the modal closes it without archiving', async () => {
      mockListWorkforceAgents.mockImplementation((params: { status?: string }) =>
        Promise.resolve(params?.status === 'paused' ? buildPage([]) : buildPage([buildAgent('a-1', 'Active One')]))
      )

      render(<EnterpriseWorkforceScreen accessToken="t" onBack={jest.fn()} />)
      await waitFor(() => expect(screen.queryByTestId('workforce-loading')).not.toBeInTheDocument())

      fireEvent.click(screen.getByTestId('workforce-agent-archive-a-1'))
      fireEvent.click(screen.getByTestId('workforce-archive-confirm-cancel'))

      await waitFor(() => expect(screen.queryByTestId('workforce-archive-confirm-modal')).not.toBeInTheDocument())
      expect(mockArchive).not.toHaveBeenCalled()
    })

    it('confirming archive calls the client and removes the agent from the grid', async () => {
      const agent = buildAgent('a-1', 'Active One')
      mockListWorkforceAgents.mockImplementation((params: { status?: string }) =>
        Promise.resolve(params?.status === 'paused' ? buildPage([]) : buildPage([agent]))
      )
      mockArchive.mockResolvedValueOnce(buildArchivedAgent('a-1', 'Active One'))

      render(<EnterpriseWorkforceScreen accessToken="t" onBack={jest.fn()} />)
      await waitFor(() => expect(screen.queryByTestId('workforce-loading')).not.toBeInTheDocument())

      fireEvent.click(screen.getByTestId('workforce-agent-archive-a-1'))
      fireEvent.click(screen.getByTestId('workforce-archive-confirm-confirm'))

      await waitFor(() => expect(mockArchive).toHaveBeenCalledWith('a-1'))
      await waitFor(() => expect(screen.queryByTestId('workforce-agent-card-a-1')).not.toBeInTheDocument())
    })

    it('switching to Archived view fetches archived agents and lists them', async () => {
      const archived = buildArchivedAgent('a-1', 'Active One')
      mockListWorkforceAgents.mockImplementation((params: { status?: string }) => {
        if (params?.status === 'archived') return Promise.resolve(buildPage([archived]))
        return Promise.resolve(buildPage([]))
      })

      render(<EnterpriseWorkforceScreen accessToken="t" onBack={jest.fn()} />)
      await waitFor(() => expect(screen.queryByTestId('workforce-loading')).not.toBeInTheDocument())

      fireEvent.click(screen.getByTestId('workforce-view-archived'))

      await waitFor(() => expect(screen.getByTestId('workforce-archived-panel')).toBeInTheDocument())
      await waitFor(() => expect(screen.getByTestId('workforce-archived-row-a-1')).toBeInTheDocument())
      expect(mockListWorkforceAgents).toHaveBeenCalledWith({ status: 'archived', limit: 200 })
    })

    it('restoring an archived agent calls the client and removes it from the panel', async () => {
      const archived = buildArchivedAgent('a-1', 'Active One')
      const restored = buildAgent('a-1', 'Active One', { status: 'paused', is_active: false })
      mockListWorkforceAgents.mockImplementation((params: { status?: string }) => {
        if (params?.status === 'archived') return Promise.resolve(buildPage([archived]))
        return Promise.resolve(buildPage([]))
      })
      mockRestore.mockResolvedValueOnce(restored)

      render(<EnterpriseWorkforceScreen accessToken="t" onBack={jest.fn()} />)
      await waitFor(() => expect(screen.queryByTestId('workforce-loading')).not.toBeInTheDocument())

      fireEvent.click(screen.getByTestId('workforce-view-archived'))
      await waitFor(() => expect(screen.getByTestId('workforce-archived-row-a-1')).toBeInTheDocument())

      fireEvent.click(screen.getByTestId('workforce-archived-restore-a-1'))

      await waitFor(() => expect(mockRestore).toHaveBeenCalledWith('a-1'))
      await waitFor(() => expect(screen.queryByTestId('workforce-archived-row-a-1')).not.toBeInTheDocument())
    })
  })
})
