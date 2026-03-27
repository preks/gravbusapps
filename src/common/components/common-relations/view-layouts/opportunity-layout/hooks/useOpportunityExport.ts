import { useCallback, useMemo } from 'react'
import { formatExportDate } from '@/common/utils/excelExportUtils'
import { useExportBase } from '@/common/hooks/useExportBase'
import type { Opportunity } from '@/common/data/relations/types/opportunityTypes'
import type { OpportunityAggregates } from '../components/OpportunityAggregatesBar'

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

// ─── Summary rows ─────────────────────────────────────────────────────────────

function formatCurrencyAmount(value: number | null, currencyCode: string): string {
  if (value == null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

function buildOpportunitySummaryRows(
  aggregates: OpportunityAggregates | null,
  displayCurrencyCode: string
): Array<[string, string]> {
  if (!aggregates) return []

  const fmt = (v: number | null) => formatCurrencyAmount(v, displayCurrencyCode)

  return [
    ['Count:', String(aggregates.count)],
    ['Total Estimated Amount:', fmt(aggregates.totalEstimatedAmount)],
    ['Average Estimated Amount:', fmt(aggregates.avgEstimatedAmount)],
    ['Total Investment Amount:', fmt(aggregates.totalInvestmentAmount)],
    ['Average Investment Amount:', fmt(aggregates.avgInvestmentAmount)]
  ]
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseOpportunityExportOptions {
  fetchOpportunities: (variables: any) => Promise<{ opportunities?: Opportunity[]; total?: number }>
  queryVariables: any
  totalCount: number
  filenamePrefix?: string
  contextType: 'customer' | 'investment'
  /** Aggregates from the current filtered list (IRM only). */
  listAggregates?: OpportunityAggregates | null
  /** Currency code for formatting aggregate amounts (IRM only). */
  displayCurrencyCode?: string
}

export function useOpportunityExport({
  fetchOpportunities,
  queryVariables,
  totalCount,
  filenamePrefix = 'opportunities',
  contextType,
  listAggregates,
  displayCurrencyCode = 'EUR'
}: UseOpportunityExportOptions) {
  const fetchAllItems = useCallback(async (): Promise<Opportunity[]> => {
    const result = await fetchOpportunities({ ...queryVariables, limit: totalCount, offset: 0 })
    return result.opportunities || []
  }, [fetchOpportunities, queryVariables, totalCount])

  const isIrm = contextType === 'investment'

  const summaryRows = useMemo(
    () => (isIrm ? buildOpportunitySummaryRows(listAggregates ?? null, displayCurrencyCode) : []),
    [isIrm, listAggregates, displayCurrencyCode]
  )

  return useExportBase<Opportunity>({
    fetchAllItems,
    formatItem: isIrm ? formatIrmOpportunityForExport : formatCrmOpportunityForExport,
    columns: isIrm ? IRM_OPPORTUNITY_EXPORT_COLUMNS : CRM_OPPORTUNITY_EXPORT_COLUMNS,
    dateColumnKeys: OPPORTUNITY_DATE_COLUMN_KEYS,
    sheetName: 'Opportunities',
    entityLabel: 'opportunities',
    totalCount,
    filenamePrefix,
    summaryRows
  })
}
