/**
 * Query helper functions for opportunity views
 *
 * NOTE: These functions are no longer used by Opportunity views (CRM/IRM) after refactoring
 * to align Filter-IDs with Descriptor-Keys. They are kept for backward compatibility with
 * other features (e.g., Divestment SalesTab) that may still use them.
 *
 * For new Opportunity views, filter values are now directly copied from selectedFilters
 * to query variables, with special handling for 'amount' and 'closeDate' filters.
 */

interface OpportunityQueryVars {
  stageIds?: string[]
  statusIds?: string[]
  opportunityPipelineIds?: string[]
  ownerEmployeeIds?: string[]
  accountIds?: string[]
  estimatedAmountRanges?: Array<{ min?: number; max?: number }>
  closeDateFrom?: string
  closeDateTo?: string
}

export const applyBasicFilters = <T extends OpportunityQueryVars>(vars: T, selectedFilters: Record<string, any>) => {
  if (selectedFilters.opportunityPipelineStage?.length > 0) vars.stageIds = selectedFilters.opportunityPipelineStage
  if (selectedFilters.opportunityStatus?.length > 0) vars.statusIds = selectedFilters.opportunityStatus
  if (selectedFilters.opportunityPipeline?.length > 0) vars.opportunityPipelineIds = selectedFilters.opportunityPipeline
  if (selectedFilters.owner?.length > 0) vars.ownerEmployeeIds = selectedFilters.owner
  if (selectedFilters.account?.length > 0) vars.accountIds = selectedFilters.account
}

export const applyAmountFilter = <T extends OpportunityQueryVars>(vars: T, amountFilter: any) => {
  if (!amountFilter || typeof amountFilter !== 'object') return

  const min = amountFilter.min ?? null
  const max = amountFilter.max ?? null

  if (min !== null || max !== null) {
    vars.estimatedAmountRanges = [
      {
        ...(min !== null && { min }),
        ...(max !== null && { max })
      }
    ]
  }
}

export const parseDateString = (dateFilter: string): { from?: string; to?: string } => {
  const dates = dateFilter
    .split(',')
    .map(d => d.trim())
    .filter(Boolean)
  if (dates.length === 1) {
    return { from: dates[0], to: dates[0] }
  }
  if (dates.length === 2) {
    return { from: dates[0] || undefined, to: dates[1] || undefined }
  }
  return {}
}

export const applyDateFilter = <T extends OpportunityQueryVars>(vars: T, dateFilter: any) => {
  if (!dateFilter) return

  if (typeof dateFilter === 'string') {
    const { from, to } = parseDateString(dateFilter)
    if (from) vars.closeDateFrom = from
    if (to) vars.closeDateTo = to
  } else if (Array.isArray(dateFilter)) {
    const [start, end] = dateFilter
    if (start) vars.closeDateFrom = start
    if (end) vars.closeDateTo = end
  }
}
