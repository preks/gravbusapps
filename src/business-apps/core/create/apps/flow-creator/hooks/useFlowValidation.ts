/**
 * useFlowValidation - Real-time flow validation hook.
 * Detects orphan nodes, missing connections, invalid configurations,
 * and structural issues like fork without join.
 */

import { useMemo } from 'react'
import { useFlowStudioStore } from './useFlowStudioStore'
import type { StudioNode } from '../types/studioTypes'
import type { FlowGraphEdge } from '@/common/components/flow/flow-viewer'

export type ValidationSeverity = 'error' | 'warning' | 'info'

export interface ValidationIssue {
  id: string
  nodeId?: string
  edgeId?: string
  severity: ValidationSeverity
  message: string
  rule: string
}

function validateFlow(nodes: StudioNode[], edges: FlowGraphEdge[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  let issueId = 0

  const nodeIds = new Set(nodes.map(n => n.id))
  const nodeMap = new Map(nodes.map(n => [n.id, n]))

  // 1. Must have exactly one start node
  const startNodes = nodes.filter(n => n.type === 'start')
  if (startNodes.length === 0) {
    issues.push({
      id: `v-${issueId++}`,
      severity: 'error',
      message: 'Flow must have a start node',
      rule: 'require-start'
    })
  } else if (startNodes.length > 1) {
    for (const sn of startNodes.slice(1)) {
      issues.push({
        id: `v-${issueId++}`,
        nodeId: sn.id,
        severity: 'error',
        message: 'Only one start node is allowed',
        rule: 'single-start'
      })
    }
  }

  // 2. Must have at least one end node
  const endNodes = nodes.filter(n => n.type === 'end')
  if (endNodes.length === 0) {
    issues.push({
      id: `v-${issueId++}`,
      severity: 'error',
      message: 'Flow must have an end node',
      rule: 'require-end'
    })
  }

  // 3. Orphan detection: nodes with no incoming or outgoing forward edges
  const hasIncoming = new Set<string>()
  const hasOutgoing = new Set<string>()

  for (const edge of edges) {
    if (edge.direction === 'forward') {
      hasIncoming.add(edge.target)
      hasOutgoing.add(edge.source)
    }
  }

  for (const node of nodes) {
    if (node.type === 'start') {
      // Start node only needs outgoing
      if (!hasOutgoing.has(node.id) && nodes.length > 1) {
        issues.push({
          id: `v-${issueId++}`,
          nodeId: node.id,
          severity: 'warning',
          message: `"${node.label}" has no outgoing connections`,
          rule: 'orphan-no-outgoing'
        })
      }
    } else if (node.type === 'end') {
      // End node only needs incoming
      if (!hasIncoming.has(node.id) && nodes.length > 1) {
        issues.push({
          id: `v-${issueId++}`,
          nodeId: node.id,
          severity: 'warning',
          message: `"${node.label}" has no incoming connections`,
          rule: 'orphan-no-incoming'
        })
      }
    } else {
      // Other nodes need both
      if (!hasIncoming.has(node.id) && nodes.length > 1) {
        issues.push({
          id: `v-${issueId++}`,
          nodeId: node.id,
          severity: 'warning',
          message: `"${node.label}" has no incoming connections`,
          rule: 'orphan-no-incoming'
        })
      }
      if (!hasOutgoing.has(node.id)) {
        issues.push({
          id: `v-${issueId++}`,
          nodeId: node.id,
          severity: 'warning',
          message: `"${node.label}" has no outgoing connections`,
          rule: 'orphan-no-outgoing'
        })
      }
    }
  }

  // 4. Decision nodes must have at least 2 branches
  for (const node of nodes) {
    if (node.type === 'decision' && node.config.nodeType === 'decision') {
      if (node.config.branches.length < 2) {
        issues.push({
          id: `v-${issueId++}`,
          nodeId: node.id,
          severity: 'error',
          message: `Decision "${node.label}" must have at least 2 branches`,
          rule: 'decision-min-branches'
        })
      }
    }
  }

  // 5. Fork must have matching join
  const forkNodes = nodes.filter(n => n.type === 'fork')
  const joinNodes = nodes.filter(n => n.type === 'join')

  for (const fork of forkNodes) {
    const matchingJoin = joinNodes.find(j => j.config.nodeType === 'join' && j.config.forkReference === fork.id)
    if (!matchingJoin) {
      issues.push({
        id: `v-${issueId++}`,
        nodeId: fork.id,
        severity: 'error',
        message: `Fork "${fork.label}" has no matching join node`,
        rule: 'fork-needs-join'
      })
    }
  }

  // 6. Rework targets must reference earlier steps
  for (const node of nodes) {
    if (node.config.nodeType === 'task' && node.config.reworkConfig?.enabled) {
      const nodeIndex = nodes.indexOf(node)
      for (const target of node.config.reworkConfig.targets) {
        const targetNode = nodeMap.get(target.targetStepReference)
        if (targetNode) {
          const targetIndex = nodes.indexOf(targetNode)
          if (targetIndex >= nodeIndex) {
            issues.push({
              id: `v-${issueId++}`,
              nodeId: node.id,
              severity: 'error',
              message: `Rework target "${targetNode.label}" must be an earlier step`,
              rule: 'rework-target-earlier'
            })
          }
        }
      }
    }
  }

  // 7. Edge validation: edges reference existing nodes
  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) {
      issues.push({
        id: `v-${issueId++}`,
        edgeId: edge.id,
        severity: 'error',
        message: 'Edge references a non-existent source node',
        rule: 'edge-valid-source'
      })
    }
    if (!nodeIds.has(edge.target)) {
      issues.push({
        id: `v-${issueId++}`,
        edgeId: edge.id,
        severity: 'error',
        message: 'Edge references a non-existent target node',
        rule: 'edge-valid-target'
      })
    }
  }

  return issues
}

export function useFlowValidation() {
  const nodes = useFlowStudioStore(s => s.nodes)
  const edges = useFlowStudioStore(s => s.edges)

  const issues = useMemo(() => validateFlow(nodes, edges), [nodes, edges])

  const errors = useMemo(() => issues.filter(i => i.severity === 'error'), [issues])
  const warnings = useMemo(() => issues.filter(i => i.severity === 'warning'), [issues])
  const isValid = errors.length === 0

  const getNodeIssues = (nodeId: string) => issues.filter(i => i.nodeId === nodeId)

  return {
    issues,
    errors,
    warnings,
    isValid,
    getNodeIssues
  }
}
