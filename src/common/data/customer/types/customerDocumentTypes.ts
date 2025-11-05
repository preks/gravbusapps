/**
 * Customer Document Types
 */

import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'

/**
 * CustomerDocument
 * Document entity for CRM (crm_document table)
 */
export interface CustomerDocument extends BaseEntity {
  id: string
  name?: string
  description?: string
  file?: string
  fileSize?: number
  mimeType?: string
  verified?: boolean
  verificationDate?: string
  authenticated?: boolean
  authenticationDate?: string
  mandatory?: boolean
  expirationDate?: string

  // Catalog references
  documentGroup?: CatalogEntry
  documentGroupRef?: string
  documentType?: CatalogEntry
  documentTypeRef?: string

  // Entity references
  activity?: any // CustomerActivity
  activityId?: string
  task?: any // CustomerTask
  taskId?: string
  account?: any // CustomerAccount
  accountId?: string
  contact?: any // CustomerContact
  contactId?: string
  opportunity?: any // CustomerOpportunity
  opportunityId?: string
  lead?: any // CustomerLead
  leadId?: string
}
