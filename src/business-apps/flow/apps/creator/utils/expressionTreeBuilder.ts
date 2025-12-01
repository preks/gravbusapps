/**
 * Expression Tree Builder Utility
 *
 * Builds tree structure from template for visual expression building
 */

import { FlowTemplate, InputType, FlowStepType } from '../types/flowTemplate'
import { TreeNode, FieldType, FieldSuggestion } from '../types/expressionTree'
import {
  Workflow,
  Database,
  FolderOpen,
  Link as LinkIcon,
  Calendar,
  Hash,
  Type as TypeIcon,
  FileText
} from 'lucide-react'
import React from 'react'

/**
 * Map InputType to FieldType
 */
const mapInputTypeToFieldType = (inputType: InputType): FieldType => {
  switch (inputType) {
    case InputType.TEXT:
    case InputType.TEXTAREA:
    case InputType.SELECT:
    case InputType.MULTISELECT:
      return 'string'
    case InputType.NUMBER:
      return 'number'
    case InputType.DATE:
      return 'date'
    case InputType.DATETIME:
      return 'datetime'
    case InputType.CHECKBOX:
    case InputType.RADIO:
      return 'boolean'
    case InputType.FILE:
    case InputType.SIGNATURE:
      return 'string'
    default:
      return 'string'
  }
}

/**
 * Get icon for field type
 */
const getFieldTypeIcon = (fieldType: FieldType): React.ReactElement => {
  switch (fieldType) {
    case 'string':
      return React.createElement(TypeIcon, { className: 'gba:h-3 gba:w-3' })
    case 'number':
      return React.createElement(Hash, { className: 'gba:h-3 gba:w-3' })
    case 'date':
    case 'datetime':
      return React.createElement(Calendar, { className: 'gba:h-3 gba:w-3' })
    case 'boolean':
      return React.createElement(FileText, { className: 'gba:h-3 gba:w-3' })
    default:
      return React.createElement(TypeIcon, { className: 'gba:h-3 gba:w-3' })
  }
}

/**
 * Build tree structure from template
 *
 * @param template - Flow template
 * @param currentStepIndex - Current step being edited (only show previous steps)
 * @returns Tree structure for navigation
 */
