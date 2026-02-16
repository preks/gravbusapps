/**
 * Shared content type colors for Desk (Activity chart, Recent items, stat cards).
 * Uses design system chart tokens for consistency.
 */
export const DESK_TYPE_COLORS = [
  'var(--nw-chart-1)', // documents
  'var(--nw-chart-2)', // spreadsheets
  'var(--nw-chart-3)', // notes
  'var(--nw-chart-4)' // slides
] as const

export const DESK_TYPE_COLOR_MAP = {
  document: DESK_TYPE_COLORS[0],
  spreadsheet: DESK_TYPE_COLORS[1],
  note: DESK_TYPE_COLORS[2],
  slide: DESK_TYPE_COLORS[3]
} as const
