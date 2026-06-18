import type { DueUnit } from '../../config-panels/decision/decisionConfigUtils'
import { MINUTES_PER, deriveTimeUnit } from '../../config-panels/decision/decisionConfigUtils'

export type { DueUnit }
export { MINUTES_PER, deriveTimeUnit }

export function dueAmountDisplayValue(minutes: number | undefined, unit: DueUnit): string {
  const mins = Number(minutes || 0)
  if (!mins) return ''
  const per = MINUTES_PER[unit]
  const val = Math.round(mins / per)
  return String(val > 0 ? val : '')
}

export function parseDueAmountToMinutes(raw: string, unit: DueUnit): number | undefined {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return undefined
  const n = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(n) || n <= 0) return undefined
  return n * MINUTES_PER[unit]
}
