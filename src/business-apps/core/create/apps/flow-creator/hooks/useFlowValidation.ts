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

type PartialIssue = Omit<ValidationIssue, 'id'>

function validateStartAndEndNodes(nodes: StudioNode[]): PartialIssue[] {
  const issues: PartialIssue[] = []
  const startNodes = nodes.filter(n => n.type === 'start')
  if (startNodes.length === 0) {
    issues.push({ severity: 'error', message: 'Flow must have a start node', rule: 'require-start' })
  } else if (startNodes.length > 1) {
    for (const sn of startNodes.slice(1)) {
      issues.push({ nodeId: sn.id, severity: 'error', message: 'Only one start node is allowed', rule: 'single-start' })
    }
  }
  if (!nodes.some(n => n.type === 'end')) {
    issues.push({ severity: 'error', message: 'Flow must have an end node', rule: 'require-end' })
  }
  return issues
}

function validateOrphanNodes(nodes: StudioNode[], edges: FlowGraphEdge[]): PartialIssue[] {
  const issues: PartialIssue[] = []
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
      if (!hasOutgoing.has(node.id) && nodes.length > 1)
        issues.push({
          nodeId: node.id,
          severity: 'warning',
          message: `"${node.label}" has no outgoing connections`,
          rule: 'orphan-no-outgoing'
        })
    } else if (node.type === 'end') {
      if (!hasIncoming.has(node.id) && nodes.length > 1)
        issues.push({
          nodeId: node.id,
          severity: 'warning',
          message: `"${node.label}" has no incoming connections`,
          rule: 'orphan-no-incoming'
        })
    } else {
      if (!hasIncoming.has(node.id) && nodes.length > 1)
        issues.push({
          nodeId: node.id,
          severity: 'warning',
          message: `"${node.label}" has no incoming connections`,
          rule: 'orphan-no-incoming'
        })
      if (!hasOutgoing.has(node.id))
        issues.push({
          nodeId: node.id,
          severity: 'warning',
          message: `"${node.label}" has no outgoing connections`,
          rule: 'orphan-no-outgoing'
        })
    }
  }
  return issues
}

function validateDecisionNodes(nodes: StudioNode[]): PartialIssue[] {
  return nodes
    .filter(n => n.type === 'decision' && n.config.nodeType === 'decision' && n.config.branches.length < 2)
    .map(n => ({
      nodeId: n.id,
      severity: 'error' as const,
      message: `Decision "${n.label}" must have at least 2 branches`,
      rule: 'decision-min-branches'
    }))
}

function validateForkJoinPairs(nodes: StudioNode[]): PartialIssue[] {
  const joinNodes = nodes.filter(n => n.type === 'join')
  return nodes
    .filter(n => n.type === 'fork')
    .filter(fork => !joinNodes.some(j => j.config.nodeType === 'join' && j.config.forkReference === fork.id))
    .map(fork => ({
      nodeId: fork.id,
      severity: 'error' as const,
      message: `Fork "${fork.label}" has no matching join node`,
      rule: 'fork-needs-join'
    }))
}

function validateReworkTargets(nodes: StudioNode[], nodeMap: Map<string, StudioNode>): PartialIssue[] {
  const issues: PartialIssue[] = []
  for (const node of nodes) {
    if (node.config.nodeType !== 'task' || !node.config.reworkConfig?.enabled) continue
    const nodeIndex = nodes.indexOf(node)
    for (const target of node.config.reworkConfig.targets) {
      const targetNode = nodeMap.get(target.targetStepReference)
      if (targetNode && nodes.indexOf(targetNode) >= nodeIndex)
        issues.push({
          nodeId: node.id,
          severity: 'error',
          message: `Rework target "${targetNode.label}" must be an earlier step`,
          rule: 'rework-target-earlier'
        })
    }
  }
  return issues
}

function validateEdges(edges: FlowGraphEdge[], nodeIds: Set<string>): PartialIssue[] {
  const issues: PartialIssue[] = []
  for (const edge of edges) {
    if (!nodeIds.has(edge.source))
      issues.push({
        edgeId: edge.id,
        severity: 'error',
        message: 'Edge references a non-existent source node',
        rule: 'edge-valid-source'
      })
    if (!nodeIds.has(edge.target))
      issues.push({
        edgeId: edge.id,
        severity: 'error',
        message: 'Edge references a non-existent target node',
        rule: 'edge-valid-target'
      })
  }
  return issues
}

function validateFlow(nodes: StudioNode[], edges: FlowGraphEdge[]): ValidationIssue[] {
  const nodeIds = new Set(nodes.map(n => n.id))
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const allIssues: PartialIssue[] = [
    ...validateStartAndEndNodes(nodes),
    ...validateOrphanNodes(nodes, edges),
    ...validateDecisionNodes(nodes),
    ...validateForkJoinPairs(nodes),
    ...validateReworkTargets(nodes, nodeMap),
    ...validateEdges(edges, nodeIds)
  ]
  return allIssues.map((issue, i) => ({ ...issue, id: `v-${i}` }))
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
