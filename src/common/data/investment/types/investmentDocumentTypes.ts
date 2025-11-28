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
