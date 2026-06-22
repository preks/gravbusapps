import type { AgentStreamEvent } from '../../types/enterpriseAgent'
import { buildDelegatedAgentDetails } from '../delegatedAgentDetails'

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
})
