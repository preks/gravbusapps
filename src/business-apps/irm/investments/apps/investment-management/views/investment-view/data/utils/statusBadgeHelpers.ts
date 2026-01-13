/**
 * Gets the badge variant based on investment status type
 * This matches the logic used in investment records (investmentHeaderConfig.tsx)
 *
 * @param statusType - The investment status type (e.g., 'ACTIVE', 'EXITED', 'ON_HOLD')
 * @returns Badge variant matching the record display
 */
export const getInvestmentStatusBadgeVariant = (
  statusType: string | undefined
): 'info' | 'warning' | 'success' | 'default' => {
  if (!statusType) return 'default'

  switch (statusType) {
    case 'EXITED':
      return 'info' // Blue badge
    case 'ON_HOLD':
      return 'warning' // Yellow/Orange badge
    case 'ACTIVE':
      return 'success' // Green badge
    default:
      return 'default' // Gray badge for unknown types
  }
}

/**
 * Gets the badge variant from status code
 * Convenience function when you only have the status code
 *
 * @param statusCode - The investment status code
 * @returns Badge variant
 */
export const getInvestmentStatusBadgeVariantFromCode = (
  statusCode: string | undefined
): 'info' | 'warning' | 'success' | 'default' => {
  return getInvestmentStatusBadgeVariant(statusCode)
}
