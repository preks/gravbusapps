/**
 * Aggregate mesh model — merges multiple session TraceModels into a single
 * unified graph for Company / User Sessions / My Sessions views.
 *
 * Nodes collapse by logical identity:
 *   - Orchestrator → single "Every" node
 *   - Experts → by expert id or name
 *   - Skills → by skill id or name
 *   - Tools → by tool ref or name
 *
 * Edges collapse by `sourceKey + targetKey + kind`, with aggregate metadata.
 */

import type { AgentStreamEvent, DeepAgentSession } from '../types/enterpriseAgent'
import {
  buildTraceModel,
  ORCHESTRATOR_NODE_ID,
  type MeshEdge,
  type MeshNode,
  type MeshNodeStatus,
  type TraceModel
} from './traceModel'

export interface AggregateNodeProvenance {
  userId: string
  displayName?: string
  sessionCount: number
  invocationCount: number
  lastSeenAt: string
}

export interface AggregateSessionRef {
  sessionId: string
  title: string
  status: string
  userId: string
  createdAt: string
  invocationCount: number
}

export interface AggregateNode extends MeshNode {
  users: AggregateNodeProvenance[]
  sessions: AggregateSessionRef[]
  sessionCount: number
}

export interface AggregateEdge extends MeshEdge {
  sessionCount: number
  invocationCount: number
  lastSeenAt: string
  users: AggregateNodeProvenance[]
  sampleSessionIds: string[]
}

export interface AggregateTraceModel extends TraceModel {
  nodes: AggregateNode[]
  edges: AggregateEdge[]
  totalSessions: number
  totalUsers: number
}

export interface AggregateStats {
  agentCount: number
  toolCount: number
  skillCount: number
  sessionCount: number
  userCount: number
  topAgents: { id: string; label: string; invocationCount: number }[]
  topSkills: { id: string; label: string; invocationCount: number }[]
  topTools: { id: string; label: string; invocationCount: number }[]
  recentUsers?: { userId: string; displayName?: string; sessionCount: number }[]
  recentSessions?: { sessionId: string; title: string; status: string }[]
}

interface SessionContext {
  sessionId: string
  userId: string
  title: string
  status: string
  createdAt: string
}

export function nodeIdentityKey(node: MeshNode): string {
  if (node.id === ORCHESTRATOR_NODE_ID) return ORCHESTRATOR_NODE_ID
  const metaId = node.metadata?.expertId ?? node.metadata?.skillId ?? node.metadata?.toolRef
  if (typeof metaId === 'string' && metaId.length > 0) return `${node.kind}::${metaId}`
  return `${node.kind}::${node.label.toLowerCase().trim()}`
}

export function edgeIdentityKey(
  edge: Pick<MeshEdge, 'source' | 'target' | 'kind'>,
  nodeKeyMap?: Map<string, string>
): string {
  const sourceKey = nodeKeyMap?.get(edge.source) ?? edge.source
  const targetKey = nodeKeyMap?.get(edge.target) ?? edge.target
  return `${sourceKey}::${targetKey}::${edge.kind}`
}

function mergeNodeStatus(current: MeshNodeStatus, incoming: MeshNodeStatus): MeshNodeStatus {
  if (current === 'failed' || incoming === 'failed') return 'failed'
  if (current === 'running' || incoming === 'running') return 'running'
  if (current === 'done' || incoming === 'done') return 'done'
  return 'idle'
}

