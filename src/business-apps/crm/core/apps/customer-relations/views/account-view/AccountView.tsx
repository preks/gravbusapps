import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AccountLayout, type AccountViewConfig } from '@/common/components/common-relations/view-layouts/account-layout'
import type { Account } from '@/common/data/relations/types/accountTypes'
import { CUSTOMER_ACCOUNT_DESCRIPTORS } from '@/common/data/customer/types/customerAccountTypes'
import { commonAccountColumns } from '@/common/components/common-relations/view-layouts/account-layout/config'
import { commonAccountFilterConfig } from '@/common/components/common-relations/view-layouts/account-layout/config'
import { useCustomerAccounts } from '@/common/data/customer/hooks/useCustomerAccounts'
import type { CustomerAccountQueryVariables } from '@/common/data/customer/queries/customerAccountQueries'
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useCustomerAccountStatistics } from '@/common/data/customer/hooks/useCustomerAccountStatistics'
import type { AccountStatisticsData } from '@/common/components/common-relations/view-layouts/account-layout'

export type AccountViewProps = BusinessAppContextProps

export const AccountView: React.FC<AccountViewProps> = context => {
  const { accessToken } = context

  // Data Hooks
  const { fetchCustomerAccounts } = useCustomerAccounts(context)
  const accountStatistics = useCustomerAccountStatistics(context)

  // Statistics - Transform hook data to AccountStatisticsData format
  const accountStatisticsData: AccountStatisticsData | undefined = useMemo(() => {
    if (!accountStatistics.trendData) return undefined
    return {
      recentAccounts: accountStatistics.trendData.recentAccounts,
      activeAccounts: accountStatistics.trendData.activeAccounts,
      revenue: accountStatistics.trendData.revenue,
      accountsThisYear: accountStatistics.trendData.accountsThisYear,
      isLoading: accountStatistics.isLoading,
      error: accountStatistics.error,
      refetch: accountStatistics.refetch
    }
  }, [accountStatistics])

  // Config
  const config: AccountViewConfig<Account, CustomerAccountQueryVariables> = useMemo(
    () => ({
      fetchAccounts: fetchCustomerAccounts,
      entityName: 'Account',
      createColumns: () => commonAccountColumns,
      descriptors: CUSTOMER_ACCOUNT_DESCRIPTORS,
      columnLabels: {
        name: 'Account Name',
        industryClass: 'Industry',
        legalForm: 'Legal Form',
        companySize: 'Size',
        accountAnnualRevenueBand: 'Revenue',
        ownerEmployee: 'Owner',
        createdAt: 'Created Date',
        updatedAt: 'Updated Date'
      },
      baseFilterConfig: commonAccountFilterConfig,
      buildQueryVariables: (params: {
        pagination: { pageIndex: number; pageSize: number }
        searchTerm: string
        selectedFilters: Record<string, any>
        sorting: Array<{ id: string; desc: boolean }>
      }) => {
        const vars: CustomerAccountQueryVariables = {
          limit: params.pagination.pageSize,
          offset: params.pagination.pageIndex * params.pagination.pageSize,
          search: params.searchTerm.trim() || undefined
        }

        // Normalize date range filters
        const dateRangeKeys = [
          'createdAtRange',
          'updatedAtRange',
          'foundationDateRange',
          'liquidationDateRange',
          'activeFromRange',
          'activeToRange'
        ]
        dateRangeKeys.forEach(rangeKey => {
          const normalized = normalizeDateRange(params.selectedFilters[rangeKey])
          if (normalized) {
            const baseKey = rangeKey.replace('Range', '')
            if (normalized.from) vars[`${baseKey}From` as keyof CustomerAccountQueryVariables] = normalized.from
            if (normalized.to) vars[`${baseKey}To` as keyof CustomerAccountQueryVariables] = normalized.to
          }
        })

        // Copy all other filters directly (they now match Descriptor-Keys)
        Object.keys(params.selectedFilters).forEach(key => {
          if (
            !dateRangeKeys.includes(key) &&
            params.selectedFilters[key] !== undefined &&
            params.selectedFilters[key] !== null
          ) {
            vars[key as keyof CustomerAccountQueryVariables] = params.selectedFilters[key]
          }
        })

        // Use column ID directly - buildOrderBy will use descriptors (CUSTOMER_ACCOUNT_DESCRIPTORS)
        // to resolve correct GraphQL paths (e.g., ownerEmployee.displayName, industryClass.value)
        if (params.sorting.length > 0) {
          vars.orderBy = [
            {
              field: params.sorting[0].id,
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
      buildRecordUrl: (id: string) => buildPlatformUrl('/platform/crm/account-record', { accountId: id }),
      accountStatistics: accountStatisticsData,
      variant: 'customer',
      processCompletionEvents: ['taskCompletion', 'accountCompletion'],
      rowActionsContextArray: [FlowContextName.customerAccountEntity],
      buildRowActionsExternalContextData: (row: { original: Account }) => ({
        accountId: row.original.id || ''
      }),
      translations: {
        allAccounts: { key: 'common:allAccounts', default: 'All Accounts' },
        searchAccounts: { key: 'common:searchAccounts', default: 'Search accounts...' },
        filterAccounts: { key: 'common:filterAccounts', default: 'Filter Accounts' },
        filterAccountsDescription: {
          key: 'common:filterAccountsDescription',
          default: 'Apply filters to narrow down the account list'
        },
        addAccount: { key: 'crm:account.addAccount', default: 'Add Account' }
      }
    }),
    [fetchCustomerAccounts, accountStatisticsData, accessToken]
  )

  return <AccountLayout context={context} config={config} dataTestId="customer-account-view" />
}

export default AccountView
