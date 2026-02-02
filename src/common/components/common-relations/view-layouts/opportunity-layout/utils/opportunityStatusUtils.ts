/**
 * Utility functions for opportunity status management
 * Shared between Investment (IRM) and Customer (CRM) opportunity records
 */

/**
 * Determines if an opportunity is in an "open" state and allows stage transitions
 *
 * An opportunity is considered "open" (and tooltips/transitions are enabled) if:
 * - No status is provided (defaults to open)
 * - Status explicitly contains "OPEN"
 * - Status is not in a closed/final state
 *
 * @param status - The opportunity status value (from opportunityStatus.value)
 * @returns true if the opportunity allows stage transitions, false otherwise
 *
 * @example
 * isOpportunityOpen('Open') // true
 * isOpportunityOpen('In Progress') // true
 * isOpportunityOpen('Closed Won') // false
 * isOpportunityOpen('Lost') // false
 * isOpportunityOpen(undefined) // true (default to open)
 */
export const isOpportunityOpen = (status?: string): boolean => {
  if (!status) return true // Default to open if no status

  const statusUpper = status.toUpperCase()

  // Check if status contains "OPEN"
  if (statusUpper === 'OPEN' || statusUpper.includes('OPEN')) {
    return true
  }

  // Check for closed/final status values
  const closedStatuses = ['WON', 'LOST', 'CLOSED WON', 'CLOSED LOST', 'SUCCESS', 'COMPLETED', 'CANCELLED', 'REJECTED']

  return !closedStatuses.some(closedStatus => statusUpper.includes(closedStatus))
}