export function buildAggregateModel(
  sessions: DeepAgentSession[],
  userNameMap?: Map<string, string>
): AggregateTraceModel {
  const nameOf = (userId: string) => userNameMap?.get(userId)
  const nodeMap = new Map<string, AggregateNode>()
  const edgeMap = new Map<string, AggregateEdge>()
  const userIds = new Set<string>()

  for (const sessionData of sessions) {
    const ctx: SessionContext = {
      sessionId: sessionData.session_id,
      userId: sessionData.user_id ?? 'unknown',
      title: sessionData.input?.slice(0, 100) ?? sessionData.session_id,
      status: sessionData.status ?? 'unknown',
      createdAt: sessionData.created_at ?? new Date().toISOString()
    }
    userIds.add(ctx.userId)

    const events = (sessionData.trace ?? []) as AgentStreamEvent[]
    if (events.length === 0) continue

    const sessionModel = buildTraceModel(events)
    const nodeKeyMap = new Map<string, string>()

    for (const node of sessionModel.nodes) {
      const key = nodeIdentityKey(node)
      nodeKeyMap.set(node.id, key)

      const existing = nodeMap.get(key)
      if (existing) {
        existing.invocationCount += node.invocationCount
        existing.sessionCount += 1
        if (node.lastSeenAt > existing.lastSeenAt) existing.lastSeenAt = node.lastSeenAt
        if (node.firstSeenAt < existing.firstSeenAt) existing.firstSeenAt = node.firstSeenAt
        existing.totalDurationMs += node.totalDurationMs
        existing.status = mergeNodeStatus(existing.status, node.status)

        const userEntry = existing.users.find(u => u.userId === ctx.userId)
        if (userEntry) {
          userEntry.invocationCount += node.invocationCount
          userEntry.sessionCount += 1
          if (node.lastSeenAt > userEntry.lastSeenAt) userEntry.lastSeenAt = node.lastSeenAt
        } else {
          existing.users.push({
            userId: ctx.userId,
            displayName: nameOf(ctx.userId),
            sessionCount: 1,
            invocationCount: node.invocationCount,
            lastSeenAt: node.lastSeenAt
          })
        }

        if (!existing.sessions.some(s => s.sessionId === ctx.sessionId)) {
          existing.sessions.push({
            sessionId: ctx.sessionId,
            title: ctx.title,
            status: ctx.status,
            userId: ctx.userId,
            createdAt: ctx.createdAt,
            invocationCount: node.invocationCount
          })
        }
      } else {
        nodeMap.set(key, {
          ...node,
          id: key,
          sessionCount: 1,
          users: [
            {
              userId: ctx.userId,
              displayName: nameOf(ctx.userId),
              sessionCount: 1,
              invocationCount: node.invocationCount,
              lastSeenAt: node.lastSeenAt
            }
          ],
          sessions: [
            {
              sessionId: ctx.sessionId,
              title: ctx.title,
              status: ctx.status,
              userId: ctx.userId,
              createdAt: ctx.createdAt,
              invocationCount: node.invocationCount
            }
          ]
        })
      }
    }

    for (const edge of sessionModel.edges) {
      const key = edgeIdentityKey(edge, nodeKeyMap)
      const mappedSource = nodeKeyMap.get(edge.source) ?? edge.source
      const mappedTarget = nodeKeyMap.get(edge.target) ?? edge.target

      const existing = edgeMap.get(key)
      if (existing) {
        existing.invocationCount += 1
        existing.sessionCount += 1
        if (edge.timestamp > existing.lastSeenAt) existing.lastSeenAt = edge.timestamp
        // If any contributing session has an unresolved edge, keep the
        // aggregate edge unresolved so live/company views can show traffic on
        // that path. A completed historical call should not mask a currently
        // running call for the same source/target/kind.
        if (!edge.resolvedAt) {
          delete existing.resolvedAt
        } else if (existing.resolvedAt && edge.resolvedAt > existing.resolvedAt) {
          existing.resolvedAt = edge.resolvedAt
        }
        if (!existing.sampleSessionIds.includes(ctx.sessionId)) {
          existing.sampleSessionIds.push(ctx.sessionId)
        }
        const userEntry = existing.users.find(u => u.userId === ctx.userId)
        if (userEntry) {
          userEntry.invocationCount += 1
          if (edge.timestamp > userEntry.lastSeenAt) userEntry.lastSeenAt = edge.timestamp
        } else {
          existing.users.push({
            userId: ctx.userId,
            displayName: nameOf(ctx.userId),
            sessionCount: 1,
            invocationCount: 1,
            lastSeenAt: edge.timestamp
          })
        }
      } else {
        edgeMap.set(key, {
          ...edge,
          id: key,
          source: mappedSource,
          target: mappedTarget,
          sessionCount: 1,
          invocationCount: 1,
          lastSeenAt: edge.timestamp,
          sampleSessionIds: [ctx.sessionId],
          users: [
            {
              userId: ctx.userId,
              displayName: nameOf(ctx.userId),
              sessionCount: 1,
              invocationCount: 1,
              lastSeenAt: edge.timestamp
            }
          ]
        })
      }
    }
  }

  const nodes = [...nodeMap.values()]
  const edges = [...edgeMap.values()]

  return {
    nodes,
    edges,
    frames: [],
    decisions: [],
    summary: {
      eventCount: sessions.reduce((sum, s) => sum + ((s.trace as unknown[])?.length ?? 0), 0),
      participantCount: nodes.length - 1,
      subagentCount: nodes.filter(n => n.kind === 'subagent').length,
      expertCount: nodes.filter(n => n.kind === 'expert').length,
      toolCallCount: edges.filter(e => e.kind === 'tool_call').length,
      skillLoadCount: edges.filter(e => e.kind === 'skill_load').length,
      decisionCount: 0,
      durationMs: 0,
      terminalStatus: undefined,
      costSummary: null
    },
    startedAt: null,
    endedAt: null,
    totalSessions: sessions.length,
    totalUsers: userIds.size
  }
}

