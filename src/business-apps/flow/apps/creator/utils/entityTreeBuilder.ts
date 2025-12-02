/**
 * Entity Tree Builder
 *
 * Builds tree nodes from entity schemas fetched from backend.
 * Used by expression builder to provide visual entity navigation.
 */

import { TreeNode } from '../types/expressionTree'
import { EntitySchema, EntityFieldSchema, EntityFieldType, EntityFieldTypeValue } from '../hooks/useEntitySchemas'

/**
 * Field type to icon mapping
 */
const FIELD_TYPE_ICONS: Record<string, string> = {
  [EntityFieldType.STRING]: 'text',
  [EntityFieldType.NUMBER]: 'hash',
  [EntityFieldType.BOOLEAN]: 'toggle-left',
  [EntityFieldType.DATE]: 'calendar',
  [EntityFieldType.EMAIL]: 'mail',
  [EntityFieldType.URL]: 'link',
  [EntityFieldType.CURRENCY]: 'dollar-sign',
  [EntityFieldType.CATALOG]: 'book',
  [EntityFieldType.REFERENCE]: 'link',
  [EntityFieldType.ARRAY]: 'list',
  [EntityFieldType.OBJECT]: 'folder'
}

/**
 * Category display names
 */
const CATEGORY_NAMES: Record<string, string> = {
  basic: 'Basic Information',
  contact: 'Contact Information',
  company: 'Company Information',
  financial: 'Financial Information',
  status: 'Status & Classification',
  relationships: 'Relationships',
  metadata: 'Metadata',
  organization: 'Organization',
  skills: 'Skills & Capabilities',
  location: 'Location',
  assignment: 'Assignment',
  other: 'Other'
}

/**
 * Get icon for field type
 */
const getFieldTypeIcon = (fieldType: EntityFieldTypeValue): string => {
  return FIELD_TYPE_ICONS[fieldType] || 'circle'
}

/**
 * Get category display name
 */
const getCategoryDisplayName = (category: string): string => {
  return CATEGORY_NAMES[category] || category
}

/**
 * Build tree nodes for entity fields
 */
const buildFieldNodes = (fields: EntityFieldSchema[], pathPrefix: string): TreeNode[] => {
  // Group fields by category
  const fieldsByCategory = fields.reduce(
    (acc, field) => {
      const category = field.category || 'other'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(field)
      return acc
    },
    {} as Record<string, EntityFieldSchema[]>
  )

  // Build category nodes
  const categoryNodes: TreeNode[] = []

  for (const [category, categoryFields] of Object.entries(fieldsByCategory)) {
    const fieldNodes: TreeNode[] = categoryFields.map(field => {
      const fieldPath = `${pathPrefix}.${field.name}`
      const node: TreeNode = {
        id: `field-${fieldPath}`,
        label: field.displayName,
        type: 'field',
        icon: field.icon || getFieldTypeIcon(field.type),
        dataType: field.type,
        path: fieldPath.split('.'),
        description: field.description,
        isExpanded: false,
        children: []
      }

      // Add nested fields for objects and catalogs
      if (field.fields && field.fields.length > 0) {
        node.children = field.fields.map(nestedField => ({
          id: `field-${fieldPath}.${nestedField.name}`,
          label: nestedField.displayName,
          type: 'field',
          icon: nestedField.icon || getFieldTypeIcon(nestedField.type),
          dataType: nestedField.type,
          path: `${fieldPath}.${nestedField.name}`.split('.'),
          description: nestedField.description,
          isExpanded: false,
          children: []
        }))
      }

      return node
    })

    // Create category node
    categoryNodes.push({
      id: `category-${pathPrefix}-${category}`,
      label: getCategoryDisplayName(category),
      type: 'category',
      icon: 'folder',
      isExpanded: false,
      children: fieldNodes
    })
  }

  return categoryNodes
}

/**
 * Build tree node for a single entity
 */
