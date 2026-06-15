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
  managerId?: string
  memberCount: number
  memberIds: string[]
  members?: TeamMember[]
}

export type TeamsTabKey = 'comparison' | 'list'

/** @deprecated Use TeamsTabKey */
export type TeamsSubTab = TeamsTabKey

export interface TeamListItem {
  id: string
  name: string
  memberCount: number
  totalSales: number
  currencyCode: string
}
