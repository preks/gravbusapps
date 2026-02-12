/**
 * Expression Tree Builder Utility
 *
 * Builds tree structure from template for visual expression building
 */

import { FlowTemplate, InputType, FlowStepType } from '../types/flowTemplate'
import { TreeNode } from '../types/expressionTree'
import { CatalogMetadata } from '../types/catalogTypes'
import { EntitySchema } from '../hooks/useEntitySchemas'
import { buildEntitiesRootNode } from './entityTreeBuilder'

/**
 * Map InputType to dataType
 */
const mapInputTypeToDataType = (inputType: InputType): TreeNode['dataType'] => {
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
 * Get icon for data type
 */
const getDataTypeIcon = (dataType: TreeNode['dataType']): string => {
  switch (dataType) {
    case 'string':
      return 'text'
    case 'number':
      return 'hash'
    case 'date':
    case 'datetime':
      return 'calendar'
    case 'boolean':
      return 'toggle-left'
    case 'object':
      return 'folder'
    case 'array':
      return 'list'
    default:
      return 'text'
  }
}

/**
 * Build workflow node
 */
const buildWorkflowNode = (): TreeNode => ({
  id: 'workflow',
  label: 'Workflow',
  type: 'workflow',
  icon: 'git-branch',
  path: ['$workflow'],
  isExpanded: false,
  children: [
    {
      id: 'workflow-initiator',
      label: 'initiator',
      type: 'field',
      icon: 'user',
      dataType: 'string',
      path: ['$workflow', 'initiator'],
      description: 'User who started the workflow'
    },
    {
      id: 'workflow-name',
      label: 'name',
      type: 'field',
      icon: 'text',
      dataType: 'string',
      path: ['$workflow', 'name'],
      description: 'Workflow template name'
    },
    {
      id: 'workflow-id',
      label: 'workflowId',
      type: 'field',
      icon: 'hash',
      dataType: 'string',
      path: ['$workflow', 'workflowId'],
      description: 'Unique workflow instance ID'
    },
    {
      id: 'workflow-correlationId',
      label: 'correlationId',
      type: 'field',
      icon: 'link',
      dataType: 'string',
      path: ['$workflow', 'correlationId'],
      description: 'Correlation ID for tracking'
    },
    {
      id: 'workflow-status',
      label: 'status',
      type: 'field',
      icon: 'activity',
      dataType: 'string',
      path: ['$workflow', 'status'],
      description: 'Workflow status (RUNNING, COMPLETED, FAILED)'
    },
    {
      id: 'workflow-input',
      label: 'input',
      type: 'container',
      icon: 'folder',
      dataType: 'object',
      path: ['$workflow', 'input'],
      description: 'Workflow input data',
      children: []
    }
  ]
})

/**
 * Build steps node from template
 */
const buildStepsNode = (template: FlowTemplate, currentStepIndex: number): TreeNode => {
  // Helper: map JSON Schema type to dataType
  const mapJsonTypeToDataType = (t?: string): TreeNode['dataType'] => {
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
      const dataType = mapJsonTypeToDataType(def.type)
      return {
        id: `${idPrefix}${key}`,
        label: key,
        type: 'field',
        icon: getDataTypeIcon(dataType),
        dataType: dataType,
        path: [...basePath, key],
        description: def.description,
        isExpanded: false,
        children: []
      } as TreeNode
    })
  }

  const stepsNode: TreeNode = {
    id: 'steps',
    label: 'Steps',
    type: 'steps',
    icon: 'layers',
    path: ['$steps'],
    isExpanded: true,
    children: []
  }

  // Build tree from actual template steps
  for (let i = 0; i < template.steps.length; i++) {
    const step = template.steps[i]
    if (!step) continue

    const formFields: TreeNode[] = (step.form || []).map(field => {
      const displayLabel = field.label && field.label !== field.name ? `${field.label} (${field.name})` : field.name
      const dataType = mapInputTypeToDataType(field.type)

      return {
        id: `step_${i}_field_${field.name}`,
        label: displayLabel,
        type: 'field',
        icon: getDataTypeIcon(dataType),
        dataType: dataType,
        path: ['$steps', `step_${i}`, 'formData', field.name],
        description: field.label || field.name,
        isExpanded: false,
        metadata: {
          inputType: field.type,
          dataSourceType: field.dataSource?.type,
          dataSourceEntity: field.dataSource?.entity,
          dataSourceCatalog: field.dataSource?.catalog,
          labelField: field.dataSource?.labelField,
          valueField: field.dataSource?.valueField
        },
        children: []
      }
    })

    const isFunctionLike =
      (step as any).type === FlowStepType.FUNCTION || (step as any).type === FlowStepType.AI_TASK_EXPERT

    const stepChildren: TreeNode[] = []

    if (!isFunctionLike) {
      stepChildren.push({
        id: `step_${i}_formData`,
        label: 'formData',
        type: 'container',
        icon: 'folder',
        dataType: 'object',
        path: ['$steps', `step_${i}`, 'formData'],
        isExpanded: i === currentStepIndex,
        description: `Form fields from ${step.title || `Step ${i}`}`,
        children: formFields
      })
    }

    if (isFunctionLike) {
      // Get schema for result data
      let schema: any | undefined
      if ((step as any).type === FlowStepType.FUNCTION) {
        schema = (step as any).functionConfig?.outputSchema
      } else {
        schema = (step as any).agentConfig?.outputSchema
      }

      stepChildren.push({
        id: `step_${i}_resultData`,
        label: 'resultData',
        type: 'container',
        icon: 'folder',
        dataType: 'object',
        path: ['$steps', `step_${i}`, 'resultData'],
        isExpanded: i === currentStepIndex,
        description: 'Primary payload produced by the step',
        children: schemaToNodes(schema, ['$steps', `step_${i}`, 'resultData'], `step_${i}_resultData_`)
      })

      stepChildren.push({
        id: `step_${i}_success`,
        label: 'success',
        type: 'field',
        icon: 'check-circle',
        dataType: 'boolean',
        path: ['$steps', `step_${i}`, 'success'],
        description: 'Indicates whether the step succeeded',
        isExpanded: false,
        children: []
      })

      stepChildren.push({
        id: `step_${i}_error`,
        label: 'error',
        type: 'field',
        icon: 'alert-circle',
        dataType: 'string',
        path: ['$steps', `step_${i}`, 'error'],
        description: 'Error message if any',
        isExpanded: false,
        children: []
      })
    }

    stepChildren.push({
      id: `step_${i}_status`,
      label: 'status',
      type: 'field',
      icon: 'activity',
      dataType: 'string',
      path: ['$steps', `step_${i}`, 'status'],
      description: 'Step status (PENDING, COMPLETED, etc.)',
      isExpanded: false,
      children: []
    })

    stepChildren.push({
      id: `step_${i}_executedBy`,
      label: 'executedBy',
      type: 'field',
      icon: 'user',
      dataType: 'string',
      path: ['$steps', `step_${i}`, 'executedBy'],
      description: 'User who completed this step',
      isExpanded: false,
      children: []
    })

    stepChildren.push({
      id: `step_${i}_timestamp`,
      label: 'timestamp',
      type: 'field',
      icon: 'clock',
      dataType: 'datetime',
      path: ['$steps', `step_${i}`, 'timestamp'],
      description: 'Step completion time',
      isExpanded: false,
      children: []
    })

    const stepNode: TreeNode = {
      id: `step_${i}`,
      label: `Step ${i}: ${step.title || `Step ${i}`}${i === currentStepIndex ? ' (current)' : ''}`,
      type: 'step',
      icon: 'square',
      path: ['$steps', `step_${i}`],
      isExpanded: i === currentStepIndex,
      metadata: {
        stepIndex: i,
        isCurrent: i === currentStepIndex
      },
      children: stepChildren
    }

    stepsNode.children!.push(stepNode)
  }

  return stepsNode
}

