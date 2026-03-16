import { useCallback } from 'react'
import { buildFilename, formatExportDate } from '@/common/utils/excelExportUtils'
import { useExportBase } from '@/common/hooks/useExportBase'
import type { Activity } from '@/common/data/relations/types/activityTypes'

// ─── Column definitions ───────────────────────────────────────────────────────

export const ACTIVITY_EXPORT_COLUMNS = [
  { key: 'owner', title: 'Owner' },
  { key: 'title', title: 'Title' },
  { key: 'description', title: 'Description' },
  { key: 'type', title: 'Type' },
  { key: 'reference', title: 'Reference' },
  { key: 'referenceType', title: 'Reference Type' },
  { key: 'createdAt', title: 'Created Date' },
  { key: 'occurredAt', title: 'Occurred Date' }
] as const

const ACTIVITY_DATE_COLUMN_KEYS = new Set(['createdAt', 'occurredAt'])

// ─── Formatters ───────────────────────────────────────────────────────────────

const getReferenceName = (activity: Activity): string => {
  if (activity.account) return activity.account.name || '-'
  if (activity.contact) {
    const c = activity.contact as any
    return c.displayName || [c.firstName, c.lastName].filter(Boolean).join(' ') || '-'
  }
  if (activity.lead) {
    const l = activity.lead as any
    return l.fullName || [l.firstName, l.lastName].filter(Boolean).join(' ') || '-'
  }
  if (activity.opportunity) return (activity.opportunity as any).name || '-'
  // IRM-only: investment
  const inv = (activity as any).investment
  if (inv) return inv.name || '-'
  return 'General'
}

const getReferenceType = (activity: Activity): string => {
  if (activity.accountId) return 'Account'
  if (activity.contactId) return 'Contact'
  if (activity.leadId) return 'Lead'
  if (activity.opportunityId) return 'Opportunity'
  if ((activity as any).investmentId) return 'Investment'
  return 'General'
}

export const formatActivityForExport = (activity: Activity): Record<string, string> => ({
  owner: activity.ownerEmployee?.displayName || '-',
  title: activity.title || '-',
  description: activity.description || '-',
  type: activity.activityType?.value || '-',
  reference: getReferenceName(activity),
  referenceType: getReferenceType(activity),
  createdAt: formatExportDate(activity.createdAt),
  occurredAt: formatExportDate(activity.occurredAt)
})

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseActivityExportOptions {
  fetchActivities: (variables: any) => Promise<{ activities?: Activity[]; total?: number }>
  queryVariables: any
  totalCount: number
  filenamePrefix?: string
}

export function useActivityExport({
  fetchActivities,
  queryVariables,
  totalCount,
  filenamePrefix = 'activities'
}: UseActivityExportOptions) {
  const fetchAllItems = useCallback(async (): Promise<Activity[]> => {
    const result = await fetchActivities({ ...queryVariables, limit: totalCount, offset: 0 })
    return result.activities || []
  }, [fetchActivities, queryVariables, totalCount])

  return useExportBase<Activity>({
    fetchAllItems,
    formatItem: formatActivityForExport,
    columns: ACTIVITY_EXPORT_COLUMNS,
    dateColumnKeys: ACTIVITY_DATE_COLUMN_KEYS,
    sheetName: 'Activities',
    entityLabel: 'activities',
    totalCount,
    filenamePrefix
  })
}

// Keep backward-compatible re-export of buildFilename for any callers
export { buildFilename }
