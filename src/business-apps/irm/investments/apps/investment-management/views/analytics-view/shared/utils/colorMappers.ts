/**
 * Investment-specific color mapping functions
 * Standard color schemes for investment statuses, risk levels, roles, phases, and fund types
 */

/**
 * Standard status color mapping for investment status values
 * Centralized to ensure consistent status colors across analytics
 */
export const getInvestmentStatusColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'green'
    case 'inactive':
      return 'red'
    case 'pending':
      return 'orange'
    case 'completed':
      return 'blue'
    case 'cancelled':
      return 'gray'
    default:
      return 'blue'
  }
}

/**
 * Standard risk level color mapping
 */
export const getRiskLevelColor = (riskLevel: string): string => {
  switch (riskLevel?.toLowerCase()) {
    case 'low':
      return 'green'
    case 'medium':
      return 'orange'
    case 'high':
      return 'red'
    default:
      return 'blue'
  }
}

/**
 * Standard investment role color mapping
 */
export const getInvestmentRoleColor = (role: string): string => {
  switch (role?.toLowerCase()) {
    case 'lead':
      return 'purple'
    case 'co-investor':
      return 'blue'
    case 'minority':
      return 'green'
    case 'majority':
      return 'orange'
    default:
      return 'gray'
  }
}

/**
 * Standard investment phase color mapping
 */
export const getInvestmentPhaseColor = (phase: string): string => {
  switch (phase?.toLowerCase()) {
    case 'seed':
      return 'green'
    case 'series_a':
      return 'blue'
    case 'series_b':
      return 'purple'
    case 'series_c':
      return 'orange'
    case 'ipo':
      return 'gold'
    case 'growth':
      return 'indigo'
    default:
      return 'gray'
  }
}

/**
 * Fund type color mapping for liquid funds
 */
export const getFundTypeColor = (fundType: string): string => {
  switch (fundType?.toLowerCase()) {
    case 'money_market':
      return 'blue'
    case 'bond':
      return 'green'
    case 'equity':
      return 'purple'
    case 'mixed':
      return 'orange'
    case 'real_estate':
      return 'brown'
    default:
      return 'gray'
  }
}
