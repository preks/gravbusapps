import type { CatalogEntry } from '@/common/network/graphql/commonTypes'
import { type Lead, LeadFields, createLeadDescriptors, leadFormFields } from '@/common/data/relations/types/leadTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import type { InvestmentAccount } from './investmentAccountTypes'
import type { InvestmentContact } from './investmentContactTypes'
import type { InvestmentTask } from './investmentTaskTypes'
import type { InvestmentDocument } from './investmentDocumentTypes'
import type { InvestmentOpportunity } from './investmentOpportunityTypes'
import type { InvestmentActivity } from './investmentActivityTypes'
import type { InvestmentNote } from './investmentNoteTypes'
import { buildInvestmentAccountPayload } from './investmentAccountTypes'
import { buildInvestmentContactPayload } from './investmentContactTypes'
import { buildInvestmentOpportunityPayload } from './investmentOpportunityTypes'

export interface InvestmentLead extends Lead {
  activities?: InvestmentActivity[]
  convertedAccount?: InvestmentAccount
  convertedContact?: InvestmentContact
  convertedOpportunity?: InvestmentOpportunity
  documents?: InvestmentDocument[]
  investmentAccount?: InvestmentAccount
  notes?: InvestmentNote[]
  opportunities?: InvestmentOpportunity[]
  tasks?: InvestmentTask[]

  // IRM-specific fields
  annualNetColdRent?: number
  buildingYear?: string
  forecastedProfitAmount?: number
  initialInvestmentAmount?: number
  investmentGroup?: CatalogEntry
  investmentGroupRef?: string
  investmentName?: string
  investmentRole?: CatalogEntry
  investmentRoleRef?: string
  investmentStakeType?: CatalogEntry
  investmentStakeTypeRef?: string
  investmentType?: CatalogEntry
  investmentTypeRef?: string
  leadSourceType?: string
  legalForm?: CatalogEntry
  legalFormRef?: string
  loanAmount?: number
  loanInterestRate?: number
  marketValue?: number
  requiredCapitalAmount?: number
  size?: number
  sizeMeasurementUnit?: CatalogEntry
  sizeMeasurementUnitRef?: string
  stakePercentage?: number
  timeZone?: CatalogEntry
  timeZoneRef?: string
}

/**
 * Investment Lead Query Field Mapping
 * Extends LeadFields with IRM-specific GraphQL field names
 */
export const InvestmentLeadFields = {
  ...LeadFields,
  // IRM-specific fields
  annualNetColdRent: 'annualNetColdRent',
  buildingYear: 'buildingYear',
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
  leadSourceType: 'leadSourceType',
  legalForm: 'legalForm',
  legalFormRef: 'legalFormRef',
  loanAmount: 'loanAmount',
  loanInterestRate: 'loanInterestRate',
  marketValue: 'marketValue',
  requiredCapitalAmount: 'requiredCapitalAmount',
  size: 'size',
  sizeMeasurementUnit: 'sizeMeasurementUnit',
  sizeMeasurementUnitRef: 'sizeMeasurementUnitRef',
  stakePercentage: 'stakePercentage',
  timeZone: 'timeZone',
  timeZoneRef: 'timeZoneRef'
} as const

/**
 * Investment Lead Descriptors
 * Uses createLeadDescriptors with InvestmentLeadFields mapping
 * Adds IRM-specific fields that don't exist in Common/CRM
 */
export const INVESTMENT_LEAD_DESCRIPTORS: Descriptor[] = [
  ...createLeadDescriptors(InvestmentLeadFields),

  // IRM-specific additional fields (not in Common)
  { key: 'annualNetColdRent', searchPaths: ['annualNetColdRent'], sortPath: 'annualNetColdRent', type: 'number' },
  { key: 'buildingYear', searchPaths: ['buildingYear'], sortPath: 'buildingYear', type: 'text' },
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
    key: 'investmentType',
    searchPaths: ['investmentType.value', 'investmentType.code'],
    sortPath: 'investmentType.value',
    type: 'text'
  },
  { key: 'leadSourceType', searchPaths: ['leadSourceType'], sortPath: 'leadSourceType', type: 'text' },
  {
    key: 'legalForm',
    searchPaths: ['legalForm.value', 'legalForm.code'],
    sortPath: 'legalForm.value',
    type: 'text'
  },
  { key: 'loanAmount', searchPaths: ['loanAmount'], sortPath: 'loanAmount', type: 'number' },
  { key: 'loanInterestRate', searchPaths: ['loanInterestRate'], sortPath: 'loanInterestRate', type: 'number' },
  { key: 'marketValue', searchPaths: ['marketValue'], sortPath: 'marketValue', type: 'number' },
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
  { key: 'stakePercentage', searchPaths: ['stakePercentage'], sortPath: 'stakePercentage', type: 'number' },
  {
    key: 'timeZone',
    searchPaths: ['timeZone.value', 'timeZone.code'],
    sortPath: 'timeZone.value',
    type: 'text'
  },

  // IRM-specific filter IDs (with optionSelectPaths for export/list filter dropdowns)
  {
    key: 'investmentGroupIds',
    path: 'investmentGroupRef',
    filterLabel: 'Investment Group',
    kind: 'inIds',
    optionSelectPaths: ['investmentGroup.id', 'investmentGroup.value'],
    optionSearchPaths: ['investmentGroup.value', 'investmentGroup.code'],
    optionDistinctOn: ['investmentGroupRef']
  },
  { key: 'investmentRoleIds', path: 'investmentRoleRef', kind: 'inIds' },
  { key: 'investmentStakeTypeIds', path: 'investmentStakeTypeRef', kind: 'inIds' },
  {
    key: 'investmentTypeIds',
    path: 'investmentTypeRef',
    filterLabel: 'Investment Type',
    kind: 'inIds',
    optionSelectPaths: ['investmentType.id', 'investmentType.value'],
    optionSearchPaths: ['investmentType.value', 'investmentType.code'],
    optionDistinctOn: ['investmentTypeRef']
  },
  { key: 'legalFormIds', path: 'legalFormRef', kind: 'inIds' },
  { key: 'sizeMeasurementUnitIds', path: 'sizeMeasurementUnitRef', kind: 'inIds' },
  { key: 'timeZoneIds', path: 'timeZoneRef', kind: 'inIds' }
]

