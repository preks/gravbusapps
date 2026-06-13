import React from 'react'

/**
 * Per-type accent used by object cards (documents, slides, workflows, …) so a
 * glance distinguishes a spreadsheet from a deck from a flow. People entities
 * keep the round `AvatarWithInitials`; objects get this rounded-square tile.
 *
 * Tokens are intentionally calm (100/600 pairs) to match the premium
 * light-surface references rail — no neon, no glow.
 */
export type IconTileAccent = 'blue' | 'emerald' | 'rose' | 'amber' | 'violet' | 'sky' | 'indigo' | 'slate' | 'teal'

const ACCENT_CLASSES: Record<IconTileAccent, string> = {
  blue: 'gba:bg-blue-100 gba:text-blue-600',
  emerald: 'gba:bg-emerald-100 gba:text-emerald-600',
  rose: 'gba:bg-rose-100 gba:text-rose-600',
  amber: 'gba:bg-amber-100 gba:text-amber-600',
  violet: 'gba:bg-violet-100 gba:text-violet-600',
  sky: 'gba:bg-sky-100 gba:text-sky-600',
  indigo: 'gba:bg-indigo-100 gba:text-indigo-600',
  slate: 'gba:bg-slate-100 gba:text-slate-600',
  teal: 'gba:bg-teal-100 gba:text-teal-600'
}

export interface IconTileProps {
  glyph: React.ReactNode
  accent?: IconTileAccent
  size?: number
}

export const IconTile: React.FC<IconTileProps> = ({ glyph, accent = 'slate', size = 40 }) => (
  <span
    className={`gba:inline-flex gba:items-center gba:justify-center gba:rounded-xl gba:flex-shrink-0 ${ACCENT_CLASSES[accent]}`}
    style={{ width: `${size}px`, height: `${size}px` }}
  >
    {glyph}
  </span>
)

/** Small stroked-line glyph factory matching the rest of the entity icon set. */
export const tileGlyph = (pathD: string): React.ReactNode => (
  <svg className="gba:h-5 gba:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={pathD} />
  </svg>
)

export default IconTile
