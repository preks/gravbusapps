import React from 'react'
import { Combobox, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { Building2, Briefcase } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useEmployeeSelect, type UseEmployeeSelectReturn } from './useEmployeeSelect'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'

export interface EmployeeOption {
  id: string
  displayName: string
  pictureThumbnail?: string
  organizationalUnitName?: string
  jobPositionName?: string
}

export interface EmployeeSelectProps {
  value?: string | null
  onValueChange?: (value: string | null) => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  ['data-testid']?: string

  // Optional: Use hook internally or pass data manually
  businessAppContext?: BusinessAppContextProps
  initialEmployee?: Employee | null // Initial employee to display (from entity data or current user)

  // Manual mode: Pass data directly (for backward compatibility)
  employees?: EmployeeOption[]
  onSearch?: (q: string) => void
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
}

const EmployeeSelect = React.forwardRef<HTMLButtonElement, EmployeeSelectProps & Record<string, any>>(
  (
    {
      value,
      onValueChange,
      placeholder = 'Search Employee...',
      searchPlaceholder = 'Type to search...',
      className,
      'data-testid': dataTestId = 'employee-select',
      businessAppContext,
      initialEmployee,
      // Manual mode props (for backward compatibility)
      employees: manualEmployees,
      onSearch: manualOnSearch,
      loading: manualLoading,
      hasMore: manualHasMore,
      onLoadMore: manualOnLoadMore,
      ...rest
    },
    ref
  ) => {
    // Use hook if businessAppContext is provided
    const hookData: UseEmployeeSelectReturn | null = businessAppContext
      ? useEmployeeSelect({ businessAppContext, initialEmployee, currentValue: value })
      : null

    // Use hook data if available, otherwise fall back to manual props
    const employees = hookData?.employees || manualEmployees || []
    const loading = hookData?.loading ?? manualLoading ?? false
    const hasMore = hookData?.hasMore ?? manualHasMore ?? false
    const onSearch = hookData?.onSearch || manualOnSearch
    const onLoadMore = hookData?.onLoadMore || manualOnLoadMore

    // Track if initial search was done
    const initialSearchDone = React.useRef(false)

    // Trigger initial search when onSearch becomes available
    React.useEffect(() => {
      if (onSearch && !initialSearchDone.current) {
        onSearch('')
        initialSearchDone.current = true
      }
    }, [onSearch])
    // Ensure initialEmployee is included in options if it exists and matches value
    const employeesWithInitial = React.useMemo(() => {
      if (!initialEmployee || !value) {
        return employees
      }
      // Check if initialEmployee is already in employees
      const isInEmployees = employees.some(emp => emp.id === initialEmployee.id)
      if (isInEmployees) {
        return employees
      }
      // Add initialEmployee to employees if it matches the current value
      if (value === initialEmployee.id) {
        return [
          {
            id: initialEmployee.id,
            displayName:
              initialEmployee.displayName ||
              `${initialEmployee.firstName || ''} ${initialEmployee.lastName || ''}`.trim() ||
              'Unknown',
            pictureThumbnail: initialEmployee.pictureThumbnail,
            organizationalUnitName: initialEmployee.employeePosition?.organizationalUnit?.name,
            jobPositionName: initialEmployee.employeePosition?.jobPosition?.name
          },
          ...employees
        ]
      }
      return employees
    }, [employees, initialEmployee, value])

    const options: any[] = React.useMemo(() => {
      return (employeesWithInitial || []).map((a: EmployeeOption) => {
        const initials = (a.displayName || '?')
          .split(' ')
          .map((p: string) => p[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()
        const hasOU = Boolean(a.organizationalUnitName)
        const hasJP = Boolean(a.jobPositionName)
        return {
          value: a.id,
          label: (
            <div className="gba:flex gba:items-start gba:gap-3 gba:w-full">
              <Avatar className="gba:self-center" size="sm">
                {a.pictureThumbnail ? (
                  <AvatarImage src={`data:image/jpeg;base64,${a.pictureThumbnail}`} alt={a.displayName} />
                ) : (
                  <AvatarFallback className="gba:text-xs">{initials}</AvatarFallback>
                )}
              </Avatar>
              <div className="gba:flex gba:flex-col gba:min-w-0 gba:flex-1">
                <div className="gba:text-sm gba:font-medium gba:truncate gba:text-left">{a.displayName}</div>
                <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2 gba:text-xs gba:text-left">
                  {hasOU ? (
                    <span className="gba:flex gba:items-center gba:gap-1">
                      <Building2 className="gba:w-3 gba:h-3" />
                      {a.organizationalUnitName}
                    </span>
                  ) : (
                    <span className="gba:opacity-0">&nbsp;</span>
                  )}
                  {hasOU && hasJP && <span>·</span>}
                  {hasJP ? (
                    <span className="gba:flex gba:items-center gba:gap-1">
                      <Briefcase className="gba:w-3 gba:h-3" />
                      {a.jobPositionName}
                    </span>
                  ) : (
                    <span className="gba:opacity-0">&nbsp;</span>
                  )}
                </div>
              </div>
            </div>
          )
        } as any
      })
    }, [employeesWithInitial])

    return (
      <Combobox
        ref={ref as any}
        className={`gba:[&&]:h-auto ${className || ''}`}
        options={options as any}
        value={value || ''}
        onValueChange={onValueChange}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyText={loading ? 'Loading...' : 'No employees found'}
        onSearch={onSearch}
        searchDebounce={300}
        loading={Boolean(loading)}
        onLoadMore={onLoadMore}
        hasMore={Boolean(hasMore)}
        data-testid={dataTestId}
        align="start"
        {...rest}
      />
    )
  }
)

EmployeeSelect.displayName = 'EmployeeSelect'

export default EmployeeSelect
