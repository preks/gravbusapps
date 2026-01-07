import React, { useMemo, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import type { Contact } from '@/common/data/relations/types/contactTypes'
import { toCustomerContact, CUSTOMER_CONTACT_DESCRIPTORS } from '@/common/data/customer/types/customerContactTypes'
import {
  commonContactColumns,
  commonContactFilterConfig
} from '@/common/components/common-relations/view-layouts/contact-layout/config'
import {
  buildCustomerContactQuery,
  buildCustomerContactWhereCondition,
  buildCustomerContactOrderBy,
  type CustomerContactQueryVariables
} from '@/common/data/customer/queries/customerContactQueries'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  processDateRangeFilters,
  processOtherFilters,
  processSorting,
  processCommunicationChannels
} from '../../../../utils/entityTabHelpers'
import {
  ContactLayout,
  type ContactViewConfig
} from '@/common/components/common-relations/view-layouts/contact-layout/ContactLayout'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

interface EmployeeContactsTabProps extends Partial<BusinessAppContextProps> {
  employeeId: string
  accessToken: string
  userInfo?: any
  onTotalChange?: (total: number) => void
}

/**
 * Employee Contacts View - Shows contacts owned by the selected employee
 * Uses ContactLayout with empty rowActionsContextArray to hide action column
 */
export const EmployeeContactsTab: React.FC<EmployeeContactsTabProps> = ({
  employeeId,
  accessToken,
  userInfo,
  ...restContext
}) => {
  const context: BusinessAppContextProps = { accessToken, userInfo, ...restContext } as BusinessAppContextProps
  const graphqlClient = useGraphQLClient(context.accessToken)

  // Fetch function for contacts
  const fetchCustomerContacts = useCallback(
    async (variables: CustomerContactQueryVariables) => {
      const query = buildCustomerContactQuery()
      const whereCondition = buildCustomerContactWhereCondition({
        ...variables,
        ownerEmployeeIds: [employeeId] // Always filter by this employee
      })
      const orderBy = buildCustomerContactOrderBy(variables.orderBy || [])

      const graphQLVariables: Record<string, any> = {
        limit: Math.min(variables.limit || 50, 100),
        offset: variables.offset || 0,
        where: whereCondition,
        orderBy: orderBy
      }

      const result = await graphqlClient.request<{
        Contact: any[]
        ContactAggregate: { aggregate: { count: number } }
      }>(query, graphQLVariables)

      const contacts = result.Contact.map(toCustomerContact)
      const total = result.ContactAggregate?.aggregate?.count || 0
      return { contacts, total }
    },
    [graphqlClient, employeeId]
  )

  // Build query variables from filter state
  const buildQueryVariables = useCallback(
    (params: {
      pagination: { pageIndex: number; pageSize: number }
      searchTerm: string
      selectedFilters: Record<string, any>
      sorting: Array<{ id: string; desc: boolean }>
    }) => {
      const vars: CustomerContactQueryVariables = {
        limit: params.pagination.pageSize,
        offset: params.pagination.pageIndex * params.pagination.pageSize,
        search: params.searchTerm.trim() || undefined,
        ownerEmployeeIds: [employeeId]
      }

      const dateRangeKeys = ['createdAtRange', 'updatedAtRange']

      // Process filters
      processDateRangeFilters(params.selectedFilters, dateRangeKeys, vars)
      processCommunicationChannels(params.selectedFilters, vars)
      processOtherFilters(params.selectedFilters, [...dateRangeKeys, 'communicationChannels'], vars)
      processSorting(params.sorting, vars)

      return vars
    },
    [employeeId]
  )

  // Filter configuration (hide owner filter since we're filtering by specific employee)
  const filterConfig = useMemo(() => {
    return {
      ...commonContactFilterConfig,
      groups: commonContactFilterConfig.groups.filter((group: any) => group.id !== 'owner-group')
    }
  }, [])

  // Contact view configuration
  const config: ContactViewConfig<Contact, CustomerContactQueryVariables> = useMemo(
    () => ({
      fetchContacts: fetchCustomerContacts,
      entityName: 'Contact',
      createColumns: () => commonContactColumns(),
      descriptors: CUSTOMER_CONTACT_DESCRIPTORS,
      baseFilterConfig: filterConfig,
      buildQueryVariables,
      flowContexts: {
        entityContext: FlowContextName.customerContactEntity,
        createContext: FlowContextName.customerContactCreate // Not used since we override primaryAction
      },
      buildRecordUrl: (id: string) => buildPlatformUrl('/platform/crm/contact-record', { contactId: id }),
      processCompletionEvents: ['taskCompletion', 'contactCompletion'],
      rowActionsContextArray: [], // Empty array = no action column!
      buildRowActionsExternalContextData: row => ({ contactId: row.original.id || '' }), // Not used since rowActionsContextArray is empty
      translations: {
        allContacts: { key: 'common:allContacts', default: 'All Contacts' },
        searchContacts: { key: 'common:searchContacts', default: 'Search contacts...' },
        filterContacts: { key: 'common:filterContacts', default: 'Filter Contacts' },
        filterContactsDescription: {
          key: 'common:filterContactsDescription',
          default: 'Apply filters to narrow down the contact list'
        },
        addContact: { key: 'common:addContact', default: 'Add Contact' } // Not used since we hide the button
      }
    }),
    [fetchCustomerContacts, buildQueryVariables, filterConfig]
  )

  return (
    <ContactLayout
      context={context}
      config={config}
      dataTestId={`employee-contacts-${employeeId}`}
      customPrimaryAction={<></>} // Hide the "Add Contact" button (empty fragment to override default)
    />
  )
}

export default EmployeeContactsTab
