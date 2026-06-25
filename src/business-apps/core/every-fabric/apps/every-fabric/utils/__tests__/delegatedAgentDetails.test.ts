import type { AgentStreamEvent } from '../../types/enterpriseAgent'
import { buildDelegatedAgentDetails, humanizeDelegatedOutput } from '../delegatedAgentDetails'

let seqCounter = 0
const nextSeq = () => (seqCounter += 1)

const expertCalled = (stepId: string, overrides: Partial<AgentStreamEvent> = {}): AgentStreamEvent => {
  const seq = nextSeq()
  return {
    type: 'expert_called',
    seq,
    event_id: `e-${seq}`,
    step_id: stepId,
    expert_name: 'Customer 360 Analyst',
    task_summary: 'Summarise the account health for Acme Corp.',
    agent_description: 'Specialist in customer account analytics.',
    timestamp: `2026-06-22T10:00:0${seq}.000Z`,
    ...overrides
  } as AgentStreamEvent
}

const expertCompleted = (stepId: string, overrides: Partial<AgentStreamEvent> = {}): AgentStreamEvent => {
  const seq = nextSeq()
  return {
    type: 'expert_completed',
    seq,
    event_id: `e-${seq}`,
    step_id: stepId,
    expert_name: 'Customer 360 Analyst',
    status: 'done',
    output: 'Account is healthy; renewal risk is low.',
    duration_ms: 4200,
    timestamp: `2026-06-22T10:00:1${seq}.000Z`,
    ...overrides
  } as AgentStreamEvent
}

const subagentSpawned = (stepId: string, overrides: Partial<AgentStreamEvent> = {}): AgentStreamEvent => {
  const seq = nextSeq()
  return {
    type: 'subagent_spawned',
    seq,
    event_id: `e-${seq}`,
    step_id: stepId,
    agent_name: 'Research Sub-agent',
    task_summary: 'Research competitor pricing.',
    timestamp: `2026-06-22T10:00:2${seq}.000Z`,
    ...overrides
  } as AgentStreamEvent
}

beforeEach(() => {
  seqCounter = 0
})

describe('buildDelegatedAgentDetails', () => {
  it('builds a completed detail for a single delegated expert', () => {
    const details = buildDelegatedAgentDetails([expertCalled('step-1'), expertCompleted('step-1')])

    expect(details.size).toBe(1)
    const detail = details.get('step-1')
    expect(detail).toBeDefined()
    expect(detail?.source).toBe('expert')
    expect(detail?.agentName).toBe('Customer 360 Analyst')
    expect(detail?.task).toBe('Summarise the account health for Acme Corp.')
    expect(detail?.description).toBe('Specialist in customer account analytics.')
    expect(detail?.status).toBe('done')
    expect(detail?.durationMs).toBe(4200)
    expect(detail?.output).toBe('Account is healthy; renewal risk is low.')
  })

  it('marks a delegation without a completion as running', () => {
    const details = buildDelegatedAgentDetails([expertCalled('step-1')])
    expect(details.get('step-1')?.status).toBe('running')
    expect(details.get('step-1')?.output).toBeUndefined()
  })

  it('marks a failed completion as failed', () => {
    const details = buildDelegatedAgentDetails([
      expertCalled('step-1'),
      expertCompleted('step-1', { status: 'failed', output: 'Expert timed out.' })
    ])
    const detail = details.get('step-1')
    expect(detail?.status).toBe('failed')
    expect(detail?.output).toBe('Expert timed out.')
  })

  it('builds one detail per agent for parallel experts (multiple delegations)', () => {
    const details = buildDelegatedAgentDetails([
      expertCalled('p:0', { expert_name: 'Finance Expert', task_summary: 'Pull Q2 spend.' }),
      expertCalled('p:1', { expert_name: 'HR Expert', task_summary: 'Pull headcount.' }),
      expertCompleted('p:0', { expert_name: 'Finance Expert', status: 'done', output: 'Q2 spend is on plan.' }),
      expertCompleted('p:1', { expert_name: 'HR Expert', status: 'failed', output: 'No access to HRIS.' })
    ])

    expect(details.size).toBe(2)
    expect(details.get('p:0')?.agentName).toBe('Finance Expert')
    expect(details.get('p:0')?.status).toBe('done')
    expect(details.get('p:1')?.agentName).toBe('HR Expert')
    expect(details.get('p:1')?.status).toBe('failed')
  })

  it('supports spawned sub-agents alongside experts', () => {
    const details = buildDelegatedAgentDetails([
      expertCalled('step-1'),
      expertCompleted('step-1'),
      subagentSpawned('step-2')
    ])
    expect(details.get('step-1')?.source).toBe('expert')
    expect(details.get('step-2')?.source).toBe('subagent')
    expect(details.get('step-2')?.status).toBe('running')
  })

  it('attributes child tool calls to their parent delegation via parent_step_id', () => {
    const toolStarted = {
      type: 'step_started',
      seq: nextSeq(),
      event_id: 'tool-start',
      step_id: 'tool-1',
      name: 'function_search_crm_entity',
      parent_step_id: 'step-1',
      timestamp: '2026-06-22T10:00:05.000Z'
    } as unknown as AgentStreamEvent
    const toolCompleted = {
      type: 'step_completed',
      seq: nextSeq(),
      event_id: 'tool-end',
      step_id: 'tool-1',
      status: 'done',
      duration_ms: 900,
      timestamp: '2026-06-22T10:00:06.000Z'
    } as unknown as AgentStreamEvent

    const details = buildDelegatedAgentDetails([
      expertCalled('step-1'),
      toolStarted,
      toolCompleted,
      expertCompleted('step-1')
    ])

    const tools = details.get('step-1')?.tools ?? []
    expect(tools).toHaveLength(1)
    expect(tools[0].name).toBe('function_search_crm_entity')
    expect(tools[0].status).toBe('done')
    expect(tools[0].durationMs).toBe(900)
  })

  it('pairs a completion by subagent_id when the step_id does not match', () => {
    const details = buildDelegatedAgentDetails([
      subagentSpawned('spawn-step', { subagent_id: 'sa-42' }),
      {
        type: 'subagent_completed',
        seq: nextSeq(),
        event_id: 'done-1',
        step_id: 'different-step',
        subagent_id: 'sa-42',
        status: 'done',
        output: 'Recorded 3 attendance days.',
        duration_ms: 1500,
        timestamp: '2026-06-22T10:01:00.000Z'
      } as unknown as AgentStreamEvent
    ])

    const detail = details.get('spawn-step')
    expect(detail?.status).toBe('done')
    expect(detail?.output).toBe('Recorded 3 attendance days.')
    expect(detail?.durationMs).toBe(1500)
  })

  it('falls back to a matching step_completed when no delegation completion exists', () => {
    const details = buildDelegatedAgentDetails([
      subagentSpawned('step-1'),
      {
        type: 'step_completed',
        seq: nextSeq(),
        event_id: 'step-done',
        step_id: 'step-1',
        status: 'done',
        output: 'Attendance booked.',
        duration_ms: 2100,
        timestamp: '2026-06-22T10:02:00.000Z'
      } as unknown as AgentStreamEvent
    ])

    const detail = details.get('step-1')
    expect(detail?.status).toBe('done')
    expect(detail?.output).toBe('Attendance booked.')
    expect(detail?.durationMs).toBe(2100)
  })

  it('shows a dangling delegation as done once the run has finished', () => {
    const events = [subagentSpawned('step-1')]
    expect(buildDelegatedAgentDetails(events).get('step-1')?.status).toBe('running')
    expect(buildDelegatedAgentDetails(events, { runFinished: true }).get('step-1')?.status).toBe('done')
  })
})

