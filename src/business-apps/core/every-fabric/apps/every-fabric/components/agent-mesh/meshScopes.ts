export type MeshScope = 'company' | 'user' | 'me' | 'session'

export interface MeshScopeConfig {
  key: MeshScope
  label: string
  description: string
}

export const MESH_SCOPES: MeshScopeConfig[] = [
  { key: 'company', label: 'Company', description: 'All sessions across the workspace' },
  { key: 'user', label: 'User Sessions', description: 'Sessions for a selected user' },
  { key: 'me', label: 'My Sessions', description: 'All your sessions' },
  { key: 'session', label: 'Current Session', description: 'Live or replayed session view' }
]

export function getScopeTitle(scope: MeshScope, userName?: string): string {
  switch (scope) {
    case 'company':
      return 'Company Agent Mesh'
    case 'user':
      return userName ? `Agent Mesh for ${userName}` : 'User Agent Mesh'
    case 'me':
      return 'My Agent Mesh'
    case 'session':
      return 'Session Agent Mesh'
  }
}

export function getScopeSubtitle(scope: MeshScope): string {
  switch (scope) {
    case 'company':
      return 'All agents, skills, and tools used across the workspace'
    case 'user':
      return 'Agents, skills, and tools used by this user'
    case 'me':
      return 'Agents, skills, and tools across your sessions'
    case 'session':
      return 'How your agents connect · replay the decision that produced a response'
  }
}
