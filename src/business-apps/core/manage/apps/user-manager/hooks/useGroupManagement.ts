import { useState, useCallback } from 'react'
import { useUserManagementClient } from '@/common/network/users/useUserManagementClient'
import type {
  GroupRecord,
  GetGroupsParams,
  GetGroupsResponse,
  CreateGroupPayload,
  UpdateGroupPayload,
  CreateSubGroupPayload,
  GetGroupMembersResponse,
  GetGroupRolesResponse,
  GetGroupChildrenResponse
} from '@/common/network/users/types'

const DEFAULT_PAGE_SIZE = 10

export interface UseGroupManagementReturn {
  groups: GroupRecord[]
  totalRecords: number
  loading: boolean
  error: string | null
  fetchGroups: (params?: GetGroupsParams) => Promise<void>
  getGroupById: (groupId: string) => Promise<GroupRecord>
  createGroup: (payload: CreateGroupPayload) => Promise<GroupRecord>
  updateGroup: (groupId: string, payload: UpdateGroupPayload) => Promise<GroupRecord>
  deleteGroup: (groupId: string) => Promise<void>
  resynchronizeGroups: (groupIds: string[]) => Promise<void>
  getGroupMembers: (groupId: string, params?: { limit?: number; offset?: number }) => Promise<GetGroupMembersResponse>
  addUsersToGroup: (groupId: string, userIds: string[]) => Promise<void>
  removeUsersFromGroup: (groupId: string, userIds: string[]) => Promise<void>
  getGroupRoles: (groupId: string, params?: { limit?: number; offset?: number }) => Promise<GetGroupRolesResponse>
  addRolesToGroup: (groupId: string, roleNames: string[]) => Promise<void>
  removeRolesFromGroup: (groupId: string, roleNames: string[]) => Promise<void>
  getGroupChildren: (groupId: string, params?: { limit?: number; offset?: number }) => Promise<GetGroupChildrenResponse>
  assignSubGroup: (groupId: string, payload: CreateSubGroupPayload) => Promise<void>
}

export const useGroupManagement = (accessToken: string): UseGroupManagementReturn => {
  const client = useUserManagementClient(accessToken)
  const [groups, setGroups] = useState<GroupRecord[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchGroups = useCallback(
    async (params: GetGroupsParams = {}) => {
      if (!accessToken) return
      setLoading(true)
      setError(null)
      try {
        const response: GetGroupsResponse = await client.getGroups({
          limit: DEFAULT_PAGE_SIZE,
          ...params
        })
        setGroups(response.data ?? [])
        setTotalRecords(response.paging?.totalRecords ?? 0)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch groups'
        setError(message)
      } finally {
        setLoading(false)
      }
    },
    [accessToken, client]
  )

  const getGroupById = useCallback(async (groupId: string) => client.getGroupById(groupId), [client])

  const createGroup = useCallback(async (payload: CreateGroupPayload) => client.createGroup(payload), [client])

  const updateGroup = useCallback(
    async (groupId: string, payload: UpdateGroupPayload) => client.updateGroup(groupId, payload),
    [client]
  )

  const deleteGroup = useCallback(async (groupId: string) => client.deleteGroup(groupId), [client])

  const getGroupMembers = useCallback(
    async (groupId: string, params?: { limit?: number; offset?: number }) => client.getGroupMembers(groupId, params),
    [client]
  )

  const addUsersToGroup = useCallback(
    async (groupId: string, userIds: string[]) => client.addUsersToGroup(groupId, userIds),
    [client]
  )

  const removeUsersFromGroup = useCallback(
    async (groupId: string, userIds: string[]) => client.removeUsersFromGroup(groupId, userIds),
    [client]
  )

  const getGroupRoles = useCallback(
    async (groupId: string, params?: { limit?: number; offset?: number }) => client.getGroupRoles(groupId, params),
    [client]
  )

  const addRolesToGroup = useCallback(
    async (groupId: string, roleNames: string[]) => client.addRolesToGroup(groupId, roleNames),
    [client]
  )

  const removeRolesFromGroup = useCallback(
    async (groupId: string, roleNames: string[]) => client.removeRolesFromGroup(groupId, roleNames),
    [client]
  )

  const getGroupChildren = useCallback(
    async (groupId: string, params?: { limit?: number; offset?: number }) => client.getGroupChildren(groupId, params),
    [client]
  )

  const assignSubGroup = useCallback(
    async (groupId: string, payload: CreateSubGroupPayload) => client.assignSubGroup(groupId, payload),
    [client]
  )

  const resynchronizeGroups = useCallback(async (groupIds: string[]) => client.resynchronizeGroups(groupIds), [client])

  return {
    groups,
    totalRecords,
    loading,
    error,
    fetchGroups,
    getGroupById,
    createGroup,
    updateGroup,
    deleteGroup,
    resynchronizeGroups,
    getGroupMembers,
    addUsersToGroup,
    removeUsersFromGroup,
    getGroupRoles,
    addRolesToGroup,
    removeRolesFromGroup,
    getGroupChildren,
    assignSubGroup
  }
}
