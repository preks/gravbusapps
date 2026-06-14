/**
 * Customer360 data contracts (FROZEN in Phase 0).
 *
 * These types define the full aggregation surface for the Customer360 app.
 * Downstream phase workers should ONLY fill in implementations behind the
 * per-domain hooks and the `useCustomer360` orchestrator — they must NOT
 * reshape these types. Add new optional fields if a slice needs more data.
 */

import type { CustomerAccount } from '@/common/data/customer/types/customerAccountTypes'
import type { CrmCustomFeedbackSurveyResult } from './record/crmCustomFeedbackClient'
import type { CustomerSupportLifecycleType } from './network/customerFlowClient'

/** Normalized customer account subject for the Customer 360 record surface. */
export interface Customer360Subject {
  id: string
  type: 'account'
  displayName: string
  status?: string
  ownerId?: string
  account: CustomerAccount
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
  surveyResults?: CrmCustomFeedbackSurveyResult[]
}

/** File-service handle used for document preview / download. */
export interface CustomerFileRef {
  path: string
  fileMetadata?: { mimeType?: string }
}

/** Contract document slice. */
export interface CustomerContract {
  id: string
  assignmentId?: string
  spaceId?: string
  assetType?: 'document' | 'drive_file' | 'spreadsheet_app' | 'slide' | 'whiteboard' | 'note'
  assetId?: string
  name?: string
  status?: string
  startDate?: string
  endDate?: string
  effectiveDate?: string
  signedDate?: string
  expiryDate?: string
  renewalDate?: string
  reminderDeadlineDate?: string
  terminationDate?: string
  contractNumber?: string
  contractType?: string
  noticePeriodDays?: number
  contractMetadataId?: string
  updatedAt?: string
  nextReminder?: {
    id?: string
    dueDate?: string
    label?: string
  }
  documentId?: string
  documentType?: string
  mimeType?: string | null
  fileSize?: number | null
  createdAt?: string
  /** Legacy file-service handle; contracts now prefer document-service asset refs. */
  fileInfo?: CustomerFileRef | null
}

/** Customer Support ticket surfaced from Services-owned workflow instances. */
export interface CustomerTicket {
  id: string
  title?: string
  status?: string
  priority?: string
  createdAt?: string
  lifecycleType?: CustomerSupportLifecycleType
}

/** Customer Support case surfaced from Services-owned workflow instances. */
export interface CustomerCase {
  id: string
  title?: string
  status?: string
  type?: string
  createdAt?: string
  lifecycleType?: CustomerSupportLifecycleType
}

/** Customer Support reclamation surfaced from Services-owned workflow instances. */
export interface CustomerReclamation {
  id: string
  title?: string
  status?: string
  createdAt?: string
  lifecycleType?: CustomerSupportLifecycleType
}

/** Invoice snapshot sourced from Finance Billing / BLNK. */
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

/** Transaction snapshot sourced from Finance Billing / BLNK. */
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
