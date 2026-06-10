/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import type { WorkforceRun, WorkforceRunDomainAction } from '../../../workforceTypes'
import { FlowsTab } from '../FlowsTab'

// Stub the heavy shared Gantt so the FlowsTab wiring (toggle + onFlowClick ->
// back to list) can be asserted without depending on the timeline internals.
jest.mock('@/business-apps/common/apps/case-management/components/FlowGanttChart', () => ({
  FlowGanttChart: ({ flows, onFlowClick }: any) => (
    <div data-testid="gantt-stub">
      {flows.map((flow: any) => (
        <button key={flow.workflowId} data-testid="gantt-bar" onClick={() => onFlowClick?.(flow)}>
          {flow.workflowName}
        </button>
      ))}
    </div>
  )
}))

function flowAction(workflowId: string, name: string, seq: number): WorkforceRunDomainAction {
  return {
    domain: 'flow',
    tool_ref: 'newwork_trigger_flow',
    action: 'flow',
    entity_type: 'workflow',
    record_ids: { workflow_id: workflowId, template_id: 'flow_abc' },
    record_labels: { [workflowId]: name },
    succeeded: true,
    timestamp: '2026-06-01T10:00:00Z',
    seq
  }
}

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

describe('FlowsTab', () => {
  it('renders an empty message when the run triggered no workflows', () => {
    render(<FlowsTab run={buildRun([])} accessToken="" selectedFlowId={null} onSelectFlow={jest.fn()} />)
    expect(screen.getByTestId('flows-tab-empty')).toBeInTheDocument()
  })

  it('lists flows and renders the first one in the detail panel by default', () => {
    const run = buildRun([flowAction('wf-1', 'Flow A', 1), flowAction('wf-2', 'Flow B', 2)])
    render(<FlowsTab run={run} accessToken="" selectedFlowId={null} onSelectFlow={jest.fn()} />)

    expect(screen.getAllByTestId('flow-list-item')).toHaveLength(2)
    expect(screen.getByTestId('flow-detail-link')).toHaveTextContent('Flow A')
  })

  it('selects the flow given by selectedFlowId', () => {
    const run = buildRun([flowAction('wf-1', 'Flow A', 1), flowAction('wf-2', 'Flow B', 2)])
    render(<FlowsTab run={run} accessToken="" selectedFlowId="wf-2" onSelectFlow={jest.fn()} />)
    expect(screen.getByTestId('flow-detail-link')).toHaveTextContent('Flow B')
  })

  it('calls onSelectFlow when a list item is clicked', () => {
    const onSelectFlow = jest.fn()
    const run = buildRun([flowAction('wf-1', 'Flow A', 1), flowAction('wf-2', 'Flow B', 2)])
    render(<FlowsTab run={run} accessToken="" selectedFlowId={null} onSelectFlow={onSelectFlow} />)

    fireEvent.click(screen.getAllByTestId('flow-list-item')[1])
    expect(onSelectFlow).toHaveBeenCalledWith('wf-2')
  })

  it('switches to the timeline view and renders the Gantt with the flows', () => {
    const run = buildRun([flowAction('wf-1', 'Flow A', 1), flowAction('wf-2', 'Flow B', 2)])
    render(<FlowsTab run={run} accessToken="" selectedFlowId={null} onSelectFlow={jest.fn()} />)

    fireEvent.click(screen.getByTestId('flows-view-timeline'))

    expect(screen.getByTestId('flows-timeline')).toBeInTheDocument()
    expect(screen.getAllByTestId('gantt-bar')).toHaveLength(2)
    // The list+detail layout is hidden in timeline mode.
    expect(screen.queryByTestId('flows-tab-list')).not.toBeInTheDocument()
  })

  it('clicking a Gantt bar selects the flow and returns to the list view', () => {
    const onSelectFlow = jest.fn()
    const run = buildRun([flowAction('wf-1', 'Flow A', 1), flowAction('wf-2', 'Flow B', 2)])
    render(<FlowsTab run={run} accessToken="" selectedFlowId={null} onSelectFlow={onSelectFlow} />)

    fireEvent.click(screen.getByTestId('flows-view-timeline'))
    fireEvent.click(screen.getAllByTestId('gantt-bar')[1])

    expect(onSelectFlow).toHaveBeenCalledWith('wf-2')
    expect(screen.getByTestId('flows-tab-list')).toBeInTheDocument()
  })
})
