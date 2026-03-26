import { useCallback } from 'react'
import { formatExportDate } from '@/common/utils/excelExportUtils'
import { useExportBase } from '@/common/hooks/useExportBase'
import type { Opportunity } from '@/common/data/relations/types/opportunityTypes'

// ─── Column definitions ───────────────────────────────────────────────────────

const CRM_OPPORTUNITY_EXPORT_COLUMNS = [
  { key: 'name', title: 'Opportunity' },
  { key: 'opportunityStatus', title: 'Status' },
  { key: 'pipeline', title: 'Pipeline' },
  { key: 'stage', title: 'Stage' },
  { key: 'opportunityForecast', title: 'Forecast' },
  { key: 'amount', title: 'Amount' },
  { key: 'winningChance', title: 'Win Chance (%)' },
  { key: 'closeDate', title: 'Close Date' },
  { key: 'ownerEmployee', title: 'Owner' },
  { key: 'createdAt', title: 'Created Date' }
] as const

const IRM_OPPORTUNITY_EXPORT_COLUMNS = [
  { key: 'name', title: 'Opportunity' },
  { key: 'opportunityStatus', title: 'Status' },
  { key: 'pipeline', title: 'Pipeline' },
  { key: 'stage', title: 'Stage' },
  { key: 'opportunityForecast', title: 'Forecast' },
  { key: 'amount', title: 'Amount' },
  { key: 'forecastedProfitAmount', title: 'Forecasted Profit' },
  { key: 'closeDate', title: 'Close Date' },
  { key: 'ownerEmployee', title: 'Owner' },
  { key: 'createdAt', title: 'Created Date' }
] as const

const OPPORTUNITY_DATE_COLUMN_KEYS = new Set(['closeDate', 'createdAt'])

// ─── Formatters ───────────────────────────────────────────────────────────────

const getOwnerDisplayName = (opp: Opportunity): string => {
  const emp = opp.ownerEmployee
  if (!emp) return '-'
  return emp.displayName || [emp.firstName, emp.lastName].filter(Boolean).join(' ') || '-'
}

const getPipelineValue = (opp: any): string => opp.opportunityPipeline?.value || opp.salesPipeline?.value || '-'

const getStageValue = (opp: any): string => opp.opportunityPipelineStage?.value || opp.salesPipelineStage?.value || '-'

const formatAmount = (opp: Opportunity): string => {
  if (opp.estimatedAmount == null) return '-'
  const currencyCode = opp.currency?.code || ''
  return currencyCode ? `${opp.estimatedAmount} ${currencyCode}` : String(opp.estimatedAmount)
}

const formatCrmOpportunityForExport = (opp: Opportunity): Record<string, string> => ({
  name: opp.name || '-',
  opportunityStatus: opp.opportunityStatus?.value || '-',
  pipeline: getPipelineValue(opp),
  stage: getStageValue(opp),
  opportunityForecast: opp.opportunityForecast?.value || '-',
  amount: formatAmount(opp),
  winningChance: opp.winningChance == null ? '-' : String(opp.winningChance),
  closeDate: formatExportDate(opp.closeDate),
  ownerEmployee: getOwnerDisplayName(opp),
  createdAt: formatExportDate(opp.createdAt)
})

const formatIrmOpportunityForExport = (opp: any): Record<string, string> => ({
  name: opp.name || '-',
  opportunityStatus: opp.opportunityStatus?.value || '-',
  pipeline: getPipelineValue(opp),
  stage: getStageValue(opp),
  opportunityForecast: opp.opportunityForecast?.value || '-',
  amount: formatAmount(opp),
  forecastedProfitAmount: opp.forecastedProfitAmount == null ? '-' : String(opp.forecastedProfitAmount),
  closeDate: formatExportDate(opp.closeDate),
  ownerEmployee: getOwnerDisplayName(opp),
  createdAt: formatExportDate(opp.createdAt)
})

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseOpportunityExportOptions {
  fetchOpportunities: (variables: any) => Promise<{ opportunities?: Opportunity[]; total?: number }>
  queryVariables: any
  totalCount: number
  filenamePrefix?: string
  contextType: 'customer' | 'investment'
}

export function useOpportunityExport({
  fetchOpportunities,
  queryVariables,
  totalCount,
  filenamePrefix = 'opportunities',
  contextType
}: UseOpportunityExportOptions) {
  const fetchAllItems = useCallback(async (): Promise<Opportunity[]> => {
    const result = await fetchOpportunities({ ...queryVariables, limit: totalCount, offset: 0 })
    return result.opportunities || []
  }, [fetchOpportunities, queryVariables, totalCount])

  const isIrm = contextType === 'investment'

  return useExportBase<Opportunity>({
    fetchAllItems,
    formatItem: isIrm ? formatIrmOpportunityForExport : formatCrmOpportunityForExport,
    columns: isIrm ? IRM_OPPORTUNITY_EXPORT_COLUMNS : CRM_OPPORTUNITY_EXPORT_COLUMNS,
    dateColumnKeys: OPPORTUNITY_DATE_COLUMN_KEYS,
    sheetName: 'Opportunities',
    entityLabel: 'opportunities',
    totalCount,
    filenamePrefix
  })
}
