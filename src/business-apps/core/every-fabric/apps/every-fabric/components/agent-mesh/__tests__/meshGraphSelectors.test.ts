/** @jest-environment jsdom */
import { deriveMeshGraph } from '../meshGraphSelectors'
import { ALL_LAYERS, type MeshLayerKey } from '../meshLayers'
import { ORCHESTRATOR_NODE_ID, type MeshEdge, type MeshNode, type TraceModel } from '../../../utils/traceModel'

function makeNode(partial: Partial<MeshNode> & Pick<MeshNode, 'id' | 'kind'>): MeshNode {
  return {
    label: partial.id,
    firstSeenAt: '2024-01-01T00:00:00.000Z',
    lastSeenAt: '2024-01-01T00:00:01.000Z',
    firstSeenSeq: 0,
    lastSeenSeq: 0,
    offsetMs: 0,
    lastOffsetMs: 0,
    status: 'idle',
    totalDurationMs: 0,
    invocationCount: 0,
    ...partial
  } as MeshNode
}

function makeEdge(partial: Partial<MeshEdge> & Pick<MeshEdge, 'id' | 'source' | 'target' | 'kind'>): MeshEdge {
  return {
    seq: 0,
    timestamp: '2024-01-01T00:00:00.000Z',
    offsetMs: 0,
    ...partial
  } as MeshEdge
}

function makeModel(nodes: MeshNode[], edges: MeshEdge[]): TraceModel {
  return {
    nodes,
    edges,
    frames: [],
    decisions: [],
    summary: {
      eventCount: 0,
      participantCount: nodes.length,
      subagentCount: 0,
      expertCount: 0,
      toolCallCount: 0,
      skillLoadCount: 0
    } as TraceModel['summary'],
    startedAt: null,
    endedAt: null
  } as TraceModel
}

const ALL_LAYERS_SET = new Set<MeshLayerKey>(ALL_LAYERS)

