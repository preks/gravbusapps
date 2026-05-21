import React, { useState, useMemo, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Button,
  Spinner,
  Checkbox
} from '@newwork/nw-design-system'
import { Edit2, Eye, Database, Rocket } from 'lucide-react'
import { CustomDataDefinition } from '../types'
import { DefinitionsBulkToolbar } from './DefinitionsBulkToolbar'

export interface BulkAction {
  type: 'promote' | 'delete' | 'export'
  definitions: CustomDataDefinition[]
}

interface DefinitionsTableProps {
  definitions: CustomDataDefinition[]
  isLoading: boolean
  onSelect: (definition: CustomDataDefinition) => void
  onEdit: (definition: CustomDataDefinition) => void
  onPromote: (definition: CustomDataDefinition) => void
  onBulkAction?: (action: BulkAction) => void
  'data-testid'?: string
}

export const DefinitionsTable: React.FC<DefinitionsTableProps> = ({
  definitions,
  isLoading,
  onSelect,
  onEdit,
  onPromote,
  onBulkAction,
  'data-testid': testId = 'definitions-table'
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Get selected definitions
  const selectedDefinitions = useMemo(() => {
    return definitions.filter(d => selectedIds.has(d.id))
  }, [definitions, selectedIds])

  // Check if all are selected
  const allSelected = definitions.length > 0 && selectedIds.size === definitions.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < definitions.length

  // Selection handlers
  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(definitions.map(d => d.id)))
    }
  }, [allSelected, definitions])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  // Bulk action helpers
  const promotableCount = useMemo(() => {
    return selectedDefinitions.filter(d => d.kind === 'CUSTOM_ENTITY' && d.publishState !== 'PROMOTED_TRACKED').length
  }, [selectedDefinitions])

  const handleBulkPromote = useCallback(() => {
    const promotable = selectedDefinitions.filter(
      d => d.kind === 'CUSTOM_ENTITY' && d.publishState !== 'PROMOTED_TRACKED'
    )
    if (promotable.length > 0 && onBulkAction) {
      onBulkAction({ type: 'promote', definitions: promotable })
    }
  }, [selectedDefinitions, onBulkAction])

  const handleBulkDelete = useCallback(() => {
    if (selectedDefinitions.length > 0 && onBulkAction) {
      onBulkAction({ type: 'delete', definitions: selectedDefinitions })
    }
  }, [selectedDefinitions, onBulkAction])

  const handleBulkExport = useCallback(() => {
    if (selectedDefinitions.length > 0 && onBulkAction) {
      onBulkAction({ type: 'export', definitions: selectedDefinitions })
    }
  }, [selectedDefinitions, onBulkAction])

  const getKindBadge = () => (
    <Badge variant="secondary" className="gba:gap-1">
      <Database className="gba:h-3 gba:w-3" />
      Entity
    </Badge>
  )

  const getNamespaceBadge = (namespace: string) => {
    // Color code namespaces
    if (namespace === 'default') {
      return <Badge variant="secondary">{namespace}</Badge>
    }
    if (namespace.includes('.hr')) {
      return <Badge variant="success">{namespace}</Badge>
    }
    if (namespace.includes('.finance') || namespace.includes('.fin')) {
      return <Badge variant="warning">{namespace}</Badge>
    }
    if (namespace.includes('.platform')) {
      return <Badge variant="info">{namespace}</Badge>
    }
    return <Badge variant="outline">{namespace}</Badge>
  }

  const getStatusBadge = (definition: CustomDataDefinition) => {
    const { publishState } = definition

    if (publishState === 'PROMOTED_TRACKED') {
      return <Badge variant="success">Promoted</Badge>
    }
    if (publishState === 'ERROR') {
      return <Badge variant="destructive">Error</Badge>
    }
    if (publishState === 'DRAFT') {
      return <Badge variant="warning">Draft</Badge>
    }

    return <Badge variant="offline">Unknown</Badge>
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:py-16" data-testid={`${testId}-loading`}>
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      {/* Bulk Actions Toolbar - shown when items are selected */}
      {selectedIds.size > 0 && (
        <DefinitionsBulkToolbar
          selectedCount={selectedIds.size}
          promotableCount={promotableCount}
          onClearSelection={clearSelection}
          onPromote={promotableCount > 0 ? handleBulkPromote : undefined}
          onExport={handleBulkExport}
          onDelete={handleBulkDelete}
          data-testid={`${testId}-bulk-toolbar`}
        />
      )}

      <div className="gba:flex gba:items-center gba:justify-end">
        <span className="gba:text-sm gba:text-muted-foreground">
          {definitions.length} {definitions.length === 1 ? 'definition' : 'definitions'}
        </span>
      </div>

      {/* Table */}
      {definitions.length === 0 ? (
        <div
          className="gba:text-center gba:py-16 gba:text-muted-foreground gba:bg-muted/30 gba:rounded-lg"
          data-testid={`${testId}-empty`}
        >
          <Database className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-4 gba:opacity-50" />
          <p className="gba:text-lg gba:font-medium">No definitions found</p>
          <p className="gba:text-sm">Create your first custom data definition to get started</p>
        </div>
      ) : (
        <div className="gba:rounded-lg gba:border gba:border-border gba:overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="gba:w-[50px]">
                  <Checkbox
                    checked={allSelected}
                    ref={el => {
                      if (el) {
                        ;(el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate = someSelected
                      }
                    }}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                    data-testid={`${testId}-select-all`}
                  />
                </TableHead>
                <TableHead className="gba:w-[160px]">Namespace</TableHead>
                <TableHead className="gba:w-[180px]">Key</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead className="gba:w-[120px]">Type</TableHead>
                <TableHead className="gba:w-[100px]">Columns</TableHead>
                <TableHead className="gba:w-[100px]">Status</TableHead>
                <TableHead className="gba:w-[120px]">Updated</TableHead>
                <TableHead className="gba:w-[140px] gba:text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {definitions.map(definition => (
                <TableRow
                  key={definition.id}
                  className={`gba:cursor-pointer gba:hover:bg-muted/50 ${selectedIds.has(definition.id) ? 'gba:bg-primary/5' : ''}`}
                  onClick={() => onSelect(definition)}
                  data-testid={`${testId}-row-${definition.id}`}
                >
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(definition.id)}
                      onCheckedChange={() => toggleSelect(definition.id)}
                      aria-label={`Select ${definition.displayName || definition.entityName}`}
                      data-testid={`${testId}-select-${definition.id}`}
                    />
                  </TableCell>
                  <TableCell>{getNamespaceBadge(definition.namespace)}</TableCell>
                  <TableCell className="gba:font-mono gba:text-sm">{definition.entityName}</TableCell>
                  <TableCell>
                    <div>
                      <div className="gba:font-medium">{definition.displayName || definition.entityName}</div>
                      {definition.description && (
                        <div className="gba:text-xs gba:text-muted-foreground gba:truncate gba:max-w-[300px]">
                          {definition.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getKindBadge()}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{definition.columns?.length || 0} fields</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(definition)}</TableCell>
                  <TableCell className="gba:text-sm gba:text-muted-foreground">
                    {formatDate(definition.updatedAt)}
                  </TableCell>
                  <TableCell className="gba:text-right">
                    <span className="gba:inline-flex gba:justify-end gba:gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onSelect(definition)}
                        data-testid={`${testId}-view-${definition.id}`}
                      >
                        <Eye className="gba:h-4 gba:w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(definition)}
                        data-testid={`${testId}-edit-${definition.id}`}
                      >
                        <Edit2 className="gba:h-4 gba:w-4" />
                      </Button>
                      {definition.kind === 'CUSTOM_ENTITY' && definition.publishState !== 'PROMOTED_TRACKED' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onPromote(definition)}
                          data-testid={`${testId}-promote-${definition.id}`}
                        >
                          <Rocket className="gba:h-4 gba:w-4" />
                        </Button>
                      )}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
