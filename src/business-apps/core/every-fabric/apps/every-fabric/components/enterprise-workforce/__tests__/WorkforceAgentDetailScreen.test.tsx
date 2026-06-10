/** @jest-environment jsdom */
import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { WorkforceAgent, WorkforceTrigger } from '../workforceTypes'

const mockGetAgent = jest.fn()
const mockListTriggers = jest.fn()
const mockListRuns = jest.fn()
const mockGetSummary = jest.fn()
const mockGetRun = jest.fn()

jest.mock('@/common/network/ai/prompt-manager/usePromptManagerClient', () => {
  const stable = {
    getWorkforceAgent: (...a: unknown[]) => mockGetAgent(...a),
    listWorkforceTriggers: (...a: unknown[]) => mockListTriggers(...a),
    listWorkforceRuns: (...a: unknown[]) => mockListRuns(...a),
    getWorkforceAgentMetricsSummary: (...a: unknown[]) => mockGetSummary(...a),
    getWorkforceAgentMetrics: () =>
      Promise.resolve({
        agent_id: 'a-1',
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
        daily_buckets: []
      }),
    getWorkforceRun: (...a: unknown[]) => mockGetRun(...a),
    // Config tab policies: benign empty sets so useAgentPolicies resolves
    // without hitting the network.
    getAgentPolicies: () => Promise.resolve({ policies: [], excluded_policy_refs: [], supported: true }),
    getWorkspacePolicies: () => Promise.resolve({ workspace_id: null, workspace_name: null, policies: [] }),
    // Live activity sidebar: idle workforce snapshot so the SSE hook has a
    // benign initial state under jsdom.
    listActiveWorkforceRuns: () =>
      Promise.resolve({
        count: 0,
        status_counts: { running: 0, pending: 0, waiting_for_human: 0 },
        agents_working: [],
        by_agent: {},
        runs: []
      })
  }
  return { usePromptManagerClient: () => stable }
})

import { WorkforceAgentDetailScreen } from '../WorkforceAgentDetailScreen'

function buildAgent(overrides: Partial<WorkforceAgent> = {}): WorkforceAgent {
  return {
    agent_id: 'a-1',
    name: 'insurance_helper',
    display_name: 'Insurance Helper',
    description: 'Helps with claims',
    domain: 'Support',
    surfaces: ['workforce'],
    is_active: true,
    status: 'active',
    tags: ['insurance'],
    skill_ids: [],
    policy_refs: [],
    workforce_profile: {
      role: 'Claims specialist',
      department: 'Insurance',
      owner_user_id: 'alice',
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
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
    ...overrides
  }
}

const noopTab = jest.fn()
const noopRun = jest.fn()

describe('WorkforceAgentDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetAgent.mockResolvedValue(buildAgent())
    mockListTriggers.mockResolvedValue([] as WorkforceTrigger[])
    mockListRuns.mockResolvedValue({ data: [], total: 0 })
    mockGetSummary.mockResolvedValue({
      agent_id: 'a-1',
      today: {
        agent_id: 'a-1',
        window: 'day',
        from_date: '2026-05-30',
        to_date: '2026-05-30',
        totals: {
          runs: 1,
          completed_runs: 1,
          failed_runs: 0,
          cancelled_runs: 0,
          total_tokens: 1000,
          total_credits: 1,
          estimated_cost_usd: 0
        },
        daily_buckets: []
      },
      week: {
        agent_id: 'a-1',
        window: 'week',
        from_date: '2026-05-24',
        to_date: '2026-05-30',
        totals: {
          runs: 5,
          completed_runs: 5,
          failed_runs: 0,
          cancelled_runs: 0,
          total_tokens: 5000,
          total_credits: 5,
          estimated_cost_usd: 0
        },
        daily_buckets: []
      },
      month: {
        agent_id: 'a-1',
        window: 'month',
        from_date: '2026-05-01',
        to_date: '2026-05-30',
        totals: {
          runs: 20,
          completed_runs: 18,
          failed_runs: 1,
          cancelled_runs: 1,
          total_tokens: 20000,
          total_credits: 20,
          estimated_cost_usd: 0.4
        },
        daily_buckets: []
      },
      source_breakdown: {
        window: 'month',
        from_date: '2026-05-01',
        to_date: '2026-05-30',
        entries: [
          { source: 'manual', runs: 3, credits: 3, tokens: 3000 },
          { source: 'inbound_email', runs: 17, credits: 17, tokens: 17000 },
          { source: 'schedule', runs: 0, credits: 0, tokens: 0 },
          { source: 'webhook', runs: 0, credits: 0, tokens: 0 }
        ]
      }
    })
  })

  it('renders the tab strip and defaults to overview content', async () => {
    render(
      <WorkforceAgentDetailScreen
        accessToken="token"
        agentId="a-1"
        tab="overview"
        runId={null}
        onBack={jest.fn()}
        onChangeTab={noopTab}
        onSelectRun={noopRun}
      />
    )
    await waitFor(() => expect(screen.getByTestId('workforce-detail-title')).toHaveTextContent('Insurance Helper'))
    expect(screen.getByTestId('workforce-detail-tab-overview')).toBeInTheDocument()
    expect(await screen.findByTestId('workforce-overview-tab')).toBeInTheDocument()
  })

  it('renders the runs tab when tab=runs', async () => {
    render(
      <WorkforceAgentDetailScreen
        accessToken="token"
        agentId="a-1"
        tab="runs"
        runId={null}
        onBack={jest.fn()}
        onChangeTab={noopTab}
        onSelectRun={noopRun}
      />
    )
    expect(await screen.findByTestId('workforce-runs-tab')).toBeInTheDocument()
  })

  it('renders the inbox tab when tab=inbox', async () => {
    render(
      <WorkforceAgentDetailScreen
        accessToken="token"
        agentId="a-1"
        tab="inbox"
        runId={null}
        onBack={jest.fn()}
        onChangeTab={noopTab}
        onSelectRun={noopRun}
      />
    )
    expect(await screen.findByTestId('workforce-inbox-tab')).toBeInTheDocument()
  })

  it('renders the config tab when tab=config', async () => {
    render(
      <WorkforceAgentDetailScreen
        accessToken="token"
        agentId="a-1"
        tab="config"
        runId={null}
        onBack={jest.fn()}
        onChangeTab={noopTab}
        onSelectRun={noopRun}
      />
    )
    expect(await screen.findByTestId('workforce-config-tab')).toBeInTheDocument()
  })

  it('invokes onChangeTab when a tab button is clicked', async () => {
    const onChangeTab = jest.fn()
    render(
      <WorkforceAgentDetailScreen
        accessToken="token"
        agentId="a-1"
        tab="overview"
        runId={null}
        onBack={jest.fn()}
        onChangeTab={onChangeTab}
        onSelectRun={noopRun}
      />
    )
    fireEvent.click(screen.getByTestId('workforce-detail-tab-trace'))
    expect(onChangeTab).toHaveBeenCalledWith('trace')
  })

  it('shows the trace empty-state when tab=trace with no runId', async () => {
    render(
      <WorkforceAgentDetailScreen
        accessToken="token"
        agentId="a-1"
        tab="trace"
        runId={null}
        onBack={jest.fn()}
        onChangeTab={noopTab}
        onSelectRun={noopRun}
      />
    )
    expect(await screen.findByTestId('workforce-trace-tab-empty')).toBeInTheDocument()
  })
})
