/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { RecentRunsPanel } from '../RecentRunsPanel'
import type { WorkforceRun } from '../workforceTypes'

function buildRun(overrides: Partial<WorkforceRun> = {}): WorkforceRun {
  return {
    session_id: 'sess-1',
    agent_id: 'agent-1',
    workforce_trigger_id: null,
    status: 'completed',
    input: 'Triage the unassigned policy questions',
    output: 'Done.',
    cost_summary: { total_tokens: 3500 },
    pending_human_question: null,
    workspace_id: 'ws',
    user_id: 'alice',
    started_at: '2026-01-01T00:00:00Z',
    completed_at: '2026-01-01T00:00:20Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:20Z',
    ...overrides
  }
}

describe('RecentRunsPanel', () => {
  it('renders an empty state when there are no runs', () => {
    render(
      <RecentRunsPanel
        runs={[]}
        isLoading={false}
        isPolling={false}
        onRefresh={() => {}}
        onTestRun={() => {}}
        onOpenRun={() => {}}
      />
    )
    expect(screen.getByText(/No runs yet/i)).toBeInTheDocument()
  })

  it('renders the loading state while the first fetch is in flight', () => {
    render(
      <RecentRunsPanel
        runs={[]}
        isLoading
        isPolling={false}
        onRefresh={() => {}}
        onTestRun={() => {}}
        onOpenRun={() => {}}
      />
    )
    expect(screen.getByText(/Loading runs/i)).toBeInTheDocument()
  })

  it('lists runs and forwards a click to onOpenRun', () => {
    const run = buildRun()
    const onOpenRun = jest.fn()
    render(
      <RecentRunsPanel
        runs={[run]}
        isLoading={false}
        isPolling={false}
        onRefresh={() => {}}
        onTestRun={() => {}}
        onOpenRun={onOpenRun}
      />
    )
    fireEvent.click(screen.getByTestId(`workforce-run-row-${run.session_id}`))
    expect(onOpenRun).toHaveBeenCalledWith(run)
    // 3500 tokens rounds up to 4 credits via tokensToCredits.
    expect(screen.getByText('4 credits')).toBeInTheDocument()
    expect(screen.getByText(/Triage the unassigned/i)).toBeInTheDocument()
  })

  it('fires onTestRun and onRefresh from the header buttons', () => {
    const onTestRun = jest.fn()
    const onRefresh = jest.fn()
    render(
      <RecentRunsPanel
        runs={[]}
        isLoading={false}
        isPolling={false}
        onRefresh={onRefresh}
        onTestRun={onTestRun}
        onOpenRun={() => {}}
      />
    )
    fireEvent.click(screen.getByTestId('workforce-recent-runs-test'))
    fireEvent.click(screen.getByTestId('workforce-recent-runs-refresh'))
    expect(onTestRun).toHaveBeenCalledTimes(1)
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('shows an inline error when provided', () => {
    render(
      <RecentRunsPanel
        runs={[]}
        isLoading={false}
        isPolling={false}
        errorMessage="boom"
        onRefresh={() => {}}
        onTestRun={() => {}}
        onOpenRun={() => {}}
      />
    )
    expect(screen.getByTestId('workforce-recent-runs-error')).toHaveTextContent('boom')
  })
})
