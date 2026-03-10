import type { FlowGraphEdge } from '@/common/components/flow/flow-viewer'
import type { InputBlock } from '@/common/network/flows/FlowTemplateClient'
import type { StudioNode } from '../types/studioTypes'
import { buildStepIndexByNodeId, orderNodesForTemplate } from './studioStepOrder'

export type AssignmentPersonFieldOption = {
  id?: string
  name: string
  label: string
  userExpression?: string
  managerExpression?: string
}

type PersonReferenceKind = 'employee' | 'user'

const USER_HINTS = ['user', 'assignee', 'requester', 'approver', 'manager', 'owner', 'responsible']
const EMPLOYEE_HINTS = ['employee', 'person']

function normalizeText(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function detectPersonReferenceKind(field: InputBlock): PersonReferenceKind | null {
  const entity = normalizeText((field as any)?.dataSource?.entity)
  const name = normalizeText(field?.name)
  const label = normalizeText((field as any)?.label)
  const combined = `${name} ${label}`

  if (entity.includes('user')) return 'user'
  if (entity.includes('employee')) return 'employee'
  if (USER_HINTS.some(hint => combined.includes(hint))) return 'user'
  if (EMPLOYEE_HINTS.some(hint => combined.includes(hint))) return 'employee'
  return null
}

function buildExpressions(
  reference: string,
  kind: PersonReferenceKind
): {
  userExpression: string
  managerExpression: string
} {
  if (kind === 'user') {
    return {
      userExpression: `{{${reference}}}`,
      managerExpression: `{{$orgchart.managerByUserId[${reference}]}}`
    }
  }

  return {
    userExpression: `{{$orgchart.userIdByEmployeeId[${reference}]}}`,
    managerExpression: `{{$orgchart.manager[${reference}]}}`
  }
}

function toAssignmentFieldOption(params: {
  field: InputBlock
  id: string
  labelPrefix?: string
  reference: string
}): AssignmentPersonFieldOption | null {
  const { field, id, labelPrefix, reference } = params
  const name = String(field?.name || '').trim()
  if (!name) return null

  const referenceKind = detectPersonReferenceKind(field)
  if (!referenceKind) return null

  const { userExpression, managerExpression } = buildExpressions(reference, referenceKind)
  const fieldLabel = String((field as any)?.label || name).trim() || name

  return {
    id,
    name,
    label: labelPrefix ? `${labelPrefix}: ${fieldLabel}` : fieldLabel,
    userExpression,
    managerExpression
  }
}

export function collectAssignmentPersonFieldOptions(params: {
  nodes: StudioNode[]
  edges: FlowGraphEdge[]
  currentNodeId: string
}): AssignmentPersonFieldOption[] {
  const { nodes, edges, currentNodeId } = params
  const options: AssignmentPersonFieldOption[] = []
  const seen = new Set<string>()

  const pushOption = (option: AssignmentPersonFieldOption | null) => {
    if (!option) return
    const key = option.id || option.name
    if (seen.has(key)) return
    seen.add(key)
    options.push(option)
  }

  const startNode = nodes.find(node => node.type === 'start')
  const startForm = Array.isArray((startNode?.config as any)?.form)
    ? ((startNode?.config as any)?.form as InputBlock[]) || []
    : []

  startForm.forEach(field => {
    pushOption(
      toAssignmentFieldOption({
        field,
        id: `start:${String(field?.name || '').trim()}`,
        labelPrefix: 'Start',
        reference: `$workflow.input.${String(field?.name || '').trim()}`
      })
    )
  })

  const orderedNodes = orderNodesForTemplate(nodes, edges)
  const currentNodeIndex = orderedNodes.findIndex(node => node.id === currentNodeId)
  if (currentNodeIndex < 0) {
    return options
  }

  const stepIndexByNodeId = buildStepIndexByNodeId(nodes, edges)

  orderedNodes
    .slice(0, currentNodeIndex)
    .filter(node => node.type === 'task')
    .forEach(node => {
      const form = Array.isArray((node.config as any)?.form) ? ((node.config as any)?.form as InputBlock[]) || [] : []
      const stepIndex = stepIndexByNodeId.get(node.id)
      if (typeof stepIndex !== 'number' || Number.isNaN(stepIndex)) return

      form.forEach(field => {
        const fieldName = String(field?.name || '').trim()
        pushOption(
          toAssignmentFieldOption({
            field,
            id: `${node.id}:${fieldName}`,
            labelPrefix: node.label || `Step ${stepIndex + 1}`,
            reference: `$steps.step_${stepIndex}.formData.${fieldName}`
          })
        )
      })
    })

  return options
}
