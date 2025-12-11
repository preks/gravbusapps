/**
 * Employee View Component for Company Record
 * Displays company employees with DataDisplay, search, and infinite scroll card view
 */
import React, { useState, useCallback } from 'react'
import { DataDisplay, Spinner, useTranslation } from '@newwork/nw-design-system'
import { DataCards } from '@/components/dataCards'
import { useCompanyEmployees, type CompanyEmployee } from '@/common/data/orgchart/hooks/useCompanyEmployees'
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

  // Fetch employees with infinite scroll
  const { employees, loading, error, hasMore, loadMore, retry } = useCompanyEmployees(
    accessToken,
    companyId,
    20,
    search,
    [{ field: 'employee.displayName', direction: 'ASC' }]
  )

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
  }, [])

  const handleEmployeeSelect = useCallback((employee: CompanyEmployee) => {
    setSelectedEmployee(prev => (prev?.id === employee.id ? null : employee))
  }, [])

  if (loading && employees.length === 0) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-[400px]">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div data-testid={DATA_TEST_ID_PREFIX} className="gba:space-y-4">
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: t('employees'),
            metadata: {
              count: employees.length,
              isLoading: loading
            }
          }
        ]}
        currentSection="all"
        searchValue={search}
        searchPlaceholder={t('search-employees')}
        onSearchChange={handleSearch}
        toolbarDensity="default"
      >
        <DataCards<CompanyEmployee>
          items={employees}
          getKey={emp => emp.id}
          renderItem={(emp: CompanyEmployee) => (
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
              data-testid={`company-employee-card-wrapper-${emp.id}`}
            >
              <CompanyEmployeeCard employee={emp} isSelected={selectedEmployee?.id === emp.id} />
            </div>
          )}
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
