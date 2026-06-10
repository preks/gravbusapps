// Company agent mesh derivation for the shared 3D glass card sphere.
//
// Maps the aggregate "top agents" into glass cards (value = invocation count,
// status = Running when the agent is live, otherwise Active) and rolls the mesh
// counts up into the distant background KPI tiles.

import type { GlassCardModel } from '../glass-card-sphere/glassCardModel'
import { compactNumber, type ValueKpiTile } from '../glass-card-sphere/kpiModel'
import type { AggregateStats } from '../../utils/meshAggregateModel'
import type { MeshLiveActivityState } from './liveMeshActivity'

// Keep the cluster legible and the frame budget bounded.
const MAX_CARDS = 9

// Two-letter initials for the avatar chip, derived from the agent label.
function resolveInitials(label: string): string {
  const parts = label.replace(/[_-]/g, ' ').split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return label.slice(0, 2).toUpperCase()
}

// An agent reads as "running" when the live feed carries an entry for its node
// id, or (the active-session feed keys nodes by label rather than id) when a
// live entry's label matches the agent label.
function isAgentLive(id: string, label: string, live: MeshLiveActivityState): boolean {
  if (live.nodeActivityById.has(id)) return true
  const target = label.toLowerCase().trim()
  for (const activity of live.nodeActivityById.values()) {
    if (activity.activityLabel?.toLowerCase().trim() === target) return true
  }
  return false
}

export function buildMeshAgentCards(stats: AggregateStats, live: MeshLiveActivityState): GlassCardModel[] {
  return stats.topAgents.slice(0, MAX_CARDS).map(agent => ({
    id: agent.id,
    title: agent.label,
    subtitle: 'Company agent',
    initials: resolveInitials(agent.label),
    value: compactNumber(agent.invocationCount),
    valueUnit: 'invocations',
    status: isAgentLive(agent.id, agent.label, live) ? 'running' : 'active'
  }))
}

export function buildMeshKpis(stats: AggregateStats): ValueKpiTile[] {
  return [
    { id: 'agents', value: compactNumber(stats.agentCount), label: 'Agents' },
    { id: 'tools', value: compactNumber(stats.toolCount), label: 'Tools' },
    { id: 'sessions', value: compactNumber(stats.sessionCount), label: 'Sessions' },
    { id: 'users', value: compactNumber(stats.userCount), label: 'Users' }
  ]
}
