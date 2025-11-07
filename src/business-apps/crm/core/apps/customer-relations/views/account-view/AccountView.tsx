import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AccountLayout, type AccountViewConfig } from '@/common/components/common-relations/view-layouts/account-layout'
import type { CommonAccount } from '@/common/data/relations/types/commonAccountTypes'
import { COMMON_ACCOUNT_DESCRIPTORS } from '@/common/data/relations/types/commonAccountTypes'
import { commonAccountColumns } from '@/common/components/common-relations/view-layouts/account-layout/config'
import { commonAccountFilterConfig } from '@/common/components/common-relations/view-layouts/account-layout/config'
import { useCustomerAccounts } from '@/common/data/customer/hooks/useCustomerAccounts'
import { useCustomerAccountFilters } from '@/common/data/customer/hooks/useCustomerAccountFilters'
import type { CustomerAccountQueryVariables } from '@/common/data/customer/queries/customerAccountQueries'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useCustomerAccountStatistics } from '@/common/data/customer/hooks/useCustomerAccountStatistics'
import type { AccountStatisticsData } from '@/common/components/common-relations/view-layouts/account-layout'

export type AccountViewProps = BusinessAppContextProps

export const AccountView: React.FC<AccountViewProps> = context => {
  const { accessToken } = context

  // Data Hooks
  const { fetchCustomerAccounts } = useCustomerAccounts(context)
  const filterData = useCustomerAccountFilters(context)
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
  const config: AccountViewConfig<CommonAccount, CustomerAccountQueryVariables> = useMemo(
    () => ({
      fetchAccounts: fetchCustomerAccounts,
      filterDataHook: () => ({
        owners: filterData.owners,
        industries: filterData.industries,
        legalForms: filterData.legalForms,
        companySizes: filterData.companySizes,
        revenueBands: filterData.revenueBands,
        countries: filterData.countries,
        searchOwners: filterData.searchOwners,
        searchIndustries: filterData.searchIndustries,
        searchLegalForms: filterData.searchLegalForms,
        searchCompanySizes: filterData.searchCompanySizes,
        searchRevenueBands: filterData.searchRevenueBands,
        searchCountries: filterData.searchCountries
      }),
      createColumns: () => commonAccountColumns,
      descriptors: COMMON_ACCOUNT_DESCRIPTORS,
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

        // Copy all other filters directly (they now match Descriptor-Keys)
        Object.keys(params.selectedFilters).forEach(key => {
          if (
            key !== 'createdAtRange' &&
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
      buildRowActionsExternalContextData: (row: { original: CommonAccount }) => ({
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
    [fetchCustomerAccounts, filterData, accountStatisticsData, accessToken]
  )

  return <AccountLayout context={context} config={config} dataTestId="customer-account-view" />
}

export default AccountView
