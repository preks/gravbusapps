/**
 * useFlowValidation - Real-time flow validation hook.
 * Detects orphan nodes, missing connections, invalid configurations,
 * and structural issues like fork without join.
 */

import { useMemo } from 'react'
import { useFlowStudioStore } from './useFlowStudioStore'
import type { StudioNode } from '../types/studioTypes'
import type { FlowGraphEdge } from '@/common/components/flow/flow-viewer'
import { AssignmentMode } from '@/common/network/flows/FlowTemplateClient'
import { getUnmappedPromptParams } from '../utils/promptParameterUtils'

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

function validateSingleOrphanNode(
  node: StudioNode,
  hasIncoming: Set<string>,
  hasOutgoing: Set<string>,
  nodeCount: number
): PartialIssue[] {
  const issues: PartialIssue[] = []
  const multiNode = nodeCount > 1
  if (node.type === 'start') {
    if (multiNode && !hasOutgoing.has(node.id))
      issues.push({
        nodeId: node.id,
        severity: 'warning',
        message: `"${node.label}" has no outgoing connections`,
        rule: 'orphan-no-outgoing'
      })
    return issues
  }
  if (node.type === 'end') {
    if (multiNode && !hasIncoming.has(node.id))
      issues.push({
        nodeId: node.id,
        severity: 'warning',
        message: `"${node.label}" has no incoming connections`,
        rule: 'orphan-no-incoming'
      })
    return issues
  }
  if (multiNode && !hasIncoming.has(node.id))
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
  return issues
}

function validateOrphanNodes(nodes: StudioNode[], edges: FlowGraphEdge[]): PartialIssue[] {
  const hasIncoming = new Set<string>()
  const hasOutgoing = new Set<string>()
  for (const edge of edges) {
    if (edge.direction === 'forward') {
      hasIncoming.add(edge.target)
      hasOutgoing.add(edge.source)
    }
  }
  return nodes.flatMap(node => validateSingleOrphanNode(node, hasIncoming, hasOutgoing, nodes.length))
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

function extractPromptUserParams(template: string | undefined): string[] {
  if (!template) return []

  const matches = template.matchAll(/\{([a-zA-Z0-9_]+)\}/g)
  const params = new Set<string>()
  for (const match of matches) {
    const value = String(match[1] || '').trim()
    if (value) params.add(value)
  }
  return Array.from(params)
}

function validateDecisionTaskExpertParams(nodes: StudioNode[]): PartialIssue[] {
  const issues: PartialIssue[] = []

  for (const node of nodes) {
    if (node.type !== 'decision' || node.config.nodeType !== 'decision' || node.config.decisionMode !== 'AI') continue

    const aiConfig = node.config.aiConfig
    if (aiConfig?.executor !== 'TASK_EXPERT') continue

    const promptId = String(aiConfig.promptId || '').trim()
    if (!promptId) {
      issues.push({
        nodeId: node.id,
        severity: 'error',
        message: `Decision "${node.label}" must select a Task Expert prompt`,
        rule: 'decision-taskexpert-prompt-required'
      })
      continue
    }

    const systemKeys = Object.keys(aiConfig.systemParamsMap ?? {})
    const userKeys = Object.keys(aiConfig.userParamsMap ?? {})
    const snapshotUserParams = extractPromptUserParams(aiConfig.promptUserContent)
    const unmappedSystem = getUnmappedPromptParams(aiConfig.systemParamsMap, systemKeys)
    const unmappedUser = getUnmappedPromptParams(
      aiConfig.userParamsMap,
      Array.from(new Set([...userKeys, ...snapshotUserParams]))
    )
    const unmapped = Array.from(new Set([...unmappedSystem, ...unmappedUser]))

    if (unmapped.length > 0) {
      issues.push({
        nodeId: node.id,
        severity: 'error',
        message: `Decision "${node.label}" must map all Task Expert prompt parameters before publish: ${unmapped.join(', ')}`,
        rule: 'decision-taskexpert-param-mapping'
      })
    }
  }

  return issues
}

function hasSpecificAssignmentTargets(targets: unknown): boolean {
  if (!targets || typeof targets !== 'object') return false

  return Object.values(targets as Record<string, unknown>).some(
    value =>
      Array.isArray(value) &&
      value.some(entry => {
        const normalized = String(entry || '').trim()
        return normalized !== '' && normalized !== 'ANY'
      })
  )
}

function validateClaimAssignments(nodes: StudioNode[]): PartialIssue[] {
  const issues: PartialIssue[] = []

  for (const node of nodes) {
    if (node.type === 'task' && node.config.nodeType === 'task' && node.config.kind === 'USER') {
      const assignment = node.config.assignment
      if (assignment?.assignmentMode === AssignmentMode.CLAIM && !hasSpecificAssignmentTargets(assignment.targets)) {
        issues.push({
          nodeId: node.id,
          severity: 'error',
          message: `Claimable step "${node.label}" must define at least one claim target`,
          rule: 'claim-needs-target'
        })
      }
    }

    if (node.type === 'decision' && node.config.nodeType === 'decision') {
      if (node.config.decisionMode === 'USER') {
        const userAssignment = node.config.userConfig?.assignment
        if (
          userAssignment?.assignmentMode === AssignmentMode.CLAIM &&
          !hasSpecificAssignmentTargets(userAssignment.targets)
        ) {
          issues.push({
            nodeId: node.id,
            severity: 'error',
            message: `Decision "${node.label}" must define at least one claim target`,
            rule: 'decision-claim-needs-target'
          })
        }
      }

      if (node.config.decisionMode === 'AI') {
        const escalationAssignment = node.config.aiConfig?.escalation?.assignment
        if (
          escalationAssignment?.assignmentMode === AssignmentMode.CLAIM &&
          !hasSpecificAssignmentTargets(escalationAssignment.targets)
        ) {
          issues.push({
            nodeId: node.id,
            severity: 'error',
            message: `Decision "${node.label}" escalation must define at least one claim target`,
            rule: 'decision-escalation-claim-needs-target'
          })
        }
      }
    }
  }

  return issues
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

export function validateFlow(nodes: StudioNode[], edges: FlowGraphEdge[]): ValidationIssue[] {
  const nodeIds = new Set(nodes.map(n => n.id))
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const allIssues: PartialIssue[] = [
    ...validateStartAndEndNodes(nodes),
    ...validateOrphanNodes(nodes, edges),
    ...validateDecisionNodes(nodes),
    ...validateDecisionTaskExpertParams(nodes),
    ...validateClaimAssignments(nodes),
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
