/**
 * Investment Report Queries (New)
 * GraphQL fragment builder for InvestmentReport entities
 * Query building (where, orderBy, limit, offset) is handled by hooks
 */

import { CATALOG_ENTRY, AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { INVESTMENT_ACCOUNT_REF } from './fragments/investmentReferenceFragments'
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
 * Build Investment Report Fragment
 * Field names match InvestmentReport interface field names exactly
 */
export const buildInvestmentReportFragment = (fields: string[]): string => {
  const fieldSet = new Set(fields)

  return `
    ${AUDIT_FIELDS}
    ${fieldSet.has('id') ? 'id' : ''}
    ${fieldSet.has('version') ? 'version' : ''}
    ${fieldSet.has('date') ? InvestmentReportFields.date : ''}
    ${fieldSet.has('scope') ? InvestmentReportFields.scope : ''}
    ${fieldSet.has('plannedExitDate') ? InvestmentReportFields.plannedExitDate : ''}
    ${fieldSet.has('totalInvestmentAmount') ? InvestmentReportFields.totalInvestmentAmount : ''}
    ${fieldSet.has('investmentMarketValue') ? InvestmentReportFields.investmentMarketValue : ''}
    ${fieldSet.has('debtFinancingAmount') ? InvestmentReportFields.debtFinancingAmount : ''}
    ${fieldSet.has('requiredCapitalAmount') ? InvestmentReportFields.requiredCapitalAmount : ''}
    ${fieldSet.has('forecastedRevenueAmount') ? InvestmentReportFields.forecastedRevenueAmount : ''}
    ${fieldSet.has('forecastedProfitAmount') ? InvestmentReportFields.forecastedProfitAmount : ''}
    ${fieldSet.has('stakePercentage') ? InvestmentReportFields.stakePercentage : ''}
    ${fieldSet.has('loanRecipientName') ? InvestmentReportFields.loanRecipientName : ''}
    ${fieldSet.has('loanAmount') ? InvestmentReportFields.loanAmount : ''}
    ${fieldSet.has('loanOpenCommitmentAmount') ? InvestmentReportFields.loanOpenCommitmentAmount : ''}
    ${fieldSet.has('loanInterestRate') ? InvestmentReportFields.loanInterestRate : ''}
    ${fieldSet.has('loanStartDate') ? InvestmentReportFields.loanStartDate : ''}
    ${fieldSet.has('loanEndDate') ? InvestmentReportFields.loanEndDate : ''}
    ${fieldSet.has('loanInterestClaim') ? InvestmentReportFields.loanInterestClaim : ''}
    ${fieldSet.has('totalCommitmentAmount') ? InvestmentReportFields.totalCommitmentAmount : ''}
    ${fieldSet.has('totalDistributionAmount') ? InvestmentReportFields.totalDistributionAmount : ''}
    ${fieldSet.has('fundManagerName') ? InvestmentReportFields.fundManagerName : ''}
    ${fieldSet.has('identification') ? InvestmentReportFields.identification : ''}
    ${fieldSet.has('businessKey') ? InvestmentReportFields.businessKey : ''}
    ${fieldSet.has('processInstanceId') ? InvestmentReportFields.processInstanceId : ''}
    ${fieldSet.has('synchronizedAt') ? InvestmentReportFields.synchronizedAt : ''}
    ${fieldSet.has('createdAt') ? 'createdAt' : ''}
    ${fieldSet.has('createdBy') ? 'createdBy' : ''}
    ${fieldSet.has('updatedAt') ? 'updatedAt' : ''}
    ${fieldSet.has('updatedBy') ? 'updatedBy' : ''}
    ${fieldSet.has('isDeleted') ? 'isDeleted' : ''}
    ${fieldSet.has('recordState') ? 'recordState' : ''}
    ${fieldSet.has('activeFrom') ? 'activeFrom' : ''}
    ${fieldSet.has('activeTo') ? 'activeTo' : ''}
    ${fieldSet.has('additionalProperties') ? 'additionalProperties' : ''}
    
    ${
      fieldSet.has('investmentStakeType') || fieldSet.has('investmentStakeTypeRef')
        ? `
      ${fieldSet.has('investmentStakeType') ? `${InvestmentReportFields.investmentStakeType} { ${CATALOG_ENTRY} }` : ''}
      ${InvestmentReportFields.investmentStakeTypeRef}
    `
        : ''
    }
    
    ${
      fieldSet.has('investmentPhase') || fieldSet.has('investmentPhaseRef')
        ? `
      ${fieldSet.has('investmentPhase') ? `${InvestmentReportFields.investmentPhase} { ${CATALOG_ENTRY} }` : ''}
      ${InvestmentReportFields.investmentPhaseRef}
    `
        : ''
    }
    
    ${
      fieldSet.has('investmentStatus') || fieldSet.has('investmentStatusRef')
        ? `
      ${fieldSet.has('investmentStatus') ? `${InvestmentReportFields.investmentStatus} { ${CATALOG_ENTRY} }` : ''}
      ${InvestmentReportFields.investmentStatusRef}
    `
        : ''
    }
    
    ${
      fieldSet.has('investmentRiskLevel') || fieldSet.has('investmentRiskLevelRef')
        ? `
      ${fieldSet.has('investmentRiskLevel') ? `${InvestmentReportFields.investmentRiskLevel} { ${CATALOG_ENTRY} }` : ''}
      ${InvestmentReportFields.investmentRiskLevelRef}
    `
        : ''
    }
    
    ${
      fieldSet.has('currency') || fieldSet.has('currencyRef')
        ? `
      ${fieldSet.has('currency') ? `${InvestmentReportFields.currency} { ${CATALOG_ENTRY} }` : ''}
      ${InvestmentReportFields.currencyRef}
    `
        : ''
    }
    
    ${
      fieldSet.has('investment') || fieldSet.has('investmentId')
        ? `
      ${
        fieldSet.has('investment')
          ? `${InvestmentReportFields.investment} {
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
        
        # Catalog relationships
        investmentGroup {
          ${CATALOG_ENTRY}
        }
        investmentType {
          ${CATALOG_ENTRY}
        }
        investmentStatus {
          ${CATALOG_ENTRY}
        }
        currency {
          ${CATALOG_ENTRY}
        }
        
        # Owner employee relationship
        ownerEmployee {
          id
          code
          firstName
          lastName
          displayName
          fullName
          picture
          pictureThumbnail
          employeePosition {
            jobPosition { name }
            organizationalUnit { id name }
          }
        }
        ownerEmployeeId
        
        # Investment account relationship
        investmentAccount {
          ${INVESTMENT_ACCOUNT_REF}
        }
        investmentAccountId
      }`
          : ''
      }
      ${fieldSet.has('investmentId') ? InvestmentReportFields.investmentId : ''}
    `
        : ''
    }
    
    ${
      fieldSet.has('loanRecipientInvestmentAccount') || fieldSet.has('loanRecipientInvestmentAccountId')
        ? `
      ${fieldSet.has('loanRecipientInvestmentAccount') ? `${InvestmentReportFields.loanRecipientInvestmentAccount} { ${INVESTMENT_ACCOUNT_REF} }` : ''}
      ${InvestmentReportFields.loanRecipientInvestmentAccountId}
    `
        : ''
    }
    
    ${
      fieldSet.has('equityInvestmentReport')
        ? `
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
        : ''
    }
    
    ${
      fieldSet.has('liquidFundInvestmentReport')
        ? `
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
        : ''
    }
    
    ${
      fieldSet.has('realEstateInvestmentReport')
        ? `
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
        : ''
    }
    
    ${
      fieldSet.has('investmentRoleReport')
        ? `
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
        : ''
    }
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
