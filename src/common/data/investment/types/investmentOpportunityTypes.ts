import type { CatalogEntry } from '@/common/network/graphql/commonTypes'
import {
  type Opportunity,
  type OpportunityStageCondition,
  OpportunityFields,
  createOpportunityDescriptors,
  OpportunityStageConditionFields,
  createOpportunityStageConditionDescriptors,
  opportunityFormFields,
  buildOpportunityContactAssociations
} from '@/common/data/relations/types/opportunityTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import type { InvestmentAddress } from './investmentAddressTypes'
import type { InvestmentCommunicationChannel } from './investmentCommunicationChannelTypes'
import type { InvestmentDocument } from './investmentDocumentTypes'
import type { InvestmentNote } from './investmentNoteTypes'
import type { InvestmentTask } from './investmentTaskTypes'
import type { InvestmentActivity } from './investmentActivityTypes'
import type { InvestmentLead } from './investmentLeadTypes'
import type { InvestmentOpportunityContact } from './investmentRelationTypes'
import type { Investment, EquityInvestmentRound } from './investmentTypes'
import type { InvestmentOpportunityAccount } from './investmentAccountAssociationTypes'
import type { InvestmentCompany } from './investmentCompanyTypes'

/**
 * Investment Opportunity Type
 * Extends Opportunity with IRM-specific fields
 */
export interface InvestmentOpportunity extends Opportunity {
  // Investment-specific typed relationships
  activities?: InvestmentActivity[]
  addresses?: InvestmentAddress[]
  communicationChannels?: InvestmentCommunicationChannel[]
  divestment?: Investment
  documents?: InvestmentDocument[]
  equityInvestmentRound?: EquityInvestmentRound
  investments?: Investment[]
  leads?: InvestmentLead[]
  notes?: InvestmentNote[]
  opportunityContacts?: InvestmentOpportunityContact[]
  opportunityStageConditions?: InvestmentOpportunityStageCondition[]
  rejectionReasons?: any[]
  tasks?: InvestmentTask[]

  // Opportunity-Account Junction Table (many-to-many)
  // GraphQL field name: opportunityAccounts
  opportunityAccounts?: InvestmentOpportunityAccount[]

  // IRM-specific fields
  annualNetColdRent?: number // IRM specific
  buildingYear?: string // IRM specific
  investmentCompany?: InvestmentCompany // IRM specific
  investmentCompanyId?: string // IRM specific
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
  investmentTypeId?: string // Form-only leaf type ID used by investment prospect layouts
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

/**
 * Investment Opportunity Stage Condition Type
 * Extends OpportunityStageCondition with IRM-specific typed relationships
 */
export interface InvestmentOpportunityStageCondition extends OpportunityStageCondition {
  // Investment-specific typed relationships
  opportunity?: InvestmentOpportunity
  task?: InvestmentTask
}

/**
 * Investment Opportunity Query Field Mapping
 * Extends OpportunityFields with IRM-specific GraphQL field names
 * Note: account and accountId are excluded - IRM uses opportunityAccounts junction table instead
 */
export const InvestmentOpportunityFields = (() => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { account, accountId, ...fields } = OpportunityFields
  return {
    ...fields,
    // Override IRM-specific field names
    leads: 'investmentLead',
    opportunityContacts: 'investmentOpportunityContact',
    opportunityStageConditions: 'investmentOpportunityStageCondition',
    investments: 'investment',
    equityInvestmentRound: 'equityInvestmentRound',
    // Junction table relationship - GraphQL field name is 'opportunityAccounts'
    investmentOpportunityAccounts: 'opportunityAccounts',
    // IRM-specific fields
    annualNetColdRent: 'annualNetColdRent',
    buildingYear: 'buildingYear',
    investmentCompany: 'investmentCompany',
    investmentCompanyId: 'investmentCompanyId',
    dealType: 'dealType',
    divestment: 'divestment',
    divestmentId: 'divestmentId',
    forecastedProfitAmount: 'forecastedProfitAmount',
    initialInvestmentAmount: 'initialInvestmentAmount',
    investmentGroup: 'investmentGroup',
    investmentGroupRef: 'investmentGroupRef',
    investmentName: 'investmentName',
    investmentRole: 'investmentRole',
    investmentRoleRef: 'investmentRoleRef',
    investmentStakeType: 'investmentStakeType',
    investmentStakeTypeRef: 'investmentStakeTypeRef',
    investmentType: 'investmentType',
    investmentTypeRef: 'investmentTypeRef',
    loanAmount: 'loanAmount',
    loanInterestRate: 'loanInterestRate',
    marketValue: 'marketValue',
    requiredCapitalAmount: 'requiredCapitalAmount',
    size: 'size',
    sizeMeasurementUnit: 'sizeMeasurementUnit',
    sizeMeasurementUnitRef: 'sizeMeasurementUnitRef',
    stakePercentage: 'stakePercentage'
  } as const
})()

