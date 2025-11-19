import { FlowTemplate } from '../types/flowTemplate'
import { TreeNode } from '../types/expressionTree'
import { CatalogMetadata } from '../types/catalogTypes'

/**
 * Build complete expression tree for data navigator
 */
export const buildExpressionTree = (
  template: FlowTemplate,
  stepIndex: number,
  catalogs?: CatalogMetadata[]
): TreeNode[] => {
  const nodes: TreeNode[] = []

  // Add workflow node
  nodes.push(buildWorkflowNode())

  // Add steps node
  nodes.push(buildStepsNode(template, stepIndex))

  // Add catalogs node (if catalogs are available)
  if (catalogs && catalogs.length > 0) {
    nodes.push(buildCatalogsNode(catalogs))
  }

  // Add entities node (placeholder for future implementation)
  nodes.push(buildEntitiesNode())

  return nodes.filter(Boolean)
}

/**
 * Build workflow data node
 */
const buildWorkflowNode = (): TreeNode => {
  return {
    id: 'workflow',
    label: 'Workflow',
    type: 'workflow',
    icon: 'workflow',
    description: 'Workflow metadata and context',
    isExpanded: false,
    children: [
      {
        id: 'workflow-initiator',
        label: 'initiator',
        type: 'field',
        icon: 'user',
        dataType: 'string',
        path: ['$workflow', 'initiator'],
        expressionPath: '$workflow.initiator',
        description: 'User name who started the workflow'
      },
      {
        id: 'workflow-name',
        label: 'name',
        type: 'field',
        icon: 'tag',
        dataType: 'string',
        path: ['$workflow', 'name'],
        expressionPath: '$workflow.name',
        description: 'Name of the workflow'
      },
      {
        id: 'workflow-workflowId',
        label: 'workflowId',
        type: 'field',
        icon: 'hash',
        dataType: 'string',
        path: ['$workflow', 'workflowId'],
        expressionPath: '$workflow.workflowId',
        description: 'Unique workflow instance ID'
      },
      {
        id: 'workflow-status',
        label: 'status',
        type: 'field',
        icon: 'info',
        dataType: 'string',
        path: ['$workflow', 'status'],
        expressionPath: '$workflow.status',
        description: 'Current workflow status'
      },
      {
        id: 'workflow-correlationId',
        label: 'correlationId',
        type: 'field',
        icon: 'link',
        dataType: 'string',
        path: ['$workflow', 'correlationId'],
        expressionPath: '$workflow.correlationId',
        description: 'External correlation ID'
      }
    ]
  }
}

/**
 * Build steps node with all workflow steps
 */
