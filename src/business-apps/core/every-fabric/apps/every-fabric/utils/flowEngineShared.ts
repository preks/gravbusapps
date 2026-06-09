// Shared Custom Flow Engine helpers used by the workforce flow hooks
// (useLiveFlowProgress, useFlowDetail, useFlowGanttData). Centralises request
// base normalisation, the terminal-status set, defensive payload unwrapping,
// and primitive coercions so the polling hooks don't each re-declare them.

import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'

// Strip trailing slashes from a configured API base so `${base}/flows/...`
// never produces a double slash.
export const normalizeApiBase = (value: string): string => {
  let result = value.trim()
  while (result.length > 0 && result.charAt(result.length - 1) === '/') {
    result = result.slice(0, -1)
  }
  return result
}

// Resolved Flow Engine base URL, trailing slashes removed.
export function flowEngineApiBase(): string {
  return normalizeApiBase(CUSTOM_FLOW_ENGINE_API_URL)
}

const TERMINAL_CODES: ReadonlySet<string> = new Set([
  'COMPLETED',
  'FAILED',
  'REJECTED',
  'CANCELED',
  'CANCELLED',
  'TERMINATED',
  'TIMED_OUT'
])

// Whether a flow status code is terminal (polling can stop). Accepts the
// nullable shapes the callers carry without each guarding first.
export function isTerminalFlowStatus(code: string | undefined | null): boolean {
  if (!code) return false
  return TERMINAL_CODES.has(code.toUpperCase())
}

// Step states recognised as "currently active", in priority order — an
// in-progress task beats a merely open/scheduled one. Mirrors the active
// states the Services+ ConductorWorkflowEngineAdapter recognises.
export const ACTIVE_STEP_STATES: readonly string[] = [
  'IN_PROGRESS',
  'CLAIMED',
  'OPEN',
  'AVAILABLE',
  'SCHEDULED',
  'QUEUED',
  'PENDING'
]

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

export function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

// The engine sometimes wraps payloads under `data` and/or `flow`; unwrap
// defensively so the same parser works across environments.
export function unwrapFlow(body: unknown): Record<string, unknown> | null {
  if (!isRecord(body)) return null
  const data = isRecord(body.data) ? body.data : body
  const flow = isRecord(data.flow) ? data.flow : data
  return isRecord(flow) ? flow : null
}