export function buildAggregateStats(
  model: AggregateTraceModel,
  sessions?: { session_id: string; input?: string; status?: string; user_id?: string }[]
): AggregateStats {
  const agents = model.nodes.filter(n => n.kind === 'subagent' || n.kind === 'expert' || n.kind === 'orchestrator')
  const skills = model.nodes.filter(n => n.kind === 'skill')
  const tools = model.nodes.filter(n => n.kind === 'tool')

  const sortByInvocations = (a: { invocationCount: number }, b: { invocationCount: number }) =>
    b.invocationCount - a.invocationCount

  // Derive recent users from the aggregate node provenance data
  const userMap = new Map<string, { userId: string; displayName?: string; sessionCount: number }>()
  for (const node of model.nodes) {
    for (const user of node.users) {
      const existing = userMap.get(user.userId)
      if (existing) {
        existing.sessionCount = Math.max(existing.sessionCount, user.sessionCount)
      } else {
        userMap.set(user.userId, {
          userId: user.userId,
          displayName: user.displayName,
          sessionCount: user.sessionCount
        })
      }
    }
  }
  const recentUsers = [...userMap.values()].sort((a, b) => b.sessionCount - a.sessionCount).slice(0, 10)

  // Derive recent sessions from passed sessions array or from node sessions
  let recentSessions: { sessionId: string; title: string; status: string }[] = []
  if (sessions && sessions.length > 0) {
    recentSessions = sessions.slice(0, 10).map(s => ({
      sessionId: s.session_id,
      title: s.input?.slice(0, 80) ?? s.session_id,
      status: s.status ?? 'unknown'
    }))
  } else {
    const sessionSet = new Map<string, { sessionId: string; title: string; status: string }>()
    for (const node of model.nodes) {
      for (const sess of node.sessions) {
        if (!sessionSet.has(sess.sessionId)) {
          sessionSet.set(sess.sessionId, { sessionId: sess.sessionId, title: sess.title, status: sess.status })
        }
      }
    }
    recentSessions = [...sessionSet.values()].slice(0, 10)
  }

  return {
    agentCount: agents.length,
    toolCount: tools.length,
    skillCount: skills.length,
    sessionCount: model.totalSessions,
    userCount: model.totalUsers,
    topAgents: agents
      .sort(sortByInvocations)
      .slice(0, 5)
      .map(n => ({ id: n.id, label: n.label, invocationCount: n.invocationCount })),
    topSkills: skills
      .sort(sortByInvocations)
      .slice(0, 5)
      .map(n => ({ id: n.id, label: n.label, invocationCount: n.invocationCount })),
    topTools: tools
      .sort(sortByInvocations)
      .slice(0, 5)
      .map(n => ({ id: n.id, label: n.label, invocationCount: n.invocationCount })),
    recentUsers,
    recentSessions
  }
}
