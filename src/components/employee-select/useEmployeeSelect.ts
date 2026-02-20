import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useEmployeeSearch } from '@/common/data/employee/useEmployeeSearch'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Query to fetch employee with all necessary fields for select
const GET_EMPLOYEE_FOR_SELECT = (id: string): string => {
  const safeId = (id || '').replaceAll('"', '')
  return `
    query GetEmployeeForSelect {
      Employee(where: { id: { _eq: "${safeId}" } }, limit: 1) {
        id
        userId
        pictureThumbnail
        displayName
        firstName
        lastName
        employeePosition {
          jobPosition {
            name
          }
          organizationalUnit {
            id
            name
          }
        }
      }
    }
  `
}

export interface UseEmployeeSelectProps {
  value?: string | null
  onValueChange?: (value: string | null) => void
  onEmployeeChange?: (employee: Employee | null) => void
  businessAppContext?: BusinessAppContextProps
  accessToken?: string
  initialEmployee?: Employee | null
  autoSelect?: 'current-user'
  // Manual mode props
  employees?: Employee[]
  onSearch?: (q: string) => void
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
}

export interface UseEmployeeSelectReturn {
  employees: Employee[]
  loading: boolean
  hasMore: boolean
  onSearch: (q: string) => void
  onLoadMore: () => void
  handleValueChange: (newValue: string | null) => void
  employeesWithInitial: Employee[]
}

