/**
 * Pure attention-scoring for the AI Attention Worklist.
 *
 * Combines a customer's health summary with lightweight row signals into a
 * single 0–100 score (higher = needs more attention) plus the ordered list of
 * reason codes that produced it. Kept dependency-free and deterministic so it
 * is trivially unit-testable and identical between UI and (future) agent use.
 */

import type { AttentionReasonCode, CustomerPortfolioSummary } from './types'

export interface AttentionSignals {
  summary: CustomerPortfolioSummary
  ownerId?: string
  status?: string
}

export interface AttentionResult {
  score: number
  reasons: AttentionReasonCode[]
}

const clamp = (value: number): number => Math.max(0, Math.min(100, Math.round(value)))

/**
 * Weighted contributions. Health (when known) sets the baseline; explicit
 * service/finance signals add on top. The result is clamped to 0–100.
 */
export function computeAttention({ summary, ownerId, status }: AttentionSignals): AttentionResult {
  const reasons: AttentionReasonCode[] = []
  let score = typeof summary.health === 'number' ? 100 - summary.health : 0

  if (typeof summary.csat === 'number' && summary.csat < 60) {
    score += 30
    reasons.push('low-csat')
  }
  if ((summary.openReclamations ?? 0) > 0) {
    score += 25
    reasons.push('open-reclamation')
  }
  if ((summary.overdueAmount ?? 0) > 0) {
    score += 20
    reasons.push('overdue-invoice')
  }
  if ((summary.expiringContracts ?? 0) > 0) {
    score += 15
    reasons.push('expiring-contract')
  }
  if ((summary.openTickets ?? 0) > 0) {
    score += 10 * Math.min(summary.openTickets ?? 0, 3)
    reasons.push('open-tickets')
  }
  if (!ownerId) {
    score += 15
    reasons.push('no-owner')
  }
  if (status === 'prospective') {
    score += 10
    reasons.push('prospective')
  }

  return { score: clamp(score), reasons }
}
