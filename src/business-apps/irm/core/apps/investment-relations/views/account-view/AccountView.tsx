import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  AccountLayout,
  type AccountViewConfig,
  type AccountStatisticsData
} from '@/common/components/common-relations/view-layouts/account-layout'
import type { Account } from '@/common/data/relations/types/accountTypes'
import { INVESTMENT_ACCOUNT_DESCRIPTORS } from '@/common/data/investment/types/investmentAccountTypes'
import {
  commonAccountColumns,
  commonAccountFilterConfig
} from '@/common/components/common-relations/view-layouts/account-layout/config'
import { useGetInvestmentAccounts } from '@/common/data/investment/hooks/useInvestmentAccounts'
import type { InvestmentAccountQueryVariables } from '@/common/data/investment/queries/investmentAccountQueries'
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useInvestmentAccountStatistics } from '@/common/data/investment/hooks/useInvestmentAccountStatistics'

export type AccountViewProps = BusinessAppContextProps

export const AccountView: React.FC<AccountViewProps> = context => {
  const { accessToken } = context

  // Data Hooks
  const { fetchInvestmentAccounts } = useGetInvestmentAccounts(context)
  const accountStatistics = useInvestmentAccountStatistics(context)

  // Statistics - Transform hook data to AccountStatisticsData format
  const accountStatisticsData: AccountStatisticsData | undefined = useMemo(() => {
    if (!accountStatistics.trendData) return undefined
    return {
      recentAccounts: accountStatistics.trendData.recentAccounts,
      activeAccounts: accountStatistics.trendData.activeAccounts,
      accountsThisYear: accountStatistics.trendData.accountsThisYear,
      totalAccounts: accountStatistics.trendData.totalAccounts,
      isLoading: accountStatistics.isLoading,
      error: accountStatistics.error,
      refetch: accountStatistics.refetch
    }
  }, [accountStatistics])

  // Config
  const config: AccountViewConfig<Account, InvestmentAccountQueryVariables> = useMemo(
    () => ({
      fetchAccounts: async (variables: InvestmentAccountQueryVariables) => {
        const result = await fetchInvestmentAccounts(variables)
        return {
          accounts: result.InvestmentAccount || [],
          total: result.InvestmentAccountAggregate?.aggregate?.count || 0
        }
      },
      entityName: 'InvestmentAccount',
      createColumns: () => commonAccountColumns,
      descriptors: INVESTMENT_ACCOUNT_DESCRIPTORS,
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
        const vars: InvestmentAccountQueryVariables = {
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
            if (normalized.from) vars[`${baseKey}From` as keyof InvestmentAccountQueryVariables] = normalized.from
            if (normalized.to) vars[`${baseKey}To` as keyof InvestmentAccountQueryVariables] = normalized.to
          }
        })

        // Copy all other filters directly (they now match Descriptor-Keys)
        Object.keys(params.selectedFilters).forEach(key => {
          if (
            !dateRangeKeys.includes(key) &&
            params.selectedFilters[key] !== undefined &&
            params.selectedFilters[key] !== null
          ) {
            vars[key as keyof InvestmentAccountQueryVariables] = params.selectedFilters[key]
          }
        })

        // Use column ID directly - buildOrderBy will use descriptors (INVESTMENT_ACCOUNT_DESCRIPTORS)
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
        entityContext: FlowContextName.investmentAccountEntity,
        createContext: FlowContextName.investmentAccountCreate
      },
      buildRecordUrl: (id: string) => buildPlatformUrl('/platform/irm/account-record', { accountId: id }),
      accountStatistics: accountStatisticsData,
      variant: 'investment',
      processCompletionEvents: [
        'com.newwork.process.taskCompletion',
        'com.newwork.process.completion',
        'com.newwork.process.continue',
        'com.newwork.process.processCompletion',
        'processCompletion',
        'accountCompletion',
        'accountCompleted'
      ],
      rowActionsContextArray: [FlowContextName.investmentAccountEntity],
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
        addAccount: { key: 'irm:account.addAccount', default: 'Add Account' }
      }
    }),
    [fetchInvestmentAccounts, accountStatisticsData, accessToken]
  )

  return <AccountLayout context={context} config={config} dataTestId="investment-account-view" />
}

export default AccountView