export const useEmployeeSelect = ({
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
}: UseEmployeeSelectProps): UseEmployeeSelectReturn => {
  const token = accessToken || businessAppContext?.accessToken
  const graphqlClient = useGraphQLClient(token || '')
  const [currentUserEmployee, setCurrentUserEmployee] = useState<Employee | null>(null)
  const autoSelectDone = useRef(false)
  const initialSearchDone = useRef(false)

  const currentUserEmployeeId = businessAppContext?.userInfo?.employeeDetails?.employeeId
  // Auto-select ONLY if: autoSelect is set AND no initialEmployee (existing entity has owner)
  const shouldFetchCurrentUser = autoSelect === 'current-user' && !initialEmployee

  // Reset current user employee when initialEmployee becomes available
  useEffect(() => {
    if (initialEmployee && currentUserEmployee) {
      setCurrentUserEmployee(null)
      autoSelectDone.current = false
    }
  }, [initialEmployee, currentUserEmployee])

  // Fetch current user employee data ONLY if needed (autoSelect + no initialEmployee)
  useEffect(() => {
    if (!shouldFetchCurrentUser) return
    if (currentUserEmployee || !currentUserEmployeeId) return

    let cancelled = false

    const fetchCurrentUserEmployee = async () => {
      try {
        const query = GET_EMPLOYEE_FOR_SELECT(currentUserEmployeeId)
        const result = await graphqlClient.request<{ Employee: any[] }>(query)

        if (cancelled) return

        const employee = result.Employee?.[0]

        if (employee) {
          const employeeData: Employee = {
            id: employee.id,
            displayName: employee.displayName,
            firstName: employee.firstName,
            lastName: employee.lastName,
            pictureThumbnail: employee.pictureThumbnail,
            userId: employee.userId,
            employeePosition: {
              jobPosition: employee.employeePosition?.jobPosition,
              organizationalUnit: employee.employeePosition?.organizationalUnit
            }
          }
          setCurrentUserEmployee(employeeData)
        }
      } catch {
        // Silently fail - don't retry to prevent loops
      }
    }

    fetchCurrentUserEmployee()

    return () => {
      cancelled = true
    }
  }, [shouldFetchCurrentUser, currentUserEmployee, currentUserEmployeeId, token, graphqlClient])

  // Auto-select current user employee
  useEffect(() => {
    if (shouldFetchCurrentUser && !value && !autoSelectDone.current && currentUserEmployee && onValueChange) {
      onValueChange(currentUserEmployee.id)
      autoSelectDone.current = true

      // Also set employee object
      if (onEmployeeChange) {
        onEmployeeChange({
          ...currentUserEmployee,
          userId: currentUserEmployee.userId || businessAppContext?.userInfo?.id
        })
      }
    }
  }, [shouldFetchCurrentUser, value, currentUserEmployee, onValueChange, onEmployeeChange, businessAppContext])

  // Determine initial employee to display
  // Priority: initialEmployee (from entity) > currentUserEmployee (fetched for new entities)
  const effectiveInitialEmployee = initialEmployee || (shouldFetchCurrentUser ? currentUserEmployee : null)

  // Transform initialEmployee to search format (EmployeeLiteOption for useEmployeeSearch)
  const initialEmployeeForSearch = useMemo(() => {
    if (!effectiveInitialEmployee) return null
    return {
      id: effectiveInitialEmployee.id,
      displayName:
        effectiveInitialEmployee.displayName ||
        `${effectiveInitialEmployee.firstName || ''} ${effectiveInitialEmployee.lastName || ''}`.trim() ||
        'Unknown',
      firstName: effectiveInitialEmployee.firstName,
      lastName: effectiveInitialEmployee.lastName,
      userId: effectiveInitialEmployee.userId,
      pictureThumbnail: effectiveInitialEmployee.pictureThumbnail,
      organizationalUnitName: effectiveInitialEmployee.employeePosition?.organizationalUnit?.name,
      jobPositionName: effectiveInitialEmployee.employeePosition?.jobPosition?.name
    }
  }, [effectiveInitialEmployee])

  // Use hook if token available
  const {
    employees: hookEmployees,
    loading: hookLoading,
    hasMore: hookHasMore,
    error: hookError,
    search: hookSearch,
    loadMore: hookLoadMore
  } = useEmployeeSearch(token || '', initialEmployeeForSearch)

  // Transform EmployeeLiteOption[] from useEmployeeSearch to Employee[]
  const transformedEmployees = useMemo(() => {
    return hookEmployees.map(emp => ({
      id: emp.id,
      displayName: emp.displayName,
      firstName: emp.firstName,
      lastName: emp.lastName,
      userId: emp.userId,
      pictureThumbnail: emp.pictureThumbnail,
      employeePosition: {
        jobPosition: emp.jobPositionName ? { name: emp.jobPositionName } : undefined,
        organizationalUnit: emp.organizationalUnitName ? { name: emp.organizationalUnitName } : undefined
      }
    })) as Employee[]
  }, [hookEmployees])

  // Use hook data or manual props
  const employees = manualEmployees || transformedEmployees || []
  const loading = manualLoading ?? hookLoading ?? false
  const hasMore = manualHasMore ?? hookHasMore ?? false
  const onSearch = manualOnSearch || ((q: string) => hookSearch(q || ''))
  const onLoadMore = manualOnLoadMore || hookLoadMore

  // Handle value change - find and pass employee object
  const handleValueChange = useCallback(
    (newValue: string | null) => {
      onValueChange?.(newValue)

      if (onEmployeeChange) {
        const employee = employees.find(emp => emp.id === newValue)
        onEmployeeChange(employee || null)
      }
    },
    [onValueChange, onEmployeeChange, employees]
  )

  // Ensure initialEmployee is in options
  const employeesWithInitial = useMemo(() => {
    if (!effectiveInitialEmployee) {
      return employees
    }

    // Check if initialEmployee is already in the list
    const isInEmployees = employees.some(emp => emp.id === effectiveInitialEmployee.id)

    // If already in list, return as-is
    if (isInEmployees) {
      return employees
    }

    // If not in list, add it (important for update mode when employees list might be empty initially)
    return [effectiveInitialEmployee, ...employees]
  }, [employees, effectiveInitialEmployee, value])

  // Reset initial search flag when error is cleared or when value changes (e.g. open another company so we may need to load again)
  // NOTE: this effect must be defined BEFORE the trigger effect below so that on mount React runs it first,
  // ensuring initialSearchDone.current is false before the trigger sets it to true (effects run in definition order).
  useEffect(() => {
    if (hookError) {
      initialSearchDone.current = false
    }
  }, [hookError])
  useEffect(() => {
    initialSearchDone.current = false
  }, [value])

  // Trigger initial search - when list is empty, or when only one item (e.g. director prepended) so we load the rest
  const shouldTriggerInitialSearch =
    employees.length === 0 || (employees.length === 1 && value != null && employees.some(emp => emp.id === value))
  useEffect(() => {
    if (onSearch && shouldTriggerInitialSearch && !hookError && !initialSearchDone.current && !hookLoading) {
      initialSearchDone.current = true
      onSearch('')
    }
  }, [onSearch, shouldTriggerInitialSearch, hookError, hookLoading])

  return {
    employees,
    loading,
    hasMore,
    onSearch,
    onLoadMore,
    handleValueChange,
    employeesWithInitial
  }
}
