import type { CommonDocument } from '@/common/data/relations/types/commonDocumentTypes'
import { COMMON_DOCUMENT_DESCRIPTORS } from '@/common/data/relations/types/commonDocumentTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { SourceTable } from './customerEnums'
import type {
  CustomerAccount,
  CustomerActivity,
  CustomerLead,
  CustomerNote,
  CustomerOpportunity,
  CustomerTask
} from './'

export interface CustomerDocument extends CommonDocument {
  account?: CustomerAccount
  activity?: CustomerActivity // Mapped by salesActivity
  childDocuments?: CustomerDocument[]
  note?: CustomerNote
  opportunity?: CustomerOpportunity
  lead?: CustomerLead
  parentDocument?: CustomerDocument
  source?: SourceTable
  task?: CustomerTask // Mapped by salesTask

  // Base fields for mapping
  salesActivity?: CustomerActivity // Mapped to activity
  salesActivityId?: string // Mapped to activityId
  salesTask?: CustomerTask // Mapped to task
  salesTaskId?: string // Mapped to taskId
}

/**
 * Customer Document Descriptors
 * CRM uses correct field names, so we use Common descriptors directly
 */
export const CUSTOMER_DOCUMENT_DESCRIPTORS: Descriptor[] = [...COMMON_DOCUMENT_DESCRIPTORS]
