/**
 * Shared fallback options and variant mapping for pipeline stage types.
 * Used when the stage type catalog is unavailable or for unknown type codes.
 */

export type StageTypeBadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning'
  | 'info'
  | 'offline'

export const FALLBACK_STAGE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'DISCOVERY', label: 'Discovery' },
  { value: 'QUALIFICATION', label: 'Qualification' },
  { value: 'NEGOTIATION', label: 'Negotiation' },
  { value: 'CLOSED_WON', label: 'Closed Won' },
  { value: 'CLOSED_LOST', label: 'Closed Lost' }
]

export const FALLBACK_STAGE_TYPE_VARIANT_MAP: Record<string, StageTypeBadgeVariant> = {
  DISCOVERY: 'offline',
  QUALIFICATION: 'info',
  NEGOTIATION: 'warning',
  CLOSED_WON: 'success',
  CLOSED_LOST: 'destructive'
}

/**
 * Returns the Badge variant for a pipeline stage type code.
 * Unknown or missing codes return 'outline'.
 */
export function getStageTypeVariant(code: string | undefined): StageTypeBadgeVariant {
  if (!code) return 'outline'
  const normalized = code.toUpperCase().trim()
  return FALLBACK_STAGE_TYPE_VARIANT_MAP[normalized] ?? 'outline'
}
