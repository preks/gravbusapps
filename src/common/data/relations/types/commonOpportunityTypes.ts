import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'
import { BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import type { CommunicationChannel } from '@/common/data/common/types/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

export interface CommonOpportunity extends BaseEntity {
  account?: any // IRM | CRM
  accountId?: string // IRM | CRM
  activities?: any[] // IRM | CRM
  addresses?: any[] // IRM | CRM
  closeDate?: string // IRM | CRM
  code?: string // IRM | CRM
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
  ownerEmployee?: Employee // IRM | CRM
  ownerEmployeeId?: string // IRM | CRM
  rejectionReasons?: any[] // IRM | CRM
  tasks?: any[] // IRM | CRM
  winningChance?: number // IRM | CRM
}

export const COMMON_OPPORTUNITY_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,

  { key: 'account', searchPaths: ['account.name', 'account.code'], sortPath: 'account.name', type: 'text' },
  {
    key: 'activities',
    searchPaths: ['activities.title', 'activities.description'],
    sortPath: 'activities.title',
    type: 'text'
  },
  {
    key: 'addresses',
    searchPaths: ['addresses.locality', 'addresses.postalCode', 'addresses.region.value', 'addresses.country.value'],
    sortPaths: ['addresses.locality', 'addresses.postalCode', 'addresses.region.value', 'addresses.country.value'],
    type: 'text'
  },
  { key: 'closeDate', searchPaths: ['closeDate'], sortPath: 'closeDate', type: 'date' },
  { key: 'code', searchPaths: ['code'], sortPath: 'code', type: 'text' },
  {
    key: 'communicationChannels',
    searchPaths: ['communicationChannels.value'],
    enableSort: false,
    type: 'text'
  },
  {
    key: 'currency',
    searchPaths: ['currency.value', 'currency.code'],
    sortPath: 'currency.value',
    type: 'text'
  },
  {
    key: 'documents',
    searchPaths: ['documents.name', 'documents.description'],
    sortPath: 'documents.name',
    type: 'text'
  },
  { key: 'estimatedAmount', searchPaths: ['estimatedAmount'], sortPath: 'estimatedAmount', type: 'number' },

  {
    key: 'leads',
    searchPaths: ['leads.firstName', 'leads.lastName', 'leads.companyName'],
    sortPaths: ['leads.firstName', 'leads.lastName', 'leads.companyName'],
    type: 'text'
  },
  { key: 'name', searchPaths: ['name'], sortPath: 'name', type: 'text' },
  { key: 'notes', searchPaths: ['notes.title', 'notes.text'], sortPath: 'notes.title', type: 'text' },
  { key: 'notesSummary', searchPaths: ['notesSummary'], sortPath: 'notesSummary', type: 'text' },
  {
    key: 'opportunityContacts',
    searchPaths: ['opportunityContacts.contact.firstName', 'opportunityContacts.contact.lastName'],
    sortPath: 'opportunityContacts.contact.lastName',
    type: 'text'
  },
  {
    key: 'opportunityPipeline',
    searchPaths: ['opportunityPipeline.value', 'opportunityPipeline.code'],
    sortPath: 'opportunityPipeline.value',
    type: 'text'
  },
  {
    key: 'opportunityPipelineRef',
    sortPath: 'opportunityPipelineRef',
    type: 'text'
  },
  {
    key: 'opportunityPipelineStage',
    searchPaths: ['opportunityPipelineStage.value', 'opportunityPipelineStage.code'],
    sortPath: 'opportunityPipelineStage.value',
    type: 'text'
  },
  {
    key: 'opportunityPipelineStageRef',
    sortPath: 'opportunityPipelineStageRef',
    type: 'text'
  },
  {
    key: 'opportunityStageConditions',
    searchPaths: ['opportunityStageConditions.name'],
    sortPath: 'opportunityStageConditions.name',
    type: 'text'
  },
  {
    key: 'opportunityStatus',
    searchPaths: ['opportunityStatus.value', 'opportunityStatus.code'],
    sortPath: 'opportunityStatus.value',
    type: 'text'
  },
  {
    key: 'opportunityStatusRef',
    sortPath: 'opportunityStatusRef',
    type: 'text'
  },
  {
    key: 'ownerEmployee',
    searchPaths: ['ownerEmployee.displayName', 'ownerEmployee.firstName', 'ownerEmployee.lastName'],
    sortPath: 'ownerEmployee.displayName',
    type: 'text'
  },
  {
    key: 'rejectionReasons',
    searchPaths: ['rejectionReasons.rejectionReason.value'],
    sortPath: 'rejectionReasons.rejectionReason.value',
    type: 'text'
  },
  { key: 'tasks', searchPaths: ['tasks.name', 'tasks.description'], sortPath: 'tasks.name', type: 'text' },
  { key: 'winningChance', searchPaths: ['winningChance'], sortPath: 'winningChance', type: 'number' },

  // Filter IDs
  { key: 'accountIds', path: 'accountId', kind: 'inIds' },
  { key: 'currencyIds', path: 'currencyRef', kind: 'inIds' },
  { key: 'opportunityPipelineIds', path: 'opportunityPipelineRef', kind: 'inIds' },
  { key: 'opportunityPipelineStageIds', path: 'opportunityPipelineStageRef', kind: 'inIds' },
  { key: 'opportunityStatusIds', path: 'opportunityStatusRef', kind: 'inIds' },
  { key: 'ownerEmployeeIds', path: 'ownerEmployeeId', kind: 'inIds' },

  // Date range filters
  { key: 'closeDateAfter', path: 'closeDate', kind: 'dateFrom' },
  { key: 'closeDateBefore', path: 'closeDate', kind: 'dateTo' },

  // Composite display columns (for table sorting)
  // opportunity: Displays name - sorts by name
  { key: 'opportunity', searchPaths: ['name', 'code'], sortPath: 'name', type: 'text' },

  // amount: Displays estimatedAmount with currency - sorts by estimatedAmount
  { key: 'amount', searchPaths: ['estimatedAmount'], sortPath: 'estimatedAmount', type: 'number' },

  // account: Displays account name - sorts by account.name
  { key: 'account', searchPaths: ['account.name'], sortPath: 'account.name', type: 'text' },

  // owner: Displays ownerEmployee - sorts by ownerEmployee.displayName
  {
    key: 'owner',
    searchPaths: ['ownerEmployee.displayName', 'ownerEmployee.firstName', 'ownerEmployee.lastName'],
    sortPath: 'ownerEmployee.displayName',
    type: 'text'
  },

  // created: Displays createdAt - sorts by createdAt
  { key: 'created', searchPaths: ['createdAt'], sortPath: 'createdAt', type: 'date' }
]

export interface CommonOpportunityStageCondition extends BaseEntity {
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
  task?: any // IRM | TODO (salesTask in CRM)
  taskId?: string // IRM | TODO (salesTaskId in CRM)
}
