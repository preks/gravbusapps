import React, { useState, useEffect } from 'react'
import { Spinner, Alert, Badge } from '@newwork/nw-design-system'
import { UserRound, Trash2 } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetEmployeesWithOpportunities, Employee } from '../queries/employeeQueries'

interface EmployeeSelectorProps extends BusinessAppContextProps {
  sourceApp?: string
  selectedEmployeeIds?: string[]
  onEmployeeSelectionChange: (employeeIds: string[]) => void
  disabled?: boolean
}

export const EmployeeSelector: React.FC<EmployeeSelectorProps> = ({
  sourceApp,
  selectedEmployeeIds = [],
  onEmployeeSelectionChange,
  disabled = false,
  ...context
}) => {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const { fetchEmployeesWithOpportunities } = useGetEmployeesWithOpportunities(context)

  useEffect(() => {
    if (context.accessToken) {
      loadEmployees()
    }
  }, [context.accessToken, sourceApp])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (isOpen && !target.closest('[data-testid="employee-selector"]')) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const loadEmployees = async () => {
    setLoading(true)
    setError(null)

    try {
      const employeesData = await fetchEmployeesWithOpportunities(sourceApp)
      setEmployees(employeesData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employees')
    } finally {
      setLoading(false)
    }
  }

  const toggleEmployee = (employeeId: string) => {
    const next = selectedEmployeeIds.includes(employeeId)
      ? selectedEmployeeIds.filter(id => id !== employeeId)
      : [...selectedEmployeeIds, employeeId]
    onEmployeeSelectionChange(next)
  }

  if (error) {
    return (
      <Alert variant="destructive" className="gba:mb-2">
        <span>Error loading employees: {error}</span>
      </Alert>
    )
  }

  const selected = employees.filter(e => selectedEmployeeIds.includes(e.id))

  return (
    <div className="gba:relative gba:w-64" data-testid="employee-selector">
      {/* Trigger */}
      <div
        className={`gba:flex gba:flex-wrap gba:items-center gba:gap-1 gba:p-2 gba:border gba:border-gray-300 gba:rounded-md gba:bg-white gba:cursor-pointer gba:min-h-[40px] ${disabled || loading ? 'gba:bg-gray-50 gba:cursor-not-allowed' : 'gba:hover:border-gray-400'}`}
        data-testid="employee-selector-trigger"
        onClick={() => {
          if (!disabled && !loading) setIsOpen(prev => !prev)
        }}
      >
        <UserRound className="gba:h-4 gba:w-4 gba:text-gray-500 gba:flex-shrink-0" />
        {selected.map(emp => (
          <Badge key={emp.id} variant="secondary" className="gba:text-xs gba:flex gba:items-center gba:gap-1">
            {emp.displayName}
            <button
              className="gba:ml-1 gba:text-xs gba:hover:bg-gray-200 gba:rounded-full gba:w-4 gba:h-4 gba:flex gba:items-center gba:justify-center"
              onClick={e => {
                e.preventDefault()
                e.stopPropagation()
                toggleEmployee(emp.id)
              }}
              data-testid={`remove-employee-${emp.id}`}
            >
              ×
            </button>
          </Badge>
        ))}
        <div className="gba:flex-1 gba:flex gba:items-center gba:justify-between gba:min-w-0">
          {selectedEmployeeIds.length === 0 && (
            <span className="gba:text-gray-500 gba:text-sm">
              {loading ? 'Loading employees...' : 'Select employees'}
            </span>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="gba:absolute gba:top-full gba:left-0 gba:right-0 gba:mt-1 gba:bg-white gba:border gba:border-gray-300 gba:rounded-md gba:shadow-lg gba:max-h-60 gba:overflow-y-auto">
          {loading ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:p-4">
              <Spinner size="sm" />
              <span className="gba:ml-2 gba:text-sm gba:text-gray-500">Loading employees...</span>
            </div>
          ) : employees.length === 0 ? (
            <div className="gba:p-4 gba:text-sm gba:text-gray-500 gba:text-center">No employees found</div>
          ) : (
            <>
              {selectedEmployeeIds.length > 0 && (
                <div
                  className="gba:p-3 gba:text-sm gba:text-blue-600 gba:cursor-pointer gba:hover:bg-gray-50 gba:border-b gba:flex gba:items-center gba:gap-2"
                  onClick={() => onEmployeeSelectionChange([])}
                  data-testid="clear-all-employees"
                >
                  <Trash2 className="gba:h-4 gba:w-4" />
                  Clear all selections ({selectedEmployeeIds.length})
                </div>
              )}

              {employees.map(employee => (
                <div
                  key={employee.id}
                  className={`gba:flex gba:items-center gba:justify-between gba:p-3 gba:cursor-pointer gba:hover:bg-gray-50 ${selectedEmployeeIds.includes(employee.id) ? 'gba:bg-blue-50' : ''}`}
                  onClick={() => toggleEmployee(employee.id)}
                  data-testid={`employee-option-${employee.id}`}
                >
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <div
                      className={`gba:w-4 gba:h-4 gba:border gba:rounded ${selectedEmployeeIds.includes(employee.id) ? 'gba:bg-blue-600 gba:border-blue-600' : 'gba:border-gray-300'}`}
                    >
                      {selectedEmployeeIds.includes(employee.id) && (
                        <div className="gba:text-white gba:text-xs gba:text-center gba:leading-4">✓</div>
                      )}
                    </div>
                    <span className="gba:text-sm">{employee.displayName}</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default EmployeeSelector
