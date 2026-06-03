import type { ActiveSessionSnapshot } from '../../types/activeSession'
import { ORCHESTRATOR_NODE_ID, type MeshEdgeKind, type MeshNode, type MeshNodeKind } from '../../utils/traceModel'
import {
  edgeIdentityKey,
  nodeIdentityKey,
  type AggregateNode,
  type AggregateTraceModel
} from '../../utils/meshAggregateModel'

export interface MeshLiveActivity {
  liveCount: number
  activityLabel?: string
  activityStatus?: ActiveSessionSnapshot['status']
  lastSeenAt: number
}

export interface MeshLiveActivitySummary {
  liveSessions: number
  activeAgents: number
  activeSkills: number
  activeTools: number
  waitingForHuman: number
}

export interface MeshLiveActivityState {
  nodeActivityById: Map<string, MeshLiveActivity>
  edgeActivityById: Map<string, MeshLiveActivity>
  summary: MeshLiveActivitySummary
}

const EMPTY_SUMMARY: MeshLiveActivitySummary = {
  liveSessions: 0,
  activeAgents: 0,
  activeSkills: 0,
  activeTools: 0,
  waitingForHuman: 0
}

export const EMPTY_LIVE_ACTIVITY: MeshLiveActivityState = {
  nodeActivityById: new Map(),
  edgeActivityById: new Map(),
  summary: EMPTY_SUMMARY
}

const LIVE_SESSION_STATUSES = new Set(['pending', 'running', 'waiting_for_human'])
const LIVE_ACTIVITY_STALE_MS = 2 * 60 * 1000

function parseTime(value: string | null | undefined): number | null {
  if (!value) return null
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? ms : null
}

function latestSessionActivityMs(session: ActiveSessionSnapshot): number | null {
  const candidates = [
    parseTime(session.current_activity?.started_at),
    parseTime(session.updated_at),
    parseTime(session.started_at),
    parseTime(session.created_at)
  ].filter((value): value is number => value !== null)
  if (candidates.length === 0) return null
  return Math.max(...candidates)
}

function isFreshLiveSession(session: ActiveSessionSnapshot, nowMs: number): boolean {
  if (!LIVE_SESSION_STATUSES.has(session.status)) return false
  if (session.current_activity?.step === 'idle') return false

  const latestMs = latestSessionActivityMs(session)
  // Older backends/tests may omit timestamps. In that case the active endpoint
  // itself is the freshness signal, so keep the session rather than hiding it.
  if (latestMs === null) return true

  return nowMs - latestMs <= LIVE_ACTIVITY_STALE_MS
}

function emptyNode(kind: MeshNodeKind, label: string, metadata?: Record<string, unknown>): MeshNode {
  return {
    id: kind === 'orchestrator' ? ORCHESTRATOR_NODE_ID : `${kind}:${label}`,
    kind,
    label,
    firstSeenAt: '',
    lastSeenAt: '',
    firstSeenSeq: 0,
    lastSeenSeq: 0,
    offsetMs: 0,
    lastOffsetMs: 0,
    status: 'running',
    totalDurationMs: 0,
    invocationCount: 1,
    metadata
  }
}

function addActivity(
  map: Map<string, MeshLiveActivity>,
  id: string,
  nowMs: number,
  label?: string,
  status?: ActiveSessionSnapshot['status']
) {
  const existing = map.get(id)
  if (existing) {
    existing.liveCount += 1
    existing.lastSeenAt = Math.max(existing.lastSeenAt, nowMs)
    if (label) existing.activityLabel = label
    if (status) existing.activityStatus = status
    return
  }
  map.set(id, {
    liveCount: 1,
    activityLabel: label,
    activityStatus: status,
    lastSeenAt: nowMs
  })
}

function nodeKey(kind: MeshNodeKind, label: string, metadata?: Record<string, unknown>): string {
  return nodeIdentityKey(emptyNode(kind, label, metadata))
}

function edgeKey(source: string, target: string, kind: MeshEdgeKind): string {
  return edgeIdentityKey({ source, target, kind })
}

function activityNodeFor(
  session: ActiveSessionSnapshot
): { kind: MeshNodeKind; label: string; metadata?: Record<string, unknown> } | null {
  const activity = session.current_activity
  if (activity.step === 'tool_call') {
    const name = activity.tool_name || activity.label
    return name ? { kind: 'tool', label: name } : null
  }
  if (activity.step === 'subagent') {
    const name = activity.subagent_name || activity.label
    return name ? { kind: 'subagent', label: name } : null
  }
  if (activity.step === 'expert') {
    const name = activity.expert_name || activity.label
    return name ? { kind: 'expert', label: name } : null
  }
  return null
}

function edgeKindFor(kind: MeshNodeKind): MeshEdgeKind {
  if (kind === 'tool') return 'tool_call'
  if (kind === 'skill') return 'skill_load'
  if (kind === 'expert') return 'expert_call'
  return 'delegation'
}

