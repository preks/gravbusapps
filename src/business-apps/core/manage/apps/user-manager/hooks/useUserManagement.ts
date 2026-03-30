import { useState, useCallback } from 'react'
import { useUserManagementClient } from '@/common/network/users/useUserManagementClient'
import type {
  User,
  GetUsersParams,
  GetUsersResponse,
  CreateUserPayload,
  UpdateUserPayload,
  UpsertPasswordPayload,
  ActivateUserPayload,
  UserProfilePayload,
  GetUserRolesResponse
} from '@/common/network/users/types'

const DEFAULT_PAGE_SIZE = 20

export interface UseUserManagementReturn {
  users: User[]
  totalRecords: number
  loading: boolean
  error: string | null
  fetchUsers: (params?: GetUsersParams) => Promise<void>
  createUser: (payload: CreateUserPayload) => Promise<User>
  updateUser: (userId: string, payload: UpdateUserPayload) => Promise<User>
  deleteUser: (userId: string) => Promise<void>
  getUserById: (userId: string) => Promise<User>
  upsertPassword: (userId: string, payload: UpsertPasswordPayload) => Promise<void>
  activateUser: (userId: string, payload: ActivateUserPayload) => Promise<void>
  updateUserProfile: (userId: string, payload: UserProfilePayload) => Promise<void>
  resynchronizeUsers: (userIds: string[]) => Promise<void>
  getUserGroups: (userId: string) => Promise<{ data: Array<{ id: string; name: string }> }>
  addGroupsToUser: (userId: string, groupIds: string[]) => Promise<void>
  removeGroupsFromUser: (userId: string, groupIds: string[]) => Promise<void>
  getUserRoles: (userId: string, params?: { limit?: number; offset?: number }) => Promise<GetUserRolesResponse>
  assignRolesToUser: (userId: string, roleNames: string[]) => Promise<void>
  removeRolesFromUser: (userId: string, roleNames: string[]) => Promise<void>
}

export const useUserManagement = (accessToken: string): UseUserManagementReturn => {
  const client = useUserManagementClient(accessToken)
  const [users, setUsers] = useState<User[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(
    async (params: GetUsersParams = {}) => {
      if (!accessToken) return
      setLoading(true)
      setError(null)
      try {
        const response: GetUsersResponse = await client.getUsers({
          limit: DEFAULT_PAGE_SIZE,
          ...params
        })
        setUsers(response.data ?? [])
        setTotalRecords(response.paging?.totalRecords ?? 0)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch users'
        setError(message)
      } finally {
        setLoading(false)
      }
    },
    [accessToken, client]
  )

  const createUser = useCallback(
    async (payload: CreateUserPayload): Promise<User> => client.createUser(payload),
    [client]
  )

  const updateUser = useCallback(
    async (userId: string, payload: UpdateUserPayload): Promise<User> => client.updateUser(userId, payload),
    [client]
  )

  const deleteUser = useCallback(async (userId: string): Promise<void> => client.deleteUser(userId), [client])

  const getUserById = useCallback(async (userId: string): Promise<User> => client.getUserById(userId), [client])

  const upsertPassword = useCallback(
    async (userId: string, payload: UpsertPasswordPayload): Promise<void> => client.upsertUserPassword(userId, payload),
    [client]
  )

  const activateUser = useCallback(
    async (userId: string, payload: ActivateUserPayload): Promise<void> => client.activateUser(userId, payload),
    [client]
  )

  const updateUserProfile = useCallback(
    async (userId: string, payload: UserProfilePayload): Promise<void> => client.updateUserProfile(userId, payload),
    [client]
  )

  const resynchronizeUsers = useCallback(
    async (userIds: string[]): Promise<void> => client.resynchronizeUsers(userIds),
    [client]
  )

  const getUserGroups = useCallback(async (userId: string) => client.getUserGroups(userId), [client])

  const addGroupsToUser = useCallback(
    async (userId: string, groupIds: string[]) => client.addGroupsToUser(userId, groupIds),
    [client]
  )

  const removeGroupsFromUser = useCallback(
    async (userId: string, groupIds: string[]) => client.removeGroupsFromUser(userId, groupIds),
    [client]
  )

  const getUserRoles = useCallback(
    async (userId: string, params?: { limit?: number; offset?: number }): Promise<GetUserRolesResponse> =>
      client.getUserRoles(userId, params),
    [client]
  )

  const assignRolesToUser = useCallback(
    async (userId: string, roleNames: string[]): Promise<void> => client.assignRolesToUser(userId, roleNames),
    [client]
  )

  const removeRolesFromUser = useCallback(
    async (userId: string, roleNames: string[]): Promise<void> => client.removeRolesFromUser(userId, roleNames),
    [client]
  )

  return {
    users,
    totalRecords,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    getUserById,
    upsertPassword,
    activateUser,
    updateUserProfile,
    resynchronizeUsers,
    getUserGroups,
    addGroupsToUser,
    removeGroupsFromUser,
    getUserRoles,
    assignRolesToUser,
    removeRolesFromUser
  }
}
