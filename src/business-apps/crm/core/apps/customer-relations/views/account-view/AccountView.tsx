import { useMemo, useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  AccountLayout,
  type AccountViewConfig,
  type QuickFiltersRenderProps,
  AccountQuickFilters,
  type QuickFilterType
} from '@/common/components/common-relations/view-layouts/account-layout'
import { useViewPreferencesStorage } from '@/common/hooks/useViewPreferencesStorage'
import type { Account } from '@/common/data/relations/types/accountTypes'
import { CUSTOMER_ACCOUNT_DESCRIPTORS } from '@/common/data/customer/types/customerAccountTypes'
import {
  commonAccountColumns,
  commonAccountFilterConfig,
  createProspectiveColumn
} from '@/common/components/common-relations/view-layouts/account-layout/config'
import { useCustomerAccounts } from '@/common/data/customer/hooks/useCustomerAccounts'
import type { CustomerAccountQueryVariables } from '@/common/data/customer/queries/customerAccountQueries'
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useCustomerAccountStatistics } from '@/common/data/customer/hooks/useCustomerAccountStatistics'
import type { FilterConfiguration } from '@newwork/nw-design-system'

// Custom filter configuration for CRM Account View - excludes Status, Contact Information, and Account Category filters
const crmAccountFilterConfig: FilterConfiguration = {
  ...commonAccountFilterConfig,
  groups: commonAccountFilterConfig.groups.filter(
    group => group.id !== 'status-group' && group.id !== 'contact-filters' && group.id !== 'account-type-group'
  )
}

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

const deriveQuickFilter = (filters: Record<string, any>): QuickFilterType => {
  if (filters.prospective === true) return 'prospect'
  if (filters.prospective === false) return 'established'
  return 'all'
}

export const AccountView: React.FC<AccountViewProps> = context => {
  const { initialFilters, saveFilters, initialSorting, saveSorting, initialVisibleColumns, saveVisibleColumns } =
    useViewPreferencesStorage('crm:customer-account-preferences:v1')
  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilterType>(deriveQuickFilter(initialFilters))

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
          established: 'Customers',
          prospect: 'Prospects'
        }}
        dataTestIdPrefix="customer-account"
      />
    ),
    [activeQuickFilter, handleQuickFilterChange]
  )

  // Data Hooks
  const { fetchCustomerAccounts } = useCustomerAccounts(context)
  const accountStatistics = useCustomerAccountStatistics(context)

  // Config — accountStatistics is intentionally excluded so that statistics state
  // updates (isLoading, recentAccounts, etc.) do not recreate config, which would
  // cascade into new queryVariables/loadData references and re-fire GetAccounts.
  // accountStatistics is passed as a separate prop to AccountLayout instead.
  const config: AccountViewConfig<Account, CustomerAccountQueryVariables> = useMemo(
    () => ({
      fetchAccounts: fetchCustomerAccounts,
      entityName: 'Account',
      createColumns: () => {
        // Replace generic prospective column with CRM-specific version
        return commonAccountColumns.map(col => (col.id === 'prospective' ? createProspectiveColumn('crm') : col))
      },
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
      baseFilterConfig: crmAccountFilterConfig,
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

        // Special handling for prospective filter (checkbox-group returns array of strings)
        if (params.selectedFilters.prospective && Array.isArray(params.selectedFilters.prospective)) {
          const prospectiveValues = params.selectedFilters.prospective
          // Only filter if exactly one option is selected (not both or neither)
          if (prospectiveValues.length === 1) {
            vars.prospective = prospectiveValues[0] === 'true'
          }
        }

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
    [fetchCustomerAccounts]
  )

  return (
    <AccountLayout
      context={context}
      config={config}
      accountStatistics={accountStatistics}
      dataTestId="customer-account-view"
      renderQuickFilters={renderQuickFilters}
      enableExport
      exportFilenamePrefix="accounts"
      initialFilters={initialFilters}
      onFilterChange={saveFilters}
      initialSorting={initialSorting ?? undefined}
      onSortingChange={saveSorting}
      initialVisibleColumns={initialVisibleColumns ?? undefined}
      onVisibleColumnsChange={saveVisibleColumns}
    />
  )
}

export default AccountView
