/**
 * Employee View Component for Company Record
 * Displays company employees with DataDisplay, search, and infinite scroll card view
 */
import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { DataDisplay, Spinner, useTranslation } from '@newwork/nw-design-system'
import { DataCards } from '@/components/dataCards'
import { useCompanyEmployees, type CompanyEmployee } from '@/common/data/orgchart/hooks/useCompanyEmployees'
import { useDebounce } from '@/common/hooks/useDebounce'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import translations from '../../_i18n'
import { CompanyEmployeeCard } from './components/CompanyEmployeeCard'

export interface EmployeeViewProps extends BusinessAppContextProps {
  companyId: string
}

const DATA_TEST_ID_PREFIX = 'company-employee-view'

export const EmployeeView: React.FC<EmployeeViewProps> = ({ companyId, accessToken }) => {
  const { t } = useTranslation(translations)

  const [search, setSearch] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState<CompanyEmployee | null>(null)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const debouncedSearch = useDebounce(search, 300)
  const employeeOrderBy = useMemo(() => [{ field: 'employee.displayName', direction: 'ASC' as const }], [])

  // Fetch employees with infinite scroll
  const { employees, loading, error, hasMore, loadMore, retry } = useCompanyEmployees(
    accessToken,
    companyId,
    20,
    debouncedSearch,
    employeeOrderBy
  )

  useEffect(() => {
    if (!loading) {
      setHasLoadedOnce(true)
    }
  }, [loading])

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
  }, [])

  const handleEmployeeSelect = useCallback((employee: CompanyEmployee) => {
    setSelectedEmployee(prev => (prev?.id === employee.id ? null : employee))
  }, [])

  const titleSections = useMemo(
    () => [
      {
        id: 'all',
        label: t('employees'),
        metadata: {
          count: employees.length,
          isLoading: loading
        }
      }
    ],
    [employees.length, loading, t]
  )

  const getEmployeeKey = useCallback((employee: CompanyEmployee) => employee.id, [])

  const renderEmployeeCard = useCallback(
    (employee: CompanyEmployee) => (
      <div
        className="gba:cursor-pointer"
        onClick={() => handleEmployeeSelect(employee)}
        role="button"
        tabIndex={0}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            handleEmployeeSelect(employee)
          }
        }}
        aria-pressed={selectedEmployee?.id === employee.id}
        data-testid={`company-employee-card-wrapper-${employee.id}`}
      >
        <CompanyEmployeeCard employee={employee} isSelected={selectedEmployee?.id === employee.id} />
      </div>
    ),
    [handleEmployeeSelect, selectedEmployee?.id]
  )

  if (!hasLoadedOnce && loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-[400px]">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div data-testid={DATA_TEST_ID_PREFIX} className="gba:space-y-4">
      <DataDisplay
        titleSections={titleSections}
        currentSection="all"
        searchValue={search}
        searchPlaceholder={t('search-employees')}
        onSearchChange={handleSearch}
        toolbarDensity="default"
      >
        <DataCards<CompanyEmployee>
          items={employees}
          getKey={getEmployeeKey}
          renderItem={renderEmployeeCard}
          hasMore={hasMore}
          loading={loading}
          error={error || null}
          onLoadMore={loadMore}
          onRetry={retry}
          emptyMessage={t('no-employees-found')}
        />
      </DataDisplay>
    </div>
  )
}

export default EmployeeView
