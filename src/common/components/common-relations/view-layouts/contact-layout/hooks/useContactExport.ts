import { useCallback } from 'react'
import { formatExportDate } from '@/common/utils/excelExportUtils'
import { useExportBase } from '@/common/hooks/useExportBase'
import type { Contact } from '@/common/data/relations/types/contactTypes'
import { CommunicationChannelCode } from '@/common/data/common/types/commonTypes'

// ─── Column definitions ───────────────────────────────────────────────────────

export const CONTACT_EXPORT_COLUMNS = [
  { key: 'firstName', title: 'First Name' },
  { key: 'lastName', title: 'Last Name' },
  { key: 'email', title: 'Email' },
  { key: 'phone', title: 'Phone' },
  { key: 'department', title: 'Department' },
  { key: 'jobPosition', title: 'Job Position' },
  { key: 'ownerEmployee', title: 'Owner' },
  { key: 'createdAt', title: 'Created Date' }
] as const

const CONTACT_DATE_COLUMN_KEYS = new Set(['createdAt'])

// ─── Formatters ───────────────────────────────────────────────────────────────

const getChannelValue = (contact: Contact, code: string): string => {
  const channel = contact.communicationChannels?.find(ch => ch.communicationChannel?.code === code)
  return channel?.value || '-'
}

const getOwnerDisplayName = (contact: Contact): string => {
  const emp = contact.ownerEmployee
  if (!emp) return '-'
  return emp.displayName || [emp.firstName, emp.lastName].filter(Boolean).join(' ') || '-'
}

export const formatContactForExport = (contact: Contact): Record<string, string> => ({
  firstName: contact.firstName || '-',
  lastName: contact.lastName || '-',
  email: getChannelValue(contact, CommunicationChannelCode.EMAIL),
  phone: getChannelValue(contact, CommunicationChannelCode.PHONE),
  department: contact.department || '-',
  jobPosition: contact.jobPosition || '-',
  ownerEmployee: getOwnerDisplayName(contact),
  createdAt: formatExportDate(contact.createdAt)
})

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseContactExportOptions {
  fetchContacts: (variables: any) => Promise<{ contacts?: Contact[]; total?: number }>
  queryVariables: any
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
