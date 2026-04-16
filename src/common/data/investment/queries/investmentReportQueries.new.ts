/**
 * Investment Report Queries (New)
 * GraphQL fragment builder for InvestmentReport entities
 * Query building (where, orderBy, limit, offset) is handled by hooks
 */

import { CATALOG_ENTRY, AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { COMPANY_REF } from '@/common/data/orgchart/queries/fragments/companyFragments'
import { INVESTMENT_ACCOUNT_REF } from './fragments/investmentReferenceFragments'
import { InvestmentReportFields } from '../types/investmentReportTypes'
import { InvestmentFields } from '../types/investmentTypes.new'
import { LiquidFundInvestmentFields } from '../types/liquidFundInvestmentTypes'
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
 * Manually specifies fields instead of using INVESTMENT_REF to include investmentAccount
 */
const buildInvestmentFieldFragment = (fieldSet: Set<string>): string => {
  if (!fieldSet.has('investment')) {
    return InvestmentReportFields.investmentId
  }

  return `
    ${InvestmentReportFields.investment} {
      ${AUDIT_FIELDS}
      id
      code
      name
      isin
      initialInvestmentAmount
      totalInvestmentAmount
      investmentMarketValue
      acquisitionDate
      exitDate
      plannedExitDate
      planedExit
      additionalProperties
      
      # Catalog references
      investmentGroup {
        ${CATALOG_ENTRY}
      }
      investmentGroupRef
      investmentType {
        ${CATALOG_ENTRY}
      }
      investmentTypeRef
      investmentStatus {
        ${CATALOG_ENTRY}
      }
      investmentStatusRef
      currency {
        ${CATALOG_ENTRY}
      }
      currencyRef
      
      # Employee relationship
      ownerEmployee {
        id
        firstName
        lastName
        pictureThumbnail
      }
      ownerEmployeeId
      
      # Company relationship
      company {
        ${COMPANY_REF}
      }
      companyId
      
      # Investment Account relationship (via junction table)
      # GraphQL field name: investmentAccounts (not investmentInvestmentAccounts)
      investmentAccounts(where: { isDeleted: { _eq: false } }) {
        id
        investmentAccountId
        investmentAccount {
          ${INVESTMENT_ACCOUNT_REF}
        }
        investmentAccountType {
          ${CATALOG_ENTRY}
        }
        investmentAccountTypeRef
      }
      
      # Sub-investments (for type extraction)
      ${InvestmentFields.liquidFundInvestment} {
        id
        ${LiquidFundInvestmentFields.investmentLiquidFundType} {
          ${CATALOG_ENTRY}
        }
        ${LiquidFundInvestmentFields.investmentLiquidFundTypeRef}
      }
    }
    ${InvestmentReportFields.investmentId}
  `
}

/**
 * Helper: Add field to array if present in field set
 */
const addFieldIfPresent = (fieldSet: Set<string>, fieldName: string, fieldValue: string, fields: string[]): void => {
  if (fieldSet.has(fieldName)) {
    fields.push(fieldValue)
  }
}

/**
 * Build core identification fields
 */
const buildCoreFields = (fieldSet: Set<string>): string[] => {
  const fields: string[] = []
  addFieldIfPresent(fieldSet, 'id', 'id', fields)
  addFieldIfPresent(fieldSet, 'version', 'version', fields)
  addFieldIfPresent(fieldSet, 'date', InvestmentReportFields.date, fields)
  addFieldIfPresent(fieldSet, 'scope', InvestmentReportFields.scope, fields)
  addFieldIfPresent(fieldSet, 'plannedExitDate', InvestmentReportFields.plannedExitDate, fields)
  return fields
}

/**
 * Build investment amount fields
 */
const buildAmountFields = (fieldSet: Set<string>): string[] => {
  const fields: string[] = []
  addFieldIfPresent(fieldSet, 'totalInvestmentAmount', InvestmentReportFields.totalInvestmentAmount, fields)
  addFieldIfPresent(fieldSet, 'investmentMarketValue', InvestmentReportFields.investmentMarketValue, fields)
  addFieldIfPresent(fieldSet, 'debtFinancingAmount', InvestmentReportFields.debtFinancingAmount, fields)
  addFieldIfPresent(fieldSet, 'requiredCapitalAmount', InvestmentReportFields.requiredCapitalAmount, fields)
  addFieldIfPresent(fieldSet, 'forecastedRevenueAmount', InvestmentReportFields.forecastedRevenueAmount, fields)
  addFieldIfPresent(fieldSet, 'forecastedProfitAmount', InvestmentReportFields.forecastedProfitAmount, fields)
  addFieldIfPresent(fieldSet, 'stakePercentage', InvestmentReportFields.stakePercentage, fields)
  addFieldIfPresent(fieldSet, 'totalCommitmentAmount', InvestmentReportFields.totalCommitmentAmount, fields)
  addFieldIfPresent(fieldSet, 'totalDistributionAmount', InvestmentReportFields.totalDistributionAmount, fields)
  return fields
}

/**
 * Build loan-related fields
 */
const buildLoanFields = (fieldSet: Set<string>): string[] => {
  const fields: string[] = []
  addFieldIfPresent(fieldSet, 'loanRecipientName', InvestmentReportFields.loanRecipientName, fields)
  addFieldIfPresent(fieldSet, 'loanAmount', InvestmentReportFields.loanAmount, fields)
  addFieldIfPresent(fieldSet, 'loanOpenCommitmentAmount', InvestmentReportFields.loanOpenCommitmentAmount, fields)
  addFieldIfPresent(fieldSet, 'loanInterestRate', InvestmentReportFields.loanInterestRate, fields)
  addFieldIfPresent(fieldSet, 'loanStartDate', InvestmentReportFields.loanStartDate, fields)
  addFieldIfPresent(fieldSet, 'loanEndDate', InvestmentReportFields.loanEndDate, fields)
  addFieldIfPresent(fieldSet, 'loanInterestClaim', InvestmentReportFields.loanInterestClaim, fields)
  return fields
}

/**
 * Build metadata fields
 */
const buildMetadataFields = (fieldSet: Set<string>): string[] => {
  const fields: string[] = []
  addFieldIfPresent(fieldSet, 'fundManagerName', InvestmentReportFields.fundManagerName, fields)
  addFieldIfPresent(fieldSet, 'identification', InvestmentReportFields.identification, fields)
  addFieldIfPresent(fieldSet, 'businessKey', InvestmentReportFields.businessKey, fields)
  addFieldIfPresent(fieldSet, 'processInstanceId', InvestmentReportFields.processInstanceId, fields)
  addFieldIfPresent(fieldSet, 'synchronizedAt', InvestmentReportFields.synchronizedAt, fields)
  addFieldIfPresent(fieldSet, 'additionalProperties', 'additionalProperties', fields)
  return fields
}

/**
 * Build audit fields
 */
const buildAuditFields = (fieldSet: Set<string>): string[] => {
  const fields: string[] = []
  addFieldIfPresent(fieldSet, 'createdAt', 'createdAt', fields)
  addFieldIfPresent(fieldSet, 'createdBy', 'createdBy', fields)
  addFieldIfPresent(fieldSet, 'updatedAt', 'updatedAt', fields)
  addFieldIfPresent(fieldSet, 'updatedBy', 'updatedBy', fields)
  addFieldIfPresent(fieldSet, 'isDeleted', 'isDeleted', fields)
  addFieldIfPresent(fieldSet, 'recordState', 'recordState', fields)
  addFieldIfPresent(fieldSet, 'activeFrom', 'activeFrom', fields)
  addFieldIfPresent(fieldSet, 'activeTo', 'activeTo', fields)
  return fields
}

/**
 * Build basic scalar fields section
 */
const buildBasicFields = (fieldSet: Set<string>): string => {
  const fields = [
    ...buildCoreFields(fieldSet),
    ...buildAmountFields(fieldSet),
    ...buildLoanFields(fieldSet),
    ...buildMetadataFields(fieldSet),
    ...buildAuditFields(fieldSet)
  ]
  return fields.join('\n    ')
}

/**
 * Build catalog reference fields section
 */
const buildCatalogReferenceFields = (fieldSet: Set<string>): string => {
  const fields = [
    buildCatalogReferenceField(
      fieldSet,
      'investmentStakeType',
      'investmentStakeTypeRef',
      InvestmentReportFields.investmentStakeType
    ),
    buildCatalogReferenceField(
      fieldSet,
      'investmentPhase',
      'investmentPhaseRef',
      InvestmentReportFields.investmentPhase
    ),
    buildCatalogReferenceField(
      fieldSet,
      'investmentStatus',
      'investmentStatusRef',
      InvestmentReportFields.investmentStatus
    ),
    buildCatalogReferenceField(
      fieldSet,
      'investmentRiskLevel',
      'investmentRiskLevelRef',
      InvestmentReportFields.investmentRiskLevel
    ),
    buildCatalogReferenceField(fieldSet, 'currency', 'currencyRef', InvestmentReportFields.currency)
  ]
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
        sizeMeasurementUnitRef
        sizeMeasurementUnit { ${CATALOG_ENTRY} }
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
