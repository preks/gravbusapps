import { useMemo, useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  AccountLayout,
  type AccountViewConfig,
  type QuickFiltersRenderProps,
  AccountQuickFilters,
  type QuickFilterType
} from '@/common/components/common-relations/view-layouts/account-layout'
import type { Account } from '@/common/data/relations/types/accountTypes'
import { INVESTMENT_ACCOUNT_DESCRIPTORS } from '@/common/data/investment/types/investmentAccountTypes'
import {
  commonAccountColumns,
  commonAccountFilterConfig,
  createProspectiveColumn
} from '@/common/components/common-relations/view-layouts/account-layout/config'
import { useGetInvestmentAccounts } from '@/common/data/investment/hooks/useInvestmentAccounts'
import type { InvestmentAccountQueryVariables } from '@/common/data/investment/queries/investmentAccountQueries'
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useInvestmentAccountStatistics } from '@/common/data/investment/hooks/useInvestmentAccountStatistics'

// Helper function to process date range filters
const processInvestmentAccountDateRanges = (
  selectedFilters: Record<string, any>,
  vars: InvestmentAccountQueryVariables
): void => {
  const dateRangeKeys = [
    'createdAtRange',
    'updatedAtRange',
    'foundationDateRange',
    'liquidationDateRange',
    'activeFromRange',
    'activeToRange'
  ]

  for (const rangeKey of dateRangeKeys) {
    const normalized = normalizeDateRange(selectedFilters[rangeKey])
    if (normalized) {
      const baseKey = rangeKey.replace('Range', '')
      if (normalized.from) vars[`${baseKey}From` as keyof InvestmentAccountQueryVariables] = normalized.from
      if (normalized.to) vars[`${baseKey}To` as keyof InvestmentAccountQueryVariables] = normalized.to
    }
  }
}

// Helper function to copy non-date filters
const copyInvestmentAccountFilters = (
  selectedFilters: Record<string, any>,
  dateRangeKeys: string[],
  vars: InvestmentAccountQueryVariables
): void => {
  for (const key of Object.keys(selectedFilters)) {
    if (!dateRangeKeys.includes(key) && selectedFilters[key] !== undefined && selectedFilters[key] !== null) {
      vars[key as keyof InvestmentAccountQueryVariables] = selectedFilters[key]
    }
  }
}

export type AccountViewProps = BusinessAppContextProps

export const AccountView: React.FC<AccountViewProps> = context => {
  const { accessToken } = context
  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilterType>('all')

  const handleQuickFilterChange = useCallback(
    (
      filter: QuickFilterType,
      prospective: boolean | undefined,
      onFilterChange: (filters: Record<string, any>) => void,
      currentFilters: Record<string, any>
    ) => {
      setActiveQuickFilter(filter)
      onFilterChange({
        ...currentFilters,
        prospective: prospective
      })
    },
    []
  )

  const renderQuickFilters = useCallback(
    ({ selectedFilters, onFilterChange }: QuickFiltersRenderProps) => (
      <AccountQuickFilters
        activeFilter={activeQuickFilter}
        onFilterChange={(filter, prospective) =>
          handleQuickFilterChange(filter, prospective, onFilterChange, selectedFilters)
        }
        labels={{
          all: 'All',
          established: 'Portfolio Companies',
          prospect: 'Prospects'
        }}
        dataTestIdPrefix="investment-account"
      />
    ),
    [activeQuickFilter, handleQuickFilterChange]
  )

  // Data Hooks
  const { fetchInvestmentAccounts } = useGetInvestmentAccounts(context)
  const accountStatistics = useInvestmentAccountStatistics(context)

  // Statistics - Transform hook data to AccountStatisticsData format
  // Statistics - Hook already returns the correct format
  const accountStatisticsData = accountStatistics

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
      createColumns: () => {
        // Replace generic prospective column with IRM-specific version
        return commonAccountColumns.map(col => (col.id === 'prospective' ? createProspectiveColumn('irm') : col))
      },
      descriptors: INVESTMENT_ACCOUNT_DESCRIPTORS,
      columnLabels: {
        name: 'Account Name',
        industryClass: 'Industry',
        legalForm: 'Legal Form',
        companySize: 'Size',
        accountAnnualRevenueBand: 'Revenue Band',
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

        const dateRangeKeys = [
          'createdAtRange',
          'updatedAtRange',
          'foundationDateRange',
          'liquidationDateRange',
          'activeFromRange',
          'activeToRange'
        ]

        // Process date range filters using helper
        processInvestmentAccountDateRanges(params.selectedFilters, vars)

        // Copy all other filters using helper
        copyInvestmentAccountFilters(params.selectedFilters, dateRangeKeys, vars)

        // Special handling for prospective filter (checkbox-group returns array of strings)
        if (params.selectedFilters.prospective && Array.isArray(params.selectedFilters.prospective)) {
          const prospectiveValues = params.selectedFilters.prospective
          // Only filter if exactly one option is selected (not both or neither)
          if (prospectiveValues.length === 1) {
            vars.prospective = prospectiveValues[0] === 'true'
          }
        }

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

  return (
    <AccountLayout
      context={context}
      config={config}
      dataTestId="investment-account-view"
      renderQuickFilters={renderQuickFilters}
    />
  )
}

export default AccountView
