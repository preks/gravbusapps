import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ContactLayout, type ContactViewConfig } from '@/common/components/common-relations/view-layouts/contact-layout'
import type { CommonContact } from '@/common/data/relations/types/commonContactTypes'
import { COMMON_CONTACT_DESCRIPTORS } from '@/common/data/relations/types/commonContactTypes'
import { commonContactColumns } from '@/common/components/common-relations/view-layouts/contact-layout/config'
import { commonContactFilterConfig } from '@/common/components/common-relations/view-layouts/contact-layout/config'
import { useCustomerContacts } from '@/common/data/customer/hooks/useCustomerContacts'
import { useCustomerContactFilters } from '@/common/data/customer/hooks/useCustomerContactFilters'
import type { CustomerContactQueryVariables } from '@/common/data/customer/queries/customerContactQueries'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useCustomerContactStatistics } from '@/common/data/customer/hooks/useCustomerContactStatistics'
import type { ContactStatisticsData } from '@/common/components/common-relations/view-layouts/contact-layout'

export type ContactViewProps = BusinessAppContextProps

export const ContactView: React.FC<ContactViewProps> = context => {
  const { accessToken } = context

  // Data Hooks
  const { fetchCustomerContacts } = useCustomerContacts(context)
  const contactFilters = useCustomerContactFilters(context)
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
  const config: ContactViewConfig<CommonContact, CustomerContactQueryVariables> = useMemo(
    () => ({
      fetchContacts: fetchCustomerContacts,
      filterDataHook: () => ({
        owners: contactFilters.owners,
        departments: contactFilters.departments,
        jobPositions: contactFilters.jobPositions,
        academicTitles: contactFilters.academicTitles,
        salutations: contactFilters.salutations,
        languages: contactFilters.languages
      }),
      createColumns: () => commonContactColumns(),
      descriptors: COMMON_CONTACT_DESCRIPTORS,
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

        // Copy filter values directly (Filter-IDs now match Descriptor-Keys)
        // Handle createdAtRange date filter splitting
        if (
          params.selectedFilters.createdAtRange &&
          Array.isArray(params.selectedFilters.createdAtRange) &&
          params.selectedFilters.createdAtRange.length === 2
        ) {
          const [start, end] = params.selectedFilters.createdAtRange
          if (start) vars.createdAfter = start
          if (end) vars.createdBefore = end
        }

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
            key !== 'createdAtRange' &&
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
      buildRowActionsExternalContextData: (row: { original: CommonContact }) => ({
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
    [fetchCustomerContacts, contactFilters, contactStatisticsData, accessToken]
  )

  return <ContactLayout context={context} config={config} dataTestId="customer-contact-view" />
}

export default ContactView
