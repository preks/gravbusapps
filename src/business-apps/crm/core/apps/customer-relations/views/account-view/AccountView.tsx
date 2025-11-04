import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerAccounts } from '@/common/data/customer/hooks/useCustomerAccounts'
import { AccountLayout, type AccountViewConfig } from '@/common/components/common-relations/view-layouts/account-layout'
import type { CustomerAccount } from '@/common/data/customer/types'
import type { CustomerAccountQueryVariables } from '@/common/data/customer/queries/customerAccountQueries'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import {
  createAccountColumns,
  createAccountSortableColumns
} from '@/common/components/common-relations/view-layouts/account-layout/config'
import { accountFilterConfig } from '@/common/components/common-relations/view-layouts/account-layout/config'
import { useCustomerAccountFilters } from '@/common/data/customer/hooks/useCustomerAccountFilters'
import { AccountStatisticsWithTrend } from '../account-view/components/AccountStatistics'
import { useAccountStatisticsWithTrend as useCustomerAccountStatistics } from '@/common/data/customer/hooks/useCustomerAccountStatistics'
import {
  applyBasicFilters,
  applyDateFilter
} from '@/common/components/common-relations/view-layouts/account-layout/utils/queryHelpers'

export type AccountViewProps = BusinessAppContextProps

export const AccountView: React.FC<AccountViewProps> = context => {
  const { fetchCustomerAccounts } = useCustomerAccounts(context)
  const accountStatistics = useCustomerAccountStatistics({ ...context, sourceApp: 'CRM' })

  const config: AccountViewConfig<CustomerAccount, CustomerAccountQueryVariables> = useMemo(
    () => ({
      contextType: 'customer',

      fetchAccounts: async (variables: CustomerAccountQueryVariables) => {
        return await fetchCustomerAccounts(variables)
      },

      filterDataHook: useCustomerAccountFilters,

      createColumns: createAccountColumns as any,
      createSortableColumns: createAccountSortableColumns,

      mapColumnToGraphQLField: (columnId: string): string => {
        const mapping: Record<string, string> = {
          name: 'name',
          email: 'email',
          phone: 'phone',
          createdAt: 'createdAt',
          updatedAt: 'updatedAt'
        }
        return mapping[columnId] || 'createdAt'
      },

      baseFilterConfig: accountFilterConfig,

      buildQueryVariables: (params: {
        pagination: { pageIndex: number; pageSize: number }
        searchTerm: string
        selectedFilters: Record<string, any>
        sorting: Array<{ id: string; desc: boolean }>
        mapColumnToGraphQLField: (columnId: string) => string
      }) => {
        const vars: CustomerAccountQueryVariables = {
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
        entityContext: FlowContextName.customerAccountEntity,
        createContext: FlowContextName.customerAccountCreate
      },

      buildRecordUrl: (id: string) =>
        buildPlatformUrl('/platform/crm/account-record', {
          accountId: id
        }),

      renderStatistics: ({ onRefresh }) =>
        accountStatistics.trendData ? (
          <AccountStatisticsWithTrend
            trendData={accountStatistics.trendData}
            isLoading={accountStatistics.isLoading}
            error={accountStatistics.error}
            onRetry={onRefresh}
          />
        ) : null,

      processCompletionEvents: ['taskCompletion', 'accountCompletion']
    }),
    [context, fetchCustomerAccounts, accountStatistics]
  )

  return <AccountLayout context={context} config={config} dataTestId="customer-account-view" />
}

export default AccountView
