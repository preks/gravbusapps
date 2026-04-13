/**
 * User Management API Types
 */

// ─── Paging ────────────────────────────────────────────────────────────────────

export interface PagingInfo {
  limit: number
  offset: number
  totalRecords: number
}

// ─── Users ─────────────────────────────────────────────────────────────────────

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

export interface GetUsersParams {
  searchParam?: string
  offset?: number
  limit?: number
  syncStatus?: 'SUCCESS' | 'PENDING' | 'ERROR'
}

export interface GetUsersResponse {
  data: User[]
  paging: PagingInfo
}

export interface CreateUserPayload {
  givenName: string
  familyName: string
  middleName?: string
  nickname?: string
  preferredUsername: string
  profile?: string
  email?: string
  locale?: string
  active?: boolean
  employeeId?: string
  password?: string
  groups?: string[]
}

export interface UpdateUserPayload {
  givenName?: string
  familyName?: string
  middleName?: string
  nickname?: string
  preferredUsername?: string
  profile?: string
  email?: string
  locale?: string
  active?: boolean
  employeeId?: string | null
  phoneNumber?: string
}

export interface UpsertPasswordPayload {
  password: string
}

export interface ActivateUserPayload {
  active: boolean
}

export interface UserProfilePayload {
  zoneInfo?: string
  locale?: string
  userSettings?: Record<string, string>
}

// ─── Groups ────────────────────────────────────────────────────────────────────

export interface GroupRecord {
  id: string
  name: string
  displayName: string
  description: string
  path: string
  roles: { data?: string[] }
  children: string[]
  syncStatus?: string
}

export interface GetGroupsParams {
  searchParam?: string
  offset?: number
  limit?: number
  syncStatus?: 'SUCCESS' | 'PENDING' | 'ERROR'
}

export interface GetGroupsResponse {
  data: GroupRecord[]
  paging: PagingInfo
}

export interface CreateGroupPayload {
  name: string
  displayName?: string
  description?: string
}

export interface UpdateGroupPayload {
  name?: string
  displayName?: string
  description?: string
}

export interface GroupMember {
  id: string
  givenName?: string
  familyName?: string
  name?: string
  email?: string
  employeeId?: string
}

export interface GetGroupMembersResponse {
  data: GroupMember[]
  paging?: PagingInfo
}

export interface GetGroupRolesResponse {
  data: RoleRecord[]
  paging?: PagingInfo
}

export interface GetGroupChildrenResponse {
  data: GroupRecord[]
  paging?: PagingInfo
}

export interface CreateSubGroupPayload {
  name: string
  displayName?: string
  description?: string
}

// ─── Roles ─────────────────────────────────────────────────────────────────────

export interface RoleRecord {
  id: string
  name: string
  description: string
  composite: boolean
  clientRole: boolean
  containerId: string
}

export interface GetRolesParams {
  searchParam?: string
  offset?: number
  limit?: number
  composite?: boolean
  includeRoles?: 'ALL' | 'BASE' | 'STANDARD'
}

export interface GetUserRolesResponse {
  data: RoleRecord[]
  paging?: PagingInfo
}

export interface GetCompositeRolesResponse {
  data: RoleRecord[]
  paging?: PagingInfo
}

export interface GetRolesResponse {
  data: RoleRecord[]
  paging: PagingInfo
}

export interface CreateRolePayload {
  name: string
  description?: string
}

export interface UpdateRolePayload {
  name?: string
  description?: string
}
