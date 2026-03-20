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

/**
 * Build Customer Document Payload Options
 */
export interface BuildCustomerDocumentPayloadOptions {
  mode: 'create' | 'update' | 'rename'
  isFolder: boolean
  isBulk: boolean
  fileInfoList?: any[]
}

/**
 * Build Customer Document Payload
 *
 * Handles document creation, update, and bulk upload payloads.
 * - For update: returns { crmDocument: {...}, changeMode: 'UPDATE' }
 * - For create single/folder: returns { crmDocuments: [{...}] }
 * - For bulk: returns { crmDocuments: [{...}, {...}, ...] }
 *
 * @param document - Partial document data from form
 * @param options - Mode, folder flag, and file info
 * @returns Formatted payload for Flow Registry
 */
export const buildCustomerDocumentPayload = (
  document: Partial<CustomerDocument> & Record<string, any>,
  options: BuildCustomerDocumentPayloadOptions
) => {
  const { mode, isBulk, fileInfoList = [] } = options
  const isUpdate = mode === 'update' || mode === 'rename'

  // Build base document fields
  const buildDocumentBase = (doc: any, fileInfo?: any) => {
    const payload: any = {
      ...(doc.id && { id: doc.id }),
      ...(doc.version !== undefined && { version: doc.version }),
      name: doc.name || '',
      description: doc.description || '',
      documentGroupRef: doc.documentGroupRef || '',
      documentTypeRef: doc.documentTypeRef || '',
      expirationDate: doc.expirationDate || null,
      parentDocument: doc.parentDocument || null
    }

    // Add file info if present
    if (fileInfo?.fileInfo) {
      payload.fileInfo = fileInfo.fileInfo
      payload.file = fileInfo.fileInfo.fileId
      payload.fileSize = fileInfo.fileInfo.fileMetadata?.size
      payload.mimeType = fileInfo.fileInfo.fileMetadata?.mimeType
    }

    // Add entity associations (account, contact, lead, opportunity)
    if (doc.account) payload.account = doc.account
    if (doc.contact) payload.contact = doc.contact
    if (doc.lead) payload.lead = doc.lead
    if (doc.opportunity) payload.opportunity = doc.opportunity

    // Add format/folder
    if (isUpdate) {
      payload.folder = doc.folder || false
    } else {
      payload.format = doc.folder ? 'FOLDER' : 'FILE'
    }

    return payload
  }

  // Update mode: single document with changeMode
  if (isUpdate) {
    const payload = buildDocumentBase(document, fileInfoList[0])
    return {
      crmDocument: payload,
      changeMode: 'UPDATE'
    }
  }

  // Bulk upload: multiple documents
  if (isBulk && fileInfoList.length > 1) {
    const documents = fileInfoList.map((fileInfo, index) => {
      const doc = {
        ...document,
        name: fileInfo.fileInfo?.fileMetadata?.originalFileName || document.files?.[index]?.name || document.name,
        version: 0,
        folder: false
      }
      return buildDocumentBase(doc, fileInfo)
    })

    return {
      crmDocuments: documents
    }
  }

  // Single document or folder: array with one item
  const payload = buildDocumentBase(document, fileInfoList[0])
  return {
    crmDocuments: [payload]
  }
}
