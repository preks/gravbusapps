import { useCallback } from 'react'
import type { Contact } from '@/common/data/relations/types/contactTypes'
import { useExportBase } from '@/common/hooks/useExportBase'
import { buildCommonContactExportFields } from '@/common/components/common-relations/apps/data-export/registries/contact/commonContactExportFields'
import {
  formatEntityForExport,
  getDateColumnKeys,
  getDefaultSelectedFieldKeys,
  resolveExportFields,
  toExportColumns
} from '@/common/components/common-relations/apps/data-export/types/exportFieldTypes'

const ALL_COMMON_CONTACT_EXPORT_FIELDS = buildCommonContactExportFields()
const DEFAULT_EXPORT_FIELDS = resolveExportFields(
  ALL_COMMON_CONTACT_EXPORT_FIELDS,
  getDefaultSelectedFieldKeys(ALL_COMMON_CONTACT_EXPORT_FIELDS)
)

export const CONTACT_EXPORT_COLUMNS = toExportColumns(DEFAULT_EXPORT_FIELDS)

const CONTACT_DATE_COLUMN_KEYS = getDateColumnKeys(DEFAULT_EXPORT_FIELDS)

export const formatContactForExport = (contact: Contact): Record<string, string> =>
  formatEntityForExport(contact, DEFAULT_EXPORT_FIELDS)

interface UseContactExportOptions {
  fetchContacts: (variables: Record<string, unknown>) => Promise<{ contacts?: Contact[]; total?: number }>
  queryVariables: Record<string, unknown>
  totalCount: number
  filenamePrefix?: string
}

export function useContactExport({
  fetchContacts,
  queryVariables,
  totalCount,
  filenamePrefix = 'contacts'
}: UseContactExportOptions) {
  const fetchAllItems = useCallback(async (): Promise<Contact[]> => {
    const result = await fetchContacts({ ...queryVariables, limit: totalCount, offset: 0 })
    return result.contacts || []
  }, [fetchContacts, queryVariables, totalCount])

  return useExportBase<Contact>({
    fetchAllItems,
    formatItem: formatContactForExport,
    columns: CONTACT_EXPORT_COLUMNS,
    dateColumnKeys: CONTACT_DATE_COLUMN_KEYS,
    sheetName: 'Contacts',
    entityLabel: 'contacts',
    totalCount,
    filenamePrefix
  })
}
