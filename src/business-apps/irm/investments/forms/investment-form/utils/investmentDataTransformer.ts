/**
 * Get investment group from form data or additional data
 */
export const getInvestmentGroupFromContext = (additionalData?: Record<string, any>): string | undefined => {
  // Check for investmentGroup in multiple possible locations
  // 1. Top level (direct pass-through)
  // 2. psi_taskPayload.psi_initialParameters (process payload)
  const group =
    additionalData?.investmentGroup || additionalData?.psi_taskPayload?.psi_initialParameters?.investmentGroup

  if (group) {
    // If already in catalog ID format (e.g., "InvestmentGroup:v1:EQUITY"), return as-is
    if (typeof group === 'string' && group.includes('InvestmentGroup:v1:')) {
      return group
    }

    // Otherwise, convert shorthand to full reference
    const groupUpper = String(group).toUpperCase()
    switch (groupUpper) {
      case 'EQUITY':
        return 'InvestmentGroup:v1:EQUITY'
      case 'REAL-ESTATE':
        return 'InvestmentGroup:v1:REAL_ESTATE'
      case 'LIQUID_FUND':
        return 'InvestmentGroup:v1:LIQUID_FUND'
      default:
        return undefined
    }
  }

  return undefined
}
