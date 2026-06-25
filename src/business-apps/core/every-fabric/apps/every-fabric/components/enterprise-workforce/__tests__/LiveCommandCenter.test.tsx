/** @jest-environment jsdom */
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { LiveCommandCenter } from '../command-center/LiveCommandCenter'
import { buildFeed } from '../workforceFeedModel'
import type { WorkforceActiveOverview } from '../workforceTypes'

function overview(): WorkforceActiveOverview {
  return {
    count: 1,
    status_counts: { running: 1, pending: 0, waiting_for_human: 1 },
    agents_working: ['a-1'],
    by_agent: { 'a-1': 1 },
    runs: [
      {
        session_id: 's-active',
        agent_id: 'a-1',
        display_name: 'Claims Bot',
        status: 'running',
        source: 'inbound_email',
        trigger: { type: 'inbound_email', name: 'Support inbox', trigger_id: 't1' },
        input: 'handle claim',
        current_activity: 'Searching CRM',
        last_seq: 1,
        started_at: '2026-06-01T12:00:00Z'
      }
    ],
    recent_completed: [
      {
        session_id: 's-done',
        agent_id: 'a-2',
        display_name: 'Billing Bot',
        status: 'completed',
        source: 'schedule',
        credits: 7,
        started_at: '2026-06-01T11:58:00Z',
        completed_at: '2026-06-01T11:59:00Z',
        duration_ms: 60000,
        case_ref: { domain: 'crm', entity_type: 'Account', record_id: 'ACC-9' }
      }
    ]
  }
}

