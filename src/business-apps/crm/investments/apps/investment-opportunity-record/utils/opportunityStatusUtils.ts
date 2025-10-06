/**
 * Utility functions for opportunity status management
 */

/**
 * Determines if an opportunity is in an "open" state and allows stage transitions
 * @param status - The opportunity status value
 * @returns true if the opportunity allows stage transitions, false otherwise
 */
export const isOpportunityOpen = (status?: string): boolean => {
  if (!status) return true; // Default to open if no status
  
  const statusUpper = status.toUpperCase();
  
  // Check if status contains "OPEN"
  if (statusUpper === 'OPEN' || statusUpper.includes('OPEN')) {
    return true;
  }
  
  // Check for closed/final status values
  const closedStatuses = [
    'WON', 
    'LOST', 
    'CLOSED WON', 
    'CLOSED LOST', 
    'SUCCESS', 
    'COMPLETED',
    'CANCELLED',
    'REJECTED'
  ];
  
  return !closedStatuses.some(closedStatus => statusUpper.includes(closedStatus));
};

