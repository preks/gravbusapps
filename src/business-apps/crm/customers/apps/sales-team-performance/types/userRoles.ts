export type UserRole = 'ceo' | 'manager' | 'individual';

export interface UserRoleContext {
  role: UserRole;
  canViewAllTeams: boolean;
  canViewTeam: boolean;
  canViewIndividuals: boolean;
  managedTeamId?: string;
  managedTeamName?: string;
}

export interface TeamInfo {
  id: string;
  name: string;
  managerId: string;
  memberCount: number;
  memberIds: string[];
}

export interface UserPermissions {
  viewAllTeams: boolean;
  viewOwnTeam: boolean;
  viewIndividuals: boolean;
  compareTeams: boolean;
  exportData: boolean;
}
