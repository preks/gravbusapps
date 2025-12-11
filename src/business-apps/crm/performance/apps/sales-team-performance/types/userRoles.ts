export type UserRole = 'ceo' | 'manager' | 'individual'

export interface UserRoleContext {
  role: UserRole
  canViewAllTeams: boolean
  canViewTeam: boolean
  canViewIndividuals: boolean
  managedTeamId?: string
  managedTeamName?: string
}

export interface TeamMember {
  employeeId: string
  firstName: string
  lastName: string
  fullName: string
}

export interface TeamInfo {
  id: string
  name: string
  code?: string
  type?: string
  description?: string
  managerId?: string // Optional for backwards compatibility
  memberCount: number
  memberIds: string[]
  members?: TeamMember[] // Optional: Full member details
}

export interface UserPermissions {
  viewAllTeams: boolean
  viewOwnTeam: boolean
  viewIndividuals: boolean
  compareTeams: boolean
  exportData: boolean
}
