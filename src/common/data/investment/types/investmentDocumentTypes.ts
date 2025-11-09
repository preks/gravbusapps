import type { CommonDocument } from '@/common/data/relations/types/commonDocumentTypes'
import { DocumentFields, createCommonDocumentDescriptors } from '@/common/data/relations/types/commonDocumentTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { BaseEntity } from '@/common/network/graphql/commonTypes'
import type { SourceTable } from './investmentEnums'
import type {
  Investment,
  InvestmentAccount,
  InvestmentActivity,
  InvestmentContact,
  InvestmentLead,
  InvestmentNote,
  InvestmentOpportunity,
  InvestmentReport,
  InvestmentTask
} from './'

export interface InvestmentDocument extends CommonDocument {
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
export const InvestmentDocumentFields = DocumentFields

export type InvestmentDocumentFieldName = (typeof InvestmentDocumentFields)[keyof typeof InvestmentDocumentFields]

/**
 * Investment Document Descriptors
 * Uses createCommonDocumentDescriptors with InvestmentDocumentFields mapping
 */
export const INVESTMENT_DOCUMENT_DESCRIPTORS: Descriptor[] = [
  ...createCommonDocumentDescriptors(InvestmentDocumentFields)
]

export interface InvestmentReportDocument extends BaseEntity {
  id?: string
  investmentDocument?: InvestmentDocument
  investmentDocumentId?: string
  investmentReport?: InvestmentReport
  investmentReportId?: string
}