/**
 * Build catalogs node from catalog metadata
 */
const buildCatalogsNode = (catalogs?: CatalogMetadata[]): TreeNode => {
  const catalogsNode: TreeNode = {
    id: 'catalogs',
    label: 'Catalogs',
    type: 'catalog',
    icon: 'book-open',
    path: ['$catalog'],
    isExpanded: false,
    children: []
  }

  if (catalogs && catalogs.length > 0) {
    // Build from dynamic catalog metadata
    catalogsNode.children = catalogs.map(catalog => ({
      id: `catalog-${catalog.catalogIdentifier}`,
      label: catalog.catalogIdentifier,
      type: 'catalog-container' as const,
      icon: 'folder',
      path: ['$catalog', catalog.catalogIdentifier],
      description: catalog.displayName || catalog.catalogIdentifier,
      isExpanded: false,
      metadata: {
        catalogId: catalog.catalogIdentifier,
        version: catalog.version
      },
      children: [
        {
          id: `catalog-${catalog.catalogIdentifier}-browse`,
          label: `🔍 Browse ${catalog.displayName || catalog.catalogIdentifier}`,
          type: 'catalog-browser' as const,
          icon: 'search',
          description: `Search and browse ${catalog.displayName || catalog.catalogIdentifier} entries`,
          isExpanded: false,
          metadata: {
            catalogId: catalog.catalogIdentifier,
            version: catalog.version,
            loadingState: 'idle' as const,
            offset: 0,
            hasMore: false
          },
          children: []
        }
      ]
    }))
  } else {
    // Default static catalogs for backward compatibility
    catalogsNode.children = [
      {
        id: 'catalog-asset-mgmt',
        label: 'asset-management',
        type: 'catalog-container',
        icon: 'folder',
        path: ['$catalog', 'asset-management'],
        description: 'Asset catalog',
        isExpanded: false,
        children: []
      },
      {
        id: 'catalog-employees',
        label: 'employees',
        type: 'catalog-container',
        icon: 'folder',
        path: ['$catalog', 'employees'],
        description: 'Employee catalog',
        isExpanded: false,
        children: []
      },
      {
        id: 'catalog-departments',
        label: 'departments',
        type: 'catalog-container',
        icon: 'folder',
        path: ['$catalog', 'departments'],
        description: 'Department catalog',
        isExpanded: false,
        children: []
      }
    ]
  }

  return catalogsNode
}

