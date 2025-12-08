/**
 * Investment Queries (New)
 * GraphQL fragment builder for Investment entities
 * Query building (where, orderBy, limit, offset) is handled by hooks
 */

import { CATALOG_ENTRY, AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { COMPANY_REF } from '@/common/data/orgchart/queries/fragments/companyFragments'
import { INVESTMENT_ACCOUNT_REF, INVESTMENT_OPPORTUNITY_REF } from './fragments/investmentReferenceFragments'
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
    'stakePercentage',
    'totalInvestmentAmount',
    'updatedAt'
  ],

  // Record: Full investment record with all fields and relations
  record: [
    'acquisitionDate',
    'additionalProperties',
    'code',
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
    'investmentAccount',
    'investmentAccountId',
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
    'realEstateInvestment',
    'requiredCapitalAmount',
    'stakePercentage',
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
    'stakePercentage',
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
    'realEstateInvestment',
    'stakePercentage',
    'totalInvestmentAmount',
    'updatedAt'
  ]
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
    ${fieldSet.has('id') ? 'id' : ''}
    ${fieldSet.has('version') ? 'version' : ''}
    ${fieldSet.has('code') ? InvestmentFields.code : ''}
    ${fieldSet.has('name') ? InvestmentFields.name : ''}
    ${fieldSet.has('isin') ? InvestmentFields.isin : ''}
    ${fieldSet.has('acquisitionDate') ? InvestmentFields.acquisitionDate : ''}
    ${fieldSet.has('planedExit') ? InvestmentFields.planedExit : ''}
    ${fieldSet.has('plannedExitDate') ? InvestmentFields.plannedExitDate : ''}
    ${fieldSet.has('exitDate') ? InvestmentFields.exitDate : ''}
    ${fieldSet.has('initialInvestmentAmount') ? InvestmentFields.initialInvestmentAmount : ''}
    ${fieldSet.has('totalInvestmentAmount') ? InvestmentFields.totalInvestmentAmount : ''}
    ${fieldSet.has('investmentMarketValue') ? InvestmentFields.investmentMarketValue : ''}
    ${fieldSet.has('debtFinancingAmount') ? InvestmentFields.debtFinancingAmount : ''}
    ${fieldSet.has('requiredCapitalAmount') ? InvestmentFields.requiredCapitalAmount : ''}
    ${fieldSet.has('forecastedRevenueAmount') ? InvestmentFields.forecastedRevenueAmount : ''}
    ${fieldSet.has('forecastedProfitAmount') ? InvestmentFields.forecastedProfitAmount : ''}
    ${fieldSet.has('stakePercentage') ? InvestmentFields.stakePercentage : ''}
    ${fieldSet.has('loanRecipientName') ? InvestmentFields.loanRecipientName : ''}
    ${fieldSet.has('loanAmount') ? InvestmentFields.loanAmount : ''}
    ${fieldSet.has('loanOpenCommitmentAmount') ? InvestmentFields.loanOpenCommitmentAmount : ''}
    ${fieldSet.has('loanInterestRate') ? InvestmentFields.loanInterestRate : ''}
    ${fieldSet.has('loanStartDate') ? InvestmentFields.loanStartDate : ''}
    ${fieldSet.has('loanEndDate') ? InvestmentFields.loanEndDate : ''}
    ${fieldSet.has('loanInterestClaim') ? InvestmentFields.loanInterestClaim : ''}
    ${fieldSet.has('totalCommitmentAmount') ? InvestmentFields.totalCommitmentAmount : ''}
    ${fieldSet.has('totalDistributionAmount') ? InvestmentFields.totalDistributionAmount : ''}
    ${fieldSet.has('fundManagerName') ? InvestmentFields.fundManagerName : ''}
    ${fieldSet.has('irr') ? InvestmentFields.irr : ''}
    ${fieldSet.has('moic') ? InvestmentFields.moic : ''}
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
      fieldSet.has('investmentGroup') || fieldSet.has('investmentGroupRef')
        ? `
      ${fieldSet.has('investmentGroup') ? `${InvestmentFields.investmentGroup} { ${CATALOG_ENTRY} }` : ''}
      ${InvestmentFields.investmentGroupRef}
    `
        : ''
    }
    
    ${
      fieldSet.has('investmentType') || fieldSet.has('investmentTypeRef')
        ? `
      ${fieldSet.has('investmentType') ? `${InvestmentFields.investmentType} { ${CATALOG_ENTRY} }` : ''}
      ${InvestmentFields.investmentTypeRef}
    `
        : ''
    }
    
    ${
      fieldSet.has('investmentStakeType') || fieldSet.has('investmentStakeTypeRef')
        ? `
      ${fieldSet.has('investmentStakeType') ? `${InvestmentFields.investmentStakeType} { ${CATALOG_ENTRY} }` : ''}
      ${InvestmentFields.investmentStakeTypeRef}
    `
        : ''
    }
    
    ${
      fieldSet.has('investmentPhase') || fieldSet.has('investmentPhaseRef')
        ? `
      ${fieldSet.has('investmentPhase') ? `${InvestmentFields.investmentPhase} { ${CATALOG_ENTRY} }` : ''}
      ${InvestmentFields.investmentPhaseRef}
    `
        : ''
    }
    
    ${
      fieldSet.has('investmentStatus') || fieldSet.has('investmentStatusRef')
        ? `
      ${fieldSet.has('investmentStatus') ? `${InvestmentFields.investmentStatus} { ${CATALOG_ENTRY} }` : ''}
      ${InvestmentFields.investmentStatusRef}
    `
        : ''
    }
    
    ${
      fieldSet.has('investmentRiskLevel') || fieldSet.has('investmentRiskLevelRef')
        ? `
      ${fieldSet.has('investmentRiskLevel') ? `${InvestmentFields.investmentRiskLevel} { ${CATALOG_ENTRY} }` : ''}
      ${InvestmentFields.investmentRiskLevelRef}
    `
        : ''
    }
    
    ${
      fieldSet.has('currency') || fieldSet.has('currencyRef')
        ? `
      ${fieldSet.has('currency') ? `${InvestmentFields.currency} { ${CATALOG_ENTRY} }` : ''}
      ${InvestmentFields.currencyRef}
    `
        : ''
    }
    
    ${
      fieldSet.has('ownerEmployee') || fieldSet.has('ownerEmployeeId')
        ? `
      ${fieldSet.has('ownerEmployee') ? `${InvestmentFields.ownerEmployee} { ${EMPLOYEE_REF} }` : ''}
      ${InvestmentFields.ownerEmployeeId}
    `
        : ''
    }
    
    ${
      fieldSet.has('investmentAccount') || fieldSet.has('investmentAccountId')
        ? `
      ${fieldSet.has('investmentAccount') ? `${InvestmentFields.investmentAccount} { ${INVESTMENT_ACCOUNT_REF} }` : ''}
      ${InvestmentFields.investmentAccountId}
    `
        : ''
    }
    
    ${
      fieldSet.has('investmentOpportunity') || fieldSet.has('investmentOpportunityId')
        ? `
      ${fieldSet.has('investmentOpportunity') ? `${InvestmentFields.investmentOpportunity} { ${INVESTMENT_OPPORTUNITY_REF} }` : ''}
      ${InvestmentFields.investmentOpportunityId}
    `
        : ''
    }
    
    ${
      fieldSet.has('company') || fieldSet.has('companyId')
        ? `
      ${fieldSet.has('company') ? `${InvestmentFields.company} { ${COMPANY_REF} }` : ''}
      ${InvestmentFields.companyId}
    `
        : ''
    }
    
    ${
      fieldSet.has('loanRecipientInvestmentAccount') || fieldSet.has('loanRecipientInvestmentAccountId')
        ? `
      ${fieldSet.has('loanRecipientInvestmentAccount') ? `${InvestmentFields.loanRecipientInvestmentAccount} { ${INVESTMENT_ACCOUNT_REF} }` : ''}
      ${InvestmentFields.loanRecipientInvestmentAccountId}
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
  liquidFundInvestment?: { id: { _isNull: false } }
  realEstateInvestment?: { id: { _isNull: false } }
  equityInvestment?: { id: { _isNull: false } }
  planedExit?: boolean
}
