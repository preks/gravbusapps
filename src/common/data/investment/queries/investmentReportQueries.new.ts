/**
 * Investment Report Queries (New)
 * GraphQL fragment builder for InvestmentReport entities
 * Query building (where, orderBy, limit, offset) is handled by hooks
 */

import { CATALOG_ENTRY, AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { INVESTMENT_ACCOUNT_REF, INVESTMENT_REF } from './fragments/investmentReferenceFragments'
import { InvestmentReportFields } from '../types/investmentReportTypes'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'

/**
 * Pre-defined Query Configurations
 * Field names must match InvestmentReport interface field names exactly
 */
export const INVESTMENT_REPORT_QUERY_CONFIGS: Record<string, string[]> = {
  // Minimal: Only essential fields for quick lookups
  minimal: ['id', 'date', 'investment'],

  // List: Common fields for table/list views
  list: [
    'id',
    'date',
    'scope',
    'investment',
    'investmentId',
    'investmentMarketValue',
    'totalInvestmentAmount',
    'investmentStatus',
    'investmentStatusRef',
    'investmentPhase',
    'investmentPhaseRef',
    'currency',
    'currencyRef',
    'createdAt',
    'updatedAt'
  ],

  // Record: Full report record with all fields and relations
  record: [
    'id',
    'version',
    'date',
    'scope',
    'investment',
    'investmentId',
    'loanRecipientInvestmentAccount',
    'loanRecipientInvestmentAccountId',
    'investmentStakeType',
    'investmentStakeTypeRef',
    'investmentPhase',
    'investmentPhaseRef',
    'investmentStatus',
    'investmentStatusRef',
    'investmentRiskLevel',
    'investmentRiskLevelRef',
    'currency',
    'currencyRef',
    'plannedExitDate',
    'totalInvestmentAmount',
    'investmentMarketValue',
    'debtFinancingAmount',
    'requiredCapitalAmount',
    'forecastedRevenueAmount',
    'forecastedProfitAmount',
    'stakePercentage',
    'loanRecipientName',
    'loanAmount',
    'loanOpenCommitmentAmount',
    'loanInterestRate',
    'loanStartDate',
    'loanEndDate',
    'loanInterestClaim',
    'totalCommitmentAmount',
    'totalDistributionAmount',
    'fundManagerName',
    'identification',
    'businessKey',
    'processInstanceId',
    'synchronizedAt',
    'additionalProperties',
    'createdAt',
    'createdBy',
    'updatedAt',
    'updatedBy',
    'isDeleted',
    'recordState',
    'activeFrom',
    'activeTo',
    'equityInvestmentReport',
    'liquidFundInvestmentReport',
    'realEstateInvestmentReport',
    'investmentRoleReport'
  ]
}

/**
 * Build catalog reference field fragment
 */
const buildCatalogReferenceField = (
  fieldSet: Set<string>,
  fieldName: string,
  fieldRefName: string,
  fieldKey: string
): string => {
  if (!fieldSet.has(fieldName) && !fieldSet.has(fieldRefName)) {
    return ''
  }
  const hasObject = fieldSet.has(fieldName)
  return `
      ${hasObject ? `${fieldKey} { ${CATALOG_ENTRY} }` : ''}
      ${InvestmentReportFields[fieldRefName as keyof typeof InvestmentReportFields]}
    `
}

/**
 * Build entity reference field fragment
 */
const buildEntityReferenceField = (
  fieldSet: Set<string>,
  fieldName: string,
  fieldRefName: string,
  fieldKey: string,
  refFragment: string
): string => {
  if (!fieldSet.has(fieldName) && !fieldSet.has(fieldRefName)) {
    return ''
  }
  const hasObject = fieldSet.has(fieldName)
  return `
      ${hasObject ? `${fieldKey} { ${refFragment} }` : ''}
      ${InvestmentReportFields[fieldRefName as keyof typeof InvestmentReportFields]}
    `
}

/**
 * Build investment field fragment
 */
const buildInvestmentFieldFragment = (fieldSet: Set<string>): string => {
  return buildEntityReferenceField(
    fieldSet,
    'investment',
    'investmentId',
    InvestmentReportFields.investment,
    INVESTMENT_REF
  )
}

/**
 * Build basic scalar fields section
 */
const buildBasicFields = (fieldSet: Set<string>): string => {
  const fields: string[] = []
  if (fieldSet.has('id')) fields.push('id')
  if (fieldSet.has('version')) fields.push('version')
  if (fieldSet.has('date')) fields.push(InvestmentReportFields.date)
  if (fieldSet.has('scope')) fields.push(InvestmentReportFields.scope)
  if (fieldSet.has('plannedExitDate')) fields.push(InvestmentReportFields.plannedExitDate)
  if (fieldSet.has('totalInvestmentAmount')) fields.push(InvestmentReportFields.totalInvestmentAmount)
  if (fieldSet.has('investmentMarketValue')) fields.push(InvestmentReportFields.investmentMarketValue)
  if (fieldSet.has('debtFinancingAmount')) fields.push(InvestmentReportFields.debtFinancingAmount)
  if (fieldSet.has('requiredCapitalAmount')) fields.push(InvestmentReportFields.requiredCapitalAmount)
  if (fieldSet.has('forecastedRevenueAmount')) fields.push(InvestmentReportFields.forecastedRevenueAmount)
  if (fieldSet.has('forecastedProfitAmount')) fields.push(InvestmentReportFields.forecastedProfitAmount)
  if (fieldSet.has('stakePercentage')) fields.push(InvestmentReportFields.stakePercentage)
  if (fieldSet.has('loanRecipientName')) fields.push(InvestmentReportFields.loanRecipientName)
  if (fieldSet.has('loanAmount')) fields.push(InvestmentReportFields.loanAmount)
  if (fieldSet.has('loanOpenCommitmentAmount')) fields.push(InvestmentReportFields.loanOpenCommitmentAmount)
  if (fieldSet.has('loanInterestRate')) fields.push(InvestmentReportFields.loanInterestRate)
  if (fieldSet.has('loanStartDate')) fields.push(InvestmentReportFields.loanStartDate)
  if (fieldSet.has('loanEndDate')) fields.push(InvestmentReportFields.loanEndDate)
  if (fieldSet.has('loanInterestClaim')) fields.push(InvestmentReportFields.loanInterestClaim)
  if (fieldSet.has('totalCommitmentAmount')) fields.push(InvestmentReportFields.totalCommitmentAmount)
  if (fieldSet.has('totalDistributionAmount')) fields.push(InvestmentReportFields.totalDistributionAmount)
  if (fieldSet.has('fundManagerName')) fields.push(InvestmentReportFields.fundManagerName)
  if (fieldSet.has('identification')) fields.push(InvestmentReportFields.identification)
  if (fieldSet.has('businessKey')) fields.push(InvestmentReportFields.businessKey)
  if (fieldSet.has('processInstanceId')) fields.push(InvestmentReportFields.processInstanceId)
  if (fieldSet.has('synchronizedAt')) fields.push(InvestmentReportFields.synchronizedAt)
  if (fieldSet.has('createdAt')) fields.push('createdAt')
  if (fieldSet.has('createdBy')) fields.push('createdBy')
  if (fieldSet.has('updatedAt')) fields.push('updatedAt')
  if (fieldSet.has('updatedBy')) fields.push('updatedBy')
  if (fieldSet.has('isDeleted')) fields.push('isDeleted')
  if (fieldSet.has('recordState')) fields.push('recordState')
  if (fieldSet.has('activeFrom')) fields.push('activeFrom')
  if (fieldSet.has('activeTo')) fields.push('activeTo')
  if (fieldSet.has('additionalProperties')) fields.push('additionalProperties')
  return fields.join('\n    ')
}

/**
 * Build catalog reference fields section
 */
const buildCatalogReferenceFields = (fieldSet: Set<string>): string => {
  const fields: string[] = []
  fields.push(
    buildCatalogReferenceField(
      fieldSet,
      'investmentStakeType',
      'investmentStakeTypeRef',
      InvestmentReportFields.investmentStakeType
    )
  )
  fields.push(
    buildCatalogReferenceField(
      fieldSet,
      'investmentPhase',
      'investmentPhaseRef',
      InvestmentReportFields.investmentPhase
    )
  )
  fields.push(
    buildCatalogReferenceField(
      fieldSet,
      'investmentStatus',
      'investmentStatusRef',
      InvestmentReportFields.investmentStatus
    )
  )
  fields.push(
    buildCatalogReferenceField(
      fieldSet,
      'investmentRiskLevel',
      'investmentRiskLevelRef',
      InvestmentReportFields.investmentRiskLevel
    )
  )
  fields.push(buildCatalogReferenceField(fieldSet, 'currency', 'currencyRef', InvestmentReportFields.currency))
  return fields.filter(f => f.trim()).join('\n    ')
}

/**
 * Build equity investment report fragment
 */
const buildEquityInvestmentReportFragment = (fieldSet: Set<string>): string => {
  if (!fieldSet.has('equityInvestmentReport')) return ''
  return `
      ${InvestmentReportFields.equityInvestmentReport} {
        id
        version
        date
        scope
        marketValue
        turnoverAmount
        ebitdaAmount
        equityInvestmentId
        additionalProperties
        businessKey
        processInstanceId
        synchronizedAt
        ${AUDIT_FIELDS}
      }
    `
}

/**
 * Build liquid fund investment report fragment
 */
const buildLiquidFundInvestmentReportFragment = (fieldSet: Set<string>): string => {
  if (!fieldSet.has('liquidFundInvestmentReport')) return ''
  return `
      ${InvestmentReportFields.liquidFundInvestmentReport} {
        id
        version
        date
        scope
        proprietorName
        bankName
        bankAccountNumber
        earlyTerminationAllowed
        interestRate
        maturityDate
        liquidFundInvestmentId
        interestPaymentFrequencyRef
        investmentLiquidFundTypeRef
        investmentLiquidFundType {
          ${CATALOG_ENTRY}
        }
        interestPaymentFrequency {
          ${CATALOG_ENTRY}
        }
        additionalProperties
        businessKey
        processInstanceId
        synchronizedAt
        ${AUDIT_FIELDS}
      }
    `
}

/**
 * Build real estate investment report fragment
 */
const buildRealEstateInvestmentReportFragment = (fieldSet: Set<string>): string => {
  if (!fieldSet.has('realEstateInvestmentReport')) return ''
  return `
      ${InvestmentReportFields.realEstateInvestmentReport} {
        id
        version
        date
        scope
        size
        numberOfUnits
        occupancyPercent
        annualNetColdRent
        funding
        actualAnnualExpenses
        targetAnnualExpenses
        liquidityForecast
        realEstateInvestmentId
        additionalProperties
        businessKey
        processInstanceId
        synchronizedAt
        ${AUDIT_FIELDS}
      }
    `
}

/**
 * Build investment role report fragment
 */
const buildInvestmentRoleReportFragment = (fieldSet: Set<string>): string => {
  if (!fieldSet.has('investmentRoleReport')) return ''
  return `
      ${InvestmentReportFields.investmentRoleReport} {
        id
        version
        displayOrder
        investmentRole {
          ${CATALOG_ENTRY}
        }
        investmentRoleRef
        ${AUDIT_FIELDS}
      }
    `
}

/**
 * Build Investment Report Fragment
 * Field names match InvestmentReport interface field names exactly
 */
export const buildInvestmentReportFragment = (fields: string[]): string => {
  const fieldSet = new Set(fields)

  return `
    ${AUDIT_FIELDS}
    ${buildBasicFields(fieldSet)}
    
    ${buildCatalogReferenceFields(fieldSet)}
    
    ${buildInvestmentFieldFragment(fieldSet)}
    
    ${buildEntityReferenceField(fieldSet, 'loanRecipientInvestmentAccount', 'loanRecipientInvestmentAccountId', InvestmentReportFields.loanRecipientInvestmentAccount, INVESTMENT_ACCOUNT_REF)}
    
    ${buildEquityInvestmentReportFragment(fieldSet)}
    
    ${buildLiquidFundInvestmentReportFragment(fieldSet)}
    
    ${buildRealEstateInvestmentReportFragment(fieldSet)}
    
    ${buildInvestmentRoleReportFragment(fieldSet)}
  `
}

/**
 * Investment Report Query Variables Interface
 * Extends BaseQueryVariables - all filter keys are defined in INVESTMENT_REPORT_DESCRIPTORS
 * buildWhere automatically handles all filters defined in descriptors
 *
 * Supported filter keys (from INVESTMENT_REPORT_DESCRIPTORS):
 * - investmentStakeTypeIds, investmentPhaseIds, investmentStatusIds, investmentRiskLevelIds,
 *   currencyIds, investmentIds, accountIds (kind: 'inIds')
 * - dateFrom, dateTo, plannedExitDateFrom, plannedExitDateTo,
 *   loanStartDateFrom, loanStartDateTo, loanEndDateFrom, loanEndDateTo (kind: 'dateFrom'/'dateTo')
 * - createdAtFrom, createdAtTo (from BASE_ENTITY_DESCRIPTORS, kind: 'dateFrom'/'dateTo')
 *
 * Note: All filter keys are automatically processed by buildWhere using INVESTMENT_REPORT_DESCRIPTORS.
 * No need to explicitly define them here - they're documented in the descriptors.
 *
 * Query building (where, orderBy, limit, offset) is handled by hooks using buildWhere and buildOrderBy.
 */
export interface InvestmentReportQueryVariables extends BaseQueryVariables {
  // All filter keys are automatically handled by buildWhere using INVESTMENT_REPORT_DESCRIPTORS
  // No need to explicitly define them here - they're documented in the descriptors

  // Report-specific filters (passed as customConditions to buildWhere)
  // These are direct GraphQL objects, not processed by descriptors
  investmentId?: string
  scope?: string
}
