import React, { useMemo } from 'react'
import { Button, DataDisplay, DataTable, Spinner } from '@newwork/nw-design-system'
import { Plus, Download, Trash2 } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { InvestmentContact } from '@/common/data/investment/types'
import { ContactStatistics } from './components/ContactStatistics'
import { AppAction } from '@/components/app-action/AppAction'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useContactData } from './hooks/useContactData'
import { useContactFilterOptions } from './hooks/useContactFilterOptions'
import { createContactColumns, createContactSortableColumns, contactFilterConfig } from './config'

export type ContactViewProps = BusinessAppContextProps

export const ContactView: React.FC<ContactViewProps> = context => {
  const { accessToken } = context

  // Data management
  const contactData = useContactData(context)

  // Filter options
  const filterOptions = useContactFilterOptions(context)

  // Create columns
  const contactColumns = useMemo(() => createContactColumns(), [])

  // Dynamic filter configuration
  const dynamicFilterConfig = useMemo(() => {
    const config = { ...contactFilterConfig }

    // Update Owner filter with dynamic data
    const contactFiltersGroup = config.groups.find(g => g.id === 'contact-filters')
    if (contactFiltersGroup && filterOptions.owners.length > 0) {
      const ownerFilter = contactFiltersGroup.filters.find(f => f.id === 'owners')
      if (ownerFilter && ownerFilter.config && 'options' in ownerFilter.config) {
        ownerFilter.config.options = filterOptions.owners
      }
    }

    // Update Contact Type filter with dynamic data
    if (contactFiltersGroup && filterOptions.contactTypes.length > 0) {
      const contactTypeFilter = contactFiltersGroup.filters.find(f => f.id === 'contactTypes')
      if (contactTypeFilter && contactTypeFilter.config && 'options' in contactTypeFilter.config) {
        contactTypeFilter.config.options = filterOptions.contactTypes
      }
    }

    // Update Account filter with dynamic data
    if (contactFiltersGroup && filterOptions.accounts.length > 0) {
      const accountFilter = contactFiltersGroup.filters.find(f => f.id === 'accounts')
      if (accountFilter && accountFilter.config && 'options' in accountFilter.config) {
        accountFilter.config.options = filterOptions.accounts
      }
    }

    return config
  }, [filterOptions])

  // Transform data to flatten nested objects for DataTable
  const transformedContactData = useMemo(() => {
    return contactData.data.map(contact => ({
      ...contact,
      ownerEmployeeName: contact.ownerEmployee?.displayName || ''
    }))
  }, [contactData.data])

  // Handle row click
  // Disable row click navigation to allow AppActionMenu flows to open modals
  const handleRowClick = (contact: InvestmentContact) => {
    // Don't navigate - allows action menu flows to work properly
    console.log('Contact selected:', contact.id)
  }

  // Initial loading state
  if (contactData.loading && contactData.data.length === 0 && !filterOptions.isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div data-testid="investment-contacts-view">
      {/* Header */}
      <div className="gba:mb-6">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
          <div>
            <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">Investment Contacts</h1>
            <p className="gba:text-gray-600">Manage investment client contacts and relationships</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <ContactStatistics {...context} />
      </div>

      {/* Data Display with DataTable */}
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: 'All Contacts',
            metadata: { count: contactData.total, subtitle: 'All investment contacts' }
          }
        ]}
        currentSection="all"
        onSectionChange={() => {}} // Single tab, no section change needed
        primaryAction={
          <AppAction
            contextsArray={[FlowContextName.investmentContactCreate]}
            externalContextData={{}}
            accessToken={accessToken}
            data-testid="add-contact-action"
            emptyStateBehavior="hide"
            deferMainContextRequestsUntilClick={false}
          >
            <Button variant="default" data-testid="add-contact-button">
              <Plus size={16} />
              {getTranslationFromI18nKeyAndLabel('crm:contact.addContact', 'Add Contact')}
            </Button>
          </AppAction>
        }
        searchValue={contactData.search}
        searchPlaceholder="Search contacts..."
        onSearchChange={contactData.setSearch}
        filters={contactData.filters}
        filterConfiguration={dynamicFilterConfig}
        onFilterChange={newFilters => {
          contactData.setFilters(newFilters)
        }}
        enableLiveFiltering={true}
        filterSheetTitle="Filter Investment Contacts"
        filterSheetDescription="Apply filters to narrow down the investment contact list"
        toolbarDensity="default"
        sorting={contactData.sorting}
        sortableColumns={createContactSortableColumns()}
        onSortingChange={contactData.setSorting}
        availableColumns={contactColumns.map(col => ({
          id: col.id!,
          label: col.header as string
        }))}
        visibleColumns={contactData.visibleColumns}
        onVisibleColumnsChange={contactData.setVisibleColumns}
        selectedCount={contactData.selectedRows.length}
        bulkActions={[
          {
            id: 'export',
            label: 'Export Selected',
            icon: <Download className="gba:w-4 gba:h-4" />,
            variant: 'secondary' as const,
            onClick: () => {
              console.log('Export selected contacts:', contactData.selectedRows)
            }
          },
          {
            id: 'delete',
            label: 'Delete Selected',
            icon: <Trash2 className="gba:w-4 gba:h-4" />,
            variant: 'destructive' as const,
            onClick: () => {
              console.log('Delete selected contacts:', contactData.selectedRows)
            }
          }
        ]}
        onClearSelection={() => contactData.setSelectedRows([])}
      >
        <DataTable<InvestmentContact>
          data={transformedContactData}
          columns={contactColumns.filter(col => contactData.visibleColumns.includes(col.id!))}
          loading={contactData.loading}
          error={contactData.error?.message}
          totalCount={contactData.total}
          sorting={contactData.sorting}
          onSortingChange={contactData.setSorting}
          pagination={contactData.pagination}
          onPaginationChange={contactData.setPagination}
          selectedRows={contactData.selectedRows}
          onSelectionChange={contactData.setSelectedRows}
          enablePagination
          enableSorting
          enableSelection={false}
          enableColumnPinning
          enableResizing={false}
          rowsPerPageOptions={[10, 20, 50, 100]}
          showPageNumbers
          maxVisiblePages={7}
          emptyMessage="No investment contacts found"
          actions={row => (
            <AppActionMenu
              data-testid={`contact-actions-menu-${row.original.id}`}
              contextsArray={[FlowContextName.investmentContactEntity]}
              externalContextData={{ contactId: row.original.id }}
              prefixDataTestId="investment-contact-actions"
              accessToken={accessToken}
              emptyStateBehavior="enable"
              deferMainContextRequestsUntilClick
            >
              <Button
                size="icon"
                variant="ghost"
                aria-label="Contact actions"
                data-testid={`contact-actions-trigger-${row.original.id}`}
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

export default ContactView
