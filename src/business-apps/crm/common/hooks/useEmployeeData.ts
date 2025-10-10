import { useState, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface EmployeeData {
  id: string
  fullName: string
  firstName?: string
  lastName?: string
}

export const useEmployeeData = (accessToken: string) => {
  const [employeeCache, setEmployeeCache] = useState<Map<string, EmployeeData>>(new Map())
  const [loadingEmployees, setLoadingEmployees] = useState<Set<string>>(new Set())
  const graphQLClient = useGraphQLClient(accessToken)

  const fetchEmployee = useCallback(
    async (userId: string): Promise<EmployeeData | null> => {
      if (!userId) return null

      // Check cache first
      if (employeeCache.has(userId)) {
        return employeeCache.get(userId)!
      }

      // Check if already loading
      if (loadingEmployees.has(userId)) {
        return null
      }

      try {
        setLoadingEmployees(prev => new Set(prev).add(userId))

        const query = `
        query GetEmployeeByUserId($userId: String!) {
          Employee(where: {userId: {_eq: $userId}}) {
            id
            fullName
            firstName
            lastName
          }
        }
      `

        const result = await graphQLClient.request<{ Employee: EmployeeData[] }>(query, { userId })

        if (result.Employee && result.Employee.length > 0) {
          const employee = result.Employee[0]
          // Update cache using userId as key
          setEmployeeCache(prev => new Map(prev).set(userId, employee))
          return employee
        }

        // Cache empty result to avoid repeated requests
        const unknownEmployee: EmployeeData = { id: userId, fullName: 'Unknown' }
        setEmployeeCache(prev => new Map(prev).set(userId, unknownEmployee))
        return unknownEmployee
      } catch (error) {
        console.error('Error fetching employee by userId:', error)
        const unknownEmployee: EmployeeData = { id: userId, fullName: 'Unknown' }
        setEmployeeCache(prev => new Map(prev).set(userId, unknownEmployee))
        return unknownEmployee
      } finally {
        setLoadingEmployees(prev => {
          const newSet = new Set(prev)
          newSet.delete(userId)
          return newSet
        })
      }
    },
    [employeeCache, loadingEmployees, graphQLClient]
  )

  const getEmployeeDisplayName = useCallback(
    (userId: string): string => {
      if (!userId) return 'Unknown'

      const employee = employeeCache.get(userId)
      if (employee) {
        return employee.fullName || 'Unknown'
      }

      // Trigger fetch if not in cache
      fetchEmployee(userId)
      return 'Loading...'
    },
    [employeeCache, fetchEmployee]
  )

  return {
    fetchEmployee,
    getEmployeeDisplayName,
    employeeCache,
    isLoadingEmployee: (userId: string) => loadingEmployees.has(userId)
  }
}
