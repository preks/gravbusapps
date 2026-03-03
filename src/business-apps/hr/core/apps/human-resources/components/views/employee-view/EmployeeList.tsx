'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { DataContainer } from '@/components/layout/dataContainer'
import { useGetEmployees, Employee } from '@/business-apps/hr/core/hooks/useGetEmployees'
import { useEmployeeFilters } from '@/business-apps/hr/core/hooks/useEmployeeFilters'
import { EmployeeTable } from './components/EmployeeTable'
import { EmployeeDetails } from '@/business-apps/hr/core/details/employee-details'
import { UserIcon, UsersThreeIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { PlusSquareIcon } from '@/components/dataController/DataController'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

/**
 * Employee List page component. Renders the employee list module with a table view.
 * @returns {JSX.Element}
 */
export const EmployeeList: React.FC<BusinessAppContextProps> = (props: BusinessAppContextProps) => {
  const { accessToken } = props
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [hasInitialLoad, setHasInitialLoad] = useState(false)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(20)
  const [sortField, setSortField] = useState<string>('name')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC')

  // Use the centralized employee filters hook
  const {
    search,
    setSearch,
    selectedFilters,
    setSelectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    getFilters
  } = useEmployeeFilters(accessToken)

  // Adapter function for DataFilter component
  const handleFilterChange = useCallback(
    (filterId: string, selected: boolean) => {
      // Use the appropriate function directly
      if (selected) {
        addFilter(filterId)
      } else {
        removeFilter(filterId)
      }
    },
    [addFilter, removeFilter]
  )

  // Memoize filters to prevent unnecessary re-renders
  const memoizedFilters = useMemo(
    () => ({
      ...getFilters(),
      accessToken,
      sortField,
      sortOrder
    }),
    [search, selectedFilters, accessToken, sortField, sortOrder]
  )

  // Get employee data with filters from the centralized hook
  const { employees, total, loading, error, loadPage, retry } = useGetEmployees(memoizedFilters)

  // Handle page changes
  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page)
      loadPage(page, pageSize)
    },
    [pageSize]
  ) // Removed loadPage from dependencies

  // Handle page size changes
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1)
    loadPage(1, newPageSize)
  }, []) // Removed loadPage from dependencies

  // Handle sorting changes
  const handleSortingChange = useCallback((field: string, order: 'ASC' | 'DESC' | '') => {
    // When order is empty, clear sorting completely
    if (order === '') {
      setSortField('')
      setSortOrder('DESC') // Keep DESC as default for state type, but field will be empty
      setCurrentPage(1)
    } else {
      setSortField(field)
      setSortOrder(order)
      setCurrentPage(1)
    }
  }, [])

  // Auto-reload when sorting changes (after state updates)
  React.useEffect(() => {
    if (hasInitialLoad) {
      // Only reload if we've had an initial load
      setCurrentPage(1)
      loadPage(1, pageSize)
    }
  }, [sortField, sortOrder]) // Only depend on the actual state values

  // Initial load effect - only runs once when component mounts and accessToken is available
  React.useEffect(() => {
    if (accessToken && !hasInitialLoad && !loading) {
      loadPage(1, pageSize) // Load first page with current pageSize
      setHasInitialLoad(true)
    }
  }, [accessToken, loading, hasInitialLoad, pageSize]) // Removed loadPage from dependencies

  // Reset pagination and reload when filters change
  React.useEffect(() => {
    if (hasInitialLoad) {
      setCurrentPage(1)
      loadPage(1, pageSize)
    }
  }, [search, selectedFilters, pageSize, hasInitialLoad]) // Removed loadPage from dependencies

  // Handle employee selection
  const handleEmployeeSelect = useCallback((employee: Employee) => {
    setSelectedEmployee(employee)
  }, [])

  // Handle details panel close
  const handleDetailsPanelClose = useCallback(() => {
    setSelectedEmployee(null)
  }, [])

  return (
    <div data-testid="employee-list-content">
      <DataContainer
        contentBackground="white" // Set the content background to white
        floatingDetails={true} // Enable floating details variant
        onDetailsPanelClose={handleDetailsPanelClose} // Handle details panel close
        dataControllerProps={{
          // Props with debounce functionality now built into DataController
          search: search,
          setSearch: setSearch,
          debounceDelay: 300, // 300ms debounce delay

          // Regular DataController props
          filter: selectedFilters,
          setFilter: setSelectedFilters,
          filterLabelMap: filterLabelMap,
          listTitle: getTranslationFromI18nKeyAndLabel(
            'lowcoder:human_resources_page.employees_section.tab_label',
            'Employees'
          ),
          listIcon: <UsersThreeIcon size={20} />,
          listAmount: total,
          actions: (
            <AppActionMenu
              contextsArray={[FlowContextName.createEmployee]}
              accessToken={accessToken}
              data-testid="add-employee-menu"
              emptyStateBehavior="disable"
              autoExecuteSingleAction={true}
              deferMainContextRequestsUntilClick={false}
            >
              <button
                className="gba:flex gba:flex-row gba:justify-center gba:items-center gba:px-3 gba:py-0 gba:h-8 gba:rounded gba:gap-1"
                data-testid="add-employee-button"
                type="button"
              >
                <span className="gba:w-5 gba:h-5 gba:flex gba:items-center gba:justify-center gba:flex-none order-0 gba:grow-0">
                  <PlusSquareIcon />
                </span>
                <span className="gba:h-4 gba:font-normal gba:text-sm gba:leading-4 gba:flex gba:items-center gba:text-black gba:flex-none order-1 gba:grow-0">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:human_resources_page.employees_section.add', 'Add')}
                </span>
              </button>
            </AppActionMenu>
          )
        }}
        dataFilterProps={{
          filterGroups: filterGroups,
          onFilterChange: handleFilterChange
        }}
        dataBody={
          <div data-testid="employee-table-container">
            <EmployeeTable
              employees={employees}
              loading={loading}
              error={error}
              loadPage={loadPage}
              retry={retry}
              total={total}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              onSelectEmployee={handleEmployeeSelect}
              selectedEmployeeId={selectedEmployee?.id}
              accessToken={accessToken}
              sortField={sortField}
              sortOrder={sortOrder}
              onSortingChange={handleSortingChange}
            />
          </div>
        }
        dataDetails={
          selectedEmployee
            ? {
                title: `${selectedEmployee.firstName} ${selectedEmployee.lastName}`,
                icon: <UserIcon size={20} />,
                content: (
                  <EmployeeDetails
                    employeeId={selectedEmployee.id}
                    accessToken={accessToken}
                    userInfo={props.userInfo}
                  />
                ),
                onClose: handleDetailsPanelClose
              }
            : undefined
        }
      />
    </div>
  )
}

export default EmployeeList
