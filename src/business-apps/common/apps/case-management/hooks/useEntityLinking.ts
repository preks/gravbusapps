/**
 * useEntityLinking Hook
 *
 * Hook for managing entity linking (users, employees, org units)
 */

import { useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/business-apps/types'
import { OrgDirectoryClient } from '@/common/network/org-directory/OrgDirectoryClient'

export interface EntityOption {
  id: string
  name: string
  type: 'user' | 'employee' | 'organizationalUnit'
  metadata?: any
}

export const useEntityLinking = (context: BusinessAppContextProps) => {
  const [searchResults, setSearchResults] = useState<EntityOption[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const orgClient = new OrgDirectoryClient(context.accessToken)

  /**
   * Search for entities (users, employees, org units)
   */
  const searchEntities = useCallback(
    async (
      query: string,
      entityTypes: ('user' | 'employee' | 'organizationalUnit')[] = ['user', 'employee', 'organizationalUnit']
    ) => {
      if (!query.trim()) {
        setSearchResults([])
        return
      }

      try {
        setIsSearching(true)
        setError(null)

        const results: EntityOption[] = []

        // Search users
        if (entityTypes.includes('user')) {
          try {
            const users = await orgClient.searchUsers(query)
            results.push(
              ...users.map(user => ({
                id: user.id || user.userId,
                name: user.displayName || user.email || 'Unknown User',
                type: 'user' as const,
                metadata: user
              }))
            )
          } catch (err) {
            console.warn('Failed to search users:', err)
          }
        }

        // Search employees
        if (entityTypes.includes('employee')) {
          try {
            const employees = await orgClient.getEmployees()
            const filteredEmployees = employees.filter(
              emp =>
                emp.displayName?.toLowerCase().includes(query.toLowerCase()) ||
                emp.email?.toLowerCase().includes(query.toLowerCase())
            )
            results.push(
              ...filteredEmployees.map(emp => ({
                id: emp.id || emp.employeeId,
                name: emp.displayName || emp.email || 'Unknown Employee',
                type: 'employee' as const,
                metadata: emp
              }))
            )
          } catch (err) {
            console.warn('Failed to search employees:', err)
          }
        }

        // Search organizational units
        if (entityTypes.includes('organizationalUnit')) {
          try {
            const orgUnits = await orgClient.getOrganizationalUnits()
            const filteredOrgUnits = orgUnits.filter(ou => ou.name?.toLowerCase().includes(query.toLowerCase()))
            results.push(
              ...filteredOrgUnits.map(ou => ({
                id: ou.id,
                name: ou.name || 'Unknown Unit',
                type: 'organizationalUnit' as const,
                metadata: ou
              }))
            )
          } catch (err) {
            console.warn('Failed to search organizational units:', err)
          }
        }

        setSearchResults(results)
      } catch (err) {
        console.error('Error searching entities:', err)
        setError(err instanceof Error ? err : new Error('Failed to search entities'))
      } finally {
        setIsSearching(false)
      }
    },
    [context.accessToken]
  )

  /**
   * Get entity by ID
   */
  const getEntityById = useCallback(
    async (entityId: string, entityType: 'user' | 'employee' | 'organizationalUnit'): Promise<EntityOption | null> => {
      try {
        switch (entityType) {
          case 'user': {
            const user = await orgClient.getUserById(entityId)
            if (user) {
              return {
                id: user.id || user.userId,
                name: user.displayName || user.email || 'Unknown User',
                type: 'user',
                metadata: user
              }
            }
            break
          }
          case 'employee': {
            const employees = await orgClient.getEmployees()
            const employee = employees.find(e => e.id === entityId || e.employeeId === entityId)
            if (employee) {
              return {
                id: employee.id || employee.employeeId,
                name: employee.displayName || employee.email || 'Unknown Employee',
                type: 'employee',
                metadata: employee
              }
            }
            break
          }
          case 'organizationalUnit': {
            const orgUnits = await orgClient.getOrganizationalUnits()
            const orgUnit = orgUnits.find(ou => ou.id === entityId)
            if (orgUnit) {
              return {
                id: orgUnit.id,
                name: orgUnit.name || 'Unknown Unit',
                type: 'organizationalUnit',
                metadata: orgUnit
              }
            }
            break
          }
        }
        return null
      } catch (err) {
        console.error('Error getting entity by ID:', err)
        return null
      }
    },
    [context.accessToken]
  )

  return {
    searchResults,
    isSearching,
    error,
    searchEntities,
    getEntityById
  }
}
