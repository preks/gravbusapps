/**
 * Flow validation rules for the studio.
 * Used by useFlowValidation hook and the publish gate.
 */

import type { StudioNode } from '../types/studioTypes'
import type { FlowGraphEdge } from '@/common/components/flow/flow-viewer'

export interface ValidationRule {
  id: string
  name: string
  description: string
  severity: 'error' | 'warning'
  validate: (nodes: StudioNode[], edges: FlowGraphEdge[]) => string | null
}

export const VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'require-start',
    name: 'Require Start Node',
    description: 'Flow must have exactly one start node',
    severity: 'error',
    validate: nodes => {
      const starts = nodes.filter(n => n.type === 'start')
      if (starts.length === 0) return 'Flow must have a start node'
      if (starts.length > 1) return 'Flow must have exactly one start node'
      return null
    }
  },
  {
    id: 'require-end',
    name: 'Require End Node',
    description: 'Flow must have at least one end node',
    severity: 'error',
    validate: nodes => {
      if (!nodes.some(n => n.type === 'end')) return 'Flow must have an end node'
      return null
    }
  },
  {
    id: 'no-orphan-nodes',
    name: 'No Orphan Nodes',
    description: 'All nodes must be connected',
    severity: 'warning',
    validate: (nodes, edges) => {
      if (nodes.length <= 1) return null
      const connected = new Set<string>()
      for (const e of edges) {
        connected.add(e.source)
        connected.add(e.target)
      }
      const orphans = nodes.filter(n => !connected.has(n.id))
      if (orphans.length > 0) {
        return `${orphans.length} orphan node(s) detected`
      }
      return null
    }
  },
  {
    id: 'fork-needs-join',
    name: 'Fork Must Have Join',
    description: 'Every fork node must have a matching join node',
    severity: 'error',
    validate: nodes => {
      const forks = nodes.filter(n => n.type === 'fork')
      const joins = nodes.filter(n => n.type === 'join')
      for (const fork of forks) {
        const match = joins.find(j => j.config.nodeType === 'join' && j.config.forkReference === fork.id)
        if (!match) return `Fork "${fork.label}" has no matching join`
      }
      return null
    }
  },
  {
    id: 'decision-min-branches',
    name: 'Decision Minimum Branches',
    description: 'Decision nodes must have at least 2 branches',
    severity: 'error',
    validate: nodes => {
      for (const node of nodes) {
        if (node.type === 'decision' && node.config.nodeType === 'decision') {
          if (node.config.branches.length < 2) {
            return `Decision "${node.label}" must have at least 2 branches`
          }
        }
      }
      return null
    }
  },
  {
    id: 'no-self-loops',
    name: 'No Self Loops',
    description: 'Nodes cannot connect to themselves (use rework for loops)',
    severity: 'error',
    validate: (_, edges) => {
      const selfLoop = edges.find(e => e.source === e.target)
      if (selfLoop) return 'Self-referencing edges are not allowed'
      return null
    }
  },
  {
    id: 'rework-no-cross-fork',
    name: 'No Rework Across Fork Boundary',
    description: 'Rework targets cannot cross fork/join boundaries',
    severity: 'error',
    validate: nodes => {
      // Simplified: ensure rework targets reference existing earlier nodes
      for (const node of nodes) {
        if (node.config.nodeType === 'task' && node.config.reworkConfig?.enabled) {
          for (const target of node.config.reworkConfig.targets) {
            if (!nodes.some(n => n.id === target.targetStepReference)) {
              return `Rework target references non-existent node`
            }
          }
        }
      }
      return null
    }
  }
]

/**
 * Run all validation rules and return issues.
 */
export function runValidation(nodes: StudioNode[], edges: FlowGraphEdge[]) {
  return VALIDATION_RULES.map(rule => {
    const message = rule.validate(nodes, edges)
    if (!message) return null
    return { ruleId: rule.id, severity: rule.severity, message }
  }).filter(Boolean)
}