const buildStepsNode = (template: FlowTemplate, currentStepIndex: number): TreeNode => {
  const stepNodes: TreeNode[] = template.steps.map((step, index) => {
    const stepKey = step.stepKey || `step_${index}`
    const isCurrent = index === currentStepIndex
    const stepLabel = `${step.label || step.title || `Step ${index}`}`

    // Build form data fields
    const formDataChildren: TreeNode[] = []
    // step.form is already an array of InputBlock[], not an object with inputs property
    const formInputs = step.form || step.inputs || []
    if (formInputs.length > 0) {
      formInputs.forEach(input => {
        formDataChildren.push({
          id: `step-${stepKey}-field-${input.name}`,
          label: `${input.label} (${input.name})`,
          type: 'field',
          icon: getFieldIcon(input.type),
          dataType: mapInputType(input.type),
          path: ['$steps', stepKey, 'formData', input.name],
          expressionPath: `$steps.${stepKey}.formData.${input.name}`,
          description: input.description
        })
      })
    }

    const stepChildren: TreeNode[] = []

    // Add formData container if there are form fields
    if (formDataChildren.length > 0) {
      stepChildren.push({
        id: `step-${stepKey}-formData`,
        label: 'formData',
        type: 'container',
        icon: 'folder',
        description: 'Form input data',
        isExpanded: isCurrent, // Auto-expand current step's form data
        children: formDataChildren
      })
    }

    // Add step metadata fields
    stepChildren.push(
      {
        id: `step-${stepKey}-status`,
        label: 'status',
        type: 'field',
        icon: 'info',
        dataType: 'string',
        path: ['$steps', stepKey, 'status'],
        expressionPath: `$steps.${stepKey}.status`,
        description: 'Execution status of the step'
      },
      {
        id: `step-${stepKey}-executedBy`,
        label: 'executedBy',
        type: 'field',
        icon: 'user',
        dataType: 'string',
        path: ['$steps', stepKey, 'executedBy'],
        expressionPath: `$steps.${stepKey}.executedBy`,
        description: 'User who completed this step'
      },
      {
        id: `step-${stepKey}-timestamp`,
        label: 'timestamp',
        type: 'field',
        icon: 'clock',
        dataType: 'datetime',
        path: ['$steps', stepKey, 'timestamp'],
        expressionPath: `$steps.${stepKey}.timestamp`,
        description: 'When the step was completed'
      }
    )

    return {
      id: `step-${stepKey}`,
      label: `${stepLabel}${isCurrent ? ' (current)' : ''}`,
      type: 'step',
      icon: 'circle',
      description: `Step ${index}: ${step.title}`,
      isExpanded: isCurrent, // Auto-expand current step
      metadata: {
        stepIndex: index,
        isCurrent
      },
      children: stepChildren
    }
  })

  return {
    id: 'steps',
    label: 'Steps',
    type: 'steps',
    icon: 'database',
    description: 'Previous workflow steps data',
    isExpanded: true, // Always expanded to show steps
    children: stepNodes
  }
}

/**
 * Build catalogs node with all available catalogs
 */
const buildCatalogsNode = (catalogs: CatalogMetadata[]): TreeNode => {
  const catalogNodes: TreeNode[] = catalogs.map(catalog => {
    // Build field nodes
    const fieldNodes: TreeNode[] = catalog.fields.map(field => ({
      id: `catalog-${catalog.catalogIdentifier}-field-${field.name}`,
      label: `${field.label} (${field.name})`,
      type: 'catalog-field',
      icon: getFieldIcon(field.type),
      dataType: field.type,
      expressionPath: `$catalog.${catalog.catalogIdentifier}[ID].${field.name}`,
      expressionTemplate: `{{$catalog.${catalog.catalogIdentifier}[ID_HERE].${field.name}}}`,
      description: field.description || `${field.label} field`,
      metadata: {
        catalogId: catalog.catalogIdentifier,
        version: catalog.version,
        required: field.required
      }
    }))

    // Build description with sample entries
    const descriptionParts = [catalog.description || `Catalog: ${catalog.displayName}`]

    if (catalog.sampleEntries && catalog.sampleEntries.length > 0) {
      descriptionParts.push('\n\nSample entries:')
      catalog.sampleEntries.forEach(entry => {
        descriptionParts.push(`• ${entry.displayName}${entry.preview ? ` - ${entry.preview}` : ''}`)
      })
    }

    return {
      id: `catalog-${catalog.catalogIdentifier}`,
      label: catalog.totalCount ? `${catalog.displayName} (${catalog.totalCount} entries)` : catalog.displayName,
      type: 'catalog',
      icon: 'database',
      description: descriptionParts.join('\n'),
      isExpanded: false,
      metadata: {
        catalogId: catalog.catalogIdentifier,
        version: catalog.version,
        totalCount: catalog.totalCount
      },
      children: [
        {
          id: `catalog-${catalog.catalogIdentifier}-reference`,
          label: '[Reference by ID]',
          type: 'catalog-container',
          icon: 'hash',
          expressionTemplate: `{{$catalog.${catalog.catalogIdentifier}[ID_HERE]}}`,
          description: 'Click to insert catalog reference template. Replace ID_HERE with actual ID or expression.',
          metadata: {
            catalogId: catalog.catalogIdentifier,
            version: catalog.version
          }
        },
        {
          id: `catalog-${catalog.catalogIdentifier}-fields`,
          label: 'Fields',
          type: 'catalog-container',
          icon: 'list',
          description: `Available fields in ${catalog.displayName} catalog`,
          isExpanded: false,
          children: fieldNodes
        },
        {
          id: `catalog-${catalog.catalogIdentifier}-browse`,
          label: '🔍 Browse Entries',
          type: 'catalog-browser',
          icon: 'folder-open',
          description: `Click to browse actual entries from ${catalog.displayName} catalog. Loads ${catalog.totalCount || 'available'} entries with pagination.`,
          isExpanded: false,
          metadata: {
            catalogId: catalog.catalogIdentifier,
            version: catalog.version,
            totalCount: catalog.totalCount,
            loadingState: 'idle' // idle | loading | loaded | error
          },
          children: [] // Will be populated when browsed
        }
      ]
    }
  })

  return {
    id: 'catalogs',
    label: 'Catalogs',
    type: 'container',
    icon: 'folder-open',
    description: 'External catalog data sources',
    isExpanded: false,
    children: catalogNodes
  }
}

