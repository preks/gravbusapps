import React, { useMemo, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import type { Lead } from '@/common/data/relations/types/leadTypes'
import { toCustomerLead, CUSTOMER_LEAD_DESCRIPTORS } from '@/common/data/customer/types/customerLeadTypes'
import {
  commonLeadColumns,
  commonLeadFilterConfig
} from '@/common/components/common-relations/view-layouts/lead-layout/config'
import {
  buildCustomerLeadQuery,
  buildCustomerLeadWhereCondition,
  buildCustomerLeadOrderBy,
  type CustomerLeadQueryVariables
} from '@/common/data/customer/queries/customerLeadQueries'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  processDateRangeFilters,
  processSensitiveFilter,
  processOtherFilters,
  processSorting
} from '../../utils/entityTabHelpers'
import {
  LeadLayout,
  type LeadViewConfig
} from '@/common/components/common-relations/view-layouts/lead-layout/LeadLayout'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

interface EmployeeLeadsTabProps extends Partial<BusinessAppContextProps> {
  employeeId: string
  accessToken: string
  userInfo?: any
  onTotalChange?: (total: number) => void
}

/**
 * Employee Leads View - Shows leads owned by the selected employee
 * Uses LeadLayout with empty rowActionsContextArray to hide action column
 */
export const EmployeeLeadsTab: React.FC<EmployeeLeadsTabProps> = ({
  employeeId,
  accessToken,
  userInfo,
  ...restContext
}) => {
  const context = { accessToken, userInfo, ...restContext } satisfies BusinessAppContextProps
  const graphqlClient = useGraphQLClient(context.accessToken)

  // Fetch function for leads
  const fetchCustomerLeads = useCallback(
    async (variables: CustomerLeadQueryVariables) => {
      const query = buildCustomerLeadQuery()
      const whereCondition = buildCustomerLeadWhereCondition({
        ...variables,
        ownerEmployeeIds: [employeeId] // Always filter by this employee
      })
      const orderBy = buildCustomerLeadOrderBy(variables.orderBy || [])

      const graphQLVariables: Record<string, any> = {
        limit: Math.min(variables.limit || 50, 100),
        offset: variables.offset || 0,
        where: whereCondition,
        orderBy: orderBy
      }

      const result = await graphqlClient.request<{
        Lead: any[]
        LeadAggregate: { aggregate: { count: number } }
      }>(query, graphQLVariables)

      const leads = result.Lead.map(toCustomerLead)
      const total = result.LeadAggregate?.aggregate?.count || 0
      return { leads, total }
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
      const vars: CustomerLeadQueryVariables = {
        limit: params.pagination.pageSize,
        offset: params.pagination.pageIndex * params.pagination.pageSize,
        search: params.searchTerm.trim() || undefined,
        ownerEmployeeIds: [employeeId]
      }

      const dateRangeKeys = ['createdAtRange', 'updatedAtRange']

      // Process filters
      processDateRangeFilters(params.selectedFilters, dateRangeKeys, vars)
      processSensitiveFilter(params.selectedFilters, vars)
      processOtherFilters(params.selectedFilters, [...dateRangeKeys, 'sensitive'], vars)
      processSorting(params.sorting, vars)

      return vars
    },
    [employeeId]
  )

  // Filter configuration (hide owner filter since we're filtering by specific employee)
  const filterConfig = useMemo(() => {
    return {
      ...commonLeadFilterConfig,
      groups: commonLeadFilterConfig.groups.filter((group: any) => group.id !== 'owner-group')
    }
  }, [])

  // Lead view configuration
  const config: LeadViewConfig<Lead, CustomerLeadQueryVariables> = useMemo(
    () => ({
      fetchLeads: fetchCustomerLeads,
      entityName: 'Lead',
      createColumns: () => commonLeadColumns(),
      descriptors: CUSTOMER_LEAD_DESCRIPTORS,
      baseFilterConfig: filterConfig,
      buildQueryVariables,
      flowContexts: {
        entityContext: FlowContextName.customerLeadEntity,
        createContext: FlowContextName.customerLeadCreate // Not used since we override primaryAction
      },
      buildRecordUrl: (id: string) => buildPlatformUrl('/platform/crm/lead-record', { leadId: id }),
      processCompletionEvents: ['taskCompletion', 'leadCompletion'],
      rowActionsContextArray: [], // Empty array = no action column!
      buildRowActionsExternalContextData: row => ({ leadId: row.original.id || '' }), // Not used since rowActionsContextArray is empty
      translations: {
        allLeads: { key: 'common:allLeads', default: 'All Leads' },
        searchLeads: { key: 'common:searchLeads', default: 'Search leads...' },
        filterLeads: { key: 'common:filterLeads', default: 'Filter Leads' },
        filterLeadsDescription: {
          key: 'common:filterLeadsDescription',
          default: 'Apply filters to narrow down the lead list'
        },
        addLead: { key: 'common:addLead', default: 'Add Lead' } // Not used since we hide the button
      }
    }),
    [fetchCustomerLeads, buildQueryVariables, filterConfig]
  )

  return (
    <LeadLayout
      context={context}
      config={config}
      dataTestId={`employee-leads-${employeeId}`}
      customPrimaryAction={<></>} // Hide the "Add Lead" button (empty fragment to override default)
    />
  )
}

export default EmployeeLeadsTab
