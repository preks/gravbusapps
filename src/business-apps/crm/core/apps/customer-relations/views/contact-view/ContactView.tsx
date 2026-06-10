import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ContactLayout, type ContactViewConfig } from '@/common/components/common-relations/view-layouts/contact-layout'
import { useViewPreferencesStorage } from '@/common/hooks/useViewPreferencesStorage'
import type { Contact } from '@/common/data/relations/types/contactTypes'
import {
  commonContactColumns,
  commonContactFilterConfig
} from '@/common/components/common-relations/view-layouts/contact-layout/config'
import { useCustomerContacts } from '@/common/data/customer/hooks/useCustomerContacts'
import { CUSTOMER_CONTACT_DESCRIPTORS } from '@/common/data/customer/types/customerContactTypes'
import type { CustomerContactQueryVariables } from '@/common/data/customer/queries/customerContactQueries'
import { buildContactQueryVariables } from '@/common/components/common-relations/view-layouts/contact-layout/utils/buildContactQueryVariables'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useCustomerContactStatistics } from '@/common/data/customer/hooks/useCustomerContactStatistics'

export type ContactViewProps = BusinessAppContextProps

export const ContactView: React.FC<ContactViewProps> = context => {
  const { initialFilters, saveFilters, initialSorting, saveSorting, initialVisibleColumns, saveVisibleColumns } =
    useViewPreferencesStorage('crm:customer-contact-preferences:v1')

  const { fetchCustomerContacts } = useCustomerContacts(context)
  const contactStatistics = useCustomerContactStatistics(context)

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
      }) =>
        buildContactQueryVariables<CustomerContactQueryVariables>({
          pagination: params.pagination,
          searchTerm: params.searchTerm,
          selectedFilters: params.selectedFilters,
          sorting: params.sorting
        }),
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
      initialFilters={initialFilters}
      onFilterChange={saveFilters}
      initialSorting={initialSorting ?? undefined}
      onSortingChange={saveSorting}
      initialVisibleColumns={initialVisibleColumns ?? undefined}
      onVisibleColumnsChange={saveVisibleColumns}
    />
  )
}

export default ContactView