/**
 * Build entities node (placeholder)
 */
const buildEntitiesNode = (): TreeNode => {
  return {
    id: 'entities',
    label: 'Entities',
    type: 'container',
    icon: 'link',
    description: 'External entity references (coming soon)',
    isExpanded: false,
    children: []
  }
}

/**
 * Get appropriate icon for field type
 */
const getFieldIcon = (type: string): string => {
  switch (type?.toLowerCase()) {
    case 'text':
    case 'string':
    case 'textarea':
      return 'type'
    case 'number':
    case 'integer':
      return 'hash'
    case 'date':
      return 'calendar'
    case 'datetime':
    case 'timestamp':
      return 'clock'
    case 'boolean':
    case 'checkbox':
      return 'check-square'
    case 'select':
    case 'dropdown':
      return 'list'
    case 'object':
      return 'box'
    case 'array':
      return 'list'
    default:
      return 'circle'
  }
}

/**
 * Map input type to data type
 */
const mapInputType = (type: string): TreeNode['dataType'] => {
  switch (type?.toLowerCase()) {
    case 'text':
    case 'textarea':
    case 'email':
    case 'url':
      return 'string'
    case 'number':
    case 'integer':
      return 'number'
    case 'date':
      return 'date'
    case 'datetime':
    case 'timestamp':
      return 'datetime'
    case 'checkbox':
    case 'boolean':
      return 'boolean'
    default:
      return 'string'
  }
}

/**
 * Convert path array to expression string
 */
export const pathToExpression = (path: string[]): string => {
  if (!path || path.length === 0) return ''
  return `{{${path.join('.')}}}`
}

/**
 * Search tree nodes by query
 */
export const searchTreeNodes = (nodes: TreeNode[], query: string): TreeNode[] => {
  if (!query.trim()) return nodes

  const lowerQuery = query.toLowerCase()

  const filterNode = (node: TreeNode): TreeNode | null => {
    // Check if current node matches
    const matches =
      node.label.toLowerCase().includes(lowerQuery) ||
      node.description?.toLowerCase().includes(lowerQuery) ||
      node.expressionPath?.toLowerCase().includes(lowerQuery)

    // Recursively filter children
    const filteredChildren = node.children
      ? node.children.map(filterNode).filter((child): child is TreeNode => child !== null)
      : []

    // Return node if it matches or has matching children
    if (matches || filteredChildren.length > 0) {
      return {
        ...node,
        isExpanded: true, // Auto-expand matching nodes
        children: filteredChildren.length > 0 ? filteredChildren : node.children
      }
    }

    return null
  }

  return nodes.map(filterNode).filter((node): node is TreeNode => node !== null)
}
