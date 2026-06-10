// Shared presentation helpers for workforce agents.
//
// These are the small, pure formatting/derivation helpers that both the
// classic WorkforceAgentTile and the Agent Deck rely on, so avatar accents,
// initials, status pills, and relative timestamps stay identical across every
// surface that renders an agent.

import { formatDateOnly } from './runDisplay'

export type WorkforceTileStatus = 'active' | 'paused'

/** Humanises a raw agent name (snake/kebab -> Title Case). */
export function formatAgentName(name: string): string {
  return name.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/** Two-letter initials for the avatar block. */
export function resolveInitials(displayName: string): string {
  const parts = displayName.replace(/[_-]/g, ' ').split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return displayName.slice(0, 2).toUpperCase()
}

// Deterministic avatar accent from DS semantic tokens (no hardcoded hex / no
// inline styles). Hashing the agent id keeps the colour stable per agent while
// staying within the design system palette.
export const AVATAR_ACCENTS = [
  'gba:bg-primary gba:text-primary-foreground',
  'gba:bg-secondary gba:text-secondary-foreground',
  'gba:bg-accent gba:text-accent-foreground'
] as const

export function avatarAccent(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return AVATAR_ACCENTS[Math.abs(hash) % AVATAR_ACCENTS.length]
}

export function statusPill(status: WorkforceTileStatus): { label: string; className: string } {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        className: 'gba:bg-emerald-50 gba:text-emerald-700'
      }
    case 'paused':
      return {
        label: 'Paused',
        className: 'gba:bg-amber-50 gba:text-amber-700'
      }
  }
}

/** Human-friendly "x minutes/hours/days ago" relative timestamp. */
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return 'No runs yet'
  const ts = Date.parse(iso)
  if (Number.isNaN(ts)) return 'No runs yet'
  const diffMs = Date.now() - ts
  const minutes = Math.round(diffMs / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDateOnly(iso)
}
