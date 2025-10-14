// Utility functions for the Investment Relations Opportunity View

/**
 * Format date string to localized format
 */
export const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString()
}

/**
 * Format currency amount with proper currency code
 */
export const formatCurrency = (amount: number | undefined, currencyCode: string = 'EUR'): string => {
  if (amount === undefined || amount === null) return '-'

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount)
  } catch (error) {
    // Fallback formatting if currency code is invalid
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount)
  }
}

/**
 * Get opportunity stage color variant based on stage
 */
export const getOpportunityStageVariant = (
  stage?: string
): 'default' | 'secondary' | 'success' | 'destructive' | 'outline' => {
  if (!stage) return 'default'

  switch (stage.toLowerCase()) {
    case 'closed won':
      return 'success'
    case 'closed lost':
      return 'destructive'
    case 'proposal':
    case 'negotiation':
      return 'secondary'
    case 'qualification':
    case 'prospecting':
      return 'outline'
    default:
      return 'default'
  }
}

/**
 * Calculate total value of all opportunities
 */
export const calculateTotalValue = (opportunities: any[]): number => {
  return opportunities.reduce((total, opp) => {
    return total + (opp.estimatedAmount || 0)
  }, 0)
}

/**
 * Calculate total count of opportunities
 */
export const calculateTotalCount = (opportunities: any[]): number => {
  return opportunities.length
}

/**
 * Calculate win rate percentage
 */
export const calculateWinRate = (opportunities: any[]): number => {
  if (opportunities.length === 0) return 0

  const closedOpportunities = opportunities.filter(opp => opp.stage === 'CLOSED_WON' || opp.stage === 'CLOSED_LOST')

  if (closedOpportunities.length === 0) return 0

  const wonOpportunities = closedOpportunities.filter(opp => opp.stage === 'CLOSED_WON')

  return Math.round((wonOpportunities.length / closedOpportunities.length) * 100)
}
