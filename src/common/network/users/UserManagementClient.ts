import { RestClient, type RequestOptions } from '../rest/RestClient'
import { env } from '@/common/env/EnvUtils'
import { setAccessTokenToAuthorizationHeader } from '../HeaderUtils'
import type {
  GetUsersResponse,
  GetUsersParams,
  User,
  CreateUserPayload,
  UpdateUserPayload,
  UpsertPasswordPayload,
  ActivateUserPayload,
  UserProfilePayload,
  GetGroupsParams,
  GetGroupsResponse,
  GroupRecord,
  CreateGroupPayload,
  UpdateGroupPayload,
  CreateSubGroupPayload,
  GetGroupMembersResponse,
  GetGroupRolesResponse,
  GetGroupChildrenResponse,
  GetRolesParams,
  GetRolesResponse,
  RoleRecord,
  CreateRolePayload,
  UpdateRolePayload,
  GetUserRolesResponse,
  GetCompositeRolesResponse
} from './types'

export class UserManagementClient extends RestClient {
  constructor() {
    const url: string = env('NEXT_PUBLIC_USER_MANAGEMENT_API') ?? ''
    super(url, {})
  }

  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {}
    }
    this.headers['Authorization'] = setAccessTokenToAuthorizationHeader(accessToken)
  }

  // ─── Users ───────────────────────────────────────────────────────────────────

  public async getUsers(
    params: GetUsersParams = {},
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<GetUsersResponse> {
    const { searchParam, offset, limit, syncStatus, ...restParams } = params
    const queryParams: Record<string, string | number> = { ...restParams }

    if (searchParam !== undefined && searchParam.trim() !== '') {
      queryParams.searchParam = searchParam.trim()
    }
    if (offset !== undefined) queryParams.offset = offset
    if (limit !== undefined) queryParams.limit = limit
    if (syncStatus !== undefined) queryParams.syncStatus = syncStatus

    try {
      return await this.get<GetUsersResponse>('/users', { ...options, params: queryParams })
    } catch (error) {
      console.error('UserManagementClient: Error fetching users:', error)
      throw error
    }
  }

  public async getUserById(userId: string, options: Omit<RequestOptions, 'body'> = {}): Promise<User> {
    try {
      return await this.get<User>(`/users/${userId}`, options)
    } catch (error) {
      console.error(`UserManagementClient: Error fetching user ${userId}:`, error)
      throw error
    }
  }

  public async searchUsers(searchQuery: string, limit: number = 20, offset: number = 0): Promise<GetUsersResponse> {
    return this.getUsers({ searchParam: searchQuery, limit, offset })
  }

  public async createUser(payload: CreateUserPayload): Promise<User> {
    return this.post<User>('/users', payload)
  }

  public async updateUser(userId: string, payload: UpdateUserPayload): Promise<User> {
    return this.put<User>(`/users/${userId}`, payload)
  }

  public async deleteUser(userId: string): Promise<void> {
    await this.delete(`/users/${userId}`)
  }

  public async upsertUserPassword(userId: string, payload: UpsertPasswordPayload): Promise<void> {
    await this.post(`/users/${userId}/upsert-password`, payload)
  }

  public async getUserGroups(
    userId: string,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<{ data: Array<{ id: string; name: string }> }> {
    try {
      const response = await this.get<
        { data: Array<{ id: string; name: string }> } | Array<{ id: string; name: string }>
      >(`/users/${userId}/groups`, options)
      if (Array.isArray(response)) return { data: response }
      return (response as { data: Array<{ id: string; name: string }> }) || { data: [] }
    } catch (error) {
      console.error('UserManagementClient: Error fetching user groups', error)
      return { data: [] }
    }
  }

  public async addGroupsToUser(userId: string, groupIds: string[]): Promise<void> {
    await this.post(`/users/${userId}/groups`, groupIds)
  }

  public async removeGroupsFromUser(userId: string, groupIds: string[]): Promise<void> {
    await this.delete(`/users/${userId}/groups`, { body: groupIds })
  }

  public async getUserRoles(
    userId: string,
    params: { limit?: number; offset?: number } = {},
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<GetUserRolesResponse> {
    const queryParams: Record<string, number> = {}
    if (params.limit != null) queryParams.limit = params.limit
    if (params.offset != null) queryParams.offset = params.offset
    try {
      const response = await this.get<GetUserRolesResponse | RoleRecord[]>(`/users/${userId}/roles`, {
        ...options,
        params: queryParams
      })
      if (Array.isArray(response)) return { data: response }
      const res = response
      return { data: res?.data ?? [], paging: res?.paging }
    } catch (error) {
      console.error('UserManagementClient: Error fetching user roles', error)
      return { data: [] }
    }
  }

  public async assignRolesToUser(userId: string, roleNames: string[]): Promise<void> {
    await this.post(`/users/${userId}/roles`, roleNames)
  }

  public async removeRolesFromUser(userId: string, roleNames: string[]): Promise<void> {
    await this.delete(`/users/${userId}/roles`, { body: roleNames })
  }

  public async activateUser(userId: string, payload: ActivateUserPayload): Promise<void> {
    await this.post(`/users/${userId}/activate-user`, payload)
  }

  public async updateUserProfile(userId: string, payload: UserProfilePayload): Promise<void> {
    await this.put(`/users-profile/${userId}`, payload)
  }

  public async resynchronizeUsers(userIds: string[]): Promise<void> {
    await this.put('/authorization/users', userIds)
  }

  // ─── Groups ──────────────────────────────────────────────────────────────────

  public async getGroups(
    params: GetGroupsParams = {},
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<GetGroupsResponse> {
    const queryParams: Record<string, string | number> = {}
    if (params.searchParam?.trim()) queryParams.searchParam = params.searchParam.trim()
    if (params.offset !== undefined) queryParams.offset = params.offset
    if (params.limit !== undefined) queryParams.limit = params.limit
    if (params.syncStatus !== undefined) queryParams.syncStatus = params.syncStatus

    try {
      const response = await this.get<GetGroupsResponse | GroupRecord[]>('/groups', {
        ...options,
        params: queryParams
      })
      if (Array.isArray(response)) {
        return { data: response, paging: { limit: response.length, offset: 0, totalRecords: response.length } }
      }
      return response
    } catch (error) {
      console.error('UserManagementClient: Error fetching groups', error)
      throw error
    }
  }

  public async getGroupById(groupId: string, options: Omit<RequestOptions, 'body'> = {}): Promise<GroupRecord> {
    return this.get<GroupRecord>(`/groups/${encodeURIComponent(groupId)}`, options)
  }

  public async createGroup(payload: CreateGroupPayload): Promise<GroupRecord> {
    return this.post<GroupRecord>('/groups', payload)
  }

  public async updateGroup(groupId: string, payload: UpdateGroupPayload): Promise<GroupRecord> {
    return this.put<GroupRecord>(`/groups/${encodeURIComponent(groupId)}`, payload)
  }

  public async deleteGroup(groupId: string): Promise<void> {
    await this.delete(`/groups/${encodeURIComponent(groupId)}`)
  }

  public async getGroupMembers(
    groupId: string,
    params?: { limit?: number; offset?: number },
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<GetGroupMembersResponse> {
    const queryParams: Record<string, number> = {}
    if (params?.limit != null) queryParams.limit = params.limit
    if (params?.offset != null) queryParams.offset = params.offset

    try {
      const response = await this.get<GetGroupMembersResponse | Array<{ id: string }>>(
        `/groups/${encodeURIComponent(groupId)}/users`,
        {
          ...options,
          params: queryParams
        }
      )
      if (Array.isArray(response)) return { data: response as GetGroupMembersResponse['data'] }
      const res = response
      return { data: res?.data ?? [], paging: res?.paging }
    } catch (error) {
      console.error('UserManagementClient: Error fetching group members', error)
      return { data: [] }
    }
  }

  public async addUsersToGroup(groupId: string, userIds: string[]): Promise<void> {
    await this.post(`/groups/${encodeURIComponent(groupId)}/users`, userIds)
  }

  public async removeUsersFromGroup(groupId: string, userIds: string[]): Promise<void> {
    await this.delete(`/groups/${encodeURIComponent(groupId)}/users`, { body: userIds })
  }

  public async getGroupRoles(
    groupId: string,
    params?: { limit?: number; offset?: number },
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<GetGroupRolesResponse> {
    const queryParams: Record<string, number> = {}
    if (params?.limit != null) queryParams.limit = params.limit
    if (params?.offset != null) queryParams.offset = params.offset

    try {
      const response = await this.get<GetGroupRolesResponse | RoleRecord[]>(
        `/groups/${encodeURIComponent(groupId)}/roles`,
        { ...options, params: queryParams }
      )
      if (Array.isArray(response)) return { data: response }
      const res = response
      return { data: res?.data ?? [], paging: res?.paging }
    } catch (error) {
      console.error('UserManagementClient: Error fetching group roles', error)
      return { data: [] }
    }
  }

  public async addRolesToGroup(groupId: string, roleNames: string[]): Promise<void> {
    await this.post(`/groups/${encodeURIComponent(groupId)}/roles`, roleNames)
  }

  public async removeRolesFromGroup(groupId: string, roleNames: string[]): Promise<void> {
    await this.delete(`/groups/${encodeURIComponent(groupId)}/roles`, { body: roleNames })
  }

  public async getGroupChildren(
    groupId: string,
    params?: { limit?: number; offset?: number },
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<GetGroupChildrenResponse> {
    const queryParams: Record<string, number> = {}
    if (params?.limit != null) queryParams.limit = params.limit
    if (params?.offset != null) queryParams.offset = params.offset

    try {
      const response = await this.get<GetGroupChildrenResponse | GroupRecord[]>(
        `/groups/${encodeURIComponent(groupId)}/children`,
        { ...options, params: queryParams }
      )
      if (Array.isArray(response)) return { data: response }
      const res = response
      return { data: res?.data ?? [], paging: res?.paging }
    } catch (error) {
      console.error('UserManagementClient: Error fetching group children', error)
      return { data: [] }
    }
  }

  public async assignSubGroup(groupId: string, payload: CreateSubGroupPayload): Promise<void> {
    await this.post(`/groups/${encodeURIComponent(groupId)}/children`, payload)
  }

  public async resynchronizeGroups(groupIds: string[]): Promise<void> {
    await this.put('/authorization/groups', groupIds)
  }

  // ─── Roles ───────────────────────────────────────────────────────────────────

  public async getRoles(
    params: GetRolesParams = {},
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<GetRolesResponse> {
    const queryParams: Record<string, string | number | boolean> = {}
    if (params.searchParam?.trim()) queryParams.searchParam = params.searchParam.trim()
    if (params.offset !== undefined) queryParams.offset = params.offset
    if (params.limit !== undefined) queryParams.limit = params.limit
    if (params.composite !== undefined) queryParams.composite = params.composite
    if (params.includeRoles !== undefined) queryParams.includeRoles = params.includeRoles

    try {
      const response = await this.get<GetRolesResponse | RoleRecord[]>('/roles', {
        ...options,
        params: queryParams
      })
      if (Array.isArray(response)) {
        return { data: response, paging: { limit: response.length, offset: 0, totalRecords: response.length } }
      }
      return response
    } catch (error) {
      console.error('UserManagementClient: Error fetching roles', error)
      throw error
    }
  }

  public async getRoleByName(roleName: string, options: Omit<RequestOptions, 'body'> = {}): Promise<RoleRecord> {
    return this.get<RoleRecord>(`/roles/${encodeURIComponent(roleName)}`, options)
  }

  public async createRole(payload: CreateRolePayload): Promise<RoleRecord> {
    return this.post<RoleRecord>('/roles', payload)
  }

  public async updateRole(roleName: string, payload: UpdateRolePayload): Promise<RoleRecord> {
    return this.put<RoleRecord>(`/roles/${encodeURIComponent(roleName)}`, payload)
  }

  public async deleteRole(roleName: string): Promise<void> {
    await this.delete(`/roles/${encodeURIComponent(roleName)}`)
  }

  public async getCompositeRoles(
    roleName: string,
    params: { limit?: number; offset?: number } = {},
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<GetCompositeRolesResponse> {
    const queryParams: Record<string, number> = {}
    if (params.limit != null) queryParams.limit = params.limit
    if (params.offset != null) queryParams.offset = params.offset
    try {
      const response = await this.get<GetCompositeRolesResponse | RoleRecord[]>(
        `/roles/${encodeURIComponent(roleName)}/composites`,
        { ...options, params: queryParams }
      )
      if (Array.isArray(response)) return { data: response }
      const res = response
      return { data: res?.data ?? [], paging: res?.paging }
    } catch (error) {
      console.error('UserManagementClient: Error fetching composite roles', error)
      return { data: [] }
    }
  }

  public async assignCompositeRoles(roleName: string, roleNames: string[]): Promise<void> {
    await this.post(`/roles/${encodeURIComponent(roleName)}/composites`, roleNames)
  }

  public async removeCompositeRoles(roleName: string): Promise<void> {
    await this.delete(`/roles/${encodeURIComponent(roleName)}/composites`)
  }

  // ─── Legacy compat ───────────────────────────────────────────────────────────

  /** @deprecated Use getGroupMembers instead */
  public async getGroupUsers(
    groupId: string,
    params?: { limit?: number; offset?: number },
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<GetGroupMembersResponse> {
    return this.getGroupMembers(groupId, params, options)
  }
}

export const userManagementClient = new UserManagementClient()