/**
 * Build OrgChart node with organizational hierarchy expressions
 */
const buildOrgChartNode = (): TreeNode => {
  const orgChartNode: TreeNode = {
    id: 'orgchart',
    label: 'OrgChart',
    type: 'orgchart',
    icon: 'users',
    path: ['$orgchart'],
    description: 'Organizational hierarchy (managers, reports)',
    isExpanded: false,
    children: []
  }

  // Helper to create field nodes
  const createFieldNodes = (relationKey: string, isArrayReturn: boolean = false): TreeNode[] => {
    const baseDescription = isArrayReturn ? 'Array of user IDs' : 'User ID'
    return [
      {
        id: `${relationKey}-base`,
        label: '(Base) User ID(s)',
        type: 'orgchart-field' as const,
        icon: 'hash',
        dataType: isArrayReturn ? 'array' : 'string',
        description: baseDescription,
        expressionTemplate: `{{$orgchart.${relationKey}[ID_PLACEHOLDER]}}`
      },
      {
        id: `${relationKey}-name`,
        label: '.name',
        type: 'orgchart-field' as const,
        icon: 'text',
        dataType: isArrayReturn ? 'array' : 'string',
        description: isArrayReturn ? 'Array of display names' : 'Display name',
        expressionTemplate: `{{$orgchart.${relationKey}[ID_PLACEHOLDER].name}}`
      },
      {
        id: `${relationKey}-email`,
        label: '.email',
        type: 'orgchart-field' as const,
        icon: 'mail',
        dataType: isArrayReturn ? 'array' : 'string',
        description: isArrayReturn ? 'Array of email addresses' : 'Email address',
        expressionTemplate: `{{$orgchart.${relationKey}[ID_PLACEHOLDER].email}}`
      }
    ]
  }

  // By Employee ID category
  const byEmployeeIdNode: TreeNode = {
    id: 'orgchart-by-employeeid',
    label: 'By Employee ID',
    type: 'orgchart-category' as const,
    icon: 'folder',
    description: 'Use when you have an employeeId',
    isExpanded: false,
    children: [
      {
        id: 'orgchart-manager',
        label: 'Manager',
        type: 'orgchart-relation' as const,
        icon: 'user',
        description: 'Direct manager (returns user ID)',
        isExpanded: false,
        metadata: {
          relationType: 'manager',
          isArrayReturn: false
        },
        children: createFieldNodes('manager', false)
      },
      {
        id: 'orgchart-skiplevel',
        label: 'Skip-Level Manager',
        type: 'orgchart-relation' as const,
        icon: 'users',
        description: "Manager's manager (returns user ID)",
        isExpanded: false,
        metadata: {
          relationType: 'skipLevelManager',
          isArrayReturn: false
        },
        children: createFieldNodes('skipLevelManager', false)
      },
      {
        id: 'orgchart-reports',
        label: 'Direct Reports',
        type: 'orgchart-relation' as const,
        icon: 'users',
        description: 'All direct reports (returns array of user IDs)',
        isExpanded: false,
        metadata: {
          relationType: 'directReports',
          isArrayReturn: true
        },
        children: createFieldNodes('directReports', true)
      },
      {
        id: 'orgchart-userid-by-employeeid',
        label: 'Convert to User ID',
        type: 'orgchart-field' as const,
        icon: 'arrow-right',
        description: 'Convert employeeId to userId (for assignments)',
        dataType: 'string',
        expressionTemplate: '{{$orgchart.userIdByEmployeeId[ID_PLACEHOLDER]}}'
      }
    ]
  }

  // By User ID category
  const byUserIdNode: TreeNode = {
    id: 'orgchart-by-userid',
    label: 'By User ID (Recommended)',
    type: 'orgchart-category' as const,
    icon: 'folder',
    description: 'Use when you have a userId (simpler)',
    isExpanded: false,
    children: [
      {
        id: 'orgchart-manager-by-userid',
        label: 'Manager By User ID',
        type: 'orgchart-relation' as const,
        icon: 'user',
        description: 'Direct manager via userId (returns user ID)',
        isExpanded: false,
        metadata: {
          relationType: 'managerByUserId',
          isArrayReturn: false
        },
        children: createFieldNodes('managerByUserId', false)
      },
      {
        id: 'orgchart-skiplevel-by-userid',
        label: 'Skip-Level Manager By User ID',
        type: 'orgchart-relation' as const,
        icon: 'users',
        description: "Manager's manager via userId (returns user ID)",
        isExpanded: false,
        metadata: {
          relationType: 'skipLevelManagerByUserId',
          isArrayReturn: false
        },
        children: createFieldNodes('skipLevelManagerByUserId', false)
      },
      {
        id: 'orgchart-reports-by-userid',
        label: 'Direct Reports By User ID',
        type: 'orgchart-relation' as const,
        icon: 'users',
        description: 'All direct reports via userId (returns array of user IDs)',
        isExpanded: false,
        metadata: {
          relationType: 'directReportsByUserId',
          isArrayReturn: true
        },
        children: createFieldNodes('directReportsByUserId', true)
      }
    ]
  }

  orgChartNode.children = [byEmployeeIdNode, byUserIdNode]

  return orgChartNode
}

