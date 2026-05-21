/**
 * Investment Queries (New)
 * GraphQL fragment builder for Investment entities
 * Query building (where, orderBy, limit, offset) is handled by hooks
 */

import { CATALOG_ENTRY, AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import {
  INVESTMENT_ACCOUNT_REF,
  INVESTMENT_COMPANY_REF,
  INVESTMENT_OPPORTUNITY_REF
} from './fragments/investmentReferenceFragments'
import { InvestmentFields } from '../types/investmentTypes.new'
import { EquityInvestmentFields } from '../types/equityInvestmentTypes'
import { RealEstateInvestmentFields } from '../types/realEstateInvestmentTypes'
import { LiquidFundInvestmentFields } from '../types/liquidFundInvestmentTypes'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'

/**
 * Pre-defined Query Configurations
 * Alphabetically sorted, objects listed with their IDs/Refs together
 */
export const INVESTMENT_QUERY_CONFIGS: Record<string, string[]> = {
  // Minimal: Only essential fields for quick lookups
  minimal: ['code', 'createdAt', 'id', 'name'],

  // IRM activity form: linked accounts + contacts on those accounts for secondary pickers
  irmActivityAssociation: ['code', 'id', 'investmentAccountsForActivityAssociation', 'name'],

  // List: Common fields for table/list views
  list: [
    'acquisitionDate',
    'code',
    'createdAt',
    'currency',
    'currencyRef',
    'exitDate',
    'id',
    'initialInvestmentAmount',
    'investmentAccounts',
    'investmentGroup',
    'investmentGroupRef',
    'investmentMarketValue',
    'investmentStatus',
    'investmentStatusRef',
    'investmentType',
    'investmentTypeRef',
    'isin',
    'name',
    'ownerEmployee',
    'ownerEmployeeId',
    'planedExit',
    'plannedExitDate',
    'maturityDate',
    'securityQuantity',
    'stakePercentage',
    'timeWeightedPerformance',
    'totalInvestmentAmount',
    'updatedAt'
  ],

  // Record: Full investment record with all fields and relations
  record: [
    'acquisitionDate',
    'additionalProperties',
    'code',
    'investmentCompany',
    'createdAt',
    'createdBy',
    'currency',
    'currencyRef',
    'debtFinancingAmount',
    'equityInvestment',
    'exitDate',
    'forecastedProfitAmount',
    'forecastedRevenueAmount',
    'fundManagerName',
    'id',
    'initialInvestmentAmount',
    'investmentAccounts', // Junction table (replaces investmentAccount)
    'investmentGroup',
    'investmentGroupRef',
    'investmentMarketValue',
    'investmentOpportunity',
    'investmentOpportunityId',
    'investmentPhase',
    'investmentPhaseRef',
    'investmentRiskLevel',
    'investmentRiskLevelRef',
    'investmentRole',
    'investmentStatus',
    'investmentStatusRef',
    'investmentStakeType',
    'investmentStakeTypeRef',
    'investmentType',
    'investmentTypeRef',
    'irr',
    'isin',
    'liquidFundInvestment',
    'loanAmount',
    'loanEndDate',
    'loanInterestClaim',
    'loanInterestRate',
    'loanOpenCommitmentAmount',
    'loanRecipientInvestmentAccount',
    'loanRecipientInvestmentAccountId',
    'loanRecipientName',
    'loanStartDate',
    'moic',
    'name',
    'ownerEmployee',
    'ownerEmployeeId',
    'planedExit',
    'plannedExitDate',
    'maturityDate',
    'realEstateInvestment',
    'requiredCapitalAmount',
    'securityQuantity',
    'stakePercentage',
    'timeWeightedPerformance',
    'totalCommitmentAmount',
    'totalDistributionAmount',
    'totalInvestmentAmount',
    'updatedAt',
    'updatedBy',
    'version'
  ],

  // Equity: Fields specific to equity investments
  equity: [
    'acquisitionDate',
    'code',
    'createdAt',
    'currency',
    'currencyRef',
    'equityInvestment',
    'exitDate',
    'id',
    'initialInvestmentAmount',
    'investmentGroup',
    'investmentGroupRef',
    'investmentMarketValue',
    'investmentStatus',
    'investmentStatusRef',
    'investmentStakeType',
    'investmentStakeTypeRef',
    'investmentType',
    'investmentTypeRef',
    'isin',
    'name',
    'ownerEmployee',
    'ownerEmployeeId',
    'plannedExitDate',
    'maturityDate',
    'securityQuantity',
    'stakePercentage',
    'timeWeightedPerformance',
    'totalInvestmentAmount',
    'updatedAt'
  ],

  // LiquidFund: Fields specific to liquid fund investments
  liquidFund: [
    'acquisitionDate',
    'code',
    'createdAt',
    'currency',
    'currencyRef',
    'exitDate',
    'fundManagerName',
    'id',
    'initialInvestmentAmount',
    'investmentGroup',
    'investmentGroupRef',
    'investmentMarketValue',
    'investmentStatus',
    'investmentStatusRef',
    'investmentType',
    'investmentTypeRef',
    'irr',
    'isin',
    'liquidFundInvestment',
    'moic',
    'name',
    'ownerEmployee',
    'ownerEmployeeId',
    'plannedExitDate',
    'maturityDate',
    'securityQuantity',
    'timeWeightedPerformance',
    'totalCommitmentAmount',
    'totalDistributionAmount',
    'totalInvestmentAmount',
    'updatedAt'
  ],

  // RealEstate: Fields specific to real estate investments
  realEstate: [
    'acquisitionDate',
    'code',
    'createdAt',
    'currency',
    'currencyRef',
    'exitDate',
    'id',
    'initialInvestmentAmount',
    'investmentGroup',
    'investmentGroupRef',
    'investmentMarketValue',
    'investmentStatus',
    'investmentStatusRef',
    'investmentType',
    'investmentTypeRef',
    'isin',
    'name',
    'ownerEmployee',
    'ownerEmployeeId',
    'plannedExitDate',
    'maturityDate',
    'realEstateInvestment',
    'securityQuantity',
    'stakePercentage',
    'timeWeightedPerformance',
    'totalInvestmentAmount',
    'updatedAt'
  ]
}

/**
 * Build scalar fields fragment
 */
const buildScalarFields = (fieldSet: Set<string>): string => {
  const scalarFields = [
    { key: 'id', value: 'id' },
    { key: 'version', value: 'version' },
    { key: 'code', value: InvestmentFields.code },
    { key: 'name', value: InvestmentFields.name },
    { key: 'isin', value: InvestmentFields.isin },
    { key: 'acquisitionDate', value: InvestmentFields.acquisitionDate },
    { key: 'planedExit', value: InvestmentFields.planedExit },
    { key: 'plannedExitDate', value: InvestmentFields.plannedExitDate },
    { key: 'exitDate', value: InvestmentFields.exitDate },
    { key: 'initialInvestmentAmount', value: InvestmentFields.initialInvestmentAmount },
    { key: 'totalInvestmentAmount', value: InvestmentFields.totalInvestmentAmount },
    { key: 'investmentMarketValue', value: InvestmentFields.investmentMarketValue },
    { key: 'debtFinancingAmount', value: InvestmentFields.debtFinancingAmount },
    { key: 'requiredCapitalAmount', value: InvestmentFields.requiredCapitalAmount },
    { key: 'forecastedRevenueAmount', value: InvestmentFields.forecastedRevenueAmount },
    { key: 'forecastedProfitAmount', value: InvestmentFields.forecastedProfitAmount },
    { key: 'stakePercentage', value: InvestmentFields.stakePercentage },
    { key: 'securityQuantity', value: InvestmentFields.securityQuantity },
    { key: 'timeWeightedPerformance', value: InvestmentFields.timeWeightedPerformance },
    { key: 'maturityDate', value: InvestmentFields.maturityDate },
    { key: 'loanRecipientName', value: InvestmentFields.loanRecipientName },
    { key: 'loanAmount', value: InvestmentFields.loanAmount },
    { key: 'loanOpenCommitmentAmount', value: InvestmentFields.loanOpenCommitmentAmount },
    { key: 'loanInterestRate', value: InvestmentFields.loanInterestRate },
    { key: 'loanStartDate', value: InvestmentFields.loanStartDate },
    { key: 'loanEndDate', value: InvestmentFields.loanEndDate },
    { key: 'loanInterestClaim', value: InvestmentFields.loanInterestClaim },
    { key: 'totalCommitmentAmount', value: InvestmentFields.totalCommitmentAmount },
    { key: 'totalDistributionAmount', value: InvestmentFields.totalDistributionAmount },
    { key: 'fundManagerName', value: InvestmentFields.fundManagerName },
    { key: 'irr', value: InvestmentFields.irr },
    { key: 'moic', value: InvestmentFields.moic },
    { key: 'createdAt', value: 'createdAt' },
    { key: 'createdBy', value: 'createdBy' },
    { key: 'updatedAt', value: 'updatedAt' },
    { key: 'updatedBy', value: 'updatedBy' },
    { key: 'isDeleted', value: 'isDeleted' },
    { key: 'recordState', value: 'recordState' },
    { key: 'activeFrom', value: 'activeFrom' },
    { key: 'activeTo', value: 'activeTo' },
    { key: 'additionalProperties', value: 'additionalProperties' }
  ]

  return scalarFields.map(field => (fieldSet.has(field.key) ? field.value : '')).join('\n    ')
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
      ${InvestmentFields[fieldRefName as keyof typeof InvestmentFields]}
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
      ${InvestmentFields[fieldRefName as keyof typeof InvestmentFields]}
    `
}

/**
 * Build Investment Query Fragment from field array
 * Uses InvestmentFields to map field keys to GraphQL field names
 * When an object field is requested, its corresponding ID/Ref is automatically included
 */
export const buildInvestmentFragment = (fields: string[]): string => {
  const fieldSet = new Set(fields)

  return `
    ${AUDIT_FIELDS}
    ${buildScalarFields(fieldSet)}
    
    ${buildCatalogReferenceField(fieldSet, 'investmentGroup', 'investmentGroupRef', InvestmentFields.investmentGroup)}
    
    ${buildCatalogReferenceField(fieldSet, 'investmentType', 'investmentTypeRef', InvestmentFields.investmentType)}
    
    ${buildCatalogReferenceField(fieldSet, 'investmentStakeType', 'investmentStakeTypeRef', InvestmentFields.investmentStakeType)}
    
    ${buildCatalogReferenceField(fieldSet, 'investmentPhase', 'investmentPhaseRef', InvestmentFields.investmentPhase)}
    
    ${buildCatalogReferenceField(fieldSet, 'investmentStatus', 'investmentStatusRef', InvestmentFields.investmentStatus)}
    
    ${buildCatalogReferenceField(fieldSet, 'investmentRiskLevel', 'investmentRiskLevelRef', InvestmentFields.investmentRiskLevel)}
    
    ${buildCatalogReferenceField(fieldSet, 'currency', 'currencyRef', InvestmentFields.currency)}
    
    ${buildEntityReferenceField(fieldSet, 'ownerEmployee', 'ownerEmployeeId', InvestmentFields.ownerEmployee, EMPLOYEE_REF)}
    
    # investmentAccount removed - now uses investmentAccounts junction table (see INVESTMENT fragment)
    
    ${buildEntityReferenceField(fieldSet, 'investmentOpportunity', 'investmentOpportunityId', InvestmentFields.investmentOpportunity, INVESTMENT_OPPORTUNITY_REF)}
    
    ${buildEntityReferenceField(
      fieldSet,
      'investmentCompany',
      'investmentCompanyId',
      InvestmentFields.investmentCompany,
      INVESTMENT_COMPANY_REF
    )}
    
    ${buildEntityReferenceField(fieldSet, 'loanRecipientInvestmentAccount', 'loanRecipientInvestmentAccountId', InvestmentFields.loanRecipientInvestmentAccount, INVESTMENT_ACCOUNT_REF)}
    
    ${
      fieldSet.has('investmentAccountsForActivityAssociation')
        ? `
      ${InvestmentFields.investmentAccounts}(where: { isDeleted: { _eq: false } }) {
        id
        version
        investmentId
        investmentAccountId
        investmentAccount {
          ${INVESTMENT_ACCOUNT_REF}
          investmentAccountContact(where: { isDeleted: { _eq: false } }) {
            id
            contactId
            accountId
            contact {
              id
              code
              firstName
              lastName
              fullName
              communicationChannels(where: { isDeleted: { _eq: false } }) {
                value
                valueExtension
                communicationChannel {
                  ${CATALOG_ENTRY}
                }
                communicationChannelRef
              }
            }
            ${AUDIT_FIELDS}
          }
        }
        ${AUDIT_FIELDS}
      }
    `
        : ''
    }
    
    ${
      fieldSet.has('investmentAccounts') && !fieldSet.has('investmentAccountsForActivityAssociation')
        ? `
      ${InvestmentFields.investmentAccounts}(where: { isDeleted: { _eq: false } }) {
        id
        version
        investmentId
        investmentAccountId
        investmentAccountTypeRef
        investmentAccountType {
          ${CATALOG_ENTRY}
        }
        investmentAccount {
          ${INVESTMENT_ACCOUNT_REF}
        }
        ${AUDIT_FIELDS}
      }
    `
        : ''
    }
    
    ${
      fieldSet.has('investmentRole')
        ? `
      ${InvestmentFields.investmentRole}(where: { isDeleted: { _eq: false } }, orderBy: { displayOrder: ASC_NULLS_LAST }) {
        id
        version
        displayOrder
        investmentRole {
          ${CATALOG_ENTRY}
        }
        ${AUDIT_FIELDS}
      }
    `
        : ''
    }
    
    ${
      fieldSet.has('equityInvestment')
        ? `
      ${InvestmentFields.equityInvestment} {
        id
        version
        ${EquityInvestmentFields.foundationDate}
        ${EquityInvestmentFields.marketValue}
        ${EquityInvestmentFields.turnoverAmount}
        ${EquityInvestmentFields.ebitdaAmount}
        ${AUDIT_FIELDS}
      }
    `
        : ''
    }
    
    ${
      fieldSet.has('realEstateInvestment')
        ? `
      ${InvestmentFields.realEstateInvestment} {
        id
        version
        ${RealEstateInvestmentFields.buildingYear}
        ${RealEstateInvestmentFields.numberOfUnits}
        ${RealEstateInvestmentFields.annualNetColdRent}
        ${RealEstateInvestmentFields.actualAnnualExpenses}
        ${RealEstateInvestmentFields.targetAnnualExpenses}
        ${RealEstateInvestmentFields.funding}
        ${RealEstateInvestmentFields.occupancyPercent}
        ${RealEstateInvestmentFields.size}
        ${RealEstateInvestmentFields.locality}
        ${RealEstateInvestmentFields.postalCode}
        ${RealEstateInvestmentFields.sizeMeasurementUnitRef}
        ${RealEstateInvestmentFields.sizeMeasurementUnit} {
          ${CATALOG_ENTRY}
        }
        ${RealEstateInvestmentFields.country} {
          ${CATALOG_ENTRY}
        }
        ${RealEstateInvestmentFields.region} {
          ${CATALOG_ENTRY}
        }
        ${AUDIT_FIELDS}
      }
    `
        : ''
    }
    
    ${
      fieldSet.has('liquidFundInvestment')
        ? `
      ${InvestmentFields.liquidFundInvestment} {
        id
        version
        ${LiquidFundInvestmentFields.proprietorName}
        ${LiquidFundInvestmentFields.bankName}
        ${LiquidFundInvestmentFields.bankAccountNumber}
        ${LiquidFundInvestmentFields.earlyTerminationAllowed}
        ${LiquidFundInvestmentFields.interestRate}
        ${LiquidFundInvestmentFields.maturityDate}
        ${LiquidFundInvestmentFields.additionalProperties}
        ${LiquidFundInvestmentFields.investmentLiquidFundType} {
          ${CATALOG_ENTRY}
        }
        ${LiquidFundInvestmentFields.interestPaymentFrequency} {
          ${CATALOG_ENTRY}
        }
        ${AUDIT_FIELDS}
      }
    `
        : ''
    }
  `
}

/**
 * Investment Query Variables Interface
 * Extends BaseQueryVariables - all filter keys are defined in INVESTMENT_DESCRIPTORS
 * buildWhere automatically handles all filters defined in descriptors
 *
 * Supported filter keys (from INVESTMENT_DESCRIPTORS):
 * - investmentTypeIds, investmentStatusIds, investmentGroupIds, investmentPhaseIds,
 *   investmentRiskLevelIds, currencyIds, ownerEmployeeIds, accountIds, opportunityIds (kind: 'inIds')
 * - acquisitionDateFrom, acquisitionDateTo, plannedExitDateFrom, plannedExitDateTo,
 *   exitDateFrom, exitDateTo (kind: 'dateFrom'/'dateTo')
 * - createdAtFrom, createdAtTo (from BASE_ENTITY_DESCRIPTORS, kind: 'dateFrom'/'dateTo')
 *
 * Note: All filter keys are automatically processed by buildWhere using INVESTMENT_DESCRIPTORS.
 * No need to explicitly define them here - they're documented in the descriptors.
 *
 * Query building (where, orderBy, limit, offset) is handled by hooks using buildWhere and buildOrderBy.
 */
export interface InvestmentQueryVariables extends BaseQueryVariables {
  // All filter keys are automatically handled by buildWhere using INVESTMENT_DESCRIPTORS
  // No need to explicitly define them here - they're documented in the descriptors

  // Investment type filters (passed as customConditions to buildWhere)
  // These are direct GraphQL objects, not processed by descriptors
  // Use {} to check if relationship array has any items (Hasura "exists" syntax)
  liquidFundInvestment?: Record<string, any>
  realEstateInvestment?: Record<string, any>
  equityInvestment?: Record<string, any>
  planedExit?: boolean
}