describe('humanizeDelegatedOutput', () => {
  it('returns null for missing or empty output', () => {
    expect(humanizeDelegatedOutput(undefined)).toBeNull()
    expect(humanizeDelegatedOutput('')).toBeNull()
    expect(humanizeDelegatedOutput('   ')).toBeNull()
  })

  it('passes plain prose through unchanged', () => {
    const text = 'Account is healthy; renewal risk is low.'
    expect(humanizeDelegatedOutput(text)).toBe(text)
  })

  it('strips the envelope marker before rendering prose', () => {
    const raw = '<!--__envelope__:{"semantic_status":"success"}-->\nHere is the summary.'
    expect(humanizeDelegatedOutput(raw)).toBe('Here is the summary.')
  })

  it('extracts the readable field from a success envelope JSON payload', () => {
    const raw = JSON.stringify({ status: 'success', expert: 'HR Expert', response: 'Vacation booked for July 1-3.' })
    expect(humanizeDelegatedOutput(raw)).toBe('Vacation booked for July 1-3.')
  })

  it('surfaces the reason from a failure envelope instead of raw JSON', () => {
    const raw = JSON.stringify({
      status: 'capability_gap',
      expert: 'HR Expert',
      reason: 'No access to the HRIS system.',
      verified_actions: []
    })
    expect(humanizeDelegatedOutput(raw)).toBe('No access to the HRIS system.')
  })

  it('digs into nested result and message arrays', () => {
    const raw = JSON.stringify({ result: { messages: [{ role: 'assistant', content: 'Final sub-agent answer.' }] } })
    expect(humanizeDelegatedOutput(raw)).toBe('Final sub-agent answer.')
  })

  it('falls back to a fenced JSON block when no readable text exists', () => {
    const raw = JSON.stringify({ verified_actions: [], counts: { created: 2 } })
    const result = humanizeDelegatedOutput(raw)
    expect(result).toContain('```json')
    expect(result).toContain('"created": 2')
  })

  it('returns the original string when JSON-looking text fails to parse', () => {
    const raw = '{ not valid json'
    expect(humanizeDelegatedOutput(raw)).toBe('{ not valid json')
  })
})
