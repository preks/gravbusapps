import { useCallback } from 'react'
import type { Lead } from '@/common/data/relations/types/leadTypes'
import { useExportBase } from '@/common/hooks/useExportBase'
import { buildCommonLeadExportFields } from '@/common/components/common-relations/apps/data-export/registries/lead/commonLeadExportFields'
import {
  formatEntityForExport,
  getDateColumnKeys,
  getDefaultSelectedFieldKeys,
  resolveExportFields,
  toExportColumns
} from '@/common/components/common-relations/apps/data-export/types/exportFieldTypes'

const ALL_COMMON_LEAD_EXPORT_FIELDS = buildCommonLeadExportFields()
const DEFAULT_EXPORT_FIELDS = resolveExportFields(
  ALL_COMMON_LEAD_EXPORT_FIELDS,
  getDefaultSelectedFieldKeys(ALL_COMMON_LEAD_EXPORT_FIELDS)
)

export const LEAD_EXPORT_COLUMNS = toExportColumns(DEFAULT_EXPORT_FIELDS)

const LEAD_DATE_COLUMN_KEYS = getDateColumnKeys(DEFAULT_EXPORT_FIELDS)

export const formatLeadForExport = (lead: Lead): Record<string, string> =>
  formatEntityForExport(lead, DEFAULT_EXPORT_FIELDS)

interface UseLeadExportOptions {
  fetchLeads: (variables: Record<string, unknown>) => Promise<{ leads?: Lead[]; total?: number }>
  queryVariables: Record<string, unknown>
  totalCount: number
  filenamePrefix?: string
}

export function useLeadExport({
  fetchLeads,
  queryVariables,
  totalCount,
  filenamePrefix = 'leads'
}: UseLeadExportOptions) {
  const fetchAllItems = useCallback(async (): Promise<Lead[]> => {
    const result = await fetchLeads({ ...queryVariables, limit: totalCount, offset: 0 })
    return result.leads || []
  }, [fetchLeads, queryVariables, totalCount])

  return useExportBase<Lead>({
    fetchAllItems,
    formatItem: formatLeadForExport,
    columns: LEAD_EXPORT_COLUMNS,
    dateColumnKeys: LEAD_DATE_COLUMN_KEYS,
    sheetName: 'Leads',
    entityLabel: 'leads',
    totalCount,
    filenamePrefix
  })
}
