export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

export function formatDateShort(date: string | null): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

const stageNameMap: Record<string, string> = {
  NEW_OPPORTUNITY: 'New Opportunity',
  IN_QUALIFICATION: 'In Qualification',
  PROPOSAL_IN_PROGRESS: 'Proposal In Progress',
  NEGOTIATION: 'Negotiation',
  CLOSED: 'Closed'
}

export function formatStage(stageCode: string): string {
  return stageNameMap[stageCode] || stageCode
}
