import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerContacts } from '@/common/data/customer/hooks/useCustomerContacts'
import { ContactLayout, type ContactViewConfig } from '@/common/components/common-relations/view-layouts/contact-layout'
import type { CustomerContact } from '@/common/data/customer/types'
import type { CustomerContactQueryVariables } from '@/common/data/customer/queries/customerContactQueries'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import {
  createContactColumns,
  createContactSortableColumns
} from '@/common/components/common-relations/view-layouts/contact-layout/config'
import { contactFilterConfig } from '@/common/components/common-relations/view-layouts/contact-layout/config'
import { useCustomerContactFilters } from '@/common/data/customer/hooks/useCustomerContactFilters'
import { ContactStatisticsWithTrend } from '../contact-view/components/ContactStatistics'
import { useContactStatisticsWithTrend as useCustomerContactStatistics } from '@/common/data/customer/hooks/useCustomerContactStatistics'
import {
  applyBasicFilters,
  applyDateFilter
} from '@/common/components/common-relations/view-layouts/contact-layout/utils/queryHelpers'

export type ContactViewProps = BusinessAppContextProps

export const ContactView: React.FC<ContactViewProps> = context => {
  const { fetchCustomerContacts } = useCustomerContacts(context)
  const contactStatistics = useCustomerContactStatistics({ ...context, sourceApp: 'CRM' })

  const config: ContactViewConfig<CustomerContact, CustomerContactQueryVariables> = useMemo(
    () => ({
      contextType: 'customer',

      fetchContacts: async (variables: CustomerContactQueryVariables) => {
        return await fetchCustomerContacts(variables)
      },

      filterDataHook: useCustomerContactFilters,

      createColumns: createContactColumns as any,
      createSortableColumns: createContactSortableColumns,

      mapColumnToGraphQLField: (columnId: string): string => {
        const mapping: Record<string, string> = {
          firstName: 'firstName',
          lastName: 'lastName',
          email: 'email',
          phone: 'phone',
          createdAt: 'createdAt',
          updatedAt: 'updatedAt'
        }
        return mapping[columnId] || 'createdAt'
      },

      baseFilterConfig: contactFilterConfig,

      buildQueryVariables: (params: {
        pagination: { pageIndex: number; pageSize: number }
        searchTerm: string
        selectedFilters: Record<string, any>
        sorting: Array<{ id: string; desc: boolean }>
        mapColumnToGraphQLField: (columnId: string) => string
      }) => {
        const vars: CustomerContactQueryVariables = {
          limit: params.pagination.pageSize,
          offset: params.pagination.pageIndex * params.pagination.pageSize,
          search: params.searchTerm.trim() || undefined
        }

        applyBasicFilters(vars, params.selectedFilters)
        applyDateFilter(vars, params.selectedFilters)

        if (params.sorting.length > 0) {
          vars.orderBy = [
            {
              field: params.mapColumnToGraphQLField(params.sorting[0].id) as any,
              direction: params.sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
            }
          ]
        } else {
          vars.orderBy = [{ field: 'createdAt' as any, direction: 'DESC_NULLS_LAST' }]
        }

        return vars
      },

      flowContexts: {
        entityContext: FlowContextName.customerContactEntity,
        createContext: FlowContextName.customerContactCreate
      },

      buildRecordUrl: (id: string) =>
        buildPlatformUrl('/platform/crm/contact-record', {
          contactId: id
        }),

      buildAccountUrl: (id: string) =>
        buildPlatformUrl('/platform/crm/account-record', {
          accountId: id
        }),

      renderStatistics: ({ onRefresh }) =>
        contactStatistics.trendData ? (
          <ContactStatisticsWithTrend
            trendData={contactStatistics.trendData}
            isLoading={contactStatistics.isLoading}
            error={contactStatistics.error}
            onRetry={onRefresh}
          />
        ) : null,

      processCompletionEvents: ['taskCompletion', 'contactCompletion']
    }),
    [context, fetchCustomerContacts, contactStatistics]
  )

  return <ContactLayout context={context} config={config} dataTestId="customer-contact-view" />
}

export default ContactView