export const buildEntityTreeNode = (schema: EntitySchema): TreeNode => {
  const pathPrefix = `$entity.${schema.type}.{id}`

  return {
    id: `entity-${schema.type}`,
    label: schema.displayName,
    type: 'entity',
    icon: schema.icon || 'database',
    description: schema.description,
    isExpanded: false,
    children: [
      {
        id: `entity-${schema.type}-browse`,
        label: `🔍 Browse ${schema.displayName}`,
        type: 'entity-browser',
        icon: 'folder-open',
        description: `Search and browse ${schema.displayName.toLowerCase()} entities`,
        isExpanded: false,
        metadata: {
          entityType: schema.type,
          loadingState: 'idle',
          offset: 0,
          hasMore: false
        },
        children: []
      },
      ...buildFieldNodes(schema.fields, pathPrefix)
    ]
  }
}

/**
 * Build tree nodes for all entities
 */
export const buildEntityTreeNodes = (schemas: Record<string, EntitySchema>): TreeNode[] => {
  const entities = Object.values(schemas)

  // Sort entities by display name
  entities.sort((a, b) => a.displayName.localeCompare(b.displayName))

  return entities.map(schema => buildEntityTreeNode(schema))
}

/**
 * Build entities root node with all entity children
 */
export const buildEntitiesRootNode = (schemas: Record<string, EntitySchema> | null): TreeNode => {
  if (!schemas || Object.keys(schemas).length === 0) {
    return {
      id: 'entities',
      label: 'Entities',
      type: 'entities',
      icon: 'database',
      description: 'Entity references (CRM, HR, Assets)',
      isExpanded: false,
      children: [
        {
          id: 'entities-loading',
          label: 'Loading entities...',
          type: 'info',
          icon: 'loader',
          isExpanded: false,
          children: []
        }
      ]
    }
  }

  const entityNodes = buildEntityTreeNodes(schemas)

  return {
    id: 'entities',
    label: 'Entities',
    type: 'entities',
    icon: 'database',
    description: `Entity references (${Object.keys(schemas).length} types available)`,
    isExpanded: false,
    children: entityNodes
  }
}

/**
 * Get entity field path for expression
 * Converts tree node path to entity expression
 */
export const getEntityExpressionPath = (node: TreeNode): string => {
  if (!node.path) return ''

  const pathArray = node.path

  // Entity expression pattern: $entity.entityType.{id}.fieldName
  // Example: $entity.lead.{id}.firstName

  if (pathArray.length < 4) return ''

  // pathArray format: ['$entity', 'lead', '{id}', 'firstName', ...]
  return pathArray.join('.')
}

/**
 * Generate quick action patterns for common entity expressions
 */
export const generateEntityQuickActions = (
  schemas: Record<string, EntitySchema> | null
): Array<{ label: string; expression: string; description: string }> => {
  if (!schemas) return []

  const quickActions: Array<{ label: string; expression: string; description: string }> = []

  // Generate common patterns for each entity
  for (const schema of Object.values(schemas)) {
    const entityType = schema.type
    const displayName = schema.displayName

    // Find common fields
    const nameField = schema.fields.find(f => f.name === 'name' || f.name === 'displayName')
    const firstNameField = schema.fields.find(f => f.name === 'firstName')
    const lastNameField = schema.fields.find(f => f.name === 'lastName')
    const emailField = schema.fields.find(f => f.type === 'email')

    // Add quick actions for this entity
    if (nameField) {
      quickActions.push({
        label: `${displayName} Name`,
        expression: `{{$entity.${entityType}.{id}.${nameField.name}}}`,
        description: `Get ${displayName.toLowerCase()} name by ID`
      })
    }

    if (firstNameField && lastNameField) {
      quickActions.push({
        label: `${displayName} Full Name`,
        expression: `{{$entity.${entityType}.{id}.${firstNameField.name}}} {{$entity.${entityType}.{id}.${lastNameField.name}}}`,
        description: `Get ${displayName.toLowerCase()} full name`
      })
    }

    if (emailField) {
      quickActions.push({
        label: `${displayName} Email`,
        expression: `{{$entity.${entityType}.{id}.${emailField.name}}}`,
        description: `Get ${displayName.toLowerCase()} email address`
      })
    }
  }

  return quickActions
}
