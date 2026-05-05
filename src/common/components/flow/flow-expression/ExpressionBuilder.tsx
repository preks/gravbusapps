import React, { useEffect, useRef, useState } from 'react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Separator,
  Textarea,
  ToggleGroup,
  ToggleGroupItem
} from '@newwork/nw-design-system'
import { AlertCircle, CheckCircle, Copy, Loader2, Network, TestTube2, Type, X } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  BaseEntity,
  getEntityDescription,
  getEntityDisplayLabel,
  isBaseEntity
} from '@/common/data/flow/types/baseEntity'
import { CatalogMetadata } from '@/common/data/flow/types/catalogTypes'
import { TreeNode as TreeNodeType } from '@/common/data/flow/types/expressionTree'
import { FlowTemplate, InputType } from '@/common/data/flow/types/flowTemplate'
import { useCatalogDiscovery } from '@/common/data/flow/hooks/useCatalogDiscovery'
import { useDatasource } from '@/common/data/flow/hooks/useDatasource'
import { clearEntitySchemasCache, useEntitySchemas } from '@/common/data/flow/hooks/useEntitySchemas'
import { useExpressionTesting } from '@/common/data/flow/hooks/useExpressionTesting'
import { useExpressionValidator } from '@/common/data/flow/hooks/useExpressionValidator'
import { buildExpressionTree, pathToExpression } from '@/common/data/flow/utils/expressionTreeBuilder'
import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'
import { HumanReadablePreview } from './HumanReadablePreview'
import { QuickActions } from './QuickActions'
import { TreeNavigator } from './TreeNavigator'

