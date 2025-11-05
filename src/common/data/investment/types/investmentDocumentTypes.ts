/**
 * Investment Document Types
 */

import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { SourceTable } from './investmentEnums'

/**
 * InvestmentDocument
 * Document entity for IRM
 */
export interface InvestmentDocument extends BaseEntity {
  id: string
  source?: SourceTable
  folder?: boolean
  name?: string
  description?: string
  file?: string
  fileInfo?: any // JSONB field containing file metadata
  fileSize?: number
  mimeType?: string
  verified?: boolean
  verificationDate?: string
  authenticated?: boolean
  authenticationDate?: string
  mandatory?: boolean
  expirationDate?: string
  version: number

  // Catalog references
  documentGroup?: CatalogEntry
  documentGroupRef?: string
  documentType?: CatalogEntry
  documentTypeRef?: string

  // Entity references
  parentDocument?: InvestmentDocument
  parentDocumentId?: string
  activity?: any // InvestmentActivity
  activityId?: string
  task?: any // InvestmentTask
  taskId?: string
  account?: any // InvestmentAccount
  accountId?: string
  contact?: any // InvestmentContact
  contactId?: string
  opportunity?: any // InvestmentOpportunity
  opportunityId?: string
  lead?: any // InvestmentLead
  leadId?: string
  investment?: any // Investment
  investmentId?: string
}
