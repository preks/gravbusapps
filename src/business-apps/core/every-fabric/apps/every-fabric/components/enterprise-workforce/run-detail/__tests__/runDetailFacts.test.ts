import type { WorkforceRun } from '../../workforceTypes'
import {
  extractDraftBody,
  extractDraftSubject,
  formatBytes,
  resolveAgentName,
  resolveDomainActions,
  resolveSource,
  resolveTriggerName
} from '../runDetailFacts'

function buildRun(overrides: Partial<WorkforceRun> = {}): WorkforceRun {
  return {
    session_id: 'sess-1',
    agent_id: 'agent-123456789',
    status: 'completed',
    input: 'do work',
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:10Z',
    ...overrides
  }
}

describe('resolveAgentName', () => {
  it('prefers the workforce metadata display name', () => {
    const run = buildRun({ metadata: { workforce: { agent_display_name: 'Claims Bot' } } })
    expect(resolveAgentName(run, {})).toBe('Claims Bot')
  })

  it('falls back to nameById then the short agent id', () => {
    expect(resolveAgentName(buildRun(), { 'agent-123456789': 'Billing Bot' })).toBe('Billing Bot')
    expect(resolveAgentName(buildRun(), {})).toBe('agent-12')
  })
})

describe('resolveSource', () => {
  it('uses the convenience field, then metadata', () => {
    expect(resolveSource(buildRun({ source: 'inbound_email' }))).toBe('inbound_email')
    expect(resolveSource(buildRun({ metadata: { workforce: { source: 'schedule' } } }))).toBe('schedule')
    expect(resolveSource(buildRun())).toBeNull()
  })
})

describe('resolveTriggerName', () => {
  it('reads the trigger summary name first', () => {
    const run = buildRun({ metadata: { workforce: { trigger: { name: 'Support inbox' } } } })
    expect(resolveTriggerName(run)).toBe('Support inbox')
  })

  it('falls back to the inbound payload subject', () => {
    const run = buildRun({ trigger_payload: { subject: 'Re: claim NW-1' } })
    expect(resolveTriggerName(run)).toBe('Re: claim NW-1')
  })

  it('returns null when nothing is present', () => {
    expect(resolveTriggerName(buildRun())).toBeNull()
  })
})

describe('extractDraft*', () => {
  it('probes known body keys in priority order', () => {
    expect(extractDraftBody({ reply: 'Hi there' })).toBe('Hi there')
    expect(extractDraftBody({ nope: 'x' })).toBeNull()
    expect(extractDraftSubject({ subject: 'Hello' })).toBe('Hello')
    expect(extractDraftSubject(null)).toBeNull()
  })
})

describe('resolveDomainActions', () => {
  it('prefers domain actions and tags legacy crm actions', () => {
    const withDomain = buildRun({
      actions: [{ tool_ref: 't', action: 'create', record_ids: {}, succeeded: true, domain: 'hr' }]
    })
    expect(resolveDomainActions(withDomain)[0].domain).toBe('hr')

    const legacy = buildRun({ crm_actions: [{ tool_ref: 't', action: 'search', record_ids: {}, succeeded: true }] })
    expect(resolveDomainActions(legacy)[0].domain).toBe('crm')
  })

  it('merges flow actions from trace when REST actions are empty', () => {
    const trace = [
      {
        seq: 1,
        type: 'step_completed',
        tool_name: 'newwork_trigger_flow',
        output: JSON.stringify({
          ui: { kind: 'action_card', version: 1 },
          card: {
            title: 'flow_test',
            status: { code: 'RUNNING', label: 'In progress', variant: 'running' },
            primaryAction: { label: 'Open', href: '/flows/wf-trace' },
            entity: { type: 'service_workflow', id: 'wf-trace' }
          },
          refs: { template_id: 'flow_test' }
        })
      }
    ]
    const actions = resolveDomainActions(buildRun(), trace)
    expect(actions).toHaveLength(1)
    expect(actions[0].domain).toBe('flow')
    expect(actions[0].record_ids.workflow_id).toBe('wf-trace')
  })
})

describe('formatBytes', () => {
  it('formats bytes, KB and MB', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(formatBytes(1_500_000)).toBe('1.4 MB')
  })
})