/**
 * Investment Opportunity Stage Condition Query Field Mapping
 * Uses OpportunityStageConditionFields (IRM uses same field names as Common)
 */
export const InvestmentOpportunityStageConditionFields = {
  ...OpportunityStageConditionFields
} as const

/**
 * Investment Opportunity Descriptors
 * Uses createOpportunityDescriptors with InvestmentOpportunityFields mapping
 * Adds IRM-specific fields that don't exist in Common/CRM
 */
export const INVESTMENT_OPPORTUNITY_DESCRIPTORS: Descriptor[] = [
  ...createOpportunityDescriptors(InvestmentOpportunityFields as any)
    .filter(d => !['investmentOpportunityContacts', 'investmentOpportunityStageConditions'].includes(d.key))
    .map(descriptor => {
      // Clean up any undefined paths caused by missing account/accountId fields
      if (descriptor.searchPaths) {
        descriptor.searchPaths = descriptor.searchPaths.filter(
          path => path && typeof path === 'string' && !path.includes('undefined')
        )
      }
      if (descriptor.sortPaths) {
        descriptor.sortPaths = descriptor.sortPaths.filter(
          path => path && typeof path === 'string' && !path.includes('undefined')
        )
      }
      if (
        descriptor.sortPath &&
        (typeof descriptor.sortPath !== 'string' || descriptor.sortPath.includes('undefined'))
      ) {
        descriptor.sortPath = undefined
      }
      if (descriptor.path && (typeof descriptor.path !== 'string' || descriptor.path.includes('undefined'))) {
        descriptor.path = undefined
      }
      return descriptor
    })
    .filter(descriptor => {
      // Remove descriptors that have no valid paths (like account/accountId which don't exist in IRM)
      const hasValidSearchPaths = descriptor.searchPaths && descriptor.searchPaths.length > 0
      const hasValidSortPath = descriptor.sortPath || (descriptor.sortPaths && descriptor.sortPaths.length > 0)
      const hasValidPath = descriptor.path !== undefined

      // Keep descriptors that have at least one valid capability
      return hasValidSearchPaths || hasValidSortPath || hasValidPath || descriptor.kind !== undefined
    }),
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
  // Note: equityInvestmentRound removed from descriptors - not available in InvestmentOpportunityBoolExp for filtering
  // The relationship exists for data retrieval but is not exposed as a filterable field in the GraphQL schema
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

  // Junction table descriptor - GraphQL field name is 'opportunityAccounts'
  {
    key: 'investmentOpportunityAccounts',
    searchPaths: ['opportunityAccounts.account.name', 'opportunityAccounts.account.code'],
    sortPaths: ['opportunityAccounts.account.name'],
    type: 'text'
  },

  // IRM-specific filter IDs
  { key: 'divestmentIds', path: 'divestmentId', kind: 'inIds' },
  { key: 'investmentIds', path: 'investment.id', kind: 'inIds' },
  { key: 'investmentGroupIds', path: 'investmentGroupRef', kind: 'inIds' },
  { key: 'investmentRoleIds', path: 'investmentRoleRef', kind: 'inIds' },
  { key: 'investmentStakeTypeIds', path: 'investmentStakeTypeRef', kind: 'inIds' },
  { key: 'investmentTypeIds', path: 'investmentTypeRef', kind: 'inIds' },
  { key: 'sizeMeasurementUnitIds', path: 'sizeMeasurementUnitRef', kind: 'inIds' },
  { key: 'contactIds', path: 'investmentOpportunityContact.contact.id', kind: 'inIds' }, // IRM uses "investmentOpportunityContact" not "opportunityContacts"
  { key: 'accountIds', path: 'opportunityAccounts.accountId', kind: 'inIds' } // GraphQL field name is 'opportunityAccounts'
]

/**
 * Investment Opportunity Stage Condition Descriptors
 * Uses createOpportunityStageConditionDescriptors with InvestmentOpportunityStageConditionFields mapping
 */
export const INVESTMENT_OPPORTUNITY_STAGE_CONDITION_DESCRIPTORS: Descriptor[] = [
  ...createOpportunityStageConditionDescriptors(
    InvestmentOpportunityStageConditionFields as Record<keyof typeof OpportunityStageConditionFields, string>
  )
]

/**
 * Investment Opportunity Form Fields Configuration
 * Extends opportunityFormFields with IRM-specific fields
 */