describe('deriveMeshGraph', () => {
  const orchestrator = makeNode({ id: ORCHESTRATOR_NODE_ID, kind: 'orchestrator' })
  const agent = makeNode({ id: 'agent-1', kind: 'subagent' })
  const skillNode = makeNode({ id: 'skill-1', kind: 'skill' })
  const toolNode = makeNode({ id: 'tool-1', kind: 'tool' })

  const delegation = makeEdge({
    id: 'e-delegation',
    source: ORCHESTRATOR_NODE_ID,
    target: 'agent-1',
    kind: 'delegation',
    label: 'do something'
  })
  const skillLoad = makeEdge({
    id: 'e-skill',
    source: 'agent-1',
    target: 'skill-1',
    kind: 'skill_load',
    label: 'research'
  })
  const toolCall = makeEdge({
    id: 'e-tool',
    source: 'agent-1',
    target: 'tool-1',
    kind: 'tool_call',
    label: 'http_request'
  })
  const completion = makeEdge({ id: 'e-complete', source: 'agent-1', target: ORCHESTRATOR_NODE_ID, kind: 'completion' })

  const model = makeModel([orchestrator, agent, skillNode, toolNode], [delegation, skillLoad, toolCall, completion])

  it('hides skill nodes when the skills layer is off', () => {
    const layers = new Set<MeshLayerKey>(['agents', 'tools'])
    const derived = deriveMeshGraph({
      model,
      activeLayers: layers,
      positionMs: 0,
      durationMs: 0,
      selectedNodeId: null,
      hoveredNodeId: null
    })

    const ids = derived.visibleNodes.map(n => n.id).sort()
    expect(ids).toEqual([ORCHESTRATOR_NODE_ID, 'agent-1', 'tool-1'].sort())
    // skill_load edge whose target is hidden must be filtered out
    expect(derived.visibleEdges.map(e => e.id)).not.toContain('e-skill')
  })

  it('always keeps the orchestrator visible regardless of layers', () => {
    const layers = new Set<MeshLayerKey>([])
    const derived = deriveMeshGraph({
      model,
      activeLayers: layers,
      positionMs: 0,
      durationMs: 0,
      selectedNodeId: null,
      hoveredNodeId: null
    })
    expect(derived.visibleNodes.map(n => n.id)).toContain(ORCHESTRATOR_NODE_ID)
  })

  it('excludes completion edges from drawableEdges but keeps them in visibleEdges', () => {
    const derived = deriveMeshGraph({
      model,
      activeLayers: ALL_LAYERS_SET,
      positionMs: 0,
      durationMs: 0,
      selectedNodeId: null,
      hoveredNodeId: null
    })
    expect(derived.visibleEdges.map(e => e.id)).toContain('e-complete')
    expect(derived.drawableEdges.map(e => e.id)).not.toContain('e-complete')
  })

  it('aggregates skill names per agent from skill_load edges', () => {
    const extraSkill = makeNode({ id: 'skill-2', kind: 'skill' })
    const extraEdge = makeEdge({
      id: 'e-skill-2',
      source: 'agent-1',
      target: 'skill-2',
      kind: 'skill_load',
      label: 'writing'
    })
    const expanded = makeModel(
      [orchestrator, agent, skillNode, toolNode, extraSkill],
      [delegation, skillLoad, toolCall, completion, extraEdge]
    )

    const derived = deriveMeshGraph({
      model: expanded,
      activeLayers: ALL_LAYERS_SET,
      positionMs: 0,
      durationMs: 0,
      selectedNodeId: null,
      hoveredNodeId: null
    })

    const agentDerived = derived.derivedNodeById.get('agent-1')
    expect(agentDerived?.skillNames.sort()).toEqual(['research', 'writing'])
  })

  it('propagates hover highlight to connected nodes and dims everything else', () => {
    const derived = deriveMeshGraph({
      model,
      activeLayers: ALL_LAYERS_SET,
      positionMs: 0,
      durationMs: 0,
      selectedNodeId: null,
      hoveredNodeId: 'agent-1'
    })

    const orch = derived.derivedNodeById.get(ORCHESTRATOR_NODE_ID)!
    const agentNode = derived.derivedNodeById.get('agent-1')!
    const skill = derived.derivedNodeById.get('skill-1')!

    expect(agentNode.isDimmed).toBe(false)
    // orchestrator + skill are direct neighbours → highlighted (not dimmed)
    expect(orch.isDimmed).toBe(false)
    expect(skill.isDimmed).toBe(false)
    expect(orch.isHighlighted).toBe(true)
    expect(skill.isHighlighted).toBe(true)

    // Hover edges include all edges touching the hovered node
    expect([...derived.highlightedEdgeIds].sort()).toEqual(
      [delegation.id, skillLoad.id, toolCall.id, completion.id].sort()
    )
  })

  it('marks selected node and replay-active node correctly', () => {
    const futureAgent = makeNode({ id: 'agent-future', kind: 'subagent', offsetMs: 5000, lastOffsetMs: 5500 })
    const futureModel = makeModel([orchestrator, agent, futureAgent], [delegation])
    const derived = deriveMeshGraph({
      model: futureModel,
      activeLayers: ALL_LAYERS_SET,
      positionMs: 1000,
      durationMs: 6000,
      selectedNodeId: 'agent-1',
      hoveredNodeId: null
    })
    expect(derived.derivedNodeById.get('agent-1')?.isSelected).toBe(true)
    expect(derived.derivedNodeById.get('agent-future')?.isUpcoming).toBe(true)
    // Replay clock at 1000ms — orchestrator is always shown (offsetMs 0, lastOffsetMs 0 → recentlyActive false unless positionMs <= lastOffsetMs)
    // agent-1 has offsetMs 0 and lastOffsetMs 0, so positionMs=1000 > lastOffsetMs=0 → not active.
    expect(derived.derivedNodeById.get('agent-1')?.isActive).toBe(false)
  })

  it('assigns bubbleIndex + bubbleTotal across parallel edges between the same pair', () => {
    const e1 = makeEdge({ id: 'p1', source: ORCHESTRATOR_NODE_ID, target: 'agent-1', kind: 'delegation' })
    const e2 = makeEdge({ id: 'p2', source: ORCHESTRATOR_NODE_ID, target: 'agent-1', kind: 'delegation' })
    const e3 = makeEdge({ id: 'p3', source: 'agent-1', target: ORCHESTRATOR_NODE_ID, kind: 'delegation' })
    const parallelModel = makeModel([orchestrator, agent], [e1, e2, e3])

    const derived = deriveMeshGraph({
      model: parallelModel,
      activeLayers: ALL_LAYERS_SET,
      positionMs: 0,
      durationMs: 0,
      selectedNodeId: null,
      hoveredNodeId: null
    })

    const totals = derived.derivedEdges.map(d => d.bubbleTotal)
    expect(totals.every(t => t === 3)).toBe(true)
    const indexes = derived.derivedEdges.map(d => d.bubbleIndex).sort()
    expect(indexes).toEqual([0, 1, 2])
  })

  it('does not mark historical unresolved live edges active without a running endpoint', () => {
    const liveEdge = makeEdge({
      id: 'live-tool',
      source: 'agent-1',
      target: 'tool-1',
      kind: 'tool_call',
      offsetMs: 10
    })
    const liveModel = makeModel([orchestrator, agent, toolNode], [liveEdge])

    const derived = deriveMeshGraph({
      model: liveModel,
      activeLayers: ALL_LAYERS_SET,
      positionMs: 0,
      durationMs: 0,
      selectedNodeId: null,
      hoveredNodeId: null
    })

    expect(derived.derivedEdgeById.get('live-tool')?.isActive).toBe(false)
  })

  it('marks live unresolved edges active when a connected node is running and no activity map is available', () => {
    const runningAgent = makeNode({ id: 'agent-running', kind: 'subagent', status: 'running' })
    const liveEdge = makeEdge({
      id: 'live-running-tool',
      source: 'agent-running',
      target: 'tool-1',
      kind: 'tool_call',
      offsetMs: 10
    })
    const liveModel = makeModel([orchestrator, runningAgent, toolNode], [liveEdge])

    const derived = deriveMeshGraph({
      model: liveModel,
      activeLayers: ALL_LAYERS_SET,
      positionMs: 0,
      durationMs: 0,
      selectedNodeId: null,
      hoveredNodeId: null
    })

    expect(derived.derivedEdgeById.get('live-running-tool')?.isActive).toBe(true)
  })

  it('applies live activity counts and heat to nodes without lighting every connected edge', () => {
    const nodeActivityById = new Map([
      [
        'tool-1',
        {
          liveCount: 3,
          activityLabel: 'Running payroll lookup',
          lastSeenAt: 1000
        }
      ]
    ])
    const derived = deriveMeshGraph({
      model,
      activeLayers: ALL_LAYERS_SET,
      positionMs: 0,
      durationMs: 0,
      selectedNodeId: null,
      hoveredNodeId: null,
      nodeActivityById
    })

    const tool = derived.derivedNodeById.get('tool-1')
    const edge = derived.derivedEdgeById.get('e-tool')
    expect(tool?.isActive).toBe(true)
    expect(tool?.liveCount).toBe(3)
    expect(tool?.activityHeat).toBeGreaterThan(0)
    expect(edge?.isActive).toBe(false)
    expect(edge?.liveCount).toBe(0)
  })

  it('lights only the exact live edge when edge activity is provided', () => {
    const nodeActivityById = new Map([
      [
        'tool-1',
        {
          liveCount: 3,
          activityLabel: 'Running payroll lookup',
          lastSeenAt: 1000
        }
      ]
    ])
    const edgeActivityById = new Map([
      [
        'e-tool',
        {
          liveCount: 3,
          activityLabel: 'Running payroll lookup',
          lastSeenAt: 1000
        }
      ]
    ])
    const derived = deriveMeshGraph({
      model,
      activeLayers: ALL_LAYERS_SET,
      positionMs: 0,
      durationMs: 0,
      selectedNodeId: null,
      hoveredNodeId: null,
      nodeActivityById,
      edgeActivityById
    })

    const edge = derived.derivedEdgeById.get('e-tool')
    expect(edge?.isActive).toBe(true)
    expect(edge?.liveCount).toBe(3)
  })
})
