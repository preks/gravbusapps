import type { CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { CommonTask, CommonTaskComment, CommonTaskTemplate } from '@/common/data/relations/types/commonTaskTypes'
import { COMMON_TASK_DESCRIPTORS } from '@/common/data/relations/types/commonTaskTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { SourceTable } from './investmentEnums'
import type {
  Investment,
  InvestmentAccount,
  InvestmentContact,
  InvestmentDocument,
  InvestmentLead,
  InvestmentOpportunityStageCondition,
  InvestmentOpportunity
} from './'

export interface InvestmentTask extends CommonTask {
  account?: InvestmentAccount
  comments?: InvestmentTaskComment[]
  contact?: InvestmentContact
  documents?: InvestmentDocument[]
  investment?: Investment
  lead?: InvestmentLead
  opportunityStageCondition?: InvestmentOpportunityStageCondition // Mapped from investmentOpportunityStageCondition
  opportunity?: InvestmentOpportunity
  source?: SourceTable
  taskTemplate?: InvestmentTaskTemplate

  // Base fields for mapping
  investmentOpportunityStageCondition?: InvestmentOpportunityStageCondition
}

export interface InvestmentTaskTemplate extends CommonTaskTemplate {
  investmentGroup?: CatalogEntry
  investmentGroupRef?: string
  investmentType?: CatalogEntry
  investmentTypeRef?: string
  tasks?: InvestmentTask[] // Mapped by investmentTask

  // Base fields for mapping
  investmentTask?: InvestmentTask[] // Mapped to tasks
}

export interface InvestmentTaskComment extends CommonTaskComment {
  task?: InvestmentTask // Mapped by investmentTask
  taskId?: string // Mapped by investmentTaskId

  // Base fields for mapping
  investmentTask?: InvestmentTask // Mapped to task
  investmentTaskId?: string // Mapped to taskId
}

/**
 * Investment Task Descriptors
 * IRM uses correct field names, so we use Common descriptors directly
 */
export const INVESTMENT_TASK_DESCRIPTORS: Descriptor[] = [...COMMON_TASK_DESCRIPTORS]
