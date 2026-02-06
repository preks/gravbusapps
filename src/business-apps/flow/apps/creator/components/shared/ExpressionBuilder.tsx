import React, { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Textarea,
  Badge,
  ToggleGroup,
  ToggleGroupItem,
  Separator,
  Card,
  CardContent,
  CardHeader,
  Alert,
  AlertTitle,
  AlertDescription
} from '@newwork/nw-design-system'
import { Network, Type, CheckCircle, AlertCircle, Copy, X, Loader2, TestTube2 } from 'lucide-react'
import { FlowTemplate, InputType } from '../../types/flowTemplate'
import { TreeNode as TreeNodeType } from '../../types/expressionTree'
import { CatalogMetadata } from '../../types/catalogTypes'
import { BaseEntity, isBaseEntity, getEntityDisplayLabel, getEntityDescription } from '../../types/baseEntity'
import { TreeNavigator } from './TreeNavigator'
import { QuickActions } from './QuickActions'
import { HumanReadablePreview } from './HumanReadablePreview'
import { buildExpressionTree, pathToExpression } from '../../utils/expressionTreeBuilder'
import { useExpressionValidator } from '../../hooks/useExpressionValidator'
import { useExpressionTesting } from '../../hooks/useExpressionTesting'
import { useCatalogDiscovery } from '../../hooks/useCatalogDiscovery'
import { useEntitySchemas, clearEntitySchemasCache } from '../../hooks/useEntitySchemas'
import { useDatasource } from '../../hooks/useDatasource'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { env } from '@/common/env/EnvUtils'

interface ExpressionBuilderProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  value: string
  onChange: (value: string) => void
  template: FlowTemplate
  stepIndex: number
  context: BusinessAppContextProps // NEW: For catalog fetching
  'data-testid'?: string
}

/**
 * Strict client-side validation for expression builder
 * Checks for common errors like invalid text outside expressions
 */
