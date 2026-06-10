/**
 * Customer360 portfolio data contracts (Home product surface).
 *
 * The portfolio layer unifies CRM Accounts and Contacts into a single
 * book-of-business view with per-customer health summaries. Health metrics
 * (CSAT, open tickets, overdue amounts, contracts) are sourced from the
 * planned `customer-summary-list` aggregation endpoint. Until that backend
 * lands, `useCustomerPortfolio` fills a *provisional* summary derived only
 * from real CRM fields (owner assignment, prospective flag) — never fabricated
 * counts — and flags it via `provisional: true` so the UI can disclose it.
 */

import type { CustomerSubjectType } from '../types'

/** Reason codes contributing to a customer's attention score. UI translates them. */
export type AttentionReasonCode =
  | 'low-csat'
  | 'open-reclamation'
  | 'overdue-invoice'
  | 'expiring-contract'
  | 'open-tickets'
  | 'no-owner'
  | 'prospective'

/** Per-customer health summary. All fields optional — partial data renders fine. */
export interface CustomerPortfolioSummary {
  /** Composite health 0–100 (higher = healthier), if known. */
  health?: number
  csat?: number
  aiScore?: number
  openTickets?: number
  openReclamations?: number
  overdueAmount?: number
  activeContracts?: number
  expiringContracts?: number
  currency?: string
  /**
   * True when these numbers are heuristics derived from CRM fields rather than
   * real service aggregation. The UI discloses this to the user.
   */
  provisional?: boolean
}

/** A single customer (account or contact) in the portfolio. */
export interface CustomerPortfolioRow {
  id: string
  type: CustomerSubjectType
  displayName: string
  secondary?: string
  /** Primary email address (from communication channels), if known. */
  email?: string
  /** Primary phone/mobile number (from communication channels), if known. */
  phone?: string
  ownerId?: string
  /** Normalized lifecycle status, e.g. 'active' | 'prospective'. */
  status?: string
  summary: CustomerPortfolioSummary
  /** Computed 0–100 (higher = needs more attention). */
  attentionScore: number
  /** Ordered reason codes explaining the attention score. */
  attentionReasons: AttentionReasonCode[]
}

/** Aggregate portfolio KPIs for the cockpit. */
export interface CustomerPortfolioStats {
  totalCustomers: number
  totalAccounts: number
  totalContacts: number
  /** Rows at/above the attention threshold. */
  needsAttention: number
  unassigned: number
  avgCsat?: number
  openTickets?: number
  overdueTotal?: number
  currency?: string
  /** True when health metrics are heuristic placeholders. */
  provisional: boolean
}

export interface UseCustomerPortfolioResult {
  rows: CustomerPortfolioRow[]
  stats: CustomerPortfolioStats
  loading: boolean
  error: string | null
  refetch: () => void
  /** True when summaries are heuristic (no backend aggregation yet). */
  provisional: boolean
}

/** Rows scoring at/above this threshold are surfaced on the attention worklist. */
export const ATTENTION_THRESHOLD = 40