/**
 * Build tree structure from template
 *
 * @param template - Flow template
 * @param stepIndex - Current step being edited
 * @param catalogs - Optional catalog metadata for dynamic catalog nodes
 * @param entitySchemas - Optional entity schemas for dynamic entity nodes
 * @returns Tree structure for navigation
 */
export const buildExpressionTree = (
  template: FlowTemplate,
  stepIndex: number,
  catalogs?: CatalogMetadata[],
  entitySchemas?: Record<string, EntitySchema> | null
): TreeNode[] => {
  const nodes: TreeNode[] = []

  // Add workflow node
  nodes.push(buildWorkflowNode())

  // Add steps node
  nodes.push(buildStepsNode(template, stepIndex))

  // Add catalogs node
  nodes.push(buildCatalogsNode(catalogs))

  // Add entities node (dynamic from fetched schemas)
  nodes.push(buildEntitiesRootNode(entitySchemas || null))

  // Add OrgChart node
  nodes.push(buildOrgChartNode())

  return nodes.filter(Boolean)
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
  let expression = cleanPath[0] // $workflow, $steps, $catalog, $entity, $orgchart

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
 * Field suggestion type for expression building
 */
export interface FieldSuggestion {
  name: string
  label: string
  expression: string
  type: TreeNode['dataType']
  stepIndex: number
  stepTitle: string
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
        type: mapInputTypeToDataType(field.type),
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

  const filtered: TreeNode[] = []

  for (const node of nodes) {
    // Check if current node matches
    const matches = node.label.toLowerCase().includes(term) || node.description?.toLowerCase().includes(term)

    // Recursively filter children
    const filteredChildren = node.children ? filterTreeNodes(node.children, searchTerm) : []

    // Include node if it matches or has matching children
    if (matches || filteredChildren.length > 0) {
      filtered.push({
        ...node,
        children: filteredChildren.length > 0 ? filteredChildren : node.children,
        isExpanded: true // Auto-expand when filtering
      })
    }
  }

  return filtered
}
