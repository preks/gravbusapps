import type { CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { Opportunity, OpportunityStageCondition } from '@/common/data/relations/types/opportunityTypes'
import { OpportunityFields, createOpportunityDescriptors } from '@/common/data/relations/types/opportunityTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { InvestmentAccount } from './investmentAccountTypes'
import type { InvestmentAddress } from './investmentAddressTypes'
import type { InvestmentCommunicationChannel } from './investmentCommunicationChannelTypes'
import type { InvestmentDocument } from './investmentDocumentTypes'
import type { InvestmentNote } from './investmentNoteTypes'
import type { InvestmentTask } from './investmentTaskTypes'
import type { InvestmentActivity } from './investmentActivityTypes'
import type { InvestmentLead } from './investmentLeadTypes'
import type { InvestmentOpportunityContact } from './investmentRelationTypes'
import type { Investment } from './investmentTypes'

/**
 * Investment Opportunity Type
 * Extends Opportunity with IRM-specific fields and proper type mappings
 */
export interface InvestmentOpportunity extends Opportunity {
  // Map any types from Opportunity to specific Investment types
  account?: InvestmentAccount
  activities?: InvestmentActivity[]
  addresses?: InvestmentAddress[]
  communicationChannels?: InvestmentCommunicationChannel[]
  divestment?: Investment
  documents?: InvestmentDocument[]
  investments?: Investment[]
  leads?: InvestmentLead[]
  notes?: InvestmentNote[]
  opportunityContacts?: InvestmentOpportunityContact[]
  opportunityStageConditions?: InvestmentOpportunityStageCondition[]
  rejectionReasons?: any[]
  tasks?: InvestmentTask[]

  // IRM-specific fields
  annualNetColdRent?: number // IRM specific
  buildingYear?: string // IRM specific
  dealType?: string // IRM specific
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

  // Base fields for mapping (IRM-specific GraphQL field names that need mapping)
  investment?: Investment[] // Mapped to investments (singular in GraphQL)
  investmentActivity?: InvestmentActivity[] // Duplicate - mapped to activities
  investmentAddress?: InvestmentAddress[] // Duplicate - mapped to addresses
  investmentCommunicationChannel?: InvestmentCommunicationChannel[] // Duplicate - mapped to communicationChannels
  investmentDocument?: InvestmentDocument[] // Duplicate - mapped to documents
  investmentLead?: InvestmentLead[] // Mapped to leads
  investmentNote?: InvestmentNote[] // Duplicate - mapped to notes
  investmentOpportunityContact?: InvestmentOpportunityContact[] // Mapped to opportunityContacts
  investmentOpportunityStageCondition?: InvestmentOpportunityStageCondition[] // Mapped to opportunityStageConditions
  investmentTask?: InvestmentTask[] // Duplicate - mapped to tasks
}

/**
 * Investment Opportunity Stage Condition Type
 * Extends OpportunityStageCondition with IRM-specific fields and proper type mappings
 */
export interface InvestmentOpportunityStageCondition extends OpportunityStageCondition {
  // Map any types from OpportunityStageCondition
  opportunity?: InvestmentOpportunity
  task?: InvestmentTask
}

/**
 * Investment Opportunity Query Field Mapping
 * Extends OpportunityFields with IRM-specific GraphQL field names
 */
export const InvestmentOpportunityFields = {
  ...OpportunityFields,
  // Override IRM-specific field names
  leads: 'investmentLead',
  opportunityContacts: 'investmentOpportunityContact',
  opportunityStageConditions: 'investmentOpportunityStageCondition'
} as const

export type InvestmentOpportunityFieldName =
  (typeof InvestmentOpportunityFields)[keyof typeof InvestmentOpportunityFields]

/**
 * Investment Opportunity Descriptors
 * Uses createOpportunityDescriptors with InvestmentOpportunityFields mapping
 * Adds IRM-specific fields that don't exist in Common/CRM
 */
export const INVESTMENT_OPPORTUNITY_DESCRIPTORS: Descriptor[] = [
  ...createOpportunityDescriptors(InvestmentOpportunityFields as Record<keyof typeof OpportunityFields, string>),

  // IRM-specific descriptors
  { key: 'annualNetColdRent', searchPaths: ['annualNetColdRent'], sortPath: 'annualNetColdRent', type: 'number' },
  { key: 'buildingYear', searchPaths: ['buildingYear'], sortPath: 'buildingYear', type: 'text' },
  { key: 'dealType', searchPaths: ['dealType'], sortPath: 'dealType', type: 'text' },
  { key: 'divestment', searchPaths: ['divestment.name'], sortPath: 'divestment.name', type: 'text' },
  {
    key: 'forecastedProfitAmount',
    searchPaths: ['forecastedProfitAmount'],
    sortPath: 'forecastedProfitAmount',
    type: 'number'
  },
  {
    key: 'initialInvestmentAmount',
    searchPaths: ['initialInvestmentAmount'],
    sortPath: 'initialInvestmentAmount',
    type: 'number'
  },
  {
    key: 'investments',
    searchPaths: ['investment.name', 'investment.code'],
    sortPath: 'investment.name',
    type: 'text'
  },
  {
    key: 'investmentGroup',
    searchPaths: ['investmentGroup.value', 'investmentGroup.code'],
    sortPath: 'investmentGroup.value',
    type: 'text'
  },
  { key: 'investmentName', searchPaths: ['investmentName'], sortPath: 'investmentName', type: 'text' },
  {
    key: 'investmentRole',
    searchPaths: ['investmentRole.value', 'investmentRole.code'],
    sortPath: 'investmentRole.value',
    type: 'text'
  },
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
  {
    key: 'leads',
    searchPaths: ['investmentLead.firstName', 'investmentLead.lastName', 'investmentLead.companyName'],
    sortPaths: ['investmentLead.firstName', 'investmentLead.lastName', 'investmentLead.companyName'],
    type: 'text'
  },
  { key: 'loanAmount', searchPaths: ['loanAmount'], sortPath: 'loanAmount', type: 'number' },
  { key: 'loanInterestRate', searchPaths: ['loanInterestRate'], sortPath: 'loanInterestRate', type: 'number' },
  { key: 'marketValue', searchPaths: ['marketValue'], sortPath: 'marketValue', type: 'number' },
  {
    key: 'opportunityContacts',
    searchPaths: ['investmentOpportunityContact.contact.firstName', 'investmentOpportunityContact.contact.lastName'],
    sortPaths: ['investmentOpportunityContact.contact.firstName', 'investmentOpportunityContact.contact.lastName'],
    type: 'text'
  },
  {
    key: 'opportunityStageConditions',
    searchPaths: ['investmentOpportunityStageCondition.opportunityPipelineStageCondition.value'],
    sortPaths: ['investmentOpportunityStageCondition.opportunityPipelineStageCondition.value'],
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

  // IRM-specific filter IDs
  { key: 'divestmentIds', path: 'divestmentId', kind: 'inIds' },
  { key: 'investmentIds', path: 'investment.id', kind: 'inIds' },
  { key: 'investmentGroupIds', path: 'investmentGroupRef', kind: 'inIds' },
  { key: 'investmentRoleIds', path: 'investmentRoleRef', kind: 'inIds' },
  { key: 'investmentStakeTypeIds', path: 'investmentStakeTypeRef', kind: 'inIds' },
  { key: 'investmentTypeIds', path: 'investmentTypeRef', kind: 'inIds' },
  { key: 'sizeMeasurementUnitIds', path: 'sizeMeasurementUnitRef', kind: 'inIds' }
]
