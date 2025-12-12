/**
 * User Management API Types
 */

export interface UserGroup {
  id: string
  name: string
  displayName: string
  description: string
  path: string
  roles: {
    data: string[]
  }
  children: string[]
  syncStatus: string
}

export interface User {
  id: string
  name: string
  givenName: string
  familyName: string
  middleName?: string
  nickname?: string
  preferredUsername?: string
  profile?: string
  picture?: string
  email: string
  emailVerified: boolean
  zoneInfo?: string
  locale?: string
  phoneNumber?: string
  phoneNumberVerified?: boolean
  active: boolean
  tenantId: string
  employeeId?: string
  groups?: UserGroup[]
  syncStatus?: string
  userSettings?: Record<string, string>
}

export interface PagingInfo {
  limit: number
  offset: number
  totalRecords: number
}

export interface GetUsersResponse {
  data: User[]
  paging: PagingInfo
}

export interface GetUsersParams {
  searchParam?: string
  offset?: number
  limit?: number
}
