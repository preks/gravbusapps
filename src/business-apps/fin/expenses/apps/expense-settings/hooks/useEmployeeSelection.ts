import { useState, useCallback, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetEmployeesForAssignment } from '../queries/ExpenseRuleQueries'

export interface EmployeeOption {
  id: string
  value: string
  label: string
  name: string
  firstName: string
  lastName: string
  email?: string
}

export interface UseEmployeeSelectionParams {
  pageSize?: number
}

export interface UseEmployeeSelectionState {
  employees: EmployeeOption[]
  isLoading: boolean
  error: string | null
  hasMore: boolean
  offset: number
  currentSearch: string
}

export const useEmployeeSelection = (
  context: BusinessAppContextProps,
  { pageSize = 20 }: UseEmployeeSelectionParams = {}
) => {
  const { fetchEmployees: fetchEmployeesFromQuery } = useGetEmployeesForAssignment(context)

  const [state, setState] = useState<UseEmployeeSelectionState>({
    employees: [],
    isLoading: false,
    error: null,
    hasMore: true,
    offset: 0,
    currentSearch: ''
  })

  const fetchEmployees = useCallback(
    async (search: string = '', offset: number = 0, append: boolean = false) => {
      if (!context.accessToken) {
        return
      }

      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        ...(append ? {} : { employees: [] })
      }))

      try {
        // For initial load (no search), or when search is 2+ characters
        const result = await fetchEmployeesFromQuery({
          search: search.length >= 2 ? search : undefined, // Pass undefined for initial load
          limit: pageSize,
          offset
        })

        // useGetEmployeesForAssignment now returns result directly, so result is { EmployeePosition: [...] }
        const employeeData = result?.EmployeePosition || []

        const mappedEmployees: EmployeeOption[] = employeeData.map((position: any) => {
          const fullName = `${position.firstName || ''} ${position.lastName || ''}`.trim()

          const mappedEmployee = {
            id: position.employeeId, // Use employeeId from position, not position.id
            value: position.employeeId,
            label: fullName,
            name: fullName,
            firstName: position.firstName,
            lastName: position.lastName,
            email: undefined // Email not available in Employee table
          }

          return mappedEmployee
        })

        const hasMoreRecords = mappedEmployees.length === pageSize

        setState(prev => {
          let updatedEmployees: EmployeeOption[]

          if (append) {
            // When appending, deduplicate by employeeId to prevent duplicates
            const existingIds = new Set(prev.employees.map(emp => emp.id))
            const newEmployees = mappedEmployees.filter(emp => !existingIds.has(emp.id))
            updatedEmployees = [...prev.employees, ...newEmployees]
          } else {
            updatedEmployees = mappedEmployees
          }

          return {
            ...prev,
            employees: updatedEmployees,
            isLoading: false,
            hasMore: hasMoreRecords,
            currentSearch: search,
            offset: append ? prev.offset + pageSize : pageSize
          }
        })
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch employees',
          employees: append ? prev.employees : []
        }))
      }
    },
    [context.accessToken, fetchEmployeesFromQuery, pageSize]
  )

  const loadMore = useCallback(() => {
    if (state.hasMore && !state.isLoading) {
      fetchEmployees(state.currentSearch, state.offset, true)
    }
  }, [fetchEmployees, state.hasMore, state.isLoading, state.currentSearch, state.offset])

  const search = useCallback(
    (searchTerm: string) => {
      fetchEmployees(searchTerm, 0, false)
    },
    [fetchEmployees]
  )

  const reset = useCallback(() => {
    setState({
      employees: [],
      isLoading: false,
      error: null,
      hasMore: true,
      offset: 0,
      currentSearch: ''
    })
  }, [])

  // Initial load
  useEffect(() => {
    if (context.accessToken) {
      fetchEmployees()
    }
  }, [context.accessToken, fetchEmployees])

  return {
    employees: state.employees,
    isLoading: state.isLoading,
    error: state.error,
    hasMore: state.hasMore,
    loadMore,
    search,
    reset
  }
}
