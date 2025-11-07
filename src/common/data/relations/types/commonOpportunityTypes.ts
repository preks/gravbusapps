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
  investments?: any[] // IRM | TODO (CRM missing)
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

  // IRM-specific fields
  annualNetColdRent?: number // IRM specific
  buildingYear?: string // IRM specific
  dealType?: string // IRM specific
  divestment?: any // IRM specific
  divestmentId?: string // IRM specific
  forecastedProfitAmount?: number // IRM specific
  initialInvestmentAmount?: number // IRM specific
  investmentGroup?: CatalogEntry // IRM specific
  investmentGroupRef?: string // IRM specific
  investmentName?: string // IRM specific
  investmentRole?: CatalogEntry // IRM specific
  investmentRoleRef?: string // IRM specific
  investmentStakeType?: CatalogEntry // IRM specific
  investmentStakeTypeRef?: string // IRM specific
  investmentType?: CatalogEntry // IRM specific
  investmentTypeRef?: string // IRM specific
  loanAmount?: number // IRM specific
  loanInterestRate?: number // IRM specific
  marketValue?: number // IRM specific
  requiredCapitalAmount?: number // IRM specific
  size?: number // IRM specific
  sizeMeasurementUnit?: CatalogEntry // IRM specific
  sizeMeasurementUnitRef?: string // IRM specific
  stakePercentage?: number // IRM specific
}

