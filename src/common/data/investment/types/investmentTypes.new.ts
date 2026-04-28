import { type BaseEntity, type CatalogEntry, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { Company } from '@/common/data/orgchart/types/companyTypes'
import type { InvestmentAccount } from './investmentAccountTypes'
import type { InvestmentOpportunity } from './investmentOpportunityTypes'
import { type EquityInvestment, EquityInvestmentFormFields } from './equityInvestmentTypes'
import { type RealEstateInvestment, RealEstateInvestmentFormFields } from './realEstateInvestmentTypes'
import { type LiquidFundInvestment, LiquidFundInvestmentFormFields } from './liquidFundInvestmentTypes'
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import type { InvestmentInvestmentAccount } from './investmentAccountAssociationTypes'

/**
 * Investment Type
 * Extends BaseEntity - keine Computed Fields
 */
export interface Investment extends BaseEntity {
  id?: string
  // Investment Core Fields
  code?: string
  name: string
  isin?: string
  acquisitionDate?: string
  planedExit?: boolean
  plannedExitDate?: string
  exitDate?: string

  // Investment Amount Fields
  initialInvestmentAmount?: number
  totalInvestmentAmount?: number
  investmentMarketValue?: number
  debtFinancingAmount?: number
  requiredCapitalAmount?: number
  forecastedRevenueAmount?: number
  forecastedProfitAmount?: number
  stakePercentage?: number
  securityQuantity?: number
  timeWeightedPerformance?: number
  maturityDate?: string

  // Loan Fields
  loanRecipientName?: string
  loanAmount?: number
  loanOpenCommitmentAmount?: number
  loanInterestRate?: number
  loanStartDate?: string
  loanEndDate?: string
  loanInterestClaim?: number

  // Fund Fields
  totalCommitmentAmount?: number
  totalDistributionAmount?: number
  fundManagerName?: string
  irr?: number
  moic?: number

  // Catalog References (objects)
  investmentGroup?: CatalogEntry
  investmentType?: CatalogEntry
  investmentStakeType?: CatalogEntry
  investmentPhase?: CatalogEntry
  investmentStatus?: CatalogEntry
  investmentRiskLevel?: CatalogEntry
  currency?: CatalogEntry

  // Catalog Reference IDs (Ref fields)
  investmentGroupRef?: string
  investmentTypeRef?: string
  investmentStakeTypeRef?: string
  investmentPhaseRef?: string
  investmentStatusRef?: string
  investmentRiskLevelRef?: string
  currencyRef?: string

  // Entity References (objects)
  ownerEmployee?: Employee
  investmentOpportunity?: InvestmentOpportunity
  loanRecipientInvestmentAccount?: InvestmentAccount
  company?: Company

  // Entity Reference IDs (Id fields)
  ownerEmployeeId?: string
  investmentOpportunityId?: string
  loanRecipientInvestmentAccountId?: string
  companyId?: string

  // Investment Role relationships (array)
  investmentRole?: InvestmentRole[]

  // Investment-Account Junction Table (many-to-many)
  // GraphQL field name: investmentAccounts
  investmentAccounts?: InvestmentInvestmentAccount[]

  // Investment specialization relationships (array)
  equityInvestment?: EquityInvestment[]
  realEstateInvestment?: RealEstateInvestment[]
  liquidFundInvestment?: LiquidFundInvestment[]
}

/**
 * Investment Role Type
 */
export interface InvestmentRole extends BaseEntity {
  displayOrder?: number
  investmentRole?: CatalogEntry
  investmentRoleRef?: string
  investment?: Investment
  investmentId?: string
}

/**
 * Investment Fields
 * ALL fields including Ref and Id fields (BaseEntity fields NOT included - handled by BASE_ENTITY_DESCRIPTORS)
 */
export const InvestmentFields = {
  id: 'id',
  // Investment Core Fields
  code: 'code',
  name: 'name',
  isin: 'isin',
  acquisitionDate: 'acquisitionDate',
  planedExit: 'planedExit',
  plannedExitDate: 'plannedExitDate',
  exitDate: 'exitDate',

  // Investment Amount Fields
  initialInvestmentAmount: 'initialInvestmentAmount',
  totalInvestmentAmount: 'totalInvestmentAmount',
  investmentMarketValue: 'investmentMarketValue',
  debtFinancingAmount: 'debtFinancingAmount',
  requiredCapitalAmount: 'requiredCapitalAmount',
  forecastedRevenueAmount: 'forecastedRevenueAmount',
  forecastedProfitAmount: 'forecastedProfitAmount',
  stakePercentage: 'stakePercentage',
  securityQuantity: 'securityQuantity',
  timeWeightedPerformance: 'timeWeightedPerformance',
  maturityDate: 'maturityDate',

  // Loan Fields
  loanRecipientName: 'loanRecipientName',
  loanAmount: 'loanAmount',
  loanOpenCommitmentAmount: 'loanOpenCommitmentAmount',
  loanInterestRate: 'loanInterestRate',
  loanStartDate: 'loanStartDate',
  loanEndDate: 'loanEndDate',
  loanInterestClaim: 'loanInterestClaim',

  // Fund Fields
  totalCommitmentAmount: 'totalCommitmentAmount',
  totalDistributionAmount: 'totalDistributionAmount',
  fundManagerName: 'fundManagerName',
  irr: 'irr',
  moic: 'moic',

  // Catalog References (objects)
  investmentGroup: 'investmentGroup',
  investmentType: 'investmentType',
  investmentStakeType: 'investmentStakeType',
  investmentPhase: 'investmentPhase',
  investmentStatus: 'investmentStatus',
  investmentRiskLevel: 'investmentRiskLevel',
  currency: 'currency',

  // Catalog Reference IDs (Ref fields)
  investmentGroupRef: 'investmentGroupRef',
  investmentTypeRef: 'investmentTypeRef',
  investmentStakeTypeRef: 'investmentStakeTypeRef',
  investmentPhaseRef: 'investmentPhaseRef',
  investmentStatusRef: 'investmentStatusRef',
  investmentRiskLevelRef: 'investmentRiskLevelRef',
  currencyRef: 'currencyRef',

  // Entity References (objects)
  ownerEmployee: 'ownerEmployee',
  investmentOpportunity: 'investmentOpportunity',
  loanRecipientInvestmentAccount: 'loanRecipientInvestmentAccount',
  company: 'company',

  // Entity Reference IDs (Id fields)
  ownerEmployeeId: 'ownerEmployeeId',
  investmentOpportunityId: 'investmentOpportunityId',
  loanRecipientInvestmentAccountId: 'loanRecipientInvestmentAccountId',
  companyId: 'companyId',

  // Array Relationships (not used in forms)
  investmentInvestmentAccounts: 'investmentInvestmentAccount',
  investmentAccounts: 'investmentAccounts', // Junction table - GraphQL field name
  equityInvestment: 'equityInvestment',
  realEstateInvestment: 'realEstateInvestment',
  liquidFundInvestment: 'liquidFundInvestment',
  investmentRole: 'investmentRole'
} as const

/**
 * Investment Form Fields
 * Only input-capable fields - Id fields map to object fields (ownerEmployeeId -> ownerEmployee)
 * BaseEntity fields included for form input
 */
export const InvestmentFormFields = {
  // Base Entity Fields (for form input)
  id: 'id',
  version: 'version',
  additionalProperties: 'additionalProperties',

  // Investment Core Fields
  code: 'code',
  name: 'name',
  isin: 'isin',
  acquisitionDate: 'acquisitionDate',
  planedExit: 'planedExit',
  plannedExitDate: 'plannedExitDate',
  exitDate: 'exitDate',

  // Investment Amount Fields
  initialInvestmentAmount: 'initialInvestmentAmount',
  totalInvestmentAmount: 'totalInvestmentAmount',
  investmentMarketValue: 'investmentMarketValue',
  debtFinancingAmount: 'debtFinancingAmount',
  requiredCapitalAmount: 'requiredCapitalAmount',
  forecastedRevenueAmount: 'forecastedRevenueAmount',
  forecastedProfitAmount: 'forecastedProfitAmount',
  stakePercentage: 'stakePercentage',
  securityQuantity: 'securityQuantity',
  timeWeightedPerformance: 'timeWeightedPerformance',
  maturityDate: 'maturityDate',

  // Loan Fields
  loanRecipientName: 'loanRecipientName',
  loanAmount: 'loanAmount',
  loanOpenCommitmentAmount: 'loanOpenCommitmentAmount',
  loanInterestRate: 'loanInterestRate',
  loanStartDate: 'loanStartDate',
  loanEndDate: 'loanEndDate',
  loanInterestClaim: 'loanInterestClaim',

  // Fund Fields
  totalCommitmentAmount: 'totalCommitmentAmount',
  totalDistributionAmount: 'totalDistributionAmount',
  fundManagerName: 'fundManagerName',
  irr: 'irr',
  moic: 'moic',

  // Catalog Reference IDs (Ref fields) - used in forms
  investmentGroupRef: 'investmentGroupRef',
  investmentTypeRef: 'investmentTypeRef',
  investmentStakeTypeRef: 'investmentStakeTypeRef',
  investmentPhaseRef: 'investmentPhaseRef',
  investmentStatusRef: 'investmentStatusRef',
  investmentRiskLevelRef: 'investmentRiskLevelRef',
  currencyRef: 'currencyRef',

  // Entity Reference IDs (Id fields) - mapped to object fields in forms
  ownerEmployeeId: 'ownerEmployee',
  investmentOpportunityId: 'investmentOpportunity',
  loanRecipientInvestmentAccountId: 'loanRecipientInvestmentAccount',
  companyId: 'company',

  // Junction table relationships
  investmentAccounts: 'investmentAccounts', // GraphQL field name

  investmentRole: 'investmentRoles'
} as const

/**
 * Export Subtype Form Fields for use in payload builders
 */
export { EquityInvestmentFormFields } from './equityInvestmentTypes'
export { RealEstateInvestmentFormFields } from './realEstateInvestmentTypes'
export { LiquidFundInvestmentFormFields } from './liquidFundInvestmentTypes'

/**
 * Investment Role Fields
 */
export const InvestmentRoleFields = {
  displayOrder: 'displayOrder',
  investmentRole: 'investmentRole',
  investmentRoleRef: 'investmentRoleRef',
  investment: 'investment',
  investmentId: 'investmentId'
} as const

/**
 * Investment Role Form Fields
 */
export const InvestmentRoleFormFields = {
  // Base Entity Fields
  id: 'id',
  version: 'version',

  // Investment Role Fields
  displayOrder: 'displayOrder',
  investmentRoleRef: 'investmentRoleRef',
  investmentId: 'investment'
} as const

/**
 * Create Investment Descriptors
 * Descriptors for search, sort, and filter functionality
 */
export const createInvestmentDescriptors = (
  fields: Record<keyof typeof InvestmentFields, string> = InvestmentFields
): Descriptor[] => [
  ...BASE_ENTITY_DESCRIPTORS,

  // Investment Core Fields
  { key: 'code', searchPaths: [fields.code], sortPath: fields.code, type: 'text' },
  { key: 'name', searchPaths: [fields.name], sortPath: fields.name, type: 'text' },
  { key: 'isin', searchPaths: [fields.isin], sortPath: fields.isin, type: 'text' },
  { key: 'acquisitionDate', searchPaths: [fields.acquisitionDate], sortPath: fields.acquisitionDate, type: 'date' },
  { key: 'planedExit', searchPaths: [fields.planedExit], sortPath: fields.planedExit, type: 'boolean' },
  { key: 'plannedExitDate', searchPaths: [fields.plannedExitDate], sortPath: fields.plannedExitDate, type: 'date' },
  { key: 'exitDate', searchPaths: [fields.exitDate], sortPath: fields.exitDate, type: 'date' },

  // Investment Amount Fields
  {
    key: 'initialInvestmentAmount',
    searchPaths: [fields.initialInvestmentAmount],
    sortPath: fields.initialInvestmentAmount,
    type: 'number'
  },
  {
    key: 'totalInvestmentAmount',
    searchPaths: [fields.totalInvestmentAmount],
    sortPath: fields.totalInvestmentAmount,
    type: 'number'
  },
  {
    key: 'investmentMarketValue',
    searchPaths: [fields.investmentMarketValue],
    sortPath: fields.investmentMarketValue,
    type: 'number'
  },
  {
    key: 'debtFinancingAmount',
    searchPaths: [fields.debtFinancingAmount],
    sortPath: fields.debtFinancingAmount,
    type: 'number'
  },
  {
    key: 'requiredCapitalAmount',
    searchPaths: [fields.requiredCapitalAmount],
    sortPath: fields.requiredCapitalAmount,
    type: 'number'
  },
  {
    key: 'forecastedRevenueAmount',
    searchPaths: [fields.forecastedRevenueAmount],
    sortPath: fields.forecastedRevenueAmount,
    type: 'number'
  },
  {
    key: 'forecastedProfitAmount',
    searchPaths: [fields.forecastedProfitAmount],
    sortPath: fields.forecastedProfitAmount,
    type: 'number'
  },
  {
    key: 'stakePercentage',
    searchPaths: [fields.stakePercentage],
    sortPath: fields.stakePercentage,
    type: 'number'
  },
  {
    key: 'securityQuantity',
    searchPaths: [fields.securityQuantity],
    sortPath: fields.securityQuantity,
    type: 'number'
  },
  {
    key: 'timeWeightedPerformance',
    searchPaths: [fields.timeWeightedPerformance],
    sortPath: fields.timeWeightedPerformance,
    type: 'number'
  },
  { key: 'maturityDate', searchPaths: [fields.maturityDate], sortPath: fields.maturityDate, type: 'date' },

  // Loan Fields
  {
    key: 'loanRecipientName',
    searchPaths: [fields.loanRecipientName],
    sortPath: fields.loanRecipientName,
    type: 'text'
  },
  { key: 'loanAmount', searchPaths: [fields.loanAmount], sortPath: fields.loanAmount, type: 'number' },
  {
    key: 'loanOpenCommitmentAmount',
    searchPaths: [fields.loanOpenCommitmentAmount],
    sortPath: fields.loanOpenCommitmentAmount,
    type: 'number'
  },
  {
    key: 'loanInterestRate',
    searchPaths: [fields.loanInterestRate],
    sortPath: fields.loanInterestRate,
    type: 'number'
  },
  { key: 'loanStartDate', searchPaths: [fields.loanStartDate], sortPath: fields.loanStartDate, type: 'date' },
  { key: 'loanEndDate', searchPaths: [fields.loanEndDate], sortPath: fields.loanEndDate, type: 'date' },
  {
    key: 'loanInterestClaim',
    searchPaths: [fields.loanInterestClaim],
    sortPath: fields.loanInterestClaim,
    type: 'number'
  },

  // Fund Fields
  {
    key: 'totalCommitmentAmount',
    searchPaths: [fields.totalCommitmentAmount],
    sortPath: fields.totalCommitmentAmount,
    type: 'number'
  },
  {
    key: 'totalDistributionAmount',
    searchPaths: [fields.totalDistributionAmount],
    sortPath: fields.totalDistributionAmount,
    type: 'number'
  },
  {
    key: 'fundManagerName',
    searchPaths: [fields.fundManagerName],
    sortPath: fields.fundManagerName,
    type: 'text'
  },
  { key: 'irr', searchPaths: [fields.irr], sortPath: fields.irr, type: 'number' },
  { key: 'moic', searchPaths: [fields.moic], sortPath: fields.moic, type: 'number' },

  // Catalog References
  {
    key: 'investmentGroup',
    searchPaths: [`${fields.investmentGroup}.value`, `${fields.investmentGroup}.code`],
    sortPath: `${fields.investmentGroup}.value`,
    type: 'text'
  },
  {
    key: 'investmentType',
    searchPaths: [`${fields.investmentType}.value`, `${fields.investmentType}.code`],
    sortPath: `${fields.investmentType}.value`,
    type: 'text'
  },
  {
    key: 'investmentStakeType',
    searchPaths: [`${fields.investmentStakeType}.value`, `${fields.investmentStakeType}.code`],
    sortPath: `${fields.investmentStakeType}.value`,
    type: 'text'
  },
  {
    key: 'investmentPhase',
    searchPaths: [`${fields.investmentPhase}.value`, `${fields.investmentPhase}.code`],
    sortPath: `${fields.investmentPhase}.value`,
    type: 'text'
  },
  {
    key: 'investmentStatus',
    searchPaths: [`${fields.investmentStatus}.value`, `${fields.investmentStatus}.code`],
    sortPath: `${fields.investmentStatus}.value`,
    type: 'text'
  },
  {
    key: 'investmentRiskLevel',
    searchPaths: [`${fields.investmentRiskLevel}.value`, `${fields.investmentRiskLevel}.code`],
    sortPath: `${fields.investmentRiskLevel}.value`,
    type: 'text'
  },
  {
    key: 'currency',
    searchPaths: [`${fields.currency}.value`, `${fields.currency}.code`],
    sortPath: `${fields.currency}.code`,
    type: 'text'
  },

  // Entity References
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
    key: 'investmentAccounts', // GraphQL field name
    searchPaths: [
      `${fields.investmentAccounts}.investmentAccount.name`,
      `${fields.investmentAccounts}.investmentAccount.code`
    ],
    sortPaths: [`${fields.investmentAccounts}.investmentAccount.name`],
    type: 'text'
  },
  {
    key: 'investmentOpportunity',
    searchPaths: [`${fields.investmentOpportunity}.name`],
    sortPath: `${fields.investmentOpportunity}.name`,
    type: 'text'
  },
  {
    key: 'company',
    searchPaths: [`${fields.company}.name`, `${fields.company}.code`],
    sortPath: `${fields.company}.name`,
    type: 'text'
  },

  // Filter IDs
  {
    key: 'investmentGroupIds',
    path: fields.investmentGroupRef,
    filterLabel: 'Investment Group',
    optionSelectPaths: [`${fields.investmentGroup}.id`, `${fields.investmentGroup}.value`],
    optionSearchPaths: [`${fields.investmentGroup}.value`, `${fields.investmentGroup}.code`],
    optionDistinctOn: [fields.investmentGroupRef],
    kind: 'inIds'
  },
  {
    key: 'investmentTypeIds',
    path: fields.investmentTypeRef,
    filterLabel: 'Investment Type',
    optionSelectPaths: [`${fields.investmentType}.id`, `${fields.investmentType}.value`],
    optionSearchPaths: [`${fields.investmentType}.value`, `${fields.investmentType}.code`],
    optionDistinctOn: [fields.investmentTypeRef],
    kind: 'inIds'
  },
  {
    key: 'investmentStatusIds',
    path: fields.investmentStatusRef,
    filterLabel: 'Investment Status',
    optionSelectPaths: [`${fields.investmentStatus}.id`, `${fields.investmentStatus}.value`],
    optionSearchPaths: [`${fields.investmentStatus}.value`, `${fields.investmentStatus}.code`],
    optionDistinctOn: [fields.investmentStatusRef],
    kind: 'inIds'
  },
  {
    key: 'investmentPhaseIds',
    path: fields.investmentPhaseRef,
    filterLabel: 'Investment Phase',
    optionSelectPaths: [`${fields.investmentPhase}.id`, `${fields.investmentPhase}.value`],
    optionSearchPaths: [`${fields.investmentPhase}.value`, `${fields.investmentPhase}.code`],
    optionDistinctOn: [fields.investmentPhaseRef],
    kind: 'inIds'
  },
  {
    key: 'investmentRiskLevelIds',
    path: fields.investmentRiskLevelRef,
    filterLabel: 'Investment Risk Level',
    optionSelectPaths: [`${fields.investmentRiskLevel}.id`, `${fields.investmentRiskLevel}.value`],
    optionSearchPaths: [`${fields.investmentRiskLevel}.value`, `${fields.investmentRiskLevel}.code`],
    optionDistinctOn: [fields.investmentRiskLevelRef],
    kind: 'inIds'
  },
  {
    key: 'currencyIds',
    path: fields.currencyRef,
    filterLabel: 'Currency',
    optionSelectPaths: [`${fields.currency}.id`, `${fields.currency}.code`],
    optionSearchPaths: [`${fields.currency}.value`, `${fields.currency}.code`],
    optionDistinctOn: [fields.currencyRef],
    kind: 'inIds'
  },
  {
    key: 'ownerEmployeeIds',
    path: fields.ownerEmployeeId,
    filterLabel: 'Owner',
    optionSelectPaths: [`${fields.ownerEmployee}.id`, `${fields.ownerEmployee}.displayName`],
    optionSearchPaths: [
      `${fields.ownerEmployee}.displayName`,
      `${fields.ownerEmployee}.firstName`,
      `${fields.ownerEmployee}.lastName`
    ],
    optionDistinctOn: [fields.ownerEmployeeId],
    kind: 'inIds'
  },
  {
    key: 'investmentAccountIds',
    path: `${fields.investmentAccounts}.investmentAccountId`, // GraphQL field name
    filterLabel: 'Account',
    kind: 'inIds'
  },
  {
    key: 'companyIds',
    path: fields.companyId,
    filterLabel: 'Company',
    optionSelectPaths: [`${fields.company}.id`, `${fields.company}.name`],
    optionSearchPaths: [`${fields.company}.name`, `${fields.company}.code`],
    optionDistinctOn: [fields.companyId],
    kind: 'inIds'
  },
  {
    key: 'opportunityIds',
    path: fields.investmentOpportunityId,
    filterLabel: 'Opportunity',
    optionSelectPaths: [`${fields.investmentOpportunity}.id`, `${fields.investmentOpportunity}.name`],
    optionSearchPaths: [`${fields.investmentOpportunity}.name`],
    optionDistinctOn: [fields.investmentOpportunityId],
    kind: 'inIds'
  },

  // Date Range Filters
  { key: 'createdAtFrom', path: 'createdAt', kind: 'dateFrom' },
  { key: 'createdAtTo', path: 'createdAt', kind: 'dateTo' },
  { key: 'acquisitionDateFrom', path: fields.acquisitionDate, kind: 'dateFrom' },
  { key: 'acquisitionDateTo', path: fields.acquisitionDate, kind: 'dateTo' },
  { key: 'plannedExitDateFrom', path: fields.plannedExitDate, kind: 'dateFrom' },
  { key: 'plannedExitDateTo', path: fields.plannedExitDate, kind: 'dateTo' },
  { key: 'exitDateFrom', path: fields.exitDate, kind: 'dateFrom' },
  { key: 'exitDateTo', path: fields.exitDate, kind: 'dateTo' },
  { key: 'maturityDateFrom', path: fields.maturityDate, kind: 'dateFrom' },
  { key: 'maturityDateTo', path: fields.maturityDate, kind: 'dateTo' }
]

