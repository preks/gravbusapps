import { Investment } from '@/common/data/investment/types'

// Extended interface that includes specialization arrays (as returned by GraphQL)
interface InvestmentWithSpecializations extends Investment {
  equityInvestment?: any[]
  realEstateInvestment?: any[]
  liquidFundInvestment?: any[]
  groupRef?: string
}

type InvestmentSubType = {
  equityInvestment?: unknown
  realEstateInvestment?: unknown
  liquidFundInvestment?: unknown
}

/**
 * Type guard to check if investment has specialization arrays
 */
const hasSpecializations = (investment: Investment): investment is InvestmentWithSpecializations => {
  return (
    'equityInvestment' in investment ||
    'realEstateInvestment' in investment ||
    'liquidFundInvestment' in investment ||
    'groupRef' in investment
  )
}

/**
 * Determines the investment sub-type and returns the appropriate object structure
 * for the investment request payload
 */
export const useInvestmentSubType = () => {
  const getInvestmentSubType = (investment: Investment): InvestmentSubType => {
    // If investment has specialization arrays, use them
    if (hasSpecializations(investment)) {
      // Check for equity investment
      if (
        investment.equityInvestment &&
        Array.isArray(investment.equityInvestment) &&
        investment.equityInvestment.length > 0
      ) {
        return { equityInvestment: investment.equityInvestment[0] }
      }

      // Check for real estate investment
      if (
        investment.realEstateInvestment &&
        Array.isArray(investment.realEstateInvestment) &&
        investment.realEstateInvestment.length > 0
      ) {
        return { realEstateInvestment: investment.realEstateInvestment[0] }
      }

      // Check for liquid fund investment
      if (
        investment.liquidFundInvestment &&
        Array.isArray(investment.liquidFundInvestment) &&
        investment.liquidFundInvestment.length > 0
      ) {
        return { liquidFundInvestment: investment.liquidFundInvestment[0] }
      }
    }

    // Fallback: try to determine from investment group
    const groupCode =
      investment.investmentGroup?.code ??
      (hasSpecializations(investment) ? (investment as InvestmentWithSpecializations).groupRef : undefined)
    if (typeof groupCode === 'string') {
      const code = groupCode.includes(':') ? groupCode.split(':').pop() : groupCode
      switch (code?.toUpperCase()) {
        case 'EQUITY':
          return { equityInvestment: {} }
        case 'REAL_ESTATE':
          return { realEstateInvestment: {} }
        case 'LIQUID_FUND':
          return { liquidFundInvestment: {} }
        default:
          return {}
      }
    }

    // Fallback when no group code is present
    return {}
  }

  return { getInvestmentSubType }
}
