/**
 * templateConverter - Bridges between Flow Studio graph format and FlowTemplate backend format.
 * Converts studio nodes/edges to FlowTemplate steps and vice versa.
 */

import type { StudioNode } from '../types/studioTypes'
import type { FlowGraphEdge } from '@/common/components/flow/flow-viewer'
import type { FlowTemplate, FlowStep, FlowStartNodeConfiguration } from '@/common/network/flows/FlowTemplateClient'
import { AssignmentMode } from '@/business-apps/flow/apps/creator/types/flowTemplate'
import type { FlowTags } from '@/business-apps/flow/types'

/**
 * Convert studio graph (nodes + edges) to a FlowTemplate for the backend.
 */
export function studioGraphToTemplate(
  nodes: StudioNode[],
  edges: FlowGraphEdge[],
  name: string,
  description?: string,
  tags?: FlowTags
): FlowTemplate {
  const steps: FlowStep[] = []
  let start: FlowStartNodeConfiguration | undefined

  for (const node of nodes) {
    const { config } = node

    switch (config.nodeType) {
      case 'start':
        start = {
          triggers: config.triggers ?? []
        }
        break

      case 'task':
        steps.push({
          id: node.id,
          type: config.stepType as any,
          title: config.title,
          message: config.message,
          dueInMinutes: config.dueInMinutes,
          form: config.form,
          assignment: config.assignment ?? {
            targets: null,
            assignmentMode: AssignmentMode.CLAIM
          },
          customStates: config.customStates,
          defaultPriority: config.defaultPriority
        })
        break

      // Decision, fork, join, end are graph-level constructs
      // that the backend flow generation handles via edges
      default:
        break
    }
  }

  return {
    type: 'TEMPLATE',
    name,
    description: description || '',
    version: 1,
    steps,
    start,
    tags: tags && Object.keys(tags).length > 0 ? tags : undefined
  }
}

/**
 * Convert a FlowTemplate from the backend to studio graph nodes and edges.
 * Reconstructs a start node, task nodes, and an end node.
 */
export function templateToStudioGraph(template: FlowTemplate): {
  nodes: StudioNode[]
  edges: FlowGraphEdge[]
} {
  const nodes: StudioNode[] = []
  const edges: FlowGraphEdge[] = []

  // Create start node
  const startNode: StudioNode = {
    id: 'start',
    type: 'start',
    label: 'Start',
    position: { x: 0, y: 0 },
    config: {
      nodeType: 'start',
      triggers: template.start?.triggers ?? [],
      form: template.initStep?.form ?? []
    }
  }
  nodes.push(startNode)

  // Create task nodes from steps
  let prevId = 'start'
  for (const step of template.steps ?? []) {
    const nodeId = step.id ?? `task_${nodes.length}`
    const taskNode: StudioNode = {
      id: nodeId,
      type: 'task',
      label: step.title,
      position: { x: 0, y: 0 },
      config: {
        nodeType: 'task',
        stepType: step.type as any,
        kind: 'USER',
        title: step.title,
        message: step.message,
        form: step.form,
        assignment: step.assignment ?? {
          targets: null,
          assignmentMode: AssignmentMode.CLAIM
        },
        dueInMinutes: step.dueInMinutes,
        defaultPriority: step.defaultPriority,
        customStates: step.customStates
      }
    }
    nodes.push(taskNode)

    edges.push({
      id: `edge_${prevId}_${nodeId}`,
      source: prevId,
      target: nodeId,
      direction: 'forward'
    })
    prevId = nodeId
  }

  // Create end node
  const endNode: StudioNode = {
    id: 'end',
    type: 'end',
    label: 'End',
    position: { x: 0, y: 0 },
    config: {
      nodeType: 'end',
      summaryFields: []
    }
  }
  nodes.push(endNode)

  if (prevId !== 'end') {
    edges.push({
      id: `edge_${prevId}_end`,
      source: prevId,
      target: 'end',
      direction: 'forward'
    })
  }

  return { nodes, edges }
}
