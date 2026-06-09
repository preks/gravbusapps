/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import type { WorkforceRun, WorkforceRunDomainAction } from '../../../workforceTypes'
import { ActionsRecordsTab } from '../ActionsRecordsTab'

function buildRun(actions: WorkforceRunDomainAction[]): WorkforceRun {
  return {
    session_id: 'sess-1',
    agent_id: 'agent-1',
    status: 'completed',
    input: 'in',
    output: 'out',
    cost_summary: { total_tokens: 0 },
    started_at: '2026-06-01T10:00:00Z',
    completed_at: '2026-06-01T10:00:10Z',
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-06-01T10:00:10Z',
    actions
  }
}

const flowAction: WorkforceRunDomainAction = {
  domain: 'flow',
  tool_ref: 'newwork_trigger_flow',
  action: 'flow',
  entity_type: 'workflow',
  record_ids: { workflow_id: 'wf-123', template_id: 'flow_abc' },
  record_labels: { 'wf-123': 'Insurance Claim Intake' },
  succeeded: true,
  timestamp: '2026-06-01T10:00:00Z',
  seq: 1
}

describe('ActionsRecordsTab', () => {
  it('renders an empty message when the run touched no records', () => {
    render(<ActionsRecordsTab run={buildRun([])} accessToken="" onOpenFlow={jest.fn()} />)
    expect(screen.getByTestId('actions-records-empty')).toBeInTheDocument()
  })

  it('invokes onOpenFlow when a flow row is opened', () => {
    const onOpenFlow = jest.fn()
    render(<ActionsRecordsTab run={buildRun([flowAction])} accessToken="" onOpenFlow={onOpenFlow} />)

    fireEvent.click(screen.getByTestId('entity-open-workflow'))
    expect(onOpenFlow).toHaveBeenCalledWith('wf-123')
  })
})
