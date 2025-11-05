/**
 * Common Document Types
 * Defines the CORRECT, target Document structure
 */

import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'

/**
 * Common Document Interface
 * The CORRECT target structure - how ALL Documents SHOULD be structured after integration
 * Extended by BaseCustomerDocument and BaseInvestmentDocument
 */
export interface CommonDocument extends BaseEntity {
  id: string
  source?: string
  folder?: boolean
  name?: string
  description?: string
  fileInfo?: any // JSON data

  // Deprecated fields (kept for backward compatibility)
  file?: string
  fileSize?: number
  mimeType?: string

  // Verification fields
  verified?: boolean
  verificationDate?: string
  authenticated?: boolean
  authenticationDate?: string
  mandatory?: boolean
  expirationDate?: string

  // Catalog References
  documentGroup?: CatalogEntry
  documentGroupRef?: string
  documentType?: CatalogEntry
  documentTypeRef?: string

  // Parent document reference (for folder structure)
  parentDocumentId?: string
  parentDocument?: any
  // Child documents reference (for folder structure)
  childDocuments?: any[]

  // Entity references - forward declarations to avoid circular imports
  accountId?: string
  account?: any // CommonAccount
  contactId?: string
  contact?: any // CommonContact
  leadId?: string
  lead?: any // CommonLead
  opportunityId?: string
  opportunity?: any // CommonOpportunity
  activityId?: string
  activity?: any // CommonActivity
  taskId?: string
  task?: any // CommonTask
  noteId?: string
  note?: any // CommonNote
}
