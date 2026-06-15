import React, { useMemo, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import type { Account } from '@/common/data/relations/types/accountTypes'
import { toCustomerAccount, CUSTOMER_ACCOUNT_DESCRIPTORS } from '@/common/data/customer/types/customerAccountTypes'
import {
  commonAccountColumns,
  commonAccountFilterConfig
} from '@/common/components/common-relations/view-layouts/account-layout/config'
import {
  buildCustomerAccountQuery,
  buildCustomerAccountWhereCondition,
  buildCustomerAccountOrderBy,
  type CustomerAccountQueryVariables
} from '@/common/data/customer/queries/customerAccountQueries'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { processDateRangeFilters, processOtherFilters, processSorting } from '../../utils/entityTabHelpers'
import {
  AccountLayout,
  type AccountViewConfig
} from '@/common/components/common-relations/view-layouts/account-layout/AccountLayout'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

interface EmployeeAccountsTabProps extends Partial<BusinessAppContextProps> {
  employeeId: string
  accessToken: string
  userInfo?: any
  onTotalChange?: (total: number) => void
}

/**
 * Employee Accounts View - Shows accounts owned by the selected employee
 * Uses AccountLayout with empty rowActionsContextArray to hide action column
 */
export const EmployeeAccountsTab: React.FC<EmployeeAccountsTabProps> = ({
  employeeId,
  accessToken,
  userInfo,
  ...restContext
}) => {
  const context = { accessToken, userInfo, ...restContext } satisfies BusinessAppContextProps
  const graphqlClient = useGraphQLClient(context.accessToken)

  // Fetch function for accounts
  const fetchCustomerAccounts = useCallback(
    async (variables: CustomerAccountQueryVariables) => {
      const query = buildCustomerAccountQuery()
      const whereCondition = buildCustomerAccountWhereCondition({
        ...variables,
        ownerEmployeeIds: [employeeId] // Always filter by this employee
      })
      const orderBy = buildCustomerAccountOrderBy(variables.orderBy || [])

      const graphQLVariables: Record<string, any> = {
        limit: Math.min(variables.limit || 50, 100),
        offset: variables.offset || 0,
        where: whereCondition,
        orderBy: orderBy
      }

      const result = await graphqlClient.request<{
        Account: any[]
        AccountAggregate: { aggregate: { count: number } }
      }>(query, graphQLVariables)

      const accounts = result.Account.map(toCustomerAccount)
      const total = result.AccountAggregate?.aggregate?.count || 0
      return { accounts, total }
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
      const vars: CustomerAccountQueryVariables = {
        limit: params.pagination.pageSize,
        offset: params.pagination.pageIndex * params.pagination.pageSize,
        search: params.searchTerm.trim() || undefined,
        ownerEmployeeIds: [employeeId]
      }

      const dateRangeKeys = [
        'createdAtRange',
        'updatedAtRange',
        'foundationDateRange',
        'liquidationDateRange',
        'activeFromRange',
        'activeToRange'
      ]

      // Process filters
      processDateRangeFilters(params.selectedFilters, dateRangeKeys, vars)
      processOtherFilters(params.selectedFilters, dateRangeKeys, vars)
      processSorting(params.sorting, vars)

      return vars
    },
    [employeeId]
  )

  // Filter configuration (hide owner filter since we're filtering by specific employee)
  const filterConfig = useMemo(() => {
    return {
      ...commonAccountFilterConfig,
      groups: commonAccountFilterConfig.groups.filter((group: any) => group.id !== 'owner-group')
    }
  }, [])

  // Account view configuration
  const config: AccountViewConfig<Account, CustomerAccountQueryVariables> = useMemo(
    () => ({
      fetchAccounts: fetchCustomerAccounts,
      entityName: 'Account',
      createColumns: () => commonAccountColumns,
      descriptors: CUSTOMER_ACCOUNT_DESCRIPTORS,
      baseFilterConfig: filterConfig,
      buildQueryVariables,
      flowContexts: {
        entityContext: FlowContextName.customerAccountEntity,
        createContext: FlowContextName.customerAccountCreate // Not used since we override primaryAction
      },
      buildRecordUrl: (id: string) => buildPlatformUrl('/platform/crm/account-record', { accountId: id }),
      variant: 'customer',
      processCompletionEvents: ['taskCompletion', 'accountCompletion'],
      rowActionsContextArray: [], // Empty array = no action column!
      buildRowActionsExternalContextData: row => ({ accountId: row.original.id || '' }), // Not used since rowActionsContextArray is empty
      translations: {
        allAccounts: { key: 'common:allAccounts', default: 'All Accounts' },
        searchAccounts: { key: 'common:searchAccounts', default: 'Search accounts...' },
        filterAccounts: { key: 'common:filterAccounts', default: 'Filter Accounts' },
        filterAccountsDescription: {
          key: 'common:filterAccountsDescription',
          default: 'Apply filters to narrow down the account list'
        },
        addAccount: { key: 'common:addAccount', default: 'Add Account' } // Not used since we hide the button
      }
    }),
    [fetchCustomerAccounts, buildQueryVariables, filterConfig]
  )

  return (
    <AccountLayout
      context={context}
      config={config}
      dataTestId={`employee-accounts-${employeeId}`}
      customPrimaryAction={<></>}
    />
  )
}

export default EmployeeAccountsTab
