import type { CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { Task, TaskComment, TaskTemplate } from '@/common/data/relations/types/taskTypes'
import { TaskFields, createTaskDescriptors } from '@/common/data/relations/types/taskTypes'
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

export interface InvestmentTask extends Task {
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

export interface InvestmentTaskTemplate extends TaskTemplate {
  investmentGroup?: CatalogEntry
  investmentGroupRef?: string
  investmentType?: CatalogEntry
  investmentTypeRef?: string
  tasks?: InvestmentTask[] // Mapped by investmentTask

  // Base fields for mapping
  investmentTask?: InvestmentTask[] // Mapped to tasks
}

export interface InvestmentTaskComment extends TaskComment {
  task?: InvestmentTask // Mapped by investmentTask
  taskId?: string // Mapped by investmentTaskId

  // Base fields for mapping
  investmentTask?: InvestmentTask // Mapped to task
  investmentTaskId?: string // Mapped to taskId
}

/**
 * Investment Task Query Field Mapping
 * Extends TaskFields with IRM-specific GraphQL field names
 */
export const InvestmentTaskFields = {
  ...TaskFields,
  // Override IRM-specific field names
  opportunityStageCondition: 'investmentOpportunityStageCondition'
} as const

export type InvestmentTaskFieldName = (typeof InvestmentTaskFields)[keyof typeof InvestmentTaskFields]

/**
 * Investment Task Descriptors
 * Uses createTaskDescriptors with InvestmentTaskFields mapping
 * Adds IRM-specific reference field
 */
export const INVESTMENT_TASK_DESCRIPTORS: Descriptor[] = [
  ...createTaskDescriptors(InvestmentTaskFields as Record<keyof typeof TaskFields, string>).filter(
    d => d.key !== 'reference'
  ),
  {
    key: 'reference',
    searchPaths: [
      'account.name',
      'contact.firstName',
      'contact.lastName',
      'investment.name',
      'lead.firstName',
      'lead.lastName',
      'opportunity.name'
    ],
    sortPaths: [`${InvestmentTaskFields.source}`],
    type: 'text'
  }
]
