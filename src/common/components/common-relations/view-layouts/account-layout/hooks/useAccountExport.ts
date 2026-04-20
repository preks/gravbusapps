import { useCallback } from 'react'
import { formatExportDate } from '@/common/utils/excelExportUtils'
import { useExportBase } from '@/common/hooks/useExportBase'
import type { Account } from '@/common/data/relations/types/accountTypes'
import { getCatalogEntryValue } from '@/common/data/catalog/utils/catalogTranslationUtils'

// ─── Column definitions ───────────────────────────────────────────────────────

export const ACCOUNT_EXPORT_COLUMNS = [
  { key: 'name', title: 'Account Name' },
  { key: 'website', title: 'Website' },
  { key: 'industryClass', title: 'Industry' },
  { key: 'legalForm', title: 'Legal Form' },
  { key: 'companySize', title: 'Company Size' },
  { key: 'accountAnnualRevenueBand', title: 'Revenue Band' },
  { key: 'prospective', title: 'Category' },
  { key: 'ownerEmployee', title: 'Owner' },
  { key: 'foundationDate', title: 'Foundation Date' },
  { key: 'createdAt', title: 'Created Date' }
] as const

const ACCOUNT_DATE_COLUMN_KEYS = new Set(['foundationDate', 'createdAt'])

// ─── Formatters ───────────────────────────────────────────────────────────────

const getOwnerDisplayName = (account: Account): string => {
  const emp = account.ownerEmployee
  if (!emp) return '-'
  return emp.displayName || [emp.firstName, emp.lastName].filter(Boolean).join(' ') || '-'
}

const getProspectiveLabel = (prospective: boolean | null | undefined): string => {
  if (prospective === true) return 'Prospect'
  if (prospective === false) return 'Customer'
  return '-'
}

export const formatAccountForExport = (account: Account): Record<string, string> => ({
  name: account.name || '-',
  website: account.website || '-',
  industryClass: account.industryClass ? getCatalogEntryValue(account.industryClass as any) || '-' : '-',
  legalForm: account.legalForm ? getCatalogEntryValue(account.legalForm as any) || '-' : '-',
  companySize: account.companySize ? getCatalogEntryValue(account.companySize as any) || '-' : '-',
  accountAnnualRevenueBand: account.accountAnnualRevenueBand
    ? getCatalogEntryValue(account.accountAnnualRevenueBand as any) || '-'
    : '-',
  prospective: getProspectiveLabel(account.prospective),
  ownerEmployee: getOwnerDisplayName(account),
  foundationDate: formatExportDate(account.foundationDate),
  createdAt: formatExportDate(account.createdAt)
})

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseAccountExportOptions {
  fetchAccounts: (variables: any) => Promise<{ accounts?: Account[]; total?: number }>
  queryVariables: any
  totalCount: number
  filenamePrefix?: string
}

export function useAccountExport({
  fetchAccounts,
  queryVariables,
  totalCount,
  filenamePrefix = 'accounts'
}: UseAccountExportOptions) {
  const fetchAllItems = useCallback(async (): Promise<Account[]> => {
    const result = await fetchAccounts({ ...queryVariables, limit: totalCount, offset: 0 })
    return result.accounts || []
  }, [fetchAccounts, queryVariables, totalCount])

  return useExportBase<Account>({
    fetchAllItems,
    formatItem: formatAccountForExport,
    columns: ACCOUNT_EXPORT_COLUMNS,
    dateColumnKeys: ACCOUNT_DATE_COLUMN_KEYS,
    sheetName: 'Accounts',
    entityLabel: 'accounts',
    totalCount,
    filenamePrefix
  })
}