export const buildExpressionTree = (template: FlowTemplate, currentStepIndex: number): TreeNode[] => {
  const tree: TreeNode[] = []

  // Helper: map JSON Schema type to FieldType
  const mapJsonTypeToFieldType = (t?: string): FieldType => {
    switch (t) {
      case 'string':
        return 'string'
      case 'number':
      case 'integer':
        return 'number'
      case 'boolean':
        return 'boolean'
      case 'array':
        return 'array'
      case 'object':
        return 'object'
      default:
        return 'object'
    }
  }

  // Helper: build child nodes from JSON Schema (one level deep)
  const schemaToNodes = (schema: any, basePath: string[], idPrefix: string): TreeNode[] => {
    if (!schema || typeof schema !== 'object') return []
    const props = schema.properties || {}
    return Object.keys(props).map(key => {
      const def = props[key] || {}
      const type = mapJsonTypeToFieldType(def.type)
      return {
        id: `${idPrefix}${key}`,
        label: key,
        path: [...basePath, key],
        type: 'field',
        fieldType: type,
        description: def.description
      } as TreeNode
    })
  }

  // 1. Workflow node
  tree.push({
    id: 'workflow',
    label: 'Workflow',
    icon: React.createElement(Workflow, { className: 'gba:h-4 gba:w-4 gba:text-blue-600' }),
    path: ['$workflow'],
    type: 'category',
    isExpandedByDefault: false,
    children: [
      {
        id: 'workflow-initiator',
        label: 'initiator',
        path: ['$workflow', 'initiator'],
        type: 'field',
        fieldType: 'string',
        description: 'User who started the workflow',
        example: 'user-001'
      },
      {
        id: 'workflow-name',
        label: 'name',
        path: ['$workflow', 'name'],
        type: 'field',
        fieldType: 'string',
        description: 'Workflow template name',
        example: 'Expense Approval'
      },
      {
        id: 'workflow-id',
        label: 'workflowId',
        path: ['$workflow', 'workflowId'],
        type: 'field',
        fieldType: 'string',
        description: 'Unique workflow instance ID',
        example: 'wf-123456'
      },
      {
        id: 'workflow-correlationId',
        label: 'correlationId',
        path: ['$workflow', 'correlationId'],
        type: 'field',
        fieldType: 'string',
        description: 'Correlation ID for tracking',
        example: 'corr-789'
      },
      {
        id: 'workflow-status',
        label: 'status',
        path: ['$workflow', 'status'],
        type: 'field',
        fieldType: 'string',
        description: 'Workflow status (RUNNING, COMPLETED, FAILED)',
        example: 'RUNNING'
      },
      {
        id: 'workflow-input',
        label: 'input',
        path: ['$workflow', 'input'],
        type: 'object',
        description: 'Workflow input data',
        children: []
      }
    ]
  })

  // 2. Steps node - show all steps during template design
  const stepsNode: TreeNode = {
    id: 'steps',
    label: 'Steps',
    icon: React.createElement(Database, { className: 'gba:h-4 gba:w-4 gba:text-green-600' }),
    path: ['$steps'],
    type: 'category',
    isExpandedByDefault: true,
    children: []
  }

  // Build tree from actual template steps
  // Show all steps for template design (user can reference any step)
  for (let i = 0; i < template.steps.length; i++) {
    const step = template.steps[i]
    if (!step) continue

    const formFields: TreeNode[] = (step.form || []).map(field => {
      // Show label with field name for clarity: "Field Label (fieldName)"
      const displayLabel = field.label && field.label !== field.name ? `${field.label} (${field.name})` : field.name

      return {
        id: `step_${i}_field_${field.name}`,
        label: displayLabel,
        icon: getFieldTypeIcon(mapInputTypeToFieldType(field.type)),
        path: ['$steps', `step_${i}`, 'formData', field.name],
        type: 'field',
        fieldType: mapInputTypeToFieldType(field.type),
        description: field.label || field.name,
        example: field.name
      }
    })

    const isFunctionLike =
      (step as any).type === FlowStepType.FUNCTION || (step as any).type === FlowStepType.AI_TASK_EXPERT

    const stepNode: TreeNode = {
      id: `step_${i}`,
      label: `Step ${i}: ${step.title || `Step ${i}`}${i === currentStepIndex ? ' (current)' : ''}`,
      path: ['$steps', `step_${i}`],
      type: 'object',
      isExpandedByDefault: i === currentStepIndex, // Auto-expand current step
      children: [
        ...(!isFunctionLike
          ? [
              {
                id: `step_${i}_formData`,
                label: 'formData',
                path: ['$steps', `step_${i}`, 'formData'],
                type: 'object',
                isExpandedByDefault: i === currentStepIndex, // Auto-expand current step's formData
                description: `Form fields from ${step.title || `Step ${i}`}`,
                children: formFields
              } as TreeNode
            ]
          : []),
        // Add normalized resultData/success/error at the same level as formData
        ...(isFunctionLike
          ? [
              {
                id: `step_${i}_resultData`,
                label: 'resultData',
                path: ['$steps', `step_${i}`, 'resultData'],
                type: 'object',
                isExpandedByDefault: i === currentStepIndex,
                description: 'Primary payload produced by the step',
                children: (() => {
                  // Use stored schema to expand fields if available
                  let schema: any | undefined
                  if ((step as any).type === FlowStepType.FUNCTION) {
                    schema = (step as any).functionConfig?.outputSchema
                  } else {
                    schema = (step as any).agentConfig?.outputSchema
                  }
                  return schemaToNodes(schema, ['$steps', `step_${i}`, 'resultData'], `step_${i}_resultData_`)
                })()
              } as TreeNode,
              {
                id: `step_${i}_success`,
                label: 'success',
                path: ['$steps', `step_${i}`, 'success'],
                type: 'field',
                fieldType: 'boolean',
                description: 'Indicates whether the step succeeded'
              } as TreeNode,
              {
                id: `step_${i}_error`,
                label: 'error',
                path: ['$steps', `step_${i}`, 'error'],
                type: 'field',
                fieldType: 'string',
                description: 'Error message if any'
              } as TreeNode
            ]
          : []),
        {
          id: `step_${i}_status`,
          label: 'status',
          path: ['$steps', `step_${i}`, 'status'],
          type: 'field',
          fieldType: 'string',
          description: 'Step status (PENDING, COMPLETED, etc.)',
          example: 'COMPLETED'
        },
        {
          id: `step_${i}_executedBy`,
          label: 'executedBy',
          path: ['$steps', `step_${i}`, 'executedBy'],
          type: 'field',
          fieldType: 'string',
          description: 'User who completed this step',
          example: 'user-123'
        },
        {
          id: `step_${i}_timestamp`,
          label: 'timestamp',
          path: ['$steps', `step_${i}`, 'timestamp'],
          type: 'field',
          fieldType: 'datetime',
          description: 'Step completion time',
          example: '2024-01-15T10:30:00Z'
        }
      ]
    }

    stepsNode.children!.push(stepNode)
  }

  tree.push(stepsNode)

  // 3. Catalogs node
  tree.push({
    id: 'catalogs',
    label: 'Catalogs',
    icon: React.createElement(FolderOpen, { className: 'gba:h-4 gba:w-4 gba:text-amber-600' }),
    path: ['$catalog'],
    type: 'category',
    isExpandedByDefault: false,
    children: [
      {
        id: 'catalog-asset-mgmt',
        label: 'asset-management',
        path: ['$catalog', 'asset-management'],
        type: 'array',
        description: 'Asset catalog',
        children: [
          {
            id: 'catalog-asset-item',
            label: '[index or id]',
            path: ['$catalog', 'asset-management', '[0]'],
            type: 'object',
            description: 'Access by index or ID',
            children: [
              {
                id: 'catalog-asset-name',
                label: 'name',
                path: ['$catalog', 'asset-management', '[0]', 'name'],
                type: 'field',
                fieldType: 'string'
              },
              {
                id: 'catalog-asset-serial',
                label: 'serialNumber',
                path: ['$catalog', 'asset-management', '[0]', 'serialNumber'],
                type: 'field',
                fieldType: 'string'
              }
            ]
          }
        ]
      },
      {
        id: 'catalog-employees',
        label: 'employees',
        path: ['$catalog', 'employees'],
        type: 'array',
        description: 'Employee catalog'
      },
      {
        id: 'catalog-departments',
        label: 'departments',
        path: ['$catalog', 'departments'],
        type: 'array',
        description: 'Department catalog'
      }
    ]
  })

  // 4. Entities node
  tree.push({
    id: 'entities',
    label: 'Entities',
    icon: React.createElement(LinkIcon, { className: 'gba:h-4 gba:w-4 gba:text-purple-600' }),
    path: ['$entity'],
    type: 'category',
    isExpandedByDefault: false,
    children: [
      {
        id: 'entity-ticket',
        label: 'ticket',
        path: ['$entity', 'ticket'],
        type: 'object',
        description: 'Ticket entity lookup'
      },
      {
        id: 'entity-employee',
        label: 'employee',
        path: ['$entity', 'employee'],
        type: 'object',
        description: 'Employee entity lookup'
      },
      {
        id: 'entity-asset',
        label: 'asset',
        path: ['$entity', 'asset'],
        type: 'object',
        description: 'Asset entity lookup'
      }
    ]
  })

  return tree
}

