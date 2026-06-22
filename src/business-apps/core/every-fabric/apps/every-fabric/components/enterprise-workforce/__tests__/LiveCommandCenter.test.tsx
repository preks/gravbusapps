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
  it('renders the ribbon and a merged feed of active + finished runs', () => {
    const ov = overview()
    const feed = buildFeed(ov, new Set())
    render(
      <LiveCommandCenter
        feed={feed}
        overview={ov}
        completedToday={3}
        throughputBuckets={[0, 1, 0, 2]}
        isConnected
        nameById={{ 'a-1': 'Claims Bot', 'a-2': 'Billing Bot' }}
        onOpenRun={jest.fn()}
      />
    )

    expect(screen.getByTestId('workforce-command-center')).toBeInTheDocument()
    expect(screen.getByTestId('command-center-ribbon')).toHaveTextContent('command-center-done-today')
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
        overview={ov}
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

  it('stays visible with a calm idle state when there is no activity', () => {
    render(
      <LiveCommandCenter
        feed={[]}
        overview={{
          count: 0,
          status_counts: { running: 0, pending: 0, waiting_for_human: 0 },
          agents_working: [],
          by_agent: {},
          runs: [],
          recent_completed: []
        }}
        completedToday={0}
        throughputBuckets={[]}
        isConnected={false}
        nameById={{}}
        onOpenRun={jest.fn()}
      />
    )
    expect(screen.getByTestId('workforce-command-center')).toBeInTheDocument()
    expect(screen.getByTestId('command-center-ribbon')).toBeInTheDocument()
    expect(screen.getByTestId('command-center-feed-empty')).toBeInTheDocument()
  })
})
