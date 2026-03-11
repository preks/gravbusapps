import React, { useMemo, useState } from 'react'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Input } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { filterOptionsByName } from '../../../hooks/queryFilterUtils'

interface DepartmentOption {
  readonly id: string
  readonly name: string
}

interface DepartmentSelectFilterProps {
  readonly departmentId: string
  readonly onDepartmentChange: (id: string) => void
  readonly departmentOptions: readonly DepartmentOption[]
  readonly testIdPrefix: string
}

const DepartmentSelectFilter: React.FC<DepartmentSelectFilterProps> = ({
  departmentId,
  onDepartmentChange,
  departmentOptions,
  testIdPrefix
}) => {
  const [search, setSearch] = useState('')
  const filtered = useMemo(
    () => filterOptionsByName(departmentOptions as DepartmentOption[], search),
    [departmentOptions, search]
  )

  return (
    <div className="gba:w-full">
      <Select
        value={departmentId || 'all'}
        onValueChange={value => {
          onDepartmentChange(value === 'all' ? '' : value)
          setSearch('')
        }}
        data-testid={`${testIdPrefix}-department-select`}
      >
        <SelectTrigger className="gba:border-border">
          <SelectValue
            placeholder={getTranslationFromI18nKeyAndLabel(
              'lowcoder:backoffice_expense_landing_page.department_placeholder',
              'Select department'
            )}
          />
        </SelectTrigger>
        <SelectContent>
          <div className="gba:p-2">
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.search_departments',
                'Search departments...'
              )}
              className="gba:w-full gba:h-8 gba:rounded gba:border gba:border-input gba:px-2 gba:text-sm"
              data-testid={`${testIdPrefix}-department-search-input`}
            />
          </div>
          <SelectItem value="all" data-testid={`${testIdPrefix}-department-option-all`}>
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_request_list.expense_request_filter.all_departments',
              'All Departments'
            )}
          </SelectItem>
          {filtered.map(option => (
            <SelectItem
              key={option.id}
              value={option.id}
              data-testid={`${testIdPrefix}-department-option-${option.id}`}
            >
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default DepartmentSelectFilter
