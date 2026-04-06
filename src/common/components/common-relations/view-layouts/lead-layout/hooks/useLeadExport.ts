import { useCallback } from 'react'
import { formatExportDate } from '@/common/utils/excelExportUtils'
import { useExportBase } from '@/common/hooks/useExportBase'
import type { Lead } from '@/common/data/relations/types/leadTypes'
import { getCatalogEntryValue } from '@/common/data/catalog/utils/catalogTranslationUtils'

// ─── Column definitions ───────────────────────────────────────────────────────

export const LEAD_EXPORT_COLUMNS = [
  { key: 'firstName', title: 'First Name' },
  { key: 'lastName', title: 'Last Name' },
  { key: 'email', title: 'Email' },
  { key: 'phoneNumber', title: 'Phone' },
  { key: 'companyName', title: 'Company' },
  { key: 'jobPosition', title: 'Job Position' },
  { key: 'leadStatus', title: 'Status' },
  { key: 'leadRating', title: 'Rating' },
  { key: 'leadSource', title: 'Source' },
  { key: 'industryClass', title: 'Industry' },
  { key: 'ownerEmployee', title: 'Owner' },
  { key: 'createdAt', title: 'Created Date' }
] as const

const LEAD_DATE_COLUMN_KEYS = new Set(['createdAt'])

// ─── Formatters ───────────────────────────────────────────────────────────────

const getOwnerDisplayName = (lead: Lead): string => {
  const emp = lead.ownerEmployee
  if (!emp) return '-'
  return emp.displayName || [emp.firstName, emp.lastName].filter(Boolean).join(' ') || '-'
}

export const formatLeadForExport = (lead: Lead): Record<string, string> => ({
  firstName: lead.firstName || '-',
  lastName: lead.lastName || '-',
  email: lead.email || '-',
  phoneNumber: lead.phoneNumber || '-',
  companyName: lead.companyName || '-',
  jobPosition: lead.jobPosition || '-',
  leadStatus: lead.leadStatus ? getCatalogEntryValue(lead.leadStatus as any) || '-' : '-',
  leadRating: lead.leadRating ? getCatalogEntryValue(lead.leadRating as any) || '-' : '-',
  leadSource: lead.leadSource ? getCatalogEntryValue(lead.leadSource as any) || '-' : '-',
  industryClass: lead.industryClass ? getCatalogEntryValue(lead.industryClass as any) || '-' : '-',
  ownerEmployee: getOwnerDisplayName(lead),
  createdAt: formatExportDate(lead.createdAt)
})

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseLeadExportOptions {
  fetchLeads: (variables: any) => Promise<{ leads?: Lead[]; total?: number }>
  queryVariables: any
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
