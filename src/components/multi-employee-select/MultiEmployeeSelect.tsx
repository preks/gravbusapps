import React from 'react'
import { Combobox, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { Building2, Briefcase } from 'lucide-react'
import { useEmployeeSearch, type EmployeeLiteOption } from '@/common/data/employee/useEmployeeSearch'

export interface MultiEmployeeSelectProps {
  value?: string[]
  onValueChange?: (employeeIds: string[]) => void
  onEmployeesChange?: (employees: EmployeeLiteOption[]) => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  ['data-testid']?: string
  accessToken?: string
  initialEmployees?: EmployeeLiteOption[]
}

function getInitials(emp: EmployeeLiteOption) {
  return (emp.displayName || '?')
    .split(' ')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function employeeToOption(emp: EmployeeLiteOption) {
  const initials = getInitials(emp)
  const avatarBlock = (
    <Avatar className="gba:self-center" size="sm">
      {emp.pictureThumbnail ? (
        <AvatarImage src={`data:image/jpeg;base64,${emp.pictureThumbnail}`} alt={emp.displayName} />
      ) : (
        <AvatarFallback className="gba:text-xs">{initials}</AvatarFallback>
      )}
    </Avatar>
  )
  const optionLabel = (
    <div className="gba:flex gba:items-start gba:gap-3 gba:w-full">
      {avatarBlock}
      <div className="gba:flex gba:flex-col gba:min-w-0 gba:flex-1">
        <div className="gba:text-sm gba:font-medium gba:truncate gba:text-left">{emp.displayName}</div>
        {(emp.organizationalUnitName || emp.jobPositionName) && (
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2 gba:text-xs gba:text-left">
            {emp.organizationalUnitName && (
              <span className="gba:flex gba:items-center gba:gap-1">
                <Building2 className="gba:w-3 gba:h-3" />
                {emp.organizationalUnitName}
              </span>
            )}
            {emp.organizationalUnitName && emp.jobPositionName && <span>·</span>}
            {emp.jobPositionName && (
              <span className="gba:flex gba:items-center gba:gap-1">
                <Briefcase className="gba:w-3 gba:h-3" />
                {emp.jobPositionName}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
  const chipLabel = (
    <span className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
      <Avatar size="sm" className="gba:h-4 gba:w-4 gba:flex-shrink-0">
        {emp.pictureThumbnail ? (
          <AvatarImage src={`data:image/jpeg;base64,${emp.pictureThumbnail}`} alt={emp.displayName} />
        ) : (
          <AvatarFallback className="gba:text-[10px]">{initials}</AvatarFallback>
        )}
      </Avatar>
      <span className="gba:truncate">{emp.displayName || emp.id}</span>
    </span>
  )
  return {
    value: emp.id,
    label: chipLabel,
    optionLabel
  }
}

function unresolvedEmployeeToOption(id: string) {
  const label = <span className="gba:text-muted-foreground">Employee unavailable</span>

  return {
    value: id,
    label,
    optionLabel: label
  }
}

function syncSelectedEmployees(
  currentById: Map<string, EmployeeLiteOption>,
  selectedIds: string[],
  sourceById: Map<string, EmployeeLiteOption>
) {
  const nextById = new Map<string, EmployeeLiteOption>()
  let changed = currentById.size !== selectedIds.length

  selectedIds.forEach(id => {
    const employee = sourceById.get(id) ?? currentById.get(id)

    if (!employee) return

    nextById.set(id, employee)

    if (currentById.get(id) !== employee) {
      changed = true
    }
  })

  return changed ? nextById : currentById
}

const MultiEmployeeSelect = React.forwardRef<HTMLDivElement, MultiEmployeeSelectProps>(
  (
    {
      value = [],
      onValueChange,
      onEmployeesChange,
      placeholder = 'Add assignees...',
      searchPlaceholder = 'Type to search employees...',
      className,
      'data-testid': dataTestId = 'multi-employee-select',
      accessToken,
      initialEmployees = []
    },
    ref
  ) => {
    const { employees, loading, hasMore, search, loadMore, hydrateById } = useEmployeeSearch(accessToken)
    const initialSearchDoneRef = React.useRef(false)
    const hydratedIdsRef = React.useRef(new Set<string>())
    const [selectedEmployeesById, setSelectedEmployeesById] = React.useState<Map<string, EmployeeLiteOption>>(
      () => new Map()
    )

    React.useEffect(() => {
      if (!accessToken || initialSearchDoneRef.current) return
      initialSearchDoneRef.current = true
      search('')
    }, [accessToken, search])

    const mergedById = React.useMemo(() => {
      const map = new Map<string, EmployeeLiteOption>()
      initialEmployees.forEach(e => map.set(e.id, e))
      selectedEmployeesById.forEach(e => map.set(e.id, e))
      employees.forEach(e => map.set(e.id, e))
      return map
    }, [initialEmployees, selectedEmployeesById, employees])

    React.useEffect(() => {
      setSelectedEmployeesById(currentById => syncSelectedEmployees(currentById, value, mergedById))
    }, [mergedById, value])

    React.useEffect(() => {
      if (!accessToken) return

      value.forEach(id => {
        if (!id || mergedById.has(id) || hydratedIdsRef.current.has(id)) return

        hydratedIdsRef.current.add(id)
        hydrateById(id)
      })
    }, [accessToken, hydrateById, mergedById, value])

    const options = React.useMemo(() => {
      const list = Array.from(mergedById.values()).map(employeeToOption)
      const valueIds = new Set(value || [])
      const existingValues = new Set(list.map(o => o.value))
      valueIds.forEach(id => {
        if (!existingValues.has(id)) {
          list.push(unresolvedEmployeeToOption(id))
        }
      })
      return list
    }, [mergedById, value])

    const handleValueChange = React.useCallback(
      (ids: string[]) => {
        setSelectedEmployeesById(currentById => syncSelectedEmployees(currentById, ids, mergedById))
        onValueChange?.(ids)
        if (onEmployeesChange) {
          const resolved = ids
            .map(id => mergedById.get(id) ?? ({ id, displayName: 'Employee unavailable' } as EmployeeLiteOption))
            .filter(Boolean)
          onEmployeesChange(resolved)
        }
      },
      [onValueChange, onEmployeesChange, mergedById]
    )

    return (
      <div
        ref={ref}
        className={
          className
            ? `gba:min-w-0 gba:w-full gba:max-w-full gba:overflow-hidden ${className}`
            : 'gba:min-w-0 gba:w-full gba:max-w-full gba:overflow-hidden'
        }
        data-testid={dataTestId}
      >
        <Combobox
          mode="multiple"
          value={value ?? []}
          onValueChange={handleValueChange}
          options={options}
          placeholder={placeholder}
          searchPlaceholder={searchPlaceholder}
          emptyText={loading ? 'Loading...' : 'No employees found'}
          onSearch={search}
          searchDebounce={300}
          loading={Boolean(loading)}
          onLoadMore={loadMore}
          hasMore={Boolean(hasMore)}
          align="start"
          showClearButton
          data-testid={`${dataTestId}-combobox`}
          className="gba:[&&]:h-auto"
        />
      </div>
    )
  }
)

MultiEmployeeSelect.displayName = 'MultiEmployeeSelect'

export default MultiEmployeeSelect