const validateExpressionStrict = (value: string): { isValid: boolean; message?: string } => {
  if (!value.trim()) {
    return { isValid: true }
  }

  // Extract all expressions
  const expressionRegex = /\{\{(.+?)\}\}/g
  const expressions = value.match(expressionRegex) || []

  // Remove all valid expressions to get the remaining text
  let remainingText = value
  expressions.forEach(expr => {
    remainingText = remainingText.replace(expr, '')
  })

  // Check if remaining text contains suspicious characters
  // Allow: letters, numbers, spaces, most punctuation including @ ; ` < >
  // Disallow: # $ % ^ & * ( ) + = { } [ ] | (expression-like characters)
  const suspiciousCharPattern = /[#$%^&*+={}[\]|]/

  if (suspiciousCharPattern.test(remainingText)) {
    const suspiciousChars = remainingText.match(suspiciousCharPattern)
    return {
      isValid: false,
      message: `Invalid character${suspiciousChars && suspiciousChars.length > 1 ? 's' : ''} outside expression: ${suspiciousChars?.join(', ')}`
    }
  }

  // Check that all expressions have valid syntax
  if (expressions.length === 0 && value.includes('{{')) {
    return {
      isValid: false,
      message: 'Incomplete expression - missing closing }}'
    }
  }

  if (expressions.length === 0 && value.includes('}}')) {
    return {
      isValid: false,
      message: 'Incomplete expression - missing opening {{'
    }
  }

  return { isValid: true }
}

/**
 * ExpressionBuilder - Hybrid tree + text expression builder
 *
 * Features:
 * - Tree mode: Visual navigation through available data
 * - Text mode: Manual expression editing with documentation
 * - Quick actions: Common patterns and field suggestions
 * - Real-time expression building
 */
export const ExpressionBuilder: React.FC<ExpressionBuilderProps> = ({
  isOpen,
  onOpenChange,
  value,
  onChange,
  template,
  stepIndex,
  context,
  'data-testid': testId = 'expression-builder'
}) => {
  const [mode, setMode] = useState<'tree' | 'text'>('tree')
  const [localValue, setLocalValue] = useState(value)
  const [recentExpressions, setRecentExpressions] = useState<string[]>([])
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [cursorPosition, setCursorPosition] = useState<number>(0)
  const [readableMap, setReadableMap] = useState<Record<string, string>>({})

  // Catalog state - NEW
  const [catalogs, setCatalogs] = useState<CatalogMetadata[]>([])
  const [catalogsLoading, setCatalogsLoading] = useState(false)
  const { fetchCatalogs, fetchCatalogEntries } = useCatalogDiscovery(context)

  // Entity schemas state - NEW
  const { schemas: entitySchemas, isLoading: schemasLoading } = useEntitySchemas({
    includeFields: true,
    enableCache: false // Caching disabled for debugging
  })

  // Log schema state for debugging
  useEffect(() => {
    console.log('Entity schemas state:', {
      hasSchemas: !!entitySchemas,
      isLoading: schemasLoading,
      schemaKeys: entitySchemas ? Object.keys(entitySchemas) : [],
      employeeSchema: entitySchemas?.employee,
      employeeFieldCount: entitySchemas?.employee?.fields?.length
    })
  }, [entitySchemas, schemasLoading])

  // Datasource for entity browsing
  const { list: listEntities } = useDatasource()

  // Dynamic tree data state
  const [treeData, setTreeData] = useState<TreeNodeType[]>([])

  // Validation state
  const { validateExpression } = useExpressionValidator(template, stepIndex, entitySchemas ?? undefined)
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; message?: string } | null>(null)
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Expression testing
  const { testExpression, testResult, isTesting, clearResult } = useExpressionTesting(
    template,
    stepIndex,
    context.accessToken
  )

  // Sync local value with prop
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Fetch catalogs on mount and rebuild tree - NEW
  useEffect(() => {
    const loadCatalogs = async () => {
      setCatalogsLoading(true)
      try {
        // Clear entity schemas cache to force fresh data (caching disabled for debugging)
        clearEntitySchemasCache()

        const catalogData = await fetchCatalogs()
        setCatalogs(catalogData)
        // Build initial tree with catalogs and entity schemas
        const initialTree = buildExpressionTree(template, stepIndex, catalogData, entitySchemas)
        setTreeData(initialTree)
      } catch (error) {
        console.error('Failed to load catalogs:', error)
      } finally {
        setCatalogsLoading(false)
      }
    }

    if (isOpen) {
      loadCatalogs()
    }
  }, [isOpen, fetchCatalogs, template, stepIndex, entitySchemas])

  // Debounced validation effect with backend API call
  useEffect(() => {
    // Clear previous timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current)
    }

    // Skip validation if empty
    if (!localValue.trim()) {
      setValidationResult({ isValid: true })
      return
    }

    // Set validating state immediately
    setValidationResult(null)

    // Debounce validation call (500ms)
    validationTimeoutRef.current = setTimeout(async () => {
      try {
        // First do strict client-side validation
        const clientValidation = validateExpressionStrict(localValue)

        if (!clientValidation.isValid) {
          setValidationResult(clientValidation)
          return
        }

        // Then do template-aware validation
        const templateValidation = await validateExpression(localValue)

        if (!templateValidation.isValid) {
          setValidationResult(templateValidation)
          return
        }

        // Then call backend API for thorough validation
        const apiUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine'

        // Create a complete template with ALL steps for cross-step validation
        const testTemplate = {
          ...template,
          name: template.name || '__validation_test__',
          description: template.description || 'Test template for expression validation',
          steps: template.steps.map(
            (step: any, idx: number) =>
              idx === stepIndex
                ? {
                    ...step,
                    title: localValue, // Test the expression in the current step
                    message: localValue,
                    form: step.form || [] // Preserve form fields
                  }
                : step // Keep other steps unchanged for cross-step validation
          )
        }

        const response = await fetch(`${apiUrl}/api/templates/validate-expressions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ template: testTemplate })
        })

        if (!response.ok) {
          setValidationResult({
            isValid: false,
            message: 'Validation service unavailable'
          })
          return
        }

        const result = await response.json()

        if (result.isValid) {
          setValidationResult({ isValid: true })
        } else {
          // Extract most relevant error message
          const errorMessage = result.errors && result.errors.length > 0 ? result.errors[0] : 'Invalid expression'
          setValidationResult({
            isValid: false,
            message: errorMessage
          })
        }
      } catch (error) {
        console.error('Expression validation error:', error)
        setValidationResult({
          isValid: false,
          message: 'Failed to validate expression'
        })
      }
    }, 500)

    // Cleanup
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current)
      }
    }
  }, [localValue, template, stepIndex, validateExpression])

  // Track cursor position
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalValue(e.target.value)
    setCursorPosition(e.target.selectionStart || 0)
  }

  const handleInputClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement
    setCursorPosition(target.selectionStart || 0)
  }

  const handleInputKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement
    setCursorPosition(target.selectionStart || 0)
  }

  /**
   * Build human-readable label for a node selection
   * Returns just the label - the HumanReadablePreview component handles visual display
   */
  const buildReadableLabel = (node: TreeNodeType): string => {
    return node.label || node.description || 'Field'
  }

  /**
   * Update tree node recursively
   */
  const updateTreeNode = (
    nodes: TreeNodeType[],
    nodeId: string,
    updater: (node: TreeNodeType) => TreeNodeType
  ): TreeNodeType[] => {
    return nodes.map(node => {
      if (node.id === nodeId) {
        return updater(node)
      }
      if (node.children) {
        return {
          ...node,
          children: updateTreeNode(node.children, nodeId, updater)
        }
      }
      return node
    })
  }

  /**
   * Handle Browse Entries click - load catalog entries dynamically
   */
  const handleBrowseEntries = async (node: TreeNodeType) => {
    if (node.type !== 'catalog-browser' || !node.metadata?.catalogId) {
      return
    }

    const catalogId = node.metadata.catalogId

    // Update node to loading state
    setTreeData(prevTree =>
      updateTreeNode(prevTree, node.id, n => ({
        ...n,
        label: '🔍 Loading entries...',
        metadata: { ...n.metadata, loadingState: 'loading' }
      }))
    )

    try {
      // Get catalog metadata first to retrieve correct version
      const catalog = catalogs.find(c => c.catalogIdentifier === catalogId)

      // Fetch first page of entries with correct version
      const entriesData = await fetchCatalogEntries(catalogId, {
        version: catalog?.version,
        limit: 20,
        offset: 0
      })

      // Build entry nodes
      const entryNodes: TreeNodeType[] = entriesData.entries.map(entry => ({
        id: `catalog-${catalogId}-entry-${entry.id}`,
        label: entry.displayName,
        type: 'catalog-entry' as const,
        icon: 'box',
        description: `Entry ID: ${entry.id}`,
        isExpanded: false,
        metadata: {
          catalogId,
          entryId: entry.id
        },
        expressionTemplate: `{{$catalog.${catalogId}['${entry.id}']}}`,
        children:
          catalog?.fields.map(field => ({
            id: `catalog-${catalogId}-entry-${entry.id}-field-${field.name}`,
            label: `${field.label}: ${entry.data[field.name] ?? 'N/A'}`,
            type: 'catalog-field' as const,
            icon: 'hash',
            dataType: field.type,
            description: field.description,
            expressionTemplate: `{{$catalog.${catalogId}['${entry.id}'].${field.name}}}`
          })) || []
      }))

      // Add "Load More" button if there are more entries
      if (entriesData.hasMore) {
        entryNodes.push({
          id: `catalog-${catalogId}-load-more`,
          label: `📄 Load More (${entriesData.totalCount - entriesData.entries.length} remaining)`,
          type: 'catalog-browser' as const,
          icon: 'folder-open',
          description: 'Click to load more entries',
          isExpanded: false,
          metadata: {
            catalogId,
            offset: entriesData.entries.length,
            hasMore: entriesData.hasMore,
            loadingState: 'idle'
          },
          children: []
        })
      }

      // Update tree with loaded entries
      setTreeData(prevTree =>
        updateTreeNode(prevTree, node.id, n => ({
          ...n,
          label: `🔍 Browse Entries (${entriesData.totalCount} total)`,
          isExpanded: true,
          children: entryNodes,
          metadata: {
            ...n.metadata,
            loadingState: 'loaded',
            offset: entriesData.entries.length,
            hasMore: entriesData.hasMore
          }
        }))
      )
    } catch (error) {
      console.error(`Failed to load entries for ${catalogId}:`, error)

      // Update to error state
      setTreeData(prevTree =>
        updateTreeNode(prevTree, node.id, n => ({
          ...n,
          label: '🔍 Browse Entries (Error)',
          metadata: { ...n.metadata, loadingState: 'error' }
        }))
      )
    }
  }

  /**
   * Handle Load More click - load next page of entries
   */
  const handleLoadMore = async (node: TreeNodeType) => {
    if (node.type !== 'catalog-browser' || !node.metadata?.catalogId || !node.metadata?.offset) {
      return
    }

    const catalogId = node.metadata.catalogId
    const offset = node.metadata.offset

    try {
      // Get catalog metadata first to retrieve correct version
      const catalog = catalogs.find(c => c.catalogIdentifier === catalogId)

      // Fetch next page with correct version
      const entriesData = await fetchCatalogEntries(catalogId, {
        version: catalog?.version,
        limit: 20,
        offset
      })

      // Get parent browse node to append entries
      const findBrowseNode = (nodes: TreeNodeType[]): TreeNodeType | null => {
        for (const n of nodes) {
          if (n.id === `catalog-${catalogId}-browse`) {
            return n
          }
          if (n.children) {
            const found = findBrowseNode(n.children)
            if (found) return found
          }
        }
        return null
      }

      const browseNode = findBrowseNode(treeData)
      if (!browseNode) return

      // Build new entry nodes
      const newEntryNodes: TreeNodeType[] = entriesData.entries.map(entry => ({
        id: `catalog-${catalogId}-entry-${entry.id}`,
        label: entry.displayName,
        type: 'catalog-entry' as const,
        icon: 'box',
        description: `Entry ID: ${entry.id}`,
        isExpanded: false,
        metadata: {
          catalogId,
          entryId: entry.id
        },
        expressionTemplate: `{{$catalog.${catalogId}['${entry.id}']}}`,
        children:
          catalog?.fields.map(field => ({
            id: `catalog-${catalogId}-entry-${entry.id}-field-${field.name}`,
            label: `${field.label}: ${entry.data[field.name] ?? 'N/A'}`,
            type: 'catalog-field' as const,
            icon: 'hash',
            dataType: field.type,
            description: field.description,
            expressionTemplate: `{{$catalog.${catalogId}['${entry.id}'].${field.name}}}`
          })) || []
      }))

      // Update tree - remove old "Load More" button and add new entries + new button if needed
      setTreeData(prevTree =>
        updateTreeNode(prevTree, browseNode.id, n => {
          const existingEntries = (n.children || []).filter((child: TreeNodeType) => child.type === 'catalog-entry')
          const allEntries = [...existingEntries, ...newEntryNodes]

          const children: TreeNodeType[] = [...allEntries]

          // Add new "Load More" if there are more entries
          if (entriesData.hasMore) {
            children.push({
              id: `catalog-${catalogId}-load-more`,
              label: `📄 Load More (${entriesData.totalCount - (offset + entriesData.entries.length)} remaining)`,
              type: 'catalog-browser' as const,
              icon: 'folder-open',
              description: 'Click to load more entries',
              isExpanded: false,
              metadata: {
                catalogId,
                offset: offset + entriesData.entries.length,
                hasMore: entriesData.hasMore,
                loadingState: 'idle'
              },
              children: []
            })
          }

          return {
            ...n,
            children,
            metadata: {
              ...n.metadata,
              offset: offset + entriesData.entries.length,
              hasMore: entriesData.hasMore
            }
          }
        })
      )
    } catch (error) {
      console.error(`Failed to load more entries for ${catalogId}:`, error)
    }
  }

  /**
   * Insert expression at current cursor position
   */
  const insertAtCursor = (textToInsert: string) => {
    const currentValue = localValue
    const position = inputRef.current?.selectionStart || cursorPosition || currentValue.length

    // Insert at cursor position
    const newValue = currentValue.slice(0, position) + textToInsert + currentValue.slice(position)
    setLocalValue(newValue)

    // Update cursor position to end of inserted text
    const newCursorPosition = position + textToInsert.length
    setCursorPosition(newCursorPosition)

    // Focus input and set cursor position
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition)
      }
    }, 0)
  }

  // --- Node Selection Handlers (extracted to reduce complexity) ---

  const handleCatalogBrowserSelect = (node: TreeNodeType) => {
    if (node.metadata?.offset) {
      handleLoadMore(node)
    } else if (node.metadata?.loadingState === 'idle') {
      handleBrowseEntries(node)
    }
  }

  const handleEntityInstanceSelect = (node: TreeNodeType) => {
    if (!node.expressionTemplate) return

    const entityType = (node.metadata?.entityType || 'employee').toLowerCase()
    const idExpr = node.expressionTemplate
    const formatted = `${entityType}://${idExpr}`

    setReadableMap(prev => ({ ...prev, [idExpr]: node.label || 'Entity' }))
    insertAtCursor(formatted)
  }

  const handleEntityFieldSelect = (node: TreeNodeType) => {
    if (!node.expressionTemplate) return

    const exprKey = node.expressionTemplate
    setReadableMap(prev => ({ ...prev, [exprKey]: node.label || 'Field' }))
    insertAtCursor(node.expressionTemplate)
  }

  const handleCatalogEntrySelect = (node: TreeNodeType) => {
    if (!node.expressionTemplate) return

    const readable = buildReadableLabel(node)
    const exprKey = node.expressionTemplate
    setReadableMap(prev => ({ ...prev, [exprKey]: readable }))
    insertAtCursor(node.expressionTemplate)
  }

  const handleFieldSelect = (node: TreeNodeType) => {
    if (!node.path) return

    // Entity fields from static entity schema
    if (node.path[0] === '$entity') {
      const expression = pathToExpression(node.path)
      setReadableMap(prev => ({ ...prev, [expression]: node.label || 'Entity Field' }))
      insertAtCursor(expression)
      return
    }

    // File inputs: insert file URL with fileId, name, and download path
    if (node.metadata?.inputType === InputType.FILE) {
      handleFileFieldSelect(node)
      return
    }

    // Entity data source fields (SELECT/MULTISELECT with entity data)
    if (node.metadata?.dataSourceType === 'ENTITY' && node.metadata?.dataSourceEntity) {
      handleEntityDataSourceFieldSelect(node)
      return
    }

    // Default: workflow/steps fields
    const expression = pathToExpression(node.path)
    const readable = buildReadableLabel(node)
    setReadableMap(prev => ({ ...prev, [expression]: readable }))
    insertAtCursor(expression)
  }

  const handleFileFieldSelect = (node: TreeNodeType) => {
    if (!node.path) return

    const idExpr = pathToExpression([...node.path, '[0]', 'fileId'])
    const fileNameExpr = pathToExpression([...node.path, '[0]', 'fileName'])
    const downloadExpr = pathToExpression([...node.path, '[0]', 'downloadPath'])
    const fileLink = `file://${idExpr}/name/${fileNameExpr}/url/${downloadExpr}`

    setReadableMap(prev => ({
      ...prev,
      [idExpr]: node.label || 'File ID',
      [fileNameExpr]: node.label || 'File Name',
      [downloadExpr]: node.label ? `${node.label} Download` : 'File Download'
    }))
    insertAtCursor(fileLink)
  }

  const handleEntityDataSourceFieldSelect = (node: TreeNodeType) => {
    if (!node.path) return

    const entityType = (node.metadata?.dataSourceEntity as string).toLowerCase()
    const idExpr = pathToExpression(node.path)
    const entityRef = `${entityType}://${idExpr}`

    setReadableMap(prev => ({ ...prev, [idExpr]: node.label || 'Entity' }))
    insertAtCursor(entityRef)
  }

  const handleCatalogFieldSelect = (node: TreeNodeType) => {
    if (node.expressionTemplate) {
      const readable = buildReadableLabel(node)
      const exprKey = node.expressionTemplate
      setReadableMap(prev => ({ ...prev, [exprKey]: readable }))
      insertAtCursor(node.expressionTemplate)
    } else if (node.expressionPath) {
      const expression = node.expressionPath.startsWith('{{') ? node.expressionPath : `{{${node.expressionPath}}}`
      const readable = buildReadableLabel(node)
      setReadableMap(prev => ({ ...prev, [expression]: readable }))
      insertAtCursor(expression)
    }
  }

  // --- Main Node Selection Handler ---

  const handleNodeSelect = (node: TreeNodeType) => {
    switch (node.type) {
      case 'catalog-browser':
        handleCatalogBrowserSelect(node)
        break
      case 'entity-browser':
        // Handled by inline search UI in TreeNode
        break
      case 'entity-instance':
        handleEntityInstanceSelect(node)
        break
      case 'entity-field':
        handleEntityFieldSelect(node)
        break
      case 'catalog-entry':
        handleCatalogEntrySelect(node)
        break
      case 'field':
        handleFieldSelect(node)
        break
      case 'catalog-field':
      case 'catalog-container':
        handleCatalogFieldSelect(node)
        break
    }
  }

  /**
   * Handle Entity Search - triggered from inline search input
   */
  const handleEntitySearch = async (nodeId: string, search: string) => {
    // Find the node in the tree
    const findNode = (nodes: TreeNodeType[], id: string): TreeNodeType | null => {
      for (const node of nodes) {
        if (node.id === id) return node
        if (node.children) {
          const found = findNode(node.children, id)
          if (found) return found
        }
      }
      return null
    }

    const node = findNode(treeData, nodeId)
    if (!node || node.type !== 'entity-browser' || !node.metadata?.entityType) {
      console.warn('handleEntitySearch: Node not found or invalid', { nodeId, node })
      return
    }

    console.log('handleEntitySearch: Starting search', { nodeId, search, entityType: node.metadata.entityType })
    await handleEntityBrowse(node, search)
  }

  /**
   * Handle Entity Browse - load entities via datasource API
   * Supports group filters for hierarchical entity browsing
   */
  const handleEntityBrowse = async (node: TreeNodeType, search?: string) => {
    if (node.type !== 'entity-browser' || !node.metadata?.entityType) {
      return
    }

    const entityType = node.metadata.entityType
    const searchTerm = search !== undefined ? search : node.metadata.search || ''
    const groupFilters = node.metadata.groupFilters as
      | Array<{ field: string; operator: string; value: any }>
      | undefined
    const groupDisplayName = node.metadata.groupDisplayName as string | undefined

    // Build display label
    const displayLabel = groupDisplayName || entityType

    // Set loading state
    setTreeData(prevTree =>
      updateTreeNode(prevTree, node.id, n => ({
        ...n,
        label: `🔍 Loading ${displayLabel}...`,
        metadata: { ...n.metadata, loadingState: 'loading', search: searchTerm }
      }))
    )

    try {
      // Convert group filters to FilterInput format
      const filters = groupFilters?.map(gf => ({
        field: gf.field,
        operator: gf.operator as any,
        value: gf.value
      }))

      const result = await listEntities(entityType, {
        search: searchTerm,
        limit: 20,
        offset: typeof node.metadata?.offset === 'number' ? node.metadata.offset : 0,
        filters: filters
      })

      const rawEntities = (result?.entities || []) as any[]
      const total = result?.meta.total || rawEntities.length
      const hasMore = !!result?.meta.hasMore
      const currentOffset = result?.meta.offset || 0

      // Validate entities conform to BaseEntity contract
      const entities: BaseEntity[] = rawEntities.filter(e => {
        if (!isBaseEntity(e)) {
          console.warn(`Entity does not conform to BaseEntity contract:`, e)
          return false
        }
        return true
      })

      // Log validation results
      if (entities.length < rawEntities.length) {
        console.warn(`${rawEntities.length - entities.length} entities filtered out due to invalid structure`)
      }

      // Log if API indicates non-conformance
      if (result?.meta.conformsToBaseEntity === false) {
        console.warn(`API reported that some entities do not conform to BaseEntity contract`)
      }

      // Build entity instance nodes with field children from schema
      // NOTE: Schema keys are lowercase, so we need to normalize the entity type
      const schemaKey = entityType.toLowerCase()
      const schema = entitySchemas?.[schemaKey]

      console.log('Building entity instance nodes:', {
        entityType,
        schemaKey,
        hasSchema: !!schema,
        schemaFieldCount: schema?.fields.length || 0,
        schemaFields: schema?.fields.map(f => f.name) || [],
        entityKeys: Object.keys(entities[0] || {}),
        firstEntity: entities[0],
        availableSchemaKeys: entitySchemas ? Object.keys(entitySchemas) : []
      })

      const instanceNodes: TreeNodeType[] = entities.map((entity: BaseEntity) => ({
        id: `entity-${entityType}-instance-${entity.id}`,
        label: getEntityDisplayLabel(entity),
        type: 'entity-instance' as const,
        icon: 'box',
        description: getEntityDescription(entity),
        isExpanded: false,
        expressionTemplate: `{{$entity.${entityType}.${entity.id}}}`,
        metadata: {
          entityType,
          entryId: entity.id,
          entityCode: entity.code,
          entityTypeValue: entity.type
        },
        children:
          schema?.fields.map(field => ({
            id: `entity-${entityType}-instance-${entity.id}-field-${field.name}`,
            label: `${field.displayName}: ${entity[field.name] ?? 'N/A'}`,
            type: 'entity-field' as const,
            icon: 'hash',
            dataType: field.type as any,
            description: field.description,
            expressionTemplate: `{{$entity.${entityType}.${entity.id}.${field.name}}}`
          })) || []
      }))

      // Add Load More if needed
      if (hasMore) {
        instanceNodes.push({
          id: `entity-${entityType}-load-more`,
          label: `📄 Load More (${Math.max(total - currentOffset - entities.length, 0)} remaining)`,
          type: 'entity-browser' as const,
          icon: 'folder-open',
          description: 'Click to load more entities',
          isExpanded: false,
          metadata: {
            entityType,
            offset: currentOffset + entities.length,
            hasMore: true,
            loadingState: 'idle',
            search: searchTerm
          },
          children: []
        })
      }

      // Update the tree under this browser node
      setTreeData(prevTree => {
        const updated = updateTreeNode(prevTree, node.id, n => {
          console.log(`Updating entity browser node:`, {
            nodeId: node.id,
            entityType,
            searchTerm,
            isExpanded: true,
            childrenCount: instanceNodes.length,
            hasChildren: instanceNodes.length > 0,
            firstChild: instanceNodes[0]?.label
          })
          return {
            ...n,
            label: `🔍 Browse ${displayLabel} (${total} total${searchTerm ? `, search="${searchTerm}"` : ''})`,
            isExpanded: true,
            children:
              typeof node.metadata?.offset === 'number' && node.metadata.offset > 0 && n.children
                ? // append mode (load more)
                  [...(n.children.filter((c: any) => c.type !== 'entity-browser') as any[]), ...instanceNodes]
                : // initial load (replace)
                  instanceNodes,
            metadata: {
              ...n.metadata,
              loadingState: 'loaded',
              offset: currentOffset + entities.length,
              hasMore,
              search: searchTerm // Save the search term in metadata
            }
          }
        })
        console.log('Tree updated, returning new tree')
        return updated
      })
    } catch (error) {
      console.error(`Failed to browse entities for ${displayLabel}:`, error)
      // Update to error state
      setTreeData(prevTree =>
        updateTreeNode(prevTree, node.id, n => ({
          ...n,
          label: `🔍 Browse ${displayLabel} (Error)`,
          metadata: { ...n.metadata, loadingState: 'error' }
        }))
      )
    }
  }

  const handleInsert = (expression: string) => {
    insertAtCursor(expression)
  }

  const handleApply = () => {
    onChange(localValue)

    // Add to recent expressions
    if (localValue && !recentExpressions.includes(localValue)) {
      setRecentExpressions(prev => [localValue, ...prev].slice(0, 5))
    }

    onOpenChange(false)
  }

  const handleClear = () => {
    setLocalValue('')
    setReadableMap({})
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(localValue)
  }

  // Determine if expression is valid for "Insert" button
  const isValid = validationResult?.isValid ?? false

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="nw:sm:max-w-[1280px] nw:max-h-[90vh] nw:flex nw:flex-col"
        style={{ width: '90vw' }}
        data-testid={testId}
      >
        {/* Sticky Header */}
        <DialogHeader className="nw:flex-shrink-0">
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Network className="gba:h-5 gba:w-5" />
            Expression Builder
          </DialogTitle>
          <DialogDescription>
            Build expressions visually by clicking through the tree, or switch to text mode to type manually.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="nw:flex-1 nw:overflow-y-auto nw:px-6">
          <div className="gba:space-y-4 gba:py-2">
            {/* Mode toggle */}
            <div className="gba:flex gba:items-center gba:justify-between">
              <ToggleGroup type="single" value={mode} onValueChange={val => val && setMode(val as 'tree' | 'text')}>
                <ToggleGroupItem
                  value="tree"
                  aria-label="Tree mode"
                  className="gba:gap-2 gba:px-6 gba:py-2"
                  data-testid={`${testId}-mode-tree`}
                >
                  <Network className="gba:h-4 gba:w-4" />
                  Tree Builder
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="text"
                  aria-label="Text mode"
                  className="gba:gap-2 gba:px-6 gba:py-2"
                  data-testid={`${testId}-mode-text`}
                >
                  <Type className="gba:h-4 gba:w-4" />
                  Manual
                </ToggleGroupItem>
              </ToggleGroup>

              <div className="gba:flex gba:items-center gba:gap-2">
                {!localValue.trim() ? (
                  <Badge variant="secondary" className="gba:text-xs">
                    Empty
                  </Badge>
                ) : validationResult === null ? (
                  <Badge variant="secondary" className="gba:text-xs">
                    <Loader2 className="gba:h-3 gba:w-3 gba:mr-1 gba:animate-spin" />
                    Validating...
                  </Badge>
                ) : validationResult.isValid ? (
                  <Badge variant="default" className="gba:bg-green-100 gba:text-green-800 gba:text-xs">
                    <CheckCircle className="gba:h-3 gba:w-3 gba:mr-1" />
                    Valid
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gba:text-xs" title={validationResult.message}>
                    <AlertCircle className="gba:h-3 gba:w-3 gba:mr-1" />
                    {validationResult.message || 'Invalid'}
                  </Badge>
                )}
              </div>
            </div>

            {/* Expression input */}
            <div className="gba:space-y-2">
              <div className="gba:flex gba:items-center gba:justify-between">
                <label className="gba:text-sm gba:font-medium">Current Expression</label>
                <Button variant="ghost" size="sm" onClick={handleCopy} data-testid={`${testId}-copy`}>
                  <Copy className="gba:h-3 gba:w-3 gba:mr-1" />
                  Copy
                </Button>
              </div>
              <div className="gba:space-y-1">
                <div className="gba:relative">
                  <Textarea
                    ref={inputRef}
                    value={localValue}
                    onChange={handleInputChange}
                    onClick={handleInputClick}
                    onKeyUp={handleInputKeyUp}
                    placeholder="Click fields in the tree to build expression..."
                    rows={4}
                    className={`gba:min-h-0 gba:font-mono gba:text-sm gba:bg-purple-50 gba:pr-10 gba:resize-y ${
                      validationResult && !validationResult.isValid ? 'gba:border-red-500' : ''
                    }`}
                    data-testid={`${testId}-input`}
                  />
                  {localValue && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLocalValue('')}
                      className="gba:absolute gba:right-1 gba:top-2 gba:h-7 gba:w-7 gba:p-0 hover:gba:bg-gray-200"
                      data-testid={`${testId}-clear-input`}
                    >
                      <X className="gba:h-4 gba:w-4 gba:text-gray-500" />
                    </Button>
                  )}
                </div>
                {/* Validation messages */}
                {validationResult && !validationResult.isValid && validationResult.message && (
                  <div
                    className="gba:flex gba:items-start gba:gap-1.5 gba:text-xs gba:text-red-600"
                    data-testid={`${testId}-error`}
                  >
                    <AlertCircle className="gba:h-3 gba:w-3 gba:mt-0.5 gba:shrink-0" />
                    <span>{validationResult.message}</span>
                  </div>
                )}
                {validationResult && validationResult.isValid && localValue.trim() && (
                  <div className="gba:text-xs gba:text-gray-500">
                    Note: Field names are validated at runtime when the workflow executes
                  </div>
                )}
                {/* Human-readable preview with rich pill components */}
                {localValue.trim() && (
                  <div className="gba:space-y-2 gba:rounded-lg gba:border gba:border-muted gba:bg-muted/30 gba:p-3">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Badge variant="secondary" className="gba:text-xs">
                        Human-readable
                      </Badge>
                      <span className="gba:text-xs gba:text-muted-foreground">Contextual view of expressions</span>
                    </div>
                    <HumanReadablePreview
                      value={localValue}
                      template={template}
                      readableOverrides={readableMap}
                      data-testid={`${testId}-preview`}
                    />
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Content area - changes based on mode */}
            {mode === 'tree' ? (
              <div className="gba:grid gba:grid-cols-2 gba:gap-4" style={{ minHeight: '400px' }}>
                {/* Left: Tree Navigator */}
                <TreeNavigator
                  nodes={treeData}
                  onSelect={handleNodeSelect}
                  onEntitySearch={handleEntitySearch}
                  isLoading={catalogsLoading}
                  data-testid={`${testId}-navigator`}
                />

                {/* Right: Quick Actions */}
                <QuickActions
                  template={template}
                  stepIndex={stepIndex}
                  onInsert={handleInsert}
                  recentExpressions={recentExpressions}
                  data-testid={`${testId}-actions`}
                />
              </div>
            ) : (
              /* Text mode - Documentation */
              <div>
                <Card>
                  <CardHeader>
                    <h3 className="gba:text-lg gba:font-semibold">Expression Syntax Reference</h3>
                    <p className="gba:text-sm gba:text-gray-600 gba:mt-1">
                      Use expressions to dynamically reference workflow data, previous steps, and external sources.
                    </p>
                  </CardHeader>
                  <CardContent className="gba:space-y-6 gba:text-sm">
                    {/* Workflow Data Section */}
                    <div>
                      <h4 className="gba:font-semibold gba:mb-2 gba:text-base">Workflow Data</h4>
                      <p className="gba:text-xs gba:text-gray-600 gba:mb-3">
                        Access information about the current workflow execution
                      </p>
                      <div className="gba:space-y-2">
                        <code className="gba:block gba:p-3 gba:bg-gray-100 gba:rounded gba:font-mono gba:text-xs">
                          {'{{$workflow.initiator}}'}
                          <br />
                          <span className="gba:text-gray-600" style={{ fontSize: '10px' }}>
                            → User name who started the workflow
                          </span>
                        </code>
                        <code className="gba:block gba:p-3 gba:bg-gray-100 gba:rounded gba:font-mono gba:text-xs">
                          {'{{$workflow.name}}'}
                          <br />
                          <span className="gba:text-gray-600" style={{ fontSize: '10px' }}>
                            → Name of the workflow
                          </span>
                        </code>
                        <code className="gba:block gba:p-3 gba:bg-gray-100 gba:rounded gba:font-mono gba:text-xs">
                          {'{{$workflow.workflowId}}'}
                          <br />
                          <span className="gba:text-gray-600" style={{ fontSize: '10px' }}>
                            → Unique workflow instance ID
                          </span>
                        </code>
                        <code className="gba:block gba:p-3 gba:bg-gray-100 gba:rounded gba:font-mono gba:text-xs">
                          {'{{$workflow.status}}'}
                          <br />
                          <span className="gba:text-gray-600" style={{ fontSize: '10px' }}>
                            → Current workflow status
                          </span>
                        </code>
                        <code className="gba:block gba:p-3 gba:bg-gray-100 gba:rounded gba:font-mono gba:text-xs">
                          {'{{$workflow.correlationId}}'}
                          <br />
                          <span className="gba:text-gray-600" style={{ fontSize: '10px' }}>
                            → External correlation ID
                          </span>
                        </code>
                      </div>
                    </div>

                    {/* Previous Steps Section */}
                    <div>
                      <h4 className="gba:font-semibold gba:mb-2 gba:text-base">Previous Step Data</h4>
                      <p className="gba:text-xs gba:text-gray-600 gba:mb-3">
                        Reference form data and metadata from previous workflow steps
                      </p>
                      <div className="gba:space-y-2">
                        <code className="gba:block gba:p-3 gba:bg-gray-100 gba:rounded gba:font-mono gba:text-xs">
                          {'{{$steps.step_0.formData.fieldName}}'}
                          <br />
                          <span className="gba:text-gray-600" style={{ fontSize: '10px' }}>
                            → Form field value from step 0
                          </span>
                        </code>
                        <code className="gba:block gba:p-3 gba:bg-gray-100 gba:rounded gba:font-mono gba:text-xs">
                          {'{{$steps.step_0.status}}'}
                          <br />
                          <span className="gba:text-gray-600" style={{ fontSize: '10px' }}>
                            → Execution status of step 0
                          </span>
                        </code>
                        <code className="gba:block gba:p-3 gba:bg-gray-100 gba:rounded gba:font-mono gba:text-xs">
                          {'{{$steps.step_0.executedBy}}'}
                          <br />
                          <span className="gba:text-gray-600" style={{ fontSize: '10px' }}>
                            → User who completed step 0
                          </span>
                        </code>
                        <code className="gba:block gba:p-3 gba:bg-gray-100 gba:rounded gba:font-mono gba:text-xs">
                          {'{{$steps.step_0.timestamp}}'}
                          <br />
                          <span className="gba:text-gray-600" style={{ fontSize: '10px' }}>
                            → When step 0 was completed
                          </span>
                        </code>
                      </div>
                    </div>

                    {/* Mixed Text Section */}
                    <div>
                      <h4 className="gba:font-semibold gba:mb-2 gba:text-base">Mixed Text & Expressions</h4>
                      <p className="gba:text-xs gba:text-gray-600 gba:mb-3">
                        Combine static text with dynamic expressions
                      </p>
                      <div className="gba:space-y-2">
                        <code className="gba:block gba:p-3 gba:bg-gray-100 gba:rounded gba:font-mono gba:text-xs">
                          {'Hello {{$workflow.initiator}}, welcome!'}
                          <br />
                          <span className="gba:text-gray-600" style={{ fontSize: '10px' }}>
                            → Personalized greeting
                          </span>
                        </code>
                        <code className="gba:block gba:p-3 gba:bg-gray-100 gba:rounded gba:font-mono gba:text-xs">
                          {'Request from {{$steps.step_0.formData.requester}} is ready'}
                          <br />
                          <span className="gba:text-gray-600" style={{ fontSize: '10px' }}>
                            → Dynamic message with form data
                          </span>
                        </code>
                      </div>
                    </div>

                    {/* Future Features Section */}
                    <div className="gba:border-t gba:pt-4">
                      <h4 className="gba:font-semibold gba:mb-2 gba:text-base gba:text-gray-500">Coming Soon</h4>
                      <p className="gba:text-xs gba:text-gray-500 gba:mb-3 gba:italic">
                        These features are planned for future releases
                      </p>
                      <div className="gba:space-y-3 gba:opacity-50">
                        <div>
                          <h5 className="gba:font-medium gba:mb-1 gba:text-sm">Catalog Data</h5>
                          <code className="gba:block gba:p-2 gba:bg-gray-50 gba:rounded gba:text-xs">
                            {'{{$catalog.asset-management[0].name}}'}
                            <br />
                            {'{{$catalog.employees[emp-001].email}}'}
                          </code>
                        </div>
                        <div>
                          <h5 className="gba:font-medium gba:mb-1 gba:text-sm">Entity References</h5>
                          <code className="gba:block gba:p-2 gba:bg-gray-50 gba:rounded gba:text-xs">
                            {'{{$entity.ticket.TKT-123.subject}}'}
                            <br />
                            {'{{$entity.employee.{{$workflow.initiator}}.email}}'}
                          </code>
                        </div>
                      </div>
                    </div>

                    {/* Tips Section */}
                    <div className="gba:bg-blue-50 gba:border gba:border-blue-200 gba:rounded gba:p-4">
                      <h4 className="gba:font-semibold gba:mb-2 gba:text-sm gba:text-blue-900">💡 Tips</h4>
                      <ul className="gba:space-y-1 gba:text-xs gba:text-blue-800">
                        <li>
                          • Use the <strong>Tree Builder</strong> tab to explore available fields visually
                        </li>
                        <li>• Expressions are validated in real-time as you type</li>
                        <li>• Field names are verified when the workflow executes</li>
                        <li>• Combine multiple expressions in a single text field</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Test Result Display */}
        {testResult && (
          <div className="nw:px-6 nw:pb-4">
            <Alert variant={testResult.success ? 'default' : 'destructive'}>
              <AlertTitle className="nw:flex nw:items-center nw:justify-between nw:text-sm">
                <span className="nw:flex nw:items-center nw:gap-2">
                  {testResult.success ? (
                    <CheckCircle className="nw:h-4 nw:w-4" />
                  ) : (
                    <AlertCircle className="nw:h-4 nw:w-4" />
                  )}
                  Test Result
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearResult}
                  className="nw:h-6 nw:px-2 nw:py-0"
                  data-testid={`${testId}-test-result-close`}
                >
                  <X className="nw:h-3 nw:w-3" />
                </Button>
              </AlertTitle>
              <AlertDescription className="nw:mt-2">
                {testResult.success ? (
                  <div className="nw:space-y-1">
                    <div className="nw:flex nw:items-start nw:gap-2">
                      <span className="nw:text-xs nw:text-muted-foreground nw:shrink-0">Resolved to:</span>
                      <code className="nw:bg-muted nw:px-2 nw:py-1 nw:rounded nw:text-sm nw:flex-1 nw:break-all">
                        {testResult.resolvedValue}
                      </code>
                    </div>
                    <div className="nw:text-muted-foreground nw:text-xs nw:italic">
                      Resolved in {testResult.resolvedIn} using sample data
                    </div>
                  </div>
                ) : (
                  <div className="nw:space-y-1">
                    <div className="nw:text-sm nw:font-medium">Error</div>
                    <div className="nw:text-sm">{testResult.error}</div>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Sticky Footer */}
        <DialogFooter className="nw:flex-shrink-0 nw:border-t nw:pt-4">
          <div className="nw:flex nw:items-center nw:gap-2 nw:mr-auto">
            <Button
              variant="outline"
              onClick={() => testExpression(localValue)}
              disabled={isTesting || !localValue.trim() || !localValue.includes('{{')}
              className="nw:gap-2"
              data-testid={`${testId}-test`}
            >
              {isTesting ? (
                <>
                  <Loader2 className="nw:h-3 nw:w-3 nw:animate-spin" />
                  <span>Testing...</span>
                </>
              ) : (
                <>
                  <TestTube2 className="nw:h-4 nw:w-4" />
                  <span>Test Expression</span>
                </>
              )}
            </Button>
          </div>
          <Button variant="outline" onClick={handleClear} data-testid={`${testId}-clear`}>
            Clear
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid={`${testId}-cancel`}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={!isValid || !localValue.trim() || validationResult === null}
            data-testid={`${testId}-insert`}
          >
            Insert Expression
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
