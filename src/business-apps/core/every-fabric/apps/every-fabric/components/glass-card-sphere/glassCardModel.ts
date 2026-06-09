// Card model + status palette for the reusable 3D glass card sphere.
//
// This is the generic shape the 3D cards render, shared by the workforce
// overview and the company agent mesh. The hex colours here are Three.js
// scene/material colours and drei <Text> colours, not UI tokens, so the
// design-system token rules do not apply - the HTML fallback grid uses
// Tailwind tokens instead.

// Live "running" always wins; the rest carry a real state plus the occasional
// simulated Renewing/Trial flair some consumers layer on for visual variety.
export type GlassCardStatus = 'running' | 'active' | 'paused' | 'renewing' | 'trial'

export interface GlassCardStatusStyle {
  label: string
  // Neon accent used for the card border glow and icon (great on dark glass).
  accent: string
  // Darker, saturated accent for status text on light backgrounds (readable).
  accentStrong: string
  // Tailwind classes for the HTML fallback grid (design-system tokens).
  fallbackClass: string
}

const STATUS_STYLES: Record<GlassCardStatus, GlassCardStatusStyle> = {
  running: {
    label: 'Running',
    accent: '#34d399',
    accentStrong: '#059669',
    fallbackClass: 'gba:bg-emerald-50 gba:text-emerald-700'
  },
  active: {
    label: 'Active',
    accent: '#22c55e',
    accentStrong: '#16a34a',
    fallbackClass: 'gba:bg-emerald-50 gba:text-emerald-700'
  },
  renewing: {
    label: 'Renewing',
    accent: '#a78bfa',
    accentStrong: '#7c3aed',
    fallbackClass: 'gba:bg-violet-50 gba:text-violet-700'
  },
  trial: {
    label: 'Trial',
    accent: '#22d3ee',
    accentStrong: '#0891b2',
    fallbackClass: 'gba:bg-cyan-50 gba:text-cyan-700'
  },
  paused: {
    label: 'Paused',
    accent: '#f59e0b',
    accentStrong: '#d97706',
    fallbackClass: 'gba:bg-amber-50 gba:text-amber-700'
  }
}

export function cardStatusStyle(status: GlassCardStatus): GlassCardStatusStyle {
  return STATUS_STYLES[status]
}

export interface GlassCardModel {
  id: string
  title: string
  subtitle: string
  initials: string
  // Big headline number already formatted by the caller (e.g. "42", "1.2k").
  value: string
  // Caption under the headline number (e.g. "credits / month", "invocations").
  valueUnit: string
  status: GlassCardStatus
}
