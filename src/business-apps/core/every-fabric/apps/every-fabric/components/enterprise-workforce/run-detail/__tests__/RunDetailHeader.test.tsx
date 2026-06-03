/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import type { WorkforceRun } from '../../workforceTypes'
import { RunDetailHeader } from '../RunDetailHeader'

function buildRun(overrides: Partial<WorkforceRun> = {}): WorkforceRun {
  return {
    session_id: 'sess-abc123def',
    agent_id: 'agent-1',
    status: 'running',
    input: 'do work',
    source: 'inbound_email',
    started_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:05Z',
    metadata: { workforce: { trigger: { name: 'Support inbox' } } },
    ...overrides
  }
}

describe('RunDetailHeader', () => {
  it('shows the agent name, status and trigger source + name', () => {
    render(
      <RunDetailHeader
        run={buildRun()}
        agentName="Claims Bot"
        accessToken=""
        trace={[]}
        isStreaming
        isConnected
        isRefreshing={false}
        onBack={() => {}}
      />
    )
    expect(screen.getByTestId('run-detail-title')).toHaveTextContent('Claims Bot')
    expect(screen.getByTestId('run-detail-status')).toHaveTextContent('Running')
    expect(screen.getByText('Inbound email · Support inbox')).toBeInTheDocument()
  })

  it('surfaces linked context: the case entity (by name) and applied policies', () => {
    const run = buildRun({
      case_ref: {
        domain: 'crm',
        entity_type: 'contact',
        record_id: 'ct-1',
        record_labels: { 'ct-1': 'Maria Schmidt' }
      }
    })
    render(
      <RunDetailHeader
        run={run}
        agentName="Claims Bot"
        accessToken=""
        trace={[{ type: 'policy_applied', policy: { policy_id: 'refund-v2', title: 'Refund Policy' } }]}
        isStreaming={false}
        isConnected={false}
        isRefreshing={false}
        onBack={() => {}}
      />
    )
    const linked = screen.getByTestId('run-context-links')
    // Renders the resolved name, not the raw id.
    expect(linked).toHaveTextContent('Maria Schmidt')
    expect(linked).not.toHaveTextContent('ct-1')
    expect(linked).toHaveTextContent('Refund Policy')
  })

  it('no longer renders a standalone Case fact row', () => {
    const run = buildRun({
      case_ref: { domain: 'crm', entity_type: 'contact', record_id: 'ct-1' }
    })
    render(
      <RunDetailHeader
        run={run}
        agentName="Claims Bot"
        accessToken=""
        trace={[]}
        isStreaming={false}
        isConnected={false}
        isRefreshing={false}
        onBack={() => {}}
      />
    )
    expect(screen.queryByText('Case')).not.toBeInTheDocument()
  })

  it('fires onBack from the back button', () => {
    const onBack = jest.fn()
    render(
      <RunDetailHeader
        run={buildRun()}
        agentName="Claims Bot"
        accessToken=""
        trace={[]}
        isStreaming={false}
        isConnected={false}
        isRefreshing={false}
        onBack={onBack}
      />
    )
    fireEvent.click(screen.getByTestId('run-detail-back'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