export function buildLiveMeshActivity(
  activeSessions: readonly ActiveSessionSnapshot[] | undefined,
  nowMs = Date.now()
): MeshLiveActivityState {
  if (!activeSessions || activeSessions.length === 0) return EMPTY_LIVE_ACTIVITY

  const freshSessions = activeSessions.filter(session => isFreshLiveSession(session, nowMs))
  if (freshSessions.length === 0) return EMPTY_LIVE_ACTIVITY

  const nodeActivityById = new Map<string, MeshLiveActivity>()
  const edgeActivityById = new Map<string, MeshLiveActivity>()
  const hotAgentIds = new Set<string>()
  const hotSkillIds = new Set<string>()
  const hotToolIds = new Set<string>()
  let waitingForHuman = 0

  const orchestratorId = ORCHESTRATOR_NODE_ID

  for (const session of freshSessions) {
    const status = session.status
    const activityLabel = session.current_activity?.label || session.input
    addActivity(nodeActivityById, orchestratorId, nowMs, activityLabel, status)

    if (session.status === 'waiting_for_human' || session.current_activity?.step === 'awaiting_human') {
      waitingForHuman += 1
    }

    const activeNode = activityNodeFor(session)
    if (activeNode) {
      const activeNodeId = nodeKey(activeNode.kind, activeNode.label, activeNode.metadata)
      addActivity(nodeActivityById, activeNodeId, nowMs, activityLabel, status)
      addActivity(
        edgeActivityById,
        edgeKey(orchestratorId, activeNodeId, edgeKindFor(activeNode.kind)),
        nowMs,
        activityLabel,
        status
      )
      if (activeNode.kind === 'tool') hotToolIds.add(activeNodeId)
      else hotAgentIds.add(activeNodeId)
    }

    const skillName = session.skill?.name || session.skill?.id
    if (skillName) {
      // Aggregate skill nodes are currently keyed by display label, not skill id.
      const skillNodeId = nodeKey('skill', skillName)
      addActivity(nodeActivityById, skillNodeId, nowMs, session.skill?.name ?? activityLabel, status)
      addActivity(
        edgeActivityById,
        edgeKey(orchestratorId, skillNodeId, 'skill_load'),
        nowMs,
        session.skill?.name ?? activityLabel,
        status
      )
      hotSkillIds.add(skillNodeId)
    }
  }

  return {
    nodeActivityById,
    edgeActivityById,
    summary: {
      liveSessions: freshSessions.length,
      activeAgents: hotAgentIds.size,
      activeSkills: hotSkillIds.size,
      activeTools: hotToolIds.size,
      waitingForHuman
    }
  }
}

function aggregateNodeLiveCount(node: MeshNode): number {
  if (node.status !== 'running') return 0
  const sessions = (node as AggregateNode).sessions
  if (!Array.isArray(sessions)) return 1
  return Math.max(1, sessions.filter(s => LIVE_SESSION_STATUSES.has(s.status)).length)
}

export function buildModelLiveActivity(
  model: AggregateTraceModel | null | undefined,
  nowMs = Date.now()
): MeshLiveActivityState {
  if (!model) return EMPTY_LIVE_ACTIVITY

  const nodeActivityById = new Map<string, MeshLiveActivity>()
  const edgeActivityById = new Map<string, MeshLiveActivity>()
  const activeSessionIds = new Set<string>()
  const hotAgentIds = new Set<string>()
  const hotSkillIds = new Set<string>()
  const hotToolIds = new Set<string>()
  let waitingForHuman = 0

  for (const node of model.nodes) {
    const liveCount = aggregateNodeLiveCount(node)
    if (liveCount <= 0 && node.status !== 'running') continue

    const sessions = (node as AggregateNode).sessions
    if (Array.isArray(sessions)) {
      for (const session of sessions) {
        if (!LIVE_SESSION_STATUSES.has(session.status)) continue
        activeSessionIds.add(session.sessionId)
        if (session.status === 'waiting_for_human') waitingForHuman += 1
      }
    }

    const count = Math.max(1, liveCount)
    nodeActivityById.set(node.id, {
      liveCount: count,
      activityLabel: node.label,
      activityStatus: node.status === 'running' ? 'running' : undefined,
      lastSeenAt: nowMs
    })

    if (node.kind === 'tool') hotToolIds.add(node.id)
    else if (node.kind === 'skill') hotSkillIds.add(node.id)
    else hotAgentIds.add(node.id)
  }

  for (const edge of model.edges) {
    const sourceCount = nodeActivityById.get(edge.source)?.liveCount ?? 0
    const targetCount = nodeActivityById.get(edge.target)?.liveCount ?? 0
    // The orchestrator is hot whenever anything is running; don't let that
    // make every historical orchestrator edge look live. For orchestration
    // edges, the non-orchestrator endpoint must be hot. For nested agent →
    // tool/skill edges, either endpoint can carry the signal.
    const liveCount =
      edge.source === ORCHESTRATOR_NODE_ID
        ? targetCount
        : edge.target === ORCHESTRATOR_NODE_ID
          ? sourceCount
          : Math.max(sourceCount, targetCount)
    if (liveCount <= 0) continue
    edgeActivityById.set(edge.id, {
      liveCount,
      activityLabel: edge.label,
      lastSeenAt: nowMs
    })
  }

  return {
    nodeActivityById,
    edgeActivityById,
    summary: {
      liveSessions: activeSessionIds.size || Math.max(0, nodeActivityById.get(ORCHESTRATOR_NODE_ID)?.liveCount ?? 0),
      activeAgents: hotAgentIds.size,
      activeSkills: hotSkillIds.size,
      activeTools: hotToolIds.size,
      waitingForHuman
    }
  }
}
