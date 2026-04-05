import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../../../_i18n'
import useCloseDropdownOnOutsideClick from '../../common/useCloseDropdownOnOutsideClick'

interface Employee {
  id: string
  name: string
}

interface EmployeeSearchFilterProps {
  employeeSearchText: string
  setEmployeeSearchText: (text: string) => void
  showEmployeeDropdown: boolean
  setShowEmployeeDropdown: (show: boolean) => void
  employeeSearchResults: Employee[]
  employeeSearchLoading: boolean
  selectedEmployeeIds: string[]
  onSelectedEmployeeIdsChange: (employeeIds: string[]) => void
  debouncedSearchEmployees: (searchText: string) => void
}

const EmployeeSearchFilter: React.FC<EmployeeSearchFilterProps> = ({
  employeeSearchText,
  setEmployeeSearchText,
  showEmployeeDropdown,
  setShowEmployeeDropdown,
  employeeSearchResults,
  employeeSearchLoading,
  selectedEmployeeIds,
  onSelectedEmployeeIdsChange,
  debouncedSearchEmployees
}) => {
  const { t } = useTranslation(translations)

  useCloseDropdownOnOutsideClick({
    containerClassName: 'employee-search-container',
    onOutsideClick: () => setShowEmployeeDropdown(false)
  })

  return (
    <div className="employee-search-container gba:relative gba:p-2">
      <input
        type="text"
        value={employeeSearchText}
        onChange={e => {
          setEmployeeSearchText(e.target.value)
          setShowEmployeeDropdown(true)
          debouncedSearchEmployees(e.target.value)
        }}
        onFocus={() => setShowEmployeeDropdown(true)}
        className="gba:h-8 gba:w-full gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
        placeholder={t('filter-search-employee')}
        data-testid="employee-search-input"
      />

      {showEmployeeDropdown && employeeSearchText.trim() && (
        <div className="gba:absolute gba:top-full gba:left-0 gba:right-0 gba:bg-background gba:border gba:border-gray-200 gba:rounded gba:shadow-lg gba:max-h-40 gba:overflow-y-auto gba:z-10">
          {employeeSearchLoading && (
            <div className="gba:p-2 gba:text-sm gba:text-gray-500">{t('employee-loading')}</div>
          )}
          {!employeeSearchLoading && employeeSearchResults.length === 0 && (
            <div className="gba:p-2 gba:text-sm gba:text-gray-500">{t('employee-no-results')}</div>
          )}
          {!employeeSearchLoading &&
            employeeSearchResults.length > 0 &&
            employeeSearchResults.map(employee => (
              <button
                key={employee.id}
                type="button"
                className={`gba:w-full gba:text-left gba:p-2 gba:text-sm gba:hover:bg-gray-100 gba:transition-colors ${
                  selectedEmployeeIds.includes(employee.id) ? 'gba:bg-blue-50 gba:text-blue-700' : 'gba:text-gray-700'
                }`}
                onClick={() => {
                  const nextSelectedEmployeeIds = selectedEmployeeIds.includes(employee.id)
                    ? selectedEmployeeIds.filter(id => id !== employee.id)
                    : [...selectedEmployeeIds, employee.id]
                  onSelectedEmployeeIdsChange(nextSelectedEmployeeIds)
                }}
                data-testid={`employee-option-${employee.id}`}
              >
                {employee.name}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}

export default EmployeeSearchFilter