export const COMMON_OPPORTUNITY_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,

  { key: 'account', searchPaths: ['account.name', 'account.code'], sortPath: 'account.name', type: 'text' },
  { key: 'accountId', sortPath: 'accountId', type: 'text' },
  {
    key: 'activities',
    searchPaths: ['activities.title', 'activities.description'],
    sortPath: 'activities.title',
    type: 'text'
  },
  {
    key: 'addresses',
    searchPaths: ['addresses.addressLine', 'addresses.locality'],
    enableSort: false,
    type: 'text'
  },
  { key: 'annualNetColdRent', searchPaths: ['annualNetColdRent'], sortPath: 'annualNetColdRent', type: 'number' },
  { key: 'buildingYear', searchPaths: ['buildingYear'], sortPath: 'buildingYear', type: 'text' },
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
  { key: 'currencyRef', sortPath: 'currencyRef', type: 'text' },
  { key: 'dealType', searchPaths: ['dealType'], sortPath: 'dealType', type: 'text' },
  { key: 'divestment', searchPaths: ['divestment.name'], sortPath: 'divestment.name', type: 'text' },
  { key: 'divestmentId', sortPath: 'divestmentId', type: 'text' },
  {
    key: 'documents',
    searchPaths: ['documents.name', 'documents.description'],
    sortPath: 'documents.name',
    type: 'text'
  },
  { key: 'estimatedAmount', searchPaths: ['estimatedAmount'], sortPath: 'estimatedAmount', type: 'number' },
  {
    key: 'forecastedProfitAmount',
    searchPaths: ['forecastedProfitAmount'],
    sortPath: 'forecastedProfitAmount',
    type: 'number'
  },
  { key: 'id', searchPaths: ['id'], sortPath: 'id', type: 'text' },
  {
    key: 'initialInvestmentAmount',
    searchPaths: ['initialInvestmentAmount'],
    sortPath: 'initialInvestmentAmount',
    type: 'number'
  },
  {
    key: 'investmentGroup',
    searchPaths: ['investmentGroup.value', 'investmentGroup.code'],
    sortPath: 'investmentGroup.value',
    type: 'text'
  },
  { key: 'investmentGroupRef', sortPath: 'investmentGroupRef', type: 'text' },
  { key: 'investmentName', searchPaths: ['investmentName'], sortPath: 'investmentName', type: 'text' },
  {
    key: 'investmentRole',
    searchPaths: ['investmentRole.value', 'investmentRole.code'],
    sortPath: 'investmentRole.value',
    type: 'text'
  },
  { key: 'investmentRoleRef', sortPath: 'investmentRoleRef', type: 'text' },
  {
    key: 'investmentStakeType',
    searchPaths: ['investmentStakeType.value', 'investmentStakeType.code'],
    sortPath: 'investmentStakeType.value',
    type: 'text'
  },
  {
    key: 'investmentStakeTypeRef',
    sortPath: 'investmentStakeTypeRef',
    type: 'text'
  },
  {
    key: 'investmentType',
    searchPaths: ['investmentType.value', 'investmentType.code'],
    sortPath: 'investmentType.value',
    type: 'text'
  },
  { key: 'investmentTypeRef', sortPath: 'investmentTypeRef', type: 'text' },
  {
    key: 'investments',
    searchPaths: ['investments.name', 'investments.code'],
    sortPath: 'investments.name',
    type: 'text'
  },
  {
    key: 'leads',
    searchPaths: ['leads.firstName', 'leads.lastName', 'leads.companyName'],
    sortPath: 'leads.lastName',
    type: 'text'
  },
  { key: 'loanAmount', searchPaths: ['loanAmount'], sortPath: 'loanAmount', type: 'number' },
  { key: 'loanInterestRate', searchPaths: ['loanInterestRate'], sortPath: 'loanInterestRate', type: 'number' },
  { key: 'marketValue', searchPaths: ['marketValue'], sortPath: 'marketValue', type: 'number' },
  { key: 'name', searchPaths: ['name'], sortPath: 'name', type: 'text' },
  { key: 'notes', searchPaths: ['notes.subject', 'notes.content'], sortPath: 'notes.subject', type: 'text' },
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
  { key: 'ownerEmployeeId', sortPath: 'ownerEmployeeId', type: 'text' },
  {
    key: 'rejectionReasons',
    searchPaths: ['rejectionReasons.reason'],
    sortPath: 'rejectionReasons.reason',
    type: 'text'
  },
  {
    key: 'requiredCapitalAmount',
    searchPaths: ['requiredCapitalAmount'],
    sortPath: 'requiredCapitalAmount',
    type: 'number'
  },
  { key: 'size', searchPaths: ['size'], sortPath: 'size', type: 'number' },
  {
    key: 'sizeMeasurementUnit',
    searchPaths: ['sizeMeasurementUnit.value', 'sizeMeasurementUnit.code'],
    sortPath: 'sizeMeasurementUnit.value',
    type: 'text'
  },
  {
    key: 'sizeMeasurementUnitRef',
    sortPath: 'sizeMeasurementUnitRef',
    type: 'text'
  },
  { key: 'stakePercentage', searchPaths: ['stakePercentage'], sortPath: 'stakePercentage', type: 'number' },
  { key: 'tasks', searchPaths: ['tasks.subject', 'tasks.description'], sortPath: 'tasks.subject', type: 'text' },
  { key: 'winningChance', searchPaths: ['winningChance'], sortPath: 'winningChance', type: 'number' },

  // Filter IDs
  { key: 'accountIds', path: 'accountId', kind: 'inIds' },
  { key: 'currencyIds', path: 'currencyRef', kind: 'inIds' },
  { key: 'divestmentIds', path: 'divestmentId', kind: 'inIds' },
  { key: 'investmentGroupIds', path: 'investmentGroupRef', kind: 'inIds' },
  { key: 'investmentRoleIds', path: 'investmentRoleRef', kind: 'inIds' },
  { key: 'investmentStakeTypeIds', path: 'investmentStakeTypeRef', kind: 'inIds' },
  { key: 'investmentTypeIds', path: 'investmentTypeRef', kind: 'inIds' },
  { key: 'opportunityPipelineIds', path: 'opportunityPipelineRef', kind: 'inIds' },
  { key: 'opportunityPipelineStageIds', path: 'opportunityPipelineStageRef', kind: 'inIds' },
  { key: 'opportunityStatusIds', path: 'opportunityStatusRef', kind: 'inIds' },
  { key: 'ownerEmployeeIds', path: 'ownerEmployeeId', kind: 'inIds' },
  { key: 'sizeMeasurementUnitIds', path: 'sizeMeasurementUnitRef', kind: 'inIds' },

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
