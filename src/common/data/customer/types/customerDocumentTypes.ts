import {
  type Document,
  DocumentFields,
  DocumentFormFields,
  createDocumentDescriptors
} from '@/common/data/relations/types/documentTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { SourceTable } from './customerEnums'
import type { CustomerAccount } from './customerAccountTypes'
import type { CustomerActivity } from './customerActivityTypes'
import type { CustomerContact } from './customerContactTypes'
import type { CustomerLead } from './customerLeadTypes'
import type { CustomerNote } from './customerNoteTypes'
import type { CustomerOpportunity } from './customerOpportunityTypes'
import type { CustomerTask } from './customerTaskTypes'

export interface CustomerDocument extends Document {
  account?: CustomerAccount
  activity?: CustomerActivity // Mapped by salesActivity
  childDocuments?: CustomerDocument[]
  contact?: CustomerContact
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
 * Customer Document Query Field Mapping
 * Extends DocumentFields with CRM-specific GraphQL field names
 */
export const CustomerDocumentFields = {
  ...DocumentFields,
  // Override CRM-specific field names
  activity: 'salesActivity',
  activityId: 'salesActivityId',
  task: 'salesTask',
  taskId: 'salesTaskId'
} as const

export const CustomerDocumentFormFields = {
  ...DocumentFormFields,
  activityId: 'salesActivity',
  taskId: 'salesTask'
}
/**
 * Customer Document Descriptors
 * Uses createDocumentDescriptors with CustomerDocumentFields mapping
 */
export const CUSTOMER_DOCUMENT_DESCRIPTORS: Descriptor[] = [
  ...createDocumentDescriptors(CustomerDocumentFields as Record<keyof typeof DocumentFields, string>)
]