/**
 * Investment Lead Form Fields Configuration
 * Extends leadFormFields with IRM-specific fields
 */
export const investmentLeadFormFields = {
  ...leadFormFields,
  // IRM-specific fields
  investmentGroupRef: 'investmentGroupRef',
  investmentName: 'investmentName',
  investmentRoleRef: 'investmentRoleRef',
  investmentStakeTypeRef: 'investmentStakeTypeRef',
  investmentTypeRef: 'investmentTypeRef',
  stakePercentage: 'stakePercentage',
  marketValue: 'marketValue',
  initialInvestmentAmount: 'initialInvestmentAmount',
  loanAmount: 'loanAmount',
  loanInterestRate: 'loanInterestRate',
  requiredCapitalAmount: 'requiredCapitalAmount',
  forecastedProfitAmount: 'forecastedProfitAmount',
  annualNetColdRent: 'annualNetColdRent',
  buildingYear: 'buildingYear',
  size: 'size',
  sizeMeasurementUnitRef: 'sizeMeasurementUnitRef'
} as const

/**
 * Build Investment Lead payload for IRM module
 *
 * Automatically handles:
 * - Field name mapping via investmentLeadFormFields
 * - Empty value exclusion
 * - ID/version automatically included if present (determines update vs create)
 * - IRM-specific fields (investment fields, sensitive flag)
 *
 * @param lead - Partial InvestmentLead entity (only fields provided by form)
 * @returns Payload object ready for API submission
 */
export const buildInvestmentLeadPayload = (lead: Partial<InvestmentLead>) => {
  // Build base payload using investmentLeadFormFields for field mapping
  const basePayload = buildPayload(lead, investmentLeadFormFields)

  return {
    investmentLead: basePayload
  }
}

/**
 * Transform InvestmentLead (raw GraphQL) to InvestmentLead (enhanced/standardized)
 *
 * NOTE: IRM field naming already matches Lead standards.
 * No catalog field mappings needed (unlike CRM).
 * This mapper is essentially a passthrough with proper typing.
 */
export function toInvestmentLead(raw: any): InvestmentLead {
  // IRM uses correct field names, no mapping needed

  const { position, ...rest } = raw

  return {
    ...rest,
    jobPosition: raw.jobPosition ?? position
  } as InvestmentLead
}

/**
 * Build Investment Lead Convert Payload
 * Simple function that takes lead ID and optional account, contact, opportunity objects
 *
 * @param leadId - The ID of the lead being converted
 * @param account - Account object (full object for create, or { id: string } for match)
 * @param contact - Contact object (full object for create, or { id: string } for match)
 * @param opportunity - Opportunity object (only if creating opportunity)
 */
export const buildInvestmentLeadConvertPayload = (
  leadId: string,
  account?: Partial<InvestmentAccount> | { id: string },
  contact?: Partial<InvestmentContact> | { id: string },
  opportunity?: Partial<InvestmentOpportunity>
) => {
  const payload: any = {
    leadId
  }

  // Handle Account
  if (account) {
    if ('id' in account && Object.keys(account).length === 1) {
      // Match existing account - only send id
      payload.account = { id: account.id }
    } else {
      // Create new account - use payload builder
      const { investmentAccount } = buildInvestmentAccountPayload(account as Partial<InvestmentAccount>)
      payload.account = investmentAccount
    }
  }

  // Handle Contact
  if (contact) {
    if ('id' in contact && Object.keys(contact).length === 1) {
      // Match existing contact - only send id
      payload.contact = { id: contact.id }
    } else {
      // Create new contact - use payload builder
      const { investmentContact } = buildInvestmentContactPayload(contact as Partial<InvestmentContact>)
      payload.contact = investmentContact
    }
  }

  // Handle Opportunity
  if (opportunity) {
    const { investmentOpportunity } = buildInvestmentOpportunityPayload(opportunity)
    payload.opportunity = investmentOpportunity
  }

  return payload
}
