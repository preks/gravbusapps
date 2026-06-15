import type { WorkforceRunTraceEvent } from '../../workforceTypes'
import { mergeDomainActions, resolveFlowActionsFromTrace } from '../flowTraceActions'

const ACTION_CARD_OUTPUT = JSON.stringify({
  ui: { kind: 'action_card', version: 1 },
  card: {
    title: 'flow_enpal_quote_validation_resolution',
    status: { code: 'RUNNING', label: 'In progress', variant: 'running' },
    primaryAction: { label: 'Open', href: '/flows/wf-enpal-1' },
    entity: { type: 'service_workflow', id: 'wf-enpal-1' },
    pollStatus: true
  },
  refs: { template_id: 'flow_enpal_quote_validation_resolution' }
})

describe('resolveFlowActionsFromTrace', () => {
  it('extracts a flow action from newwork_trigger_flow step_completed output', () => {
    const trace: WorkforceRunTraceEvent[] = [
      {
        seq: 3,
        type: 'step_completed',
        tool_name: 'newwork_trigger_flow',
        output: ACTION_CARD_OUTPUT,
        timestamp: '2026-06-12T19:06:26Z'
      }
    ]

    const actions = resolveFlowActionsFromTrace(trace)
    expect(actions).toHaveLength(1)
    expect(actions[0].domain).toBe('flow')
    expect(actions[0].record_ids.workflow_id).toBe('wf-enpal-1')
    expect(actions[0].record_ids.template_id).toBe('flow_enpal_quote_validation_resolution')
    expect(actions[0].record_labels?.['wf-enpal-1']).toBe('flow_enpal_quote_validation_resolution')
  })

  it('ignores unrelated trace events', () => {
    expect(
      resolveFlowActionsFromTrace([
        { seq: 1, type: 'step_started', tool_name: 'newwork_trigger_flow' },
        { seq: 2, type: 'step_completed', tool_name: 'web_search', output: '{}' }
      ])
    ).toEqual([])
  })
})

describe('mergeDomainActions', () => {
  it('appends trace-only flow rows without duplicating REST actions', () => {
    const fromRun = [
      {
        domain: 'flow',
        tool_ref: 'newwork_trigger_flow',
        action: 'flow',
        record_ids: { workflow_id: 'wf-rest' },
        record_labels: { 'wf-rest': 'From REST' },
        succeeded: true
      }
    ]
    const fromTrace = [
      {
        domain: 'flow',
        tool_ref: 'newwork_trigger_flow',
        action: 'flow',
        record_ids: { workflow_id: 'wf-trace' },
        record_labels: { 'wf-trace': 'From trace' },
        succeeded: true,
        seq: 2
      }
    ]

    const merged = mergeDomainActions(fromRun, fromTrace)
    expect(merged).toHaveLength(2)
    expect(merged.map(action => action.record_ids.workflow_id)).toEqual(['wf-rest', 'wf-trace'])
  })
})
