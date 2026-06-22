export type MeshScope = 'company' | 'user' | 'me' | 'session'

export interface MeshScopeConfig {
  key: MeshScope
  labelKey: string
  descriptionKey: string
}

export const MESH_SCOPES: MeshScopeConfig[] = [
  { key: 'company', labelKey: 'agent-mesh-scope-company', descriptionKey: 'agent-mesh-scope-desc-company' },
  { key: 'user', labelKey: 'agent-mesh-scope-user', descriptionKey: 'agent-mesh-scope-desc-user' },
  { key: 'me', labelKey: 'agent-mesh-scope-me', descriptionKey: 'agent-mesh-scope-desc-me' },
  { key: 'session', labelKey: 'agent-mesh-scope-session', descriptionKey: 'agent-mesh-scope-desc-session' }
]
