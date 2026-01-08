// Shared utility for calculating version status based on date ranges

export type VersionStatus = 'active' | 'expired' | 'inactive' | 'planned'

/**
 * Calculate status based on activeFrom and activeTo dates
 * @param activeFrom - Start date of validity period (ISO string or null)
 * @param activeTo - End date of validity period (ISO string or null)
 * @returns Status: 'active' | 'expired' | 'inactive' | 'planned'
 */
export const calculateVersionStatus = (activeFrom: string | null, activeTo: string | null): VersionStatus => {
  // If either date is missing, consider it inactive
  if (!activeFrom || !activeTo) {
    return 'inactive'
  }

  const currentDate = new Date()
  const fromDate = new Date(activeFrom)
  const toDate = new Date(activeTo)

  // If activeFrom is in the future, it's planned
  if (currentDate < fromDate) {
    return 'planned'
  }

  // If current date is within the range, it's active
  if (currentDate >= fromDate && currentDate <= toDate) {
    return 'active'
  }

  // Otherwise, it's expired
  return 'expired'
}
