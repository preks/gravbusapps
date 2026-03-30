import { useState, useCallback } from 'react'
import { useUserManagementClient } from '@/common/network/users/useUserManagementClient'
import type { RoleRecord, GetUserRolesResponse } from '@/common/network/users/types'

export interface UseUserRolesReturn {
  roles: RoleRecord[]
  loading: boolean
  error: string | null
  fetchUserRoles: (userId: string, params?: { limit?: number; offset?: number }) => Promise<void>
  assignRolesToUser: (userId: string, roleNames: string[]) => Promise<void>
  removeRolesFromUser: (userId: string, roleNames: string[]) => Promise<void>
}

export const useUserRoles = (accessToken: string): UseUserRolesReturn => {
  const client = useUserManagementClient(accessToken)
  const [roles, setRoles] = useState<RoleRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUserRoles = useCallback(
    async (userId: string, params?: { limit?: number; offset?: number }) => {
      if (!accessToken) return
      setLoading(true)
      setError(null)
      try {
        const response: GetUserRolesResponse = await client.getUserRoles(userId, params)
        setRoles(response.data ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch user roles')
      } finally {
        setLoading(false)
      }
    },
    [accessToken, client]
  )

  const assignRolesToUser = useCallback(
    async (userId: string, roleNames: string[]): Promise<void> => client.assignRolesToUser(userId, roleNames),
    [client]
  )

  const removeRolesFromUser = useCallback(
    async (userId: string, roleNames: string[]): Promise<void> => client.removeRolesFromUser(userId, roleNames),
    [client]
  )

  return { roles, loading, error, fetchUserRoles, assignRolesToUser, removeRolesFromUser }
}
