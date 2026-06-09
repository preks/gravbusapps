/**
 * Field extraction for inbound runs — sender / subject.
 *
 * Inbound runs carry the original email either as a structured
 * `trigger_payload` (preferred) or only embedded in the run input text
 * (`Inbound email from <addr>` / `Subject: <subject>`), depending on how the
 * forwarder dispatched them. These helpers normalize both shapes so the
 * stream table and the view-time customer matcher read the same values.
 */
import type { WorkforceRun } from '@/business-apps/core/every-fabric/apps/every-fabric/components/enterprise-workforce/workforceTypes'

export function readTriggerField(run: WorkforceRun, field: string): string {
  const payload = run.trigger_payload
  if (payload && typeof payload === 'object') {
    const value = (payload as Record<string, unknown>)[field]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

export function readInputMeta(run: WorkforceRun, field: 'from' | 'subject'): string {
  const input = run.input
  if (!input) return ''
  if (field === 'from') {
    const match = input.match(/from[:\s]+([^\s<>"']+@[^\s<>"']+)/i)
    return match ? match[1].trim() : ''
  }
  const match = input.match(/^\s*subject[:\s]+(.+)$/im)
  return match ? match[1].trim() : ''
}

/** The sender email address of an inbound run, or '' when unknown. */
export function readSenderEmail(run: WorkforceRun): string {
  const raw = readTriggerField(run, 'from') || readInputMeta(run, 'from')
  if (!raw) return ''
  // Trigger payloads may carry "Display Name <addr@domain>" — extract the address.
  const angled = raw.match(/<([^<>\s]+@[^<>\s]+)>/)
  const email = angled ? angled[1] : raw
  return email.includes('@') ? email.trim().toLowerCase() : ''
}
