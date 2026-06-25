import type { AgentStreamEvent } from '../../types/enterpriseAgent'
import {
  buildMeshTraceModel,
  buildTraceModel,
  EMPTY_TRACE_MODEL,
  ORCHESTRATOR_NODE_ID,
  prepareMeshTraceEvents
} from '../traceModel'

const ts = (offsetSeconds: number) => new Date(Date.UTC(2026, 0, 1, 12, 0, offsetSeconds, 0)).toISOString()

describe('traceModel', () => {
  it('returns the empty model when no events are provided', () => {
    const model = buildTraceModel([])
    expect(model.nodes).toHaveLength(1)
    expect(model.nodes[0].id).toBe(ORCHESTRATOR_NODE_ID)
    expect(model.edges).toHaveLength(0)
    expect(model.frames).toHaveLength(0)
    expect(model.summary.eventCount).toBe(0)
  })

  it('builds nodes and delegation edges for sub-agent spawn / completion', () => {
    const events: AgentStreamEvent[] = [
      {
        type: 'subagent_spawned',
        seq: 1,
        event_id: 'e1',
        step_id: 's1',
        name: 'CRMAgent',
        agent_name: 'CRMAgent',
        task_summary: 'Look up customer',
        timestamp: ts(0)
      },
      {
        type: 'subagent_completed',
        seq: 2,
        event_id: 'e2',
        step_id: 's1',
        status: 'done',
        duration_ms: 1200,
        name: 'CRMAgent',
        timestamp: ts(2)
      }
    ]
    const model = buildTraceModel(events)
    const subagent = model.nodes.find(n => n.kind === 'subagent')
    expect(subagent).toBeDefined()
    expect(subagent!.label).toBe('CRMAgent')
    expect(subagent!.status).toBe('done')
    expect(subagent!.totalDurationMs).toBe(1200)

    const delegation = model.edges.find(e => e.kind === 'delegation')
    expect(delegation).toBeDefined()
    expect(delegation!.source).toBe(ORCHESTRATOR_NODE_ID)
    expect(delegation!.target).toBe(subagent!.id)
    expect(delegation!.resolvedAt).toBe(ts(2))

    const completion = model.edges.find(e => e.kind === 'completion')
    expect(completion).toBeDefined()
    expect(completion!.source).toBe(subagent!.id)
    expect(completion!.target).toBe(ORCHESTRATOR_NODE_ID)
  })

  it('attributes tool calls to the current scope and emits start/end frames', () => {
    const events: AgentStreamEvent[] = [
      {
        type: 'subagent_spawned',
        seq: 1,
        event_id: 'e1',
        step_id: 'sub1',
        name: 'Researcher',
        timestamp: ts(0)
      },
      {
        type: 'step_started',
        seq: 2,
        event_id: 'e2',
        step_id: 't1',
        step_type: 'tool',
        name: 'web_search',
        input: { q: 'newwork ai' },
        timestamp: ts(1)
      },
      {
        type: 'step_completed',
        seq: 3,
        event_id: 'e3',
        step_id: 't1',
        status: 'done',
        name: 'web_search',
        duration_ms: 500,
        timestamp: ts(2)
      }
    ]
    const model = buildTraceModel(events)
    const tool = model.nodes.find(n => n.kind === 'tool')
    expect(tool).toBeDefined()
    expect(tool!.label).toBe('web_search')
    expect(tool!.status).toBe('done')

    const toolCall = model.edges.find(e => e.kind === 'tool_call')
    expect(toolCall).toBeDefined()
    expect(toolCall!.source).not.toBe(ORCHESTRATOR_NODE_ID)

    const toolFrames = model.frames.filter(f => f.kind === 'tool')
    expect(toolFrames).toHaveLength(2)
    expect(toolFrames[0].status).toBe('running')
    expect(toolFrames[1].status).toBe('done')
  })

  it('extracts decisions with offsetMs relative to the first event', () => {
    const events: AgentStreamEvent[] = [
      {
        type: 'step_started',
        seq: 1,
        event_id: 'first',
        step_id: 'x',
        step_type: 'thinking',
        timestamp: ts(0)
      },
      {
        type: 'decision',
        seq: 2,
        event_id: 'd1',
        timestamp: ts(3),
        category: 'skill',
        title: 'Loaded skill CRM',
        chosen: 'crm-skill',
        rationale: 'Matched intent'
      }
    ]
    const model = buildTraceModel(events)
    expect(model.decisions).toHaveLength(1)
    expect(model.decisions[0].offsetMs).toBe(3000)
    expect(model.decisions[0].chosen).toBe('crm-skill')
  })

  it('marks the orchestrator failed when the terminal event is failed', () => {
    const events: AgentStreamEvent[] = [
      {
        type: 'terminal',
        seq: 1,
        event_id: 't',
        timestamp: ts(0),
        status: 'failed'
      }
    ]
    const model = buildTraceModel(events)
    const orchestrator = model.nodes.find(n => n.id === ORCHESTRATOR_NODE_ID)!
    expect(orchestrator.status).toBe('failed')
    expect(model.summary.terminalStatus).toBe('failed')
  })

  it('merges expert_selected into the expert_called node for the same expert name', () => {
    const events: AgentStreamEvent[] = [
      {
        type: 'expert_called',
        seq: 16,
        event_id: 'e16',
        step_id: 'step-call-vgaKtKm2vEV',
        subagent_id: 'b38cba83',
        expert_name: 'HR_General_Agent',
        task_summary: 'Start offboarding for Mohamed Masoud',
        timestamp: ts(0)
      },
      {
        type: 'expert_selected',
        seq: 27,
        event_id: 'e27',
        expert_id: '6a1f159eceaf2e155e2f25f8',
        timestamp: ts(5),
        payload: {
          name: 'HR_General_Agent',
          description: 'HR Operations expert',
          skill_ids: ['employee-offboarding', 'hr-letter']
        }
      },
      {
        type: 'expert_selected',
        seq: 114,
        event_id: 'e114',
        expert_id: '6a1f159eceaf2e155e2f25f8',
        timestamp: ts(10),
        payload: {
          name: 'HR_General_Agent',
          skill_ids: ['employee-offboarding', 'hr-letter']
        }
      }
    ]

    const model = buildTraceModel(events)
    const hrNodes = model.nodes.filter(n => n.kind === 'expert' && n.label === 'HR_General_Agent')
    expect(hrNodes).toHaveLength(1)
    expect(hrNodes[0].id).toBe('expert:b38cba83')

    const skillNodes = model.nodes.filter(n => n.kind === 'skill')
    expect(skillNodes.map(n => n.label).sort()).toEqual(['employee-offboarding', 'hr-letter'])

    const skillEdges = model.edges.filter(e => e.kind === 'skill_load' && e.source === hrNodes[0].id)
    expect(skillEdges).toHaveLength(2)

    const delegation = model.edges.find(e => e.kind === 'expert_call')
    expect(delegation?.target).toBe(hrNodes[0].id)
    expect(model.summary.expertCount).toBe(1)
  })

  it('is order-independent (sorts by seq)', () => {
    const events: AgentStreamEvent[] = [
      {
        type: 'subagent_completed',
        seq: 2,
        event_id: 'b',
        step_id: 's',
        status: 'done',
        timestamp: ts(2)
      },
      {
        type: 'subagent_spawned',
        seq: 1,
        event_id: 'a',
        step_id: 's',
        name: 'X',
        timestamp: ts(0)
      }
    ]
    const model = buildTraceModel(events)
    const subagent = model.nodes.find(n => n.kind === 'subagent')!
    expect(subagent.status).toBe('done')
  })

  it('exposes the empty model singleton with one orchestrator node', () => {
    expect(EMPTY_TRACE_MODEL.nodes).toHaveLength(1)
    expect(EMPTY_TRACE_MODEL.nodes[0].id).toBe(ORCHESTRATOR_NODE_ID)
  })

  it('mesh model omits catalog-only tool_available nodes', () => {
    const events: AgentStreamEvent[] = [
      {
        type: 'tool_available',
        seq: 1,
        event_id: 'ta1',
        timestamp: ts(0),
        tool_ref: 'functions.search_crm_entity'
      },
      {
        type: 'subagent_spawned',
        seq: 2,
        event_id: 'e2',
        step_id: 's1',
        agent_name: 'CRM_Account_Agent',
        name: 'task',
        timestamp: ts(1)
      },
      {
        type: 'step_started',
        seq: 3,
        event_id: 'e3',
        step_id: 't1',
        step_type: 'tool',
        name: 'newwork_search_crm_entity',
        parent_step_id: 's1',
        timestamp: ts(2)
      },
      {
        type: 'step_completed',
        seq: 4,
        event_id: 'e4',
        step_id: 't1',
        status: 'done',
        name: 'newwork_search_crm_entity',
        timestamp: ts(3)
      }
    ]
    const mesh = buildMeshTraceModel(events)
    expect(mesh.nodes.some(n => n.label === 'functions.search_crm_entity')).toBe(false)
    expect(mesh.nodes.filter(n => n.label === 'CRM_Account_Agent')).toHaveLength(1)
    const toolEdge = mesh.edges.find(e => e.kind === 'tool_call' && e.target === 'tool:newwork_search_crm_entity')
    expect(toolEdge?.source).not.toBe(ORCHESTRATOR_NODE_ID)
  })

  it('merges subagent_spawned into expert_selected node with the same label', () => {
    const events: AgentStreamEvent[] = [
      {
        type: 'expert_selected',
        seq: 1,
        event_id: 'es1',
        expert_id: 'crm-registry-id',
        timestamp: ts(0),
        payload: { name: 'CRM_Account_Agent', skill_ids: ['insurance-crm-workflow'] }
      },
      {
        type: 'subagent_spawned',
        seq: 2,
        event_id: 'sp1',
        step_id: 'step-delegate',
        name: 'task',
        agent_name: 'CRM_Account_Agent',
        subagent_id: 'abc12345',
        timestamp: ts(1)
      },
      {
        type: 'subagent_completed',
        seq: 3,
        event_id: 'sp2',
        step_id: 'step-delegate',
        status: 'done',
        timestamp: ts(2)
      }
    ]
    const mesh = buildMeshTraceModel(events)
    const crmNodes = mesh.nodes.filter(n => n.label === 'CRM_Account_Agent')
    expect(crmNodes).toHaveLength(1)
    expect(crmNodes[0].id).toBe('expert:crm-registry-id')
  })

  it('does not surface generic delegation tool nodes like task', () => {
    const events: AgentStreamEvent[] = [
      {
        type: 'agent_chunk',
        seq: 1,
        event_id: 'c1',
        role: 'tool',
        tool_name: 'task',
        content: 'done',
        timestamp: ts(0)
      }
    ]
    const mesh = buildMeshTraceModel(events)
    expect(mesh.nodes.some(n => n.label === 'task')).toBe(false)
  })

  it('prepareMeshTraceEvents strips skill_scoped rows', () => {
    const events: AgentStreamEvent[] = [
      {
        type: 'skill_scoped',
        seq: 1,
        event_id: 'ss1',
        timestamp: ts(0),
        skill: { skill_id: 'insurance-crm-workflow', name: 'insurance-crm-workflow' }
      }
    ]
    expect(prepareMeshTraceEvents(events)).toHaveLength(0)
    expect(buildTraceModel(events).nodes.some(n => n.kind === 'skill')).toBe(false)
    expect(buildMeshTraceModel(events).nodes.some(n => n.kind === 'skill')).toBe(false)
  })
})
