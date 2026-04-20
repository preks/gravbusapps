import { type BaseEntity, type CatalogEntry, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { Investment } from './investmentTypes.new'
import type { InvestmentAccount } from './investmentAccountTypes'
import { ReportScope } from './investmentEnums'
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'

/**
 * Investment Report Type
 * Extends BaseEntity directly - all base fields included
 * Field names match GraphQL query field names exactly
 */
export interface InvestmentReport extends BaseEntity {
  id?: string
  // Report Core Fields
  date?: string // ISO date string
  scope?: ReportScope

  // Catalog References (objects)
  investmentStakeType?: CatalogEntry
  investmentPhase?: CatalogEntry
  investmentStatus?: CatalogEntry
  investmentRiskLevel?: CatalogEntry
  currency?: CatalogEntry

  // Catalog Reference IDs (Ref fields)
  investmentStakeTypeRef?: string
  investmentPhaseRef?: string
  investmentStatusRef?: string
  investmentRiskLevelRef?: string
  currencyRef?: string

  // Entity References (objects)
  investment?: Investment
  loanRecipientInvestmentAccount?: InvestmentAccount

  // Entity Reference IDs (Id fields)
  investmentId?: string
  loanRecipientInvestmentAccountId?: string

  // Report fields (from investment table)
  plannedExitDate?: string // ISO date string
  totalInvestmentAmount?: number
  investmentMarketValue?: number
  debtFinancingAmount?: number
  requiredCapitalAmount?: number
  forecastedRevenueAmount?: number
  forecastedProfitAmount?: number
  stakePercentage?: number

  // Loan Fields
  loanRecipientName?: string
  loanAmount?: number
  loanOpenCommitmentAmount?: number
  loanInterestRate?: number
  loanStartDate?: string // ISO date string
  loanEndDate?: string // ISO date string
  loanInterestClaim?: number

  // Fund Fields
  totalCommitmentAmount?: number
  totalDistributionAmount?: number
  fundManagerName?: string
  identification?: any // Jsonb

  // Financial metrics
  irr?: number // Internal Rate of Return
  moic?: number // Multiple on Invested Capital

  // Additional metadata fields
  businessKey?: string // Business identifier for external integrations
  processInstanceId?: string // Kogito process tracking
  synchronizedAt?: string // ISO timestamp

  // Specific report type relationships
  equityInvestmentReport?: EquityInvestmentReport[]
  liquidFundInvestmentReport?: LiquidFundInvestmentReport[]
  realEstateInvestmentReport?: RealEstateInvestmentReport[]
  investmentRoleReport?: InvestmentRoleReport[]
}

/**
 * Equity Investment Report Type
 * Extends BaseEntity directly
 */
export interface EquityInvestmentReport extends BaseEntity {
  id?: string
  date?: string // ISO date string
  scope?: ReportScope
  marketValue?: number
  turnoverAmount?: number
  ebitdaAmount?: number
  equityInvestmentId?: string // Foreign key
  additionalProperties?: any
  businessKey?: string
  processInstanceId?: string
  synchronizedAt?: string
  equityInvestment?: any // BaseEquityInvestment
}

/**
 * Real Estate Investment Report Type
 * Extends BaseEntity directly
 */
export interface RealEstateInvestmentReport extends BaseEntity {
  id?: string
  date?: string // ISO date string
  scope?: ReportScope
  size?: number
  sizeMeasurementUnitRef?: string
  numberOfUnits?: number
  occupancyPercent?: number
  annualNetColdRent?: number
  funding?: number
  actualAnnualExpenses?: number
  targetAnnualExpenses?: number
  liquidityForecast?: any // Jsonb
  realEstateInvestmentId?: string // Foreign key
  additionalProperties?: any
  businessKey?: string
  processInstanceId?: string
  synchronizedAt?: string
  realEstateInvestment?: any // BaseRealEstateInvestment
}

/**
 * Liquid Fund Investment Report Type
 * Extends BaseEntity directly
 */
export interface LiquidFundInvestmentReport extends BaseEntity {
  id?: string
  date?: string // ISO date string
  scope?: ReportScope
  proprietorName?: string
  bankName?: string
  bankAccountNumber?: string
  earlyTerminationAllowed?: boolean
  interestRate?: number
  maturityDate?: string // ISO date string
  liquidFundInvestmentId?: string // Foreign key
  additionalProperties?: any
  businessKey?: string
  processInstanceId?: string
  synchronizedAt?: string
  interestPaymentFrequencyRef?: string
  investmentLiquidFundTypeRef?: string
  investmentLiquidFundType?: CatalogEntry
  interestPaymentFrequency?: CatalogEntry
  liquidFundInvestment?: any // BaseLiquidFundInvestment
}

/**
 * Investment Role Report Type
 * Extends BaseEntity directly
 */
export interface InvestmentRoleReport extends BaseEntity {
  id?: string
  displayOrder?: number
  investmentRole?: CatalogEntry
  investmentRoleRef?: string
  investmentReport?: InvestmentReport
  investmentReportId?: string
}

/**
 * Investment Report Fields
 * ALL fields including Ref and Id fields (BaseEntity fields NOT included - handled by BASE_ENTITY_DESCRIPTORS)
 * Field names match GraphQL query field names exactly
 */
export const InvestmentReportFields = {
  id: 'id',
  additionalProperties: 'additionalProperties',
  // Report Core Fields
  date: 'date',
  scope: 'scope',

  // Catalog References (objects)
  investmentStakeType: 'investmentStakeType',
  investmentPhase: 'investmentPhase',
  investmentStatus: 'investmentStatus',
  investmentRiskLevel: 'investmentRiskLevel',
  currency: 'currency',

  // Catalog Reference IDs (Ref fields)
  investmentStakeTypeRef: 'investmentStakeTypeRef',
  investmentPhaseRef: 'investmentPhaseRef',
  investmentStatusRef: 'investmentStatusRef',
  investmentRiskLevelRef: 'investmentRiskLevelRef',
  currencyRef: 'currencyRef',

  // Entity References (objects)
  investment: 'investment',
  loanRecipientInvestmentAccount: 'loanRecipientInvestmentAccount',

  // Entity Reference IDs (Id fields)
  investmentId: 'investmentId',
  loanRecipientInvestmentAccountId: 'loanRecipientInvestmentAccountId',

  // Report fields (from investment table)
  plannedExitDate: 'plannedExitDate',
  totalInvestmentAmount: 'totalInvestmentAmount',
  investmentMarketValue: 'investmentMarketValue',
  debtFinancingAmount: 'debtFinancingAmount',
  requiredCapitalAmount: 'requiredCapitalAmount',
  forecastedRevenueAmount: 'forecastedRevenueAmount',
  forecastedProfitAmount: 'forecastedProfitAmount',
  stakePercentage: 'stakePercentage',

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
  identification: 'identification',

  // Financial metrics
  irr: 'irr',
  moic: 'moic',

  // Additional metadata fields
  businessKey: 'businessKey',
  processInstanceId: 'processInstanceId',
  synchronizedAt: 'synchronizedAt',

  // Relationships - Form field names → GraphQL field names
  equityInvestmentReport: 'equityInvestmentReport',
  liquidFundInvestmentReport: 'liquidFundInvestmentReport',
  realEstateInvestmentReport: 'realEstateInvestmentReport',
  investmentRoleReport: 'investmentRoleReport'
} as const

/**
 * Investment Report Form Fields
 * Only input-capable fields - Id fields map to object fields (investmentId -> investment)
 * BaseEntity fields included for form input
 */
export const InvestmentReportFormFields = {
  id: 'id',
  version: 'version',
  additionalProperties: 'additionalProperties',
  // Report Core Fields
  date: 'date',
  scope: 'scope',

  // Catalog Reference IDs (Ref fields) - used in forms
  investmentStakeTypeRef: 'investmentStakeTypeRef',
  investmentPhaseRef: 'investmentPhaseRef',
  investmentStatusRef: 'investmentStatusRef',
  investmentRiskLevelRef: 'investmentRiskLevelRef',
  currencyRef: 'currencyRef',

  // Entity Reference IDs (Id fields) - mapped to object fields in forms
  investmentId: 'investment',
  loanRecipientInvestmentAccountId: 'loanRecipientInvestmentAccount',

  // Report fields (from investment table)
  plannedExitDate: 'plannedExitDate',
  totalInvestmentAmount: 'totalInvestmentAmount',
  investmentMarketValue: 'investmentMarketValue',
  debtFinancingAmount: 'debtFinancingAmount',
  requiredCapitalAmount: 'requiredCapitalAmount',
  forecastedRevenueAmount: 'forecastedRevenueAmount',
  forecastedProfitAmount: 'forecastedProfitAmount',
  stakePercentage: 'stakePercentage',

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
  identification: 'identification',

  // Financial metrics
  irr: 'irr',
  moic: 'moic'
} as const

/**
 * Equity Investment Report Form Fields
 */
export const EquityInvestmentReportFormFields = {
  id: 'id',
  version: 'version',
  additionalProperties: 'additionalProperties',
  // Report Core Fields
  date: 'date',
  scope: 'scope',
  // Equity Investment Report Fields
  marketValue: 'marketValue',
  turnoverAmount: 'turnoverAmount',
  ebitdaAmount: 'ebitdaAmount',
  equityInvestmentId: 'equityInvestment'
} as const

/**
 * Liquid Fund Investment Report Form Fields
 */
export const LiquidFundInvestmentReportFormFields = {
  id: 'id',
  version: 'version',
  additionalProperties: 'additionalProperties',
  // Report Core Fields
  date: 'date',
  scope: 'scope',
  // Liquid Fund Investment Report Fields
  proprietorName: 'proprietorName',
  bankName: 'bankName',
  bankAccountNumber: 'bankAccountNumber',
  earlyTerminationAllowed: 'earlyTerminationAllowed',
  interestRate: 'interestRate',
  maturityDate: 'maturityDate',
  investmentLiquidFundTypeRef: 'investmentLiquidFundTypeRef',
  interestPaymentFrequencyRef: 'interestPaymentFrequencyRef',
  liquidFundInvestmentId: 'liquidFundInvestment'
} as const

/**
 * Real Estate Investment Report Form Fields
 */
export const RealEstateInvestmentReportFormFields = {
  id: 'id',
  version: 'version',
  additionalProperties: 'additionalProperties',
  // Report Core Fields
  date: 'date',
  scope: 'scope',
  // Real Estate Investment Report Fields
  size: 'size',
  sizeMeasurementUnitRef: 'sizeMeasurementUnitRef',
  numberOfUnits: 'numberOfUnits',
  occupancyPercent: 'occupancyPercent',
  annualNetColdRent: 'annualNetColdRent',
  funding: 'funding',
  actualAnnualExpenses: 'actualAnnualExpenses',
  targetAnnualExpenses: 'targetAnnualExpenses',
  liquidityForecast: 'liquidityForecast',
  realEstateInvestmentId: 'realEstateInvestment'
} as const

/**
 * Create Investment Report Descriptors
 * Descriptors for search, sort, and filter functionality
 */
export const createInvestmentReportDescriptors = (
  fields: Record<keyof typeof InvestmentReportFields, string> = InvestmentReportFields
): Descriptor[] => [
  ...BASE_ENTITY_DESCRIPTORS,

  // Report Core Fields
  { key: 'date', searchPaths: [fields.date], sortPath: fields.date, type: 'date' },
  { key: 'scope', searchPaths: [fields.scope], sortPath: fields.scope, type: 'text' },

  // Report Amount Fields
  {
    key: 'totalInvestmentAmount',
    path: fields.totalInvestmentAmount,
    searchPaths: [fields.totalInvestmentAmount],
    sortPath: fields.totalInvestmentAmount,
    type: 'number'
  },
  {
    key: 'investmentMarketValue',
    path: fields.investmentMarketValue,
    searchPaths: [fields.investmentMarketValue],
    sortPath: fields.investmentMarketValue,
    type: 'number'
  },
  {
    key: 'debtFinancingAmount',
    path: fields.debtFinancingAmount,
    searchPaths: [fields.debtFinancingAmount],
    sortPath: fields.debtFinancingAmount,
    type: 'number'
  },
  {
    key: 'requiredCapitalAmount',
    path: fields.requiredCapitalAmount,
    searchPaths: [fields.requiredCapitalAmount],
    sortPath: fields.requiredCapitalAmount,
    type: 'number'
  },
  {
    key: 'forecastedRevenueAmount',
    path: fields.forecastedRevenueAmount,
    searchPaths: [fields.forecastedRevenueAmount],
    sortPath: fields.forecastedRevenueAmount,
    type: 'number'
  },
  {
    key: 'forecastedProfitAmount',
    path: fields.forecastedProfitAmount,
    searchPaths: [fields.forecastedProfitAmount],
    sortPath: fields.forecastedProfitAmount,
    type: 'number'
  },
  {
    key: 'stakePercentage',
    path: fields.stakePercentage,
    searchPaths: [fields.stakePercentage],
    sortPath: fields.stakePercentage,
    type: 'number'
  },

  // Loan Fields
  {
    key: 'loanRecipientName',
    searchPaths: [fields.loanRecipientName],
    sortPath: fields.loanRecipientName,
    type: 'text'
  },
  {
    key: 'loanAmount',
    path: fields.loanAmount,
    searchPaths: [fields.loanAmount],
    sortPath: fields.loanAmount,
    type: 'number'
  },
  {
    key: 'loanOpenCommitmentAmount',
    path: fields.loanOpenCommitmentAmount,
    searchPaths: [fields.loanOpenCommitmentAmount],
    sortPath: fields.loanOpenCommitmentAmount,
    type: 'number'
  },
  {
    key: 'loanInterestRate',
    path: fields.loanInterestRate,
    searchPaths: [fields.loanInterestRate],
    sortPath: fields.loanInterestRate,
    type: 'number'
  },
  { key: 'loanStartDate', searchPaths: [fields.loanStartDate], sortPath: fields.loanStartDate, type: 'date' },
  { key: 'loanEndDate', searchPaths: [fields.loanEndDate], sortPath: fields.loanEndDate, type: 'date' },
  {
    key: 'loanInterestClaim',
    path: fields.loanInterestClaim,
    searchPaths: [fields.loanInterestClaim],
    sortPath: fields.loanInterestClaim,
    type: 'number'
  },

  // Fund Fields
  {
    key: 'totalCommitmentAmount',
    path: fields.totalCommitmentAmount,
    searchPaths: [fields.totalCommitmentAmount],
    sortPath: fields.totalCommitmentAmount,
    type: 'number'
  },
  {
    key: 'totalDistributionAmount',
    path: fields.totalDistributionAmount,
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

  // Financial Metrics
  {
    key: 'irr',
    path: fields.irr,
    searchPaths: [fields.irr],
    sortPath: fields.irr,
    type: 'number'
  },
  {
    key: 'moic',
    path: fields.moic,
    searchPaths: [fields.moic],
    sortPath: fields.moic,
    type: 'number'
  },

  // Real Estate Report Fields (nested in realEstateInvestmentReport)
  {
    key: 'realEstateSize',
    path: 'realEstateInvestmentReport.size',
    searchPaths: ['realEstateInvestmentReport.size'],
    sortPath: 'realEstateInvestmentReport.size',
    type: 'number'
  },
  {
    key: 'realEstateNumberOfUnits',
    path: 'realEstateInvestmentReport.numberOfUnits',
    searchPaths: ['realEstateInvestmentReport.numberOfUnits'],
    sortPath: 'realEstateInvestmentReport.numberOfUnits',
    type: 'number'
  },
  {
    key: 'realEstateOccupancyPercent',
    path: 'realEstateInvestmentReport.occupancyPercent',
    searchPaths: ['realEstateInvestmentReport.occupancyPercent'],
    sortPath: 'realEstateInvestmentReport.occupancyPercent',
    type: 'number'
  },
  {
    key: 'realEstateAnnualNetColdRent',
    path: 'realEstateInvestmentReport.annualNetColdRent',
    searchPaths: ['realEstateInvestmentReport.annualNetColdRent'],
    sortPath: 'realEstateInvestmentReport.annualNetColdRent',
    type: 'number'
  },
  {
    key: 'realEstateFunding',
    path: 'realEstateInvestmentReport.funding',
    searchPaths: ['realEstateInvestmentReport.funding'],
    sortPath: 'realEstateInvestmentReport.funding',
    type: 'number'
  },
  {
    key: 'realEstateActualAnnualExpenses',
    path: 'realEstateInvestmentReport.actualAnnualExpenses',
    searchPaths: ['realEstateInvestmentReport.actualAnnualExpenses'],
    sortPath: 'realEstateInvestmentReport.actualAnnualExpenses',
    type: 'number'
  },
  {
    key: 'realEstateTargetAnnualExpenses',
    path: 'realEstateInvestmentReport.targetAnnualExpenses',
    searchPaths: ['realEstateInvestmentReport.targetAnnualExpenses'],
    sortPath: 'realEstateInvestmentReport.targetAnnualExpenses',
    type: 'number'
  },
  {
    key: 'realEstateLocality',
    path: 'realEstateInvestmentReport.realEstateInvestment.locality',
    searchPaths: ['realEstateInvestmentReport.realEstateInvestment.locality'],
    sortPath: 'realEstateInvestmentReport.realEstateInvestment.locality',
    type: 'text'
  },
  {
    key: 'realEstatePostalCode',
    path: 'realEstateInvestmentReport.realEstateInvestment.postalCode',
    searchPaths: ['realEstateInvestmentReport.realEstateInvestment.postalCode'],
    sortPath: 'realEstateInvestmentReport.realEstateInvestment.postalCode',
    type: 'text'
  },

  // Equity Report Fields (nested in equityInvestmentReport)
  {
    key: 'equityMarketValue',
    path: 'equityInvestmentReport.marketValue',
    searchPaths: ['equityInvestmentReport.marketValue'],
    sortPath: 'equityInvestmentReport.marketValue',
    type: 'number'
  },
  {
    key: 'equityTurnoverAmount',
    path: 'equityInvestmentReport.turnoverAmount',
    searchPaths: ['equityInvestmentReport.turnoverAmount'],
    sortPath: 'equityInvestmentReport.turnoverAmount',
    type: 'number'
  },
  {
    key: 'equityEbitdaAmount',
    path: 'equityInvestmentReport.ebitdaAmount',
    searchPaths: ['equityInvestmentReport.ebitdaAmount'],
    sortPath: 'equityInvestmentReport.ebitdaAmount',
    type: 'number'
  },

  // Liquid Fund Report Fields (nested in liquidFundInvestmentReport)
  {
    key: 'liquidFundInterestRate',
    path: 'liquidFundInvestmentReport.interestRate',
    searchPaths: ['liquidFundInvestmentReport.interestRate'],
    sortPath: 'liquidFundInvestmentReport.interestRate',
    type: 'number'
  },
  {
    key: 'liquidFundMaturityDate',
    path: 'liquidFundInvestmentReport.maturityDate',
    searchPaths: ['liquidFundInvestmentReport.maturityDate'],
    sortPath: 'liquidFundInvestmentReport.maturityDate',
    type: 'date'
  },
  {
    key: 'liquidFundProprietorName',
    path: 'liquidFundInvestmentReport.proprietorName',
    searchPaths: ['liquidFundInvestmentReport.proprietorName'],
    sortPath: 'liquidFundInvestmentReport.proprietorName',
    type: 'text'
  },
  {
    key: 'liquidFundBankName',
    path: 'liquidFundInvestmentReport.bankName',
    searchPaths: ['liquidFundInvestmentReport.bankName'],
    sortPath: 'liquidFundInvestmentReport.bankName',
    type: 'text'
  },
  {
    key: 'liquidFundBankAccountNumber',
    path: 'liquidFundInvestmentReport.bankAccountNumber',
    searchPaths: ['liquidFundInvestmentReport.bankAccountNumber'],
    sortPath: 'liquidFundInvestmentReport.bankAccountNumber',
    type: 'text'
  },
  {
    key: 'liquidFundEarlyTerminationAllowed',
    path: 'liquidFundInvestmentReport.earlyTerminationAllowed',
    searchPaths: ['liquidFundInvestmentReport.earlyTerminationAllowed'],
    sortPath: 'liquidFundInvestmentReport.earlyTerminationAllowed',
    type: 'boolean'
  },

  // Catalog References
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
    key: 'investment',
    searchPaths: [`${fields.investment}.name`, `${fields.investment}.code`],
    sortPath: `${fields.investment}.name`,
    type: 'text'
  },
  {
    key: 'loanRecipientInvestmentAccount',
    searchPaths: [`${fields.loanRecipientInvestmentAccount}.name`, `${fields.loanRecipientInvestmentAccount}.code`],
    sortPath: `${fields.loanRecipientInvestmentAccount}.name`,
    type: 'text'
  },

  // Filter IDs
  {
    key: 'investmentStakeTypeIds',
    path: fields.investmentStakeTypeRef,
    filterLabel: 'Investment Stake Type',
    optionSelectPaths: [`${fields.investmentStakeType}.id`, `${fields.investmentStakeType}.value`],
    optionSearchPaths: [`${fields.investmentStakeType}.value`, `${fields.investmentStakeType}.code`],
    optionDistinctOn: [fields.investmentStakeTypeRef],
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
    key: 'investmentStatusIds',
    path: fields.investmentStatusRef,
    filterLabel: 'Investment Status',
    optionSelectPaths: [`${fields.investmentStatus}.id`, `${fields.investmentStatus}.value`],
    optionSearchPaths: [`${fields.investmentStatus}.value`, `${fields.investmentStatus}.code`],
    optionDistinctOn: [fields.investmentStatusRef],
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
    key: 'investmentIds',
    path: fields.investmentId,
    filterLabel: 'Investment',
    optionSelectPaths: [`${fields.investment}.id`, `${fields.investment}.name`],
    optionSearchPaths: [`${fields.investment}.name`, `${fields.investment}.code`],
    optionDistinctOn: [fields.investmentId],
    kind: 'inIds'
  },
  {
    key: 'accountIds',
    path: fields.loanRecipientInvestmentAccountId,
    filterLabel: 'Loan Recipient Account',
    optionSelectPaths: [`${fields.loanRecipientInvestmentAccount}.id`, `${fields.loanRecipientInvestmentAccount}.name`],
    optionSearchPaths: [
      `${fields.loanRecipientInvestmentAccount}.name`,
      `${fields.loanRecipientInvestmentAccount}.code`
    ],
    optionDistinctOn: [fields.loanRecipientInvestmentAccountId],
    kind: 'inIds'
  },
  {
    key: 'investmentLiquidFundTypeIds',
    path: 'liquidFundInvestmentReport.investmentLiquidFundTypeRef',
    filterLabel: 'Liquid Fund Type',
    optionSelectPaths: [
      'liquidFundInvestmentReport.investmentLiquidFundType.id',
      'liquidFundInvestmentReport.investmentLiquidFundType.value'
    ],
    optionSearchPaths: [
      'liquidFundInvestmentReport.investmentLiquidFundType.value',
      'liquidFundInvestmentReport.investmentLiquidFundType.code'
    ],
    optionDistinctOn: ['liquidFundInvestmentReport.investmentLiquidFundTypeRef'],
    kind: 'inIds'
  },
  {
    key: 'interestPaymentFrequencyIds',
    path: 'liquidFundInvestmentReport.interestPaymentFrequencyRef',
    filterLabel: 'Interest Payment Frequency',
    optionSelectPaths: [
      'liquidFundInvestmentReport.interestPaymentFrequency.id',
      'liquidFundInvestmentReport.interestPaymentFrequency.value'
    ],
    optionSearchPaths: [
      'liquidFundInvestmentReport.interestPaymentFrequency.value',
      'liquidFundInvestmentReport.interestPaymentFrequency.code'
    ],
    optionDistinctOn: ['liquidFundInvestmentReport.interestPaymentFrequencyRef'],
    kind: 'inIds'
  },

  // Date Range Filters
  { key: 'dateFrom', path: fields.date, kind: 'dateFrom' },
  { key: 'dateTo', path: fields.date, kind: 'dateTo' },
  { key: 'plannedExitDateFrom', path: fields.plannedExitDate, kind: 'dateFrom' },
  { key: 'plannedExitDateTo', path: fields.plannedExitDate, kind: 'dateTo' },
  { key: 'loanStartDateFrom', path: fields.loanStartDate, kind: 'dateFrom' },
  { key: 'loanStartDateTo', path: fields.loanStartDate, kind: 'dateTo' },
  { key: 'loanEndDateFrom', path: fields.loanEndDate, kind: 'dateFrom' },
  { key: 'loanEndDateTo', path: fields.loanEndDate, kind: 'dateTo' },
  { key: 'liquidFundMaturityDateFrom', path: 'liquidFundInvestmentReport.maturityDate', kind: 'dateFrom' },
  { key: 'liquidFundMaturityDateTo', path: 'liquidFundInvestmentReport.maturityDate', kind: 'dateTo' }
]

/**
 * Default Investment Report Descriptors
 */
export const INVESTMENT_REPORT_DESCRIPTORS = createInvestmentReportDescriptors()

/**
 * Build Investment Report Payload
 * Uses buildPayload utility to transform investment report data for API submission
 * Handles nested structures (equityInvestmentReport, liquidFundInvestmentReport, realEstateInvestmentReport) separately
 */
export const buildInvestmentReportPayload = (report: Partial<InvestmentReport>) => {
  // Build base payload using InvestmentReportFormFields for field mapping
  const basePayload = buildPayload(report, InvestmentReportFormFields)

  const result: any = {
    investmentReport: basePayload
  }

  // Handle nested structures separately - einfach aus dem Objekt den Payload bauen
  if (report.equityInvestmentReport && report.equityInvestmentReport.length > 0) {
    const equityReport = report.equityInvestmentReport[0]
    result.equityInvestmentReport = buildPayload(equityReport, EquityInvestmentReportFormFields)
  }

  if (report.liquidFundInvestmentReport && report.liquidFundInvestmentReport.length > 0) {
    const liquidFundReport = report.liquidFundInvestmentReport[0]
    result.liquidFundInvestmentReport = buildPayload(liquidFundReport, LiquidFundInvestmentReportFormFields)
  }

  if (report.realEstateInvestmentReport && report.realEstateInvestmentReport.length > 0) {
    const realEstateReport = report.realEstateInvestmentReport[0]
    result.realEstateInvestmentReport = buildPayload(realEstateReport, RealEstateInvestmentReportFormFields)
  }

  // Handle investment roles report separately - investmentRoleReport (form) → investmentRoles (API)
  if (report.investmentRoleReport && report.investmentRoleReport.length > 0) {
    const investmentRolesReportPayload = report.investmentRoleReport.map((roleReport: any, index: number) => ({
      ...(roleReport.id && { id: roleReport.id }),
      ...(roleReport.version !== undefined && { version: roleReport.version }),
      investmentRoleRef: roleReport.investmentRole?.id,
      displayOrder: roleReport.displayOrder ?? index,
      ...(roleReport.isDeleted !== undefined && { isDeleted: roleReport.isDeleted })
    }))
    result.investmentReport.investmentRoles = investmentRolesReportPayload
  }

  return {
    investmentReportRequest: result
  }
}