describe('LiveCommandCenter', () => {
  it('renders the unified bar and a merged feed of active + finished runs', () => {
    const ov = overview()
    const feed = buildFeed(ov, new Set())
    render(
      <LiveCommandCenter
        feed={feed}
        completedToday={3}
        throughputBuckets={[0, 1, 0, 2]}
        isConnected
        nameById={{ 'a-1': 'Claims Bot', 'a-2': 'Billing Bot' }}
        onOpenRun={jest.fn()}
      />
    )

    expect(screen.getByTestId('workforce-command-center')).toBeInTheDocument()
    expect(screen.getByTestId('command-center-bar')).toHaveTextContent('command-center-done-today')
    expect(screen.getByTestId('command-center-item-s-active')).toHaveTextContent('Searching CRM')
    expect(screen.getByTestId('command-center-item-s-done')).toHaveTextContent('Account ACC-9')
  })

  it('navigates to the agent when a feed item is clicked', () => {
    const ov = overview()
    const feed = buildFeed(ov, new Set())
    const onOpen = jest.fn()
    render(
      <LiveCommandCenter
        feed={feed}
        completedToday={0}
        throughputBuckets={[]}
        isConnected
        nameById={{}}
        onOpenRun={onOpen}
      />
    )

    fireEvent.click(screen.getByTestId('command-center-item-s-active'))
    expect(onOpen).toHaveBeenCalledWith('a-1', 's-active')
  })

  it('groups runs into sections and shows matching bar counts', () => {
    const ov: WorkforceActiveOverview = {
      count: 2,
      status_counts: { running: 1, pending: 0, waiting_for_human: 1 },
      agents_working: ['a-1'],
      by_agent: { 'a-1': 2 },
      runs: [
        {
          session_id: 's-wait',
          agent_id: 'a-1',
          status: 'waiting_for_human',
          input: 'approve draft',
          current_activity: 'Awaiting approval',
          last_seq: 1,
          started_at: '2026-06-01T12:02:00Z'
        },
        {
          session_id: 's-active',
          agent_id: 'a-1',
          status: 'running',
          input: 'work',
          current_activity: 'Searching CRM',
          last_seq: 1,
          started_at: '2026-06-01T12:01:00Z'
        }
      ],
      recent_completed: [
        {
          session_id: 's-done',
          agent_id: 'a-2',
          status: 'completed',
          credits: 1,
          started_at: '2026-06-01T11:58:00Z',
          completed_at: '2026-06-01T11:59:00Z',
          duration_ms: 60000
        }
      ]
    }
    render(
      <LiveCommandCenter
        feed={buildFeed(ov, new Set())}
        completedToday={0}
        throughputBuckets={[]}
        isConnected
        nameById={{}}
        onOpenRun={jest.fn()}
      />
    )

    // The three sections each hold their one run (testids are stable; labels
    // come from i18n which is mocked in jest, so we assert on ids + counts).
    expect(screen.getByTestId('command-center-section-list-needsYou').children).toHaveLength(1)
    expect(screen.getByTestId('command-center-section-list-active').children).toHaveLength(1)
    expect(screen.getByTestId('command-center-section-list-recentlyDone').children).toHaveLength(1)
    expect(screen.getByTestId('command-center-item-s-wait')).toBeInTheDocument()
    expect(screen.getByTestId('command-center-item-s-active')).toBeInTheDocument()
    expect(screen.getByTestId('command-center-item-s-done')).toBeInTheDocument()
    // Every jump pill is enabled because every section has at least one item.
    expect(screen.getByTestId('command-center-jump-needsYou')).toBeEnabled()
    expect(screen.getByTestId('command-center-jump-active')).toBeEnabled()
    expect(screen.getByTestId('command-center-jump-recentlyDone')).toBeEnabled()
  })

  it('keeps Needs you always expanded (no collapse) and caps Active behind Show more', () => {
    const runs = Array.from({ length: 5 }, (_, index) => ({
      session_id: `s-active-${index}`,
      agent_id: 'a-1',
      status: 'running' as const,
      input: 'work',
      current_activity: 'Working',
      last_seq: 1,
      started_at: `2026-06-01T12:0${index}:00Z`
    }))
    const ov: WorkforceActiveOverview = {
      count: 5,
      status_counts: { running: 5, pending: 0, waiting_for_human: 1 },
      agents_working: ['a-1'],
      by_agent: { 'a-1': 6 },
      runs: [
        {
          session_id: 's-wait',
          agent_id: 'a-1',
          status: 'waiting_for_human',
          input: 'approve',
          current_activity: 'Awaiting approval',
          last_seq: 1,
          started_at: '2026-06-01T12:09:00Z'
        },
        ...runs
      ],
      recent_completed: []
    }
    render(
      <LiveCommandCenter
        feed={buildFeed(ov, new Set())}
        completedToday={0}
        throughputBuckets={[]}
        isConnected
        nameById={{}}
        onOpenRun={jest.fn()}
      />
    )

    // Needs you toggle is disabled: action items are never hidden.
    expect(screen.getByTestId('command-center-section-toggle-needsYou')).toBeDisabled()

    // buildFeed sorts newest-first, so the 3 newest active runs (4, 3, 2) show
    // and the 2 oldest (1, 0) are hidden behind "Show 2 more".
    expect(screen.getByTestId('command-center-item-s-active-4')).toBeInTheDocument()
    expect(screen.getByTestId('command-center-item-s-active-2')).toBeInTheDocument()
    expect(screen.queryByTestId('command-center-item-s-active-0')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('command-center-section-more-active'))
    expect(screen.getByTestId('command-center-item-s-active-0')).toBeInTheDocument()
  })

  it('caps Needs you at 6 cards behind Show more but reports the full count', () => {
    const waiting = Array.from({ length: 8 }, (_, index) => ({
      session_id: `s-wait-${index}`,
      agent_id: 'a-1',
      status: 'waiting_for_human' as const,
      input: 'approve',
      current_activity: 'Awaiting approval',
      last_seq: 1,
      started_at: `2026-06-01T12:0${index}:00Z`
    }))
    const ov: WorkforceActiveOverview = {
      count: 8,
      status_counts: { running: 0, pending: 0, waiting_for_human: 8 },
      agents_working: ['a-1'],
      by_agent: { 'a-1': 8 },
      runs: waiting,
      recent_completed: []
    }
    render(
      <LiveCommandCenter
        feed={buildFeed(ov, new Set())}
        completedToday={0}
        throughputBuckets={[]}
        isConnected
        nameById={{}}
        onOpenRun={jest.fn()}
      />
    )

    // All 8 are grouped (no global cap), 6 shown, 2 behind "Show more".
    expect(screen.getByTestId('command-center-section-list-needsYou').children).toHaveLength(6)
    expect(screen.getByTestId('command-center-section-more-needsYou')).toBeInTheDocument()
    // Non-collapsible: the header can never hide the action items.
    expect(screen.getByTestId('command-center-section-toggle-needsYou')).toBeDisabled()

    fireEvent.click(screen.getByTestId('command-center-section-more-needsYou'))
    expect(screen.getByTestId('command-center-section-list-needsYou').children).toHaveLength(8)
  })

  it('collapses a section when its header toggle is clicked', () => {
    const ov: WorkforceActiveOverview = {
      count: 0,
      status_counts: { running: 0, pending: 0, waiting_for_human: 0 },
      agents_working: [],
      by_agent: {},
      runs: [],
      recent_completed: [
        {
          session_id: 's-done',
          agent_id: 'a-2',
          status: 'completed',
          credits: 1,
          started_at: '2026-06-01T11:58:00Z',
          completed_at: '2026-06-01T11:59:00Z',
          duration_ms: 60000
        }
      ]
    }
    render(
      <LiveCommandCenter
        feed={buildFeed(ov, new Set())}
        completedToday={0}
        throughputBuckets={[]}
        isConnected
        nameById={{}}
        onOpenRun={jest.fn()}
      />
    )

    expect(screen.getByTestId('command-center-item-s-done')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('command-center-section-toggle-recentlyDone'))
    expect(screen.queryByTestId('command-center-item-s-done')).not.toBeInTheDocument()
  })

  it('stays visible with a calm idle state when there is no activity', () => {
    render(
      <LiveCommandCenter
        feed={[]}
        completedToday={0}
        throughputBuckets={[]}
        isConnected={false}
        nameById={{}}
        onOpenRun={jest.fn()}
      />
    )
    expect(screen.getByTestId('workforce-command-center')).toBeInTheDocument()
    // The unified bar (with the live pill + throughput) stays visible when idle.
    expect(screen.getByTestId('command-center-bar')).toBeInTheDocument()
    expect(screen.getByTestId('command-center-feed-empty')).toBeInTheDocument()
  })
})
