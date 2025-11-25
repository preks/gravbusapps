import { type Document, DocumentFields, createDocumentDescriptors } from '@/common/data/relations/types/documentTypes'
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

export interface CustomerDocument extends Document {
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

export type CustomerDocumentFieldName = (typeof CustomerDocumentFields)[keyof typeof CustomerDocumentFields]

/**
 * Customer Document Descriptors
 * Uses createDocumentDescriptors with CustomerDocumentFields mapping
 */
export const CUSTOMER_DOCUMENT_DESCRIPTORS: Descriptor[] = [
  ...createDocumentDescriptors(CustomerDocumentFields as Record<keyof typeof DocumentFields, string>)
]