export const investmentOpportunityFormFields = {
  ...opportunityFormFields,
  // IRM-specific fields
  dealType: 'dealType',
  divestment: 'divestment',
  divestmentId: 'divestment',
  investmentGroupRef: 'investmentGroupRef',
  investmentId: 'investment',
  investmentName: 'investmentName',
  investmentRoleRef: 'investmentRoleRef',
  investmentStakeTypeRef: 'investmentStakeTypeRef',
  investmentTypeRef: 'investmentTypeRef',
  sizeMeasurementUnitRef: 'sizeMeasurementUnitRef',
  // IRM-specific prospect fields (dynamically added based on investmentGroup/investmentType)
  annualNetColdRent: 'annualNetColdRent',
  buildingYear: 'buildingYear',
  investmentCompanyId: 'investmentCompany',
  forecastedProfitAmount: 'forecastedProfitAmount',
  initialInvestmentAmount: 'initialInvestmentAmount',
  loanAmount: 'loanAmount',
  loanInterestRate: 'loanInterestRate',
  marketValue: 'marketValue',
  requiredCapitalAmount: 'requiredCapitalAmount',
  size: 'size',
  stakePercentage: 'stakePercentage'
} as const

/**
 * Build Investment Opportunity payload for IRM module
 *
 * Automatically handles:
 * - Field name mapping via investmentOpportunityFormFields
 * - Empty value exclusion
 * - ID/version automatically included if present (determines update vs create)
 * - IRM-specific fields (dealType, investmentName, investment fields)
 * - Contact associations
 *
 * @param opportunity - Partial InvestmentOpportunity entity (only fields provided by form)
 * @returns Payload object ready for API submission
 */
export const buildInvestmentOpportunityPayload = (opportunity: Partial<InvestmentOpportunity>) => {
  // Build base payload using investmentOpportunityFormFields for field mapping
  // opportunityContacts and opportunityAccounts are automatically processed by buildPayload
  // buildPayload applies transformIdFields which converts contactId → contact, accountId → account
  const basePayload = buildPayload(opportunity, investmentOpportunityFormFields)

  const result: any = {
    investmentOpportunity: basePayload
  }

  return result
}

/**
 * Build opportunity contacts array for IRM
 * Used in convert lead flow and form submissions
 *
 * @param contactIds - Array of contact IDs or contact objects with metadata
 * @param opportunityId - Opportunity ID (for associations)
 * @returns Array of opportunity contact association objects
 */
export const buildInvestmentOpportunityContacts = (contactIds: string[] = [], opportunityId?: string): any[] => {
  return buildOpportunityContactAssociations(contactIds, opportunityId)
}

/**
 * Transform InvestmentOpportunity (raw GraphQL) to InvestmentOpportunity (enhanced/standardized)
 *
 * Handles IRM-prefixed field name mappings (fallback only):
 * - investment → investments
 * - investmentActivity → activities
 * - investmentCommunicationChannel → communicationChannels
 * - investmentDocument → documents
 * - investmentLead → leads
 * - investmentNote → notes
 * - investmentOpportunityContact → opportunityContacts
 * - investmentOpportunityStageCondition → opportunityStageConditions
 * - investmentTask → tasks
 *
 * Note: equityInvestmentRound is fetched separately via a second query in useInvestmentOpportunity hook
 */
export function toInvestmentOpportunity(raw: any): InvestmentOpportunity {
  // Extract incorrectly named fields to exclude from spread
  const {
    investment,
    investmentActivity,
    investmentDocument,
    investmentLead,
    investmentNote,
    investmentOpportunityContact,
    investmentOpportunityStageCondition,
    investmentTask,
    ...rest
  } = raw

  return {
    ...rest,
    // Map only if target field doesn't already exist (fallback mapping)
    investments: raw.investments ?? investment,
    activities: raw.activities ?? investmentActivity,
    documents: raw.documents ?? investmentDocument,
    leads: raw.leads ?? investmentLead,
    notes: raw.notes ?? investmentNote,
    opportunityContacts: raw.opportunityContacts ?? investmentOpportunityContact,
    opportunityStageConditions: raw.opportunityStageConditions ?? investmentOpportunityStageCondition,
    tasks: raw.tasks ?? investmentTask
  } as InvestmentOpportunity
}

/**
 * Transform InvestmentOpportunityStageCondition (raw GraphQL) to InvestmentOpportunityStageCondition (enhanced/standardized)
 *
 * NOTE: IRM field naming already matches OpportunityStageCondition standards.
 * No field mappings needed. This mapper is essentially a passthrough with proper typing.
 */
export function toInvestmentOpportunityStageCondition(raw: any): InvestmentOpportunityStageCondition {
  // IRM uses correct field names, no mapping needed
  return raw as InvestmentOpportunityStageCondition
}