interface ExpressionBuilderProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  value: string
  onChange: (value: string) => void
  template: FlowTemplate
  stepIndex: number
  context: BusinessAppContextProps
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

  const expressionRegex = /\{\{(.+?)\}\}/g
  const expressions = value.match(expressionRegex) || []

  let remainingText = value
  expressions.forEach(expression => {
    remainingText = remainingText.replace(expression, '')
  })

  const suspiciousCharPattern = /[#$%^&*+={}[\]|]/

  if (suspiciousCharPattern.test(remainingText)) {
    const suspiciousCharacters = remainingText.match(suspiciousCharPattern)
    return {
      isValid: false,
      message: `Invalid character${suspiciousCharacters && suspiciousCharacters.length > 1 ? 's' : ''} outside expression: ${suspiciousCharacters?.join(', ')}`
    }
  }

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

  const [catalogs, setCatalogs] = useState<CatalogMetadata[]>([])
  const [catalogsLoading, setCatalogsLoading] = useState(false)
  const { fetchCatalogs, fetchCatalogEntries } = useCatalogDiscovery(context)

  const { schemas: entitySchemas, isLoading: schemasLoading } = useEntitySchemas({
    enableCache: false
  })

  useEffect(() => {
    console.log('Entity schemas state:', {
      hasSchemas: !!entitySchemas,
      isLoading: schemasLoading,
      schemaKeys: entitySchemas ? Object.keys(entitySchemas) : [],
      employeeSchema: entitySchemas?.employee,
      employeeFieldCount: entitySchemas?.employee?.fields?.length
    })
  }, [entitySchemas, schemasLoading])

  const { list: listEntities } = useDatasource(context.accessToken)
  const [treeData, setTreeData] = useState<TreeNodeType[]>([])

  const { validateExpression } = useExpressionValidator(template, stepIndex, entitySchemas ?? undefined)
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; message?: string } | null>(null)
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const { testExpression, testResult, isTesting, clearResult } = useExpressionTesting(
    template,
    stepIndex,
    context.accessToken,
    context.userInfo?.id
  )

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  useEffect(() => {
    const loadCatalogs = async () => {
      setCatalogsLoading(true)
      try {
        clearEntitySchemasCache()
        const catalogData = await fetchCatalogs()
        setCatalogs(catalogData)
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
  }, [entitySchemas, fetchCatalogs, isOpen, stepIndex, template])

  useEffect(() => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current)
    }

    if (!localValue.trim()) {
      setValidationResult({ isValid: true })
      return
    }

    setValidationResult(null)

    validationTimeoutRef.current = setTimeout(async () => {
      try {
        const clientValidation = validateExpressionStrict(localValue)

        if (!clientValidation.isValid) {
          setValidationResult(clientValidation)
          return
        }

        const templateValidation = await validateExpression(localValue)

        if (!templateValidation.isValid) {
          setValidationResult(templateValidation)
          return
        }

        const testTemplate = {
          ...template,
          name: template.name || '__validation_test__',
          description: template.description || 'Test template for expression validation',
          steps: template.steps.map((step: any, index: number) =>
            index === stepIndex
              ? {
                  ...step,
                  title: localValue,
                  message: localValue,
                  form: step.form || []
                }
              : step
          )
        }

        const response = await fetch(`${CUSTOM_FLOW_ENGINE_API_URL}/templates/validate-expressions`, {
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

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current)
      }
    }
  }, [localValue, stepIndex, template, validateExpression])

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalValue(event.target.value)
    setCursorPosition(event.target.selectionStart || 0)
  }

  const handleInputClick = (event: React.MouseEvent<HTMLTextAreaElement>) => {
    const target = event.target as HTMLTextAreaElement
    setCursorPosition(target.selectionStart || 0)
  }

  const handleInputKeyUp = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const target = event.target as HTMLTextAreaElement
    setCursorPosition(target.selectionStart || 0)
  }

  const buildReadableLabel = (node: TreeNodeType): string => {
    return node.label || node.description || 'Field'
  }

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

  const handleBrowseEntries = async (node: TreeNodeType) => {
    if (node.type !== 'catalog-browser' || !node.metadata?.catalogId) {
      return
    }

    const catalogId = node.metadata.catalogId

    setTreeData(previousTree =>
      updateTreeNode(previousTree, node.id, existingNode => ({
        ...existingNode,
        label: '🔍 Loading entries...',
        metadata: { ...existingNode.metadata, loadingState: 'loading' }
      }))
    )

    try {
      const catalog = catalogs.find(existingCatalog => existingCatalog.catalogIdentifier === catalogId)
      const entriesData = await fetchCatalogEntries(catalogId, {
        version: catalog?.version,
        limit: 20,
        offset: 0
      })

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

      setTreeData(previousTree =>
        updateTreeNode(previousTree, node.id, existingNode => ({
          ...existingNode,
          label: `🔍 Browse Entries (${entriesData.totalCount} total)`,
          isExpanded: true,
          children: entryNodes,
          metadata: {
            ...existingNode.metadata,
            loadingState: 'loaded',
            offset: entriesData.entries.length,
            hasMore: entriesData.hasMore
          }
        }))
      )
    } catch (error) {
      console.error(`Failed to load entries for ${catalogId}:`, error)
      setTreeData(previousTree =>
        updateTreeNode(previousTree, node.id, existingNode => ({
          ...existingNode,
          label: '🔍 Browse Entries (Error)',
          metadata: { ...existingNode.metadata, loadingState: 'error' }
        }))
      )
    }
  }

  const handleLoadMore = async (node: TreeNodeType) => {
    if (node.type !== 'catalog-browser' || !node.metadata?.catalogId || !node.metadata?.offset) {
      return
    }

    const catalogId = node.metadata.catalogId
    const offset = node.metadata.offset

    try {
      const catalog = catalogs.find(existingCatalog => existingCatalog.catalogIdentifier === catalogId)
      const entriesData = await fetchCatalogEntries(catalogId, {
        version: catalog?.version,
        limit: 20,
        offset
      })

      const findBrowseNode = (nodes: TreeNodeType[]): TreeNodeType | null => {
        for (const existingNode of nodes) {
          if (existingNode.id === `catalog-${catalogId}-browse`) {
            return existingNode
          }
          if (existingNode.children) {
            const foundNode = findBrowseNode(existingNode.children)
            if (foundNode) return foundNode
          }
        }
        return null
      }

      const browseNode = findBrowseNode(treeData)
      if (!browseNode) return

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

      setTreeData(previousTree =>
        updateTreeNode(previousTree, browseNode.id, existingNode => {
          const existingEntries = (existingNode.children || []).filter(childNode => childNode.type === 'catalog-entry')
          const allEntries = [...existingEntries, ...newEntryNodes]
          const children: TreeNodeType[] = [...allEntries]

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
            ...existingNode,
            children,
            metadata: {
              ...existingNode.metadata,
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

  const insertAtCursor = (textToInsert: string) => {
    const currentValue = localValue
    const position = inputRef.current?.selectionStart || cursorPosition || currentValue.length
    const nextValue = currentValue.slice(0, position) + textToInsert + currentValue.slice(position)
    setLocalValue(nextValue)

    const nextCursorPosition = position + textToInsert.length
    setCursorPosition(nextCursorPosition)

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.setSelectionRange(nextCursorPosition, nextCursorPosition)
      }
    }, 0)
  }

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
    const idExpression = node.expressionTemplate
    const formattedValue = `${entityType}://${idExpression}`

    setReadableMap(previousReadableMap => ({ ...previousReadableMap, [idExpression]: node.label || 'Entity' }))
    insertAtCursor(formattedValue)
  }

  const handleEntityFieldSelect = (node: TreeNodeType) => {
    if (!node.expressionTemplate) return

    const expressionKey = node.expressionTemplate
    setReadableMap(previousReadableMap => ({ ...previousReadableMap, [expressionKey]: node.label || 'Field' }))
    insertAtCursor(node.expressionTemplate)
  }

  const handleCatalogEntrySelect = (node: TreeNodeType) => {
    if (!node.expressionTemplate) return

    const readableLabel = buildReadableLabel(node)
    const expressionKey = node.expressionTemplate
    setReadableMap(previousReadableMap => ({ ...previousReadableMap, [expressionKey]: readableLabel }))
    insertAtCursor(node.expressionTemplate)
  }

  const handleOrgChartFieldSelect = (node: TreeNodeType) => {
    if (node.expressionTemplate) {
      const expression = node.expressionTemplate.replace('ID_PLACEHOLDER', '$workflow.initiator')
      insertAtCursor(expression)
    }
  }

  const handleFieldSelect = (node: TreeNodeType) => {
    if (!node.path) return

    if (node.type === 'orgchart-field') {
      handleOrgChartFieldSelect(node)
      return
    }

    if (node.path[0] === '$entity') {
      const expression = pathToExpression(node.path)
      setReadableMap(previousReadableMap => ({ ...previousReadableMap, [expression]: node.label || 'Entity Field' }))
      insertAtCursor(expression)
      return
    }

    if (node.metadata?.inputType === InputType.FILE) {
      handleFileFieldSelect(node)
      return
    }

    if (
      (node.metadata?.dataSourceType === 'CUSTOM_ENTITY' || node.metadata?.dataSourceType === 'INTERNAL_ENTITY') &&
      node.metadata?.dataSourceEntity
    ) {
      handleEntityDataSourceFieldSelect(node)
      return
    }

    const expression = pathToExpression(node.path)
    const readableLabel = buildReadableLabel(node)
    setReadableMap(previousReadableMap => ({ ...previousReadableMap, [expression]: readableLabel }))
    insertAtCursor(expression)
  }

  const handleFileFieldSelect = (node: TreeNodeType) => {
    if (!node.path) return

    const idExpression = pathToExpression([...node.path, '[0]', 'fileId'])
    const fileNameExpression = pathToExpression([...node.path, '[0]', 'fileName'])
    const downloadExpression = pathToExpression([...node.path, '[0]', 'downloadPath'])
    const fileLink = `file://${idExpression}/name/${fileNameExpression}/url/${downloadExpression}`

    setReadableMap(previousReadableMap => ({
      ...previousReadableMap,
      [idExpression]: node.label || 'File ID',
      [fileNameExpression]: node.label || 'File Name',
      [downloadExpression]: node.label ? `${node.label} Download` : 'File Download'
    }))
    insertAtCursor(fileLink)
  }

  const handleEntityDataSourceFieldSelect = (node: TreeNodeType) => {
    if (!node.path) return

    const entityType = (node.metadata?.dataSourceEntity as string).toLowerCase()
    const idExpression = pathToExpression(node.path)
    const entityReference = `${entityType}://${idExpression}`

    setReadableMap(previousReadableMap => ({ ...previousReadableMap, [idExpression]: node.label || 'Entity' }))
    insertAtCursor(entityReference)
  }

  const handleCatalogFieldSelect = (node: TreeNodeType) => {
    if (node.expressionTemplate) {
      const readableLabel = buildReadableLabel(node)
      const expressionKey = node.expressionTemplate
      setReadableMap(previousReadableMap => ({ ...previousReadableMap, [expressionKey]: readableLabel }))
      insertAtCursor(node.expressionTemplate)
    } else if (node.expressionPath) {
      const expression = node.expressionPath.startsWith('{{') ? node.expressionPath : `{{${node.expressionPath}}}`
      const readableLabel = buildReadableLabel(node)
      setReadableMap(previousReadableMap => ({ ...previousReadableMap, [expression]: readableLabel }))
      insertAtCursor(expression)
    }
  }

  const handleNodeSelect = (node: TreeNodeType) => {
    switch (node.type) {
      case 'catalog-browser':
        handleCatalogBrowserSelect(node)
        break
      case 'entity-browser':
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

  const handleEntitySearch = async (nodeId: string, search: string) => {
    const findNode = (nodes: TreeNodeType[], id: string): TreeNodeType | null => {
      for (const node of nodes) {
        if (node.id === id) return node
        if (node.children) {
          const foundNode = findNode(node.children, id)
          if (foundNode) return foundNode
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
    const displayLabel = groupDisplayName || entityType

    setTreeData(previousTree =>
      updateTreeNode(previousTree, node.id, existingNode => ({
        ...existingNode,
        label: `🔍 Loading ${displayLabel}...`,
        metadata: { ...existingNode.metadata, loadingState: 'loading', search: searchTerm }
      }))
    )

    try {
      const filters = groupFilters?.map(groupFilter => ({
        field: groupFilter.field,
        operator: groupFilter.operator as any,
        value: groupFilter.value
      }))

      const result = await listEntities(entityType, {
        search: searchTerm,
        limit: 20,
        offset: typeof node.metadata?.offset === 'number' ? node.metadata.offset : 0,
        filters
      })

      const rawEntities = (result?.entities || []) as any[]
      const total = result?.meta.total || rawEntities.length
      const hasMore = !!result?.meta.hasMore
      const currentOffset = result?.meta.offset || 0

      const entities: BaseEntity[] = rawEntities.filter(entity => {
        if (!isBaseEntity(entity)) {
          console.warn(`Entity does not conform to BaseEntity contract:`, entity)
          return false
        }
        return true
      })

      if (entities.length < rawEntities.length) {
        console.warn(`${rawEntities.length - entities.length} entities filtered out due to invalid structure`)
      }

      if (result?.meta.conformsToBaseEntity === false) {
        console.warn(`API reported that some entities do not conform to BaseEntity contract`)
      }

      const schemaKey = entityType.toLowerCase()
      const schema = entitySchemas?.[schemaKey]

      console.log('Building entity instance nodes:', {
        entityType,
        schemaKey,
        hasSchema: !!schema,
        schemaFieldCount: schema?.fields.length || 0,
        schemaFields: schema?.fields.map(field => field.name) || [],
        entityKeys: Object.keys(entities[0] || {}),
        firstEntity: entities[0],
        availableSchemaKeys: entitySchemas ? Object.keys(entitySchemas) : []
      })

      const instanceNodes: TreeNodeType[] = entities.map(entity => ({
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

      setTreeData(previousTree => {
        const updatedTree = updateTreeNode(previousTree, node.id, existingNode => {
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
            ...existingNode,
            label: `🔍 Browse ${displayLabel} (${total} total${searchTerm ? `, search="${searchTerm}"` : ''})`,
            isExpanded: true,
            children:
              typeof node.metadata?.offset === 'number' && node.metadata.offset > 0 && existingNode.children
                ? [
                    ...(existingNode.children.filter(childNode => childNode.type !== 'entity-browser') as any[]),
                    ...instanceNodes
                  ]
                : instanceNodes,
            metadata: {
              ...existingNode.metadata,
              loadingState: 'loaded',
              offset: currentOffset + entities.length,
              hasMore,
              search: searchTerm
            }
          }
        })
        console.log('Tree updated, returning new tree')
        return updatedTree
      })
    } catch (error) {
      console.error(`Failed to browse entities for ${displayLabel}:`, error)
      setTreeData(previousTree =>
        updateTreeNode(previousTree, node.id, existingNode => ({
          ...existingNode,
          label: `🔍 Browse ${displayLabel} (Error)`,
          metadata: { ...existingNode.metadata, loadingState: 'error' }
        }))
      )
    }
  }

  const handleInsert = (expression: string) => {
    insertAtCursor(expression)
  }

  const handleApply = () => {
    onChange(localValue)

    if (localValue && !recentExpressions.includes(localValue)) {
      setRecentExpressions(previousExpressions => [localValue, ...previousExpressions].slice(0, 5))
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

  const isValid = validationResult?.isValid ?? false

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="nw:sm:max-w-[1280px] nw:max-h-[90vh] nw:flex nw:flex-col"
        style={{ width: '90vw' }}
        data-testid={testId}
      >
        <DialogHeader className="nw:flex-shrink-0">
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Network className="gba:h-5 gba:w-5" />
            Expression Builder
          </DialogTitle>
          <DialogDescription>
            Build expressions visually by clicking through the tree, or switch to text mode to type manually.
          </DialogDescription>
        </DialogHeader>

        <div className="nw:flex-1 nw:overflow-y-auto nw:px-6">
          <div className="gba:space-y-4 gba:py-2">
            <div className="gba:flex gba:items-center gba:justify-between">
              <ToggleGroup
                type="single"
                value={mode}
                onValueChange={nextMode => nextMode && setMode(nextMode as 'tree' | 'text')}
              >
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

            {mode === 'tree' ? (
              <div className="gba:grid gba:grid-cols-2 gba:gap-4" style={{ minHeight: '400px' }}>
                <TreeNavigator
                  nodes={treeData}
                  onSelect={handleNodeSelect}
                  onEntitySearch={handleEntitySearch}
                  isLoading={catalogsLoading}
                  data-testid={`${testId}-navigator`}
                />

                <QuickActions
                  template={template}
                  stepIndex={stepIndex}
                  onInsert={handleInsert}
                  recentExpressions={recentExpressions}
                  data-testid={`${testId}-actions`}
                />
              </div>
            ) : (
              <div>
                <Card>
                  <CardHeader>
                    <h3 className="gba:text-lg gba:font-semibold">Expression Syntax Reference</h3>
                    <p className="gba:text-sm gba:text-gray-600 gba:mt-1">
                      Use expressions to dynamically reference workflow data, previous steps, and external sources.
                    </p>
                  </CardHeader>
                  <CardContent className="gba:space-y-6 gba:text-sm">
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

                    <div>
                      <h4 className="gba:font-semibold gba:mb-2 gba:text-base">OrgChart - Organizational Hierarchy</h4>
                      <p className="gba:text-xs gba:text-gray-600 gba:mb-3">
                        Access managers, skip-level managers, and direct reports based on organizational structure
                      </p>
                      <div className="gba:space-y-2">
                        <div>
                          <h5 className="gba:font-medium gba:mb-1 gba:text-sm gba:text-blue-700">
                            By User ID (Recommended)
                          </h5>
                          <code className="gba:block gba:p-3 gba:bg-gray-100 gba:rounded gba:font-mono gba:text-xs">
                            {'{{$orgchart.managerByUserId[$workflow.initiator]}}'}
                            <br />
                            <span className="gba:text-gray-600" style={{ fontSize: '10px' }}>
                              → My manager (user ID)
                            </span>
                          </code>
                        </div>
                        <div>
                          <code className="gba:block gba:p-3 gba:bg-gray-100 gba:rounded gba:font-mono gba:text-xs">
                            {'{{$orgchart.managerByUserId[$workflow.initiator].name}}'}
                            <br />
                            <span className="gba:text-gray-600" style={{ fontSize: '10px' }}>
                              → My manager's display name
                            </span>
                          </code>
                        </div>
                        <div>
                          <code className="gba:block gba:p-3 gba:bg-gray-100 gba:rounded gba:font-mono gba:text-xs">
                            {'{{$orgchart.skipLevelManagerByUserId[$workflow.initiator]}}'}
                            <br />
                            <span className="gba:text-gray-600" style={{ fontSize: '10px' }}>
                              → My director (skip-level manager)
                            </span>
                          </code>
                        </div>
                        <div>
                          <code className="gba:block gba:p-3 gba:bg-gray-100 gba:rounded gba:font-mono gba:text-xs">
                            {'{{$orgchart.directReportsByUserId[$workflow.initiator]}}'}
                            <br />
                            <span className="gba:text-gray-600" style={{ fontSize: '10px' }}>
                              → My team members (array of user IDs)
                            </span>
                          </code>
                        </div>
                      </div>
                      <div className="gba:mt-3 gba:space-y-2">
                        <h5 className="gba:font-medium gba:mb-1 gba:text-sm gba:text-gray-700">By Employee ID</h5>
                        <code className="gba:block gba:p-3 gba:bg-gray-100 gba:rounded gba:font-mono gba:text-xs">
                          {'{{$orgchart.manager[$workflow.input.employeeId]}}'}
                          <br />
                          <span className="gba:text-gray-600" style={{ fontSize: '10px' }}>
                            → Manager of specific employee
                          </span>
                        </code>
                        <code className="gba:block gba:p-3 gba:bg-gray-100 gba:rounded gba:font-mono gba:text-xs">
                          {'{{$orgchart.manager[$workflow.input.employeeId].email}}'}
                          <br />
                          <span className="gba:text-gray-600" style={{ fontSize: '10px' }}>
                            → Manager's email address
                          </span>
                        </code>
                      </div>
                      <div className="gba:mt-3 gba:space-y-2">
                        <h5 className="gba:font-medium gba:mb-1 gba:text-sm gba:text-blue-700">ID Conversion</h5>
                        <code className="gba:block gba:p-3 gba:bg-gray-100 gba:rounded gba:font-mono gba:text-xs">
                          {'{{$orgchart.userIdByEmployeeId[$steps.step_0.formData.selectedEmployee]}}'}
                          <br />
                          <span className="gba:text-gray-600" style={{ fontSize: '10px' }}>
                            → Convert employeeId from form to userId (for assignments)
                          </span>
                        </code>
                      </div>
                    </div>

                    <div>
                      <h4 className="gba:font-semibold gba:mb-2 gba:text-base">Catalog & Entity Data</h4>
                      <p className="gba:text-xs gba:text-gray-600 gba:mb-3">
                        Access catalog entries and entity records
                      </p>
                      <div className="gba:space-y-2">
                        <div>
                          <h5 className="gba:font-medium gba:mb-1 gba:text-sm">Catalog Data</h5>
                          <code className="gba:block gba:p-2 gba:bg-gray-100 gba:rounded gba:text-xs gba:font-mono">
                            {"{{$catalog.asset-management['asset-001'].name}}"}
                            <br />
                            {"{{$catalog.employees['emp-001'].email}}"}
                          </code>
                        </div>
                        <div>
                          <h5 className="gba:font-medium gba:mb-1 gba:text-sm">Entity References</h5>
                          <code className="gba:block gba:p-2 gba:bg-gray-100 gba:rounded gba:text-xs gba:font-mono">
                            {'{{$entity.employee.emp-123.firstName}}'}
                            <br />
                            {'{{$entity.department.dept-456.name}}'}
                          </code>
                        </div>
                      </div>
                    </div>

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
                  <div className="nw:space-y-2">
                    {testResult.info && (
                      <div className="nw:text-xs nw:bg-blue-50 nw:px-2 nw:py-1 nw:rounded nw:text-blue-800">
                        ℹ️ {testResult.info}
                      </div>
                    )}
                    <div className="nw:flex nw:items-start nw:gap-2">
                      <span className="nw:text-xs nw:text-muted-foreground nw:shrink-0">Resolved to:</span>
                      <code className="nw:bg-muted nw:px-2 nw:py-1 nw:rounded nw:text-sm nw:flex-1 nw:break-all">
                        {testResult.resolvedValue}
                      </code>
                    </div>
                    {testResult.warning && (
                      <div className="nw:text-xs nw:bg-yellow-50 nw:px-2 nw:py-1 nw:rounded nw:text-yellow-800">
                        ⚠️ {testResult.warning}
                      </div>
                    )}
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
