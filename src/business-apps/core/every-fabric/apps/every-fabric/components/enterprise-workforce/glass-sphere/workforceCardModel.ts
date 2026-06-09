// Workforce-specific card derivation for the 3D glass sphere.
//
// Pure derivation from a WorkforceAgentSummary into the small shape the shared
// glass cards render, plus the subtle per-card jitter the sphere ticker layers
// on top. Status palette and the generic card shape live in the shared
// glass-card-sphere module.

import type { GlassCardStatus } from '../../glass-card-sphere/glassCardModel'
import type { WorkforceAgentSummary } from '../useWorkforceData'
import { formatAgentName, resolveInitials } from '../workforceAgentDisplay'

// Re-exported so the sphere ticker can keep referring to the workforce status
// vocabulary without reaching into the shared module directly.
export type WorkforceCardStatus = GlassCardStatus

export interface WorkforceCardModel {
  id: string
  title: string
  subtitle: string
  initials: string
  // Monthly credit estimate driving the big price number.
  basePrice: number
  status: WorkforceCardStatus
}

// Stable integer hash so agents without metrics still get a varied,
// deterministic pseudo-price instead of a flat zero.
function hashSeed(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

// Credits are reported weekly; project to a rough monthly figure. Falls back to
// a stable 9-28 pseudo-price when an agent has no recorded credit usage yet.
function deriveMonthlyPrice(summary: WorkforceAgentSummary): number {
  const weekly = summary.creditsThisWeek
  if (weekly > 0) return Math.max(1, Math.round(weekly * 4.33))
  return 9 + (hashSeed(summary.agent.agent_id) % 20)
}

export function buildWorkforceCardModel(summary: WorkforceAgentSummary, isWorking: boolean): WorkforceCardModel {
  const { agent } = summary
  const profile = agent.workforce_profile
  const title = formatAgentName(agent.display_name || agent.name)
  const role = profile.role || agent.domain || 'Workforce agent'
  const subtitle = profile.department ? `${role} · ${profile.department}` : role
  const baseStatus: WorkforceCardStatus = isWorking ? 'running' : agent.status === 'paused' ? 'paused' : 'active'
  return {
    id: agent.agent_id,
    title,
    subtitle,
    initials: resolveInitials(title),
    basePrice: deriveMonthlyPrice(summary),
    status: baseStatus
  }
}

// Per-card jitter the sphere ticker layers on top: a tiny price delta and an
// optional non-destructive status flavour. Running/Paused are never overridden.
export interface WorkforceCardJitter {
  priceDelta: number
  statusOverride: WorkforceCardStatus | null
}

export function applyCardJitter(
  model: WorkforceCardModel,
  jitter: WorkforceCardJitter | undefined
): WorkforceCardModel {
  if (!jitter) return model
  const canOverride = model.status === 'active'
  return {
    ...model,
    basePrice: Math.max(1, model.basePrice + jitter.priceDelta),
    status: canOverride && jitter.statusOverride ? jitter.statusOverride : model.status
  }
}
