/** Hierarchical delegation tree for multi-agent collaboration visualization. */

export type DelegationStatus = 'running' | 'done' | 'failed'
export type DelegationKind = 'root' | 'subagent' | 'expert'

export interface DelegationNode {
  id: string
  name: string
  task: string
  status: DelegationStatus
  kind: DelegationKind
  parentId: string | null
  children: DelegationNode[]
  startedAt: string | null
  completedAt: string | null
  durationMs: number | null
  toolsUsed: string[]
}

export interface DelegationTreeResult {
  rootNode: DelegationNode
  flatNodes: DelegationNode[]
  hasMultipleAgents: boolean
}

export interface DelegationStats {
  total: number
  running: number
  done: number
  failed: number
}