/**
 * Create Investment Role Descriptors
 */
export const createInvestmentRoleDescriptors = (
  fields: Record<keyof typeof InvestmentRoleFields, string> = InvestmentRoleFields
): Descriptor[] => [
  ...BASE_ENTITY_DESCRIPTORS,
  { key: 'displayOrder', searchPaths: [fields.displayOrder], sortPath: fields.displayOrder, type: 'number' },
  {
    key: 'investmentRole',
    searchPaths: [`${fields.investmentRole}.value`, `${fields.investmentRole}.code`],
    sortPath: `${fields.investmentRole}.value`,
    type: 'text'
  },
  {
    key: 'investmentRoleIds',
    path: fields.investmentRoleRef,
    filterLabel: 'Investment Role',
    optionSelectPaths: [`${fields.investmentRole}.id`, `${fields.investmentRole}.value`],
    optionSearchPaths: [`${fields.investmentRole}.value`, `${fields.investmentRole}.code`],
    optionDistinctOn: [fields.investmentRoleRef],
    kind: 'inIds'
  },
  { key: 'investmentId', path: fields.investmentId, kind: 'inIds' }
]

/**
 * Default Investment Descriptors
 */
export const INVESTMENT_DESCRIPTORS = createInvestmentDescriptors()
export const INVESTMENT_ROLE_DESCRIPTORS = createInvestmentRoleDescriptors()

