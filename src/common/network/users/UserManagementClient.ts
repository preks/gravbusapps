import { RestClient, type RequestOptions } from '../rest/RestClient'
import { env } from '@/common/env/EnvUtils'
import { setAccessTokenToAuthorizationHeader } from '../HeaderUtils'
import type { GetUsersResponse, GetUsersParams, User } from './types'

/**
 * Client for interacting with User Management API
 * Provides access to user data and search functionality
 */
export class UserManagementClient extends RestClient {
  constructor() {
    const url: string = env('NEXT_PUBLIC_USER_MANAGEMENT_API') ?? ''
    super(url, {})
  }

  /**
   * Set the access token for authentication
   * @param accessToken - The access token to use for authentication
   */
  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {}
    }

    this.headers['Authorization'] = setAccessTokenToAuthorizationHeader(accessToken)
  }

  /**
   * Get users with optional search and pagination
   * @param params - Query parameters (searchParam, offset, limit)
   * @param options - Additional request options
   * @returns Promise resolving to GetUsersResponse
   */
  public async getUsers(
    params: GetUsersParams = {},
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<GetUsersResponse> {
    const { searchParam, offset, limit, ...restParams } = params

    const queryParams: Record<string, string | number> = {
      ...restParams
    }

    if (searchParam !== undefined && searchParam.trim() !== '') {
      queryParams.searchParam = searchParam.trim()
    }

    if (offset !== undefined) {
      queryParams.offset = offset
    }

    if (limit !== undefined) {
      queryParams.limit = limit
    }

    try {
      return await this.get<GetUsersResponse>('/users', {
        ...options,
        params: queryParams
      })
    } catch (error) {
      console.error('UserManagementClient: Error fetching users:', error)
      throw error
    }
  }

  /**
   * Get a single user by ID
   * @param userId - The user ID to fetch
   * @param options - Additional request options
   * @returns Promise resolving to User
   */
  public async getUserById(userId: string, options: Omit<RequestOptions, 'body'> = {}): Promise<User> {
    try {
      return await this.get<User>(`/users/${userId}`, options)
    } catch (error) {
      console.error(`UserManagementClient: Error fetching user ${userId}:`, error)
      throw error
    }
  }

  /**
   * Search users by query string
   * Convenience method that wraps getUsers with search parameter
   * @param searchQuery - The search query string
   * @param limit - Maximum number of results (default: 20)
   * @param offset - Offset for pagination (default: 0)
   * @returns Promise resolving to GetUsersResponse
   */
  public async searchUsers(searchQuery: string, limit: number = 20, offset: number = 0): Promise<GetUsersResponse> {
    return this.getUsers({
      searchParam: searchQuery,
      limit,
      offset
    })
  }

  /**
   * Get groups from the User Management API (e.g. for resolving all-it-admin).
   * Uses same base URL as /users; path is /groups (api/v1 is already in base).
   * @param params - Optional searchParam, limit, offset
   * @returns Promise resolving to { data: Array<{ id: string; name: string }> } or similar
   */
  public async getGroups(params?: {
    searchParam?: string
    limit?: number
    offset?: number
  }): Promise<{ data: Array<{ id: string; name: string }> }> {
    try {
      const response = await this.get<
        { data: Array<{ id: string; name: string }> } | Array<{ id: string; name: string }>
      >('/groups', { params: params as Record<string, string | number> })
      if (Array.isArray(response)) {
        return { data: response }
      }
      return (response as { data: Array<{ id: string; name: string }> }) || { data: [] }
    } catch (error) {
      console.error('UserManagementClient: Error fetching groups', error)
      return { data: [] }
    }
  }

  /**
   * Get users (members) of a group by group ID.
   * API: GET /groups/:groupId/users?limit=10&offset=0
   * @param groupId - The group ID (from getGroups)
   * @param params - Optional limit, offset for pagination
   * @returns Promise resolving to list of users (id, givenName?, familyName?, name?, email?, employeeId?)
   */
  public async getGroupUsers(
    groupId: string,
    params?: { limit?: number; offset?: number },
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<{
    data: Array<{
      id: string
      givenName?: string
      familyName?: string
      name?: string
      email?: string
      employeeId?: string
    }>
    paging?: { totalRecords?: number; limit?: number; offset?: number }
  }> {
    try {
      const queryParams = {
        ...(params?.limit != null && { limit: params.limit }),
        ...(params?.offset != null && { offset: params.offset })
      }
      const response = await this.get<
        | {
            data: Array<{
              id: string
              givenName?: string
              familyName?: string
              name?: string
              email?: string
              employeeId?: string
            }>
            paging?: { totalRecords?: number; limit?: number; offset?: number }
          }
        | Array<{
            id: string
            givenName?: string
            familyName?: string
            name?: string
            email?: string
            employeeId?: string
          }>
      >(`/groups/${encodeURIComponent(groupId)}/users`, {
        ...options,
        params: queryParams as Record<string, number>
      })
      if (Array.isArray(response)) {
        return { data: response }
      }
      const res = response as { data?: any[]; paging?: any }
      return { data: res?.data ?? [], paging: res?.paging }
    } catch (error) {
      console.error('UserManagementClient: Error fetching group users', error)
      return { data: [] }
    }
  }
}

// Singleton instance
export const userManagementClient = new UserManagementClient()
