/**
 * Format a number as currency
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Stage name mapping for more readable display
 */
const stageNameMap: Record<string, string> = {
  NEW_OPPORTUNITY: 'New Opportunity',
  IN_QUALIFICATION: 'In Qualification',
  PROPOSAL_IN_PROGRESS: 'Proposal In Progress',
  NEGOTIATION: 'Negotiation',
  CLOSED: 'Closed'
};

/**
 * Format stage code to human-readable format
 */
export function formatStage(stageCode: string): string {
  return stageNameMap[stageCode] || stageCode;
}