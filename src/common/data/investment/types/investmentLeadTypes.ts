import type { CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { Lead } from '@/common/data/relations/types/leadTypes'
import { LeadFields, createLeadDescriptors } from '@/common/data/relations/types/leadTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { InvestmentAccount } from './investmentAccountTypes'
import type { InvestmentContact } from './investmentContactTypes'
import type { InvestmentTask } from './investmentTaskTypes'
import type { InvestmentDocument, InvestmentOpportunity, InvestmentActivity, InvestmentNote } from './'

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
 * IRM uses same field names as Common, so we use LeadFields directly
 */
export const InvestmentLeadFields = LeadFields

export type InvestmentLeadFieldName = (typeof InvestmentLeadFields)[keyof typeof InvestmentLeadFields]

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

  // IRM-specific filter IDs
  { key: 'investmentGroupIds', path: 'investmentGroupRef', kind: 'inIds' },
  { key: 'investmentRoleIds', path: 'investmentRoleRef', kind: 'inIds' },
  { key: 'investmentStakeTypeIds', path: 'investmentStakeTypeRef', kind: 'inIds' },
  { key: 'investmentTypeIds', path: 'investmentTypeRef', kind: 'inIds' },
  { key: 'legalFormIds', path: 'legalFormRef', kind: 'inIds' },
  { key: 'sizeMeasurementUnitIds', path: 'sizeMeasurementUnitRef', kind: 'inIds' },
  { key: 'timeZoneIds', path: 'timeZoneRef', kind: 'inIds' }
]
