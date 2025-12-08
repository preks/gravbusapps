import { type BaseEntity, type CatalogEntry, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import type { CommunicationChannel } from '@/common/data/common/types/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { Company } from '@/common/data/orgchart/types/companyTypes'

export interface Opportunity extends BaseEntity {
  account?: any // IRM | CRM
  accountId?: string // IRM | CRM
  activities?: any[] // IRM | CRM
  addresses?: any[] // IRM | CRM
  closeDate?: string // IRM | CRM
  code?: string // IRM | CRM
  company?: Company // IRM | CRM
  companyId?: string // IRM | CRM
  communicationChannels?: CommunicationChannel[] // IRM | CRM
  currency?: CatalogEntry // IRM | CRM
  currencyRef?: string // IRM | CRM
  documents?: any[] // IRM | CRM
  estimatedAmount?: number // IRM | CRM
  id?: string // IRM | CRM
  leads?: any[] // IRM | TODO (investmentLead in IRM)
  name?: string // IRM | CRM
  notes?: any[] // IRM | CRM
  notesSummary?: string // IRM | CRM
  opportunityContacts?: any[] // IRM | TODO (contacts in CRM, investmentOpportunityContact in IRM)
  opportunityPipeline?: CatalogEntry // IRM | TODO (salesPipeline in CRM)
  opportunityPipelineRef?: string // IRM | TODO (salesPipelineRef in CRM)
  opportunityPipelineStage?: CatalogEntry // IRM | TODO (salesPipelineStage in CRM)
  opportunityPipelineStageRef?: string // IRM | TODO (salesPipelineStageRef in CRM)
  opportunityStageConditions?: any[] // IRM | TODO (stageConditionStatuses in CRM, investmentOpportunityStageCondition in IRM)
  opportunityStatus?: CatalogEntry // IRM | CRM
  opportunityStatusRef?: string // IRM | CRM
  opportunityForecast?: CatalogEntry // IRM | CRM
  opportunityForecastRef?: string // IRM | CRM
  ownerEmployee?: Employee // IRM | CRM
  ownerEmployeeId?: string // IRM | CRM
  rejectionReasons?: any[] // IRM | CRM
  tasks?: any[] // IRM | CRM
  winningChance?: number // IRM | CRM
}

/**
 * Opportunity Query Field Mapping
 */
export const OpportunityFields = {
  account: 'account',
  accountId: 'accountId',
  activities: 'activities',
  addresses: 'addresses',
  closeDate: 'closeDate',
  code: 'code',
  company: 'company',
  companyId: 'companyId',
  communicationChannels: 'communicationChannels',
  currency: 'currency',
  currencyRef: 'currencyRef',
  documents: 'documents',
  estimatedAmount: 'estimatedAmount',
  id: 'id',
  leads: 'leads',
  name: 'name',
  notes: 'notes',
  notesSummary: 'notesSummary',
  opportunityContacts: 'opportunityContacts',
  opportunityPipeline: 'opportunityPipeline',
  opportunityPipelineRef: 'opportunityPipelineRef',
  opportunityPipelineStage: 'opportunityPipelineStage',
  opportunityPipelineStageRef: 'opportunityPipelineStageRef',
  opportunityStageConditions: 'opportunityStageConditions',
  opportunityStatus: 'opportunityStatus',
  opportunityStatusRef: 'opportunityStatusRef',
  opportunityForecast: 'opportunityForecast',
  opportunityForecastRef: 'opportunityForecastRef',
  ownerEmployee: 'ownerEmployee',
  ownerEmployeeId: 'ownerEmployeeId',
  rejectionReasons: 'rejectionReasons',
  tasks: 'tasks',
  winningChance: 'winningChance'
} as const

export type OpportunityFieldName = (typeof OpportunityFields)[keyof typeof OpportunityFields]

/**
 * Create Common Opportunity Descriptors with fields mapping
 */
export const createOpportunityDescriptors = (
  fields: Record<keyof typeof OpportunityFields, string> = OpportunityFields
): Descriptor[] => [
  ...BASE_ENTITY_DESCRIPTORS,

  {
    key: 'account',
    searchPaths: [`${fields.account}.name`, `${fields.account}.code`],
    sortPath: `${fields.account}.name`,
    type: 'text'
  },
  {
    key: 'activities',
    searchPaths: [`${fields.activities}.title`, `${fields.activities}.description`],
    sortPath: `${fields.activities}.title`,
    type: 'text'
  },
  {
    key: 'addresses',
    searchPaths: [
      `${fields.addresses}.locality`,
      `${fields.addresses}.postalCode`,
      `${fields.addresses}.region.value`,
      `${fields.addresses}.country.value`
    ],
    sortPaths: [
      `${fields.addresses}.locality`,
      `${fields.addresses}.postalCode`,
      `${fields.addresses}.region.value`,
      `${fields.addresses}.country.value`
    ],
    type: 'text'
  },
  { key: 'closeDate', searchPaths: [fields.closeDate], sortPath: fields.closeDate, type: 'date' },
  { key: 'code', searchPaths: [fields.code], sortPath: fields.code, type: 'text' },
  {
    key: 'company',
    searchPaths: [`${fields.company}.name`, `${fields.company}.code`],
    sortPath: `${fields.company}.name`,
    type: 'text'
  },
  {
    key: 'communicationChannels',
    searchPaths: [`${fields.communicationChannels}.value`],
    enableSort: false,
    type: 'text'
  },
  {
    key: 'currency',
    searchPaths: [`${fields.currency}.value`, `${fields.currency}.code`],
    sortPath: `${fields.currency}.value`,
    type: 'text'
  },
  {
    key: 'documents',
    searchPaths: [`${fields.documents}.name`, `${fields.documents}.description`],
    sortPath: `${fields.documents}.name`,
    type: 'text'
  },
  { key: 'estimatedAmount', searchPaths: [fields.estimatedAmount], sortPath: fields.estimatedAmount, type: 'number' },
  {
    key: 'leads',
    searchPaths: [`${fields.leads}.firstName`, `${fields.leads}.lastName`, `${fields.leads}.companyName`],
    sortPaths: [`${fields.leads}.firstName`, `${fields.leads}.lastName`, `${fields.leads}.companyName`],
    type: 'text'
  },
  { key: 'name', searchPaths: [fields.name], sortPath: fields.name, type: 'text' },
  {
    key: 'notes',
    searchPaths: [`${fields.notes}.title`, `${fields.notes}.text`],
    sortPath: `${fields.notes}.title`,
    type: 'text'
  },
  { key: 'notesSummary', searchPaths: [fields.notesSummary], sortPath: fields.notesSummary, type: 'text' },
  {
    key: 'opportunityContacts',
    searchPaths: [`${fields.opportunityContacts}.contact.firstName`, `${fields.opportunityContacts}.contact.lastName`],
    sortPath: `${fields.opportunityContacts}.contact.lastName`,
    type: 'text'
  },
  {
    key: 'opportunityPipeline',
    searchPaths: [`${fields.opportunityPipeline}.value`, `${fields.opportunityPipeline}.code`],
    sortPath: `${fields.opportunityPipeline}.value`,
    type: 'text'
  },
  {
    key: 'opportunityPipelineRef',
    sortPath: fields.opportunityPipelineRef,
    type: 'text'
  },
  {
    key: 'opportunityPipelineStage',
    searchPaths: [`${fields.opportunityPipelineStage}.value`, `${fields.opportunityPipelineStage}.code`],
    sortPath: `${fields.opportunityPipelineStage}.value`,
    type: 'text'
  },
  {
    key: 'opportunityPipelineStageRef',
    sortPath: fields.opportunityPipelineStageRef,
    type: 'text'
  },
  {
    key: 'opportunityStageConditions',
    searchPaths: [`${fields.opportunityStageConditions}.opportunityPipelineStageCondition.value`],
    sortPath: `${fields.opportunityStageConditions}.opportunityPipelineStageCondition.value`,
    type: 'text'
  },
  {
    key: 'opportunityStatus',
    searchPaths: [`${fields.opportunityStatus}.value`, `${fields.opportunityStatus}.code`],
    sortPath: `${fields.opportunityStatus}.value`,
    type: 'text'
  },
  {
    key: 'opportunityStatusRef',
    sortPath: fields.opportunityStatusRef,
    type: 'text'
  },
  {
    key: 'opportunityForecast',
    searchPaths: [
      `${fields.opportunityForecast}.value`,
      `${fields.opportunityForecast}.code`,
      `${fields.opportunityForecast}.additionalValue1`
    ],
    sortPath: `${fields.opportunityForecast}.value`,
    type: 'text'
  },
  {
    key: 'opportunityForecastRef',
    sortPath: fields.opportunityForecastRef,
    type: 'text'
  },
  {
    key: 'ownerEmployee',
    searchPaths: [
      `${fields.ownerEmployee}.displayName`,
      `${fields.ownerEmployee}.firstName`,
      `${fields.ownerEmployee}.lastName`
    ],
    sortPath: `${fields.ownerEmployee}.displayName`,
    type: 'text'
  },
  {
    key: 'rejectionReasons',
    searchPaths: [`${fields.rejectionReasons}.rejectionReason.value`],
    sortPath: `${fields.rejectionReasons}.rejectionReason.value`,
    type: 'text'
  },
  {
    key: 'tasks',
    searchPaths: [`${fields.tasks}.name`, `${fields.tasks}.description`],
    sortPath: `${fields.tasks}.name`,
    type: 'text'
  },
  { key: 'winningChance', searchPaths: [fields.winningChance], sortPath: fields.winningChance, type: 'number' },

  // Filter IDs
  { key: 'accountIds', path: fields.accountId, kind: 'inIds' },
  { key: 'companyIds', path: fields.companyId, kind: 'inIds' },
  { key: 'currencyIds', path: fields.currencyRef, kind: 'inIds' },
  { key: 'opportunityPipelineIds', path: fields.opportunityPipelineRef, kind: 'inIds' },
  { key: 'opportunityPipelineStageIds', path: fields.opportunityPipelineStageRef, kind: 'inIds' },
  { key: 'opportunityStatusIds', path: fields.opportunityStatusRef, kind: 'inIds' },
  {
    key: 'opportunityForecastIds',
    path: fields.opportunityForecastRef,
    filterLabel: 'Opportunity Forecast',
    optionSelectPaths: [
      `${fields.opportunityForecast}.id`,
      `${fields.opportunityForecast}.value`,
      `${fields.opportunityForecast}.code`
    ],
    optionSearchPaths: [
      `${fields.opportunityForecast}.value`,
      `${fields.opportunityForecast}.code`,
      `${fields.opportunityForecast}.additionalValue1`
    ],
    optionDistinctOn: [fields.opportunityForecastRef],
    kind: 'inIds'
  },
  { key: 'ownerEmployeeIds', path: fields.ownerEmployeeId, kind: 'inIds' },

  // Date range filters
  { key: 'closeDateFrom', path: fields.closeDate, kind: 'dateFrom' },
  { key: 'closeDateTo', path: fields.closeDate, kind: 'dateTo' },

  // Composite display columns
  { key: 'opportunity', searchPaths: [fields.name, fields.code], sortPath: fields.name, type: 'text' },
  { key: 'amount', searchPaths: [fields.estimatedAmount], sortPath: fields.estimatedAmount, type: 'number' },
  { key: 'account', searchPaths: [`${fields.account}.name`], sortPath: `${fields.account}.name`, type: 'text' },
  {
    key: 'owner',
    searchPaths: [
      `${fields.ownerEmployee}.displayName`,
      `${fields.ownerEmployee}.firstName`,
      `${fields.ownerEmployee}.lastName`
    ],
    sortPath: `${fields.ownerEmployee}.displayName`,
    type: 'text'
  },
  { key: 'created', searchPaths: ['createdAt'], sortPath: 'createdAt', type: 'date' }
]

export interface OpportunityStageCondition extends BaseEntity {
  activeFrom?: string // IRM | CRM
  activeTo?: string // IRM | CRM
  additionalProperties?: any // IRM | CRM
  businessKey?: string // IRM | CRM
  completed?: boolean // IRM | CRM
  completedAt?: string // IRM | CRM
  completedByEmployee?: Employee // IRM | CRM
  completedByEmployeeId?: string // IRM | CRM
  configSnapshot?: any // IRM | CRM
  deadlineAt?: string // IRM | CRM
  id?: string // IRM | CRM
  opportunity?: any // IRM | CRM
  opportunityId?: string // IRM | CRM
  opportunityPipelineStageCondition?: CatalogEntry // IRM | TODO (salesPipelineStageCondition in CRM)
  opportunityPipelineStageConditionRef?: string // IRM | TODO (salesPipelineStageConditionRef in CRM)
  processInstanceId?: string // IRM | CRM
  recordState?: string // IRM | CRM
  task?: any // IRM | TODO (salesTask in CRM)
  taskId?: string // IRM | TODO (salesTaskId in CRM)
}

/**
 * Opportunity Stage Condition Query Field Mapping
 */
export const OpportunityStageConditionFields = {
  completed: 'completed',
  completedAt: 'completedAt',
  completedByEmployee: 'completedByEmployee',
  completedByEmployeeId: 'completedByEmployeeId',
  configSnapshot: 'configSnapshot',
  deadlineAt: 'deadlineAt',
  id: 'id',
  opportunity: 'opportunity',
  opportunityId: 'opportunityId',
  opportunityPipelineStageCondition: 'opportunityPipelineStageCondition',
  opportunityPipelineStageConditionRef: 'opportunityPipelineStageConditionRef',
  task: 'task',
  taskId: 'taskId'
} as const

export type OpportunityStageConditionFieldName =
  (typeof OpportunityStageConditionFields)[keyof typeof OpportunityStageConditionFields]

/**
 * Create Common Opportunity Stage Condition Descriptors with fields mapping
 */
export const createOpportunityStageConditionDescriptors = (
  fields: Record<keyof typeof OpportunityStageConditionFields, string> = OpportunityStageConditionFields
): Descriptor[] => [
  ...BASE_ENTITY_DESCRIPTORS,

  { key: 'completed', searchPaths: [fields.completed], sortPath: fields.completed, type: 'boolean' },
  { key: 'completedAt', searchPaths: [fields.completedAt], sortPath: fields.completedAt, type: 'date' },
  {
    key: 'completedByEmployee',
    searchPaths: [
      `${fields.completedByEmployee}.displayName`,
      `${fields.completedByEmployee}.firstName`,
      `${fields.completedByEmployee}.lastName`
    ],
    sortPath: `${fields.completedByEmployee}.displayName`,
    type: 'text'
  },
  { key: 'deadlineAt', searchPaths: [fields.deadlineAt], sortPath: fields.deadlineAt, type: 'date' },
  {
    key: 'opportunity',
    searchPaths: [`${fields.opportunity}.name`, `${fields.opportunity}.code`],
    sortPath: `${fields.opportunity}.name`,
    type: 'text'
  },
  {
    key: 'opportunityPipelineStageCondition',
    searchPaths: [
      `${fields.opportunityPipelineStageCondition}.value`,
      `${fields.opportunityPipelineStageCondition}.code`
    ],
    sortPath: `${fields.opportunityPipelineStageCondition}.value`,
    type: 'text'
  },
  {
    key: 'opportunityPipelineStageConditionRef',
    sortPath: fields.opportunityPipelineStageConditionRef,
    type: 'text'
  },
  {
    key: 'task',
    searchPaths: [`${fields.task}.name`, `${fields.task}.description`],
    sortPath: `${fields.task}.name`,
    type: 'text'
  },

  // Filter IDs
  { key: 'opportunityIds', path: fields.opportunityId, kind: 'inIds' },
  { key: 'opportunityPipelineStageConditionIds', path: fields.opportunityPipelineStageConditionRef, kind: 'inIds' },
  { key: 'completedByEmployeeIds', path: fields.completedByEmployeeId, kind: 'inIds' },
  { key: 'taskIds', path: fields.taskId, kind: 'inIds' },

  // Date range filters
  { key: 'completedAtFrom', path: fields.completedAt, kind: 'dateFrom' },
  { key: 'completedAtTo', path: fields.completedAt, kind: 'dateTo' },
  { key: 'deadlineAtFrom', path: fields.deadlineAt, kind: 'dateFrom' },
  { key: 'deadlineAtTo', path: fields.deadlineAt, kind: 'dateTo' }
]

/**
 * Opportunity Form Fields Configuration
 * Defines which fields to include in payload
 * Sorted alphabetically by sourceKey
 *
 * Transformations are handled automatically:
 * - Dates → ISO format
 * - Arrays → included only if not empty
 * - Objects → included only if not empty
 * - Primitives → string or undefined
 */
export const opportunityFormFields = {
  accountId: 'account',
  businessKey: 'businessKey',
  closeDate: 'closeDate',
  code: 'code',
  companyId: 'company',
  currencyRef: 'currencyRef',
  estimatedAmount: 'estimatedAmount',
  id: 'id',
  leadId: 'lead',
  name: 'name',
  notesSummary: 'notesSummary',
  opportunityContacts: 'opportunityContacts',
  opportunityPipelineRef: 'opportunityPipelineRef',
  opportunityPipelineStageRef: 'opportunityPipelineStageRef',
  opportunityStatusRef: 'opportunityStatusRef',
  opportunityForecastRef: 'opportunityForecastRef',
  ownerEmployeeId: 'ownerEmployee',
  personal: 'personal',
  version: 'version',
  winningChance: 'winningChance'
} as const

/**
 * Helper function to build opportunity contact associations
 * Used for managing many-to-many relationships between opportunities and contacts
 */
export const buildOpportunityContactAssociations = (contactIds: string[] = [], opportunityId?: string): any[] => {
  return contactIds.map(contactId => {
    if (typeof contactId === 'object' && (contactId as any).id) {
      // Existing association with metadata
      const contact = contactId as any
      const association: any = {
        contactType: contact.contactType || null,
        opportunity: opportunityId,
        contact: contact.id
      }

      // Include association ID and version if it exists (for updates)
      if (contact.associationId) {
        association.id = contact.associationId
        if (contact.associationVersion !== undefined) {
          association.version = contact.associationVersion
        }
      }

      return association
    }

    // New association - simple format
    return {
      contactType: null,
      opportunity: opportunityId,
      contact: typeof contactId === 'string' ? contactId : (contactId as any).id
    }
  })
}
