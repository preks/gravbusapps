/**
 * Customer360 data contracts (FROZEN in Phase 0).
 *
 * These types define the full aggregation surface for the Customer360 app.
 * Downstream phase workers should ONLY fill in implementations behind the
 * per-domain hooks and the `useCustomer360` orchestrator — they must NOT
 * reshape these types. Add new optional fields if a slice needs more data.
 */

import type { CustomerAccount } from '@/common/data/customer/types/customerAccountTypes'
import type { CustomerContact } from '@/common/data/customer/types/customerContactTypes'

/** Polymorphic customer subject kind, driven by the `?type=` URL param. */
export type CustomerSubjectType = 'account' | 'contact'

/**
 * Normalized customer subject. Both `account` and `contact` raw refs are kept
 * so feature tabs can read domain-specific fields without re-fetching.
 */
export interface Customer360Subject {
  id: string
  type: CustomerSubjectType
  displayName: string
  status?: string
  ownerId?: string
  /** Present when `type === 'account'`. */
  account?: CustomerAccount
  /** Present when `type === 'contact'`. */
  contact?: CustomerContact
}

/** Generic per-domain hook result. All domain hooks share this shape. */
export interface DomainHookResult<TData> {
  data: TData
  loading: boolean
  error: string | null
}

/** Scoring slice (ICP / AI scoring). */
export interface CustomerScores {
  icpScore?: number
  aiScore?: number
  scoreLabel?: string
}

/** Satisfaction slice (CSAT / NPS). */
export interface CustomerSatisfaction {
  csat?: number
  nps?: number
  lastSurveyDate?: string
}

/** File-service handle used for document preview / download. */
export interface CustomerFileRef {
  path: string
  fileMetadata?: { mimeType?: string }
}

/** Contract document slice. */
export interface CustomerContract {
  id: string
  name?: string
  status?: string
  startDate?: string
  endDate?: string
  documentId?: string
  /** Phase 2 extensions: derived from the underlying CrmDocument. */
  documentType?: string
  mimeType?: string | null
  fileSize?: number | null
  createdAt?: string
  /** Present when the binary can be previewed/downloaded via the file service. */
  fileInfo?: CustomerFileRef | null
}

/** Service ticket (custom-flow-engine flow instance). */
export interface CustomerTicket {
  id: string
  title?: string
  status?: string
  priority?: string
  createdAt?: string
}

/** Service case (flow-engine Cases module grouping). */
export interface CustomerCase {
  id: string
  title?: string
  status?: string
  type?: string
  createdAt?: string
}

/** Reclamation / complaint (dedicated case type). */
export interface CustomerReclamation {
  id: string
  title?: string
  status?: string
  createdAt?: string
}

/** Invoice (NewWork Connect / Fibu). */
export interface CustomerInvoice {
  id: string
  number?: string
  status?: string
  amount?: number
  currency?: string
  issuedDate?: string
  dueDate?: string
}

/** Aggregated balance / financial KPIs. */
export interface CustomerBalance {
  openAmount?: number
  overdueAmount?: number
  lifetimeValue?: number
  currency?: string
}

/** Transaction (NewWork Connect / Fibu). */
export interface CustomerTransaction {
  id: string
  description?: string
  amount?: number
  currency?: string
  date?: string
  direction?: 'debit' | 'credit'
}

/** Unified journal / timeline entry. */
export interface CustomerJournalEntry {
  id: string
  type?: string
  title?: string
  summary?: string
  timestamp?: string
  source?: string
}

/**
 * Full normalized Customer360 snapshot. Every slice is optional so the UI and
 * the agent's `getCustomer360` provider tool can render partial data while
 * individual domains are still being implemented.
 */
export interface Customer360Snapshot {
  scores?: CustomerScores
  satisfaction?: CustomerSatisfaction
  contracts?: CustomerContract[]
  tickets?: CustomerTicket[]
  cases?: CustomerCase[]
  reclamations?: CustomerReclamation[]
  invoices?: CustomerInvoice[]
  balance?: CustomerBalance
  transactions?: CustomerTransaction[]
  journal?: CustomerJournalEntry[]
}
