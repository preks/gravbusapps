// Unit tests for the tool stats aggregation logic used by TraceToolsTab.
//
// The aggregation must:
//   1. Group by `targetNodeId` (one row per tool node), not by frame title.
//   2. Skip the start frame (no durationMs) and only count the end frame.
//      This avoids the "web_search" + "web_search → done" duplication.
//   3. Drop tools whose end frames never arrived (callCount === 0).

import type { MeshNode, TraceFrame, TraceModel } from '../../../utils/traceModel'
import { EMPTY_TRACE_MODEL } from '../../../utils/traceModel'

interface ToolStat {
  nodeId: string
  name: string
  callCount: number
  totalDurationMs: number
  failures: number
  lastStatus: 'done' | 'failed' | 'running'
}

function buildToolStats(model: TraceModel): ToolStat[] {
  const toolNodes = model.nodes.filter(n => n.kind === 'tool')
  const stats = new Map<string, ToolStat>()
  for (const node of toolNodes) {
    stats.set(node.id, {
      nodeId: node.id,
      name: node.label,
      callCount: 0,
      totalDurationMs: 0,
      failures: 0,
      lastStatus: 'running'
    })
  }
  for (const frame of model.frames) {
    if (frame.kind !== 'tool') continue
    const targetId = frame.targetNodeId
    if (!targetId) continue
    const stat = stats.get(targetId)
    if (!stat) continue
    if (frame.durationMs == null && frame.status !== 'failed') continue
    stat.callCount++
    stat.totalDurationMs += frame.durationMs ?? 0
    if (frame.status === 'failed') stat.failures++
    stat.lastStatus = frame.status === 'failed' ? 'failed' : 'done'
  }
  return Array.from(stats.values())
    .filter(s => s.callCount > 0)
    .sort((a, b) => b.callCount - a.callCount)
}

const ts = (offset: number) => new Date(Date.UTC(2026, 0, 1, 12, 0, offset, 0)).toISOString()

function toolNode(id: string, label: string): MeshNode {
  return {
    id,
    kind: 'tool',
    label,
    firstSeenAt: ts(0),
    lastSeenAt: ts(0),
    firstSeenSeq: 1,
    lastSeenSeq: 1,
    offsetMs: 0,
    lastOffsetMs: 0,
    status: 'done',
    totalDurationMs: 0,
    invocationCount: 1
  }
}

function startFrame(targetNodeId: string, title: string, seq: number): TraceFrame {
  return {
    id: `start-${seq}`,
    seq,
    timestamp: ts(0),
    offsetMs: 0,
    kind: 'tool',
    nodeId: 'orchestrator',
    targetNodeId,
    title,
    event: {} as TraceFrame['event']
  }
}

function endFrame(
  targetNodeId: string,
  title: string,
  seq: number,
  durationMs: number,
  status: 'done' | 'failed' = 'done'
): TraceFrame {
  return {
    id: `end-${seq}`,
    seq,
    timestamp: ts(0),
    offsetMs: 0,
    kind: 'tool',
    nodeId: 'orchestrator',
    targetNodeId,
    title,
    durationMs,
    status,
    event: {} as TraceFrame['event']
  }
}

function makeModel(nodes: MeshNode[], frames: TraceFrame[]): TraceModel {
  return {
    ...EMPTY_TRACE_MODEL,
    nodes: [...EMPTY_TRACE_MODEL.nodes.filter(n => n.kind === 'orchestrator'), ...nodes],
    frames
  }
}

describe('buildToolStats (TraceToolsTab aggregation)', () => {
  it('collapses start + end frames into a single row per tool', () => {
    const node = toolNode('tool:web_search', 'web_search')
    const frames = [
      startFrame('tool:web_search', 'web_search', 1),
      endFrame('tool:web_search', 'web_search → done', 2, 1500),
      startFrame('tool:web_search', 'web_search', 3),
      endFrame('tool:web_search', 'web_search → done', 4, 2300)
    ]
    const stats = buildToolStats(makeModel([node], frames))
    expect(stats).toHaveLength(1)
    expect(stats[0].name).toBe('web_search')
    expect(stats[0].callCount).toBe(2)
    expect(stats[0].totalDurationMs).toBe(3800)
    expect(stats[0].failures).toBe(0)
  })

  it('counts failed end frames as failures and bumps callCount', () => {
    const node = toolNode('tool:fetch', 'fetch')
    const frames = [
      startFrame('tool:fetch', 'fetch', 1),
      endFrame('tool:fetch', 'fetch → done', 2, 100),
      startFrame('tool:fetch', 'fetch', 3),
      endFrame('tool:fetch', 'fetch → failed', 4, 0, 'failed')
    ]
    const stats = buildToolStats(makeModel([node], frames))
    expect(stats[0].callCount).toBe(2)
    expect(stats[0].failures).toBe(1)
  })

  it('drops tool nodes whose calls never resolved (no end frame)', () => {
    const node = toolNode('tool:hanging', 'hanging')
    const frames = [startFrame('tool:hanging', 'hanging', 1)]
    expect(buildToolStats(makeModel([node], frames))).toHaveLength(0)
  })

  it('sorts by callCount desc', () => {
    const a = toolNode('tool:a', 'tool_a')
    const b = toolNode('tool:b', 'tool_b')
    const frames = [
      endFrame('tool:a', 'tool_a → done', 1, 10),
      endFrame('tool:b', 'tool_b → done', 2, 10),
      endFrame('tool:b', 'tool_b → done', 3, 10),
      endFrame('tool:b', 'tool_b → done', 4, 10)
    ]
    const stats = buildToolStats(makeModel([a, b], frames))
    expect(stats.map(s => s.name)).toEqual(['tool_b', 'tool_a'])
  })

  it('returns an empty array when no tool nodes exist', () => {
    expect(buildToolStats(makeModel([], []))).toHaveLength(0)
  })
})
