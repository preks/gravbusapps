import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AccountLayout, type AccountViewConfig } from '@/common/components/common-relations/view-layouts/account-layout'
import type { Account } from '@/common/data/relations/types/accountTypes'
import { CUSTOMER_ACCOUNT_DESCRIPTORS } from '@/common/data/customer/types/customerAccountTypes'
import {
  commonAccountColumns,
  commonAccountFilterConfig
} from '@/common/components/common-relations/view-layouts/account-layout/config'
import { useCustomerAccounts } from '@/common/data/customer/hooks/useCustomerAccounts'
import type { CustomerAccountQueryVariables } from '@/common/data/customer/queries/customerAccountQueries'
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useCustomerAccountStatistics } from '@/common/data/customer/hooks/useCustomerAccountStatistics'

// Helper function to process date range filters
const processDateRangeFilters = (selectedFilters: Record<string, any>, vars: CustomerAccountQueryVariables): void => {
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
      if (normalized.from) vars[`${baseKey}From` as keyof CustomerAccountQueryVariables] = normalized.from
      if (normalized.to) vars[`${baseKey}To` as keyof CustomerAccountQueryVariables] = normalized.to
    }
  }
}

// Helper function to copy non-date filters
const copyNonDateFilters = (
  selectedFilters: Record<string, any>,
  dateRangeKeys: string[],
  vars: CustomerAccountQueryVariables
): void => {
  for (const key of Object.keys(selectedFilters)) {
    if (!dateRangeKeys.includes(key) && selectedFilters[key] !== undefined && selectedFilters[key] !== null) {
      vars[key as keyof CustomerAccountQueryVariables] = selectedFilters[key]
    }
  }
}

export type AccountViewProps = BusinessAppContextProps

export const AccountView: React.FC<AccountViewProps> = context => {
  const { accessToken } = context

  // Data Hooks
  const { fetchCustomerAccounts } = useCustomerAccounts(context)
  const accountStatistics = useCustomerAccountStatistics(context)

  // Statistics - Transform hook data to AccountStatisticsData format
  // Statistics - Hook already returns the correct format
  const accountStatisticsData = accountStatistics

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
        const vars: CustomerAccountQueryVariables = {
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
        processDateRangeFilters(params.selectedFilters, vars)

        // Copy all other filters using helper
        copyNonDateFilters(params.selectedFilters, dateRangeKeys, vars)

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
