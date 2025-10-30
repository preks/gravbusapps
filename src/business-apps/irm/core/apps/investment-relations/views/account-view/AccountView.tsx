import React, { useMemo } from 'react'
import { Button, DataDisplay, DataTable, Spinner } from '@newwork/nw-design-system'
import { Plus, Download, Trash2 } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { InvestmentAccount } from '@/common/data/investment/types'
import { AccountStatistics } from './components/AccountStatistics'
import { AppAction } from '@/components/app-action/AppAction'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { navigateTo } from '@/common/utils/navigationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useAccountData } from './hooks/useAccountData'
import { useAccountFilterOptions } from './hooks/useAccountFilterOptions'
import { createAccountColumns, createAccountSortableColumns, accountFilterConfig } from './config'

export type AccountViewProps = BusinessAppContextProps

export const AccountView: React.FC<AccountViewProps> = context => {
  const { accessToken } = context

  // Data management
  const accountData = useAccountData(context)

  // Filter options
  const filterOptions = useAccountFilterOptions(context)

  // Create columns
  const accountColumns = useMemo(() => createAccountColumns(), [])

  // Dynamic filter configuration
  const dynamicFilterConfig = useMemo(() => {
    const config = { ...accountFilterConfig }

    // Update Owner filter with dynamic data
    const accountFiltersGroup = config.groups.find(g => g.id === 'account-filters')
    if (accountFiltersGroup && filterOptions.owners.length > 0) {
      const ownerFilter = accountFiltersGroup.filters.find(f => f.id === 'owners')
      if (ownerFilter && ownerFilter.config && 'options' in ownerFilter.config) {
        ownerFilter.config.options = filterOptions.owners
      }
    }

    // Update Industry filter with dynamic data
    if (accountFiltersGroup && filterOptions.industries.length > 0) {
      const industryFilter = accountFiltersGroup.filters.find(f => f.id === 'industries')
      if (industryFilter && industryFilter.config && 'options' in industryFilter.config) {
        industryFilter.config.options = filterOptions.industries
      }
    }

    // Update Legal Form filter with dynamic data
    if (accountFiltersGroup && filterOptions.legalForms.length > 0) {
      const legalFormFilter = accountFiltersGroup.filters.find(f => f.id === 'legalForms')
      if (legalFormFilter && legalFormFilter.config && 'options' in legalFormFilter.config) {
        legalFormFilter.config.options = filterOptions.legalForms
      }
    }

    // Update Company Size filter with dynamic data
    if (accountFiltersGroup && filterOptions.companySizes.length > 0) {
      const companySizeFilter = accountFiltersGroup.filters.find(f => f.id === 'companySizes')
      if (companySizeFilter && companySizeFilter.config && 'options' in companySizeFilter.config) {
        companySizeFilter.config.options = filterOptions.companySizes
      }
    }

    // Update Revenue Band filter with dynamic data
    if (accountFiltersGroup && filterOptions.revenueBands.length > 0) {
      const revenueBandFilter = accountFiltersGroup.filters.find(f => f.id === 'revenueBands')
      if (revenueBandFilter && revenueBandFilter.config && 'options' in revenueBandFilter.config) {
        revenueBandFilter.config.options = filterOptions.revenueBands
      }
    }

    return config
  }, [filterOptions])

  // Transform data to flatten nested objects for DataTable
  const transformedAccountData = useMemo(() => {
    return accountData.data.map(account => ({
      ...account,
      industryValue: account.industryClass?.value || account.industryClass?.code || '',
      legalFormValue: account.legalForm?.value || account.legalForm?.code || '',
      companySizeValue: account.companySize?.value || account.companySize?.code || '',
      ownerEmployeeName: account.ownerEmployee?.displayName || ''
    }))
  }, [accountData.data])

  // Handle row click
  const handleRowClick = (account: InvestmentAccount) => {
    navigateTo(`/platform/irm/account-record?accountId=${account.id}`)
  }

  // Initial loading state
  if (accountData.loading && accountData.data.length === 0 && !filterOptions.isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div data-testid="investment-accounts-view">
      {/* Header */}
      <div className="gba:mb-6">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
          <div>
            <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">Investment Accounts</h1>
            <p className="gba:text-gray-600">Manage investment client accounts and relationships</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <AccountStatistics {...context} />
      </div>

      {/* Data Display with DataTable */}
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: 'All Accounts',
            metadata: { count: accountData.total, subtitle: 'All investment accounts' }
          }
        ]}
        currentSection="all"
        onSectionChange={() => {}} // Single tab, no section change needed
        primaryAction={
          <AppAction
            contextsArray={[FlowContextName.createInvestmentAccount]}
            accessToken={accessToken}
            data-testid="add-account-action"
            emptyStateBehavior="hide"
            deferMainContextRequestsUntilClick={false}
          >
            <Button size="sm" variant="default" data-testid="add-account-button" type="button">
              <Plus size={16} />
              {getTranslationFromI18nKeyAndLabel('crm:account.addAccount', 'Add Account')}
            </Button>
          </AppAction>
        }
        searchValue={accountData.search}
        searchPlaceholder="Search accounts..."
        onSearchChange={accountData.setSearch}
        filters={accountData.filters}
        filterConfiguration={dynamicFilterConfig}
        onFilterChange={newFilters => {
          accountData.setFilters(newFilters)
        }}
        enableLiveFiltering={true}
        filterSheetTitle="Filter Investment Accounts"
        filterSheetDescription="Apply filters to narrow down the investment account list"
        toolbarDensity="default"
        sorting={accountData.sorting}
        sortableColumns={createAccountSortableColumns()}
        onSortingChange={accountData.setSorting}
        availableColumns={accountColumns.map(col => ({
          id: col.id!,
          label: col.header as string
        }))}
        visibleColumns={accountData.visibleColumns}
        onVisibleColumnsChange={accountData.setVisibleColumns}
        selectedCount={accountData.selectedRows.length}
        bulkActions={[
          {
            id: 'export',
            label: 'Export Selected',
            icon: <Download className="gba:w-4 gba:h-4" />,
            variant: 'secondary' as const,
            onClick: () => {
              console.log('Export selected accounts:', accountData.selectedRows)
            }
          },
          {
            id: 'delete',
            label: 'Delete Selected',
            icon: <Trash2 className="gba:w-4 gba:h-4" />,
            variant: 'destructive' as const,
            onClick: () => {
              console.log('Delete selected accounts:', accountData.selectedRows)
            }
          }
        ]}
        onClearSelection={() => accountData.setSelectedRows([])}
      >
        <DataTable<InvestmentAccount>
          data={transformedAccountData}
          columns={accountColumns.filter(col => accountData.visibleColumns.includes(col.id!))}
          loading={accountData.loading}
          error={accountData.error?.message}
          totalCount={accountData.total}
          sorting={accountData.sorting}
          onSortingChange={accountData.setSorting}
          pagination={accountData.pagination}
          onPaginationChange={accountData.setPagination}
          selectedRows={accountData.selectedRows}
          onSelectionChange={accountData.setSelectedRows}
          enablePagination
          enableSorting
          enableSelection={false}
          enableColumnPinning
          enableResizing={false}
          rowsPerPageOptions={[10, 20, 50, 100]}
          showPageNumbers
          maxVisiblePages={7}
          emptyMessage="No investment accounts found"
          actions={row => (
            <AppActionMenu
              data-testid={`account-actions-menu-${row.original.id}`}
              contextsArray={[FlowContextName.investmentAccountEntity]}
              externalContextData={{ accountId: row.original.id }}
              prefixDataTestId="investment-account-actions"
              accessToken={accessToken}
              emptyStateBehavior="enable"
              deferMainContextRequestsUntilClick
            >
              <Button
                size="icon"
                variant="ghost"
                aria-label="Account actions"
                data-testid={`account-actions-trigger-${row.original.id}`}
                onClick={e => e.stopPropagation()}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
              </Button>
            </AppActionMenu>
          )}
          onRowClick={handleRowClick}
        />
      </DataDisplay>
    </div>
  )
}

export default AccountView
