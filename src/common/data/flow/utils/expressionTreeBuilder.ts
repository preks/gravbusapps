/**
 * Expression Tree Builder Utility
 *
 * Builds tree structure from template for visual expression building
 */

import { CatalogMetadata } from '../types/catalogTypes'
import { TreeNode } from '../types/expressionTree'
import { FlowStepType, FlowTemplate, InputType } from '../types/flowTemplate'
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
  const mapJsonTypeToDataType = (type?: string): TreeNode['dataType'] => {
    switch (type) {
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

  const schemaToNodes = (schema: any, basePath: string[], idPrefix: string): TreeNode[] => {
    if (!schema || typeof schema !== 'object') return []
    const properties = schema.properties || {}

    return Object.keys(properties).map(propertyKey => {
      const propertyDefinition = properties[propertyKey] || {}
      const dataType = mapJsonTypeToDataType(propertyDefinition.type)

      return {
        id: `${idPrefix}${propertyKey}`,
        label: propertyKey,
        type: 'field',
        icon: getDataTypeIcon(dataType),
        dataType,
        path: [...basePath, propertyKey],
        description: propertyDefinition.description,
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

  for (let stepIndex = 0; stepIndex < template.steps.length; stepIndex += 1) {
    const step = template.steps[stepIndex]
    if (!step) continue

    const formFields: TreeNode[] = (step.form || []).map(field => {
      const displayLabel = field.label && field.label !== field.name ? `${field.label} (${field.name})` : field.name
      const dataType = mapInputTypeToDataType(field.type)

      return {
        id: `step_${stepIndex}_field_${field.name}`,
        label: displayLabel,
        type: 'field',
        icon: getDataTypeIcon(dataType),
        dataType,
        path: ['$steps', `step_${stepIndex}`, 'formData', field.name],
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
        id: `step_${stepIndex}_formData`,
        label: 'formData',
        type: 'container',
        icon: 'folder',
        dataType: 'object',
        path: ['$steps', `step_${stepIndex}`, 'formData'],
        isExpanded: stepIndex === currentStepIndex,
        description: `Form fields from ${step.title || `Step ${stepIndex}`}`,
        children: formFields
      })
    }

    if (isFunctionLike) {
      let outputSchema: any | undefined
      if ((step as any).type === FlowStepType.FUNCTION) {
        outputSchema = (step as any).functionConfig?.outputSchema
      } else {
        outputSchema = (step as any).agentConfig?.outputSchema
      }

      stepChildren.push({
        id: `step_${stepIndex}_resultData`,
        label: 'resultData',
        type: 'container',
        icon: 'folder',
        dataType: 'object',
        path: ['$steps', `step_${stepIndex}`, 'resultData'],
        isExpanded: stepIndex === currentStepIndex,
        description: 'Primary payload produced by the step',
        children: schemaToNodes(
          outputSchema,
          ['$steps', `step_${stepIndex}`, 'resultData'],
          `step_${stepIndex}_resultData_`
        )
      })

      stepChildren.push({
        id: `step_${stepIndex}_success`,
        label: 'success',
        type: 'field',
        icon: 'check-circle',
        dataType: 'boolean',
        path: ['$steps', `step_${stepIndex}`, 'success'],
        description: 'Indicates whether the step succeeded',
        isExpanded: false,
        children: []
      })

      stepChildren.push({
        id: `step_${stepIndex}_error`,
        label: 'error',
        type: 'field',
        icon: 'alert-circle',
        dataType: 'string',
        path: ['$steps', `step_${stepIndex}`, 'error'],
        description: 'Error message if any',
        isExpanded: false,
        children: []
      })
    }

    stepChildren.push({
      id: `step_${stepIndex}_status`,
      label: 'status',
      type: 'field',
      icon: 'activity',
      dataType: 'string',
      path: ['$steps', `step_${stepIndex}`, 'status'],
      description: 'Step status (PENDING, COMPLETED, etc.)',
      isExpanded: false,
      children: []
    })

    stepChildren.push({
      id: `step_${stepIndex}_executedBy`,
      label: 'executedBy',
      type: 'field',
      icon: 'user',
      dataType: 'string',
      path: ['$steps', `step_${stepIndex}`, 'executedBy'],
      description: 'User who completed this step',
      isExpanded: false,
      children: []
    })

    stepChildren.push({
      id: `step_${stepIndex}_timestamp`,
      label: 'timestamp',
      type: 'field',
      icon: 'clock',
      dataType: 'datetime',
      path: ['$steps', `step_${stepIndex}`, 'timestamp'],
      description: 'Step completion time',
      isExpanded: false,
      children: []
    })

    stepsNode.children!.push({
      id: `step_${stepIndex}`,
      label: `Step ${stepIndex}: ${step.title || `Step ${stepIndex}`}${stepIndex === currentStepIndex ? ' (current)' : ''}`,
      type: 'step',
      icon: 'square',
      path: ['$steps', `step_${stepIndex}`],
      isExpanded: stepIndex === currentStepIndex,
      metadata: {
        stepIndex,
        isCurrent: stepIndex === currentStepIndex
      },
      children: stepChildren
    })
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
 */
export const buildExpressionTree = (
  template: FlowTemplate,
  stepIndex: number,
  catalogs?: CatalogMetadata[],
  entitySchemas?: Record<string, EntitySchema> | null
): TreeNode[] => {
  const nodes: TreeNode[] = []
  nodes.push(buildWorkflowNode())
  nodes.push(buildStepsNode(template, stepIndex))
  nodes.push(buildCatalogsNode(catalogs))
  nodes.push(buildEntitiesRootNode(entitySchemas || null))
  nodes.push(buildOrgChartNode())
  return nodes.filter(Boolean)
}

/**
 * Build expression string from path array
 */
export const pathToExpression = (path: string[]): string => {
  if (path.length === 0) return ''

  let expression = path[0]

  for (let pathIndex = 1; pathIndex < path.length; pathIndex += 1) {
    const segment = path[pathIndex]
    if (segment.startsWith('[')) {
      expression += segment
    } else {
      expression += `.${segment}`
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

  for (let stepIndex = 0; stepIndex < currentStepIndex; stepIndex += 1) {
    const step = template.steps[stepIndex]
    if (!step) continue

    const fields = step.form || []
    fields.forEach(field => {
      suggestions.push({
        name: field.name,
        label: field.label || field.name,
        expression: `{{$steps.step_${stepIndex}.formData.${field.name}}}`,
        type: mapInputTypeToDataType(field.type),
        stepIndex,
        stepTitle: step.title || `Step ${stepIndex}`
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

  const normalizedSearchTerm = searchTerm.toLowerCase()
  const filtered: TreeNode[] = []

  for (const node of nodes) {
    const matches =
      node.label.toLowerCase().includes(normalizedSearchTerm) ||
      node.description?.toLowerCase().includes(normalizedSearchTerm)
    const filteredChildren = node.children ? filterTreeNodes(node.children, searchTerm) : []

    if (matches || filteredChildren.length > 0) {
      filtered.push({
        ...node,
        children: filteredChildren.length > 0 ? filteredChildren : node.children,
        isExpanded: true
      })
    }
  }

  return filtered
}
