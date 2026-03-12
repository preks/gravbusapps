import React, { useMemo, useState } from 'react'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Input } from '@newwork/nw-design-system'
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
  readonly t: (key: string) => string
}

const DepartmentSelectFilter: React.FC<DepartmentSelectFilterProps> = ({
  departmentId,
  onDepartmentChange,
  departmentOptions,
  testIdPrefix,
  t
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
          <SelectValue placeholder={t('filter-select-department')} />
        </SelectTrigger>
        <SelectContent>
          <div className="gba:p-2">
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={t('filter-search-departments')}
              className="gba:w-full gba:h-8 gba:rounded gba:border gba:border-input gba:px-2 gba:text-sm"
              data-testid={`${testIdPrefix}-department-search-input`}
            />
          </div>
          <SelectItem value="all" data-testid={`${testIdPrefix}-department-option-all`}>
            {t('filter-all-departments')}
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
