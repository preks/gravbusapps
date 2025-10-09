import React, { useState, useEffect, useCallback } from 'react'
import { Spinner, Alert, Badge } from '@newwork/nw-design-system'
import { UserRound, Trash2 } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface Employee {
  id: string
  firstName?: string
  lastName?: string
  displayName?: string
}

interface EmployeeSelectorProps extends BusinessAppContextProps {
  selectedEmployeeIds?: string[]
  onEmployeeSelectionChange: (employeeIds: string[]) => void
  disabled?: boolean
}

export const EmployeeSelector: React.FC<EmployeeSelectorProps> = ({
  selectedEmployeeIds = [],
  onEmployeeSelectionChange,
  disabled = false,
  ...context
}) => {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const graphqlClient = useGraphQLClient(context.accessToken)

  const loadEmployees = useCallback(async () => {
    if (!context.accessToken) return

    setLoading(true)
    setError(null)

    try {
      const query = `
        query GetEmployeesWithOpportunities {
          InvestmentOpportunity(
            where: { 
              isDeleted: { _eq: false }, 
              ownerEmployee: { id: { _isNull: false } } 
            }, 
            distinctOn: [ownerEmployeeId], 
            limit: 50
          ) {
            ownerEmployee {
              id
              firstName
              lastName
              displayName
            }
          }
        }
      `

      const result = await graphqlClient.request<{
        InvestmentOpportunity: Array<{
          ownerEmployee?: Employee | null
        }>
      }>(query)

      const uniqueEmployees = (result?.InvestmentOpportunity || [])
        .filter(item => item.ownerEmployee)
        .map(item => item.ownerEmployee!)
        .filter((employee, index, array) => array.findIndex(e => e.id === employee.id) === index)

      setEmployees(uniqueEmployees)
    } catch (err) {
      console.error('Error fetching employees:', err)
      setError(err instanceof Error ? err.message : 'Failed to load employees')
    } finally {
      setLoading(false)
    }
  }, [context.accessToken, graphqlClient])

  useEffect(() => {
    loadEmployees()
  }, [loadEmployees])

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

  const getEmployeeDisplayName = (employee: Employee): string => {
    if (employee.displayName) return employee.displayName
    if (employee.firstName || employee.lastName) {
      return `${employee.firstName || ''} ${employee.lastName || ''}`.trim()
    }
    return 'Unknown Employee'
  }

  const handleEmployeeToggle = (employeeId: string) => {
    const newSelection = selectedEmployeeIds.includes(employeeId)
      ? selectedEmployeeIds.filter(id => id !== employeeId)
      : [...selectedEmployeeIds, employeeId]

    console.log('👥 EmployeeSelector: Toggling employee:', employeeId, 'New selection:', newSelection)
    onEmployeeSelectionChange(newSelection)
  }

  const handleClearAll = () => {
    console.log('👥 EmployeeSelector: Clearing all selections')
    onEmployeeSelectionChange([])
  }

  if (error) {
    return (
      <Alert>
        <span>Error loading employees: {error}</span>
      </Alert>
    )
  }

  const selectedEmployees = employees.filter(emp => selectedEmployeeIds.includes(emp.id))

  return (
    <div className="gba:relative gba:w-64" data-testid="employee-selector">
      {/* Multi-select input field with chips */}
      <div
        className={`gba:flex gba:flex-wrap gba:items-center gba:gap-1 gba:p-2 gba:border gba:border-gray-300 gba:rounded-md gba:bg-white gba:cursor-pointer gba:min-h-[40px] ${disabled || loading ? 'gba:bg-gray-50 gba:cursor-not-allowed' : 'gba:hover:border-gray-400'}`}
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
        data-testid="employee-selector-trigger"
      >
        <UserRound className="gba:h-4 gba:w-4 gba:text-gray-500 gba:flex-shrink-0" />

        {/* Selected employee chips */}
        {selectedEmployees.map(employee => (
          <Badge
            key={employee.id}
            variant="secondary"
            className="gba:text-xs gba:flex gba:items-center gba:gap-1"
            data-testid={`selected-employee-chip-${employee.id}`}
          >
            {getEmployeeDisplayName(employee)}
            <button
              className="gba:ml-1 gba:text-xs gba:hover:bg-gray-200 gba:rounded-full gba:w-4 gba:h-4 gba:flex gba:items-center gba:justify-center"
              onClick={e => {
                e.preventDefault()
                e.stopPropagation()
                handleEmployeeToggle(employee.id)
              }}
              data-testid={`remove-employee-${employee.id}`}
            >
              ×
            </button>
          </Badge>
        ))}

        {/* Placeholder or dropdown icon */}
        <div className="gba:flex-1 gba:flex gba:items-center gba:justify-between gba:min-w-0">
          {selectedEmployeeIds.length === 0 && (
            <span className="gba:text-gray-500 gba:text-sm">
              {loading ? 'Loading employees...' : 'Select employees'}
            </span>
          )}
          <div className="gba:ml-auto gba:text-gray-400">{isOpen ? '▲' : '▼'}</div>
        </div>
      </div>

      {/* Dropdown content */}
      {isOpen && (
        <div className="gba:absolute gba:top-full gba:left-0 gba:right-0 gba:mt-1 gba:bg-white gba:border gba:border-gray-300 gba:rounded-md gba:shadow-lg gba:z-50 gba:max-h-60 gba:overflow-y-auto">
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
                <>
                  <div
                    className="gba:p-3 gba:text-sm gba:text-blue-600 gba:cursor-pointer gba:hover:bg-gray-50 gba:border-b gba:flex gba:items-center gba:gap-2"
                    onClick={e => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleClearAll()
                    }}
                    data-testid="clear-all-employees"
                  >
                    <Trash2 className="gba:h-4 gba:w-4" />
                    Clear all selections ({selectedEmployeeIds.length})
                  </div>
                </>
              )}

              {employees.map(employee => (
                <div
                  key={employee.id}
                  className={`gba:flex gba:items-center gba:justify-between gba:p-3 gba:cursor-pointer gba:hover:bg-gray-50 ${selectedEmployeeIds.includes(employee.id) ? 'gba:bg-blue-50' : ''}`}
                  onClick={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleEmployeeToggle(employee.id)
                  }}
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
                    <span className="gba:text-sm">{getEmployeeDisplayName(employee)}</span>
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
