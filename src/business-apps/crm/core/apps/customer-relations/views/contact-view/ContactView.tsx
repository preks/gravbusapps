import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ContactLayout, type ContactViewConfig } from '@/common/components/common-relations/view-layouts/contact-layout'
import type { Contact } from '@/common/data/relations/types/contactTypes'
import {
  commonContactColumns,
  commonContactFilterConfig
} from '@/common/components/common-relations/view-layouts/contact-layout/config'
import { useCustomerContacts } from '@/common/data/customer/hooks/useCustomerContacts'
import { CUSTOMER_CONTACT_DESCRIPTORS } from '@/common/data/customer/types/customerContactTypes'
import type { CustomerContactQueryVariables } from '@/common/data/customer/queries/customerContactQueries'
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useCustomerContactStatistics } from '@/common/data/customer/hooks/useCustomerContactStatistics'

export type ContactViewProps = BusinessAppContextProps

// Helper functions to reduce cognitive complexity
const processDateRangeFilters = (
  selectedFilters: Record<string, any>,
  dateRangeKeys: string[],
  vars: CustomerContactQueryVariables
): void => {
  for (const rangeKey of dateRangeKeys) {
    const normalized = normalizeDateRange(selectedFilters[rangeKey])
    if (normalized) {
      const baseKey = rangeKey.replace('Range', '')
      if (normalized.from) {
        const fromKey = `${baseKey}From` as keyof CustomerContactQueryVariables
        ;(vars as any)[fromKey] = normalized.from
      }
      if (normalized.to) {
        const toKey = `${baseKey}To` as keyof CustomerContactQueryVariables
        ;(vars as any)[toKey] = normalized.to
      }
    }
  }
}

const processCommunicationChannels = (
  selectedFilters: Record<string, any>,
  vars: CustomerContactQueryVariables
): void => {
  if (
    selectedFilters.communicationChannels &&
    Array.isArray(selectedFilters.communicationChannels) &&
    selectedFilters.communicationChannels.length > 0
  ) {
    const contactFilters = selectedFilters.communicationChannels as string[]
    if (contactFilters.includes('has:email')) vars.hasEmail = true
    if (contactFilters.includes('missing:email')) vars.missingEmail = true
    if (contactFilters.includes('has:phone')) vars.hasPhone = true
    if (contactFilters.includes('missing:phone')) vars.missingPhone = true
  }
}

const processOtherFilters = (
  selectedFilters: Record<string, any>,
  excludeKeys: string[],
  vars: CustomerContactQueryVariables
): void => {
  for (const key of Object.keys(selectedFilters)) {
    if (!excludeKeys.includes(key) && selectedFilters[key] !== undefined && selectedFilters[key] !== null) {
      vars[key as keyof CustomerContactQueryVariables] = selectedFilters[key]
    }
  }
}

const processSorting = (sorting: Array<{ id: string; desc: boolean }>, vars: CustomerContactQueryVariables): void => {
  if (sorting.length > 0) {
    const columnId = sorting[0].id
    const direction = sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'

    if (columnId === 'contact') {
      vars.orderBy = [
        { field: 'firstName', direction },
        { field: 'lastName', direction }
      ]
    } else {
      vars.orderBy = [{ field: columnId as any, direction }]
    }
  } else {
    vars.orderBy = [{ field: 'createdAt' as any, direction: 'DESC_NULLS_LAST' }]
  }
}

export const ContactView: React.FC<ContactViewProps> = context => {
  // Data Hooks
  const { fetchCustomerContacts } = useCustomerContacts(context)
  const contactStatistics = useCustomerContactStatistics(context)

  // Config — contactStatistics is intentionally excluded so that statistics state
  // updates do not recreate config, which would cascade into new queryVariables/
  // loadData references and re-fire GetContacts. Passed as a direct prop instead.
  const config: ContactViewConfig<Contact, CustomerContactQueryVariables> = useMemo(
    () => ({
      fetchContacts: fetchCustomerContacts,
      createColumns: () => commonContactColumns(),
      descriptors: CUSTOMER_CONTACT_DESCRIPTORS,
      entityName: 'Contact',
      columnLabels: {
        contact: 'Contact',
        firstName: 'First Name',
        lastName: 'Last Name',
        fullName: 'Full Name',
        department: 'Department',
        jobPosition: 'Job Position',
        ownerEmployee: 'Owner',
        createdAt: 'Created Date',
        updatedAt: 'Updated Date'
      },
      baseFilterConfig: commonContactFilterConfig,
      buildQueryVariables: (params: {
        pagination: { pageIndex: number; pageSize: number }
        searchTerm: string
        selectedFilters: Record<string, any>
        sorting: Array<{ id: string; desc: boolean }>
      }) => {
        const vars: CustomerContactQueryVariables = {
          limit: params.pagination.pageSize,
          offset: params.pagination.pageIndex * params.pagination.pageSize,
          search: params.searchTerm.trim() || undefined
        }

        const dateRangeKeys = ['createdAtRange', 'updatedAtRange']
        processDateRangeFilters(params.selectedFilters, dateRangeKeys, vars)
        processCommunicationChannels(params.selectedFilters, vars)
        processOtherFilters(params.selectedFilters, [...dateRangeKeys, 'communicationChannels'], vars)
        processSorting(params.sorting, vars)

        return vars
      },
      flowContexts: {
        entityContext: FlowContextName.customerContactEntity,
        createContext: FlowContextName.customerContactCreate
      },
      buildRecordUrl: (id: string) => buildPlatformUrl('/platform/crm/contact-record', { contactId: id }),
      rowActionsContextArray: [FlowContextName.customerContactEntity],
      buildRowActionsExternalContextData: (row: { original: Contact }) => ({
        contactId: row.original.id || ''
      }),
      translations: {
        allContacts: { key: 'common:allContacts', default: 'All Contacts' },
        searchContacts: { key: 'common:searchContacts', default: 'Search contacts...' },
        filterContacts: { key: 'common:filterContacts', default: 'Filter Contacts' },
        filterContactsDescription: {
          key: 'common:filterContactsDescription',
          default: 'Apply filters to narrow down the contact list'
        },
        addContact: { key: 'common:addContact', default: 'Add Contact' }
      }
    }),
    [fetchCustomerContacts]
  )

  return (
    <ContactLayout
      context={context}
      config={config}
      contactStatistics={contactStatistics}
      dataTestId="customer-contact-view"
      enableExport
      exportFilenamePrefix="contacts"
    />
  )
}

export default ContactView
