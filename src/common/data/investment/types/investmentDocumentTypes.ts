import type { CommonDocument } from '@/common/data/relations/types/commonDocumentTypes'
import { COMMON_DOCUMENT_DESCRIPTORS } from '@/common/data/relations/types/commonDocumentTypes'
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
  childDocuments?: InvestmentDocument[] // TODO missing
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
 * Investment Document Descriptors
 * IRM uses correct field names, so we use Common descriptors directly
 */
export const INVESTMENT_DOCUMENT_DESCRIPTORS: Descriptor[] = [...COMMON_DOCUMENT_DESCRIPTORS]

export interface InvestmentReportDocument extends BaseEntity {
  id?: string
  investmentDocument?: InvestmentDocument
  investmentDocumentId?: string
  investmentReport?: InvestmentReport
  investmentReportId?: string
}
