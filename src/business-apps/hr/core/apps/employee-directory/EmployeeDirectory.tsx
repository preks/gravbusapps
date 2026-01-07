'use client'

import React, { useEffect, useCallback, useState, useMemo } from 'react'
import { useGetEmployees, Employee } from '@/business-apps/hr/core/hooks/useGetEmployees'
import { useEmployeeFilters } from '@/business-apps/hr/core/hooks/useEmployeeFilters'
import { PageLayout } from '@newwork/nw-design-system'
import { DataContainer } from '@/components/layout/dataContainer'
import { DataController, DataControllerProps } from '@/components/dataController'
import { DataCards } from '@/components/dataCards'
import { UserIcon, UsersIcon, UsersThreeIcon } from '@phosphor-icons/react'
import { EmployeeCard } from './components/EmployeeCard.component'
import { EmployeeDetails } from '@/business-apps/hr/core/details/employee-details'
//import { useTranslation } from 'react-i18next';
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { MODULE_COLORS } from '@/common/constants/ui'
/**
 * Employee Directory page component. Renders the employee directory module with grid, infinite scroll, and alphabet filter.
 * @returns {JSX.Element}
 */
const moduleColor = MODULE_COLORS.HR

export const EmployeeDirectory: React.FC<BusinessAppContextProps> = (props: BusinessAppContextProps) => {
  const { accessToken } = props
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

  // Track selected employee for details panel
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)

  //const { t } = useTranslation('employee_directory', { keyPrefix: 'employee_directory' });

  // Memoize filters to prevent unnecessary re-renders
  const memoizedFilters = useMemo(
    () => ({
      ...getFilters(),
      accessToken
    }),
    [getFilters, accessToken]
  )

  const { employees, total, loading, error, hasMore, loadMore, retry } = useGetEmployees(memoizedFilters)
  const loaderRef = React.useRef<HTMLDivElement | null>(null)
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null)

  // Infinite scroll using Intersection Observer
  useEffect(() => {
    if (!loaderRef.current || !hasMore || !scrollContainerRef.current) return
    const observer = new window.IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore()
        }
      },
      { root: scrollContainerRef.current }
    )
    observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [loaderRef, hasMore, loading, loadMore]) // loadMore is now memoized, so this effect will not retrigger endlessly

  // Handle employee selection - toggle selection when clicked a second time
  const handleEmployeeSelect = useCallback((employee: Employee) => {
    setSelectedEmployee((prev: Employee | null) => (prev?.id === employee.id ? null : employee))
  }, [])

  return (
    <div data-testid="employee-directory-app">
      <PageLayout
        headerIcon={UsersIcon}
        headerTitle="Employee Directory"
        headerDescription="Browse and connect with employees across your organization"
        className="gba:min-h-screen"
        variant={moduleColor}
      >
        <DataContainer<DataControllerProps>
          dataControllerComponent={DataController}
          contentBackground="white"
          dataControllerProps={{
            // Props with debounce functionality now built into DataController
            search: search,
            setSearch: setSearch,
            debounceDelay: 300, // 300ms debounce delay

            // Regular DataController props
            filter: selectedFilters,
            setFilter: setSelectedFilters,
            filterLabelMap: filterLabelMap,
            listTitle: 'Employees',
            listIcon: <UsersThreeIcon size={20} />,
            listAmount: total
          }}
          dataFilterProps={{
            filterGroups: filterGroups,
            onFilterChange: handleFilterChange
          }}
          dataBody={
            <DataCards
              items={employees}
              getKey={emp => emp.id}
              renderItem={(emp: Employee) => (
                <div
                  className="gba:cursor-pointer"
                  onClick={() => handleEmployeeSelect(emp)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleEmployeeSelect(emp)
                    }
                  }}
                  aria-pressed={selectedEmployee?.id === emp.id}
                >
                  <EmployeeCard employee={emp} isSelected={selectedEmployee?.id === emp.id} />
                </div>
              )}
              hasMore={hasMore}
              loading={loading}
              error={error ? 'Failed to load employees.' : null}
              onLoadMore={loadMore}
              onRetry={retry}
              emptyMessage="No employees found."
            />
          }
          floatingDetails={true}
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
                  onClose: () => setSelectedEmployee(null)
                }
              : undefined
          }
        />
      </PageLayout>
    </div>
  )
}

export default EmployeeDirectory
