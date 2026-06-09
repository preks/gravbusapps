import { useCallback, useMemo } from 'react'
import type { Opportunity } from '@/common/data/relations/types/opportunityTypes'
import { useExportBase } from '@/common/hooks/useExportBase'
import { buildCrmOpportunityExportFields } from '@/common/components/common-relations/apps/data-export/registries/opportunity/crmOpportunityExportFields'
import { buildIrmOpportunityExportFields } from '@/common/components/common-relations/apps/data-export/registries/opportunity/irmOpportunityExportFields'
import {
  formatEntityForExport,
  getDateColumnKeys,
  getDefaultSelectedFieldKeys,
  resolveExportFields,
  toExportColumns
} from '@/common/components/common-relations/apps/data-export/types/exportFieldTypes'
import type { OpportunityAggregates } from '../components/OpportunityAggregatesBar'

const CRM_DEFAULT_EXPORT_FIELDS = resolveExportFields(
  buildCrmOpportunityExportFields(),
  getDefaultSelectedFieldKeys(buildCrmOpportunityExportFields())
)

const IRM_DEFAULT_EXPORT_FIELDS = resolveExportFields(
  buildIrmOpportunityExportFields(),
  getDefaultSelectedFieldKeys(buildIrmOpportunityExportFields())
)

export const CRM_OPPORTUNITY_EXPORT_COLUMNS = toExportColumns(CRM_DEFAULT_EXPORT_FIELDS)
export const IRM_OPPORTUNITY_EXPORT_COLUMNS = toExportColumns(IRM_DEFAULT_EXPORT_FIELDS)

const CRM_OPPORTUNITY_DATE_COLUMN_KEYS = getDateColumnKeys(CRM_DEFAULT_EXPORT_FIELDS)
const IRM_OPPORTUNITY_DATE_COLUMN_KEYS = getDateColumnKeys(IRM_DEFAULT_EXPORT_FIELDS)

export const formatCrmOpportunityForExport = (opportunity: Opportunity): Record<string, string> =>
  formatEntityForExport(opportunity, CRM_DEFAULT_EXPORT_FIELDS)

export const formatIrmOpportunityForExport = (opportunity: Opportunity): Record<string, string> =>
  formatEntityForExport(opportunity, IRM_DEFAULT_EXPORT_FIELDS)

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

  const fmt = (value: number | null) => formatCurrencyAmount(value, displayCurrencyCode)

  return [
    ['Count:', String(aggregates.count)],
    ['Total Estimated Amount:', fmt(aggregates.totalEstimatedAmount)],
    ['Average Estimated Amount:', fmt(aggregates.avgEstimatedAmount)],
    ['Total Investment Amount:', fmt(aggregates.totalInvestmentAmount)],
    ['Average Investment Amount:', fmt(aggregates.avgInvestmentAmount)]
  ]
}

interface UseOpportunityExportOptions {
  fetchOpportunities: (variables: Record<string, unknown>) => Promise<{ opportunities?: Opportunity[]; total?: number }>
  queryVariables: Record<string, unknown>
  totalCount: number
  filenamePrefix?: string
  contextType: 'customer' | 'investment'
  listAggregates?: OpportunityAggregates | null
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
    dateColumnKeys: isIrm ? IRM_OPPORTUNITY_DATE_COLUMN_KEYS : CRM_OPPORTUNITY_DATE_COLUMN_KEYS,
    sheetName: 'Opportunities',
    entityLabel: 'opportunities',
    totalCount,
    filenamePrefix,
    summaryRows
  })
}
