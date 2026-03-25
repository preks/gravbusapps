import React from 'react'
import { Combobox, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { Building2, Briefcase } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import { useEmployeeSelect } from './useEmployeeSelect'

export interface EmployeeSelectProps {
  value?: string | null
  onValueChange?: (value: string | null) => void
  onEmployeeChange?: (employee: Employee | null) => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  ['data-testid']?: string

  // Context
  businessAppContext?: BusinessAppContextProps
  accessToken?: string
  initialEmployee?: Employee | null
  autoSelect?: 'current-user'

  // Behavior
  /** If false, the dropdown will stay open after selecting an employee (useful for multi-add scenarios) */
  closeOnSelect?: boolean

  // Manual mode (for backward compatibility)
  employees?: Employee[]
  onSearch?: (q: string) => void
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
}

const EmployeeSelect = React.forwardRef<HTMLButtonElement, EmployeeSelectProps>(
  (
    {
      value,
      onValueChange,
      onEmployeeChange,
      placeholder = 'Search Employee...',
      searchPlaceholder = 'Type to search...',
      className,
      'data-testid': dataTestId = 'employee-select',
      businessAppContext,
      accessToken,
      initialEmployee,
      autoSelect,
      employees: manualEmployees,
      onSearch: manualOnSearch,
      loading: manualLoading,
      hasMore: manualHasMore,
      onLoadMore: manualOnLoadMore,
      ...rest
    },
    ref
  ) => {
    const { employeesWithInitial, loading, hasMore, onSearch, onLoadMore, handleValueChange } = useEmployeeSelect({
      value,
      onValueChange,
      onEmployeeChange,
      businessAppContext,
      accessToken,
      initialEmployee,
      autoSelect,
      employees: manualEmployees,
      onSearch: manualOnSearch,
      loading: manualLoading,
      hasMore: manualHasMore,
      onLoadMore: manualOnLoadMore
    })

    // Build options
    // Support both nested employeePosition and flat jobPositionName/organizationalUnitName (e.g. from useEmployeeSearch)
    const options = React.useMemo(() => {
      return employeesWithInitial.map(emp => {
        const initials = (emp.displayName || '?')
          .split(' ')
          .map(p => p[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()

        const empWithFlat = emp as Employee & { jobPositionName?: string; organizationalUnitName?: string }
        const orgName = emp.employeePosition?.organizationalUnit?.name ?? empWithFlat.organizationalUnitName
        const jobName = emp.employeePosition?.jobPosition?.name ?? empWithFlat.jobPositionName
        const hasPositionInfo = Boolean(orgName || jobName)

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
                {hasPositionInfo && (
                  <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2 gba:text-xs gba:text-left">
                    {orgName && (
                      <span className="gba:flex gba:items-center gba:gap-1">
                        <Building2 className="gba:w-3 gba:h-3" />
                        {orgName}
                      </span>
                    )}
                    {orgName && jobName && <span>·</span>}
                    {jobName && (
                      <span className="gba:flex gba:items-center gba:gap-1">
                        <Briefcase className="gba:w-3 gba:h-3" />
                        {jobName}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        }
      })
    }, [employeesWithInitial])

    return (
      <Combobox
        ref={ref as any}
        className={`gba:[&&]:h-auto ${className || ''}`}
        options={options as any}
        value={value || ''}
        onValueChange={handleValueChange}
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