/**
 * Build expression string from path array
 */
export const pathToExpression = (path: string[]): string => {
  if (path.length === 0) return ''

  // Handle array accessors like [0]
  const cleanPath = path.map(segment => {
    if (segment.startsWith('[') && segment.endsWith(']')) {
      return segment
    }
    return segment
  })

  // Build expression
  let expression = cleanPath[0] // $workflow, $steps, $catalog, $entity

  for (let i = 1; i < cleanPath.length; i++) {
    const segment = cleanPath[i]
    if (segment.startsWith('[')) {
      expression += segment // Array accessor
    } else {
      expression += `.${segment}` // Property accessor
    }
  }

  return `{{${expression}}}`
}

/**
 * Extract field suggestions from previous steps
 */
export const getFieldSuggestionsFromTemplate = (
  template: FlowTemplate,
  currentStepIndex: number
): FieldSuggestion[] => {
  const suggestions: FieldSuggestion[] = []

  // Get fields from previous steps only
  for (let i = 0; i < currentStepIndex; i++) {
    const step = template.steps[i]
    if (!step) continue

    const fields = step.form || []
    fields.forEach(field => {
      suggestions.push({
        name: field.name,
        label: field.label || field.name,
        expression: `{{$steps.step_${i}.formData.${field.name}}}`,
        type: mapInputTypeToFieldType(field.type),
        stepIndex: i,
        stepTitle: step.title || `Step ${i}`
      })
    })
  }

  return suggestions
}

/**
 * Search/filter tree nodes
 */
export const filterTreeNodes = (nodes: TreeNode[], searchTerm: string): TreeNode[] => {
  if (!searchTerm) return nodes

  const term = searchTerm.toLowerCase()

  return nodes
    .map(node => {
      // Check if current node matches
      const matches = node.label.toLowerCase().includes(term) || node.description?.toLowerCase().includes(term)

      // Recursively filter children
      const filteredChildren = node.children ? filterTreeNodes(node.children, searchTerm) : []

      // Include node if it matches or has matching children
      if (matches || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : node.children,
          isExpandedByDefault: true // Auto-expand when filtering
        }
      }

      return null
    })
    .filter((node): node is TreeNode => node !== null)
}
