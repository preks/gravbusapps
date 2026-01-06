import React from 'react'
import { Combobox, Avatar, AvatarImage, AvatarFallback, Badge, Button } from '@newwork/nw-design-system'
import { Building2, Briefcase, X } from 'lucide-react'
import { useEmployeeSearch, type EmployeeLiteOption } from '@/common/data/employee/useEmployeeSearch'

export interface MultiEmployeeSelectProps {
  value?: string[] // Array of employee IDs
  onValueChange?: (employeeIds: string[]) => void
  onEmployeesChange?: (employees: EmployeeLiteOption[]) => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  ['data-testid']?: string

  // Context
  accessToken?: string
  initialEmployees?: EmployeeLiteOption[]
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
    const [selectedEmployees, setSelectedEmployees] = React.useState<EmployeeLiteOption[]>(initialEmployees)
    const initializedRef = React.useRef(false)

    // Use employee search hook
    const { employees, loading, hasMore, search, loadMore } = useEmployeeSearch(accessToken)

    // Unified sync effect - makes this a proper controlled component
    React.useEffect(() => {
      // On first mount, if value is empty but initialEmployees has data, initialize from initialEmployees
      if (!initializedRef.current && value.length === 0 && initialEmployees.length > 0) {
        setSelectedEmployees(initialEmployees)
        initializedRef.current = true
        return
      }

      // After initialization, always sync selectedEmployees with value prop (source of truth)
      if (initializedRef.current) {
        // Build employee objects from value IDs
        const newSelectedEmployees: EmployeeLiteOption[] = []

        for (const empId of value) {
          // Check selectedEmployees first (already have full data)
          let employee = selectedEmployees.find(e => e.id === empId)

          // Then check initialEmployees
          if (!employee) {
            employee = initialEmployees.find(e => e.id === empId)
          }

          // Then check employees from search results
          if (!employee) {
            employee = employees.find(e => e.id === empId)
          }

          if (employee) {
            newSelectedEmployees.push(employee)
          }
        }

        // Only update if the IDs changed (prevent unnecessary re-renders)
        const currentIds = selectedEmployees
          .map(e => e.id)
          .sort()
          .join(',')
        const newIds = newSelectedEmployees
          .map(e => e.id)
          .sort()
          .join(',')

        if (currentIds !== newIds) {
          setSelectedEmployees(newSelectedEmployees)
        }
      } else if (value.length > 0) {
        // If value has data on first render, mark as initialized
        initializedRef.current = true
      }
    }, [value, initialEmployees, employees, selectedEmployees])

    const handleAdd = React.useCallback(
      (employeeId: string) => {
        const employee = employees.find(e => e.id === employeeId)
        if (employee && !selectedEmployees.find(e => e.id === employeeId)) {
          const newSelected = [...selectedEmployees, employee]
          setSelectedEmployees(newSelected)
          onValueChange?.(newSelected.map(e => e.id))
          onEmployeesChange?.(newSelected)
        }
      },
      [employees, selectedEmployees, onValueChange, onEmployeesChange]
    )

    const handleRemove = React.useCallback(
      (employeeId: string) => {
        const newSelected = selectedEmployees.filter(e => e.id !== employeeId)
        setSelectedEmployees(newSelected)
        onValueChange?.(newSelected.map(e => e.id))
        onEmployeesChange?.(newSelected)
      },
      [selectedEmployees, onValueChange, onEmployeesChange]
    )

    // Build options for combobox (exclude already selected)
    const options = React.useMemo(() => {
      return employees
        .filter(emp => !selectedEmployees.find(s => s.id === emp.id))
        .map(emp => {
          const initials = (emp.displayName || '?')
            .split(' ')
            .map(p => p[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()

          return {
            value: emp.id,
            label: (
              <div className="gba:flex gba:items-start gba:gap-3 gba:w-full">
                <Avatar className="gba:self-center" size="sm">
                  {emp.pictureThumbnail ? (
                    <AvatarImage src={`data:image/jpeg;base64,${emp.pictureThumbnail}`} alt={emp.displayName} />
                  ) : (
                    <AvatarFallback className="gba:text-xs">{initials}</AvatarFallback>
                  )}
                </Avatar>
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
          }
        })
    }, [employees, selectedEmployees])

    return (
      <div ref={ref} className={`gba:space-y-2 ${className || ''}`} data-testid={dataTestId}>
        {/* Selected Employees - Display as badges */}
        {selectedEmployees.length > 0 && (
          <div className="gba:flex gba:flex-wrap gba:gap-2" data-testid={`${dataTestId}-selected`}>
            {selectedEmployees.map(employee => {
              const initials = (employee.displayName || '?')
                .split(' ')
                .map(p => p[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()

              return (
                <Badge
                  key={employee.id}
                  variant="secondary"
                  className="gba:flex gba:items-center gba:gap-1.5 gba:pr-1.5 gba:pl-1 gba:py-0.5 gba:h-7"
                  data-testid={`${dataTestId}-badge-${employee.id}`}
                >
                  <Avatar size="sm" className="gba:h-5 gba:w-5">
                    {employee.pictureThumbnail ? (
                      <AvatarImage
                        src={`data:image/jpeg;base64,${employee.pictureThumbnail}`}
                        alt={employee.displayName}
                      />
                    ) : (
                      <AvatarFallback className="gba:text-[10px]">{initials}</AvatarFallback>
                    )}
                  </Avatar>
                  <span className="gba:text-xs gba:leading-none">{employee.displayName}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="gba:h-4 gba:w-4 gba:p-0 gba:ml-0.5 gba:rounded-full hover:gba:bg-destructive hover:gba:text-destructive-foreground"
                    onClick={() => handleRemove(employee.id)}
                    data-testid={`${dataTestId}-remove-${employee.id}`}
                  >
                    <X className="gba:h-2.5 gba:w-2.5" />
                  </Button>
                </Badge>
              )
            })}
          </div>
        )}

        {/* Employee Combobox for adding */}
        <Combobox
          className="gba:[&&]:h-auto"
          options={options as any}
          value=""
          onValueChange={handleAdd}
          placeholder={placeholder}
          searchPlaceholder={searchPlaceholder}
          emptyText={loading ? 'Loading...' : 'No employees found'}
          onSearch={search}
          searchDebounce={300}
          loading={Boolean(loading)}
          onLoadMore={loadMore}
          hasMore={Boolean(hasMore)}
          data-testid={`${dataTestId}-combobox`}
          align="start"
        />
      </div>
    )
  }
)

MultiEmployeeSelect.displayName = 'MultiEmployeeSelect'

export default MultiEmployeeSelect
