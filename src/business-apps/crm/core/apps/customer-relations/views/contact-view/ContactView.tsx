import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ContactLayout, type ContactViewConfig } from '@/common/components/common-relations/view-layouts/contact-layout'
import type { Contact } from '@/common/data/relations/types/contactTypes'
import { commonContactColumns } from '@/common/components/common-relations/view-layouts/contact-layout/config'
import { commonContactFilterConfig } from '@/common/components/common-relations/view-layouts/contact-layout/config'
import { useCustomerContacts } from '@/common/data/customer/hooks/useCustomerContacts'
import { CUSTOMER_CONTACT_DESCRIPTORS } from '@/common/data/customer/types/customerContactTypes'
import type { CustomerContactQueryVariables } from '@/common/data/customer/queries/customerContactQueries'
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useCustomerContactStatistics } from '@/common/data/customer/hooks/useCustomerContactStatistics'
import type { ContactStatisticsData } from '@/common/components/common-relations/view-layouts/contact-layout'

export type ContactViewProps = BusinessAppContextProps

export const ContactView: React.FC<ContactViewProps> = context => {
  const { accessToken } = context

  // Data Hooks
  const { fetchCustomerContacts } = useCustomerContacts(context)
  const contactStatistics = useCustomerContactStatistics(context)

  // Statistics - Transform hook data to ContactStatisticsData format
  const contactStatisticsData: ContactStatisticsData | undefined = useMemo(() => {
    if (!contactStatistics.trendData) return undefined
    return {
      recentContacts: contactStatistics.trendData.recentContacts,
      activeContacts: contactStatistics.trendData.activeContacts,
      emailEngagements: contactStatistics.trendData.emailEngagements,
      contactsThisYear: contactStatistics.trendData.contactsThisYear,
      isLoading: contactStatistics.isLoading,
      error: contactStatistics.error,
      refetch: () => {
        // Refetch will be handled by process completion
      }
    }
  }, [contactStatistics])

  // Config
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
        accountContacts: 'Account',
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

        // Normalize date range filters
        const dateRangeKeys = ['createdAtRange', 'updatedAtRange']
        dateRangeKeys.forEach(rangeKey => {
          const normalized = normalizeDateRange(params.selectedFilters[rangeKey])
          if (normalized) {
            const baseKey = rangeKey.replace('Range', '')
            if (normalized.from) vars[`${baseKey}From` as keyof CustomerContactQueryVariables] = normalized.from
            if (normalized.to) vars[`${baseKey}To` as keyof CustomerContactQueryVariables] = normalized.to
          }
        })

        // Handle communicationChannels filter (special case - no Descriptor)
        if (
          params.selectedFilters.communicationChannels &&
          Array.isArray(params.selectedFilters.communicationChannels) &&
          params.selectedFilters.communicationChannels.length > 0
        ) {
          const contactFilters = params.selectedFilters.communicationChannels as string[]
          if (contactFilters.includes('has:email')) vars.hasEmail = true
          if (contactFilters.includes('missing:email')) vars.missingEmail = true
          if (contactFilters.includes('has:phone')) vars.hasPhone = true
          if (contactFilters.includes('missing:phone')) vars.missingPhone = true
        }

        // Copy all other filters directly (they now match Descriptor-Keys)
        Object.keys(params.selectedFilters).forEach(key => {
          if (
            !dateRangeKeys.includes(key) &&
            key !== 'communicationChannels' &&
            params.selectedFilters[key] !== undefined &&
            params.selectedFilters[key] !== null
          ) {
            vars[key as keyof CustomerContactQueryVariables] = params.selectedFilters[key]
          }
        })

        // Use column ID directly - buildOrderBy will use descriptors (CUSTOMER_CONTACT_DESCRIPTORS)
        // to resolve correct GraphQL paths (e.g., account.name, ownerEmployee.displayName)
        // Special handling for composite 'contact' column
        if (params.sorting.length > 0) {
          const columnId = params.sorting[0].id
          const direction = params.sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'

          if (columnId === 'contact') {
            // Sort by firstName, then lastName
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

        return vars
      },
      flowContexts: {
        entityContext: FlowContextName.customerContactEntity,
        createContext: FlowContextName.customerContactCreate
      },
      buildRecordUrl: (id: string) => buildPlatformUrl('/platform/crm/contact-record', { contactId: id }),
      contactStatistics: contactStatisticsData,
      processCompletionEvents: ['taskCompletion', 'contactCompletion'],
      rowActionsContextArray: [FlowContextName.customerContactEntity],
      buildRowActionsExternalContextData: (row: { original: Contact }) => ({
        contactId: row.original.id
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
    [fetchCustomerContacts, contactStatisticsData, accessToken]
  )

  return <ContactLayout context={context} config={config} dataTestId="customer-contact-view" />
}

export default ContactView
