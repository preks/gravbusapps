/**
 * Opportunity Data Transformers
 * Build Investment objects from Opportunity data
 *
 * Opportunities store investment information directly (not as references)
 * to avoid generating unnecessary data before conversion.
 */

import type { Investment } from '@/common/data/investment/types/investmentTypes'
import type { InvestmentOpportunity } from '@/common/data/investment/types/investmentOpportunityTypes'

/**
 * Build Investment from Opportunity data
 */
export function buildInvestmentFromOpportunity(opportunity: InvestmentOpportunity | any): Investment | null {
  if (!opportunity) return null

  return {
    id: opportunity.id || `opportunity-investment-${Date.now()}`, // Temporary ID
    name: opportunity.investmentName || opportunity.name || '',
    code: opportunity.code,

    // Investment catalog fields
    investmentGroup: opportunity.investmentGroup,
    investmentGroupRef: opportunity.investmentGroupRef,
    investmentType: opportunity.investmentType,
    investmentTypeRef: opportunity.investmentTypeRef,
    investmentStakeType: opportunity.investmentStakeType,
    investmentStakeTypeRef: opportunity.investmentStakeTypeRef,
    investmentRole: opportunity.investmentRole,
    investmentRoleRef: opportunity.investmentRoleRef,

    // Financial fields
    initialInvestmentAmount: opportunity.initialInvestmentAmount,
    forecastedProfitAmount: opportunity.forecastedProfitAmount,
    requiredCapitalAmount: opportunity.requiredCapitalAmount,
    marketValue: opportunity.marketValue,
    loanAmount: opportunity.loanAmount,
    loanInterestRate: opportunity.loanInterestRate,
    stakePercentage: opportunity.stakePercentage,

    // Real Estate specific fields
    annualNetColdRent: opportunity.annualNetColdRent,
    buildingYear: opportunity.buildingYear,
    size: opportunity.size,
    sizeMeasurementUnit: opportunity.sizeMeasurementUnit,
    sizeMeasurementUnitRef: opportunity.sizeMeasurementUnitRef,

    // Entity references
    ownerEmployee: opportunity.ownerEmployee,
    ownerEmployeeId: opportunity.ownerEmployeeId,
    currency: opportunity.currency,
    currencyRef: opportunity.currencyRef,
    investmentOpportunity: opportunity,

    // Base entity fields
    createdAt: opportunity.createdAt,
    updatedAt: opportunity.updatedAt,
    createdBy: opportunity.createdBy,
    updatedBy: opportunity.updatedBy,
    isDeleted: opportunity.isDeleted || false,
    version: opportunity.version,

    // Computed fields for Investment interface
    displayName: opportunity.investmentName || opportunity.name || 'Unnamed Investment'
  } as Investment
}
