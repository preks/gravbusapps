import {
  type Document,
  DocumentFields,
  DocumentFormFields,
  createDocumentDescriptors
} from '@/common/data/relations/types/documentTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { BaseEntity } from '@/common/network/graphql/commonTypes'
import type { SourceTable } from './investmentEnums'
import type { Investment, InvestmentReport } from './investmentTypes'
import type { InvestmentAccount } from './investmentAccountTypes'
import type { InvestmentActivity } from './investmentActivityTypes'
import type { InvestmentContact } from './investmentContactTypes'
import type { InvestmentLead } from './investmentLeadTypes'
import type { InvestmentNote } from './investmentNoteTypes'
import type { InvestmentOpportunity } from './investmentOpportunityTypes'
import type { InvestmentTask } from './investmentTaskTypes'

export interface InvestmentDocument extends Document {
  account?: InvestmentAccount
  activity?: InvestmentActivity
  childDocuments?: InvestmentDocument[]
  contact?: InvestmentContact
  investment?: Investment
  investmentId?: string
  investmentReportDocument?: InvestmentReportDocument // TODO unclear
  investmentReportDocumentId?: string // TODO unclear
  note?: InvestmentNote
  opportunity?: InvestmentOpportunity
  lead?: InvestmentLead
  parentDocument?: InvestmentDocument
  source?: SourceTable
  task?: InvestmentTask
}

/**
 * Investment Document Query Field Mapping
 * IRM uses same field names as Common, so we use DocumentFields directly
 */
export const InvestmentDocumentFields = {
  ...DocumentFields,
  investment: 'investment',
  investmentId: 'investmentId'
}

export const InvestmentDocumentFormFields = {
  ...DocumentFormFields,
  investmentId: 'investment'
}

/**
 * Investment Document Descriptors
 * Uses createDocumentDescriptors with InvestmentDocumentFields mapping
 */
export const INVESTMENT_DOCUMENT_DESCRIPTORS: Descriptor[] = [...createDocumentDescriptors(InvestmentDocumentFields)]

export interface InvestmentReportDocument extends BaseEntity {
  id?: string
  investmentDocument?: InvestmentDocument
  investmentDocumentId?: string
  investmentReport?: InvestmentReport
  investmentReportId?: string
}

/**
 * Build Investment Document Payload Options
 */
export interface BuildInvestmentDocumentPayloadOptions {
  mode: 'create' | 'update' | 'rename'
  isFolder: boolean
  isBulk: boolean
  fileInfoList?: any[]
}

/**
 * Build Investment Document Payload
 *
 * Handles document creation, update, and bulk upload payloads.
 * - For update: returns { investmentDocument: {...}, changeMode: 'UPDATE' }
 * - For create single/folder: returns { investmentDocuments: [{...}] }
 * - For bulk: returns { investmentDocuments: [{...}, {...}, ...] }
 *
 * @param document - Partial document data from form
 * @param options - Mode, folder flag, and file info
 * @returns Formatted payload for Flow Registry
 */
export const buildInvestmentDocumentPayload = (
  document: Partial<InvestmentDocument> & Record<string, any>,
  options: BuildInvestmentDocumentPayloadOptions
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

    // Add entity associations (account, contact, lead, opportunity, investment)
    if (doc.account) payload.account = doc.account
    if (doc.contact) payload.contact = doc.contact
    if (doc.lead) payload.lead = doc.lead
    if (doc.opportunity) payload.opportunity = doc.opportunity
    if (doc.investment) payload.investment = doc.investment

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
      investmentDocument: payload,
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
      investmentDocuments: documents
    }
  }

  // Single document or folder: array with one item
  const payload = buildDocumentBase(document, fileInfoList[0])
  return {
    investmentDocuments: [payload]
  }
}
