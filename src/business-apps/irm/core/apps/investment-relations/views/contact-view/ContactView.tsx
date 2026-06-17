import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ContactLayout, type ContactViewConfig } from '@/common/components/common-relations/view-layouts/contact-layout'
import { useViewPreferencesStorage } from '@/common/hooks/useViewPreferencesStorage'
import type { Contact } from '@/common/data/relations/types/contactTypes'
import { INVESTMENT_CONTACT_DESCRIPTORS } from '@/common/data/investment/types/investmentContactTypes'
import {
  commonContactColumns,
  commonContactFilterConfig
} from '@/common/components/common-relations/view-layouts/contact-layout/config'
import { useInvestmentContacts } from '@/common/data/investment/hooks/useInvestmentContacts'
import { useInvestmentContactStatistics } from '@/common/data/investment/hooks/useInvestmentContactStatistics'
import type { InvestmentContactQueryVariables } from '@/common/data/investment/queries/investmentContactQueries'
import { buildContactQueryVariables } from '@/common/components/common-relations/view-layouts/contact-layout/utils/buildContactQueryVariables'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'

export type ContactViewProps = BusinessAppContextProps

export const ContactView: React.FC<ContactViewProps> = context => {
  const { initialFilters, saveFilters, initialSorting, saveSorting, initialVisibleColumns, saveVisibleColumns } =
    useViewPreferencesStorage('irm:investment-contact-preferences:v1')

  const { fetchInvestmentContacts } = useInvestmentContacts(context)
  const contactStatistics = useInvestmentContactStatistics(context)

  const config: ContactViewConfig<Contact, InvestmentContactQueryVariables> = useMemo(
    () => ({
      fetchContacts: fetchInvestmentContacts,
      createColumns: () => commonContactColumns(),
      descriptors: INVESTMENT_CONTACT_DESCRIPTORS,
      entityName: 'InvestmentContact',
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
        visibleColumns?: string[]
      }) =>
        buildContactQueryVariables<InvestmentContactQueryVariables>({
          pagination: params.pagination,
          searchTerm: params.searchTerm,
          selectedFilters: params.selectedFilters,
          sorting: params.sorting,
          visibleColumns: params.visibleColumns
        }),
      flowContexts: {
        entityContext: FlowContextName.investmentContactEntity,
        createContext: FlowContextName.investmentContactCreate
      },
      buildRecordUrl: (id: string) => buildPlatformUrl('/platform/irm/contact-record', { contactId: id }),
      rowActionsContextArray: [FlowContextName.investmentContactEntity],
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
        addContact: { key: 'irm:contact.addContact', default: 'Add Contact' }
      }
    }),
    [fetchInvestmentContacts]
  )

  return (
    <ContactLayout
      context={context}
      config={config}
      contactStatistics={contactStatistics}
      dataTestId="investment-contact-view"
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
