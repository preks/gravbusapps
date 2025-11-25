import type { CatalogEntry } from '@/common/network/graphql/commonTypes'
import {
  type Task,
  type TaskComment,
  type TaskTemplate,
  TaskFields,
  TaskFormFields,
  createTaskDescriptors
} from '@/common/data/relations/types/taskTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { SourceTable } from './investmentEnums'
import type { Investment } from './investmentTypes'
import type { InvestmentAccount } from './investmentAccountTypes'
import type { InvestmentContact } from './investmentContactTypes'
import type { InvestmentDocument } from './investmentDocumentTypes'
import type { InvestmentLead } from './investmentLeadTypes'
import type { InvestmentOpportunity, InvestmentOpportunityStageCondition } from './investmentOpportunityTypes'
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'

export interface InvestmentTask extends Task {
  account?: InvestmentAccount
  comments?: InvestmentTaskComment[]
  contact?: InvestmentContact
  documents?: InvestmentDocument[]
  investment?: Investment
  investmentId?: string
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
  opportunityStageCondition: 'investmentOpportunityStageCondition',
  // Add IRM-specific investment fields
  investment: 'investment',
  investmentId: 'investmentId'
} as const

export const InvestmentTaskFormFields = {
  ...TaskFormFields,
  investmentId: 'investment'
} as const

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

/**
 * Build Investment Task Payload
 * Uses buildPayload utility with InvestmentTaskFormFields mapping
 */
export const buildInvestmentTaskPayload = (task: Partial<InvestmentTask> & Record<string, any>) => {
  // Build base payload using buildPayload utility
  const payload = buildPayload(task, InvestmentTaskFormFields)

  return {
    investmentTask: payload
  }
}
