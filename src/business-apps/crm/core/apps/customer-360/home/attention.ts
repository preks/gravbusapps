/**
 * UI helpers for rendering attention scores and reasons across the Home views.
 */

import type { BadgeProps } from '@newwork/nw-design-system'
import type { AttentionReasonCode } from '../data/portfolio/types'

export type AttentionBand = 'high' | 'medium' | 'low'

/** Map an attention reason code to its i18n message id. */
export const ATTENTION_REASON_KEYS: Record<AttentionReasonCode, string> = {
  'low-csat': 'attention-reason-low-csat',
  'open-reclamation': 'attention-reason-open-reclamation',
  'overdue-invoice': 'attention-reason-overdue-invoice',
  'expiring-contract': 'attention-reason-expiring-contract',
  'open-tickets': 'attention-reason-open-tickets',
  'no-owner': 'attention-reason-no-owner',
  prospective: 'attention-reason-prospective'
}

export function attentionBand(score: number): AttentionBand {
  if (score >= 70) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

export function attentionBadgeVariant(score: number): NonNullable<BadgeProps['variant']> {
  const band = attentionBand(score)
  if (band === 'high') return 'destructive'
  if (band === 'medium') return 'warning'
  return 'success'
}
