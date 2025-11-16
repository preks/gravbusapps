import React, { useEffect, useRef } from 'react'
import { EmployeeSelect } from '@/components/employee-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_LIGHT_BY_ID } from '@/common/data/employee/queries/employeeQueries'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'

export interface OwnerSelectProps {
  value?: string | null
  onValueChange?: (value: string | null) => void
  placeholder?: string
  className?: string
  ['data-testid']?: string

  businessAppContext: BusinessAppContextProps
  ownerEmployee?: Employee | null
  isNewEntity?: boolean
}

/**
 * OwnerSelect - Employee Select with auto-selection of current user
 *
 * Simple logic:
 * - If ownerEmployee provided: use it
 * - If new entity + no owner: fetch current user employee and auto-select
 * - Always allow searching/selecting other employees
 */
export const OwnerSelect: React.FC<OwnerSelectProps> = ({
  value,
  onValueChange,
  placeholder = 'Select owner...',
  className,
  'data-testid': dataTestId,
  businessAppContext,
  ownerEmployee,
  isNewEntity = false
}) => {
  const graphqlClient = useGraphQLClient(businessAppContext.accessToken)
  const [currentUserEmployee, setCurrentUserEmployee] = React.useState<Employee | null>(null)
  const [loading, setLoading] = React.useState(false)
  const autoSelectDone = useRef(false)

  // CRITICAL: Determine if we need to fetch BEFORE any rendering/effects
  const shouldFetchCurrentUser = isNewEntity && !ownerEmployee

  // Reset current user employee when owner becomes available
  useEffect(() => {
    if (ownerEmployee && currentUserEmployee) {
      console.log('🧹 OwnerSelect: Clearing current user (owner is now available)')
      setCurrentUserEmployee(null)
      autoSelectDone.current = false
    }
  }, [ownerEmployee, currentUserEmployee])

  // Fetch current user employee data ONLY if needed (new entity + no owner)
  useEffect(() => {
    // Early exit if we don't need current user
    if (!shouldFetchCurrentUser) {
      console.log('⏭️ OwnerSelect: Skipping current user fetch', { isNewEntity, hasOwner: !!ownerEmployee })
      return
    }

    // Already have current user or already loading
    if (currentUserEmployee || loading) return

    const currentUserEmployeeId = businessAppContext.userInfo?.employeeDetails?.employeeId
    if (!currentUserEmployeeId) return

    const fetchCurrentUserEmployee = async () => {
      console.log('🔄 OwnerSelect: Fetching current user employee', currentUserEmployeeId)
      setLoading(true)
      try {
        const query = GET_EMPLOYEE_LIGHT_BY_ID(currentUserEmployeeId)
        const result = await graphqlClient.request<{ Employee: any[] }>(query)
        const employee = result.Employee?.[0]

        if (employee) {
          const employeeData: Employee = {
            id: employee.id,
            displayName: employee.displayName,
            firstName: employee.firstName,
            lastName: employee.lastName,
            pictureThumbnail: employee.pictureThumbnail,
            employeePosition: {
              jobPosition: employee.employeePosition?.jobPosition,
              organizationalUnit: employee.employeePosition?.organizationalUnit
            }
          }

          console.log('✅ OwnerSelect: Fetched current user employee', employeeData)
          setCurrentUserEmployee(employeeData)
        }
      } catch (error) {
        console.error('❌ OwnerSelect: Failed to fetch current user employee', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCurrentUserEmployee()
  }, [
    shouldFetchCurrentUser,
    currentUserEmployee,
    loading,
    businessAppContext,
    graphqlClient,
    isNewEntity,
    ownerEmployee
  ])

  // Auto-select current user employee
  useEffect(() => {
    if (shouldFetchCurrentUser && !value && !autoSelectDone.current && currentUserEmployee && onValueChange) {
      console.log('✅ OwnerSelect: Auto-selecting current user', currentUserEmployee.id)
      onValueChange(currentUserEmployee.id)
      autoSelectDone.current = true
    }
  }, [shouldFetchCurrentUser, value, currentUserEmployee, onValueChange])

  // Determine initial employee to display
  // Priority: ownerEmployee (from entity) > currentUserEmployee (fetched for new entities)
  const initialEmployee = ownerEmployee || (shouldFetchCurrentUser ? currentUserEmployee : null)

  console.log('🎯 OwnerSelect: Initial employee decision', {
    hasOwner: !!ownerEmployee,
    shouldFetch: shouldFetchCurrentUser,
    hasCurrentUser: !!currentUserEmployee,
    finalInitial: !!initialEmployee
  })

  return (
    <EmployeeSelect
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      className={className}
      data-testid={dataTestId}
      businessAppContext={businessAppContext}
      initialEmployee={initialEmployee}
    />
  )
}
