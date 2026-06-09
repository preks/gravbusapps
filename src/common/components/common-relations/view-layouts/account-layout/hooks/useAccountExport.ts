import { useCallback } from 'react'
import type { Account } from '@/common/data/relations/types/accountTypes'
import { useExportBase } from '@/common/hooks/useExportBase'
import { buildCommonAccountExportFields } from '@/common/components/common-relations/apps/data-export/registries/account/commonAccountExportFields'
import {
  formatEntityForExport,
  getDateColumnKeys,
  getDefaultSelectedFieldKeys,
  resolveExportFields,
  toExportColumns
} from '@/common/components/common-relations/apps/data-export/types/exportFieldTypes'

const ALL_COMMON_ACCOUNT_EXPORT_FIELDS = buildCommonAccountExportFields()
const DEFAULT_EXPORT_FIELDS = resolveExportFields(
  ALL_COMMON_ACCOUNT_EXPORT_FIELDS,
  getDefaultSelectedFieldKeys(ALL_COMMON_ACCOUNT_EXPORT_FIELDS)
)

export const ACCOUNT_EXPORT_COLUMNS = toExportColumns(DEFAULT_EXPORT_FIELDS)

const ACCOUNT_DATE_COLUMN_KEYS = getDateColumnKeys(DEFAULT_EXPORT_FIELDS)

export const formatAccountForExport = (account: Account): Record<string, string> =>
  formatEntityForExport(account, DEFAULT_EXPORT_FIELDS)

interface UseAccountExportOptions {
  fetchAccounts: (variables: Record<string, unknown>) => Promise<{ accounts?: Account[]; total?: number }>
  queryVariables: Record<string, unknown>
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