/**
 * Build Investment Payload
 * Uses buildPayload utility to transform investment data for API submission
 * Handles nested structures (equityInvestment, realEstateInvestment, liquidFundInvestment) separately
 */
export const buildInvestmentPayload = (investment: Partial<Investment>) => {
  // Build base payload using InvestmentFormFields for field mapping
  const basePayload = buildPayload(investment, InvestmentFormFields)

  // Determine if this is a create or update based on presence of id
  const isCreate = !investment.id

  const result: any = {
    investment: {
      ...basePayload,
      // Always set status to ACTIVE for new investments (only during creation)
      ...(isCreate && { investmentStatusRef: 'InvestmentStatus:v1:ACTIVE' })
    }
  }

  // Handle investment roles separately - investmentRole (form) → investmentRoles (API)
  if (investment.investmentRole && investment.investmentRole.length > 0) {
    const investmentRolesPayload = investment.investmentRole.map((role: any, index: number) => ({
      ...(role.id && { id: role.id }),
      ...(role.version !== undefined && { version: role.version }),
      investmentRoleRef: role.investmentRole?.id,
      displayOrder: role.displayOrder ?? index,
      ...(role.isDeleted !== undefined && { isDeleted: role.isDeleted })
    }))
    result.investment.investmentRoles = investmentRolesPayload
  }

  // investmentAccounts handled automatically by buildPayload (applies transformIdFields)

  // Handle nested structures separately - einfach aus dem Objekt den Payload bauen
  if (investment.equityInvestment && investment.equityInvestment.length > 0) {
    const equityData = investment.equityInvestment[0]
    result.equityInvestment = buildPayload(equityData, EquityInvestmentFormFields)
  }

  if (investment.realEstateInvestment && investment.realEstateInvestment.length > 0) {
    const realEstateData = investment.realEstateInvestment[0]
    result.realEstateInvestment = buildPayload(realEstateData, RealEstateInvestmentFormFields)
  }

  if (investment.liquidFundInvestment && investment.liquidFundInvestment.length > 0) {
    const liquidFundData = investment.liquidFundInvestment[0]
    result.liquidFundInvestment = buildPayload(liquidFundData, LiquidFundInvestmentFormFields)
  }

  return {
    investmentRequest: result
  }
}
