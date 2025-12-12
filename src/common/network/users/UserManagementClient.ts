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
}

// Singleton instance
export const userManagementClient = new UserManagementClient()
