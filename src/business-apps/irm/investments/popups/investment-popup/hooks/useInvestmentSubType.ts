import { Investment } from '@/common/data/investment/types/investmentTypes'

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
 * Helper to get first element from specialization array
 */
const getSpecializationFromArray = (array: unknown): unknown => {
  return Array.isArray(array) && array.length > 0 ? array[0] : null
}

/**
 * Attempts to get subtype from specialization arrays
 */
const getSubTypeFromSpecializations = (investment: InvestmentWithSpecializations): InvestmentSubType | null => {
  const equity = getSpecializationFromArray(investment.equityInvestment)
  if (equity) return { equityInvestment: equity }

  const realEstate = getSpecializationFromArray(investment.realEstateInvestment)
  if (realEstate) return { realEstateInvestment: realEstate }

  const liquidFund = getSpecializationFromArray(investment.liquidFundInvestment)
  if (liquidFund) return { liquidFundInvestment: liquidFund }

  return null
}

/**
 * Gets subtype based on group code
 */
const getSubTypeFromGroupCode = (code: string): InvestmentSubType => {
  switch (code.toUpperCase()) {
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

/**
 * Determines the investment sub-type and returns the appropriate object structure
 * for the investment request payload
 */
export const useInvestmentSubType = () => {
  const getInvestmentSubType = (investment: Investment): InvestmentSubType => {
    // Try to get subtype from specialization arrays
    if (hasSpecializations(investment)) {
      const subType = getSubTypeFromSpecializations(investment as InvestmentWithSpecializations)
      if (subType) return subType
    }

    // Fallback: determine from investment group code
    const groupCode =
      investment.investmentGroup?.code ??
      (hasSpecializations(investment) ? (investment as InvestmentWithSpecializations).groupRef : undefined)

    if (typeof groupCode === 'string') {
      const code = groupCode.includes(':') ? groupCode.split(':').pop()! : groupCode
      return getSubTypeFromGroupCode(code)
    }

    return {}
  }

  return { getInvestmentSubType }
}
