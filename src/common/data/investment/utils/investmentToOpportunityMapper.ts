import type { Investment } from '../types/investmentTypes'
import type { InvestmentOpportunity } from '../types/investmentOpportunityTypes'

/**
 * Maps investment data to investment opportunity form values for divestment cases
 * This is the reverse mapping of mapOpportunityToInvestmentFormValues
 * Maps static fields from Investment to InvestmentOpportunity
 * Also extracts dynamic fields from subtypes based on formFields definition
 *
 * @param investment - The investment data from GraphQL (with specializations)
 * @returns Partial investment opportunity values with static and dynamic fields mapped
 */
export const mapInvestmentToInvestmentOpportunityValues = (
  investment: Investment | null | undefined
): Partial<InvestmentOpportunity> => {
  if (!investment) {
    return {}
  }

  // Extract first specialization if array (GraphQL returns arrays)
  const equityInvestment = Array.isArray(investment.equityInvestment)
    ? investment.equityInvestment[0]
    : investment.equityInvestment
  const realEstateInvestment = Array.isArray(investment.realEstateInvestment)
    ? investment.realEstateInvestment[0]
    : investment.realEstateInvestment
  const liquidFundInvestment = Array.isArray(investment.liquidFundInvestment)
    ? investment.liquidFundInvestment[0]
    : investment.liquidFundInvestment

  // Base opportunity fields from investment
  const result: Partial<InvestmentOpportunity> = {
    // Divestment-specific fields
    divestmentId: investment.id,
    dealType: 'DIVESTMENT_DEAL',

    // Investment metadata
    investmentName: investment.name,
    investmentGroup: investment.investmentGroup as any,
    investmentGroupRef: investment.investmentGroup?.id,
    investmentType: investment.investmentType as any,
    investmentTypeRef: investment.investmentType?.id,
    investmentRole: investment.investmentRole?.[0]?.investmentRole as any,
    investmentRoleRef: investment.investmentRole?.[0]?.investmentRole?.id,
    investmentStakeType: investment.investmentStakeType as any,
    investmentStakeTypeRef: investment.investmentStakeType?.id,

    // Currency
    currency: investment.currency as any,
    currencyRef: investment.currency?.id,

    // Monetary fields
    initialInvestmentAmount: investment.initialInvestmentAmount,
    marketValue: investment.investmentMarketValue,
    forecastedProfitAmount: investment.forecastedProfitAmount,
    requiredCapitalAmount: investment.requiredCapitalAmount,
    stakePercentage: investment.stakePercentage,

    // Loan fields (if present)
    loanAmount: investment.loanAmount,
    loanInterestRate: investment.loanInterestRate,

    // Owner
    ownerEmployeeId: investment.ownerEmployee?.id,

    // Account associations (junction table)
    // GraphQL field names: investmentAccounts and opportunityAccounts
    opportunityAccounts:
      investment.investmentAccounts?.map(assoc => ({
        accountId: assoc.investmentAccountId,
        accountTypeRef: assoc.investmentAccountTypeRef,
        account: assoc.investmentAccount as any
      })) || []
  }

  // Real Estate specific fields
  if (realEstateInvestment) {
    result.annualNetColdRent = realEstateInvestment.annualNetColdRent
    result.buildingYear = realEstateInvestment.buildingYear
    result.size = realEstateInvestment.size
    result.sizeMeasurementUnit = realEstateInvestment.sizeMeasurementUnit as any
    result.sizeMeasurementUnitRef = realEstateInvestment.sizeMeasurementUnit?.id
  }

  // Equity Investment specific fields
  // Note: These fields may be stored in additionalProperties or as dynamic fields
  // Map them to the result object for form population
  if (equityInvestment) {
    // Equity fields that might be used in opportunity forms
    // Market value from equity investment takes precedence if available
    if (equityInvestment.marketValue !== undefined) {
      result.marketValue = equityInvestment.marketValue
    }
    // Store equity-specific fields in result for potential dynamic field mapping
    ;(result as any).equityInvestment = {
      foundationDate: equityInvestment.foundationDate,
      marketValue: equityInvestment.marketValue,
      turnoverAmount: equityInvestment.turnoverAmount,
      ebitdaAmount: equityInvestment.ebitdaAmount
    }
  }

  // Liquid Fund Investment specific fields
  // Note: These fields may be stored in additionalProperties or as dynamic fields
  if (liquidFundInvestment) {
    // Store liquid fund-specific fields in result for potential dynamic field mapping
    ;(result as any).liquidFundInvestment = {
      proprietorName: liquidFundInvestment.proprietorName,
      bankName: liquidFundInvestment.bankName,
      bankAccountNumber: liquidFundInvestment.bankAccountNumber,
      earlyTerminationAllowed: liquidFundInvestment.earlyTerminationAllowed,
      interestRate: liquidFundInvestment.interestRate,
      maturityDate: liquidFundInvestment.maturityDate,
      investmentLiquidFundType: liquidFundInvestment.investmentLiquidFundType as any,
      investmentLiquidFundTypeRef: liquidFundInvestment.investmentLiquidFundType?.id,
      interestPaymentFrequency: liquidFundInvestment.interestPaymentFrequency as any,
      interestPaymentFrequencyRef: liquidFundInvestment.interestPaymentFrequency?.id
    }
  }

  // Extract dynamic fields from subtypes based on formFields definition
  const dynamicFields: Record<string, any> = {}

  // Get formFields from investmentGroup.objectValue or investmentType.objectValue
  const fullFormFields = (() => {
    try {
      const groupObjectValue = investment.investmentGroup?.objectValue as any
      const typeObjectValue = investment.investmentType?.objectValue as any

      const parseObjectValue = (obj: any) => {
        if (!obj) return null
        if (typeof obj === 'string') {
          try {
            return JSON.parse(obj)
          } catch {
            return obj
          }
        }
        return obj
      }

      const parsedType = parseObjectValue(typeObjectValue)
      const parsedGroup = parseObjectValue(groupObjectValue)

      const formFields =
        parsedType?.formFields?.length > 0
          ? parsedType.formFields
          : parsedGroup?.formFields?.length > 0
            ? parsedGroup.formFields
            : null

      return formFields
    } catch (err) {
      console.error('[InvestmentToOpportunityMapper] Error extracting formFields:', err)
      return null
    }
  })()

  // Extract dynamic field values from investment subtypes
  if (fullFormFields) {
    for (const group of fullFormFields) {
      for (const field of group.fields || []) {
        const property = field.property
        if (!property || !property.includes('.')) continue

        // Handle nested properties like "equityInvestment.marketValue"
        const parts = property.split('.')
        const entityType = parts[0] // "equityInvestment", "realEstateInvestment", "liquidFundInvestment"
        const fieldPath = parts.slice(1).join('.') // "marketValue", "foundationDate", etc.

        let value: any = undefined

        // Extract value from the appropriate subtype
        if (entityType === 'equityInvestment' && equityInvestment) {
          value = fieldPath.split('.').reduce((obj: any, key: string) => obj?.[key], equityInvestment as any)
        } else if (entityType === 'realEstateInvestment' && realEstateInvestment) {
          value = fieldPath.split('.').reduce((obj: any, key: string) => obj?.[key], realEstateInvestment as any)
        } else if (entityType === 'liquidFundInvestment' && liquidFundInvestment) {
          value = fieldPath.split('.').reduce((obj: any, key: string) => obj?.[key], liquidFundInvestment as any)
        }

        if (value !== undefined && value !== null) {
          dynamicFields[property] = value
        }
      }
    }
  }

  // Merge static and dynamic fields
  const finalResult = {
    ...result,
    ...dynamicFields
  }

  // Remove undefined values to keep payload clean
  Object.keys(finalResult).forEach(key => {
    if (finalResult[key as keyof InvestmentOpportunity] === undefined) {
      delete finalResult[key as keyof InvestmentOpportunity]
    }
  })

  return finalResult
}
