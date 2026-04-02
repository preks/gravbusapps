import { useState, useCallback } from 'react'
import { useUserManagementClient } from '@/common/network/users/useUserManagementClient'
import type {
  RoleRecord,
  GetRolesParams,
  GetRolesResponse,
  CreateRolePayload,
  UpdateRolePayload,
  GetCompositeRolesResponse
} from '@/common/network/users/types'

const DEFAULT_PAGE_SIZE = 10

export interface UseRoleManagementReturn {
  roles: RoleRecord[]
  totalRecords: number
  loading: boolean
  error: string | null
  fetchRoles: (params?: GetRolesParams) => Promise<void>
  getRoleByName: (roleName: string) => Promise<RoleRecord>
  createRole: (payload: CreateRolePayload) => Promise<RoleRecord>
  updateRole: (roleName: string, payload: UpdateRolePayload) => Promise<RoleRecord>
  deleteRole: (roleName: string) => Promise<void>
  getCompositeRoles: (
    roleName: string,
    params?: { limit?: number; offset?: number }
  ) => Promise<GetCompositeRolesResponse>
  assignCompositeRoles: (roleName: string, roleNames: string[]) => Promise<void>
  removeCompositeRoles: (roleName: string) => Promise<void>
}

export const useRoleManagement = (accessToken: string): UseRoleManagementReturn => {
  const client = useUserManagementClient(accessToken)
  const [roles, setRoles] = useState<RoleRecord[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRoles = useCallback(
    async (params: GetRolesParams = {}) => {
      if (!accessToken) return
      setLoading(true)
      setError(null)
      try {
        const response: GetRolesResponse = await client.getRoles({
          limit: DEFAULT_PAGE_SIZE,
          ...params
        })
        setRoles(response.data ?? [])
        setTotalRecords(response.paging?.totalRecords ?? 0)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch roles'
        setError(message)
      } finally {
        setLoading(false)
      }
    },
    [accessToken, client]
  )

  const getRoleByName = useCallback(async (roleName: string) => client.getRoleByName(roleName), [client])

  const createRole = useCallback(async (payload: CreateRolePayload) => client.createRole(payload), [client])

  const updateRole = useCallback(
    async (roleName: string, payload: UpdateRolePayload) => client.updateRole(roleName, payload),
    [client]
  )

  const deleteRole = useCallback(async (roleName: string) => client.deleteRole(roleName), [client])

  const getCompositeRoles = useCallback(
    async (roleName: string, params?: { limit?: number; offset?: number }): Promise<GetCompositeRolesResponse> =>
      client.getCompositeRoles(roleName, params),
    [client]
  )

  const assignCompositeRoles = useCallback(
    async (roleName: string, roleNames: string[]): Promise<void> => client.assignCompositeRoles(roleName, roleNames),
    [client]
  )

  const removeCompositeRoles = useCallback(
    async (roleName: string): Promise<void> => client.removeCompositeRoles(roleName),
    [client]
  )

  return {
    roles,
    totalRecords,
    loading,
    error,
    fetchRoles,
    getRoleByName,
    createRole,
    updateRole,
    deleteRole,
    getCompositeRoles,
    assignCompositeRoles,
    removeCompositeRoles
  }
}
