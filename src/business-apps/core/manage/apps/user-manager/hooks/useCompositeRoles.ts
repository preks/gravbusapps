import { useState, useCallback } from 'react'
import { useUserManagementClient } from '@/common/network/users/useUserManagementClient'
import type { RoleRecord, GetCompositeRolesResponse } from '@/common/network/users/types'

export interface UseCompositeRolesReturn {
  compositeRoles: RoleRecord[]
  loading: boolean
  error: string | null
  fetchCompositeRoles: (roleName: string, params?: { limit?: number; offset?: number }) => Promise<void>
  assignCompositeRoles: (roleName: string, roleNames: string[]) => Promise<void>
  removeCompositeRoles: (roleName: string) => Promise<void>
}

export const useCompositeRoles = (accessToken: string): UseCompositeRolesReturn => {
  const client = useUserManagementClient(accessToken)
  const [compositeRoles, setCompositeRoles] = useState<RoleRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCompositeRoles = useCallback(
    async (roleName: string, params?: { limit?: number; offset?: number }) => {
      if (!accessToken) return
      setLoading(true)
      setError(null)
      try {
        const response: GetCompositeRolesResponse = await client.getCompositeRoles(roleName, params)
        setCompositeRoles(response.data ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch composite roles')
      } finally {
        setLoading(false)
      }
    },
    [accessToken, client]
  )

  const assignCompositeRoles = useCallback(
    async (roleName: string, roleNames: string[]): Promise<void> => client.assignCompositeRoles(roleName, roleNames),
    [client]
  )

  const removeCompositeRoles = useCallback(
    async (roleName: string): Promise<void> => client.removeCompositeRoles(roleName),
    [client]
  )

  return { compositeRoles, loading, error, fetchCompositeRoles, assignCompositeRoles, removeCompositeRoles }
}
